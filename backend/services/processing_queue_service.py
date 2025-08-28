"""处理队列服务"""

import asyncio
from typing import Dict, Any, Optional
from utils.logger import get_logger

logger = get_logger(__name__)


class ProcessingQueueService:
    """处理队列服务类"""
    
    def __init__(self):
        self.queue = asyncio.Queue()
        self.processing_tasks = {}
        self.results = {}
    
    async def add_task(self, task_id: str, task_data: Dict[str, Any]) -> bool:
        """添加任务到队列"""
        try:
            await self.queue.put({"task_id": task_id, "data": task_data})
            logger.info(f"任务 {task_id} 已添加到队列")
            return True
        except Exception as e:
            logger.error(f"添加任务失败: {str(e)}")
            return False
    
    async def process_task(self, task_id: str, task_data: Dict[str, Any]):
        """处理单个任务"""
        try:
            logger.info(f"开始处理任务 {task_id}")
            # 这里可以添加具体的处理逻辑
            # 模拟处理时间
            await asyncio.sleep(1)
            
            # 存储结果
            self.results[task_id] = {
                "status": "completed",
                "result": f"任务 {task_id} 处理完成",
                "data": task_data
            }
            
            logger.info(f"任务 {task_id} 处理完成")
        except Exception as e:
            logger.error(f"处理任务 {task_id} 失败: {str(e)}")
            self.results[task_id] = {
                "status": "failed",
                "error": str(e)
            }
        finally:
            # 从处理中的任务列表移除
            if task_id in self.processing_tasks:
                del self.processing_tasks[task_id]
    
    async def start_worker(self):
        """启动工作进程"""
        while True:
            try:
                # 从队列获取任务
                task = await self.queue.get()
                task_id = task["task_id"]
                task_data = task["data"]
                
                # 创建处理任务
                processing_task = asyncio.create_task(
                    self.process_task(task_id, task_data)
                )
                self.processing_tasks[task_id] = processing_task
                
                # 标记任务完成
                self.queue.task_done()
                
            except Exception as e:
                logger.error(f"工作进程错误: {str(e)}")
                await asyncio.sleep(1)
    
    def get_task_status(self, task_id: str) -> Optional[Dict[str, Any]]:
        """获取任务状态"""
        if task_id in self.results:
            return self.results[task_id]
        elif task_id in self.processing_tasks:
            return {"status": "processing"}
        else:
            return None
    
    def get_all_tasks(self) -> Dict[str, Any]:
        """获取所有任务状态"""
        all_tasks = {}
        
        # 添加已完成的任务
        for task_id, result in self.results.items():
            all_tasks[task_id] = result
        
        # 添加正在处理的任务
        for task_id in self.processing_tasks:
            all_tasks[task_id] = {"status": "processing"}
        
        return all_tasks


# 全局实例
processing_queue_service = ProcessingQueueService()