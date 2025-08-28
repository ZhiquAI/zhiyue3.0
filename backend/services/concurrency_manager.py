"""
并发处理管理器
提升系统并发处理能力和性能
"""

import asyncio
import time
import logging
from typing import Any, Dict, List, Optional, Callable, Coroutine, AsyncIterator
from dataclasses import dataclass, field
from enum import Enum
import weakref
from contextlib import asynccontextmanager
import threading
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor
import multiprocessing as mp

logger = logging.getLogger(__name__)

class TaskPriority(Enum):
    """任务优先级"""
    LOW = 1
    NORMAL = 2
    HIGH = 3
    URGENT = 4

@dataclass
class TaskInfo:
    """任务信息"""
    task_id: str
    priority: TaskPriority = TaskPriority.NORMAL
    created_at: float = field(default_factory=time.time)
    started_at: Optional[float] = None
    completed_at: Optional[float] = None
    retries: int = 0
    max_retries: int = 3
    timeout: Optional[float] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

class ConcurrencyManager:
    """并发管理器"""
    
    def __init__(
        self,
        max_concurrent_tasks: int = 100,
        max_thread_workers: int = 20,
        max_process_workers: int = None,
        task_timeout: float = 300.0,
        enable_process_pool: bool = False
    ):
        self.max_concurrent_tasks = max_concurrent_tasks
        self.max_thread_workers = max_thread_workers
        self.max_process_workers = max_process_workers or mp.cpu_count()
        self.task_timeout = task_timeout
        self.enable_process_pool = enable_process_pool
        
        # 任务队列和管理
        self.task_queue = asyncio.PriorityQueue()
        self.running_tasks: Dict[str, TaskInfo] = {}
        self.completed_tasks: weakref.WeakValueDictionary = weakref.WeakValueDictionary()
        
        # 信号量控制并发数
        self.semaphore = asyncio.Semaphore(max_concurrent_tasks)
        
        # 线程池和进程池
        self.thread_pool = ThreadPoolExecutor(max_workers=max_thread_workers)
        self.process_pool = ProcessPoolExecutor(max_workers=self.max_process_workers) if enable_process_pool else None
        
        # 统计信息
        self.stats = {
            "total_tasks": 0,
            "completed_tasks": 0,
            "failed_tasks": 0,
            "avg_execution_time": 0.0,
            "peak_concurrent_tasks": 0
        }
        
        # 工作器任务
        self.worker_task: Optional[asyncio.Task] = None
        self.shutdown_event = asyncio.Event()
    
    async def start(self):
        """启动并发管理器"""
        if self.worker_task is None:
            self.worker_task = asyncio.create_task(self._worker_loop())
            logger.info(f"并发管理器已启动，最大并发数: {self.max_concurrent_tasks}")
    
    async def stop(self):
        """停止并发管理器"""
        self.shutdown_event.set()
        
        if self.worker_task:
            await self.worker_task
        
        # 关闭线程池和进程池
        self.thread_pool.shutdown(wait=True)
        if self.process_pool:
            self.process_pool.shutdown(wait=True)
        
        logger.info("并发管理器已停止")
    
    async def submit_task(
        self,
        coro: Coroutine,
        task_id: str = None,
        priority: TaskPriority = TaskPriority.NORMAL,
        timeout: float = None,
        max_retries: int = 3,
        metadata: Dict[str, Any] = None
    ) -> str:
        """提交异步任务"""
        if task_id is None:
            task_id = f"task_{int(time.time() * 1000000)}"
        
        task_info = TaskInfo(
            task_id=task_id,
            priority=priority,
            timeout=timeout or self.task_timeout,
            max_retries=max_retries,
            metadata=metadata or {}
        )
        
        # 优先级队列，数字越小优先级越高
        priority_value = 5 - priority.value
        await self.task_queue.put((priority_value, task_info, coro))
        
        self.stats["total_tasks"] += 1
        logger.debug(f"任务已提交: {task_id}, 优先级: {priority.name}")
        
        return task_id
    
    async def submit_cpu_task(
        self,
        func: Callable,
        *args,
        task_id: str = None,
        priority: TaskPriority = TaskPriority.NORMAL,
        use_process_pool: bool = False,
        **kwargs
    ) -> str:
        """提交CPU密集型任务"""
        if task_id is None:
            task_id = f"cpu_task_{int(time.time() * 1000000)}"
        
        # 包装为协程
        async def cpu_task_wrapper():
            loop = asyncio.get_event_loop()
            
            if use_process_pool and self.process_pool:
                # 使用进程池
                future = self.process_pool.submit(func, *args, **kwargs)
                return await loop.run_in_executor(None, future.result)
            else:
                # 使用线程池
                return await loop.run_in_executor(self.thread_pool, func, *args, **kwargs)
        
        return await self.submit_task(
            cpu_task_wrapper(),
            task_id=task_id,
            priority=priority,
            metadata={"type": "cpu_intensive", "use_process_pool": use_process_pool}
        )
    
    async def wait_for_task(self, task_id: str, timeout: float = None) -> Any:
        """等待任务完成"""
        start_time = time.time()
        
        while task_id not in self.completed_tasks:
            if timeout and (time.time() - start_time) > timeout:
                raise asyncio.TimeoutError(f"等待任务 {task_id} 超时")
            
            if task_id not in self.running_tasks:
                raise ValueError(f"任务 {task_id} 不存在")
            
            await asyncio.sleep(0.1)
        
        task_info = self.completed_tasks[task_id]
        if hasattr(task_info, 'result'):
            return task_info.result
        elif hasattr(task_info, 'exception'):
            raise task_info.exception
        else:
            raise RuntimeError(f"任务 {task_id} 状态异常")
    
    async def get_task_status(self, task_id: str) -> Dict[str, Any]:
        """获取任务状态"""
        if task_id in self.running_tasks:
            task_info = self.running_tasks[task_id]
            return {
                "status": "running",
                "task_id": task_id,
                "priority": task_info.priority.name,
                "created_at": task_info.created_at,
                "started_at": task_info.started_at,
                "retries": task_info.retries,
                "metadata": task_info.metadata
            }
        elif task_id in self.completed_tasks:
            task_info = self.completed_tasks[task_id]
            return {
                "status": "completed",
                "task_id": task_id,
                "created_at": task_info.created_at,
                "started_at": task_info.started_at,
                "completed_at": task_info.completed_at,
                "execution_time": task_info.completed_at - task_info.started_at if task_info.started_at else None
            }
        else:
            return {"status": "not_found", "task_id": task_id}
    
    async def cancel_task(self, task_id: str) -> bool:
        """取消任务"""
        if task_id in self.running_tasks:
            # 对于正在运行的任务，设置取消标志
            task_info = self.running_tasks[task_id]
            task_info.metadata["cancelled"] = True
            logger.info(f"任务 {task_id} 已标记为取消")
            return True
        return False
    
    def get_statistics(self) -> Dict[str, Any]:
        """获取统计信息"""
        current_concurrent = len(self.running_tasks)
        queue_size = self.task_queue.qsize()
        
        self.stats["current_concurrent_tasks"] = current_concurrent
        self.stats["queue_size"] = queue_size
        self.stats["peak_concurrent_tasks"] = max(
            self.stats.get("peak_concurrent_tasks", 0),
            current_concurrent
        )
        
        return self.stats.copy()
    
    async def _worker_loop(self):
        """工作器循环"""
        logger.info("并发管理器工作器已启动")
        
        while not self.shutdown_event.is_set():
            try:
                # 获取任务
                try:
                    priority, task_info, coro = await asyncio.wait_for(
                        self.task_queue.get(),
                        timeout=1.0
                    )
                except asyncio.TimeoutError:
                    continue
                
                # 检查是否已取消
                if task_info.metadata.get("cancelled"):
                    continue
                
                # 创建任务执行器
                task = asyncio.create_task(
                    self._execute_task(task_info, coro)
                )
                
                # 不等待任务完成，继续处理下一个任务
                
            except Exception as e:
                logger.error(f"工作器循环错误: {e}", exc_info=True)
                await asyncio.sleep(0.1)
        
        logger.info("并发管理器工作器已停止")
    
    async def _execute_task(self, task_info: TaskInfo, coro: Coroutine):
        """执行单个任务"""
        async with self.semaphore:
            task_info.started_at = time.time()
            self.running_tasks[task_info.task_id] = task_info
            
            try:
                # 执行任务
                if task_info.timeout:
                    result = await asyncio.wait_for(coro, timeout=task_info.timeout)
                else:
                    result = await coro
                
                # 任务成功完成
                task_info.completed_at = time.time()
                task_info.result = result
                
                self.completed_tasks[task_info.task_id] = task_info
                self.stats["completed_tasks"] += 1
                
                # 更新平均执行时间
                execution_time = task_info.completed_at - task_info.started_at
                self._update_avg_execution_time(execution_time)
                
                logger.debug(f"任务 {task_info.task_id} 执行成功，耗时: {execution_time:.2f}s")
                
            except asyncio.CancelledError:
                logger.info(f"任务 {task_info.task_id} 被取消")
                self.stats["failed_tasks"] += 1
                
            except Exception as e:
                logger.error(f"任务 {task_info.task_id} 执行失败: {e}")
                
                # 重试逻辑
                if task_info.retries < task_info.max_retries:
                    task_info.retries += 1
                    logger.info(f"任务 {task_info.task_id} 重试 {task_info.retries}/{task_info.max_retries}")
                    
                    # 重新提交任务
                    priority_value = 5 - task_info.priority.value
                    await self.task_queue.put((priority_value, task_info, coro))
                else:
                    # 达到最大重试次数
                    task_info.completed_at = time.time()
                    task_info.exception = e
                    
                    self.completed_tasks[task_info.task_id] = task_info
                    self.stats["failed_tasks"] += 1
            
            finally:
                # 从运行列表中移除
                self.running_tasks.pop(task_info.task_id, None)
    
    def _update_avg_execution_time(self, execution_time: float):
        """更新平均执行时间"""
        completed = self.stats["completed_tasks"]
        if completed == 1:
            self.stats["avg_execution_time"] = execution_time
        else:
            # 移动平均
            self.stats["avg_execution_time"] = (
                (self.stats["avg_execution_time"] * (completed - 1) + execution_time) / completed
            )

