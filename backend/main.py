import logging
from contextlib import asynccontextmanager

# from api.choice_grading import router as choice_grading_router
from api.barcode import router as barcode_router
from api.classified_grading import classifier_router
from api.classified_grading import router as classified_grading_router
from api.classified_grading import segmentation_router
from api.compatibility import router as compatibility_router
from api.database_optimization import router as database_optimization_router
from api.exam_management import router as exam_router
from api.file_upload import router as file_upload_router
from api.grading_review import router as grading_review_router
from api.grading_workflow import router as grading_workflow_router
from api.intelligent_segmentation import router as intelligent_segmentation_router
from api.model_training import router as model_training_router
from api.monitoring import router as monitoring_router
from api.ocr_processing import router as ocr_router

# from api.batch_monitoring import router as batch_monitoring_router
from api.pre_grading import router as pre_grading_router
from api.prometheus_endpoint import router as prometheus_router
from api.quality_control import router as quality_control_router
from api.scoring_standards import router as scoring_standards_router
from api.student_management import router as student_management_router
from api.template_management import router as template_management_router
from api.websocket_metrics import router as websocket_metrics_router
from api.websocket_routes import router as websocket_router
from auth import router as auth_router
from config.settings import settings
from db_connection import create_tables
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

# 导入中间件
from middleware.response_middleware import ResponseMiddleware
from middleware.security_middleware import RateLimitMiddleware, SecurityMiddleware
from routes.auth_enhanced import router as auth_enhanced_router
from services.concurrency_manager import global_concurrency_manager
from services.monitoring_system import monitoring_system
from services.prometheus_metrics import metrics_collector
from services.websocket_performance import (
    connection_pool,
    message_queue,
    performance_monitor,
)
from starlette.exceptions import HTTPException as StarletteHTTPException

# 配置日志
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时仅在开发模式下自动建表，生产由 Alembic 管理
    if settings.DEBUG:
        logger.info("创建数据库表...")
        create_tables()

    # 启动WebSocket性能监控系统
    logger.info("启动WebSocket性能监控系统...")
    await message_queue.start_processing()
    await performance_monitor.start_monitoring(connection_pool, message_queue)
    logger.info("✅ WebSocket性能监控系统已启动")

    # 启动Prometheus指标收集
    logger.info("启动Prometheus指标收集...")
    await metrics_collector.start_collection()
    logger.info("✅ Prometheus指标收集已启动")

    # 启动并发管理器
    logger.info("启动并发管理器...")
    await global_concurrency_manager.start()
    logger.info("✅ 并发管理器已启动")

    # 启动监控系统
    logger.info("启动监控系统...")
    await monitoring_system.start()
    logger.info("✅ 监控系统已启动")

    logger.info("智阅AI后端服务启动完成")
    yield

    # 关闭时的清理工作
    logger.info("关闭监控系统...")
    await monitoring_system.stop()
    logger.info("✅ 监控系统已关闭")

    logger.info("关闭并发管理器...")
    await global_concurrency_manager.stop()
    logger.info("✅ 并发管理器已关闭")

    logger.info("关闭Prometheus指标收集...")
    await metrics_collector.stop_collection()
    logger.info("✅ Prometheus指标收集已关闭")

    logger.info("关闭WebSocket性能监控系统...")
    await message_queue.stop_processing()
    await performance_monitor.stop_monitoring()
    logger.info("✅ WebSocket性能监控系统已关闭")
    logger.info("智阅AI后端服务关闭")


app = FastAPI(
    title="智阅AI后端API",
    description="智能阅卷系统后端服务",
    version="1.0.0",
    lifespan=lifespan,
)

# 配置CORS中间件（必须在其他中间件之前，以正确处理OPTIONS预检请求）
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "http://127.0.0.1:5176",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# 添加安全中间件（顺序很重要）
app.add_middleware(SecurityMiddleware)
app.add_middleware(RateLimitMiddleware, calls=100, period=60)

# 添加响应格式统一中间件
app.add_middleware(ResponseMiddleware)

# 可信主机中间件
if not settings.DEBUG:
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=["localhost", "127.0.0.1", "*.zhiyue-ai.com"],
    )

