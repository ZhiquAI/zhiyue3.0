"""
WebSocket连接管理器 - 事件驱动架构增强版
智阅3.0重构第二阶段：集成事件驱动的实时通信服务

Features:
- Event-driven real-time communication
- Message routing and filtering
- Connection pooling and management
- Heartbeat and reconnection handling
- Event subscription management
"""

import json
import asyncio
import logging
from typing import Dict, List, Set, Optional, Any, Callable
from datetime import datetime
from fastapi import WebSocket, WebSocketDisconnect
from enum import Enum
import uuid

from .event_bus import EventType, Event, EventHandler

logger = logging.getLogger(__name__)


class MessageType(str, Enum):
    """消息类型枚举"""
    # 连接管理
    CONNECTION_ESTABLISHED = "connection_established"
    CONNECTION_CLOSED = "connection_closed"
    HEARTBEAT = "heartbeat"
    
    # 进度追踪
    PROGRESS_UPDATE = "progress_update"
    BATCH_STARTED = "batch_started"
    BATCH_COMPLETED = "batch_completed"
    TASK_PROGRESS = "task_progress"
    
    # 质量监控
    METRICS_UPDATE = "metrics_update"
    QUALITY_ALERT = "quality_alert"
    ALERT_RESOLVED = "alert_resolved"
    REALTIME_DATA = "realtime_data"
    
    # 系统状态
    SYSTEM_STATUS = "system_status"
    SERVICE_STATUS = "service_status"
    ERROR_NOTIFICATION = "error_notification"
    
    # 阅卷相关
    GRADING_STATUS = "grading_status"
    GRADING_RESULT = "grading_result"
    TEMPLATE_UPDATE = "template_update"
    
    # 用户操作
    USER_ACTION = "user_action"
    NOTIFICATION = "notification"


class ConnectionType(str, Enum):
    """连接类型枚举"""
    QUALITY_MONITOR = "quality"
    PROGRESS_TRACKER = "progress"
    GRADING_WORKSPACE = "grading"
    SYSTEM_MONITOR = "system"
    GENERAL = "general"


class WebSocketConnection:
    """Enhanced WebSocket连接包装器 with event subscriptions"""
    
    def __init__(self, websocket: WebSocket, connection_type: ConnectionType, 
                 user_id: Optional[str] = None, exam_id: Optional[str] = None):
        self.websocket = websocket
        self.connection_type = connection_type
        self.user_id = user_id
        self.exam_id = exam_id
        self.connection_id = str(uuid.uuid4())
        self.connected_at = datetime.utcnow()
        self.last_heartbeat = datetime.utcnow()
        self.is_active = True
        
        # Event subscription management
        self.subscribed_events: Set[EventType] = set()
        self.event_filters: Dict[EventType, Callable[[Event], bool]] = {}
        self.message_queue: List[Dict] = []
        self.max_queue_size = 1000
        
    async def send_message(self, message_type: MessageType, data: Any = None, 
                          error: Optional[str] = None):
        """发送消息到客户端"""
        if not self.is_active:
            return False
            
        try:
            message = {
                "type": message_type.value,
                "timestamp": datetime.utcnow().isoformat(),
                "connection_id": self.connection_id,
                "data": data,
                "error": error
            }
            
            await self.websocket.send_text(json.dumps(message))
            return True
        except Exception as e:
            logger.error(f"Failed to send message to {self.connection_id}: {e}")
            self.is_active = False
            return False
    
    def subscribe_to_event(self, event_type: EventType, filter_func: Optional[Callable[[Event], bool]] = None):
        """Subscribe to an event type with optional filter"""
        self.subscribed_events.add(event_type)
        if filter_func:
            self.event_filters[event_type] = filter_func
        logger.debug(f"Connection {self.connection_id} subscribed to {event_type}")
    
    def unsubscribe_from_event(self, event_type: EventType):
        """Unsubscribe from an event type"""
        self.subscribed_events.discard(event_type)
        self.event_filters.pop(event_type, None)
        logger.debug(f"Connection {self.connection_id} unsubscribed from {event_type}")
    
    def should_receive_event(self, event: Event) -> bool:
        """Check if connection should receive this event"""
        if event.type not in self.subscribed_events:
            return False
        
        # Apply event filter if exists
        filter_func = self.event_filters.get(event.type)
        if filter_func:
            return filter_func(event)
        
        # Default filters based on connection context
        if self.user_id and hasattr(event, 'metadata') and event.metadata.user_id:
            return event.metadata.user_id == self.user_id
        
        if self.exam_id and hasattr(event.data, 'exam_id'):
            return event.data.get('exam_id') == self.exam_id
        
        return True
    
    async def send_event(self, event: Event):
        """Send event to connection if subscribed and passes filters"""
        if not self.should_receive_event(event):
            return False
        
        event_message = {
            "type": "event",
            "event_type": event.type.value,
            "event_data": event.data,
            "event_metadata": {
                "event_id": event.metadata.event_id,
                "timestamp": event.metadata.timestamp,
                "source_service": event.metadata.source_service,
                "correlation_id": event.metadata.correlation_id
            },
            "timestamp": datetime.utcnow().isoformat(),
            "connection_id": self.connection_id
        }
        
        return await self._send_raw_message(event_message)
    
    async def _send_raw_message(self, message: Dict) -> bool:
        """Send raw message with queueing support"""
        if not self.is_active:
            return False
        
        try:
            # If connection is busy, queue the message
            if len(self.message_queue) < self.max_queue_size:
                await self.websocket.send_text(json.dumps(message))
                return True
            else:
                # Queue is full, drop oldest messages
                self.message_queue = self.message_queue[-(self.max_queue_size-1):]
                self.message_queue.append(message)
                logger.warning(f"Message queue full for connection {self.connection_id}")
                return False
                
        except Exception as e:
            logger.error(f"Failed to send message to {self.connection_id}: {e}")
            self.is_active = False
            return False
    
    async def flush_message_queue(self):
        """Flush queued messages"""
        if not self.message_queue or not self.is_active:
            return
        
        messages_to_send = self.message_queue.copy()
        self.message_queue.clear()
        
        for message in messages_to_send:
            try:
                await self.websocket.send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"Failed to flush message for {self.connection_id}: {e}")
                self.is_active = False
                break
    
    async def close(self, code: int = 1000, reason: str = ""):
        """关闭连接"""
        try:
            self.is_active = False
            # Flush any remaining messages before closing
            await self.flush_message_queue()
            await self.websocket.close(code=code, reason=reason)
        except Exception as e:
            logger.error(f"Error closing connection {self.connection_id}: {e}")


