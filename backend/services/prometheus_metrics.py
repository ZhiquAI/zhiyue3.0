"""
Prometheus指标收集器
为智阅3.0系统提供全面的业务和技术指标
"""

from prometheus_client import Counter, Histogram, Gauge, Summary, Info, Enum
import time
import asyncio
from typing import Dict, Any, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

# 业务指标
exam_creation_total = Counter(
    'zhiyue_exam_creation_total',
    'Total number of exam creation attempts',
    ['status', 'exam_type']
)

exam_creation_failed_total = Counter(
    'zhiyue_exam_creation_failed_total', 
    'Total number of failed exam creations',
    ['error_type']
)

ai_grading_accuracy_rate = Gauge(
    'zhiyue_ai_grading_accuracy_rate',
    'AI grading accuracy rate',
    ['subject', 'question_type']
)

ai_grading_total = Counter(
    'zhiyue_ai_grading_total',
    'Total number of AI grading operations',
    ['subject', 'grade_level', 'result']
)

user_complaints_total = Counter(
    'zhiyue_user_complaints_total',
    'Total number of user complaints',
    ['complaint_type', 'severity']
)

active_users_gauge = Gauge(
    'zhiyue_active_users',
    'Number of currently active users',
    ['user_type']
)

# 技术指标
http_requests_total = Counter(
    'zhiyue_http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

http_request_duration_seconds = Histogram(
    'zhiyue_http_request_duration_seconds',
    'HTTP request duration in seconds',
    ['method', 'endpoint'],
    buckets=(0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0)
)

database_query_duration_seconds = Histogram(
    'zhiyue_database_query_duration_seconds',
    'Database query duration in seconds',
    ['query_type', 'table'],
    buckets=(0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.0)
)

database_connections_active = Gauge(
    'zhiyue_database_connections_active',
    'Number of active database connections'
)

database_connections_total = Gauge(
    'zhiyue_database_connections_total',
    'Total number of database connections'
)

# WebSocket指标
websocket_connections_total = Gauge(
    'zhiyue_websocket_connections_total',
    'Total number of WebSocket connections',
    ['connection_type']
)

websocket_messages_total = Counter(
    'zhiyue_websocket_messages_total',
    'Total WebSocket messages',
    ['message_type', 'direction']
)

websocket_disconnections_total = Counter(
    'zhiyue_websocket_disconnections_total',
    'Total WebSocket disconnections',
    ['reason', 'connection_type']
)

websocket_connection_pool_utilization = Gauge(
    'zhiyue_websocket_connection_pool_utilization',
    'WebSocket connection pool utilization rate'
)

websocket_message_queue_size = Gauge(
    'zhiyue_websocket_message_queue_size',
    'Size of WebSocket message queue'
)

websocket_avg_response_time_seconds = Gauge(
    'zhiyue_websocket_avg_response_time_seconds',
    'Average WebSocket response time in seconds'
)

# 缓存指标
cache_hits_total = Counter(
    'zhiyue_cache_hits_total',
    'Total cache hits',
    ['cache_type']
)

cache_misses_total = Counter(
    'zhiyue_cache_misses_total',
    'Total cache misses',
    ['cache_type']
)

cache_size_bytes = Gauge(
    'zhiyue_cache_size_bytes',
    'Cache size in bytes',
    ['cache_type']
)

# AI相关指标
ai_model_inference_duration_seconds = Histogram(
    'zhiyue_ai_model_inference_duration_seconds',
    'AI model inference duration in seconds',
    ['model_name', 'model_version'],
    buckets=(0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0)
)

ai_model_accuracy = Gauge(
    'zhiyue_ai_model_accuracy',
    'AI model accuracy score',
    ['model_name', 'evaluation_dataset']
)

ocr_processing_duration_seconds = Histogram(
    'zhiyue_ocr_processing_duration_seconds',
    'OCR processing duration in seconds',
    ['image_type', 'resolution'],
    buckets=(0.5, 1.0, 2.0, 5.0, 10.0, 20.0, 60.0)
)

ocr_accuracy_rate = Gauge(
    'zhiyue_ocr_accuracy_rate',
    'OCR accuracy rate',
    ['image_type']
)

# 系统资源指标（应用级别）
app_memory_usage_bytes = Gauge(
    'zhiyue_app_memory_usage_bytes',
    'Application memory usage in bytes'
)

app_cpu_usage_percent = Gauge(
    'zhiyue_app_cpu_usage_percent',
    'Application CPU usage percentage'
)

app_threads_active = Gauge(
    'zhiyue_app_threads_active',
    'Number of active application threads'
)

# 文件处理指标
file_upload_total = Counter(
    'zhiyue_file_upload_total',
    'Total file uploads',
    ['file_type', 'status']
)

file_processing_duration_seconds = Histogram(
    'zhiyue_file_processing_duration_seconds',
    'File processing duration in seconds',
    ['file_type', 'size_category'],
    buckets=(1.0, 5.0, 10.0, 30.0, 60.0, 300.0, 600.0)
)

file_storage_size_bytes = Gauge(
    'zhiyue_file_storage_size_bytes',
    'Total file storage size in bytes',
    ['storage_type']
)

class MetricsCollector:
    """指标收集器"""
    
    def __init__(self):
        self.start_time = time.time()
        self.collection_interval = 30  # 30秒收集一次
        self.collection_task: Optional[asyncio.Task] = None
    
    async def start_collection(self):
        """启动指标收集"""
        if self.collection_task and not self.collection_task.done():
            return
            
        self.collection_task = asyncio.create_task(self._collection_loop())
        logger.info("Prometheus metrics collection started")
    
    async def stop_collection(self):
        """停止指标收集"""
        if self.collection_task and not self.collection_task.done():
            self.collection_task.cancel()
            try:
                await self.collection_task
            except asyncio.CancelledError:
                pass
        logger.info("Prometheus metrics collection stopped")
    
    async def _collection_loop(self):
        """指标收集循环"""
        while True:
            try:
                await asyncio.sleep(self.collection_interval)
                await self._collect_system_metrics()
                await self._collect_websocket_metrics()
                await self._collect_database_metrics()
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in metrics collection: {e}")
    
    async def _collect_system_metrics(self):
        """收集系统指标"""
        try:
            import psutil
            
            # CPU使用率
            cpu_percent = psutil.cpu_percent(interval=1)
            app_cpu_usage_percent.set(cpu_percent)
            
            # 内存使用
            memory = psutil.virtual_memory()
            app_memory_usage_bytes.set(memory.used)
            
            # 线程数
            process = psutil.Process()
            app_threads_active.set(process.num_threads())
            
        except ImportError:
            logger.warning("psutil not available, skipping system metrics")
        except Exception as e:
            logger.error(f"Error collecting system metrics: {e}")
    
    async def _collect_websocket_metrics(self):
        """收集WebSocket指标"""
        try:
            from .websocket_performance import connection_pool, message_queue
            
            # 连接池指标
            pool_stats = connection_pool.get_performance_stats()
            websocket_connection_pool_utilization.set(pool_stats.get('pool_utilization', 0))
            
            # 消息队列指标
            if message_queue.queue:
                websocket_message_queue_size.set(message_queue.queue.qsize())
            
            # 平均响应时间
            websocket_avg_response_time_seconds.set(
                message_queue.metrics.avg_response_time
            )
            
        except Exception as e:
            logger.error(f"Error collecting WebSocket metrics: {e}")
    
    async def _collect_database_metrics(self):
        """收集数据库指标"""
        try:
            # 这里应该集成实际的数据库连接池
            # 暂时使用模拟数据
            database_connections_active.set(25)  # 模拟值
            database_connections_total.set(100)   # 模拟值
            
        except Exception as e:
            logger.error(f"Error collecting database metrics: {e}")
    
    def record_http_request(self, method: str, endpoint: str, status: int, duration: float):
        """记录HTTP请求指标"""
        http_requests_total.labels(method=method, endpoint=endpoint, status=status).inc()
        http_request_duration_seconds.labels(method=method, endpoint=endpoint).observe(duration)
    
    def record_exam_creation(self, status: str, exam_type: str):
        """记录考试创建指标"""
        exam_creation_total.labels(status=status, exam_type=exam_type).inc()
        if status == 'failed':
            exam_creation_failed_total.labels(error_type='unknown').inc()
    
    def record_ai_grading(self, subject: str, grade_level: str, result: str, accuracy: float):
        """记录AI评分指标"""
        ai_grading_total.labels(subject=subject, grade_level=grade_level, result=result).inc()
        ai_grading_accuracy_rate.labels(subject=subject, question_type='subjective').set(accuracy)
    
    def record_websocket_connection(self, connection_type: str, action: str):
        """记录WebSocket连接指标"""
        if action == 'connect':
            websocket_connections_total.labels(connection_type=connection_type).inc()
        elif action == 'disconnect':
            websocket_disconnections_total.labels(
                reason='normal', 
                connection_type=connection_type
            ).inc()
    
    def record_file_upload(self, file_type: str, status: str, processing_time: float):
        """记录文件上传指标"""
        file_upload_total.labels(file_type=file_type, status=status).inc()
        
        # 文件大小分类
        size_category = 'small' if processing_time < 5 else 'medium' if processing_time < 30 else 'large'
        file_processing_duration_seconds.labels(
            file_type=file_type, 
            size_category=size_category
        ).observe(processing_time)

# 全局指标收集器实例
metrics_collector = MetricsCollector()

# 便捷函数
def get_app_info() -> Dict[str, Any]:
    """获取应用信息"""
    uptime = time.time() - metrics_collector.start_time
    return {
        'app_name': '智阅3.0',
        'version': '3.0.0',
        'uptime_seconds': uptime,
        'start_time': datetime.fromtimestamp(metrics_collector.start_time).isoformat()
    }