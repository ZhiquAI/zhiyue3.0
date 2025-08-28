from typing import Dict, List, Any, Optional, Tuple
import asyncio
import re
import cv2
import numpy as np
from PIL import Image
import pytesseract
from pyzbar import pyzbar
import base64
import io
from datetime import datetime

from .gemini_ocr_service import GeminiOCRService
from db_connection import get_db
from models.student import Student
from sqlalchemy.orm import Session

class BarcodeDetectionService:
    """条形码检测服务"""
    
    def __init__(self):
        self.supported_formats = [
            pyzbar.ZBarSymbol.CODE128,
            pyzbar.ZBarSymbol.CODE39,
            pyzbar.ZBarSymbol.EAN13,
            pyzbar.ZBarSymbol.EAN8,
            pyzbar.ZBarSymbol.QRCODE
        ]
    
    async def detect(self, image_path: str) -> Dict[str, Any]:
        """检测图像中的条形码"""
        try:
            # 加载图像
            image = cv2.imread(image_path)
            if image is None:
                return {'success': False, 'error': 'Cannot load image'}
            
            # 转换为灰度图
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # 检测条形码
            barcodes = pyzbar.decode(gray)
            
            detected_codes = []
            for barcode in barcodes:
                # 解码条形码数据
                barcode_data = barcode.data.decode('utf-8')
                barcode_type = barcode.type
                
                # 获取边界框
                x, y, w, h = barcode.rect
                
                # 解析学生信息
                student_info = self._parse_barcode_data(barcode_data)
                
                detected_codes.append({
                    'data': barcode_data,
                    'type': barcode_type,
                    'bbox': [x, y, x + w, y + h],
                    'student_info': student_info,
                    'confidence': 0.95  # 条形码检测通常很准确
                })
            
            return {
                'success': True,
                'barcodes': detected_codes,
                'count': len(detected_codes)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'barcodes': [],
                'count': 0
            }
    
    def _parse_barcode_data(self, barcode_data: str) -> Dict[str, Any]:
        """解析条形码数据中的学生信息"""
        student_info = {}
        
        # 常见的学生信息格式模式
        patterns = {
            'student_id': r'(?:ID|学号|编号)[:\s]*([A-Za-z0-9]+)',
            'name': r'(?:姓名|NAME)[:\s]*([\u4e00-\u9fa5A-Za-z\s]+)',
            'class': r'(?:班级|CLASS)[:\s]*([\u4e00-\u9fa5A-Za-z0-9]+)',
            'exam_id': r'(?:考试|EXAM)[:\s]*([A-Za-z0-9]+)'
        }
        
        for key, pattern in patterns.items():
            match = re.search(pattern, barcode_data, re.IGNORECASE)
            if match:
                student_info[key] = match.group(1).strip()
        
        # 如果没有找到结构化信息，尝试简单的分割
        if not student_info and '|' in barcode_data:
            parts = barcode_data.split('|')
            if len(parts) >= 2:
                student_info['student_id'] = parts[0].strip()
                student_info['name'] = parts[1].strip()
                if len(parts) >= 3:
                    student_info['class'] = parts[2].strip()
        
        return student_info

class HandwritingRecognitionService:
    """手写识别服务"""
    
    def __init__(self):
        self.gemini_ocr = GeminiOCRService()
    
    async def recognize_handwritten_info(self, image_path: str) -> Dict[str, Any]:
        """识别手写学生信息"""
        try:
            # 使用Gemini进行手写文本识别
            prompt = """
            请识别图像中的手写学生信息，包括：
            1. 学号/准考证号
            2. 姓名
            3. 班级
            4. 其他相关信息
            
            请以JSON格式返回结果：
            {
                "student_id": "学号",
                "name": "姓名",
                "class": "班级",
                "confidence": 0.0-1.0
            }
            
            如果某些信息无法识别，请设置为null。
            """
            
            result = await self.gemini_ocr.process_image_with_prompt(image_path, prompt)
            
            if result.get('success'):
                # 解析JSON响应
                import json
                try:
                    student_info = json.loads(result['response'])
                    return {
                        'success': True,
                        'student_info': student_info,
                        'confidence': student_info.get('confidence', 0.7)
                    }
                except json.JSONDecodeError:
                    # 如果JSON解析失败，尝试文本解析
                    return self._parse_text_response(result['response'])
            else:
                return {'success': False, 'error': result.get('error', 'Recognition failed')}
                
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _parse_text_response(self, text: str) -> Dict[str, Any]:
        """解析文本响应中的学生信息"""
        student_info = {}
        
        # 使用正则表达式提取信息
        patterns = {
            'student_id': r'(?:学号|准考证号|ID)[:\s]*([A-Za-z0-9]+)',
            'name': r'(?:姓名|NAME)[:\s]*([\u4e00-\u9fa5A-Za-z\s]+)',
            'class': r'(?:班级|CLASS)[:\s]*([\u4e00-\u9fa5A-Za-z0-9]+)'
        }
        
        for key, pattern in patterns.items():
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                student_info[key] = match.group(1).strip()
        
        return {
            'success': True,
            'student_info': student_info,
            'confidence': 0.6  # 文本解析的置信度较低
        }