class WebSocketEventHandler(EventHandler):
    """WebSocket event handler for broadcasting events to connections"""
    
    def __init__(self, websocket_manager: 'WebSocketManager'):
        # Subscribe to all event types for broadcasting
        super().__init__(list(EventType))
        self.websocket_manager = websocket_manager
    
    async def process_event(self, event: Event):
        """Broadcast event to all subscribed WebSocket connections"""
        await self.websocket_manager.broadcast_event(event)


class WebSocketManager:
    """Enhanced WebSocket连接管理器 with event-driven architecture"""
    
    def __init__(self):
        # 按连接类型分组的活跃连接
        self.connections: Dict[ConnectionType, Dict[str, WebSocketConnection]] = {
            connection_type: {} for connection_type in ConnectionType
        }
        
        # 按用户ID索引的连接
        self.user_connections: Dict[str, Set[str]] = {}
        
        # 按考试ID索引的连接
        self.exam_connections: Dict[str, Set[str]] = {}
        
        # Event broadcasting
        self.event_handler = WebSocketEventHandler(self)
        self.broadcast_stats = {
            "total_events_broadcasted": 0,
            "events_by_type": {},
            "failed_broadcasts": 0
        }
        
        # 心跳检查任务
        self.heartbeat_task: Optional[asyncio.Task] = None
        self._start_heartbeat_checker()
    
    async def connect(self, websocket: WebSocket, connection_type: ConnectionType,
                     user_id: Optional[str] = None, exam_id: Optional[str] = None) -> WebSocketConnection:
        """建立WebSocket连接"""
        try:
            await websocket.accept()
            
            connection = WebSocketConnection(websocket, connection_type, user_id, exam_id)
            
            # 添加到连接池
            self.connections[connection_type][connection.connection_id] = connection
            
            # 添加用户索引
            if user_id:
                if user_id not in self.user_connections:
                    self.user_connections[user_id] = set()
                self.user_connections[user_id].add(connection.connection_id)
            
            # 添加考试索引
            if exam_id:
                if exam_id not in self.exam_connections:
                    self.exam_connections[exam_id] = set()
                self.exam_connections[exam_id].add(connection.connection_id)
            
            logger.info(f"WebSocket connection established: {connection.connection_id} "
                       f"(type: {connection_type}, user: {user_id}, exam: {exam_id})")
            
            # Setup default event subscriptions
            self.setup_default_subscriptions(connection)
            
            # 发送连接建立确认
            await connection.send_message(
                MessageType.CONNECTION_ESTABLISHED,
                {
                    "connection_id": connection.connection_id,
                    "connection_type": connection_type.value,
                    "server_time": datetime.utcnow().isoformat(),
                    "subscribed_events": [et.value for et in connection.subscribed_events]
                }
            )
            
            return connection
            
        except Exception as e:
            logger.error(f"Failed to establish WebSocket connection: {e}")
            raise
    
    async def disconnect(self, connection_id: str):
        """断开WebSocket连接"""
        connection = self._find_connection(connection_id)
        if not connection:
            return
        
        try:
            # 从连接池中移除
            del self.connections[connection.connection_type][connection_id]
            
            # 从用户索引中移除
            if connection.user_id and connection.user_id in self.user_connections:
                self.user_connections[connection.user_id].discard(connection_id)
                if not self.user_connections[connection.user_id]:
                    del self.user_connections[connection.user_id]
            
            # 从考试索引中移除
            if connection.exam_id and connection.exam_id in self.exam_connections:
                self.exam_connections[connection.exam_id].discard(connection_id)
                if not self.exam_connections[connection.exam_id]:
                    del self.exam_connections[connection.exam_id]
            
            await connection.close()
            
            logger.info(f"WebSocket connection closed: {connection_id}")
            
        except Exception as e:
            logger.error(f"Error disconnecting {connection_id}: {e}")
    
    def _find_connection(self, connection_id: str) -> Optional[WebSocketConnection]:
        """查找连接"""
        for connection_type in ConnectionType:
            if connection_id in self.connections[connection_type]:
                return self.connections[connection_type][connection_id]
        return None
    
    async def send_to_connection(self, connection_id: str, message_type: MessageType, 
                               data: Any = None, error: Optional[str] = None) -> bool:
        """发送消息到指定连接"""
        connection = self._find_connection(connection_id)
        if connection:
            return await connection.send_message(message_type, data, error)
        return False
    
    async def broadcast_to_type(self, connection_type: ConnectionType, 
                              message_type: MessageType, data: Any = None,
                              error: Optional[str] = None):
        """广播消息到指定类型的所有连接"""
        connections = list(self.connections[connection_type].values())
        
        if not connections:
            return
        
        tasks = []
        for connection in connections:
            if connection.is_active:
                task = connection.send_message(message_type, data, error)
                tasks.append(task)
        
        if tasks:
            results = await asyncio.gather(*tasks, return_exceptions=True)
            failed_count = sum(1 for result in results if isinstance(result, Exception) or not result)
            
            if failed_count > 0:
                logger.warning(f"Failed to broadcast to {failed_count}/{len(tasks)} connections")
    
    async def broadcast_to_user(self, user_id: str, message_type: MessageType, 
                              data: Any = None, error: Optional[str] = None):
        """广播消息到用户的所有连接"""
        if user_id not in self.user_connections:
            return
        
        connection_ids = list(self.user_connections[user_id])
        tasks = []
        
        for connection_id in connection_ids:
            connection = self._find_connection(connection_id)
            if connection and connection.is_active:
                task = connection.send_message(message_type, data, error)
                tasks.append(task)
        
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
    
    async def broadcast_to_exam(self, exam_id: str, message_type: MessageType,
                              data: Any = None, error: Optional[str] = None):
        """广播消息到考试相关的所有连接"""
        if exam_id not in self.exam_connections:
            return
        
        connection_ids = list(self.exam_connections[exam_id])
        tasks = []
        
        for connection_id in connection_ids:
            connection = self._find_connection(connection_id)
            if connection and connection.is_active:
                task = connection.send_message(message_type, data, error)
                tasks.append(task)
        
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
    
    async def broadcast_event(self, event: Event):
        """Broadcast event to all subscribed WebSocket connections"""
        if not event:
            return
        
        # Update broadcast statistics
        self.broadcast_stats["total_events_broadcasted"] += 1
        event_type_str = event.type.value
        self.broadcast_stats["events_by_type"][event_type_str] = \
            self.broadcast_stats["events_by_type"].get(event_type_str, 0) + 1
        
        # Collect all connections that might be interested
        all_connections = []
        for connection_type in ConnectionType:
            all_connections.extend(self.connections[connection_type].values())
        
        # Filter connections that should receive this event
        target_connections = []
        for connection in all_connections:
            if connection.is_active and connection.should_receive_event(event):
                target_connections.append(connection)
        
        if not target_connections:
            logger.debug(f"No connections subscribed to event {event.type}")
            return
        
        # Send event to all target connections
        tasks = []
        for connection in target_connections:
            task = connection.send_event(event)
            tasks.append(task)
        
        try:
            results = await asyncio.gather(*tasks, return_exceptions=True)
            failed_count = sum(1 for result in results if isinstance(result, Exception) or not result)
            
            if failed_count > 0:
                self.broadcast_stats["failed_broadcasts"] += failed_count
                logger.warning(f"Failed to broadcast event {event.type} to {failed_count}/{len(tasks)} connections")
            else:
                logger.debug(f"Successfully broadcasted event {event.type} to {len(tasks)} connections")
                
        except Exception as e:
            self.broadcast_stats["failed_broadcasts"] += len(tasks)
            logger.error(f"Error broadcasting event {event.type}: {str(e)}")
    
    async def subscribe_connection_to_events(self, connection_id: str, event_types: List[EventType], 
                                           filters: Optional[Dict[EventType, Callable]] = None):
        """Subscribe a connection to specific event types"""
        connection = self._find_connection(connection_id)
        if not connection:
            logger.warning(f"Connection {connection_id} not found for event subscription")
            return False
        
        for event_type in event_types:
            filter_func = filters.get(event_type) if filters else None
            connection.subscribe_to_event(event_type, filter_func)
        
        logger.info(f"Connection {connection_id} subscribed to events: {[et.value for et in event_types]}")
        return True
    
    async def unsubscribe_connection_from_events(self, connection_id: str, event_types: List[EventType]):
        """Unsubscribe a connection from specific event types"""
        connection = self._find_connection(connection_id)
        if not connection:
            return False
        
        for event_type in event_types:
            connection.unsubscribe_from_event(event_type)
        
        logger.info(f"Connection {connection_id} unsubscribed from events: {[et.value for et in event_types]}")
        return True
    
    def setup_default_subscriptions(self, connection: WebSocketConnection):
        """Setup default event subscriptions based on connection type"""
        if connection.connection_type == ConnectionType.QUALITY_MONITOR:
            # Quality monitor should receive processing and system events
            default_events = [
                EventType.OCR_STARTED,
                EventType.OCR_COMPLETED,
                EventType.OCR_FAILED,
                EventType.GRADING_STARTED,
                EventType.GRADING_COMPLETED,
                EventType.GRADING_FAILED,
                EventType.SYSTEM_HEALTH_CHECK
            ]
        elif connection.connection_type == ConnectionType.PROGRESS_TRACKER:
            # Progress tracker should receive all processing events
            default_events = [
                EventType.BATCH_PROCESSING_STARTED,
                EventType.BATCH_PROCESSING_COMPLETED,
                EventType.OCR_STARTED,
                EventType.OCR_COMPLETED,
                EventType.GRADING_STARTED,
                EventType.GRADING_COMPLETED
            ]
        elif connection.connection_type == ConnectionType.GRADING_WORKSPACE:
            # Grading workspace should receive grading and exam events
            default_events = [
                EventType.EXAM_CREATED,
                EventType.EXAM_UPDATED,
                EventType.GRADING_STARTED,
                EventType.GRADING_COMPLETED,
                EventType.GRADING_FAILED,
                EventType.GRADING_REVIEWED
            ]
            
            # Add exam-specific filter
            if connection.exam_id:
                exam_filter = lambda event: event.data.get('exam_id') == connection.exam_id
                for event_type in default_events:
                    connection.subscribe_to_event(event_type, exam_filter)
                return
        elif connection.connection_type == ConnectionType.SYSTEM_MONITOR:
            # System monitor should receive system events
            default_events = [
                EventType.SYSTEM_HEALTH_CHECK,
                EventType.BATCH_PROCESSING_STARTED,
                EventType.BATCH_PROCESSING_COMPLETED
            ]
        else:
            # General connections receive basic notifications
            default_events = [
                EventType.EXAM_CREATED,
                EventType.GRADING_COMPLETED,
                EventType.BATCH_PROCESSING_COMPLETED
            ]
        
        # Subscribe to default events
        for event_type in default_events:
            connection.subscribe_to_event(event_type)
    
    async def send_notification(self, user_id: str, notification: Dict[str, Any]):
        """Send notification to specific user"""
        if user_id not in self.user_connections:
            return False
        
        notification_message = {
            "type": "notification",
            "data": notification,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        connection_ids = list(self.user_connections[user_id])
        tasks = []
        
        for connection_id in connection_ids:
            connection = self._find_connection(connection_id)
            if connection and connection.is_active:
                task = connection._send_raw_message(notification_message)
                tasks.append(task)
        
        if tasks:
            results = await asyncio.gather(*tasks, return_exceptions=True)
            return any(result for result in results if not isinstance(result, Exception))
        
        return False
    
    async def broadcast_system_message(self, message: Dict[str, Any]):
        """Broadcast system message to all connections"""
        system_message = {
            "type": "system",
            "data": message,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        all_connections = []
        for connection_type in ConnectionType:
            all_connections.extend(self.connections[connection_type].values())
        
        tasks = []
        for connection in all_connections:
            if connection.is_active:
                task = connection._send_raw_message(system_message)
                tasks.append(task)
        
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
    
    async def broadcast_system_notification(self, notification: Dict[str, Any]):
        """Broadcast system notification to all connections"""
        notification_message = {
            "type": "system_notification",
            "data": notification,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        all_connections = []
        for connection_type in ConnectionType:
            all_connections.extend(self.connections[connection_type].values())
        
        tasks = []
        for connection in all_connections:
            if connection.is_active:
                task = connection._send_raw_message(notification_message)
                tasks.append(task)
        
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
    
    def get_connection_stats(self) -> Dict[str, Any]:
        """获取连接统计信息 including event broadcasting stats"""
        stats = {
            "total_connections": 0,
            "by_type": {},
            "by_user_count": len(self.user_connections),
            "by_exam_count": len(self.exam_connections),
            "event_broadcasting": self.broadcast_stats.copy()
        }
        
        for connection_type in ConnectionType:
            count = len(self.connections[connection_type])
            stats["by_type"][connection_type.value] = count
            stats["total_connections"] += count
        
        # Add subscription statistics
        subscription_stats = {}
        for connection_type in ConnectionType:
            type_subscriptions = {}
            for connection in self.connections[connection_type].values():
                for event_type in connection.subscribed_events:
                    event_name = event_type.value
                    type_subscriptions[event_name] = type_subscriptions.get(event_name, 0) + 1
            subscription_stats[connection_type.value] = type_subscriptions
        
        stats["event_subscriptions"] = subscription_stats
        
        return stats
    
    async def _start_heartbeat_checker(self):
        """启动心跳检查器"""
        if self.heartbeat_task and not self.heartbeat_task.done():
            return
        
        self.heartbeat_task = asyncio.create_task(self._heartbeat_loop())
    
    async def _heartbeat_loop(self):
        """心跳检查循环"""
        while True:
            try:
                await asyncio.sleep(30)  # 每30秒检查一次
                await self._check_connections()
            except Exception as e:
                logger.error(f"Error in heartbeat loop: {e}")
    
    async def _check_connections(self):
        """检查连接状态并清理死连接"""
        dead_connections = []
        
        for connection_type in ConnectionType:
            for connection_id, connection in self.connections[connection_type].items():
                try:
                    # 发送心跳消息
                    if connection.is_active:
                        success = await connection.send_message(MessageType.HEARTBEAT)
                        if not success:
                            dead_connections.append(connection_id)
                except Exception:
                    dead_connections.append(connection_id)
        
        # 清理死连接
        for connection_id in dead_connections:
            await self.disconnect(connection_id)
    
    async def shutdown(self):
        """关闭WebSocket管理器"""
        # 停止心跳检查
        if self.heartbeat_task and not self.heartbeat_task.done():
            self.heartbeat_task.cancel()
        
        # 关闭所有连接
        all_connections = []
        for connection_type in ConnectionType:
            all_connections.extend(list(self.connections[connection_type].keys()))
        
        for connection_id in all_connections:
            await self.disconnect(connection_id)
        
        logger.info("WebSocket manager shutdown complete")


# 全局WebSocket管理器实例
websocket_manager = WebSocketManager()