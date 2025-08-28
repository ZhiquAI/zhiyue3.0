"""
Prometheus指标端点
提供/metrics端点供Prometheus抓取指标数据
"""

from fastapi import APIRouter, Response
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
from services.prometheus_metrics import metrics_collector, get_app_info
import logging

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Prometheus监控"])

@router.get("/metrics")
async def prometheus_metrics():
    """
    Prometheus指标端点
    
    返回所有已注册的Prometheus指标数据
    """
    try:
        # 生成最新的指标数据
        metrics_data = generate_latest()
        
        return Response(
            content=metrics_data,
            media_type=CONTENT_TYPE_LATEST
        )
        
    except Exception as e:
        logger.error(f"Error generating Prometheus metrics: {e}")
        return Response(
            content=f"# Error generating metrics: {str(e)}\n",
            media_type=CONTENT_TYPE_LATEST,
            status_code=500
        )

@router.get("/metrics/info")
async def metrics_info():
    """
    获取指标收集器信息
    """
    try:
        app_info = get_app_info()
        
        return {
            "status": "healthy",
            "collector_running": (
                metrics_collector.collection_task is not None and 
                not metrics_collector.collection_task.done()
            ),
            "collection_interval": metrics_collector.collection_interval,
            "app_info": app_info,
            "available_metrics": [
                "zhiyue_exam_creation_total",
                "zhiyue_ai_grading_accuracy_rate", 
                "zhiyue_http_requests_total",
                "zhiyue_websocket_connections_total",
                "zhiyue_database_connections_active",
                "zhiyue_file_upload_total"
            ]
        }
        
    except Exception as e:
        logger.error(f"Error getting metrics info: {e}")
        return {
            "status": "error",
            "error": str(e)
        }

@router.post("/metrics/reset")
async def reset_metrics():
    """
    重置所有计数器指标（仅开发环境）
    
    注意：此端点仅用于开发和测试环境
    """
    try:
        from ..services.prometheus_metrics import (
            exam_creation_total,
            ai_grading_total,
            http_requests_total,
            websocket_messages_total,
            file_upload_total
        )
        
        # 重置计数器（这会清除标签）
        exam_creation_total._value.clear()
        ai_grading_total._value.clear()
        http_requests_total._value.clear()
        websocket_messages_total._value.clear()
        file_upload_total._value.clear()
        
        logger.info("Prometheus metrics reset completed")
        
        return {
            "status": "success",
            "message": "All counter metrics have been reset",
            "timestamp": get_app_info()
        }
        
    except Exception as e:
        logger.error(f"Error resetting metrics: {e}")
        return {
            "status": "error",
            "error": str(e)
        }