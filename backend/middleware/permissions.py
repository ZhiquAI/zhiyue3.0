"""
权限管理中间件
"""

from fastapi import HTTPException, status, Depends
from functools import wraps
from typing import List, Callable, Dict, Any
from sqlalchemy.orm import Session

try:
    from backend.models.production_models import User
    from backend.database import get_db
except ImportError:
    from models.production_models import User
    from database import get_db

class PermissionManager:
    """权限管理器"""
    
    def __init__(self):
        # 定义角色权限映射
        self.role_permissions = {
            'admin': [
                'read', 'write', 'delete', 
                'manage_users', 'manage_system', 'manage_exams', 
                'view_all_data', 'grade_papers', 'export_data',
                'system_config', 'user_management'
            ],
            'teacher': [
                'read', 'write', 'manage_exams', 
                'grade_papers', 'view_own_data', 'export_data',
                'create_exam', 'edit_own_exam', 'view_student_results'
            ],
            'assistant': [
                'read', 'write', 'grade_papers', 
                'view_assigned_data', 'assist_grading'
            ],
            'student': [
                'read', 'view_own_results', 'submit_answers'
            ],
            'guest': [
                'read_public'
            ]
        }
        
        # 定义资源权限要求
        self.resource_permissions = {
            'exam_management': ['manage_exams'],
            'user_management': ['manage_users'],
            'system_config': ['manage_system'],
            'grading': ['grade_papers'],
            'data_export': ['export_data'],
            'student_results': ['view_student_results']
        }
    
    def has_permission(self, user_role: str, required_permissions: List[str]) -> bool:
        """检查用户是否具有所需权限"""
        user_perms = self.role_permissions.get(user_role, [])
        return all(perm in user_perms for perm in required_permissions)
    
    def has_role(self, user_role: str, allowed_roles: List[str]) -> bool:
        """检查用户角色是否在允许的角色列表中"""
        return user_role in allowed_roles
    
    def can_access_resource(self, user_role: str, resource: str) -> bool:
        """检查用户是否可以访问特定资源"""
        required_perms = self.resource_permissions.get(resource, [])
        return self.has_permission(user_role, required_perms)
    
    def check_resource_ownership(self, resource_user_id: str, current_user: User) -> bool:
        """检查资源所有权"""
        # 管理员可以访问所有资源
        if current_user.role == 'admin':
            return True
        
        # 检查是否是资源所有者
        return resource_user_id == current_user.id

# 全局权限管理器实例
permission_manager = PermissionManager()

# 权限装饰器
def require_permissions(permissions: List[str]):
    """权限检查装饰器"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # 从kwargs中获取current_user
            current_user = kwargs.get('current_user')
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="需要登录"
                )
            
            if not permission_manager.has_permission(current_user.role, permissions):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"权限不足，需要权限: {', '.join(permissions)}"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator

def require_role(allowed_roles: List[str]):
    """角色检查装饰器"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            current_user = kwargs.get('current_user')
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="需要登录"
                )
            
            if not permission_manager.has_role(current_user.role, allowed_roles):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"需要以下角色之一: {', '.join(allowed_roles)}"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator

def require_resource_access(resource: str):
    """资源访问权限装饰器"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            current_user = kwargs.get('current_user')
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="需要登录"
                )
            
            if not permission_manager.can_access_resource(current_user.role, resource):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"无权访问资源: {resource}"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator

# 权限依赖函数
def require_admin():
    """需要管理员权限的依赖"""
    def check_admin(current_user: User = Depends(lambda: None)):
        if not current_user or current_user.role != 'admin':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="需要管理员权限"
            )
        return current_user
    return check_admin

def require_teacher_or_admin():
    """需要教师或管理员权限的依赖"""
    def check_teacher_or_admin(current_user: User = Depends(lambda: None)):
        if not current_user or current_user.role not in ['teacher', 'admin']:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="需要教师或管理员权限"
            )
        return current_user
    return check_teacher_or_admin

def require_any_authenticated():
    """需要任何已认证用户的依赖"""
    def check_authenticated(current_user: User = Depends(lambda: None)):
        if not current_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="需要登录"
            )
        return current_user
    return check_authenticated

# 资源所有权检查函数
def check_exam_ownership(exam_id: str, current_user: User, db: Session):
    """检查考试所有权"""
    try:
        from backend.models.production_models import Exam
    except ImportError:
        from models.production_models import Exam
    
    if current_user.role == 'admin':
        return True
    
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="考试不存在"
        )
    
    return exam.creator_id == current_user.id

def check_answer_sheet_access(answer_sheet_id: str, current_user: User, db: Session):
    """检查答题卡访问权限"""
    try:
        from backend.models.production_models import AnswerSheet
    except ImportError:
        from models.production_models import AnswerSheet
    
    if current_user.role == 'admin':
        return True
    
    answer_sheet = db.query(AnswerSheet).filter(AnswerSheet.id == answer_sheet_id).first()
    if not answer_sheet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="答题卡不存在"
        )
    
    # 教师可以访问自己创建的考试的答题卡
    if current_user.role == 'teacher':
        return answer_sheet.exam.creator_id == current_user.id
    
    # 学生只能访问自己的答题卡
    if current_user.role == 'student':
        return answer_sheet.student_id == current_user.id
    
    return False

# 权限检查工具函数
def get_user_permissions(user_role: str) -> List[str]:
    """获取用户权限列表"""
    return permission_manager.role_permissions.get(user_role, [])

def get_available_roles() -> List[str]:
    """获取可用角色列表"""
    return list(permission_manager.role_permissions.keys())

def validate_role(role: str) -> bool:
    """验证角色是否有效"""
    return role in permission_manager.role_permissions

# 权限信息API模型
class PermissionInfo:
    """权限信息类"""
    
    @staticmethod
    def get_role_info(role: str) -> Dict[str, Any]:
        """获取角色信息"""
        if role not in permission_manager.role_permissions:
            return {}
        
        return {
            "role": role,
            "permissions": permission_manager.role_permissions[role],
            "description": {
                "admin": "系统管理员，拥有所有权限",
                "teacher": "教师，可以创建和管理考试",
                "assistant": "助教，可以协助阅卷",
                "student": "学生，可以查看自己的成绩",
                "guest": "访客，只能查看公开内容"
            }.get(role, "")
        }
    
    @staticmethod
    def get_all_roles_info() -> List[Dict[str, Any]]:
        """获取所有角色信息"""
        return [PermissionInfo.get_role_info(role) for role in get_available_roles()]
