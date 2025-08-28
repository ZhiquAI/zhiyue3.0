"""
Circuit Breaker and Fault Tolerance Patterns
智阅3.0熔断器和容错模式实现
"""

import asyncio
import json
import logging
import time
import random
from abc import ABC, abstractmethod
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, List, Optional, Any, Callable, Union
from collections import defaultdict, deque
import threading
from contextlib import asynccontextmanager
import functools
import uuid

logger = logging.getLogger(__name__)

class CircuitState(str, Enum):
    """熔断器状态"""
    CLOSED = "closed"      # 关闭状态，正常工作
    OPEN = "open"          # 开启状态，熔断中
    HALF_OPEN = "half_open"  # 半开状态，试探性恢复

class RetryStrategy(str, Enum):
    """重试策略"""
    FIXED_DELAY = "fixed_delay"
    EXPONENTIAL_BACKOFF = "exponential_backoff"
    LINEAR_BACKOFF = "linear_backoff"
    JITTER = "jitter"

class FallbackType(str, Enum):
    """降级类型"""
    CACHED_RESPONSE = "cached_response"
    DEFAULT_RESPONSE = "default_response"
    ALTERNATIVE_SERVICE = "alternative_service"
    MOCK_RESPONSE = "mock_response"

@dataclass
class CircuitBreakerConfig:
    """熔断器配置"""
    failure_threshold: int = 5          # 失败阈值
    success_threshold: int = 3          # 成功阈值(半开状态)
    timeout: float = 60.0              # 熔断超时时间(秒)
    monitoring_period: float = 60.0     # 监控周期(秒)
    slow_call_duration_threshold: float = 10.0  # 慢调用阈值(秒)
    slow_call_rate_threshold: float = 0.5       # 慢调用比例阈值
    minimum_number_of_calls: int = 10           # 最小调用数

@dataclass
class RetryConfig:
    """重试配置"""
    max_attempts: int = 3
    strategy: RetryStrategy = RetryStrategy.EXPONENTIAL_BACKOFF
    base_delay: float = 1.0
    max_delay: float = 60.0
    jitter: bool = True
    
@dataclass
class CallResult:
    """调用结果"""
    success: bool
    response: Any = None
    error: Optional[Exception] = None
    duration: float = 0.0
    timestamp: datetime = field(default_factory=datetime.now)
    attempt_number: int = 1

@dataclass
class CircuitBreakerStats:
    """熔断器统计"""
    name: str
    state: CircuitState
    failure_count: int = 0
    success_count: int = 0
    total_calls: int = 0
    successful_calls: int = 0
    failed_calls: int = 0
    slow_calls: int = 0
    last_failure_time: Optional[datetime] = None
    last_success_time: Optional[datetime] = None
    state_transitions: List[Dict[str, Any]] = field(default_factory=list)
    
    @property
    def failure_rate(self) -> float:
        """失败率"""
        return self.failed_calls / max(self.total_calls, 1)
        
    @property
    def slow_call_rate(self) -> float:
        """慢调用率"""
        return self.slow_calls / max(self.total_calls, 1)
        
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

