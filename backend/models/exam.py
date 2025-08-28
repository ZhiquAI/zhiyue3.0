"""考试模型"""

from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()


class Exam(Base):
    """考试模型"""
    __tablename__ = "exams"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, comment="考试名称")
    description = Column(Text, comment="考试描述")
    subject = Column(String(100), comment="考试科目")
    grade = Column(String(50), comment="年级")
    class_name = Column(String(100), comment="班级")
    total_score = Column(Integer, default=100, comment="总分")
    duration = Column(Integer, comment="考试时长(分钟)")
    exam_date = Column(DateTime, comment="考试日期")
    created_at = Column(DateTime, default=datetime.utcnow, comment="创建时间")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment="更新时间")
    is_active = Column(Boolean, default=True, comment="是否激活")
    
    def __repr__(self):
        return f"<Exam(id={self.id}, name='{self.name}', subject='{self.subject}')>"
    
    def to_dict(self):
        """转换为字典"""
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'subject': self.subject,
            'grade': self.grade,
            'class_name': self.class_name,
            'total_score': self.total_score,
            'duration': self.duration,
            'exam_date': self.exam_date.isoformat() if self.exam_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'is_active': self.is_active
        }