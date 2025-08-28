"""
置信度计算优化模块
实现更准确和一致的AI评分置信度计算
"""

import math
import numpy as np
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
import logging

logger = logging.getLogger(__name__)

class ConfidenceFactors(Enum):
    """置信度影响因素"""
    MODEL_CONFIDENCE = "model_confidence"       # 模型本身的置信度
    TEXT_CLARITY = "text_clarity"              # 文本清晰度
    ANSWER_COMPLETENESS = "answer_completeness" # 答案完整性
    KEYWORD_MATCH = "keyword_match"            # 关键词匹配度
    SEMANTIC_SIMILARITY = "semantic_similarity" # 语义相似度
    LENGTH_CONSISTENCY = "length_consistency"   # 长度一致性
    HANDWRITING_QUALITY = "handwriting_quality" # 手写质量
    CONTEXT_COHERENCE = "context_coherence"    # 上下文连贯性

@dataclass
class ConfidenceMetrics:
    """置信度指标"""
    base_confidence: float = 0.0               # 基础置信度
    text_quality_score: float = 0.0           # 文本质量分数
    semantic_score: float = 0.0               # 语义分数
    completeness_score: float = 0.0           # 完整性分数
    consistency_score: float = 0.0            # 一致性分数
    final_confidence: float = 0.0             # 最终置信度
    factors: Dict[str, float] = None           # 各因素权重
    
    def __post_init__(self):
        if self.factors is None:
            self.factors = {}

