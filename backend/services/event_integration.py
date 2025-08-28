"""
Event-Driven Architecture Integration Module
智阅3.0重构第二阶段：事件驱动架构集成模块

This module integrates all event-driven components:
- Event Bus (Redis Streams)
- Async Task Queue 
- WebSocket Manager
- Event Handlers
- Task Handlers

Usage:
    from services.event_integration import event_system
    
    # Initialize the entire event system
    await event_system.initialize()
    
    # Start processing
    await event_system.start()
    
    # Publish events
    await event_system.publish_exam_created(exam_id, exam_data, user_id)
    
    # Submit tasks  
    task_id = await event_system.submit_ocr_task(file_id, exam_id)
    
    # Stop gracefully
    await event_system.shutdown()
"""

import asyncio
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime

from .event_bus import event_bus, EventType, publish_event, register_all_handlers
from .event_handlers import (
    exam_handler, grading_handler, processing_handler, 
    notification_handler, analytics_handler,
    publish_exam_created, publish_grading_completed, publish_ocr_completed
)
from .async_task_queue import (
    task_queue, TaskType, TaskPriority,
    submit_ocr_task, submit_grading_task, submit_batch_processing_task
)
from .websocket_manager import websocket_manager
from ..config.settings import get_settings

logger = logging.getLogger(__name__)


