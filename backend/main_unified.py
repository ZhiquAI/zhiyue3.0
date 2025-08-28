"""
智阅3.0统一主应用程序
整合优化后的数据模型、API路由和数据库连接
"""

import os
import sys
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import uvicorn

# 添加项目根目录到Python路径
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
sys.path.insert(0, project_root)

from backend.database.unified_connection import init_database, create_tables, database_health_check
from backend.api.unified_router import unified_router
from backend.auth import router as auth_router
from backend.middleware.security_middleware import SecurityMiddleware
from backend.utils.logger import setup_logging

# 设置日志
setup_logging()
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用程序生命周期管理"""
    # 启动时执行
    logger.info("🚀 智阅3.0系统启动中...")
    
    try:
        # 初始化数据库
        logger.info("初始化数据库连接...")
        init_database()
        
        # 创建表（如果不存在）
        logger.info("检查并创建数据库表...")
        create_tables()
        
        # 数据库健康检查
        health = database_health_check()
        if health['status'] == 'healthy':
            logger.info("✅ 数据库连接正常")
        else:
            logger.warning(f"⚠️ 数据库连接异常: {health}")
        
        logger.info("🎯 智阅3.0系统启动完成")
        
    except Exception as e:
        logger.error(f"❌ 系统启动失败: {e}")
        raise
    
    yield
    
    # 关闭时执行
    logger.info("📴 智阅3.0系统正在关闭...")

# 创建FastAPI应用
app = FastAPI(
    title="智阅3.0 - 智能阅卷系统",
    description="""
    智阅3.0智能历史阅卷助手API
    
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
    
    ## 技术特性
    - 🚀 高性能异步处理
    - 🔒 企业级安全防护
    - 📊 实时监控和日志
    - 🔄 自动故障恢复
    """,
    version="3.0.0",
    contact={
        "name": "智阅AI团队",
        "email": "support@zhiyue.ai"
    },
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

# 添加安全中间件
app.add_middleware(SecurityMiddleware)

# 添加受信任主机中间件
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["*"]  # 生产环境应限制具体主机
)

# 注册路由
app.include_router(auth_router, prefix="/api", tags=["认证"])
app.include_router(unified_router, tags=["智阅3.0核心API"])

# 静态文件服务
try:
    static_dir = os.path.join(project_root, "backend", "storage")
    if os.path.exists(static_dir):
        app.mount("/storage", StaticFiles(directory=static_dir), name="storage")
        logger.info(f"静态文件服务已配置: {static_dir}")
except Exception as e:
    logger.warning(f"静态文件服务配置失败: {e}")

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
            "timestamp": __import__('datetime').datetime.utcnow().isoformat()
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
            "timestamp": __import__('datetime').datetime.utcnow().isoformat()
        }
    )

# 根路径
@app.get("/", tags=["系统信息"])
async def root():
    """系统信息"""
    return {
        "name": "智阅3.0 - 智能阅卷系统",
        "version": "3.0.0",
        "status": "running",
        "description": "AI驱动的智能历史阅卷助手",
        "features": [
            "学生管理",
            "考试管理", 
            "智能阅卷",
            "成绩分析"
        ],
        "docs": "/docs",
        "api_base": "/api/v1"
    }

# 健康检查
@app.get("/health", tags=["系统信息"])
async def health_check():
    """系统健康检查"""
    try:
        db_health = database_health_check()
        
        return {
            "status": "healthy" if db_health['status'] == 'healthy' else "degraded",
            "timestamp": __import__('datetime').datetime.utcnow().isoformat(),
            "services": {
                "database": db_health['status'],
                "api": "healthy"
            },
            "database_info": db_health
        }
    except Exception as e:
        logger.error(f"健康检查失败: {e}")
        return {
            "status": "unhealthy",
            "timestamp": __import__('datetime').datetime.utcnow().isoformat(),
            "error": str(e)
        }

# 中间件：请求日志
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """请求日志中间件"""
    start_time = __import__('time').time()
    
    # 记录请求开始
    logger.info(f"📥 {request.method} {request.url.path} - 开始处理")
    
    try:
        response = await call_next(request)
        
        # 计算处理时间
        process_time = __import__('time').time() - start_time
        
        # 记录响应
        logger.info(
            f"📤 {request.method} {request.url.path} - "
            f"状态: {response.status_code}, 耗时: {process_time:.3f}s"
        )
        
        # 添加响应头
        response.headers["X-Process-Time"] = str(process_time)
        
        return response
        
    except Exception as e:
        process_time = __import__('time').time() - start_time
        logger.error(
            f"❌ {request.method} {request.url.path} - "
            f"错误: {e}, 耗时: {process_time:.3f}s"
        )
        raise

def create_app():
    """工厂函数创建应用"""
    return app

if __name__ == "__main__":
    # 开发环境运行配置
    config = {
        "host": "0.0.0.0",
        "port": 8001,
        "reload": True,
        "log_level": "info",
        "access_log": True
    }
    
    logger.info(f"🌟 启动智阅3.0开发服务器...")
    logger.info(f"📍 服务地址: http://{config['host']}:{config['port']}")
    logger.info(f"📖 API文档: http://{config['host']}:{config['port']}/docs")
    logger.info(f"🔍 健康检查: http://{config['host']}:{config['port']}/health")
    
    uvicorn.run("main_unified:app", **config)