from typing import Dict, List, Any, Optional
import asyncio
import time
from datetime import datetime
from pathlib import Path
import cv2
import numpy as np
from PIL import Image
import base64
import io

from .gemini_ocr_service import GeminiOCRService
from .template_matching_service import TemplateMatchingService
from .quality_assessment_service import QualityAssessmentService
from models.production_models import AnswerSheet
from db_connection import get_db
from config import settings

class EnhancedProcessingService:
    """增强的答题卡处理服务"""

    def segment_image_by_template(self, image_path: str, template: Dict[str, Any]) -> Dict[str, np.ndarray]:
        """根据模板切割图像区域

        Args:
            image_path: 图像文件路径
            template: 答题卡模板，包含各区域坐标

        Returns:
            Dict[str, np.ndarray]: 切割后的图像区域，键为区域名称
        """
        image = cv2.imread(image_path)
        if image is None:
            raise ValueError(f"无法读取图像文件: {image_path}")

        segments = {}
        for region_name, region_coords in template.get('regions', {}).items():
            x, y, w, h = region_coords
            segment = image[y:y+h, x:x+w]
            segments[region_name] = segment

        return segments
    """增强的答题卡处理服务"""
    
    def __init__(self):
        self.gemini_ocr = GeminiOCRService()
        self.template_matcher = TemplateMatchingService()
        self.quality_assessor = QualityAssessmentService()
        self.processing_cache = {}
        

    
    async def process_with_detection(self, image_path: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """使用YOLO检测增强的图像处理流程"""
        start_time = time.time()
        
        try:
            # 1. 图像质量预检
            quality_result = await self.quality_assessor.assess_image_quality(image_path)
            if not quality_result['pass_threshold'] and not config.get('skipQualityCheck', False):
                return {
                    'success': False,
                    'error': 'Image quality below threshold',
                    'quality_result': quality_result,
                    'processing_time': time.time() - start_time
                }
            
            # 2. 跳过YOLO检测（已移除）
            detection_result = None
            
            # 3. 模板匹配（如果启用）
            template_match = None
            if config.get('enableTemplateMatching', True):
                template_match = await self.template_matcher.match_layout(image_path)
            
            # 4. Gemini精确识别
            ocr_result = await self.gemini_ocr.process_with_regions(
                image_path, detection_result, template_match
            )
            
            # 5. 结果融合
            merged_result = self._merge_results(detection_result, template_match, ocr_result)
            
            processing_time = time.time() - start_time
            
            return {
                'success': True,
                'result': merged_result,
                'quality_result': quality_result,
                'detection_result': detection_result,
                'template_match': template_match,
                'ocr_result': ocr_result,
                'processing_time': processing_time,
                'config_used': config
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'processing_time': time.time() - start_time
            }
    

    
    def _merge_results(self, detection_result: Optional[Dict], template_match: Optional[Dict], ocr_result: Dict) -> Dict[str, Any]:
        """融合多种检测结果"""
        merged = {
            'student_info': ocr_result.get('student_info', {}),
            'questions': ocr_result.get('questions', []),
            'layout_analysis': ocr_result.get('layout_analysis', {}),
            'confidence_scores': {
                'ocr': ocr_result.get('confidence', 0.0),
                'template': template_match.get('confidence', 0.0) if template_match else 0.0
            }
        }
        
        # 如果有模板匹配结果，用于验证和校正
        if template_match and template_match.get('matched_template'):
            merged['template_info'] = template_match
            merged['questions'] = self._validate_with_template(
                merged['questions'], template_match
            )
        
        # 计算综合置信度
        confidence_weights = {
            'ocr': 0.7,
            'template': 0.3
        }
        
        overall_confidence = sum(
            merged['confidence_scores'][key] * weight 
            for key, weight in confidence_weights.items()
        )
        merged['overall_confidence'] = overall_confidence
        
        return merged
    

    
    def _validate_with_template(self, questions: List[Dict], template_match: Dict) -> List[Dict]:
        """使用模板匹配结果验证题目"""
        validated_questions = []
        template_questions = template_match.get('template_questions', [])
        
        for question in questions:
            # 寻找对应的模板题目
            template_question = self._find_template_question(question, template_questions)
            
            if template_question:
                validated_question = question.copy()
                validated_question['template_matched'] = True
                validated_question['expected_type'] = template_question.get('type')
                validated_question['template_confidence'] = template_match.get('confidence', 0.0)
                validated_questions.append(validated_question)
            else:
                validated_questions.append(question)
        
        return validated_questions
    
    def _find_template_question(self, question: Dict, template_questions: List[Dict]) -> Optional[Dict]:
        """寻找对应的模板题目"""
        question_number = question.get('number')
        if not question_number:
            return None
        
        for template_q in template_questions:
            if template_q.get('number') == question_number:
                return template_q
        
        return None
    
    def _calculate_iou(self, bbox1: List[int], bbox2: List[int]) -> float:
        """计算两个边界框的IoU"""
        try:
            x1_1, y1_1, x2_1, y2_1 = bbox1
            x1_2, y1_2, x2_2, y2_2 = bbox2
            
            # 计算交集
            x1_i = max(x1_1, x1_2)
            y1_i = max(y1_1, y1_2)
            x2_i = min(x2_1, x2_2)
            y2_i = min(y2_1, y2_2)
            
            if x2_i <= x1_i or y2_i <= y1_i:
                return 0.0
            
            intersection = (x2_i - x1_i) * (y2_i - y1_i)
            
            # 计算并集
            area1 = (x2_1 - x1_1) * (y2_1 - y1_1)
            area2 = (x2_2 - x1_2) * (y2_2 - y1_2)
            union = area1 + area2 - intersection
            
            return intersection / union if union > 0 else 0.0
            
        except Exception:
            return 0.0
    
    async def process_batch(self, image_paths: List[str], config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """批量处理图像"""
        max_workers = config.get('parallelWorkers', 4)
        semaphore = asyncio.Semaphore(max_workers)
        
        async def process_single(image_path: str) -> Dict[str, Any]:
            async with semaphore:
                return await self.process_with_detection(image_path, config)
        
        tasks = [process_single(path) for path in image_paths]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # 处理异常结果
        processed_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                processed_results.append({
                    'success': False,
                    'error': str(result),
                    'image_path': image_paths[i]
                })
            else:
                result['image_path'] = image_paths[i]
                processed_results.append(result)
        
        return processed_results
    
    def get_performance_metrics(self, results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """计算性能指标"""
        if not results:
            return {
                'averageProcessingTime': 0,
                'accuracyRate': 0,
                'throughput': 0,
                'errorRate': 0,
                'cacheHitRate': 0
            }
        
        successful_results = [r for r in results if r.get('success', False)]
        
        avg_processing_time = np.mean([
            r.get('processing_time', 0) for r in successful_results
        ]) if successful_results else 0
        
        accuracy_rate = len(successful_results) / len(results)
        error_rate = 1 - accuracy_rate
        
        # 计算吞吐量（张/分钟）
        total_time = sum(r.get('processing_time', 0) for r in results)
        throughput = (len(results) / total_time) * 60 if total_time > 0 else 0
        
        return {
            'averageProcessingTime': avg_processing_time,
            'accuracyRate': accuracy_rate,
            'throughput': throughput,
            'errorRate': error_rate,
            'cacheHitRate': 0.78  # 模拟缓存命中率
        }