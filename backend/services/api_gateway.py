"""
API Gateway with Rate Limiting and Authentication
智阅3.0API网关实现
"""

import asyncio
import json
import logging
import time
import jwt
import hashlib
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, List, Optional, Any, Callable, Set, Union, Tuple
from collections import defaultdict, deque
import aiohttp
from aiohttp import web, ClientSession, ClientTimeout
import aioredis
from pathlib import Path
import re
import ipaddress
import weakref

logger = logging.getLogger(__name__)

class AuthType(str, Enum):
    """认证类型"""
    NONE = "none"
    API_KEY = "api_key"
    JWT = "jwt"
    OAUTH2 = "oauth2"
    BASIC = "basic"

class RateLimitType(str, Enum):
    """限流类型"""
    PER_IP = "per_ip"
    PER_USER = "per_user"
    PER_API_KEY = "per_api_key"
    GLOBAL = "global"

class RouteMethod(str, Enum):
    """路由方法"""
    GET = "GET"
    POST = "POST"
    PUT = "PUT"
    DELETE = "DELETE"
    PATCH = "PATCH"
    HEAD = "HEAD"
    OPTIONS = "OPTIONS"
    ALL = "*"

@dataclass
class RateLimitRule:
    """限流规则"""
    name: str
    limit_type: RateLimitType
    max_requests: int
    window_seconds: int
    burst_capacity: int = 0
    paths: List[str] = field(default_factory=list)
    methods: List[str] = field(default_factory=list)
    
    def matches(self, path: str, method: str) -> bool:
        """检查是否匹配"""
        path_match = not self.paths or any(self._path_matches(path, pattern) for pattern in self.paths)
        method_match = not self.methods or method.upper() in self.methods or "*" in self.methods
        return path_match and method_match
    
    def _path_matches(self, path: str, pattern: str) -> bool:
        """路径匹配"""
        if pattern.endswith("*"):
            return path.startswith(pattern[:-1])
        return path == pattern

@dataclass
class AuthRule:
    """认证规则"""
    name: str
    auth_type: AuthType
    paths: List[str] = field(default_factory=list)
    methods: List[str] = field(default_factory=list)
    required_scopes: List[str] = field(default_factory=list)
    
    def matches(self, path: str, method: str) -> bool:
        """检查是否匹配"""
        path_match = not self.paths or any(self._path_matches(path, pattern) for pattern in self.paths)
        method_match = not self.methods or method.upper() in self.methods or "*" in self.methods
        return path_match and method_match
    
    def _path_matches(self, path: str, pattern: str) -> bool:
        """路径匹配"""
        if pattern.endswith("*"):
            return path.startswith(pattern[:-1])
        return path == pattern

@dataclass
class RouteConfig:
    """路由配置"""
    path: str
    methods: List[str]
    upstream: str
    upstream_path: str = None
    timeout: int = 30
    retries: int = 0
    load_balance_type: str = "round_robin"
    
    # 中间件配置
    auth_required: bool = True
    rate_limit_enabled: bool = True
    cache_enabled: bool = False
    cache_ttl: int = 300
    
    # 路由转换
    strip_path: bool = False
    add_headers: Dict[str, str] = field(default_factory=dict)
    remove_headers: List[str] = field(default_factory=list)

@dataclass
class RequestContext:
    """请求上下文"""
    request_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    start_time: float = field(default_factory=time.time)
    client_ip: str = ""
    user_agent: str = ""
    user_id: str = ""
    api_key: str = ""
    authenticated: bool = False
    scopes: List[str] = field(default_factory=list)
    route_config: Optional[RouteConfig] = None
    upstream_url: str = ""
    
    @property
    def duration(self) -> float:
        """请求持续时间"""
        return time.time() - self.start_time

