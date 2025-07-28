from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer
from pydantic import BaseModel, Field, validator
from typing import List, Dict, Any, Optional
import asyncio
import logging
from datetime import datetime

from services.classified_grading_service import ClassifiedGradingService
from services.question_segmentation_service import QuestionSegmentationService
from services.question_classifier_service import QuestionClassifierService
from models.production_models import User
from auth import get_current_user
from database import get_db
from sqlalchemy.orm import Session

# 创建路由器
router = APIRouter(prefix="/api/grading/classified", tags=["分类评分"])
security = HTTPBearer()
logger = logging.getLogger(__name__)

# 初始化服务
classified_grading_service = ClassifiedGradingService()
question_segmentation_service = QuestionSegmentationService()
question_classifier_service = QuestionClassifierService()

# ==================== 请求/响应模型 ====================

class QuestionGradingRequest(BaseModel):
    """单个题目评分请求"""
    question_type: str = Field(..., description="题目类型")
    question_text: str = Field(..., description="题目内容")
    student_answer: Optional[str] = Field(None, description="学生答案")
    correct_answer: Optional[str] = Field(None, description="正确答案")
    total_points: float = Field(..., gt=0, description="总分")
    config: Dict[str, Any] = Field(default_factory=dict, description="评分配置")

class BatchGradingRequest(BaseModel):
    """批量评分请求"""
    questions: List[QuestionGradingRequest] = Field(..., description="题目列表")
    config: Dict[str, Any] = Field(default_factory=dict, description="评分配置")

class AIAnalysisRequest(BaseModel):
    """AI分析请求"""
    question: Dict[str, Any] = Field(..., description="题目信息")
    grading_result: Dict[str, Any] = Field(..., description="评分结果")

class QualityAssessmentRequest(BaseModel):
    """质量评估请求"""
    questions: List[Dict[str, Any]] = Field(..., description="题目列表")
    grading_results: List[Dict[str, Any]] = Field(..., description="评分结果列表")

class ScoreAdjustmentRequest(BaseModel):
    """分数调整请求"""
    question_id: str = Field(..., description="题目ID")
    new_score: float = Field(..., ge=0, description="新分数")
    reason: str = Field(..., min_length=1, description="调整原因")

class GradingConfigRequest(BaseModel):
    """评分配置请求"""
    exam_type: str = Field("default", description="考试类型")
    mode: str = Field("standard", description="评分模式")
    partial_credit: bool = Field(True, description="是否启用部分分数")
    ai_assisted: bool = Field(True, description="是否启用AI辅助")
    keyword_weight: float = Field(0.3, ge=0, le=1, description="关键词权重")
    structure_weight: float = Field(0.2, ge=0, le=1, description="结构权重")
    quality_weight: float = Field(0.2, ge=0, le=1, description="质量权重")
    ai_weight: float = Field(0.3, ge=0, le=1, description="AI权重")

class QuestionSegmentationRequest(BaseModel):
    """题目分割请求"""
    ocr_result: Dict[str, Any] = Field(..., description="OCR结果")
    exam_config: Dict[str, Any] = Field(default_factory=dict, description="考试配置")

class QuestionClassificationRequest(BaseModel):
    """题目分类请求"""
    question_text: str = Field(..., description="题目文本")
    context: Dict[str, Any] = Field(default_factory=dict, description="上下文信息")

class BatchClassificationRequest(BaseModel):
    """批量分类请求"""
    questions: List[str] = Field(..., description="题目文本列表")

class StandardResponse(BaseModel):
    """标准响应"""
    success: bool = Field(True, description="是否成功")
    message: str = Field("", description="响应消息")
    data: Optional[Dict[str, Any]] = Field(None, description="响应数据")
    timestamp: datetime = Field(default_factory=datetime.now, description="时间戳")

# ==================== 分类评分路由 ====================

