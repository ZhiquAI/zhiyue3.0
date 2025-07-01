"""
应用监控指标收集
"""

import time
import logging
from functools import wraps
from typing import Dict, Any
from prometheus_client import Counter, Histogram, Gauge, generate_latest
from flask import request, g

# 定义监控指标
REQUEST_COUNT = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

REQUEST_DURATION = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration',
    ['method', 'endpoint']
)

OCR_PROCESSING_TIME = Histogram(
    'ocr_processing_seconds',
    'OCR processing time',
    ['status']
)

GRADING_PROCESSING_TIME = Histogram(
    'grading_processing_seconds',
    'Grading processing time',
    ['question_type', 'status']
)

ACTIVE_GRADING_TASKS = Gauge(
    'active_grading_tasks',
    'Number of active grading tasks'
)

ERROR_COUNT = Counter(
    'application_errors_total',
    'Total application errors',
    ['error_type', 'component']
)

def monitor_request():
    """请求监控装饰器"""
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            
            try:
                result = f(*args, **kwargs)
                status = getattr(result, 'status_code', 200)
                REQUEST_COUNT.labels(
                    method=request.method,
                    endpoint=request.endpoint,
                    status=status
                ).inc()
                
                return result
                
            except Exception as e:
                ERROR_COUNT.labels(
                    error_type=type(e).__name__,
                    component='api'
                ).inc()
                raise
                
            finally:
                REQUEST_DURATION.labels(
                    method=request.method,
                    endpoint=request.endpoint
                ).observe(time.time() - start_time)
        
        return wrapper
    return decorator

def monitor_ocr_processing():
    """OCR处理监控"""
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            status = 'success'
            
            try:
                result = f(*args, **kwargs)
                return result
            except Exception as e:
                status = 'error'
                ERROR_COUNT.labels(
                    error_type=type(e).__name__,
                    component='ocr'
                ).inc()
                raise
            finally:
                OCR_PROCESSING_TIME.labels(status=status).observe(
                    time.time() - start_time
                )
        
        return wrapper
    return decorator

def monitor_grading():
    """评分处理监控"""
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            status = 'success'
            question_type = kwargs.get('question_type', 'unknown')
            
            ACTIVE_GRADING_TASKS.inc()
            
            try:
                result = f(*args, **kwargs)
                return result
            except Exception as e:
                status = 'error'
                ERROR_COUNT.labels(
                    error_type=type(e).__name__,
                    component='grading'
                ).inc()
                raise
            finally:
                ACTIVE_GRADING_TASKS.dec()
                GRADING_PROCESSING_TIME.labels(
                    question_type=question_type,
                    status=status
                ).observe(time.time() - start_time)
        
        return wrapper
    return decorator

class PerformanceLogger:
    """性能日志记录器"""
    
    def __init__(self):
        self.logger = logging.getLogger('performance')
        
    def log_processing_time(self, operation: str, duration: float, metadata: Dict[str, Any] = None):
        """记录处理时间"""
        self.logger.info(
            f"Performance: {operation} took {duration:.2f}s",
            extra={
                'operation': operation,
                'duration': duration,
                'metadata': metadata or {}
            }
        )
    
    def log_resource_usage(self, cpu_percent: float, memory_mb: float):
        """记录资源使用情况"""
        self.logger.info(
            f"Resource usage: CPU {cpu_percent:.1f}%, Memory {memory_mb:.1f}MB",
            extra={
                'cpu_percent': cpu_percent,
                'memory_mb': memory_mb
            }
        )

# 全局性能记录器实例
perf_logger = PerformanceLogger()