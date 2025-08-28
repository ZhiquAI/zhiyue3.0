"""
智阅3.0核心数据模型
按照正确的业务流程：学生管理 → 考试管理 → 智能阅卷 → 成绩分析
"""

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship


# 使用timezone-aware的datetime
def utcnow():
    """返回UTC时间，替代deprecated的datetime.utcnow()"""
    return datetime.now(timezone.utc)


Base = declarative_base()


# 枚举类型定义
class ExamStatus(enum.Enum):
    """考试状态枚举"""

    DRAFT = "草稿"
    PREPARING = "准备中"
    READY = "就绪"
    IN_PROGRESS = "进行中"
    GRADING = "阅卷中"
    COMPLETED = "已完成"
    ARCHIVED = "已归档"


class GradingStatus(enum.Enum):
    """阅卷状态枚举"""

    PENDING = "待处理"
    PROCESSING = "处理中"
    OCR_COMPLETED = "OCR完成"
    AI_GRADED = "AI评分完成"
    REVIEWED = "人工复核完成"
    FINALIZED = "最终确认"
    ERROR = "错误"


class UserRole(enum.Enum):
    """用户角色枚举"""

    ADMIN = "admin"
    TEACHER = "teacher"
    REVIEWER = "reviewer"
    STUDENT = "student"


# 1. 用户管理模型
class User(Base):
    """用户表 - 支持多角色用户管理"""

    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String(100), unique=True, nullable=False, comment="用户名")
    email = Column(String(255), unique=True, nullable=False, comment="邮箱")
    hashed_password = Column(String(255), nullable=False, comment="密码哈希")
    name = Column(String(100), nullable=False, comment="真实姓名")
    role = Column(
        Enum(UserRole), nullable=False, default=UserRole.TEACHER, comment="用户角色"
    )

    # 教师/机构信息
    school = Column(String(200), comment="学校/机构")
    subject = Column(String(50), comment="任教科目")
    grades = Column(JSON, comment="任教年级列表")
    department = Column(String(100), comment="部门")

    # 联系信息
    phone = Column(String(20), comment="联系电话")
    address = Column(String(500), comment="地址")

    # 权限和状态
    permissions = Column(JSON, comment="特殊权限配置")
    is_active = Column(Boolean, default=True, comment="是否激活")
    is_verified = Column(Boolean, default=False, comment="邮箱验证状态")

    # 时间戳
    created_at = Column(DateTime, default=utcnow, comment="创建时间")
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, comment="更新时间")
    last_login = Column(DateTime, comment="最后登录时间")

    # 索引优化
    __table_args__ = (
        Index("idx_user_username", "username"),
        Index("idx_user_email", "email"),
        Index("idx_user_active_role", "is_active", "role"),
        Index("idx_user_school_subject", "school", "subject"),
    )

    # 关联关系
    created_exams = relationship(
        "Exam", foreign_keys="Exam.created_by", back_populates="creator"
    )
    reviewed_answer_sheets = relationship(
        "AnswerSheet", foreign_keys="AnswerSheet.reviewed_by", back_populates="reviewer"
    )
    created_templates = relationship(
        "AnswerSheetTemplate",
        foreign_keys="AnswerSheetTemplate.created_by",
        back_populates="creator",
    )

    def to_dict(self):
        """转换为字典"""
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "name": self.name,
            "role": self.role.value if self.role else None,
            "school": self.school,
            "subject": self.subject,
            "grades": self.grades,
            "department": self.department,
            "phone": self.phone,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "last_login": self.last_login.isoformat() if self.last_login else None,
        }