@router.post("/grade-question", response_model=StandardResponse)
async def grade_single_question(
    request: QuestionGradingRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """评分单个题目"""
    try:
        logger.info(f"用户 {current_user.id} 开始评分单个题目，类型: {request.question_type}")
        
        # 执行评分
        result = await classified_grading_service.grade_single_question(
            question_type=request.question_type,
            question_text=request.question_text,
            student_answer=request.student_answer,
            correct_answer=request.correct_answer,
            total_points=request.total_points,
            config=request.config
        )
        
        logger.info(f"题目评分完成，得分: {result.score}/{result.max_score}")
        
        return StandardResponse(
            success=True,
            message="题目评分完成",
            data=result.to_dict()
        )
        
    except Exception as e:
        logger.error(f"题目评分失败: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"题目评分失败: {str(e)}"
        )

@router.post("/batch-grade", response_model=StandardResponse)
async def batch_grade_questions(
    request: BatchGradingRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """批量评分题目"""
    try:
        questions = [q.dict() for q in request.questions]
        logger.info(f"用户 {current_user.id} 开始批量评分 {len(questions)} 道题目")
        
        # 执行批量评分
        results = await classified_grading_service.batch_grade_questions(
            questions=questions,
            config=request.config
        )
        
        # 统计结果
        total_score = sum(r.score for r in results)
        total_max_score = sum(r.max_score for r in results)
        
        logger.info(f"批量评分完成，总分: {total_score}/{total_max_score}")
        
        return StandardResponse(
            success=True,
            message="批量评分完成",
            data={
                'results': [r.to_dict() for r in results],
                'summary': {
                    'total_questions': len(results),
                    'total_score': total_score,
                    'total_max_score': total_max_score,
                    'average_percentage': (total_score / total_max_score * 100) if total_max_score > 0 else 0
                }
            }
        )
        
    except Exception as e:
        logger.error(f"批量评分失败: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"批量评分失败: {str(e)}"
        )

@router.post("/ai-analysis", response_model=StandardResponse)
async def get_ai_analysis(
    request: AIAnalysisRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取AI分析结果"""
    try:
        logger.info(f"用户 {current_user.id} 请求AI分析")
        
        # 执行AI分析
        analysis = await classified_grading_service.get_ai_analysis(
            question=request.question,
            grading_result=request.grading_result
        )
        
        return StandardResponse(
            success=True,
            message="AI分析完成",
            data=analysis
        )
        
    except Exception as e:
        logger.error(f"AI分析失败: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI分析失败: {str(e)}"
        )

@router.post("/assess-quality", response_model=StandardResponse)
async def assess_grading_quality(
    request: QualityAssessmentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """评估评分质量"""
    try:
        logger.info(f"用户 {current_user.id} 请求评分质量评估")
        
        # 执行质量评估
        quality = await classified_grading_service.assess_grading_quality(
            questions=request.questions,
            grading_results=request.grading_results
        )
        
        return StandardResponse(
            success=True,
            message="质量评估完成",
            data=quality
        )
        
    except Exception as e:
        logger.error(f"质量评估失败: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"质量评估失败: {str(e)}"
        )

@router.post("/generate-report", response_model=StandardResponse)
async def generate_grading_report(
    request: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """生成评分报告"""
    try:
        logger.info(f"用户 {current_user.id} 请求生成评分报告")
        
        # 生成报告
        report = await classified_grading_service.generate_grading_report(
            questions=request.get('questions', []),
            answer_sheet=request.get('answerSheet')
        )
        
        return StandardResponse(
            success=True,
            message="报告生成完成",
            data=report
        )
        
    except Exception as e:
        logger.error(f"报告生成失败: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"报告生成失败: {str(e)}"
        )

@router.get("/config", response_model=StandardResponse)
async def get_grading_config(
    exam_type: str = "default",
    current_user: User = Depends(get_current_user)
):
    """获取评分配置"""
    try:
        config = classified_grading_service.get_grading_config(exam_type)
        
        return StandardResponse(
            success=True,
            message="配置获取成功",
            data=config
        )
        
    except Exception as e:
        logger.error(f"配置获取失败: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"配置获取失败: {str(e)}"
        )

@router.post("/config", response_model=StandardResponse)
async def save_grading_config(
    request: GradingConfigRequest,
    current_user: User = Depends(get_current_user)
):
    """保存评分配置"""
    try:
        logger.info(f"用户 {current_user.id} 保存评分配置")
        
        config = classified_grading_service.save_grading_config(request.dict())
        
        return StandardResponse(
            success=True,
            message="配置保存成功",
            data=config
        )
        
    except Exception as e:
        logger.error(f"配置保存失败: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"配置保存失败: {str(e)}"
        )

@router.post("/adjust-score", response_model=StandardResponse)
async def adjust_question_score(
    request: ScoreAdjustmentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """调整题目分数"""
    try:
        logger.info(f"用户 {current_user.id} 调整题目 {request.question_id} 分数")
        
        # 这里应该更新数据库中的分数
        # 暂时返回成功响应
        result = {
            'question_id': request.question_id,
            'old_score': 0,  # 从数据库获取
            'new_score': request.new_score,
            'reason': request.reason,
            'adjusted_by': current_user.id,
            'adjusted_at': datetime.now().isoformat()
        }
        
        return StandardResponse(
            success=True,
            message="分数调整成功",
            data=result
        )
        
    except Exception as e:
        logger.error(f"分数调整失败: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"分数调整失败: {str(e)}"
        )

@router.get("/statistics", response_model=StandardResponse)
async def get_grading_statistics(
    exam_id: Optional[str] = None,
    question_type: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """获取评分统计信息"""
    try:
        logger.info(f"用户 {current_user.id} 请求评分统计信息")
        
        # 获取统计信息
        statistics = await classified_grading_service.get_grading_statistics(
            exam_id=exam_id,
            question_type=question_type
        )
        
        return StandardResponse(
            success=True,
            message="统计信息获取成功",
            data=statistics
        )
        
    except Exception as e:
        logger.error(f"统计信息获取失败: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"统计信息获取失败: {str(e)}"
        )

# ==================== 题目分割路由 ====================

segmentation_router = APIRouter(prefix="/api/question-segmentation", tags=["题目分割"])

@segmentation_router.post("/segment", response_model=StandardResponse)
async def segment_questions(
    request: QuestionSegmentationRequest,
    current_user: User = Depends(get_current_user)
):
    """智能切题"""
    try:
        logger.info(f"用户 {current_user.id} 开始智能切题")
        
        # 执行切题
        result = await question_segmentation_service.segment_questions(
            ocr_result=request.ocr_result,
            exam_config=request.exam_config
        )
        
        logger.info(f"切题完成，识别到 {len(result.questions)} 道题目")
        
        return StandardResponse(
            success=True,
            message="智能切题完成",
            data=result.to_dict()
        )
        
    except Exception as e:
        logger.error(f"智能切题失败: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"智能切题失败: {str(e)}"
        )

@segmentation_router.post("/validate", response_model=StandardResponse)
async def validate_segmentation(
    request: Dict[str, Any],
    current_user: User = Depends(get_current_user)
):
    """验证切题结果"""
    try:
        logger.info(f"用户 {current_user.id} 验证切题结果")
        
        # 执行验证
        validation_result = await question_segmentation_service.validate_segmentation(
            questions=request.get('questions', []),
            original_ocr=request.get('original_ocr', {})
        )
        
        return StandardResponse(
            success=True,
            message="切题验证完成",
            data=validation_result
        )
        
    except Exception as e:
        logger.error(f"切题验证失败: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"切题验证失败: {str(e)}"
        )

@segmentation_router.get("/config", response_model=StandardResponse)
async def get_segmentation_config(
    exam_type: str = "default",
    current_user: User = Depends(get_current_user)
):
    """获取切题配置"""
    try:
        config = question_segmentation_service.get_segmentation_config(exam_type)
        
        return StandardResponse(
            success=True,
            message="配置获取成功",
            data=config
        )
        
    except Exception as e:
        logger.error(f"配置获取失败: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"配置获取失败: {str(e)}"
        )

# ==================== 题型分类路由 ====================

classifier_router = APIRouter(prefix="/api/question-classifier", tags=["题型分类"])

@classifier_router.post("/classify", response_model=StandardResponse)
async def classify_question(
    request: QuestionClassificationRequest,
    current_user: User = Depends(get_current_user)
):
    """分类单个题目"""
    try:
        logger.info(f"用户 {current_user.id} 开始题目分类")
        
        # 执行分类
        result = await question_classifier_service.classify_question(
            question_text=request.question_text,
            context=request.context
        )
        
        logger.info(f"题目分类完成，类型: {result.question_type}")
        
        return StandardResponse(
            success=True,
            message="题目分类完成",
            data=result.to_dict()
        )
        
    except Exception as e:
        logger.error(f"题目分类失败: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"题目分类失败: {str(e)}"
        )

@classifier_router.post("/batch-classify", response_model=StandardResponse)
async def batch_classify_questions(
    request: BatchClassificationRequest,
    current_user: User = Depends(get_current_user)
):
    """批量分类题目"""
    try:
        questions = request.questions
        logger.info(f"用户 {current_user.id} 开始批量分类 {len(questions)} 道题目")
        
        # 执行批量分类
        results = await question_classifier_service.batch_classify_questions(questions)
        
        # 统计结果
        type_distribution = {}
        for result in results:
            question_type = result.question_type
            type_distribution[question_type] = type_distribution.get(question_type, 0) + 1
        
        logger.info(f"批量分类完成，类型分布: {type_distribution}")
        
        return StandardResponse(
            success=True,
            message="批量分类完成",
            data={
                'results': [r.to_dict() for r in results],
                'statistics': {
                    'total_questions': len(results),
                    'type_distribution': type_distribution
                }
            }
        )
        
    except Exception as e:
        logger.error(f"批量分类失败: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"批量分类失败: {str(e)}"
        )

@classifier_router.get("/supported-types", response_model=StandardResponse)
async def get_supported_question_types(
    current_user: User = Depends(get_current_user)
):
    """获取支持的题目类型"""
    try:
        supported_types = question_classifier_service.get_supported_question_types()
        
        return StandardResponse(
            success=True,
            message="支持的题目类型获取成功",
            data=supported_types
        )
        
    except Exception as e:
        logger.error(f"获取支持的题目类型失败: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取支持的题目类型失败: {str(e)}"
        )

@classifier_router.get("/statistics", response_model=StandardResponse)
async def get_classification_statistics(
    current_user: User = Depends(get_current_user)
):
    """获取分类统计信息"""
    try:
        logger.info(f"用户 {current_user.id} 请求分类统计信息")
        
        # 获取统计信息
        statistics = await question_classifier_service.get_classification_statistics()
        
        return StandardResponse(
            success=True,
            message="分类统计信息获取成功",
            data=statistics
        )
        
    except Exception as e:
        logger.error(f"分类统计信息获取失败: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"分类统计信息获取失败: {str(e)}"
        )

# ==================== 健康检查 ====================

@router.get("/health", response_model=StandardResponse)
async def health_check():
    """健康检查"""
    return StandardResponse(
        success=True,
        message="服务正常",
        data={
            'status': 'healthy',
            'service': 'classified_grading',
            'version': '1.0.0'
        }
    )

@segmentation_router.get("/health", response_model=StandardResponse)
async def segmentation_health_check():
    """切题服务健康检查"""
    return StandardResponse(
        success=True,
        message="服务正常",
        data={
            'status': 'healthy',
            'service': 'question_segmentation',
            'version': '1.0.0'
        }
    )

@classifier_router.get("/health", response_model=StandardResponse)
async def classifier_health_check():
    """分类服务健康检查"""
    return StandardResponse(
        success=True,
        message="服务正常",
        data={
            'status': 'healthy',
            'service': 'question_classifier',
            'version': '1.0.0'
        }
    )