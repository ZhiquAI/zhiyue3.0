"""
WebSocket性能指标API
提供WebSocket连接状态、消息队列、性能统计等监控数据
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, List
from datetime import datetime, timedelta

from services.websocket_performance import connection_pool, message_queue, performance_monitor
from services.websocket_manager import websocket_manager
from services.websocket_auth import websocket_auth, WebSocketPermissions
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/websocket", tags=["WebSocket监控"])

@router.get("/metrics", response_model=Dict[str, Any])
async def get_websocket_metrics(current_user: dict = Depends(get_current_user)):
    """
    获取WebSocket系统性能指标
    
    需要系统监控权限
    """
    # 检查权限
    if not websocket_auth.has_permission(current_user, WebSocketPermissions.SYSTEM_MONITOR):
        raise HTTPException(
            status_code=403, 
            detail="Insufficient permissions for WebSocket metrics access"
        )
    
    try:
        # 连接池统计
        pool_stats = connection_pool.get_performance_stats()
        
        # 消息队列统计
        queue_stats = {
            "queue_size": message_queue.queue.qsize() if message_queue.queue else 0,
            "messages_sent": message_queue.metrics.messages_sent,
            "messages_failed": message_queue.metrics.messages_failed,
            "avg_response_time": message_queue.metrics.avg_response_time
        }
        
        # WebSocket管理器统计
        manager_stats = websocket_manager.get_connection_stats()
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "connection_pool": pool_stats,
            "message_queue": queue_stats,
            "connection_manager": manager_stats,
            "system_health": {
                "status": "healthy" if pool_stats["active_connections"] < pool_stats["total_connections"] * 0.9 else "warning",
                "uptime_seconds": (datetime.utcnow() - datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)).total_seconds()
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get WebSocket metrics: {str(e)}")

@router.get("/metrics/history", response_model=List[Dict[str, Any]])
async def get_metrics_history(
    hours: int = 1,
    current_user: dict = Depends(get_current_user)
):
    """
    获取WebSocket性能指标历史数据
    
    Args:
        hours: 获取最近多少小时的数据（默认1小时）
    """
    # 检查权限
    if not websocket_auth.has_permission(current_user, WebSocketPermissions.SYSTEM_MONITOR):
        raise HTTPException(
            status_code=403, 
            detail="Insufficient permissions for metrics history access"
        )
    
    try:
        history = performance_monitor.get_metrics_history(hours=min(hours, 24))  # 最多24小时
        return history
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get metrics history: {str(e)}")

@router.get("/connections", response_model=Dict[str, Any])
async def get_active_connections(current_user: dict = Depends(get_current_user)):
    """
    获取当前活跃WebSocket连接信息
    
    需要系统监控权限
    """
    # 检查权限
    if not websocket_auth.has_permission(current_user, WebSocketPermissions.SYSTEM_MONITOR):
        raise HTTPException(
            status_code=403, 
            detail="Insufficient permissions for connection access"
        )
    
    try:
        connections_info = []
        
        # 获取所有连接详细信息
        for connection_id, stats in connection_pool.connection_stats.items():
            connection = connection_pool.get_connection(connection_id)
            if connection:
                connections_info.append({
                    "connection_id": connection_id,
                    "connected_at": stats["connected_at"].isoformat(),
                    "last_activity": stats["last_activity"].isoformat(),
                    "messages_sent": stats["messages_sent"],
                    "messages_received": stats["messages_received"],
                    "bytes_sent": stats["bytes_sent"],
                    "bytes_received": stats["bytes_received"],
                    "connection_type": getattr(connection, 'connection_type', 'unknown'),
                    "user_id": getattr(connection, 'user_id', None),
                    "exam_id": getattr(connection, 'exam_id', None)
                })
        
        return {
            "total_connections": len(connections_info),
            "connections": connections_info,
            "summary": websocket_manager.get_connection_stats()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get connections: {str(e)}")

@router.post("/connections/{connection_id}/disconnect")
async def disconnect_connection(
    connection_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    主动断开指定WebSocket连接
    
    需要系统监控权限
    """
    # 检查权限
    if not websocket_auth.has_permission(current_user, WebSocketPermissions.SYSTEM_MONITOR):
        raise HTTPException(
            status_code=403, 
            detail="Insufficient permissions for connection management"
        )
    
    try:
        # 查找并断开连接
        connection = connection_pool.get_connection(connection_id)
        if not connection:
            raise HTTPException(status_code=404, detail="Connection not found")
        
        await websocket_manager.disconnect(connection_id)
        connection_pool.remove_connection(connection_id)
        
        return {
            "message": f"Connection {connection_id} disconnected successfully",
            "connection_id": connection_id,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to disconnect connection: {str(e)}")

@router.post("/cleanup/stale-connections")
async def cleanup_stale_connections(
    timeout_minutes: int = 30,
    current_user: dict = Depends(get_current_user)
):
    """
    清理过期的WebSocket连接
    
    Args:
        timeout_minutes: 超时时间（分钟），默认30分钟
    """
    # 检查权限
    if not websocket_auth.has_permission(current_user, WebSocketPermissions.SYSTEM_MONITOR):
        raise HTTPException(
            status_code=403, 
            detail="Insufficient permissions for connection cleanup"
        )
    
    try:
        cleaned_count = connection_pool.cleanup_stale_connections(timeout_minutes)
        
        return {
            "message": f"Cleaned up {cleaned_count} stale connections",
            "cleaned_connections": cleaned_count,
            "timeout_minutes": timeout_minutes,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to cleanup stale connections: {str(e)}")

@router.get("/health", response_model=Dict[str, Any])
async def websocket_health_check():
    """
    WebSocket系统健康检查（无需认证）
    """
    try:
        pool_stats = connection_pool.get_performance_stats()
        queue_size = message_queue.queue.qsize() if message_queue.queue else 0
        
        # 判断系统健康状态
        is_healthy = (
            pool_stats["pool_utilization"] < 0.9 and  # 连接池使用率 < 90%
            queue_size < 1000 and  # 消息队列 < 1000
            pool_stats["average_response_time"] < 2.0  # 平均响应时间 < 2秒
        )
        
        status = "healthy" if is_healthy else "degraded"
        
        return {
            "status": status,
            "timestamp": datetime.utcnow().isoformat(),
            "metrics": {
                "active_connections": pool_stats["active_connections"],
                "pool_utilization": pool_stats["pool_utilization"],
                "queue_size": queue_size,
                "avg_response_time": pool_stats["average_response_time"]
            }
        }
        
    except Exception as e:
        return {
            "status": "error",
            "timestamp": datetime.utcnow().isoformat(),
            "error": str(e)
        }