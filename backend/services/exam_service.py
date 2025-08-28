"""考试服务"""

from typing import List, Optional
from sqlalchemy.orm import Session
from models.exam import Exam
from utils.logger import get_logger

logger = get_logger(__name__)

class ExamService:
    """考试服务类"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_exam_by_id(self, exam_id: int) -> Optional[Exam]:
        """根据ID获取考试"""
        try:
            return self.db.query(Exam).filter(Exam.id == exam_id).first()
        except Exception as e:
            logger.error(f"获取考试失败: {str(e)}")
            return None
    
    def get_all_exams(self) -> List[Exam]:
        """获取所有考试"""
        try:
            return self.db.query(Exam).all()
        except Exception as e:
            logger.error(f"获取考试列表失败: {str(e)}")
            return []
    
    def create_exam(self, exam_data: dict) -> Optional[Exam]:
        """创建考试"""
        try:
            exam = Exam(**exam_data)
            self.db.add(exam)
            self.db.commit()
            self.db.refresh(exam)
            return exam
        except Exception as e:
            logger.error(f"创建考试失败: {str(e)}")
            self.db.rollback()
            return None
    
    def update_exam(self, exam_id: int, exam_data: dict) -> Optional[Exam]:
        """更新考试"""
        try:
            exam = self.get_exam_by_id(exam_id)
            if not exam:
                return None
            
            for key, value in exam_data.items():
                if hasattr(exam, key):
                    setattr(exam, key, value)
            
            self.db.commit()
            self.db.refresh(exam)
            return exam
        except Exception as e:
            logger.error(f"更新考试失败: {str(e)}")
            self.db.rollback()
            return None
    
    def delete_exam(self, exam_id: int) -> bool:
        """删除考试"""
        try:
            exam = self.get_exam_by_id(exam_id)
            if not exam:
                return False
            
            self.db.delete(exam)
            self.db.commit()
            return True
        except Exception as e:
            logger.error(f"删除考试失败: {str(e)}")
            self.db.rollback()
            return False