"""增强的JWT验证和权限管理模块"""

import jwt
import redis
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from fastapi import HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from config.settings import settings
from models.production_models import User
import json
import hashlib
import logging

logger = logging.getLogger(__name__)

class JWTManager:
    """增强的JWT管理器"""
    
    def __init__(self):
        self.redis_client = redis.from_url(settings.REDIS_URL)
        self.security = HTTPBearer()
        
    def create_access_token(self, user_id: str, user_role: str, permissions: List[str] = None) -> str:
        """创建访问令牌"""
        now = datetime.utcnow()
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        
        payload = {
            "sub": user_id,
            "role": user_role,
            "permissions": permissions or [],
            "iat": now,
            "exp": expire,
            "iss": settings.JWT_ISSUER,
            "aud": settings.JWT_AUDIENCE,
            "type": "access",
            "jti": self._generate_jti(user_id, "access")
        }
        
        token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        
        # 将令牌存储到Redis中用于会话管理
        self._store_token_session(user_id, payload["jti"], "access", expire)
        
        return token
    
    def create_refresh_token(self, user_id: str) -> str:
        """创建刷新令牌"""
        now = datetime.utcnow()
        expire = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        
        payload = {
            "sub": user_id,
            "iat": now,
            "exp": expire,
            "iss": settings.JWT_ISSUER,
            "aud": settings.JWT_AUDIENCE,
            "type": "refresh",
            "jti": self._generate_jti(user_id, "refresh")
        }
        
        token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        
        # 存储刷新令牌
        self._store_token_session(user_id, payload["jti"], "refresh", expire)
        
        return token
    
    def verify_token(self, token: str, token_type: str = "access") -> Dict[str, Any]:
        """验证令牌"""
        try:
            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=[settings.ALGORITHM],
                audience=settings.JWT_AUDIENCE,
                issuer=settings.JWT_ISSUER
            )
            
            # 检查令牌类型
            if payload.get("type") != token_type:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"无效的令牌类型，期望: {token_type}"
                )
            
            # 检查令牌是否在会话中
            if not self._is_token_valid(payload["sub"], payload["jti"]):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="令牌已失效或被撤销"
                )
            
            return payload
            
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="令牌已过期"
            )
        except jwt.InvalidTokenError as e:
            logger.warning(f"无效令牌: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="无效令牌"
            )
    
    def refresh_access_token(self, refresh_token: str, db: Session) -> Dict[str, str]:
        """刷新访问令牌"""
        payload = self.verify_token(refresh_token, "refresh")
        user_id = payload["sub"]
        
        # 获取用户信息
        user = db.query(User).filter(User.id == user_id).first()
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="用户不存在或已被禁用"
            )
        
        # 获取用户权限
        from middleware.permissions import get_user_permissions
        permissions = get_user_permissions(user.role)
        
        # 创建新的访问令牌
        new_access_token = self.create_access_token(user_id, user.role, permissions)
        
        # 记录令牌刷新
        self._log_token_activity(user_id, "token_refresh")
        
        return {
            "access_token": new_access_token,
            "token_type": "bearer"
        }
    
    def revoke_token(self, user_id: str, jti: str = None):
        """撤销令牌"""
        if jti:
            # 撤销特定令牌
            self.redis_client.delete(f"token_session:{user_id}:{jti}")
        else:
            # 撤销用户所有令牌
            pattern = f"token_session:{user_id}:*"
            keys = self.redis_client.keys(pattern)
            if keys:
                self.redis_client.delete(*keys)
        
        self._log_token_activity(user_id, "token_revoke")
    
    def revoke_all_user_tokens(self, user_id: str):
        """撤销用户所有令牌"""
        self.revoke_token(user_id)
    
    def get_user_sessions(self, user_id: str) -> List[Dict[str, Any]]:
        """获取用户活跃会话"""
        pattern = f"token_session:{user_id}:*"
        keys = self.redis_client.keys(pattern)
        
        sessions = []
        for key in keys:
            session_data = self.redis_client.get(key)
            if session_data:
                data = json.loads(session_data)
                sessions.append({
                    "jti": data["jti"],
                    "token_type": data["token_type"],
                    "created_at": data["created_at"],
                    "expires_at": data["expires_at"]
                })
        
        return sessions
    
    def _generate_jti(self, user_id: str, token_type: str) -> str:
        """生成JWT ID"""
        timestamp = str(datetime.utcnow().timestamp())
        data = f"{user_id}:{token_type}:{timestamp}"
        return hashlib.sha256(data.encode()).hexdigest()[:16]
    
    def _store_token_session(self, user_id: str, jti: str, token_type: str, expire_time: datetime):
        """存储令牌会话信息"""
        session_data = {
            "jti": jti,
            "user_id": user_id,
            "token_type": token_type,
            "created_at": datetime.utcnow().isoformat(),
            "expires_at": expire_time.isoformat()
        }
        
        key = f"token_session:{user_id}:{jti}"
        ttl = int((expire_time - datetime.utcnow()).total_seconds())
        
        self.redis_client.setex(key, ttl, json.dumps(session_data))
    
    def _is_token_valid(self, user_id: str, jti: str) -> bool:
        """检查令牌是否有效"""
        key = f"token_session:{user_id}:{jti}"
        return self.redis_client.exists(key)
    
    def _log_token_activity(self, user_id: str, activity: str):
        """记录令牌活动"""
        log_data = {
            "user_id": user_id,
            "activity": activity,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # 存储到Redis列表中，保留最近100条记录
        key = f"token_activity:{user_id}"
        self.redis_client.lpush(key, json.dumps(log_data))
        self.redis_client.ltrim(key, 0, 99)
        self.redis_client.expire(key, 86400 * 30)  # 30天过期

class EnhancedPermissionMiddleware:
    """增强的权限验证中间件"""
    
    def __init__(self):
        self.jwt_manager = JWTManager()
        self.redis_client = redis.from_url(settings.REDIS_URL)
    
    async def verify_permissions(self, request: Request, required_permissions: List[str] = None) -> User:
        """验证用户权限"""
        # 获取令牌
        authorization = request.headers.get("Authorization")
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="缺少认证令牌"
            )
        
        token = authorization.split(" ")[1]
        
        # 验证令牌
        payload = self.jwt_manager.verify_token(token)
        user_id = payload["sub"]
        user_role = payload["role"]
        user_permissions = payload.get("permissions", [])
        
        # 检查权限缓存
        cached_permissions = self._get_cached_permissions(user_id)
        if cached_permissions:
            user_permissions = cached_permissions
        
        # 验证所需权限
        if required_permissions:
            if not self._has_required_permissions(user_permissions, required_permissions):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"权限不足，需要权限: {', '.join(required_permissions)}"
                )
        
        # 记录访问日志
        self._log_access(user_id, request.url.path, request.method)
        
        # 返回用户信息（这里简化处理，实际应该从数据库获取完整用户信息）
        user = User(id=user_id, role=user_role)
        return user
    
    def cache_user_permissions(self, user_id: str, permissions: List[str], ttl: int = 3600):
        """缓存用户权限"""
        key = f"user_permissions:{user_id}"
        self.redis_client.setex(key, ttl, json.dumps(permissions))
    
    def invalidate_user_permissions(self, user_id: str):
        """清除用户权限缓存"""
        key = f"user_permissions:{user_id}"
        self.redis_client.delete(key)
    
    def _get_cached_permissions(self, user_id: str) -> Optional[List[str]]:
        """获取缓存的权限"""
        key = f"user_permissions:{user_id}"
        cached = self.redis_client.get(key)
        if cached:
            return json.loads(cached)
        return None
    
    def _has_required_permissions(self, user_permissions: List[str], required_permissions: List[str]) -> bool:
        """检查是否具有所需权限"""
        return all(perm in user_permissions for perm in required_permissions)
    
    def _log_access(self, user_id: str, path: str, method: str):
        """记录访问日志"""
        log_data = {
            "user_id": user_id,
            "path": path,
            "method": method,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # 存储访问日志
        key = f"access_log:{user_id}"
        self.redis_client.lpush(key, json.dumps(log_data))
        self.redis_client.ltrim(key, 0, 999)  # 保留最近1000条记录
        self.redis_client.expire(key, 86400 * 7)  # 7天过期

# 全局实例
jwt_manager = JWTManager()
permission_middleware = EnhancedPermissionMiddleware()