"""阅卷复核系统数据模型
实现双评、三评机制的数据结构
"""

from sqlalchemy import (
    Column, String, Integer, DateTime, Boolean, JSON, ForeignKey,
    Index, Float, Text, Enum as SQLEnum
)
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum
from .production_models import Base


class ReviewType(enum.Enum):
    """复核类型枚举"""
    FIRST_REVIEW = "first_review"  # 初评
    SECOND_REVIEW = "second_review"  # 复评
    THIRD_REVIEW = "third_review"  # 三评
    FINAL_REVIEW = "final_review"  # 终评
    QUALITY_CHECK = "quality_check"  # 质量检查


class ReviewStatus(enum.Enum):
    """复核状态枚举"""
    PENDING = "pending"  # 待复核
    IN_PROGRESS = "in_progress"  # 复核中
    COMPLETED = "completed"  # 已完成
    DISPUTED = "disputed"  # 有争议
    ESCALATED = "escalated"  # 已升级
    CANCELLED = "cancelled"  # 已取消


class ReviewResult(enum.Enum):
    """复核结果枚举"""
    APPROVED = "approved"  # 通过
    REJECTED = "rejected"  # 拒绝
    MODIFIED = "modified"  # 修改
    NEEDS_DISCUSSION = "needs_discussion"  # 需要讨论


class GradingReviewRecord(Base):
    """阅卷复核记录表"""
    __tablename__ = 'grading_review_records'

    id = Column(String(36), primary_key=True,
                default=lambda: str(uuid.uuid4()))
    answer_sheet_id = Column(String(36),
                             ForeignKey('answer_sheets.id'),
                             nullable=False)
    exam_id = Column(String(36), ForeignKey('exams.id'), nullable=False)

    # 复核基本信息
    review_type = Column(SQLEnum(ReviewType), nullable=False,
                         comment='复核类型')
    review_round = Column(Integer, nullable=False, default=1,
                          comment='复核轮次')
    reviewer_id = Column(String(36), ForeignKey('users.id'),
                         nullable=False, comment='复核员ID')

    # 原始评分信息
    original_grader_id = Column(String(36), ForeignKey('users.id'),
                                comment='原评分员ID')
    original_total_score = Column(Float, comment='原总分')
    original_objective_score = Column(Float, comment='原客观题得分')
    original_subjective_scores = Column(JSON, comment='原主观题得分详情')
    original_grading_details = Column(JSON, comment='原评分详情')

    # 复核评分信息
    review_total_score = Column(Float, comment='复核总分')
    review_objective_score = Column(Float, comment='复核客观题得分')
    review_subjective_scores = Column(JSON, comment='复核主观题得分详情')
    review_grading_details = Column(JSON, comment='复核评分详情')

    # 分差分析
    score_difference = Column(Float, comment='总分差异')
    objective_score_difference = Column(Float, comment='客观题分差')
    subjective_score_differences = Column(JSON, comment='主观题分差详情')

    # 复核状态和结果
    status = Column(SQLEnum(ReviewStatus), default=ReviewStatus.PENDING,
                    comment='复核状态')
    result = Column(SQLEnum(ReviewResult), comment='复核结果')

    # 复核意见和建议
    review_comments = Column(Text, comment='复核意见')
    quality_issues = Column(JSON, comment='发现的质量问题')
    improvement_suggestions = Column(JSON, comment='改进建议')

    # 争议处理
    has_dispute = Column(Boolean, default=False, comment='是否有争议')
    dispute_reason = Column(Text, comment='争议原因')
    dispute_resolver_id = Column(String(36), ForeignKey('users.id'),
                                 comment='争议解决人ID')
    dispute_resolution = Column(Text, comment='争议解决方案')

    # 最终确定分数
    final_total_score = Column(Float, comment='最终确定总分')
    final_objective_score = Column(Float, comment='最终确定客观题得分')
    final_subjective_scores = Column(JSON, comment='最终确定主观题得分')
    final_grading_details = Column(JSON, comment='最终评分详情')

    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow,
                        comment='创建时间')
    started_at = Column(DateTime, comment='开始复核时间')
    completed_at = Column(DateTime, comment='完成复核时间')
    updated_at = Column(DateTime, default=datetime.utcnow,
                        onupdate=datetime.utcnow, comment='更新时间')

    # 性能优化索引
    __table_args__ = (
        Index('idx_review_answer_sheet', 'answer_sheet_id'),
        Index('idx_review_exam_type', 'exam_id', 'review_type'),
        Index('idx_review_status', 'status'),
        Index('idx_review_reviewer', 'reviewer_id'),
        Index('idx_review_dispute', 'has_dispute'),
        Index('idx_review_created', 'created_at'),
    )

    # 关联关系
    answer_sheet = relationship("AnswerSheet",
                                foreign_keys=[answer_sheet_id])
    exam = relationship("Exam", foreign_keys=[exam_id])
    reviewer = relationship("User", foreign_keys=[reviewer_id])
    original_grader = relationship("User",
                                   foreign_keys=[original_grader_id])
    dispute_resolver = relationship("User",
                                    foreign_keys=[dispute_resolver_id])


