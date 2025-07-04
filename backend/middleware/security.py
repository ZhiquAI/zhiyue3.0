"""
安全中间件
"""

from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import time
import hashlib
import hmac
from typing import Dict, Any
import json
import logging

from config.settings import settings

logger = logging.getLogger(__name__)

# 限流器
limiter = Limiter(key_func=get_remote_address)

# 请求签名验证
security = HTTPBearer(auto_error=False)

class SecurityMiddleware:
    """安全中间件类"""
    
    def __init__(self):
        self.blocked_ips = set()
        self.suspicious_requests = {}
        
    async def validate_request(self, request: Request) -> bool:
        """验证请求的安全性"""
        client_ip = get_remote_address(request)
        
        # 检查IP是否被封禁
        if client_ip in self.blocked_ips:
            raise HTTPException(status_code=403, detail="IP已被封禁")
        
        # 检查请求频率
        self._check_request_frequency(client_ip)
        
        # 验证请求头
        self._validate_headers(request)
        
        # 检查SQL注入等恶意内容
        await self._check_malicious_content(request)
        
        return True
    
    def _check_request_frequency(self, client_ip: str):
        """检查请求频率"""
        current_time = time.time()
        
        if client_ip not in self.suspicious_requests:
            self.suspicious_requests[client_ip] = []
        
        # 清理过期记录（5分钟前的）
        self.suspicious_requests[client_ip] = [
            req_time for req_time in self.suspicious_requests[client_ip]
            if current_time - req_time < 300
        ]
        
        # 检查5分钟内的请求次数
        self.suspicious_requests[client_ip].append(current_time)
        
        # 如果5分钟内超过1000次请求，标记为可疑
        if len(self.suspicious_requests[client_ip]) > 1000:
            logger.warning(f"可疑高频请求来自IP: {client_ip}")
            self.blocked_ips.add(client_ip)
            raise HTTPException(status_code=429, detail="请求过于频繁")
    
    def _validate_headers(self, request: Request):
        """验证请求头"""
        # 检查User-Agent
        user_agent = request.headers.get("user-agent", "")
        if not user_agent or len(user_agent) < 5:
            logger.warning(f"可疑请求头来自IP: {get_remote_address(request)}")
        
        # 检查Content-Type（对于POST请求）
        if request.method in ["POST", "PUT", "PATCH"]:
            content_type = request.headers.get("content-type", "")
            if not content_type:
                logger.warning(f"缺少Content-Type头: {get_remote_address(request)}")
    
    async def _check_malicious_content(self, request: Request):
        """检查恶意内容"""
        # SQL注入检测模式
        sql_patterns = [
            "union select", "drop table", "delete from", 
            "insert into", "update set", "exec(", "script>",
            "javascript:", "vbscript:", "onload=", "onerror="
        ]
        
        # 检查URL路径
        path = request.url.path.lower()
        for pattern in sql_patterns:
            if pattern in path:
                logger.error(f"检测到可疑SQL注入尝试: {path} 来自IP: {get_remote_address(request)}")
                raise HTTPException(status_code=400, detail="请求包含非法内容")
        
        # 检查查询参数
        query_params = str(request.query_params).lower()
        for pattern in sql_patterns:
            if pattern in query_params:
                logger.error(f"检测到可疑SQL注入尝试: {query_params} 来自IP: {get_remote_address(request)}")
                raise HTTPException(status_code=400, detail="请求包含非法内容")

# 实例化安全中间件
security_middleware = SecurityMiddleware()

# 限流装饰器
def rate_limit(rate: str):
    """限流装饰器"""
    return limiter.limit(rate)

# 请求验证依赖
async def validate_request_security(request: Request):
    """请求安全验证依赖"""
    await security_middleware.validate_request(request)
    return True

# 参数验证函数
def validate_pagination_params(skip: int = 0, limit: int = 100):
    """验证分页参数"""
    if skip < 0:
        raise HTTPException(status_code=400, detail="skip参数不能为负数")
    
    if limit <= 0 or limit > 1000:
        raise HTTPException(status_code=400, detail="limit参数必须在1-1000之间")
    
    return {"skip": skip, "limit": limit}

