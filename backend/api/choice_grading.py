from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from sqlalchemy.orm import Session
from typing import Dict, List, Any, Optional
import json
import logging
import asyncio
import uuid
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor

from database import get_db
from middleware.permissions import require_teacher_or_admin, require_any_authenticated
from services.choice_question_grading_service import ChoiceQuestionGradingService
from services.ocr_service import OCRService
from services.bubble_sheet_service import BubbleSheetService
from models.production_models import AnswerSheet
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/choice-grading", tags=["选择题评分"])



class ChoiceGradingRequest(BaseModel):
    """选择题评分请求"""
    student_answers: Dict[str, str]  # {"1": "A", "2": "B", ...}
    reference_answers: Dict[str, str]  # {"1": "A", "2": "C", ...}
    score_config: Optional[Dict[str, float]] = None  # {"1": 5.0, "2": 5.0, ...}
    enable_bubble_analysis: bool = False

class BatchGradingRequest(BaseModel):
    """批量评分请求"""
    exam_id: str
    reference_answers: Dict[str, str]
    score_config: Optional[Dict[str, float]] = None
    enable_bubble_analysis: bool = True

@router.post("/grade")
async def grade_choice_questions(
    request: ChoiceGradingRequest,
    current_user: dict = Depends(require_teacher_or_admin),
    db: Session = Depends(get_db)
):
    """快速评分选择题"""
    try:
        grading_service = ChoiceQuestionGradingService()
        
        # 执行评分
        result = grading_service.grade_choice_questions(
            student_answers=request.student_answers,
            reference_answers=request.reference_answers,
            score_config=request.score_config
        )
        
        # 导出报告
        report = grading_service.export_grading_report(result)
        
        return {
            "success": True,
            "message": "选择题评分完成",
            "data": report
        }
        
    except Exception as e:
        logger.error(f"选择题评分失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"评分失败: {str(e)}")





@router.post("/grade-with-ocr")
async def grade_with_ocr(
    file: UploadFile = File(...),
    reference_answers: str = None,
    score_config: str = None,
    enable_bubble_analysis: bool = True,
    current_user: dict = Depends(require_teacher_or_admin),
    db: Session = Depends(get_db)
):
    """基于OCR识别结果评分选择题"""
    try:
        if not reference_answers:
            raise HTTPException(status_code=400, detail="缺少参考答案")
        
        # 解析参数
        ref_answers = json.loads(reference_answers)
        score_cfg = json.loads(score_config) if score_config else None
        
        # 保存上传文件
        import tempfile
        import os
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_file_path = tmp_file.name
        
        try:
            # OCR识别
            ocr_service = OCRService()
            ocr_result = await ocr_service.process_image(tmp_file_path)
            
            # 提取选择题答案
            student_answers = ocr_result.get('objective_answers', {})
            
            # 涂卡分析（如果启用）
            bubble_analysis = None
            if enable_bubble_analysis:
                bubble_service = BubbleSheetService()
                bubble_result = bubble_service.analyze_bubble_sheet(tmp_file_path, ocr_result)
                bubble_analysis = {
                    'total_bubbles_detected': bubble_result.total_bubbles_detected,
                    'filled_bubbles': bubble_result.filled_bubbles,
                    'unclear_bubbles': bubble_result.unclear_bubbles,
                    'quality_issues': bubble_result.quality_issues,
                    'overall_quality_score': bubble_result.overall_quality_score,
                    'detection_results': [
                        {
                            'question_number': d.question_number,
                            'option': d.option,
                            'is_filled': d.is_filled,
                            'confidence': d.confidence,
                            'quality_issues': d.quality_issues
                        }
                        for d in bubble_result.detection_results
                    ]
                }
            
            # 执行评分
            grading_service = ChoiceQuestionGradingService()
            result = grading_service.grade_choice_questions(
                student_answers=student_answers,
                reference_answers=ref_answers,
                bubble_analysis=bubble_analysis,
                score_config=score_cfg
            )
            
            # 导出报告
            report = grading_service.export_grading_report(result)
            
            return {
                "success": True,
                "message": "OCR识别和选择题评分完成",
                "data": {
                    "ocr_result": {
                        "student_answers": student_answers,
                        "confidence": ocr_result.get('confidence', 0.8)
                    },
                    "bubble_analysis": bubble_analysis,
                    "grading_result": report
                }
            }
            
        finally:
            # 清理临时文件
            if os.path.exists(tmp_file_path):
                os.unlink(tmp_file_path)
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="参数格式错误")
    except Exception as e:
        logger.error(f"OCR评分失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"评分失败: {str(e)}")

@router.post("/batch-grade")
async def batch_grade_exam(
    request: BatchGradingRequest,
    current_user: dict = Depends(require_teacher_or_admin),
    db: Session = Depends(get_db)
):
    """批量评分考试中的所有答题卡"""
    try:
        # 查询考试的所有答题卡
        answer_sheets = db.query(AnswerSheet).filter(
            AnswerSheet.exam_id == request.exam_id
        ).all()
        
        if not answer_sheets:
            raise HTTPException(status_code=404, detail="未找到答题卡")
        
        grading_service = ChoiceQuestionGradingService()
        ocr_service = OCRService()
        bubble_service = BubbleSheetService() if request.enable_bubble_analysis else None
        
        batch_results = []
        
        for sheet in answer_sheets:
            try:
                # 获取OCR结果
                if sheet.recognition_result:
                    ocr_result = sheet.recognition_result
                    student_answers = ocr_result.get('objective_answers', {})
                else:
                    # 如果没有OCR结果，跳过
                    logger.warning(f"答题卡 {sheet.id} 没有OCR结果，跳过评分")
                    continue
                
                # 涂卡分析
                bubble_analysis = None
                if request.enable_bubble_analysis and sheet.bubble_sheet_analysis:
                    bubble_analysis = sheet.bubble_sheet_analysis
                
                # 执行评分
                result = grading_service.grade_choice_questions(
                    student_answers=student_answers,
                    reference_answers=request.reference_answers,
                    bubble_analysis=bubble_analysis,
                    score_config=request.score_config
                )
                
                # 更新数据库
                choice_scores = {
                    score.question_number: {
                        'score': score.score,
                        'max_score': score.max_score,
                        'is_correct': score.is_correct,
                        'confidence': score.confidence
                    }
                    for score in result.question_scores
                }
                
                # 更新答题卡记录
                if sheet.scores:
                    sheet.scores.update({'choice_questions': choice_scores})
                else:
                    sheet.scores = {'choice_questions': choice_scores}
                
                sheet.total_score = result.total_score
                sheet.grading_status = 'completed'
                
                batch_results.append({
                    'sheet_id': sheet.id,
                    'student_id': sheet.student_id,
                    'student_name': sheet.student_name,
                    'total_score': result.total_score,
                    'max_total_score': result.max_total_score,
                    'accuracy_rate': result.accuracy_rate,
                    'correct_count': result.correct_count,
                    'total_questions': result.total_questions
                })
                
            except Exception as e:
                logger.error(f"评分答题卡 {sheet.id} 失败: {str(e)}")
                batch_results.append({
                    'sheet_id': sheet.id,
                    'student_id': sheet.student_id,
                    'error': str(e)
                })
        
        # 提交数据库更改
        db.commit()
        
        # 统计结果
        successful_count = len([r for r in batch_results if 'error' not in r])
        failed_count = len([r for r in batch_results if 'error' in r])
        
        return {
            "success": True,
            "message": f"批量评分完成，成功{successful_count}份，失败{failed_count}份",
            "data": {
                "total_processed": len(batch_results),
                "successful_count": successful_count,
                "failed_count": failed_count,
                "results": batch_results
            }
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"批量评分失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"批量评分失败: {str(e)}")

@router.get("/reference-template")
async def get_reference_template(
    current_user: dict = Depends(require_any_authenticated)
):
    """获取参考答案模板"""
    return {
            "success": True,
            "data": {
                "template": {
                    "reference_answers": {
                        "1": "A",
                        "2": "B", 
                        "3": "C",
                        "4": "D",
                        "5": "A",
                        "6": "B",
                        "7": "C",
                        "8": "D",
                        "9": "A",
                        "10": "B",
                        "11": "C",
                        "12": "D"
                    },
                    "score_config": {
                        "1": 5.0,
                        "2": 5.0,
                        "3": 5.0,
                        "4": 5.0,
                        "5": 5.0,
                        "6": 5.0,
                        "7": 5.0,
                        "8": 5.0,
                        "9": 5.0,
                        "10": 5.0,
                        "11": 5.0,
                        "12": 5.0
                    }
                },
                "description": "12道选择题，每题5分，总分60分"
            }
        }