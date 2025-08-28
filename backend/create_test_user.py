#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
创建测试用户脚本
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from db_connection import SessionLocal, engine
from models.production_models import User, Base
from auth import get_password_hash
from datetime import datetime

def create_test_user():
    """创建测试用户"""
    # 创建数据库表
    Base.metadata.create_all(bind=engine)
    
    db: Session = SessionLocal()
    
    try:
        # 检查是否已存在测试用户
        existing_user = db.query(User).filter(User.username == "demo").first()
        if existing_user:
            print("测试用户 'demo' 已存在")
            return
        
        # 创建测试用户
        hashed_password = get_password_hash("demo123")
        test_user = User(
            username="demo",
            email="demo@example.com",
            hashed_password=hashed_password,
            name="演示用户",
            role="teacher",
            school="演示学校",
            subject="数学",
            grades=["高一", "高二"],
            is_active=True,
            is_verified=True,
            created_at=datetime.utcnow()
        )
        
        db.add(test_user)
        db.commit()
        db.refresh(test_user)
        
        print(f"测试用户创建成功:")
        print(f"  用户名: {test_user.username}")
        print(f"  密码: demo123")
        print(f"  邮箱: {test_user.email}")
        print(f"  姓名: {test_user.name}")
        print(f"  角色: {test_user.role}")
        
    except Exception as e:
        print(f"创建测试用户失败: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_test_user()