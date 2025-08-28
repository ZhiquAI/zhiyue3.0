"""认证服务"""

from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from db_connection import get_db
from utils.logger import get_logger

logger = get_logger(__name__)
security = HTTPBearer()


class AuthService:
    """认证服务类"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def verify_token(self, token: str) -> Optional[dict]:
        """验证令牌"""
        try:
            # 这里应该实现实际的令牌验证逻辑
            # 目前返回一个模拟用户
            return {
                "user_id": 1,
                "username": "admin",
                "email": "admin@example.com"
            }
        except Exception as e:
            logger.error(f"令牌验证失败: {str(e)}")
            return None
    
    def authenticate_user(self, username: str, password: str) -> Optional[dict]:
        """用户认证"""
        try:
            # 这里应该实现实际的用户认证逻辑
            # 目前返回一个模拟认证结果
            if username == "admin" and password == "admin":
                return {
                    "user_id": 1,
                    "username": "admin",
                    "email": "admin@example.com"
                }
            return None
        except Exception as e:
            logger.error(f"用户认证失败: {str(e)}")
            return None


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> dict:
    """获取当前用户"""
    auth_service = AuthService(db)
    user = auth_service.verify_token(credentials.credentials)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的认证凭据",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user


def get_optional_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[dict]:
    """获取当前用户（可选）"""
    if not credentials:
        return None
    
    auth_service = AuthService(db)
    return auth_service.verify_token(credentials.credentials)