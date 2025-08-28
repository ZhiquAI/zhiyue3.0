"""
智能质量控制API接口
提供质量评估、异常检测和质量监控的REST API
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from enum import Enum
import logging

from services.auth_service import get_current_user
from middleware.permissions import require_permissions
from models.user import User
from services.intelligent_quality_control import (
    quality_controller,
    QualityLevel,
    AnomalyType,
    QualityControlAction,
    QualityReport,
    QualityMetric,
    QualityAnomaly
)

router = APIRouter(prefix="/api/quality-control", tags=["quality_control"])
logger = logging.getLogger(__name__)

class QualityAssessmentRequest(BaseModel):
    session_id: str = Field(..., min_length=1, max_length=100)
    grading_results: List[Dict[str, Any]] = Field(..., min_items=1)
    grader_info: Optional[Dict[str, Any]] = None

class QualityThresholdUpdateRequest(BaseModel):
    metric_name: str = Field(..., min_length=1)
    thresholds: Dict[str, float] = Field(..., min_items=1)

class AnomalyResolutionRequest(BaseModel):
    anomaly_id: str = Field(..., min_length=1)
    resolution_action: QualityControlAction
    resolution_notes: Optional[str] = None

class QualityReportResponse(BaseModel):
    report_id: str
    session_id: str
    overall_quality: str
    assessment_period: List[str]  # [start_time, end_time]
    metrics_summary: Dict[str, Any]
    anomalies_count: int
    recommendations: List[str]
    generated_at: str

class QualityMetricResponse(BaseModel):
    metric_name: str
    value: float
    threshold: float
    status: str
    timestamp: str
    details: Optional[Dict[str, Any]] = None

class QualityAnomalyResponse(BaseModel):
    anomaly_id: str
    type: str
    severity: str
    description: str
    affected_items: List[str]
    detection_time: str
    confidence: float
    suggested_actions: List[str]
    resolution_status: str = "pending"
    metadata: Optional[Dict[str, Any]] = None

class QualityDashboardResponse(BaseModel):
    summary: Dict[str, Any]
    recent_reports: List[QualityReportResponse]
    active_anomalies: List[QualityAnomalyResponse]
    quality_trends: Dict[str, List[float]]

@router.post("/assess", response_model=QualityReportResponse)
@require_permissions("assess_quality")
async def assess_quality(
    request: QualityAssessmentRequest,
    current_user: User = Depends(get_current_user)
):
    """执行质量评估"""
    try:
        # 执行质量评估
        report = await quality_controller.assess_quality(
            session_id=request.session_id,
            grading_results=request.grading_results,
            grader_info=request.grader_info
        )
        
        # 转换为响应格式
        return QualityReportResponse(
            report_id=report.report_id,
            session_id=request.session_id,
            overall_quality=report.overall_quality.value,
            assessment_period=[
                report.assessment_period[0].isoformat(),
                report.assessment_period[1].isoformat()
            ],
            metrics_summary={
                metric.metric_name: {
                    "value": metric.value,
                    "status": metric.status,
                    "threshold": metric.threshold
                }
                for metric in report.metrics
            },
            anomalies_count=len(report.anomalies),
            recommendations=report.recommendations,
            generated_at=report.generated_at.isoformat()
        )
        
    except Exception as e:
        logger.error(f"质量评估失败: {e}")
        raise HTTPException(status_code=500, detail=f"质量评估失败: {str(e)}")

@router.get("/reports/{session_id}", response_model=List[QualityReportResponse])
@require_permissions("view_quality_reports")
async def get_quality_reports(
    session_id: str,
    limit: int = Query(default=10, ge=1, le=100),
    current_user: User = Depends(get_current_user)
):
    """获取会话的质量报告"""
    try:
        # 这里需要从数据库获取历史报告
        # 暂时返回空列表，实际实现需要查询数据库
        reports = []
        
        return reports
        
    except Exception as e:
        logger.error(f"获取质量报告失败: {e}")
        raise HTTPException(status_code=500, detail="获取质量报告失败")

@router.get("/metrics/{session_id}", response_model=List[QualityMetricResponse])
@require_permissions("view_quality_metrics")
async def get_quality_metrics(
    session_id: str,
    metric_names: Optional[str] = Query(default=None, description="逗号分隔的指标名称"),
    start_time: Optional[datetime] = Query(default=None),
    end_time: Optional[datetime] = Query(default=None),
    current_user: User = Depends(get_current_user)
):
    """获取质量指标"""
    try:
        from database.connection import get_db
        from services.intelligent_quality_control import QualityControlRecord
        
        async with get_db() as db:
            query = db.query(QualityControlRecord).filter(
                QualityControlRecord.session_id == session_id
            )
            
            if metric_names:
                metric_list = [name.strip() for name in metric_names.split(",")]
                query = query.filter(QualityControlRecord.metric_name.in_(metric_list))
            
            if start_time:
                query = query.filter(QualityControlRecord.created_at >= start_time)
            
            if end_time:
                query = query.filter(QualityControlRecord.created_at <= end_time)
            
            records = await query.order_by(QualityControlRecord.created_at.desc()).all()
            
            return [
                QualityMetricResponse(
                    metric_name=record.metric_name,
                    value=record.metric_value,
                    threshold=record.threshold_value,
                    status=record.status,
                    timestamp=record.created_at.isoformat(),
                    details=record.details
                )
                for record in records
            ]
            
    except Exception as e:
        logger.error(f"获取质量指标失败: {e}")
        raise HTTPException(status_code=500, detail="获取质量指标失败")

@router.get("/anomalies", response_model=List[QualityAnomalyResponse])
@require_permissions("view_quality_anomalies")
async def get_quality_anomalies(
    session_id: Optional[str] = Query(default=None),
    anomaly_type: Optional[AnomalyType] = Query(default=None),
    severity: Optional[QualityLevel] = Query(default=None),
    resolution_status: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    current_user: User = Depends(get_current_user)
):
    """获取质量异常"""
    try:
        from database.connection import get_db
        from services.intelligent_quality_control import QualityAnomalyRecord
        
        async with get_db() as db:
            query = db.query(QualityAnomalyRecord)
            
            if session_id:
                query = query.filter(QualityAnomalyRecord.session_id == session_id)
            
            if anomaly_type:
                query = query.filter(QualityAnomalyRecord.anomaly_type == anomaly_type.value)
            
            if severity:
                query = query.filter(QualityAnomalyRecord.severity == severity.value)
            
            if resolution_status:
                query = query.filter(QualityAnomalyRecord.resolution_status == resolution_status)
            
            records = await query.order_by(
                QualityAnomalyRecord.detection_time.desc()
            ).limit(limit).all()
            
            return [
                QualityAnomalyResponse(
                    anomaly_id=record.id,
                    type=record.anomaly_type,
                    severity=record.severity,
                    description=record.description,
                    affected_items=record.affected_items or [],
                    detection_time=record.detection_time.isoformat(),
                    confidence=record.confidence,
                    suggested_actions=record.suggested_actions or [],
                    resolution_status=record.resolution_status,
                    metadata=record.metadata
                )
                for record in records
            ]
            
    except Exception as e:
        logger.error(f"获取质量异常失败: {e}")
        raise HTTPException(status_code=500, detail="获取质量异常失败")

@router.post("/anomalies/{anomaly_id}/resolve")
@require_permissions("resolve_anomalies")
async def resolve_anomaly(
    anomaly_id: str,
    request: AnomalyResolutionRequest,
    current_user: User = Depends(get_current_user)
):
    """解决质量异常"""
    try:
        from database.connection import get_db
        from services.intelligent_quality_control import QualityAnomalyRecord
        
        async with get_db() as db:
            record = await db.get(QualityAnomalyRecord, anomaly_id)
            if not record:
                raise HTTPException(status_code=404, detail="异常记录不存在")
            
            record.resolution_status = "resolved"
            record.resolved_at = datetime.utcnow()
            
            # 更新元数据
            if not record.metadata:
                record.metadata = {}
            record.metadata.update({
                "resolution_action": request.resolution_action.value,
                "resolution_notes": request.resolution_notes,
                "resolved_by": current_user.username,
                "resolved_at": datetime.utcnow().isoformat()
            })
            
            await db.commit()
            
            return {"message": "异常已解决", "anomaly_id": anomaly_id}
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"解决异常失败: {e}")
        raise HTTPException(status_code=500, detail="解决异常失败")

@router.get("/dashboard", response_model=QualityDashboardResponse)
@require_permissions("view_quality_dashboard")
async def get_quality_dashboard(
    days: int = Query(default=7, ge=1, le=30, description="统计天数"),
    current_user: User = Depends(get_current_user)
):
    """获取质量控制仪表板数据"""
    try:
        from database.connection import get_db
        from services.intelligent_quality_control import QualityControlRecord, QualityAnomalyRecord
        from sqlalchemy import func, and_
        
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(days=days)
        
        async with get_db() as db:
            # 统计摘要
            total_sessions = await db.query(func.count(func.distinct(QualityControlRecord.session_id))).filter(
                QualityControlRecord.created_at >= start_time
            ).scalar() or 0
            
            total_anomalies = await db.query(func.count(QualityAnomalyRecord.id)).filter(
                QualityAnomalyRecord.detection_time >= start_time
            ).scalar() or 0
            
            active_anomalies_count = await db.query(func.count(QualityAnomalyRecord.id)).filter(
                and_(
                    QualityAnomalyRecord.detection_time >= start_time,
                    QualityAnomalyRecord.resolution_status == "pending"
                )
            ).scalar() or 0
            
            # 质量等级分布
            quality_distribution = {}
            for level in ["excellent", "good", "fair", "poor", "critical"]:
                count = await db.query(func.count(QualityControlRecord.id)).filter(
                    and_(
                        QualityControlRecord.created_at >= start_time,
                        QualityControlRecord.status == level
                    )
                ).scalar() or 0
                quality_distribution[level] = count
            
            # 最近的异常（活跃的）
            active_anomalies = await db.query(QualityAnomalyRecord).filter(
                and_(
                    QualityAnomalyRecord.detection_time >= start_time,
                    QualityAnomalyRecord.resolution_status == "pending"
                )
            ).order_by(QualityAnomalyRecord.detection_time.desc()).limit(10).all()
            
            # 质量趋势（按天）
            quality_trends = {"accuracy": [], "consistency": [], "response_time": [], "error_rate": []}
            
            for i in range(days):
                day_start = start_time + timedelta(days=i)
                day_end = day_start + timedelta(days=1)
                
                for metric_name in quality_trends.keys():
                    avg_value = await db.query(func.avg(QualityControlRecord.metric_value)).filter(
                        and_(
                            QualityControlRecord.created_at >= day_start,
                            QualityControlRecord.created_at < day_end,
                            QualityControlRecord.metric_name == metric_name
                        )
                    ).scalar()
                    
                    quality_trends[metric_name].append(avg_value or 0)
            
            return QualityDashboardResponse(
                summary={
                    "total_sessions": total_sessions,
                    "total_anomalies": total_anomalies,
                    "active_anomalies": active_anomalies_count,
                    "quality_distribution": quality_distribution,
                    "period_days": days
                },
                recent_reports=[],  # 暂时为空，需要实现报告存储
                active_anomalies=[
                    QualityAnomalyResponse(
                        anomaly_id=record.id,
                        type=record.anomaly_type,
                        severity=record.severity,
                        description=record.description,
                        affected_items=record.affected_items or [],
                        detection_time=record.detection_time.isoformat(),
                        confidence=record.confidence,
                        suggested_actions=record.suggested_actions or [],
                        resolution_status=record.resolution_status,
                        metadata=record.metadata
                    )
                    for record in active_anomalies
                ],
                quality_trends=quality_trends
            )
            
    except Exception as e:
        logger.error(f"获取质量仪表板失败: {e}")
        raise HTTPException(status_code=500, detail="获取质量仪表板失败")

@router.put("/thresholds")
@require_permissions("manage_quality_thresholds")
async def update_quality_thresholds(
    request: QualityThresholdUpdateRequest,
    current_user: User = Depends(get_current_user)
):
    """更新质量阈值"""
    try:
        # 更新质量控制器的阈值
        if request.metric_name in quality_controller.quality_thresholds:
            quality_controller.quality_thresholds[request.metric_name].update(request.thresholds)
            
            # 这里可以添加阈值变更日志
            logger.info(f"用户 {current_user.username} 更新了质量阈值: {request.metric_name}")
            
            return {
                "message": "质量阈值已更新",
                "metric_name": request.metric_name,
                "new_thresholds": request.thresholds
            }
        else:
            raise HTTPException(status_code=400, detail=f"未知的指标名称: {request.metric_name}")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"更新质量阈值失败: {e}")
        raise HTTPException(status_code=500, detail="更新质量阈值失败")

@router.get("/thresholds")
@require_permissions("view_quality_thresholds")
async def get_quality_thresholds(current_user: User = Depends(get_current_user)):
    """获取当前质量阈值"""
    try:
        return {
            "thresholds": quality_controller.quality_thresholds,
            "last_updated": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"获取质量阈值失败: {e}")
        raise HTTPException(status_code=500, detail="获取质量阈值失败")

@router.get("/statistics")
@require_permissions("view_quality_statistics")
async def get_quality_statistics(
    start_date: Optional[datetime] = Query(default=None),
    end_date: Optional[datetime] = Query(default=None),
    current_user: User = Depends(get_current_user)
):
    """获取质量统计信息"""
    try:
        from database.connection import get_db
        from services.intelligent_quality_control import QualityControlRecord, QualityAnomalyRecord
        from sqlalchemy import func, and_
        
        if not start_date:
            start_date = datetime.utcnow() - timedelta(days=30)
        if not end_date:
            end_date = datetime.utcnow()
        
        async with get_db() as db:
            # 指标统计
            metrics_stats = {}
            for metric_name in ["accuracy", "consistency", "response_time", "error_rate", "confidence", "distribution"]:
                stats = await db.query(
                    func.count(QualityControlRecord.id).label('count'),
                    func.avg(QualityControlRecord.metric_value).label('avg'),
                    func.min(QualityControlRecord.metric_value).label('min'),
                    func.max(QualityControlRecord.metric_value).label('max'),
                    func.stddev(QualityControlRecord.metric_value).label('stddev')
                ).filter(
                    and_(
                        QualityControlRecord.metric_name == metric_name,
                        QualityControlRecord.created_at >= start_date,
                        QualityControlRecord.created_at <= end_date
                    )
                ).first()
                
                metrics_stats[metric_name] = {
                    "count": stats.count or 0,
                    "average": float(stats.avg or 0),
                    "minimum": float(stats.min or 0),
                    "maximum": float(stats.max or 0),
                    "std_deviation": float(stats.stddev or 0)
                }
            
            # 异常统计
            anomaly_stats = {}
            for anomaly_type in AnomalyType:
                count = await db.query(func.count(QualityAnomalyRecord.id)).filter(
                    and_(
                        QualityAnomalyRecord.anomaly_type == anomaly_type.value,
                        QualityAnomalyRecord.detection_time >= start_date,
                        QualityAnomalyRecord.detection_time <= end_date
                    )
                ).scalar() or 0
                
                anomaly_stats[anomaly_type.value] = count
            
            # 解决率统计
            total_anomalies = await db.query(func.count(QualityAnomalyRecord.id)).filter(
                and_(
                    QualityAnomalyRecord.detection_time >= start_date,
                    QualityAnomalyRecord.detection_time <= end_date
                )
            ).scalar() or 0
            
            resolved_anomalies = await db.query(func.count(QualityAnomalyRecord.id)).filter(
                and_(
                    QualityAnomalyRecord.detection_time >= start_date,
                    QualityAnomalyRecord.detection_time <= end_date,
                    QualityAnomalyRecord.resolution_status == "resolved"
                )
            ).scalar() or 0
            
            resolution_rate = (resolved_anomalies / total_anomalies * 100) if total_anomalies > 0 else 0
            
            return {
                "period": {
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat()
                },
                "metrics_statistics": metrics_stats,
                "anomaly_statistics": anomaly_stats,
                "resolution_statistics": {
                    "total_anomalies": total_anomalies,
                    "resolved_anomalies": resolved_anomalies,
                    "resolution_rate": round(resolution_rate, 2)
                }
            }
            
    except Exception as e:
        logger.error(f"获取质量统计失败: {e}")
        raise HTTPException(status_code=500, detail="获取质量统计失败")