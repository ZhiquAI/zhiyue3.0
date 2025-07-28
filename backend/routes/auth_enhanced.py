"""增强的认证路由"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from typing import Dict, Any, List
from pydantic import BaseModel, EmailStr
from datetime import datetime
import logging

from database import get_db
from models.production_models import User
from middleware.jwt_enhanced import jwt_manager, permission_middleware
from middleware.permissions import get_user_permissions, validate_role
from auth import verify_password, get_password_hash, validate_password_strength

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["认证增强"])
security = HTTPBearer()

# Pydantic模型
class TokenRefreshRequest(BaseModel):
    refresh_token: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user_info: Dict[str, Any]

class SessionInfo(BaseModel):
    jti: str
    token_type: str
    created_at: str
    expires_at: str

class UserSessionsResponse(BaseModel):
    active_sessions: List[SessionInfo]
    total_count: int

class SecurityLogEntry(BaseModel):
    activity: str
    timestamp: str
    details: Dict[str, Any] = {}

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str

class RoleUpdateRequest(BaseModel):
    user_id: str
    new_role: str
    reason: str = ""

@router.post("/login-enhanced", response_model=TokenResponse)
async def enhanced_login(
    request: Request,
    username: str,
    password: str,
    db: Session = Depends(get_db)
):
    """增强登录接口"""
    # 查找用户
    user = db.query(User).filter(
        (User.username == username) | (User.email == username)
    ).first()
    
    if not user or not verify_password(password, user.hashed_password):
        logger.warning(f"登录失败: {username} from {request.client.host}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="账户已被禁用"
        )
    
    # 获取用户权限
    permissions = get_user_permissions(user.role)
    
    # 创建令牌
    access_token = jwt_manager.create_access_token(
        user_id=user.id,
        user_role=user.role,
        permissions=permissions
    )
    refresh_token = jwt_manager.create_refresh_token(user.id)
    
    # 缓存用户权限
    permission_middleware.cache_user_permissions(user.id, permissions)
    
    # 更新最后登录时间
    user.last_login = datetime.utcnow()
    db.commit()
    
    # 记录登录日志
    logger.info(f"用户登录成功: {user.username} ({user.id})")
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=30 * 60,  # 30分钟
        user_info={
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "permissions": permissions,
            "last_login": user.last_login.isoformat() if user.last_login else None
        }
    )

@router.post("/refresh", response_model=Dict[str, str])
async def refresh_token(
    request: TokenRefreshRequest,
    db: Session = Depends(get_db)
):
    """刷新访问令牌"""
    try:
        result = jwt_manager.refresh_access_token(request.refresh_token, db)
        logger.info("令牌刷新成功")
        return result
    except Exception as e:
        logger.error(f"令牌刷新失败: {str(e)}")
        raise

@router.post("/logout")
async def logout(
    request: Request,
    current_user: User = Depends(permission_middleware.verify_permissions)
):
    """登出"""
    # 获取当前令牌的JTI
    authorization = request.headers.get("Authorization", "")
    if authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        try:
            payload = jwt_manager.verify_token(token)
            jti = payload.get("jti")
            # 撤销当前令牌
            jwt_manager.revoke_token(current_user.id, jti)
        except:
            pass
    
    # 清除权限缓存
    permission_middleware.invalidate_user_permissions(current_user.id)
    
    logger.info(f"用户登出: {current_user.id}")
    return {"message": "登出成功"}

@router.post("/logout-all")
async def logout_all(
    current_user: User = Depends(permission_middleware.verify_permissions)
):
    """登出所有设备"""
    # 撤销用户所有令牌
    jwt_manager.revoke_all_user_tokens(current_user.id)
    
    # 清除权限缓存
    permission_middleware.invalidate_user_permissions(current_user.id)
    
    logger.info(f"用户全设备登出: {current_user.id}")
    return {"message": "已登出所有设备"}

@router.get("/sessions", response_model=UserSessionsResponse)
async def get_user_sessions(
    current_user: User = Depends(permission_middleware.verify_permissions)
):
    """获取用户活跃会话"""
    sessions = jwt_manager.get_user_sessions(current_user.id)
    
    return UserSessionsResponse(
        active_sessions=[SessionInfo(**session) for session in sessions],
        total_count=len(sessions)
    )

@router.delete("/sessions/{jti}")
async def revoke_session(
    jti: str,
    current_user: User = Depends(permission_middleware.verify_permissions)
):
    """撤销特定会话"""
    jwt_manager.revoke_token(current_user.id, jti)
    logger.info(f"会话已撤销: {jti} for user {current_user.id}")
    return {"message": "会话已撤销"}

@router.get("/security-logs")
async def get_security_logs(
    limit: int = 50,
    current_user: User = Depends(permission_middleware.verify_permissions)
):
    """获取安全日志"""
    # 这里可以从Redis或数据库获取安全日志
    # 简化实现，返回空列表
    return {"logs": [], "total": 0}

@router.post("/change-password")
async def change_password(
    request: PasswordChangeRequest,
    current_user: User = Depends(permission_middleware.verify_permissions),
    db: Session = Depends(get_db)
):
    """修改密码"""
    # 获取完整用户信息
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    
    # 验证当前密码
    if not verify_password(request.current_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="当前密码错误"
        )
    
    # 验证新密码强度
    if not validate_password_strength(request.new_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="新密码不符合安全要求"
        )
    
    # 更新密码
    user.hashed_password = get_password_hash(request.new_password)
    user.updated_at = datetime.utcnow()
    db.commit()
    
    # 撤销所有现有令牌，强制重新登录
    jwt_manager.revoke_all_user_tokens(user.id)
    permission_middleware.invalidate_user_permissions(user.id)
    
    logger.info(f"密码已更改: {user.id}")
    return {"message": "密码修改成功，请重新登录"}

@router.get("/permissions")
async def get_current_permissions(
    current_user: User = Depends(permission_middleware.verify_permissions)
):
    """获取当前用户权限"""
    permissions = get_user_permissions(current_user.role)
    
    return {
        "user_id": current_user.id,
        "role": current_user.role,
        "permissions": permissions,
        "cached": permission_middleware._get_cached_permissions(current_user.id) is not None
    }

@router.post("/admin/update-role")
async def update_user_role(
    request: RoleUpdateRequest,
    current_user: User = Depends(permission_middleware.verify_permissions),
    db: Session = Depends(get_db)
):
    """更新用户角色（管理员功能）"""
    # 检查管理员权限
    if current_user.role != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要管理员权限"
        )
    
    # 验证新角色
    if not validate_role(request.new_role):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="无效的角色"
        )
    
    # 查找目标用户
    target_user = db.query(User).filter(User.id == request.user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    
    old_role = target_user.role
    target_user.role = request.new_role
    target_user.updated_at = datetime.utcnow()
    db.commit()
    
    # 清除目标用户的权限缓存和令牌
    jwt_manager.revoke_all_user_tokens(target_user.id)
    permission_middleware.invalidate_user_permissions(target_user.id)
    
    logger.info(f"角色更新: {target_user.id} from {old_role} to {request.new_role} by {current_user.id}")
    
    return {
        "message": "角色更新成功",
        "user_id": target_user.id,
        "old_role": old_role,
        "new_role": request.new_role
    }

@router.get("/admin/user-sessions/{user_id}")
async def get_user_sessions_admin(
    user_id: str,
    current_user: User = Depends(permission_middleware.verify_permissions)
):
    """获取指定用户的会话（管理员功能）"""
    if current_user.role != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要管理员权限"
        )
    
    sessions = jwt_manager.get_user_sessions(user_id)
    return {
        "user_id": user_id,
        "sessions": sessions,
        "total_count": len(sessions)
    }

@router.post("/admin/revoke-user-sessions/{user_id}")
async def revoke_user_sessions_admin(
    user_id: str,
    current_user: User = Depends(permission_middleware.verify_permissions)
):
    """撤销指定用户的所有会话（管理员功能）"""
    if current_user.role != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要管理员权限"
        )
    
    jwt_manager.revoke_all_user_tokens(user_id)
    permission_middleware.invalidate_user_permissions(user_id)
    
    logger.info(f"管理员撤销用户会话: {user_id} by {current_user.id}")
    return {"message": f"已撤销用户 {user_id} 的所有会话"}