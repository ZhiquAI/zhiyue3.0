#!/usr/bin/env python3
"""
分类评分服务
基于题型分类实现专用评分策略
"""

import logging
import re
import json
from typing import Dict, List, Tuple, Optional, Any, Union
from dataclasses import dataclass, asdict
from enum import Enum
from abc import ABC, abstractmethod

from .question_classifier_service import QuestionType, QuestionDifficulty, ClassificationResult
from models.grading_models import GradingResult, ObjectiveQuestionResult, SubjectiveQuestionResult, QualityAssessment, QualityLevel, GradingStatus

logger = logging.getLogger(__name__)

class GradingStrategy(Enum):
    """评分策略枚举"""
    EXACT_MATCH = "exact_match"  # 精确匹配
    FUZZY_MATCH = "fuzzy_match"  # 模糊匹配
    SEMANTIC_MATCH = "semantic_match"  # 语义匹配
    KEYWORD_BASED = "keyword_based"  # 关键词匹配
    RUBRIC_BASED = "rubric_based"  # 评分标准
    AI_ASSISTED = "ai_assisted"  # AI辅助评分

@dataclass
class GradingCriteria:
    """评分标准"""
    strategy: GradingStrategy
    weight: float
    threshold: float
    parameters: Dict[str, Any]

@dataclass
class QuestionGradingConfig:
    """题目评分配置"""
    question_type: QuestionType
    total_points: float
    criteria: List[GradingCriteria]
    partial_credit: bool = True
    min_score: float = 0.0
    max_score: Optional[float] = None

class BaseGrader(ABC):
    """评分器基类"""
    
    def __init__(self, config: QuestionGradingConfig):
        self.config = config
        self.logger = logging.getLogger(self.__class__.__name__)
    
    @abstractmethod
    def grade(self, student_answer: str, correct_answer: str, question_text: str = "") -> Union[ObjectiveQuestionResult, SubjectiveQuestionResult]:
        """评分方法"""
        pass
    
    def _normalize_answer(self, answer: str) -> str:
        """标准化答案"""
        if not answer:
            return ""
        
        # 去除多余空格
        normalized = re.sub(r'\s+', ' ', answer.strip())
        
        # 统一标点符号
        normalized = normalized.replace('，', ',').replace('。', '.').replace('；', ';')
        
        # 转换为小写（对于英文）
        normalized = normalized.lower()
        
        return normalized
    
    def _calculate_partial_score(self, base_score: float, quality_factors: Dict[str, float]) -> float:
        """计算部分分数"""
        if not self.config.partial_credit:
            return base_score
        
        # 应用质量因子
        adjusted_score = base_score
        for factor, weight in quality_factors.items():
            adjusted_score *= (1.0 + weight * 0.1)  # 最多调整10%
        
        # 确保分数在合理范围内
        max_score = self.config.max_score or self.config.total_points
        return max(self.config.min_score, min(adjusted_score, max_score))

class ChoiceQuestionGrader(BaseGrader):
    """选择题评分器"""
    
    def grade(self, student_answer: str, correct_answer: str, question_text: str = "") -> ObjectiveQuestionResult:
        """选择题评分"""
        try:
            # 标准化答案
            student_norm = self._normalize_answer(student_answer)
            correct_norm = self._normalize_answer(correct_answer)
            
            # 提取选项字母
            student_option = self._extract_option(student_norm)
            correct_option = self._extract_option(correct_norm)
            
            # 判断正确性
            is_correct = student_option == correct_option and student_option is not None
            
            # 计算分数
            if is_correct:
                score = self.config.total_points
                feedback = "答案正确"
            else:
                score = 0.0
                if student_option is None:
                    feedback = "未检测到有效答案"
                else:
                    feedback = f"答案错误，正确答案是{correct_option}，您的答案是{student_option}"
            
            return ObjectiveQuestionResult(
                question_number="",  # 由调用方设置
                student_answer=student_answer,
                correct_answer=correct_answer,
                is_correct=is_correct,
                score=score,
                max_score=self.config.total_points,
                feedback=feedback
            )
            
        except Exception as e:
            self.logger.error(f"选择题评分失败: {str(e)}")
            return ObjectiveQuestionResult(
                question_number="",
                student_answer=student_answer,
                correct_answer=correct_answer,
                is_correct=False,
                score=0.0,
                max_score=self.config.total_points,
                feedback=f"评分失败: {str(e)}"
            )
    
    def _extract_option(self, answer: str) -> Optional[str]:
        """提取选项字母"""
        # 查找ABCD选项
        option_match = re.search(r'\b([ABCD])\b', answer.upper())
        if option_match:
            return option_match.group(1)
        
        # 查找数字选项并转换
        num_match = re.search(r'\b([1234])\b', answer)
        if num_match:
            num_to_letter = {'1': 'A', '2': 'B', '3': 'C', '4': 'D'}
            return num_to_letter.get(num_match.group(1))
        
        return None

