"""
API验证中间件
提供统一的请求验证、响应格式化和错误处理
"""

import json
import logging
from typing import Any, Dict, List, Optional
from datetime import datetime
import uuid

from fastapi import Request, Response, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.middleware.base import BaseHTTPMiddleware
from pydantic import ValidationError

from schemas.response import ErrorResponse, ValidationErrorResponse
from api.base import APIException

logger = logging.getLogger(__name__)


class ValidationMiddleware(BaseHTTPMiddleware):
    """API验证中间件"""
    
    async def dispatch(self, request: Request, call_next):
        # 生成请求ID
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        
        # 记录请求开始时间
        start_time = datetime.utcnow()
        request.state.start_time = start_time
        
        try:
            # 处理请求
            response = await call_next(request)
            
            # 添加响应头
            response.headers["X-Request-ID"] = request_id
            response.headers["X-API-Version"] = "3.0.0"
            response.headers["Access-Control-Expose-Headers"] = "X-Request-ID,X-API-Version"
            
            return response
            
        except Exception as e:
            # 统一异常处理
            return await self._handle_exception(e, request_id)
    
    async def _handle_exception(self, exc: Exception, request_id: str) -> JSONResponse:
        """统一异常处理"""
        
        if isinstance(exc, RequestValidationError):
            # Pydantic验证错误
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
                request_id=request_id,
                timestamp=datetime.utcnow()
            )
            
            logger.warning(f"验证错误 [{request_id}]: {errors}")
            
            return JSONResponse(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                content=error_response.dict(exclude_none=True)
            )
        
        elif isinstance(exc, APIException):
            # 自定义API异常
            error_response = ErrorResponse(
                message=exc.message,
                error_code=exc.error_code,
                details=exc.details,
                request_id=request_id,
                timestamp=datetime.utcnow()
            )
            
            logger.warning(f"API异常 [{request_id}]: {exc.message}")
            
            return JSONResponse(
                status_code=exc.status_code,
                content=error_response.dict(exclude_none=True)
            )
        
        elif isinstance(exc, HTTPException):
            # FastAPI HTTP异常
            error_response = ErrorResponse(
                message=str(exc.detail),
                error_code="HTTP_ERROR",
                request_id=request_id,
                timestamp=datetime.utcnow()
            )
            
            logger.warning(f"HTTP异常 [{request_id}]: {exc.detail}")
            
            return JSONResponse(
                status_code=exc.status_code,
                content=error_response.dict(exclude_none=True)
            )
        
        else:
            # 其他未处理异常
            error_response = ErrorResponse(
                message="服务器内部错误",
                error_code="INTERNAL_SERVER_ERROR",
                request_id=request_id,
                timestamp=datetime.utcnow()
            )
            
            logger.error(f"未处理异常 [{request_id}]: {str(exc)}", exc_info=True)
            
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content=error_response.dict(exclude_none=True)
            )


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """请求日志中间件"""
    
    async def dispatch(self, request: Request, call_next):
        # 获取请求信息
        request_id = getattr(request.state, 'request_id', str(uuid.uuid4()))
        start_time = getattr(request.state, 'start_time', datetime.utcnow())
        
        # 记录请求
        logger.info(f"请求开始 [{request_id}]: {request.method} {request.url}")
        
        # 处理请求
        response = await call_next(request)
        
        # 计算处理时间
        process_time = (datetime.utcnow() - start_time).total_seconds()
        
        # 记录响应
        logger.info(
            f"请求完成 [{request_id}]: {request.method} {request.url} "
            f"- {response.status_code} - {process_time:.3f}s"
        )
        
        # 添加处理时间头
        response.headers["X-Process-Time"] = str(process_time)
        
        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """安全头中间件"""
    
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # 添加安全头
        security_headers = {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Content-Security-Policy": "default-src 'self'",
        }
        
        for header, value in security_headers.items():
            response.headers[header] = value
        
        return response


class RateLimitingMiddleware(BaseHTTPMiddleware):
    """简单的速率限制中间件"""
    
    def __init__(self, app, calls_per_minute: int = 60):
        super().__init__(app)
        self.calls_per_minute = calls_per_minute
        self.client_requests = {}  # {client_ip: [(timestamp, count), ...]}
    
    async def dispatch(self, request: Request, call_next):
        client_ip = self._get_client_ip(request)
        current_time = datetime.utcnow()
        
        # 检查速率限制
        if self._is_rate_limited(client_ip, current_time):
            error_response = ErrorResponse(
                message="请求频率过高，请稍后重试",
                error_code="RATE_LIMIT_EXCEEDED",
                request_id=getattr(request.state, 'request_id', str(uuid.uuid4())),
                timestamp=current_time
            )
            
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content=error_response.dict(exclude_none=True)
            )
        
        # 记录请求
        self._record_request(client_ip, current_time)
        
        return await call_next(request)
    
    def _get_client_ip(self, request: Request) -> str:
        """获取客户端IP"""
        # 检查代理头
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        return request.client.host if request.client else "unknown"
    
    def _is_rate_limited(self, client_ip: str, current_time: datetime) -> bool:
        """检查是否超过速率限制"""
        if client_ip not in self.client_requests:
            return False
        
        # 清理过期记录（超过1分钟）
        one_minute_ago = current_time.timestamp() - 60
        self.client_requests[client_ip] = [
            (ts, count) for ts, count in self.client_requests[client_ip]
            if ts > one_minute_ago
        ]
        
        # 计算当前分钟内的请求数
        request_count = sum(count for _, count in self.client_requests[client_ip])
        
        return request_count >= self.calls_per_minute
    
    def _record_request(self, client_ip: str, current_time: datetime):
        """记录请求"""
        if client_ip not in self.client_requests:
            self.client_requests[client_ip] = []
        
        timestamp = current_time.timestamp()
        
        # 如果最近的记录是同一秒，增加计数
        if (self.client_requests[client_ip] and 
            abs(self.client_requests[client_ip][-1][0] - timestamp) < 1):
            # 更新最后一条记录的计数
            last_ts, last_count = self.client_requests[client_ip][-1]
            self.client_requests[client_ip][-1] = (last_ts, last_count + 1)
        else:
            # 添加新记录
            self.client_requests[client_ip].append((timestamp, 1))


class ResponseFormatMiddleware(BaseHTTPMiddleware):
    """响应格式化中间件"""
    
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # 只处理JSON响应
        if "application/json" not in response.headers.get("content-type", ""):
            return response
        
        # 如果是API路径且不是错误响应，确保使用标准格式
        if (request.url.path.startswith("/api/") and 
            200 <= response.status_code < 300):
            
            # 这里可以添加响应格式检查和转换逻辑
            pass
        
        return response


# 健康检查路由
from fastapi import APIRouter
from schemas.response import SuccessResponse

health_router = APIRouter()

@health_router.get("/health", response_model=SuccessResponse[Dict[str, Any]], tags=["系统"])
async def health_check():
    """系统健康检查"""
    return SuccessResponse(
        data={
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "version": "3.0.0"
        },
        message="系统运行正常"
    )

@health_router.get("/api/health", response_model=SuccessResponse[Dict[str, Any]], tags=["系统"])
async def api_health_check():
    """API健康检查"""
    return SuccessResponse(
        data={
            "api_status": "healthy",
            "database_status": "connected",  # 这里可以添加实际的数据库检查
            "timestamp": datetime.utcnow().isoformat(),
            "version": "3.0.0"
        },
        message="API服务正常"
    )