class CircuitBreaker:
    """熔断器实现"""
    
    def __init__(self, name: str, config: CircuitBreakerConfig):
        self.name = name
        self.config = config
        self.state = CircuitState.CLOSED
        self.stats = CircuitBreakerStats(name=name, state=self.state)
        self.call_history: deque = deque(maxlen=1000)  # 最近1000次调用记录
        self.lock = threading.RLock()
        self.last_state_change = datetime.now()
        
    def __call__(self, func: Callable):
        """装饰器用法"""
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            return await self.call(func, *args, **kwargs)
        return wrapper
        
    async def call(self, func: Callable, *args, **kwargs) -> Any:
        """执行受保护的调用"""
        async with self._call_context():
            return await func(*args, **kwargs)
            
    @asynccontextmanager
    async def _call_context(self):
        """调用上下文管理器"""
        if not self._allow_call():
            raise CircuitBreakerOpenException(f"Circuit breaker {self.name} is open")
            
        start_time = time.time()
        call_result = None
        
        try:
            yield
            # 调用成功
            duration = time.time() - start_time
            call_result = CallResult(success=True, duration=duration)
            
        except Exception as e:
            # 调用失败
            duration = time.time() - start_time
            call_result = CallResult(success=False, error=e, duration=duration)
            raise
            
        finally:
            if call_result:
                self._record_call_result(call_result)
                
    def _allow_call(self) -> bool:
        """是否允许调用"""
        with self.lock:
            if self.state == CircuitState.CLOSED:
                return True
            elif self.state == CircuitState.OPEN:
                # 检查是否可以转为半开状态
                if self._should_attempt_reset():
                    self._transition_to_half_open()
                    return True
                return False
            elif self.state == CircuitState.HALF_OPEN:
                return True
            return False
            
    def _should_attempt_reset(self) -> bool:
        """是否应该尝试重置"""
        time_since_last_failure = datetime.now() - self.last_state_change
        return time_since_last_failure.total_seconds() >= self.config.timeout
        
    def _record_call_result(self, result: CallResult):
        """记录调用结果"""
        with self.lock:
            # 更新统计
            self.stats.total_calls += 1
            self.call_history.append(result)
            
            if result.success:
                self.stats.successful_calls += 1
                self.stats.last_success_time = result.timestamp
                
                if self.state == CircuitState.HALF_OPEN:
                    self.stats.success_count += 1
                    if self.stats.success_count >= self.config.success_threshold:
                        self._transition_to_closed()
            else:
                self.stats.failed_calls += 1
                self.stats.last_failure_time = result.timestamp
                
                if self.state == CircuitState.CLOSED:
                    self.stats.failure_count += 1
                elif self.state == CircuitState.HALF_OPEN:
                    # 半开状态下失败，立即转为开启状态
                    self._transition_to_open()
                    
            # 检查慢调用
            if result.duration >= self.config.slow_call_duration_threshold:
                self.stats.slow_calls += 1
                
            # 检查是否需要熔断
            self._check_failure_conditions()
            
    def _check_failure_conditions(self):
        """检查熔断条件"""
        if self.state != CircuitState.CLOSED:
            return
            
        if self.stats.total_calls < self.config.minimum_number_of_calls:
            return
            
        # 检查失败率
        if self.stats.failure_rate >= 0.5:  # 失败率50%以上
            self._transition_to_open()
            return
            
        # 检查慢调用率
        if self.stats.slow_call_rate >= self.config.slow_call_rate_threshold:
            self._transition_to_open()
            return
            
        # 检查连续失败次数
        recent_calls = list(self.call_history)[-self.config.minimum_number_of_calls:]
        if len(recent_calls) >= self.config.minimum_number_of_calls:
            recent_failures = sum(1 for call in recent_calls if not call.success)
            if recent_failures >= self.config.failure_threshold:
                self._transition_to_open()
                
    def _transition_to_open(self):
        """转为开启状态"""
        old_state = self.state
        self.state = CircuitState.OPEN
        self.stats.state = self.state
        self.last_state_change = datetime.now()
        self._record_state_transition(old_state, self.state, "Failure threshold exceeded")
        
    def _transition_to_half_open(self):
        """转为半开状态"""
        old_state = self.state
        self.state = CircuitState.HALF_OPEN
        self.stats.state = self.state
        self.stats.success_count = 0  # 重置成功计数
        self.last_state_change = datetime.now()
        self._record_state_transition(old_state, self.state, "Timeout reached, attempting reset")
        
    def _transition_to_closed(self):
        """转为关闭状态"""
        old_state = self.state
        self.state = CircuitState.CLOSED
        self.stats.state = self.state
        self.stats.failure_count = 0  # 重置失败计数
        self.last_state_change = datetime.now()
        self._record_state_transition(old_state, self.state, "Success threshold reached")
        
    def _record_state_transition(self, from_state: CircuitState, to_state: CircuitState, reason: str):
        """记录状态转换"""
        transition = {
            'timestamp': datetime.now().isoformat(),
            'from_state': from_state.value,
            'to_state': to_state.value,
            'reason': reason
        }
        self.stats.state_transitions.append(transition)
        logger.info(f"Circuit breaker {self.name}: {from_state.value} -> {to_state.value} ({reason})")
        
    def get_stats(self) -> CircuitBreakerStats:
        """获取统计信息"""
        return self.stats
        
    def reset(self):
        """手动重置熔断器"""
        with self.lock:
            old_state = self.state
            self.state = CircuitState.CLOSED
            self.stats = CircuitBreakerStats(name=self.name, state=self.state)
            self.call_history.clear()
            self.last_state_change = datetime.now()
            self._record_state_transition(old_state, self.state, "Manual reset")

class CircuitBreakerOpenException(Exception):
    """熔断器开启异常"""
    pass

class RetryHandler:
    """重试处理器"""
    
    def __init__(self, config: RetryConfig):
        self.config = config
        
    def __call__(self, func: Callable):
        """装饰器用法"""
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            return await self.execute_with_retry(func, *args, **kwargs)
        return wrapper
        
    async def execute_with_retry(self, func: Callable, *args, **kwargs) -> Any:
        """执行带重试的函数"""
        last_exception = None
        
        for attempt in range(1, self.config.max_attempts + 1):
            try:
                result = await func(*args, **kwargs)
                if attempt > 1:
                    logger.info(f"Function succeeded on attempt {attempt}")
                return result
                
            except Exception as e:
                last_exception = e
                
                if attempt == self.config.max_attempts:
                    logger.error(f"Function failed after {attempt} attempts: {str(e)}")
                    break
                    
                delay = self._calculate_delay(attempt)
                logger.warning(f"Function failed on attempt {attempt}, retrying in {delay:.2f}s: {str(e)}")
                await asyncio.sleep(delay)
                
        raise last_exception
        
    def _calculate_delay(self, attempt: int) -> float:
        """计算延迟时间"""
        if self.config.strategy == RetryStrategy.FIXED_DELAY:
            delay = self.config.base_delay
        elif self.config.strategy == RetryStrategy.EXPONENTIAL_BACKOFF:
            delay = self.config.base_delay * (2 ** (attempt - 1))
        elif self.config.strategy == RetryStrategy.LINEAR_BACKOFF:
            delay = self.config.base_delay * attempt
        else:
            delay = self.config.base_delay
            
        # 应用最大延迟限制
        delay = min(delay, self.config.max_delay)
        
        # 添加抖动
        if self.config.jitter:
            delay = delay * (0.5 + random.random() * 0.5)  # 50%-100%的随机延迟
            
        return delay

class FallbackHandler:
    """降级处理器"""
    
    def __init__(self, fallback_func: Optional[Callable] = None, 
                 fallback_type: FallbackType = FallbackType.DEFAULT_RESPONSE,
                 default_response: Any = None,
                 cache: Optional[Dict] = None):
        self.fallback_func = fallback_func
        self.fallback_type = fallback_type
        self.default_response = default_response
        self.cache = cache or {}
        
    def __call__(self, func: Callable):
        """装饰器用法"""
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            try:
                return await func(*args, **kwargs)
            except Exception as e:
                logger.warning(f"Function failed, executing fallback: {str(e)}")
                return await self.execute_fallback(func, e, *args, **kwargs)
        return wrapper
        
    async def execute_fallback(self, original_func: Callable, error: Exception, *args, **kwargs) -> Any:
        """执行降级逻辑"""
        if self.fallback_type == FallbackType.CACHED_RESPONSE:
            return self._get_cached_response(original_func, args, kwargs)
        elif self.fallback_type == FallbackType.DEFAULT_RESPONSE:
            return self.default_response
        elif self.fallback_type == FallbackType.ALTERNATIVE_SERVICE:
            if self.fallback_func:
                return await self.fallback_func(*args, **kwargs)
        elif self.fallback_type == FallbackType.MOCK_RESPONSE:
            return self._generate_mock_response(original_func)
            
        # 如果没有配置降级策略，重新抛出异常
        raise error
        
    def _get_cached_response(self, func: Callable, args: tuple, kwargs: dict) -> Any:
        """获取缓存响应"""
        cache_key = self._generate_cache_key(func, args, kwargs)
        return self.cache.get(cache_key, self.default_response)
        
    def _generate_cache_key(self, func: Callable, args: tuple, kwargs: dict) -> str:
        """生成缓存键"""
        func_name = func.__name__
        args_str = str(args) + str(sorted(kwargs.items()))
        return f"{func_name}:{hash(args_str)}"
        
    def _generate_mock_response(self, func: Callable) -> Any:
        """生成模拟响应"""
        # 根据函数名生成合适的模拟响应
        if "ocr" in func.__name__.lower():
            return {
                "text": "Mock OCR result",
                "confidence": 0.5,
                "regions": []
            }
        elif "grading" in func.__name__.lower():
            return {
                "score": 0,
                "total": 100,
                "feedback": "Service temporarily unavailable"
            }
        else:
            return {"status": "fallback", "message": "Service temporarily unavailable"}

