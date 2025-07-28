#!/usr/bin/env python3
import sys
import os
sys.path.append(os.path.dirname(__file__))

from backend.auth import UserResponse
from backend.middleware.permissions import get_user_permissions
from datetime import datetime

def test_user_response_creation():
    """测试UserResponse模型创建"""
    print("=== 测试UserResponse模型创建 ===")
    
    # 模拟用户数据
    user_dict = {
        'id': 'test-user-id',
        'username': 'testuser',
        'email': 'test@example.com',
        'name': 'Test User',
        'role': 'teacher',
        'school': 'Test School',
        'subject': 'Math',
        'grades': ['Grade 1', 'Grade 2'],
        'is_active': True,
        'is_verified': True,
        'created_at': datetime.utcnow(),
        'last_login': datetime.utcnow(),
        'permissions': get_user_permissions('teacher')
    }
    
    print(f"输入数据类型: {type(user_dict)}")
    print(f"权限数据: {user_dict['permissions']}")
    print(f"权限类型: {type(user_dict['permissions'])}")
    
    try:
        # 创建UserResponse对象
        user_response = UserResponse.model_validate(user_dict)
        print(f"✅ UserResponse创建成功")
        print(f"返回类型: {type(user_response)}")
        print(f"用户名: {user_response.username}")
        print(f"权限: {user_response.permissions}")
        
        # 测试序列化
        user_dict_output = user_response.model_dump()
        print(f"序列化结果类型: {type(user_dict_output)}")
        
    except Exception as e:
        print(f"❌ UserResponse创建失败: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_user_response_creation()