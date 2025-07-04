
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from contextlib import asynccontextmanager
import logging

try:
    from backend.auth import router as auth_router
    from backend.api.file_upload import router as file_upload_router
    from backend.api.exam_management import router as exam_router
    from backend.api.ocr_processing import router as ocr_router
    from backend.database import create_tables
    from backend.config.settings import settings
except ImportError:
    from auth import router as auth_router
    from api.file_upload import router as file_upload_router
    from api.exam_management import router as exam_router
    from api.ocr_processing import router as ocr_router
    from database import create_tables
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
    # 关闭时的清理工作
    logger.info("智阅AI后端服务关闭")

app = FastAPI(
    title="智阅AI后端API",
    description="智能阅卷系统后端服务",
    version="1.0.0",
    lifespan=lifespan
)

# 配置CORS中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# 可信主机中间件
if not settings.DEBUG:
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=["localhost", "127.0.0.1", "*.zhiyue-ai.com"]
    )

# 注册路由
app.include_router(auth_router)
app.include_router(exam_router)
app.include_router(ocr_router)
app.include_router(file_upload_router)

@app.get("/")
def read_root():
    """根路径，返回API信息"""
    return {
        "name": "智阅AI后端API",
        "version": "1.0.0",
        "description": "智能历史阅卷系统后端服务",
        "docs_url": "/docs",
        "redoc_url": "/redoc",
        "status": "running"
    }

@app.get("/health")
def health_check():
    """健康检查接口"""
    return {
        "status": "healthy",
        "timestamp": "2025-01-01T12:00:00Z",
        "version": "1.0.0"
    }

@app.get("/api/config")
def get_config():
    """获取前端配置"""
    return {
        "ocr_config": settings.get_ocr_config(),
        "file_config": {
            "max_file_size": settings.MAX_FILE_SIZE,
            "allowed_extensions": settings.ALLOWED_FILE_EXTENSIONS
        },
        "features": {
            "ai_grading_enabled": settings.AI_GRADING_ENABLED,
            "ai_analysis_enabled": settings.AI_ANALYSIS_ENABLED,
            "ai_suggestion_enabled": settings.AI_SUGGESTION_ENABLED
        }
    }

# 全局异常处理
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    logger.error(f"HTTP异常: {exc.status_code} - {exc.detail}")
    return {
        "error": True,
        "status_code": exc.status_code,
        "message": exc.detail,
        "timestamp": "2025-01-01T12:00:00Z"
    }

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error(f"未处理异常: {str(exc)}", exc_info=True)
    return {
        "error": True,
        "status_code": 500,
        "message": "内部服务器错误",
        "timestamp": "2025-01-01T12:00:00Z"
    }