class BulkheadPattern:
    """隔离舱模式"""
    
    def __init__(self, name: str, max_concurrent_calls: int = 10):
        self.name = name
        self.max_concurrent_calls = max_concurrent_calls
        self.semaphore = asyncio.Semaphore(max_concurrent_calls)
        self.active_calls = 0
        self.queued_calls = 0
        self.total_calls = 0
        self.rejected_calls = 0
        
    def __call__(self, func: Callable):
        """装饰器用法"""
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            return await self.execute(func, *args, **kwargs)
        return wrapper
        
    async def execute(self, func: Callable, *args, **kwargs) -> Any:
        """执行受限制的调用"""
        self.total_calls += 1
        
        if self.semaphore.locked():
            self.queued_calls += 1
            
        try:
            async with self.semaphore:
                self.active_calls += 1
                try:
                    return await func(*args, **kwargs)
                finally:
                    self.active_calls -= 1
        except Exception as e:
            self.rejected_calls += 1
            raise
        finally:
            if self.queued_calls > 0:
                self.queued_calls -= 1
                
    def get_stats(self) -> Dict[str, Any]:
        """获取统计信息"""
        return {
            'name': self.name,
            'max_concurrent_calls': self.max_concurrent_calls,
            'active_calls': self.active_calls,
            'queued_calls': self.queued_calls,
            'total_calls': self.total_calls,
            'rejected_calls': self.rejected_calls,
            'rejection_rate': self.rejected_calls / max(self.total_calls, 1)
        }

class FaultToleranceManager:
    """容错管理器"""
    
    def __init__(self):
        self.circuit_breakers: Dict[str, CircuitBreaker] = {}
        self.retry_handlers: Dict[str, RetryHandler] = {}
        self.fallback_handlers: Dict[str, FallbackHandler] = {}
        self.bulkheads: Dict[str, BulkheadPattern] = {}
        
    def create_circuit_breaker(self, name: str, config: CircuitBreakerConfig) -> CircuitBreaker:
        """创建熔断器"""
        cb = CircuitBreaker(name, config)
        self.circuit_breakers[name] = cb
        logger.info(f"Created circuit breaker: {name}")
        return cb
        
    def create_retry_handler(self, name: str, config: RetryConfig) -> RetryHandler:
        """创建重试处理器"""
        handler = RetryHandler(config)
        self.retry_handlers[name] = handler
        logger.info(f"Created retry handler: {name}")
        return handler
        
    def create_fallback_handler(self, name: str, **kwargs) -> FallbackHandler:
        """创建降级处理器"""
        handler = FallbackHandler(**kwargs)
        self.fallback_handlers[name] = handler
        logger.info(f"Created fallback handler: {name}")
        return handler
        
    def create_bulkhead(self, name: str, max_concurrent_calls: int) -> BulkheadPattern:
        """创建隔离舱"""
        bulkhead = BulkheadPattern(name, max_concurrent_calls)
        self.bulkheads[name] = bulkhead
        logger.info(f"Created bulkhead: {name}")
        return bulkhead
        
    def get_circuit_breaker(self, name: str) -> Optional[CircuitBreaker]:
        """获取熔断器"""
        return self.circuit_breakers.get(name)
        
    def get_system_health(self) -> Dict[str, Any]:
        """获取系统健康状况"""
        health_data = {
            'timestamp': datetime.now().isoformat(),
            'circuit_breakers': {},
            'bulkheads': {},
            'overall_health': 'healthy'
        }
        
        # 熔断器状态
        open_breakers = 0
        for name, cb in self.circuit_breakers.items():
            stats = cb.get_stats()
            health_data['circuit_breakers'][name] = stats.to_dict()
            if stats.state == CircuitState.OPEN:
                open_breakers += 1
                
        # 隔离舱状态
        overloaded_bulkheads = 0
        for name, bulkhead in self.bulkheads.items():
            stats = bulkhead.get_stats()
            health_data['bulkheads'][name] = stats
            if stats['rejection_rate'] > 0.1:  # 拒绝率超过10%
                overloaded_bulkheads += 1
                
        # 整体健康状况
        if open_breakers > 0 or overloaded_bulkheads > 0:
            if open_breakers > len(self.circuit_breakers) * 0.5:
                health_data['overall_health'] = 'critical'
            else:
                health_data['overall_health'] = 'degraded'
                
        return health_data
        
    def reset_all_circuit_breakers(self):
        """重置所有熔断器"""
        for cb in self.circuit_breakers.values():
            cb.reset()
        logger.info("Reset all circuit breakers")