class RateLimiter:
    """限流器"""
    
    def __init__(self, redis_client: Optional[aioredis.Redis] = None):
        self.redis_client = redis_client
        self.local_cache: Dict[str, Dict[str, Any]] = {}
        self.rules: List[RateLimitRule] = []
        
    def add_rule(self, rule: RateLimitRule):
        """添加限流规则"""
        self.rules.append(rule)
        logger.info(f"Added rate limit rule: {rule.name}")
        
    async def is_allowed(self, context: RequestContext, path: str, method: str) -> Tuple[bool, Dict[str, Any]]:
        """检查是否允许请求"""
        # 找到匹配的规则
        matching_rules = [rule for rule in self.rules if rule.matches(path, method)]
        
        for rule in matching_rules:
            allowed, info = await self._check_rule(rule, context, path, method)
            if not allowed:
                return False, info
                
        return True, {"status": "allowed"}
    
    async def _check_rule(self, rule: RateLimitRule, context: RequestContext, path: str, method: str) -> Tuple[bool, Dict[str, Any]]:
        """检查单个规则"""
        # 生成限流键
        key = self._generate_key(rule, context)
        
        if self.redis_client:
            return await self._check_redis_rule(rule, key)
        else:
            return await self._check_local_rule(rule, key)
            
    def _generate_key(self, rule: RateLimitRule, context: RequestContext) -> str:
        """生成限流键"""
        if rule.limit_type == RateLimitType.PER_IP:
            return f"rate_limit:{rule.name}:ip:{context.client_ip}"
        elif rule.limit_type == RateLimitType.PER_USER:
            return f"rate_limit:{rule.name}:user:{context.user_id}"
        elif rule.limit_type == RateLimitType.PER_API_KEY:
            return f"rate_limit:{rule.name}:key:{context.api_key}"
        else:  # GLOBAL
            return f"rate_limit:{rule.name}:global"
            
    async def _check_redis_rule(self, rule: RateLimitRule, key: str) -> Tuple[bool, Dict[str, Any]]:
        """使用Redis检查规则"""
        try:
            current_time = int(time.time())
            window_start = current_time - rule.window_seconds
            
            # 清理过期记录
            await self.redis_client.zremrangebyscore(key, 0, window_start)
            
            # 获取当前窗口内的请求数
            current_requests = await self.redis_client.zcard(key)
            
            if current_requests >= rule.max_requests:
                # 获取窗口重置时间
                oldest_request = await self.redis_client.zrange(key, 0, 0, withscores=True)
                reset_time = int(oldest_request[0][1]) + rule.window_seconds if oldest_request else current_time + rule.window_seconds
                
                return False, {
                    "error": "rate_limit_exceeded",
                    "max_requests": rule.max_requests,
                    "window_seconds": rule.window_seconds,
                    "reset_time": reset_time,
                    "current_requests": current_requests
                }
            
            # 记录请求
            await self.redis_client.zadd(key, {str(uuid.uuid4()): current_time})
            await self.redis_client.expire(key, rule.window_seconds)
            
            return True, {
                "remaining_requests": rule.max_requests - current_requests - 1,
                "reset_time": window_start + rule.window_seconds
            }
            
        except Exception as e:
            logger.error(f"Redis rate limit check error: {str(e)}")
            # Fallback to allow
            return True, {"status": "redis_error"}
            
    async def _check_local_rule(self, rule: RateLimitRule, key: str) -> Tuple[bool, Dict[str, Any]]:
        """使用本地缓存检查规则"""
        current_time = time.time()
        
        if key not in self.local_cache:
            self.local_cache[key] = {
                "requests": deque(),
                "count": 0
            }
            
        cache_entry = self.local_cache[key]
        requests = cache_entry["requests"]
        
        # 清理过期请求
        window_start = current_time - rule.window_seconds
        while requests and requests[0] < window_start:
            requests.popleft()
            
        # 检查限制
        if len(requests) >= rule.max_requests:
            reset_time = requests[0] + rule.window_seconds
            return False, {
                "error": "rate_limit_exceeded",
                "max_requests": rule.max_requests,
                "window_seconds": rule.window_seconds,
                "reset_time": reset_time,
                "current_requests": len(requests)
            }
        
        # 记录请求
        requests.append(current_time)
        
        return True, {
            "remaining_requests": rule.max_requests - len(requests),
            "reset_time": current_time + rule.window_seconds
        }

