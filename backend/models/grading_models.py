"""评分结果数据结构定义
用于标准化AI评分结果的数据格式
"""

from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
from datetime import datetime
from enum import Enum

class GradingStatus(Enum):
    """评分状态枚举"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    ERROR = "error"
    NEEDS_REVIEW = "needs_review"

class QuestionType(Enum):
    """题目类型枚举"""
    CHOICE = "choice"  # 选择题
    FILL_BLANK = "fill_blank"  # 填空题
    SHORT_ANSWER = "short_answer"  # 简答题
    ESSAY = "essay"  # 论述题
    CALCULATION = "calculation"  # 计算题

class QualityLevel(Enum):
    """质量等级枚举"""
    EXCELLENT = "excellent"
    GOOD = "good"
    FAIR = "fair"
    POOR = "poor"
    NEEDS_REVIEW = "needs_review"

@dataclass
class ObjectiveQuestionResult:
    """客观题评分结果"""
    question_number: str
    question_type: QuestionType
    student_answer: str
    standard_answer: str
    is_correct: bool
    earned_score: float
    max_score: float
    confidence: float = 1.0
    note: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        result = asdict(self)
        result['question_type'] = self.question_type.value
        return result

@dataclass
class SubjectiveQuestionResult:
    """主观题评分结果"""
    question_number: str
    question_type: QuestionType
    student_answer: str
    earned_score: float
    max_score: float
    feedback: str
    key_points_covered: List[str]
    missing_points: List[str]
    confidence: float
    grading_criteria: Optional[Dict[str, Any]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        result = asdict(self)
        result['question_type'] = self.question_type.value
        return result

@dataclass
class QualityAssessment:
    """质量评估结果"""
    overall_quality: QualityLevel
    ocr_confidence: float
    grading_confidence: float
    issues: List[str]
    recommendations: List[str]
    needs_human_review: bool = False
    
    def to_dict(self) -> Dict[str, Any]:
        result = asdict(self)
        result['overall_quality'] = self.overall_quality.value
        return result

@dataclass
class GradingResult:
    """完整的评分结果"""
    answer_sheet_id: str
    exam_id: str
    student_id: Optional[str]
    
    # 分数信息
    total_score: float
    objective_score: float
    subjective_total_score: float
    max_possible_score: float
    
    # 详细结果
    objective_results: List[ObjectiveQuestionResult]
    subjective_results: List[SubjectiveQuestionResult]
    
    # 质量评估
    quality_assessment: QualityAssessment
    
    # 元数据
    grading_engine: str = "gemini-2.5-pro"
    processing_time: float = 0.0
    graded_at: datetime = None
    grader_version: str = "1.0.0"
    
    def __post_init__(self):
        if self.graded_at is None:
            self.graded_at = datetime.utcnow()
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典格式"""
        return {
            'answer_sheet_id': self.answer_sheet_id,
            'exam_id': self.exam_id,
            'student_id': self.student_id,
            'total_score': self.total_score,
            'objective_score': self.objective_score,
            'subjective_total_score': self.subjective_total_score,
            'max_possible_score': self.max_possible_score,
            'objective_results': [result.to_dict() for result in self.objective_results],
            'subjective_results': [result.to_dict() for result in self.subjective_results],
            'quality_assessment': self.quality_assessment.to_dict(),
            'grading_engine': self.grading_engine,
            'processing_time': self.processing_time,
            'graded_at': self.graded_at.isoformat() if self.graded_at else None,
            'grader_version': self.grader_version
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'GradingResult':
        """从字典创建实例"""
        # 转换客观题结果
        objective_results = []
        for obj_data in data.get('objective_results', []):
            obj_data['question_type'] = QuestionType(obj_data['question_type'])
            objective_results.append(ObjectiveQuestionResult(**obj_data))
        
        # 转换主观题结果
        subjective_results = []
        for subj_data in data.get('subjective_results', []):
            subj_data['question_type'] = QuestionType(subj_data['question_type'])
            subjective_results.append(SubjectiveQuestionResult(**subj_data))
        
        # 转换质量评估
        quality_data = data.get('quality_assessment', {})
        quality_data['overall_quality'] = QualityLevel(quality_data.get('overall_quality', 'good'))
        quality_assessment = QualityAssessment(**quality_data)
        
        # 转换时间戳
        graded_at = None
        if data.get('graded_at'):
            graded_at = datetime.fromisoformat(data['graded_at'])
        
        return cls(
            answer_sheet_id=data['answer_sheet_id'],
            exam_id=data['exam_id'],
            student_id=data.get('student_id'),
            total_score=data['total_score'],
            objective_score=data['objective_score'],
            subjective_total_score=data['subjective_total_score'],
            max_possible_score=data['max_possible_score'],
            objective_results=objective_results,
            subjective_results=subjective_results,
            quality_assessment=quality_assessment,
            grading_engine=data.get('grading_engine', 'gemini-2.5-pro'),
            processing_time=data.get('processing_time', 0.0),
            graded_at=graded_at,
            grader_version=data.get('grader_version', '1.0.0')
        )
    
    def get_score_percentage(self) -> float:
        """获取得分率"""
        if self.max_possible_score == 0:
            return 0.0
        return round((self.total_score / self.max_possible_score) * 100, 2)
    
    def get_objective_accuracy(self) -> float:
        """获取客观题正确率"""
        if not self.objective_results:
            return 0.0
        
        correct_count = sum(1 for result in self.objective_results if result.is_correct)
        return round((correct_count / len(self.objective_results)) * 100, 2)
    
    def get_quality_issues(self) -> List[str]:
        """获取质量问题列表"""
        return self.quality_assessment.issues
    
    def needs_review(self) -> bool:
        """判断是否需要人工复核"""
        return (
            self.quality_assessment.needs_human_review or
            self.quality_assessment.overall_quality in [QualityLevel.POOR, QualityLevel.NEEDS_REVIEW] or
            self.quality_assessment.grading_confidence < 0.7
        )

@dataclass
class ExamGradingConfig:
    """考试评分配置"""
    exam_id: str
    subject: str
    total_score: float
    
    # 客观题配置
    objective_answers: Dict[str, str]  # 题号 -> 标准答案
    objective_scores: Dict[str, float]  # 题号 -> 分值
    
    # 主观题配置
    subjective_questions: Dict[str, Dict[str, Any]]  # 题号 -> 题目配置
    
    # 评分策略
    strict_mode: bool = False  # 严格模式
    partial_credit: bool = True  # 允许部分分数
    case_sensitive: bool = False  # 大小写敏感
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ExamGradingConfig':
        return cls(**data)

# 工具函数
def create_sample_grading_config() -> ExamGradingConfig:
    """创建示例评分配置"""
    return ExamGradingConfig(
        exam_id="sample_exam_001",
        subject="历史",
        total_score=100.0,
        objective_answers={
            "1": "A",
            "2": "B",
            "3": "C",
            "4": "D",
            "5": "A"
        },
        objective_scores={
            "1": 2.0,
            "2": 2.0,
            "3": 2.0,
            "4": 2.0,
            "5": 2.0
        },
        subjective_questions={
            "6": {
                "question_text": "简述秦朝统一的历史意义",
                "max_score": 15.0,
                "key_points": [
                    "结束了春秋战国的分裂局面",
                    "建立了中央集权制度",
                    "统一了文字、货币、度量衡",
                    "为后世王朝奠定了基础"
                ],
                "sample_answer": "秦朝统一具有重大历史意义：首先结束了春秋战国时期的分裂局面，实现了政治统一；其次建立了中央集权制度，加强了国家治理；再次统一了文字、货币、度量衡等，促进了经济文化交流；最后为后世封建王朝的发展奠定了重要基础。"
            }
        }
    )

def validate_grading_result(result: GradingResult) -> List[str]:
    """验证评分结果的完整性和合理性"""
    issues = []
    
    # 检查分数合理性
    if result.total_score < 0:
        issues.append("总分不能为负数")
    
    if result.total_score > result.max_possible_score:
        issues.append("总分不能超过满分")
    
    # 检查客观题和主观题分数之和
    calculated_total = result.objective_score + result.subjective_total_score
    if abs(calculated_total - result.total_score) > 0.01:
        issues.append(f"分数计算不一致：客观题{result.objective_score} + 主观题{result.subjective_total_score} ≠ 总分{result.total_score}")
    
    # 检查置信度范围
    if not (0 <= result.quality_assessment.grading_confidence <= 1):
        issues.append("评分置信度应在0-1之间")
    
    return issues