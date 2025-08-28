"""
FastAPI应用配置
集成API标准化功能
"""

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from middleware.validation import (
    ValidationMiddleware, RequestLoggingMiddleware, 
    SecurityHeadersMiddleware, RateLimitingMiddleware,
    health_router
)
from utils.api_docs import setup_api_documentation
from api.base import enhance_openapi_schema


# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时执行
    logger.info("智阅AI阅卷系统API启动中...")
    
    # 这里可以添加启动时的初始化逻辑
    # 例如：数据库连接检查、缓存预热等
    
    yield
    
    # 关闭时执行
    logger.info("智阅AI阅卷系统API正在关闭...")
    
    # 这里可以添加关闭时的清理逻辑
    # 例如：关闭数据库连接、清理缓存等


def create_standardized_app() -> FastAPI:
    """创建标准化FastAPI应用"""
    
    app = FastAPI(
        title="智阅AI阅卷系统API",
        version="3.0.0",
        description="智阅3.0系统后端API - 基于AI的智能阅卷解决方案",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan
    )
    
    # 设置CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # 在生产环境中应该设置具体域名
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # 添加自定义中间件（按顺序添加）
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(RateLimitingMiddleware, calls_per_minute=60)
    app.add_middleware(RequestLoggingMiddleware)
    app.add_middleware(ValidationMiddleware)
    
    # 添加健康检查路由
    app.include_router(health_router)
    
    # 设置API文档
    setup_api_documentation(app)
    
    # 添加API路由
    register_api_routes(app)
    
    logger.info("FastAPI应用创建完成")
    return app


def register_api_routes(app: FastAPI):
    """注册API路由"""
    from api.standardized_exam_management import router as exam_router
    
    # 注册标准化的API路由
    app.include_router(exam_router)
    
    # 可以继续添加其他标准化的API路由
    # app.include_router(student_router)
    # app.include_router(grading_router)
    
    logger.info("API路由注册完成")


# 创建应用实例
app = create_standardized_app()


# 自定义异常处理器
from fastapi import HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from schemas.response import ErrorResponse, ValidationErrorResponse
from datetime import datetime


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """HTTP异常处理器"""
    error_response = ErrorResponse(
        message=str(exc.detail),
        error_code="HTTP_ERROR",
        request_id=getattr(request.state, 'request_id', 'unknown'),
        timestamp=datetime.utcnow()
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content=error_response.dict(exclude_none=True)
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """验证异常处理器"""
    errors = []
    for error in exc.errors():
        field_path = " -> ".join(str(loc) for loc in error["loc"])
        errors.append({
            "field": field_path,
            "message": error["msg"],
            "type": error["type"],
            "input": error.get("input")
        })
    
    error_response = ValidationErrorResponse(
        message="请求数据验证失败",
        details={"validation_errors": errors},
        request_id=getattr(request.state, 'request_id', 'unknown'),
        timestamp=datetime.utcnow()
    )
    
    return JSONResponse(
        status_code=422,
        content=error_response.dict(exclude_none=True)
    )


# 应用启动事件
@app.on_event("startup")
async def startup_event():
    """应用启动事件"""
    logger.info("🚀 智阅AI阅卷系统API已启动")
    logger.info("📚 API文档地址: http://localhost:8000/docs")
    logger.info("🔍 ReDoc文档地址: http://localhost:8000/redoc")


@app.on_event("shutdown")
async def shutdown_event():
    """应用关闭事件"""
    logger.info("👋 智阅AI阅卷系统API已关闭")


# 根路径
@app.get("/", tags=["系统"])
async def root():
    """系统根路径"""
    from schemas.response import SuccessResponse
    
    return SuccessResponse(
        data={
            "name": "智阅AI阅卷系统API",
            "version": "3.0.0",
            "description": "基于AI的智能阅卷解决方案",
            "docs": "/docs",
            "redoc": "/redoc",
            "health": "/health"
        },
        message="欢迎使用智阅AI阅卷系统API"
    )


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "backend.api.app:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )