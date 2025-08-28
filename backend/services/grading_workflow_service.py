"""阅卷工作流程管理服务
优化试卷分配和状态管理，提供完整的工作流程控制
"""

from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, case
from datetime import datetime, timedelta
from enum import Enum
import uuid

from models.production_models import AnswerSheet, User, Exam
from models.grading_review_models import (
    GradingReviewRecord, ReviewTask, ReviewType, ReviewStatus
)
from utils.logger import get_logger

logger = get_logger(__name__)


class WorkflowStage(Enum):
    """工作流程阶段"""
    PREPARATION = "preparation"  # 准备阶段
    UPLOAD = "upload"  # 上传阶段
    PROCESSING = "processing"  # 处理阶段
    ASSIGNMENT = "assignment"  # 分配阶段
    GRADING = "grading"  # 阅卷阶段
    REVIEW = "review"  # 复核阶段
    COMPLETION = "completion"  # 完成阶段


class AssignmentStrategy(Enum):
    """分配策略"""
    RANDOM = "random"  # 随机分配
    BALANCED = "balanced"  # 均衡分配
    EXPERTISE = "expertise"  # 专业匹配
    WORKLOAD = "workload"  # 工作量优先


class GradingWorkflowService:
    """阅卷工作流程服务"""

    def __init__(self, db: Session):
        self.db = db

    def initialize_workflow(self, exam_id: str, config: Dict[str, Any]) -> str:
        """初始化阅卷工作流程"""
        try:
            workflow_id = str(uuid.uuid4())
            
            # 创建工作流程记录
            workflow_data = {
                'id': workflow_id,
                'exam_id': exam_id,
                'stage': WorkflowStage.PREPARATION.value,
                'config': config,
                'created_at': datetime.now(),
                'status': 'active'
            }
            
            # 这里应该有一个WorkflowRecord模型，暂时用日志记录
            logger.info(f"初始化工作流程: {workflow_id}, 考试: {exam_id}")
            
            return workflow_id

        except Exception as e:
            logger.error(f"初始化工作流程失败: {str(e)}")
            raise

    def get_workflow_status(self, workflow_id: str) -> Dict[str, Any]:
        """获取工作流程状态"""
        try:
            # 获取考试信息
            exam = self.db.query(Exam).filter(
                Exam.id == workflow_id  # 简化处理，使用exam_id作为workflow_id
            ).first()
            
            if not exam:
                raise ValueError(f"工作流程不存在: {workflow_id}")

            # 统计各阶段状态
            answer_sheets = self.db.query(AnswerSheet).filter(
                AnswerSheet.exam_id == exam.id
            ).all()

            total_sheets = len(answer_sheets)
            uploaded_sheets = len([s for s in answer_sheets if s.status != 'pending'])
            processed_sheets = len([s for s in answer_sheets if s.status == 'processed'])
            graded_sheets = len([s for s in answer_sheets if s.status == 'graded'])

            return {
                'workflow_id': workflow_id,
                'exam_id': exam.id,
                'stage': self._determine_current_stage(exam, answer_sheets),
                'statistics': {
                    'total_sheets': total_sheets,
                    'uploaded_sheets': uploaded_sheets,
                    'processed_sheets': processed_sheets,
                    'graded_sheets': graded_sheets,
                    'completion_rate': graded_sheets / total_sheets if total_sheets > 0 else 0
                },
                'updated_at': datetime.now()
            }

        except Exception as e:
            logger.error(f"获取工作流程状态失败: {str(e)}")
            raise

    def assign_papers_to_graders(
        self, exam_id: str, strategy: AssignmentStrategy = AssignmentStrategy.BALANCED
    ) -> Dict[str, Any]:
        """智能分配试卷给阅卷员"""
        try:
            # 获取待分配的答题卡
            answer_sheets = self.db.query(AnswerSheet).filter(
                and_(
                    AnswerSheet.exam_id == exam_id,
                    AnswerSheet.status == 'processed'
                )
            ).all()

            # 获取可用的阅卷员
            graders = self.db.query(User).filter(
                User.role.in_(['teacher', 'reviewer', 'senior_reviewer'])
            ).all()

            if not graders:
                raise ValueError("没有可用的阅卷员")

            # 根据策略分配
            assignments = self._execute_assignment_strategy(
                answer_sheets, graders, strategy
            )

            # 更新分配结果
            for assignment in assignments:
                answer_sheet = self.db.query(AnswerSheet).filter(
                    AnswerSheet.id == assignment['answer_sheet_id']
                ).first()
                if answer_sheet:
                    answer_sheet.assigned_grader_id = assignment['grader_id']
                    answer_sheet.assigned_at = datetime.now()
                    answer_sheet.status = 'assigned'

            self.db.commit()

            logger.info(f"完成试卷分配: {len(assignments)} 份试卷")
            
            return {
                'total_assigned': len(assignments),
                'assignments': assignments,
                'strategy_used': strategy.value
            }

        except Exception as e:
            self.db.rollback()
            logger.error(f"试卷分配失败: {str(e)}")
            raise

    def get_grader_workload(self, grader_id: str) -> Dict[str, Any]:
        """获取阅卷员工作负载"""
        try:
            # 统计分配给该阅卷员的试卷
            assigned_count = self.db.query(func.count(AnswerSheet.id)).filter(
                and_(
                    AnswerSheet.assigned_grader_id == grader_id,
                    AnswerSheet.status.in_(['assigned', 'grading'])
                )
            ).scalar()

            # 统计已完成的试卷
            completed_count = self.db.query(func.count(AnswerSheet.id)).filter(
                and_(
                    AnswerSheet.assigned_grader_id == grader_id,
                    AnswerSheet.status == 'graded'
                )
            ).scalar()

            # 计算平均阅卷时间
            avg_grading_time = self.db.query(
                func.avg(
                    func.extract('epoch', AnswerSheet.graded_at - AnswerSheet.assigned_at)
                )
            ).filter(
                and_(
                    AnswerSheet.assigned_grader_id == grader_id,
                    AnswerSheet.status == 'graded',
                    AnswerSheet.graded_at.isnot(None)
                )
            ).scalar()

            return {
                'grader_id': grader_id,
                'assigned_count': assigned_count or 0,
                'completed_count': completed_count or 0,
                'pending_count': (assigned_count or 0) - (completed_count or 0),
                'completion_rate': (completed_count / assigned_count) if assigned_count > 0 else 0,
                'avg_grading_time_minutes': (avg_grading_time / 60) if avg_grading_time else 0
            }

        except Exception as e:
            logger.error(f"获取阅卷员工作负载失败: {str(e)}")
            raise

    def optimize_assignment_balance(self, exam_id: str) -> Dict[str, Any]:
        """优化分配平衡性"""
        try:
            # 获取所有阅卷员的工作负载
            graders = self.db.query(User).filter(
                User.role.in_(['teacher', 'reviewer', 'senior_reviewer'])
            ).all()

            workloads = []
            for grader in graders:
                workload = self.get_grader_workload(grader.id)
                workloads.append(workload)

            # 计算负载不平衡度
            pending_counts = [w['pending_count'] for w in workloads]
            max_pending = max(pending_counts) if pending_counts else 0
            min_pending = min(pending_counts) if pending_counts else 0
            imbalance_ratio = (max_pending - min_pending) / max_pending if max_pending > 0 else 0

            # 如果不平衡度超过阈值，进行重新分配
            if imbalance_ratio > 0.3:  # 30%的不平衡阈值
                self._rebalance_assignments(exam_id, workloads)
                return {
                    'rebalanced': True,
                    'original_imbalance': imbalance_ratio,
                    'workloads': workloads
                }
            else:
                return {
                    'rebalanced': False,
                    'imbalance_ratio': imbalance_ratio,
                    'workloads': workloads
                }

        except Exception as e:
            logger.error(f"优化分配平衡失败: {str(e)}")
            raise

    def track_grading_progress(self, exam_id: str) -> Dict[str, Any]:
        """跟踪阅卷进度"""
        try:
            # 获取总体进度
            total_sheets = self.db.query(func.count(AnswerSheet.id)).filter(
                AnswerSheet.exam_id == exam_id
            ).scalar()

            graded_sheets = self.db.query(func.count(AnswerSheet.id)).filter(
                and_(
                    AnswerSheet.exam_id == exam_id,
                    AnswerSheet.status == 'graded'
                )
            ).scalar()

            # 获取各阅卷员进度
            grader_progress = self.db.query(
                AnswerSheet.assigned_grader_id,
                func.count(case([(AnswerSheet.status == 'graded', 1)])).label('completed'),
                func.count(AnswerSheet.id).label('assigned')
            ).filter(
                AnswerSheet.exam_id == exam_id
            ).group_by(AnswerSheet.assigned_grader_id).all()

            # 预估完成时间
            estimated_completion = self._estimate_completion_time(exam_id)

            return {
                'exam_id': exam_id,
                'total_sheets': total_sheets or 0,
                'graded_sheets': graded_sheets or 0,
                'completion_rate': (graded_sheets / total_sheets) if total_sheets > 0 else 0,
                'grader_progress': [
                    {
                        'grader_id': progress.assigned_grader_id,
                        'completed': progress.completed,
                        'assigned': progress.assigned,
                        'completion_rate': progress.completed / progress.assigned if progress.assigned > 0 else 0
                    }
                    for progress in grader_progress
                ],
                'estimated_completion': estimated_completion
            }

        except Exception as e:
            logger.error(f"跟踪阅卷进度失败: {str(e)}")
            raise

    def _determine_current_stage(self, exam: Exam, answer_sheets: List[AnswerSheet]) -> str:
        """确定当前工作流程阶段"""
        if not answer_sheets:
            return WorkflowStage.PREPARATION.value
        
        uploaded_count = len([s for s in answer_sheets if s.status != 'pending'])
        processed_count = len([s for s in answer_sheets if s.status == 'processed'])
        assigned_count = len([s for s in answer_sheets if s.assigned_grader_id])
        graded_count = len([s for s in answer_sheets if s.status == 'graded'])
        
        total_count = len(answer_sheets)
        
        if graded_count == total_count:
            return WorkflowStage.COMPLETION.value
        elif graded_count > 0:
            return WorkflowStage.GRADING.value
        elif assigned_count > 0:
            return WorkflowStage.ASSIGNMENT.value
        elif processed_count == total_count:
            return WorkflowStage.PROCESSING.value
        elif uploaded_count > 0:
            return WorkflowStage.UPLOAD.value
        else:
            return WorkflowStage.PREPARATION.value

    def _execute_assignment_strategy(
        self, answer_sheets: List[AnswerSheet], graders: List[User], 
        strategy: AssignmentStrategy
    ) -> List[Dict[str, Any]]:
        """执行分配策略"""
        assignments = []
        
        if strategy == AssignmentStrategy.BALANCED:
            # 均衡分配：按工作负载分配
            grader_workloads = {grader.id: 0 for grader in graders}
            
            for sheet in answer_sheets:
                # 选择工作负载最少的阅卷员
                min_workload_grader = min(grader_workloads.keys(), 
                                        key=lambda x: grader_workloads[x])
                assignments.append({
                    'answer_sheet_id': sheet.id,
                    'grader_id': min_workload_grader
                })
                grader_workloads[min_workload_grader] += 1
                
        elif strategy == AssignmentStrategy.RANDOM:
            # 随机分配
            import random
            for sheet in answer_sheets:
                grader = random.choice(graders)
                assignments.append({
                    'answer_sheet_id': sheet.id,
                    'grader_id': grader.id
                })
        
        return assignments

    def _rebalance_assignments(self, exam_id: str, workloads: List[Dict[str, Any]]):
        """重新平衡分配"""
        # 找出负载过重和过轻的阅卷员
        avg_pending = sum(w['pending_count'] for w in workloads) / len(workloads)
        
        overloaded = [w for w in workloads if w['pending_count'] > avg_pending * 1.2]
        underloaded = [w for w in workloads if w['pending_count'] < avg_pending * 0.8]
        
        # 重新分配部分试卷
        for overloaded_grader in overloaded:
            if not underloaded:
                break
                
            # 获取该阅卷员的部分待阅试卷
            excess_count = int(overloaded_grader['pending_count'] - avg_pending)
            sheets_to_reassign = self.db.query(AnswerSheet).filter(
                and_(
                    AnswerSheet.exam_id == exam_id,
                    AnswerSheet.assigned_grader_id == overloaded_grader['grader_id'],
                    AnswerSheet.status == 'assigned'
                )
            ).limit(excess_count).all()
            
            # 重新分配给负载较轻的阅卷员
            for sheet in sheets_to_reassign:
                if underloaded:
                    target_grader = underloaded.pop(0)
                    sheet.assigned_grader_id = target_grader['grader_id']
                    sheet.assigned_at = datetime.now()

    def _estimate_completion_time(self, exam_id: str) -> Optional[datetime]:
        """预估完成时间"""
        try:
            # 获取平均阅卷速度
            avg_time_per_sheet = self.db.query(
                func.avg(
                    func.extract('epoch', AnswerSheet.graded_at - AnswerSheet.assigned_at)
                )
            ).filter(
                and_(
                    AnswerSheet.exam_id == exam_id,
                    AnswerSheet.status == 'graded',
                    AnswerSheet.graded_at.isnot(None)
                )
            ).scalar()
            
            if not avg_time_per_sheet:
                return None
            
            # 获取剩余试卷数量
            remaining_sheets = self.db.query(func.count(AnswerSheet.id)).filter(
                and_(
                    AnswerSheet.exam_id == exam_id,
                    AnswerSheet.status != 'graded'
                )
            ).scalar()
            
            # 计算预估完成时间
            estimated_seconds = remaining_sheets * avg_time_per_sheet
            return datetime.now() + timedelta(seconds=estimated_seconds)
            
        except Exception as e:
            logger.error(f"预估完成时间失败: {str(e)}")
            return None