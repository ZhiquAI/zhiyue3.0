"""
生产环境数据库模型优化
"""

from sqlalchemy import Column, String, Integer, DateTime, Text, Boolean, JSON, ForeignKey, Index, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

Base = declarative_base()

class Exam(Base):
    """考试主表 - 优化版"""
    __tablename__ = 'exams'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False, comment='考试名称')
    subject = Column(String(50), nullable=False, comment='科目')
    grade = Column(String(50), nullable=False, comment='年级')
    status = Column(String(20), nullable=False, default='待配置', comment='考试状态')
    
    # 试卷配置
    paper_config = Column(JSON, comment='试卷配置信息')
    grading_config = Column(JSON, comment='评分配置')
    
    # 统计信息
    total_students = Column(Integer, default=0, comment='参考学生数')
    completed_count = Column(Integer, default=0, comment='已完成阅卷数')
    avg_score = Column(Float, comment='平均分')
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String(36), ForeignKey('users.id'), nullable=False)
    
    # 索引优化
    __table_args__ = (
        Index('idx_exam_status_created', 'status', 'created_at'),
        Index('idx_exam_creator_subject', 'created_by', 'subject'),
    )
    
    # 关联关系
    creator = relationship("User", back_populates="created_exams")
    answer_sheets = relationship("AnswerSheet", back_populates="exam")
    students = relationship("Student", back_populates="exam")

class AnswerSheet(Base):
    """答题卡表 - 生产优化版"""
    __tablename__ = 'answer_sheets'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    exam_id = Column(String(36), ForeignKey('exams.id'), nullable=False)
    
    # 学生信息关联
    student_uuid = Column(String(36), ForeignKey('students.id'), comment='学生信息ID')
    # 冗余字段，用于快速查询和兼容性
    student_id = Column(String(50), comment='学号')
    student_name = Column(String(100), comment='学生姓名')
    class_name = Column(String(50), comment='班级')
    
    # 文件信息
    original_file_path = Column(String(500), nullable=False, comment='原始文件路径')
    processed_file_path = Column(String(500), comment='处理后文件路径')
    file_hash = Column(String(64), comment='文件哈希值')
    
    # OCR结果
    ocr_status = Column(String(20), default='pending', comment='OCR状态')
    ocr_result = Column(JSON, comment='OCR识别结果')
    ocr_confidence = Column(Float, comment='OCR置信度')
    
    # 题目分割结果
    segmented_questions = Column(JSON, comment='题目分割结果')
    segmentation_quality = Column(JSON, comment='分割质量评估')
    
    # 评分结果
    grading_status = Column(String(20), default='pending', comment='评分状态')
    objective_score = Column(Float, comment='客观题得分')
    subjective_scores = Column(JSON, comment='主观题得分详情')
    total_score = Column(Float, comment='总分')
    grading_details = Column(JSON, comment='详细评分结果和质量评估')
    
    # 质量控制
    quality_issues = Column(JSON, comment='质量问题')
    needs_review = Column(Boolean, default=False, comment='需要人工复核')
    reviewed_by = Column(String(36), ForeignKey('users.id'), comment='复核人')
    reviewed_at = Column(DateTime, comment='复核时间')
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 性能优化索引
    __table_args__ = (
        Index('idx_answer_exam_student', 'exam_id', 'student_id'),
        Index('idx_answer_status', 'grading_status'),
        Index('idx_answer_review', 'needs_review', 'reviewed_at'),
        Index('idx_answer_score', 'total_score'),
    )
    
    # 关联关系
    exam = relationship("Exam", back_populates="answer_sheets")
    student = relationship("Student", back_populates="answer_sheets")
    reviewer = relationship("User", foreign_keys=[reviewed_by])
    grading_tasks = relationship("GradingTask", back_populates="answer_sheet")

class GradingTask(Base):
    """评分任务队列"""
    __tablename__ = 'grading_tasks'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    answer_sheet_id = Column(String(36), ForeignKey('answer_sheets.id'), nullable=False)
    task_type = Column(String(50), nullable=False, comment='任务类型: ocr/grading/review')
    priority = Column(Integer, default=5, comment='优先级1-10')
    
    status = Column(String(20), default='pending', comment='任务状态')
    worker_id = Column(String(100), comment='处理节点ID')
    
    # 处理时间
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime, comment='开始处理时间')
    completed_at = Column(DateTime, comment='完成时间')
    
    # 重试机制
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    error_message = Column(Text, comment='错误信息')
    
    __table_args__ = (
        Index('idx_task_status_priority', 'status', 'priority'),
        Index('idx_task_created', 'created_at'),
    )
    
    # 关联关系
    answer_sheet = relationship("AnswerSheet", back_populates="grading_tasks")

