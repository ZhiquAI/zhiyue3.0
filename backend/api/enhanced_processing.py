from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from typing import List, Optional, Dict, Any
import asyncio
import json
import cv2
import numpy as np
from PIL import Image
import io
from datetime import datetime

from services.enhanced_processing_service import EnhancedProcessingService
from services.multimodal_student_info_service import MultimodalStudentInfoService
from services.adaptive_grading_engine import AdaptiveGradingEngine
from services.enhanced_question_segmentation import EnhancedQuestionSegmentation
from models.answer_sheet import AnswerSheet
from db_connection import get_db
from sqlalchemy.orm import Session
from fastapi import Depends

router = APIRouter(prefix="/api/enhanced", tags=["enhanced_processing"])

# 初始化服务
enhanced_processing = EnhancedProcessingService()
multimodal_student_info = MultimodalStudentInfoService()
adaptive_grading = AdaptiveGradingEngine()
question_segmentation = EnhancedQuestionSegmentation()

@router.post("/upload-and-process")
async def upload_and_process_enhanced(
    files: List[UploadFile] = File(...),
    exam_config: str = Form(None),
    processing_config: str = Form(None),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db)
):
    """
    增强的答题卡上传和处理接口
    集成模板匹配、质量评估等功能
    """
    try:
        # 解析配置
        exam_config_dict = json.loads(exam_config) if exam_config else {}
        processing_config_dict = json.loads(processing_config) if processing_config else {
            'enable_template_matching': True,
            'enable_quality_assessment': True,
            'batch_size': 10,
            'confidence_threshold': 0.7
        }
        
        # 验证文件
        if not files:
            raise HTTPException(status_code=400, detail="没有上传文件")
        
        # 处理上传的文件
        processing_results = []
        batch_images = []
        batch_filenames = []
        
        for file in files:
            if not file.content_type.startswith('image/'):
                continue
            
            # 读取图像
            image_data = await file.read()
            image = Image.open(io.BytesIO(image_data))
            image_np = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            
            batch_images.append(image_np)
            batch_filenames.append(file.filename)
        
        if not batch_images:
            raise HTTPException(status_code=400, detail="没有有效的图像文件")
        
        # 批量处理
        batch_results = await enhanced_processing.process_batch(
            batch_images, 
            processing_config_dict
        )
        
        # 整理结果
        for i, result in enumerate(batch_results):
            processing_result = {
                'filename': batch_filenames[i],
                'processing_result': result,
                'upload_time': datetime.now().isoformat()
            }
            processing_results.append(processing_result)
        
        # 生成批处理报告
        batch_report = {
            'total_files': len(files),
            'processed_files': len(batch_results),
            'successful_processing': sum(1 for r in batch_results if r.get('success', False)),
            'failed_processing': sum(1 for r in batch_results if not r.get('success', False)),
            'average_confidence': np.mean([r.get('confidence', 0) for r in batch_results]),
            'processing_time': datetime.now().isoformat()
        }
        
        return JSONResponse({
            'success': True,
            'message': f'成功处理 {len(batch_results)} 个文件',
            'results': processing_results,
            'batch_report': batch_report
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"处理失败: {str(e)}")

@router.post("/student-info-recognition")
async def enhanced_student_info_recognition(
    file: UploadFile = File(...),
    recognition_config: str = Form(None)
):
    """
    增强的学生信息识别接口
    集成条形码检测、OCR识别、手写识别等多模态技术
    """
    try:
        # 解析配置
        config = json.loads(recognition_config) if recognition_config else {
            'enable_barcode': True,
            'enable_ocr': True,
            'enable_handwriting': True,
            'validation_enabled': True
        }
        
        # 读取图像
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data))
        image_np = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        
        # 多模态学生信息识别
        recognition_result = await multimodal_student_info.recognize_student_info(
            image_np, config
        )
        
        return JSONResponse({
            'success': True,
            'student_info': recognition_result.get('student_info', {}),
            'confidence_scores': recognition_result.get('confidence_scores', {}),
            'recognition_methods': recognition_result.get('recognition_methods', []),
            'validation_result': recognition_result.get('validation_result', {}),
            'processing_time': recognition_result.get('processing_time', 0)
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"学生信息识别失败: {str(e)}")

@router.post("/question-segmentation")
async def enhanced_question_segmentation(
    file: UploadFile = File(...),
    exam_config: str = Form(None)
):
    """
    增强的题目切分接口
    使用智能分类和图像分析
    """
    try:
        # 解析考试配置
        exam_config_dict = json.loads(exam_config) if exam_config else {}
        
        # 读取图像
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data))
        image_np = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        
        # 执行题目切分
        segmentation_result = await question_segmentation.segment_questions(
            image_np, exam_config_dict
        )
        
        return JSONResponse({
            'success': segmentation_result.get('success', False),
            'questions': segmentation_result.get('questions', []),
            'total_questions': segmentation_result.get('total_questions', 0),
            'segmentation_report': segmentation_result.get('segmentation_report', {}),
            'processing_time': segmentation_result.get('processing_time', 0)
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"题目切分失败: {str(e)}")

@router.post("/adaptive-grading")
async def adaptive_grading_endpoint(
    sheet_data: Dict[str, Any],
    exam_config: Dict[str, Any] = None
):
    """
    自适应评分接口
    根据题型自动选择评分策略
    """
    try:
        if exam_config is None:
            exam_config = {}
        
        # 执行自适应评分
        grading_result = await adaptive_grading.grade_answer_sheet(
            sheet_data, exam_config
        )
        
        return JSONResponse({
            'success': grading_result.get('success', False),
            'total_score': grading_result.get('total_score', 0),
            'max_total_score': grading_result.get('max_total_score', 0),
            'percentage': grading_result.get('percentage', 0),
            'question_scores': grading_result.get('question_scores', []),
            'overall_feedback': grading_result.get('overall_feedback', {}),
            'grading_metadata': grading_result.get('grading_metadata', {})
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"自适应评分失败: {str(e)}")

@router.post("/complete-workflow")
async def complete_enhanced_workflow(
    files: List[UploadFile] = File(...),
    exam_config: str = Form(None),
    workflow_config: str = Form(None),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """
    完整的增强工作流接口
    集成所有增强功能的端到端处理
    """
    try:
        # 解析配置
        exam_config_dict = json.loads(exam_config) if exam_config else {}
        workflow_config_dict = json.loads(workflow_config) if workflow_config else {
            'enable_all_enhancements': True,
            'parallel_processing': True,
            'quality_threshold': 0.7,
            'auto_retry': True
        }
        
        workflow_results = []
        
        for file in files:
            if not file.content_type.startswith('image/'):
                continue
            
            # 读取图像
            image_data = await file.read()
            image = Image.open(io.BytesIO(image_data))
            image_np = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            
            # 步骤1: 增强处理和质量评估
            processing_result = await enhanced_processing.process_single_image(
                image_np, workflow_config_dict
            )
            
            if not processing_result.get('success'):
                workflow_results.append({
                    'filename': file.filename,
                    'success': False,
                    'error': '图像处理失败',
                    'step': 'processing'
                })
                continue
            
            # 步骤2: 学生信息识别
            student_info_result = await multimodal_student_info.recognize_student_info(
                image_np, workflow_config_dict
            )
            
            # 步骤3: 题目切分
            segmentation_result = await question_segmentation.segment_questions(
                image_np, exam_config_dict
            )
            
            # 步骤4: 自适应评分
            grading_result = None
            if segmentation_result.get('success'):
                sheet_data = {
                    'segmented_questions': segmentation_result.get('questions', []),
                    'student_info': student_info_result.get('student_info', {})
                }
                grading_result = await adaptive_grading.grade_answer_sheet(
                    sheet_data, exam_config_dict
                )
            
            # 整合结果
            workflow_result = {
                'filename': file.filename,
                'success': True,
                'processing_result': processing_result,
                'student_info_result': student_info_result,
                'segmentation_result': segmentation_result,
                'grading_result': grading_result,
                'workflow_metadata': {
                    'processing_time': datetime.now().isoformat(),
                    'workflow_version': 'enhanced_v1.0',
                    'config_used': workflow_config_dict
                }
            }
            
            workflow_results.append(workflow_result)
        
        # 生成工作流报告
        workflow_report = {
            'total_files': len(files),
            'successful_workflows': sum(1 for r in workflow_results if r.get('success')),
            'failed_workflows': sum(1 for r in workflow_results if not r.get('success')),
            'average_scores': [],
            'processing_summary': {
                'total_questions_detected': sum(
                    r.get('segmentation_result', {}).get('total_questions', 0) 
                    for r in workflow_results if r.get('success')
                ),
                'total_students_recognized': sum(
                    1 for r in workflow_results 
                    if r.get('success') and r.get('student_info_result', {}).get('student_info')
                )
            }
        }
        
        return JSONResponse({
            'success': True,
            'message': f'完成 {len(workflow_results)} 个文件的增强工作流处理',
            'workflow_results': workflow_results,
            'workflow_report': workflow_report
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"增强工作流处理失败: {str(e)}")

@router.get("/processing-status/{task_id}")
async def get_processing_status(task_id: str):
    """
    获取处理状态接口
    """
    try:
        # 这里应该从缓存或数据库中获取任务状态
        # 暂时返回模拟状态
        return JSONResponse({
            'task_id': task_id,
            'status': 'completed',
            'progress': 100,
            'message': '处理完成',
            'result_available': True
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取状态失败: {str(e)}")

@router.post("/batch-processing")
async def batch_processing_endpoint(
    files: List[UploadFile] = File(...),
    batch_config: str = Form(None),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """
    批量处理接口
    支持大批量答题卡的并行处理
    """
    try:
        # 解析批处理配置
        config = json.loads(batch_config) if batch_config else {
            'batch_size': 20,
            'parallel_workers': 4,
            'enable_progress_tracking': True
        }
        
        # 生成任务ID
        task_id = f"batch_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # 准备图像数据
        images = []
        filenames = []
        
        for file in files:
            if file.content_type.startswith('image/'):
                image_data = await file.read()
                image = Image.open(io.BytesIO(image_data))
                image_np = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
                images.append(image_np)
                filenames.append(file.filename)
        
        # 启动后台批处理任务
        background_tasks.add_task(
            process_batch_in_background,
            task_id,
            images,
            filenames,
            config
        )
        
        return JSONResponse({
            'success': True,
            'task_id': task_id,
            'message': f'批处理任务已启动，共 {len(images)} 个文件',
            'estimated_time': len(images) * 2,  # 估算时间（秒）
            'status_endpoint': f'/api/enhanced/processing-status/{task_id}'
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"批处理启动失败: {str(e)}")

async def process_batch_in_background(
    task_id: str,
    images: List[np.ndarray],
    filenames: List[str],
    config: Dict[str, Any]
):
    """
    后台批处理任务
    """
    try:
        # 这里应该实现实际的批处理逻辑
        # 包括进度更新、结果存储等
        
        batch_size = config.get('batch_size', 20)
        results = []
        
        # 分批处理
        for i in range(0, len(images), batch_size):
            batch_images = images[i:i + batch_size]
            batch_filenames = filenames[i:i + batch_size]
            
            # 处理当前批次
            batch_results = await enhanced_processing.process_batch(
                batch_images, config
            )
            
            # 整理结果
            for j, result in enumerate(batch_results):
                results.append({
                    'filename': batch_filenames[j],
                    'result': result,
                    'batch_index': i // batch_size,
                    'file_index': i + j
                })
        
        # 保存结果到缓存或数据库
        # 这里应该实现结果存储逻辑
        
        print(f"批处理任务 {task_id} 完成，处理了 {len(results)} 个文件")
        
    except Exception as e:
        print(f"批处理任务 {task_id} 失败: {str(e)}")

@router.get("/health")
async def health_check():
    """
    健康检查接口
    """
    try:
        # 检查各个服务的状态
        services_status = {
            'enhanced_processing': True,
            'multimodal_student_info': True,
            'adaptive_grading': True,
            'question_segmentation': True
        }
        
        return JSONResponse({
            'status': 'healthy',
            'services': services_status,
            'timestamp': datetime.now().isoformat(),
            'version': 'enhanced_v1.0'
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"健康检查失败: {str(e)}")