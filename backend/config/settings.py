"""
配置文件 - 智阅AI后端配置 (更新Gemini配置)
"""

import os
from pathlib import Path
from typing import List
from dotenv import load_dotenv

# 加载 .env 文件
load_dotenv()

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
    
    # Gemini 2.5 Pro OCR配置
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-pro")
    GEMINI_BASE_URL = os.getenv("GEMINI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta")
    GEMINI_MAX_TOKENS = int(os.getenv("GEMINI_MAX_TOKENS", "8192"))
    GEMINI_TEMPERATURE = float(os.getenv("GEMINI_TEMPERATURE", "0.1"))  # OCR任务使用低温度
    GEMINI_TOP_P = float(os.getenv("GEMINI_TOP_P", "0.8"))
    GEMINI_TOP_K = int(os.getenv("GEMINI_TOP_K", "40"))
    
    # OCR特定配置
    OCR_MAX_IMAGE_SIZE = int(os.getenv("OCR_MAX_IMAGE_SIZE", "2048"))  # 最大图像尺寸
    OCR_BATCH_SIZE = int(os.getenv("OCR_BATCH_SIZE", "3"))  # 批处理并发数
    OCR_RETRY_ATTEMPTS = int(os.getenv("OCR_RETRY_ATTEMPTS", "3"))  # 重试次数
    OCR_TIMEOUT = int(os.getenv("OCR_TIMEOUT", "60"))  # 超时时间(秒)
    
    # 传统OCR配置(备用)
    TESSERACT_PATH = os.getenv("TESSERACT_PATH", "/usr/bin/tesseract")
    EASYOCR_GPU = os.getenv("EASYOCR_GPU", "False").lower() == "true"
    
    # AI服务配置
    AI_GRADING_ENABLED = os.getenv("AI_GRADING_ENABLED", "True").lower() == "true"
    AI_ANALYSIS_ENABLED = os.getenv("AI_ANALYSIS_ENABLED", "True").lower() == "true"
    AI_SUGGESTION_ENABLED = os.getenv("AI_SUGGESTION_ENABLED", "True").lower() == "true"
    
    # 安全配置
    SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here-change-in-production")
    ALGORITHM = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))  # 24小时
    REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))  # 7天
    
    # JWT增强安全配置
    JWT_ISSUER = os.getenv("JWT_ISSUER", "zhiyue-ai")
    JWT_AUDIENCE = os.getenv("JWT_AUDIENCE", "zhiyue-ai-users")
    PASSWORD_MIN_LENGTH = int(os.getenv("PASSWORD_MIN_LENGTH", "8"))
    PASSWORD_REQUIRE_UPPERCASE = os.getenv("PASSWORD_REQUIRE_UPPERCASE", "True").lower() == "true"
    PASSWORD_REQUIRE_NUMBERS = os.getenv("PASSWORD_REQUIRE_NUMBERS", "True").lower() == "true"
    PASSWORD_REQUIRE_SYMBOLS = os.getenv("PASSWORD_REQUIRE_SYMBOLS", "False").lower() == "true"
    
    # 账户安全
    MAX_LOGIN_ATTEMPTS = int(os.getenv("MAX_LOGIN_ATTEMPTS", "5"))
    ACCOUNT_LOCKOUT_DURATION = int(os.getenv("ACCOUNT_LOCKOUT_DURATION", "1800"))  # 30分钟
    
    # 日志配置
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
    LOG_FILE = os.getenv("LOG_FILE", "./logs/app.log")
    
    # 队列配置
    CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/1")
    CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/2")
    
    # 监控配置
    SENTRY_DSN = os.getenv("SENTRY_DSN")
    ENABLE_METRICS = os.getenv("ENABLE_METRICS", "True").lower() == "true"
    
    # WebSocket配置
    WS_URL = os.getenv("WS_URL", "ws://localhost:8000")
    
    @classmethod
    def validate_gemini_config(cls) -> bool:
        """验证Gemini配置"""
        if not cls.GEMINI_API_KEY:
            return False
        
        if not cls.GEMINI_MODEL:
            return False
            
        return True
    
    @classmethod
    def get_ocr_config(cls) -> dict:
        """获取OCR配置"""
        return {
            "primary_engine": "gemini-2.5-pro",
            "api_key_configured": bool(cls.GEMINI_API_KEY),
            "model": cls.GEMINI_MODEL,
            "max_tokens": cls.GEMINI_MAX_TOKENS,
            "temperature": cls.GEMINI_TEMPERATURE,
            "max_image_size": cls.OCR_MAX_IMAGE_SIZE,
            "batch_size": cls.OCR_BATCH_SIZE,
            "retry_attempts": cls.OCR_RETRY_ATTEMPTS,
            "timeout": cls.OCR_TIMEOUT
        }

settings = Settings()