class ReviewTask(Base):
    """复核任务表"""
    __tablename__ = 'review_tasks'

    id = Column(String(36), primary_key=True,
                default=lambda: str(uuid.uuid4()))
    exam_id = Column(String(36), ForeignKey('exams.id'), nullable=False)

    # 任务基本信息
    task_name = Column(String(255), nullable=False, comment='任务名称')
    task_description = Column(Text, comment='任务描述')
    review_type = Column(SQLEnum(ReviewType), nullable=False,
                         comment='复核类型')

    # 任务配置
    review_config = Column(JSON, comment='复核配置')
    score_threshold = Column(Float, comment='分差阈值')
    quality_threshold = Column(Float, comment='质量阈值')
    auto_assign = Column(Boolean, default=True, comment='是否自动分配')

    # 任务状态
    status = Column(SQLEnum(ReviewStatus), default=ReviewStatus.PENDING,
                    comment='任务状态')
    priority = Column(Integer, default=5, comment='优先级1-10')

    # 分配信息
    assigned_reviewer_id = Column(String(36), ForeignKey('users.id'),
                                  comment='分配的复核员ID')
    assigned_at = Column(DateTime, comment='分配时间')

    # 进度统计
    total_papers = Column(Integer, default=0, comment='总试卷数')
    completed_papers = Column(Integer, default=0, comment='已完成数')
    disputed_papers = Column(Integer, default=0, comment='争议试卷数')

    # 时间管理
    deadline = Column(DateTime, comment='截止时间')
    estimated_duration = Column(Integer, comment='预估时长(分钟)')
    actual_duration = Column(Integer, comment='实际时长(分钟)')

    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime, comment='开始时间')
    completed_at = Column(DateTime, comment='完成时间')
    updated_at = Column(DateTime, default=datetime.utcnow,
                        onupdate=datetime.utcnow)
    created_by = Column(String(36), ForeignKey('users.id'),
                        nullable=False)

    # 索引
    __table_args__ = (
        Index('idx_task_exam_type', 'exam_id', 'review_type'),
        Index('idx_task_status_priority', 'status', 'priority'),
        Index('idx_task_reviewer', 'assigned_reviewer_id'),
        Index('idx_task_deadline', 'deadline'),
    )

    # 关联关系
    exam = relationship("Exam", foreign_keys=[exam_id])
    assigned_reviewer = relationship("User",
                                     foreign_keys=[assigned_reviewer_id])
    creator = relationship("User", foreign_keys=[created_by])


class ReviewRule(Base):
    """复核规则表"""
    __tablename__ = 'review_rules'

    id = Column(String(36), primary_key=True,
                default=lambda: str(uuid.uuid4()))

    # 规则基本信息
    rule_name = Column(String(255), nullable=False, comment='规则名称')
    rule_description = Column(Text, comment='规则描述')
    rule_type = Column(String(50), nullable=False, comment='规则类型')

    # 适用范围
    subject = Column(String(50), comment='适用科目')
    grade = Column(String(50), comment='适用年级')
    exam_type = Column(String(50), comment='适用考试类型')

    # 触发条件
    trigger_conditions = Column(JSON, nullable=False,
                                comment='触发条件配置')

    # 规则配置
    rule_config = Column(JSON, nullable=False, comment='规则详细配置')

    # 规则状态
    is_active = Column(Boolean, default=True, comment='是否启用')
    priority = Column(Integer, default=5, comment='规则优先级')

    # 统计信息
    trigger_count = Column(Integer, default=0, comment='触发次数')
    success_count = Column(Integer, default=0, comment='成功处理次数')

    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow,
                        onupdate=datetime.utcnow)
    created_by = Column(String(36), ForeignKey('users.id'),
                        nullable=False)

    # 索引
    __table_args__ = (
        Index('idx_rule_type_active', 'rule_type', 'is_active'),
        Index('idx_rule_subject_grade', 'subject', 'grade'),
        Index('idx_rule_priority', 'priority'),
    )

    # 关联关系
    creator = relationship("User", foreign_keys=[created_by])