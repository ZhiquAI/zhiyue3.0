"""
Asynchronous Task Queue - Redis-based Task Processing
智阅3.0重构第二阶段：异步任务队列系统

Features:
- Priority-based task queues (high, normal, low)
- Task retry mechanism with exponential backoff
- Task status tracking and monitoring
- Worker pool management
- Task result storage and retrieval
- Dead letter queue for failed tasks
"""

import asyncio
import json
import logging
import time
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Callable, Union
from dataclasses import dataclass, asdict
from enum import Enum
from uuid import uuid4

import aioredis
from pydantic import BaseModel, Field


class TaskPriority(str, Enum):
    HIGH = "high"
    NORMAL = "normal"
    LOW = "low"


class TaskStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    RETRYING = "retrying"
    CANCELLED = "cancelled"


@dataclass
class TaskResult:
    """Task execution result"""
    task_id: str
    status: TaskStatus
    result: Optional[Any] = None
    error: Optional[str] = None
    started_at: Optional[float] = None
    completed_at: Optional[float] = None
    execution_time: Optional[float] = None
    retry_count: int = 0


class Task(BaseModel):
    """Task definition"""
    id: str = Field(default_factory=lambda: str(uuid4()))
    type: str
    data: Dict[str, Any]
    priority: TaskPriority = TaskPriority.NORMAL
    max_retries: int = 3
    timeout: int = 300  # seconds
    delay: float = 0  # seconds to delay execution
    created_at: float = Field(default_factory=time.time)
    scheduled_at: Optional[float] = None
    correlation_id: Optional[str] = None
    user_id: Optional[str] = None
    
    class Config:
        use_enum_values = True


class TaskWorker:
    """Individual task worker"""
    
    def __init__(self, 
                 worker_id: str,
                 task_handlers: Dict[str, Callable],
                 queue_manager: 'AsyncTaskQueue'):
        self.worker_id = worker_id
        self.task_handlers = task_handlers
        self.queue_manager = queue_manager
        self.running = False
        self.current_task: Optional[Task] = None
        self.logger = logging.getLogger(f"{__name__}.{worker_id}")
    
    async def start(self):
        """Start the worker"""
        self.running = True
        self.logger.info(f"Worker {self.worker_id} started")
        
        while self.running:
            try:
                # Get next task from queue manager
                task = await self.queue_manager.get_next_task(self.worker_id)
                
                if task:
                    await self.process_task(task)
                else:
                    # No tasks available, wait a bit
                    await asyncio.sleep(1)
                    
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.logger.error(f"Worker {self.worker_id} error: {str(e)}")
                await asyncio.sleep(5)
        
        self.logger.info(f"Worker {self.worker_id} stopped")
    
    async def process_task(self, task: Task):
        """Process a single task"""
        self.current_task = task
        start_time = time.time()
        
        try:
            # Update task status to processing
            await self.queue_manager.update_task_status(
                task.id, TaskStatus.PROCESSING, worker_id=self.worker_id
            )
            
            self.logger.info(f"Processing task {task.id} of type {task.type}")
            
            # Get handler for task type
            handler = self.task_handlers.get(task.type)
            if not handler:
                raise ValueError(f"No handler found for task type: {task.type}")
            
            # Execute task with timeout
            result = await asyncio.wait_for(
                handler(task.data),
                timeout=task.timeout
            )
            
            # Calculate execution time
            execution_time = time.time() - start_time
            
            # Mark task as completed
            task_result = TaskResult(
                task_id=task.id,
                status=TaskStatus.COMPLETED,
                result=result,
                started_at=start_time,
                completed_at=time.time(),
                execution_time=execution_time
            )
            
            await self.queue_manager.complete_task(task.id, task_result)
            self.logger.info(f"Task {task.id} completed in {execution_time:.2f}s")
            
        except asyncio.TimeoutError:
            error_msg = f"Task {task.id} timed out after {task.timeout}s"
            self.logger.error(error_msg)
            await self._handle_task_failure(task, error_msg, start_time)
            
        except Exception as e:
            error_msg = f"Task {task.id} failed: {str(e)}"
            self.logger.error(error_msg)
            await self._handle_task_failure(task, error_msg, start_time)
        
        finally:
            self.current_task = None
    
    async def _handle_task_failure(self, task: Task, error_msg: str, start_time: float):
        """Handle task failure with retry logic"""
        execution_time = time.time() - start_time
        
        task_result = TaskResult(
            task_id=task.id,
            status=TaskStatus.FAILED,
            error=error_msg,
            started_at=start_time,
            completed_at=time.time(),
            execution_time=execution_time
        )
        
        await self.queue_manager.fail_task(task.id, task_result)
    
    async def stop(self):
        """Stop the worker"""
        self.running = False
        
        # If currently processing a task, mark it as cancelled
        if self.current_task:
            await self.queue_manager.update_task_status(
                self.current_task.id, TaskStatus.CANCELLED
            )


