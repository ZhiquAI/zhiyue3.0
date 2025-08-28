"""
Event Bus Service - Redis Streams Implementation
智阅3.0重构第二阶段：事件驱动架构核心组件

Features:
- Event publishing and subscription
- Event persistence and replay
- Dead letter queue handling
- Event type registration
- Consumer group management
"""

import asyncio
import json
import logging
import time
from datetime import datetime
from typing import Any, Dict, List, Optional, Callable, Union
from dataclasses import dataclass, asdict
from enum import Enum

import redis
import redis.asyncio as aioredis
from pydantic import BaseModel, Field


# Event Type Registry
class EventType(str, Enum):
    # Exam Events
    EXAM_CREATED = "exam.created"
    EXAM_UPDATED = "exam.updated"
    EXAM_DELETED = "exam.deleted"
    
    # Processing Events
    OCR_STARTED = "ocr.started"
    OCR_COMPLETED = "ocr.completed"
    OCR_FAILED = "ocr.failed"
    
    # Grading Events
    GRADING_STARTED = "grading.started"
    GRADING_COMPLETED = "grading.completed"
    GRADING_FAILED = "grading.failed"
    GRADING_REVIEWED = "grading.reviewed"
    
    # Student Events
    STUDENT_CREATED = "student.created"
    STUDENT_UPDATED = "student.updated"
    STUDENT_BATCH_IMPORTED = "student.batch_imported"
    
    # Template Events
    TEMPLATE_CREATED = "template.created"
    TEMPLATE_UPDATED = "template.updated"
    TEMPLATE_ACTIVATED = "template.activated"
    
    # System Events
    BATCH_PROCESSING_STARTED = "batch.started"
    BATCH_PROCESSING_COMPLETED = "batch.completed"
    SYSTEM_HEALTH_CHECK = "system.health_check"


@dataclass
class EventMetadata:
    """Event metadata for tracing and debugging"""
    event_id: str
    timestamp: float
    source_service: str
    correlation_id: Optional[str] = None
    user_id: Optional[str] = None
    trace_id: Optional[str] = None


class Event(BaseModel):
    """Base event class"""
    type: EventType
    data: Dict[str, Any]
    metadata: EventMetadata
    version: str = "1.0"
    
    class Config:
        arbitrary_types_allowed = True


class EventHandler:
    """Base event handler class"""
    
    def __init__(self, event_types: List[EventType]):
        self.event_types = event_types
        self.logger = logging.getLogger(f"{self.__class__.__module__}.{self.__class__.__name__}")
    
    async def handle(self, event: Event) -> bool:
        """Handle event - return True if successful"""
        try:
            if event.type in self.event_types:
                await self.process_event(event)
                self.logger.info(f"Successfully handled event {event.type} with ID {event.metadata.event_id}")
                return True
            return False
        except Exception as e:
            self.logger.error(f"Error handling event {event.type}: {str(e)}")
            return False
    
    async def process_event(self, event: Event):
        """Override this method to implement event processing logic"""
        raise NotImplementedError


