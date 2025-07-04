#!/usr/bin/env python3
"""
智阅AI后端服务启动脚本
"""

import uvicorn
import sys
import os
from pathlib import Path

# 将项目根目录添加到Python路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from config.settings import settings

def main():
    """启动服务"""
    
    # 确保必要的目录存在
    directories = [
        settings.STORAGE_BASE_PATH,
        settings.STORAGE_BASE_PATH / "exam_papers",
        settings.STORAGE_BASE_PATH / "answer_sheets",
        Path("./logs")
    ]
    
    for directory in directories:
        directory.mkdir(parents=True, exist_ok=True)
    
    # 检查Gemini API配置
    if not settings.validate_gemini_config():
        print("⚠️  警告: Gemini API配置不完整")
        print("请设置 GEMINI_API_KEY 环境变量")
        print("OCR功能将使用模拟数据")
    else:
        print("✅ Gemini API配置正常")
    
    print("🚀 启动智阅AI后端服务...")
    print(f"📊 调试模式: {settings.DEBUG}")
    print(f"🗄️  数据库: {'SQLite (开发)' if 'sqlite' in settings.DATABASE_URL else 'PostgreSQL (生产)'}")
    print(f"📁 存储路径: {settings.STORAGE_BASE_PATH}")
    print(f"🔗 访问地址: http://localhost:8000")
    print(f"📖 API文档: http://localhost:8000/docs")
    
    # 启动服务
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower(),
        access_log=True
    )

if __name__ == "__main__":
    main()