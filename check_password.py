#!/usr/bin/env python3
import sys
import os

# 切换到后端目录
os.chdir(os.path.join(os.path.dirname(__file__), 'backend'))
sys.path.insert(0, os.getcwd())

from database import get_db
from models.production_models import User
from auth import get_password_hash, verify_password

def check_password():
    db = next(get_db())
    
    # 查找testuser
    user = db.query(User).filter(User.username == "testuser").first()
    
    if not user:
        print("❌ 用户testuser不存在")
        return
    
    print(f"✅ 找到用户: {user.username}")
    print(f"邮箱: {user.email}")
    print(f"密码哈希: {user.hashed_password[:50]}...")
    
    # 测试密码验证
    test_password = "password123"
    is_valid = verify_password(test_password, user.hashed_password)
    
    print(f"\n测试密码: {test_password}")
    print(f"密码验证结果: {'✅ 正确' if is_valid else '❌ 错误'}")
    
    if not is_valid:
        print("\n正在重新设置密码...")
        new_hash = get_password_hash(test_password)
        user.hashed_password = new_hash
        db.commit()
        print("✅ 密码已重新设置")
        
        # 再次验证
        is_valid_new = verify_password(test_password, user.hashed_password)
        print(f"新密码验证结果: {'✅ 正确' if is_valid_new else '❌ 错误'}")
    
    db.close()

if __name__ == "__main__":
    check_password()