# 组合装饰器
def fault_tolerant(circuit_breaker_config: Optional[CircuitBreakerConfig] = None,
                  retry_config: Optional[RetryConfig] = None,
                  fallback_func: Optional[Callable] = None,
                  bulkhead_size: Optional[int] = None):
    """容错装饰器，组合多种容错模式"""
    def decorator(func: Callable):
        # 构建装饰器链
        decorated_func = func
        
        # 1. 隔离舱（最外层）
        if bulkhead_size:
            bulkhead = BulkheadPattern(f"{func.__name__}_bulkhead", bulkhead_size)
            decorated_func = bulkhead(decorated_func)
            
        # 2. 熔断器
        if circuit_breaker_config:
            cb = CircuitBreaker(f"{func.__name__}_cb", circuit_breaker_config)
            decorated_func = cb(decorated_func)
            
        # 3. 重试
        if retry_config:
            retry = RetryHandler(retry_config)
            decorated_func = retry(decorated_func)
            
        # 4. 降级（最内层）
        if fallback_func:
            fallback = FallbackHandler(fallback_func=fallback_func, 
                                     fallback_type=FallbackType.ALTERNATIVE_SERVICE)
            decorated_func = fallback(decorated_func)
            
        return decorated_func
    return decorator

# 使用示例
async def demo_fault_tolerance():
    """容错模式演示"""
    print("🚀 Fault Tolerance Demo Starting...")
    
    # 创建容错管理器
    ft_manager = FaultToleranceManager()
    
    # 创建熔断器
    cb_config = CircuitBreakerConfig(
        failure_threshold=3,
        timeout=10.0,
        minimum_number_of_calls=5
    )
    cb = ft_manager.create_circuit_breaker("demo_service_cb", cb_config)
    
    # 创建重试处理器
    retry_config = RetryConfig(
        max_attempts=3,
        strategy=RetryStrategy.EXPONENTIAL_BACKOFF,
        base_delay=1.0
    )
    retry_handler = ft_manager.create_retry_handler("demo_service_retry", retry_config)
    
    # 模拟不稳定的服务
    @fault_tolerant(
        circuit_breaker_config=cb_config,
        retry_config=retry_config,
        bulkhead_size=5
    )
    async def unstable_service(failure_rate: float = 0.3):
        """不稳定的服务"""
        await asyncio.sleep(0.1)  # 模拟网络延迟
        
        if random.random() < failure_rate:
            raise Exception("Service temporarily unavailable")
            
        return {"status": "success", "data": f"result_{uuid.uuid4().hex[:8]}"}
    
    # 测试正常调用
    print("📞 Testing normal calls...")
    for i in range(10):
        try:
            result = await unstable_service(failure_rate=0.2)
            print(f"  Call {i+1}: {result['status']}")
        except Exception as e:
            print(f"  Call {i+1}: Failed - {str(e)}")
        await asyncio.sleep(0.1)
        
    # 获取系统健康状况
    health = ft_manager.get_system_health()
    print(f"\n🏥 System Health:\n{json.dumps(health, indent=2, default=str)}")
    
    # 测试高失败率
    print("\n⚠️ Testing high failure rate...")
    for i in range(15):
        try:
            result = await unstable_service(failure_rate=0.8)
            print(f"  Call {i+1}: {result['status']}")
        except CircuitBreakerOpenException:
            print(f"  Call {i+1}: Circuit breaker open")
        except Exception as e:
            print(f"  Call {i+1}: Failed - {str(e)}")
        await asyncio.sleep(0.1)
        
    # 最终健康状况
    final_health = ft_manager.get_system_health()
    print(f"\n🏥 Final System Health:\n{json.dumps(final_health, indent=2, default=str)}")
    
    print("✅ Fault Tolerance Demo Completed!")

if __name__ == "__main__":
    asyncio.run(demo_fault_tolerance())