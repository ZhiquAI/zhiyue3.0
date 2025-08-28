"""
WebSocket路由处理器
提供各种类型的WebSocket连接端点
"""

import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends
from typing import Optional
from services.websocket_manager import websocket_manager, ConnectionType, MessageType
from services.websocket_auth import websocket_auth, WebSocketPermissions
from services.websocket_performance import connection_pool, message_queue, performance_monitor

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ws", tags=["WebSocket"])


@router.websocket("/quality/{exam_id}")
async def quality_monitoring_websocket(
    websocket: WebSocket,
    exam_id: str,
    token: Optional[str] = Query(None)
):
    """质量监控WebSocket连接"""
    user_info = None
    
    # JWT认证验证
    if token:
        user_info = await websocket_auth.authenticate_websocket(token)
        if not user_info:
            await websocket.close(code=1008, reason="Authentication failed")
            return
        
        # 检查质量监控权限
        if not websocket_auth.has_permission(user_info, WebSocketPermissions.QUALITY_MONITOR):
            await websocket.close(code=1008, reason="Insufficient permissions")
            return
    
    user_id = user_info.get("user_id") if user_info else None
    connection = await websocket_manager.connect(
        websocket, ConnectionType.QUALITY_MONITOR, user_id, exam_id
    )
    
    # 添加到连接池
    connection_pool.add_connection(connection.connection_id, connection)
    
    try:
        while True:
            # 接收客户端消息
            data = await websocket.receive_text()
            message = json.loads(data)
            
            message_type = message.get("type")
            
            if message_type == "refresh_metrics":
                # 触发质量指标刷新
                await _handle_refresh_metrics(connection, exam_id)
                
            elif message_type == "acknowledge_alert":
                # 确认质量告警
                alert_id = message.get("alertId")
                await _handle_acknowledge_alert(connection, alert_id)
                
            elif message_type == "adjust_threshold":
                # 调整质量阈值
                metric = message.get("metric")
                threshold = message.get("threshold")
                await _handle_adjust_threshold(connection, metric, threshold)
                
            elif message_type == "heartbeat_response":
                # 更新心跳时间
                connection.last_heartbeat = connection.connected_at.__class__.utcnow()
                
    except WebSocketDisconnect:
        logger.info(f"Quality monitoring WebSocket disconnected: {connection.connection_id}")
    except Exception as e:
        logger.error(f"Error in quality monitoring WebSocket: {e}")
    finally:
        await websocket_manager.disconnect(connection.connection_id)
        connection_pool.remove_connection(connection.connection_id)


@router.websocket("/progress/{batch_id}")
async def progress_tracking_websocket(
    websocket: WebSocket,
    batch_id: str,
    token: Optional[str] = Query(None)
):
    """进度追踪WebSocket连接"""
    user_id = None
    
    if token:
        try:
            user_id = "system"  # 从JWT token解析用户ID
        except Exception as e:
            logger.warning(f"Invalid token for progress tracking: {e}")
    
    connection = await websocket_manager.connect(
        websocket, ConnectionType.PROGRESS_TRACKER, user_id, batch_id
    )
    
    try:
        # 发送初始进度信息
        await _send_initial_progress(connection, batch_id)
        
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            message_type = message.get("type")
            
            if message_type == "get_progress":
                await _handle_get_progress(connection, batch_id)
                
            elif message_type == "pause_batch":
                await _handle_pause_batch(connection, batch_id)
                
            elif message_type == "resume_batch":
                await _handle_resume_batch(connection, batch_id)
                
            elif message_type == "cancel_batch":
                await _handle_cancel_batch(connection, batch_id)
                
    except WebSocketDisconnect:
        logger.info(f"Progress tracking WebSocket disconnected: {connection.connection_id}")
    except Exception as e:
        logger.error(f"Error in progress tracking WebSocket: {e}")
    finally:
        await websocket_manager.disconnect(connection.connection_id)


@router.websocket("/grading/{exam_id}")
async def grading_workspace_websocket(
    websocket: WebSocket,
    exam_id: str,
    token: Optional[str] = Query(None)
):
    """阅卷工作区WebSocket连接"""
    user_id = None
    
    if token:
        try:
            user_id = "grading_user"  # 从JWT token解析用户ID
        except Exception as e:
            logger.warning(f"Invalid token for grading workspace: {e}")
    
    connection = await websocket_manager.connect(
        websocket, ConnectionType.GRADING_WORKSPACE, user_id, exam_id
    )
    
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            message_type = message.get("type")
            
            if message_type == "join_grading_session":
                await _handle_join_grading_session(connection, exam_id)
                
            elif message_type == "submit_grade":
                grade_data = message.get("data")
                await _handle_submit_grade(connection, exam_id, grade_data)
                
            elif message_type == "request_next_task":
                await _handle_request_next_task(connection, exam_id)
                
            elif message_type == "report_issue":
                issue_data = message.get("data")
                await _handle_report_issue(connection, exam_id, issue_data)
                
    except WebSocketDisconnect:
        logger.info(f"Grading workspace WebSocket disconnected: {connection.connection_id}")
    except Exception as e:
        logger.error(f"Error in grading workspace WebSocket: {e}")
    finally:
        await websocket_manager.disconnect(connection.connection_id)


