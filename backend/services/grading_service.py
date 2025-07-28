"""
核心评分服务 - 生产版本
"""

import asyncio
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session

from models.production_models import Exam, AnswerSheet, GradingTask
from services.ocr_service import OCRService
from services.gemini_service import GeminiService
from services.file_storage_service import FileStorageService
from models.grading_models import GradingResult, GradingStatus

logger = logging.getLogger(__name__)

class GradingService:
    """智能评分服务"""
    
    def __init__(self, db: Session):
        self.db = db
        self.ocr_service = OCRService()
        self.gemini_service = GeminiService()
        self.file_service = FileStorageService(db)
        
    async def process_answer_sheet_batch(self, exam_id: str, file_paths: List[str]) -> Dict[str, Any]:
        """批量处理答题卡"""
        try:
            results = {
                'total': len(file_paths),
                'success': 0,
                'failed': 0,
                'details': []
            }
            
            # 创建处理任务
            tasks = []
            for file_path in file_paths:
                task = await self._create_answer_sheet_record(exam_id, file_path)
                if task:
                    tasks.append(task)
            
            # 并发处理OCR
            ocr_results = await asyncio.gather(
                *[self._process_single_sheet(task) for task in tasks],
                return_exceptions=True
            )
            
            # 统计结果
            for i, result in enumerate(ocr_results):
                if isinstance(result, Exception):
                    results['failed'] += 1
                    results['details'].append({
                        'file': file_paths[i],
                        'status': 'error',
                        'error': str(result)
                    })
                else:
                    results['success'] += 1
                    results['details'].append({
                        'file': file_paths[i],
                        'status': 'success',
                        'sheet_id': result['sheet_id'],
                        'student_info': result.get('student_info')
                    })
            
            logger.info(f"Batch processing completed: {results['success']}/{results['total']} success")
            return results
            
        except Exception as e:
            logger.error(f"Batch processing failed: {str(e)}")
            raise
    
    async def _create_answer_sheet_record(self, exam_id: str, file_path: str) -> Optional[AnswerSheet]:
        """创建答题卡记录"""
        try:
            # 计算文件哈希
            file_hash = self.file_service.calculate_file_hash(file_path)
            
            # 检查重复文件
            existing = self.db.query(AnswerSheet).filter(
                AnswerSheet.exam_id == exam_id,
                AnswerSheet.file_hash == file_hash
            ).first()
            
            if existing:
                logger.warning(f"Duplicate file detected: {file_path}")
                return None
            
            # 创建答题卡记录
            answer_sheet = AnswerSheet(
                exam_id=exam_id,
                original_file_path=file_path,
                file_hash=file_hash,
                ocr_status='pending',
                grading_status='pending'
            )
            
            self.db.add(answer_sheet)
            self.db.commit()
            self.db.refresh(answer_sheet)
            
            return answer_sheet
            
        except Exception as e:
            logger.error(f"Failed to create answer sheet record: {str(e)}")
            self.db.rollback()
            return None
    
    async def _process_single_sheet(self, answer_sheet: AnswerSheet) -> Dict[str, Any]:
        """处理单个答题卡"""
        try:
            # 更新状态为处理中
            answer_sheet.ocr_status = 'processing'
            self.db.commit()
            
            # OCR识别
            ocr_result = await self.ocr_service.process_answer_sheet(
                answer_sheet.original_file_path
            )
            
            # 提取学生信息
            student_info = self._extract_student_info(ocr_result)
            
            # 更新答题卡信息
            answer_sheet.student_id = student_info.get('student_id')
            answer_sheet.student_name = student_info.get('student_name')
            answer_sheet.class_name = student_info.get('class_name')
            answer_sheet.ocr_result = ocr_result
            answer_sheet.ocr_confidence = ocr_result.get('confidence', 0)
            answer_sheet.ocr_status = 'completed'
            
            # 质量检查
            quality_issues = self._check_quality(ocr_result)
            answer_sheet.quality_issues = quality_issues
            answer_sheet.needs_review = len(quality_issues) > 0
            
            self.db.commit()
            
            # 创建评分任务
            await self._create_grading_task(answer_sheet.id)
            
            return {
                'sheet_id': answer_sheet.id,
                'student_info': student_info,
                'quality_issues': quality_issues
            }
            
        except Exception as e:
            answer_sheet.ocr_status = 'error'
            answer_sheet.error_message = str(e)
            self.db.commit()
            raise
    
    async def _create_grading_task(self, answer_sheet_id: str):
        """创建评分任务"""
        task = GradingTask(
            answer_sheet_id=answer_sheet_id,
            task_type='grading',
            priority=5
        )
        self.db.add(task)
        self.db.commit()
        
        # 发送到Celery队列
        from tasks.grading_tasks import grade_answer_sheet
        grade_answer_sheet.delay(answer_sheet_id)
    
    def _extract_student_info(self, ocr_result: Dict) -> Dict[str, str]:
        """从OCR结果提取学生信息"""
        # 实现学生信息提取逻辑
        # 使用正则表达式和模式匹配
        import re
        
        text = ocr_result.get('text', '')
        student_info = {}
        
        # 学号提取
        student_id_patterns = [
            r'学号[：:]\s*(\d+)',
            r'考号[：:]\s*(\d+)',
            r'学生号[：:]\s*(\d+)'
        ]
        
        for pattern in student_id_patterns:
            match = re.search(pattern, text)
            if match:
                student_info['student_id'] = match.group(1)
                break
        
        # 姓名提取
        name_patterns = [
            r'姓名[：:]\s*([^\s\d]{2,4})',
            r'学生[：:]\s*([^\s\d]{2,4})'
        ]
        
        for pattern in name_patterns:
            match = re.search(pattern, text)
            if match:
                student_info['student_name'] = match.group(1)
                break
        
        # 班级提取
        class_patterns = [
            r'班级[：:]\s*([^\s]+)',
            r'年级[：:]\s*([^\s]+)'
        ]
        
        for pattern in class_patterns:
            match = re.search(pattern, text)
            if match:
                student_info['class_name'] = match.group(1)
                break
        
        return student_info
    
    def _check_quality(self, ocr_result: Dict) -> List[str]:
        """质量检查"""
        issues = []
        
        confidence = ocr_result.get('confidence', 0)
        if confidence < 70:
            issues.append('OCR识别置信度较低')
        
        text = ocr_result.get('text', '')
        if len(text) < 50:
            issues.append('识别文本过少')
        
        # 检查是否包含必要信息
        if not any(keyword in text for keyword in ['学号', '姓名', '班级']):
            issues.append('缺少学生基本信息')
        
        return issues
    
    async def grade_single_answer_sheet(self, answer_sheet_id: str) -> Dict[str, Any]:
        """评分单个答题卡"""
        try:
            # 获取答题卡记录
            answer_sheet = self.db.query(AnswerSheet).filter(
                AnswerSheet.id == answer_sheet_id
            ).first()
            
            if not answer_sheet:
                raise ValueError(f"Answer sheet not found: {answer_sheet_id}")
            
            # 获取考试信息
            exam = self.db.query(Exam).filter(
                Exam.id == answer_sheet.exam_id
            ).first()
            
            if not exam:
                raise ValueError(f"Exam not found: {answer_sheet.exam_id}")
            
            # 检查OCR结果是否存在
            if not answer_sheet.ocr_result:
                raise ValueError(f"OCR result not found for answer sheet: {answer_sheet_id}")
            
            # 更新评分状态
            answer_sheet.grading_status = GradingStatus.GRADING.value
            self.db.commit()
            
            # 使用Gemini进行智能评分
            grading_result: GradingResult = await self.gemini_service.grade_answer_sheet(
                ocr_result=answer_sheet.ocr_result,
                exam_config=exam.grading_config or {}
            )
            
            # 计算客观题总分
            objective_total = sum(result.earned_score for result in grading_result.objective_results)
            
            # 计算主观题总分
            subjective_total = sum(result.earned_score for result in grading_result.subjective_results)
            
            # 构建主观题分数字典
            subjective_scores = {
                result.question_number: {
                    'score': result.earned_score,
                    'max_score': result.max_score,
                    'feedback': result.feedback
                }
                for result in grading_result.subjective_results
            }
            
            # 构建质量问题列表
            quality_issues = grading_result.quality_assessment.issues if grading_result.quality_assessment else []
            
            # 更新评分结果
            answer_sheet.objective_score = objective_total
            answer_sheet.subjective_scores = subjective_scores
            answer_sheet.total_score = grading_result.total_score
            answer_sheet.grading_status = GradingStatus.COMPLETED.value
            answer_sheet.quality_issues = quality_issues
            
            # 质量评估
            if grading_result.quality_assessment and grading_result.quality_assessment.needs_human_review:
                answer_sheet.needs_review = True
            
            # 保存详细的评分结果到扩展字段
            answer_sheet.grading_details = {
                'objective_results': [result.__dict__ for result in grading_result.objective_results],
                'subjective_results': [result.__dict__ for result in grading_result.subjective_results],
                'quality_assessment': grading_result.quality_assessment.__dict__ if grading_result.quality_assessment else None,
                'graded_at': grading_result.graded_at.isoformat() if grading_result.graded_at else None,
                'grading_engine': grading_result.grading_engine,
                'grader_version': grading_result.grader_version,
                'processing_time': grading_result.processing_time
            }
            
            self.db.commit()
            
            logger.info(f"Grading completed for answer sheet: {answer_sheet_id}, score: {answer_sheet.total_score}")
            
            return {
                'answer_sheet_id': answer_sheet_id,
                'total_score': answer_sheet.total_score,
                'objective_score': objective_total,
                'subjective_score': subjective_total,
                'subjective_scores': subjective_scores,
                'quality_assessment': grading_result.quality_assessment.__dict__ if grading_result.quality_assessment else None,
                'needs_human_review': grading_result.quality_assessment.needs_human_review if grading_result.quality_assessment else False,
                'status': 'success'
            }
            
        except Exception as e:
            # 更新错误状态
            if 'answer_sheet' in locals():
                answer_sheet.grading_status = GradingStatus.FAILED.value
                answer_sheet.error_message = str(e)
                self.db.commit()
            
            logger.error(f"Grading failed for answer sheet {answer_sheet_id}: {str(e)}")
            raise