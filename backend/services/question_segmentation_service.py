#!/usr/bin/env python3
"""
智能切题服务
基于OCR结果实现智能题目分割和区域定位
"""

import logging
import re
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass
from enum import Enum
import json

logger = logging.getLogger(__name__)

class QuestionType(Enum):
    """题目类型枚举"""
    CHOICE = "choice"  # 选择题
    FILL_BLANK = "fill_blank"  # 填空题
    SHORT_ANSWER = "short_answer"  # 简答题
    ESSAY = "essay"  # 论述题
    CALCULATION = "calculation"  # 计算题
    UNKNOWN = "unknown"  # 未知类型

@dataclass
class QuestionRegion:
    """题目区域信息"""
    x: int  # 左上角x坐标
    y: int  # 左上角y坐标
    width: int  # 宽度
    height: int  # 高度
    confidence: float  # 置信度

@dataclass
class QuestionSegment:
    """题目分割结果"""
    question_number: str  # 题目编号
    question_type: QuestionType  # 题目类型
    question_text: str  # 题目文本
    student_answer: str  # 学生答案
    region: QuestionRegion  # 题目区域
    confidence: float  # 分割置信度
    points: float  # 题目分值
    sub_questions: List['QuestionSegment'] = None  # 子题目（用于复合题）

