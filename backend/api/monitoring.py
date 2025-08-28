"""
系统监控API路由
提供系统监控、告警和性能指标的HTTP接口
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
import logging

from services.monitoring_system import monitoring_system, AlertLevel
from utils.response import success_response, error_response
from middleware.response_middleware import get_request_id

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/monitoring", tags=["系统监控"])

class AlertRequest(BaseModel):
    """手动告警请求"""
    title: str = Field(..., description="告警标题")
    message: str = Field(..., description="告警消息")
    level: str = Field("warning", description="告警级别")
    metric_name: str = Field("manual", description="相关指标")

class MonitoringRuleRequest(BaseModel):
    """监控规则请求"""
    rule_id: str = Field(..., description="规则ID")
    metric_name: str = Field(..., description="指标名称")
    condition: str = Field(..., description="条件")
    threshold: float = Field(..., description="阈值")
    alert_level: str = Field("warning", description="告警级别")
    alert_title: str = Field(..., description="告警标题")
    alert_message: str = Field(..., description="告警消息")
    enabled: bool = Field(True, description="是否启用")

@router.get("/status")
async def get_system_status(request_id: str = Depends(get_request_id)):
    """
    获取系统状态概览
    """
    try:
        status = monitoring_system.get_system_status()
        
        return success_response(
            data=status,
            message="系统状态获取成功",
            request_id=request_id
        )
        
    except Exception as e:
        logger.error(f"获取系统状态失败: {e}", exc_info=True)
        return error_response(
            message="获取系统状态失败",
            error_code="SYSTEM_STATUS_ERROR",
            status_code=500,
            request_id=request_id
        )

@router.get("/metrics/{metric_name}")
async def get_metric_history(
    metric_name: str,
    hours: int = Query(1, description="获取最近N小时的数据"),
    request_id: str = Depends(get_request_id)
):
    """
    获取指定指标的历史数据
    """
    try:
        history = monitoring_system.metrics_collector.get_metric_history(metric_name, hours)
        
        data = [
            {
                "timestamp": metric.timestamp.isoformat(),
                "value": metric.value,
                "metadata": metric.metadata
            }
            for metric in history
        ]
        
        return success_response(
            data={
                "metric_name": metric_name,
                "time_range_hours": hours,
                "data_points": len(data),
                "data": data
            },
            message="指标数据获取成功",
            request_id=request_id
        )
        
    except Exception as e:
        logger.error(f"获取指标历史失败: {e}", exc_info=True)
        return error_response(
            message="获取指标历史失败",
            error_code="METRIC_HISTORY_ERROR",
            status_code=500,
            request_id=request_id
        )

@router.get("/metrics")
async def list_available_metrics(request_id: str = Depends(get_request_id)):
    """
    获取可用的指标列表
    """
    try:
        available_metrics = list(monitoring_system.metrics_collector.metrics.keys())
        
        # 按类别分组
        categorized_metrics = {
            "system": [m for m in available_metrics if m.startswith("system.")],
            "application": [m for m in available_metrics if m.startswith("app.")],
            "business": [m for m in available_metrics if m.startswith("business.")]
        }
        
        return success_response(
            data={
                "total_metrics": len(available_metrics),
                "categories": categorized_metrics,
                "all_metrics": available_metrics
            },
            message="指标列表获取成功",
            request_id=request_id
        )
        
    except Exception as e:
        logger.error(f"获取指标列表失败: {e}", exc_info=True)
        return error_response(
            message="获取指标列表失败",
            error_code="METRICS_LIST_ERROR",
            status_code=500,
            request_id=request_id
        )

@router.get("/alerts")
async def get_alerts(
    active_only: bool = Query(False, description="只获取活跃告警"),
    hours: int = Query(24, description="获取最近N小时的告警"),
    request_id: str = Depends(get_request_id)
):
    """
    获取告警列表
    """
    try:
        if active_only:
            alerts = monitoring_system.alert_manager.get_active_alerts()
        else:
            alerts = monitoring_system.alert_manager.get_alert_history(hours)
        
        alert_data = [
            {
                "alert_id": alert.alert_id,
                "level": alert.level.value,
                "title": alert.title,
                "message": alert.message,
                "metric_name": alert.metric_name,
                "current_value": alert.current_value,
                "threshold": alert.threshold,
                "timestamp": alert.timestamp.isoformat(),
                "resolved": alert.resolved,
                "resolved_at": alert.resolved_at.isoformat() if alert.resolved_at else None
            }
            for alert in alerts
        ]
        
        # 统计信息
        level_counts = {}
        for alert in alerts:
            level = alert.level.value
            level_counts[level] = level_counts.get(level, 0) + 1
        
        return success_response(
            data={
                "total_alerts": len(alert_data),
                "active_alerts": len(monitoring_system.alert_manager.get_active_alerts()),
                "level_breakdown": level_counts,
                "alerts": alert_data
            },
            message="告警列表获取成功",
            request_id=request_id
        )
        
    except Exception as e:
        logger.error(f"获取告警列表失败: {e}", exc_info=True)
        return error_response(
            message="获取告警列表失败",
            error_code="ALERTS_LIST_ERROR",
            status_code=500,
            request_id=request_id
        )

@router.post("/alerts")
async def create_manual_alert(
    alert_request: AlertRequest,
    request_id: str = Depends(get_request_id)
):
    """
    创建手动告警
    """
    try:
        # 验证告警级别
        try:
            alert_level = AlertLevel(alert_request.level)
        except ValueError:
            return error_response(
                message=f"无效的告警级别: {alert_request.level}",
                error_code="INVALID_ALERT_LEVEL",
                status_code=400,
                request_id=request_id
            )
        
        # 创建手动告警
        from services.monitoring_system import Alert
        
        alert = Alert(
            alert_id=f"manual_{int(datetime.now().timestamp())}",
            level=alert_level,
            title=alert_request.title,
            message=alert_request.message,
            metric_name=alert_request.metric_name,
            current_value=0.0,
            threshold=0.0,
            timestamp=datetime.now(),
            metadata={"type": "manual"}
        )
        
        # 添加到告警历史
        monitoring_system.alert_manager.alert_history.append(alert)
        
        # 发送通知
        await monitoring_system.alert_manager._send_notifications(alert)
        
        return success_response(
            data={
                "alert_id": alert.alert_id,
                "status": "created"
            },
            message="手动告警创建成功",
            request_id=request_id
        )
        
    except Exception as e:
        logger.error(f"创建手动告警失败: {e}", exc_info=True)
        return error_response(
            message="创建手动告警失败",
            error_code="MANUAL_ALERT_ERROR",
            status_code=500,
            request_id=request_id
        )

@router.get("/rules")
async def get_monitoring_rules(request_id: str = Depends(get_request_id)):
    """
    获取监控规则列表
    """
    try:
        rules = monitoring_system.alert_manager.rules
        
        rule_data = [
            {
                "rule_id": rule.rule_id,
                "metric_name": rule.metric_name,
                "condition": rule.condition,
                "threshold": rule.threshold,
                "alert_level": rule.alert_level.value,
                "alert_title": rule.alert_title,
                "alert_message": rule.alert_message,
                "enabled": rule.enabled,
                "check_interval": rule.check_interval,
                "consecutive_violations": rule.consecutive_violations,
                "current_violations": rule.current_violations
            }
            for rule in rules.values()
        ]
        
        return success_response(
            data={
                "total_rules": len(rule_data),
                "enabled_rules": len([r for r in rule_data if r["enabled"]]),
                "rules": rule_data
            },
            message="监控规则获取成功",
            request_id=request_id
        )
        
    except Exception as e:
        logger.error(f"获取监控规则失败: {e}", exc_info=True)
        return error_response(
            message="获取监控规则失败",
            error_code="RULES_LIST_ERROR",
            status_code=500,
            request_id=request_id
        )

@router.post("/rules")
async def create_monitoring_rule(
    rule_request: MonitoringRuleRequest,
    request_id: str = Depends(get_request_id)
):
    """
    创建监控规则
    """
    try:
        # 验证告警级别
        try:
            alert_level = AlertLevel(rule_request.alert_level)
        except ValueError:
            return error_response(
                message=f"无效的告警级别: {rule_request.alert_level}",
                error_code="INVALID_ALERT_LEVEL",
                status_code=400,
                request_id=request_id
            )
        
        # 检查规则是否已存在
        if rule_request.rule_id in monitoring_system.alert_manager.rules:
            return error_response(
                message=f"规则 {rule_request.rule_id} 已存在",
                error_code="RULE_ALREADY_EXISTS",
                status_code=400,
                request_id=request_id
            )
        
        # 创建新规则
        from services.monitoring_system import MonitoringRule
        
        new_rule = MonitoringRule(
            rule_id=rule_request.rule_id,
            metric_name=rule_request.metric_name,
            condition=rule_request.condition,
            threshold=rule_request.threshold,
            alert_level=alert_level,
            alert_title=rule_request.alert_title,
            alert_message=rule_request.alert_message,
            enabled=rule_request.enabled
        )
        
        monitoring_system.alert_manager.rules[rule_request.rule_id] = new_rule
        
        return success_response(
            data={
                "rule_id": rule_request.rule_id,
                "status": "created"
            },
            message="监控规则创建成功",
            request_id=request_id
        )
        
    except Exception as e:
        logger.error(f"创建监控规则失败: {e}", exc_info=True)
        return error_response(
            message="创建监控规则失败",
            error_code="RULE_CREATE_ERROR",
            status_code=500,
            request_id=request_id
        )

@router.put("/rules/{rule_id}")
async def update_monitoring_rule(
    rule_id: str,
    rule_request: MonitoringRuleRequest,
    request_id: str = Depends(get_request_id)
):
    """
    更新监控规则
    """
    try:
        if rule_id not in monitoring_system.alert_manager.rules:
            return error_response(
                message=f"规则 {rule_id} 不存在",
                error_code="RULE_NOT_FOUND",
                status_code=404,
                request_id=request_id
            )
        
        # 验证告警级别
        try:
            alert_level = AlertLevel(rule_request.alert_level)
        except ValueError:
            return error_response(
                message=f"无效的告警级别: {rule_request.alert_level}",
                error_code="INVALID_ALERT_LEVEL",
                status_code=400,
                request_id=request_id
            )
        
        # 更新规则
        rule = monitoring_system.alert_manager.rules[rule_id]
        rule.metric_name = rule_request.metric_name
        rule.condition = rule_request.condition
        rule.threshold = rule_request.threshold
        rule.alert_level = alert_level
        rule.alert_title = rule_request.alert_title
        rule.alert_message = rule_request.alert_message
        rule.enabled = rule_request.enabled
        
        # 重置违反计数
        rule.current_violations = 0
        
        return success_response(
            data={
                "rule_id": rule_id,
                "status": "updated"
            },
            message="监控规则更新成功",
            request_id=request_id
        )
        
    except Exception as e:
        logger.error(f"更新监控规则失败: {e}", exc_info=True)
        return error_response(
            message="更新监控规则失败",
            error_code="RULE_UPDATE_ERROR",
            status_code=500,
            request_id=request_id
        )

@router.delete("/rules/{rule_id}")
async def delete_monitoring_rule(
    rule_id: str,
    request_id: str = Depends(get_request_id)
):
    """
    删除监控规则
    """
    try:
        if rule_id not in monitoring_system.alert_manager.rules:
            return error_response(
                message=f"规则 {rule_id} 不存在",
                error_code="RULE_NOT_FOUND",
                status_code=404,
                request_id=request_id
            )
        
        del monitoring_system.alert_manager.rules[rule_id]
        
        return success_response(
            data={
                "rule_id": rule_id,
                "status": "deleted"
            },
            message="监控规则删除成功",
            request_id=request_id
        )
        
    except Exception as e:
        logger.error(f"删除监控规则失败: {e}", exc_info=True)
        return error_response(
            message="删除监控规则失败",
            error_code="RULE_DELETE_ERROR",
            status_code=500,
            request_id=request_id
        )

@router.get("/dashboard")
async def get_monitoring_dashboard(request_id: str = Depends(get_request_id)):
    """
    获取监控仪表板数据
    """
    try:
        # 获取关键指标的最新值
        key_metrics = [
            "system.cpu.usage",
            "system.memory.usage", 
            "system.disk.usage",
            "app.concurrency.current_concurrent",
            "app.concurrency.queue_size",
            "business.performance.avg_response_time",
            "business.performance.success_rate",
            "business.grading.avg_confidence"
        ]
        
        current_metrics = {}
        for metric_name in key_metrics:
            latest = monitoring_system.metrics_collector.get_latest_metric(metric_name)
            if latest:
                current_metrics[metric_name] = latest.value
        
        # 获取活跃告警
        active_alerts = monitoring_system.alert_manager.get_active_alerts()
        
        # 获取最近24小时的告警统计
        recent_alerts = monitoring_system.alert_manager.get_alert_history(24)
        alert_trends = {}
        for alert in recent_alerts:
            hour = alert.timestamp.replace(minute=0, second=0, microsecond=0)
            hour_key = hour.strftime("%H:00")
            alert_trends[hour_key] = alert_trends.get(hour_key, 0) + 1
        
        dashboard_data = {
            "overview": {
                "system_status": "healthy" if not active_alerts else "warning",
                "active_alerts": len(active_alerts),
                "critical_alerts": len([a for a in active_alerts if a.level == AlertLevel.CRITICAL]),
                "monitoring_rules": len(monitoring_system.alert_manager.rules),
                "uptime_hours": 24  # 简化实现
            },
            "metrics": current_metrics,
            "alerts": {
                "active": [
                    {
                        "level": alert.level.value,
                        "title": alert.title,
                        "timestamp": alert.timestamp.isoformat()
                    }
                    for alert in active_alerts[:10]  # 最近10个
                ],
                "trends": alert_trends
            },
            "performance": {
                "cpu_usage": current_metrics.get("system.cpu.usage", 0),
                "memory_usage": current_metrics.get("system.memory.usage", 0),
                "disk_usage": current_metrics.get("system.disk.usage", 0),
                "response_time": current_metrics.get("business.performance.avg_response_time", 0),
                "success_rate": current_metrics.get("business.performance.success_rate", 100)
            }
        }
        
        return success_response(
            data=dashboard_data,
            message="监控仪表板数据获取成功",
            request_id=request_id
        )
        
    except Exception as e:
        logger.error(f"获取监控仪表板失败: {e}", exc_info=True)
        return error_response(
            message="获取监控仪表板失败",
            error_code="DASHBOARD_ERROR",
            status_code=500,
            request_id=request_id
        )

@router.get("/health")
async def monitoring_health_check(request_id: str = Depends(get_request_id)):
    """
    监控服务健康检查
    """
    try:
        health_status = {
            "monitoring_system": "running",
            "metrics_collector": "running" if monitoring_system.metrics_collector.running else "stopped",
            "alert_manager": "running" if monitoring_system.alert_manager.running else "stopped",
            "total_metrics": len(monitoring_system.metrics_collector.metrics),
            "active_alerts": len(monitoring_system.alert_manager.active_alerts),
            "monitoring_rules": len(monitoring_system.alert_manager.rules)
        }
        
        return success_response(
            data=health_status,
            message="监控服务运行正常",
            request_id=request_id
        )
        
    except Exception as e:
        logger.error(f"监控服务健康检查失败: {e}", exc_info=True)
        return error_response(
            message="监控服务异常",
            error_code="MONITORING_HEALTH_ERROR",
            status_code=500,
            request_id=request_id
        )