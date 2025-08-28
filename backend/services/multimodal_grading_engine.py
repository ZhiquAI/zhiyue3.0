"""
多模态评分引擎 - Phase 3 AI智能化核心组件
支持文字、图像、手写识别的综合智能评分系统
"""

import asyncio
import json
import numpy as np
import cv2
import torch
import torch.nn as nn
from typing import Dict, List, Any, Optional, Union, Tuple
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime
import logging
from abc import ABC, abstractmethod

# AI/ML 库导入
try:
    import transformers
    from transformers import AutoTokenizer, AutoModel, pipeline
    import torchvision.transforms as transforms
    from PIL import Image
    import scikit_learn as sklearn
    from sklearn.metrics.pairwise import cosine_similarity
except ImportError:
    # 开发环境可能没有安装这些库，使用模拟实现
    transformers = None
    torch = None

# 导入新的置信度计算器
from .confidence_calculator import confidence_calculator, ConfidenceMetrics

logger = logging.getLogger(__name__)


class QuestionType(Enum):
    """题型枚举"""
    MULTIPLE_CHOICE = "multiple_choice"      # 选择题
    FILL_IN_BLANK = "fill_in_blank"         # 填空题
    SHORT_ANSWER = "short_answer"           # 简答题
    ESSAY = "essay"                         # 作文题
    CALCULATION = "calculation"             # 计算题
    DIAGRAM = "diagram"                     # 图表题
    HANDWRITING = "handwriting"             # 手写题


class GradingMode(Enum):
    """评分模式"""
    AUTOMATIC = "automatic"                 # 全自动评分
    ASSISTED = "assisted"                   # AI辅助评分
    MANUAL = "manual"                       # 人工评分
    HYBRID = "hybrid"                       # 混合评分


@dataclass
class GradingCriteria:
    """评分标准"""
    max_score: float
    rubric: Dict[str, Any]                  # 评分细则
    keywords: List[str] = field(default_factory=list)
    acceptable_answers: List[str] = field(default_factory=list)
    penalty_rules: Dict[str, float] = field(default_factory=dict)
    bonus_rules: Dict[str, float] = field(default_factory=dict)


@dataclass
class StudentAnswer:
    """学生答案"""
    question_id: str
    question_type: QuestionType
    raw_text: str                           # OCR识别的原始文字
    processed_text: str                     # 预处理后的文字
    image_data: Optional[bytes] = None      # 原始图像数据
    handwriting_regions: List[Dict] = field(default_factory=list)
    confidence_score: float = 0.0          # OCR置信度
    preprocessing_metadata: Dict = field(default_factory=dict)


@dataclass
class GradingResult:
    """评分结果"""
    question_id: str
    student_id: str
    score: float
    max_score: float
    confidence: float                       # AI评分置信度
    grading_mode: GradingMode
    detailed_feedback: Dict[str, Any]
    ai_reasoning: str                       # AI评分推理过程
    suggestions: List[str] = field(default_factory=list)
    timestamp: datetime = field(default_factory=datetime.now)
    review_required: bool = False           # 是否需要人工复核


class AIModel(ABC):
    """AI模型抽象基类"""
    
    @abstractmethod
    async def initialize(self) -> bool:
        """初始化模型"""
        pass
    
    @abstractmethod
    async def predict(self, input_data: Any) -> Dict[str, Any]:
        """模型推理"""
        pass
    
    @abstractmethod
    def get_model_info(self) -> Dict[str, str]:
        """获取模型信息"""
        pass


