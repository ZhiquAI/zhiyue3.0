"""
Application Performance Monitoring (APM) System
智阅3.0应用性能监控系统
"""

import asyncio
import json
import logging
import time
import uuid
import threading
import psutil
import platform
from abc import ABC, abstractmethod
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, List, Optional, Any, Callable, Set, Union
from collections import defaultdict, deque
from contextlib import contextmanager, asynccontextmanager
import functools
import weakref
from pathlib import Path
import aiofiles
import aiohttp

logger = logging.getLogger(__name__)

class MetricType(str, Enum):
    """指标类型"""
    COUNTER = "counter"          # 计数器
    GAUGE = "gauge"             # 仪表盘
    HISTOGRAM = "histogram"     # 直方图
    SUMMARY = "summary"         # 摘要
    TIMER = "timer"            # 计时器

class AlertLevel(str, Enum):
    """告警级别"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"

class TraceStatus(str, Enum):
    """链路状态"""
    OK = "ok"
    ERROR = "error"
    TIMEOUT = "timeout"

@dataclass
class Metric:
    """指标数据"""
    name: str
    type: MetricType
    value: Union[int, float]
    timestamp: datetime = field(default_factory=datetime.now)
    tags: Dict[str, str] = field(default_factory=dict)
    labels: Dict[str, str] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'name': self.name,
            'type': self.type.value,
            'value': self.value,
            'timestamp': self.timestamp.isoformat(),
            'tags': self.tags,
            'labels': self.labels
        }

@dataclass
class Span:
    """链路追踪Span"""
    span_id: str
    trace_id: str
    parent_span_id: Optional[str]
    operation_name: str
    service_name: str
    start_time: datetime = field(default_factory=datetime.now)
    end_time: Optional[datetime] = None
    duration: Optional[float] = None
    status: TraceStatus = TraceStatus.OK
    tags: Dict[str, Any] = field(default_factory=dict)
    logs: List[Dict[str, Any]] = field(default_factory=list)
    
    def finish(self, status: TraceStatus = TraceStatus.OK):
        """结束Span"""
        self.end_time = datetime.now()
        self.duration = (self.end_time - self.start_time).total_seconds()
        self.status = status
        
    def log(self, message: str, level: str = "info", **kwargs):
        """添加日志"""
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'level': level,
            'message': message,
            **kwargs
        }
        self.logs.append(log_entry)
        
    def set_tag(self, key: str, value: Any):
        """设置标签"""
        self.tags[key] = value
        
    def to_dict(self) -> Dict[str, Any]:
        return {
            'span_id': self.span_id,
            'trace_id': self.trace_id,
            'parent_span_id': self.parent_span_id,
            'operation_name': self.operation_name,
            'service_name': self.service_name,
            'start_time': self.start_time.isoformat(),
            'end_time': self.end_time.isoformat() if self.end_time else None,
            'duration': self.duration,
            'status': self.status.value,
            'tags': self.tags,
            'logs': self.logs
        }

@dataclass
class Trace:
    """链路追踪"""
    trace_id: str
    spans: List[Span] = field(default_factory=list)
    root_span: Optional[Span] = None
    
    def add_span(self, span: Span):
        """添加Span"""
        self.spans.append(span)
        if not self.root_span or span.parent_span_id is None:
            self.root_span = span
            
    @property
    def duration(self) -> Optional[float]:
        """总持续时间"""
        if self.root_span and self.root_span.duration:
            return self.root_span.duration
        return None
        
    @property
    def service_names(self) -> Set[str]:
        """涉及的服务名称"""
        return {span.service_name for span in self.spans}
        
    def to_dict(self) -> Dict[str, Any]:
        return {
            'trace_id': self.trace_id,
            'duration': self.duration,
            'service_names': list(self.service_names),
            'spans': [span.to_dict() for span in self.spans]
        }

@dataclass
class SystemMetrics:
    """系统指标"""
    timestamp: datetime = field(default_factory=datetime.now)
    
    # CPU指标
    cpu_usage_percent: float = 0.0
    cpu_count: int = 0
    load_average: List[float] = field(default_factory=list)
    
    # 内存指标
    memory_total: int = 0
    memory_available: int = 0
    memory_used: int = 0
    memory_usage_percent: float = 0.0
    
    # 磁盘指标
    disk_total: int = 0
    disk_used: int = 0
    disk_free: int = 0
    disk_usage_percent: float = 0.0
    disk_io_read: int = 0
    disk_io_write: int = 0
    
    # 网络指标
    network_bytes_sent: int = 0
    network_bytes_recv: int = 0
    network_packets_sent: int = 0
    network_packets_recv: int = 0
    
    # 进程指标
    process_count: int = 0
    thread_count: int = 0
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

class MetricsCollector:
    """指标收集器"""
    
    def __init__(self):
        self.metrics: deque = deque(maxlen=10000)  # 最多保存10000个指标
        self.counters: Dict[str, float] = defaultdict(float)
        self.gauges: Dict[str, float] = {}
        self.histograms: Dict[str, List[float]] = defaultdict(list)
        self.timers: Dict[str, List[float]] = defaultdict(list)
        self.lock = threading.RLock()
        
    def counter(self, name: str, value: float = 1.0, tags: Dict[str, str] = None):
        """计数器指标"""
        with self.lock:
            key = self._make_key(name, tags)
            self.counters[key] += value
            
            metric = Metric(
                name=name,
                type=MetricType.COUNTER,
                value=self.counters[key],
                tags=tags or {}
            )
            self.metrics.append(metric)
            
    def gauge(self, name: str, value: float, tags: Dict[str, str] = None):
        """仪表盘指标"""
        with self.lock:
            key = self._make_key(name, tags)
            self.gauges[key] = value
            
            metric = Metric(
                name=name,
                type=MetricType.GAUGE,
                value=value,
                tags=tags or {}
            )
            self.metrics.append(metric)
            
    def histogram(self, name: str, value: float, tags: Dict[str, str] = None):
        """直方图指标"""
        with self.lock:
            key = self._make_key(name, tags)
            self.histograms[key].append(value)
            
            # 保持最近1000个值
            if len(self.histograms[key]) > 1000:
                self.histograms[key] = self.histograms[key][-1000:]
                
            metric = Metric(
                name=name,
                type=MetricType.HISTOGRAM,
                value=value,
                tags=tags or {}
            )
            self.metrics.append(metric)
            
    def timer(self, name: str, duration: float, tags: Dict[str, str] = None):
        """计时器指标"""
        with self.lock:
            key = self._make_key(name, tags)
            self.timers[key].append(duration)
            
            # 保持最近1000个值
            if len(self.timers[key]) > 1000:
                self.timers[key] = self.timers[key][-1000:]
                
            metric = Metric(
                name=name,
                type=MetricType.TIMER,
                value=duration,
                tags=tags or {}
            )
            self.metrics.append(metric)
            
    @contextmanager
    def time_context(self, name: str, tags: Dict[str, str] = None):
        """计时上下文管理器"""
        start_time = time.time()
        try:
            yield
        finally:
            duration = time.time() - start_time
            self.timer(name, duration, tags)
            
    def _make_key(self, name: str, tags: Dict[str, str] = None) -> str:
        """生成指标键"""
        if not tags:
            return name
        tag_str = ','.join(f"{k}={v}" for k, v in sorted(tags.items()))
        return f"{name}[{tag_str}]"
        
    def get_recent_metrics(self, limit: int = 100) -> List[Dict[str, Any]]:
        """获取最近的指标"""
        with self.lock:
            recent = list(self.metrics)[-limit:]
            return [metric.to_dict() for metric in recent]
            
    def get_metric_summary(self) -> Dict[str, Any]:
        """获取指标摘要"""
        with self.lock:
            return {
                'total_metrics': len(self.metrics),
                'counters': len(self.counters),
                'gauges': len(self.gauges),
                'histograms': len(self.histograms),
                'timers': len(self.timers),
                'timestamp': datetime.now().isoformat()
            }

class SystemMonitor:
    """系统监控器"""
    
    def __init__(self, metrics_collector: MetricsCollector):
        self.metrics = metrics_collector
        self.running = False
        self.monitor_task: Optional[asyncio.Task] = None
        
    async def start(self, interval: float = 30.0):
        """启动系统监控"""
        if self.running:
            return
            
        self.running = True
        self.monitor_task = asyncio.create_task(self._monitor_loop(interval))
        logger.info("System monitor started")
        
    async def stop(self):
        """停止系统监控"""
        if not self.running:
            return
            
        self.running = False
        if self.monitor_task:
            self.monitor_task.cancel()
            try:
                await self.monitor_task
            except asyncio.CancelledError:
                pass
                
        logger.info("System monitor stopped")
        
    async def _monitor_loop(self, interval: float):
        """监控循环"""
        while self.running:
            try:
                system_metrics = self._collect_system_metrics()
                self._record_system_metrics(system_metrics)
                await asyncio.sleep(interval)
            except Exception as e:
                logger.error(f"System monitoring error: {str(e)}")
                await asyncio.sleep(interval)
                
    def _collect_system_metrics(self) -> SystemMetrics:
        """收集系统指标"""
        # CPU指标
        cpu_percent = psutil.cpu_percent(interval=1)
        cpu_count = psutil.cpu_count()
        load_avg = list(psutil.getloadavg()) if hasattr(psutil, 'getloadavg') else []
        
        # 内存指标
        memory = psutil.virtual_memory()
        
        # 磁盘指标
        disk = psutil.disk_usage('/')
        disk_io = psutil.disk_io_counters()
        
        # 网络指标
        network_io = psutil.net_io_counters()
        
        # 进程指标
        process_count = len(psutil.pids())
        
        return SystemMetrics(
            cpu_usage_percent=cpu_percent,
            cpu_count=cpu_count,
            load_average=load_avg,
            memory_total=memory.total,
            memory_available=memory.available,
            memory_used=memory.used,
            memory_usage_percent=memory.percent,
            disk_total=disk.total,
            disk_used=disk.used,
            disk_free=disk.free,
            disk_usage_percent=(disk.used / disk.total) * 100,
            disk_io_read=disk_io.read_bytes if disk_io else 0,
            disk_io_write=disk_io.write_bytes if disk_io else 0,
            network_bytes_sent=network_io.bytes_sent if network_io else 0,
            network_bytes_recv=network_io.bytes_recv if network_io else 0,
            network_packets_sent=network_io.packets_sent if network_io else 0,
            network_packets_recv=network_io.packets_recv if network_io else 0,
            process_count=process_count,
            thread_count=threading.active_count()
        )
        
    def _record_system_metrics(self, system_metrics: SystemMetrics):
        """记录系统指标"""
        # CPU指标
        self.metrics.gauge('system.cpu.usage_percent', system_metrics.cpu_usage_percent)
        self.metrics.gauge('system.cpu.count', system_metrics.cpu_count)
        
        # 内存指标
        self.metrics.gauge('system.memory.usage_percent', system_metrics.memory_usage_percent)
        self.metrics.gauge('system.memory.used_bytes', system_metrics.memory_used)
        self.metrics.gauge('system.memory.available_bytes', system_metrics.memory_available)
        
        # 磁盘指标
        self.metrics.gauge('system.disk.usage_percent', system_metrics.disk_usage_percent)
        self.metrics.gauge('system.disk.used_bytes', system_metrics.disk_used)
        self.metrics.gauge('system.disk.free_bytes', system_metrics.disk_free)
        
        # 网络指标
        self.metrics.counter('system.network.bytes_sent', system_metrics.network_bytes_sent)
        self.metrics.counter('system.network.bytes_recv', system_metrics.network_bytes_recv)
        
        # 进程指标
        self.metrics.gauge('system.process.count', system_metrics.process_count)
        self.metrics.gauge('system.thread.count', system_metrics.thread_count)

class TraceCollector:
    """链路追踪收集器"""
    
    def __init__(self):
        self.traces: Dict[str, Trace] = {}
        self.current_spans: Dict[str, Span] = {}  # thread_id -> span
        self.completed_traces: deque = deque(maxlen=1000)
        self.lock = threading.RLock()
        
    def start_trace(self, operation_name: str, service_name: str, 
                   trace_id: str = None, parent_span_id: str = None) -> Span:
        """开始链路追踪"""
        if not trace_id:
            trace_id = str(uuid.uuid4())
            
        span_id = str(uuid.uuid4())
        
        span = Span(
            span_id=span_id,
            trace_id=trace_id,
            parent_span_id=parent_span_id,
            operation_name=operation_name,
            service_name=service_name
        )
        
        with self.lock:
            # 创建或获取trace
            if trace_id not in self.traces:
                self.traces[trace_id] = Trace(trace_id=trace_id)
                
            self.traces[trace_id].add_span(span)
            
            # 设置当前span
            thread_id = threading.get_ident()
            self.current_spans[thread_id] = span
            
        return span
        
    def finish_span(self, span: Span, status: TraceStatus = TraceStatus.OK):
        """完成span"""
        span.finish(status)
        
        with self.lock:
            thread_id = threading.get_ident()
            if thread_id in self.current_spans and self.current_spans[thread_id] == span:
                del self.current_spans[thread_id]
                
            # 检查trace是否完成
            trace = self.traces.get(span.trace_id)
            if trace and all(s.end_time for s in trace.spans):
                # Trace完成，移到已完成列表
                self.completed_traces.append(trace)
                del self.traces[span.trace_id]
                
    def get_current_span(self) -> Optional[Span]:
        """获取当前span"""
        thread_id = threading.get_ident()
        return self.current_spans.get(thread_id)
        
    @asynccontextmanager
    async def trace_context(self, operation_name: str, service_name: str, 
                           trace_id: str = None, parent_span_id: str = None):
        """链路追踪上下文管理器"""
        span = self.start_trace(operation_name, service_name, trace_id, parent_span_id)
        
        try:
            yield span
            self.finish_span(span, TraceStatus.OK)
        except Exception as e:
            span.log(f"Error: {str(e)}", "error")
            self.finish_span(span, TraceStatus.ERROR)
            raise
            
    def get_recent_traces(self, limit: int = 50) -> List[Dict[str, Any]]:
        """获取最近的链路"""
        with self.lock:
            recent = list(self.completed_traces)[-limit:]
            return [trace.to_dict() for trace in recent]
            
    def get_trace_summary(self) -> Dict[str, Any]:
        """获取链路摘要"""
        with self.lock:
            active_traces = len(self.traces)
            completed_traces = len(self.completed_traces)
            active_spans = len(self.current_spans)
            
            if self.completed_traces:
                durations = [t.duration for t in self.completed_traces if t.duration]
                avg_duration = sum(durations) / len(durations) if durations else 0
                max_duration = max(durations) if durations else 0
                min_duration = min(durations) if durations else 0
            else:
                avg_duration = max_duration = min_duration = 0
                
            return {
                'active_traces': active_traces,
                'completed_traces': completed_traces,
                'active_spans': active_spans,
                'avg_duration': avg_duration,
                'max_duration': max_duration,
                'min_duration': min_duration,
                'timestamp': datetime.now().isoformat()
            }

class AlertManager:
    """告警管理器"""
    
    def __init__(self, metrics_collector: MetricsCollector):
        self.metrics = metrics_collector
        self.alert_rules: List[Dict[str, Any]] = []
        self.active_alerts: Dict[str, Dict[str, Any]] = {}
        self.alert_history: deque = deque(maxlen=1000)
        self.running = False
        self.alert_task: Optional[asyncio.Task] = None
        
    def add_alert_rule(self, name: str, metric_name: str, condition: str, 
                      threshold: float, level: AlertLevel = AlertLevel.WARNING,
                      duration: int = 60):
        """添加告警规则"""
        rule = {
            'name': name,
            'metric_name': metric_name,
            'condition': condition,  # 'gt', 'lt', 'eq', 'gte', 'lte'
            'threshold': threshold,
            'level': level,
            'duration': duration,
            'created_at': datetime.now()
        }
        self.alert_rules.append(rule)
        logger.info(f"Added alert rule: {name}")
        
    async def start(self, check_interval: float = 30.0):
        """启动告警检查"""
        if self.running:
            return
            
        self.running = True
        self.alert_task = asyncio.create_task(self._check_alerts_loop(check_interval))
        logger.info("Alert manager started")
        
    async def stop(self):
        """停止告警检查"""
        if not self.running:
            return
            
        self.running = False
        if self.alert_task:
            self.alert_task.cancel()
            try:
                await self.alert_task
            except asyncio.CancelledError:
                pass
                
        logger.info("Alert manager stopped")
        
    async def _check_alerts_loop(self, interval: float):
        """告警检查循环"""
        while self.running:
            try:
                await self._check_all_rules()
                await asyncio.sleep(interval)
            except Exception as e:
                logger.error(f"Alert checking error: {str(e)}")
                await asyncio.sleep(interval)
                
    async def _check_all_rules(self):
        """检查所有告警规则"""
        current_time = datetime.now()
        
        for rule in self.alert_rules:
            try:
                await self._check_rule(rule, current_time)
            except Exception as e:
                logger.error(f"Error checking rule {rule['name']}: {str(e)}")
                
    async def _check_rule(self, rule: Dict[str, Any], current_time: datetime):
        """检查单个告警规则"""
        metric_name = rule['metric_name']
        condition = rule['condition']
        threshold = rule['threshold']
        
        # 获取最近的指标值
        recent_metrics = self.metrics.get_recent_metrics(limit=10)
        matching_metrics = [m for m in recent_metrics if m['name'] == metric_name]
        
        if not matching_metrics:
            return
            
        latest_metric = matching_metrics[-1]
        value = latest_metric['value']
        
        # 检查条件
        triggered = False
        if condition == 'gt' and value > threshold:
            triggered = True
        elif condition == 'lt' and value < threshold:
            triggered = True
        elif condition == 'gte' and value >= threshold:
            triggered = True
        elif condition == 'lte' and value <= threshold:
            triggered = True
        elif condition == 'eq' and value == threshold:
            triggered = True
            
        rule_id = rule['name']
        
        if triggered:
            if rule_id not in self.active_alerts:
                # 新告警
                alert = {
                    'rule_name': rule['name'],
                    'metric_name': metric_name,
                    'current_value': value,
                    'threshold': threshold,
                    'condition': condition,
                    'level': rule['level'],
                    'triggered_at': current_time,
                    'last_triggered': current_time
                }
                self.active_alerts[rule_id] = alert
                self.alert_history.append(alert.copy())
                
                logger.warning(f"Alert triggered: {rule['name']} - {metric_name} {condition} {threshold} (current: {value})")
            else:
                # 更新现有告警
                self.active_alerts[rule_id]['last_triggered'] = current_time
                self.active_alerts[rule_id]['current_value'] = value
        else:
            if rule_id in self.active_alerts:
                # 告警恢复
                alert = self.active_alerts[rule_id]
                alert['resolved_at'] = current_time
                alert['current_value'] = value
                
                logger.info(f"Alert resolved: {rule['name']}")
                del self.active_alerts[rule_id]
                
    def get_active_alerts(self) -> List[Dict[str, Any]]:
        """获取活跃告警"""
        return list(self.active_alerts.values())
        
    def get_alert_history(self, limit: int = 100) -> List[Dict[str, Any]]:
        """获取告警历史"""
        return list(self.alert_history)[-limit:]

class APMSystem:
    """APM系统主类"""
    
    def __init__(self):
        self.metrics_collector = MetricsCollector()
        self.trace_collector = TraceCollector()
        self.system_monitor = SystemMonitor(self.metrics_collector)
        self.alert_manager = AlertManager(self.metrics_collector)
        self.running = False
        
        # 默认告警规则
        self._setup_default_alerts()
        
    def _setup_default_alerts(self):
        """设置默认告警规则"""
        self.alert_manager.add_alert_rule(
            "high_cpu_usage",
            "system.cpu.usage_percent",
            "gt",
            80.0,
            AlertLevel.WARNING
        )
        
        self.alert_manager.add_alert_rule(
            "high_memory_usage",
            "system.memory.usage_percent",
            "gt",
            85.0,
            AlertLevel.WARNING
        )
        
        self.alert_manager.add_alert_rule(
            "critical_memory_usage",
            "system.memory.usage_percent",
            "gt",
            95.0,
            AlertLevel.CRITICAL
        )
        
        self.alert_manager.add_alert_rule(
            "high_disk_usage",
            "system.disk.usage_percent",
            "gt",
            90.0,
            AlertLevel.WARNING
        )
        
    async def start(self):
        """启动APM系统"""
        if self.running:
            return
            
        self.running = True
        
        # 启动各个组件
        await self.system_monitor.start(interval=10.0)  # 10秒采集一次
        await self.alert_manager.start(check_interval=30.0)  # 30秒检查一次告警
        
        logger.info("APM system started")
        
    async def stop(self):
        """停止APM系统"""
        if not self.running:
            return
            
        self.running = False
        
        # 停止各个组件
        await self.system_monitor.stop()
        await self.alert_manager.stop()
        
        logger.info("APM system stopped")
        
    def get_system_overview(self) -> Dict[str, Any]:
        """获取系统概览"""
        return {
            'timestamp': datetime.now().isoformat(),
            'status': 'running' if self.running else 'stopped',
            'metrics_summary': self.metrics_collector.get_metric_summary(),
            'trace_summary': self.trace_collector.get_trace_summary(),
            'active_alerts': len(self.alert_manager.get_active_alerts()),
            'system_info': {
                'platform': platform.platform(),
                'python_version': platform.python_version(),
                'cpu_count': psutil.cpu_count(),
                'memory_total': psutil.virtual_memory().total,
                'uptime': time.time() - psutil.boot_time()
            }
        }
        
    def get_dashboard_data(self) -> Dict[str, Any]:
        """获取仪表盘数据"""
        return {
            'overview': self.get_system_overview(),
            'recent_metrics': self.metrics_collector.get_recent_metrics(limit=50),
            'recent_traces': self.trace_collector.get_recent_traces(limit=20),
            'active_alerts': self.alert_manager.get_active_alerts(),
            'alert_history': self.alert_manager.get_alert_history(limit=50)
        }

# 装饰器工具
def monitor_performance(operation_name: str = None, service_name: str = "default"):
    """性能监控装饰器"""
    def decorator(func):
        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            op_name = operation_name or f"{func.__module__}.{func.__name__}"
            
            # 获取APM实例
            apm = getattr(func, '_apm_instance', None)
            if not apm:
                return await func(*args, **kwargs)
                
            async with apm.trace_collector.trace_context(op_name, service_name) as span:
                start_time = time.time()
                
                try:
                    result = await func(*args, **kwargs)
                    success = True
                    return result
                except Exception as e:
                    success = False
                    raise
                finally:
                    duration = time.time() - start_time
                    
                    # 记录指标
                    tags = {'operation': op_name, 'service': service_name, 'success': str(success)}
                    apm.metrics_collector.timer(f"{service_name}.operation.duration", duration, tags)
                    apm.metrics_collector.counter(f"{service_name}.operation.total", 1.0, tags)
                    
                    if not success:
                        apm.metrics_collector.counter(f"{service_name}.operation.errors", 1.0, tags)
                        
        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            op_name = operation_name or f"{func.__module__}.{func.__name__}"
            
            # 获取APM实例
            apm = getattr(func, '_apm_instance', None)
            if not apm:
                return func(*args, **kwargs)
                
            start_time = time.time()
            success = True
            
            try:
                result = func(*args, **kwargs)
                return result
            except Exception as e:
                success = False
                raise
            finally:
                duration = time.time() - start_time
                
                # 记录指标
                tags = {'operation': op_name, 'service': service_name, 'success': str(success)}
                apm.metrics_collector.timer(f"{service_name}.operation.duration", duration, tags)
                apm.metrics_collector.counter(f"{service_name}.operation.total", 1.0, tags)
                
                if not success:
                    apm.metrics_collector.counter(f"{service_name}.operation.errors", 1.0, tags)
                    
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
            
    return decorator

# 使用示例
async def demo_apm_system():
    """APM系统演示"""
    print("🚀 APM System Demo Starting...")
    
    apm = APMSystem()
    await apm.start()
    
    try:
        # 创建一些测试指标
        print("📊 Generating test metrics...")
        
        for i in range(20):
            apm.metrics_collector.counter("test.requests", 1.0, {"endpoint": "/api/test"})
            apm.metrics_collector.gauge("test.active_connections", random.uniform(10, 100))
            apm.metrics_collector.timer("test.response_time", random.uniform(0.1, 2.0))
            await asyncio.sleep(0.1)
            
        # 创建一些链路追踪
        print("🔗 Creating test traces...")
        
        async with apm.trace_collector.trace_context("test_operation", "test_service") as span:
            span.log("Starting test operation")
            await asyncio.sleep(0.5)
            
            async with apm.trace_collector.trace_context("sub_operation", "test_service", 
                                                         span.trace_id, span.span_id) as sub_span:
                sub_span.log("Sub operation")
                await asyncio.sleep(0.2)
                
        # 等待系统指标收集
        await asyncio.sleep(15)
        
        # 获取仪表盘数据
        dashboard_data = apm.get_dashboard_data()
        
        print(f"📈 System Overview:")
        overview = dashboard_data['overview']
        print(f"  Status: {overview['status']}")
        print(f"  Total Metrics: {overview['metrics_summary']['total_metrics']}")
        print(f"  Active Traces: {overview['trace_summary']['active_traces']}")
        print(f"  Active Alerts: {overview['active_alerts']}")
        print(f"  CPU Count: {overview['system_info']['cpu_count']}")
        print(f"  Memory Total: {overview['system_info']['memory_total'] / (1024**3):.1f} GB")
        
        print(f"\n⚠️ Active Alerts: {len(dashboard_data['active_alerts'])}")
        for alert in dashboard_data['active_alerts']:
            print(f"  - {alert['rule_name']}: {alert['metric_name']} = {alert['current_value']}")
            
    finally:
        await apm.stop()
        
    print("✅ APM System Demo Completed!")

if __name__ == "__main__":
    import random
    asyncio.run(demo_apm_system())