"""
响应工具类
提供标准化响应生成的工具函数
"""

from typing import Any, Dict, List, Optional, Type, TypeVar, Union
from datetime import datetime
from pydantic import BaseModel

from schemas.response import (
    BaseResponse, SuccessResponse, ErrorResponse, ValidationErrorResponse,
    PaginatedResponse, PaginationMeta, PaginatedData
)

T = TypeVar('T')


class ResponseUtils:
    """响应工具类"""
    
    @staticmethod
    def success(
        data: Any = None,
        message: str = "操作成功",
        request_id: str = None
    ) -> SuccessResponse[Any]:
        """创建成功响应"""
        return SuccessResponse(
            data=data,
            message=message,
            request_id=request_id,
            timestamp=datetime.utcnow()
        )
    
    @staticmethod
    def error(
        message: str,
        error_code: str = "UNKNOWN_ERROR",
        details: Dict[str, Any] = None,
        request_id: str = None
    ) -> ErrorResponse:
        """创建错误响应"""
        return ErrorResponse(
            message=message,
            error_code=error_code,
            details=details,
            request_id=request_id,
            timestamp=datetime.utcnow()
        )
    
    @staticmethod
    def paginated(
        items: List[Any],
        total: int,
        page: int,
        limit: int,
        message: str = "获取数据成功",
        request_id: str = None
    ) -> PaginatedResponse[Any]:
        """创建分页响应"""
        total_pages = (total + limit - 1) // limit if limit > 0 else 1
        
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


# 常用响应消息常量
class ResponseMessages:
    """响应消息常量"""
    
    SUCCESS = "操作成功"
    CREATED = "创建成功"
    UPDATED = "更新成功"
    DELETED = "删除成功"
    RETRIEVED = "获取成功"


# 向后兼容层 - 旧版本API
def success_response(data: Any = None, message: str = "操作成功", request_id: str = None):
    """向后兼容的成功响应函数"""
    return ResponseUtils.success(data=data, message=message, request_id=request_id)

def error_response(message: str, error_code: str = "UNKNOWN_ERROR", details: Dict[str, Any] = None, request_id: str = None):
    """向后兼容的错误响应函数"""
    return ResponseUtils.error(message=message, error_code=error_code, details=details, request_id=request_id)

def validation_error_response(message: str, details: Dict[str, Any] = None, request_id: str = None):
    """向后兼容的验证错误响应函数"""
    return ResponseUtils.error(message=message, error_code="VALIDATION_ERROR", details=details, request_id=request_id)

def not_found_response(message: str = "资源不存在", request_id: str = None):
    """向后兼容的未找到响应函数"""
    return ResponseUtils.error(message=message, error_code="NOT_FOUND", request_id=request_id)

def unauthorized_response(message: str = "未授权访问", request_id: str = None):
    """向后兼容的未授权响应函数"""
    return ResponseUtils.error(message=message, error_code="UNAUTHORIZED", request_id=request_id)

def forbidden_response(message: str = "访问被禁止", request_id: str = None):
    """向后兼容的禁止访问响应函数"""
    return ResponseUtils.error(message=message, error_code="FORBIDDEN", request_id=request_id)

def server_error_response(message: str = "服务器内部错误", request_id: str = None):
    """向后兼容的服务器错误响应函数"""
    return ResponseUtils.error(message=message, error_code="SERVER_ERROR", request_id=request_id)