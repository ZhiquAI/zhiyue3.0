"""
安全中间件
自动应用SQL注入和XSS防护
"""

import json
import logging
from typing import Dict, Any
from fastapi import Request, Response, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from security import security_validator

logger = logging.getLogger(__name__)

class SecurityMiddleware(BaseHTTPMiddleware):
    """安全防护中间件"""
    
    # 需要安全验证的路径模式
    PROTECTED_PATHS = [
        '/api/grading',
        '/api/exam',
        '/api/student',
        '/api/ai-grading',
        '/api/model-training',
        '/api/quality-control'
    ]
    
    # 字段类型映射
    FIELD_TYPES = {
        'exam_id': 'id',
        'student_id': 'id', 
        'session_id': 'session_id',
        'user_id': 'id',
        'username': 'username',
        'email': 'email',
        'filename': 'filename',
        'exam_code': 'exam_code',
    }
    
    async def dispatch(self, request: Request, call_next):
        """处理请求"""
        try:
            # 检查是否需要安全验证
            if self._needs_security_check(request.url.path):
                await self._validate_request_security(request)
            
            # 处理请求
            response = await call_next(request)
            
            # 添加安全头
            self._add_security_headers(response)
            
            return response
            
        except HTTPException as e:
            logger.error(f"安全验证失败: {e.detail}")
            return JSONResponse(
                status_code=e.status_code,
                content={
                    "error": True,
                    "message": "安全验证失败",
                    "detail": e.detail,
                    "error_code": "SECURITY_VALIDATION_FAILED"
                }
            )
        except Exception as e:
            logger.error(f"安全中间件错误: {str(e)}", exc_info=True)
            return JSONResponse(
                status_code=500,
                content={
                    "error": True,
                    "message": "内部安全错误",
                    "error_code": "INTERNAL_SECURITY_ERROR"
                }
            )
    
    def _needs_security_check(self, path: str) -> bool:
        """检查路径是否需要安全验证"""
        return any(path.startswith(protected_path) for protected_path in self.PROTECTED_PATHS)
    
    async def _validate_request_security(self, request: Request):
        """验证请求安全性"""
        # 验证URL参数
        if request.query_params:
            query_dict = dict(request.query_params)
            try:
                security_validator.validate_request_data(query_dict, self.FIELD_TYPES)
            except ValueError as e:
                raise HTTPException(status_code=400, detail=f"URL参数安全验证失败: {str(e)}")
        
        # 验证请求体
        if request.method in ['POST', 'PUT', 'PATCH']:
            try:
                body = await request.body()
                if body:
                    # 尝试解析JSON
                    try:
                        json_data = json.loads(body.decode('utf-8'))
                        if isinstance(json_data, dict):
                            validated_data = security_validator.validate_request_data(json_data, self.FIELD_TYPES)
                            # 将验证后的数据存储到request.state中
                            request.state.validated_data = validated_data
                    except json.JSONDecodeError:
                        # 不是JSON数据，跳过验证
                        pass
            except ValueError as e:
                raise HTTPException(status_code=400, detail=f"请求体安全验证失败: {str(e)}")
        
        # 验证请求头
        self._validate_headers(request)
    
    def _validate_headers(self, request: Request):
        """验证请求头"""
        # 检查User-Agent
        user_agent = request.headers.get('user-agent', '')
        if self._is_malicious_user_agent(user_agent):
            raise HTTPException(status_code=403, detail="可疑的User-Agent")
        
        # 检查Content-Type
        content_type = request.headers.get('content-type', '')
        if request.method in ['POST', 'PUT', 'PATCH'] and content_type:
            if not self._is_valid_content_type(content_type):
                raise HTTPException(status_code=400, detail="不支持的Content-Type")
    
    def _is_malicious_user_agent(self, user_agent: str) -> bool:
        """检查是否为恶意User-Agent"""
        malicious_patterns = [
            'sqlmap',
            'nikto',
            'nessus',
            'openvas',
            'nmap',
            '<script',
            'javascript:',
        ]
        
        user_agent_lower = user_agent.lower()
        return any(pattern in user_agent_lower for pattern in malicious_patterns)
    
    def _is_valid_content_type(self, content_type: str) -> bool:
        """检查Content-Type是否有效"""
        valid_types = [
            'application/json',
            'application/x-www-form-urlencoded',
            'multipart/form-data',
            'text/plain',
        ]
        
        content_type_lower = content_type.lower().split(';')[0].strip()
        return content_type_lower in valid_types
    
    def _add_security_headers(self, response: Response):
        """添加安全响应头"""
        security_headers = {
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block',
            'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
            'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
        }
        
        for header, value in security_headers.items():
            response.headers[header] = value

class RateLimitMiddleware(BaseHTTPMiddleware):
    """请求频率限制中间件"""
    
    def __init__(self, app, calls: int = 100, period: int = 60):
        super().__init__(app)
        self.calls = calls  # 允许的请求数
        self.period = period  # 时间窗口（秒）
        self.requests = {}  # 存储请求记录
    
    async def dispatch(self, request: Request, call_next):
        """处理请求"""
        client_ip = self._get_client_ip(request)
        
        # 检查频率限制
        if self._is_rate_limited(client_ip):
            logger.warning(f"IP {client_ip} 触发频率限制")
            return JSONResponse(
                status_code=429,
                content={
                    "error": True,
                    "message": "请求过于频繁，请稍后再试",
                    "error_code": "RATE_LIMIT_EXCEEDED"
                }
            )
        
        # 记录请求
        self._record_request(client_ip)
        
        return await call_next(request)
    
    def _get_client_ip(self, request: Request) -> str:
        """获取客户端IP"""
        # 检查代理头
        forwarded_for = request.headers.get('x-forwarded-for')
        if forwarded_for:
            return forwarded_for.split(',')[0].strip()
        
        real_ip = request.headers.get('x-real-ip')
        if real_ip:
            return real_ip
        
        return request.client.host if request.client else 'unknown'
    
    def _is_rate_limited(self, client_ip: str) -> bool:
        """检查是否触发频率限制"""
        import time
        
        now = time.time()
        
        if client_ip not in self.requests:
            return False
        
        # 清理过期记录
        self.requests[client_ip] = [
            req_time for req_time in self.requests[client_ip]
            if now - req_time < self.period
        ]
        
        return len(self.requests[client_ip]) >= self.calls
    
    def _record_request(self, client_ip: str):
        """记录请求"""
        import time
        
        now = time.time()
        
        if client_ip not in self.requests:
            self.requests[client_ip] = []
        
        self.requests[client_ip].append(now)