class MultipleChoiceGrader(BaseGrader):
    """多选题评分器"""
    
    def grade(self, student_answer: str, correct_answer: str, question_text: str = "") -> ObjectiveQuestionResult:
        """多选题评分"""
        try:
            # 提取选项集合
            student_options = self._extract_multiple_options(student_answer)
            correct_options = self._extract_multiple_options(correct_answer)
            
            # 计算正确性
            is_correct = student_options == correct_options
            
            # 计算部分分数
            if is_correct:
                score = self.config.total_points
                feedback = "答案完全正确"
            else:
                # 部分分数计算
                correct_count = len(student_options & correct_options)
                wrong_count = len(student_options - correct_options)
                missed_count = len(correct_options - student_options)
                
                if self.config.partial_credit:
                    # 部分分数策略：正确选项得分，错误选项扣分
                    base_score = (correct_count / len(correct_options)) * self.config.total_points
                    penalty = (wrong_count * 0.5) * (self.config.total_points / len(correct_options))
                    score = max(0, base_score - penalty)
                else:
                    score = 0.0
                
                feedback = f"部分正确。正确选择{correct_count}项，错误选择{wrong_count}项，遗漏{missed_count}项"
            
            return ObjectiveQuestionResult(
                question_number="",
                student_answer=student_answer,
                correct_answer=correct_answer,
                is_correct=is_correct,
                score=score,
                max_score=self.config.total_points,
                feedback=feedback
            )
            
        except Exception as e:
            self.logger.error(f"多选题评分失败: {str(e)}")
            return ObjectiveQuestionResult(
                question_number="",
                student_answer=student_answer,
                correct_answer=correct_answer,
                is_correct=False,
                score=0.0,
                max_score=self.config.total_points,
                feedback=f"评分失败: {str(e)}"
            )
    
    def _extract_multiple_options(self, answer: str) -> set:
        """提取多个选项"""
        options = set()
        
        # 查找所有ABCD选项
        for match in re.finditer(r'\b([ABCD])\b', answer.upper()):
            options.add(match.group(1))
        
        return options

class TrueFalseGrader(BaseGrader):
    """判断题评分器"""
    
    def grade(self, student_answer: str, correct_answer: str, question_text: str = "") -> ObjectiveQuestionResult:
        """判断题评分"""
        try:
            # 标准化答案
            student_norm = self._normalize_answer(student_answer)
            correct_norm = self._normalize_answer(correct_answer)
            
            # 提取判断结果
            student_result = self._extract_true_false(student_norm)
            correct_result = self._extract_true_false(correct_norm)
            
            # 判断正确性
            is_correct = student_result == correct_result and student_result is not None
            
            # 计算分数
            if is_correct:
                score = self.config.total_points
                feedback = "判断正确"
            else:
                score = 0.0
                if student_result is None:
                    feedback = "未检测到有效判断"
                else:
                    correct_text = "正确" if correct_result else "错误"
                    student_text = "正确" if student_result else "错误"
                    feedback = f"判断错误，正确答案是{correct_text}，您的答案是{student_text}"
            
            return ObjectiveQuestionResult(
                question_number="",
                student_answer=student_answer,
                correct_answer=correct_answer,
                is_correct=is_correct,
                score=score,
                max_score=self.config.total_points,
                feedback=feedback
            )
            
        except Exception as e:
            self.logger.error(f"判断题评分失败: {str(e)}")
            return ObjectiveQuestionResult(
                question_number="",
                student_answer=student_answer,
                correct_answer=correct_answer,
                is_correct=False,
                score=0.0,
                max_score=self.config.total_points,
                feedback=f"评分失败: {str(e)}"
            )
    
    def _extract_true_false(self, answer: str) -> Optional[bool]:
        """提取判断结果"""
        # 正确指示词
        true_indicators = ['对', '正确', '是', '√', 'true', 't', '1']
        false_indicators = ['错', '错误', '否', '×', 'false', 'f', '0']
        
        answer_lower = answer.lower()
        
        for indicator in true_indicators:
            if indicator in answer_lower:
                return True
        
        for indicator in false_indicators:
            if indicator in answer_lower:
                return False
        
        return None

