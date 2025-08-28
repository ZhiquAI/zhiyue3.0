"""阅卷复核API路由
提供复核系统的HTTP接口
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from datetime import datetime

from db_connection import get_db
from services.grading_review_service import GradingReviewService
from models.grading_review_models import (
    ReviewType, ReviewStatus, ReviewResult
)
from auth import get_current_user
from models.production_models import User
from middleware.grading_permissions import (
    require_grading_permissions,
    require_grading_resource_access,
    require_review_type_permission,
    GradingPermissionManager
)

router = APIRouter(prefix="/api/grading-review", tags=["grading-review"])


# Pydantic模型定义
class ReviewTaskCreateRequest(BaseModel):
    """创建复核任务请求"""
    exam_id: str = Field(..., description="考试ID")
    review_type: ReviewType = Field(..., description="复核类型")
    task_name: str = Field(..., description="任务名称")
    task_description: Optional[str] = Field(None, description="任务描述")
    score_threshold: float = Field(5.0, description="分差阈值")
    quality_threshold: float = Field(0.8, description="质量阈值")
    auto_assign: bool = Field(True, description="是否自动分配")
    priority: int = Field(5, description="优先级")
    deadline: Optional[datetime] = Field(None, description="截止时间")
    estimated_duration: Optional[int] = Field(None, description="预计时长(分钟)")


class ReviewSubmitRequest(BaseModel):
    """提交复核结果请求"""
    total_score: Optional[float] = Field(None, description="总分")
    objective_score: Optional[float] = Field(None, description="客观题分数")
    subjective_scores: Optional[Dict[str, float]] = Field(
        None, description="主观题分数"
    )
    grading_details: Optional[Dict[str, Any]] = Field(
        None, description="评分详情"
    )
    comments: str = Field("", description="复核意见")
    quality_issues: List[str] = Field([], description="质量问题")
    suggestions: List[str] = Field([], description="改进建议")


class ReviewerAssignRequest(BaseModel):
    """分配复核员请求"""
    reviewer_id: str = Field(..., description="复核员ID")


class ReviewTaskResponse(BaseModel):
    """复核任务响应"""
    id: str
    exam_id: str
    task_name: str
    task_description: str
    review_type: ReviewType
    status: str
    score_threshold: float
    quality_threshold: float
    auto_assign: bool
    priority: int
    deadline: Optional[datetime]
    estimated_duration: Optional[int]
    created_by: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ReviewRecordResponse(BaseModel):
    """复核记录响应"""
    id: str
    answer_sheet_id: str
    exam_id: str
    review_type: ReviewType
    review_round: int
    status: ReviewStatus
    result: Optional[ReviewResult]
    reviewer_id: Optional[str]
    original_total_score: Optional[float]
    review_total_score: Optional[float]
    score_difference: Optional[float]
    has_dispute: bool
    review_comments: str
    quality_issues: List[str]
    improvement_suggestions: List[str]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class ReviewStatisticsResponse(BaseModel):
    """复核统计响应"""
    total_reviews: int
    completed_reviews: int
    disputed_reviews: int
    completion_rate: float
    dispute_rate: float
    avg_score_difference: float
    type_distribution: Dict[str, int]


# API路由
@router.post("/tasks", response_model=ReviewTaskResponse)
@require_grading_resource_access("review_task", "create")
async def create_review_task(
    request: ReviewTaskCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """创建复核任务"""
    try:
        # 检查复核类型权限
        if not GradingPermissionManager.can_perform_review_type(
            current_user, request.review_type.value
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"没有权限创建{request.review_type.value}类型的复核任务"
            )

        service = GradingReviewService(db)
        task_config = {
            'name': request.task_name,
            'description': request.task_description,
            'score_threshold': request.score_threshold,
            'quality_threshold': request.quality_threshold,
            'auto_assign': request.auto_assign,
            'priority': request.priority,
            'deadline': request.deadline,
            'estimated_duration': request.estimated_duration
        }

        task = service.create_review_task(
            exam_id=request.exam_id,
            review_type=request.review_type,
            task_config=task_config,
            creator_id=current_user.id
        )

        return ReviewTaskResponse.from_orm(task)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"创建复核任务失败: {str(e)}"
        )


@router.post("/trigger/{answer_sheet_id}")
@require_grading_permissions("create_review_task")
async def trigger_review(
    answer_sheet_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """触发复核"""
    try:

        service = GradingReviewService(db)
        triggered_reviews = service.trigger_review_by_rules(answer_sheet_id)

        return {
            "message": "复核触发成功",
            "triggered_reviews": triggered_reviews,
            "count": len(triggered_reviews)
        }

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"触发复核失败: {str(e)}"
        )


@router.post("/records/{review_record_id}/assign")
@require_grading_resource_access("review_assignment", "create")
async def assign_reviewer(
    review_record_id: str,
    request: ReviewerAssignRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """分配复核员"""
    try:
        # 获取目标复核员信息并检查分配权限
        from models.production_models import User as UserModel
        target_user = db.query(UserModel).filter(
            UserModel.id == request.reviewer_id
        ).first()
        
        if not target_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="目标复核员不存在"
            )
            
        if not GradingPermissionManager.check_reviewer_assignment_permission(
            current_user, target_user
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="没有权限分配该复核员"
            )

        service = GradingReviewService(db)
        success = service.assign_reviewer(
            review_record_id=review_record_id,
            reviewer_id=request.reviewer_id
        )

        if success:
            return {"message": "分配复核员成功"}
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="分配复核员失败"
            )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"分配复核员失败: {str(e)}"
        )


@router.post("/records/{review_record_id}/submit",
             response_model=ReviewRecordResponse)
@require_grading_resource_access("review_result", "create")
async def submit_review(
    review_record_id: str,
    request: ReviewSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """提交复核结果"""
    try:

        service = GradingReviewService(db)
        review_data = {
            'total_score': request.total_score,
            'objective_score': request.objective_score,
            'subjective_scores': request.subjective_scores,
            'grading_details': request.grading_details,
            'comments': request.comments,
            'quality_issues': request.quality_issues,
            'suggestions': request.suggestions
        }

        review_record = service.submit_review(
            review_record_id=review_record_id,
            review_data=review_data,
            reviewer_id=current_user.id
        )

        return ReviewRecordResponse.from_orm(review_record)

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"提交复核结果失败: {str(e)}"
        )


@router.get("/records/{review_record_id}",
            response_model=ReviewRecordResponse)
@require_grading_resource_access("review_result", "read")
async def get_review_record(
    review_record_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取复核记录详情"""
    try:
        from models.grading_review_models import GradingReviewRecord
        
        review_record = db.query(GradingReviewRecord).filter(
            GradingReviewRecord.id == review_record_id
        ).first()

        if not review_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="复核记录不存在"
            )

        # 检查是否为自己的复核记录（非管理员和教师需要额外检查）
        if (current_user.role not in ['admin', 'head_teacher'] and
                review_record.reviewer_id != current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="没有权限查看此复核记录"
            )

        return ReviewRecordResponse.from_orm(review_record)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取复核记录失败: {str(e)}"
        )


