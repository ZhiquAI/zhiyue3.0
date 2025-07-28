#!/usr/bin/env python3

import sys
sys.path.append('./backend')

import asyncio
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

try:
    from backend.database import get_db
    from backend.models.production_models import User
    from backend.config.settings import settings
    from backend.auth import login_user, UserLogin
except ImportError:
    from database import get_db
    from models.production_models import User
    from config.settings import settings
    from auth import login_user, UserLogin

async def test_login():
    """直接测试登录函数"""
    print("直接测试登录函数")
    
    # 获取数据库会话
    db_gen = get_db()
    db = next(db_gen)
    
    try:
        # 创建登录数据
        user_data = UserLogin(username="testuser", password="password123")
        
        # 调用登录函数
        result = await login_user(user_data, db)
        
        print(f"✅ 登录成功")
        print(f"Token类型: {type(result)}")
        print(f"Access Token: {result.access_token[:50]}...")
        print(f"User: {result.user.username} ({result.user.role})")
        print(f"Permissions: {result.user.permissions}")
        
        # 测试序列化
        result_dict = result.model_dump()
        print(f"✅ 序列化成功: {type(result_dict)}")
        
    except Exception as e:
        print(f"❌ 登录失败: {e}")
        if hasattr(e, 'detail'):
            print(f"错误详情: {e.detail}")
        if hasattr(e, 'status_code'):
            print(f"状态码: {e.status_code}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(test_login())