class Authenticator:
    """认证器"""
    
    def __init__(self, jwt_secret: str = "zhiyue3.0_secret"):
        self.jwt_secret = jwt_secret
        self.api_keys: Dict[str, Dict[str, Any]] = {}
        self.rules: List[AuthRule] = []
        
    def add_rule(self, rule: AuthRule):
        """添加认证规则"""
        self.rules.append(rule)
        logger.info(f"Added auth rule: {rule.name}")
        
    def add_api_key(self, api_key: str, user_id: str, scopes: List[str] = None):
        """添加API密钥"""
        self.api_keys[api_key] = {
            "user_id": user_id,
            "scopes": scopes or [],
            "created_at": datetime.now(),
            "last_used": None
        }
        
    async def authenticate(self, context: RequestContext, request: web.Request, path: str, method: str) -> Tuple[bool, Dict[str, Any]]:
        """认证请求"""
        # 找到匹配的认证规则
        matching_rules = [rule for rule in self.rules if rule.matches(path, method)]
        
        if not matching_rules:
            # 没有匹配的规则，允许通过
            context.authenticated = True
            return True, {"status": "no_auth_required"}
            
        # 使用第一个匹配的规则
        rule = matching_rules[0]
        
        if rule.auth_type == AuthType.NONE:
            context.authenticated = True
            return True, {"status": "no_auth_required"}
        elif rule.auth_type == AuthType.API_KEY:
            return await self._authenticate_api_key(context, request, rule)
        elif rule.auth_type == AuthType.JWT:
            return await self._authenticate_jwt(context, request, rule)
        else:
            return False, {"error": "unsupported_auth_type", "auth_type": rule.auth_type.value}
            
    async def _authenticate_api_key(self, context: RequestContext, request: web.Request, rule: AuthRule) -> Tuple[bool, Dict[str, Any]]:
        """API密钥认证"""
        # 从Header或Query获取API密钥
        api_key = request.headers.get("X-API-Key") or request.query.get("api_key")
        
        if not api_key:
            return False, {"error": "missing_api_key"}
            
        if api_key not in self.api_keys:
            return False, {"error": "invalid_api_key"}
            
        key_info = self.api_keys[api_key]
        
        # 检查作用域
        if rule.required_scopes:
            user_scopes = set(key_info.get("scopes", []))
            required_scopes = set(rule.required_scopes)
            if not required_scopes.issubset(user_scopes):
                return False, {"error": "insufficient_scope", "required": rule.required_scopes}
                
        # 更新使用时间
        key_info["last_used"] = datetime.now()
        
        # 更新上下文
        context.authenticated = True
        context.api_key = api_key
        context.user_id = key_info["user_id"]
        context.scopes = key_info["scopes"]
        
        return True, {"user_id": key_info["user_id"], "scopes": key_info["scopes"]}
        
    async def _authenticate_jwt(self, context: RequestContext, request: web.Request, rule: AuthRule) -> Tuple[bool, Dict[str, Any]]:
        """JWT认证"""
        # 从Authorization header获取token
        auth_header = request.headers.get("Authorization")
        
        if not auth_header or not auth_header.startswith("Bearer "):
            return False, {"error": "missing_jwt_token"}
            
        token = auth_header[7:]  # Remove "Bearer "
        
        try:
            payload = jwt.decode(token, self.jwt_secret, algorithms=["HS256"])
            
            # 检查作用域
            token_scopes = payload.get("scopes", [])
            if rule.required_scopes:
                required_scopes = set(rule.required_scopes)
                user_scopes = set(token_scopes)
                if not required_scopes.issubset(user_scopes):
                    return False, {"error": "insufficient_scope", "required": rule.required_scopes}
                    
            # 更新上下文
            context.authenticated = True
            context.user_id = payload.get("user_id", "")
            context.scopes = token_scopes
            
            return True, {"user_id": payload.get("user_id"), "scopes": token_scopes}
            
        except jwt.ExpiredSignatureError:
            return False, {"error": "token_expired"}
        except jwt.InvalidTokenError:
            return False, {"error": "invalid_token"}

class LoadBalancer:
    """负载均衡器"""
    
    def __init__(self):
        self.strategies = {
            "round_robin": self._round_robin,
            "least_connections": self._least_connections,
            "random": self._random
        }
        self.counters: Dict[str, int] = defaultdict(int)
        self.connections: Dict[str, int] = defaultdict(int)
        
    async def select_upstream(self, upstreams: List[str], strategy: str = "round_robin") -> Optional[str]:
        """选择上游服务"""
        if not upstreams:
            return None
            
        if len(upstreams) == 1:
            return upstreams[0]
            
        strategy_func = self.strategies.get(strategy, self._round_robin)
        return await strategy_func(upstreams)
        
    async def _round_robin(self, upstreams: List[str]) -> str:
        """轮询策略"""
        key = "|".join(sorted(upstreams))
        index = self.counters[key] % len(upstreams)
        self.counters[key] += 1
        return upstreams[index]
        
    async def _least_connections(self, upstreams: List[str]) -> str:
        """最少连接策略"""
        return min(upstreams, key=lambda u: self.connections.get(u, 0))
        
    async def _random(self, upstreams: List[str]) -> str:
        """随机策略"""
        import random
        return random.choice(upstreams)
        
    def increment_connections(self, upstream: str):
        """增加连接数"""
        self.connections[upstream] += 1
        
    def decrement_connections(self, upstream: str):
        """减少连接数"""
        self.connections[upstream] = max(0, self.connections[upstream] - 1)