class AsyncTaskQueue:
    """Redis-based asynchronous task queue"""
    
    def __init__(self,
                 redis_url: str = "redis://localhost:6379",
                 queue_prefix: str = "zhiyue:tasks",
                 result_ttl: int = 3600,  # 1 hour
                 max_workers: int = 10):
        
        self.redis_url = redis_url
        self.queue_prefix = queue_prefix
        self.result_ttl = result_ttl
        self.max_workers = max_workers
        
        self.redis_client: Optional[aioredis.Redis] = None
        self.workers: List[TaskWorker] = []
        self.worker_tasks: List[asyncio.Task] = []
        self.task_handlers: Dict[str, Callable] = {}
        self.running = False
        
        self.logger = logging.getLogger(__name__)
        
        # Queue names by priority
        self.priority_queues = {
            TaskPriority.HIGH: f"{queue_prefix}:high",
            TaskPriority.NORMAL: f"{queue_prefix}:normal", 
            TaskPriority.LOW: f"{queue_prefix}:low"
        }
        
        # Processing and result storage
        self.processing_set = f"{queue_prefix}:processing"
        self.results_hash = f"{queue_prefix}:results"
        self.failed_queue = f"{queue_prefix}:failed"
        self.scheduled_set = f"{queue_prefix}:scheduled"
    
    async def initialize(self):
        """Initialize Redis connection"""
        try:
            self.redis_client = aioredis.from_url(self.redis_url, decode_responses=True)
            await self.redis_client.ping()
            self.logger.info("Task queue Redis connection established")
        except Exception as e:
            self.logger.error(f"Failed to initialize task queue: {str(e)}")
            raise
    
    def register_handler(self, task_type: str, handler: Callable):
        """Register a task handler for a specific task type"""
        self.task_handlers[task_type] = handler
        self.logger.info(f"Registered handler for task type: {task_type}")
    
    async def submit_task(self, task: Task) -> str:
        """Submit a task to the queue"""
        if not self.redis_client:
            raise RuntimeError("Task queue not initialized")
        
        # If task has a delay, add to scheduled set
        if task.delay > 0:
            scheduled_time = time.time() + task.delay
            task.scheduled_at = scheduled_time
            
            await self.redis_client.zadd(
                self.scheduled_set,
                {json.dumps(task.dict()): scheduled_time}
            )
            
            self.logger.info(f"Task {task.id} scheduled for {datetime.fromtimestamp(scheduled_time)}")
        else:
            # Add directly to priority queue
            queue_name = self.priority_queues[task.priority]
            await self.redis_client.lpush(queue_name, json.dumps(task.dict()))
            
            self.logger.info(f"Task {task.id} submitted to {task.priority} priority queue")
        
        # Store task metadata
        await self.redis_client.hset(
            self.results_hash,
            task.id,
            json.dumps({
                "status": TaskStatus.PENDING.value,
                "created_at": task.created_at,
                "priority": task.priority.value,
                "type": task.type
            })
        )
        
        return task.id
    
    async def get_next_task(self, worker_id: str) -> Optional[Task]:
        """Get the next task for processing"""
        if not self.redis_client:
            return None
        
        # First, check for scheduled tasks that are ready
        await self._process_scheduled_tasks()
        
        # Try to get task from priority queues (high to low)
        for priority in [TaskPriority.HIGH, TaskPriority.NORMAL, TaskPriority.LOW]:
            queue_name = self.priority_queues[priority]
            
            # Blocking pop with timeout
            result = await self.redis_client.brpop(queue_name, timeout=1)
            
            if result:
                _, task_data = result
                task = Task(**json.loads(task_data))
                
                # Add to processing set
                await self.redis_client.sadd(
                    self.processing_set,
                    json.dumps({
                        "task_id": task.id,
                        "worker_id": worker_id,
                        "started_at": time.time()
                    })
                )
                
                return task
        
        return None
    
    async def _process_scheduled_tasks(self):
        """Move ready scheduled tasks to processing queues"""
        current_time = time.time()
        
        # Get all tasks scheduled for now or earlier
        ready_tasks = await self.redis_client.zrangebyscore(
            self.scheduled_set, 0, current_time, withscores=True
        )
        
        for task_data, score in ready_tasks:
            # Parse task
            task = Task(**json.loads(task_data))
            
            # Move to appropriate priority queue
            queue_name = self.priority_queues[task.priority]
            await self.redis_client.lpush(queue_name, task_data)
            
            # Remove from scheduled set
            await self.redis_client.zrem(self.scheduled_set, task_data)
            
            self.logger.info(f"Moved scheduled task {task.id} to {task.priority} queue")
    
    async def update_task_status(self, task_id: str, status: TaskStatus, worker_id: str = None):
        """Update task status"""
        if not self.redis_client:
            return
        
        # Get existing result data
        existing_data = await self.redis_client.hget(self.results_hash, task_id)
        if existing_data:
            result_data = json.loads(existing_data)
        else:
            result_data = {}
        
        # Update status
        result_data.update({
            "status": status.value,
            "updated_at": time.time()
        })
        
        if worker_id:
            result_data["worker_id"] = worker_id
        
        # Store updated data
        await self.redis_client.hset(
            self.results_hash,
            task_id,
            json.dumps(result_data)
        )
    
    async def complete_task(self, task_id: str, result: TaskResult):
        """Mark task as completed"""
        if not self.redis_client:
            return
        
        # Remove from processing set
        processing_entries = await self.redis_client.smembers(self.processing_set)
        for entry in processing_entries:
            entry_data = json.loads(entry)
            if entry_data["task_id"] == task_id:
                await self.redis_client.srem(self.processing_set, entry)
                break
        
        # Store result
        await self.redis_client.hset(
            self.results_hash,
            task_id,
            json.dumps(asdict(result))
        )
        
        # Set TTL for result
        await self.redis_client.expire(f"{self.results_hash}:{task_id}", self.result_ttl)
    
    async def fail_task(self, task_id: str, result: TaskResult):
        """Handle task failure with retry logic"""
        if not self.redis_client:
            return
        
        # Get task info to check retry logic
        task_data = await self.redis_client.hget(self.results_hash, task_id)
        if not task_data:
            return
        
        task_info = json.loads(task_data)
        retry_count = task_info.get("retry_count", 0)
        max_retries = task_info.get("max_retries", 3)
        
        if retry_count < max_retries:
            # Retry with exponential backoff
            delay = min(300, 2 ** retry_count)  # Max 5 minutes
            
            # Create retry task
            retry_task = Task(
                id=task_id,
                type=task_info.get("type", "unknown"),
                data=task_info.get("data", {}),
                priority=TaskPriority(task_info.get("priority", "normal")),
                delay=delay,
                max_retries=max_retries
            )
            
            # Update retry count
            task_info["retry_count"] = retry_count + 1
            task_info["status"] = TaskStatus.RETRYING.value
            
            await self.redis_client.hset(
                self.results_hash,
                task_id,
                json.dumps(task_info)
            )
            
            # Resubmit task
            await self.submit_task(retry_task)
            
            self.logger.info(f"Retrying task {task_id}, attempt {retry_count + 1}")
        else:
            # Max retries reached, move to failed queue
            await self.redis_client.lpush(self.failed_queue, json.dumps(asdict(result)))
            
            # Update final status
            result.status = TaskStatus.FAILED
            await self.complete_task(task_id, result)
            
            self.logger.error(f"Task {task_id} failed permanently after {max_retries} retries")
        
        # Remove from processing set
        processing_entries = await self.redis_client.smembers(self.processing_set)
        for entry in processing_entries:
            entry_data = json.loads(entry)
            if entry_data["task_id"] == task_id:
                await self.redis_client.srem(self.processing_set, entry)
                break
    
    async def get_task_result(self, task_id: str) -> Optional[TaskResult]:
        """Get task result by ID"""
        if not self.redis_client:
            return None
        
        result_data = await self.redis_client.hget(self.results_hash, task_id)
        if result_data:
            data = json.loads(result_data)
            return TaskResult(**data)
        
        return None
    
    async def cancel_task(self, task_id: str) -> bool:
        """Cancel a pending or scheduled task"""
        if not self.redis_client:
            return False
        
        # Check if task is scheduled
        scheduled_tasks = await self.redis_client.zrange(self.scheduled_set, 0, -1)
        for task_data in scheduled_tasks:
            task = Task(**json.loads(task_data))
            if task.id == task_id:
                await self.redis_client.zrem(self.scheduled_set, task_data)
                await self.update_task_status(task_id, TaskStatus.CANCELLED)
                return True
        
        # Check if task is in any priority queue
        for queue_name in self.priority_queues.values():
            tasks = await self.redis_client.lrange(queue_name, 0, -1)
            for i, task_data in enumerate(tasks):
                task = Task(**json.loads(task_data))
                if task.id == task_id:
                    await self.redis_client.lrem(queue_name, 1, task_data)
                    await self.update_task_status(task_id, TaskStatus.CANCELLED)
                    return True
        
        return False
    
    async def get_queue_stats(self) -> Dict[str, Any]:
        """Get queue statistics"""
        if not self.redis_client:
            return {}
        
        stats = {}
        
        # Queue lengths
        for priority, queue_name in self.priority_queues.items():
            length = await self.redis_client.llen(queue_name)
            stats[f"queue_{priority.value}"] = length
        
        # Processing count
        stats["processing"] = await self.redis_client.scard(self.processing_set)
        
        # Scheduled count
        stats["scheduled"] = await self.redis_client.zcard(self.scheduled_set)
        
        # Failed count
        stats["failed"] = await self.redis_client.llen(self.failed_queue)
        
        # Worker count
        stats["active_workers"] = len([w for w in self.workers if w.running])
        
        return stats
    
    async def start_workers(self, num_workers: int = None):
        """Start worker pool"""
        if not num_workers:
            num_workers = self.max_workers
        
        self.running = True
        
        # Create and start workers
        for i in range(num_workers):
            worker_id = f"worker-{i+1}"
            worker = TaskWorker(worker_id, self.task_handlers, self)
            self.workers.append(worker)
            
            # Start worker task
            task = asyncio.create_task(worker.start())
            self.worker_tasks.append(task)
        
        self.logger.info(f"Started {num_workers} workers")
    
    async def stop_workers(self):
        """Stop all workers"""
        self.running = False
        
        # Stop all workers
        for worker in self.workers:
            await worker.stop()
        
        # Cancel worker tasks
        for task in self.worker_tasks:
            task.cancel()
        
        # Wait for tasks to complete
        if self.worker_tasks:
            await asyncio.gather(*self.worker_tasks, return_exceptions=True)
        
        self.workers.clear()
        self.worker_tasks.clear()
        
        self.logger.info("All workers stopped")
    
    async def close(self):
        """Close the task queue"""
        await self.stop_workers()
        
        if self.redis_client:
            await self.redis_client.close()
            self.redis_client = None
        
        self.logger.info("Task queue closed")


