#!/usr/bin/env python3
"""
答题卡处理管道服务
统一管理答题卡从上传到评分的完整流程
"""

import asyncio
import logging
import json
import uuid
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
from pathlib import Path

from .barcode_service import BarcodeService
from .multimodal_student_info_service import BarcodeDetectionService
from .question_segmentation_service import QuestionSegmentationService
from .gemini_ocr_service import GeminiOCRService
from .classified_grading_service import ClassifiedGradingService

logger = logging.getLogger(__name__)

class ProcessingStage(Enum):
    """处理阶段枚举"""
    UPLOADED = "uploaded"                    # 已上传
    PREPROCESSING = "preprocessing"          # 预处理中
    STUDENT_INFO_RECOGNITION = "student_info_recognition"  # 学生信息识别
    QUESTION_SEGMENTATION = "question_segmentation"        # 题目切分
    ANSWER_EXTRACTION = "answer_extraction"  # 答案提取
    GRADING = "grading"                     # 评分中
    QUALITY_CHECK = "quality_check"         # 质量检查
    MANUAL_REVIEW = "manual_review"         # 人工审核
    COMPLETED = "completed"                 # 处理完成
    ERROR = "error"                         # 处理错误

class ProcessingStatus(Enum):
    """处理状态枚举"""
    PENDING = "pending"         # 等待处理
    PROCESSING = "processing"   # 处理中
    SUCCESS = "success"         # 成功
    FAILED = "failed"          # 失败
    SKIPPED = "skipped"        # 跳过

@dataclass
class ProcessingResult:
    """处理结果"""
    stage: ProcessingStage
    status: ProcessingStatus
    data: Dict[str, Any]
    confidence: float
    processing_time: float
    error_message: Optional[str] = None
    needs_review: bool = False

@dataclass
class AnswerSheetProcessingContext:
    """答题卡处理上下文"""
    sheet_id: str
    file_path: str
    exam_id: str
    student_id: Optional[str] = None
    current_stage: ProcessingStage = ProcessingStage.UPLOADED
    processing_results: List[ProcessingResult] = None
    metadata: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.processing_results is None:
            self.processing_results = []
        if self.metadata is None:
            self.metadata = {}

