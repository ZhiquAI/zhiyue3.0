
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlalchemy.orm import Session

try:
    from backend.database import get_db
    from backend.models.production_models import User
    from backend.config.settings import settings
    from backend.services.email_service import email_service, reset_token_manager
    from backend.middleware.permissions import permission_manager, get_user_permissions
except ImportError:
    from database import get_db
    from models.production_models import User
    from config.settings import settings
    from services.email_service import email_service, reset_token_manager
    from middleware.permissions import permission_manager, get_user_permissions

# OAuth2 an password-based bearer tokens scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

class TokenData(BaseModel):
    username: str | None = None

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """解码JWT令牌获取当前用户"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="无法验证凭据",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        user_id: str = payload.get("user_id")
        
        if username is None:
            raise credentials_exception
            
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    
    # 优先使用user_id查询，回退到username
    if user_id:
        user = db.query(User).filter(User.id == user_id).first()
    else:
        user = db.query(User).filter(User.username == token_data.username).first()
    
    if user is None or not user.is_active:
        raise credentials_exception
        
    return user


from passlib.context import CryptContext
from datetime import datetime, timedelta

# Password Hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

# JWT Token Creation
def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


from fastapi import APIRouter
from pydantic import BaseModel, EmailStr
from typing import Optional, List
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["认证"])

# Pydantic 模型
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    name: str
    school: Optional[str] = None
    subject: Optional[str] = None
    grades: Optional[List[str]] = None

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    name: str
    role: str
    school: Optional[str] = None
    subject: Optional[str] = None
    grades: Optional[List[str]] = None
    is_active: bool
    is_verified: bool
    created_at: datetime
    last_login: Optional[datetime] = None
    permissions: Optional[List[str]] = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class UserLogin(BaseModel):
    username: str
    password: str

class PasswordReset(BaseModel):
    email: EmailStr

class PasswordUpdate(BaseModel):
    current_password: str
    new_password: str

class PasswordResetRequest(BaseModel):
    token: str
    new_password: str

class RoleUpdate(BaseModel):
    user_id: str
    new_role: str

# 认证路由
@router.post("/register", response_model=Token)
async def register_user(user_data: UserCreate, db: Session = Depends(get_db)):
    """用户注册"""
    # 检查用户名是否已存在
    if db.query(User).filter(User.username == user_data.username).first():
        raise HTTPException(status_code=400, detail="用户名已存在")
    
    # 检查邮箱是否已存在
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(status_code=400, detail="邮箱已被注册")
    
    # 创建新用户
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_password,
        name=user_data.name,
        school=user_data.school,
        subject=user_data.subject,
        grades=user_data.grades
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # 生成访问令牌
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": new_user.username, "user_id": new_user.id}, 
        expires_delta=access_token_expires
    )
    
    # 创建用户响应对象，包含权限信息
    user_response = UserResponse.from_orm(new_user)
    user_response.permissions = get_user_permissions(new_user.role)

    # 发送欢迎邮件
    try:
        await email_service.send_welcome_email(new_user.email, new_user.username)
    except Exception as e:
        logger.warning(f"发送欢迎邮件失败: {str(e)}")

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_response
    }

@router.post("/login", response_model=Token)
async def login_user(user_data: UserLogin, db: Session = Depends(get_db)):
    """用户登录"""
    user = db.query(User).filter(User.username == user_data.username).first()
    
    if not user or not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="账户已被禁用"
        )
    
    # 更新最后登录时间
    user.last_login = datetime.utcnow()
    db.commit()
    
    # 生成访问令牌
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "user_id": user.id}, 
        expires_delta=access_token_expires
    )
    
    # 创建用户响应对象，包含权限信息
    user_response = UserResponse.from_orm(user)
    user_response.permissions = get_user_permissions(user.role)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_response
    }

@router.post("/token")
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """OAuth2兼容的登录接口"""
    user = db.query(User).filter(User.username == form_data.username).first()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "user_id": user.id}, 
        expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """获取当前用户信息"""
    user_response = UserResponse.from_orm(current_user)
    user_response.permissions = get_user_permissions(current_user.role)
    return user_response

@router.put("/me", response_model=UserResponse)
async def update_user_profile(
    user_update: UserCreate, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """更新用户资料"""
    # 检查邮箱是否被其他用户使用
    if user_update.email != current_user.email:
        existing_user = db.query(User).filter(User.email == user_update.email).first()
        if existing_user and existing_user.id != current_user.id:
            raise HTTPException(status_code=400, detail="邮箱已被其他用户使用")
    
    # 更新用户信息
    current_user.email = user_update.email
    current_user.name = user_update.name
    current_user.school = user_update.school
    current_user.subject = user_update.subject
    current_user.grades = user_update.grades
    current_user.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(current_user)
    
    return UserResponse.from_orm(current_user)

@router.post("/password/reset")
async def request_password_reset(reset_data: PasswordReset, db: Session = Depends(get_db)):
    """请求密码重置"""
    user = db.query(User).filter(User.email == reset_data.email).first()
    if not user:
        # 为了安全，即使邮箱不存在也返回成功消息
        return {"message": "如果邮箱存在，重置链接已发送"}

    # 生成重置令牌
    reset_token = reset_token_manager.generate_token(user.id)

    # 发送重置邮件
    try:
        await email_service.send_password_reset_email(
            user.email,
            user.username,
            reset_token
        )
        return {"message": "密码重置链接已发送到您的邮箱"}
    except Exception as e:
        logger.error(f"发送密码重置邮件失败: {str(e)}")
        return {"message": "密码重置链接已发送到您的邮箱"}  # 为了安全，不暴露错误信息

@router.post("/password/update")
async def update_password(
    password_data: PasswordUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """更新密码"""
    if not verify_password(password_data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="当前密码错误")
    
    current_user.hashed_password = get_password_hash(password_data.new_password)
    current_user.updated_at = datetime.utcnow()
    
    db.commit()
    
    return {"message": "密码更新成功"}

@router.post("/password/reset/confirm")
async def confirm_password_reset(reset_data: PasswordResetRequest, db: Session = Depends(get_db)):
    """确认密码重置"""
    # 验证重置令牌
    user_id = reset_token_manager.validate_token(reset_data.token)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="无效或已过期的重置令牌"
        )

    # 获取用户
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )

    # 更新密码
    user.hashed_password = get_password_hash(reset_data.new_password)
    user.updated_at = datetime.utcnow()

    # 标记令牌为已使用
    reset_token_manager.use_token(reset_data.token)

    db.commit()

    return {"message": "密码重置成功"}

@router.post("/logout")
async def logout_user():
    """用户登出"""
    # JWT是无状态的，客户端删除token即可
    return {"message": "登出成功"}

# 用户管理路由（需要管理员权限）
@router.get("/users", response_model=List[UserResponse])
async def get_all_users(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取所有用户列表（管理员权限）"""
    if current_user.role != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要管理员权限"
        )

    users = db.query(User).offset(skip).limit(limit).all()
    user_responses = []

    for user in users:
        user_response = UserResponse.from_orm(user)
        user_response.permissions = get_user_permissions(user.role)
        user_responses.append(user_response)

    return user_responses

