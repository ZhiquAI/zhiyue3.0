"""阅卷工作流程API
提供工作流程管理和优化的HTTP接口
"""

from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from datetime import datetime

from db_connection import get_db
from services.grading_workflow_service import (
    GradingWorkflowService, AssignmentStrategy
)
from auth import get_current_user
from models.production_models import User
from middleware.grading_permissions import require_grading_permissions

router = APIRouter(prefix="/api/grading-workflow", tags=["grading-workflow"])


# Pydantic模型定义
class WorkflowInitRequest(BaseModel):
    """工作流程初始化请求"""
    exam_id: str = Field(..., description="考试ID")
    config: Dict[str, Any] = Field(default_factory=dict, description="配置参数")


class AssignmentRequest(BaseModel):
    """试卷分配请求"""
    exam_id: str = Field(..., description="考试ID")
    strategy: str = Field(
        default="balanced", 
        description="分配策略: random, balanced, expertise, workload"
    )


class WorkflowStatusResponse(BaseModel):
    """工作流程状态响应"""
    workflow_id: str
    exam_id: str
    stage: str
    statistics: Dict[str, Any]
    updated_at: datetime

    class Config:
        from_attributes = True


class AssignmentResponse(BaseModel):
    """分配结果响应"""
    total_assigned: int
    assignments: list
    strategy_used: str

    class Config:
        from_attributes = True


class WorkloadResponse(BaseModel):
    """工作负载响应"""
    grader_id: str
    assigned_count: int
    completed_count: int
    pending_count: int
    completion_rate: float
    avg_grading_time_minutes: float

    class Config:
        from_attributes = True


class ProgressResponse(BaseModel):
    """进度响应"""
    exam_id: str
    total_sheets: int
    graded_sheets: int
    completion_rate: float
    grader_progress: list
    estimated_completion: Optional[datetime]

    class Config:
        from_attributes = True


# API路由
@router.post("/initialize")
@require_grading_permissions("create_review_task")
async def initialize_workflow(
    request: WorkflowInitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """初始化阅卷工作流程"""
    try:
        service = GradingWorkflowService(db)
        workflow_id = service.initialize_workflow(
            exam_id=request.exam_id,
            config=request.config
        )
        
        return {
            "success": True,
            "message": "工作流程初始化成功",
            "data": {"workflow_id": workflow_id}
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"初始化工作流程失败: {str(e)}"
        )


@router.get("/status/{workflow_id}", response_model=WorkflowStatusResponse)
@require_grading_permissions("view_own_reviews")
async def get_workflow_status(
    workflow_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取工作流程状态"""
    try:
        service = GradingWorkflowService(db)
        status_data = service.get_workflow_status(workflow_id)
        
        return WorkflowStatusResponse(**status_data)

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取工作流程状态失败: {str(e)}"
        )


@router.post("/assign", response_model=AssignmentResponse)
@require_grading_permissions("assign_reviewer")
async def assign_papers(
    request: AssignmentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """智能分配试卷"""
    try:
        # 验证分配策略
        try:
            strategy = AssignmentStrategy(request.strategy)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"无效的分配策略: {request.strategy}"
            )

        service = GradingWorkflowService(db)
        result = service.assign_papers_to_graders(
            exam_id=request.exam_id,
            strategy=strategy
        )
        
        return AssignmentResponse(**result)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"试卷分配失败: {str(e)}"
        )


@router.get("/workload/{grader_id}", response_model=WorkloadResponse)
@require_grading_permissions("view_own_reviews")
async def get_grader_workload(
    grader_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取阅卷员工作负载"""
    try:
        # 检查权限：只能查看自己的工作负载或管理员可以查看所有
        if (current_user.id != grader_id and 
                current_user.role not in ['admin', 'head_teacher']):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="没有权限查看该阅卷员的工作负载"
            )

        service = GradingWorkflowService(db)
        workload = service.get_grader_workload(grader_id)
        
        return WorkloadResponse(**workload)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取工作负载失败: {str(e)}"
        )


@router.post("/optimize/{exam_id}")
@require_grading_permissions("manage_reviewers")
async def optimize_assignment_balance(
    exam_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """优化分配平衡性"""
    try:
        service = GradingWorkflowService(db)
        result = service.optimize_assignment_balance(exam_id)
        
        return {
            "success": True,
            "message": "分配优化完成" if result['rebalanced'] else "分配已平衡",
            "data": result
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"优化分配失败: {str(e)}"
        )


@router.get("/progress/{exam_id}", response_model=ProgressResponse)
@require_grading_permissions("view_own_reviews")
async def track_grading_progress(
    exam_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """跟踪阅卷进度"""
    try:
        service = GradingWorkflowService(db)
        progress = service.track_grading_progress(exam_id)
        
        return ProgressResponse(**progress)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"跟踪进度失败: {str(e)}"
        )


@router.get("/statistics/{exam_id}")
@require_grading_permissions("view_review_statistics")
async def get_workflow_statistics(
    exam_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取工作流程统计信息"""
    try:
        service = GradingWorkflowService(db)
        
        # 获取基本进度
        progress = service.track_grading_progress(exam_id)
        
        # 获取所有阅卷员的工作负载
        from models.production_models import User as UserModel
        graders = db.query(UserModel).filter(
            UserModel.role.in_(['teacher', 'reviewer', 'senior_reviewer'])
        ).all()
        
        workloads = []
        for grader in graders:
            workload = service.get_grader_workload(grader.id)
            if workload['assigned_count'] > 0:  # 只包含有分配任务的阅卷员
                workloads.append(workload)
        
        # 计算统计指标
        total_assigned = sum(w['assigned_count'] for w in workloads)
        total_completed = sum(w['completed_count'] for w in workloads)
        avg_completion_rate = (
            sum(w['completion_rate'] for w in workloads) / len(workloads)
            if workloads else 0
        )
        
        return {
            "exam_id": exam_id,
            "overview": {
                "total_graders": len(workloads),
                "total_assigned": total_assigned,
                "total_completed": total_completed,
                "overall_completion_rate": progress['completion_rate'],
                "average_grader_completion_rate": avg_completion_rate
            },
            "progress": progress,
            "grader_workloads": workloads
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取统计信息失败: {str(e)}"
        )