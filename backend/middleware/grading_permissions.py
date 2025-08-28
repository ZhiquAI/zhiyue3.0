"""阅卷权限管理模块
提供阅卷系统的细粒度权限控制
"""

from functools import wraps
from fastapi import HTTPException, status

from models.production_models import User


class GradingPermissionManager:
    """阅卷权限管理器"""
    
    # 阅卷角色权限映射
    GRADING_ROLE_PERMISSIONS = {
        'admin': [
            'create_review_task',
            'assign_reviewer', 
            'view_all_reviews',
            'manage_reviewers',
            'export_review_data',
            'configure_review_settings',
            'override_review_results',
            'manage_review_workflow'
        ],
        'head_teacher': [
            'create_review_task',
            'assign_reviewer',
            'view_department_reviews', 
            'manage_department_reviewers',
            'export_department_data',
            'configure_department_settings'
        ],
        'teacher': [
            'create_review_task',
            'view_own_reviews',
            'submit_review_results',
            'view_review_statistics'
        ],
        'senior_reviewer': [
            'review_papers',
            'assign_junior_reviewers',
            'view_review_quality',
            'mentor_reviewers',
            'escalate_disputes'
        ],
        'reviewer': [
            'review_papers',
            'submit_review_results',
            'view_own_statistics',
            'request_help'
        ],
        'assistant': [
            'view_review_progress',
            'export_basic_data'
        ]
    }
    
    # 阅卷资源权限要求
    GRADING_RESOURCE_PERMISSIONS = {
        'review_task': {
            'create': ['create_review_task'],
            'read': ['view_all_reviews', 'view_department_reviews', 
                    'view_own_reviews'],
            'update': ['manage_review_workflow', 'configure_review_settings'],
            'delete': ['manage_review_workflow']
        },
        'review_assignment': {
            'create': ['assign_reviewer'],
            'read': ['view_all_reviews', 'view_department_reviews'],
            'update': ['assign_reviewer', 'manage_reviewers'],
            'delete': ['manage_reviewers']
        },
        'review_result': {
            'create': ['submit_review_results'],
            'read': ['view_all_reviews', 'view_department_reviews', 
                    'view_own_reviews'],
            'update': ['override_review_results', 'submit_review_results'],
            'delete': ['override_review_results']
        }
    }
    
    # 复核类型权限
    REVIEW_TYPE_PERMISSIONS = {
        'double_review': ['reviewer', 'senior_reviewer', 'teacher', 
                         'head_teacher', 'admin'],
        'triple_review': ['senior_reviewer', 'teacher', 'head_teacher', 
                         'admin'],
        'quality_review': ['senior_reviewer', 'head_teacher', 'admin'],
        'dispute_review': ['senior_reviewer', 'head_teacher', 'admin'],
        'final_review': ['head_teacher', 'admin']
    }
    
    @classmethod
    def has_grading_permission(cls, user: User, permission: str) -> bool:
        """检查用户是否有指定的阅卷权限"""
        if not user or not user.role:
            return False
            
        user_permissions = cls.GRADING_ROLE_PERMISSIONS.get(user.role, [])
        return permission in user_permissions
    
    @classmethod
    def can_access_grading_resource(cls, user: User, resource: str,
                                    action: str) -> bool:
        """检查用户是否可以访问指定的阅卷资源"""
        if not user or not user.role:
            return False
            
        resource_perms = cls.GRADING_RESOURCE_PERMISSIONS.get(resource, {})
        required_perms = resource_perms.get(action, [])
        
        user_permissions = cls.GRADING_ROLE_PERMISSIONS.get(user.role, [])
        
        return any(perm in user_permissions for perm in required_perms)
    
    @classmethod
    def can_perform_review_type(cls, user: User, review_type: str) -> bool:
        """检查用户是否可以执行指定类型的复核"""
        if not user or not user.role:
            return False
            
        allowed_roles = cls.REVIEW_TYPE_PERMISSIONS.get(review_type, [])
        return user.role in allowed_roles
    
    @classmethod
    def check_reviewer_assignment_permission(cls, user: User, 
                                           target_user: User) -> bool:
        """检查用户是否可以分配复核员"""
        if not cls.has_grading_permission(user, 'assign_reviewer'):
            return False
            
        # 管理员可以分配任何人
        if user.role == 'admin':
            return True
            
        # 科组长可以分配本部门的人员
        if user.role == 'head_teacher':
            return target_user.role in ['teacher', 'reviewer', 'senior_reviewer']
            
        # 高级复核员可以分配普通复核员
        if user.role == 'senior_reviewer':
            return target_user.role == 'reviewer'
            
        return False


def require_grading_permissions(*permissions: str):
    """要求特定阅卷权限的装饰器"""
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
            
            # 检查权限
            for permission in permissions:
                if not GradingPermissionManager.has_grading_permission(
                    current_user, permission
                ):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"缺少权限: {permission}"
                    )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator


def require_grading_resource_access(resource: str, action: str):
    """要求特定阅卷资源访问权限的装饰器"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            current_user = kwargs.get('current_user')
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="需要登录"
                )
            
            if not GradingPermissionManager.can_access_grading_resource(
                current_user, resource, action
            ):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"无权限访问资源: {resource}.{action}"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator


def require_review_type_permission(review_type: str):
    """要求特定复核类型权限的装饰器"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            current_user = kwargs.get('current_user')
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="需要登录"
                )
            
            if not GradingPermissionManager.can_perform_review_type(
                current_user, review_type
            ):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"无权限执行复核类型: {review_type}"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator


# 创建全局权限管理器实例
grading_permission_manager = GradingPermissionManager()