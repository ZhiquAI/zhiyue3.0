"""统一API响应格式定义"""

from typing import Any, Optional, Dict, Generic, TypeVar
from pydantic import BaseModel, Field
from datetime import datetime

# 泛型类型变量
T = TypeVar('T')


class BaseResponse(BaseModel, Generic[T]):
    """统一API响应基类"""
    success: bool = Field(description="请求是否成功")
    message: str = Field(description="响应消息")
    data: Optional[T] = Field(default=None, description="响应数据")
    timestamp: datetime = Field(
        default_factory=datetime.utcnow, description="响应时间戳"
    )
    request_id: Optional[str] = Field(default=None, description="请求ID")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() + "Z"
        }


class SuccessResponse(BaseResponse[T]):
    """成功响应"""
    success: bool = Field(default=True, description="请求成功")
    message: str = Field(default="操作成功", description="成功消息")


class ErrorResponse(BaseResponse[None]):
    """错误响应"""
    success: bool = Field(default=False, description="请求失败")
    error_code: Optional[str] = Field(default=None, description="错误代码")
    details: Optional[Dict[str, Any]] = Field(
        default=None, description="错误详情"
    )
    data: None = Field(default=None, description="错误响应无数据")


class ValidationErrorResponse(ErrorResponse):
    """验证错误响应"""
    message: str = Field(default="数据验证失败", description="验证错误消息")
    error_code: str = Field(
        default="VALIDATION_ERROR", description="验证错误代码"
    )


class PaginationMeta(BaseModel):
    """分页元数据"""
    page: int = Field(description="当前页码")
    limit: int = Field(description="每页数量")
    total: int = Field(description="总记录数")
    total_pages: int = Field(description="总页数")
    has_next: bool = Field(description="是否有下一页")
    has_prev: bool = Field(description="是否有上一页")


class PaginatedData(BaseModel, Generic[T]):
    """分页数据"""
    items: list[T] = Field(description="数据列表")
    pagination: PaginationMeta = Field(description="分页信息")


class PaginatedResponse(SuccessResponse[PaginatedData[T]]):
    """分页响应"""
    pass


# 常用响应类型别名
StringResponse = SuccessResponse[str]
DictResponse = SuccessResponse[Dict[str, Any]]
ListResponse = SuccessResponse[list]
BoolResponse = SuccessResponse[bool]
IntResponse = SuccessResponse[int]