class APIGateway:
    """API网关"""
    
    def __init__(self, host: str = "0.0.0.0", port: int = 8080, redis_url: str = None):
        self.host = host
        self.port = port
        self.app = web.Application(middlewares=[
            self.request_logging_middleware,
            self.cors_middleware,
            self.rate_limit_middleware,
            self.auth_middleware,
            self.proxy_middleware
        ])
        
        # 组件
        self.rate_limiter = RateLimiter()
        self.authenticator = Authenticator()
        self.load_balancer = LoadBalancer()
        
        # 配置
        self.routes: List[RouteConfig] = []
        self.redis_client: Optional[aioredis.Redis] = None
        
        # 统计
        self.stats = {
            "total_requests": 0,
            "successful_requests": 0,
            "failed_requests": 0,
            "blocked_requests": 0,
            "average_response_time": 0.0
        }
        
        # HTTP客户端
        self.http_session: Optional[ClientSession] = None
        
        # 设置路由
        self.app.router.add_route("*", "/{path:.*}", self.handle_request)
        
    async def start(self):
        """启动网关"""
        # 连接Redis
        if hasattr(self, 'redis_url') and self.redis_url:
            try:
                self.redis_client = aioredis.from_url(self.redis_url)
                self.rate_limiter.redis_client = self.redis_client
                logger.info("Connected to Redis")
            except Exception as e:
                logger.warning(f"Redis connection failed: {str(e)}, using local rate limiting")
                
        # 创建HTTP客户端
        timeout = ClientTimeout(total=30)
        self.http_session = ClientSession(timeout=timeout)
        
        # 设置默认规则
        self._setup_default_rules()
        
        # 启动服务器
        runner = web.AppRunner(self.app)
        await runner.setup()
        
        site = web.TCPSite(runner, self.host, self.port)
        await site.start()
        
        logger.info(f"API Gateway started on {self.host}:{self.port}")
        
    async def stop(self):
        """停止网关"""
        if self.http_session:
            await self.http_session.close()
            
        if self.redis_client:
            await self.redis_client.close()
            
        logger.info("API Gateway stopped")
        
    def add_route(self, route: RouteConfig):
        """添加路由"""
        self.routes.append(route)
        logger.info(f"Added route: {route.path} -> {route.upstream}")
        
    def _setup_default_rules(self):
        """设置默认规则"""
        # 默认限流规则
        self.rate_limiter.add_rule(RateLimitRule(
            name="global_limit",
            limit_type=RateLimitType.PER_IP,
            max_requests=1000,
            window_seconds=3600,  # 1小时
            paths=["*"]
        ))
        
        self.rate_limiter.add_rule(RateLimitRule(
            name="api_limit",
            limit_type=RateLimitType.PER_IP,
            max_requests=100,
            window_seconds=60,  # 1分钟
            paths=["/api/*"]
        ))
        
        # 默认认证规则
        self.authenticator.add_rule(AuthRule(
            name="api_auth",
            auth_type=AuthType.API_KEY,
            paths=["/api/*"],
            methods=["*"]
        ))
        
        self.authenticator.add_rule(AuthRule(
            name="public_endpoints",
            auth_type=AuthType.NONE,
            paths=["/health", "/metrics", "/"],
            methods=["GET"]
        ))
        
        # 添加示例API密钥
        self.authenticator.add_api_key("zhiyue_demo_key", "demo_user", ["read", "write"])
        
    async def handle_request(self, request: web.Request) -> web.Response:
        """处理请求"""
        context = RequestContext(
            client_ip=self._get_client_ip(request),
            user_agent=request.headers.get("User-Agent", "")
        )
        
        self.stats["total_requests"] += 1
        
        try:
            path = request.path
            method = request.method
            
            # 查找匹配的路由
            route = self._find_matching_route(path, method)
            if not route:
                return web.json_response({
                    "error": "route_not_found",
                    "path": path,
                    "method": method
                }, status=404)
                
            context.route_config = route
            
            # 构建上游URL
            upstream_path = route.upstream_path or path
            if route.strip_path:
                # 移除匹配的路径前缀
                upstream_path = path.replace(route.path.rstrip("*"), "", 1)
                
            upstreams = [route.upstream]  # 简化实现，实际应该支持多个上游
            upstream_base = await self.load_balancer.select_upstream(upstreams, route.load_balance_type)
            context.upstream_url = f"{upstream_base}{upstream_path}"
            
            # 代理请求
            response = await self._proxy_request(context, request)
            
            self.stats["successful_requests"] += 1
            return response
            
        except web.HTTPException as e:
            self.stats["blocked_requests"] += 1
            raise
        except Exception as e:
            self.stats["failed_requests"] += 1
            logger.error(f"Request handling error: {str(e)}")
            return web.json_response({
                "error": "internal_server_error",
                "message": str(e),
                "request_id": context.request_id
            }, status=500)
        finally:
            # 更新平均响应时间
            duration = context.duration
            total = self.stats["successful_requests"] + self.stats["failed_requests"]
            if total > 0:
                self.stats["average_response_time"] = (
                    (self.stats["average_response_time"] * (total - 1) + duration) / total
                )
                
    def _find_matching_route(self, path: str, method: str) -> Optional[RouteConfig]:
        """查找匹配的路由"""
        for route in self.routes:
            if self._path_matches(path, route.path):
                if not route.methods or method.upper() in route.methods or "*" in route.methods:
                    return route
        return None
        
    def _path_matches(self, path: str, pattern: str) -> bool:
        """路径匹配"""
        if pattern.endswith("*"):
            return path.startswith(pattern[:-1])
        return path == pattern
        
    def _get_client_ip(self, request: web.Request) -> str:
        """获取客户端IP"""
        # 检查代理头
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
            
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
            
        # 使用连接IP
        peername = request.transport.get_extra_info('peername') if request.transport else None
        return peername[0] if peername else "unknown"
        
    async def _proxy_request(self, context: RequestContext, request: web.Request) -> web.Response:
        """代理请求"""
        # 准备请求头
        headers = dict(request.headers)
        
        # 移除hop-by-hop头
        hop_by_hop = ['connection', 'keep-alive', 'proxy-authenticate', 
                     'proxy-authorization', 'te', 'trailers', 'transfer-encoding', 'upgrade']
        for header in hop_by_hop:
            headers.pop(header, None)
            
        # 添加追踪头
        headers['X-Request-ID'] = context.request_id
        headers['X-Forwarded-For'] = context.client_ip
        headers['X-Forwarded-Proto'] = request.scheme
        
        # 应用路由配置的头部修改
        if context.route_config:
            # 添加头部
            for key, value in context.route_config.add_headers.items():
                headers[key] = value
                
            # 移除头部
            for key in context.route_config.remove_headers:
                headers.pop(key, None)
                
        # 准备请求数据
        data = None
        if request.method in ['POST', 'PUT', 'PATCH']:
            data = await request.read()
            
        try:
            # 增加连接计数
            self.load_balancer.increment_connections(context.upstream_url)
            
            # 发送请求
            async with self.http_session.request(
                method=request.method,
                url=context.upstream_url,
                headers=headers,
                data=data,
                params=request.query,
                timeout=ClientTimeout(total=context.route_config.timeout if context.route_config else 30)
            ) as resp:
                # 准备响应头
                response_headers = dict(resp.headers)
                
                # 移除hop-by-hop头
                for header in hop_by_hop:
                    response_headers.pop(header, None)
                    
                # 添加网关头
                response_headers['X-Gateway'] = 'ZhiYue3.0-Gateway'
                response_headers['X-Request-ID'] = context.request_id
                
                # 读取响应体
                body = await resp.read()
                
                return web.Response(
                    body=body,
                    status=resp.status,
                    headers=response_headers
                )
                
        except asyncio.TimeoutError:
            return web.json_response({
                "error": "upstream_timeout",
                "upstream_url": context.upstream_url,
                "request_id": context.request_id
            }, status=504)
        except Exception as e:
            logger.error(f"Proxy error: {str(e)}")
            return web.json_response({
                "error": "upstream_error",
                "message": str(e),
                "upstream_url": context.upstream_url,
                "request_id": context.request_id
            }, status=502)
        finally:
            # 减少连接计数
            self.load_balancer.decrement_connections(context.upstream_url)
            
    @web.middleware
    async def request_logging_middleware(self, request: web.Request, handler):
        """请求日志中间件"""
        start_time = time.time()
        
        try:
            response = await handler(request)
            duration = time.time() - start_time
            
            logger.info(f"{request.method} {request.path} -> {response.status} ({duration*1000:.2f}ms)")
            return response
            
        except Exception as e:
            duration = time.time() - start_time
            logger.error(f"{request.method} {request.path} -> ERROR: {str(e)} ({duration*1000:.2f}ms)")
            raise
            
    @web.middleware
    async def cors_middleware(self, request: web.Request, handler):
        """CORS中间件"""
        if request.method == "OPTIONS":
            # 处理预检请求
            return web.Response(
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
                    "Access-Control-Max-Age": "3600"
                }
            )
            
        response = await handler(request)
        
        # 添加CORS头
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Credentials"] = "true"
        
        return response
        
    @web.middleware
    async def rate_limit_middleware(self, request: web.Request, handler):
        """限流中间件"""
        context = getattr(request, 'context', RequestContext())
        context.client_ip = self._get_client_ip(request)
        request.context = context
        
        # 检查限流
        allowed, info = await self.rate_limiter.is_allowed(context, request.path, request.method)
        
        if not allowed:
            return web.json_response({
                "error": "rate_limit_exceeded",
                "message": "Too many requests",
                **info
            }, status=429)
            
        response = await handler(request)
        
        # 添加限流头
        if "remaining_requests" in info:
            response.headers["X-RateLimit-Remaining"] = str(info["remaining_requests"])
        if "reset_time" in info:
            response.headers["X-RateLimit-Reset"] = str(int(info["reset_time"]))
            
        return response
        
    @web.middleware
    async def auth_middleware(self, request: web.Request, handler):
        """认证中间件"""
        context = getattr(request, 'context', RequestContext())
        
        # 执行认证
        authenticated, info = await self.authenticator.authenticate(context, request, request.path, request.method)
        
        if not authenticated:
            return web.json_response({
                "error": "authentication_failed",
                "message": "Authentication required",
                **info
            }, status=401)
            
        request.context = context
        return await handler(request)
        
    @web.middleware
    async def proxy_middleware(self, request: web.Request, handler):
        """代理中间件"""
        # 这个中间件在最后执行，主要用于添加上下文信息
        return await handler(request)
        
    def get_stats(self) -> Dict[str, Any]:
        """获取统计信息"""
        return {
            "timestamp": datetime.now().isoformat(),
            "routes_count": len(self.routes),
            "stats": self.stats.copy(),
            "load_balancer": {
                "connections": dict(self.load_balancer.connections),
                "counters": dict(self.load_balancer.counters)
            }
        }