@router.websocket("/system")
async def system_monitoring_websocket(
    websocket: WebSocket,
    token: Optional[str] = Query(None)
):
    """系统监控WebSocket连接"""
    user_id = None
    
    if token:
        try:
            user_id = "admin"  # 从JWT token解析用户ID，通常需要管理员权限
        except Exception as e:
            logger.warning(f"Invalid token for system monitoring: {e}")
    
    connection = await websocket_manager.connect(
        websocket, ConnectionType.SYSTEM_MONITOR, user_id
    )
    
    try:
        # 发送系统状态
        await _send_system_status(connection)
        
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            message_type = message.get("type")
            
            if message_type == "get_system_status":
                await _send_system_status(connection)
                
            elif message_type == "get_connection_stats":
                await _send_connection_stats(connection)
                
            elif message_type == "restart_service":
                service_name = message.get("service")
                await _handle_restart_service(connection, service_name)
                
    except WebSocketDisconnect:
        logger.info(f"System monitoring WebSocket disconnected: {connection.connection_id}")
    except Exception as e:
        logger.error(f"Error in system monitoring WebSocket: {e}")
    finally:
        await websocket_manager.disconnect(connection.connection_id)


# 处理函数

async def _handle_refresh_metrics(connection, exam_id: str):
    """处理刷新质量指标请求"""
    # 这里应该调用实际的质量监控服务
    mock_metrics = {
        "accuracyRate": 0.94,
        "consistencyScore": 0.91,
        "processingSpeed": 6.2,
        "errorRate": 0.03,
        "lastUpdated": connection.connected_at.__class__.utcnow().isoformat()
    }
    
    await connection.send_message(MessageType.METRICS_UPDATE, {"metrics": mock_metrics})


async def _handle_acknowledge_alert(connection, alert_id: str):
    """处理确认告警请求"""
    await connection.send_message(MessageType.ALERT_RESOLVED, {"alertId": alert_id})


async def _handle_adjust_threshold(connection, metric: str, threshold: float):
    """处理调整阈值请求"""
    # 这里应该更新实际的阈值配置
    await connection.send_message(
        MessageType.NOTIFICATION,
        {"message": f"已调整{metric}阈值至{threshold}"}
    )


async def _send_initial_progress(connection, batch_id: str):
    """发送初始进度信息"""
    # 模拟进度数据
    progress_data = {
        "batchId": batch_id,
        "totalTasks": 100,
        "completedTasks": 45,
        "processingTasks": 3,
        "failedTasks": 2,
        "status": "processing",
        "startTime": "2025-01-27T10:00:00Z",
        "estimatedCompletion": "2025-01-27T11:30:00Z"
    }
    
    await connection.send_message(MessageType.PROGRESS_UPDATE, progress_data)


async def _handle_get_progress(connection, batch_id: str):
    """处理获取进度请求"""
    await _send_initial_progress(connection, batch_id)


async def _handle_pause_batch(connection, batch_id: str):
    """处理暂停批次请求"""
    await connection.send_message(
        MessageType.NOTIFICATION,
        {"message": f"批次 {batch_id} 已暂停"}
    )


async def _handle_resume_batch(connection, batch_id: str):
    """处理恢复批次请求"""
    await connection.send_message(
        MessageType.NOTIFICATION,
        {"message": f"批次 {batch_id} 已恢复"}
    )


async def _handle_cancel_batch(connection, batch_id: str):
    """处理取消批次请求"""
    await connection.send_message(
        MessageType.NOTIFICATION,
        {"message": f"批次 {batch_id} 已取消"}
    )


async def _handle_join_grading_session(connection, exam_id: str):
    """处理加入阅卷会话请求"""
    session_data = {
        "examId": exam_id,
        "sessionId": f"session_{exam_id}",
        "status": "active",
        "participants": 3
    }
    
    await connection.send_message(MessageType.GRADING_STATUS, session_data)


async def _handle_submit_grade(connection, exam_id: str, grade_data: dict):
    """处理提交评分请求"""
    await connection.send_message(
        MessageType.GRADING_RESULT,
        {
            "examId": exam_id,
            "gradeData": grade_data,
            "status": "submitted",
            "timestamp": connection.connected_at.__class__.utcnow().isoformat()
        }
    )


async def _handle_request_next_task(connection, exam_id: str):
    """处理请求下一个任务"""
    # 模拟分配下一个任务
    task_data = {
        "taskId": f"task_{len(str(connection.connection_id))}",
        "examId": exam_id,
        "questionType": "subjective",
        "studentAnswer": "这是学生的答案内容..."
    }
    
    await connection.send_message(MessageType.TASK_PROGRESS, task_data)


async def _handle_report_issue(connection, exam_id: str, issue_data: dict):
    """处理报告问题请求"""
    await connection.send_message(
        MessageType.NOTIFICATION,
        {"message": "问题已上报，相关人员会及时处理"}
    )


async def _send_system_status(connection):
    """发送系统状态"""
    try:
        # 使用模拟系统状态数据（如果psutil不可用）
        import random
        
        system_status = {
            "cpu_percent": 45.2 + random.random() * 30,  # 45-75%
            "memory_percent": 62.8 + random.random() * 20,  # 62-82%
            "disk_percent": 78.5 + random.random() * 10,   # 78-88%
            "connections": websocket_manager.get_connection_stats(),
            "timestamp": connection.connected_at.__class__.utcnow().isoformat()
        }
        
        await connection.send_message(MessageType.SYSTEM_STATUS, system_status)
    except Exception as e:
        logger.error(f"Error getting system status: {e}")
        await connection.send_message(
            MessageType.ERROR_NOTIFICATION,
            error="Failed to get system status"
        )


async def _send_connection_stats(connection):
    """发送连接统计信息"""
    stats = websocket_manager.get_connection_stats()
    await connection.send_message(MessageType.SYSTEM_STATUS, {"connectionStats": stats})


async def _handle_restart_service(connection, service_name: str):
    """处理重启服务请求"""
    # 这里应该实现实际的服务重启逻辑
    await connection.send_message(
        MessageType.NOTIFICATION,
        {"message": f"服务 {service_name} 重启请求已提交"}
    )