class TextClassificationModel(AIModel):
    """文本分类模型"""
    
    def __init__(self, model_name: str = "bert-base-chinese"):
        self.model_name = model_name
        self.tokenizer = None
        self.model = None
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu") if torch else "cpu"
    
    async def initialize(self) -> bool:
        """初始化BERT文本分类模型"""
        try:
            if transformers is None:
                # 模拟模式
                logger.info("在模拟模式下初始化文本分类模型")
                return True
            
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            self.model = AutoModel.from_pretrained(self.model_name)
            self.model.to(self.device)
            self.model.eval()
            
            logger.info(f"文本分类模型 {self.model_name} 初始化成功")
            return True
            
        except Exception as e:
            logger.error(f"文本分类模型初始化失败: {e}")
            return False
    
    async def predict(self, input_data: str) -> Dict[str, Any]:
        """文本分类预测"""
        if transformers is None:
            # 模拟预测结果
            return {
                "similarity_score": np.random.uniform(0.7, 0.95),
                "semantic_features": [np.random.uniform(-1, 1) for _ in range(768)],
                "confidence": np.random.uniform(0.8, 0.95)
            }
        
        try:
            # 文本编码
            inputs = self.tokenizer(
                input_data, 
                return_tensors="pt", 
                max_length=512, 
                truncation=True, 
                padding=True
            )
            inputs = {k: v.to(self.device) for k, v in inputs.items()}
            
            # 模型推理
            with torch.no_grad():
                outputs = self.model(**inputs)
                embeddings = outputs.last_hidden_state.mean(dim=1)  # 平均池化
            
            return {
                "embeddings": embeddings.cpu().numpy().tolist(),
                "confidence": 0.95,
                "processing_time": 0.1
            }
            
        except Exception as e:
            logger.error(f"文本分类预测失败: {e}")
            return {"error": str(e)}
    
    def get_model_info(self) -> Dict[str, str]:
        return {
            "name": "Text Classification Model",
            "type": "BERT-based",
            "version": "1.0.0",
            "device": str(self.device)
        }


class HandwritingRecognitionModel(AIModel):
    """手写识别模型"""
    
    def __init__(self):
        self.model = None
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu") if torch else "cpu"
    
    async def initialize(self) -> bool:
        """初始化手写识别模型"""
        try:
            # 模拟初始化
            logger.info("手写识别模型初始化成功")
            return True
            
        except Exception as e:
            logger.error(f"手写识别模型初始化失败: {e}")
            return False
    
    async def predict(self, image_data: bytes) -> Dict[str, Any]:
        """手写识别预测"""
        try:
            # 模拟手写识别
            recognized_text = "这是识别出的手写文字"
            confidence = np.random.uniform(0.85, 0.95)
            
            return {
                "recognized_text": recognized_text,
                "confidence": confidence,
                "character_boxes": [
                    {"char": "这", "bbox": [10, 20, 30, 40], "confidence": 0.95},
                    {"char": "是", "bbox": [35, 20, 55, 40], "confidence": 0.92},
                    # ... 更多字符
                ],
                "processing_time": 0.3
            }
            
        except Exception as e:
            logger.error(f"手写识别失败: {e}")
            return {"error": str(e)}
    
    def get_model_info(self) -> Dict[str, str]:
        return {
            "name": "Handwriting Recognition Model",
            "type": "CNN-LSTM",
            "version": "1.0.0",
            "device": str(self.device)
        }


class SemanticSimilarityModel(AIModel):
    """语义相似度模型"""
    
    def __init__(self):
        self.model = None
        self.sentence_transformer = None
    
    async def initialize(self) -> bool:
        """初始化语义相似度模型"""
        try:
            # 模拟初始化
            logger.info("语义相似度模型初始化成功")
            return True
            
        except Exception as e:
            logger.error(f"语义相似度模型初始化失败: {e}")
            return False
    
    async def predict(self, input_data: Dict[str, str]) -> Dict[str, Any]:
        """计算语义相似度"""
        try:
            text1 = input_data.get("text1", "")
            text2 = input_data.get("text2", "")
            
            # 模拟语义相似度计算
            similarity_score = np.random.uniform(0.6, 0.95)
            
            return {
                "similarity_score": similarity_score,
                "confidence": 0.9,
                "semantic_analysis": {
                    "key_concepts_match": ["重要概念1", "重要概念2"],
                    "missing_concepts": ["缺失概念1"],
                    "extra_concepts": ["额外概念1"]
                }
            }
            
        except Exception as e:
            logger.error(f"语义相似度计算失败: {e}")
            return {"error": str(e)}
    
    def get_model_info(self) -> Dict[str, str]:
        return {
            "name": "Semantic Similarity Model",
            "type": "Sentence-BERT",
            "version": "1.0.0"
        }


