#!/usr/bin/env python3
"""
增强的学生信息识别服务
集成多种识别方法，提供高精度学生信息提取
"""

import asyncio
import cv2
import numpy as np
import re
import logging
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from pathlib import Path
from PIL import Image
import pytesseract
import base64
import io

from .barcode_service import BarcodeService
from .gemini_ocr_service import GeminiOCRService

logger = logging.getLogger(__name__)

@dataclass
class StudentInfoRegion:
    """学生信息区域"""
    region_type: str  # name, student_id, class, exam_number, barcode
    x: int
    y: int
    width: int
    height: int
    confidence: float
    extracted_text: str = ""
    method: str = ""  # ocr, barcode, pattern_match

@dataclass
class StudentInfo:
    """学生信息"""
    student_id: Optional[str] = None
    name: Optional[str] = None
    class_name: Optional[str] = None
    exam_number: Optional[str] = None
    paper_type: Optional[str] = None
    barcode: Optional[str] = None
    confidence_scores: Dict[str, float] = None
    
    def __post_init__(self):
        if self.confidence_scores is None:
            self.confidence_scores = {}

@dataclass
class StudentInfoExtractionResult:
    """学生信息提取结果"""
    success: bool
    student_info: StudentInfo
    regions: List[StudentInfoRegion]
    processing_time: float
    confidence: float
    issues: List[str] = None
    needs_manual_review: bool = False
    
    def __post_init__(self):
        if self.issues is None:
            self.issues = []

