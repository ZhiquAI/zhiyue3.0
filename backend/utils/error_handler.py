"""
增强的错误处理和异常管理模块
"""

import logging
import traceback
import asyncio
from typing import Any, Dict, Optional, Callable, Type, Union
from functools import wraps
from contextlib import asynccontextmanager
from datetime import datetime
from enum import Enum
import json

logger = logging.getLogger(__name__)

class ErrorSeverity(Enum):
    """错误严重程度"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class ErrorCategory(Enum):
    """错误类别"""
    VALIDATION = "validation"
    AUTHENTICATION = "authentication"
    AUTHORIZATION = "authorization"
    DATABASE = "database"
    NETWORK = "network"
    AI_MODEL = "ai_model"
    FILE_PROCESSING = "file_processing"
    BUSINESS_LOGIC = "business_logic"
    SYSTEM = "system"
    EXTERNAL_SERVICE = "external_service"

class SmartException(Exception):
    """智能异常基类"""
    
    def __init__(
        self,
        message: str,
        error_code: str = None,
        category: ErrorCategory = ErrorCategory.SYSTEM,
        severity: ErrorSeverity = ErrorSeverity.MEDIUM,
        context: Dict[str, Any] = None,
        suggestions: list = None,
        recoverable: bool = True,
        original_exception: Exception = None
    ):
        self.message = message
        self.error_code = error_code or self.__class__.__name__
        self.category = category
        self.severity = severity
        self.context = context or {}
        self.suggestions = suggestions or []
        self.recoverable = recoverable
        self.original_exception = original_exception
        self.timestamp = datetime.now()
        super().__init__(message)
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典格式"""
        return {
            "error_code": self.error_code,
            "message": self.message,
            "category": self.category.value,
            "severity": self.severity.value,
            "context": self.context,
            "suggestions": self.suggestions,
            "recoverable": self.recoverable,
            "timestamp": self.timestamp.isoformat(),
            "original_exception": str(self.original_exception) if self.original_exception else None
        }

class ValidationError(SmartException):
    """验证错误"""
    def __init__(self, message: str, field: str = None, **kwargs):
        context = kwargs.get('context', {})
        if field:
            context['field'] = field
        super().__init__(
            message,
            category=ErrorCategory.VALIDATION,
            severity=ErrorSeverity.LOW,
            context=context,
            suggestions=["请检查输入数据格式", "确认必填字段已填写"],
            **kwargs
        )

class AIModelError(SmartException):
    """AI模型错误"""
    def __init__(self, message: str, model_name: str = None, **kwargs):
        context = kwargs.get('context', {})
        if model_name:
            context['model_name'] = model_name
        super().__init__(
            message,
            category=ErrorCategory.AI_MODEL,
            severity=ErrorSeverity.HIGH,
            context=context,
            suggestions=["检查模型是否正常加载", "尝试重新初始化模型", "联系技术支持"],
            **kwargs
        )

class DatabaseError(SmartException):
    """数据库错误"""
    def __init__(self, message: str, operation: str = None, **kwargs):
        context = kwargs.get('context', {})
        if operation:
            context['operation'] = operation
        super().__init__(
            message,
            category=ErrorCategory.DATABASE,
            severity=ErrorSeverity.HIGH,
            context=context,
            suggestions=["检查数据库连接", "验证SQL语句", "检查数据完整性"],
            **kwargs
        )

class FileProcessingError(SmartException):
    """文件处理错误"""
    def __init__(self, message: str, filename: str = None, **kwargs):
        context = kwargs.get('context', {})
        if filename:
            context['filename'] = filename
        super().__init__(
            message,
            category=ErrorCategory.FILE_PROCESSING,
            severity=ErrorSeverity.MEDIUM,
            context=context,
            suggestions=["检查文件格式", "确认文件大小", "验证文件权限"],
            **kwargs
        )