# 注册路由
app.include_router(auth_router)
app.include_router(auth_enhanced_router)  # 增强认证路由
app.include_router(exam_router)
app.include_router(ocr_router)
app.include_router(file_upload_router)
app.include_router(classified_grading_router)
app.include_router(segmentation_router)
app.include_router(classifier_router)
# app.include_router(choice_grading_router, prefix="/api")
app.include_router(barcode_router)  # 条形码服务路由
app.include_router(scoring_standards_router)  # 评分标准服务路由
app.include_router(intelligent_segmentation_router)  # 智能切题路由
app.include_router(student_management_router, prefix="/api")  # 学生信息管理路由
app.include_router(grading_review_router)  # 阅卷复核路由
app.include_router(grading_workflow_router)  # 阅卷工作流程路由
app.include_router(template_management_router)  # 答题卡模板管理路由
# app.include_router(batch_monitoring_router)  # 批量处理监控路由
app.include_router(pre_grading_router)  # 阅卷前处理工作流路由
app.include_router(websocket_router)  # WebSocket路由
app.include_router(websocket_metrics_router)  # WebSocket监控路由
app.include_router(prometheus_router)  # Prometheus监控路由
app.include_router(database_optimization_router)  # 数据库优化路由

app.include_router(model_training_router)  # 模型训练管理路由
app.include_router(quality_control_router)  # 智能质量控制路由
app.include_router(compatibility_router)  # 数据兼容性路由
app.include_router(monitoring_router)  # 系统监控路由


@app.get("/")
def read_root(request: Request):
    """根路径，返回API信息"""
    from utils.response import success_response

    return success_response(
        data={
            "name": "智阅AI后端API",
            "version": "1.0.0",
            "description": "智能历史阅卷系统后端服务",
            "docs_url": "/docs",
            "redoc_url": "/redoc",
            "status": "running",
        },
        message="API信息获取成功",
        request_id=getattr(request.state, "request_id", "unknown"),
    )


@app.get("/health")
def health_check(request: Request):
    """健康检查接口"""
    from utils.response import success_response

    return success_response(
        data={
            "status": "healthy",
            "version": "1.0.0",
            "websocket": {
                "active_connections": len(connection_pool.connections),
                "queue_size": (
                    message_queue.queue.qsize() if message_queue.queue else 0
                ),
            },
        },
        message="服务运行正常",
        request_id=getattr(request.state, "request_id", "unknown"),
    )


@app.get("/api/config", response_model=dict)
def get_config():
    """获取前端配置"""
    return {
        "ocr_config": settings.get_ocr_config(),
        "file_config": {
            "max_file_size": settings.MAX_FILE_SIZE,
            "allowed_extensions": settings.ALLOWED_FILE_EXTENSIONS,
        },
        "features": {
            "ai_grading_enabled": settings.AI_GRADING_ENABLED,
            "ai_analysis_enabled": settings.AI_ANALYSIS_ENABLED,
            "ai_suggestion_enabled": settings.AI_SUGGESTION_ENABLED,
        },
    }


# 全局异常处理


@app.exception_handler(StarletteHTTPException)
async def starlette_http_exception_handler(request, exc):
    """Starlette HTTP异常处理器（包括404）"""
    from fastapi.responses import JSONResponse
    from utils.response import error_response

    logger.error(f"Starlette HTTP异常: {exc.status_code} - {exc.detail}")
    request_id = getattr(request.state, "request_id", "unknown")
    error_resp = error_response(
        message=exc.detail, error_code=f"HTTP_{exc.status_code}", request_id=request_id
    )
    return JSONResponse(
        status_code=exc.status_code, content=error_resp.model_dump(mode="json")
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """FastAPI HTTP异常处理器"""
    from fastapi.responses import JSONResponse
    from utils.response import error_response

    logger.error(f"HTTP异常: {exc.status_code} - {exc.detail}")
    request_id = getattr(request.state, "request_id", "unknown")
    error_resp = error_response(
        message=exc.detail, error_code=f"HTTP_{exc.status_code}", request_id=request_id
    )
    return JSONResponse(
        status_code=exc.status_code, content=error_resp.model_dump(mode="json")
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """增强的全局异常处理器"""
    from utils.error_handler import error_handler
    from utils.response import error_response

    logger.error(f"未处理异常: {str(exc)}", exc_info=True)

    # 使用增强的错误处理器
    error_result = await error_handler.handle_error(
        exc,
        {
            "request_path": str(request.url.path),
            "request_method": request.method,
            "request_id": getattr(request.state, "request_id", "unknown"),
        },
    )

    request_id = getattr(request.state, "request_id", "unknown")

    return error_response(
        message=error_result["error_details"]["message"],
        error_code=error_result["error_details"]["error_code"],
        status_code=500,
        request_id=request_id,
        additional_data={
            "category": error_result["error_details"]["category"],
            "severity": error_result["error_details"]["severity"],
            "suggestions": error_result["error_details"]["suggestions"],
            "recoverable": error_result["error_details"]["recoverable"],
            "recovery_attempted": error_result["recovery_attempted"],
        },
    )