# 2. 学生管理模型（优先级最高，按照工作流程）
class Student(Base):
    """学生信息表 - 考试创建的前置条件"""

    __tablename__ = "students"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = Column(String(50), nullable=False, comment="学号/准考证号")
    name = Column(String(100), nullable=False, comment="学生姓名")

    # 班级和年级信息
    class_name = Column(String(50), nullable=False, comment="班级")
    grade = Column(String(50), nullable=False, comment="年级")
    school = Column(String(200), comment="学校")

    # 个人信息
    gender = Column(String(10), comment="性别")
    birth_date = Column(DateTime, comment="出生日期")
    id_card = Column(String(20), comment="身份证号")

    # 联系信息
    phone = Column(String(20), comment="学生电话")
    email = Column(String(255), comment="学生邮箱")
    parent_name = Column(String(100), comment="家长姓名")
    parent_phone = Column(String(20), comment="家长电话")
    address = Column(String(500), comment="家庭地址")

    # 考试相关
    exam_id = Column(
        String(36), ForeignKey("exams.id"), nullable=False, comment="关联考试"
    )
    seat_number = Column(String(20), comment="座位号")
    barcode_data = Column(String(500), comment="条形码数据")

    # 学习相关信息
    subject_preferences = Column(JSON, comment="学科特长")
    special_needs = Column(Text, comment="特殊需求说明")

    # 状态和时间戳
    is_active = Column(Boolean, default=True, comment="是否有效")
    created_at = Column(DateTime, default=datetime.utcnow, comment="创建时间")
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment="更新时间"
    )
    created_by = Column(
        String(36), ForeignKey("users.id"), nullable=False, comment="创建人"
    )

    # 索引优化 - 关键查询路径
    __table_args__ = (
        Index("idx_student_id_exam", "student_id", "exam_id"),  # 核心查询
        Index("idx_student_class_exam", "class_name", "exam_id"),  # 按班级查询
        Index("idx_student_name_exam", "name", "exam_id"),  # 按姓名搜索
        Index("idx_student_grade_school", "grade", "school"),  # 跨考试查询
        Index("idx_student_barcode", "barcode_data"),  # 扫描识别
        {"mysql_charset": "utf8mb4"},  # MySQL字符集
    )

    # 关联关系
    exam = relationship("Exam", back_populates="students")
    creator = relationship("User", foreign_keys=[created_by])
    answer_sheets = relationship("AnswerSheet", back_populates="student")

    def to_dict(self):
        """转换为字典"""
        return {
            "id": self.id,
            "student_id": self.student_id,
            "name": self.name,
            "class_name": self.class_name,
            "grade": self.grade,
            "school": self.school,
            "gender": self.gender,
            "phone": self.phone,
            "email": self.email,
            "parent_name": self.parent_name,
            "parent_phone": self.parent_phone,
            "exam_id": self.exam_id,
            "seat_number": self.seat_number,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


# 3. 考试管理模型
class Exam(Base):
    """考试主表 - 依赖学生数据"""

    __tablename__ = "exams"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False, comment="考试名称")
    subject = Column(String(50), nullable=False, comment="考试科目")
    grade = Column(String(50), nullable=False, comment="年级")
    exam_type = Column(String(50), comment="考试类型：期中/期末/月考等")

    # 考试配置
    description = Column(Text, comment="考试描述")
    instructions = Column(Text, comment="考试说明")
    total_score = Column(Float, default=100.0, comment="总分")
    duration = Column(Integer, comment="考试时长(分钟)")

    # 时间安排
    exam_date = Column(DateTime, comment="考试日期")
    start_time = Column(DateTime, comment="开始时间")
    end_time = Column(DateTime, comment="结束时间")

    # 试卷和评分配置
    paper_config = Column(JSON, comment="试卷结构配置")
    grading_config = Column(JSON, comment="评分规则配置")
    template_id = Column(
        Integer, ForeignKey("answer_sheet_templates.id"), comment="答题卡模板"
    )

    # 状态管理
    status = Column(
        Enum(ExamStatus), nullable=False, default=ExamStatus.DRAFT, comment="考试状态"
    )

    # 统计信息
    total_students = Column(Integer, default=0, comment="参考学生数")
    submitted_count = Column(Integer, default=0, comment="已提交答卷数")
    graded_count = Column(Integer, default=0, comment="已评分数")
    avg_score = Column(Float, comment="平均分")
    max_score = Column(Float, comment="最高分")
    min_score = Column(Float, comment="最低分")
    pass_rate = Column(Float, comment="及格率")

    # 质量控制设置
    double_blind_review = Column(Boolean, default=False, comment="双盲评阅")
    review_sample_rate = Column(Float, default=0.1, comment="抽样复核比例")

    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow, comment="创建时间")
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment="更新时间"
    )
    created_by = Column(
        String(36), ForeignKey("users.id"), nullable=False, comment="创建人"
    )

    # 索引优化
    __table_args__ = (
        Index("idx_exam_status_date", "status", "exam_date"),
        Index("idx_exam_creator_subject", "created_by", "subject"),
        Index("idx_exam_grade_type", "grade", "exam_type"),
        Index("idx_exam_created_at", "created_at"),
    )

    # 关联关系
    creator = relationship(
        "User", foreign_keys=[created_by], back_populates="created_exams"
    )
    students = relationship("Student", back_populates="exam")
    answer_sheets = relationship("AnswerSheet", back_populates="exam")
    template = relationship("AnswerSheetTemplate", foreign_keys=[template_id])

    def to_dict(self):
        """转换为字典"""
        return {
            "id": self.id,
            "name": self.name,
            "subject": self.subject,
            "grade": self.grade,
            "exam_type": self.exam_type,
            "description": self.description,
            "total_score": self.total_score,
            "duration": self.duration,
            "exam_date": self.exam_date.isoformat() if self.exam_date else None,
            "status": self.status.value if self.status else None,
            "total_students": self.total_students,
            "submitted_count": self.submitted_count,
            "graded_count": self.graded_count,
            "avg_score": self.avg_score,
            "pass_rate": self.pass_rate,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


# 4. 答题卡模板管理
class AnswerSheetTemplate(Base):
    """答题卡模板表"""

    __tablename__ = "answer_sheet_templates"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, comment="模板名称")
    description = Column(String(500), comment="模板描述")

    # 适用范围
    subject = Column(String(50), comment="适用科目")
    grade_level = Column(String(20), comment="适用年级")
    exam_type = Column(String(50), comment="适用考试类型")

    # 模板配置
    template_data = Column(JSON, nullable=False, comment="模板配置数据")
    background_image = Column(String(500), comment="背景图片路径")

    # 页面设置
    page_width = Column(Integer, default=210, comment="页面宽度(mm)")
    page_height = Column(Integer, default=297, comment="页面高度(mm)")
    dpi = Column(Integer, default=300, comment="分辨率")

    # 区域配置概览
    has_barcode_area = Column(Boolean, default=True, comment="包含条码区")
    has_student_info = Column(Boolean, default=True, comment="包含学生信息区")
    objective_questions = Column(Integer, default=0, comment="客观题数量")
    subjective_questions = Column(Integer, default=0, comment="主观题数量")

    # 版本控制
    version = Column(String(20), default="1.0", comment="版本号")
    is_active = Column(Boolean, default=True, comment="是否激活")

    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow, comment="创建时间")
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment="更新时间"
    )
    created_by = Column(
        String(36), ForeignKey("users.id"), nullable=False, comment="创建人"
    )
    updated_by = Column(String(36), ForeignKey("users.id"), comment="最后修改人")

    # 索引优化
    __table_args__ = (
        Index("idx_template_name_creator", "name", "created_by"),
        Index("idx_template_subject_grade", "subject", "grade_level"),
        Index("idx_template_active_version", "is_active", "version"),
    )

    # 关联关系
    creator = relationship(
        "User", foreign_keys=[created_by], back_populates="created_templates"
    )
    updater = relationship("User", foreign_keys=[updated_by])
    usages = relationship("TemplateUsage", back_populates="template")

    def to_dict(self):
        """转换为字典"""
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "subject": self.subject,
            "grade_level": self.grade_level,
            "exam_type": self.exam_type,
            "page_width": self.page_width,
            "page_height": self.page_height,
            "dpi": self.dpi,
            "objective_questions": self.objective_questions,
            "subjective_questions": self.subjective_questions,
            "version": self.version,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# 5. 智能阅卷模型
