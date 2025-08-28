"""
Cache Consistency and Monitoring System
智阅3.0缓存一致性策略和监控系统
"""

import asyncio
import json
import logging
import time
import threading
from abc import ABC, abstractmethod
from dataclasses import dataclass, asdict, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, List, Optional, Set, Any, Callable, Union
from collections import defaultdict, deque
import hashlib
import uuid
from contextlib import asynccontextmanager

logger = logging.getLogger(__name__)

class ConsistencyLevel(str, Enum):
    """一致性级别"""
    EVENTUAL = "eventual"      # 最终一致性
    STRONG = "strong"          # 强一致性
    WEAK = "weak"              # 弱一致性
    SESSION = "session"        # 会话一致性

class InvalidationType(str, Enum):
    """失效类型"""
    IMMEDIATE = "immediate"    # 立即失效
    DELAYED = "delayed"        # 延迟失效
    TIME_BASED = "time_based"  # 基于时间失效
    WRITE_THROUGH = "write_through"  # 写穿透
    WRITE_BEHIND = "write_behind"    # 写回

class CacheEvent(str, Enum):
    """缓存事件"""
    HIT = "hit"
    MISS = "miss"
    SET = "set"
    DELETE = "delete"
    INVALIDATE = "invalidate"
    EXPIRE = "expire"
    EVICT = "evict"

@dataclass
class CacheMetrics:
    """缓存指标"""
    cache_name: str
    level: str  # L1, L2, L3
    hit_count: int = 0
    miss_count: int = 0
    set_count: int = 0
    delete_count: int = 0
    invalidate_count: int = 0
    expire_count: int = 0
    evict_count: int = 0
    total_memory_mb: float = 0.0
    used_memory_mb: float = 0.0
    avg_response_time_ms: float = 0.0
    last_updated: datetime = field(default_factory=datetime.now)
    
    @property
    def hit_rate(self) -> float:
        total = self.hit_count + self.miss_count
        return self.hit_count / total if total > 0 else 0.0
    
    @property
    def memory_usage_percent(self) -> float:
        return (self.used_memory_mb / self.total_memory_mb * 100) if self.total_memory_mb > 0 else 0.0
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

@dataclass
class ConsistencyEvent:
    """一致性事件"""
    event_id: str
    event_type: InvalidationType
    affected_keys: List[str]
    source_cache: str
    target_caches: List[str]
    consistency_level: ConsistencyLevel
    timestamp: datetime = field(default_factory=datetime.now)
    processed: bool = False
    retry_count: int = 0
    max_retries: int = 3

class CacheObserver(ABC):
    """缓存观察者接口"""
    
    @abstractmethod
    async def on_cache_event(self, cache_name: str, event: CacheEvent, key: str, value: Any = None):
        """缓存事件回调"""
        pass

class ConsistencyStrategy(ABC):
    """一致性策略接口"""
    
    @abstractmethod
    async def invalidate(self, keys: List[str], source_cache: str, target_caches: List[str]):
        """执行失效操作"""
        pass
    
    @abstractmethod
    def get_consistency_level(self) -> ConsistencyLevel:
        """获取一致性级别"""
        pass

class EventualConsistencyStrategy(ConsistencyStrategy):
    """最终一致性策略"""
    
    def __init__(self, propagation_delay: float = 0.1):
        self.propagation_delay = propagation_delay
        
    async def invalidate(self, keys: List[str], source_cache: str, target_caches: List[str]):
        """异步失效，允许短暂不一致"""
        # 延迟传播，模拟网络延迟
        await asyncio.sleep(self.propagation_delay)
        
        # 异步失效其他缓存层
        tasks = []
        for target in target_caches:
            task = asyncio.create_task(self._invalidate_cache(target, keys))
            tasks.append(task)
            
        # 不等待所有任务完成，实现最终一致性
        asyncio.gather(*tasks, return_exceptions=True)
        
    async def _invalidate_cache(self, cache_name: str, keys: List[str]):
        """失效指定缓存"""
        logger.debug(f"Invalidating keys {keys} in cache {cache_name}")
        # 这里需要调用具体缓存实现的失效方法
        
    def get_consistency_level(self) -> ConsistencyLevel:
        return ConsistencyLevel.EVENTUAL

