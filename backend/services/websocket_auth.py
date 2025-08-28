"""
WebSocket认证增强模块
为WebSocket连接提供JWT认证和权限控制
"""

import jwt
import logging
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from fastapi import WebSocket, HTTPException, status
from config.settings import settings

logger = logging.getLogger(__name__)

class WebSocketAuth:
    """WebSocket认证管理器"""
    
    def __init__(self):
        self.secret_key = settings.SECRET_KEY
        self.algorithm = "HS256"
        self.token_expire_minutes = 60 * 24 * 7  # 7天
    
    async def authenticate_websocket(self, token: Optional[str]) -> Optional[Dict[str, Any]]:
        """
        WebSocket连接认证
        
        Args:
            token: JWT token字符串
            
        Returns:
            用户信息字典，认证失败返回None
        """
        if not token:
            logger.warning("WebSocket connection attempt without token")
            return None
        
        try:
            # 解码JWT token
            payload = jwt.decode(
                token, 
                self.secret_key, 
                algorithms=[self.algorithm]
            )
            
            # 验证token是否过期
            exp = payload.get("exp")
            if exp and datetime.utcfromtimestamp(exp) < datetime.utcnow():
                logger.warning("WebSocket token expired")
                return None
            
            # 提取用户信息
            user_info = {
                "user_id": payload.get("sub"),
                "username": payload.get("username"),
                "role": payload.get("role", "user"),
                "permissions": payload.get("permissions", []),
                "exp": exp
            }
            
            logger.info(f"WebSocket authentication successful for user: {user_info['user_id']}")
            return user_info
            
        except jwt.ExpiredSignatureError:
            logger.warning("WebSocket token expired during decode")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid WebSocket token: {e}")
            return None
        except Exception as e:
            logger.error(f"WebSocket authentication error: {e}")
            return None
    
    def has_permission(self, user_info: Dict[str, Any], required_permission: str) -> bool:
        """
        检查用户权限
        
        Args:
            user_info: 用户信息
            required_permission: 需要的权限
            
        Returns:
            是否有权限
        """
        if not user_info:
            return False
        
        user_permissions = user_info.get("permissions", [])
        user_role = user_info.get("role", "user")
        
        # 管理员拥有所有权限
        if user_role == "admin":
            return True
        
        # 检查具体权限
        return required_permission in user_permissions
    
    def can_access_exam(self, user_info: Dict[str, Any], exam_id: str) -> bool:
        """
        检查用户是否可以访问特定考试
        
        Args:
            user_info: 用户信息
            exam_id: 考试ID
            
        Returns:
            是否可以访问
        """
        if not user_info:
            return False
        
        # 管理员可以访问所有考试
        if user_info.get("role") == "admin":
            return True
        
        # 教师可以访问自己创建的考试
        if "exam_manage" in user_info.get("permissions", []):
            return True
        
        # 阅卷员可以访问分配给自己的考试
        if "grading" in user_info.get("permissions", []):
            # 这里应该查询数据库检查用户是否被分配到该考试
            # 暂时返回True，实际应该实现具体的权限检查逻辑
            return True
        
        return False
    
    async def refresh_token(self, old_token: str) -> Optional[str]:
        """
        刷新WebSocket token
        
        Args:
            old_token: 旧的token
            
        Returns:
            新的token，失败返回None
        """
        user_info = await self.authenticate_websocket(old_token)
        if not user_info:
            return None
        
        # 生成新token
        new_payload = {
            "sub": user_info["user_id"],
            "username": user_info["username"],
            "role": user_info["role"],
            "permissions": user_info["permissions"],
            "exp": datetime.utcnow() + timedelta(minutes=self.token_expire_minutes),
            "iat": datetime.utcnow()
        }
        
        try:
            new_token = jwt.encode(new_payload, self.secret_key, algorithm=self.algorithm)
            logger.info(f"Token refreshed for user: {user_info['user_id']}")
            return new_token
        except Exception as e:
            logger.error(f"Failed to refresh token: {e}")
            return None

# 权限常量
class WebSocketPermissions:
    """WebSocket权限常量"""
    
    # 系统监控权限
    SYSTEM_MONITOR = "system_monitor"
    
    # 质量监控权限
    QUALITY_MONITOR = "quality_monitor"
    
    # 进度监控权限
    PROGRESS_MONITOR = "progress_monitor"
    
    # 阅卷工作台权限
    GRADING_WORKSPACE = "grading_workspace"
    
    # 考试管理权限
    EXAM_MANAGE = "exam_manage"
    
    # 用户管理权限
    USER_MANAGE = "user_manage"

# 全局认证实例
websocket_auth = WebSocketAuth()