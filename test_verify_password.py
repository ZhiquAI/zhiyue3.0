#!/usr/bin/env python3
import sys
import os
sys.path.append(os.path.dirname(__file__))

from backend.auth import verify_password, get_password_hash
from backend.database import get_db
from backend.models import User

def test_password_verification():
    """测试密码验证函数"""
    print("=== 测试密码验证函数 ===")
    
    # 测试1: 创建新密码哈希并验证
    test_password = "password123"
    hashed = get_password_hash(test_password)
    print(f"原始密码: {test_password}")
    print(f"哈希值: {hashed}")
    
    # 验证正确密码
    result1 = verify_password(test_password, hashed)
    print(f"验证正确密码: {result1}")
    
    # 验证错误密码
    result2 = verify_password("wrongpassword", hashed)
    print(f"验证错误密码: {result2}")
    
    # 测试2: 从数据库获取用户并验证密码
    print("\n=== 测试数据库中的用户密码 ===")
    db = next(get_db())
    try:
        user = db.query(User).filter(User.username == "testuser").first()
        if user:
            print(f"用户: {user.username}")
            print(f"数据库中的哈希值: {user.hashed_password}")
            
            # 验证密码
            result3 = verify_password("password123", user.hashed_password)
            print(f"验证数据库密码: {result3}")
            
            # 测试不同的密码
            result4 = verify_password("wrongpassword", user.hashed_password)
            print(f"验证错误密码: {result4}")
        else:
            print("用户不存在")
    finally:
        db.close()

if __name__ == "__main__":
    test_password_verification()