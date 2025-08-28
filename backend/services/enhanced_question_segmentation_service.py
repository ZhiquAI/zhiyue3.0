#!/usr/bin/env python3
"""
增强的题目切分服务
基于深度学习和OCR结合实现高精度题目分割和识别
"""

import asyncio
import cv2
import numpy as np
import re
import logging
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass, asdict
from enum import Enum
from pathlib import Path
import json

from .gemini_ocr_service import GeminiOCRService

logger = logging.getLogger(__name__)

class QuestionType(Enum):
    """题目类型枚举"""
    MULTIPLE_CHOICE = "multiple_choice"      # 选择题
    FILL_IN_BLANK = "fill_in_blank"         # 填空题
    SHORT_ANSWER = "short_answer"           # 简答题
    ESSAY = "essay"                         # 作文题
    CALCULATION = "calculation"             # 计算题
    DIAGRAM = "diagram"                     # 图表题
    TRUE_FALSE = "true_false"               # 判断题
    MATCHING = "matching"                   # 匹配题
    UNKNOWN = "unknown"                     # 未知类型

@dataclass
class QuestionRegion:
    """题目区域信息"""
    x: int
    y: int
    width: int
    height: int
    confidence: float
    question_number: Optional[str] = None
    question_type: QuestionType = QuestionType.UNKNOWN

@dataclass
class AnswerRegion:
    """答案区域信息"""
    x: int
    y: int
    width: int
    height: int
    answer_type: str  # text, choice, blank, calculation
    extracted_content: str = ""
    confidence: float = 0.0

@dataclass
class QuestionSegment:
    """题目分割结果"""
    question_id: str
    question_number: str
    question_type: QuestionType
    question_region: QuestionRegion
    answer_regions: List[AnswerRegion]
    question_text: str = ""
    student_answer: str = ""
    standard_answer: Optional[str] = None
    max_score: float = 0.0
    confidence: float = 0.0
    processing_notes: List[str] = None
    
    def __post_init__(self):
        if self.processing_notes is None:
            self.processing_notes = []

@dataclass
class QuestionSegmentationResult:
    """题目分割结果"""
    success: bool
    total_questions: int
    question_segments: List[QuestionSegment]
    processing_time: float
    overall_confidence: float
    segmentation_method: str
    issues: List[str] = None
    
    def __post_init__(self):
        if self.issues is None:
            self.issues = []

