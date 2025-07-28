#!/usr/bin/env python3

import sys
sys.path.append('./backend')

from datetime import datetime
from pydantic import BaseModel, EmailStr
from typing import Optional, List

# 复制模型定义
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

    model_config = {"from_attributes": True}

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

print("测试Token模型创建")

# 创建测试数据
user_data = {
    'id': 'test-id',
    'username': 'testuser',
    'email': 'test@example.com',
    'name': 'Test User',
    'role': 'teacher',
    'school': None,
    'subject': None,
    'grades': None,
    'is_active': True,
    'is_verified': True,
    'created_at': datetime.now(),
    'last_login': None,
    'permissions': ['read', 'write', 'manage_exams']
}

try:
    user_response = UserResponse.model_validate(user_data)
    print(f"✅ UserResponse创建成功: {user_response.username}")
    
    token = Token(
        access_token="test-token",
        token_type="bearer",
        user=user_response
    )
    print(f"✅ Token创建成功: {token.access_token}")
    
    # 测试序列化
    token_dict = token.model_dump()
    print(f"✅ Token序列化成功: {type(token_dict)}")
    
except Exception as e:
    print(f"❌ 错误: {e}")
    import traceback
    traceback.print_exc()