class FillBlankGrader(BaseGrader):
    """填空题评分器"""
    
    def grade(self, student_answer: str, correct_answer: str, question_text: str = "") -> ObjectiveQuestionResult:
        """填空题评分"""
        try:
            # 提取填空答案
            student_blanks = self._extract_blanks(student_answer)
            correct_blanks = self._extract_blanks(correct_answer)
            
            if len(student_blanks) != len(correct_blanks):
                return ObjectiveQuestionResult(
                    question_number="",
                    student_answer=student_answer,
                    correct_answer=correct_answer,
                    is_correct=False,
                    score=0.0,
                    max_score=self.config.total_points,
                    feedback=f"填空数量不匹配，期望{len(correct_blanks)}个，实际{len(student_blanks)}个"
                )
            
            # 逐个比较填空
            correct_count = 0
            total_blanks = len(correct_blanks)
            feedback_parts = []
            
            for i, (student_blank, correct_blank) in enumerate(zip(student_blanks, correct_blanks)):
                if self._compare_blank_answers(student_blank, correct_blank):
                    correct_count += 1
                    feedback_parts.append(f"第{i+1}空正确")
                else:
                    feedback_parts.append(f"第{i+1}空错误，正确答案：{correct_blank}")
            
            # 计算分数
            is_correct = correct_count == total_blanks
            if self.config.partial_credit:
                score = (correct_count / total_blanks) * self.config.total_points
            else:
                score = self.config.total_points if is_correct else 0.0
            
            feedback = f"填空正确率：{correct_count}/{total_blanks}。" + "；".join(feedback_parts)
            
            return ObjectiveQuestionResult(
                question_number="",
                student_answer=student_answer,
                correct_answer=correct_answer,
                is_correct=is_correct,
                score=score,
                max_score=self.config.total_points,
                feedback=feedback
            )
            
        except Exception as e:
            self.logger.error(f"填空题评分失败: {str(e)}")
            return ObjectiveQuestionResult(
                question_number="",
                student_answer=student_answer,
                correct_answer=correct_answer,
                is_correct=False,
                score=0.0,
                max_score=self.config.total_points,
                feedback=f"评分失败: {str(e)}"
            )
    
    def _extract_blanks(self, text: str) -> List[str]:
        """提取填空答案"""
        # 多种填空格式
        patterns = [
            r'_{2,}([^_\n]+)_{2,}',  # ___答案___
            r'\(([^)]+)\)',  # (答案)
            r'\[([^\]]+)\]',  # [答案]
            r'【([^】]+)】',  # 【答案】
        ]
        
        blanks = []
        for pattern in patterns:
            matches = re.findall(pattern, text)
            blanks.extend([match.strip() for match in matches])
        
        # 如果没有找到格式化的答案，尝试分割
        if not blanks:
            # 按分隔符分割
            separators = [';', '；', ',', '，', '|', '\n']
            for sep in separators:
                if sep in text:
                    blanks = [part.strip() for part in text.split(sep) if part.strip()]
                    break
        
        # 最后尝试整个文本作为单个答案
        if not blanks and text.strip():
            blanks = [text.strip()]
        
        return blanks
    
    def _compare_blank_answers(self, student: str, correct: str) -> bool:
        """比较填空答案"""
        student_norm = self._normalize_answer(student)
        correct_norm = self._normalize_answer(correct)
        
        # 精确匹配
        if student_norm == correct_norm:
            return True
        
        # 模糊匹配（去除标点符号）
        student_clean = re.sub(r'[^\w\s]', '', student_norm)
        correct_clean = re.sub(r'[^\w\s]', '', correct_norm)
        
        if student_clean == correct_clean:
            return True
        
        # 数值匹配
        if self._is_numeric_match(student_norm, correct_norm):
            return True
        
        return False
    
    def _is_numeric_match(self, student: str, correct: str) -> bool:
        """数值匹配"""
        try:
            student_num = float(re.sub(r'[^\d.-]', '', student))
            correct_num = float(re.sub(r'[^\d.-]', '', correct))
            return abs(student_num - correct_num) < 0.001
        except (ValueError, TypeError):
            return False

