from typing import Dict, List, Any, Optional
import asyncio
import time
from datetime import datetime
from pathlib import Path
import cv2
import numpy as np
from ultralytics import YOLO
from PIL import Image
import base64
import io

from .gemini_ocr_service import GeminiOCRService
from .template_matching_service import TemplateMatchingService
from .quality_assessment_service import QualityAssessmentService
from ..models.answer_sheet import AnswerSheet
from ..database import get_db
from ..config import settings

class EnhancedProcessingService:
    """增强的答题卡处理服务"""
    
    def __init__(self):
        self.yolo_model = self._load_yolo_model()
        self.gemini_ocr = GeminiOCRService()
        self.template_matcher = TemplateMatchingService()
        self.quality_assessor = QualityAssessmentService()
        self.processing_cache = {}
        
    def _load_yolo_model(self) -> Optional[YOLO]:
        """加载YOLO模型"""
        try:
            model_path = getattr(settings, 'YOLO_MODEL_PATH', 'models/question_detection_yolo.pt')
            if Path(model_path).exists():
                return YOLO(model_path)
            else:
                print(f"YOLO模型文件不存在: {model_path}，将使用预训练模型")
                return YOLO('yolov8n.pt')  # 使用预训练模型作为fallback
        except Exception as e:
            print(f"加载YOLO模型失败: {e}")
            return None
    
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
            
            # 2. YOLO快速预检测（如果启用）
            detection_result = None
            if config.get('enableYOLODetection', True) and self.yolo_model:
                detection_result = await self._yolo_detect_regions(image_path)
            
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
    
    async def _yolo_detect_regions(self, image_path: str) -> Dict[str, Any]:
        """使用YOLO检测题目区域"""
        if not self.yolo_model:
            return {'regions': [], 'confidence': 0.0}
        
        try:
            # 加载图像
            image = cv2.imread(image_path)
            if image is None:
                raise ValueError(f"无法加载图像: {image_path}")
            
            # YOLO推理
            results = self.yolo_model(image)
            
            regions = []
            for result in results:
                boxes = result.boxes
                if boxes is not None:
                    for box in boxes:
                        x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                        confidence = box.conf[0].cpu().numpy()
                        class_id = int(box.cls[0].cpu().numpy())
                        
                        regions.append({
                            'bbox': [int(x1), int(y1), int(x2), int(y2)],
                            'confidence': float(confidence),
                            'class_id': class_id,
                            'type': 'question_region'
                        })
            
            avg_confidence = np.mean([r['confidence'] for r in regions]) if regions else 0.0
            
            return {
                'regions': regions,
                'confidence': float(avg_confidence),
                'detection_count': len(regions)
            }
            
        except Exception as e:
            print(f"YOLO检测失败: {e}")
            return {'regions': [], 'confidence': 0.0, 'error': str(e)}
    
    def _merge_results(self, detection_result: Optional[Dict], template_match: Optional[Dict], ocr_result: Dict) -> Dict[str, Any]:
        """融合多种检测结果"""
        merged = {
            'student_info': ocr_result.get('student_info', {}),
            'questions': ocr_result.get('questions', []),
            'layout_analysis': ocr_result.get('layout_analysis', {}),
            'confidence_scores': {
                'ocr': ocr_result.get('confidence', 0.0),
                'detection': detection_result.get('confidence', 0.0) if detection_result else 0.0,
                'template': template_match.get('confidence', 0.0) if template_match else 0.0
            }
        }
        
        # 如果有YOLO检测结果，用于优化题目边界
        if detection_result and detection_result.get('regions'):
            merged['enhanced_regions'] = detection_result['regions']
            merged['questions'] = self._optimize_question_boundaries(
                merged['questions'], detection_result['regions']
            )
        
        # 如果有模板匹配结果，用于验证和校正
        if template_match and template_match.get('matched_template'):
            merged['template_info'] = template_match
            merged['questions'] = self._validate_with_template(
                merged['questions'], template_match
            )
        
        # 计算综合置信度
        confidence_weights = {
            'ocr': 0.5,
            'detection': 0.3,
            'template': 0.2
        }
        
        overall_confidence = sum(
            merged['confidence_scores'][key] * weight 
            for key, weight in confidence_weights.items()
        )
        merged['overall_confidence'] = overall_confidence
        
        return merged
    
    def _optimize_question_boundaries(self, questions: List[Dict], detection_regions: List[Dict]) -> List[Dict]:
        """使用YOLO检测结果优化题目边界"""
        optimized_questions = []
        
        for question in questions:
            best_match = None
            best_iou = 0.0
            
            question_bbox = question.get('bbox', [])
            if len(question_bbox) != 4:
                optimized_questions.append(question)
                continue
            
            # 寻找最佳匹配的检测区域
            for region in detection_regions:
                iou = self._calculate_iou(question_bbox, region['bbox'])
                if iou > best_iou:
                    best_iou = iou
                    best_match = region
            
            # 如果找到好的匹配，使用检测结果优化边界
            if best_match and best_iou > 0.3:
                optimized_question = question.copy()
                optimized_question['bbox'] = best_match['bbox']
                optimized_question['detection_confidence'] = best_match['confidence']
                optimized_question['boundary_optimized'] = True
                optimized_questions.append(optimized_question)
            else:
                optimized_questions.append(question)
        
        return optimized_questions
    
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