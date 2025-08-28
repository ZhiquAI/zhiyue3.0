#!/usr/bin/env python3
"""
集成的答题卡处理API
提供完整的答题卡处理流程测试接口
"""

import asyncio
import json
import logging
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional

from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from db_connection import get_db
from auth import get_current_user
from models.production_models import User
from services.answer_sheet_processing_pipeline import (
    processing_pipeline,
    AnswerSheetProcessingContext,
    ProcessingStage,
    ProcessingStatus
)
from services.enhanced_student_info_service import enhanced_student_info_service
from services.enhanced_question_segmentation_service import enhanced_question_segmentation_service
from utils.file_security import FileSecurityValidator
from config.settings import settings

router = APIRouter(prefix="/api/integrated-processing", tags=["integrated-processing"])
logger = logging.getLogger(__name__)

security_validator = FileSecurityValidator()

@router.post("/test-complete-workflow")
async def test_complete_workflow(
    exam_id: str = Form(...),
    file: UploadFile = File(...),
    processing_config: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    测试完整的答题卡处理工作流程
    
    这个接口用于测试从上传到最终评分的完整流程
    """
    
    try:
        # 验证文件
        if not file.content_type.startswith(('image/', 'application/pdf')):
            raise HTTPException(status_code=400, detail="只支持图片或PDF文件")
        
        # 解析处理配置
        config = {}
        if processing_config:
            try:
                config = json.loads(processing_config)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="处理配置格式错误")
        
        # 保存上传文件
        sheet_id = str(uuid.uuid4())
        storage_dir = Path(settings.STORAGE_BASE_PATH) / "test_answer_sheets"
        storage_dir.mkdir(parents=True, exist_ok=True)
        
        file_extension = Path(file.filename).suffix.lower()
        safe_filename = f"test_{sheet_id}{file_extension}"
        file_path = storage_dir / safe_filename
        
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        logger.info(f"开始测试完整工作流程: {file.filename} -> {safe_filename}")
        
        # 创建处理上下文
        context = AnswerSheetProcessingContext(
            sheet_id=sheet_id,
            file_path=str(file_path),
            exam_id=exam_id,
            metadata={
                'original_filename': file.filename,
                'file_size': len(content),
                'test_mode': True,
                'user_id': current_user.id,
                'start_time': datetime.now().isoformat()
            }
        )
        
        # 执行完整处理流程
        processing_start_time = datetime.now()
        processed_context = await processing_pipeline.process_answer_sheet(context, config)
        processing_end_time = datetime.now()
        
        # 构建详细的处理结果
        workflow_result = {
            'sheet_id': sheet_id,
            'original_filename': file.filename,
            'processing_summary': {
                'total_processing_time': (processing_end_time - processing_start_time).total_seconds(),
                'final_stage': processed_context.current_stage.value,
                'stages_completed': len(processed_context.processing_results),
                'overall_success': processed_context.current_stage == ProcessingStage.COMPLETED
            },
            'stage_results': [],
            'extracted_data': {},
            'quality_assessment': {
                'needs_manual_review': processed_context.current_stage == ProcessingStage.MANUAL_REVIEW,
                'confidence_scores': {},
                'identified_issues': []
            }
        }
        
        # 分析每个处理阶段的结果
        for result in processed_context.processing_results:
            stage_info = {
                'stage': result.stage.value,
                'status': result.status.value,
                'processing_time': result.processing_time,
                'confidence': result.confidence,
                'data_summary': {},
                'error_message': result.error_message,
                'needs_review': result.needs_review
            }
            
            # 根据不同阶段提取关键数据
            if result.stage == ProcessingStage.STUDENT_INFO_RECOGNITION:
                if 'extracted_info' in result.data:
                    workflow_result['extracted_data']['student_info'] = result.data['extracted_info']
                    workflow_result['quality_assessment']['confidence_scores']['student_info'] = result.confidence
                
                stage_info['data_summary'] = {
                    'barcode_results_count': len(result.data.get('barcode_results', [])),
                    'ocr_regions_count': len(result.data.get('ocr_text_regions', [])),
                    'extracted_fields': list(result.data.get('extracted_info', {}).keys())
                }
            
            elif result.stage == ProcessingStage.QUESTION_SEGMENTATION:
                if 'questions' in result.data:
                    workflow_result['extracted_data']['questions_info'] = {
                        'total_questions': result.data['question_count'],
                        'segmentation_quality': result.data['segmentation_quality'],
                        'question_types': {}
                    }
                    workflow_result['quality_assessment']['confidence_scores']['question_segmentation'] = result.confidence
                
                stage_info['data_summary'] = {
                    'questions_detected': result.data.get('question_count', 0),
                    'segmentation_quality': result.data.get('segmentation_quality', 0.0)
                }
            
            elif result.stage == ProcessingStage.ANSWER_EXTRACTION:
                if 'extracted_answers' in result.data:
                    workflow_result['extracted_data']['answers_info'] = {
                        'total_answers': result.data['total_questions'],
                        'extraction_quality': result.data['extraction_quality']
                    }
                    workflow_result['quality_assessment']['confidence_scores']['answer_extraction'] = result.confidence
                
                stage_info['data_summary'] = {
                    'answers_extracted': result.data.get('total_questions', 0),
                    'extraction_quality': result.data.get('extraction_quality', 0.0)
                }
            
            elif result.stage == ProcessingStage.GRADING:
                if 'grading_results' in result.data:
                    workflow_result['extracted_data']['grading_info'] = {
                        'total_score': result.data['total_score'],
                        'max_total_score': result.data['max_total_score'],
                        'grading_quality': result.data['grading_quality']
                    }
                    workflow_result['quality_assessment']['confidence_scores']['grading'] = result.confidence
                
                stage_info['data_summary'] = {
                    'questions_graded': len(result.data.get('grading_results', [])),
                    'total_score': result.data.get('total_score', 0.0),
                    'grading_quality': result.data.get('grading_quality', 0.0)
                }
            
            elif result.stage == ProcessingStage.QUALITY_CHECK:
                quality_data = result.data
                workflow_result['quality_assessment'].update({
                    'overall_confidence': quality_data.get('overall_confidence', 0.0),
                    'quality_score': quality_data.get('quality_score', 0.0),
                    'identified_issues': quality_data.get('quality_issues', []),
                    'needs_manual_review': quality_data.get('needs_manual_review', False)
                })
                
                stage_info['data_summary'] = {
                    'overall_confidence': quality_data.get('overall_confidence', 0.0),
                    'quality_issues_count': len(quality_data.get('quality_issues', [])),
                    'needs_manual_review': quality_data.get('needs_manual_review', False)
                }
            
            workflow_result['stage_results'].append(stage_info)
        
        # 计算整体评估
        overall_confidence = sum(
            score for score in workflow_result['quality_assessment']['confidence_scores'].values()
        ) / max(len(workflow_result['quality_assessment']['confidence_scores']), 1)
        
        workflow_result['quality_assessment']['overall_confidence'] = overall_confidence
        
        # 生成建议
        suggestions = []
        if overall_confidence < 0.7:
            suggestions.append("整体置信度较低，建议人工检查")
        
        if workflow_result['quality_assessment']['identified_issues']:
            suggestions.append("发现质量问题，建议人工复核")
        
        if processed_context.current_stage != ProcessingStage.COMPLETED:
            suggestions.append("处理未完成，建议检查错误信息")
        
        workflow_result['suggestions'] = suggestions
        
        logger.info(
            f"完整工作流程测试完成: {file.filename}, "
            f"最终阶段: {processed_context.current_stage.value}, "
            f"总体置信度: {overall_confidence:.2f}"
        )
        
        return JSONResponse(
            status_code=200,
            content={
                'success': True,
                'message': '完整工作流程测试完成',
                'data': workflow_result
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"完整工作流程测试失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"处理失败: {str(e)}")

@router.post("/test-student-info-extraction")
async def test_student_info_extraction(
    file: UploadFile = File(...),
    regions: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user)
):
    """测试学生信息识别功能"""
    
    try:
        # 保存临时文件
        temp_dir = Path(settings.STORAGE_BASE_PATH) / "temp"
        temp_dir.mkdir(parents=True, exist_ok=True)
        
        file_id = str(uuid.uuid4())
        file_extension = Path(file.filename).suffix.lower()
        temp_filename = f"temp_{file_id}{file_extension}"
        temp_file_path = temp_dir / temp_filename
        
        with open(temp_file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # 解析指定区域
        specified_regions = None
        if regions:
            try:
                specified_regions = json.loads(regions)
            except json.JSONDecodeError:
                pass
        
        # 执行学生信息提取
        extraction_result = await enhanced_student_info_service.extract_student_info(
            str(temp_file_path), specified_regions
        )
        
        # 构建响应数据
        response_data = {
            'success': extraction_result.success,
            'processing_time': extraction_result.processing_time,
            'confidence': extraction_result.confidence,
            'needs_manual_review': extraction_result.needs_manual_review,
            'extracted_student_info': {
                'student_id': extraction_result.student_info.student_id,
                'name': extraction_result.student_info.name,
                'class_name': extraction_result.student_info.class_name,
                'exam_number': extraction_result.student_info.exam_number,
                'barcode': extraction_result.student_info.barcode,
                'confidence_scores': extraction_result.student_info.confidence_scores
            },
            'detected_regions': [
                {
                    'region_type': region.region_type,
                    'bbox': [region.x, region.y, region.x + region.width, region.y + region.height],
                    'confidence': region.confidence,
                    'extracted_text': region.extracted_text,
                    'method': region.method
                }
                for region in extraction_result.regions
            ],
            'issues': extraction_result.issues,
            'manual_correction_template': enhanced_student_info_service.create_manual_correction_template(extraction_result)
        }
        
        # 清理临时文件
        temp_file_path.unlink(missing_ok=True)
        
        return JSONResponse(
            status_code=200,
            content={
                'success': True,
                'message': '学生信息提取测试完成',
                'data': response_data
            }
        )
        
    except Exception as e:
        logger.error(f"学生信息提取测试失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"测试失败: {str(e)}")

@router.post("/test-question-segmentation")
async def test_question_segmentation(
    file: UploadFile = File(...),
    segmentation_config: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user)
):
    """测试题目切分功能"""
    
    try:
        # 保存临时文件
        temp_dir = Path(settings.STORAGE_BASE_PATH) / "temp"
        temp_dir.mkdir(parents=True, exist_ok=True)
        
        file_id = str(uuid.uuid4())
        file_extension = Path(file.filename).suffix.lower()
        temp_filename = f"temp_{file_id}{file_extension}"
        temp_file_path = temp_dir / temp_filename
        
        with open(temp_file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # 解析分割配置
        config = None
        if segmentation_config:
            try:
                config = json.loads(segmentation_config)
            except json.JSONDecodeError:
                pass
        
        # 执行题目分割
        segmentation_result = await enhanced_question_segmentation_service.segment_questions(
            str(temp_file_path), config
        )
        
        # 构建响应数据
        response_data = {
            'success': segmentation_result.success,
            'total_questions': segmentation_result.total_questions,
            'processing_time': segmentation_result.processing_time,
            'overall_confidence': segmentation_result.overall_confidence,
            'segmentation_method': segmentation_result.segmentation_method,
            'issues': segmentation_result.issues,
            'question_segments': []
        }
        
        for segment in segmentation_result.question_segments:
            segment_data = {
                'question_id': segment.question_id,
                'question_number': segment.question_number,
                'question_type': segment.question_type.value,
                'question_text': segment.question_text,
                'student_answer': segment.student_answer,
                'confidence': segment.confidence,
                'question_region': {
                    'x': segment.question_region.x,
                    'y': segment.question_region.y,
                    'width': segment.question_region.width,
                    'height': segment.question_region.height
                },
                'answer_regions_count': len(segment.answer_regions),
                'answer_regions': [
                    {
                        'x': ar.x,
                        'y': ar.y,
                        'width': ar.width,
                        'height': ar.height,
                        'answer_type': ar.answer_type,
                        'extracted_content': ar.extracted_content,
                        'confidence': ar.confidence
                    }
                    for ar in segment.answer_regions
                ],
                'processing_notes': segment.processing_notes
            }
            response_data['question_segments'].append(segment_data)
        
        # 清理临时文件
        temp_file_path.unlink(missing_ok=True)
        
        return JSONResponse(
            status_code=200,
            content={
                'success': True,
                'message': '题目分割测试完成',
                'data': response_data
            }
        )
        
    except Exception as e:
        logger.error(f"题目分割测试失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"测试失败: {str(e)}")

@router.get("/processing-stages-info")
async def get_processing_stages_info(
    current_user: User = Depends(get_current_user)
):
    """获取处理阶段信息"""
    
    stages_info = {
        'processing_stages': [
            {
                'stage': ProcessingStage.UPLOADED.value,
                'name': '文件上传',
                'description': '答题卡文件已上传到服务器',
                'typical_duration': '1-2秒'
            },
            {
                'stage': ProcessingStage.PREPROCESSING.value,
                'name': '图像预处理',
                'description': '图像质量检查、格式转换、倾斜校正',
                'typical_duration': '5-10秒'
            },
            {
                'stage': ProcessingStage.STUDENT_INFO_RECOGNITION.value,
                'name': '学生信息识别',
                'description': '条形码识别、OCR提取姓名学号等信息',
                'typical_duration': '10-20秒'
            },
            {
                'stage': ProcessingStage.QUESTION_SEGMENTATION.value,
                'name': '题目切分',
                'description': '智能检测题目区域，识别题目类型',
                'typical_duration': '15-30秒'
            },
            {
                'stage': ProcessingStage.ANSWER_EXTRACTION.value,
                'name': '答案提取',
                'description': '从每个题目区域提取学生答案内容',
                'typical_duration': '20-40秒'
            },
            {
                'stage': ProcessingStage.GRADING.value,
                'name': '智能评分',
                'description': '根据题目类型应用相应的评分算法',
                'typical_duration': '30-60秒'
            },
            {
                'stage': ProcessingStage.QUALITY_CHECK.value,
                'name': '质量检查',
                'description': '评估识别和评分质量，标记需要人工复核的项目',
                'typical_duration': '5-10秒'
            },
            {
                'stage': ProcessingStage.COMPLETED.value,
                'name': '处理完成',
                'description': '所有处理阶段完成，结果可用',
                'typical_duration': '即时'
            },
            {
                'stage': ProcessingStage.MANUAL_REVIEW.value,
                'name': '人工复核',
                'description': '需要人工检查和确认的答题卡',
                'typical_duration': '人工操作'
            },
            {
                'stage': ProcessingStage.ERROR.value,
                'name': '处理错误',
                'description': '处理过程中发生错误，需要重新处理',
                'typical_duration': '即时'
            }
        ],
        'typical_total_processing_time': '2-3分钟/张答题卡',
        'factors_affecting_processing_time': [
            '图像质量和分辨率',
            '题目数量和复杂度',
            '手写字迹清晰度',
            '服务器负载情况'
        ]
    }
    
    return JSONResponse(
        status_code=200,
        content={
            'success': True,
            'data': stages_info
        }
    )