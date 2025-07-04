#!/usr/bin/env python3
"""
认证系统测试脚本
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="智阅AI认证测试",
    description="认证系统测试服务",
    version="1.0.0"
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 导入认证路由
try:
    from auth import router as auth_router
    app.include_router(auth_router)
    logger.info("认证路由加载成功")
except Exception as e:
    logger.error(f"认证路由加载失败: {str(e)}")

@app.get("/")
def read_root():
    """根路径"""
    return {
        "name": "智阅AI认证测试",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "register": "/auth/register",
            "login": "/auth/login", 
            "me": "/auth/me",
            "docs": "/docs"
        }
    }

@app.get("/health")
def health_check():
    """健康检查"""
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