class EnhancedStudentInfoService:
    """增强的学生信息识别服务"""
    
    def __init__(self):
        self.barcode_service = BarcodeService()
        self.ocr_service = GeminiOCRService()
        
        # 学生信息识别的正则表达式模式
        self.patterns = {
            'student_id': [
                r'学号[：:]\s*([A-Z]?\d{8,12})',
                r'学生号[：:]\s*([A-Z]?\d{8,12})',
                r'Student\s*ID[：:]\s*([A-Z]?\d{8,12})',
                r'(\d{8,12})',  # 8-12位数字
            ],
            'name': [
                r'姓名[：:]\s*([^0-9\s]{2,8})',
                r'Name[：:]\s*([A-Za-z\u4e00-\u9fa5\s]{2,20})',
                r'学生[：:]\s*([^0-9\s]{2,8})',
            ],
            'class': [
                r'班级[：:]\s*([^0-9\s]*\d+[^0-9\s]*)',
                r'Class[：:]\s*([A-Za-z0-9\s]+)',
                r'([高中初]\w*[一二三四五六]\w*班)',
                r'(\d{4}[级届]?\w*\d+班)',
            ],
            'exam_number': [
                r'准考证[号]?[：:]\s*(\d{8,15})',
                r'考号[：:]\s*(\d{8,15})',
                r'Exam\s*No[：.]\s*(\d{8,15})',
            ]
        }
        
        # 预定义的常见学生信息区域位置 (相对坐标，基于图像尺寸的比例)
        self.common_regions = {
            'top_left': {'x': 0.05, 'y': 0.05, 'width': 0.4, 'height': 0.15},
            'top_right': {'x': 0.55, 'y': 0.05, 'width': 0.4, 'height': 0.15},
            'top_center': {'x': 0.3, 'y': 0.05, 'width': 0.4, 'height': 0.1},
        }
        
        logger.info("增强学生信息识别服务初始化完成")
    
    async def extract_student_info(
        self, 
        image_path: str,
        regions: Optional[List[Dict[str, Any]]] = None
    ) -> StudentInfoExtractionResult:
        """
        提取学生信息
        
        Args:
            image_path: 图像文件路径
            regions: 指定的识别区域列表 (可选)
            
        Returns:
            学生信息提取结果
        """
        
        start_time = asyncio.get_event_loop().time()
        
        try:
            # 加载图像
            image = cv2.imread(image_path)
            if image is None:
                return StudentInfoExtractionResult(
                    success=False,
                    student_info=StudentInfo(),
                    regions=[],
                    processing_time=0.0,
                    confidence=0.0,
                    issues=["无法加载图像文件"],
                    needs_manual_review=True
                )
            
            # 1. 条形码识别
            barcode_results = []
            if self.barcode_service.enabled:
                barcode_results = self.barcode_service.recognize_barcodes(image_path)
            
            # 2. OCR文字识别
            ocr_result = await self.ocr_service.extract_text(image_path)
            
            # 3. 智能区域定位 (如果没有指定区域)
            if not regions:
                regions = await self._detect_student_info_regions(image, ocr_result)
            
            # 4. 多方法信息提取
            extracted_regions = []
            student_info = StudentInfo()
            
            # 从条形码提取信息
            if barcode_results:
                for barcode in barcode_results:
                    student_info_from_barcode = self._parse_barcode_student_info(barcode)
                    if student_info_from_barcode:
                        # 更新学生信息
                        if student_info_from_barcode.get('student_id'):
                            student_info.student_id = student_info_from_barcode['student_id']
                            student_info.confidence_scores['student_id'] = barcode.get('confidence', 0.95)
                        
                        if student_info_from_barcode.get('exam_number'):
                            student_info.exam_number = student_info_from_barcode['exam_number']
                            student_info.confidence_scores['exam_number'] = barcode.get('confidence', 0.95)
                        
                        # 添加条形码区域
                        bbox = barcode.get('bbox', [0, 0, 100, 50])
                        region = StudentInfoRegion(
                            region_type='barcode',
                            x=bbox[0], y=bbox[1],
                            width=bbox[2] - bbox[0], 
                            height=bbox[3] - bbox[1],
                            confidence=barcode.get('confidence', 0.95),
                            extracted_text=barcode.get('data', ''),
                            method='barcode'
                        )
                        extracted_regions.append(region)
            
            # 从OCR结果提取信息
            if ocr_result and 'text_regions' in ocr_result:
                for region in ocr_result['text_regions']:
                    extracted_info = self._extract_info_from_text_region(region)
                    if extracted_info:
                        # 更新学生信息和置信度
                        for field, value in extracted_info.items():
                            if value and not getattr(student_info, field):
                                setattr(student_info, field, value['text'])
                                student_info.confidence_scores[field] = value['confidence']
                        
                        # 添加OCR区域
                        ocr_region = StudentInfoRegion(
                            region_type=extracted_info.get('type', 'text'),
                            x=region.get('bbox', [0, 0, 100, 50])[0],
                            y=region.get('bbox', [0, 0, 100, 50])[1],
                            width=region.get('bbox', [0, 0, 100, 50])[2] - region.get('bbox', [0, 0, 100, 50])[0],
                            height=region.get('bbox', [0, 0, 100, 50])[3] - region.get('bbox', [0, 0, 100, 50])[1],
                            confidence=region.get('confidence', 0.8),
                            extracted_text=region.get('text', ''),
                            method='ocr'
                        )
                        extracted_regions.append(ocr_region)
            
            # 5. 信息验证和质量检查
            issues = self._validate_student_info(student_info)
            overall_confidence = self._calculate_overall_confidence(student_info)
            needs_review = overall_confidence < 0.7 or len(issues) > 0
            
            processing_time = asyncio.get_event_loop().time() - start_time
            
            result = StudentInfoExtractionResult(
                success=True,
                student_info=student_info,
                regions=extracted_regions,
                processing_time=processing_time,
                confidence=overall_confidence,
                issues=issues,
                needs_manual_review=needs_review
            )
            
            logger.info(f"学生信息提取完成: {image_path}, 置信度: {overall_confidence:.2f}, 耗时: {processing_time:.2f}s")
            return result
            
        except Exception as e:
            processing_time = asyncio.get_event_loop().time() - start_time
            logger.error(f"学生信息提取失败: {image_path}, 错误: {str(e)}")
            
            return StudentInfoExtractionResult(
                success=False,
                student_info=StudentInfo(),
                regions=[],
                processing_time=processing_time,
                confidence=0.0,
                issues=[f"处理异常: {str(e)}"],
                needs_manual_review=True
            )
    
    async def _detect_student_info_regions(
        self, 
        image: np.ndarray, 
        ocr_result: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """智能检测学生信息区域"""
        
        height, width = image.shape[:2]
        detected_regions = []
        
        # 基于OCR结果检测信息密集区域
        if ocr_result and 'text_regions' in ocr_result:
            # 查找包含学生信息关键词的区域
            info_regions = []
            for region in ocr_result['text_regions']:
                text = region.get('text', '').lower()
                if any(keyword in text for keyword in ['姓名', '学号', '班级', '准考证', 'name', 'class', 'student']):
                    info_regions.append(region)
            
            # 如果找到信息区域，扩展为完整的识别区域
            for region in info_regions:
                bbox = region.get('bbox', [0, 0, 100, 50])
                # 扩展区域以包含更多可能的信息
                expanded_region = {
                    'x': max(0, bbox[0] - 50),
                    'y': max(0, bbox[1] - 20),
                    'width': min(width - max(0, bbox[0] - 50), bbox[2] - bbox[0] + 100),
                    'height': min(height - max(0, bbox[1] - 20), bbox[3] - bbox[1] + 40)
                }
                detected_regions.append(expanded_region)
        
        # 如果没有检测到特定区域，使用默认的常见区域
        if not detected_regions:
            for region_name, region_config in self.common_regions.items():
                detected_regions.append({
                    'x': int(region_config['x'] * width),
                    'y': int(region_config['y'] * height),
                    'width': int(region_config['width'] * width),
                    'height': int(region_config['height'] * height)
                })
        
        return detected_regions
    
    def _parse_barcode_student_info(self, barcode: Dict[str, Any]) -> Optional[Dict[str, str]]:
        """解析条形码中的学生信息"""
        
        barcode_data = barcode.get('data', '')
        if not barcode_data:
            return None
        
        student_info = {}
        
        # 尝试不同的条形码格式解析
        
        # 格式1: 学号|准考证号|姓名
        if '|' in barcode_data:
            parts = barcode_data.split('|')
            if len(parts) >= 2:
                student_info['student_id'] = parts[0]
                student_info['exam_number'] = parts[1]
                if len(parts) >= 3:
                    student_info['name'] = parts[2]
        
        # 格式2: 纯数字（可能是学号或准考证号）
        elif barcode_data.isdigit() and len(barcode_data) >= 8:
            if len(barcode_data) <= 12:
                student_info['student_id'] = barcode_data
            else:
                student_info['exam_number'] = barcode_data
        
        # 格式3: JSON格式
        elif barcode_data.startswith('{'):
            try:
                import json
                parsed_data = json.loads(barcode_data)
                if isinstance(parsed_data, dict):
                    for key, value in parsed_data.items():
                        if key.lower() in ['student_id', 'studentid', 'id']:
                            student_info['student_id'] = str(value)
                        elif key.lower() in ['exam_number', 'examno', 'exam_no']:
                            student_info['exam_number'] = str(value)
                        elif key.lower() in ['name', 'student_name']:
                            student_info['name'] = str(value)
            except:
                pass
        
        return student_info if student_info else None
    
    def _extract_info_from_text_region(self, region: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """从文本区域提取学生信息"""
        
        text = region.get('text', '')
        confidence = region.get('confidence', 0.8)
        
        extracted_info = {}
        
        # 使用正则表达式匹配各种信息
        for info_type, patterns in self.patterns.items():
            for pattern in patterns:
                matches = re.findall(pattern, text, re.IGNORECASE)
                if matches:
                    match = matches[0].strip()
                    if match and len(match) >= 2:  # 最小长度检查
                        extracted_info[info_type] = {
                            'text': match,
                            'confidence': confidence * 0.9  # 稍微降低置信度
                        }
                        break
        
        # 特殊处理：尝试识别姓名（中文字符）
        chinese_chars = re.findall(r'[\u4e00-\u9fa5]{2,4}', text)
        if chinese_chars and 'name' not in extracted_info:
            # 选择最可能的姓名（通常是2-4个中文字符）
            potential_names = [name for name in chinese_chars if 2 <= len(name) <= 4]
            if potential_names:
                extracted_info['name'] = {
                    'text': potential_names[0],
                    'confidence': confidence * 0.8
                }
        
        return extracted_info if extracted_info else None
    
    def _validate_student_info(self, student_info: StudentInfo) -> List[str]:
        """验证学生信息的完整性和合理性"""
        
        issues = []
        
        # 检查必填字段
        if not student_info.student_id and not student_info.exam_number:
            issues.append("缺少学号或准考证号")
        
        if not student_info.name:
            issues.append("缺少姓名")
        
        # 格式验证
        if student_info.student_id:
            if not re.match(r'^[A-Z]?\d{6,12}$', student_info.student_id):
                issues.append("学号格式异常")
        
        if student_info.exam_number:
            if not re.match(r'^\d{8,15}$', student_info.exam_number):
                issues.append("准考证号格式异常")
        
        if student_info.name:
            if len(student_info.name) < 2 or len(student_info.name) > 8:
                issues.append("姓名长度异常")
            if re.search(r'[\d\W]', student_info.name):
                issues.append("姓名包含异常字符")
        
        return issues
    
    def _calculate_overall_confidence(self, student_info: StudentInfo) -> float:
        """计算总体置信度"""
        
        if not student_info.confidence_scores:
            return 0.0
        
        # 加权计算置信度
        weights = {
            'student_id': 0.3,
            'name': 0.3,
            'exam_number': 0.2,
            'class': 0.1,
            'barcode': 0.1
        }
        
        weighted_sum = 0.0
        total_weight = 0.0
        
        for field, confidence in student_info.confidence_scores.items():
            if field in weights:
                weighted_sum += confidence * weights[field]
                total_weight += weights[field]
        
        return weighted_sum / total_weight if total_weight > 0 else 0.0
    
    async def batch_extract_student_info(
        self,
        image_paths: List[str],
        max_concurrent: int = 5
    ) -> List[StudentInfoExtractionResult]:
        """批量提取学生信息"""
        
        logger.info(f"开始批量提取学生信息: {len(image_paths)} 个文件")
        
        semaphore = asyncio.Semaphore(max_concurrent)
        
        async def extract_single(image_path):
            async with semaphore:
                return await self.extract_student_info(image_path)
        
        results = await asyncio.gather(
            *[extract_single(path) for path in image_paths],
            return_exceptions=True
        )
        
        # 统计结果
        success_count = len([r for r in results if not isinstance(r, Exception) and r.success])
        logger.info(f"批量提取完成: 成功 {success_count}/{len(image_paths)}")
        
        return [r if not isinstance(r, Exception) else None for r in results]
    
    def create_manual_correction_template(
        self, 
        extraction_result: StudentInfoExtractionResult
    ) -> Dict[str, Any]:
        """创建人工纠正模板"""
        
        return {
            'sheet_id': extraction_result.student_info.student_id or 'unknown',
            'auto_extracted_info': asdict(extraction_result.student_info),
            'detected_regions': [asdict(region) for region in extraction_result.regions],
            'confidence_scores': extraction_result.student_info.confidence_scores,
            'issues': extraction_result.issues,
            'correction_fields': {
                'student_id': {
                    'current_value': extraction_result.student_info.student_id,
                    'confidence': extraction_result.student_info.confidence_scores.get('student_id', 0.0),
                    'needs_correction': extraction_result.student_info.confidence_scores.get('student_id', 0.0) < 0.8
                },
                'name': {
                    'current_value': extraction_result.student_info.name,
                    'confidence': extraction_result.student_info.confidence_scores.get('name', 0.0),
                    'needs_correction': extraction_result.student_info.confidence_scores.get('name', 0.0) < 0.8
                },
                'class': {
                    'current_value': extraction_result.student_info.class_name,
                    'confidence': extraction_result.student_info.confidence_scores.get('class', 0.0),
                    'needs_correction': extraction_result.student_info.confidence_scores.get('class', 0.0) < 0.8
                },
                'exam_number': {
                    'current_value': extraction_result.student_info.exam_number,
                    'confidence': extraction_result.student_info.confidence_scores.get('exam_number', 0.0),
                    'needs_correction': extraction_result.student_info.confidence_scores.get('exam_number', 0.0) < 0.8
                }
            }
        }

# 全局服务实例
enhanced_student_info_service = EnhancedStudentInfoService()