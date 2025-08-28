"""
WebSocket性能优化模块
提供连接池管理、消息队列、性能监控等功能
"""

import asyncio
import logging
import time
from typing import Dict, List, Optional, Any, Callable
from datetime import datetime, timedelta
from collections import defaultdict, deque
from dataclasses import dataclass
import json

logger = logging.getLogger(__name__)

@dataclass
class PerformanceMetrics:
    """性能指标数据类"""
    total_connections: int = 0
    active_connections: int = 0
    messages_sent: int = 0
    messages_failed: int = 0
    avg_response_time: float = 0.0
    peak_concurrent_connections: int = 0
    total_bytes_sent: int = 0
    total_bytes_received: int = 0
    connection_errors: int = 0
    last_updated: datetime = None

class MessageQueue:
    """高性能消息队列"""
    
    def __init__(self, max_size: int = 10000):
        self.queue = asyncio.Queue(maxsize=max_size)
        self.processing_task: Optional[asyncio.Task] = None
        self.handlers: Dict[str, Callable] = {}
        self.metrics = PerformanceMetrics()
        
    async def start_processing(self):
        """启动消息处理"""
        if self.processing_task and not self.processing_task.done():
            return
        
        self.processing_task = asyncio.create_task(self._process_messages())
        logger.info("Message queue processing started")
    
    async def stop_processing(self):
        """停止消息处理"""
        if self.processing_task and not self.processing_task.done():
            self.processing_task.cancel()
            try:
                await self.processing_task
            except asyncio.CancelledError:
                pass
        logger.info("Message queue processing stopped")
    
    async def enqueue(self, message_type: str, data: Any, priority: int = 0):
        """
        入队消息
        
        Args:
            message_type: 消息类型
            data: 消息数据
            priority: 优先级(0=最高)
        """
        try:
            message = {
                "type": message_type,
                "data": data,
                "priority": priority,
                "timestamp": datetime.utcnow(),
                "id": f"{int(time.time() * 1000000)}"
            }
            
            await self.queue.put(message)
            
        except asyncio.QueueFull:
            logger.warning(f"Message queue full, dropping message: {message_type}")
            self.metrics.messages_failed += 1
    
    def register_handler(self, message_type: str, handler: Callable):
        """注册消息处理器"""
        self.handlers[message_type] = handler
        logger.info(f"Registered handler for message type: {message_type}")
    
    async def _process_messages(self):
        """处理消息队列"""
        while True:
            try:
                # 获取消息
                message = await self.queue.get()
                
                # 查找处理器
                handler = self.handlers.get(message["type"])
                if not handler:
                    logger.warning(f"No handler for message type: {message['type']}")
                    continue
                
                # 执行处理器
                start_time = time.time()
                try:
                    await handler(message)
                    self.metrics.messages_sent += 1
                except Exception as e:
                    logger.error(f"Handler failed for {message['type']}: {e}")
                    self.metrics.messages_failed += 1
                finally:
                    # 更新性能指标
                    processing_time = time.time() - start_time
                    self._update_response_time(processing_time)
                
                # 标记任务完成
                self.queue.task_done()
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in message processing: {e}")
    
    def _update_response_time(self, processing_time: float):
        """更新平均响应时间"""
        if self.metrics.avg_response_time == 0:
            self.metrics.avg_response_time = processing_time
        else:
            # 指数移动平均
            self.metrics.avg_response_time = (
                0.9 * self.metrics.avg_response_time + 
                0.1 * processing_time
            )

