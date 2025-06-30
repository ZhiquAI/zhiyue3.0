"""
配置文件 - 智阅AI后端配置
"""

import os
from pathlib import Path
from typing import List

class Settings:
    """应用配置类"""
    
    # 基础配置
    APP_NAME = "智阅AI"
    VERSION = "1.0.0"
    DEBUG = os.getenv("DEBUG", "False").lower() == "true"
    
    # 数据库配置
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/zhiyue_ai")
    
    # Redis配置
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    # 文件存储配置
    STORAGE_BASE_PATH = Path(os.getenv("STORAGE_BASE_PATH", "./storage"))
    MAX_FILE_SIZE = int(os.getenv("MAX_FILE_SIZE", "50")) * 1024 * 1024  # 50MB
    ALLOWED_FILE_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.tiff', '.tif']
    
    # OCR配置
    TESSERACT_PATH = os.getenv("TESSERACT_PATH", "/usr/bin/tesseract")
    EASYOCR_GPU = os.getenv("EASYOCR_GPU", "False").lower() == "true"
    
    # AI服务配置
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-pro")
    GEMINI_BASE_URL = os.getenv("GEMINI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta")
    
    # 安全配置
    SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
    ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    
    # 日志配置
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
    LOG_FILE = os.getenv("LOG_FILE", "./logs/app.log")
    
    # 队列配置
    CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/1")
    CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/2")
    
    # 监控配置
    SENTRY_DSN = os.getenv("SENTRY_DSN")
    ENABLE_METRICS = os.getenv("ENABLE_METRICS", "True").lower() == "true"

settings = Settings()