class StrongConsistencyStrategy(ConsistencyStrategy):
    """强一致性策略"""
    
    def __init__(self, timeout: float = 5.0):
        self.timeout = timeout
        
    async def invalidate(self, keys: List[str], source_cache: str, target_caches: List[str]):
        """同步失效，确保强一致性"""
        tasks = []
        for target in target_caches:
            task = asyncio.create_task(self._invalidate_cache_sync(target, keys))
            tasks.append(task)
            
        # 等待所有缓存失效完成
        try:
            await asyncio.wait_for(asyncio.gather(*tasks), timeout=self.timeout)
        except asyncio.TimeoutError:
            logger.error(f"Strong consistency invalidation timeout for keys: {keys}")
            raise
            
    async def _invalidate_cache_sync(self, cache_name: str, keys: List[str]):
        """同步失效指定缓存"""
        logger.debug(f"Synchronously invalidating keys {keys} in cache {cache_name}")
        # 这里需要调用具体缓存实现的失效方法
        
    def get_consistency_level(self) -> ConsistencyLevel:
        return ConsistencyLevel.STRONG

class CacheConsistencyManager:
    """缓存一致性管理器"""
    
    def __init__(self, default_strategy: ConsistencyStrategy = None):
        self.default_strategy = default_strategy or EventualConsistencyStrategy()
        self.strategies: Dict[str, ConsistencyStrategy] = {}
        self.observers: List[CacheObserver] = []
        self.pending_events: deque = deque()
        self.cache_relationships: Dict[str, List[str]] = {}  # cache -> dependent caches
        self.invalidation_patterns: Dict[str, List[str]] = {}  # table -> cache keys
        self.running = False
        self._event_processor_task = None
        
    def register_cache_relationship(self, source_cache: str, dependent_caches: List[str]):
        """注册缓存依赖关系"""
        self.cache_relationships[source_cache] = dependent_caches
        
    def register_invalidation_pattern(self, table_name: str, cache_key_patterns: List[str]):
        """注册失效模式"""
        self.invalidation_patterns[table_name] = cache_key_patterns
        
    def set_strategy(self, cache_name: str, strategy: ConsistencyStrategy):
        """为指定缓存设置一致性策略"""
        self.strategies[cache_name] = strategy
        
    def add_observer(self, observer: CacheObserver):
        """添加缓存观察者"""
        self.observers.append(observer)
        
    def remove_observer(self, observer: CacheObserver):
        """移除缓存观察者"""
        if observer in self.observers:
            self.observers.remove(observer)
            
    async def start(self):
        """启动一致性管理器"""
        if self.running:
            return
            
        self.running = True
        self._event_processor_task = asyncio.create_task(self._process_events())
        logger.info("Cache consistency manager started")
        
    async def stop(self):
        """停止一致性管理器"""
        if not self.running:
            return
            
        self.running = False
        if self._event_processor_task:
            self._event_processor_task.cancel()
            try:
                await self._event_processor_task
            except asyncio.CancelledError:
                pass
                
        logger.info("Cache consistency manager stopped")
        
    async def notify_cache_event(self, cache_name: str, event: CacheEvent, key: str, value: Any = None):
        """通知缓存事件"""
        # 通知观察者
        for observer in self.observers:
            try:
                await observer.on_cache_event(cache_name, event, key, value)
            except Exception as e:
                logger.error(f"Observer error: {str(e)}")
                
        # 处理需要一致性保证的事件
        if event in [CacheEvent.SET, CacheEvent.DELETE]:
            await self._handle_consistency_event(cache_name, event, key, value)
            
    async def _handle_consistency_event(self, cache_name: str, event: CacheEvent, key: str, value: Any):
        """处理一致性事件"""
        dependent_caches = self.cache_relationships.get(cache_name, [])
        if not dependent_caches:
            return
            
        strategy = self.strategies.get(cache_name, self.default_strategy)
        invalidation_type = InvalidationType.IMMEDIATE if event == CacheEvent.DELETE else InvalidationType.TIME_BASED
        
        consistency_event = ConsistencyEvent(
            event_id=str(uuid.uuid4()),
            event_type=invalidation_type,
            affected_keys=[key],
            source_cache=cache_name,
            target_caches=dependent_caches,
            consistency_level=strategy.get_consistency_level()
        )
        
        self.pending_events.append(consistency_event)
        
    async def _process_events(self):
        """处理一致性事件"""
        while self.running:
            try:
                if self.pending_events:
                    event = self.pending_events.popleft()
                    await self._process_single_event(event)
                else:
                    await asyncio.sleep(0.01)  # 避免忙等待
            except Exception as e:
                logger.error(f"Error processing consistency events: {str(e)}")
                await asyncio.sleep(1)
                
    async def _process_single_event(self, event: ConsistencyEvent):
        """处理单个一致性事件"""
        try:
            strategy = self.strategies.get(event.source_cache, self.default_strategy)
            await strategy.invalidate(event.affected_keys, event.source_cache, event.target_caches)
            event.processed = True
            logger.debug(f"Processed consistency event {event.event_id}")
        except Exception as e:
            logger.error(f"Failed to process consistency event {event.event_id}: {str(e)}")
            event.retry_count += 1
            
            if event.retry_count < event.max_retries:
                # 重新入队重试
                self.pending_events.append(event)
            else:
                logger.error(f"Gave up processing consistency event {event.event_id} after {event.max_retries} retries")
                
    async def invalidate_by_table(self, table_name: str, operation: str = "update"):
        """基于表操作失效缓存"""
        patterns = self.invalidation_patterns.get(table_name, [])
        if not patterns:
            return
            
        affected_keys = []
        for pattern in patterns:
            # 这里需要根据模式生成实际的缓存键
            # 简化实现，实际需要更复杂的模式匹配
            affected_keys.append(pattern)
            
        # 失效所有相关缓存层
        for cache_name in self.cache_relationships:
            await self.notify_cache_event(cache_name, CacheEvent.INVALIDATE, pattern)

