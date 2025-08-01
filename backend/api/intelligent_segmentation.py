#!/usr/bin/env python3
"""
智能切题与分类评分API
实现题目智能切分、类型分类和专用评分功能
"""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks, Depends
from fastapi.responses import JSONResponse
from typing import List, Optional, Dict, Any, Union
import asyncio
import json
import cv2
import numpy as np
from PIL import Image
import io
from datetime import datetime
import logging

from services.enhanced_question_segmentation import EnhancedQuestionSegmentation
from services.classified_grading_service import ClassifiedGradingService
from services.question_classifier_service import QuestionType
from services.gemini_service import GeminiService
from database import get_db
from sqlalchemy.orm import Session

router = APIRouter(prefix="/api/intelligent-segmentation", tags=["intelligent_segmentation"])
logger = logging.getLogger(__name__)

# 初始化服务
question_segmentation = EnhancedQuestionSegmentation()
gemini_service = GeminiService()
classified_grading = ClassifiedGradingService(gemini_service)

@router.post("/segment-and-classify")
async def segment_and_classify_questions(
    file: UploadFile = File(...),
    exam_config: str = Form(None),
    segmentation_config: str = Form(None),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """
    智能切题与分类接口
    1. 检测题目区域
    2. 分类题目类型
    3. 提取学生答案
    """
    try:
        # 解析配置
        exam_config_dict = json.loads(exam_config) if exam_config else {}
        segmentation_config_dict = json.loads(segmentation_config) if segmentation_config else {
            'confidence_threshold': 0.7,
            'enable_ai_classification': True,
            'enable_answer_extraction': True,
            'quality_check': True
        }
        
        # 验证文件
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="请上传图像文件")
        
        # 读取图像
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data))
        image_np = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        
        logger.info(f"开始处理图像: {file.filename}, 尺寸: {image_np.shape}")
        
        # 执行智能切题
        segmentation_result = await question_segmentation.segment_questions(
            image_np, exam_config_dict
        )
        
        if not segmentation_result.get('success'):
            raise HTTPException(
                status_code=500, 
                detail=f"切题失败: {segmentation_result.get('error', '未知错误')}"
            )
        
        questions = segmentation_result.get('questions', [])
        
        # 增强分类和答案提取
        enhanced_questions = []
        for question in questions:
            try:
                # 获取题目类型
                question_type_str = question.get('type', 'short_answer')
                question_type = QuestionType(question_type_str)
                
                # 增强题目信息
                enhanced_question = {
                    'id': question.get('id'),
                    'number': question.get('number'),
                    'type': question_type.value,
                    'type_display': question_type.get_display_name(),
                    'question_text': question.get('question_text', ''),
                    'student_answer': question.get('student_answer', ''),
                    'bbox': question.get('bbox', []),
                    'confidence': question.get('confidence', {}),
                    'metadata': question.get('metadata', {}),
                    'processing_timestamp': datetime.now().isoformat()
                }
                
                enhanced_questions.append(enhanced_question)
                
            except Exception as e:
                logger.error(f"处理题目 {question.get('number', 'unknown')} 时出错: {str(e)}")
                # 保留原始题目信息，标记为处理失败
                question['processing_error'] = str(e)
                enhanced_questions.append(question)
        
        # 生成处理报告
        processing_report = {
            'total_questions': len(enhanced_questions),
            'successful_processing': len([q for q in enhanced_questions if 'processing_error' not in q]),
            'failed_processing': len([q for q in enhanced_questions if 'processing_error' in q]),
            'type_distribution': _calculate_type_distribution(enhanced_questions),
            'average_confidence': _calculate_average_confidence(enhanced_questions),
            'processing_time': segmentation_result.get('processing_time', 0),
            'quality_metrics': segmentation_result.get('segmentation_report', {}).get('quality_metrics', {})
        }
        
        return JSONResponse({
            'success': True,
            'message': f'成功处理 {len(enhanced_questions)} 道题目',
            'questions': enhanced_questions,
            'processing_report': processing_report,
            'segmentation_details': segmentation_result.get('segmentation_report', {})
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"智能切题处理失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"处理失败: {str(e)}")

@router.post("/grade-segmented-questions")
async def grade_segmented_questions(
    questions_data: Dict[str, Any],
    grading_config: Optional[Dict[str, Any]] = None
):
    """
    对切分后的题目进行分类评分
    """
    try:
        questions = questions_data.get('questions', [])
        if not questions:
            raise HTTPException(status_code=400, detail="没有题目数据")
        
        # 默认评分配置
        if grading_config is None:
            grading_config = {
                'enable_partial_credit': True,
                'confidence_threshold': 0.6,
                'use_ai_grading': True
            }
        
        # 准备评分数据
        grading_questions = []
        for question in questions:
            grading_question = {
                'question_number': str(question.get('number', '')),
                'question_type': question.get('type', 'short_answer'),
                'question_text': question.get('question_text', ''),
                'student_answer': question.get('student_answer', ''),
                'correct_answer': question.get('standard_answer', ''),
                'total_points': question.get('points', 10.0)
            }
            grading_questions.append(grading_question)
        
        # 执行批量评分
        grading_results = classified_grading.batch_grade_questions(grading_questions)
        
        # 生成评分统计
        grading_statistics = classified_grading.get_grading_statistics(grading_results)
        
        # 整合结果
        final_results = []
        for i, (question, result) in enumerate(zip(questions, grading_results)):
            final_result = {
                'question_info': question,
                'grading_result': {
                    'question_number': result.question_number,
                    'score': result.score,
                    'max_score': result.max_score,
                    'feedback': result.feedback,
                    'is_correct': getattr(result, 'is_correct', None),
                    'rubric_scores': getattr(result, 'rubric_scores', {}),
                    'quality_indicators': getattr(result, 'quality_indicators', {})
                },
                'processing_timestamp': datetime.now().isoformat()
            }
            final_results.append(final_result)
        
        return JSONResponse({
            'success': True,
            'message': f'成功评分 {len(final_results)} 道题目',
            'results': final_results,
            'statistics': grading_statistics,
            'grading_config': grading_config
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"分类评分失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"评分失败: {str(e)}")

@router.post("/segment-manual")
async def segment_manual(
    file: UploadFile = File(...),
    exam_config: str = Form(...),
    manual_annotations: str = Form(...)
):
    """
    使用手动标注进行题目切分
    """
    try:
        # 解析配置和标注
        exam_config_dict = json.loads(exam_config)
        annotations = json.loads(manual_annotations)
        
        # 验证文件
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="请上传图像文件")
        
        # 读取图像
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data))
        image_np = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        
        logger.info(f"开始处理手动标注: {file.filename}, 标注数量: {len(annotations)}")
        
        # 使用手动标注进行处理
        result = await question_segmentation.process_manual_annotations(
            image_np, annotations, exam_config_dict
        )
        
        return JSONResponse({
            'success': True,
            'message': f'成功处理 {len(result.get("questions", []))} 道题目',
            'questions': result.get('questions', []),
            'processing_report': result.get('processing_report', {}),
            'processing_timestamp': datetime.now().isoformat()
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"手动标注处理失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"手动标注处理失败: {str(e)}")

@router.post("/complete-workflow-manual")
async def complete_workflow_manual(
    file: UploadFile = File(...),
    exam_config: str = Form(...),
    grading_config: str = Form(...),
    manual_annotations: str = Form(...)
):
    """
    使用手动标注的完整工作流
    """
    try:
        # 解析配置和标注
        exam_config_dict = json.loads(exam_config)
        grading_config_dict = json.loads(grading_config)
        annotations = json.loads(manual_annotations)
        
        # 验证文件
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="请上传图像文件")
        
        # 读取图像
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data))
        image_np = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        
        logger.info(f"开始手动标注完整工作流: {file.filename}")
        
        # 使用手动标注进行切题
        segmentation_result = await question_segmentation.process_manual_annotations(
            image_np, annotations, exam_config_dict
        )
        
        if not segmentation_result.get('success', True):
            raise HTTPException(
                status_code=500,
                detail=f"手动标注处理失败: {segmentation_result.get('error', '未知错误')}"
            )
        
        # 对切分结果进行评分
        questions = segmentation_result.get('questions', [])
        grading_response = await grade_segmented_questions(
            questions_data={'questions': questions},
            grading_config=grading_config_dict
        )
        
        # 解析评分结果
        grading_data = json.loads(grading_response.body)
        
        return JSONResponse({
            'success': True,
            'message': f'手动标注完整工作流完成，处理 {len(questions)} 道题目',
            'segmentation_results': {
                'success': True,
                'questions': questions,
                'processing_report': segmentation_result.get('processing_report', {})
            },
            'grading_results': grading_data,
            'processing_timestamp': datetime.now().isoformat()
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"手动标注完整工作流失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"手动标注完整工作流失败: {str(e)}")

@router.post("/complete-workflow")
async def complete_intelligent_workflow(
    file: UploadFile = File(...),
    exam_config: str = Form(None),
    answer_key: str = Form(None),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """
    完整的智能切题与评分工作流
    1. 智能切题
    2. 题型分类
    3. 答案提取
    4. 自动评分
    """
    try:
        # 解析配置
        exam_config_dict = json.loads(exam_config) if exam_config else {}
        answer_key_dict = json.loads(answer_key) if answer_key else {}
        
        # 添加答案键到考试配置
        if answer_key_dict:
            exam_config_dict['answer_key'] = answer_key_dict
        
        # 第一步：智能切题
        logger.info("开始智能切题...")
        segmentation_response = await segment_and_classify_questions(
            file=file,
            exam_config=json.dumps(exam_config_dict),
            segmentation_config=None,
            background_tasks=background_tasks
        )
        
        # 解析切题结果
        segmentation_data = json.loads(segmentation_response.body)
        if not segmentation_data.get('success'):
            raise HTTPException(status_code=500, detail="切题失败")
        
        questions = segmentation_data.get('questions', [])
        
        # 第二步：自动评分
        logger.info("开始自动评分...")
        grading_response = await grade_segmented_questions(
            questions_data={'questions': questions},
            grading_config={
                'enable_partial_credit': True,
                'use_ai_grading': True,
                'confidence_threshold': 0.6
            }
        )
        
        # 解析评分结果
        grading_data = json.loads(grading_response.body)
        if not grading_data.get('success'):
            raise HTTPException(status_code=500, detail="评分失败")
        
        # 生成完整报告
        complete_report = {
            'workflow_summary': {
                'total_questions': len(questions),
                'segmentation_success': segmentation_data.get('success', False),
                'grading_success': grading_data.get('success', False),
                'processing_time': {
                    'segmentation': segmentation_data.get('processing_report', {}).get('processing_time', 0),
                    'grading': 0  # 评分时间在统计中
                }
            },
            'segmentation_report': segmentation_data.get('processing_report', {}),
            'grading_statistics': grading_data.get('statistics', {}),
            'quality_assessment': {
                'overall_confidence': segmentation_data.get('processing_report', {}).get('average_confidence', 0),
                'processing_quality': 'high' if segmentation_data.get('processing_report', {}).get('successful_processing', 0) > 0.8 * len(questions) else 'medium'
            }
        }
        
        return JSONResponse({
            'success': True,
            'message': '智能切题与评分工作流完成',
            'segmentation_results': segmentation_data,
            'grading_results': grading_data,
            'complete_report': complete_report,
            'workflow_timestamp': datetime.now().isoformat()
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"完整工作流失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"工作流失败: {str(e)}")

@router.get("/supported-question-types")
async def get_supported_question_types():
    """
    获取支持的题目类型
    """
    try:
        question_types = []
        for qt in QuestionType:
            question_types.append({
                'value': qt.value,
                'display_name': qt.get_display_name(),
                'description': qt.get_description(),
                'grading_strategy': qt.get_grading_strategy()
            })
        
        return JSONResponse({
            'success': True,
            'question_types': question_types,
            'total_types': len(question_types)
        })
        
    except Exception as e:
        logger.error(f"获取题目类型失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取失败: {str(e)}")

@router.get("/health")
async def health_check():
    """
    健康检查
    """
    try:
        # 检查各个服务状态
        services_status = {
            'question_segmentation': 'healthy',
            'classified_grading': 'healthy',
            'gemini_service': 'healthy' if gemini_service else 'unavailable'
        }
        
        return JSONResponse({
            'success': True,
            'status': 'healthy',
            'services': services_status,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"健康检查失败: {str(e)}")
        return JSONResponse({
            'success': False,
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }, status_code=500)

# 辅助函数
def _calculate_type_distribution(questions: List[Dict[str, Any]]) -> Dict[str, int]:
    """
    计算题型分布
    """
    distribution = {}
    for question in questions:
        if 'processing_error' not in question:
            q_type = question.get('type', 'unknown')
            distribution[q_type] = distribution.get(q_type, 0) + 1
    return distribution

def _calculate_average_confidence(questions: List[Dict[str, Any]]) -> float:
    """
    计算平均置信度
    """
    confidences = []
    for question in questions:
        if 'processing_error' not in question:
            confidence = question.get('confidence', {})
            if isinstance(confidence, dict):
                # 计算综合置信度
                conf_values = list(confidence.values())
                if conf_values:
                    avg_conf = sum(conf_values) / len(conf_values)
                    confidences.append(avg_conf)
            elif isinstance(confidence, (int, float)):
                confidences.append(confidence)
    
    return sum(confidences) / len(confidences) if confidences else 0.0