@router.get("/exams/{exam_id}/records")
async def get_exam_review_records(
    exam_id: str,
    status_filter: Optional[ReviewStatus] = None,
    review_type_filter: Optional[ReviewType] = None,
    page: int = 1,
    page_size: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取考试的复核记录列表"""
    try:
        # 检查权限
        if current_user.role not in ['admin', 'teacher', 'grader']:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="没有权限查看复核记录"
            )

        from models.grading_review_models import GradingReviewRecord
        from sqlalchemy import and_

        # 构建查询条件
        conditions = [GradingReviewRecord.exam_id == exam_id]
        
        if status_filter:
            conditions.append(GradingReviewRecord.status == status_filter)
        
        if review_type_filter:
            conditions.append(
                GradingReviewRecord.review_type == review_type_filter
            )

        # 如果是普通评分员，只能看到自己的复核任务
        if current_user.role == 'grader':
            conditions.append(
                GradingReviewRecord.reviewer_id == current_user.id
            )

        # 分页查询
        offset = (page - 1) * page_size
        query = db.query(GradingReviewRecord).filter(and_(*conditions))
        
        total = query.count()
        records = query.offset(offset).limit(page_size).all()

        return {
            "records": [
                ReviewRecordResponse.from_orm(record) for record in records
            ],
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取复核记录列表失败: {str(e)}"
        )


@router.get("/exams/{exam_id}/statistics",
            response_model=ReviewStatisticsResponse)
async def get_review_statistics(
    exam_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取复核统计信息"""
    try:
        # 检查权限
        if current_user.role not in ['admin', 'teacher']:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="没有权限查看复核统计"
            )

        service = GradingReviewService(db)
        statistics = service.get_review_statistics(exam_id)

        return ReviewStatisticsResponse(**statistics)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取复核统计失败: {str(e)}"
        )


@router.get("/my-tasks")
async def get_my_review_tasks(
    status_filter: Optional[ReviewStatus] = None,
    page: int = 1,
    page_size: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取我的复核任务"""
    try:
        from models.grading_review_models import GradingReviewRecord
        from sqlalchemy import and_

        # 构建查询条件
        conditions = [GradingReviewRecord.reviewer_id == current_user.id]
        
        if status_filter:
            conditions.append(GradingReviewRecord.status == status_filter)

        # 分页查询
        offset = (page - 1) * page_size
        query = db.query(GradingReviewRecord).filter(and_(*conditions))
        
        total = query.count()
        records = query.order_by(
            GradingReviewRecord.created_at.desc()
        ).offset(offset).limit(page_size).all()

        return {
            "records": [
                ReviewRecordResponse.from_orm(record) for record in records
            ],
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取我的复核任务失败: {str(e)}"
        )