class AnswerSheet(Base):
    """答题卡表 - 阅卷处理核心"""

    __tablename__ = "answer_sheets"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    exam_id = Column(
        String(36), ForeignKey("exams.id"), nullable=False, comment="关联考试"
    )

    # 学生信息
    student_id = Column(
        String(36), ForeignKey("students.id"), nullable=False, comment="学生ID"
    )
    student_number = Column(String(50), comment="学号（冗余字段，便于查询）")
    student_name = Column(String(100), comment="学生姓名（冗余字段）")
    class_name = Column(String(50), comment="班级（冗余字段）")

    # 文件信息
    original_file_path = Column(String(500), nullable=False, comment="原始扫描文件路径")
    processed_file_path = Column(String(500), comment="处理后文件路径")
    thumbnail_path = Column(String(500), comment="缩略图路径")
    file_hash = Column(String(64), comment="文件MD5哈希")
    file_size = Column(Integer, comment="文件大小(字节)")

    # 图像质量
    image_quality = Column(JSON, comment="图像质量评估")
    resolution = Column(String(20), comment="分辨率")
    scan_quality_score = Column(Float, comment="扫描质量评分")

    # OCR处理状态
    ocr_status = Column(
        Enum(GradingStatus), default=GradingStatus.PENDING, comment="OCR状态"
    )
    ocr_result = Column(JSON, comment="OCR识别结果")
    ocr_confidence = Column(Float, comment="OCR整体置信度")
    ocr_processing_time = Column(Float, comment="OCR处理耗时(秒)")

    # 题目分割
    segmented_questions = Column(JSON, comment="题目分割结果")
    segmentation_quality = Column(JSON, comment="分割质量评估")
    manual_adjustments = Column(JSON, comment="人工调整记录")

    # 评分结果
    grading_status = Column(
        Enum(GradingStatus), default=GradingStatus.PENDING, comment="评分状态"
    )
    objective_score = Column(Float, comment="客观题得分")
    subjective_scores = Column(JSON, comment="主观题详细得分")
    total_score = Column(Float, comment="总分")
    score_breakdown = Column(JSON, comment="得分明细")

    # 质量控制
    quality_issues = Column(JSON, comment="识别的质量问题")
    needs_review = Column(Boolean, default=False, comment="需要人工复核")
    review_reasons = Column(JSON, comment="需要复核的原因")

    # 人工复核
    reviewed_by = Column(String(36), ForeignKey("users.id"), comment="复核人")
    reviewed_at = Column(DateTime, comment="复核时间")
    review_comments = Column(Text, comment="复核意见")
    review_score_changes = Column(JSON, comment="复核分数调整")

    # 最终确认
    finalized_by = Column(String(36), ForeignKey("users.id"), comment="最终确认人")
    finalized_at = Column(DateTime, comment="最终确认时间")
    is_finalized = Column(Boolean, default=False, comment="是否最终确认")

    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow, comment="创建时间")
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment="更新时间"
    )

    # 性能优化索引
    __table_args__ = (
        Index("idx_answer_exam_student", "exam_id", "student_id"),
        Index("idx_answer_grading_status", "grading_status"),
        Index("idx_answer_needs_review", "needs_review", "reviewed_at"),
        Index("idx_answer_score_range", "total_score"),
        Index("idx_answer_file_hash", "file_hash"),  # 防重复
        Index("idx_answer_quality", "scan_quality_score"),
    )

    # 关联关系
    exam = relationship("Exam", back_populates="answer_sheets")
    student = relationship("Student", back_populates="answer_sheets")
    reviewer = relationship("User", foreign_keys=[reviewed_by])
    finalizer = relationship("User", foreign_keys=[finalized_by])
    grading_tasks = relationship("GradingTask", back_populates="answer_sheet")

    def to_dict(self):
        """转换为字典"""
        return {
            "id": self.id,
            "exam_id": self.exam_id,
            "student_id": self.student_id,
            "student_number": self.student_number,
            "student_name": self.student_name,
            "class_name": self.class_name,
            "original_file_path": self.original_file_path,
            "scan_quality_score": self.scan_quality_score,
            "ocr_status": self.ocr_status.value if self.ocr_status else None,
            "ocr_confidence": self.ocr_confidence,
            "grading_status": (
                self.grading_status.value if self.grading_status else None
            ),
            "objective_score": self.objective_score,
            "total_score": self.total_score,
            "needs_review": self.needs_review,
            "is_finalized": self.is_finalized,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


# 6. 评分任务队列
class GradingTask(Base):
    """评分任务队列 - 异步处理管理"""

    __tablename__ = "grading_tasks"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    answer_sheet_id = Column(
        String(36), ForeignKey("answer_sheets.id"), nullable=False, comment="答题卡ID"
    )

    # 任务配置
    task_type = Column(
        String(50), nullable=False, comment="任务类型: ocr/ai_grading/review"
    )
    priority = Column(Integer, default=5, comment="优先级1-10，1最高")
    batch_id = Column(String(36), comment="批次ID")

    # 处理状态
    status = Column(String(20), default="pending", comment="任务状态")
    worker_id = Column(String(100), comment="处理节点ID")
    progress = Column(Float, default=0.0, comment="处理进度0-1")

    # 处理结果
    result_data = Column(JSON, comment="处理结果数据")
    error_message = Column(Text, comment="错误信息")
    processing_logs = Column(JSON, comment="处理日志")

    # 时间管理
    created_at = Column(DateTime, default=datetime.utcnow, comment="创建时间")
    started_at = Column(DateTime, comment="开始处理时间")
    completed_at = Column(DateTime, comment="完成时间")
    estimated_duration = Column(Integer, comment="预估处理时长(秒)")
    actual_duration = Column(Integer, comment="实际处理时长(秒)")

    # 重试机制
    retry_count = Column(Integer, default=0, comment="重试次数")
    max_retries = Column(Integer, default=3, comment="最大重试次数")
    next_retry_at = Column(DateTime, comment="下次重试时间")

    # 依赖关系
    depends_on = Column(JSON, comment="依赖的任务ID列表")
    blocks_tasks = Column(JSON, comment="阻塞的任务ID列表")

    # 索引优化
    __table_args__ = (
        Index("idx_task_status_priority", "status", "priority"),
        Index("idx_task_type_created", "task_type", "created_at"),
        Index("idx_task_batch_status", "batch_id", "status"),
        Index("idx_task_worker", "worker_id", "started_at"),
    )

    # 关联关系
    answer_sheet = relationship("AnswerSheet", back_populates="grading_tasks")

    def to_dict(self):
        """转换为字典"""
        return {
            "id": self.id,
            "answer_sheet_id": self.answer_sheet_id,
            "task_type": self.task_type,
            "priority": self.priority,
            "status": self.status,
            "progress": self.progress,
            "retry_count": self.retry_count,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": (
                self.completed_at.isoformat() if self.completed_at else None
            ),
        }


