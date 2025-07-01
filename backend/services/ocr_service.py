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
from config import settings

logger = logging.getLogger(__name__)

class OCRService:
    """OCR识别服务类 - 基于Gemini 2.5 Pro"""
    
    def __init__(self, db: Session):
        self.db = db
        self.gemini_ocr = GeminiOCRService()
        
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
            
            # 使用Gemini进行答题卡识别
            ocr_results = await self.gemini_ocr.process_answer_sheet(str(image_path))
            ocr_results['processing_time'] = time.time() - start_time
            
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
            
            # 更新识别结果
            answer_sheet.recognition_status = 'completed'
            answer_sheet.recognition_result = ocr_results
            answer_sheet.recognition_confidence = int(ocr_results.get('confidence', 0.8) * 100)
            
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
            
            # 更新错误状态
            file_record.processing_status = 'failed'
            file_record.error_message = f"Gemini OCR error: {str(e)}"
            self.db.commit()
            
            return {
                'status': 'error',
                'error': str(e),
                'ocr_engine': 'gemini-2.5-pro'
            }
    
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