class StudentInfoValidator:
    """学生信息验证服务"""
    
    def __init__(self, db: Session):
        self.db = db
        self.validation_rules = {
            'student_id': {
                'min_length': 6,
                'max_length': 20,
                'pattern': r'^[A-Za-z0-9]+$'
            },
            'name': {
                'min_length': 2,
                'max_length': 20,
                'pattern': r'^[\u4e00-\u9fa5A-Za-z\s]+$'
            },
            'class': {
                'min_length': 1,
                'max_length': 20,
                'pattern': r'^[\u4e00-\u9fa5A-Za-z0-9]+$'
            }
        }
    
    async def validate(self, student_info: Dict[str, Any]) -> Dict[str, Any]:
        """验证学生信息"""
        validation_results = {}
        
        for field, value in student_info.items():
            if field in self.validation_rules and value:
                validation_results[field] = self._validate_field(field, value)
            else:
                validation_results[field] = {'valid': False, 'reason': 'Missing or invalid field'}
        
        # 数据库交叉验证
        cross_reference = await self._cross_reference_database(student_info)
        
        # 计算总体有效性
        valid_fields = sum(1 for result in validation_results.values() if result.get('valid', False))
        total_fields = len(validation_results)
        overall_validity = valid_fields / total_fields if total_fields > 0 else 0
        
        # 如果数据库中找到匹配，提高置信度
        if cross_reference.get('found'):
            overall_validity = min(1.0, overall_validity + 0.2)
        
        suggestions = self._generate_correction_suggestions(validation_results, cross_reference)
        
        return {
            'is_valid': overall_validity >= 0.8,
            'confidence': overall_validity,
            'validation_details': validation_results,
            'cross_reference': cross_reference,
            'suggestions': suggestions
        }
    
    def _validate_field(self, field: str, value: str) -> Dict[str, Any]:
        """验证单个字段"""
        rules = self.validation_rules.get(field, {})
        
        # 长度检查
        if len(value) < rules.get('min_length', 0):
            return {'valid': False, 'reason': f'Too short (min: {rules["min_length"]})'}
        
        if len(value) > rules.get('max_length', float('inf')):
            return {'valid': False, 'reason': f'Too long (max: {rules["max_length"]})'}
        
        # 格式检查
        pattern = rules.get('pattern')
        if pattern and not re.match(pattern, value):
            return {'valid': False, 'reason': 'Invalid format'}
        
        return {'valid': True, 'reason': 'Valid'}
    
    async def _cross_reference_database(self, student_info: Dict[str, Any]) -> Dict[str, Any]:
        """数据库交叉验证"""
        try:
            student_id = student_info.get('student_id')
            name = student_info.get('name')
            
            if not student_id and not name:
                return {'found': False, 'reason': 'Insufficient information for lookup'}
            
            # 查询数据库
            query = self.db.query(Student)
            
            if student_id:
                student = query.filter(Student.student_id == student_id).first()
                if student:
                    return {
                        'found': True,
                        'matched_student': {
                            'id': student.id,
                            'student_id': student.student_id,
                            'name': student.name,
                            'class': student.class_name
                        },
                        'match_type': 'student_id'
                    }
            
            if name:
                student = query.filter(Student.name == name).first()
                if student:
                    return {
                        'found': True,
                        'matched_student': {
                            'id': student.id,
                            'student_id': student.student_id,
                            'name': student.name,
                            'class': student.class_name
                        },
                        'match_type': 'name'
                    }
            
            return {'found': False, 'reason': 'No matching student found'}
            
        except Exception as e:
            return {'found': False, 'reason': f'Database error: {str(e)}'}
    
    def _generate_correction_suggestions(self, validation_results: Dict, cross_reference: Dict) -> List[str]:
        """生成纠正建议"""
        suggestions = []
        
        for field, result in validation_results.items():
            if not result.get('valid'):
                reason = result.get('reason', '')
                if 'Too short' in reason:
                    suggestions.append(f'{field}: 输入内容过短，请检查是否完整')
                elif 'Too long' in reason:
                    suggestions.append(f'{field}: 输入内容过长，请检查是否有多余字符')
                elif 'Invalid format' in reason:
                    suggestions.append(f'{field}: 格式不正确，请检查字符类型')
        
        if cross_reference.get('found'):
            matched = cross_reference['matched_student']
            suggestions.append(f"数据库中找到匹配学生: {matched['name']} ({matched['student_id']})")
        else:
            suggestions.append('数据库中未找到匹配学生，请确认信息是否正确')
        
        return suggestions

