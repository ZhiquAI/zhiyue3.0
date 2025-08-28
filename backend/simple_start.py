#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
简化版后端启动文件 - 专注认证功能
"""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

# 导入认证相关模块
from auth import router as auth_router
from db_connection import create_tables
from config.settings import settings

# 配置日志
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时创建数据库表
    logger.info("创建数据库表...")
    create_tables()
    logger.info("智阅AI后端服务启动完成")
    yield
    logger.info("智阅AI后端服务关闭")


# 创建FastAPI应用
app = FastAPI(
    title="智阅AI - 简化版",
    description="智阅AI在线阅卷系统 - 认证功能版本",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS中间件配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 开发环境允许所有源
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 全局异常处理


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"全局异常: {type(exc).__name__}: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "服务器内部错误",
            "error_code": "INTERNAL_SERVER_ERROR"
        }
    )

# 注册认证路由
app.include_router(auth_router)

# 健康检查端点


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "智阅AI认证服务",
        "version": "1.0.0"
    }

# 根端点


@app.get("/")
async def root():
    return {
        "message": "智阅AI认证服务运行中",
        "docs": "/docs",
        "health": "/health"
    }


if __name__ == "__main__":
    import uvicorn
    
    print("🚀 启动智阅AI认证服务...")
    print("📊 调试模式:", settings.DEBUG)
    print("🗄️  数据库: SQLite (开发)")
    print("🔗 访问地址: http://localhost:8001")
    print("📖 API文档: http://localhost:8001/docs")
    
    uvicorn.run(
        "simple_start:app",
        host="0.0.0.0",
        port=8001,
        reload=settings.DEBUG,
        log_level="info"
    )