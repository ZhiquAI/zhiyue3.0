"""
标准化考试管理API
展示API标准化的最佳实践
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid

from fastapi import Depends, Request, Query, Path
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, desc, asc
from pydantic import BaseModel, Field, validator

from api.base import (
    BaseAPIRouter, BaseAPIController, APIException, 
    ValidationException, ResourceNotFoundException, BusinessException
)
from schemas.response import SuccessResponse, PaginatedResponse
from database import get_db
from auth import get_current_user
from models.production_models import User, Exam, AnswerSheet, Student
from utils.response import ResponseUtils


# 数据模型定义
class ExamCreateRequest(BaseModel):
    """创建考试请求"""
    name: str = Field(..., min_length=1, max_length=255, description="考试名称")
    subject: str = Field(..., min_length=1, max_length=50, description="科目")
    grade: str = Field(..., min_length=1, max_length=50, description="年级")
    paper_config: Optional[Dict[str, Any]] = Field(None, description="试卷配置")
    grading_config: Optional[Dict[str, Any]] = Field(None, description="评分配置")
    
    @validator('name')
    def validate_name(cls, v):
        if not v or not v.strip():
            raise ValueError("考试名称不能为空")
        return v.strip()
    
    @validator('subject')
    def validate_subject(cls, v):
        valid_subjects = ['语文', '数学', '英语', '物理', '化学', '生物', '政治', '历史', '地理']
        if v not in valid_subjects:
            raise ValueError(f"科目必须是以下之一: {', '.join(valid_subjects)}")
        return v


class ExamUpdateRequest(BaseModel):
    """更新考试请求"""
    name: Optional[str] = Field(None, min_length=1, max_length=255, description="考试名称")
    subject: Optional[str] = Field(None, min_length=1, max_length=50, description="科目")
    grade: Optional[str] = Field(None, min_length=1, max_length=50, description="年级")
    status: Optional[str] = Field(None, description="考试状态")
    paper_config: Optional[Dict[str, Any]] = Field(None, description="试卷配置")
    grading_config: Optional[Dict[str, Any]] = Field(None, description="评分配置")
    
    @validator('status')
    def validate_status(cls, v):
        if v is not None:
            valid_statuses = ['待配置', '配置中', '进行中', '已完成', '已归档']
            if v not in valid_statuses:
                raise ValueError(f"状态必须是以下之一: {', '.join(valid_statuses)}")
        return v


class ExamResponse(BaseModel):
    """考试响应"""
    id: str = Field(..., description="考试ID")
    name: str = Field(..., description="考试名称")
    subject: str = Field(..., description="科目")
    grade: str = Field(..., description="年级")
    status: str = Field(..., description="考试状态")
    paper_config: Optional[Dict[str, Any]] = Field(None, description="试卷配置")
    grading_config: Optional[Dict[str, Any]] = Field(None, description="评分配置")
    total_students: int = Field(..., description="参考学生总数")
    completed_count: int = Field(..., description="已完成阅卷数量")
    avg_score: Optional[float] = Field(None, description="平均分")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")
    creator_name: str = Field(..., description="创建者姓名")
    
    class Config:
        from_attributes = True


class ExamSummaryResponse(BaseModel):
    """考试摘要响应（用于列表）"""
    id: str
    name: str
    subject: str
    grade: str
    status: str
    total_students: int
    completed_count: int
    avg_score: Optional[float]
    created_at: datetime
    creator_name: str
    
    class Config:
        from_attributes = True


class ExamStatisticsResponse(BaseModel):
    """考试统计响应"""
    total_exams: int = Field(..., description="考试总数")
    active_exams: int = Field(..., description="进行中的考试")
    completed_exams: int = Field(..., description="已完成的考试")
    total_students: int = Field(..., description="学生总数")
    total_answer_sheets: int = Field(..., description="答题卡总数")
    average_completion_rate: float = Field(..., description="平均完成率")


class ExamQueryParams(BaseModel):
    """考试查询参数"""
    subject: Optional[str] = Field(None, description="科目过滤")
    grade: Optional[str] = Field(None, description="年级过滤")
    status: Optional[str] = Field(None, description="状态过滤")
    creator_id: Optional[str] = Field(None, description="创建者过滤")
    date_from: Optional[datetime] = Field(None, description="开始日期")
    date_to: Optional[datetime] = Field(None, description="结束日期")


# API控制器
class ExamAPIController(BaseAPIController):
    """考试管理API控制器"""
    
    def create_exam(
        self,
        request: Request,
        exam_data: ExamCreateRequest,
        current_user: User,
        db: Session
    ) -> SuccessResponse[ExamResponse]:
        """创建考试"""
        try:
            # 检查考试名称是否重复
            existing_exam = db.query(Exam).filter(
                and_(
                    Exam.name == exam_data.name,
                    Exam.created_by == current_user.id
                )
            ).first()
            
            if existing_exam:
                raise BusinessException(f"考试名称 '{exam_data.name}' 已存在")
            
            # 创建考试
            exam = Exam(
                id=str(uuid.uuid4()),
                name=exam_data.name,
                subject=exam_data.subject,
                grade=exam_data.grade,
                paper_config=exam_data.paper_config,
                grading_config=exam_data.grading_config,
                created_by=current_user.id,
                status="待配置"
            )
            
            db.add(exam)
            db.commit()
            db.refresh(exam)
            
            # 构建响应
            exam_response = self._build_exam_response(exam, current_user)
            
            self.logger.info(f"用户 {current_user.username} 创建了考试: {exam.name}")
            
            return self.router.create_response(
                data=exam_response,
                message="考试创建成功",
                request_id=self.get_request_id(request)
            )
            
        except Exception as e:
            return self.handle_exception(e, request)
    
    def get_exam(
        self,
        request: Request,
        exam_id: str,
        current_user: User,
        db: Session
    ) -> SuccessResponse[ExamResponse]:
        """获取考试详情"""
        try:
            exam = self._get_exam_by_id(db, exam_id, current_user.id)
            exam_response = self._build_exam_response(exam, current_user)
            
            return self.router.create_response(
                data=exam_response,
                message="获取考试详情成功",
                request_id=self.get_request_id(request)
            )
            
        except Exception as e:
            return self.handle_exception(e, request)
    
    def list_exams(
        self,
        request: Request,
        page: int,
        limit: int,
        query_params: ExamQueryParams,
        current_user: User,
        db: Session
    ) -> PaginatedResponse[ExamSummaryResponse]:
        """获取考试列表"""
        try:
            # 验证分页参数
            page, limit = self.validate_pagination_params(page, limit)
            offset = self.calculate_offset(page, limit)
            
            # 构建查询
            query = db.query(Exam).filter(Exam.created_by == current_user.id)
            
            # 应用过滤条件
            if query_params.subject:
                query = query.filter(Exam.subject == query_params.subject)
            
            if query_params.grade:
                query = query.filter(Exam.grade == query_params.grade)
            
            if query_params.status:
                query = query.filter(Exam.status == query_params.status)
            
            if query_params.date_from:
                query = query.filter(Exam.created_at >= query_params.date_from)
            
            if query_params.date_to:
                query = query.filter(Exam.created_at <= query_params.date_to)
            
            # 获取总数
            total = query.count()
            
            # 分页查询
            exams = query.order_by(desc(Exam.created_at)).offset(offset).limit(limit).all()
            
            # 构建响应
            exam_summaries = [
                self._build_exam_summary_response(exam, current_user)
                for exam in exams
            ]
            
            return self.router.create_paginated_response(
                items=exam_summaries,
                total=total,
                page=page,
                limit=limit,
                message="获取考试列表成功",
                request_id=self.get_request_id(request)
            )
            
        except Exception as e:
            return self.handle_exception(e, request)
    
    def update_exam(
        self,
        request: Request,
        exam_id: str,
        exam_data: ExamUpdateRequest,
        current_user: User,
        db: Session
    ) -> SuccessResponse[ExamResponse]:
        """更新考试"""
        try:
            exam = self._get_exam_by_id(db, exam_id, current_user.id)
            
            # 检查考试状态是否允许修改
            if exam.status in ['已完成', '已归档']:
                raise BusinessException(f"考试状态为 '{exam.status}'，无法修改")
            
            # 更新字段
            update_data = exam_data.dict(exclude_unset=True)
            for field, value in update_data.items():
                setattr(exam, field, value)
            
            exam.updated_at = datetime.utcnow()
            
            db.commit()
            db.refresh(exam)
            
            exam_response = self._build_exam_response(exam, current_user)
            
            self.logger.info(f"用户 {current_user.username} 更新了考试: {exam.name}")
            
            return self.router.create_response(
                data=exam_response,
                message="考试更新成功",
                request_id=self.get_request_id(request)
            )
            
        except Exception as e:
            return self.handle_exception(e, request)
    
    def delete_exam(
        self,
        request: Request,
        exam_id: str,
        current_user: User,
        db: Session
    ) -> SuccessResponse[Dict[str, str]]:
        """删除考试"""
        try:
            exam = self._get_exam_by_id(db, exam_id, current_user.id)
            
            # 检查是否有答题卡
            answer_sheet_count = db.query(AnswerSheet).filter(
                AnswerSheet.exam_id == exam_id
            ).count()
            
            if answer_sheet_count > 0:
                raise BusinessException("考试已有答题卡，无法删除")
            
            # 删除相关学生信息
            db.query(Student).filter(Student.exam_id == exam_id).delete()
            
            # 删除考试
            db.delete(exam)
            db.commit()
            
            self.logger.info(f"用户 {current_user.username} 删除了考试: {exam.name}")
            
            return self.router.create_response(
                data={"exam_id": exam_id, "exam_name": exam.name},
                message="考试删除成功",
                request_id=self.get_request_id(request)
            )
            
        except Exception as e:
            return self.handle_exception(e, request)
    
    def get_exam_statistics(
        self,
        request: Request,
        current_user: User,
        db: Session
    ) -> SuccessResponse[ExamStatisticsResponse]:
        """获取考试统计信息"""
        try:
            # 查询统计数据
            total_exams = db.query(Exam).filter(Exam.created_by == current_user.id).count()
            active_exams = db.query(Exam).filter(
                and_(
                    Exam.created_by == current_user.id,
                    Exam.status.in_(['配置中', '进行中'])
                )
            ).count()
            completed_exams = db.query(Exam).filter(
                and_(
                    Exam.created_by == current_user.id,
                    Exam.status == '已完成'
                )
            ).count()
            
            total_students = db.query(Student).join(Exam).filter(
                Exam.created_by == current_user.id
            ).count()
            
            total_answer_sheets = db.query(AnswerSheet).join(Exam).filter(
                Exam.created_by == current_user.id
            ).count()
            
            # 计算平均完成率
            exams = db.query(Exam).filter(Exam.created_by == current_user.id).all()
            completion_rates = []
            for exam in exams:
                if exam.total_students > 0:
                    rate = exam.completed_count / exam.total_students
                    completion_rates.append(rate)
            
            avg_completion_rate = sum(completion_rates) / len(completion_rates) if completion_rates else 0
            
            statistics = ExamStatisticsResponse(
                total_exams=total_exams,
                active_exams=active_exams,
                completed_exams=completed_exams,
                total_students=total_students,
                total_answer_sheets=total_answer_sheets,
                average_completion_rate=avg_completion_rate
            )
            
            return self.router.create_response(
                data=statistics,
                message="获取考试统计成功",
                request_id=self.get_request_id(request)
            )
            
        except Exception as e:
            return self.handle_exception(e, request)
    
    # 辅助方法
    def _get_exam_by_id(self, db: Session, exam_id: str, user_id: str) -> Exam:
        """根据ID获取考试"""
        exam = db.query(Exam).filter(
            and_(
                Exam.id == exam_id,
                Exam.created_by == user_id
            )
        ).first()
        
        if not exam:
            raise ResourceNotFoundException("考试", exam_id)
        
        return exam
    
    def _build_exam_response(self, exam: Exam, creator: User) -> ExamResponse:
        """构建考试响应"""
        return ExamResponse(
            id=exam.id,
            name=exam.name,
            subject=exam.subject,
            grade=exam.grade,
            status=exam.status,
            paper_config=exam.paper_config,
            grading_config=exam.grading_config,
            total_students=exam.total_students or 0,
            completed_count=exam.completed_count or 0,
            avg_score=exam.avg_score,
            created_at=exam.created_at,
            updated_at=exam.updated_at,
            creator_name=creator.name or creator.username
        )
    
    def _build_exam_summary_response(self, exam: Exam, creator: User) -> ExamSummaryResponse:
        """构建考试摘要响应"""
        return ExamSummaryResponse(
            id=exam.id,
            name=exam.name,
            subject=exam.subject,
            grade=exam.grade,
            status=exam.status,
            total_students=exam.total_students or 0,
            completed_count=exam.completed_count or 0,
            avg_score=exam.avg_score,
            created_at=exam.created_at,
            creator_name=creator.name or creator.username
        )


# 创建标准化路由器
router = BaseAPIRouter(prefix="/api/v1/exams", tags=["考试管理"])
controller = ExamAPIController(router)


# API端点定义
@router.post(
    "/",
    response_model=SuccessResponse[ExamResponse],
    summary="创建考试",
    description="创建新的考试，需要提供考试名称、科目、年级等基本信息"
)
async def create_exam(
    request: Request,
    exam_data: ExamCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """创建考试"""
    return controller.create_exam(request, exam_data, current_user, db)


@router.get(
    "/{exam_id}",
    response_model=SuccessResponse[ExamResponse],
    summary="获取考试详情",
    description="根据考试ID获取考试的详细信息"
)
async def get_exam(
    request: Request,
    exam_id: str = Path(..., description="考试ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取考试详情"""
    return controller.get_exam(request, exam_id, current_user, db)