def validate_id_param(id_value: str, param_name: str = "id"):
    """验证ID参数"""
    if not id_value or len(id_value) != 36:
        raise HTTPException(status_code=400, detail=f"无效的{param_name}格式")
    
    # 简单的UUID格式验证
    try:
        import uuid
        uuid.UUID(id_value)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"无效的{param_name}格式")
    
    return id_value

def sanitize_input(input_data: Any) -> Any:
    """清理输入数据"""
    if isinstance(input_data, str):
        # 移除潜在的HTML/JS代码
        import re
        # 移除HTML标签
        input_data = re.sub(r'<[^>]+>', '', input_data)
        # 移除JavaScript事件
        input_data = re.sub(r'on\w+\s*=', '', input_data, flags=re.IGNORECASE)
        # 移除script标签内容
        input_data = re.sub(r'<script.*?</script>', '', input_data, flags=re.IGNORECASE | re.DOTALL)
        
    elif isinstance(input_data, dict):
        return {key: sanitize_input(value) for key, value in input_data.items()}
    
    elif isinstance(input_data, list):
        return [sanitize_input(item) for item in input_data]
    
    return input_data

# CSRF保护
def generate_csrf_token(user_id: str) -> str:
    """生成CSRF令牌"""
    timestamp = str(int(time.time()))
    message = f"{user_id}:{timestamp}"
    signature = hmac.new(
        settings.SECRET_KEY.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()
    return f"{message}:{signature}"

def validate_csrf_token(token: str, user_id: str) -> bool:
    """验证CSRF令牌"""
    try:
        parts = token.split(":")
        if len(parts) != 3:
            return False
        
        user_part, timestamp_part, signature = parts
        
        # 检查用户ID
        if user_part != user_id:
            return False
        
        # 检查时间戳（24小时内有效）
        timestamp = int(timestamp_part)
        if time.time() - timestamp > 86400:  # 24小时
            return False
        
        # 验证签名
        message = f"{user_part}:{timestamp_part}"
        expected_signature = hmac.new(
            settings.SECRET_KEY.encode(),
            message.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(signature, expected_signature)
        
    except (ValueError, TypeError):
        return False

# 文件上传安全验证
def validate_file_upload(file_content: bytes, filename: str) -> bool:
    """验证上传文件的安全性"""
    # 检查文件大小
    if len(file_content) > settings.MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="文件大小超过限制")
    
    # 检查文件扩展名
    import os
    _, ext = os.path.splitext(filename.lower())
    if ext not in settings.ALLOWED_FILE_EXTENSIONS:
        raise HTTPException(status_code=400, detail="不支持的文件类型")
    
    # 检查文件头部（魔数）
    file_signatures = {
        b'\xFF\xD8\xFF': ['.jpg', '.jpeg'],
        b'\x89PNG\r\n\x1a\n': ['.png'],
        b'%PDF': ['.pdf'],
        b'II*\x00': ['.tiff', '.tif'],
        b'MM\x00*': ['.tiff', '.tif']
    }
    
    file_header = file_content[:10]
    valid_signature = False
    
    for signature, extensions in file_signatures.items():
        if file_header.startswith(signature) and ext in extensions:
            valid_signature = True
            break
    
    if not valid_signature:
        raise HTTPException(status_code=400, detail="文件内容与扩展名不匹配")
    
    return True

# 数据脱敏函数
def mask_sensitive_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """脱敏敏感数据"""
    sensitive_fields = ['password', 'hashed_password', 'secret_key', 'api_key', 'token']
    
    masked_data = data.copy()
    
    for field in sensitive_fields:
        if field in masked_data:
            if isinstance(masked_data[field], str) and len(masked_data[field]) > 4:
                masked_data[field] = masked_data[field][:2] + "*" * (len(masked_data[field]) - 4) + masked_data[field][-2:]
            else:
                masked_data[field] = "***"
    
    return masked_data