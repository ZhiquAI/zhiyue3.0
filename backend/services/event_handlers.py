"""
Event Handlers - Business Logic Event Processing
智阅3.0重构第二阶段：业务领域事件处理器

Business Event Handlers:
- ExamEventHandler: Exam lifecycle events
- GradingEventHandler: Grading workflow events  
- ProcessingEventHandler: OCR and image processing events
- NotificationEventHandler: User notification events
- AnalyticsEventHandler: Data analytics and reporting
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional

from .event_bus import EventHandler, Event, EventType, publish_event
from .websocket_manager import websocket_manager
from .prometheus_metrics import metrics
from ..models.exam import Exam
from ..models.grading_models import GradingResult
from ..models.processing_queue import ProcessingQueue
from ..database import get_db_connection


class ExamEventHandler(EventHandler):
    """Handle exam-related events"""
    
    def __init__(self):
        super().__init__([
            EventType.EXAM_CREATED,
            EventType.EXAM_UPDATED,
            EventType.EXAM_DELETED
        ])
    
    async def process_event(self, event: Event):
        """Process exam events"""
        if event.type == EventType.EXAM_CREATED:
            await self._handle_exam_created(event)
        elif event.type == EventType.EXAM_UPDATED:
            await self._handle_exam_updated(event)
        elif event.type == EventType.EXAM_DELETED:
            await self._handle_exam_deleted(event)
    
    async def _handle_exam_created(self, event: Event):
        """Handle exam creation"""
        exam_data = event.data
        exam_id = exam_data.get("exam_id")
        
        self.logger.info(f"Processing exam creation: {exam_id}")
        
        # Update metrics
        metrics.exam_created_total.inc()
        
        # Notify connected users via WebSocket
        await websocket_manager.broadcast_to_user(
            user_id=event.metadata.user_id,
            message={
                "type": "exam_created",
                "data": {
                    "exam_id": exam_id,
                    "name": exam_data.get("name"),
                    "created_at": exam_data.get("created_at")
                }
            }
        )
        
        # Trigger analytics update
        await publish_event(
            EventType.SYSTEM_HEALTH_CHECK,
            {"trigger": "exam_created", "exam_id": exam_id},
            "exam_event_handler",
            correlation_id=event.metadata.correlation_id
        )
        
        self.logger.info(f"Exam creation processed: {exam_id}")
    
    async def _handle_exam_updated(self, event: Event):
        """Handle exam update"""
        exam_data = event.data
        exam_id = exam_data.get("exam_id")
        
        self.logger.info(f"Processing exam update: {exam_id}")
        
        # Notify connected users
        await websocket_manager.broadcast_to_user(
            user_id=event.metadata.user_id,
            message={
                "type": "exam_updated", 
                "data": exam_data
            }
        )
        
        # If exam status changed to active, start processing queue
        if exam_data.get("status") == "active":
            await self._trigger_exam_processing(exam_id, event.metadata.correlation_id)
    
    async def _handle_exam_deleted(self, event: Event):
        """Handle exam deletion"""
        exam_data = event.data
        exam_id = exam_data.get("exam_id")
        
        self.logger.info(f"Processing exam deletion: {exam_id}")
        
        # Clean up related resources
        await self._cleanup_exam_resources(exam_id)
        
        # Notify users
        await websocket_manager.broadcast_to_user(
            user_id=event.metadata.user_id,
            message={
                "type": "exam_deleted",
                "data": {"exam_id": exam_id}
            }
        )
    
    async def _trigger_exam_processing(self, exam_id: str, correlation_id: str):
        """Trigger processing workflow for active exam"""
        await publish_event(
            EventType.BATCH_PROCESSING_STARTED,
            {
                "exam_id": exam_id,
                "processing_type": "exam_activation",
                "priority": "high"
            },
            "exam_event_handler",
            correlation_id=correlation_id
        )
    
    async def _cleanup_exam_resources(self, exam_id: str):
        """Clean up resources related to deleted exam"""
        # This would include cleaning up files, cache entries, etc.
        self.logger.info(f"Cleaning up resources for exam: {exam_id}")


class GradingEventHandler(EventHandler):
    """Handle grading workflow events"""
    
    def __init__(self):
        super().__init__([
            EventType.GRADING_STARTED,
            EventType.GRADING_COMPLETED,
            EventType.GRADING_FAILED,
            EventType.GRADING_REVIEWED
        ])
    
    async def process_event(self, event: Event):
        """Process grading events"""
        if event.type == EventType.GRADING_STARTED:
            await self._handle_grading_started(event)
        elif event.type == EventType.GRADING_COMPLETED:
            await self._handle_grading_completed(event)
        elif event.type == EventType.GRADING_FAILED:
            await self._handle_grading_failed(event)
        elif event.type == EventType.GRADING_REVIEWED:
            await self._handle_grading_reviewed(event)
    
    async def _handle_grading_started(self, event: Event):
        """Handle grading start"""
        grading_data = event.data
        exam_id = grading_data.get("exam_id")
        student_id = grading_data.get("student_id")
        
        self.logger.info(f"Grading started for exam {exam_id}, student {student_id}")
        
        # Update metrics
        metrics.grading_started_total.inc()
        
        # Real-time progress notification
        await websocket_manager.broadcast_to_exam(
            exam_id=exam_id,
            message={
                "type": "grading_progress",
                "data": {
                    "exam_id": exam_id,
                    "student_id": student_id,
                    "status": "started",
                    "timestamp": datetime.now().isoformat()
                }
            }
        )
    
    async def _handle_grading_completed(self, event: Event):
        """Handle grading completion"""
        grading_data = event.data
        exam_id = grading_data.get("exam_id")
        student_id = grading_data.get("student_id")
        score = grading_data.get("score")
        
        self.logger.info(f"Grading completed for exam {exam_id}, student {student_id}, score: {score}")
        
        # Update metrics
        metrics.grading_completed_total.inc()
        metrics.grading_score_histogram.observe(score if score else 0)
        
        # Real-time completion notification
        await websocket_manager.broadcast_to_exam(
            exam_id=exam_id,
            message={
                "type": "grading_completed",
                "data": {
                    "exam_id": exam_id,
                    "student_id": student_id,
                    "score": score,
                    "status": "completed",
                    "timestamp": datetime.now().isoformat()
                }
            }
        )
        
        # Check if exam grading is complete
        await self._check_exam_completion(exam_id, event.metadata.correlation_id)
    
    async def _handle_grading_failed(self, event: Event):
        """Handle grading failure"""
        grading_data = event.data
        exam_id = grading_data.get("exam_id")
        student_id = grading_data.get("student_id")
        error = grading_data.get("error")
        
        self.logger.error(f"Grading failed for exam {exam_id}, student {student_id}: {error}")
        
        # Update metrics
        metrics.grading_failed_total.inc()
        
        # Notify about failure
        await websocket_manager.broadcast_to_exam(
            exam_id=exam_id,
            message={
                "type": "grading_failed",
                "data": {
                    "exam_id": exam_id,
                    "student_id": student_id,
                    "error": error,
                    "status": "failed",
                    "timestamp": datetime.now().isoformat()
                }
            }
        )
        
        # Trigger retry or manual review
        await self._handle_grading_retry(exam_id, student_id, error, event.metadata.correlation_id)
    
    async def _handle_grading_reviewed(self, event: Event):
        """Handle manual grading review"""
        review_data = event.data
        exam_id = review_data.get("exam_id")
        student_id = review_data.get("student_id")
        
        self.logger.info(f"Grading reviewed for exam {exam_id}, student {student_id}")
        
        # Notify about review completion
        await websocket_manager.broadcast_to_exam(
            exam_id=exam_id,
            message={
                "type": "grading_reviewed",
                "data": review_data
            }
        )
    
    async def _check_exam_completion(self, exam_id: str, correlation_id: str):
        """Check if all grading for exam is complete"""
        # This would query the database to check completion status
        # For now, we'll simulate the check
        async with get_db_connection() as db:
            # Check completion logic here
            pass
    
    async def _handle_grading_retry(self, exam_id: str, student_id: str, error: str, correlation_id: str):
        """Handle grading retry logic"""
        await publish_event(
            EventType.GRADING_STARTED,
            {
                "exam_id": exam_id,
                "student_id": student_id,
                "retry": True,
                "previous_error": error
            },
            "grading_event_handler",
            correlation_id=correlation_id
        )


class ProcessingEventHandler(EventHandler):
    """Handle OCR and image processing events"""
    
    def __init__(self):
        super().__init__([
            EventType.OCR_STARTED,
            EventType.OCR_COMPLETED,
            EventType.OCR_FAILED,
            EventType.BATCH_PROCESSING_STARTED,
            EventType.BATCH_PROCESSING_COMPLETED
        ])
    
    async def process_event(self, event: Event):
        """Process OCR and image processing events"""
        if event.type == EventType.OCR_STARTED:
            await self._handle_ocr_started(event)
        elif event.type == EventType.OCR_COMPLETED:
            await self._handle_ocr_completed(event)
        elif event.type == EventType.OCR_FAILED:
            await self._handle_ocr_failed(event)
        elif event.type == EventType.BATCH_PROCESSING_STARTED:
            await self._handle_batch_started(event)
        elif event.type == EventType.BATCH_PROCESSING_COMPLETED:
            await self._handle_batch_completed(event)
    
    async def _handle_ocr_started(self, event: Event):
        """Handle OCR processing start"""
        ocr_data = event.data
        file_id = ocr_data.get("file_id")
        exam_id = ocr_data.get("exam_id")
        
        self.logger.info(f"OCR started for file {file_id}, exam {exam_id}")
        
        # Update metrics
        metrics.ocr_started_total.inc()
        
        # Real-time progress notification
        await websocket_manager.broadcast_to_exam(
            exam_id=exam_id,
            message={
                "type": "ocr_progress",
                "data": {
                    "file_id": file_id,
                    "exam_id": exam_id,
                    "status": "processing",
                    "timestamp": datetime.now().isoformat()
                }
            }
        )
    
    async def _handle_ocr_completed(self, event: Event):
        """Handle OCR completion"""
        ocr_data = event.data
        file_id = ocr_data.get("file_id")
        exam_id = ocr_data.get("exam_id")
        student_id = ocr_data.get("student_id")
        
        self.logger.info(f"OCR completed for file {file_id}, exam {exam_id}")
        
        # Update metrics
        metrics.ocr_completed_total.inc()
        
        # Notify completion
        await websocket_manager.broadcast_to_exam(
            exam_id=exam_id,
            message={
                "type": "ocr_completed",
                "data": ocr_data
            }
        )
        
        # Trigger grading if student identified
        if student_id:
            await publish_event(
                EventType.GRADING_STARTED,
                {
                    "exam_id": exam_id,
                    "student_id": student_id,
                    "file_id": file_id,
                    "ocr_result": ocr_data.get("ocr_result")
                },
                "processing_event_handler",
                correlation_id=event.metadata.correlation_id
            )
    
    async def _handle_ocr_failed(self, event: Event):
        """Handle OCR failure"""
        ocr_data = event.data
        file_id = ocr_data.get("file_id")
        error = ocr_data.get("error")
        
        self.logger.error(f"OCR failed for file {file_id}: {error}")
        
        # Update metrics
        metrics.ocr_failed_total.inc()
        
        # Notify failure
        await websocket_manager.broadcast_to_exam(
            exam_id=ocr_data.get("exam_id"),
            message={
                "type": "ocr_failed",
                "data": ocr_data
            }
        )
    
    async def _handle_batch_started(self, event: Event):
        """Handle batch processing start"""
        batch_data = event.data
        self.logger.info(f"Batch processing started: {batch_data}")
        
        # Update metrics
        metrics.batch_processing_total.inc()
        
        # Notify batch start
        await websocket_manager.broadcast_system_message({
            "type": "batch_started",
            "data": batch_data
        })
    
    async def _handle_batch_completed(self, event: Event):
        """Handle batch processing completion"""
        batch_data = event.data
        self.logger.info(f"Batch processing completed: {batch_data}")
        
        # Notify batch completion
        await websocket_manager.broadcast_system_message({
            "type": "batch_completed",
            "data": batch_data
        })


class NotificationEventHandler(EventHandler):
    """Handle user notification events"""
    
    def __init__(self):
        super().__init__([
            EventType.EXAM_CREATED,
            EventType.GRADING_COMPLETED,
            EventType.BATCH_PROCESSING_COMPLETED
        ])
    
    async def process_event(self, event: Event):
        """Process notification events"""
        # Generate appropriate user notifications based on event type
        if event.type == EventType.EXAM_CREATED:
            await self._notify_exam_created(event)
        elif event.type == EventType.GRADING_COMPLETED:
            await self._notify_grading_completed(event)
        elif event.type == EventType.BATCH_PROCESSING_COMPLETED:
            await self._notify_batch_completed(event)
    
    async def _notify_exam_created(self, event: Event):
        """Notify relevant users about exam creation"""
        exam_data = event.data
        user_id = event.metadata.user_id
        
        # Send notification to exam creator
        await websocket_manager.send_notification(
            user_id=user_id,
            notification={
                "type": "info",
                "title": "考试创建成功",
                "message": f"考试 '{exam_data.get('name')}' 已成功创建",
                "timestamp": datetime.now().isoformat()
            }
        )
    
    async def _notify_grading_completed(self, event: Event):
        """Notify about grading completion"""
        grading_data = event.data
        user_id = event.metadata.user_id
        
        await websocket_manager.send_notification(
            user_id=user_id,
            notification={
                "type": "success",
                "title": "阅卷完成",
                "message": f"学生答卷阅卷已完成，得分: {grading_data.get('score')}",
                "timestamp": datetime.now().isoformat()
            }
        )
    
    async def _notify_batch_completed(self, event: Event):
        """Notify about batch processing completion"""
        batch_data = event.data
        
        # Notify all relevant users
        await websocket_manager.broadcast_system_notification({
            "type": "info",
            "title": "批量处理完成",
            "message": f"批量处理任务已完成，处理了 {batch_data.get('processed_count', 0)} 个项目",
            "timestamp": datetime.now().isoformat()
        })


class AnalyticsEventHandler(EventHandler):
    """Handle analytics and reporting events"""
    
    def __init__(self):
        super().__init__([
            EventType.EXAM_CREATED,
            EventType.GRADING_COMPLETED,
            EventType.STUDENT_CREATED,
            EventType.BATCH_PROCESSING_COMPLETED
        ])
        
        # Analytics data cache
        self.analytics_cache = {}
    
    async def process_event(self, event: Event):
        """Process analytics events"""
        # Update analytics data based on events
        await self._update_analytics(event)
        
        # Periodically aggregate and cache analytics
        await self._aggregate_analytics(event)
    
    async def _update_analytics(self, event: Event):
        """Update analytics data"""
        event_date = datetime.fromtimestamp(event.metadata.timestamp).date()
        
        if event.type == EventType.EXAM_CREATED:
            await self._increment_metric("exams_created", event_date)
        elif event.type == EventType.GRADING_COMPLETED:
            await self._increment_metric("gradings_completed", event_date)
            await self._record_score(event.data.get("score"), event_date)
        elif event.type == EventType.STUDENT_CREATED:
            await self._increment_metric("students_created", event_date)
    
    async def _increment_metric(self, metric_name: str, date):
        """Increment analytics metric"""
        key = f"{metric_name}:{date}"
        if key not in self.analytics_cache:
            self.analytics_cache[key] = 0
        self.analytics_cache[key] += 1
    
    async def _record_score(self, score: float, date):
        """Record score for analytics"""
        if score is not None:
            key = f"scores:{date}"
            if key not in self.analytics_cache:
                self.analytics_cache[key] = []
            self.analytics_cache[key].append(score)
    
    async def _aggregate_analytics(self, event: Event):
        """Aggregate analytics data periodically"""
        # This would run periodically to aggregate and persist analytics data
        # For now, just log the cache size
        self.logger.debug(f"Analytics cache has {len(self.analytics_cache)} entries")


# Event handler instances
exam_handler = ExamEventHandler()
grading_handler = GradingEventHandler()
processing_handler = ProcessingEventHandler()
notification_handler = NotificationEventHandler()
analytics_handler = AnalyticsEventHandler()


async def register_all_handlers(event_bus):
    """Register all event handlers with the event bus"""
    handlers = [
        exam_handler,
        grading_handler,
        processing_handler,
        notification_handler,
        analytics_handler
    ]
    
    for handler in handlers:
        event_bus.register_handler(handler)
    
    logging.info(f"Registered {len(handlers)} event handlers")


# Helper functions for easy event publishing
async def publish_exam_created(exam_id: str, exam_data: Dict[str, Any], user_id: str):
    """Publish exam created event"""
    return await publish_event(
        EventType.EXAM_CREATED,
        {"exam_id": exam_id, **exam_data},
        "exam_service",
        user_id=user_id
    )


async def publish_grading_completed(exam_id: str, student_id: str, score: float, user_id: str):
    """Publish grading completed event"""
    return await publish_event(
        EventType.GRADING_COMPLETED,
        {
            "exam_id": exam_id,
            "student_id": student_id,
            "score": score,
            "completed_at": datetime.now().isoformat()
        },
        "grading_service",
        user_id=user_id
    )


async def publish_ocr_completed(file_id: str, exam_id: str, ocr_result: Dict[str, Any], user_id: str):
    """Publish OCR completed event"""
    return await publish_event(
        EventType.OCR_COMPLETED,
        {
            "file_id": file_id,
            "exam_id": exam_id,
            "ocr_result": ocr_result,
            "processed_at": datetime.now().isoformat()
        },
        "ocr_service",
        user_id=user_id
    )