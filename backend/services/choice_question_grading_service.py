from typing import Dict, List, Any, Optional, Tuple
import logging
from dataclasses import dataclass
from datetime import datetime

logger = logging.getLogger(__name__)

@dataclass
class ChoiceQuestionScore:
    """选择题得分结果"""
    question_number: str
    student_answer: str
    correct_answer: str
    is_correct: bool
    score: float
    max_score: float
    confidence: float
    feedback: str
    quality_issues: List[str]

@dataclass
class ChoiceGradingResult:
    """选择题评分结果"""
    total_questions: int
    correct_count: int
    total_score: float
    max_total_score: float
    accuracy_rate: float
    average_confidence: float
    question_scores: List[ChoiceQuestionScore]
    quality_summary: Dict[str, Any]
    grading_time: datetime

class ChoiceQuestionGradingService:
    """选择题快速评分服务"""
    
    def __init__(self):
        self.default_score_per_question = 5.0  # 默认每题5分
        self.confidence_threshold = 0.7  # 置信度阈值
        
    def grade_choice_questions(
        self, 
        student_answers: Dict[str, str], 
        reference_answers: Dict[str, str],
        bubble_analysis: Optional[Dict[str, Any]] = None,
        score_config: Optional[Dict[str, float]] = None
    ) -> ChoiceGradingResult:
        """快速评分选择题
        
        Args:
            student_answers: 学生答案 {"1": "A", "2": "B", ...}
            reference_answers: 参考答案 {"1": "A", "2": "C", ...}
            bubble_analysis: 涂卡分析结果
            score_config: 分值配置 {"1": 5.0, "2": 5.0, ...}
        
        Returns:
            ChoiceGradingResult: 评分结果
        """
        try:
            start_time = datetime.now()
            
            # 初始化分值配置
            if score_config is None:
                score_config = {q: self.default_score_per_question for q in reference_answers.keys()}
            
            question_scores = []
            total_score = 0.0
            correct_count = 0
            total_confidence = 0.0
            
            # 逐题评分
            for question_num, correct_answer in reference_answers.items():
                student_answer = student_answers.get(question_num, "")
                max_score = score_config.get(question_num, self.default_score_per_question)
                
                # 评分单题
                question_score = self._grade_single_question(
                    question_num, student_answer, correct_answer, max_score, bubble_analysis
                )
                
                question_scores.append(question_score)
                total_score += question_score.score
                total_confidence += question_score.confidence
                
                if question_score.is_correct:
                    correct_count += 1
            
            # 计算统计信息
            total_questions = len(reference_answers)
            max_total_score = sum(score_config.values())
            accuracy_rate = correct_count / total_questions if total_questions > 0 else 0.0
            average_confidence = total_confidence / total_questions if total_questions > 0 else 0.0
            
            # 生成质量摘要
            quality_summary = self._generate_quality_summary(question_scores, bubble_analysis)
            
            result = ChoiceGradingResult(
                total_questions=total_questions,
                correct_count=correct_count,
                total_score=total_score,
                max_total_score=max_total_score,
                accuracy_rate=accuracy_rate,
                average_confidence=average_confidence,
                question_scores=question_scores,
                quality_summary=quality_summary,
                grading_time=start_time
            )
            
            logger.info(f"选择题评分完成: {total_questions}题, 正确{correct_count}题, 得分{total_score:.1f}/{max_total_score:.1f}")
            return result
            
        except Exception as e:
            logger.error(f"选择题评分失败: {str(e)}")
            raise
    
    def _grade_single_question(
        self, 
        question_num: str, 
        student_answer: str, 
        correct_answer: str, 
        max_score: float,
        bubble_analysis: Optional[Dict[str, Any]] = None
    ) -> ChoiceQuestionScore:
        """评分单个选择题"""
        
        # 标准化答案
        student_norm = self._normalize_answer(student_answer)
        correct_norm = self._normalize_answer(correct_answer)
        
        # 判断正确性
        is_correct = student_norm == correct_norm and student_norm != ""
        
        # 计算得分
        score = max_score if is_correct else 0.0
        
        # 计算置信度
        confidence = self._calculate_confidence(student_answer, bubble_analysis, question_num)
        
        # 生成反馈
        feedback = self._generate_feedback(is_correct, student_norm, correct_norm, confidence)
        
        # 检测质量问题
        quality_issues = self._detect_quality_issues(student_answer, confidence, bubble_analysis, question_num)
        
        return ChoiceQuestionScore(
            question_number=question_num,
            student_answer=student_answer,
            correct_answer=correct_answer,
            is_correct=is_correct,
            score=score,
            max_score=max_score,
            confidence=confidence,
            feedback=feedback,
            quality_issues=quality_issues
        )
    
    def _normalize_answer(self, answer: str) -> str:
        """标准化答案格式"""
        if not answer:
            return ""
        
        # 转换为大写并去除空格
        normalized = answer.strip().upper()
        
        # 提取选项字母 (A, B, C, D等)
        import re
        match = re.search(r'[A-Z]', normalized)
        return match.group() if match else ""
    
    def _calculate_confidence(self, student_answer: str, bubble_analysis: Optional[Dict[str, Any]], question_num: str) -> float:
        """计算识别置信度"""
        base_confidence = 0.8  # 基础置信度
        
        # 如果没有答案，置信度为0
        if not student_answer or not student_answer.strip():
            return 0.0
        
        # 基于涂卡分析调整置信度
        if bubble_analysis and 'detection_results' in bubble_analysis:
            for detection in bubble_analysis['detection_results']:
                if detection.get('question_number') == question_num:
                    bubble_confidence = detection.get('confidence', 0.8)
                    quality_issues = detection.get('quality_issues', [])
                    
                    # 涂卡置信度影响
                    base_confidence = (base_confidence + bubble_confidence) / 2
                    
                    # 质量问题扣分
                    if quality_issues:
                        base_confidence -= len(quality_issues) * 0.1
                    
                    break
        
        # 基于答案格式调整置信度
        normalized = self._normalize_answer(student_answer)
        if not normalized:
            base_confidence *= 0.5  # 无法识别的答案格式
        elif len(normalized) == 1 and normalized in 'ABCDEFGH':
            base_confidence *= 1.0  # 标准选项格式
        else:
            base_confidence *= 0.8  # 非标准格式
        
        return max(0.0, min(1.0, base_confidence))
    
    def _generate_feedback(self, is_correct: bool, student_answer: str, correct_answer: str, confidence: float) -> str:
        """生成评分反馈"""
        if not student_answer:
            return "未作答"
        
        if is_correct:
            if confidence >= self.confidence_threshold:
                return "答案正确"
            else:
                return "答案正确，但识别置信度较低，建议复核"
        else:
            if confidence >= self.confidence_threshold:
                return f"答案错误，正确答案是{correct_answer}"
            else:
                return f"答案错误，正确答案是{correct_answer}，且识别置信度较低"
    
    def _detect_quality_issues(self, student_answer: str, confidence: float, bubble_analysis: Optional[Dict[str, Any]], question_num: str) -> List[str]:
        """检测质量问题"""
        issues = []
        
        # 检测未作答
        if not student_answer or not student_answer.strip():
            issues.append("未作答")
            return issues
        
        # 检测低置信度
        if confidence < self.confidence_threshold:
            issues.append("识别置信度较低")
        
        # 检测答案格式问题
        normalized = self._normalize_answer(student_answer)
        if not normalized:
            issues.append("答案格式无法识别")
        
        # 基于涂卡分析检测问题
        if bubble_analysis and 'detection_results' in bubble_analysis:
            for detection in bubble_analysis['detection_results']:
                if detection.get('question_number') == question_num:
                    bubble_issues = detection.get('quality_issues', [])
                    issues.extend(bubble_issues)
                    break
        
        return issues
    
    def _generate_quality_summary(self, question_scores: List[ChoiceQuestionScore], bubble_analysis: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """生成质量摘要"""
        summary = {
            'total_questions': len(question_scores),
            'high_confidence_count': 0,
            'low_confidence_count': 0,
            'quality_issues_count': 0,
            'unanswered_count': 0,
            'recommendations': []
        }
        
        for score in question_scores:
            if score.confidence >= self.confidence_threshold:
                summary['high_confidence_count'] += 1
            else:
                summary['low_confidence_count'] += 1
            
            if score.quality_issues:
                summary['quality_issues_count'] += 1
            
            if not score.student_answer.strip():
                summary['unanswered_count'] += 1
        
        # 生成建议
        if summary['low_confidence_count'] > 0:
            summary['recommendations'].append(f"有{summary['low_confidence_count']}题识别置信度较低，建议人工复核")
        
        if summary['unanswered_count'] > 0:
            summary['recommendations'].append(f"有{summary['unanswered_count']}题未作答")
        
        if bubble_analysis:
            bubble_quality = bubble_analysis.get('overall_quality_score', 1.0)
            if bubble_quality < 0.7:
                summary['recommendations'].append("涂卡质量较差，建议重新扫描")
        
        return summary
    
    def export_grading_report(self, result: ChoiceGradingResult) -> Dict[str, Any]:
        """导出评分报告"""
        return {
            'summary': {
                'total_questions': result.total_questions,
                'correct_count': result.correct_count,
                'total_score': result.total_score,
                'max_total_score': result.max_total_score,
                'accuracy_rate': f"{result.accuracy_rate:.1%}",
                'average_confidence': f"{result.average_confidence:.2f}",
                'grading_time': result.grading_time.isoformat()
            },
            'question_details': [
                {
                    'question_number': score.question_number,
                    'student_answer': score.student_answer,
                    'correct_answer': score.correct_answer,
                    'is_correct': score.is_correct,
                    'score': score.score,
                    'max_score': score.max_score,
                    'confidence': score.confidence,
                    'feedback': score.feedback,
                    'quality_issues': score.quality_issues
                }
                for score in result.question_scores
            ],
            'quality_summary': result.quality_summary
        }