"""
API基础模块
提供统一的API基类、响应格式和通用功能
"""

from typing import Any, Dict, List, Optional, Type, Union, Generic, TypeVar
from datetime import datetime
import uuid
import logging
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from schemas.response import (
    BaseResponse, SuccessResponse, ErrorResponse, 
    PaginatedResponse, PaginationMeta, PaginatedData
)

logger = logging.getLogger(__name__)

T = TypeVar('T')


class APIException(HTTPException):
    """自定义API异常"""
    
    def __init__(
        self,
        status_code: int,
        message: str,
        error_code: str = None,
        details: Dict[str, Any] = None
    ):
        self.status_code = status_code
        self.message = message
        self.error_code = error_code
        self.details = details
        super().__init__(status_code=status_code, detail=message)


class ValidationException(APIException):
    """验证异常"""
    
    def __init__(self, message: str, details: Dict[str, Any] = None):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            message=message,
            error_code="VALIDATION_ERROR",
            details=details
        )


class BusinessException(APIException):
    """业务逻辑异常"""
    
    def __init__(self, message: str, error_code: str = "BUSINESS_ERROR"):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            message=message,
            error_code=error_code
        )


class ResourceNotFoundException(APIException):
    """资源未找到异常"""
    
    def __init__(self, resource: str, identifier: str = None):
        message = f"{resource}不存在"
        if identifier:
            message += f"：{identifier}"
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            message=message,
            error_code="RESOURCE_NOT_FOUND"
        )


class BaseAPIRouter(APIRouter):
    """标准化API路由器"""
    
    def __init__(self, *args, **kwargs):
        # 设置默认响应模型
        if 'responses' not in kwargs:
            kwargs['responses'] = {
                400: {"model": ErrorResponse, "description": "请求错误"},
                401: {"model": ErrorResponse, "description": "未授权"},
                403: {"model": ErrorResponse, "description": "权限不足"},
                404: {"model": ErrorResponse, "description": "资源不存在"},
                422: {"model": ErrorResponse, "description": "数据验证失败"},
                500: {"model": ErrorResponse, "description": "服务器内部错误"}
            }
        
        super().__init__(*args, **kwargs)
    
    def create_response(
        self,
        data: Any = None,
        message: str = "操作成功",
        request_id: str = None
    ) -> SuccessResponse[Any]:
        """创建标准成功响应"""
        return SuccessResponse(
            data=data,
            message=message,
            request_id=request_id,
            timestamp=datetime.utcnow()
        )
    
    def create_error_response(
        self,
        message: str,
        error_code: str = "UNKNOWN_ERROR",
        details: Dict[str, Any] = None,
        request_id: str = None
    ) -> ErrorResponse:
        """创建标准错误响应"""
        return ErrorResponse(
            message=message,
            error_code=error_code,
            details=details,
            request_id=request_id,
            timestamp=datetime.utcnow()
        )
    
    def create_paginated_response(
        self,
        items: List[Any],
        total: int,
        page: int,
        limit: int,
        message: str = "获取数据成功",
        request_id: str = None
    ) -> PaginatedResponse[Any]:
        """创建分页响应"""
        total_pages = (total + limit - 1) // limit
        pagination = PaginationMeta(
            page=page,
            limit=limit,
            total=total,
            total_pages=total_pages,
            has_next=page < total_pages,
            has_prev=page > 1
        )
        
        paginated_data = PaginatedData(
            items=items,
            pagination=pagination
        )
        
        return PaginatedResponse(
            data=paginated_data,
            message=message,
            request_id=request_id,
            timestamp=datetime.utcnow()
        )


class BaseAPIController:
    """API控制器基类"""
    
    def __init__(self, router: BaseAPIRouter):
        self.router = router
        self.logger = logging.getLogger(self.__class__.__name__)
    
    def get_request_id(self, request: Request) -> str:
        """获取请求ID"""
        return getattr(request.state, 'request_id', str(uuid.uuid4()))
    
    def handle_exception(self, e: Exception, request: Request = None) -> ErrorResponse:
        """统一异常处理"""
        request_id = self.get_request_id(request) if request else str(uuid.uuid4())
        
        if isinstance(e, APIException):
            self.logger.warning(f"API异常: {e.message}", exc_info=True)
            return self.router.create_error_response(
                message=e.message,
                error_code=e.error_code,
                details=e.details,
                request_id=request_id
            )
        elif isinstance(e, HTTPException):
            self.logger.warning(f"HTTP异常: {e.detail}", exc_info=True)
            return self.router.create_error_response(
                message=str(e.detail),
                error_code="HTTP_ERROR",
                request_id=request_id
            )
        else:
            self.logger.error(f"未处理异常: {str(e)}", exc_info=True)
            return self.router.create_error_response(
                message="服务器内部错误",
                error_code="INTERNAL_ERROR",
                request_id=request_id
            )
    
    def validate_pagination_params(self, page: int, limit: int) -> tuple[int, int]:
        """验证分页参数"""
        if page < 1:
            raise ValidationException("页码必须大于0")
        
        if limit < 1 or limit > 100:
            raise ValidationException("每页数量必须在1-100之间")
        
        return page, limit
    
    def calculate_offset(self, page: int, limit: int) -> int:
        """计算偏移量"""
        return (page - 1) * limit


