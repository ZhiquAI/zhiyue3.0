"""
文件存储模型 - 智阅AI后端存储系统
处理试卷、答题卡等文件的存储和管理
"""

from sqlalchemy import Column, String, Integer, DateTime, Text, Boolean, JSON, ForeignKey, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import hashlib
import os

Base = declarative_base()

class FileStorage(Base):
    """文件存储基础模型"""
    __tablename__ = 'file_storage'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    original_filename = Column(String(255), nullable=False, comment='原始文件名')
    stored_filename = Column(String(255), nullable=False, comment='存储文件名')
    file_path = Column(String(500), nullable=False, comment='文件存储路径')
    file_size = Column(Integer, nullable=False, comment='文件大小(字节)')
    file_hash = Column(String(64), nullable=False, comment='文件SHA256哈希值')
    mime_type = Column(String(100), nullable=False, comment='MIME类型')
    file_extension = Column(String(10), nullable=False, comment='文件扩展名')
    
    # 文件分类和用途
    file_category = Column(String(50), nullable=False, comment='文件类别: paper/answer_sheet/reference')
    file_purpose = Column(String(50), nullable=False, comment='文件用途: original/processed/thumbnail')
    
    # 关联信息
    exam_id = Column(String(36), ForeignKey('exams.id'), nullable=True, comment='关联考试ID')
    uploaded_by = Column(String(36), ForeignKey('users.id'), nullable=False, comment='上传用户ID')
    
    # 处理状态
    processing_status = Column(String(20), default='pending', comment='处理状态: pending/processing/completed/failed')
    processing_result = Column(JSON, comment='处理结果JSON')
    error_message = Column(Text, comment='错误信息')
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow, comment='创建时间')
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment='更新时间')
    
    # 存储配置
    storage_provider = Column(String(20), default='local', comment='存储提供商: local/oss/s3')
    storage_bucket = Column(String(100), comment='存储桶名称')
    storage_region = Column(String(50), comment='存储区域')
    
    # 访问控制
    is_public = Column(Boolean, default=False, comment='是否公开访问')
    access_token = Column(String(64), comment='访问令牌')
    expires_at = Column(DateTime, comment='过期时间')
    
    # 备份和归档
    is_archived = Column(Boolean, default=False, comment='是否已归档')
    archive_path = Column(String(500), comment='归档路径')
    backup_status = Column(String(20), default='none', comment='备份状态')
    
    # 索引优化
    __table_args__ = (
        Index('idx_file_hash', 'file_hash'),
        Index('idx_exam_category', 'exam_id', 'file_category'),
        Index('idx_upload_time', 'created_at'),
        Index('idx_processing_status', 'processing_status'),
    )
    
    # 关联关系
    exam = relationship("Exam", back_populates="files")
    uploader = relationship("User", back_populates="uploaded_files")

class PaperDocument(Base):
    """试卷文档模型"""
    __tablename__ = 'paper_documents'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    exam_id = Column(String(36), ForeignKey('exams.id'), nullable=False)
    file_id = Column(String(36), ForeignKey('file_storage.id'), nullable=False)
    
    # 试卷信息
    paper_type = Column(String(20), nullable=False, comment='试卷类型: original/reference_answer')
    page_count = Column(Integer, comment='页数')
    total_questions = Column(Integer, comment='题目总数')
    total_points = Column(Integer, comment='总分')
    
    # OCR处理结果
    ocr_status = Column(String(20), default='pending', comment='OCR状态')
    ocr_result = Column(JSON, comment='OCR识别结果')
    ocr_confidence = Column(Integer, comment='OCR置信度')
    
    # 题目解析结果
    questions_parsed = Column(JSON, comment='解析的题目信息')
    question_regions = Column(JSON, comment='题目区域坐标')
    
    # 质量评估
    image_quality_score = Column(Integer, comment='图像质量评分')
    clarity_score = Column(Integer, comment='清晰度评分')
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关联关系
    exam = relationship("Exam", back_populates="paper_documents")
    file = relationship("FileStorage")

class AnswerSheet(Base):
    """答题卡模型"""
    __tablename__ = 'answer_sheets'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    exam_id = Column(String(36), ForeignKey('exams.id'), nullable=False)
    file_id = Column(String(36), ForeignKey('file_storage.id'), nullable=False)
    
    # 学生信息
    student_id = Column(String(50), comment='学生ID/学号')
    student_name = Column(String(100), comment='学生姓名')
    class_name = Column(String(50), comment='班级')
    
    # 答题卡信息
    sheet_number = Column(String(50), comment='答题卡编号')
    page_count = Column(Integer, comment='页数')
    
    # 识别状态
    recognition_status = Column(String(20), default='pending', comment='识别状态')
    recognition_result = Column(JSON, comment='识别结果')
    recognition_confidence = Column(Integer, comment='识别置信度')
    
    # 答案提取
    extracted_answers = Column(JSON, comment='提取的答案')
    answer_regions = Column(JSON, comment='答案区域坐标')
    
    # 质量检查
    quality_issues = Column(JSON, comment='质量问题列表')
    needs_manual_review = Column(Boolean, default=False, comment='需要人工复核')
    
    # 评分结果
    grading_status = Column(String(20), default='pending', comment='评分状态')
    scores = Column(JSON, comment='各题得分')
    total_score = Column(Integer, comment='总分')
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 索引
    __table_args__ = (
        Index('idx_exam_student', 'exam_id', 'student_id'),
        Index('idx_recognition_status', 'recognition_status'),
        Index('idx_grading_status', 'grading_status'),
    )
    
    # 关联关系
    exam = relationship("Exam", back_populates="answer_sheets")
    file = relationship("FileStorage")

class ProcessingQueue(Base):
    """文件处理队列"""
    __tablename__ = 'processing_queue'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    file_id = Column(String(36), ForeignKey('file_storage.id'), nullable=False)
    
    # 处理任务信息
    task_type = Column(String(50), nullable=False, comment='任务类型: ocr/recognition/grading')
    priority = Column(Integer, default=5, comment='优先级(1-10)')
    
    # 处理状态
    status = Column(String(20), default='queued', comment='状态: queued/processing/completed/failed')
    worker_id = Column(String(100), comment='处理工作节点ID')
    
    # 时间信息
    queued_at = Column(DateTime, default=datetime.utcnow, comment='入队时间')
    started_at = Column(DateTime, comment='开始处理时间')
    completed_at = Column(DateTime, comment='完成时间')
    
    # 重试机制
    retry_count = Column(Integer, default=0, comment='重试次数')
    max_retries = Column(Integer, default=3, comment='最大重试次数')
    
    # 处理结果
    result = Column(JSON, comment='处理结果')
    error_message = Column(Text, comment='错误信息')
    
    # 索引
    __table_args__ = (
        Index('idx_status_priority', 'status', 'priority'),
        Index('idx_task_type', 'task_type'),
        Index('idx_queued_time', 'queued_at'),
    )
    
    # 关联关系
    file = relationship("FileStorage")