@router.put("/users/{user_id}/role")
async def update_user_role(
    user_id: str,
    role_data: RoleUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """更新用户角色（管理员权限）"""
    if current_user.role != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要管理员权限"
        )

    # 验证新角色
    try:
        from backend.middleware.permissions import validate_role
    except ImportError:
        from middleware.permissions import validate_role
    if not validate_role(role_data.new_role):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="无效的角色"
        )

    # 获取目标用户
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )

    # 更新角色
    target_user.role = role_data.new_role
    target_user.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(target_user)

    user_response = UserResponse.from_orm(target_user)
    user_response.permissions = get_user_permissions(target_user.role)

    return user_response

@router.put("/users/{user_id}/status")
async def update_user_status(
    user_id: str,
    is_active: bool,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """更新用户状态（管理员权限）"""
    if current_user.role != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要管理员权限"
        )

    # 获取目标用户
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )

    # 不能禁用自己
    if target_user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="不能禁用自己的账户"
        )

    # 更新状态
    target_user.is_active = is_active
    target_user.updated_at = datetime.utcnow()

    db.commit()

    return {"message": f"用户状态已更新为 {'激活' if is_active else '禁用'}"}

@router.get("/roles")
async def get_available_roles(current_user: User = Depends(get_current_user)):
    """获取可用角色列表"""
    try:
        from backend.middleware.permissions import PermissionInfo
    except ImportError:
        from middleware.permissions import PermissionInfo

    if current_user.role != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要管理员权限"
        )

    return PermissionInfo.get_all_roles_info()

@router.get("/permissions")
async def get_user_permissions_info(current_user: User = Depends(get_current_user)):
    """获取当前用户权限信息"""
    try:
        from backend.middleware.permissions import PermissionInfo
    except ImportError:
        from middleware.permissions import PermissionInfo

    return PermissionInfo.get_role_info(current_user.role)