class ConnectionPool:
    """WebSocket连接池管理"""
    
    def __init__(self, max_connections: int = 10000):
        self.max_connections = max_connections
        self.connections: Dict[str, Any] = {}
        self.connection_stats: Dict[str, Dict] = defaultdict(dict)
        self.metrics = PerformanceMetrics()
        
        # 性能监控
        self.response_times = deque(maxlen=1000)  # 保存最近1000次响应时间
        self.error_counts = defaultdict(int)
        
    def add_connection(self, connection_id: str, connection: Any) -> bool:
        """
        添加连接到池中
        
        Args:
            connection_id: 连接ID
            connection: 连接对象
            
        Returns:
            是否成功添加
        """
        if len(self.connections) >= self.max_connections:
            logger.warning(f"Connection pool full, rejecting connection: {connection_id}")
            return False
        
        self.connections[connection_id] = connection
        self.connection_stats[connection_id] = {
            "connected_at": datetime.utcnow(),
            "messages_sent": 0,
            "messages_received": 0,
            "bytes_sent": 0,
            "bytes_received": 0,
            "last_activity": datetime.utcnow()
        }
        
        # 更新指标
        self.metrics.total_connections += 1
        self.metrics.active_connections = len(self.connections)
        if self.metrics.active_connections > self.metrics.peak_concurrent_connections:
            self.metrics.peak_concurrent_connections = self.metrics.active_connections
        
        logger.info(f"Connection added to pool: {connection_id}")
        return True
    
    def remove_connection(self, connection_id: str) -> bool:
        """
        从池中移除连接
        
        Args:
            connection_id: 连接ID
            
        Returns:
            是否成功移除
        """
        if connection_id in self.connections:
            del self.connections[connection_id]
            
            # 更新指标
            if connection_id in self.connection_stats:
                stats = self.connection_stats[connection_id]
                self.metrics.total_bytes_sent += stats["bytes_sent"]
                self.metrics.total_bytes_received += stats["bytes_received"]
                del self.connection_stats[connection_id]
            
            self.metrics.active_connections = len(self.connections)
            
            logger.info(f"Connection removed from pool: {connection_id}")
            return True
        
        return False
    
    def get_connection(self, connection_id: str) -> Optional[Any]:
        """获取连接"""
        return self.connections.get(connection_id)
    
    def get_all_connections(self) -> Dict[str, Any]:
        """获取所有连接"""
        return self.connections.copy()
    
    def update_activity(self, connection_id: str, bytes_sent: int = 0, bytes_received: int = 0):
        """更新连接活动"""
        if connection_id in self.connection_stats:
            stats = self.connection_stats[connection_id]
            stats["last_activity"] = datetime.utcnow()
            
            if bytes_sent > 0:
                stats["messages_sent"] += 1
                stats["bytes_sent"] += bytes_sent
            
            if bytes_received > 0:
                stats["messages_received"] += 1
                stats["bytes_received"] += bytes_received
    
    def cleanup_stale_connections(self, timeout_minutes: int = 30):
        """清理过期连接"""
        cutoff_time = datetime.utcnow() - timedelta(minutes=timeout_minutes)
        stale_connections = []
        
        for conn_id, stats in self.connection_stats.items():
            if stats["last_activity"] < cutoff_time:
                stale_connections.append(conn_id)
        
        for conn_id in stale_connections:
            self.remove_connection(conn_id)
            logger.info(f"Cleaned up stale connection: {conn_id}")
        
        return len(stale_connections)
    
    def get_performance_stats(self) -> Dict[str, Any]:
        """获取性能统计"""
        current_time = datetime.utcnow()
        
        # 计算平均响应时间
        avg_response_time = 0
        if self.response_times:
            avg_response_time = sum(self.response_times) / len(self.response_times)
        
        # 计算连接持续时间
        connection_durations = []
        for stats in self.connection_stats.values():
            duration = (current_time - stats["connected_at"]).total_seconds()
            connection_durations.append(duration)
        
        avg_connection_duration = 0
        if connection_durations:
            avg_connection_duration = sum(connection_durations) / len(connection_durations)
        
        return {
            "total_connections": self.metrics.total_connections,
            "active_connections": self.metrics.active_connections,
            "peak_concurrent_connections": self.metrics.peak_concurrent_connections,
            "average_response_time": avg_response_time,
            "average_connection_duration": avg_connection_duration,
            "total_bytes_sent": self.metrics.total_bytes_sent,
            "total_bytes_received": self.metrics.total_bytes_received,
            "connection_errors": self.metrics.connection_errors,
            "error_distribution": dict(self.error_counts),
            "pool_utilization": len(self.connections) / self.max_connections,
            "last_updated": current_time.isoformat()
        }

class PerformanceMonitor:
    """WebSocket性能监控器"""
    
    def __init__(self, sample_interval: int = 30):
        self.sample_interval = sample_interval
        self.monitoring_task: Optional[asyncio.Task] = None
        self.metrics_history = deque(maxlen=720)  # 保存6小时的数据(30s间隔)
        
    async def start_monitoring(self, connection_pool: ConnectionPool, message_queue: MessageQueue):
        """启动性能监控"""
        if self.monitoring_task and not self.monitoring_task.done():
            return
        
        self.monitoring_task = asyncio.create_task(
            self._monitor_loop(connection_pool, message_queue)
        )
        logger.info("Performance monitoring started")
    
    async def stop_monitoring(self):
        """停止性能监控"""
        if self.monitoring_task and not self.monitoring_task.done():
            self.monitoring_task.cancel()
            try:
                await self.monitoring_task
            except asyncio.CancelledError:
                pass
        logger.info("Performance monitoring stopped")
    
    async def _monitor_loop(self, connection_pool: ConnectionPool, message_queue: MessageQueue):
        """监控循环"""
        while True:
            try:
                await asyncio.sleep(self.sample_interval)
                
                # 收集指标
                metrics = {
                    "timestamp": datetime.utcnow().isoformat(),
                    "connection_pool": connection_pool.get_performance_stats(),
                    "message_queue": {
                        "queue_size": message_queue.queue.qsize(),
                        "messages_sent": message_queue.metrics.messages_sent,
                        "messages_failed": message_queue.metrics.messages_failed,
                        "avg_response_time": message_queue.metrics.avg_response_time
                    }
                }
                
                # 保存到历史记录
                self.metrics_history.append(metrics)
                
                # 检查异常情况
                await self._check_anomalies(metrics)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in performance monitoring: {e}")
    
    async def _check_anomalies(self, metrics: Dict[str, Any]):
        """检查性能异常"""
        pool_stats = metrics["connection_pool"]
        queue_stats = metrics["message_queue"]
        
        # 检查连接池利用率
        if pool_stats["pool_utilization"] > 0.9:
            logger.warning(f"High connection pool utilization: {pool_stats['pool_utilization']:.2%}")
        
        # 检查消息队列大小
        if queue_stats["queue_size"] > 1000:
            logger.warning(f"Large message queue size: {queue_stats['queue_size']}")
        
        # 检查响应时间
        if queue_stats["avg_response_time"] > 1.0:
            logger.warning(f"High average response time: {queue_stats['avg_response_time']:.3f}s")
        
        # 检查错误率
        total_messages = queue_stats["messages_sent"] + queue_stats["messages_failed"]
        if total_messages > 0:
            error_rate = queue_stats["messages_failed"] / total_messages
            if error_rate > 0.05:  # 5%错误率
                logger.warning(f"High message failure rate: {error_rate:.2%}")
    
    def get_metrics_history(self, hours: int = 1) -> List[Dict[str, Any]]:
        """获取指标历史"""
        samples_needed = (hours * 3600) // self.sample_interval
        return list(self.metrics_history)[-samples_needed:]

# 全局实例
connection_pool = ConnectionPool()
message_queue = MessageQueue()
performance_monitor = PerformanceMonitor()