class BatchProcessor:
    """批量处理器"""
    
    def __init__(
        self,
        concurrency_manager: ConcurrencyManager,
        batch_size: int = 10,
        max_batch_wait_time: float = 5.0
    ):
        self.concurrency_manager = concurrency_manager
        self.batch_size = batch_size
        self.max_batch_wait_time = max_batch_wait_time
    
    async def process_batch(
        self,
        items: List[Any],
        processor_func: Callable[[Any], Coroutine],
        priority: TaskPriority = TaskPriority.NORMAL
    ) -> List[Any]:
        """批量处理项目"""
        results = []
        task_ids = []
        
        # 提交所有任务
        for item in items:
            task_id = await self.concurrency_manager.submit_task(
                processor_func(item),
                priority=priority,
                metadata={"batch_processing": True}
            )
            task_ids.append(task_id)
        
        # 等待所有任务完成
        for task_id in task_ids:
            try:
                result = await self.concurrency_manager.wait_for_task(task_id)
                results.append(result)
            except Exception as e:
                logger.error(f"批量处理任务 {task_id} 失败: {e}")
                results.append(None)  # 或者其他错误标记
        
        return results
    
    async def process_stream(
        self,
        item_stream: AsyncIterator[Any],
        processor_func: Callable[[Any], Coroutine],
        priority: TaskPriority = TaskPriority.NORMAL
    ) -> AsyncIterator[Any]:
        """流式批量处理"""
        batch = []
        last_batch_time = time.time()
        
        async for item in item_stream:
            batch.append(item)
            
            # 检查是否需要处理批次
            should_process = (
                len(batch) >= self.batch_size or
                (time.time() - last_batch_time) >= self.max_batch_wait_time
            )
            
            if should_process and batch:
                # 处理当前批次
                results = await self.process_batch(batch, processor_func, priority)
                
                # 产出结果
                for result in results:
                    yield result
                
                # 重置批次
                batch = []
                last_batch_time = time.time()
        
        # 处理剩余的项目
        if batch:
            results = await self.process_batch(batch, processor_func, priority)
            for result in results:
                yield result

@asynccontextmanager
async def concurrent_context(max_concurrent: int = 50):
    """并发上下文管理器"""
    manager = ConcurrencyManager(max_concurrent_tasks=max_concurrent)
    try:
        await manager.start()
        yield manager
    finally:
        await manager.stop()

# 全局并发管理器实例
global_concurrency_manager = ConcurrencyManager(
    max_concurrent_tasks=100,
    max_thread_workers=20,
    enable_process_pool=True
)