class QuestionSegmentationService:
    """智能切题服务"""
    
    def __init__(self):
        self.question_patterns = {
            # 题目编号模式
            'question_number': [
                r'(\d+)[.．、]',  # 1. 2. 3.
                r'[(（](\d+)[)）]',  # (1) (2) (3)
                r'第(\d+)题',  # 第1题
                r'(\d+)\s*[、.]',  # 1、 2、
            ],
            # 选择题模式
            'choice_question': [
                r'[ABCD][.．、]',  # A. B. C. D.
                r'[(（][ABCD][)）]',  # (A) (B) (C) (D)
            ],
            # 填空题模式
            'fill_blank': [
                r'_{2,}',  # 下划线
                r'\(\s*\)',  # 空括号
                r'\[\s*\]',  # 空方括号
            ],
            # 计算题模式
            'calculation': [
                r'计算|求解|解答',
                r'=\s*[?？]',
                r'\d+\s*[+\-×÷]\s*\d+',
            ]
        }
    
    def segment_questions(self, ocr_result: Dict[str, Any]) -> List[QuestionSegment]:
        """
        基于OCR结果进行智能切题
        
        Args:
            ocr_result: OCR识别结果
            
        Returns:
            List[QuestionSegment]: 题目分割结果列表
        """
        try:
            logger.info("开始智能切题处理")
            
            # 1. 提取文本和区域信息
            text_blocks = self._extract_text_blocks(ocr_result)
            
            # 2. 识别题目边界
            question_boundaries = self._identify_question_boundaries(text_blocks)
            
            # 3. 分割题目
            question_segments = self._split_questions(text_blocks, question_boundaries)
            
            # 4. 题型分类
            classified_segments = self._classify_question_types(question_segments)
            
            # 5. 提取学生答案
            final_segments = self._extract_student_answers(classified_segments)
            
            logger.info(f"切题完成，共识别 {len(final_segments)} 道题目")
            return final_segments
            
        except Exception as e:
            logger.error(f"智能切题失败: {str(e)}")
            raise
    
    def _extract_text_blocks(self, ocr_result: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        从OCR结果中提取文本块信息
        """
        text_blocks = []
        
        # 处理不同格式的OCR结果
        if 'blocks' in ocr_result:
            # 结构化的OCR结果
            for block in ocr_result['blocks']:
                text_blocks.append({
                    'text': block.get('text', ''),
                    'bbox': block.get('bbox', [0, 0, 0, 0]),
                    'confidence': block.get('confidence', 0.8)
                })
        elif 'text' in ocr_result:
            # 简单文本结果，需要进行文本分析
            text = ocr_result['text']
            lines = text.split('\n')
            
            for i, line in enumerate(lines):
                if line.strip():
                    text_blocks.append({
                        'text': line.strip(),
                        'bbox': [0, i * 30, 800, (i + 1) * 30],  # 估算位置
                        'confidence': 0.8
                    })
        
        return text_blocks
    
    def _identify_question_boundaries(self, text_blocks: List[Dict[str, Any]]) -> List[int]:
        """
        识别题目边界
        """
        boundaries = [0]  # 第一个边界总是0
        
        for i, block in enumerate(text_blocks):
            text = block['text']
            
            # 检查是否是题目开始
            if self._is_question_start(text):
                boundaries.append(i)
        
        # 添加最后一个边界
        if boundaries[-1] != len(text_blocks):
            boundaries.append(len(text_blocks))
        
        return boundaries
    
    def _is_question_start(self, text: str) -> bool:
        """
        判断文本是否是题目开始
        """
        # 检查题目编号模式
        for pattern in self.question_patterns['question_number']:
            if re.match(pattern, text.strip()):
                return True
        
        # 检查特殊关键词
        question_keywords = ['题目', '问题', '请', '试', '计算', '分析', '简述', '论述']
        for keyword in question_keywords:
            if text.strip().startswith(keyword):
                return True
        
        return False
    
    def _split_questions(self, text_blocks: List[Dict[str, Any]], boundaries: List[int]) -> List[QuestionSegment]:
        """
        根据边界分割题目
        """
        segments = []
        
        for i in range(len(boundaries) - 1):
            start_idx = boundaries[i]
            end_idx = boundaries[i + 1]
            
            # 合并该题目的所有文本块
            question_blocks = text_blocks[start_idx:end_idx]
            
            if not question_blocks:
                continue
            
            # 提取题目信息
            question_text = ' '.join([block['text'] for block in question_blocks])
            question_number = self._extract_question_number(question_text)
            
            # 计算区域边界
            region = self._calculate_region(question_blocks)
            
            # 估算题目分值
            points = self._estimate_points(question_text)
            
            segment = QuestionSegment(
                question_number=question_number or str(i + 1),
                question_type=QuestionType.UNKNOWN,  # 稍后分类
                question_text=question_text,
                student_answer="",  # 稍后提取
                region=region,
                confidence=0.8,
                points=points
            )
            
            segments.append(segment)
        
        return segments
    
    def _extract_question_number(self, text: str) -> Optional[str]:
        """
        提取题目编号
        """
        for pattern in self.question_patterns['question_number']:
            match = re.search(pattern, text)
            if match:
                return match.group(1)
        return None
    
    def _calculate_region(self, blocks: List[Dict[str, Any]]) -> QuestionRegion:
        """
        计算题目区域
        """
        if not blocks:
            return QuestionRegion(0, 0, 0, 0, 0.0)
        
        # 计算包围盒
        min_x = min(block['bbox'][0] for block in blocks)
        min_y = min(block['bbox'][1] for block in blocks)
        max_x = max(block['bbox'][2] for block in blocks)
        max_y = max(block['bbox'][3] for block in blocks)
        
        # 计算平均置信度
        avg_confidence = sum(block['confidence'] for block in blocks) / len(blocks)
        
        return QuestionRegion(
            x=int(min_x),
            y=int(min_y),
            width=int(max_x - min_x),
            height=int(max_y - min_y),
            confidence=avg_confidence
        )
    
    def _estimate_points(self, question_text: str) -> float:
        """
        估算题目分值
        """
        # 查找明确的分值标注
        score_patterns = [
            r'[(（](\d+)分[)）]',  # (5分)
            r'(\d+)分',  # 5分
            r'[(（](\d+)[)）]',  # (5)
        ]
        
        for pattern in score_patterns:
            match = re.search(pattern, question_text)
            if match:
                return float(match.group(1))
        
        # 根据题目类型和长度估算分值
        text_length = len(question_text)
        
        if text_length < 50:
            return 2.0  # 简单题目
        elif text_length < 150:
            return 5.0  # 中等题目
        elif text_length < 300:
            return 10.0  # 复杂题目
        else:
            return 15.0  # 论述题
    
    def _classify_question_types(self, segments: List[QuestionSegment]) -> List[QuestionSegment]:
        """
        对题目进行类型分类
        """
        for segment in segments:
            segment.question_type = self._classify_single_question(segment.question_text)
        
        return segments
    
    def _classify_single_question(self, question_text: str) -> QuestionType:
        """
        分类单个题目类型
        """
        text = question_text.lower()
        
        # 选择题检测
        choice_indicators = ['选择', 'choice', '下列', '以下']
        if any(indicator in text for indicator in choice_indicators):
            # 进一步检查是否有选项
            if any(re.search(pattern, question_text) for pattern in self.question_patterns['choice_question']):
                return QuestionType.CHOICE
        
        # 填空题检测
        if any(re.search(pattern, question_text) for pattern in self.question_patterns['fill_blank']):
            return QuestionType.FILL_BLANK
        
        # 计算题检测
        if any(re.search(pattern, question_text) for pattern in self.question_patterns['calculation']):
            return QuestionType.CALCULATION
        
        # 根据关键词判断
        if any(keyword in text for keyword in ['简述', '简答', '说明', '解释']):
            return QuestionType.SHORT_ANSWER
        
        if any(keyword in text for keyword in ['论述', '分析', '评价', '讨论']):
            return QuestionType.ESSAY
        
        # 根据文本长度判断
        if len(question_text) > 200:
            return QuestionType.ESSAY
        elif len(question_text) > 100:
            return QuestionType.SHORT_ANSWER
        else:
            return QuestionType.CHOICE
    
    def _extract_student_answers(self, segments: List[QuestionSegment]) -> List[QuestionSegment]:
        """
        提取学生答案
        """
        for segment in segments:
            segment.student_answer = self._extract_answer_for_question(segment)
        
        return segments
    
    def _extract_answer_for_question(self, segment: QuestionSegment) -> str:
        """
        为特定题目提取学生答案
        """
        question_text = segment.question_text
        
        if segment.question_type == QuestionType.CHOICE:
            # 选择题答案提取
            choice_pattern = r'答案?[：:]?\s*([ABCD])'
            match = re.search(choice_pattern, question_text)
            if match:
                return match.group(1)
            
            # 查找单独的选项字母
            choice_match = re.search(r'\b([ABCD])\b', question_text)
            if choice_match:
                return choice_match.group(1)
        
        elif segment.question_type == QuestionType.FILL_BLANK:
            # 填空题答案提取
            # 查找填空位置后的内容
            blank_pattern = r'_{2,}\s*([^\n]+)'
            match = re.search(blank_pattern, question_text)
            if match:
                return match.group(1).strip()
        
        else:
            # 主观题答案提取
            # 查找答案标识后的内容
            answer_patterns = [
                r'答案?[：:]\s*([\s\S]+?)(?=\n\d+[.．]|$)',
                r'解答?[：:]\s*([\s\S]+?)(?=\n\d+[.．]|$)',
                r'答[：:]\s*([\s\S]+?)(?=\n\d+[.．]|$)'
            ]
            
            for pattern in answer_patterns:
                match = re.search(pattern, question_text)
                if match:
                    return match.group(1).strip()
        
        return ""  # 未找到答案
    
    def validate_segmentation(self, segments: List[QuestionSegment]) -> Dict[str, Any]:
        """
        验证切题结果质量
        """
        validation_result = {
            'total_questions': len(segments),
            'valid_questions': 0,
            'issues': [],
            'confidence_scores': [],
            'type_distribution': {}
        }
        
        for segment in segments:
            # 检查题目完整性
            if segment.question_text and segment.question_number:
                validation_result['valid_questions'] += 1
            else:
                validation_result['issues'].append(f"题目 {segment.question_number} 信息不完整")
            
            # 收集置信度
            validation_result['confidence_scores'].append(segment.confidence)
            
            # 统计题型分布
            question_type = segment.question_type.value
            validation_result['type_distribution'][question_type] = \
                validation_result['type_distribution'].get(question_type, 0) + 1
        
        # 计算平均置信度
        if validation_result['confidence_scores']:
            validation_result['average_confidence'] = \
                sum(validation_result['confidence_scores']) / len(validation_result['confidence_scores'])
        else:
            validation_result['average_confidence'] = 0.0
        
        # 质量评估
        if validation_result['average_confidence'] > 0.8 and len(validation_result['issues']) == 0:
            validation_result['quality_level'] = 'excellent'
        elif validation_result['average_confidence'] > 0.7 and len(validation_result['issues']) <= 1:
            validation_result['quality_level'] = 'good'
        elif validation_result['average_confidence'] > 0.6:
            validation_result['quality_level'] = 'fair'
        else:
            validation_result['quality_level'] = 'poor'
        
        return validation_result
    
    def export_segmentation_result(self, segments: List[QuestionSegment]) -> Dict[str, Any]:
        """
        导出切题结果为标准格式
        """
        result = {
            'segmentation_timestamp': str(logger.handlers[0].formatter.formatTime(logger.handlers[0], logger.makeRecord('', 0, '', 0, '', (), None)) if logger.handlers else ''),
            'total_questions': len(segments),
            'questions': []
        }
        
        for segment in segments:
            question_data = {
                'question_number': segment.question_number,
                'question_type': segment.question_type.value,
                'question_text': segment.question_text,
                'student_answer': segment.student_answer,
                'points': segment.points,
                'confidence': segment.confidence,
                'region': {
                    'x': segment.region.x,
                    'y': segment.region.y,
                    'width': segment.region.width,
                    'height': segment.region.height
                }
            }
            
            if segment.sub_questions:
                question_data['sub_questions'] = [
                    self._segment_to_dict(sub_q) for sub_q in segment.sub_questions
                ]
            
            result['questions'].append(question_data)
        
        return result
    
    def _segment_to_dict(self, segment: QuestionSegment) -> Dict[str, Any]:
        """
        将QuestionSegment转换为字典
        """
        return {
            'question_number': segment.question_number,
            'question_type': segment.question_type.value,
            'question_text': segment.question_text,
            'student_answer': segment.student_answer,
            'points': segment.points,
            'confidence': segment.confidence,
            'region': {
                'x': segment.region.x,
                'y': segment.region.y,
                'width': segment.region.width,
                'height': segment.region.height
            }
        }