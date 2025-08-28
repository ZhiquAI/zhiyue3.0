"""响应中间件 - 统一处理API响应格式"""

import uuid
import time
from typing import Callable
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import json
import logging

logger = logging.getLogger(__name__)


class ResponseMiddleware(BaseHTTPMiddleware):
    """响应格式统一中间件"""
    
    async def dispatch(
        self, request: Request, call_next: Callable
    ) -> Response:
        # 生成请求ID
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        
        # 记录请求开始时间
        start_time = time.time()
        
        # 添加请求ID到请求头
        request.headers.__dict__["_list"].append(
            (b"x-request-id", request_id.encode())
        )
        
        try:
            # 执行请求
            response = await call_next(request)
            
            # 计算处理时间
            process_time = time.time() - start_time
            
            # 添加响应头
            response.headers["X-Request-ID"] = request_id
            response.headers["X-Process-Time"] = str(process_time)
            
            # 如果是JSON响应且状态码表示成功，确保格式统一
            if (
                isinstance(response, JSONResponse) and 
                200 <= response.status_code < 300
            ):
                try:
                    # 获取响应内容
                    body = response.body.decode('utf-8')
                    data = json.loads(body)
                    
                    # 如果响应没有统一格式，进行包装
                    if not isinstance(data, dict) or 'success' not in data:
                        wrapped_data = {
                            "success": True,
                            "message": "操作成功",
                            "data": data,
                            "timestamp": time.strftime(
                                "%Y-%m-%dT%H:%M:%S.%fZ", 
                                time.gmtime()
                            ),
                            "request_id": request_id
                        }
                        
                        # 创建新的响应
                        response = JSONResponse(
                            content=wrapped_data,
                            status_code=response.status_code,
                            headers=dict(response.headers)
                        )
                    else:
                        # 确保包含request_id
                        if 'request_id' not in data:
                            data['request_id'] = request_id
                            response = JSONResponse(
                                content=data,
                                status_code=response.status_code,
                                headers=dict(response.headers)
                            )
                            
                except (json.JSONDecodeError, UnicodeDecodeError):
                    # 如果解析失败，保持原响应
                    pass
            
            return response
            
        except Exception as e:
            # 处理未捕获的异常
            logger.error(
                f"请求处理异常 [Request ID: {request_id}]: {str(e)}",
                exc_info=True
            )
            
            error_response = JSONResponse(
                status_code=500,
                content={
                    "success": False,
                    "message": "服务器内部错误",
                    "data": None,
                    "error_code": "INTERNAL_SERVER_ERROR",
                    "timestamp": time.strftime(
                        "%Y-%m-%dT%H:%M:%S.%fZ", 
                        time.gmtime()
                    ),
                    "request_id": request_id
                },
                headers={
                    "X-Request-ID": request_id,
                    "X-Process-Time": str(time.time() - start_time)
                }
            )
            
            return error_response


def get_request_id(request: Request) -> str:
    """获取当前请求的ID"""
    return getattr(request.state, 'request_id', 'unknown')