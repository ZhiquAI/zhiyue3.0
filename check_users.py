#!/usr/bin/env python3
import sys
import os

# 切换到后端目录
os.chdir(os.path.join(os.path.dirname(__file__), 'backend'))
sys.path.insert(0, os.getcwd())

from database import get_db
from models.production_models import User
from auth import get_password_hash

def check_users():
    db = next(get_db())
    users = db.query(User).all()
    
    print("=" * 50)
    print("数据库中的所有用户:")
    print("=" * 50)
    
    if not users:
        print("❌ 数据库中没有用户")
        print("\n正在创建测试用户...")
        
        # 创建测试用户
        test_user = User(
            username="teacher1",
            email="teacher1@example.com",
            name="测试教师",
            hashed_password=get_password_hash("password123"),
            role="teacher",
            school="测试学校",
            subject="数学",
            grades="高一,高二",
            is_active=True
        )
        
        db.add(test_user)
        db.commit()
        db.refresh(test_user)
        
        print(f"✅ 创建测试用户成功: {test_user.username}")
    else:
        for user in users:
            print(f"- 用户名: {user.username}")
            print(f"  邮箱: {user.email}")
            print(f"  姓名: {user.name}")
            print(f"  角色: {user.role}")
            print(f"  状态: {'激活' if user.is_active else '禁用'}")
            print()
    
    db.close()

if __name__ == "__main__":
    check_users()