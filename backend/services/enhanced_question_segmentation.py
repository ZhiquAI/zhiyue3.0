from typing import Dict, List, Any, Optional, Tuple
import cv2
import numpy as np
import asyncio
from PIL import Image, ImageDraw, ImageFont
import json
import re
from datetime import datetime

from services.gemini_ocr_service import GeminiOCRService

class QuestionRegionDetector:
    """题目区域检测器"""
    
    def __init__(self):
        pass
    
    async def detect_question_regions(self, image: np.ndarray) -> List[Dict[str, Any]]:
        """检测题目区域"""
        try:
            # 使用传统图像处理检测题目区域
            traditional_regions = self._detect_regions_traditional(image)
            
            # 排序和编号
            sorted_regions = self._sort_and_number_regions(traditional_regions)
            
            return sorted_regions
            
        except Exception as e:
            print(f"题目区域检测错误: {e}")
            return []
    
    def _detect_regions_traditional(self, image: np.ndarray) -> List[Dict[str, Any]]:
        """传统图像处理检测题目区域"""
        try:
            # 转换为灰度图
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # 多种检测方法组合
            regions = []
            
            # 方法1: 基于文本行检测
            text_regions = self._detect_text_regions(gray)
            regions.extend(text_regions)
            
            # 方法2: 基于题号检测
            number_regions = self._detect_question_numbers(gray)
            regions.extend(number_regions)
            
            # 方法3: 基于布局分析
            layout_regions = self._detect_layout_regions(gray)
            regions.extend(layout_regions)
            
            # 如果没有检测到任何区域，使用网格分割作为备选方案
            if not regions:
                regions = self._create_grid_regions(image)
            
            # 去重和合并重叠区域
            merged_regions = self._merge_overlapping_regions(regions)
            
            return merged_regions
            
        except Exception as e:
            print(f"传统检测方法错误: {e}")
            # 返回默认的网格分割
            return self._create_grid_regions(image)
    
    def _detect_text_regions(self, gray: np.ndarray) -> List[Dict[str, Any]]:
        """检测文本区域"""
        regions = []
        try:
            # 自适应阈值
            binary = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2)
            
            # 水平形态学操作，连接文本
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (20, 1))
            dilated = cv2.dilate(binary, kernel, iterations=1)
            
            # 查找轮廓
            contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            for contour in contours:
                area = cv2.contourArea(contour)
                if area < 500:  # 过滤小区域
                    continue
                
                x, y, w, h = cv2.boundingRect(contour)
                
                # 过滤不合理的区域
                if w < 100 or h < 30 or w/h > 20 or h/w > 10:
                    continue
                
                regions.append({
                    'bbox': [x, y, x + w, y + h],
                    'confidence': 0.8,
                    'area': area,
                    'detection_method': 'text_detection'
                })
        except Exception as e:
            print(f"文本区域检测错误: {e}")
        
        return regions
    
    def _detect_question_numbers(self, gray: np.ndarray) -> List[Dict[str, Any]]:
        """检测题号区域"""
        regions = []
        try:
            # 使用模板匹配检测数字
            # 这里简化处理，实际可以使用OCR检测题号
            binary = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2)
            
            # 查找小的矩形区域（可能是题号）
            contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            number_candidates = []
            for contour in contours:
                area = cv2.contourArea(contour)
                if 50 < area < 500:  # 题号通常是小区域
                    x, y, w, h = cv2.boundingRect(contour)
                    if 10 < w < 50 and 10 < h < 50:  # 题号的大小范围
                        number_candidates.append((x, y, w, h))
            
            # 基于题号位置推断题目区域
            for x, y, w, h in number_candidates:
                # 假设题目在题号右侧和下方
                question_x = x
                question_y = y
                question_w = min(gray.shape[1] - x, 400)  # 题目宽度
                question_h = min(gray.shape[0] - y, 150)  # 题目高度
                
                regions.append({
                    'bbox': [question_x, question_y, question_x + question_w, question_y + question_h],
                    'confidence': 0.6,
                    'area': question_w * question_h,
                    'detection_method': 'number_based'
                })
        
        except Exception as e:
            print(f"题号检测错误: {e}")
        
        return regions
    
    def _detect_layout_regions(self, gray: np.ndarray) -> List[Dict[str, Any]]:
        """基于布局分析检测区域"""
        regions = []
        try:
            h, w = gray.shape
            
            # 水平投影，检测行
            horizontal_projection = np.sum(gray < 128, axis=1)
            
            # 找到文本行的起始和结束位置
            in_text = False
            start_y = 0
            
            for y, projection in enumerate(horizontal_projection):
                if projection > w * 0.1:  # 有足够的文本像素
                    if not in_text:
                        start_y = y
                        in_text = True
                else:
                    if in_text:
                        # 结束一个文本区域
                        if y - start_y > 20:  # 最小高度
                            regions.append({
                                'bbox': [0, start_y, w, y],
                                'confidence': 0.7,
                                'area': w * (y - start_y),
                                'detection_method': 'layout_analysis'
                            })
                        in_text = False
            
            # 处理最后一个区域
            if in_text and h - start_y > 20:
                regions.append({
                    'bbox': [0, start_y, w, h],
                    'confidence': 0.7,
                    'area': w * (h - start_y),
                    'detection_method': 'layout_analysis'
                })
        
        except Exception as e:
            print(f"布局分析错误: {e}")
        
        return regions
    
    def _create_grid_regions(self, image: np.ndarray) -> List[Dict[str, Any]]:
        """创建网格分割区域作为备选方案"""
        h, w = image.shape[:2]
        regions = []
        
        # 假设试卷有4-6道题目，按网格分割
        rows = 3
        cols = 1
        
        region_h = h // rows
        region_w = w // cols
        
        for row in range(rows):
            for col in range(cols):
                x1 = col * region_w
                y1 = row * region_h
                x2 = min((col + 1) * region_w, w)
                y2 = min((row + 1) * region_h, h)
                
                regions.append({
                    'bbox': [x1, y1, x2, y2],
                    'confidence': 0.5,
                    'area': (x2 - x1) * (y2 - y1),
                    'detection_method': 'grid_fallback'
                })
        
        return regions
    
    def _merge_overlapping_regions(self, regions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """合并重叠的区域"""
        if not regions:
            return regions
        
        # 按面积排序，保留大的区域
        sorted_regions = sorted(regions, key=lambda r: r['area'], reverse=True)
        merged = []
        
        for region in sorted_regions:
            should_merge = False
            for i, existing in enumerate(merged):
                iou = self._calculate_iou(region['bbox'], existing['bbox'])
                if iou > 0.3:  # 重叠阈值
                    # 合并区域，保留置信度更高的
                    if region['confidence'] > existing['confidence']:
                        merged[i] = region
                    should_merge = True
                    break
            
            if not should_merge:
                merged.append(region)
        
        return merged
    

    
    def _calculate_iou(self, bbox1: List[int], bbox2: List[int]) -> float:
        """计算IoU"""
        x1_min, y1_min, x1_max, y1_max = bbox1
        x2_min, y2_min, x2_max, y2_max = bbox2
        
        # 计算交集
        inter_x_min = max(x1_min, x2_min)
        inter_y_min = max(y1_min, y2_min)
        inter_x_max = min(x1_max, x2_max)
        inter_y_max = min(y1_max, y2_max)
        
        if inter_x_max <= inter_x_min or inter_y_max <= inter_y_min:
            return 0.0
        
        inter_area = (inter_x_max - inter_x_min) * (inter_y_max - inter_y_min)
        
        # 计算并集
        area1 = (x1_max - x1_min) * (y1_max - y1_min)
        area2 = (x2_max - x2_min) * (y2_max - y2_min)
        union_area = area1 + area2 - inter_area
        
        return inter_area / union_area if union_area > 0 else 0.0
    
    def _sort_and_number_regions(self, regions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """排序并编号题目区域"""
        # 按位置排序（从上到下，从左到右）
        sorted_regions = sorted(regions, key=lambda r: (r['bbox'][1], r['bbox'][0]))
        
        # 添加题号
        for i, region in enumerate(sorted_regions):
            region['question_number'] = i + 1
            region['region_id'] = f"region_{i + 1}"
        
        return sorted_regions

class QuestionTypeClassifier:
    """题目类型分类器"""
    
    def __init__(self):
        self.gemini_service = GeminiOCRService()
        
        # 题型识别模式
        self.type_patterns = {
            'choice': [
                r'[A-D]\s*[.、]',
                r'选择题',
                r'单选',
                r'多选',
                r'[ABCD]\s*[）)]'
            ],
            'fill': [
                r'填空题',
                r'_+',
                r'\(\s*\)',
                r'请填入',
                r'空白处'
            ],
            'short_answer': [
                r'简答题',
                r'回答问题',
                r'请说明',
                r'请解释',
                r'请分析'
            ],
            'essay': [
                r'作文',
                r'论述题',
                r'写作',
                r'议论文',
                r'记叙文',
                r'说明文'
            ],
            'calculation': [
                r'计算题',
                r'求解',
                r'计算',
                r'=\s*\?',
                r'解：',
                r'\d+\s*[+\-*/]\s*\d+'
            ]
        }
    
    async def classify_question_type(self, question_text: str, question_image: Optional[np.ndarray] = None) -> Dict[str, Any]:
        """分类题目类型"""
        try:
            # 基于文本模式的分类
            pattern_scores = self._classify_by_patterns(question_text)
            
            # 使用Gemini进行智能分类
            ai_classification = await self._classify_by_ai(question_text)
            
            # 融合分类结果
            final_type, confidence = self._merge_classification_results(pattern_scores, ai_classification)
            
            return {
                'question_type': final_type,
                'confidence': confidence,
                'pattern_scores': pattern_scores,
                'ai_classification': ai_classification,
                'classification_method': 'hybrid'
            }
            
        except Exception as e:
            print(f"题目类型分类错误: {e}")
            return {
                'question_type': 'short_answer',
                'confidence': 0.3,
                'error': str(e)
            }
    
    def _classify_by_patterns(self, text: str) -> Dict[str, float]:
        """基于模式的分类"""
        scores = {}
        
        for question_type, patterns in self.type_patterns.items():
            score = 0
            for pattern in patterns:
                matches = len(re.findall(pattern, text, re.IGNORECASE))
                score += matches * 0.2
            
            scores[question_type] = min(score, 1.0)
        
        return scores
    
    async def _classify_by_ai(self, text: str) -> Dict[str, Any]:
        """基于AI的分类"""
        try:
            prompt = f"""
            请分析以下题目的类型：
            
            题目内容: {text}
            
            可能的题型包括：
            1. choice - 选择题（单选、多选）
            2. fill - 填空题
            3. short_answer - 简答题
            4. essay - 作文/论述题
            5. calculation - 计算题
            
            请返回JSON格式结果：
            {{
                "question_type": "题型代码",
                "confidence": 置信度(0-1),
                "reasoning": "分类理由",
                "alternative_types": ["可能的其他题型"]
            }}
            """
            
            result = await self.gemini_service.process_text_with_prompt(prompt)
            
            if result.get('success'):
                try:
                    return json.loads(result['response'])
                except json.JSONDecodeError:
                    return {'question_type': 'short_answer', 'confidence': 0.5}
            else:
                return {'question_type': 'short_answer', 'confidence': 0.5}
                
        except Exception as e:
            print(f"AI分类错误: {e}")
            return {'question_type': 'short_answer', 'confidence': 0.3}
    
    def _merge_classification_results(self, pattern_scores: Dict[str, float], ai_result: Dict[str, Any]) -> Tuple[str, float]:
        """融合分类结果"""
        ai_type = ai_result.get('question_type', 'short_answer')
        ai_confidence = ai_result.get('confidence', 0.5)
        
        # 获取模式匹配最高分的类型
        pattern_type = max(pattern_scores.items(), key=lambda x: x[1])[0] if pattern_scores else 'short_answer'
        pattern_confidence = max(pattern_scores.values()) if pattern_scores else 0.3
        
        # 如果AI和模式匹配一致，提高置信度
        if ai_type == pattern_type:
            final_type = ai_type
            final_confidence = min((ai_confidence + pattern_confidence) / 2 + 0.2, 1.0)
        else:
            # 选择置信度更高的结果
            if ai_confidence > pattern_confidence:
                final_type = ai_type
                final_confidence = ai_confidence * 0.8
            else:
                final_type = pattern_type
                final_confidence = pattern_confidence * 0.8
        
        return final_type, final_confidence

class AnswerExtractionService:
    """答案提取服务"""
    
    def __init__(self):
        self.gemini_service = GeminiOCRService()
    
    async def extract_student_answer(self, question_image: np.ndarray, question_type: str) -> Dict[str, Any]:
        """提取学生答案"""
        try:
            # OCR识别文本
            ocr_result = await self.gemini_service.process_image(question_image)
            
            if not ocr_result.get('success'):
                return {
                    'success': False,
                    'error': 'OCR识别失败',
                    'raw_text': ''
                }
            
            raw_text = ocr_result.get('response', '')
            
            # 根据题型提取答案
            if question_type == 'choice':
                extracted_answer = self._extract_choice_answer(raw_text)
            elif question_type == 'fill':
                extracted_answer = self._extract_fill_answer(raw_text)
            else:
                extracted_answer = self._extract_text_answer(raw_text)
            
            return {
                'success': True,
                'student_answer': extracted_answer,
                'raw_text': raw_text,
                'extraction_method': f'{question_type}_specific'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'student_answer': '',
                'raw_text': ''
            }
    
    def _extract_choice_answer(self, text: str) -> str:
        """提取选择题答案"""
        # 查找选择的选项
        patterns = [
            r'答案[：:]*\s*([A-D])',
            r'选择[：:]*\s*([A-D])',
            r'([A-D])\s*[√✓]',
            r'[√✓]\s*([A-D])',
            r'\b([A-D])\b'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).upper()
        
        return ''
    
    def _extract_fill_answer(self, text: str) -> str:
        """提取填空题答案"""
        # 移除题目部分，保留答案部分
        # 简单处理：查找填空标记后的内容
        fill_patterns = [
            r'_+\s*([^_\n]+)',
            r'\(\s*([^)]+)\s*\)',
            r'答案[：:]*\s*(.+)',
            r'填入[：:]*\s*(.+)'
        ]
        
        for pattern in fill_patterns:
            match = re.search(pattern, text)
            if match:
                return match.group(1).strip()
        
        # 如果没有找到特定模式，返回清理后的文本
        return text.strip()
    
    def _extract_text_answer(self, text: str) -> str:
        """提取文本答案"""
        # 对于简答题和作文，返回完整文本
        return text.strip()

class EnhancedQuestionSegmentation:
    """增强的题目切分服务"""
    
    def __init__(self):
        self.region_detector = QuestionRegionDetector()
        self.type_classifier = QuestionTypeClassifier()
        self.answer_extractor = AnswerExtractionService()
        self.gemini_service = GeminiOCRService()
    
    async def segment_questions(self, image: np.ndarray, exam_config: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """智能题目切分"""
        try:
            start_time = datetime.now()
            
            # 1. 检测题目区域
            question_regions = await self.region_detector.detect_question_regions(image)
            
            if not question_regions:
                return {
                    'success': False,
                    'error': '未检测到题目区域',
                    'questions': []
                }
            
            # 2. 处理每个题目区域
            questions = []
            for region in question_regions:
                question_result = await self._process_question_region(image, region, exam_config)
                if question_result:
                    questions.append(question_result)
            
            # 3. 生成切分报告
            segmentation_report = self._generate_segmentation_report(questions, start_time)
            
            return {
                'success': True,
                'questions': questions,
                'total_questions': len(questions),
                'segmentation_report': segmentation_report,
                'processing_time': (datetime.now() - start_time).total_seconds()
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'questions': []
            }
    
    async def _process_question_region(self, image: np.ndarray, region: Dict[str, Any], exam_config: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """处理单个题目区域"""
        try:
            # 提取题目图像
            bbox = region['bbox']
            question_image = image[bbox[1]:bbox[3], bbox[0]:bbox[2]]
            
            if question_image.size == 0:
                return None
            
            # OCR识别题目文本
            ocr_result = await self.gemini_service.process_image(question_image)
            if not ocr_result.get('success'):
                return None
            
            question_text = ocr_result.get('response', '')
            
            # 分类题目类型
            type_result = await self.type_classifier.classify_question_type(question_text, question_image)
            question_type = type_result['question_type']
            
            # 提取学生答案
            answer_result = await self.answer_extractor.extract_student_answer(question_image, question_type)
            
            # 获取标准答案（如果有配置）
            standard_answer = self._get_standard_answer(region['question_number'], exam_config)
            
            return {
                'id': region['region_id'],
                'number': region['question_number'],
                'type': question_type,
                'question_text': question_text,
                'student_answer': answer_result.get('student_answer', ''),
                'standard_answer': standard_answer,
                'bbox': bbox,
                'confidence': {
                    'detection': region['confidence'],
                    'classification': type_result['confidence'],
                    'extraction': 0.8 if answer_result.get('success') else 0.3
                },
                'metadata': {
                    'detection_method': region.get('detection_method', 'unknown'),
                    'classification_details': type_result,
                    'extraction_details': answer_result,
                    'image_size': question_image.shape[:2]
                }
            }
            
        except Exception as e:
            print(f"处理题目区域错误: {e}")
            return None
    
    def _get_standard_answer(self, question_number: int, exam_config: Optional[Dict[str, Any]]) -> str:
        """获取标准答案"""
        if not exam_config or 'answer_key' not in exam_config:
            return ''
        
        answer_key = exam_config['answer_key']
        return answer_key.get(str(question_number), answer_key.get(question_number, ''))
    
    def _generate_segmentation_report(self, questions: List[Dict[str, Any]], start_time: datetime) -> Dict[str, Any]:
        """生成切分报告"""
        processing_time = (datetime.now() - start_time).total_seconds()
        
        # 统计题型分布
        type_distribution = {}
        confidence_scores = []
        
        for question in questions:
            q_type = question['type']
            type_distribution[q_type] = type_distribution.get(q_type, 0) + 1
            
            # 计算综合置信度
            conf = question['confidence']
            avg_confidence = (conf['detection'] + conf['classification'] + conf['extraction']) / 3
            confidence_scores.append(avg_confidence)
        
        return {
            'total_questions': len(questions),
            'processing_time_seconds': processing_time,
            'type_distribution': type_distribution,
            'average_confidence': np.mean(confidence_scores) if confidence_scores else 0,
            'confidence_distribution': {
                'high': sum(1 for c in confidence_scores if c > 0.8),
                'medium': sum(1 for c in confidence_scores if 0.5 < c <= 0.8),
                'low': sum(1 for c in confidence_scores if c <= 0.5)
            },
            'quality_metrics': {
                'successful_detections': len(questions),
                'failed_detections': 0,  # 这里需要从调用方传入
                'average_processing_time_per_question': processing_time / len(questions) if questions else 0
            }
        }
    
    async def process_batch(self, images: List[np.ndarray], exam_configs: Optional[List[Dict[str, Any]]] = None) -> List[Dict[str, Any]]:
        """批量处理"""
        if exam_configs is None:
            exam_configs = [None] * len(images)
        
        tasks = [self.segment_questions(img, config) for img, config in zip(images, exam_configs)]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        processed_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                processed_results.append({
                    'success': False,
                    'error': str(result),
                    'image_index': i,
                    'questions': []
                })
            else:
                result['image_index'] = i
                processed_results.append(result)
        
        return processed_results
    
    def visualize_segmentation(self, image: np.ndarray, questions: List[Dict[str, Any]]) -> np.ndarray:
        """可视化切分结果"""
        try:
            # 创建可视化图像
            vis_image = image.copy()
            
            # 为每个题目绘制边界框和标签
            for question in questions:
                bbox = question['bbox']
                x1, y1, x2, y2 = bbox
                
                # 根据题型选择颜色
                type_colors = {
                    'choice': (0, 255, 0),      # 绿色
                    'fill': (255, 0, 0),        # 蓝色
                    'short_answer': (0, 0, 255), # 红色
                    'essay': (255, 0, 255),     # 紫色
                    'calculation': (0, 255, 255) # 青色
                }
                
                color = type_colors.get(question['type'], (128, 128, 128))
                
                # 绘制边界框
                cv2.rectangle(vis_image, (x1, y1), (x2, y2), color, 2)
                
                # 绘制标签
                label = f"Q{question['number']}: {question['type']}"
                cv2.putText(vis_image, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
            
            return vis_image
            
        except Exception as e:
            print(f"可视化错误: {e}")
            return image
    
    async def process_manual_annotations(self, image: np.ndarray, annotations: List[Dict], exam_config: Dict) -> Dict:
        """处理手动标注的题目区域"""
        try:
            print(f"开始处理手动标注，共 {len(annotations)} 个区域")
            
            questions = []
            processing_start = datetime.now()
            
            for annotation in annotations:
                try:
                    # 提取标注信息
                    bbox = annotation.get('bbox', [])
                    question_number = annotation.get('questionNumber', len(questions) + 1)
                    
                    if len(bbox) != 4:
                        print(f"跳过无效的标注区域: {annotation}")
                        continue
                    
                    x1, y1, x2, y2 = map(int, bbox)
                    
                    # 确保坐标在图像范围内
                    h, w = image.shape[:2]
                    x1 = max(0, min(x1, w))
                    y1 = max(0, min(y1, h))
                    x2 = max(0, min(x2, w))
                    y2 = max(0, min(y2, h))
                    
                    # 提取题目区域图像
                    question_image = image[y1:y2, x1:x2]
                    
                    if question_image.size == 0:
                        print(f"题目 {question_number} 区域为空，跳过")
                        continue
                    
                    # OCR识别题目文本
                    question_text = ""
                    try:
                        ocr_result = await self.gemini_service.process_image(question_image)
                        if ocr_result.get('success'):
                            question_text = ocr_result.get('response', '')
                    except Exception as e:
                        print(f"题目 {question_number} OCR识别失败: {str(e)}")
                    
                    # 题目类型分类
                    question_type = "unknown"
                    question_type_display = "手动标注"
                    try:
                        classification_result = await self.type_classifier.classify_question_type(
                            question_text, question_image
                        )
                        question_type = classification_result.get('question_type', 'unknown')
                        question_type_display = classification_result.get('question_type', '手动标注')
                    except Exception as e:
                        print(f"题目 {question_number} 类型分类失败: {str(e)}")
                    
                    # 构建题目信息
                    question_info = {
                        'id': f'manual_q{question_number}',
                        'number': str(question_number),
                        'type': question_type,
                        'type_display': question_type_display,
                        'question_text': question_text or f'手动标注题目 {question_number}',
                        'student_answer': '',
                        'bbox': [x1, y1, x2, y2],
                        'confidence': {
                            'detection': 1.0,  # 手动标注置信度为1
                            'manual': 1.0
                        },
                        'metadata': {
                            'manual_annotation': True,
                            'annotation_id': annotation.get('id', f'manual_{question_number}')
                        },
                        'processing_timestamp': datetime.now().isoformat()
                    }
                    
                    questions.append(question_info)
                    print(f"成功处理手动标注题目 {question_number}")
                    
                except Exception as e:
                    print(f"处理标注 {annotation} 失败: {str(e)}")
                    continue
            
            processing_time = (datetime.now() - processing_start).total_seconds()
            
            # 生成处理报告
            type_distribution = {}
            for question in questions:
                q_type = question.get('type_display', '未知')
                type_distribution[q_type] = type_distribution.get(q_type, 0) + 1
            
            processing_report = {
                'total_questions': len(questions),
                'successful_processing': len(questions),
                'failed_processing': len(annotations) - len(questions),
                'type_distribution': type_distribution,
                'average_confidence': 1.0,  # 手动标注置信度为1
                'processing_time': int(processing_time * 1000),  # 毫秒
                'quality_metrics': {
                    'manual_annotation': True,
                    'annotation_count': len(annotations),
                    'processed_count': len(questions)
                }
            }
            
            print(f"手动标注处理完成，成功处理 {len(questions)} 道题目")
            
            return {
                'success': True,
                'questions': questions,
                'processing_report': processing_report,
                'processing_timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            print(f"手动标注处理失败: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'questions': [],
                'processing_report': {
                    'total_questions': 0,
                    'successful_processing': 0,
                    'failed_processing': len(annotations) if annotations else 0,
                    'processing_time': 0
                }
            }