class EventDrivenSystem:
    """
    Unified Event-Driven System Manager
    
    Orchestrates all event-driven components:
    - Event bus for pub/sub messaging
    - Task queue for async processing
    - WebSocket manager for real-time communication
    - Event and task handlers
    """
    
    def __init__(self):
        self.settings = get_settings()
        self.initialized = False
        self.running = False
        
        # Component references
        self.event_bus = event_bus
        self.task_queue = task_queue  
        self.websocket_manager = websocket_manager
        
        # Performance metrics
        self.metrics = {
            "events_published": 0,
            "events_processed": 0,
            "tasks_submitted": 0,
            "tasks_completed": 0,
            "websocket_connections": 0,
            "errors": 0,
            "start_time": None
        }
        
        # Task handlers registry
        self.task_handlers = {}
        self._register_task_handlers()
    
    def _register_task_handlers(self):
        """Register all task handlers with the task queue"""
        
        async def ocr_task_handler(data: Dict[str, Any]) -> Dict[str, Any]:
            """Handle OCR processing tasks"""
            try:
                file_id = data["file_id"]
                exam_id = data["exam_id"]
                
                logger.info(f"Processing OCR task for file {file_id}, exam {exam_id}")
                
                # Publish OCR started event
                await publish_event(
                    EventType.OCR_STARTED,
                    {
                        "file_id": file_id,
                        "exam_id": exam_id,
                        "started_at": datetime.now().isoformat()
                    },
                    "ocr_task_handler"
                )
                
                # TODO: Integrate with actual OCR service (Gemini)
                # For now, simulate OCR processing
                await asyncio.sleep(2)  # Simulate processing time
                
                ocr_result = {
                    "text_content": "Sample OCR result",
                    "confidence_score": 0.95,
                    "detected_regions": []
                }
                
                # Publish OCR completed event
                await publish_event(
                    EventType.OCR_COMPLETED,
                    {
                        "file_id": file_id,
                        "exam_id": exam_id,
                        "ocr_result": ocr_result,
                        "completed_at": datetime.now().isoformat()
                    },
                    "ocr_task_handler"
                )
                
                self.metrics["tasks_completed"] += 1
                return {"status": "completed", "result": ocr_result}
                
            except Exception as e:
                logger.error(f"OCR task failed for file {data.get('file_id')}: {str(e)}")
                
                # Publish OCR failed event
                await publish_event(
                    EventType.OCR_FAILED,
                    {
                        "file_id": data.get("file_id"),
                        "exam_id": data.get("exam_id"),
                        "error": str(e),
                        "failed_at": datetime.now().isoformat()
                    },
                    "ocr_task_handler"
                )
                
                self.metrics["errors"] += 1
                raise
        
        async def grading_task_handler(data: Dict[str, Any]) -> Dict[str, Any]:
            """Handle grading execution tasks"""
            try:
                exam_id = data["exam_id"]
                student_id = data["student_id"]
                ocr_result = data.get("ocr_result", {})
                
                logger.info(f"Processing grading task for exam {exam_id}, student {student_id}")
                
                # Publish grading started event
                await publish_event(
                    EventType.GRADING_STARTED,
                    {
                        "exam_id": exam_id,
                        "student_id": student_id,
                        "started_at": datetime.now().isoformat()
                    },
                    "grading_task_handler"
                )
                
                # TODO: Integrate with actual AI grading service
                # For now, simulate grading
                await asyncio.sleep(3)  # Simulate grading time
                
                score = 85.5  # Sample score
                max_score = 100
                
                # Publish grading completed event
                await publish_event(
                    EventType.GRADING_COMPLETED,
                    {
                        "exam_id": exam_id,
                        "student_id": student_id,
                        "score": score,
                        "max_score": max_score,
                        "completed_at": datetime.now().isoformat()
                    },
                    "grading_task_handler"
                )
                
                self.metrics["tasks_completed"] += 1
                return {
                    "status": "completed", 
                    "score": score,
                    "max_score": max_score
                }
                
            except Exception as e:
                logger.error(f"Grading task failed for exam {data.get('exam_id')}, student {data.get('student_id')}: {str(e)}")
                
                # Publish grading failed event
                await publish_event(
                    EventType.GRADING_FAILED,
                    {
                        "exam_id": data.get("exam_id"),
                        "student_id": data.get("student_id"),
                        "error": str(e),
                        "failed_at": datetime.now().isoformat()
                    },
                    "grading_task_handler"
                )
                
                self.metrics["errors"] += 1
                raise
        
        async def batch_processing_task_handler(data: Dict[str, Any]) -> Dict[str, Any]:
            """Handle batch processing tasks"""
            try:
                batch_id = data.get("batch_id", f"batch_{int(datetime.now().timestamp())}")
                processing_type = data.get("processing_type", "unknown")
                items = data.get("items", [])
                
                logger.info(f"Processing batch task {batch_id} with {len(items)} items")
                
                # Publish batch started event
                await publish_event(
                    EventType.BATCH_PROCESSING_STARTED,
                    {
                        "batch_id": batch_id,
                        "processing_type": processing_type,
                        "total_items": len(items),
                        "started_at": datetime.now().isoformat()
                    },
                    "batch_task_handler"
                )
                
                # Process items (simulate batch processing)
                successful_items = 0
                failed_items = 0
                
                for i, item in enumerate(items):
                    try:
                        await asyncio.sleep(0.1)  # Simulate processing time per item
                        successful_items += 1
                    except:
                        failed_items += 1
                
                # Publish batch completed event
                await publish_event(
                    EventType.BATCH_PROCESSING_COMPLETED,
                    {
                        "batch_id": batch_id,
                        "processing_type": processing_type,
                        "total_items": len(items),
                        "successful_items": successful_items,
                        "failed_items": failed_items,
                        "completed_at": datetime.now().isoformat()
                    },
                    "batch_task_handler"
                )
                
                self.metrics["tasks_completed"] += 1
                return {
                    "status": "completed",
                    "total_items": len(items),
                    "successful_items": successful_items,
                    "failed_items": failed_items
                }
                
            except Exception as e:
                logger.error(f"Batch processing task failed: {str(e)}")
                self.metrics["errors"] += 1
                raise
        
        # Register handlers with task queue
        self.task_handlers = {
            TaskType.OCR_PROCESSING: ocr_task_handler,
            TaskType.GRADING_EXECUTION: grading_task_handler,
            TaskType.BATCH_PROCESSING: batch_processing_task_handler,
        }
        
        for task_type, handler in self.task_handlers.items():
            self.task_queue.register_handler(task_type, handler)
    
    async def initialize(self):
        """Initialize all event-driven components"""
        if self.initialized:
            logger.warning("Event system already initialized")
            return
        
        try:
            logger.info("Initializing event-driven system...")
            
            # Initialize event bus
            await self.event_bus.initialize()
            
            # Initialize task queue
            await self.task_queue.initialize()
            
            # Register event handlers with event bus
            await register_all_handlers(self.event_bus)
            
            # Register WebSocket event handler
            self.event_bus.register_handler(self.websocket_manager.event_handler)
            
            self.initialized = True
            logger.info("Event-driven system initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize event system: {str(e)}")
            raise
    
    async def start(self, num_workers: int = 5):
        """Start the event-driven system"""
        if not self.initialized:
            raise RuntimeError("Event system not initialized. Call initialize() first.")
        
        if self.running:
            logger.warning("Event system already running")
            return
        
        try:
            logger.info("Starting event-driven system...")
            
            # Start event bus consumers
            asyncio.create_task(self.event_bus.start_consuming())
            
            # Start task queue workers
            await self.task_queue.start_workers(num_workers)
            
            self.running = True
            self.metrics["start_time"] = datetime.now()
            
            logger.info(f"Event-driven system started with {num_workers} workers")
            
        except Exception as e:
            logger.error(f"Failed to start event system: {str(e)}")
            raise
    
    async def stop(self):
        """Stop the event-driven system"""
        if not self.running:
            return
        
        try:
            logger.info("Stopping event-driven system...")
            
            # Stop event bus
            await self.event_bus.stop_consuming()
            
            # Stop task queue
            await self.task_queue.stop_workers()
            
            # Shutdown WebSocket manager
            await self.websocket_manager.shutdown()
            
            self.running = False
            logger.info("Event-driven system stopped")
            
        except Exception as e:
            logger.error(f"Error stopping event system: {str(e)}")
    
    async def shutdown(self):
        """Graceful shutdown of the entire system"""
        await self.stop()
        
        try:
            # Close event bus
            await self.event_bus.close()
            
            # Close task queue
            await self.task_queue.close()
            
            logger.info("Event-driven system shutdown complete")
            
        except Exception as e:
            logger.error(f"Error during system shutdown: {str(e)}")
    
    # Convenience methods for event publishing
    
    async def publish_exam_created(self, exam_id: str, exam_data: Dict[str, Any], user_id: str) -> str:
        """Publish exam created event"""
        self.metrics["events_published"] += 1
        return await publish_exam_created(exam_id, exam_data, user_id)
    
    async def publish_grading_completed(self, exam_id: str, student_id: str, score: float, user_id: str) -> str:
        """Publish grading completed event"""
        self.metrics["events_published"] += 1
        return await publish_grading_completed(exam_id, student_id, score, user_id)
    
    async def publish_ocr_completed(self, file_id: str, exam_id: str, ocr_result: Dict[str, Any], user_id: str) -> str:
        """Publish OCR completed event"""
        self.metrics["events_published"] += 1
        return await publish_ocr_completed(file_id, exam_id, ocr_result, user_id)
    
    # Convenience methods for task submission
    
    async def submit_ocr_task(self, file_id: str, exam_id: str, priority: TaskPriority = TaskPriority.NORMAL) -> str:
        """Submit OCR processing task"""
        self.metrics["tasks_submitted"] += 1
        return await submit_ocr_task(file_id, exam_id, priority)
    
    async def submit_grading_task(self, exam_id: str, student_id: str, ocr_result: Dict[str, Any], 
                                 priority: TaskPriority = TaskPriority.HIGH) -> str:
        """Submit grading task"""
        self.metrics["tasks_submitted"] += 1
        return await submit_grading_task(exam_id, student_id, ocr_result, priority)
    
    async def submit_batch_processing_task(self, batch_data: Dict[str, Any], 
                                         priority: TaskPriority = TaskPriority.NORMAL) -> str:
        """Submit batch processing task"""
        self.metrics["tasks_submitted"] += 1
        return await submit_batch_processing_task(batch_data, priority)
    
    # System status and monitoring
    
    def get_system_status(self) -> Dict[str, Any]:
        """Get comprehensive system status"""
        return {
            "initialized": self.initialized,
            "running": self.running,
            "metrics": self.metrics.copy(),
            "event_bus_status": {
                "connected": self.event_bus.redis_client is not None,
                "handlers_registered": len(self.event_bus.handlers)
            },
            "task_queue_status": self.task_queue.get_queue_stats(),
            "websocket_status": self.websocket_manager.get_connection_stats(),
            "uptime": (datetime.now() - self.metrics["start_time"]).total_seconds() 
                     if self.metrics["start_time"] else 0
        }
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform health check on all components"""
        health = {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "components": {}
        }
        
        try:
            # Check event bus
            if self.event_bus.redis_client:
                await self.event_bus.redis_client.ping()
                health["components"]["event_bus"] = {"status": "healthy"}
            else:
                health["components"]["event_bus"] = {"status": "disconnected"}
                health["status"] = "degraded"
            
            # Check task queue
            task_stats = await self.task_queue.get_queue_stats()
            if task_stats:
                health["components"]["task_queue"] = {"status": "healthy", "stats": task_stats}
            else:
                health["components"]["task_queue"] = {"status": "error"}
                health["status"] = "degraded"
            
            # Check WebSocket manager
            ws_stats = self.websocket_manager.get_connection_stats()
            health["components"]["websocket_manager"] = {
                "status": "healthy", 
                "connections": ws_stats["total_connections"]
            }
            
        except Exception as e:
            health["status"] = "unhealthy"
            health["error"] = str(e)
        
        return health
    
    # Integration workflows
    
    async def process_exam_workflow(self, exam_id: str, files: List[Dict[str, Any]], user_id: str):
        """Complete exam processing workflow: OCR -> Grading -> Analytics"""
        try:
            logger.info(f"Starting exam workflow for exam {exam_id} with {len(files)} files")
            
            # Step 1: Submit OCR tasks for all files
            ocr_tasks = []
            for file_info in files:
                task_id = await self.submit_ocr_task(
                    file_info["file_id"], 
                    exam_id, 
                    TaskPriority.HIGH
                )
                ocr_tasks.append(task_id)
            
            logger.info(f"Submitted {len(ocr_tasks)} OCR tasks for exam {exam_id}")
            
            # The workflow continues automatically through event handlers:
            # OCR completion -> triggers grading -> grading completion -> triggers analytics
            
            return {
                "workflow_started": True,
                "exam_id": exam_id,
                "ocr_tasks": ocr_tasks,
                "expected_gradings": len(files)
            }
            
        except Exception as e:
            logger.error(f"Error in exam workflow for {exam_id}: {str(e)}")
            raise
    
    async def process_batch_import(self, batch_data: Dict[str, Any], user_id: str):
        """Process batch import workflow"""
        try:
            # Submit batch processing task
            task_id = await self.submit_batch_processing_task(batch_data, TaskPriority.NORMAL)
            
            logger.info(f"Started batch import workflow, task ID: {task_id}")
            return {"batch_task_id": task_id}
            
        except Exception as e:
            logger.error(f"Error in batch import workflow: {str(e)}")
            raise


# Global event system instance
event_system = EventDrivenSystem()


# Convenience functions for external use
async def initialize_event_system():
    """Initialize the global event system"""
    await event_system.initialize()


async def start_event_system(num_workers: int = 5):
    """Start the global event system"""
    await event_system.start(num_workers)


async def shutdown_event_system():
    """Shutdown the global event system"""
    await event_system.shutdown()


# Context manager for event system lifecycle
class EventSystemContext:
    """Async context manager for event system lifecycle"""
    
    def __init__(self, num_workers: int = 5):
        self.num_workers = num_workers
    
    async def __aenter__(self):
        await event_system.initialize()
        await event_system.start(self.num_workers)
        return event_system
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await event_system.shutdown()


# Usage example:
# async with EventSystemContext() as system:
#     await system.process_exam_workflow(exam_id, files, user_id)