class CacheMonitor:
    """缓存监控系统"""
    
    def __init__(self, metrics_retention_hours: int = 24):
        self.metrics_retention = timedelta(hours=metrics_retention_hours)
        self.cache_metrics: Dict[str, CacheMetrics] = {}
        self.historical_metrics: Dict[str, List[Tuple[datetime, CacheMetrics]]] = defaultdict(list)
        self.alerts: List[Dict[str, Any]] = []
        self.thresholds = {
            'hit_rate_warning': 0.7,
            'hit_rate_critical': 0.5,
            'memory_usage_warning': 80.0,
            'memory_usage_critical': 95.0,
            'response_time_warning': 100.0,  # ms
            'response_time_critical': 500.0  # ms
        }
        
    def update_metrics(self, cache_name: str, metrics: CacheMetrics):
        """更新缓存指标"""
        self.cache_metrics[cache_name] = metrics
        
        # 保存历史数据
        self.historical_metrics[cache_name].append((datetime.now(), metrics))
        
        # 清理过期数据
        self._cleanup_historical_data()
        
        # 检查告警条件
        self._check_alerts(cache_name, metrics)
        
    def _cleanup_historical_data(self):
        """清理历史数据"""
        cutoff_time = datetime.now() - self.metrics_retention
        
        for cache_name in self.historical_metrics:
            self.historical_metrics[cache_name] = [
                (timestamp, metrics) for timestamp, metrics in self.historical_metrics[cache_name]
                if timestamp > cutoff_time
            ]
            
    def _check_alerts(self, cache_name: str, metrics: CacheMetrics):
        """检查告警条件"""
        alerts = []
        
        # 命中率告警
        if metrics.hit_rate < self.thresholds['hit_rate_critical']:
            alerts.append({
                'level': 'critical',
                'type': 'hit_rate',
                'cache': cache_name,
                'message': f'Cache hit rate critically low: {metrics.hit_rate:.2%}',
                'value': metrics.hit_rate,
                'threshold': self.thresholds['hit_rate_critical']
            })
        elif metrics.hit_rate < self.thresholds['hit_rate_warning']:
            alerts.append({
                'level': 'warning',
                'type': 'hit_rate',
                'cache': cache_name,
                'message': f'Cache hit rate low: {metrics.hit_rate:.2%}',
                'value': metrics.hit_rate,
                'threshold': self.thresholds['hit_rate_warning']
            })
            
        # 内存使用告警
        memory_usage = metrics.memory_usage_percent
        if memory_usage > self.thresholds['memory_usage_critical']:
            alerts.append({
                'level': 'critical',
                'type': 'memory_usage',
                'cache': cache_name,
                'message': f'Cache memory usage critically high: {memory_usage:.1f}%',
                'value': memory_usage,
                'threshold': self.thresholds['memory_usage_critical']
            })
        elif memory_usage > self.thresholds['memory_usage_warning']:
            alerts.append({
                'level': 'warning',
                'type': 'memory_usage',
                'cache': cache_name,
                'message': f'Cache memory usage high: {memory_usage:.1f}%',
                'value': memory_usage,
                'threshold': self.thresholds['memory_usage_warning']
            })
            
        # 响应时间告警
        response_time = metrics.avg_response_time_ms
        if response_time > self.thresholds['response_time_critical']:
            alerts.append({
                'level': 'critical',
                'type': 'response_time',
                'cache': cache_name,
                'message': f'Cache response time critically high: {response_time:.1f}ms',
                'value': response_time,
                'threshold': self.thresholds['response_time_critical']
            })
        elif response_time > self.thresholds['response_time_warning']:
            alerts.append({
                'level': 'warning',
                'type': 'response_time',
                'cache': cache_name,
                'message': f'Cache response time high: {response_time:.1f}ms',
                'value': response_time,
                'threshold': self.thresholds['response_time_warning']
            })
            
        # 添加告警到列表
        for alert in alerts:
            alert['timestamp'] = datetime.now().isoformat()
            self.alerts.append(alert)
            logger.warning(f"Cache alert: {alert['message']}")
            
        # 保持告警数量在合理范围
        if len(self.alerts) > 1000:
            self.alerts = self.alerts[-500:]
            
    def get_metrics_summary(self) -> Dict[str, Any]:
        """获取指标摘要"""
        summary = {
            'timestamp': datetime.now().isoformat(),
            'caches': {},
            'total_caches': len(self.cache_metrics),
            'alerts': {
                'total': len(self.alerts),
                'critical': len([a for a in self.alerts if a['level'] == 'critical']),
                'warning': len([a for a in self.alerts if a['level'] == 'warning'])
            }
        }
        
        for cache_name, metrics in self.cache_metrics.items():
            summary['caches'][cache_name] = metrics.to_dict()
            
        return summary
        
    def get_performance_trends(self, cache_name: str, hours: int = 24) -> Dict[str, List]:
        """获取性能趋势数据"""
        if cache_name not in self.historical_metrics:
            return {}
            
        cutoff_time = datetime.now() - timedelta(hours=hours)
        recent_data = [
            (timestamp, metrics) for timestamp, metrics in self.historical_metrics[cache_name]
            if timestamp > cutoff_time
        ]
        
        if not recent_data:
            return {}
            
        timestamps = [t.isoformat() for t, _ in recent_data]
        hit_rates = [m.hit_rate for _, m in recent_data]
        memory_usage = [m.memory_usage_percent for _, m in recent_data]
        response_times = [m.avg_response_time_ms for _, m in recent_data]
        
        return {
            'timestamps': timestamps,
            'hit_rate': hit_rates,
            'memory_usage_percent': memory_usage,
            'response_time_ms': response_times
        }
        
    def get_recent_alerts(self, hours: int = 24) -> List[Dict[str, Any]]:
        """获取最近的告警"""
        cutoff_time = datetime.now() - timedelta(hours=hours)
        
        return [
            alert for alert in self.alerts
            if datetime.fromisoformat(alert['timestamp']) > cutoff_time
        ]