class MultimodalStudentInfoService:
    """多模态学生信息服务"""
    
    def __init__(self):
        self.barcode_detector = BarcodeDetectionService()
        self.ocr_service = GeminiOCRService()
        self.handwriting_recognizer = HandwritingRecognitionService()
        
        # 多模态融合权重
        self.fusion_weights = {
            'barcode': 0.4,
            'ocr': 0.4,
            'handwriting': 0.2
        }
    
    async def extract_student_info(self, image_path: str, db: Session) -> Dict[str, Any]:
        """多模态学生信息提取"""
        try:
            # 并行处理多种识别方式
            tasks = [
                self.barcode_detector.detect(image_path),
                self.ocr_service.extract_student_region(image_path),
                self.handwriting_recognizer.recognize_handwritten_info(image_path)
            ]
            
            barcode_result, ocr_result, handwriting_result = await asyncio.gather(*tasks)
            
            # 信息融合
            fused_info = self._fuse_information(barcode_result, ocr_result, handwriting_result)
            
            # 信息验证
            validator = StudentInfoValidator(db)
            validated_info = await validator.validate(fused_info['student_info'])
            
            return {
                'success': True,
                'student_info': fused_info['student_info'],
                'confidence_scores': fused_info['confidence_scores'],
                'validation_result': validated_info,
                'source_breakdown': {
                    'barcode': barcode_result,
                    'ocr': ocr_result,
                    'handwriting': handwriting_result
                },
                'processing_metadata': {
                    'fusion_method': 'weighted_average',
                    'weights_used': self.fusion_weights,
                    'timestamp': datetime.now().isoformat()
                }
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'student_info': {},
                'confidence_scores': {}
            }
    
    def _fuse_information(self, barcode_result: Dict, ocr_result: Dict, handwriting_result: Dict) -> Dict[str, Any]:
        """融合多模态信息"""
        fused_student_info = {}
        confidence_scores = {
            'barcode': 0.0,
            'ocr': 0.0,
            'handwriting': 0.0,
            'overall': 0.0
        }
        
        # 提取各模态的学生信息
        sources = {
            'barcode': self._extract_from_barcode(barcode_result),
            'ocr': self._extract_from_ocr(ocr_result),
            'handwriting': self._extract_from_handwriting(handwriting_result)
        }
        
        # 对每个字段进行融合
        fields = ['student_id', 'name', 'class']
        
        for field in fields:
            field_values = []
            field_confidences = []
            
            for source_name, source_data in sources.items():
                if source_data['info'].get(field):
                    field_values.append(source_data['info'][field])
                    field_confidences.append(source_data['confidence'] * self.fusion_weights[source_name])
            
            if field_values:
                # 选择置信度最高的值
                best_idx = np.argmax(field_confidences)
                fused_student_info[field] = field_values[best_idx]
        
        # 计算各模态置信度
        for source_name, source_data in sources.items():
            confidence_scores[source_name] = source_data['confidence']
        
        # 计算总体置信度
        overall_confidence = sum(
            confidence_scores[source] * weight 
            for source, weight in self.fusion_weights.items()
        )
        confidence_scores['overall'] = overall_confidence
        
        return {
            'student_info': fused_student_info,
            'confidence_scores': confidence_scores
        }
    
    def _extract_from_barcode(self, barcode_result: Dict) -> Dict[str, Any]:
        """从条形码结果提取信息"""
        if not barcode_result.get('success') or not barcode_result.get('barcodes'):
            return {'info': {}, 'confidence': 0.0}
        
        # 使用第一个检测到的条形码
        barcode = barcode_result['barcodes'][0]
        return {
            'info': barcode.get('student_info', {}),
            'confidence': barcode.get('confidence', 0.0)
        }
    
    def _extract_from_ocr(self, ocr_result: Dict) -> Dict[str, Any]:
        """从OCR结果提取信息"""
        if not ocr_result.get('success'):
            return {'info': {}, 'confidence': 0.0}
        
        student_info = ocr_result.get('student_info', {})
        confidence = ocr_result.get('confidence', 0.0)
        
        return {
            'info': student_info,
            'confidence': confidence
        }
    
    def _extract_from_handwriting(self, handwriting_result: Dict) -> Dict[str, Any]:
        """从手写识别结果提取信息"""
        if not handwriting_result.get('success'):
            return {'info': {}, 'confidence': 0.0}
        
        student_info = handwriting_result.get('student_info', {})
        confidence = handwriting_result.get('confidence', 0.0)
        
        return {
            'info': student_info,
            'confidence': confidence
        }
    
    async def process_batch(self, image_paths: List[str], db: Session) -> List[Dict[str, Any]]:
        """批量处理学生信息识别"""
        tasks = [self.extract_student_info(path, db) for path in image_paths]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
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