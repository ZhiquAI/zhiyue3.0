"""
Async Processing Pipeline for OCR and Grading
智阅3.0异步处理管道实现
"""

import asyncio
import json
import logging
import time
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, List, Optional, Any, Callable, Set, Union, AsyncGenerator
from collections import defaultdict, deque
import aiofiles
import aiohttp
from pathlib import Path
import hashlib
import pickle
import concurrent.futures
import multiprocessing as mp
from contextlib import asynccontextmanager

logger = logging.getLogger(__name__)

class TaskStatus(str, Enum):
    """任务状态"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    RETRYING = "retrying"
    PAUSED = "paused"

class TaskPriority(str, Enum):
    """任务优先级"""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    CRITICAL = "critical"

class PipelineStage(str, Enum):
    """管道阶段"""
    INPUT_VALIDATION = "input_validation"
    PREPROCESSING = "preprocessing"
    OCR_PROCESSING = "ocr_processing"
    POSTPROCESSING = "postprocessing"
    GRADING_ANALYSIS = "grading_analysis"
    RESULT_GENERATION = "result_generation"
    OUTPUT_DELIVERY = "output_delivery"

@dataclass
class TaskDefinition:
    """任务定义"""
    task_id: str
    task_type: str
    priority: TaskPriority = TaskPriority.NORMAL
    max_retries: int = 3
    timeout: int = 300  # 5分钟
    depends_on: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    # 输入输出定义
    input_schema: Dict[str, Any] = field(default_factory=dict)
    output_schema: Dict[str, Any] = field(default_factory=dict)
    
    # 资源需求
    cpu_requirement: float = 1.0  # CPU核心数
    memory_requirement: int = 512  # MB
    gpu_requirement: bool = False
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

@dataclass
class TaskInstance:
    """任务实例"""
    instance_id: str
    task_def: TaskDefinition
    input_data: Dict[str, Any] = field(default_factory=dict)
    output_data: Dict[str, Any] = field(default_factory=dict)
    status: TaskStatus = TaskStatus.PENDING
    created_at: datetime = field(default_factory=datetime.now)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    # 执行信息
    worker_id: Optional[str] = None
    retry_count: int = 0
    error_message: Optional[str] = None
    execution_log: List[str] = field(default_factory=list)
    
    # 性能指标
    processing_time: float = 0.0
    resource_usage: Dict[str, Any] = field(default_factory=dict)
    
    @property
    def duration(self) -> Optional[float]:
        """任务执行时长"""
        if self.started_at and self.completed_at:
            return (self.completed_at - self.started_at).total_seconds()
        return None
    
    def add_log(self, message: str):
        """添加执行日志"""
        timestamp = datetime.now().isoformat()
        self.execution_log.append(f"[{timestamp}] {message}")
        logger.info(f"Task {self.instance_id}: {message}")
        
    def to_dict(self) -> Dict[str, Any]:
        result = asdict(self)
        result['task_def'] = self.task_def.to_dict()
        return result

class TaskProcessor(ABC):
    """任务处理器接口"""
    
    @abstractmethod
    async def process(self, task: TaskInstance) -> Dict[str, Any]:
        """处理任务"""
        pass
        
    @abstractmethod
    def get_processor_type(self) -> str:
        """获取处理器类型"""
        pass
        
    @abstractmethod
    def validate_input(self, input_data: Dict[str, Any]) -> bool:
        """验证输入数据"""
        pass

class OCRProcessor(TaskProcessor):
    """OCR处理器"""
    
    def __init__(self):
        self.supported_formats = ['.jpg', '.jpeg', '.png', '.pdf', '.tiff']
        
    async def process(self, task: TaskInstance) -> Dict[str, Any]:
        """执行OCR处理"""
        task.add_log("Starting OCR processing")
        
        input_data = task.input_data
        file_path = input_data.get('file_path')
        
        if not file_path or not Path(file_path).exists():
            raise ValueError("Invalid file path")
            
        # 模拟OCR处理
        await asyncio.sleep(2)  # 模拟处理时间
        
        # 模拟OCR结果
        ocr_result = {
            'text_content': f"Extracted text from {Path(file_path).name}",
            'confidence': 0.95,
            'regions': [
                {'text': 'Sample text', 'bbox': [100, 100, 200, 150], 'confidence': 0.98},
                {'text': 'Another text', 'bbox': [100, 200, 300, 250], 'confidence': 0.92}
            ],
            'language': 'zh-CN',
            'processing_time': 2.0
        }
        
        task.add_log(f"OCR completed with confidence {ocr_result['confidence']}")
        
        return {
            'ocr_result': ocr_result,
            'file_info': {
                'filename': Path(file_path).name,
                'size': Path(file_path).stat().st_size if Path(file_path).exists() else 0
            }
        }
        
    def get_processor_type(self) -> str:
        return "ocr_processor"
        
    def validate_input(self, input_data: Dict[str, Any]) -> bool:
        """验证OCR输入"""
        file_path = input_data.get('file_path')
        if not file_path:
            return False
            
        path = Path(file_path)
        return path.exists() and path.suffix.lower() in self.supported_formats

class GradingProcessor(TaskProcessor):
    """阅卷处理器"""
    
    def __init__(self):
        self.grading_models = {
            'math': 'math_grading_model_v1',
            'chinese': 'chinese_grading_model_v1',
            'english': 'english_grading_model_v1'
        }
        
    async def process(self, task: TaskInstance) -> Dict[str, Any]:
        """执行阅卷处理"""
        task.add_log("Starting grading analysis")
        
        input_data = task.input_data
        ocr_result = input_data.get('ocr_result', {})
        answer_key = input_data.get('answer_key', {})
        subject = input_data.get('subject', 'math')
        
        if not ocr_result or not answer_key:
            raise ValueError("Missing OCR result or answer key")
            
        # 模拟智能阅卷处理
        await asyncio.sleep(3)  # 模拟分析时间
        
        # 模拟阅卷结果
        grading_result = {
            'total_score': 85.5,
            'max_score': 100.0,
            'question_scores': [
                {'question_id': '1', 'score': 8.5, 'max_score': 10, 'feedback': '计算正确，步骤清晰'},
                {'question_id': '2', 'score': 7.0, 'max_score': 8, 'feedback': '方法正确，但计算有小错'},
                {'question_id': '3', 'score': 15.0, 'max_score': 15, 'feedback': '完全正确'}
            ],
            'grading_model': self.grading_models.get(subject, 'default_model'),
            'confidence': 0.89,
            'processing_time': 3.0,
            'analysis': {
                'strengths': ['计算能力强', '步骤清晰'],
                'weaknesses': ['细节注意不够', '检验环节缺失'],
                'suggestions': ['加强计算检验', '注意单位换算']
            }
        }
        
        task.add_log(f"Grading completed: {grading_result['total_score']}/{grading_result['max_score']}")
        
        return {
            'grading_result': grading_result,
            'metadata': {
                'subject': subject,
                'model_version': self.grading_models.get(subject)
            }
        }
        
    def get_processor_type(self) -> str:
        return "grading_processor"
        
    def validate_input(self, input_data: Dict[str, Any]) -> bool:
        """验证阅卷输入"""
        return bool(input_data.get('ocr_result')) and bool(input_data.get('answer_key'))

class PreprocessingProcessor(TaskProcessor):
    """预处理器"""
    
    async def process(self, task: TaskInstance) -> Dict[str, Any]:
        """执行预处理"""
        task.add_log("Starting image preprocessing")
        
        input_data = task.input_data
        file_path = input_data.get('file_path')
        
        # 模拟图像预处理
        await asyncio.sleep(1)
        
        preprocessing_result = {
            'processed_file_path': file_path,  # 实际会是处理后的文件路径
            'operations_applied': ['noise_reduction', 'rotation_correction', 'contrast_enhancement'],
            'quality_score': 0.92,
            'processing_time': 1.0
        }
        
        task.add_log("Preprocessing completed")
        
        return {'preprocessing_result': preprocessing_result}
        
    def get_processor_type(self) -> str:
        return "preprocessing_processor"
        
    def validate_input(self, input_data: Dict[str, Any]) -> bool:
        file_path = input_data.get('file_path')
        return bool(file_path) and Path(file_path).exists()

class WorkerPool:
    """工作池"""
    
    def __init__(self, max_workers: int = 4, worker_type: str = "general"):
        self.max_workers = max_workers
        self.worker_type = worker_type
        self.active_workers: Dict[str, TaskInstance] = {}
        self.worker_stats: Dict[str, Dict[str, Any]] = defaultdict(lambda: {
            'tasks_completed': 0,
            'tasks_failed': 0,
            'total_processing_time': 0.0,
            'last_active': None
        })
        
    def is_available(self) -> bool:
        """检查是否有可用工作进程"""
        return len(self.active_workers) < self.max_workers
        
    def assign_task(self, task: TaskInstance) -> str:
        """分配任务"""
        if not self.is_available():
            raise RuntimeError("No available workers")
            
        worker_id = f"{self.worker_type}_worker_{len(self.active_workers)}"
        self.active_workers[worker_id] = task
        task.worker_id = worker_id
        
        return worker_id
        
    def complete_task(self, worker_id: str, success: bool, processing_time: float):
        """完成任务"""
        if worker_id in self.active_workers:
            del self.active_workers[worker_id]
            
        stats = self.worker_stats[worker_id]
        if success:
            stats['tasks_completed'] += 1
        else:
            stats['tasks_failed'] += 1
        stats['total_processing_time'] += processing_time
        stats['last_active'] = datetime.now()
        
    def get_stats(self) -> Dict[str, Any]:
        """获取工作池统计"""
        return {
            'worker_type': self.worker_type,
            'max_workers': self.max_workers,
            'active_workers': len(self.active_workers),
            'available_workers': self.max_workers - len(self.active_workers),
            'worker_stats': dict(self.worker_stats)
        }

class PipelineOrchestrator:
    """管道编排器"""
    
    def __init__(self):
        self.processors: Dict[str, TaskProcessor] = {}
        self.worker_pools: Dict[str, WorkerPool] = {}
        self.task_queue: Dict[TaskPriority, deque] = {
            priority: deque() for priority in TaskPriority
        }
        self.running_tasks: Dict[str, TaskInstance] = {}
        self.completed_tasks: Dict[str, TaskInstance] = {}
        self.pipeline_definitions: Dict[str, List[PipelineStage]] = {}
        
        self.running = False
        self.scheduler_task: Optional[asyncio.Task] = None
        
        # 统计信息
        self.stats = {
            'total_tasks': 0,
            'completed_tasks': 0,
            'failed_tasks': 0,
            'average_processing_time': 0.0
        }
        
    def register_processor(self, processor: TaskProcessor):
        """注册处理器"""
        processor_type = processor.get_processor_type()
        self.processors[processor_type] = processor
        
        # 为每种处理器类型创建工作池
        if processor_type not in self.worker_pools:
            self.worker_pools[processor_type] = WorkerPool(max_workers=4, worker_type=processor_type)
            
        logger.info(f"Registered processor: {processor_type}")
        
    def define_pipeline(self, pipeline_name: str, stages: List[PipelineStage]):
        """定义处理管道"""
        self.pipeline_definitions[pipeline_name] = stages
        logger.info(f"Defined pipeline: {pipeline_name} with {len(stages)} stages")
        
    async def start(self):
        """启动管道编排器"""
        if self.running:
            return
            
        self.running = True
        self.scheduler_task = asyncio.create_task(self._scheduler_loop())
        
        logger.info("Pipeline orchestrator started")
        
    async def stop(self):
        """停止管道编排器"""
        if not self.running:
            return
            
        self.running = False
        
        if self.scheduler_task:
            self.scheduler_task.cancel()
            try:
                await self.scheduler_task
            except asyncio.CancelledError:
                pass
                
        # 等待正在运行的任务完成
        if self.running_tasks:
            logger.info(f"Waiting for {len(self.running_tasks)} running tasks to complete...")
            await asyncio.gather(*[
                self._wait_for_task(task) for task in self.running_tasks.values()
            ], return_exceptions=True)
            
        logger.info("Pipeline orchestrator stopped")
        
    async def submit_task(self, task_def: TaskDefinition, input_data: Dict[str, Any]) -> str:
        """提交任务"""
        instance_id = str(uuid.uuid4())
        
        task_instance = TaskInstance(
            instance_id=instance_id,
            task_def=task_def,
            input_data=input_data
        )
        
        # 验证输入
        processor = self.processors.get(task_def.task_type)
        if not processor:
            raise ValueError(f"No processor found for task type: {task_def.task_type}")
            
        if not processor.validate_input(input_data):
            raise ValueError("Input validation failed")
            
        # 加入队列
        self.task_queue[task_def.priority].append(task_instance)
        self.stats['total_tasks'] += 1
        
        logger.info(f"Submitted task: {instance_id} ({task_def.task_type})")
        
        return instance_id
        
    async def submit_pipeline(self, pipeline_name: str, input_data: Dict[str, Any]) -> List[str]:
        """提交管道任务"""
        if pipeline_name not in self.pipeline_definitions:
            raise ValueError(f"Pipeline not defined: {pipeline_name}")
            
        stages = self.pipeline_definitions[pipeline_name]
        task_ids = []
        previous_task_id = None
        
        for stage in stages:
            # 根据阶段创建任务定义
            task_def = TaskDefinition(
                task_id=str(uuid.uuid4()),
                task_type=self._stage_to_processor_type(stage),
                priority=TaskPriority.NORMAL,
                depends_on=[previous_task_id] if previous_task_id else []
            )
            
            task_id = await self.submit_task(task_def, input_data)
            task_ids.append(task_id)
            previous_task_id = task_id
            
        logger.info(f"Submitted pipeline: {pipeline_name} with {len(task_ids)} tasks")
        
        return task_ids
        
    def _stage_to_processor_type(self, stage: PipelineStage) -> str:
        """将管道阶段映射到处理器类型"""
        mapping = {
            PipelineStage.PREPROCESSING: "preprocessing_processor",
            PipelineStage.OCR_PROCESSING: "ocr_processor",
            PipelineStage.GRADING_ANALYSIS: "grading_processor"
        }
        return mapping.get(stage, "general_processor")
        
    async def get_task_status(self, task_id: str) -> Optional[TaskInstance]:
        """获取任务状态"""
        # 检查正在运行的任务
        if task_id in self.running_tasks:
            return self.running_tasks[task_id]
            
        # 检查已完成的任务
        if task_id in self.completed_tasks:
            return self.completed_tasks[task_id]
            
        # 检查队列中的任务
        for priority_queue in self.task_queue.values():
            for task in priority_queue:
                if task.instance_id == task_id:
                    return task
                    
        return None
        
    async def cancel_task(self, task_id: str) -> bool:
        """取消任务"""
        # 从队列中移除
        for priority_queue in self.task_queue.values():
            for i, task in enumerate(priority_queue):
                if task.instance_id == task_id:
                    task.status = TaskStatus.CANCELLED
                    del priority_queue[i]
                    logger.info(f"Cancelled queued task: {task_id}")
                    return True
                    
        # 取消正在运行的任务
        if task_id in self.running_tasks:
            task = self.running_tasks[task_id]
            task.status = TaskStatus.CANCELLED
            # 这里应该实现任务中断逻辑
            logger.info(f"Cancelled running task: {task_id}")
            return True
            
        return False
        
    async def _scheduler_loop(self):
        """调度器循环"""
        while self.running:
            try:
                await self._schedule_tasks()
                await asyncio.sleep(0.1)  # 调度间隔
            except Exception as e:
                logger.error(f"Scheduler error: {str(e)}")
                await asyncio.sleep(1)
                
    async def _schedule_tasks(self):
        """调度任务"""
        # 按优先级处理任务
        for priority in [TaskPriority.CRITICAL, TaskPriority.HIGH, TaskPriority.NORMAL, TaskPriority.LOW]:
            queue = self.task_queue[priority]
            
            while queue:
                task = queue[0]  # 查看队列头部
                
                # 检查依赖
                if not self._check_dependencies(task):
                    break  # 依赖未满足，跳出当前优先级
                    
                # 检查资源
                processor_type = task.task_def.task_type
                worker_pool = self.worker_pools.get(processor_type)
                
                if not worker_pool or not worker_pool.is_available():
                    break  # 资源不足
                    
                # 开始执行任务
                queue.popleft()
                await self._execute_task(task)
                
    def _check_dependencies(self, task: TaskInstance) -> bool:
        """检查任务依赖"""
        for dep_task_id in task.task_def.depends_on:
            dep_task = self.completed_tasks.get(dep_task_id)
            if not dep_task or dep_task.status != TaskStatus.COMPLETED:
                return False
        return True
        
    async def _execute_task(self, task: TaskInstance):
        """执行任务"""
        processor_type = task.task_def.task_type
        processor = self.processors[processor_type]
        worker_pool = self.worker_pools[processor_type]
        
        # 分配工作进程
        worker_id = worker_pool.assign_task(task)
        
        task.status = TaskStatus.RUNNING
        task.started_at = datetime.now()
        self.running_tasks[task.instance_id] = task
        
        # 创建执行任务
        execution_task = asyncio.create_task(
            self._run_task(task, processor, worker_pool)
        )
        
        task.add_log(f"Task assigned to worker {worker_id}")
        
    async def _run_task(self, task: TaskInstance, processor: TaskProcessor, worker_pool: WorkerPool):
        """运行任务"""
        start_time = time.time()
        success = False
        
        try:
            # 设置超时
            result = await asyncio.wait_for(
                processor.process(task),
                timeout=task.task_def.timeout
            )
            
            task.output_data = result
            task.status = TaskStatus.COMPLETED
            task.completed_at = datetime.now()
            success = True
            
            task.add_log("Task completed successfully")
            
        except asyncio.TimeoutError:
            task.status = TaskStatus.FAILED
            task.error_message = "Task timeout"
            task.add_log("Task failed: timeout")
            
        except Exception as e:
            task.status = TaskStatus.FAILED
            task.error_message = str(e)
            task.add_log(f"Task failed: {str(e)}")
            
            # 重试逻辑
            if task.retry_count < task.task_def.max_retries:
                task.retry_count += 1
                task.status = TaskStatus.RETRYING
                task.add_log(f"Retrying task (attempt {task.retry_count})")
                
                # 重新入队
                await asyncio.sleep(2 ** task.retry_count)  # 指数退避
                self.task_queue[task.task_def.priority].appendleft(task)
                
        finally:
            processing_time = time.time() - start_time
            task.processing_time = processing_time
            
            # 更新工作池统计
            worker_pool.complete_task(task.worker_id, success, processing_time)
            
            # 从运行任务中移除
            if task.instance_id in self.running_tasks:
                del self.running_tasks[task.instance_id]
                
            # 添加到已完成任务
            if task.status in [TaskStatus.COMPLETED, TaskStatus.FAILED]:
                self.completed_tasks[task.instance_id] = task
                
                if success:
                    self.stats['completed_tasks'] += 1
                else:
                    self.stats['failed_tasks'] += 1
                    
                # 更新平均处理时间
                if self.stats['completed_tasks'] > 0:
                    total_time = self.stats['average_processing_time'] * (self.stats['completed_tasks'] - 1) + processing_time
                    self.stats['average_processing_time'] = total_time / self.stats['completed_tasks']
                    
    async def _wait_for_task(self, task: TaskInstance):
        """等待任务完成"""
        while task.status in [TaskStatus.PENDING, TaskStatus.RUNNING, TaskStatus.RETRYING]:
            await asyncio.sleep(0.1)
            
    def get_pipeline_stats(self) -> Dict[str, Any]:
        """获取管道统计信息"""
        return {
            'timestamp': datetime.now().isoformat(),
            'orchestrator_stats': self.stats.copy(),
            'queue_lengths': {
                priority.value: len(queue) for priority, queue in self.task_queue.items()
            },
            'running_tasks': len(self.running_tasks),
            'completed_tasks': len(self.completed_tasks),
            'worker_pools': {
                name: pool.get_stats() for name, pool in self.worker_pools.items()
            }
        }

# 使用示例
async def demo_async_pipeline():
    """异步管道演示"""
    print("🚀 Async Pipeline Demo Starting...")
    
    orchestrator = PipelineOrchestrator()
    
    # 注册处理器
    orchestrator.register_processor(PreprocessingProcessor())
    orchestrator.register_processor(OCRProcessor())
    orchestrator.register_processor(GradingProcessor())
    
    # 定义完整处理管道
    orchestrator.define_pipeline("complete_grading_pipeline", [
        PipelineStage.PREPROCESSING,
        PipelineStage.OCR_PROCESSING,
        PipelineStage.GRADING_ANALYSIS
    ])
    
    await orchestrator.start()
    
    try:
        # 创建测试文件
        test_file = Path("./test_exam.jpg")
        test_file.touch()  # 创建空文件用于测试
        
        # 提交单个OCR任务
        ocr_task_def = TaskDefinition(
            task_id="ocr_001",
            task_type="ocr_processor",
            priority=TaskPriority.HIGH
        )
        
        ocr_task_id = await orchestrator.submit_task(ocr_task_def, {
            'file_path': str(test_file)
        })
        
        print(f"📝 Submitted OCR task: {ocr_task_id}")
        
        # 提交完整管道
        pipeline_input = {
            'file_path': str(test_file),
            'subject': 'math',
            'answer_key': {'q1': 'A', 'q2': 'B', 'q3': 'C'}
        }
        
        pipeline_task_ids = await orchestrator.submit_pipeline("complete_grading_pipeline", pipeline_input)
        print(f"📋 Submitted pipeline tasks: {pipeline_task_ids}")
        
        # 等待任务完成
        await asyncio.sleep(10)
        
        # 获取任务状态
        for task_id in [ocr_task_id] + pipeline_task_ids:
            task_status = await orchestrator.get_task_status(task_id)
            if task_status:
                print(f"📊 Task {task_id}: {task_status.status.value}")
                if task_status.status == TaskStatus.COMPLETED:
                    print(f"    Duration: {task_status.duration:.2f}s")
                    
        # 获取管道统计
        stats = orchestrator.get_pipeline_stats()
        print(f"📈 Pipeline Stats:\n{json.dumps(stats, indent=2, default=str)}")
        
        # 清理测试文件
        if test_file.exists():
            test_file.unlink()
            
    finally:
        await orchestrator.stop()
        
    print("✅ Async Pipeline Demo Completed!")

if __name__ == "__main__":
    asyncio.run(demo_async_pipeline())