class EnhancedConfidenceCalculator:
    """增强的置信度计算器"""
    
    # 默认权重配置
    DEFAULT_WEIGHTS = {
        ConfidenceFactors.MODEL_CONFIDENCE: 0.25,
        ConfidenceFactors.TEXT_CLARITY: 0.15,
        ConfidenceFactors.ANSWER_COMPLETENESS: 0.20,
        ConfidenceFactors.KEYWORD_MATCH: 0.15,
        ConfidenceFactors.SEMANTIC_SIMILARITY: 0.15,
        ConfidenceFactors.LENGTH_CONSISTENCY: 0.05,
        ConfidenceFactors.HANDWRITING_QUALITY: 0.03,
        ConfidenceFactors.CONTEXT_COHERENCE: 0.02,
    }
    
    # 置信度阈值
    CONFIDENCE_THRESHOLDS = {
        'high': 0.85,      # 高置信度
        'medium': 0.65,    # 中等置信度  
        'low': 0.45,       # 低置信度
        'very_low': 0.25   # 极低置信度
    }
    
    def __init__(self, weights: Dict[ConfidenceFactors, float] = None):
        """
        初始化置信度计算器
        
        Args:
            weights: 自定义权重配置
        """
        self.weights = weights or self.DEFAULT_WEIGHTS.copy()
        self._validate_weights()
    
    def _validate_weights(self):
        """验证权重配置"""
        total_weight = sum(self.weights.values())
        if abs(total_weight - 1.0) > 0.01:
            logger.warning(f"权重总和不为1.0: {total_weight}")
            # 归一化权重
            for factor in self.weights:
                self.weights[factor] /= total_weight
    
    def calculate_confidence(
        self,
        answer_text: str,
        reference_answer: str,
        model_confidence: float,
        additional_metrics: Dict[str, Any] = None
    ) -> ConfidenceMetrics:
        """
        计算综合置信度
        
        Args:
            answer_text: 学生答案文本
            reference_answer: 参考答案
            model_confidence: 模型基础置信度
            additional_metrics: 额外指标
            
        Returns:
            ConfidenceMetrics: 置信度指标
        """
        if additional_metrics is None:
            additional_metrics = {}
        
        metrics = ConfidenceMetrics()
        metrics.base_confidence = model_confidence
        
        # 计算各个因素的分数
        factor_scores = {}
        
        # 1. 模型置信度（已提供）
        factor_scores[ConfidenceFactors.MODEL_CONFIDENCE] = model_confidence
        
        # 2. 文本清晰度
        factor_scores[ConfidenceFactors.TEXT_CLARITY] = self._calculate_text_clarity(answer_text)
        
        # 3. 答案完整性
        factor_scores[ConfidenceFactors.ANSWER_COMPLETENESS] = self._calculate_completeness(
            answer_text, reference_answer
        )
        
        # 4. 关键词匹配度
        factor_scores[ConfidenceFactors.KEYWORD_MATCH] = self._calculate_keyword_match(
            answer_text, reference_answer
        )
        
        # 5. 语义相似度
        factor_scores[ConfidenceFactors.SEMANTIC_SIMILARITY] = self._calculate_semantic_similarity(
            answer_text, reference_answer
        )
        
        # 6. 长度一致性
        factor_scores[ConfidenceFactors.LENGTH_CONSISTENCY] = self._calculate_length_consistency(
            answer_text, reference_answer
        )
        
        # 7. 手写质量（如果有）
        handwriting_quality = additional_metrics.get('handwriting_quality', 0.8)
        factor_scores[ConfidenceFactors.HANDWRITING_QUALITY] = handwriting_quality
        
        # 8. 上下文连贯性
        factor_scores[ConfidenceFactors.CONTEXT_COHERENCE] = self._calculate_context_coherence(answer_text)
        
        # 计算加权平均置信度
        weighted_sum = 0.0
        for factor, score in factor_scores.items():
            weight = self.weights.get(factor, 0.0)
            weighted_sum += score * weight
        
        # 应用置信度调整策略
        final_confidence = self._apply_confidence_adjustments(
            weighted_sum, factor_scores, additional_metrics
        )
        
        # 填充结果指标
        metrics.text_quality_score = factor_scores[ConfidenceFactors.TEXT_CLARITY]
        metrics.semantic_score = factor_scores[ConfidenceFactors.SEMANTIC_SIMILARITY]
        metrics.completeness_score = factor_scores[ConfidenceFactors.ANSWER_COMPLETENESS]
        metrics.consistency_score = factor_scores[ConfidenceFactors.LENGTH_CONSISTENCY]
        metrics.final_confidence = final_confidence
        metrics.factors = {factor.value: score for factor, score in factor_scores.items()}
        
        return metrics
    
    def _calculate_text_clarity(self, text: str) -> float:
        """计算文本清晰度"""
        if not text:
            return 0.0
        
        clarity_score = 1.0
        
        # 检查特殊字符比例
        special_chars = sum(1 for c in text if not c.isalnum() and c not in ' .,!?;:()[]{}')
        special_ratio = special_chars / len(text) if text else 0
        clarity_score *= max(0.5, 1.0 - special_ratio * 2)
        
        # 检查连续空格
        consecutive_spaces = text.count('  ')
        if consecutive_spaces > 0:
            clarity_score *= max(0.7, 1.0 - consecutive_spaces * 0.1)
        
        # 检查文本长度合理性
        if len(text) < 5:
            clarity_score *= 0.6
        elif len(text) > 1000:
            clarity_score *= 0.9
        
        return min(1.0, max(0.0, clarity_score))
    
    def _calculate_completeness(self, answer: str, reference: str) -> float:
        """计算答案完整性"""
        if not answer or not reference:
            return 0.0
        
        answer_words = set(answer.lower().split())
        reference_words = set(reference.lower().split())
        
        if not reference_words:
            return 0.8 if answer_words else 0.0
        
        # 计算词汇覆盖率
        common_words = answer_words.intersection(reference_words)
        coverage = len(common_words) / len(reference_words)
        
        # 考虑答案长度
        length_ratio = len(answer) / len(reference)
        length_score = 1.0
        if length_ratio < 0.3:
            length_score = length_ratio / 0.3 * 0.8
        elif length_ratio > 2.0:
            length_score = max(0.7, 2.0 / length_ratio)
        
        completeness = (coverage * 0.7 + length_score * 0.3)
        return min(1.0, max(0.0, completeness))
    
    def _calculate_keyword_match(self, answer: str, reference: str) -> float:
        """计算关键词匹配度"""
        if not answer or not reference:
            return 0.0
        
        # 简单的关键词提取（在实际项目中可以使用更复杂的NLP技术）
        answer_lower = answer.lower()
        reference_lower = reference.lower()
        
        # 提取潜在关键词（长度大于3的词）
        reference_keywords = [word for word in reference_lower.split() if len(word) > 3]
        
        if not reference_keywords:
            return 0.8
        
        matched_keywords = 0
        for keyword in reference_keywords:
            if keyword in answer_lower:
                matched_keywords += 1
        
        match_ratio = matched_keywords / len(reference_keywords)
        return min(1.0, max(0.0, match_ratio))
    
    def _calculate_semantic_similarity(self, answer: str, reference: str) -> float:
        """计算语义相似度（简化版本）"""
        if not answer or not reference:
            return 0.0
        
        # 简化的语义相似度计算
        # 在实际应用中，这里会使用预训练的语言模型
        
        answer_words = set(answer.lower().split())
        reference_words = set(reference.lower().split())
        
        if not answer_words or not reference_words:
            return 0.0
        
        # 计算Jaccard相似度作为简化的语义相似度
        intersection = answer_words.intersection(reference_words)
        union = answer_words.union(reference_words)
        
        jaccard_similarity = len(intersection) / len(union) if union else 0.0
        
        # 调整相似度分数
        semantic_score = min(1.0, jaccard_similarity * 1.5)
        return semantic_score
    
    def _calculate_length_consistency(self, answer: str, reference: str) -> float:
        """计算长度一致性"""
        if not answer or not reference:
            return 0.0
        
        length_ratio = len(answer) / len(reference)
        
        # 理想的长度比例在0.5-2.0之间
        if 0.5 <= length_ratio <= 2.0:
            # 在合理范围内，越接近1.0越好
            consistency = 1.0 - abs(length_ratio - 1.0) * 0.3
        elif length_ratio < 0.5:
            # 太短
            consistency = length_ratio / 0.5 * 0.7
        else:
            # 太长
            consistency = max(0.3, 2.0 / length_ratio * 0.7)
        
        return min(1.0, max(0.0, consistency))
    
    def _calculate_context_coherence(self, text: str) -> float:
        """计算上下文连贯性"""
        if not text:
            return 0.0
        
        sentences = text.split('。')  # 简单的句子分割
        if len(sentences) < 2:
            return 0.8  # 单句默认连贯性较高
        
        # 简化的连贯性评估
        coherence_score = 1.0
        
        # 检查重复句子
        unique_sentences = set(sentences)
        if len(unique_sentences) < len(sentences):
            coherence_score *= 0.8
        
        # 检查句子长度变化
        sentence_lengths = [len(s.strip()) for s in sentences if s.strip()]
        if sentence_lengths:
            avg_length = sum(sentence_lengths) / len(sentence_lengths)
            length_variance = sum((l - avg_length) ** 2 for l in sentence_lengths) / len(sentence_lengths)
            if length_variance > avg_length ** 2:  # 长度变化过大
                coherence_score *= 0.9
        
        return min(1.0, max(0.0, coherence_score))
    
    def _apply_confidence_adjustments(
        self,
        base_confidence: float,
        factor_scores: Dict[ConfidenceFactors, float],
        additional_metrics: Dict[str, Any]
    ) -> float:
        """应用置信度调整策略"""
        adjusted_confidence = base_confidence
        
        # 如果文本质量很差，显著降低置信度
        if factor_scores[ConfidenceFactors.TEXT_CLARITY] < 0.3:
            adjusted_confidence *= 0.7
        
        # 如果答案完整性很差，降低置信度
        if factor_scores[ConfidenceFactors.ANSWER_COMPLETENESS] < 0.2:
            adjusted_confidence *= 0.8
        
        # 如果语义相似度很高，提高置信度
        if factor_scores[ConfidenceFactors.SEMANTIC_SIMILARITY] > 0.9:
            adjusted_confidence = min(1.0, adjusted_confidence * 1.1)
        
        # 如果多个因素都很低，进一步降低置信度
        low_factors = sum(1 for score in factor_scores.values() if score < 0.4)
        if low_factors >= 3:
            adjusted_confidence *= 0.8
        
        # 平滑处理：防止置信度变化过于剧烈
        confidence_change = abs(adjusted_confidence - base_confidence)
        if confidence_change > 0.3:
            adjusted_confidence = base_confidence + (adjusted_confidence - base_confidence) * 0.5
        
        return min(1.0, max(0.0, adjusted_confidence))
    
    def get_confidence_level(self, confidence: float) -> str:
        """获取置信度等级"""
        if confidence >= self.CONFIDENCE_THRESHOLDS['high']:
            return 'high'
        elif confidence >= self.CONFIDENCE_THRESHOLDS['medium']:
            return 'medium'
        elif confidence >= self.CONFIDENCE_THRESHOLDS['low']:
            return 'low'
        else:
            return 'very_low'
    
    def should_require_manual_review(self, confidence: float) -> bool:
        """判断是否需要人工审核"""
        return confidence < self.CONFIDENCE_THRESHOLDS['medium']
    
    def get_confidence_explanation(self, metrics: ConfidenceMetrics) -> str:
        """生成置信度解释"""
        explanations = []
        
        confidence_level = self.get_confidence_level(metrics.final_confidence)
        explanations.append(f"整体置信度等级：{confidence_level}")
        
        # 分析各因素贡献
        if metrics.text_quality_score < 0.5:
            explanations.append("文本质量较差，可能影响评分准确性")
        
        if metrics.semantic_score > 0.8:
            explanations.append("语义匹配度较高，答案内容相关性好")
        elif metrics.semantic_score < 0.3:
            explanations.append("语义匹配度较低，答案可能偏离主题")
        
        if metrics.completeness_score < 0.4:
            explanations.append("答案完整性不足，可能遗漏关键信息")
        
        if self.should_require_manual_review(metrics.final_confidence):
            explanations.append("建议进行人工审核")
        
        return "；".join(explanations)

# 全局置信度计算器实例
confidence_calculator = EnhancedConfidenceCalculator()