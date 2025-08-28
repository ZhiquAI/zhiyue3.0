"""
系统监控和告警服务
实现全面的系统健康监控、性能指标收集和智能告警
"""

import asyncio
import logging
import time
import psutil
import json
from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime, timedelta
import threading
from collections import deque
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger(__name__)

class AlertLevel(Enum):
    """告警级别"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"

class MetricType(Enum):
    """指标类型"""
    SYSTEM = "system"           # 系统指标
    APPLICATION = "application" # 应用指标
    BUSINESS = "business"       # 业务指标
    SECURITY = "security"       # 安全指标

@dataclass
class MetricValue:
    """指标值"""
    timestamp: datetime
    value: float
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class Alert:
    """告警信息"""
    alert_id: str
    level: AlertLevel
    title: str
    message: str
    metric_name: str
    current_value: float
    threshold: float
    timestamp: datetime
    resolved: bool = False
    resolved_at: Optional[datetime] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class MonitoringRule:
    """监控规则"""
    rule_id: str
    metric_name: str
    condition: str  # "greater_than", "less_than", "equals", "not_equals"
    threshold: float
    alert_level: AlertLevel
    alert_title: str
    alert_message: str
    enabled: bool = True
    check_interval: int = 60  # 检查间隔（秒）
    consecutive_violations: int = 1  # 连续违反次数才告警
    current_violations: int = 0

class MetricsCollector:
    """指标收集器"""
    
    def __init__(self):
        self.metrics: Dict[str, deque] = {}
        self.max_history = 1440  # 保留24小时的分钟级数据
        self.collection_interval = 60  # 收集间隔（秒）
        self.running = False
        self.collection_task = None
    
    async def start_collection(self):
        """开始指标收集"""
        if not self.running:
            self.running = True
            self.collection_task = asyncio.create_task(self._collection_loop())
            logger.info("指标收集器已启动")
    
    async def stop_collection(self):
        """停止指标收集"""
        self.running = False
        if self.collection_task:
            self.collection_task.cancel()
            try:
                await self.collection_task
            except asyncio.CancelledError:
                pass
        logger.info("指标收集器已停止")
    
    async def _collection_loop(self):
        """指标收集循环"""
        while self.running:
            try:
                await self._collect_system_metrics()
                await self._collect_application_metrics()
                await self._collect_business_metrics()
                await asyncio.sleep(self.collection_interval)
            except Exception as e:
                logger.error(f"指标收集错误: {e}", exc_info=True)
                await asyncio.sleep(5)
    
    async def _collect_system_metrics(self):
        """收集系统指标"""
        timestamp = datetime.now()
        
        # CPU 使用率
        cpu_percent = psutil.cpu_percent(interval=1)
        self._add_metric("system.cpu.usage", timestamp, cpu_percent)
        
        # 内存使用率
        memory = psutil.virtual_memory()
        self._add_metric("system.memory.usage", timestamp, memory.percent)
        self._add_metric("system.memory.available", timestamp, memory.available / (1024**3))  # GB
        
        # 磁盘使用率
        disk = psutil.disk_usage('/')
        disk_percent = (disk.used / disk.total) * 100
        self._add_metric("system.disk.usage", timestamp, disk_percent)
        self._add_metric("system.disk.free", timestamp, disk.free / (1024**3))  # GB
        
        # 网络IO
        net_io = psutil.net_io_counters()
        self._add_metric("system.network.bytes_sent", timestamp, net_io.bytes_sent)
        self._add_metric("system.network.bytes_recv", timestamp, net_io.bytes_recv)
        
        # 进程数量
        process_count = len(psutil.pids())
        self._add_metric("system.processes.count", timestamp, process_count)
        
        # 负载平均值（Linux/Mac）
        try:
            load_avg = psutil.getloadavg()
            self._add_metric("system.load.1min", timestamp, load_avg[0])
            self._add_metric("system.load.5min", timestamp, load_avg[1])
            self._add_metric("system.load.15min", timestamp, load_avg[2])
        except (AttributeError, OSError):
            pass  # Windows 不支持
    
    async def _collect_application_metrics(self):
        """收集应用指标"""
        timestamp = datetime.now()
        
        # 从其他服务获取指标
        try:
            # 并发管理器指标
            from services.concurrency_manager import global_concurrency_manager
            stats = global_concurrency_manager.get_statistics()
            
            self._add_metric("app.concurrency.total_tasks", timestamp, stats.get("total_tasks", 0))
            self._add_metric("app.concurrency.completed_tasks", timestamp, stats.get("completed_tasks", 0))
            self._add_metric("app.concurrency.failed_tasks", timestamp, stats.get("failed_tasks", 0))
            self._add_metric("app.concurrency.current_concurrent", timestamp, stats.get("current_concurrent_tasks", 0))
            self._add_metric("app.concurrency.queue_size", timestamp, stats.get("queue_size", 0))
            
        except ImportError:
            pass
        
        # WebSocket 连接数
        try:
            from services.websocket_performance import connection_pool
            active_connections = len(connection_pool.connections)
            self._add_metric("app.websocket.connections", timestamp, active_connections)
        except ImportError:
            pass
        
        # 错误处理器指标
        try:
            from utils.error_handler import error_handler
            error_stats = error_handler.get_error_statistics()
            self._add_metric("app.errors.total", timestamp, error_stats.get("total_errors", 0))
        except ImportError:
            pass
    
    async def _collect_business_metrics(self):
        """收集业务指标"""
        timestamp = datetime.now()
        
        # AI 评分指标
        try:
            # 这里应该从数据库或缓存中获取业务指标
            # 简化实现，使用模拟数据
            
            # 评分任务数量
            self._add_metric("business.grading.total_tasks", timestamp, 1250)
            self._add_metric("business.grading.completed_today", timestamp, 85)
            self._add_metric("business.grading.avg_confidence", timestamp, 0.89)
            
            # 用户活跃度
            self._add_metric("business.users.active_teachers", timestamp, 12)
            self._add_metric("business.users.active_students", timestamp, 350)
            
            # 系统性能
            self._add_metric("business.performance.avg_response_time", timestamp, 387)  # ms
            self._add_metric("business.performance.success_rate", timestamp, 98.5)  # %
            
        except Exception as e:
            logger.error(f"业务指标收集失败: {e}")
    
    def _add_metric(self, metric_name: str, timestamp: datetime, value: float, metadata: Dict = None):
        """添加指标值"""
        if metric_name not in self.metrics:
            self.metrics[metric_name] = deque(maxlen=self.max_history)
        
        metric_value = MetricValue(
            timestamp=timestamp,
            value=value,
            metadata=metadata or {}
        )
        
        self.metrics[metric_name].append(metric_value)
    
    def get_metric_history(self, metric_name: str, hours: int = 1) -> List[MetricValue]:
        """获取指标历史数据"""
        if metric_name not in self.metrics:
            return []
        
        cutoff_time = datetime.now() - timedelta(hours=hours)
        return [
            metric for metric in self.metrics[metric_name]
            if metric.timestamp >= cutoff_time
        ]
    
    def get_latest_metric(self, metric_name: str) -> Optional[MetricValue]:
        """获取最新指标值"""
        if metric_name not in self.metrics or not self.metrics[metric_name]:
            return None
        return self.metrics[metric_name][-1]

class AlertManager:
    """告警管理器"""
    
    def __init__(self, metrics_collector: MetricsCollector):
        self.metrics_collector = metrics_collector
        self.rules: Dict[str, MonitoringRule] = {}
        self.active_alerts: Dict[str, Alert] = {}
        self.alert_history: List[Alert] = []
        self.notification_handlers: List[Callable] = []
        self.running = False
        self.check_task = None
        
        # 初始化默认监控规则
        self._initialize_default_rules()
    
    def _initialize_default_rules(self):
        """初始化默认监控规则"""
        default_rules = [
            # 系统指标规则
            MonitoringRule(
                rule_id="cpu_high",
                metric_name="system.cpu.usage",
                condition="greater_than",
                threshold=85.0,
                alert_level=AlertLevel.WARNING,
                alert_title="CPU使用率过高",
                alert_message="系统CPU使用率超过85%，当前值: {current_value:.1f}%",
                consecutive_violations=2
            ),
            MonitoringRule(
                rule_id="memory_high",
                metric_name="system.memory.usage",
                condition="greater_than",
                threshold=90.0,
                alert_level=AlertLevel.ERROR,
                alert_title="内存使用率过高",
                alert_message="系统内存使用率超过90%，当前值: {current_value:.1f}%",
                consecutive_violations=2
            ),
            MonitoringRule(
                rule_id="disk_full",
                metric_name="system.disk.usage",
                condition="greater_than",
                threshold=95.0,
                alert_level=AlertLevel.CRITICAL,
                alert_title="磁盘空间不足",
                alert_message="磁盘使用率超过95%，当前值: {current_value:.1f}%",
                consecutive_violations=1
            ),
            MonitoringRule(
                rule_id="load_high",
                metric_name="system.load.1min",
                condition="greater_than",
                threshold=5.0,
                alert_level=AlertLevel.WARNING,
                alert_title="系统负载过高",
                alert_message="1分钟负载平均值过高，当前值: {current_value:.2f}",
                consecutive_violations=3
            ),
            
            # 应用指标规则
            MonitoringRule(
                rule_id="concurrency_queue_high",
                metric_name="app.concurrency.queue_size",
                condition="greater_than",
                threshold=100.0,
                alert_level=AlertLevel.WARNING,
                alert_title="并发队列积压",
                alert_message="并发任务队列积压严重，当前队列大小: {current_value}",
                consecutive_violations=2
            ),
            MonitoringRule(
                rule_id="error_rate_high",
                metric_name="app.errors.total",
                condition="greater_than",
                threshold=50.0,
                alert_level=AlertLevel.ERROR,
                alert_title="错误率过高",
                alert_message="系统错误数量过多，当前错误总数: {current_value}",
                consecutive_violations=1
            ),
            
            # 业务指标规则
            MonitoringRule(
                rule_id="response_time_slow",
                metric_name="business.performance.avg_response_time",
                condition="greater_than",
                threshold=1000.0,
                alert_level=AlertLevel.WARNING,
                alert_title="响应时间过慢",
                alert_message="平均响应时间超过1秒，当前值: {current_value:.0f}ms",
                consecutive_violations=3
            ),
            MonitoringRule(
                rule_id="success_rate_low",
                metric_name="business.performance.success_rate",
                condition="less_than",
                threshold=95.0,
                alert_level=AlertLevel.ERROR,
                alert_title="成功率过低",
                alert_message="系统成功率低于95%，当前值: {current_value:.1f}%",
                consecutive_violations=2
            ),
            MonitoringRule(
                rule_id="confidence_low",
                metric_name="business.grading.avg_confidence",
                condition="less_than",
                threshold=0.8,
                alert_level=AlertLevel.WARNING,
                alert_title="AI评分置信度偏低",
                alert_message="AI评分平均置信度低于80%，当前值: {current_value:.1f}%",
                consecutive_violations=5
            )
        ]
        
        for rule in default_rules:
            self.rules[rule.rule_id] = rule
    
    async def start_monitoring(self):
        """开始监控"""
        if not self.running:
            self.running = True
            self.check_task = asyncio.create_task(self._monitoring_loop())
            logger.info("告警管理器已启动")
    
    async def stop_monitoring(self):
        """停止监控"""
        self.running = False
        if self.check_task:
            self.check_task.cancel()
            try:
                await self.check_task
            except asyncio.CancelledError:
                pass
        logger.info("告警管理器已停止")
    
    async def _monitoring_loop(self):
        """监控循环"""
        while self.running:
            try:
                await self._check_all_rules()
                await asyncio.sleep(30)  # 每30秒检查一次
            except Exception as e:
                logger.error(f"监控检查错误: {e}", exc_info=True)
                await asyncio.sleep(5)
    
    async def _check_all_rules(self):
        """检查所有监控规则"""
        for rule in self.rules.values():
            if rule.enabled:
                await self._check_rule(rule)
    
    async def _check_rule(self, rule: MonitoringRule):
        """检查单个监控规则"""
        latest_metric = self.metrics_collector.get_latest_metric(rule.metric_name)
        
        if not latest_metric:
            return
        
        current_value = latest_metric.value
        violation = self._evaluate_condition(current_value, rule.condition, rule.threshold)
        
        if violation:
            rule.current_violations += 1
            
            # 检查是否达到连续违反阈值
            if rule.current_violations >= rule.consecutive_violations:
                await self._trigger_alert(rule, current_value, latest_metric.timestamp)
        else:
            # 重置违反计数
            if rule.current_violations > 0:
                rule.current_violations = 0
                # 检查是否需要解决现有告警
                await self._resolve_alert(rule.rule_id)
    
    def _evaluate_condition(self, value: float, condition: str, threshold: float) -> bool:
        """评估条件"""
        if condition == "greater_than":
            return value > threshold
        elif condition == "less_than":
            return value < threshold
        elif condition == "equals":
            return abs(value - threshold) < 0.001
        elif condition == "not_equals":
            return abs(value - threshold) >= 0.001
        else:
            return False
    
    async def _trigger_alert(self, rule: MonitoringRule, current_value: float, timestamp: datetime):
        """触发告警"""
        alert_id = f"{rule.rule_id}_{int(timestamp.timestamp())}"
        
        # 检查是否已有活跃告警
        existing_alert_id = f"active_{rule.rule_id}"
        if existing_alert_id in self.active_alerts:
            return  # 已有活跃告警，不重复发送
        
        alert = Alert(
            alert_id=existing_alert_id,
            level=rule.alert_level,
            title=rule.alert_title,
            message=rule.alert_message.format(current_value=current_value),
            metric_name=rule.metric_name,
            current_value=current_value,
            threshold=rule.threshold,
            timestamp=timestamp
        )
        
        self.active_alerts[existing_alert_id] = alert
        self.alert_history.append(alert)
        
        # 发送通知
        await self._send_notifications(alert)
        
        logger.warning(f"告警触发: {alert.title} - {alert.message}")
    
    async def _resolve_alert(self, rule_id: str):
        """解决告警"""
        alert_id = f"active_{rule_id}"
        if alert_id in self.active_alerts:
            alert = self.active_alerts[alert_id]
            alert.resolved = True
            alert.resolved_at = datetime.now()
            
            del self.active_alerts[alert_id]
            
            logger.info(f"告警已解决: {alert.title}")
    
    async def _send_notifications(self, alert: Alert):
        """发送通知"""
        for handler in self.notification_handlers:
            try:
                await handler(alert)
            except Exception as e:
                logger.error(f"通知发送失败: {e}", exc_info=True)
    
    def add_notification_handler(self, handler: Callable):
        """添加通知处理器"""
        self.notification_handlers.append(handler)
    
    def get_active_alerts(self) -> List[Alert]:
        """获取活跃告警"""
        return list(self.active_alerts.values())
    
    def get_alert_history(self, hours: int = 24) -> List[Alert]:
        """获取告警历史"""
        cutoff_time = datetime.now() - timedelta(hours=hours)
        return [
            alert for alert in self.alert_history
            if alert.timestamp >= cutoff_time
        ]

class NotificationService:
    """通知服务"""
    
    def __init__(self):
        self.email_config = {
            "smtp_server": "smtp.gmail.com",
            "smtp_port": 587,
            "username": "",
            "password": "",
            "from_email": "",
            "to_emails": []
        }
        self.webhook_urls = []
    
    async def send_email_notification(self, alert: Alert):
        """发送邮件通知"""
        if not self.email_config["username"] or not self.email_config["to_emails"]:
            return
        
        try:
            msg = MimeMultipart()
            msg['From'] = self.email_config["from_email"]
            msg['To'] = ", ".join(self.email_config["to_emails"])
            msg['Subject'] = f"[{alert.level.value.upper()}] {alert.title}"
            
            body = f"""
            告警详情:
            
            级别: {alert.level.value.upper()}
            标题: {alert.title}
            消息: {alert.message}
            指标: {alert.metric_name}
            当前值: {alert.current_value}
            阈值: {alert.threshold}
            时间: {alert.timestamp.strftime('%Y-%m-%d %H:%M:%S')}
            
            请及时处理此告警。
            
            ——智阅AI监控系统
            """
            
            msg.attach(MimeText(body, 'plain', 'utf-8'))
            
            with smtplib.SMTP(self.email_config["smtp_server"], self.email_config["smtp_port"]) as server:
                server.starttls()
                server.login(self.email_config["username"], self.email_config["password"])
                server.send_message(msg)
            
            logger.info(f"邮件通知已发送: {alert.title}")
            
        except Exception as e:
            logger.error(f"邮件发送失败: {e}", exc_info=True)
    
    async def send_webhook_notification(self, alert: Alert):
        """发送Webhook通知"""
        import aiohttp
        
        payload = {
            "alert_id": alert.alert_id,
            "level": alert.level.value,
            "title": alert.title,
            "message": alert.message,
            "metric_name": alert.metric_name,
            "current_value": alert.current_value,
            "threshold": alert.threshold,
            "timestamp": alert.timestamp.isoformat()
        }
        
        for webhook_url in self.webhook_urls:
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.post(webhook_url, json=payload) as response:
                        if response.status == 200:
                            logger.info(f"Webhook通知已发送: {webhook_url}")
                        else:
                            logger.error(f"Webhook发送失败: {response.status}")
            except Exception as e:
                logger.error(f"Webhook发送异常: {e}", exc_info=True)
    
    async def send_console_notification(self, alert: Alert):
        """发送控制台通知"""
        level_emoji = {
            AlertLevel.INFO: "ℹ️",
            AlertLevel.WARNING: "⚠️",
            AlertLevel.ERROR: "❌",
            AlertLevel.CRITICAL: "🚨"
        }
        
        emoji = level_emoji.get(alert.level, "📢")
        print(f"\n{emoji} [{alert.level.value.upper()}] {alert.title}")
        print(f"   消息: {alert.message}")
        print(f"   时间: {alert.timestamp.strftime('%Y-%m-%d %H:%M:%S')}")
        print()

class MonitoringSystem:
    """监控系统主类"""
    
    def __init__(self):
        self.metrics_collector = MetricsCollector()
        self.alert_manager = AlertManager(self.metrics_collector)
        self.notification_service = NotificationService()
        
        # 注册默认通知处理器
        self.alert_manager.add_notification_handler(
            self.notification_service.send_console_notification
        )
    
    async def start(self):
        """启动监控系统"""
        await self.metrics_collector.start_collection()
        await self.alert_manager.start_monitoring()
        logger.info("监控系统已启动")
    
    async def stop(self):
        """停止监控系统"""
        await self.alert_manager.stop_monitoring()
        await self.metrics_collector.stop_collection()
        logger.info("监控系统已停止")
    
    def get_system_status(self) -> Dict[str, Any]:
        """获取系统状态"""
        # 获取关键指标的最新值
        key_metrics = [
            "system.cpu.usage",
            "system.memory.usage",
            "system.disk.usage",
            "app.concurrency.current_concurrent",
            "business.performance.avg_response_time",
            "business.performance.success_rate"
        ]
        
        current_metrics = {}
        for metric_name in key_metrics:
            latest = self.metrics_collector.get_latest_metric(metric_name)
            if latest:
                current_metrics[metric_name] = {
                    "value": latest.value,
                    "timestamp": latest.timestamp.isoformat()
                }
        
        return {
            "status": "healthy" if not self.alert_manager.active_alerts else "warning",
            "timestamp": datetime.now().isoformat(),
            "active_alerts": len(self.alert_manager.active_alerts),
            "metrics": current_metrics,
            "alerts": [
                {
                    "level": alert.level.value,
                    "title": alert.title,
                    "message": alert.message,
                    "timestamp": alert.timestamp.isoformat()
                }
                for alert in self.alert_manager.get_active_alerts()
            ]
        }

# 全局监控系统实例
monitoring_system = MonitoringSystem()