# 7. 模板使用记录
class TemplateUsage(Base):
    """模板使用记录表"""

    __tablename__ = "template_usages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    template_id = Column(
        Integer,
        ForeignKey("answer_sheet_templates.id"),
        nullable=False,
        comment="模板ID",
    )
    exam_id = Column(
        String(36), ForeignKey("exams.id"), nullable=False, comment="考试ID"
    )
    used_by = Column(
        String(36), ForeignKey("users.id"), nullable=False, comment="使用人"
    )
    used_at = Column(DateTime, default=datetime.utcnow, comment="使用时间")

    # 使用统计
    answer_sheets_count = Column(Integer, default=0, comment="处理的答题卡数量")
    success_rate = Column(Float, comment="识别成功率")
    average_confidence = Column(Float, comment="平均置信度")

    # 质量反馈
    quality_rating = Column(Integer, comment="模板质量评分1-5")
    feedback_comments = Column(Text, comment="使用反馈")

    # 索引优化
    __table_args__ = (
        Index("idx_usage_template_exam", "template_id", "exam_id"),
        Index("idx_usage_user_date", "used_by", "used_at"),
        Index("idx_usage_quality", "quality_rating"),
    )

    # 关联关系
    template = relationship("AnswerSheetTemplate", back_populates="usages")
    exam = relationship("Exam")
    user = relationship("User")


# 8. 系统配置表
class SystemConfig(Base):
    """系统配置表"""

    __tablename__ = "system_configs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    config_key = Column(String(100), unique=True, nullable=False, comment="配置键")
    config_value = Column(JSON, comment="配置值")
    description = Column(String(500), comment="配置说明")
    category = Column(String(50), comment="配置分类")

    # 访问控制
    is_public = Column(Boolean, default=False, comment="是否公开配置")
    required_role = Column(String(20), comment="访问所需角色")

    # 版本控制
    version = Column(Integer, default=1, comment="配置版本")
    is_active = Column(Boolean, default=True, comment="是否激活")

    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow, comment="创建时间")
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment="更新时间"
    )
    updated_by = Column(String(36), ForeignKey("users.id"), comment="更新人")

    # 索引
    __table_args__ = (
        Index("idx_config_key", "config_key"),
        Index("idx_config_category", "category"),
        Index("idx_config_active", "is_active"),
    )

    # 关联关系
    updater = relationship("User", foreign_keys=[updated_by])
