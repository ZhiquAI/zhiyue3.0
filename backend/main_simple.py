"""
智阅3.0简化主应用程序
用于快速启动和测试统一架构
"""

import os
import sys
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

# 添加项目根目录到Python路径
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
sys.path.insert(0, project_root)

# 设置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from backend.database.unified_connection import init_database, create_tables, database_health_check
from backend.api.unified_router import unified_router
from backend.auth import router as auth_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用程序生命周期管理"""
    # 启动时执行
    logger.info("🚀 智阅3.0简化版启动中...")
    
    try:
        # 初始化数据库
        logger.info("初始化数据库连接...")
        init_database()
        
        # 创建表（如果不存在）
        logger.info("检查并创建数据库表...")
        create_tables()
        
        # 数据库健康检查
        health = database_health_check()
        logger.info(f"数据库状态: {health['status']}")
        
        logger.info("🎯 智阅3.0简化版启动完成")
        
    except Exception as e:
        logger.error(f"❌ 系统启动失败: {e}")
        raise
    
    yield
    
    # 关闭时执行
    logger.info("📴 智阅3.0简化版正在关闭...")

# 创建FastAPI应用
app = FastAPI(
    title="智阅3.0 - 智能阅卷系统 (简化版)",
    description="""
    智阅3.0智能历史阅卷助手API - 简化版
    
    ## 核心功能模块
    
    ### 1. 学生管理 (优先级最高)
    - 学生信息录入和管理
    - 批量导入导出
    - 学生档案建立
    
    ### 2. 考试管理
    - 考试创建和配置
    - 答题卡模板设计
    - 条码生成和打印
    
    ### 3. 智能阅卷
    - OCR识别和图像处理
    - AI智能评分
    - 人机协同评阅
    
    ### 4. 成绩分析
    - 智能数据分析
    - 个性化报告生成
    - 学情诊断建议
    """,
    version="3.0.0-simple",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境应限制具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(auth_router, prefix="/api", tags=["认证"])
app.include_router(unified_router, tags=["智阅3.0核心API"])

# 全局异常处理
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """HTTP异常处理"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": exc.detail,
            "error_code": exc.status_code,
            "timestamp": __import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat()
        }
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """全局异常处理"""
    logger.error(f"未处理的异常: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "内部服务器错误",
            "error_code": 500,
            "timestamp": __import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat()
        }
    )

# 根路径
@app.get("/", tags=["系统信息"])
async def root():
    """系统信息"""
    return {
        "name": "智阅3.0 - 智能阅卷系统 (简化版)",
        "version": "3.0.0-simple",
        "status": "running",
        "description": "AI驱动的智能历史阅卷助手",
        "features": [
            "学生管理",
            "考试管理", 
            "智能阅卷",
            "成绩分析"
        ],
        "docs": "/docs",
        "api_base": "/api/v1",
        "note": "这是简化版本，用于开发和测试"
    }

# 健康检查
@app.get("/health", tags=["系统信息"])
async def health_check():
    """系统健康检查"""
    try:
        db_health = database_health_check()
        
        return {
            "status": "healthy" if db_health.get('status') == 'healthy' else "degraded",
            "timestamp": __import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat(),
            "services": {
                "database": db_health.get('status', 'unknown'),
                "api": "healthy"
            },
            "database_info": db_health,
            "version": "3.0.0-simple"
        }
    except Exception as e:
        logger.error(f"健康检查失败: {e}")
        return {
            "status": "unhealthy",
            "timestamp": __import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat(),
            "error": str(e)
        }

# 中间件：请求日志
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """请求日志中间件"""
    start_time = __import__('time').time()
    
    try:
        response = await call_next(request)
        
        # 计算处理时间
        process_time = __import__('time').time() - start_time
        
        # 添加响应头
        response.headers["X-Process-Time"] = str(process_time)
        
        return response
        
    except Exception as e:
        process_time = __import__('time').time() - start_time
        logger.error(f"请求处理失败: {request.method} {request.url.path} - {e}")
        raise

if __name__ == "__main__":
    # 开发环境运行配置
    config = {
        "host": "0.0.0.0",
        "port": 8002,
        "reload": False,  # 简化版不启用热重载
        "log_level": "info",
        "access_log": True
    }
    
    logger.info(f"🌟 启动智阅3.0简化版服务器...")
    logger.info(f"📍 服务地址: http://{config['host']}:{config['port']}")
    logger.info(f"📖 API文档: http://{config['host']}:{config['port']}/docs")
    logger.info(f"🔍 健康检查: http://{config['host']}:{config['port']}/health")
    
    uvicorn.run("main_simple:app", **config)