class CacheMetricsCollector(CacheObserver):
    """缓存指标收集器"""
    
    def __init__(self, monitor: CacheMonitor):
        self.monitor = monitor
        self.event_counters: Dict[str, Dict[CacheEvent, int]] = defaultdict(lambda: defaultdict(int))
        self.response_times: Dict[str, deque] = defaultdict(lambda: deque(maxlen=100))
        self.memory_usage: Dict[str, float] = {}
        
    async def on_cache_event(self, cache_name: str, event: CacheEvent, key: str, value: Any = None):
        """处理缓存事件并更新指标"""
        self.event_counters[cache_name][event] += 1
        
        # 记录响应时间（如果可用）
        if hasattr(value, 'response_time'):
            self.response_times[cache_name].append(value.response_time)
            
        # 更新指标
        await self._update_cache_metrics(cache_name)
        
    async def _update_cache_metrics(self, cache_name: str):
        """更新缓存指标"""
        counters = self.event_counters[cache_name]
        response_times = list(self.response_times[cache_name])
        
        metrics = CacheMetrics(
            cache_name=cache_name,
            level=self._detect_cache_level(cache_name),
            hit_count=counters[CacheEvent.HIT],
            miss_count=counters[CacheEvent.MISS],
            set_count=counters[CacheEvent.SET],
            delete_count=counters[CacheEvent.DELETE],
            invalidate_count=counters[CacheEvent.INVALIDATE],
            expire_count=counters[CacheEvent.EXPIRE],
            evict_count=counters[CacheEvent.EVICT],
            used_memory_mb=self.memory_usage.get(cache_name, 0.0),
            total_memory_mb=100.0,  # 需要从缓存实例获取
            avg_response_time_ms=sum(response_times) / len(response_times) if response_times else 0.0
        )
        
        self.monitor.update_metrics(cache_name, metrics)
        
    def _detect_cache_level(self, cache_name: str) -> str:
        """检测缓存层级"""
        if 'l1' in cache_name.lower() or 'local' in cache_name.lower():
            return 'L1'
        elif 'l2' in cache_name.lower() or 'redis' in cache_name.lower():
            return 'L2'
        elif 'l3' in cache_name.lower() or 'edge' in cache_name.lower() or 'cdn' in cache_name.lower():
            return 'L3'
        else:
            return 'Unknown'