class SubjectiveGrader(BaseGrader):
    """主观题评分器基类"""
    
    def __init__(self, config: QuestionGradingConfig, gemini_service=None):
        super().__init__(config)
        self.gemini_service = gemini_service
    
    def grade(self, student_answer: str, correct_answer: str, question_text: str = "") -> SubjectiveQuestionResult:
        """主观题评分"""
        try:
            # 基础检查
            if not student_answer.strip():
                return SubjectiveQuestionResult(
                    question_number="",
                    student_answer=student_answer,
                    score=0.0,
                    max_score=self.config.total_points,
                    feedback="未提供答案",
                    rubric_scores={},
                    quality_indicators={}
                )
            
            # 关键词匹配评分
            keyword_score = self._keyword_based_grading(student_answer, correct_answer)
            
            # 结构分析评分
            structure_score = self._structure_based_grading(student_answer, question_text)
            
            # 内容质量评分
            quality_score = self._quality_based_grading(student_answer)
            
            # AI辅助评分（如果可用）
            ai_score = 0.0
            if self.gemini_service:
                ai_score = self._ai_assisted_grading(student_answer, correct_answer, question_text)
            
            # 综合评分
            final_score = self._combine_subjective_scores({
                'keyword': keyword_score,
                'structure': structure_score,
                'quality': quality_score,
                'ai': ai_score
            })
            
            # 生成反馈
            feedback = self._generate_subjective_feedback({
                'keyword': keyword_score,
                'structure': structure_score,
                'quality': quality_score,
                'ai': ai_score
            })
            
            return SubjectiveQuestionResult(
                question_number="",
                student_answer=student_answer,
                score=final_score,
                max_score=self.config.total_points,
                feedback=feedback,
                rubric_scores={
                    'keyword_matching': keyword_score,
                    'structure_quality': structure_score,
                    'content_quality': quality_score,
                    'ai_assessment': ai_score
                },
                quality_indicators={
                    'completeness': min(len(student_answer) / 200, 1.0),
                    'clarity': structure_score,
                    'accuracy': keyword_score
                }
            )
            
        except Exception as e:
            self.logger.error(f"主观题评分失败: {str(e)}")
            return SubjectiveQuestionResult(
                question_number="",
                student_answer=student_answer,
                score=0.0,
                max_score=self.config.total_points,
                feedback=f"评分失败: {str(e)}",
                rubric_scores={},
                quality_indicators={}
            )
    
    def _keyword_based_grading(self, student_answer: str, correct_answer: str) -> float:
        """基于关键词的评分"""
        if not correct_answer:
            return 0.5  # 默认分数
        
        # 提取关键词
        correct_keywords = self._extract_keywords(correct_answer)
        if not correct_keywords:
            return 0.5
        
        # 计算匹配度
        student_lower = student_answer.lower()
        matched_keywords = 0
        
        for keyword in correct_keywords:
            if keyword.lower() in student_lower:
                matched_keywords += 1
        
        return matched_keywords / len(correct_keywords)
    
    def _extract_keywords(self, text: str) -> List[str]:
        """提取关键词"""
        # 简单的关键词提取（可以改进为更复杂的NLP方法）
        words = re.findall(r'\b\w{2,}\b', text)
        
        # 过滤停用词
        stop_words = {'的', '是', '在', '有', '和', '与', '或', '但', '因为', '所以', '如果', '那么'}
        keywords = [word for word in words if word not in stop_words and len(word) > 1]
        
        return list(set(keywords))  # 去重
    
    def _structure_based_grading(self, student_answer: str, question_text: str) -> float:
        """基于结构的评分"""
        score = 0.0
        
        # 长度合理性
        length_score = min(len(student_answer) / 100, 1.0)  # 100字符为满分
        score += length_score * 0.3
        
        # 段落结构
        paragraphs = student_answer.split('\n')
        paragraph_score = min(len([p for p in paragraphs if p.strip()]) / 3, 1.0)
        score += paragraph_score * 0.2
        
        # 句子完整性
        sentences = re.split(r'[.。!！?？]', student_answer)
        sentence_score = min(len([s for s in sentences if s.strip()]) / 5, 1.0)
        score += sentence_score * 0.3
        
        # 逻辑连接词
        logic_words = ['因为', '所以', '但是', '然而', '首先', '其次', '最后', '总之']
        logic_count = sum(1 for word in logic_words if word in student_answer)
        logic_score = min(logic_count / 3, 1.0)
        score += logic_score * 0.2
        
        return min(score, 1.0)
    
    def _quality_based_grading(self, student_answer: str) -> float:
        """基于质量的评分"""
        score = 0.0
        
        # 词汇丰富度
        words = student_answer.split()
        unique_words = set(words)
        if words:
            vocab_score = len(unique_words) / len(words)
            score += vocab_score * 0.4
        
        # 表达准确性（基于标点符号使用）
        punctuation_count = len(re.findall(r'[,.!?;:]', student_answer))
        if student_answer:
            punct_score = min(punctuation_count / (len(student_answer) / 50), 1.0)
            score += punct_score * 0.3
        
        # 内容深度（基于专业词汇）
        professional_indicators = ['分析', '评价', '比较', '总结', '归纳', '推导', '证明']
        depth_count = sum(1 for indicator in professional_indicators if indicator in student_answer)
        depth_score = min(depth_count / 3, 1.0)
        score += depth_score * 0.3
        
        return min(score, 1.0)
    
    def _ai_assisted_grading(self, student_answer: str, correct_answer: str, question_text: str) -> float:
        """AI辅助评分"""
        if not self.gemini_service:
            return 0.5  # 默认分数
        
        try:
            # 调用AI评分（这里需要实现具体的AI评分逻辑）
            # 这是一个简化的示例
            prompt = f"""
            请对以下学生答案进行评分（0-1分）：
            
            题目：{question_text}
            参考答案：{correct_answer}
            学生答案：{student_answer}
            
            请只返回一个0-1之间的数字分数。
            """
            
            # 这里应该调用实际的AI服务
            # result = self.gemini_service.evaluate_answer(prompt)
            # return float(result)
            
            # 临时返回基于长度的简单评分
            return min(len(student_answer) / 200, 1.0)
            
        except Exception as e:
            self.logger.error(f"AI评分失败: {str(e)}")
            return 0.5
    
    def _combine_subjective_scores(self, scores: Dict[str, float]) -> float:
        """综合主观题分数"""
        # 权重配置
        weights = {
            'keyword': 0.3,
            'structure': 0.2,
            'quality': 0.2,
            'ai': 0.3
        }
        
        # 加权平均
        total_score = 0.0
        total_weight = 0.0
        
        for score_type, score in scores.items():
            if score > 0:  # 只考虑有效分数
                weight = weights.get(score_type, 0.0)
                total_score += score * weight
                total_weight += weight
        
        if total_weight > 0:
            final_score = total_score / total_weight
        else:
            final_score = 0.0
        
        return final_score * self.config.total_points
    
    def _generate_subjective_feedback(self, scores: Dict[str, float]) -> str:
        """生成主观题反馈"""
        feedback_parts = []
        
        # 关键词匹配反馈
        keyword_score = scores.get('keyword', 0.0)
        if keyword_score > 0.8:
            feedback_parts.append("关键点覆盖较好")
        elif keyword_score > 0.5:
            feedback_parts.append("关键点覆盖一般，建议补充重要概念")
        else:
            feedback_parts.append("关键点覆盖不足，需要重点关注核心内容")
        
        # 结构质量反馈
        structure_score = scores.get('structure', 0.0)
        if structure_score > 0.8:
            feedback_parts.append("答案结构清晰")
        elif structure_score > 0.5:
            feedback_parts.append("答案结构基本合理")
        else:
            feedback_parts.append("答案结构需要改进，建议分段表述")
        
        # 内容质量反馈
        quality_score = scores.get('quality', 0.0)
        if quality_score > 0.8:
            feedback_parts.append("表达质量较高")
        elif quality_score > 0.5:
            feedback_parts.append("表达质量一般")
        else:
            feedback_parts.append("表达质量需要提升")
        
        return "；".join(feedback_parts)