class StandardAPI:
    """标准API装饰器和工具"""
    
    @staticmethod
    def endpoint(
        path: str,
        methods: List[str] = None,
        response_model: Type[BaseModel] = None,
        summary: str = None,
        description: str = None,
        tags: List[str] = None
    ):
        """标准API端点装饰器"""
        def decorator(func):
            # 设置默认响应模型
            if response_model is None:
                response_model = SuccessResponse[Any]
            
            # 包装函数以处理标准响应格式
            async def wrapper(*args, **kwargs):
                try:
                    result = await func(*args, **kwargs)
                    
                    # 如果返回的已经是标准响应，直接返回
                    if isinstance(result, BaseResponse):
                        return result
                    
                    # 否则包装为标准成功响应
                    return SuccessResponse(
                        data=result,
                        message="操作成功",
                        timestamp=datetime.utcnow()
                    )
                    
                except Exception as e:
                    # 统一异常处理
                    if isinstance(e, APIException):
                        return ErrorResponse(
                            message=e.message,
                            error_code=e.error_code,
                            details=e.details,
                            timestamp=datetime.utcnow()
                        )
                    else:
                        logger.error(f"API异常: {str(e)}", exc_info=True)
                        return ErrorResponse(
                            message="服务器内部错误",
                            error_code="INTERNAL_ERROR",
                            timestamp=datetime.utcnow()
                        )
            
            wrapper.__name__ = func.__name__
            wrapper.__doc__ = func.__doc__
            return wrapper
        
        return decorator


# 请求ID中间件
async def add_request_id(request: Request, call_next):
    """添加请求ID中间件"""
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    
    return response


# API文档增强
def enhance_openapi_schema(app):
    """增强OpenAPI文档"""
    if app.openapi_schema:
        return app.openapi_schema
    
    from fastapi.openapi.utils import get_openapi
    
    openapi_schema = get_openapi(
        title="智阅AI阅卷系统API",
        version="3.0.0",
        description="""
        智阅AI阅卷系统后端API接口文档
        
        ## 特性
        - 统一的响应格式
        - 标准化错误处理
        - 完整的数据验证
        - 分页查询支持
        - 请求追踪
        
        ## 响应格式
        所有API响应都遵循统一格式：
        ```json
        {
            "success": true,
            "message": "操作成功",
            "data": {...},
            "timestamp": "2025-08-21T01:00:00Z",
            "request_id": "uuid"
        }
        ```
        """,
        routes=app.routes,
    )
    
    # 添加通用响应模型
    openapi_schema["components"]["schemas"]["BaseResponse"] = {
        "type": "object",
        "properties": {
            "success": {"type": "boolean", "description": "请求是否成功"},
            "message": {"type": "string", "description": "响应消息"},
            "timestamp": {"type": "string", "format": "date-time", "description": "响应时间戳"},
            "request_id": {"type": "string", "description": "请求ID"}
        }
    }
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema


# 常用查询参数
class CommonQueryParams(BaseModel):
    """通用查询参数"""
    page: int = Field(default=1, ge=1, description="页码")
    limit: int = Field(default=20, ge=1, le=100, description="每页数量")
    sort_by: Optional[str] = Field(default=None, description="排序字段")
    sort_order: Optional[str] = Field(default="desc", regex="^(asc|desc)$", description="排序方向")
    search: Optional[str] = Field(default=None, description="搜索关键词")


class TimeRangeParams(BaseModel):
    """时间范围参数"""
    start_time: Optional[datetime] = Field(default=None, description="开始时间")
    end_time: Optional[datetime] = Field(default=None, description="结束时间")


# 依赖注入工具
def get_common_params(
    page: int = 1,
    limit: int = 20,
    sort_by: Optional[str] = None,
    sort_order: str = "desc",
    search: Optional[str] = None
) -> CommonQueryParams:
    """获取通用查询参数"""
    return CommonQueryParams(
        page=page,
        limit=limit,
        sort_by=sort_by,
        sort_order=sort_order,
        search=search
    )


def get_time_range_params(
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None
) -> TimeRangeParams:
    """获取时间范围参数"""
    return TimeRangeParams(
        start_time=start_time,
        end_time=end_time
    )


# API版本控制
class APIVersion:
    """API版本管理"""
    V1 = "v1"
    V2 = "v2"
    CURRENT = V1
    
    @staticmethod
    def create_versioned_router(version: str, prefix: str, **kwargs) -> BaseAPIRouter:
        """创建版本化路由器"""
        versioned_prefix = f"/api/{version}{prefix}"
        return BaseAPIRouter(prefix=versioned_prefix, **kwargs)