class MultimodalGradingEngine:
    """多模态评分引擎"""
    
    def __init__(self):
        self.models = {}
        self.grading_strategies = {}
        self.is_initialized = False
        
    async def initialize(self) -> bool:
        """初始化评分引擎"""
        try:
            logger.info("开始初始化多模态评分引擎...")
            
            # 初始化各种AI模型
            self.models = {
                "text_classification": TextClassificationModel(),
                "handwriting_recognition": HandwritingRecognitionModel(),
                "semantic_similarity": SemanticSimilarityModel(),
            }
            
            # 并行初始化所有模型
            init_tasks = [model.initialize() for model in self.models.values()]
            init_results = await asyncio.gather(*init_tasks, return_exceptions=True)
            
            # 检查初始化结果
            failed_models = []
            for i, (name, result) in enumerate(zip(self.models.keys(), init_results)):
                if isinstance(result, Exception) or not result:
                    failed_models.append(name)
                    logger.error(f"模型 {name} 初始化失败")
            
            if failed_models:
                logger.warning(f"部分模型初始化失败: {failed_models}")
            
            # 注册评分策略
            self._register_grading_strategies()
            
            self.is_initialized = True
            logger.info("多模态评分引擎初始化完成")
            return True
            
        except Exception as e:
            logger.error(f"评分引擎初始化失败: {e}")
            return False
    
    def _register_grading_strategies(self):
        """注册评分策略"""
        self.grading_strategies = {
            QuestionType.MULTIPLE_CHOICE: self._grade_multiple_choice,
            QuestionType.FILL_IN_BLANK: self._grade_fill_in_blank,
            QuestionType.SHORT_ANSWER: self._grade_short_answer,
            QuestionType.ESSAY: self._grade_essay,
            QuestionType.CALCULATION: self._grade_calculation,
            QuestionType.HANDWRITING: self._grade_handwriting,
        }
    
    async def grade_answer(
        self, 
        answer: StudentAnswer, 
        criteria: GradingCriteria,
        mode: GradingMode = GradingMode.AUTOMATIC
    ) -> GradingResult:
        """评分主入口"""
        if not self.is_initialized:
            raise RuntimeError("评分引擎未初始化")
        
        try:
            logger.info(f"开始评分: 题目{answer.question_id}, 类型{answer.question_type}")
            
            # 获取对应的评分策略
            strategy = self.grading_strategies.get(answer.question_type)
            if not strategy:
                raise ValueError(f"不支持的题型: {answer.question_type}")
            
            # 执行评分
            result = await strategy(answer, criteria, mode)
            
            # 后处理
            result = await self._post_process_result(result, criteria, mode)
            
            logger.info(f"评分完成: 得分{result.score}/{result.max_score}, 置信度{result.confidence}")
            return result
            
        except Exception as e:
            logger.error(f"评分失败: {e}")
            # 返回错误结果
            return GradingResult(
                question_id=answer.question_id,
                student_id="unknown",
                score=0.0,
                max_score=criteria.max_score,
                confidence=0.0,
                grading_mode=mode,
                detailed_feedback={"error": str(e)},
                ai_reasoning="评分过程中发生错误",
                review_required=True
            )
    
    async def _grade_multiple_choice(
        self, 
        answer: StudentAnswer, 
        criteria: GradingCriteria,
        mode: GradingMode
    ) -> GradingResult:
        """选择题评分"""
        try:
            # 提取学生选择
            student_choice = self._extract_choice(answer.processed_text)
            correct_answer = criteria.acceptable_answers[0] if criteria.acceptable_answers else ""
            
            # 判断正误
            is_correct = student_choice.upper() == correct_answer.upper()
            score = criteria.max_score if is_correct else 0.0
            
            return GradingResult(
                question_id=answer.question_id,
                student_id="student",
                score=score,
                max_score=criteria.max_score,
                confidence=0.95,
                grading_mode=mode,
                detailed_feedback={
                    "student_choice": student_choice,
                    "correct_answer": correct_answer,
                    "is_correct": is_correct
                },
                ai_reasoning=f"学生选择了 {student_choice}，正确答案是 {correct_answer}"
            )
            
        except Exception as e:
            logger.error(f"选择题评分失败: {e}")
            raise
    
    async def _grade_short_answer(
        self, 
        answer: StudentAnswer, 
        criteria: GradingCriteria,
        mode: GradingMode
    ) -> GradingResult:
        """简答题评分"""
        try:
            # 使用语义相似度模型评分
            best_score = 0.0
            best_match = ""
            best_similarity = 0.0
            
            for acceptable_answer in criteria.acceptable_answers:
                similarity_result = await self.models["semantic_similarity"].predict({
                    "text1": answer.processed_text,
                    "text2": acceptable_answer
                })
                
                similarity_score = similarity_result.get("similarity_score", 0.0)
                if similarity_score > best_similarity:
                    best_similarity = similarity_score
                    best_match = acceptable_answer
            
            # 根据相似度计算分数
            score = best_similarity * criteria.max_score
            
            # 关键词加分
            keyword_bonus = self._calculate_keyword_bonus(
                answer.processed_text, 
                criteria.keywords, 
                criteria.bonus_rules
            )
            score += keyword_bonus
            
            # 确保不超过满分
            score = min(score, criteria.max_score)
            
            # 使用增强的置信度计算
            confidence_metrics = confidence_calculator.calculate_confidence(
                answer_text=answer.processed_text,
                reference_answer=best_match,
                model_confidence=best_similarity,
                additional_metrics={
                    'ocr_confidence': answer.confidence_score,
                    'keyword_match_score': len(self._find_matched_keywords(answer.processed_text, criteria.keywords)) / max(1, len(criteria.keywords))
                }
            )
            
            return GradingResult(
                question_id=answer.question_id,
                student_id="student",
                score=score,
                max_score=criteria.max_score,
                confidence=confidence_metrics.final_confidence,
                grading_mode=mode,
                detailed_feedback={
                    "semantic_similarity": best_similarity,
                    "best_match": best_match,
                    "keyword_bonus": keyword_bonus,
                    "matched_keywords": self._find_matched_keywords(answer.processed_text, criteria.keywords),
                    "confidence_metrics": {
                        "text_quality": confidence_metrics.text_quality_score,
                        "completeness": confidence_metrics.completeness_score,
                        "consistency": confidence_metrics.consistency_score,
                        "confidence_explanation": confidence_calculator.get_confidence_explanation(confidence_metrics)
                    }
                },
                ai_reasoning=f"答案与标准答案的语义相似度为 {best_similarity:.2f}，获得关键词加分 {keyword_bonus}。{confidence_calculator.get_confidence_explanation(confidence_metrics)}",
                review_required=confidence_calculator.should_require_manual_review(confidence_metrics.final_confidence)
            )
            
        except Exception as e:
            logger.error(f"简答题评分失败: {e}")
            raise
    
    async def _grade_essay(
        self, 
        answer: StudentAnswer, 
        criteria: GradingCriteria,
        mode: GradingMode
    ) -> GradingResult:
        """作文题评分"""
        try:
            # 作文评分维度
            dimensions = {
                "content": 0.4,      # 内容40%
                "structure": 0.3,    # 结构30%
                "language": 0.2,     # 语言20%
                "creativity": 0.1    # 创新10%
            }
            
            total_score = 0.0
            dimension_scores = {}
            
            # 分维度评分
            for dimension, weight in dimensions.items():
                dimension_score = await self._evaluate_essay_dimension(
                    answer.processed_text, 
                    dimension, 
                    criteria
                )
                dimension_scores[dimension] = dimension_score
                total_score += dimension_score * weight
            
            # 计算最终分数
            final_score = total_score * criteria.max_score
            
            return GradingResult(
                question_id=answer.question_id,
                student_id="student",
                score=final_score,
                max_score=criteria.max_score,
                confidence=0.8,  # 作文评分置信度相对较低
                grading_mode=mode,
                detailed_feedback={
                    "dimension_scores": dimension_scores,
                    "total_score": total_score,
                    "word_count": len(answer.processed_text),
                    "readability_score": self._calculate_readability(answer.processed_text)
                },
                ai_reasoning=f"作文综合评分: 内容{dimension_scores['content']:.2f}, 结构{dimension_scores['structure']:.2f}, 语言{dimension_scores['language']:.2f}, 创新{dimension_scores['creativity']:.2f}",
                review_required=True  # 作文通常需要人工复核
            )
            
        except Exception as e:
            logger.error(f"作文评分失败: {e}")
            raise
    
    async def _grade_handwriting(
        self, 
        answer: StudentAnswer, 
        criteria: GradingCriteria,
        mode: GradingMode
    ) -> GradingResult:
        """手写题评分"""
        try:
            # 首先进行手写识别
            if answer.image_data:
                recognition_result = await self.models["handwriting_recognition"].predict(answer.image_data)
                recognized_text = recognition_result.get("recognized_text", "")
                ocr_confidence = recognition_result.get("confidence", 0.0)
            else:
                recognized_text = answer.processed_text
                ocr_confidence = answer.confidence_score
            
            # 使用识别出的文字进行评分
            answer_copy = StudentAnswer(
                question_id=answer.question_id,
                question_type=QuestionType.SHORT_ANSWER,  # 转换为简答题评分
                raw_text=recognized_text,
                processed_text=recognized_text,
                confidence_score=ocr_confidence
            )
            
            # 调用简答题评分逻辑
            result = await self._grade_short_answer(answer_copy, criteria, mode)
            
            # 调整置信度（考虑手写识别的不确定性）
            result.confidence = result.confidence * ocr_confidence
            result.detailed_feedback["handwriting_recognition"] = {
                "recognized_text": recognized_text,
                "ocr_confidence": ocr_confidence
            }
            result.ai_reasoning = f"手写识别: {recognized_text} (置信度{ocr_confidence:.2f}). " + result.ai_reasoning
            
            # 低识别置信度需要人工复核
            if ocr_confidence < 0.8:
                result.review_required = True
            
            return result
            
        except Exception as e:
            logger.error(f"手写题评分失败: {e}")
            raise
    
    async def _grade_fill_in_blank(
        self, 
        answer: StudentAnswer, 
        criteria: GradingCriteria,
        mode: GradingMode
    ) -> GradingResult:
        """填空题评分"""
        # 填空题可以复用简答题逻辑，但评分标准更严格
        return await self._grade_short_answer(answer, criteria, mode)
    
    async def _grade_calculation(
        self, 
        answer: StudentAnswer, 
        criteria: GradingCriteria,
        mode: GradingMode
    ) -> GradingResult:
        """计算题评分"""
        try:
            # 提取数值答案
            student_numbers = self._extract_numbers(answer.processed_text)
            correct_numbers = []
            for acceptable in criteria.acceptable_answers:
                correct_numbers.extend(self._extract_numbers(acceptable))
            
            # 计算分数
            score = 0.0
            for student_num in student_numbers:
                for correct_num in correct_numbers:
                    if abs(student_num - correct_num) < 0.01:  # 允许小的数值误差
                        score = criteria.max_score
                        break
                if score > 0:
                    break
            
            return GradingResult(
                question_id=answer.question_id,
                student_id="student",
                score=score,
                max_score=criteria.max_score,
                confidence=0.9,
                grading_mode=mode,
                detailed_feedback={
                    "student_numbers": student_numbers,
                    "correct_numbers": correct_numbers,
                    "numerical_match": score > 0
                },
                ai_reasoning=f"提取到学生答案数值: {student_numbers}, 标准答案数值: {correct_numbers}"
            )
            
        except Exception as e:
            logger.error(f"计算题评分失败: {e}")
            raise
    
    async def _post_process_result(
        self, 
        result: GradingResult, 
        criteria: GradingCriteria,
        mode: GradingMode
    ) -> GradingResult:
        """后处理评分结果"""
        # 应用惩罚规则
        for penalty_type, penalty_score in criteria.penalty_rules.items():
            if self._check_penalty_condition(result, penalty_type):
                result.score = max(0, result.score - penalty_score)
                result.detailed_feedback[f"penalty_{penalty_type}"] = penalty_score
        
        # 生成改进建议
        result.suggestions = self._generate_suggestions(result, criteria)
        
        return result
    
    def _extract_choice(self, text: str) -> str:
        """提取选择题答案"""
        import re
        # 查找A、B、C、D等选项
        pattern = r'[ABCD]'
        matches = re.findall(pattern, text.upper())
        return matches[0] if matches else ""
    
    def _extract_numbers(self, text: str) -> List[float]:
        """提取文本中的数字"""
        import re
        pattern = r'-?\d+\.?\d*'
        matches = re.findall(pattern, text)
        return [float(match) for match in matches if match]
    
    def _calculate_keyword_bonus(
        self, 
        text: str, 
        keywords: List[str], 
        bonus_rules: Dict[str, float]
    ) -> float:
        """计算关键词加分"""
        bonus = 0.0
        for keyword in keywords:
            if keyword in text:
                bonus += bonus_rules.get(keyword, 0.5)  # 默认每个关键词0.5分
        return bonus
    
    def _find_matched_keywords(self, text: str, keywords: List[str]) -> List[str]:
        """查找匹配的关键词"""
        return [keyword for keyword in keywords if keyword in text]
    
    async def _evaluate_essay_dimension(
        self, 
        text: str, 
        dimension: str, 
        criteria: GradingCriteria
    ) -> float:
        """评估作文某个维度的得分"""
        # 模拟维度评分
        if dimension == "content":
            return np.random.uniform(0.7, 0.9)
        elif dimension == "structure":
            return np.random.uniform(0.6, 0.8)
        elif dimension == "language":
            return np.random.uniform(0.7, 0.85)
        elif dimension == "creativity":
            return np.random.uniform(0.5, 0.9)
        return 0.7
    
    def _calculate_readability(self, text: str) -> float:
        """计算文本可读性"""
        # 简单的可读性计算（字数、句子数等）
        words = len(text)
        sentences = text.count('。') + text.count('！') + text.count('？')
        if sentences == 0:
            return 0.5
        avg_words_per_sentence = words / sentences
        # 简化的可读性评分
        return min(1.0, max(0.0, 1.0 - abs(avg_words_per_sentence - 15) / 15))
    
    def _check_penalty_condition(self, result: GradingResult, penalty_type: str) -> bool:
        """检查是否满足惩罚条件"""
        # 示例惩罚条件
        if penalty_type == "length_too_short":
            return len(result.detailed_feedback.get("student_text", "")) < 50
        elif penalty_type == "off_topic":
            return result.confidence < 0.3
        return False
    
    def _generate_suggestions(self, result: GradingResult, criteria: GradingCriteria) -> List[str]:
        """生成改进建议"""
        suggestions = []
        
        if result.score < criteria.max_score * 0.6:
            suggestions.append("答案需要更加详细和准确")
        
        if result.confidence < 0.7:
            suggestions.append("答案表达需要更加清晰")
        
        if result.review_required:
            suggestions.append("建议人工复核此答案")
        
        return suggestions
    
    async def batch_grade(
        self, 
        answers: List[StudentAnswer], 
        criteria_list: List[GradingCriteria],
        mode: GradingMode = GradingMode.AUTOMATIC
    ) -> List[GradingResult]:
        """批量评分"""
        if len(answers) != len(criteria_list):
            raise ValueError("答案数量与评分标准数量不匹配")
        
        tasks = [
            self.grade_answer(answer, criteria, mode)
            for answer, criteria in zip(answers, criteria_list)
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # 处理异常结果
        final_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"批量评分第{i}项失败: {result}")
                # 创建错误结果
                final_results.append(GradingResult(
                    question_id=answers[i].question_id,
                    student_id="unknown",
                    score=0.0,
                    max_score=criteria_list[i].max_score,
                    confidence=0.0,
                    grading_mode=mode,
                    detailed_feedback={"error": str(result)},
                    ai_reasoning="批量评分过程中发生错误",
                    review_required=True
                ))
            else:
                final_results.append(result)
        
        return final_results
    
    def get_engine_status(self) -> Dict[str, Any]:
        """获取引擎状态"""
        return {
            "initialized": self.is_initialized,
            "models": {
                name: model.get_model_info() 
                for name, model in self.models.items()
            },
            "supported_question_types": [qt.value for qt in QuestionType],
            "supported_grading_modes": [gm.value for gm in GradingMode]
        }


