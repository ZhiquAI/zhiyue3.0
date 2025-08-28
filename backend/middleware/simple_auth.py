"""
简化的认证中间件
用于新的统一API系统
"""

from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
import jwt
import logging

from backend.config.models import UserRole

logger = logging.getLogger(__name__)
security = HTTPBearer()

# 简化的用户类，用于测试
class CurrentUser:
    def __init__(self, id: str, username: str, name: str, role: UserRole, email: str = None):
        self.id = id
        self.username = username
        self.name = name
        self.role = role
        self.email = email
        
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username, 
            'name': self.name,
            'role': self.role.value if isinstance(self.role, UserRole) else self.role,
            'email': self.email
        }

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> CurrentUser:
    """
    获取当前用户（简化版本，用于测试）
    在生产环境中应该验证JWT token
    """
    try:
        token = credentials.credentials
        
        # 这里应该解析和验证JWT token
        # 为了测试，我们返回一个模拟用户
        if token:
            return CurrentUser(
                id='demo-user-id',
                username='demo',
                name='演示用户',
                role=UserRole.TEACHER,
                email='demo@zhiyue.ai'
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="无效的认证令牌"
            )
    except Exception as e:
        logger.error(f"用户认证失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="认证失败"
        )

async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))
) -> Optional[CurrentUser]:
    """
    获取当前用户（可选）
    如果没有提供token则返回None
    """
    if not credentials:
        return None
    
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None

# 权限检查函数
def require_role(*allowed_roles: UserRole):
    """
    需要特定角色的装饰器
    """
    def dependency(current_user: CurrentUser = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="权限不足"
            )
        return current_user
    return dependency

def require_admin():
    """需要管理员权限"""
    return require_role(UserRole.ADMIN)

def require_teacher_or_admin():
    """需要教师或管理员权限"""
    return require_role(UserRole.TEACHER, UserRole.ADMIN)

def require_any_authenticated():
    """需要任何已认证用户"""
    return Depends(get_current_user)