class ClassifiedGradingService:
    """分类评分服务"""
    
    def __init__(self, gemini_service=None):
        self.gemini_service = gemini_service
        self.graders = self._initialize_graders()
        self.logger = logging.getLogger(__name__)
    
    def _initialize_graders(self) -> Dict[QuestionType, type]:
        """初始化评分器"""
        return {
            QuestionType.CHOICE: ChoiceQuestionGrader,
            QuestionType.MULTIPLE_CHOICE: MultipleChoiceGrader,
            QuestionType.TRUE_FALSE: TrueFalseGrader,
            QuestionType.FILL_BLANK: FillBlankGrader,
            QuestionType.SHORT_ANSWER: SubjectiveGrader,
            QuestionType.ESSAY: SubjectiveGrader,
            QuestionType.CALCULATION: SubjectiveGrader,
            QuestionType.PROOF: SubjectiveGrader,
            QuestionType.ANALYSIS: SubjectiveGrader,
            QuestionType.DESIGN: SubjectiveGrader
        }
    
    def create_grading_config(self, question_type: QuestionType, total_points: float, **kwargs) -> QuestionGradingConfig:
        """创建评分配置"""
        # 默认评分标准
        default_criteria = {
            QuestionType.CHOICE: [
                GradingCriteria(GradingStrategy.EXACT_MATCH, 1.0, 1.0, {})
            ],
            QuestionType.MULTIPLE_CHOICE: [
                GradingCriteria(GradingStrategy.EXACT_MATCH, 0.7, 1.0, {}),
                GradingCriteria(GradingStrategy.FUZZY_MATCH, 0.3, 0.8, {})
            ],
            QuestionType.TRUE_FALSE: [
                GradingCriteria(GradingStrategy.EXACT_MATCH, 1.0, 1.0, {})
            ],
            QuestionType.FILL_BLANK: [
                GradingCriteria(GradingStrategy.EXACT_MATCH, 0.6, 1.0, {}),
                GradingCriteria(GradingStrategy.FUZZY_MATCH, 0.4, 0.8, {})
            ],
            QuestionType.SHORT_ANSWER: [
                GradingCriteria(GradingStrategy.KEYWORD_BASED, 0.4, 0.7, {}),
                GradingCriteria(GradingStrategy.SEMANTIC_MATCH, 0.3, 0.6, {}),
                GradingCriteria(GradingStrategy.AI_ASSISTED, 0.3, 0.8, {})
            ],
            QuestionType.ESSAY: [
                GradingCriteria(GradingStrategy.RUBRIC_BASED, 0.5, 0.7, {}),
                GradingCriteria(GradingStrategy.AI_ASSISTED, 0.5, 0.8, {})
            ]
        }
        
        criteria = kwargs.get('criteria', default_criteria.get(question_type, []))
        partial_credit = kwargs.get('partial_credit', question_type not in [QuestionType.CHOICE, QuestionType.TRUE_FALSE])
        
        return QuestionGradingConfig(
            question_type=question_type,
            total_points=total_points,
            criteria=criteria,
            partial_credit=partial_credit,
            min_score=kwargs.get('min_score', 0.0),
            max_score=kwargs.get('max_score', None)
        )
    
    def grade_question(self, question_type: QuestionType, student_answer: str, correct_answer: str, 
                      question_text: str = "", total_points: float = 10.0, 
                      config: Optional[QuestionGradingConfig] = None) -> Union[ObjectiveQuestionResult, SubjectiveQuestionResult]:
        """评分单个题目"""
        try:
            # 创建或使用配置
            if config is None:
                config = self.create_grading_config(question_type, total_points)
            
            # 获取评分器类
            grader_class = self.graders.get(question_type)
            if not grader_class:
                raise ValueError(f"不支持的题型: {question_type}")
            
            # 创建评分器实例
            if question_type in [QuestionType.SHORT_ANSWER, QuestionType.ESSAY, 
                               QuestionType.CALCULATION, QuestionType.PROOF, 
                               QuestionType.ANALYSIS, QuestionType.DESIGN]:
                grader = grader_class(config, self.gemini_service)
            else:
                grader = grader_class(config)
            
            # 执行评分
            result = grader.grade(student_answer, correct_answer, question_text)
            
            self.logger.info(f"题型{question_type.value}评分完成，得分: {result.score}/{result.max_score}")
            return result
            
        except Exception as e:
            self.logger.error(f"题目评分失败: {str(e)}")
            # 返回默认结果
            if question_type in [QuestionType.CHOICE, QuestionType.MULTIPLE_CHOICE, 
                               QuestionType.TRUE_FALSE, QuestionType.FILL_BLANK]:
                return ObjectiveQuestionResult(
                    question_number="",
                    student_answer=student_answer,
                    correct_answer=correct_answer,
                    is_correct=False,
                    score=0.0,
                    max_score=total_points,
                    feedback=f"评分失败: {str(e)}"
                )
            else:
                return SubjectiveQuestionResult(
                    question_number="",
                    student_answer=student_answer,
                    score=0.0,
                    max_score=total_points,
                    feedback=f"评分失败: {str(e)}",
                    rubric_scores={},
                    quality_indicators={}
                )
    
    def batch_grade_questions(self, questions_data: List[Dict[str, Any]]) -> List[Union[ObjectiveQuestionResult, SubjectiveQuestionResult]]:
        """批量评分题目"""
        results = []
        
        for i, question_data in enumerate(questions_data):
            self.logger.info(f"评分第{i+1}/{len(questions_data)}道题目")
            
            try:
                question_type = QuestionType(question_data['question_type'])
                result = self.grade_question(
                    question_type=question_type,
                    student_answer=question_data.get('student_answer', ''),
                    correct_answer=question_data.get('correct_answer', ''),
                    question_text=question_data.get('question_text', ''),
                    total_points=question_data.get('total_points', 10.0),
                    config=question_data.get('config')
                )
                
                # 设置题目编号
                result.question_number = question_data.get('question_number', str(i + 1))
                results.append(result)
                
            except Exception as e:
                self.logger.error(f"第{i+1}道题目评分失败: {str(e)}")
                # 添加错误结果
                error_result = ObjectiveQuestionResult(
                    question_number=question_data.get('question_number', str(i + 1)),
                    student_answer=question_data.get('student_answer', ''),
                    correct_answer=question_data.get('correct_answer', ''),
                    is_correct=False,
                    score=0.0,
                    max_score=question_data.get('total_points', 10.0),
                    feedback=f"评分失败: {str(e)}"
                )
                results.append(error_result)
        
        return results
    
    def get_grading_statistics(self, results: List[Union[ObjectiveQuestionResult, SubjectiveQuestionResult]]) -> Dict[str, Any]:
        """获取评分统计信息"""
        if not results:
            return {}
        
        # 基础统计
        total_questions = len(results)
        total_score = sum(result.score for result in results)
        total_max_score = sum(result.max_score for result in results)
        
        # 客观题统计
        objective_results = [r for r in results if isinstance(r, ObjectiveQuestionResult)]
        objective_correct = sum(1 for r in objective_results if r.is_correct)
        
        # 主观题统计
        subjective_results = [r for r in results if isinstance(r, SubjectiveQuestionResult)]
        
        # 分数分布
        score_ranges = {'0-20%': 0, '20-40%': 0, '40-60%': 0, '60-80%': 0, '80-100%': 0}
        for result in results:
            if result.max_score > 0:
                percentage = result.score / result.max_score
                if percentage < 0.2:
                    score_ranges['0-20%'] += 1
                elif percentage < 0.4:
                    score_ranges['20-40%'] += 1
                elif percentage < 0.6:
                    score_ranges['40-60%'] += 1
                elif percentage < 0.8:
                    score_ranges['60-80%'] += 1
                else:
                    score_ranges['80-100%'] += 1
        
        return {
            'total_questions': total_questions,
            'total_score': total_score,
            'total_max_score': total_max_score,
            'average_score': total_score / total_questions if total_questions > 0 else 0,
            'score_percentage': (total_score / total_max_score * 100) if total_max_score > 0 else 0,
            'objective_questions': {
                'count': len(objective_results),
                'correct_count': objective_correct,
                'accuracy': (objective_correct / len(objective_results) * 100) if objective_results else 0
            },
            'subjective_questions': {
                'count': len(subjective_results),
                'average_score': (sum(r.score for r in subjective_results) / len(subjective_results)) if subjective_results else 0
            },
            'score_distribution': score_ranges
        }