"""条形码识别服务
用于识别答题卡上的条形码，提取学生信息
"""

import logging
import json
from typing import Dict, List, Any, Optional, Tuple
from pathlib import Path
import cv2
import numpy as np
from PIL import Image
import base64
import io
from sqlalchemy.orm import Session

try:
    from pyzbar import pyzbar
    from pyzbar.pyzbar import ZBarSymbol
except ImportError:
    pyzbar = None
    ZBarSymbol = None

logger = logging.getLogger(__name__)

class BarcodeService:
    """条形码识别服务类"""
    
    def __init__(self):
        if pyzbar is None:
            logger.warning("pyzbar not installed. Barcode recognition will be disabled.")
            self.enabled = False
        else:
            self.enabled = True
            logger.info("Barcode service initialized successfully")
    
    def recognize_barcodes(self, image_path: str) -> List[Dict[str, Any]]:
        """识别图像中的所有条形码
        
        Args:
            image_path: 图像文件路径
            
        Returns:
            条形码识别结果列表
        """
        if not self.enabled:
            logger.warning("Barcode recognition is disabled (pyzbar not available)")
            return []
        
        try:
            # 读取图像
            image = cv2.imread(image_path)
            if image is None:
                raise ValueError(f"Cannot read image: {image_path}")
            
            # 转换为灰度图
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # 图像预处理以提高识别率
            enhanced_image = self._enhance_for_barcode(gray)
            
            # 识别条形码
            barcodes = pyzbar.decode(enhanced_image)
            
            results = []
            for barcode in barcodes:
                # 解码条形码数据
                barcode_data = barcode.data.decode('utf-8')
                barcode_type = barcode.type
                
                # 获取条形码位置
                rect = barcode.rect
                polygon = barcode.polygon
                
                # 解析学生信息
                student_info = self._parse_student_info(barcode_data)
                
                result = {
                    'data': barcode_data,
                    'type': barcode_type,
                    'rect': {
                        'x': rect.left,
                        'y': rect.top,
                        'width': rect.width,
                        'height': rect.height
                    },
                    'polygon': [(point.x, point.y) for point in polygon],
                    'student_info': student_info,
                    'confidence': 1.0  # 条形码识别通常是确定性的
                }
                
                results.append(result)
                logger.info(f"Barcode detected: {barcode_type} - {barcode_data}")
            
            return results
            
        except Exception as e:
            logger.error(f"Barcode recognition failed: {str(e)}")
            return []
    
    def _enhance_for_barcode(self, gray_image: np.ndarray) -> np.ndarray:
        """增强图像以提高条形码识别率"""
        # 高斯模糊去噪
        blurred = cv2.GaussianBlur(gray_image, (3, 3), 0)
        
        # 自适应阈值处理
        thresh = cv2.adaptiveThreshold(
            blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
        )
        
        # 形态学操作
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        processed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
        
        return processed
    
    def _parse_student_info(self, barcode_data: str) -> Dict[str, str]:
        """解析条形码中的学生信息
        
        支持多种编码格式：
        1. JSON格式: {"student_id":"123","name":"张三","class":"高三1班"}
        2. 分隔符格式: 123|张三|高三1班|A卷
        3. 固定长度格式: 学号8位+姓名编码4位+班级编码2位
        """
        try:
            # 尝试JSON格式
            if barcode_data.startswith('{') and barcode_data.endswith('}'):
                return json.loads(barcode_data)
            
            # 尝试分隔符格式
            if '|' in barcode_data:
                parts = barcode_data.split('|')
                info = {}
                if len(parts) >= 1:
                    info['student_id'] = parts[0].strip()
                if len(parts) >= 2:
                    info['name'] = parts[1].strip()
                if len(parts) >= 3:
                    info['class'] = parts[2].strip()
                if len(parts) >= 4:
                    info['exam_number'] = parts[3].strip()
                if len(parts) >= 5:
                    info['paper_type'] = parts[4].strip()
                return info
            
            # 尝试固定长度格式（需要根据实际编码规则调整）
            if len(barcode_data) >= 8:
                return {
                    'student_id': barcode_data[:8],
                    'encoded_info': barcode_data[8:] if len(barcode_data) > 8 else ''
                }
            
            # 默认作为学号处理
            return {'student_id': barcode_data}
            
        except Exception as e:
            logger.warning(f"Failed to parse barcode data: {barcode_data}, error: {str(e)}")
            return {'raw_data': barcode_data}
    
    def generate_barcode_data(self, student_info: Dict[str, str], format_type: str = 'json') -> str:
        """生成条形码数据
        
        Args:
            student_info: 学生信息字典
            format_type: 编码格式 ('json', 'pipe', 'fixed')
            
        Returns:
            编码后的条形码数据
        """
        if format_type == 'json':
            return json.dumps(student_info, ensure_ascii=False, separators=(',', ':'))
        
        elif format_type == 'pipe':
            parts = [
                student_info.get('student_id', ''),
                student_info.get('name', ''),
                student_info.get('class', ''),
                student_info.get('exam_number', ''),
                student_info.get('paper_type', '')
            ]
            return '|'.join(parts)
        
        elif format_type == 'fixed':
            # 固定长度格式（需要根据实际需求调整）
            student_id = student_info.get('student_id', '').ljust(8, '0')
            # 这里可以添加更复杂的编码逻辑
            return student_id
        
        else:
            raise ValueError(f"Unsupported format type: {format_type}")
    
    def validate_barcode_region(self, image_path: str, region: Dict[str, int]) -> bool:
        """验证指定区域是否包含有效条形码
        
        Args:
            image_path: 图像路径
            region: 区域坐标 {'x': int, 'y': int, 'width': int, 'height': int}
            
        Returns:
            是否包含有效条形码
        """
        if not self.enabled:
            return False
        
        try:
            # 读取图像
            image = cv2.imread(image_path)
            if image is None:
                return False
            
            # 裁剪指定区域
            x, y, w, h = region['x'], region['y'], region['width'], region['height']
            roi = image[y:y+h, x:x+w]
            
            # 转换为灰度图
            gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
            
            # 增强处理
            enhanced = self._enhance_for_barcode(gray)
            
            # 尝试识别条形码
            barcodes = pyzbar.decode(enhanced)
            
            return len(barcodes) > 0
            
        except Exception as e:
            logger.error(f"Barcode validation failed: {str(e)}")
            return False
    
    def get_supported_formats(self) -> List[str]:
        """获取支持的条形码格式"""
        if not self.enabled:
            return []
        
        return [
            'CODE128',
            'CODE39',
            'EAN13',
            'EAN8',
            'UPCA',
            'UPCE',
            'QRCODE',
            'DATAMATRIX',
            'PDF417'
        ]
    
    def create_barcode_template(self, template_type: str = 'standard') -> Dict[str, Any]:
        """创建条形码模板配置
        
        Args:
            template_type: 模板类型
            
        Returns:
            模板配置
        """
        templates = {
            'standard': {
                'name': '标准答题卡条形码',
                'barcode_type': 'CODE128',
                'position': {
                    'x': 70,  # 百分比
                    'y': 5,
                    'width': 25,
                    'height': 8
                },
                'data_format': 'pipe',
                'fields': ['student_id', 'name', 'class', 'exam_number'],
                'validation_rules': {
                    'student_id': {'required': True, 'pattern': r'^\d{8,12}$'},
                    'name': {'required': True, 'max_length': 10},
                    'class': {'required': False, 'max_length': 20}
                }
            },
            'qr_code': {
                'name': 'QR码答题卡',
                'barcode_type': 'QRCODE',
                'position': {
                    'x': 75,
                    'y': 5,
                    'width': 20,
                    'height': 20
                },
                'data_format': 'json',
                'fields': ['student_id', 'name', 'class', 'exam_number', 'paper_type'],
                'validation_rules': {
                    'student_id': {'required': True, 'pattern': r'^\d{8,12}$'},
                    'name': {'required': True, 'max_length': 10}
                }
            }
        }
        
        return templates.get(template_type, templates['standard'])
    
    def match_student_from_database(self, barcode_data: str, exam_id: str, db: Session) -> Optional[Dict[str, Any]]:
        """从数据库中匹配学生信息
        
        Args:
            barcode_data: 条形码数据
            exam_id: 考试ID
            db: 数据库会话
            
        Returns:
            匹配的学生信息，如果未找到返回None
        """
        try:
            # 导入Student模型（避免循环导入）
            try:
                from models.production_models import Student
            except ImportError:
                from models.production_models import Student
            
            # 解析条形码数据
            parsed_info = self._parse_student_info(barcode_data)
            
            if 'student_id' not in parsed_info:
                logger.warning(f"条形码数据中未找到学号: {barcode_data}")
                return None
            
            student_id = parsed_info['student_id']
            
            # 从数据库查找学生
            student = db.query(Student).filter(
                Student.exam_id == exam_id,
                Student.student_id == student_id,
                Student.is_active == True
            ).first()
            
            if not student:
                logger.info(f"未找到匹配的学生信息: exam_id={exam_id}, student_id={student_id}")
                return None
            
            # 返回匹配结果
            return {
                'matched': True,
                'student': {
                    'id': student.id,
                    'student_id': student.student_id,
                    'name': student.name,
                    'class_name': student.class_name,
                    'grade': student.grade,
                    'school': student.school
                },
                'parsed_data': parsed_info,
                'confidence': 1.0  # 数据库匹配的置信度为100%
            }
            
        except Exception as e:
            logger.error(f"学生信息匹配失败: {str(e)}")
            return None
    
    def batch_generate_barcodes(self, students_data: List[Dict[str, str]], format_type: str = 'pipe') -> List[Dict[str, str]]:
        """批量生成条形码数据
        
        Args:
            students_data: 学生信息列表
            format_type: 编码格式
            
        Returns:
            包含条形码数据的学生信息列表
        """
        results = []
        
        for student_info in students_data:
            try:
                barcode_data = self.generate_barcode_data(student_info, format_type)
                result = student_info.copy()
                result['barcode_data'] = barcode_data
                results.append(result)
            except Exception as e:
                logger.error(f"生成条形码失败: {student_info}, error: {str(e)}")
                result = student_info.copy()
                result['barcode_data'] = None
                result['error'] = str(e)
                results.append(result)
        
        return results
    
    def validate_student_barcode(self, student_info: Dict[str, str], barcode_data: str) -> Dict[str, Any]:
        """验证学生信息与条形码数据是否匹配
        
        Args:
            student_info: 学生信息
            barcode_data: 条形码数据
            
        Returns:
            验证结果
        """
        try:
            parsed_info = self._parse_student_info(barcode_data)
            
            # 检查关键字段是否匹配
            matches = {
                'student_id': student_info.get('student_id') == parsed_info.get('student_id'),
                'name': student_info.get('name') == parsed_info.get('name'),
                'class': student_info.get('class_name') == parsed_info.get('class')
            }
            
            # 计算匹配度
            match_count = sum(matches.values())
            total_fields = len(matches)
            match_rate = match_count / total_fields if total_fields > 0 else 0
            
            return {
                'valid': match_rate >= 0.8,  # 80%以上匹配认为有效
                'match_rate': match_rate,
                'matches': matches,
                'parsed_data': parsed_info,
                'student_data': student_info
            }
            
        except Exception as e:
            logger.error(f"条形码验证失败: {str(e)}")
            return {
                'valid': False,
                'error': str(e),
                'parsed_data': None,
                'student_data': student_info
            }