class EnhancedQuestionSegmentationService:
    """增强的题目切分服务"""
    
    def __init__(self):
        self.ocr_service = GeminiOCRService()
        
        # 题目识别的正则表达式模式
        self.question_patterns = {
            'question_number': [
                r'(?:^|\n)\s*(\d+)[.．、]\s*',  # 1. 2. 3.
                r'(?:^|\n)\s*[(（](\d+)[)）]\s*',  # (1) (2) (3)
                r'(?:^|\n)\s*第\s*(\d+)\s*题',  # 第1题
                r'(?:^|\n)\s*(\d+)\s*[、]\s*',  # 1、 2、
                r'(?:^|\n)\s*Question\s+(\d+)',  # Question 1
            ],
            'multiple_choice_indicators': [
                r'[ABCD][.．、)）]\s*',  # A. B. C. D.
                r'[(（][ABCD][)）]\s*',  # (A) (B) (C) (D)
                r'选择题|multiple\s+choice|choose',
            ],
            'fill_blank_indicators': [
                r'_{3,}',  # 下划线
                r'\(\s*\)',  # 空括号
                r'\[\s*\]',  # 空方括号
                r'填空|fill\s+in|blank',
            ],
            'essay_indicators': [
                r'作文|essay|写作|composition',
                r'论述|discuss|analyze|describe',
                r'不少于\d+字|至少\d+字',
            ],
            'calculation_indicators': [
                r'计算|求解|解答|solve|calculate',
                r'=\s*[?？]',
                r'\d+\s*[+\-×÷]\s*\d+',
                r'方程|equation|function',
            ],
            'true_false_indicators': [
                r'判断|true.*false|对.*错',
                r'正确.*错误|√.*×',
            ]
        }
        
        # 答案区域检测模式
        self.answer_patterns = {
            'choice_answer': r'[ABCD]',
            'blank_answer': r'_{3,}|\(\s*\)|\[\s*\]',
            'numeric_answer': r'\d+(?:\.\d+)?',
        }
        
        logger.info("增强题目切分服务初始化完成")
    
    async def segment_questions(
        self, 
        image_path: str,
        segmentation_config: Optional[Dict[str, Any]] = None
    ) -> QuestionSegmentationResult:
        """
        分割识别题目
        
        Args:
            image_path: 图像文件路径
            segmentation_config: 切分配置
            
        Returns:
            题目分割结果
        """
        
        start_time = asyncio.get_event_loop().time()
        
        try:
            # 默认配置
            config = {
                'confidence_threshold': 0.7,
                'enable_question_type_detection': True,
                'enable_answer_region_detection': True,
                'merge_similar_regions': True,
                'min_question_height': 50,
                'max_questions': 50,
                **(segmentation_config or {})
            }
            
            # 加载图像
            image = cv2.imread(image_path)
            if image is None:
                return QuestionSegmentationResult(
                    success=False,
                    total_questions=0,
                    question_segments=[],
                    processing_time=0.0,
                    overall_confidence=0.0,
                    segmentation_method='failed',
                    issues=["无法加载图像文件"]
                )
            
            # 1. OCR文字识别和版面分析
            ocr_result = await self.ocr_service.extract_text(image_path)
            if not ocr_result or 'text_regions' not in ocr_result:
                return QuestionSegmentationResult(
                    success=False,
                    total_questions=0,
                    question_segments=[],
                    processing_time=0.0,
                    overall_confidence=0.0,
                    segmentation_method='ocr_failed',
                    issues=["OCR识别失败"]
                )
            
            # 2. 基于OCR结果进行题目检测
            question_regions = await self._detect_question_regions(
                image, ocr_result, config
            )
            
            if not question_regions:
                return QuestionSegmentationResult(
                    success=False,
                    total_questions=0,
                    question_segments=[],
                    processing_time=0.0,
                    overall_confidence=0.0,
                    segmentation_method='no_questions_found',
                    issues=["未检测到题目区域"]
                )
            
            # 3. 题目类型分类
            if config['enable_question_type_detection']:
                await self._classify_question_types(question_regions, ocr_result)
            
            # 4. 答案区域检测
            answer_regions_map = {}
            if config['enable_answer_region_detection']:
                answer_regions_map = await self._detect_answer_regions(
                    image, question_regions, ocr_result, config
                )
            
            # 5. 构建题目分割结果
            question_segments = []
            for i, question_region in enumerate(question_regions):
                # 提取题目文本
                question_text = await self._extract_question_text(
                    question_region, ocr_result
                )
                
                # 提取学生答案
                student_answer = ""
                answer_regions = answer_regions_map.get(question_region.question_number, [])
                if answer_regions:
                    student_answer = await self._extract_student_answer(
                        answer_regions, ocr_result
                    )
                
                # 创建题目分割对象
                segment = QuestionSegment(
                    question_id=f"q_{question_region.question_number or (i+1)}",
                    question_number=question_region.question_number or str(i+1),
                    question_type=question_region.question_type,
                    question_region=question_region,
                    answer_regions=answer_regions,
                    question_text=question_text,
                    student_answer=student_answer,
                    confidence=question_region.confidence
                )
                
                question_segments.append(segment)
            
            # 6. 质量检查和验证
            issues = await self._validate_segmentation_quality(
                question_segments, config
            )
            
            overall_confidence = self._calculate_overall_confidence(question_segments)
            processing_time = asyncio.get_event_loop().time() - start_time
            
            result = QuestionSegmentationResult(
                success=True,
                total_questions=len(question_segments),
                question_segments=question_segments,
                processing_time=processing_time,
                overall_confidence=overall_confidence,
                segmentation_method='enhanced_ocr_based',
                issues=issues
            )
            
            logger.info(
                f"题目分割完成: {image_path}, "
                f"识别 {len(question_segments)} 道题, "
                f"置信度: {overall_confidence:.2f}, "
                f"耗时: {processing_time:.2f}s"
            )
            
            return result
            
        except Exception as e:
            processing_time = asyncio.get_event_loop().time() - start_time
            logger.error(f"题目分割失败: {image_path}, 错误: {str(e)}")
            
            return QuestionSegmentationResult(
                success=False,
                total_questions=0,
                question_segments=[],
                processing_time=processing_time,
                overall_confidence=0.0,
                segmentation_method='exception',
                issues=[f"处理异常: {str(e)}"]
            )
    
    async def _detect_question_regions(
        self, 
        image: np.ndarray, 
        ocr_result: Dict[str, Any],
        config: Dict[str, Any]
    ) -> List[QuestionRegion]:
        """检测题目区域"""
        
        question_regions = []
        text_regions = ocr_result.get('text_regions', [])
        
        # 查找题目编号
        question_number_regions = []
        for region in text_regions:
            text = region.get('text', '')
            bbox = region.get('bbox', [0, 0, 100, 50])
            confidence = region.get('confidence', 0.8)
            
            # 检查是否为题目编号
            question_number = self._extract_question_number(text)
            if question_number:
                question_number_regions.append({
                    'number': question_number,
                    'bbox': bbox,
                    'confidence': confidence,
                    'text': text
                })
        
        # 根据题目编号构建题目区域
        if question_number_regions:
            # 按题目编号排序
            question_number_regions.sort(key=lambda x: int(x['number']))
            
            height, width = image.shape[:2]
            
            for i, qn_region in enumerate(question_number_regions):
                # 确定题目区域的边界
                start_y = qn_region['bbox'][1]
                
                # 计算题目区域的结束位置
                if i + 1 < len(question_number_regions):
                    end_y = question_number_regions[i + 1]['bbox'][1]
                else:
                    end_y = height
                
                # 创建题目区域
                question_height = end_y - start_y
                if question_height >= config.get('min_question_height', 50):
                    question_region = QuestionRegion(
                        x=0,
                        y=start_y,
                        width=width,
                        height=question_height,
                        confidence=qn_region['confidence'],
                        question_number=qn_region['number']
                    )
                    question_regions.append(question_region)
        
        # 如果没有找到明确的题目编号，尝试基于文本密度分割
        if not question_regions:
            question_regions = await self._detect_questions_by_text_density(
                image, text_regions, config
            )
        
        # 限制题目数量
        max_questions = config.get('max_questions', 50)
        if len(question_regions) > max_questions:
            question_regions = question_regions[:max_questions]
        
        return question_regions
    
    def _extract_question_number(self, text: str) -> Optional[str]:
        """从文本中提取题目编号"""
        
        for pattern in self.question_patterns['question_number']:
            matches = re.findall(pattern, text, re.MULTILINE | re.IGNORECASE)
            if matches:
                try:
                    # 验证是否为有效的题目编号（1-100范围内）
                    number = int(matches[0])
                    if 1 <= number <= 100:
                        return str(number)
                except (ValueError, IndexError):
                    continue
        
        return None
    
    async def _detect_questions_by_text_density(
        self,
        image: np.ndarray,
        text_regions: List[Dict[str, Any]],
        config: Dict[str, Any]
    ) -> List[QuestionRegion]:
        """基于文本密度检测题目区域"""
        
        height, width = image.shape[:2]
        question_regions = []
        
        # 将图像按行分割，分析文本密度
        row_height = 50  # 每行高度
        rows = height // row_height
        
        text_density = np.zeros(rows)
        
        # 计算每行的文本密度
        for region in text_regions:
            bbox = region.get('bbox', [0, 0, 100, 50])
            center_y = (bbox[1] + bbox[3]) // 2
            row_index = min(center_y // row_height, rows - 1)
            text_density[row_index] += len(region.get('text', ''))
        
        # 找到文本密度的峰值作为题目开始位置
        peaks = []
        threshold = np.mean(text_density) + np.std(text_density)
        
        for i in range(1, len(text_density) - 1):
            if (text_density[i] > text_density[i-1] and 
                text_density[i] > text_density[i+1] and 
                text_density[i] > threshold):
                peaks.append(i)
        
        # 根据峰值构建题目区域
        for i, peak in enumerate(peaks):
            start_y = peak * row_height
            
            if i + 1 < len(peaks):
                end_y = peaks[i + 1] * row_height
            else:
                end_y = height
            
            question_region = QuestionRegion(
                x=0,
                y=start_y,
                width=width,
                height=end_y - start_y,
                confidence=0.6,  # 基于密度的检测置信度较低
                question_number=str(i + 1)
            )
            question_regions.append(question_region)
        
        return question_regions
    
    async def _classify_question_types(
        self, 
        question_regions: List[QuestionRegion],
        ocr_result: Dict[str, Any]
    ) -> None:
        """对题目进行类型分类"""
        
        text_regions = ocr_result.get('text_regions', [])
        
        for question_region in question_regions:
            # 获取题目区域内的文本
            region_text = ""
            for text_region in text_regions:
                bbox = text_region.get('bbox', [0, 0, 100, 50])
                # 检查文本区域是否在题目区域内
                if (bbox[1] >= question_region.y and 
                    bbox[3] <= question_region.y + question_region.height):
                    region_text += " " + text_region.get('text', '')
            
            # 基于关键词识别题目类型
            region_text = region_text.lower()
            
            # 选择题
            if any(re.search(pattern, region_text) 
                   for pattern in self.question_patterns['multiple_choice_indicators']):
                question_region.question_type = QuestionType.MULTIPLE_CHOICE
            
            # 填空题
            elif any(re.search(pattern, region_text) 
                     for pattern in self.question_patterns['fill_blank_indicators']):
                question_region.question_type = QuestionType.FILL_IN_BLANK
            
            # 作文题
            elif any(re.search(pattern, region_text) 
                     for pattern in self.question_patterns['essay_indicators']):
                question_region.question_type = QuestionType.ESSAY
            
            # 计算题
            elif any(re.search(pattern, region_text) 
                     for pattern in self.question_patterns['calculation_indicators']):
                question_region.question_type = QuestionType.CALCULATION
            
            # 判断题
            elif any(re.search(pattern, region_text) 
                     for pattern in self.question_patterns['true_false_indicators']):
                question_region.question_type = QuestionType.TRUE_FALSE
            
            # 默认为简答题
            else:
                question_region.question_type = QuestionType.SHORT_ANSWER
    
    async def _detect_answer_regions(
        self,
        image: np.ndarray,
        question_regions: List[QuestionRegion],
        ocr_result: Dict[str, Any],
        config: Dict[str, Any]
    ) -> Dict[str, List[AnswerRegion]]:
        """检测答案区域"""
        
        answer_regions_map = {}
        text_regions = ocr_result.get('text_regions', [])
        
        for question_region in question_regions:
            answer_regions = []
            
            # 在题目区域内寻找答案区域
            for text_region in text_regions:
                bbox = text_region.get('bbox', [0, 0, 100, 50])
                text = text_region.get('text', '')
                
                # 检查是否在题目区域内
                if (bbox[1] >= question_region.y and 
                    bbox[3] <= question_region.y + question_region.height):
                    
                    # 根据题目类型检测答案模式
                    answer_type = self._identify_answer_type(
                        text, question_region.question_type
                    )
                    
                    if answer_type:
                        answer_region = AnswerRegion(
                            x=bbox[0],
                            y=bbox[1],
                            width=bbox[2] - bbox[0],
                            height=bbox[3] - bbox[1],
                            answer_type=answer_type,
                            extracted_content=text,
                            confidence=text_region.get('confidence', 0.8)
                        )
                        answer_regions.append(answer_region)
            
            if question_region.question_number:
                answer_regions_map[question_region.question_number] = answer_regions
        
        return answer_regions_map
    
    def _identify_answer_type(self, text: str, question_type: QuestionType) -> Optional[str]:
        """识别答案类型"""
        
        text_lower = text.lower()
        
        # 选择题答案
        if question_type == QuestionType.MULTIPLE_CHOICE:
            if re.match(r'^[abcd]$', text_lower):
                return 'choice'
        
        # 填空题答案
        elif question_type == QuestionType.FILL_IN_BLANK:
            if re.search(r'_{3,}', text) or re.search(r'\(\s*\)', text):
                return 'blank'
        
        # 数值型答案
        if re.match(r'^\d+(?:\.\d+)?$', text):
            return 'numeric'
        
        # 文本型答案
        if len(text.strip()) > 0:
            return 'text'
        
        return None
    
    async def _extract_question_text(
        self, 
        question_region: QuestionRegion,
        ocr_result: Dict[str, Any]
    ) -> str:
        """提取题目文本"""
        
        text_regions = ocr_result.get('text_regions', [])
        question_text = ""
        
        for text_region in text_regions:
            bbox = text_region.get('bbox', [0, 0, 100, 50])
            
            # 检查文本区域是否在题目区域内
            if (bbox[1] >= question_region.y and 
                bbox[3] <= question_region.y + question_region.height):
                
                text = text_region.get('text', '').strip()
                if text:
                    question_text += " " + text
        
        return question_text.strip()
    
    async def _extract_student_answer(
        self,
        answer_regions: List[AnswerRegion],
        ocr_result: Dict[str, Any]
    ) -> str:
        """提取学生答案"""
        
        if not answer_regions:
            return ""
        
        # 合并所有答案区域的内容
        answer_texts = []
        for answer_region in answer_regions:
            if answer_region.extracted_content:
                answer_texts.append(answer_region.extracted_content.strip())
        
        return " ".join(answer_texts)
    
    async def _validate_segmentation_quality(
        self,
        question_segments: List[QuestionSegment],
        config: Dict[str, Any]
    ) -> List[str]:
        """验证分割质量"""
        
        issues = []
        
        # 检查题目数量
        if len(question_segments) == 0:
            issues.append("未检测到任何题目")
        elif len(question_segments) > config.get('max_questions', 50):
            issues.append(f"检测到题目数量过多: {len(question_segments)}")
        
        # 检查题目编号连续性
        numbers = []
        for segment in question_segments:
            try:
                numbers.append(int(segment.question_number))
            except (ValueError, TypeError):
                issues.append(f"题目编号格式错误: {segment.question_number}")
        
        if numbers:
            numbers.sort()
            expected = list(range(1, len(numbers) + 1))
            if numbers != expected:
                issues.append("题目编号不连续")
        
        # 检查置信度
        low_confidence_count = len([s for s in question_segments if s.confidence < 0.6])
        if low_confidence_count > len(question_segments) * 0.3:
            issues.append(f"过多低置信度题目: {low_confidence_count}/{len(question_segments)}")
        
        return issues
    
    def _calculate_overall_confidence(self, question_segments: List[QuestionSegment]) -> float:
        """计算总体置信度"""
        
        if not question_segments:
            return 0.0
        
        confidences = [segment.confidence for segment in question_segments]
        return sum(confidences) / len(confidences)
    
    async def batch_segment_questions(
        self,
        image_paths: List[str],
        segmentation_config: Optional[Dict[str, Any]] = None,
        max_concurrent: int = 3
    ) -> List[QuestionSegmentationResult]:
        """批量题目分割"""
        
        logger.info(f"开始批量题目分割: {len(image_paths)} 个文件")
        
        semaphore = asyncio.Semaphore(max_concurrent)
        
        async def segment_single(image_path):
            async with semaphore:
                return await self.segment_questions(image_path, segmentation_config)
        
        results = await asyncio.gather(
            *[segment_single(path) for path in image_paths],
            return_exceptions=True
        )
        
        # 统计结果
        success_count = len([r for r in results if not isinstance(r, Exception) and r.success])
        logger.info(f"批量分割完成: 成功 {success_count}/{len(image_paths)}")
        
        return [r if not isinstance(r, Exception) else None for r in results]
    
    def export_segmentation_results(
        self, 
        results: List[QuestionSegmentationResult],
        export_format: str = 'json'
    ) -> Dict[str, Any]:
        """导出分割结果"""
        
        exported_data = {
            'total_images': len(results),
            'successful_segmentations': len([r for r in results if r and r.success]),
            'total_questions_detected': sum(r.total_questions for r in results if r and r.success),
            'segmentation_results': []
        }
        
        for i, result in enumerate(results):
            if result:
                result_data = {
                    'image_index': i,
                    'success': result.success,
                    'total_questions': result.total_questions,
                    'overall_confidence': result.overall_confidence,
                    'processing_time': result.processing_time,
                    'segmentation_method': result.segmentation_method,
                    'issues': result.issues,
                    'questions': []
                }
                
                for segment in result.question_segments:
                    question_data = {
                        'question_id': segment.question_id,
                        'question_number': segment.question_number,
                        'question_type': segment.question_type.value,
                        'question_text': segment.question_text,
                        'student_answer': segment.student_answer,
                        'confidence': segment.confidence,
                        'region': {
                            'x': segment.question_region.x,
                            'y': segment.question_region.y,
                            'width': segment.question_region.width,
                            'height': segment.question_region.height
                        },
                        'answer_regions_count': len(segment.answer_regions),
                        'processing_notes': segment.processing_notes
                    }
                    result_data['questions'].append(question_data)
                
                exported_data['segmentation_results'].append(result_data)
        
        return exported_data

# 全局服务实例
enhanced_question_segmentation_service = EnhancedQuestionSegmentationService()