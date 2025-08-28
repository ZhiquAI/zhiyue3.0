"""学生服务"""

from typing import List, Optional
from sqlalchemy.orm import Session
from models.student import Student
from utils.logger import get_logger

logger = get_logger(__name__)


class StudentService:
    """学生服务类"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_student_by_id(self, student_id: int) -> Optional[Student]:
        """根据ID获取学生"""
        try:
            return self.db.query(Student).filter(Student.id == student_id).first()
        except Exception as e:
            logger.error(f"获取学生失败: {str(e)}")
            return None
    
    def get_all_students(self) -> List[Student]:
        """获取所有学生"""
        try:
            return self.db.query(Student).all()
        except Exception as e:
            logger.error(f"获取学生列表失败: {str(e)}")
            return []
    
    def create_student(self, student_data: dict) -> Optional[Student]:
        """创建学生"""
        try:
            student = Student(**student_data)
            self.db.add(student)
            self.db.commit()
            self.db.refresh(student)
            return student
        except Exception as e:
            logger.error(f"创建学生失败: {str(e)}")
            self.db.rollback()
            return None
    
    def update_student(self, student_id: int, student_data: dict) -> Optional[Student]:
        """更新学生"""
        try:
            student = self.get_student_by_id(student_id)
            if not student:
                return None
            
            for key, value in student_data.items():
                if hasattr(student, key):
                    setattr(student, key, value)
            
            self.db.commit()
            self.db.refresh(student)
            return student
        except Exception as e:
            logger.error(f"更新学生失败: {str(e)}")
            self.db.rollback()
            return None
    
    def delete_student(self, student_id: int) -> bool:
        """删除学生"""
        try:
            student = self.get_student_by_id(student_id)
            if not student:
                return False
            
            self.db.delete(student)
            self.db.commit()
            return True
        except Exception as e:
            logger.error(f"删除学生失败: {str(e)}")
            self.db.rollback()
            return False