class ErrorHandler:
    """错误处理器"""
    
    def __init__(self):
        self.error_counts = {}
        self.error_handlers = {}
        self.recovery_strategies = {}
    
    def register_handler(
        self,
        exception_type: Type[Exception],
        handler: Callable[[Exception], Any]
    ):
        """注册错误处理器"""
        self.error_handlers[exception_type] = handler
    
    def register_recovery_strategy(
        self,
        category: ErrorCategory,
        strategy: Callable[[SmartException], Any]
    ):
        """注册恢复策略"""
        self.recovery_strategies[category] = strategy
    
    async def handle_error(
        self,
        error: Exception,
        context: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """处理错误"""
        if context is None:
            context = {}
        
        # 转换为SmartException
        if not isinstance(error, SmartException):
            smart_error = self._convert_to_smart_exception(error, context)
        else:
            smart_error = error
        
        # 记录错误
        self._log_error(smart_error)
        
        # 更新错误计数
        self._update_error_count(smart_error)
        
        # 尝试恢复
        recovery_result = await self._attempt_recovery(smart_error)
        
        # 生成错误响应
        error_response = {
            "error": True,
            "error_details": smart_error.to_dict(),
            "recovery_attempted": recovery_result is not None,
            "recovery_successful": recovery_result.get('success', False) if recovery_result else False
        }
        
        return error_response
    
    def _convert_to_smart_exception(
        self,
        error: Exception,
        context: Dict[str, Any]
    ) -> SmartException:
        """将普通异常转换为SmartException"""
        error_mapping = {
            ValueError: (ErrorCategory.VALIDATION, ErrorSeverity.LOW),
            TypeError: (ErrorCategory.VALIDATION, ErrorSeverity.LOW),
            FileNotFoundError: (ErrorCategory.FILE_PROCESSING, ErrorSeverity.MEDIUM),
            PermissionError: (ErrorCategory.AUTHORIZATION, ErrorSeverity.HIGH),
            ConnectionError: (ErrorCategory.NETWORK, ErrorSeverity.HIGH),
            TimeoutError: (ErrorCategory.NETWORK, ErrorSeverity.MEDIUM),
            KeyError: (ErrorCategory.BUSINESS_LOGIC, ErrorSeverity.MEDIUM),
            AttributeError: (ErrorCategory.SYSTEM, ErrorSeverity.MEDIUM),
        }
        
        category, severity = error_mapping.get(
            type(error),
            (ErrorCategory.SYSTEM, ErrorSeverity.MEDIUM)
        )
        
        return SmartException(
            message=str(error),
            error_code=type(error).__name__,
            category=category,
            severity=severity,
            context=context,
            original_exception=error
        )
    
    def _log_error(self, error: SmartException):
        """记录错误日志"""
        log_level = {
            ErrorSeverity.LOW: logging.INFO,
            ErrorSeverity.MEDIUM: logging.WARNING,
            ErrorSeverity.HIGH: logging.ERROR,
            ErrorSeverity.CRITICAL: logging.CRITICAL
        }.get(error.severity, logging.ERROR)
        
        logger.log(
            log_level,
            f"[{error.category.value.upper()}] {error.message}",
            extra={
                "error_code": error.error_code,
                "context": error.context,
                "suggestions": error.suggestions,
                "recoverable": error.recoverable
            }
        )
        
        if error.original_exception:
            logger.debug(
                "Original exception traceback:",
                exc_info=error.original_exception
            )
    
    def _update_error_count(self, error: SmartException):
        """更新错误计数"""
        key = f"{error.category.value}:{error.error_code}"
        self.error_counts[key] = self.error_counts.get(key, 0) + 1
        
        # 如果错误频率过高，升级严重程度
        if self.error_counts[key] > 10:
            logger.warning(f"Error frequency too high for {key}: {self.error_counts[key]} times")
    
    async def _attempt_recovery(self, error: SmartException) -> Optional[Dict[str, Any]]:
        """尝试错误恢复"""
        if not error.recoverable:
            return None
        
        # 查找恢复策略
        strategy = self.recovery_strategies.get(error.category)
        if not strategy:
            return None
        
        try:
            result = await strategy(error)
            return {"success": True, "result": result}
        except Exception as recovery_error:
            logger.error(f"Recovery failed for {error.error_code}: {recovery_error}")
            return {"success": False, "error": str(recovery_error)}
    
    def get_error_statistics(self) -> Dict[str, Any]:
        """获取错误统计"""
        return {
            "total_errors": sum(self.error_counts.values()),
            "error_breakdown": dict(self.error_counts),
            "most_common_errors": sorted(
                self.error_counts.items(),
                key=lambda x: x[1],
                reverse=True
            )[:10]
        }

# 装饰器
def handle_errors(
    reraise: bool = False,
    default_return: Any = None,
    category: ErrorCategory = ErrorCategory.SYSTEM
):
    """错误处理装饰器"""
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            try:
                return await func(*args, **kwargs)
            except Exception as e:
                error_response = await error_handler.handle_error(e, {
                    "function": func.__name__,
                    "args": str(args)[:200],
                    "kwargs": str(kwargs)[:200]
                })
                
                if reraise:
                    raise
                
                return default_return
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                # 对于同步函数，创建事件循环来处理异步错误处理
                loop = None
                try:
                    loop = asyncio.get_event_loop()
                except RuntimeError:
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                
                error_response = loop.run_until_complete(
                    error_handler.handle_error(e, {
                        "function": func.__name__,
                        "args": str(args)[:200],
                        "kwargs": str(kwargs)[:200]
                    })
                )
                
                if reraise:
                    raise
                
                return default_return
        
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator

@asynccontextmanager
async def error_context(context_name: str, context_data: Dict[str, Any] = None):
    """错误上下文管理器"""
    if context_data is None:
        context_data = {}
    
    try:
        yield
    except Exception as e:
        enriched_context = {
            "context_name": context_name,
            **context_data
        }
        await error_handler.handle_error(e, enriched_context)
        raise

# 恢复策略
async def database_recovery_strategy(error: SmartException) -> Any:
    """数据库错误恢复策略"""
    logger.info("Attempting database recovery...")
    
    # 等待一段时间后重试
    await asyncio.sleep(1)
    
    # 这里可以添加具体的恢复逻辑
    # 例如：重新连接数据库、回滚事务等
    
    return {"recovery_type": "database_reconnect"}

async def ai_model_recovery_strategy(error: SmartException) -> Any:
    """AI模型错误恢复策略"""
    logger.info("Attempting AI model recovery...")
    
    # 等待后重试
    await asyncio.sleep(2)
    
    # 这里可以添加模型重新加载逻辑
    
    return {"recovery_type": "model_reload"}

async def file_processing_recovery_strategy(error: SmartException) -> Any:
    """文件处理错误恢复策略"""
    logger.info("Attempting file processing recovery...")
    
    # 检查文件权限、清理临时文件等
    
    return {"recovery_type": "file_cleanup"}

# 全局错误处理器实例
error_handler = ErrorHandler()

# 注册恢复策略
error_handler.register_recovery_strategy(ErrorCategory.DATABASE, database_recovery_strategy)
error_handler.register_recovery_strategy(ErrorCategory.AI_MODEL, ai_model_recovery_strategy)
error_handler.register_recovery_strategy(ErrorCategory.FILE_PROCESSING, file_processing_recovery_strategy)