"""
OCR识别服务 - 更新为使用Gemini 2.5 Pro
"""

import asyncio
import logging
from typing import Dict, List, Any, Optional
from pathlib import Path
import time

from sqlalchemy.orm import Session
from models.file_storage import FileStorage, PaperDocument, AnswerSheet
from services.gemini_ocr_service import GeminiOCRService
from services.bubble_sheet_service import BubbleSheetService
from services.barcode_service import BarcodeService
from config import settings

logger = logging.getLogger(__name__)

class OCRService:
    """OCR识别服务类 - 基于Gemini 2.5 Pro"""
    
    def __init__(self, db: Session):
        self.db = db
        self.gemini_ocr = GeminiOCRService()
        self.bubble_sheet_service = BubbleSheetService()
        self.barcode_service = BarcodeService()
        
    async def process_paper_document(self, file_record: FileStorage) -> Dict[str, Any]:
        """处理试卷文档OCR - 使用Gemini"""
        start_time = time.time()
        
        try:
            # 获取文件路径
            image_path = Path(settings.STORAGE_BASE_PATH) / file_record.file_path
            
            # 使用Gemini进行试卷识别
            ocr_results = await self.gemini_ocr.process_paper_document(str(image_path))
            ocr_results['processing_time'] = time.time() - start_time
            
            # 创建或更新试卷文档记录
            paper_doc = self.db.query(PaperDocument).filter(
                PaperDocument.file_id == file_record.id
            ).first()
            
            if not paper_doc:
                paper_doc = PaperDocument(
                    exam_id=file_record.exam_id,
                    file_id=file_record.id,
                    paper_type='original'
                )
                self.db.add(paper_doc)
            
            # 更新OCR结果
            paper_doc.ocr_status = 'completed'
            paper_doc.ocr_result = ocr_results
            paper_doc.ocr_confidence = int(ocr_results.get('quality_assessment', {}).get('confidence', 0.8) * 100)
            
            # 解析题目信息
            questions = ocr_results.get('questions', [])
            paper_doc.questions_parsed = questions
            paper_doc.total_questions = len(questions)
            paper_doc.total_points = ocr_results.get('total_points', 0)
            paper_doc.page_count = 1  # 单页处理
            
            # 评估图像质量
            quality_score = ocr_results.get('quality_assessment', {}).get('clarity_score', 8)
            paper_doc.image_quality_score = quality_score * 10  # 转换为100分制
            paper_doc.clarity_score = quality_score * 10
            
            self.db.commit()
            
            # 更新文件处理状态
            file_record.processing_status = 'completed'
            file_record.processing_result = {
                'ocr_confidence': paper_doc.ocr_confidence,
                'questions_count': len(questions),
                'quality_score': quality_score * 10,
                'ocr_engine': 'gemini-2.5-pro'
            }
            self.db.commit()
            
            logger.info(f"Paper OCR completed with Gemini: {file_record.id}")
            return {
                'status': 'success',
                'ocr_result': ocr_results,
                'questions_count': len(questions),
                'quality_score': quality_score * 10,
                'processing_time': ocr_results['processing_time']
            }
            
        except Exception as e:
            logger.error(f"Paper OCR failed: {str(e)}")
            
            # 更新错误状态
            file_record.processing_status = 'failed'
            file_record.error_message = f"Gemini OCR error: {str(e)}"
            self.db.commit()
            
            return {
                'status': 'error',
                'error': str(e),
                'ocr_engine': 'gemini-2.5-pro'
            }
    
    async def process_answer_sheet(self, file_record: FileStorage) -> Dict[str, Any]:
        """处理答题卡OCR - 使用Gemini"""
        start_time = time.time()
        
        try:
            # 获取文件路径
            image_path = Path(settings.STORAGE_BASE_PATH) / file_record.file_path
            
            # 首先尝试条形码识别
            barcode_results = self.barcode_service.recognize_barcodes(str(image_path))
            
            # 使用Gemini进行答题卡识别
            ocr_results = await self.gemini_ocr.process_answer_sheet(str(image_path))
            
            # 如果有条形码识别结果，优先使用条形码信息
            if barcode_results:
                barcode_student_info = self._merge_barcode_info(barcode_results)
                if barcode_student_info:
                    # 用条形码信息覆盖或补充OCR识别的学生信息
                    ocr_student_info = ocr_results.get('student_info', {})
                    merged_info = {**ocr_student_info, **barcode_student_info}
                    ocr_results['student_info'] = merged_info
                    ocr_results['barcode_info'] = {
                        'detected': True,
                        'results': barcode_results,
                        'confidence': 1.0
                    }
                    logger.info(f"Barcode detected and merged: {barcode_student_info}")
            else:
                ocr_results['barcode_info'] = {'detected': False}
            
            # 进行涂卡分析（如果检测到客观题）
            if ocr_results.get('objective_answers'):
                try:
                    bubble_analysis = self.bubble_sheet_service.analyze_bubble_sheet(
                        str(image_path), ocr_results
                    )
                    # 使用涂卡分析增强OCR结果
                    ocr_results = self.bubble_sheet_service.enhance_ocr_with_bubble_analysis(
                        ocr_results, bubble_analysis
                    )
                    
                    # 验证答案一致性
                    validation_result = self.bubble_sheet_service.validate_bubble_answers(
                        ocr_results.get('objective_answers', {}), bubble_analysis
                    )
                    ocr_results['bubble_validation'] = validation_result
                    
                    logger.info(f"涂卡分析完成，质量评分: {bubble_analysis.overall_quality_score}")
                except Exception as e:
                    logger.warning(f"涂卡分析失败，使用基础OCR结果: {str(e)}")
            
            ocr_results['processing_time'] = time.time() - start_time
            
            # 创建或更新答题卡记录
            answer_sheet = self.db.query(AnswerSheet).filter(
                AnswerSheet.file_id == file_record.id
            ).first()
            
            # 提取涂卡分析数据
            bubble_analysis = ocr_results.get('bubble_sheet_analysis', {})
            bubble_quality = ocr_results.get('quality_assessment', {}).get('bubble_quality_score', 0.0)
            recognition_confidence = ocr_results.get('confidence', 0.8)
            
            if not answer_sheet:
                answer_sheet = AnswerSheet(
                    exam_id=file_record.exam_id,
                    file_id=file_record.id
                )
                self.db.add(answer_sheet)
            
            # 更新识别结果
            answer_sheet.recognition_status = 'completed'
            answer_sheet.recognition_result = ocr_results
            answer_sheet.recognition_confidence = int(ocr_results.get('confidence', 0.8) * 100)
            
            # 存储涂卡分析数据
            answer_sheet.bubble_sheet_analysis = bubble_analysis
            answer_sheet.bubble_quality_score = bubble_quality
            
            # 提取学生信息
            student_info = ocr_results.get('student_info', {})
            answer_sheet.student_id = student_info.get('student_id')
            answer_sheet.student_name = student_info.get('name')
            answer_sheet.class_name = student_info.get('class')
            
            # 提取答案
            objective_answers = ocr_results.get('objective_answers', {})
            subjective_answers = ocr_results.get('subjective_answers', {})
            
            # 合并答案
            all_answers = {**objective_answers, **subjective_answers}
            answer_sheet.extracted_answers = all_answers
            
            # 质量检查
            quality_assessment = ocr_results.get('quality_assessment', {})
            quality_issues = quality_assessment.get('issues', [])
            
            # 添加基于置信度的质量检查
            confidence = ocr_results.get('confidence', 0.8)
            if confidence < 0.7:
                quality_issues.append('识别置信度较低')
            
            if not student_info.get('student_id'):
                quality_issues.append('未识别到学号')
            
            if not student_info.get('name'):
                quality_issues.append('未识别到姓名')
            
            answer_sheet.quality_issues = quality_issues
            answer_sheet.needs_manual_review = len(quality_issues) > 0
            
            self.db.commit()
            
            # 更新文件处理状态
            file_record.processing_status = 'completed'
            file_record.processing_result = {
                'student_info': student_info,
                'answers_count': len(all_answers),
                'quality_issues': len(quality_issues),
                'confidence': int(confidence * 100),
                'ocr_engine': 'gemini-2.5-pro'
            }
            self.db.commit()
            
            logger.info(f"Answer sheet OCR completed with Gemini: {file_record.id}")
            return {
                'status': 'success',
                'student_info': student_info,
                'answers': all_answers,
                'quality_issues': quality_issues,
                'confidence': confidence,
                'processing_time': ocr_results['processing_time']
            }
            
        except Exception as e:
            logger.error(f"Answer sheet OCR failed: {str(e)}")
            raise
    
    def _merge_barcode_info(self, barcode_results: List[Dict[str, Any]]) -> Optional[Dict[str, str]]:
        """合并条形码识别结果中的学生信息
        
        Args:
            barcode_results: 条形码识别结果列表
            
        Returns:
            合并后的学生信息字典
        """
        if not barcode_results:
            return None
        
        # 选择置信度最高的条形码结果
        best_result = max(barcode_results, key=lambda x: x.get('confidence', 0))
        student_info = best_result.get('student_info', {})
        
        # 验证必要字段
        if not student_info.get('student_id') and not student_info.get('raw_data'):
            return None
        
        # 标准化字段名
        normalized_info = {}
        
        # 学号字段
        if student_info.get('student_id'):
            normalized_info['student_id'] = student_info['student_id']
        elif student_info.get('raw_data'):
            # 如果只有原始数据，尝试作为学号使用
            normalized_info['student_id'] = student_info['raw_data']
        
        # 姓名字段
        if student_info.get('name'):
            normalized_info['name'] = student_info['name']
        
        # 班级字段
        if student_info.get('class'):
            normalized_info['class'] = student_info['class']
        
        # 准考证号
        if student_info.get('exam_number'):
            normalized_info['exam_number'] = student_info['exam_number']
        
        # 试卷类型
        if student_info.get('paper_type'):
            normalized_info['paper_type'] = student_info['paper_type']
        
        # 添加条形码来源标识
        normalized_info['source'] = 'barcode'
        normalized_info['barcode_type'] = best_result.get('type', 'unknown')
        
        return normalized_info if normalized_info else None
    
    async def batch_process_answer_sheets(self, file_records: List[FileStorage]) -> Dict[str, Any]:
        """批量处理答题卡"""
        try:
            # 准备文件路径列表
            image_paths = []
            file_map = {}
            
            for file_record in file_records:
                image_path = str(Path(settings.STORAGE_BASE_PATH) / file_record.file_path)
                image_paths.append(image_path)
                file_map[image_path] = file_record
            
            # 使用Gemini批量处理
            batch_results = await self.gemini_ocr.batch_process_images(
                image_paths, 
                task_type="answer_sheet"
            )
            
            # 处理结果
            success_count = 0
            failed_count = 0
            results = []
            
            for result in batch_results:
                file_path = result.get('file_path')
                file_record = file_map.get(file_path)
                
                if not file_record:
                    continue
                
                if result.get('status') == 'completed':
                    # 更新数据库记录
                    await self._update_answer_sheet_record(file_record, result)
                    success_count += 1
                else:
                    # 记录错误
                    file_record.processing_status = 'failed'
                    file_record.error_message = result.get('error', 'Unknown error')
                    self.db.commit()
                    failed_count += 1
                
                results.append({
                    'file_id': file_record.id,
                    'filename': file_record.original_filename,
                    'status': result.get('status'),
                    'student_info': result.get('student_info'),
                    'error': result.get('error')
                })
            
            return {
                'total': len(file_records),
                'success_count': success_count,
                'failed_count': failed_count,
                'results': results,
                'ocr_engine': 'gemini-2.5-pro'
            }
            
        except Exception as e:
            logger.error(f"Batch processing failed: {str(e)}")
            raise
    
    async def _update_answer_sheet_record(self, file_record: FileStorage, ocr_result: Dict):
        """更新答题卡记录"""
        # 创建或更新答题卡记录
        answer_sheet = self.db.query(AnswerSheet).filter(
            AnswerSheet.file_id == file_record.id
        ).first()
        
        if not answer_sheet:
            answer_sheet = AnswerSheet(
                exam_id=file_record.exam_id,
                file_id=file_record.id
            )
            self.db.add(answer_sheet)
        
        # 更新字段
        answer_sheet.recognition_status = 'completed'
        answer_sheet.recognition_result = ocr_result
        answer_sheet.recognition_confidence = int(ocr_result.get('confidence', 0.8) * 100)
        
        # 学生信息
        student_info = ocr_result.get('student_info', {})
        answer_sheet.student_id = student_info.get('student_id')
        answer_sheet.student_name = student_info.get('name')
        answer_sheet.class_name = student_info.get('class')
        
        # 答案
        objective_answers = ocr_result.get('objective_answers', {})
        subjective_answers = ocr_result.get('subjective_answers', {})
        all_answers = {**objective_answers, **subjective_answers}
        answer_sheet.extracted_answers = all_answers
        
        # 质量检查
        quality_issues = ocr_result.get('quality_assessment', {}).get('issues', [])
        answer_sheet.quality_issues = quality_issues
        answer_sheet.needs_manual_review = len(quality_issues) > 0
        
        # 更新文件记录
        file_record.processing_status = 'completed'
        file_record.processing_result = {
            'student_info': student_info,
            'answers_count': len(all_answers),
            'quality_issues': len(quality_issues),
            'ocr_engine': 'gemini-2.5-pro'
        }
        
        self.db.commit()
    
    def get_service_status(self) -> Dict[str, Any]:
        """获取OCR服务状态"""
        gemini_status = self.gemini_ocr.get_health_status()
        
        return {
            'service': 'ocr_service',
            'primary_engine': 'gemini-2.5-pro',
            'status': gemini_status['status'],
            'capabilities': gemini_status['capabilities'],
            'features': [
                'multimodal_recognition',
                'handwriting_ocr',
                'structured_extraction',
                'quality_assessment',
                'batch_processing'
            ]
        }