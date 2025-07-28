#!/usr/bin/env python3
"""
题型分类器服务
基于机器学习和规则的混合方法实现精确题型分类
"""

import logging
import re
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass
from enum import Enum
import json
import math

logger = logging.getLogger(__name__)

class QuestionType(Enum):
    """题目类型枚举"""
    CHOICE = "choice"  # 选择题
    MULTIPLE_CHOICE = "multiple_choice"  # 多选题
    TRUE_FALSE = "true_false"  # 判断题
    FILL_BLANK = "fill_blank"  # 填空题
    SHORT_ANSWER = "short_answer"  # 简答题
    ESSAY = "essay"  # 论述题
    CALCULATION = "calculation"  # 计算题
    PROOF = "proof"  # 证明题
    ANALYSIS = "analysis"  # 分析题
    DESIGN = "design"  # 设计题
    UNKNOWN = "unknown"  # 未知类型

class QuestionDifficulty(Enum):
    """题目难度枚举"""
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"
    VERY_HARD = "very_hard"

@dataclass
class ClassificationResult:
    """分类结果"""
    question_type: QuestionType
    confidence: float
    difficulty: QuestionDifficulty
    features: Dict[str, Any]
    reasoning: str

class QuestionClassifierService:
    """题型分类器服务"""
    
    def __init__(self):
        self.classification_rules = self._initialize_classification_rules()
        self.feature_extractors = self._initialize_feature_extractors()
        self.difficulty_indicators = self._initialize_difficulty_indicators()
    
    def _initialize_classification_rules(self) -> Dict[str, Dict[str, Any]]:
        """初始化分类规则"""
        return {
            QuestionType.CHOICE.value: {
                'keywords': ['选择', '下列', '以下', '哪个', '哪些', '正确的是'],
                'patterns': [
                    r'[ABCD][.．、)]',  # A. B. C. D.
                    r'[(（][ABCD][)）]',  # (A) (B) (C) (D)
                    r'[①②③④⑤⑥⑦⑧]',  # 圆圈数字
                ],
                'structure_indicators': ['选项', '备选答案'],
                'min_options': 2,
                'max_options': 6
            },
            QuestionType.MULTIPLE_CHOICE.value: {
                'keywords': ['多选', '多项选择', '正确答案有', '以下正确的有'],
                'patterns': [
                    r'[ABCD][.．、)]',
                    r'[(（][ABCD][)）]'
                ],
                'structure_indicators': ['多选', '多项'],
                'min_options': 3
            },
            QuestionType.TRUE_FALSE.value: {
                'keywords': ['判断', '对错', '正误', '是否正确', '√', '×'],
                'patterns': [
                    r'[√×]',
                    r'[对错]',
                    r'[正误]',
                    r'[是否]'
                ],
                'structure_indicators': ['判断题', '对错题']
            },
            QuestionType.FILL_BLANK.value: {
                'keywords': ['填空', '完成', '补充'],
                'patterns': [
                    r'_{2,}',  # 下划线
                    r'\(\s*\)',  # 空括号
                    r'\[\s*\]',  # 空方括号
                    r'\s+\s+',  # 空格
                ],
                'structure_indicators': ['填入', '填写']
            },
            QuestionType.SHORT_ANSWER.value: {
                'keywords': ['简述', '简答', '说明', '解释', '列举', '概述'],
                'patterns': [
                    r'简述.*[?？]',
                    r'说明.*[?？]',
                    r'解释.*[?？]'
                ],
                'structure_indicators': ['简答题', '简述题']
            },
            QuestionType.ESSAY.value: {
                'keywords': ['论述', '分析', '评价', '讨论', '阐述', '谈谈'],
                'patterns': [
                    r'论述.*[?？]',
                    r'分析.*[?？]',
                    r'评价.*[?？]'
                ],
                'structure_indicators': ['论述题', '分析题']
            },
            QuestionType.CALCULATION.value: {
                'keywords': ['计算', '求解', '求', '解', '算出'],
                'patterns': [
                    r'\d+\s*[+\-×÷*\/]\s*\d+',  # 数学表达式
                    r'=\s*[?？]',  # 等号问号
                    r'求.*值',
                    r'计算.*结果'
                ],
                'structure_indicators': ['计算题', '求解题']
            },
            QuestionType.PROOF.value: {
                'keywords': ['证明', '推导', '推证', '验证'],
                'patterns': [
                    r'证明.*[?？]',
                    r'推导.*[?？]',
                    r'验证.*[?？]'
                ],
                'structure_indicators': ['证明题', '推导题']
            },
            QuestionType.ANALYSIS.value: {
                'keywords': ['分析', '比较', '对比', '归纳', '总结'],
                'patterns': [
                    r'分析.*原因',
                    r'比较.*异同',
                    r'归纳.*特点'
                ],
                'structure_indicators': ['分析题', '比较题']
            },
            QuestionType.DESIGN.value: {
                'keywords': ['设计', '制作', '编写', '构建', '实现'],
                'patterns': [
                    r'设计.*方案',
                    r'编写.*程序',
                    r'制作.*模型'
                ],
                'structure_indicators': ['设计题', '制作题']
            }
        }
    
    def _initialize_feature_extractors(self) -> Dict[str, callable]:
        """初始化特征提取器"""
        return {
            'text_length': self._extract_text_length,
            'sentence_count': self._extract_sentence_count,
            'question_marks': self._extract_question_marks,
            'option_count': self._extract_option_count,
            'blank_count': self._extract_blank_count,
            'math_expressions': self._extract_math_expressions,
            'keyword_density': self._extract_keyword_density,
            'punctuation_ratio': self._extract_punctuation_ratio,
            'complexity_score': self._extract_complexity_score
        }
    
    def _initialize_difficulty_indicators(self) -> Dict[str, Dict[str, Any]]:
        """初始化难度指标"""
        return {
            'text_length': {
                'easy': (0, 100),
                'medium': (100, 300),
                'hard': (300, 600),
                'very_hard': (600, float('inf'))
            },
            'complexity_keywords': {
                'easy': ['基本', '简单', '直接', '明显'],
                'medium': ['分析', '比较', '说明', '解释'],
                'hard': ['综合', '评价', '论述', '推导'],
                'very_hard': ['创新', '设计', '构建', '优化']
            },
            'cognitive_levels': {
                'easy': ['记忆', '理解'],
                'medium': ['应用', '分析'],
                'hard': ['综合', '评价'],
                'very_hard': ['创造', '创新']
            }
        }
    
    def classify_question(self, question_text: str, context: Optional[Dict[str, Any]] = None) -> ClassificationResult:
        """
        对单个题目进行分类
        
        Args:
            question_text: 题目文本
            context: 上下文信息（可选）
            
        Returns:
            ClassificationResult: 分类结果
        """
        try:
            logger.info(f"开始分类题目: {question_text[:50]}...")
            
            # 1. 特征提取
            features = self._extract_features(question_text)
            
            # 2. 规则匹配
            rule_scores = self._apply_classification_rules(question_text, features)
            
            # 3. 结构分析
            structure_scores = self._analyze_question_structure(question_text)
            
            # 4. 综合评分
            final_scores = self._combine_scores(rule_scores, structure_scores, features)
            
            # 5. 确定最终分类
            question_type, confidence = self._determine_final_classification(final_scores)
            
            # 6. 难度评估
            difficulty = self._assess_difficulty(question_text, features, question_type)
            
            # 7. 生成推理说明
            reasoning = self._generate_reasoning(question_type, features, final_scores)
            
            result = ClassificationResult(
                question_type=question_type,
                confidence=confidence,
                difficulty=difficulty,
                features=features,
                reasoning=reasoning
            )
            
            logger.info(f"分类完成: {question_type.value}, 置信度: {confidence:.2f}")
            return result
            
        except Exception as e:
            logger.error(f"题目分类失败: {str(e)}")
            return ClassificationResult(
                question_type=QuestionType.UNKNOWN,
                confidence=0.0,
                difficulty=QuestionDifficulty.MEDIUM,
                features={},
                reasoning=f"分类失败: {str(e)}"
            )
    
    def _extract_features(self, question_text: str) -> Dict[str, Any]:
        """提取题目特征"""
        features = {}
        
        for feature_name, extractor in self.feature_extractors.items():
            try:
                features[feature_name] = extractor(question_text)
            except Exception as e:
                logger.warning(f"特征提取失败 {feature_name}: {str(e)}")
                features[feature_name] = 0
        
        return features
    
    def _extract_text_length(self, text: str) -> int:
        """提取文本长度"""
        return len(text.strip())
    
    def _extract_sentence_count(self, text: str) -> int:
        """提取句子数量"""
        sentences = re.split(r'[.。!！?？;；]', text)
        return len([s for s in sentences if s.strip()])
    
    def _extract_question_marks(self, text: str) -> int:
        """提取问号数量"""
        return len(re.findall(r'[?？]', text))
    
    def _extract_option_count(self, text: str) -> int:
        """提取选项数量"""
        # 检查ABCD选项
        options = re.findall(r'[ABCD][.．、)]', text)
        if options:
            return len(set(options))
        
        # 检查数字选项
        num_options = re.findall(r'[①②③④⑤⑥⑦⑧]', text)
        if num_options:
            return len(set(num_options))
        
        return 0
    
    def _extract_blank_count(self, text: str) -> int:
        """提取空白数量"""
        blanks = re.findall(r'_{2,}|\(\s*\)|\[\s*\]', text)
        return len(blanks)
    
    def _extract_math_expressions(self, text: str) -> int:
        """提取数学表达式数量"""
        math_patterns = [
            r'\d+\s*[+\-×÷*\/]\s*\d+',
            r'\d+\s*=\s*[?？]',
            r'[a-zA-Z]\s*[+\-×÷*\/]\s*[a-zA-Z]',
            r'\d+[a-zA-Z]',
            r'[a-zA-Z]\^\d+'
        ]
        
        count = 0
        for pattern in math_patterns:
            count += len(re.findall(pattern, text))
        
        return count
    
    def _extract_keyword_density(self, text: str) -> Dict[str, float]:
        """提取关键词密度"""
        text_lower = text.lower()
        word_count = len(text.split())
        
        if word_count == 0:
            return {}
        
        density = {}
        for question_type, rules in self.classification_rules.items():
            keyword_count = 0
            for keyword in rules.get('keywords', []):
                keyword_count += text_lower.count(keyword.lower())
            
            density[question_type] = keyword_count / word_count
        
        return density
    
    def _extract_punctuation_ratio(self, text: str) -> float:
        """提取标点符号比例"""
        if not text:
            return 0.0
        
        punctuation_count = len(re.findall(r'[,.!?;:()\[\]{}"\']', text))
        return punctuation_count / len(text)
    
    def _extract_complexity_score(self, text: str) -> float:
        """提取复杂度分数"""
        # 基于多个因素计算复杂度
        factors = {
            'length': min(len(text) / 1000, 1.0),  # 长度因子
            'sentences': min(self._extract_sentence_count(text) / 10, 1.0),  # 句子数因子
            'vocabulary': self._calculate_vocabulary_complexity(text),  # 词汇复杂度
            'structure': self._calculate_structure_complexity(text)  # 结构复杂度
        }
        
        # 加权平均
        weights = {'length': 0.2, 'sentences': 0.2, 'vocabulary': 0.3, 'structure': 0.3}
        complexity = sum(factors[k] * weights[k] for k in factors)
        
        return min(complexity, 1.0)
    
    def _calculate_vocabulary_complexity(self, text: str) -> float:
        """计算词汇复杂度"""
        words = text.split()
        if not words:
            return 0.0
        
        # 复杂词汇指标
        complex_words = 0
        for word in words:
            if len(word) > 6:  # 长词
                complex_words += 1
            if re.search(r'[专业术语模式]', word):  # 专业术语（需要扩展）
                complex_words += 1
        
        return min(complex_words / len(words), 1.0)
    
    def _calculate_structure_complexity(self, text: str) -> float:
        """计算结构复杂度"""
        complexity_indicators = [
            len(re.findall(r'[,，]', text)) / 10,  # 逗号数量
            len(re.findall(r'[;；]', text)) / 5,   # 分号数量
            len(re.findall(r'[(（].*?[)）]', text)) / 5,  # 括号数量
            len(re.findall(r'[""''].*?[""'']', text)) / 3  # 引号数量
        ]
        
        return min(sum(complexity_indicators), 1.0)
    
    def _apply_classification_rules(self, text: str, features: Dict[str, Any]) -> Dict[str, float]:
        """应用分类规则"""
        scores = {}
        
        for question_type, rules in self.classification_rules.items():
            score = 0.0
            
            # 关键词匹配
            keyword_score = 0.0
            for keyword in rules.get('keywords', []):
                if keyword.lower() in text.lower():
                    keyword_score += 1.0
            
            if rules.get('keywords'):
                keyword_score /= len(rules['keywords'])
            
            # 模式匹配
            pattern_score = 0.0
            for pattern in rules.get('patterns', []):
                if re.search(pattern, text):
                    pattern_score += 1.0
            
            if rules.get('patterns'):
                pattern_score /= len(rules['patterns'])
            
            # 结构指标
            structure_score = 0.0
            for indicator in rules.get('structure_indicators', []):
                if indicator.lower() in text.lower():
                    structure_score += 1.0
            
            if rules.get('structure_indicators'):
                structure_score /= len(rules['structure_indicators'])
            
            # 特殊规则
            special_score = self._apply_special_rules(question_type, text, features, rules)
            
            # 综合评分
            score = (keyword_score * 0.3 + pattern_score * 0.4 + 
                    structure_score * 0.2 + special_score * 0.1)
            
            scores[question_type] = score
        
        return scores
    
    def _apply_special_rules(self, question_type: str, text: str, features: Dict[str, Any], rules: Dict[str, Any]) -> float:
        """应用特殊规则"""
        if question_type == QuestionType.CHOICE.value:
            # 选择题需要有足够的选项
            option_count = features.get('option_count', 0)
            min_options = rules.get('min_options', 2)
            max_options = rules.get('max_options', 6)
            
            if min_options <= option_count <= max_options:
                return 1.0
            elif option_count > 0:
                return 0.5
            else:
                return 0.0
        
        elif question_type == QuestionType.FILL_BLANK.value:
            # 填空题需要有空白
            blank_count = features.get('blank_count', 0)
            return min(blank_count / 3, 1.0)
        
        elif question_type == QuestionType.CALCULATION.value:
            # 计算题需要有数学表达式
            math_count = features.get('math_expressions', 0)
            return min(math_count / 2, 1.0)
        
        return 0.0
    
    def _analyze_question_structure(self, text: str) -> Dict[str, float]:
        """分析题目结构"""
        structure_scores = {}
        
        # 分析文本结构特征
        has_options = bool(re.search(r'[ABCD][.．、)]', text))
        has_blanks = bool(re.search(r'_{2,}|\(\s*\)|\[\s*\]', text))
        has_math = bool(re.search(r'\d+\s*[+\-×÷*\/]\s*\d+', text))
        has_question_words = bool(re.search(r'什么|如何|为什么|怎样|哪个|哪些', text))
        
        # 基于结构特征评分
        if has_options:
            structure_scores[QuestionType.CHOICE.value] = 0.8
            structure_scores[QuestionType.MULTIPLE_CHOICE.value] = 0.6
        
        if has_blanks:
            structure_scores[QuestionType.FILL_BLANK.value] = 0.9
        
        if has_math:
            structure_scores[QuestionType.CALCULATION.value] = 0.8
            structure_scores[QuestionType.PROOF.value] = 0.4
        
        if has_question_words:
            structure_scores[QuestionType.SHORT_ANSWER.value] = 0.6
            structure_scores[QuestionType.ESSAY.value] = 0.4
        
        # 基于文本长度的结构分析
        text_length = len(text)
        if text_length < 50:
            structure_scores[QuestionType.CHOICE.value] = structure_scores.get(QuestionType.CHOICE.value, 0) + 0.3
            structure_scores[QuestionType.TRUE_FALSE.value] = structure_scores.get(QuestionType.TRUE_FALSE.value, 0) + 0.4
        elif text_length > 200:
            structure_scores[QuestionType.ESSAY.value] = structure_scores.get(QuestionType.ESSAY.value, 0) + 0.5
            structure_scores[QuestionType.ANALYSIS.value] = structure_scores.get(QuestionType.ANALYSIS.value, 0) + 0.4
        
        return structure_scores
    
    def _combine_scores(self, rule_scores: Dict[str, float], structure_scores: Dict[str, float], features: Dict[str, Any]) -> Dict[str, float]:
        """综合评分"""
        all_types = set(rule_scores.keys()) | set(structure_scores.keys())
        combined_scores = {}
        
        for question_type in all_types:
            rule_score = rule_scores.get(question_type, 0.0)
            structure_score = structure_scores.get(question_type, 0.0)
            
            # 加权组合
            combined_score = rule_score * 0.7 + structure_score * 0.3
            
            # 应用特征调整
            feature_adjustment = self._calculate_feature_adjustment(question_type, features)
            combined_score = min(combined_score + feature_adjustment, 1.0)
            
            combined_scores[question_type] = combined_score
        
        return combined_scores
    
    def _calculate_feature_adjustment(self, question_type: str, features: Dict[str, Any]) -> float:
        """计算特征调整值"""
        adjustment = 0.0
        
        # 基于关键词密度调整
        keyword_density = features.get('keyword_density', {})
        type_density = keyword_density.get(question_type, 0.0)
        adjustment += type_density * 0.1
        
        # 基于复杂度调整
        complexity = features.get('complexity_score', 0.0)
        if question_type in [QuestionType.ESSAY.value, QuestionType.ANALYSIS.value, QuestionType.PROOF.value]:
            adjustment += complexity * 0.1
        elif question_type in [QuestionType.CHOICE.value, QuestionType.TRUE_FALSE.value]:
            adjustment += (1.0 - complexity) * 0.1
        
        return adjustment
    
    def _determine_final_classification(self, scores: Dict[str, float]) -> Tuple[QuestionType, float]:
        """确定最终分类"""
        if not scores:
            return QuestionType.UNKNOWN, 0.0
        
        # 找到最高分
        best_type = max(scores.keys(), key=lambda k: scores[k])
        best_score = scores[best_type]
        
        # 检查置信度阈值
        if best_score < 0.3:
            return QuestionType.UNKNOWN, best_score
        
        # 转换为枚举
        try:
            question_type = QuestionType(best_type)
        except ValueError:
            question_type = QuestionType.UNKNOWN
        
        return question_type, best_score
    
    def _assess_difficulty(self, text: str, features: Dict[str, Any], question_type: QuestionType) -> QuestionDifficulty:
        """评估题目难度"""
        difficulty_score = 0.0
        
        # 基于文本长度
        text_length = features.get('text_length', 0)
        for difficulty, (min_len, max_len) in self.difficulty_indicators['text_length'].items():
            if min_len <= text_length < max_len:
                difficulty_score += self._difficulty_to_score(difficulty)
                break
        
        # 基于复杂度关键词
        text_lower = text.lower()
        for difficulty, keywords in self.difficulty_indicators['complexity_keywords'].items():
            keyword_count = sum(1 for keyword in keywords if keyword in text_lower)
            if keyword_count > 0:
                difficulty_score += self._difficulty_to_score(difficulty) * (keyword_count / len(keywords))
        
        # 基于题型调整
        type_difficulty_adjustment = {
            QuestionType.CHOICE: -0.5,
            QuestionType.TRUE_FALSE: -0.8,
            QuestionType.FILL_BLANK: -0.3,
            QuestionType.SHORT_ANSWER: 0.0,
            QuestionType.CALCULATION: 0.2,
            QuestionType.ESSAY: 0.5,
            QuestionType.PROOF: 0.8,
            QuestionType.ANALYSIS: 0.6,
            QuestionType.DESIGN: 1.0
        }
        
        difficulty_score += type_difficulty_adjustment.get(question_type, 0.0)
        
        # 基于复杂度特征
        complexity = features.get('complexity_score', 0.0)
        difficulty_score += complexity
        
        # 转换为难度等级
        if difficulty_score < 0.5:
            return QuestionDifficulty.EASY
        elif difficulty_score < 1.0:
            return QuestionDifficulty.MEDIUM
        elif difficulty_score < 1.5:
            return QuestionDifficulty.HARD
        else:
            return QuestionDifficulty.VERY_HARD
    
    def _difficulty_to_score(self, difficulty: str) -> float:
        """难度转换为分数"""
        difficulty_scores = {
            'easy': 0.25,
            'medium': 0.5,
            'hard': 0.75,
            'very_hard': 1.0
        }
        return difficulty_scores.get(difficulty, 0.5)
    
    def _generate_reasoning(self, question_type: QuestionType, features: Dict[str, Any], scores: Dict[str, float]) -> str:
        """生成推理说明"""
        reasoning_parts = []
        
        # 主要分类依据
        best_score = scores.get(question_type.value, 0.0)
        reasoning_parts.append(f"分类为{question_type.value}，置信度{best_score:.2f}")
        
        # 关键特征
        if features.get('option_count', 0) > 0:
            reasoning_parts.append(f"检测到{features['option_count']}个选项")
        
        if features.get('blank_count', 0) > 0:
            reasoning_parts.append(f"检测到{features['blank_count']}个空白")
        
        if features.get('math_expressions', 0) > 0:
            reasoning_parts.append(f"检测到{features['math_expressions']}个数学表达式")
        
        # 文本特征
        text_length = features.get('text_length', 0)
        reasoning_parts.append(f"文本长度{text_length}字符")
        
        complexity = features.get('complexity_score', 0.0)
        reasoning_parts.append(f"复杂度{complexity:.2f}")
        
        return "；".join(reasoning_parts)
    
    def batch_classify(self, questions: List[str]) -> List[ClassificationResult]:
        """批量分类题目"""
        results = []
        
        for i, question in enumerate(questions):
            logger.info(f"分类第{i+1}/{len(questions)}道题目")
            result = self.classify_question(question)
            results.append(result)
        
        return results
    
    def get_classification_statistics(self, results: List[ClassificationResult]) -> Dict[str, Any]:
        """获取分类统计信息"""
        if not results:
            return {}
        
        # 题型分布
        type_distribution = {}
        difficulty_distribution = {}
        confidence_scores = []
        
        for result in results:
            # 题型统计
            question_type = result.question_type.value
            type_distribution[question_type] = type_distribution.get(question_type, 0) + 1
            
            # 难度统计
            difficulty = result.difficulty.value
            difficulty_distribution[difficulty] = difficulty_distribution.get(difficulty, 0) + 1
            
            # 置信度统计
            confidence_scores.append(result.confidence)
        
        # 计算统计指标
        avg_confidence = sum(confidence_scores) / len(confidence_scores)
        min_confidence = min(confidence_scores)
        max_confidence = max(confidence_scores)
        
        # 质量评估
        high_confidence_count = sum(1 for score in confidence_scores if score > 0.8)
        quality_ratio = high_confidence_count / len(confidence_scores)
        
        return {
            'total_questions': len(results),
            'type_distribution': type_distribution,
            'difficulty_distribution': difficulty_distribution,
            'confidence_statistics': {
                'average': avg_confidence,
                'minimum': min_confidence,
                'maximum': max_confidence,
                'high_confidence_ratio': quality_ratio
            },
            'quality_assessment': {
                'excellent': quality_ratio > 0.9,
                'good': 0.7 < quality_ratio <= 0.9,
                'fair': 0.5 < quality_ratio <= 0.7,
                'poor': quality_ratio <= 0.5
            }
        }