class AnswerSheetProcessingPipeline:
    """答题卡处理管道"""
    
    def __init__(self):
        self.barcode_service = BarcodeService()
        self.barcode_detection_service = BarcodeDetectionService()
        self.question_segmentation_service = QuestionSegmentationService()
        self.ocr_service = GeminiOCRService()
        self.grading_service = ClassifiedGradingService()
        
        # 处理阶段配置
        self.stage_config = {
            ProcessingStage.PREPROCESSING: {
                'enabled': True,
                'timeout': 30,
                'retry_count': 2
            },
            ProcessingStage.STUDENT_INFO_RECOGNITION: {
                'enabled': True,
                'timeout': 60,
                'retry_count': 2
            },
            ProcessingStage.QUESTION_SEGMENTATION: {
                'enabled': True,
                'timeout': 120,
                'retry_count': 1
            },
            ProcessingStage.ANSWER_EXTRACTION: {
                'enabled': True,
                'timeout': 180,
                'retry_count': 2
            },
            ProcessingStage.GRADING: {
                'enabled': True,
                'timeout': 300,
                'retry_count': 1
            },
            ProcessingStage.QUALITY_CHECK: {
                'enabled': True,
                'timeout': 60,
                'retry_count': 1
            }
        }
        
        logger.info("答题卡处理管道初始化完成")
    
    async def process_answer_sheet(
        self, 
        context: AnswerSheetProcessingContext,
        processing_config: Optional[Dict[str, Any]] = None
    ) -> AnswerSheetProcessingContext:
        """处理单张答题卡的完整流程"""
        
        try:
            logger.info(f"开始处理答题卡: {context.sheet_id}")
            
            # 定义处理流程
            processing_stages = [
                self._stage_preprocessing,
                self._stage_student_info_recognition,
                self._stage_question_segmentation,
                self._stage_answer_extraction,
                self._stage_grading,
                self._stage_quality_check
            ]
            
            # 逐个执行处理阶段
            for stage_func in processing_stages:
                try:
                    stage_start_time = datetime.now()
                    
                    # 执行阶段处理
                    context = await stage_func(context, processing_config or {})
                    
                    stage_duration = (datetime.now() - stage_start_time).total_seconds()
                    
                    # 检查是否需要中断处理
                    last_result = context.processing_results[-1] if context.processing_results else None
                    if last_result and last_result.status == ProcessingStatus.FAILED:
                        if not last_result.needs_review:
                            context.current_stage = ProcessingStage.ERROR
                            break
                        else:
                            context.current_stage = ProcessingStage.MANUAL_REVIEW
                            break
                    
                    logger.info(f"阶段 {context.current_stage.value} 完成，耗时: {stage_duration:.2f}s")
                    
                except Exception as e:
                    logger.error(f"处理阶段 {context.current_stage.value} 失败: {str(e)}")
                    
                    # 记录错误结果
                    error_result = ProcessingResult(
                        stage=context.current_stage,
                        status=ProcessingStatus.FAILED,
                        data={},
                        confidence=0.0,
                        processing_time=0.0,
                        error_message=str(e),
                        needs_review=True
                    )
                    context.processing_results.append(error_result)
                    context.current_stage = ProcessingStage.ERROR
                    break
            
            # 检查是否所有阶段都成功完成
            if context.current_stage not in [ProcessingStage.ERROR, ProcessingStage.MANUAL_REVIEW]:
                context.current_stage = ProcessingStage.COMPLETED
            
            logger.info(f"答题卡处理完成: {context.sheet_id}, 最终状态: {context.current_stage.value}")
            return context
            
        except Exception as e:
            logger.error(f"答题卡处理管道异常: {str(e)}")
            context.current_stage = ProcessingStage.ERROR
            return context
    
    async def _stage_preprocessing(
        self, 
        context: AnswerSheetProcessingContext,
        config: Dict[str, Any]
    ) -> AnswerSheetProcessingContext:
        """图像预处理阶段"""
        
        context.current_stage = ProcessingStage.PREPROCESSING
        stage_start_time = datetime.now()
        
        try:
            # 检查文件是否存在
            file_path = Path(context.file_path)
            if not file_path.exists():
                raise FileNotFoundError(f"答题卡文件不存在: {context.file_path}")
            
            # 基础图像质量检查
            preprocessing_data = {
                'file_size': file_path.stat().st_size,
                'file_format': file_path.suffix.lower(),
                'image_quality_check': 'passed',
                'preprocessing_steps': []
            }
            
            # TODO: 添加实际的图像预处理逻辑
            # - 图像格式转换
            # - 倾斜校正  
            # - 噪声去除
            # - 分辨率检查
            
            processing_time = (datetime.now() - stage_start_time).total_seconds()
            
            result = ProcessingResult(
                stage=ProcessingStage.PREPROCESSING,
                status=ProcessingStatus.SUCCESS,
                data=preprocessing_data,
                confidence=0.95,
                processing_time=processing_time
            )
            
            context.processing_results.append(result)
            logger.info(f"预处理阶段完成: {context.sheet_id}")
            return context
            
        except Exception as e:
            processing_time = (datetime.now() - stage_start_time).total_seconds()
            
            result = ProcessingResult(
                stage=ProcessingStage.PREPROCESSING,
                status=ProcessingStatus.FAILED,
                data={},
                confidence=0.0,
                processing_time=processing_time,
                error_message=str(e)
            )
            
            context.processing_results.append(result)
            raise
    
    async def _stage_student_info_recognition(
        self, 
        context: AnswerSheetProcessingContext,
        config: Dict[str, Any]
    ) -> AnswerSheetProcessingContext:
        """学生信息识别阶段"""
        
        context.current_stage = ProcessingStage.STUDENT_INFO_RECOGNITION
        stage_start_time = datetime.now()
        
        try:
            # 条形码识别
            barcode_results = []
            if self.barcode_service.enabled:
                barcode_results = self.barcode_service.recognize_barcodes(context.file_path)
            
            # 学生信息OCR识别
            ocr_result = await self.ocr_service.extract_text(context.file_path)
            
            # 整合识别结果
            student_info_data = {
                'barcode_results': barcode_results,
                'ocr_text_regions': ocr_result.get('text_regions', []),
                'extracted_info': {},
                'confidence_scores': {}
            }
            
            # 从条形码中提取学生信息
            if barcode_results:
                for barcode in barcode_results:
                    if 'student_info' in barcode:
                        student_info_data['extracted_info'].update(barcode['student_info'])
                        student_info_data['confidence_scores']['barcode'] = barcode.get('confidence', 0.0)
            
            # TODO: 从OCR结果中提取学生信息
            # - 姓名识别
            # - 学号识别  
            # - 班级信息识别
            # - 准考证号识别
            
            processing_time = (datetime.now() - stage_start_time).total_seconds()
            confidence = max(student_info_data['confidence_scores'].values()) if student_info_data['confidence_scores'] else 0.0
            
            result = ProcessingResult(
                stage=ProcessingStage.STUDENT_INFO_RECOGNITION,
                status=ProcessingStatus.SUCCESS if confidence > 0.5 else ProcessingStatus.FAILED,
                data=student_info_data,
                confidence=confidence,
                processing_time=processing_time,
                needs_review=confidence < 0.8
            )
            
            context.processing_results.append(result)
            
            # 更新学生ID（如果识别成功）
            if confidence > 0.5 and 'student_id' in student_info_data['extracted_info']:
                context.student_id = student_info_data['extracted_info']['student_id']
            
            logger.info(f"学生信息识别阶段完成: {context.sheet_id}, 置信度: {confidence:.2f}")
            return context
            
        except Exception as e:
            processing_time = (datetime.now() - stage_start_time).total_seconds()
            
            result = ProcessingResult(
                stage=ProcessingStage.STUDENT_INFO_RECOGNITION,
                status=ProcessingStatus.FAILED,
                data={},
                confidence=0.0,
                processing_time=processing_time,
                error_message=str(e),
                needs_review=True
            )
            
            context.processing_results.append(result)
            raise
    
    async def _stage_question_segmentation(
        self, 
        context: AnswerSheetProcessingContext,
        config: Dict[str, Any]
    ) -> AnswerSheetProcessingContext:
        """题目切分阶段"""
        
        context.current_stage = ProcessingStage.QUESTION_SEGMENTATION
        stage_start_time = datetime.now()
        
        try:
            # 获取OCR结果（如果之前阶段有的话）
            ocr_result = {}
            for result in context.processing_results:
                if result.stage == ProcessingStage.STUDENT_INFO_RECOGNITION:
                    ocr_result = result.data.get('ocr_text_regions', [])
                    break
            
            # 如果没有OCR结果，重新进行OCR
            if not ocr_result:
                ocr_result = await self.ocr_service.extract_text(context.file_path)
            
            # 执行题目切分
            segmentation_result = self.question_segmentation_service.segment_questions(ocr_result)
            
            segmentation_data = {
                'questions': segmentation_result,
                'question_count': len(segmentation_result),
                'segmentation_quality': self._evaluate_segmentation_quality(segmentation_result)
            }
            
            processing_time = (datetime.now() - stage_start_time).total_seconds()
            confidence = segmentation_data['segmentation_quality']
            
            result = ProcessingResult(
                stage=ProcessingStage.QUESTION_SEGMENTATION,
                status=ProcessingStatus.SUCCESS if confidence > 0.6 else ProcessingStatus.FAILED,
                data=segmentation_data,
                confidence=confidence,
                processing_time=processing_time,
                needs_review=confidence < 0.8
            )
            
            context.processing_results.append(result)
            logger.info(f"题目切分阶段完成: {context.sheet_id}, 识别到 {len(segmentation_result)} 道题")
            return context
            
        except Exception as e:
            processing_time = (datetime.now() - stage_start_time).total_seconds()
            
            result = ProcessingResult(
                stage=ProcessingStage.QUESTION_SEGMENTATION,
                status=ProcessingStatus.FAILED,
                data={},
                confidence=0.0,
                processing_time=processing_time,
                error_message=str(e),
                needs_review=True
            )
            
            context.processing_results.append(result)
            raise
    
    async def _stage_answer_extraction(
        self, 
        context: AnswerSheetProcessingContext,
        config: Dict[str, Any]
    ) -> AnswerSheetProcessingContext:
        """答案提取阶段"""
        
        context.current_stage = ProcessingStage.ANSWER_EXTRACTION
        stage_start_time = datetime.now()
        
        try:
            # 获取题目切分结果
            questions = []
            for result in context.processing_results:
                if result.stage == ProcessingStage.QUESTION_SEGMENTATION:
                    questions = result.data.get('questions', [])
                    break
            
            if not questions:
                raise ValueError("没有找到题目切分结果")
            
            # 提取每道题的答案
            extracted_answers = []
            for question in questions:
                # TODO: 实现具体的答案提取逻辑
                answer_data = {
                    'question_id': question.question_number,
                    'question_type': question.question_type.value,
                    'student_answer': question.student_answer,
                    'confidence': question.confidence,
                    'extraction_method': 'ocr'
                }
                extracted_answers.append(answer_data)
            
            answer_extraction_data = {
                'extracted_answers': extracted_answers,
                'total_questions': len(extracted_answers),
                'extraction_quality': self._evaluate_extraction_quality(extracted_answers)
            }
            
            processing_time = (datetime.now() - stage_start_time).total_seconds()
            confidence = answer_extraction_data['extraction_quality']
            
            result = ProcessingResult(
                stage=ProcessingStage.ANSWER_EXTRACTION,
                status=ProcessingStatus.SUCCESS,
                data=answer_extraction_data,
                confidence=confidence,
                processing_time=processing_time,
                needs_review=confidence < 0.7
            )
            
            context.processing_results.append(result)
            logger.info(f"答案提取阶段完成: {context.sheet_id}, 提取 {len(extracted_answers)} 个答案")
            return context
            
        except Exception as e:
            processing_time = (datetime.now() - stage_start_time).total_seconds()
            
            result = ProcessingResult(
                stage=ProcessingStage.ANSWER_EXTRACTION,
                status=ProcessingStatus.FAILED,
                data={},
                confidence=0.0,
                processing_time=processing_time,
                error_message=str(e),
                needs_review=True
            )
            
            context.processing_results.append(result)
            raise
    
    async def _stage_grading(
        self, 
        context: AnswerSheetProcessingContext,
        config: Dict[str, Any]
    ) -> AnswerSheetProcessingContext:
        """智能评分阶段"""
        
        context.current_stage = ProcessingStage.GRADING
        stage_start_time = datetime.now()
        
        try:
            # 获取答案提取结果
            extracted_answers = []
            for result in context.processing_results:
                if result.stage == ProcessingStage.ANSWER_EXTRACTION:
                    extracted_answers = result.data.get('extracted_answers', [])
                    break
            
            if not extracted_answers:
                raise ValueError("没有找到答案提取结果")
            
            # 执行智能评分
            grading_results = []
            total_score = 0.0
            
            for answer in extracted_answers:
                # TODO: 根据题型调用相应的评分服务
                # 这里使用简化的评分逻辑
                graded_result = {
                    'question_id': answer['question_id'],
                    'question_type': answer['question_type'],
                    'student_answer': answer['student_answer'],
                    'score': 0.0,  # TODO: 实际评分
                    'max_score': 5.0,  # TODO: 从题目配置获取
                    'confidence': answer['confidence'],
                    'feedback': '',
                    'grading_method': 'ai_assisted'
                }
                
                grading_results.append(graded_result)
                total_score += graded_result['score']
            
            grading_data = {
                'grading_results': grading_results,
                'total_score': total_score,
                'max_total_score': len(grading_results) * 5.0,  # TODO: 计算实际总分
                'grading_quality': self._evaluate_grading_quality(grading_results)
            }
            
            processing_time = (datetime.now() - stage_start_time).total_seconds()
            confidence = grading_data['grading_quality']
            
            result = ProcessingResult(
                stage=ProcessingStage.GRADING,
                status=ProcessingStatus.SUCCESS,
                data=grading_data,
                confidence=confidence,
                processing_time=processing_time,
                needs_review=confidence < 0.8
            )
            
            context.processing_results.append(result)
            logger.info(f"评分阶段完成: {context.sheet_id}, 总分: {total_score:.1f}")
            return context
            
        except Exception as e:
            processing_time = (datetime.now() - stage_start_time).total_seconds()
            
            result = ProcessingResult(
                stage=ProcessingStage.GRADING,
                status=ProcessingStatus.FAILED,
                data={},
                confidence=0.0,
                processing_time=processing_time,
                error_message=str(e),
                needs_review=True
            )
            
            context.processing_results.append(result)
            raise
    
    async def _stage_quality_check(
        self, 
        context: AnswerSheetProcessingContext,
        config: Dict[str, Any]
    ) -> AnswerSheetProcessingContext:
        """质量检查阶段"""
        
        context.current_stage = ProcessingStage.QUALITY_CHECK
        stage_start_time = datetime.now()
        
        try:
            # 获取评分结果
            grading_results = []
            for result in context.processing_results:
                if result.stage == ProcessingStage.GRADING:
                    grading_results = result.data.get('grading_results', [])
                    break
            
            # 质量检查
            quality_issues = []
            overall_confidence = 0.0
            
            if grading_results:
                confidence_scores = [r['confidence'] for r in grading_results]
                overall_confidence = sum(confidence_scores) / len(confidence_scores)
                
                # 检查低置信度答案
                low_confidence_count = len([c for c in confidence_scores if c < 0.7])
                if low_confidence_count > len(confidence_scores) * 0.3:
                    quality_issues.append(f"过多低置信度答案: {low_confidence_count}/{len(confidence_scores)}")
                
                # 检查异常分数
                scores = [r['score'] for r in grading_results]
                if any(score < 0 for score in scores):
                    quality_issues.append("存在负分")
            
            quality_data = {
                'overall_confidence': overall_confidence,
                'quality_issues': quality_issues,
                'needs_manual_review': len(quality_issues) > 0 or overall_confidence < 0.75,
                'quality_score': max(0.0, 1.0 - len(quality_issues) * 0.2)
            }
            
            processing_time = (datetime.now() - stage_start_time).total_seconds()
            
            result = ProcessingResult(
                stage=ProcessingStage.QUALITY_CHECK,
                status=ProcessingStatus.SUCCESS,
                data=quality_data,
                confidence=quality_data['quality_score'],
                processing_time=processing_time,
                needs_review=quality_data['needs_manual_review']
            )
            
            context.processing_results.append(result)
            logger.info(f"质量检查阶段完成: {context.sheet_id}, 质量分数: {quality_data['quality_score']:.2f}")
            return context
            
        except Exception as e:
            processing_time = (datetime.now() - stage_start_time).total_seconds()
            
            result = ProcessingResult(
                stage=ProcessingStage.QUALITY_CHECK,
                status=ProcessingStatus.FAILED,
                data={},
                confidence=0.0,
                processing_time=processing_time,
                error_message=str(e)
            )
            
            context.processing_results.append(result)
            raise
    
    def _evaluate_segmentation_quality(self, questions: List[Any]) -> float:
        """评估题目切分质量"""
        if not questions:
            return 0.0
        
        confidence_scores = [q.confidence for q in questions if hasattr(q, 'confidence')]
        if not confidence_scores:
            return 0.5  # 默认置信度
        
        return sum(confidence_scores) / len(confidence_scores)
    
    def _evaluate_extraction_quality(self, answers: List[Dict[str, Any]]) -> float:
        """评估答案提取质量"""
        if not answers:
            return 0.0
        
        confidence_scores = [a.get('confidence', 0.5) for a in answers]
        return sum(confidence_scores) / len(confidence_scores)
    
    def _evaluate_grading_quality(self, grading_results: List[Dict[str, Any]]) -> float:
        """评估评分质量"""
        if not grading_results:
            return 0.0
        
        confidence_scores = [r.get('confidence', 0.5) for r in grading_results]
        return sum(confidence_scores) / len(confidence_scores)
    
    async def get_processing_status(self, sheet_id: str) -> Dict[str, Any]:
        """获取处理状态"""
        # TODO: 从数据库或缓存中获取处理状态
        return {
            'sheet_id': sheet_id,
            'current_stage': ProcessingStage.UPLOADED.value,
            'progress': 0.0,
            'estimated_completion': None
        }
    
    async def batch_process_answer_sheets(
        self,
        contexts: List[AnswerSheetProcessingContext],
        processing_config: Optional[Dict[str, Any]] = None,
        max_concurrent: int = 5
    ) -> List[AnswerSheetProcessingContext]:
        """批量处理答题卡"""
        
        logger.info(f"开始批量处理 {len(contexts)} 张答题卡")
        
        # 使用信号量控制并发数
        semaphore = asyncio.Semaphore(max_concurrent)
        
        async def process_single(ctx):
            async with semaphore:
                return await self.process_answer_sheet(ctx, processing_config)
        
        # 并发处理
        results = await asyncio.gather(
            *[process_single(ctx) for ctx in contexts],
            return_exceptions=True
        )
        
        # 统计结果
        success_count = 0
        error_count = 0
        
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"答题卡 {contexts[i].sheet_id} 处理异常: {str(result)}")
                error_count += 1
            elif result.current_stage == ProcessingStage.COMPLETED:
                success_count += 1
            else:
                error_count += 1
        
        logger.info(f"批量处理完成: 成功 {success_count}/{len(contexts)}, 失败 {error_count}")
        
        return [r if not isinstance(r, Exception) else contexts[i] for i, r in enumerate(results)]

# 全局处理管道实例
processing_pipeline = AnswerSheetProcessingPipeline()