"""
数据库监控和度量系统
提供实时数据库性能监控、告警和度量收集
"""

import logging
import time
import threading
import json
from typing import Dict, Any, List, Optional, Callable
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum
from contextlib import contextmanager
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from queue import Queue, Empty
import psutil
import os

logger = logging.getLogger(__name__)


class MetricType(Enum):
    """度量类型"""
    COUNTER = "counter"
    GAUGE = "gauge"
    HISTOGRAM = "histogram"
    SUMMARY = "summary"


class AlertLevel(Enum):
    """告警级别"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


@dataclass
class Metric:
    """度量数据"""
    name: str
    value: float
    metric_type: MetricType
    timestamp: datetime
    labels: Dict[str, str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'name': self.name,
            'value': self.value,
            'type': self.metric_type.value,
            'timestamp': self.timestamp.isoformat(),
            'labels': self.labels or {}
        }


@dataclass
class Alert:
    """告警信息"""
    id: str
    level: AlertLevel
    message: str
    metric_name: str
    value: float
    threshold: float
    timestamp: datetime
    resolved: bool = False
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class MetricCollector:
    """度量收集器"""
    
    def __init__(self, database_url: str):
        self.database_url = database_url
        self.engine = create_engine(database_url, echo=False)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        
        # 度量存储
        self._metrics: List[Metric] = []
        self._metrics_lock = threading.RLock()
        
        # 收集间隔（秒）
        self.collection_interval = 30
        
        # 收集线程
        self._collection_thread = None
        self._stop_collection = threading.Event()
        
        logger.info("Metric collector initialized")
    
    def start_collection(self):
        """开始度量收集"""
        if self._collection_thread and self._collection_thread.is_alive():
            logger.warning("Metric collection is already running")
            return
        
        self._stop_collection.clear()
        self._collection_thread = threading.Thread(target=self._collection_loop, daemon=True)
        self._collection_thread.start()
        logger.info("Metric collection started")
    
    def stop_collection(self):
        """停止度量收集"""
        self._stop_collection.set()
        if self._collection_thread:
            self._collection_thread.join(timeout=5)
        logger.info("Metric collection stopped")
    
    def _collection_loop(self):
        """度量收集循环"""
        while not self._stop_collection.wait(self.collection_interval):
            try:
                self._collect_metrics()
            except Exception as e:
                logger.error(f"Metric collection error: {e}")
    
    def _collect_metrics(self):
        """收集度量数据"""
        timestamp = datetime.utcnow()
        
        try:
            # 数据库连接度量
            db_metrics = self._collect_database_metrics(timestamp)
            
            # 系统资源度量
            system_metrics = self._collect_system_metrics(timestamp)
            
            # 查询性能度量
            query_metrics = self._collect_query_metrics(timestamp)
            
            with self._metrics_lock:
                self._metrics.extend(db_metrics + system_metrics + query_metrics)
                
                # 保持最近1小时的度量数据
                cutoff_time = timestamp - timedelta(hours=1)
                self._metrics = [m for m in self._metrics if m.timestamp > cutoff_time]
            
        except Exception as e:
            logger.error(f"Failed to collect metrics: {e}")
    
    def _collect_database_metrics(self, timestamp: datetime) -> List[Metric]:
        """收集数据库度量"""
        metrics = []
        
        try:
            with self.SessionLocal() as session:
                # 连接数统计
                if 'sqlite' in self.database_url.lower():
                    # SQLite没有连接池概念，使用固定值
                    metrics.append(Metric(
                        name="db_connections_active",
                        value=1,
                        metric_type=MetricType.GAUGE,
                        timestamp=timestamp,
                        labels={"database": "sqlite"}
                    ))
                else:
                    # PostgreSQL/MySQL连接统计
                    try:
                        if 'postgresql' in self.database_url.lower():
                            result = session.execute(text("""
                                SELECT count(*) FROM pg_stat_activity 
                                WHERE state = 'active'
                            """))
                        elif 'mysql' in self.database_url.lower():
                            result = session.execute(text("SHOW STATUS LIKE 'Threads_connected'"))
                        
                        active_connections = result.scalar() or 0
                        metrics.append(Metric(
                            name="db_connections_active",
                            value=active_connections,
                            metric_type=MetricType.GAUGE,
                            timestamp=timestamp
                        ))
                    except:
                        pass
                
                # 数据库大小
                db_size = self._get_database_size(session)
                if db_size is not None:
                    metrics.append(Metric(
                        name="db_size_bytes",
                        value=db_size,
                        metric_type=MetricType.GAUGE,
                        timestamp=timestamp
                    ))
                
                # 表行数统计
                table_counts = self._get_table_counts(session)
                for table_name, count in table_counts.items():
                    metrics.append(Metric(
                        name="db_table_rows",
                        value=count,
                        metric_type=MetricType.GAUGE,
                        timestamp=timestamp,
                        labels={"table": table_name}
                    ))
        
        except Exception as e:
            logger.error(f"Failed to collect database metrics: {e}")
        
        return metrics
    
    def _collect_system_metrics(self, timestamp: datetime) -> List[Metric]:
        """收集系统资源度量"""
        metrics = []
        
        try:
            # CPU使用率
            cpu_percent = psutil.cpu_percent(interval=1)
            metrics.append(Metric(
                name="system_cpu_percent",
                value=cpu_percent,
                metric_type=MetricType.GAUGE,
                timestamp=timestamp
            ))
            
            # 内存使用情况
            memory = psutil.virtual_memory()
            metrics.append(Metric(
                name="system_memory_percent",
                value=memory.percent,
                metric_type=MetricType.GAUGE,
                timestamp=timestamp
            ))
            
            metrics.append(Metric(
                name="system_memory_available",
                value=memory.available,
                metric_type=MetricType.GAUGE,
                timestamp=timestamp
            ))
            
            # 磁盘使用情况
            disk = psutil.disk_usage('/')
            metrics.append(Metric(
                name="system_disk_percent",
                value=disk.percent,
                metric_type=MetricType.GAUGE,
                timestamp=timestamp
            ))
            
            # 数据库进程信息
            current_process = psutil.Process()
            metrics.append(Metric(
                name="process_memory_rss",
                value=current_process.memory_info().rss,
                metric_type=MetricType.GAUGE,
                timestamp=timestamp
            ))
            
            metrics.append(Metric(
                name="process_cpu_percent",
                value=current_process.cpu_percent(),
                metric_type=MetricType.GAUGE,
                timestamp=timestamp
            ))
        
        except Exception as e:
            logger.error(f"Failed to collect system metrics: {e}")
        
        return metrics
    
    def _collect_query_metrics(self, timestamp: datetime) -> List[Metric]:
        """收集查询性能度量"""
        metrics = []
        
        try:
            with self.SessionLocal() as session:
                # 测试查询响应时间
                start_time = time.time()
                session.execute(text("SELECT 1"))
                response_time = time.time() - start_time
                
                metrics.append(Metric(
                    name="db_query_response_time",
                    value=response_time,
                    metric_type=MetricType.GAUGE,
                    timestamp=timestamp
                ))
        
        except Exception as e:
            logger.error(f"Failed to collect query metrics: {e}")
        
        return metrics
    
    def _get_database_size(self, session) -> Optional[float]:
        """获取数据库大小"""
        try:
            if 'sqlite' in self.database_url.lower():
                # SQLite文件大小
                db_path = self.database_url.replace('sqlite:///', '')
                if os.path.exists(db_path):
                    return os.path.getsize(db_path)
            
            elif 'postgresql' in self.database_url.lower():
                result = session.execute(text("SELECT pg_database_size(current_database())"))
                return result.scalar()
            
            elif 'mysql' in self.database_url.lower():
                result = session.execute(text("""
                    SELECT SUM(data_length + index_length) as size
                    FROM information_schema.TABLES
                    WHERE table_schema = DATABASE()
                """))
                return result.scalar()
        
        except Exception as e:
            logger.error(f"Failed to get database size: {e}")
        
        return None
    
    def _get_table_counts(self, session) -> Dict[str, int]:
        """获取表行数"""
        counts = {}
        tables = ['exams', 'answer_sheets', 'students', 'users', 'grading_tasks']
        
        for table in tables:
            try:
                result = session.execute(text(f"SELECT COUNT(*) FROM {table}"))
                counts[table] = result.scalar() or 0
            except Exception as e:
                logger.warning(f"Failed to count rows in {table}: {e}")
                counts[table] = 0
        
        return counts
    
    def get_metrics(self, metric_name: str = None, 
                   start_time: datetime = None, 
                   end_time: datetime = None) -> List[Metric]:
        """获取度量数据"""
        with self._metrics_lock:
            filtered_metrics = self._metrics
            
            if metric_name:
                filtered_metrics = [m for m in filtered_metrics if m.name == metric_name]
            
            if start_time:
                filtered_metrics = [m for m in filtered_metrics if m.timestamp >= start_time]
            
            if end_time:
                filtered_metrics = [m for m in filtered_metrics if m.timestamp <= end_time]
            
            return filtered_metrics.copy()
    
    def get_latest_metrics(self) -> Dict[str, Metric]:
        """获取最新的度量数据"""
        with self._metrics_lock:
            latest_metrics = {}
            for metric in self._metrics:
                if (metric.name not in latest_metrics or 
                    metric.timestamp > latest_metrics[metric.name].timestamp):
                    latest_metrics[metric.name] = metric
            
            return latest_metrics


class AlertManager:
    """告警管理器"""
    
    def __init__(self, metric_collector: MetricCollector):
        self.metric_collector = metric_collector
        self.alerts: List[Alert] = []
        self._alerts_lock = threading.RLock()
        self._alert_handlers: List[Callable[[Alert], None]] = []
        
        # 告警规则
        self.alert_rules = {
            'db_query_response_time': {'threshold': 1.0, 'level': AlertLevel.WARNING},
            'system_cpu_percent': {'threshold': 80.0, 'level': AlertLevel.WARNING},
            'system_memory_percent': {'threshold': 85.0, 'level': AlertLevel.WARNING},
            'system_disk_percent': {'threshold': 90.0, 'level': AlertLevel.ERROR},
            'db_connections_active': {'threshold': 50.0, 'level': AlertLevel.WARNING},
        }
        
        # 检查线程
        self._check_thread = None
        self._stop_checking = threading.Event()
        
        logger.info("Alert manager initialized")
    
    def add_alert_handler(self, handler: Callable[[Alert], None]):
        """添加告警处理器"""
        self._alert_handlers.append(handler)
    
    def start_monitoring(self):
        """开始监控"""
        if self._check_thread and self._check_thread.is_alive():
            logger.warning("Alert monitoring is already running")
            return
        
        self._stop_checking.clear()
        self._check_thread = threading.Thread(target=self._monitoring_loop, daemon=True)
        self._check_thread.start()
        logger.info("Alert monitoring started")
    
    def stop_monitoring(self):
        """停止监控"""
        self._stop_checking.set()
        if self._check_thread:
            self._check_thread.join(timeout=5)
        logger.info("Alert monitoring stopped")
    
    def _monitoring_loop(self):
        """监控循环"""
        while not self._stop_checking.wait(30):  # 每30秒检查一次
            try:
                self._check_alerts()
            except Exception as e:
                logger.error(f"Alert checking error: {e}")
    
    def _check_alerts(self):
        """检查告警"""
        latest_metrics = self.metric_collector.get_latest_metrics()
        
        for metric_name, rule in self.alert_rules.items():
            if metric_name in latest_metrics:
                metric = latest_metrics[metric_name]
                
                if metric.value > rule['threshold']:
                    alert = Alert(
                        id=f"{metric_name}_{int(metric.timestamp.timestamp())}",
                        level=rule['level'],
                        message=f"{metric_name} is {metric.value}, exceeding threshold {rule['threshold']}",
                        metric_name=metric_name,
                        value=metric.value,
                        threshold=rule['threshold'],
                        timestamp=metric.timestamp
                    )
                    
                    self._trigger_alert(alert)
    
    def _trigger_alert(self, alert: Alert):
        """触发告警"""
        with self._alerts_lock:
            # 检查是否已存在相同告警
            existing = any(
                a.metric_name == alert.metric_name and not a.resolved
                for a in self.alerts
            )
            
            if not existing:
                self.alerts.append(alert)
                logger.warning(f"Alert triggered: {alert.message}")
                
                # 调用告警处理器
                for handler in self._alert_handlers:
                    try:
                        handler(alert)
                    except Exception as e:
                        logger.error(f"Alert handler error: {e}")
    
    def get_active_alerts(self) -> List[Alert]:
        """获取活跃告警"""
        with self._alerts_lock:
            return [alert for alert in self.alerts if not alert.resolved]
    
    def resolve_alert(self, alert_id: str):
        """解决告警"""
        with self._alerts_lock:
            for alert in self.alerts:
                if alert.id == alert_id:
                    alert.resolved = True
                    logger.info(f"Alert resolved: {alert_id}")
                    break


class DatabaseMonitor:
    """数据库监控器"""
    
    def __init__(self, database_url: str):
        self.database_url = database_url
        self.metric_collector = MetricCollector(database_url)
        self.alert_manager = AlertManager(self.metric_collector)
        
        # 添加默认告警处理器
        self.alert_manager.add_alert_handler(self._default_alert_handler)
        
        logger.info("Database monitor initialized")
    
    def start(self):
        """启动监控"""
        self.metric_collector.start_collection()
        self.alert_manager.start_monitoring()
        logger.info("Database monitoring started")
    
    def stop(self):
        """停止监控"""
        self.metric_collector.stop_collection()
        self.alert_manager.stop_monitoring()
        logger.info("Database monitoring stopped")
    
    def get_dashboard_data(self) -> Dict[str, Any]:
        """获取仪表盘数据"""
        latest_metrics = self.metric_collector.get_latest_metrics()
        active_alerts = self.alert_manager.get_active_alerts()
        
        # 准备图表数据
        charts_data = {}
        for metric_name in ['system_cpu_percent', 'system_memory_percent', 'db_query_response_time']:
            metrics = self.metric_collector.get_metrics(
                metric_name=metric_name,
                start_time=datetime.utcnow() - timedelta(hours=1)
            )
            charts_data[metric_name] = [
                {'timestamp': m.timestamp.isoformat(), 'value': m.value}
                for m in metrics
            ]
        
        return {
            'timestamp': datetime.utcnow().isoformat(),
            'latest_metrics': {name: metric.to_dict() for name, metric in latest_metrics.items()},
            'active_alerts': [alert.to_dict() for alert in active_alerts],
            'charts_data': charts_data,
            'summary': {
                'total_metrics': len(latest_metrics),
                'active_alerts_count': len(active_alerts),
                'monitoring_status': 'active'
            }
        }
    
    def _default_alert_handler(self, alert: Alert):
        """默认告警处理器"""
        # 记录到日志
        log_level = {
            AlertLevel.INFO: logging.INFO,
            AlertLevel.WARNING: logging.WARNING,
            AlertLevel.ERROR: logging.ERROR,
            AlertLevel.CRITICAL: logging.CRITICAL
        }.get(alert.level, logging.WARNING)
        
        logger.log(log_level, f"ALERT [{alert.level.value.upper()}]: {alert.message}")


# 使用示例
if __name__ == "__main__":
    from config.database import get_database_url
    
    try:
        database_url = get_database_url()
        monitor = DatabaseMonitor(database_url)
        
        # 启动监控
        monitor.start()
        
        # 等待一段时间收集数据
        import time
        time.sleep(60)
        
        # 获取仪表盘数据
        dashboard_data = monitor.get_dashboard_data()
        print(json.dumps(dashboard_data, indent=2))
        
        # 停止监控
        monitor.stop()
        
    except Exception as e:
        print(f"Database monitoring test failed: {e}")