class EventBus:
    """Redis Streams-based Event Bus Implementation"""
    
    def __init__(self, 
                 redis_url: str = "redis://localhost:6379",
                 stream_prefix: str = "zhiyue:events",
                 consumer_group: str = "zhiyue-processors",
                 max_retries: int = 3,
                 dead_letter_stream: str = "zhiyue:events:dlq"):
        
        self.redis_url = redis_url
        self.stream_prefix = stream_prefix
        self.consumer_group = consumer_group
        self.max_retries = max_retries
        self.dead_letter_stream = dead_letter_stream
        
        self.redis_client: Optional[aioredis.Redis] = None
        self.handlers: Dict[EventType, List[EventHandler]] = {}
        self.running = False
        self.consumer_tasks: List[asyncio.Task] = []
        
        self.logger = logging.getLogger(__name__)
    
    async def initialize(self):
        """Initialize Redis connection and create consumer groups"""
        try:
            self.redis_client = aioredis.from_url(self.redis_url, decode_responses=True)
            
            # Test connection
            await self.redis_client.ping()
            self.logger.info("Redis connection established")
            
            # Create consumer groups for event types
            for event_type in EventType:
                stream_name = f"{self.stream_prefix}:{event_type.value}"
                try:
                    await self.redis_client.xgroup_create(
                        stream_name, 
                        self.consumer_group, 
                        "0", 
                        mkstream=True
                    )
                    self.logger.info(f"Created consumer group for {event_type.value}")
                except redis.ResponseError as e:
                    if "BUSYGROUP" not in str(e):
                        raise
                    self.logger.debug(f"Consumer group already exists for {event_type.value}")
            
            # Create dead letter queue
            try:
                await self.redis_client.xgroup_create(
                    self.dead_letter_stream,
                    f"{self.consumer_group}-dlq",
                    "0",
                    mkstream=True
                )
            except redis.ResponseError as e:
                if "BUSYGROUP" not in str(e):
                    raise
                    
        except Exception as e:
            self.logger.error(f"Failed to initialize event bus: {str(e)}")
            raise
    
    async def publish(self, event: Event) -> str:
        """Publish event to appropriate stream"""
        if not self.redis_client:
            raise RuntimeError("Event bus not initialized")
        
        stream_name = f"{self.stream_prefix}:{event.type.value}"
        
        # Prepare event data for Redis
        event_data = {
            "type": event.type.value,
            "data": json.dumps(event.data),
            "metadata": json.dumps(asdict(event.metadata)),
            "version": event.version,
            "published_at": time.time()
        }
        
        try:
            # Add to stream
            message_id = await self.redis_client.xadd(stream_name, event_data)
            
            self.logger.info(
                f"Published event {event.type.value} with ID {message_id} "
                f"to stream {stream_name}"
            )
            
            return message_id
            
        except Exception as e:
            self.logger.error(f"Failed to publish event {event.type.value}: {str(e)}")
            raise
    
    def register_handler(self, handler: EventHandler):
        """Register event handler for specific event types"""
        for event_type in handler.event_types:
            if event_type not in self.handlers:
                self.handlers[event_type] = []
            self.handlers[event_type].append(handler)
            
        self.logger.info(
            f"Registered handler {handler.__class__.__name__} "
            f"for events: {[et.value for et in handler.event_types]}"
        )
    
    async def start_consuming(self, consumer_id: str = None):
        """Start consuming events from all registered streams"""
        if not self.redis_client:
            raise RuntimeError("Event bus not initialized")
        
        if not consumer_id:
            consumer_id = f"consumer-{int(time.time())}"
        
        self.running = True
        self.logger.info(f"Starting event consumption with consumer ID: {consumer_id}")
        
        # Start consumer tasks for each event type with handlers
        for event_type in self.handlers.keys():
            task = asyncio.create_task(
                self._consume_stream(event_type, consumer_id)
            )
            self.consumer_tasks.append(task)
        
        # Wait for all consumer tasks
        try:
            await asyncio.gather(*self.consumer_tasks)
        except asyncio.CancelledError:
            self.logger.info("Event consumption cancelled")
        finally:
            self.running = False
    
    async def _consume_stream(self, event_type: EventType, consumer_id: str):
        """Consume events from a specific stream"""
        stream_name = f"{self.stream_prefix}:{event_type.value}"
        
        while self.running:
            try:
                # Read from stream
                messages = await self.redis_client.xreadgroup(
                    self.consumer_group,
                    consumer_id,
                    {stream_name: ">"},
                    count=10,
                    block=1000
                )
                
                if not messages:
                    continue
                
                for stream, msgs in messages:
                    for message_id, fields in msgs:
                        await self._process_message(
                            event_type, stream, message_id, fields, consumer_id
                        )
                        
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.logger.error(f"Error consuming from {stream_name}: {str(e)}")
                await asyncio.sleep(1)
    
    async def _process_message(self, 
                             event_type: EventType, 
                             stream: str, 
                             message_id: str, 
                             fields: Dict[str, str],
                             consumer_id: str):
        """Process individual message"""
        try:
            # Reconstruct event
            event = Event(
                type=EventType(fields["type"]),
                data=json.loads(fields["data"]),
                metadata=EventMetadata(**json.loads(fields["metadata"])),
                version=fields["version"]
            )
            
            # Process with all registered handlers
            success = True
            handlers = self.handlers.get(event_type, [])
            
            for handler in handlers:
                try:
                    handler_success = await handler.handle(event)
                    if not handler_success:
                        success = False
                        self.logger.warning(
                            f"Handler {handler.__class__.__name__} failed for event {message_id}"
                        )
                except Exception as e:
                    success = False
                    self.logger.error(
                        f"Handler {handler.__class__.__name__} error for event {message_id}: {str(e)}"
                    )
            
            if success:
                # Acknowledge successful processing
                await self.redis_client.xack(stream, self.consumer_group, message_id)
                self.logger.debug(f"Acknowledged message {message_id}")
            else:
                # Handle failed processing
                await self._handle_failed_message(stream, message_id, fields)
                
        except Exception as e:
            self.logger.error(f"Error processing message {message_id}: {str(e)}")
            await self._handle_failed_message(stream, message_id, fields)
    
    async def _handle_failed_message(self, stream: str, message_id: str, fields: Dict[str, str]):
        """Handle failed message processing"""
        try:
            # Check retry count
            retry_count = int(fields.get("retry_count", "0"))
            
            if retry_count < self.max_retries:
                # Increment retry count and re-add to stream
                fields["retry_count"] = str(retry_count + 1)
                fields["last_retry"] = str(time.time())
                
                await self.redis_client.xadd(stream, fields)
                self.logger.info(f"Retrying message {message_id}, attempt {retry_count + 1}")
            else:
                # Move to dead letter queue
                fields["original_stream"] = stream
                fields["failed_at"] = str(time.time())
                
                await self.redis_client.xadd(self.dead_letter_stream, fields)
                self.logger.warning(f"Moved message {message_id} to dead letter queue")
            
            # Acknowledge the original message
            await self.redis_client.xack(stream, self.consumer_group, message_id)
            
        except Exception as e:
            self.logger.error(f"Error handling failed message {message_id}: {str(e)}")
    
    async def stop_consuming(self):
        """Stop consuming events"""
        self.running = False
        
        # Cancel all consumer tasks
        for task in self.consumer_tasks:
            task.cancel()
        
        # Wait for tasks to complete
        if self.consumer_tasks:
            await asyncio.gather(*self.consumer_tasks, return_exceptions=True)
        
        self.consumer_tasks.clear()
        self.logger.info("Event consumption stopped")
    
    async def get_stream_info(self, event_type: EventType) -> Dict[str, Any]:
        """Get information about a specific event stream"""
        if not self.redis_client:
            raise RuntimeError("Event bus not initialized")
        
        stream_name = f"{self.stream_prefix}:{event_type.value}"
        
        try:
            info = await self.redis_client.xinfo_stream(stream_name)
            return {
                "stream_name": stream_name,
                "length": info["length"],
                "first_entry": info.get("first-entry"),
                "last_entry": info.get("last-entry"),
                "consumer_groups": info.get("groups", 0)
            }
        except Exception as e:
            self.logger.error(f"Error getting stream info for {stream_name}: {str(e)}")
            return {}
    
    async def get_pending_messages(self, event_type: EventType, consumer_id: str = None) -> List[Dict]:
        """Get pending messages for a consumer"""
        if not self.redis_client:
            raise RuntimeError("Event bus not initialized")
        
        stream_name = f"{self.stream_prefix}:{event_type.value}"
        
        try:
            if consumer_id:
                pending = await self.redis_client.xpending_range(
                    stream_name, self.consumer_group, "-", "+", count=100, consumer=consumer_id
                )
            else:
                pending = await self.redis_client.xpending_range(
                    stream_name, self.consumer_group, "-", "+", count=100
                )
            
            return [
                {
                    "message_id": p["message_id"],
                    "consumer": p["consumer"],
                    "milliseconds_since_delivered": p["time_since_delivered"],
                    "delivery_count": p["times_delivered"]
                }
                for p in pending
            ]
        except Exception as e:
            self.logger.error(f"Error getting pending messages: {str(e)}")
            return []
    
    async def replay_events(self, 
                          event_type: EventType, 
                          start_time: datetime, 
                          end_time: datetime = None) -> List[Event]:
        """Replay events within a time range"""
        if not self.redis_client:
            raise RuntimeError("Event bus not initialized")
        
        stream_name = f"{self.stream_prefix}:{event_type.value}"
        
        start_id = f"{int(start_time.timestamp() * 1000)}-0"
        end_id = "+" if not end_time else f"{int(end_time.timestamp() * 1000)}-0"
        
        try:
            messages = await self.redis_client.xrange(stream_name, start_id, end_id)
            
            events = []
            for message_id, fields in messages:
                try:
                    event = Event(
                        type=EventType(fields["type"]),
                        data=json.loads(fields["data"]),
                        metadata=EventMetadata(**json.loads(fields["metadata"])),
                        version=fields["version"]
                    )
                    events.append(event)
                except Exception as e:
                    self.logger.warning(f"Error reconstructing event {message_id}: {str(e)}")
            
            return events
            
        except Exception as e:
            self.logger.error(f"Error replaying events: {str(e)}")
            return []
    
    async def close(self):
        """Close Redis connection"""
        await self.stop_consuming()
        
        if self.redis_client:
            await self.redis_client.close()
            self.redis_client = None
        
        self.logger.info("Event bus closed")


# Global event bus instance
event_bus = EventBus()


# Convenience functions
async def publish_event(event_type: EventType, 
                       data: Dict[str, Any], 
                       source_service: str,
                       correlation_id: str = None,
                       user_id: str = None) -> str:
    """Convenience function to publish an event"""
    import uuid
    
    metadata = EventMetadata(
        event_id=str(uuid.uuid4()),
        timestamp=time.time(),
        source_service=source_service,
        correlation_id=correlation_id,
        user_id=user_id
    )
    
    event = Event(
        type=event_type,
        data=data,
        metadata=metadata
    )
    
    return await event_bus.publish(event)


def event_handler(*event_types: EventType):
    """Decorator to register event handlers"""
    def decorator(handler_class):
        class WrappedHandler(EventHandler):
            def __init__(self, *args, **kwargs):
                super().__init__(list(event_types))
                self.handler_instance = handler_class(*args, **kwargs)
            
            async def process_event(self, event: Event):
                if hasattr(self.handler_instance, 'handle_event'):
                    return await self.handler_instance.handle_event(event)
                else:
                    return await self.handler_instance.process_event(event)
        
        return WrappedHandler
    return decorator