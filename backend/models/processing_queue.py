"""处理队列模型"""

from enum import Enum
from sqlalchemy import Column, Integer, String, DateTime, Text, Enum as SQLEnum
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()


class ProcessingStatus(Enum):
    """处理状态枚举"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ProcessingQueue(Base):
    """处理队列模型"""
    __tablename__ = "processing_queue"
    
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(String(255), unique=True, nullable=False, comment="任务ID")
    task_type = Column(String(100), nullable=False, comment="任务类型")
    status = Column(
        SQLEnum(ProcessingStatus), 
        default=ProcessingStatus.PENDING, 
        comment="处理状态"
    )
    input_data = Column(Text, comment="输入数据")
    output_data = Column(Text, comment="输出数据")
    error_message = Column(Text, comment="错误信息")
    progress = Column(Integer, default=0, comment="进度百分比")
    created_at = Column(DateTime, default=datetime.utcnow, comment="创建时间")
    started_at = Column(DateTime, comment="开始时间")
    completed_at = Column(DateTime, comment="完成时间")
    updated_at = Column(
        DateTime, 
        default=datetime.utcnow, 
        onupdate=datetime.utcnow, 
        comment="更新时间"
    )
    
    def __repr__(self):
        return f"<ProcessingQueue(id={self.id}, task_id='{self.task_id}', status='{self.status}')>"
    
    def to_dict(self):
        """转换为字典"""
        return {
            'id': self.id,
            'task_id': self.task_id,
            'task_type': self.task_type,
            'status': self.status.value if self.status else None,
            'input_data': self.input_data,
            'output_data': self.output_data,
            'error_message': self.error_message,
            'progress': self.progress,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }