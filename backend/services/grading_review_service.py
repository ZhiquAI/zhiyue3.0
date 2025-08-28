"""阅卷复核服务
实现双评、三评机制的业务逻辑
"""

from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from datetime import datetime

from models.grading_review_models import (
    GradingReviewRecord, ReviewTask, ReviewRule,
    ReviewType, ReviewStatus, ReviewResult
)
from models.production_models import AnswerSheet, User
from utils.logger import get_logger

logger = get_logger(__name__)


class GradingReviewService:
    """阅卷复核服务类"""

    def __init__(self, db: Session):
        self.db = db

    def create_review_task(
        self, exam_id: str, review_type: ReviewType,
        task_config: Dict[str, Any], creator_id: str
    ) -> ReviewTask:
        """创建复核任务"""
        try:
            task = ReviewTask(
                exam_id=exam_id,
                task_name=task_config.get(
                    'name', f'{review_type.value}任务'
                ),
                task_description=task_config.get('description', ''),
                review_type=review_type,
                review_config=task_config,
                score_threshold=task_config.get('score_threshold', 5.0),
                quality_threshold=task_config.get('quality_threshold', 0.8),
                auto_assign=task_config.get('auto_assign', True),
                priority=task_config.get('priority', 5),
                deadline=task_config.get('deadline'),
                estimated_duration=task_config.get('estimated_duration'),
                created_by=creator_id
            )

            self.db.add(task)
            self.db.commit()
            self.db.refresh(task)

            logger.info(f"创建复核任务成功: {task.id}")
            return task

        except Exception as e:
            self.db.rollback()
            logger.error(f"创建复核任务失败: {str(e)}")
            raise

    def trigger_review_by_rules(self, answer_sheet_id: str) -> List[str]:
        """根据规则触发复核"""
        try:
            # 获取答题卡信息
            answer_sheet = self.db.query(AnswerSheet).filter(
                AnswerSheet.id == answer_sheet_id
            ).first()

            if not answer_sheet:
                raise ValueError(f"答题卡不存在: {answer_sheet_id}")

            # 获取适用的复核规则
            rules = self._get_applicable_rules(answer_sheet)
            triggered_reviews = []

            for rule in rules:
                if self._check_rule_conditions(rule, answer_sheet):
                    review_record = self._create_review_record(
                        answer_sheet, rule
                    )
                    triggered_reviews.append(review_record.id)
                    
                    # 更新规则统计
                    rule.trigger_count += 1

            self.db.commit()
            logger.info(f"触发复核数量: {len(triggered_reviews)}")
            return triggered_reviews

        except Exception as e:
            self.db.rollback()
            logger.error(f"触发复核失败: {str(e)}")
            raise

    def assign_reviewer(
        self, review_record_id: str, reviewer_id: str
    ) -> bool:
        """分配复核员"""
        try:
            review_record = self.db.query(GradingReviewRecord).filter(
                GradingReviewRecord.id == review_record_id
            ).first()

            if not review_record:
                raise ValueError(f"复核记录不存在: {review_record_id}")

            if review_record.status != ReviewStatus.PENDING:
                raise ValueError("只能分配待复核状态的记录")

            # 检查复核员是否可用
            if not self._is_reviewer_available(reviewer_id, review_record):
                raise ValueError("复核员不可用")

            review_record.reviewer_id = reviewer_id
            review_record.status = ReviewStatus.IN_PROGRESS
            review_record.started_at = datetime.utcnow()

            self.db.commit()
            logger.info(
                f"分配复核员成功: {review_record_id} -> {reviewer_id}"
            )
            return True

        except Exception as e:
            self.db.rollback()
            logger.error(f"分配复核员失败: {str(e)}")
            raise

    def submit_review(
        self, review_record_id: str, review_data: Dict[str, Any],
        reviewer_id: str
    ) -> GradingReviewRecord:
        """提交复核结果"""
        try:
            review_record = self.db.query(GradingReviewRecord).filter(
                GradingReviewRecord.id == review_record_id
            ).first()

            if not review_record:
                raise ValueError(f"复核记录不存在: {review_record_id}")

            if review_record.reviewer_id != reviewer_id:
                raise ValueError("只能提交自己的复核任务")

            if review_record.status != ReviewStatus.IN_PROGRESS:
                raise ValueError("只能提交进行中的复核任务")

            # 更新复核结果
            self._update_review_result(review_record, review_data)

            # 分析分差
            self._analyze_score_difference(review_record)

            # 判断是否需要进一步复核
            if self._needs_further_review(review_record):
                review_record.status = ReviewStatus.DISPUTED
                review_record.has_dispute = True
                # 触发下一轮复核
                self._trigger_next_review(review_record)
            else:
                review_record.status = ReviewStatus.COMPLETED
                review_record.result = ReviewResult.APPROVED
                # 更新最终分数
                self._finalize_scores(review_record)

            review_record.completed_at = datetime.utcnow()
            self.db.commit()

            logger.info(f"提交复核结果成功: {review_record_id}")
            return review_record

        except Exception as e:
            self.db.rollback()
            logger.error(f"提交复核结果失败: {str(e)}")
            raise

    def get_review_statistics(self, exam_id: str) -> Dict[str, Any]:
        """获取复核统计信息"""
        try:
            # 基础统计
            total_reviews = self.db.query(GradingReviewRecord).filter(
                GradingReviewRecord.exam_id == exam_id
            ).count()

            completed_reviews = self.db.query(GradingReviewRecord).filter(
                and_(
                    GradingReviewRecord.exam_id == exam_id,
                    GradingReviewRecord.status == ReviewStatus.COMPLETED
                )
            ).count()

            disputed_reviews = self.db.query(GradingReviewRecord).filter(
                and_(
                    GradingReviewRecord.exam_id == exam_id,
                    GradingReviewRecord.has_dispute.is_(True)
                )
            ).count()

            # 分差统计
            score_differences = self.db.query(
                GradingReviewRecord.score_difference
            ).filter(
                and_(
                    GradingReviewRecord.exam_id == exam_id,
                    GradingReviewRecord.score_difference.isnot(None)
                )
            ).all()

            avg_score_diff = 0
            if score_differences:
                total_diff = sum(
                    diff[0] for diff in score_differences
                    if diff[0] is not None
                )
                avg_score_diff = total_diff / len(score_differences)

            # 复核类型分布
            type_distribution = self.db.query(
                GradingReviewRecord.review_type,
                func.count(GradingReviewRecord.id)
            ).filter(
                GradingReviewRecord.exam_id == exam_id
            ).group_by(GradingReviewRecord.review_type).all()

            completion_rate = (
                completed_reviews / total_reviews if total_reviews > 0 else 0
            )
            dispute_rate = (
                disputed_reviews / total_reviews if total_reviews > 0 else 0
            )

            return {
                'total_reviews': total_reviews,
                'completed_reviews': completed_reviews,
                'disputed_reviews': disputed_reviews,
                'completion_rate': completion_rate,
                'dispute_rate': dispute_rate,
                'avg_score_difference': round(avg_score_diff, 2),
                'type_distribution': dict(type_distribution)
            }

        except Exception as e:
            logger.error(f"获取复核统计失败: {str(e)}")
            raise

    def _get_applicable_rules(
        self, answer_sheet: AnswerSheet
    ) -> List[ReviewRule]:
        """获取适用的复核规则"""
        exam = answer_sheet.exam
        
        rules = self.db.query(ReviewRule).filter(
            and_(
                ReviewRule.is_active.is_(True),
                or_(
                    ReviewRule.subject.is_(None),
                    ReviewRule.subject == exam.subject
                ),
                or_(
                    ReviewRule.grade.is_(None),
                    ReviewRule.grade == exam.grade
                )
            )
        ).order_by(ReviewRule.priority.desc()).all()

        return rules

    def _check_rule_conditions(
        self, rule: ReviewRule, answer_sheet: AnswerSheet
    ) -> bool:
        """检查规则触发条件"""
        try:
            conditions = rule.trigger_conditions
            
            # 检查分数阈值
            if 'score_threshold' in conditions:
                threshold = conditions['score_threshold']
                if answer_sheet.total_score is None:
                    return False
                if answer_sheet.total_score < threshold:
                    return True

            # 检查质量问题
            if 'quality_issues' in conditions:
                if answer_sheet.quality_issues:
                    required_issues = conditions['quality_issues']
                    actual_issues = answer_sheet.quality_issues
                    if any(
                        issue in actual_issues for issue in required_issues
                    ):
                        return True

            # 检查OCR置信度
            if 'ocr_confidence_threshold' in conditions:
                threshold = conditions['ocr_confidence_threshold']
                if (
                    answer_sheet.ocr_confidence is not None and
                    answer_sheet.ocr_confidence < threshold
                ):
                    return True

            # 检查需要人工复核标记
            if 'needs_review' in conditions:
                if (
                    conditions['needs_review'] and
                    answer_sheet.needs_review
                ):
                    return True

            return False

        except Exception as e:
            logger.error(f"检查规则条件失败: {str(e)}")
            return False

    def _create_review_record(
        self, answer_sheet: AnswerSheet, rule: ReviewRule
    ) -> GradingReviewRecord:
        """创建复核记录"""
        review_type = ReviewType(
            rule.rule_config.get('review_type', 'second_review')
        )
        
        review_record = GradingReviewRecord(
            answer_sheet_id=answer_sheet.id,
            exam_id=answer_sheet.exam_id,
            review_type=review_type,
            review_round=1,
            original_total_score=answer_sheet.total_score,
            original_objective_score=answer_sheet.objective_score,
            original_subjective_scores=answer_sheet.subjective_scores,
            original_grading_details=answer_sheet.grading_details
        )

        self.db.add(review_record)
        return review_record

    def _is_reviewer_available(
        self, reviewer_id: str, review_record: GradingReviewRecord
    ) -> bool:
        """检查复核员是否可用"""
        # 检查复核员是否存在
        reviewer = self.db.query(User).filter(User.id == reviewer_id).first()
        if not reviewer or not reviewer.is_active:
            return False

        # 检查是否是原评分员（避免自己复核自己）
        if review_record.original_grader_id == reviewer_id:
            return False

        # 检查工作负载
        current_workload = self.db.query(GradingReviewRecord).filter(
            and_(
                GradingReviewRecord.reviewer_id == reviewer_id,
                GradingReviewRecord.status == ReviewStatus.IN_PROGRESS
            )
        ).count()

        # 假设每个复核员最多同时处理20个复核任务
        if current_workload >= 20:
            return False

        return True

    def _update_review_result(
        self, review_record: GradingReviewRecord,
        review_data: Dict[str, Any]
    ) -> None:
        """更新复核结果"""
        review_record.review_total_score = review_data.get('total_score')
        review_record.review_objective_score = review_data.get(
            'objective_score'
        )
        review_record.review_subjective_scores = review_data.get(
            'subjective_scores'
        )
        review_record.review_grading_details = review_data.get(
            'grading_details'
        )
        review_record.review_comments = review_data.get('comments', '')
        review_record.quality_issues = review_data.get('quality_issues', [])
        review_record.improvement_suggestions = review_data.get(
            'suggestions', []
        )

    def _analyze_score_difference(
        self, review_record: GradingReviewRecord
    ) -> None:
        """分析分差"""
        if (
            review_record.original_total_score is not None and
            review_record.review_total_score is not None
        ):
            review_record.score_difference = abs(
                review_record.review_total_score -
                review_record.original_total_score
            )

        if (
            review_record.original_objective_score is not None and
            review_record.review_objective_score is not None
        ):
            review_record.objective_score_difference = abs(
                review_record.review_objective_score -
                review_record.original_objective_score
            )

        # 分析主观题分差
        if (
            review_record.original_subjective_scores and
            review_record.review_subjective_scores
        ):
            differences = {}
            original = review_record.original_subjective_scores
            review = review_record.review_subjective_scores
            
            for question_id in original.keys():
                if question_id in review:
                    diff = abs(review[question_id] - original[question_id])
                    differences[question_id] = diff
            
            review_record.subjective_score_differences = differences

    def _needs_further_review(
        self, review_record: GradingReviewRecord
    ) -> bool:
        """判断是否需要进一步复核"""
        # 分差超过阈值
        if (
            review_record.score_difference is not None and
            review_record.score_difference > 10.0
        ):  # 可配置阈值
            return True

        # 主观题分差较大
        if review_record.subjective_score_differences:
            max_diff = max(review_record.subjective_score_differences.values())
            if max_diff > 5.0:  # 可配置阈值
                return True

        # 质量问题严重
        if review_record.quality_issues:
            serious_issues = [
                'ocr_error', 'segmentation_error', 'grading_error'
            ]
            if any(
                issue in review_record.quality_issues
                for issue in serious_issues
            ):
                return True

        return False

    def _trigger_next_review(
        self, review_record: GradingReviewRecord
    ) -> None:
        """触发下一轮复核"""
        next_review_type = self._get_next_review_type(
            review_record.review_type
        )
        if next_review_type:
            next_review = GradingReviewRecord(
                answer_sheet_id=review_record.answer_sheet_id,
                exam_id=review_record.exam_id,
                review_type=next_review_type,
                review_round=review_record.review_round + 1,
                original_grader_id=review_record.original_grader_id,
                original_total_score=review_record.original_total_score,
                original_objective_score=review_record.original_objective_score,
                original_subjective_scores=(
                    review_record.original_subjective_scores
                ),
                original_grading_details=(
                    review_record.original_grading_details
                )
            )
            self.db.add(next_review)

    def _get_next_review_type(
        self, current_type: ReviewType
    ) -> Optional[ReviewType]:
        """获取下一轮复核类型"""
        type_sequence = {
            ReviewType.SECOND_REVIEW: ReviewType.THIRD_REVIEW,
            ReviewType.THIRD_REVIEW: ReviewType.FINAL_REVIEW
        }
        return type_sequence.get(current_type)

    def _finalize_scores(self, review_record: GradingReviewRecord) -> None:
        """确定最终分数"""
        # 简单策略：使用复核分数作为最终分数
        review_record.final_total_score = review_record.review_total_score
        review_record.final_objective_score = (
            review_record.review_objective_score
        )
        review_record.final_subjective_scores = (
            review_record.review_subjective_scores
        )
        review_record.final_grading_details = (
            review_record.review_grading_details
        )

        # 更新答题卡的最终分数
        answer_sheet = self.db.query(AnswerSheet).filter(
            AnswerSheet.id == review_record.answer_sheet_id
        ).first()
        
        if answer_sheet:
            answer_sheet.total_score = review_record.final_total_score
            answer_sheet.objective_score = review_record.final_objective_score
            answer_sheet.subjective_scores = (
                review_record.final_subjective_scores
            )
            answer_sheet.grading_details = (
                review_record.final_grading_details
            )
            answer_sheet.grading_status = 'completed'
            answer_sheet.needs_review = False
            answer_sheet.reviewed_by = review_record.reviewer_id
            answer_sheet.reviewed_at = datetime.utcnow()