@router.get(
    "/",
    response_model=PaginatedResponse[ExamSummaryResponse],
    summary="获取考试列表",
    description="分页获取当前用户创建的考试列表，支持多种过滤条件"
)
async def list_exams(
    request: Request,
    page: int = Query(1, ge=1, description="页码"),
    limit: int = Query(20, ge=1, le=100, description="每页数量"),
    subject: Optional[str] = Query(None, description="科目过滤"),
    grade: Optional[str] = Query(None, description="年级过滤"),
    status: Optional[str] = Query(None, description="状态过滤"),
    date_from: Optional[datetime] = Query(None, description="开始日期"),
    date_to: Optional[datetime] = Query(None, description="结束日期"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取考试列表"""
    query_params = ExamQueryParams(
        subject=subject,
        grade=grade,
        status=status,
        date_from=date_from,
        date_to=date_to
    )
    return controller.list_exams(request, page, limit, query_params, current_user, db)


@router.put(
    "/{exam_id}",
    response_model=SuccessResponse[ExamResponse],
    summary="更新考试",
    description="更新考试信息，只能更新自己创建的考试"
)
async def update_exam(
    request: Request,
    exam_id: str = Path(..., description="考试ID"),
    exam_data: ExamUpdateRequest = ...,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """更新考试"""
    return controller.update_exam(request, exam_id, exam_data, current_user, db)


@router.delete(
    "/{exam_id}",
    response_model=SuccessResponse[Dict[str, str]],
    summary="删除考试",
    description="删除考试，只能删除没有答题卡的考试"
)
async def delete_exam(
    request: Request,
    exam_id: str = Path(..., description="考试ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """删除考试"""
    return controller.delete_exam(request, exam_id, current_user, db)


@router.get(
    "/statistics/overview",
    response_model=SuccessResponse[ExamStatisticsResponse],
    summary="获取考试统计",
    description="获取当前用户的考试统计概览信息"
)
async def get_exam_statistics(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取考试统计信息"""
    return controller.get_exam_statistics(request, current_user, db)