# 全局引擎实例
_grading_engine = None

async def get_grading_engine() -> MultimodalGradingEngine:
    """获取全局评分引擎实例"""
    global _grading_engine
    if _grading_engine is None:
        _grading_engine = MultimodalGradingEngine()
        await _grading_engine.initialize()
    return _grading_engine


# 使用示例
async def demo_grading():
    """评分引擎演示"""
    logger.info("开始多模态评分引擎演示")
    
    # 获取引擎实例
    engine = await get_grading_engine()
    
    # 示例学生答案
    answer = StudentAnswer(
        question_id="q001",
        question_type=QuestionType.SHORT_ANSWER,
        raw_text="光合作用是植物利用阳光、水和二氧化碳制造有机物的过程",
        processed_text="光合作用是植物利用阳光、水和二氧化碳制造有机物的过程"
    )
    
    # 示例评分标准
    criteria = GradingCriteria(
        max_score=10.0,
        rubric={"full_score": "完整描述光合作用过程"},
        keywords=["光合作用", "阳光", "水", "二氧化碳", "有机物"],
        acceptable_answers=["光合作用是植物利用阳光、水分和二氧化碳合成有机物质的生物过程"],
        bonus_rules={"光合作用": 1.0, "阳光": 0.5, "二氧化碳": 0.5}
    )
    
    # 执行评分
    result = await engine.grade_answer(answer, criteria)
    
    logger.info(f"评分结果: {result.score}/{result.max_score}")
    logger.info(f"AI推理: {result.ai_reasoning}")
    logger.info(f"详细反馈: {result.detailed_feedback}")
    
    return result


if __name__ == "__main__":
    # 运行演示
    asyncio.run(demo_grading())