# Global task queue instance
task_queue = AsyncTaskQueue()


# Task type constants
class TaskType:
    OCR_PROCESSING = "ocr_processing"
    IMAGE_QUALITY_CHECK = "image_quality_check" 
    GRADING_EXECUTION = "grading_execution"
    BATCH_PROCESSING = "batch_processing"
    REPORT_GENERATION = "report_generation"
    EMAIL_NOTIFICATION = "email_notification"
    CACHE_WARMING = "cache_warming"
    DATABASE_CLEANUP = "database_cleanup"


# Convenience functions
async def submit_ocr_task(file_id: str, exam_id: str, priority: TaskPriority = TaskPriority.NORMAL) -> str:
    """Submit OCR processing task"""
    task = Task(
        type=TaskType.OCR_PROCESSING,
        data={
            "file_id": file_id,
            "exam_id": exam_id
        },
        priority=priority,
        timeout=600  # 10 minutes for OCR
    )
    
    return await task_queue.submit_task(task)


async def submit_grading_task(exam_id: str, student_id: str, ocr_result: Dict[str, Any], priority: TaskPriority = TaskPriority.HIGH) -> str:
    """Submit grading task"""
    task = Task(
        type=TaskType.GRADING_EXECUTION,
        data={
            "exam_id": exam_id,
            "student_id": student_id,
            "ocr_result": ocr_result
        },
        priority=priority,
        timeout=300  # 5 minutes for grading
    )
    
    return await task_queue.submit_task(task)


async def submit_batch_processing_task(batch_data: Dict[str, Any], priority: TaskPriority = TaskPriority.NORMAL) -> str:
    """Submit batch processing task"""
    task = Task(
        type=TaskType.BATCH_PROCESSING,
        data=batch_data,
        priority=priority,
        timeout=1800  # 30 minutes for batch processing
    )
    
    return await task_queue.submit_task(task)