# 集成管理器
class CacheSystemManager:
    """缓存系统管理器"""
    
    def __init__(self):
        self.consistency_manager = CacheConsistencyManager()
        self.monitor = CacheMonitor()
        self.metrics_collector = CacheMetricsCollector(self.monitor)
        
        # 注册指标收集器为观察者
        self.consistency_manager.add_observer(self.metrics_collector)
        
    async def initialize(self, config: Dict[str, Any]):
        """初始化缓存系统"""
        # 设置缓存依赖关系
        relationships = config.get('cache_relationships', {})
        for source, targets in relationships.items():
            self.consistency_manager.register_cache_relationship(source, targets)
            
        # 设置失效模式
        patterns = config.get('invalidation_patterns', {})
        for table, cache_patterns in patterns.items():
            self.consistency_manager.register_invalidation_pattern(table, cache_patterns)
            
        # 启动一致性管理器
        await self.consistency_manager.start()
        
        logger.info("Cache system manager initialized")
        
    async def shutdown(self):
        """关闭缓存系统"""
        await self.consistency_manager.stop()
        logger.info("Cache system manager shutdown")
        
    def get_system_status(self) -> Dict[str, Any]:
        """获取系统状态"""
        return {
            'consistency_manager': {
                'running': self.consistency_manager.running,
                'pending_events': len(self.consistency_manager.pending_events),
                'registered_caches': len(self.consistency_manager.cache_relationships)
            },
            'monitor': self.monitor.get_metrics_summary(),
            'recent_alerts': self.monitor.get_recent_alerts(hours=1)
        }

# 使用示例
async def demo_cache_consistency():
    """缓存一致性演示"""
    print("🚀 Cache Consistency Demo Starting...")
    
    system_manager = CacheSystemManager()
    
    # 配置
    config = {
        'cache_relationships': {
            'l1_cache': ['l2_cache'],
            'l2_cache': ['l3_cache']
        },
        'invalidation_patterns': {
            'users': ['user:*', 'profile:*'],
            'exams': ['exam:*', 'grading:*']
        }
    }
    
    await system_manager.initialize(config)
    
    try:
        # 模拟缓存事件
        await system_manager.consistency_manager.notify_cache_event(
            'l1_cache', CacheEvent.SET, 'user:123', {'name': 'test'}
        )
        
        await asyncio.sleep(1)  # 等待一致性处理
        
        # 获取系统状态
        status = system_manager.get_system_status()
        print(f"📊 System Status: {json.dumps(status, indent=2, default=str)}")
        
    finally:
        await system_manager.shutdown()
        
    print("✅ Cache Consistency Demo Completed!")

if __name__ == "__main__":
    asyncio.run(demo_cache_consistency())