# 使用示例
async def demo_api_gateway():
    """API网关演示"""
    print("🚀 API Gateway Demo Starting...")
    
    gateway = APIGateway(host="localhost", port=8080)
    
    # 添加路由
    gateway.add_route(RouteConfig(
        path="/api/ocr/*",
        methods=["POST"],
        upstream="http://localhost:8001",
        strip_path=True,
        add_headers={"X-Service": "OCR"}
    ))
    
    gateway.add_route(RouteConfig(
        path="/api/grading/*",
        methods=["POST"],
        upstream="http://localhost:9001",
        strip_path=True,
        add_headers={"X-Service": "Grading"}
    ))
    
    gateway.add_route(RouteConfig(
        path="/health",
        methods=["GET"],
        upstream="http://localhost:8080",
        auth_required=False,
        rate_limit_enabled=False
    ))
    
    try:
        await gateway.start()
        
        print(f"📡 Gateway started on http://localhost:8080")
        print("📋 Available endpoints:")
        print("  GET  /health (no auth)")
        print("  POST /api/ocr/* (requires API key)")
        print("  POST /api/grading/* (requires API key)")
        print("  API Key: zhiyue_demo_key")
        print("\n💡 Test examples:")
        print("  curl -H 'X-API-Key: zhiyue_demo_key' http://localhost:8080/api/ocr/process")
        print("  curl http://localhost:8080/health")
        
        # 保持运行
        while True:
            await asyncio.sleep(1)
            
    except KeyboardInterrupt:
        print("\n👋 Shutting down gateway...")
    finally:
        await gateway.stop()
        
    print("✅ API Gateway Demo Completed!")

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "demo":
        asyncio.run(demo_api_gateway())
    else:
        print("Run with 'python api_gateway.py demo' to start demo")