class Student(Base):
    """学生信息表"""
    __tablename__ = 'students'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = Column(String(50), unique=True, nullable=False, comment='学号/准考证号')
    name = Column(String(100), nullable=False, comment='学生姓名')
    class_name = Column(String(50), nullable=False, comment='班级')
    grade = Column(String(50), comment='年级')
    school = Column(String(200), comment='学校')
    
    # 额外信息
    gender = Column(String(10), comment='性别')
    phone = Column(String(20), comment='联系电话')
    email = Column(String(255), comment='邮箱')
    parent_phone = Column(String(20), comment='家长电话')
    address = Column(String(500), comment='地址')
    
    # 考试相关
    exam_id = Column(String(36), ForeignKey('exams.id'), nullable=False, comment='关联考试')
    barcode_data = Column(String(500), comment='条形码数据')
    
    # 状态和时间戳
    is_active = Column(Boolean, default=True, comment='是否有效')
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String(36), ForeignKey('users.id'), nullable=False)
    
    # 索引优化
    __table_args__ = (
        Index('idx_student_id_exam', 'student_id', 'exam_id'),
        Index('idx_student_class_exam', 'class_name', 'exam_id'),
        Index('idx_student_name_exam', 'name', 'exam_id'),
    )
    
    # 关联关系
    exam = relationship("Exam", back_populates="students")
    creator = relationship("User", foreign_keys=[created_by])
    answer_sheets = relationship("AnswerSheet", back_populates="student")

class User(Base):
    """用户表"""
    __tablename__ = 'users'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String(100), unique=True, nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False, comment='密码哈希')
    name = Column(String(100), nullable=False, comment='真实姓名')
    role = Column(String(20), nullable=False, default='teacher', comment='角色')
    
    # 教师信息
    school = Column(String(200), comment='学校')
    subject = Column(String(50), comment='任教科目')
    grades = Column(JSON, comment='任教年级')
    
    # 状态和时间戳
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False, comment='邮箱验证状态')
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime, comment='最后登录时间')
    
    # 索引优化
    __table_args__ = (
        Index('idx_user_username', 'username'),
        Index('idx_user_email', 'email'),
        Index('idx_user_active_role', 'is_active', 'role'),
    )
    
    # 关联关系
    created_exams = relationship("Exam", back_populates="creator")
    reviewed_answer_sheets = relationship("AnswerSheet", foreign_keys="AnswerSheet.reviewed_by")
    created_templates = relationship("AnswerSheetTemplate", foreign_keys="AnswerSheetTemplate.created_by", back_populates="creator")

class AnswerSheetTemplate(Base):
    """答题卡模板表"""
    __tablename__ = 'answer_sheet_templates'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, comment='模板名称')
    description = Column(String(500), comment='模板描述')
    subject = Column(String(50), comment='科目')
    grade_level = Column(String(20), comment='年级')
    exam_type = Column(String(50), comment='考试类型')
    
    # 模板配置
    template_data = Column(JSON, nullable=False, comment='模板配置数据')
    page_width = Column(Integer, default=210, comment='页面宽度(mm)')
    page_height = Column(Integer, default=297, comment='页面高度(mm)')
    dpi = Column(Integer, default=300, comment='分辨率')
    
    # 状态和时间戳
    is_active = Column(Boolean, default=True, comment='是否激活')
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String(36), ForeignKey('users.id'), nullable=False)
    updated_by = Column(String(36), ForeignKey('users.id'), nullable=False)
    
    # 索引优化
    __table_args__ = (
        Index('idx_template_name_creator', 'name', 'created_by'),
        Index('idx_template_subject_grade', 'subject', 'grade_level'),
        Index('idx_template_active', 'is_active'),
    )
    
    # 关联关系
    creator = relationship("User", foreign_keys=[created_by], back_populates="created_templates")
    updater = relationship("User", foreign_keys=[updated_by])
    usages = relationship("TemplateUsage", back_populates="template")

class TemplateUsage(Base):
    """模板使用记录表"""
    __tablename__ = 'template_usages'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    template_id = Column(Integer, ForeignKey('answer_sheet_templates.id'), nullable=False)
    exam_id = Column(String(36), ForeignKey('exams.id'), nullable=False)
    used_by = Column(String(36), ForeignKey('users.id'), nullable=False)
    used_at = Column(DateTime, default=datetime.utcnow)
    
    # 使用统计
    usage_count = Column(Integer, default=1, comment='使用次数')
    
    # 索引优化
    __table_args__ = (
        Index('idx_usage_template_exam', 'template_id', 'exam_id'),
        Index('idx_usage_user_date', 'used_by', 'used_at'),
    )
    
    # 关联关系
    template = relationship("AnswerSheetTemplate", back_populates="usages")
    exam = relationship("Exam")
    user = relationship("User")