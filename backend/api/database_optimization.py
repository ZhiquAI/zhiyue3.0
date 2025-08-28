"""
数据库优化API
提供数据库性能分析、索引优化、查询优化等RESTful接口
"""

import logging
from typing import Dict, List, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from database.performance_analyzer import DatabasePerformanceAnalyzer, get_db_analyzer
from database.index_optimizer import DatabaseIndexOptimizer, get_index_optimizer
from database.query_optimizer import QueryOptimizer, get_query_optimizer
from database.monitoring import DatabaseMonitor
from database.connection_pool import get_optimized_pool, monitor_connection_pools
from services.auth_service import get_current_user
from config.database import create_database_engine as get_db_engine

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/database", tags=["数据库优化"])

# 全局优化器实例
_db_monitor = None
_index_optimizer = None
_query_optimizer = None

async def get_database_monitor() -> DatabaseMonitor:
    """获取数据库监控器"""
    global _db_monitor
    if _db_monitor is None:
        engine = get_db_engine()
        _db_monitor = DatabaseMonitor(str(engine.url))
        _db_monitor.start()
    return _db_monitor

def get_db_index_optimizer() -> DatabaseIndexOptimizer:
    """获取索引优化器"""
    global _index_optimizer
    if _index_optimizer is None:
        engine = get_db_engine()
        _index_optimizer = get_index_optimizer(engine)
    return _index_optimizer

async def get_db_query_optimizer() -> QueryOptimizer:
    """获取查询优化器"""
    global _query_optimizer
    if _query_optimizer is None:
        engine = get_db_engine()
        _query_optimizer = get_query_optimizer(engine)
    return _query_optimizer

@router.get("/health")
async def database_health_check():
    """数据库健康检查"""
    try:
        monitor = await get_database_monitor()
        health_report = monitor.generate_health_report()
        
        return {
            "status": "success",
            "data": health_report,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")

@router.get("/metrics")
async def get_database_metrics(
    hours: int = Query(1, ge=1, le=24, description="获取最近几小时的指标"),
    current_user: dict = Depends(get_current_user)
):
    """获取数据库指标"""
    try:
        monitor = await get_database_monitor()
        metrics_history = monitor.get_metrics_history(hours=hours)
        current_metrics = monitor.get_current_metrics()
        
        return {
            "status": "success",
            "data": {
                "current_metrics": current_metrics.to_dict(),
                "history": metrics_history,
                "monitoring_status": monitor.get_monitoring_status()
            }
        }
    except Exception as e:
        logger.error(f"Failed to get database metrics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get metrics: {str(e)}")

@router.get("/performance/analyze")
async def analyze_database_performance(
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """分析数据库性能"""
    try:
        # 获取性能分析器
        analyzer = get_db_analyzer()
        
        # 后台执行性能分析
        def run_analysis():
            try:
                # 生成性能报告
                report = analyzer.generate_performance_report()
                
                logger.info("Database performance analysis completed")
            except Exception as e:
                logger.error(f"Performance analysis failed: {e}")
        
        background_tasks.add_task(run_analysis)
        
        return {
            "status": "success",
            "message": "Performance analysis started in background",
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to start performance analysis: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@router.get("/performance/report")
async def get_performance_report(current_user: dict = Depends(get_current_user)):
    """获取性能分析报告"""
    try:
        analyzer = get_db_analyzer()
        report = analyzer.generate_performance_report()
        
        return {
            "status": "success",
            "data": {
                "report": report.to_dict(),
                "timestamp": datetime.utcnow().isoformat()
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get performance report: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get report: {str(e)}")

@router.post("/performance/export")
async def export_performance_report(
    output_format: str = Query("json", regex="^(json|csv)$"),
    current_user: dict = Depends(get_current_user)
):
    """导出性能分析报告"""
    try:
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        filename = f"db_performance_report_{timestamp}.{output_format}"
        output_path = f"/tmp/{filename}"
        
        await db_analyzer.export_analysis_report(output_path)
        
        return {
            "status": "success",
            "data": {
                "filename": filename,
                "path": output_path,
                "format": output_format
            },
            "message": f"Report exported to {output_path}"
        }
    except Exception as e:
        logger.error(f"Failed to export performance report: {e}")
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")

@router.get("/indexes/analyze")
async def analyze_indexes(current_user: dict = Depends(get_current_user)):
    """分析索引使用情况"""
    try:
        optimizer = get_db_index_optimizer()
        
        # 分析现有索引
        existing_indexes = await optimizer.analyze_existing_indexes()
        
        # 生成索引建议
        recommendations = await optimizer.generate_index_recommendations()
        
        # 生成删除建议
        removal_recommendations = await optimizer.generate_removal_recommendations()
        
        return {
            "status": "success",
            "data": {
                "existing_indexes": existing_indexes,
                "recommendations": [rec.__dict__ for rec in recommendations],
                "removal_recommendations": removal_recommendations,
                "summary": {
                    "total_existing_indexes": sum(len(indexes) for indexes in existing_indexes.values()),
                    "optimization_recommendations": len(recommendations),
                    "removal_recommendations": len(removal_recommendations)
                }
            }
        }
    except Exception as e:
        logger.error(f"Index analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"Index analysis failed: {str(e)}")

@router.post("/indexes/optimize")
async def optimize_indexes(
    dry_run: bool = Query(True, description="是否为模拟运行"),
    max_indexes: int = Query(10, ge=1, le=50, description="最大创建索引数量"),
    current_user: dict = Depends(get_current_user)
):
    """优化索引"""
    try:
        optimizer = get_db_index_optimizer()
        
        # 分析查询模式（这里使用模拟数据）
        sample_queries = [
            {"sql": "SELECT * FROM exams WHERE status = 'active' ORDER BY created_at DESC", "duration": 0.5},
            {"sql": "SELECT * FROM answer_sheets WHERE exam_id = ? AND grading_status = 'pending'", "duration": 0.8},
            {"sql": "SELECT COUNT(*) FROM students WHERE class_name = ?", "duration": 0.3}
        ]
        
        await optimizer.analyze_query_patterns(sample_queries)
        
        # 生成索引建议
        recommendations = await optimizer.generate_index_recommendations()
        
        # 应用前N个建议
        selected_recommendations = recommendations[:max_indexes]
        
        applied_statements = await optimizer.apply_recommendations(selected_recommendations, dry_run=dry_run)
        
        return {
            "status": "success",
            "data": {
                "dry_run": dry_run,
                "total_recommendations": len(recommendations),
                "applied_recommendations": len(applied_statements),
                "applied_statements": applied_statements,
                "skipped_recommendations": max(0, len(recommendations) - max_indexes)
            },
            "message": f"{'Simulated' if dry_run else 'Applied'} {len(applied_statements)} index optimizations"
        }
    except Exception as e:
        logger.error(f"Index optimization failed: {e}")
        raise HTTPException(status_code=500, detail=f"Index optimization failed: {str(e)}")

@router.get("/queries/analyze")
async def analyze_queries(current_user: dict = Depends(get_current_user)):
    """分析查询性能"""
    try:
        optimizer = await get_db_query_optimizer()
        
        # 生成查询优化报告
        report = optimizer.generate_optimization_report()
        
        return {
            "status": "success",
            "data": report
        }
    except Exception as e:
        logger.error(f"Query analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"Query analysis failed: {str(e)}")

@router.get("/queries/slow")
async def get_slow_queries(
    threshold: float = Query(0.5, ge=0.1, le=10.0, description="慢查询阈值（秒）"),
    limit: int = Query(20, ge=1, le=100, description="返回数量限制"),
    current_user: dict = Depends(get_current_user)
):
    """获取慢查询列表"""
    try:
        optimizer = await get_db_query_optimizer()
        
        slow_queries = optimizer.get_slow_queries(threshold=threshold)
        
        # 按平均执行时间排序并限制数量
        slow_queries.sort(key=lambda x: x.avg_duration, reverse=True)
        slow_queries = slow_queries[:limit]
        
        return {
            "status": "success",
            "data": {
                "threshold_seconds": threshold,
                "total_slow_queries": len(slow_queries),
                "queries": [query.to_dict() for query in slow_queries]
            }
        }
    except Exception as e:
        logger.error(f"Failed to get slow queries: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get slow queries: {str(e)}")

@router.post("/queries/optimize")
async def optimize_query(
    query_data: Dict[str, Any],
    current_user: dict = Depends(get_current_user)
):
    """优化指定查询"""
    try:
        sql = query_data.get("sql")
        if not sql:
            raise HTTPException(status_code=400, detail="SQL query is required")
        
        optimizer = await get_db_query_optimizer()
        
        # 分析并优化查询
        optimizations = optimizer.optimize_query(sql)
        
        # 选择最佳优化建议
        applicable_optimizations = [opt for opt in optimizations if opt.applicable]
        
        return {
            "status": "success",
            "data": {
                "original_query": sql,
                "optimizations": [opt.__dict__ for opt in optimizations],
                "applicable_optimizations": len(applicable_optimizations),
                "best_optimization": applicable_optimizations[0].__dict__ if applicable_optimizations else None
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Query optimization failed: {e}")
        raise HTTPException(status_code=500, detail=f"Query optimization failed: {str(e)}")

@router.get("/connection-pool/status")
async def get_connection_pool_status(current_user: dict = Depends(get_current_user)):
    """获取连接池状态"""
    try:
        pool_status = monitor_connection_pools()
        
        return {
            "status": "success",
            "data": pool_status
        }
    except Exception as e:
        logger.error(f"Failed to get connection pool status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get pool status: {str(e)}")

@router.post("/connection-pool/optimize")
async def optimize_connection_pool(current_user: dict = Depends(get_current_user)):
    """优化连接池配置"""
    try:
        engine = get_db_engine()
        pool = get_optimized_pool(str(engine.url))
        
        optimization_result = pool.optimize_pool_size()
        
        return {
            "status": "success",
            "data": optimization_result,
            "message": "Connection pool optimization completed"
        }
    except Exception as e:
        logger.error(f"Connection pool optimization failed: {e}")
        raise HTTPException(status_code=500, detail=f"Pool optimization failed: {str(e)}")

@router.get("/alerts")
async def get_database_alerts(
    active_only: bool = Query(True, description="仅显示活跃告警"),
    current_user: dict = Depends(get_current_user)
):
    """获取数据库告警"""
    try:
        monitor = await get_database_monitor()
        
        if active_only:
            alerts = monitor.alert_manager.get_active_alerts()
        else:
            alerts = monitor.alert_manager.get_alert_history(hours=24)
        
        return {
            "status": "success",
            "data": {
                "alerts": [alert.to_dict() for alert in alerts],
                "total_alerts": len(alerts),
                "active_only": active_only
            }
        }
    except Exception as e:
        logger.error(f"Failed to get database alerts: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get alerts: {str(e)}")

@router.post("/alerts/{rule_name}/configure")
async def configure_alert_rule(
    rule_name: str,
    rule_config: Dict[str, Any],
    current_user: dict = Depends(get_current_user)
):
    """配置告警规则"""
    try:
        from ..database.monitoring import AlertRule
        
        monitor = await get_database_monitor()
        
        # 创建新的告警规则
        alert_rule = AlertRule(
            name=rule_name,
            metric_name=rule_config.get("metric_name"),
            operator=rule_config.get("operator", ">="),
            threshold=float(rule_config.get("threshold")),
            duration_seconds=int(rule_config.get("duration_seconds", 60)),
            severity=rule_config.get("severity", "warning"),
            enabled=rule_config.get("enabled", True)
        )
        
        monitor.add_alert_rule(alert_rule)
        
        return {
            "status": "success",
            "message": f"Alert rule '{rule_name}' configured successfully",
            "data": alert_rule.__dict__
        }
    except Exception as e:
        logger.error(f"Failed to configure alert rule: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to configure alert rule: {str(e)}")

@router.get("/dashboard")
async def get_database_dashboard(current_user: dict = Depends(get_current_user)):
    """获取数据库监控仪表盘数据"""
    try:
        monitor = await get_database_monitor()
        
        # 获取仪表盘数据
        dashboard_data = monitor.get_monitoring_status()
        
        # 添加额外的统计信息
        health_report = monitor.generate_health_report()
        connection_status = monitor_connection_pools()
        
        dashboard_data.update({
            "health_report": health_report,
            "connection_pools": connection_status,
            "optimization_summary": {
                "last_analysis": "未执行" if not hasattr(db_analyzer, 'analysis_results') else "已执行",
                "total_recommendations": len(db_analyzer.analysis_results.get('recommendations', {})) if hasattr(db_analyzer, 'analysis_results') else 0
            }
        })
        
        return {
            "status": "success",
            "data": dashboard_data
        }
    except Exception as e:
        logger.error(f"Failed to get dashboard data: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get dashboard data: {str(e)}")

@router.post("/maintenance/vacuum")
async def run_database_vacuum(
    background_tasks: BackgroundTasks,
    table_name: Optional[str] = Query(None, description="指定表名，留空则清理所有表"),
    current_user: dict = Depends(get_current_user)
):
    """执行数据库清理（VACUUM）"""
    try:
        def run_vacuum():
            try:
                engine = get_db_engine()
                with Session(engine) as session:
                    if 'postgresql' in str(engine.url):
                        if table_name:
                            session.execute(f"VACUUM ANALYZE {table_name}")
                        else:
                            session.execute("VACUUM ANALYZE")
                    elif 'sqlite' in str(engine.url):
                        session.execute("VACUUM")
                    
                    session.commit()
                    logger.info(f"Database vacuum completed for {'all tables' if not table_name else table_name}")
            except Exception as e:
                logger.error(f"Database vacuum failed: {e}")
        
        background_tasks.add_task(run_vacuum)
        
        return {
            "status": "success",
            "message": f"Database vacuum started for {'all tables' if not table_name else table_name}",
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to start database vacuum: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start vacuum: {str(e)}")

@router.get("/statistics/summary")
async def get_database_statistics(current_user: dict = Depends(get_current_user)):
    """获取数据库统计摘要"""
    try:
        engine = get_db_engine()
        
        with Session(engine) as session:
            # 获取主要表的统计信息
            tables = ['exams', 'answer_sheets', 'students', 'users', 'grading_tasks']
            statistics = {}
            
            for table in tables:
                try:
                    count_result = session.execute(f"SELECT COUNT(*) FROM {table}")
                    count = count_result.scalar()
                    statistics[table] = {
                        'row_count': count,
                        'table_name': table
                    }
                except Exception as e:
                    logger.warning(f"Failed to get statistics for table {table}: {e}")
                    statistics[table] = {
                        'row_count': 0,
                        'table_name': table,
                        'error': str(e)
                    }
            
            # 获取数据库大小
            try:
                if 'postgresql' in str(engine.url):
                    size_result = session.execute("SELECT pg_size_pretty(pg_database_size(current_database()))")
                    database_size = size_result.scalar()
                elif 'sqlite' in str(engine.url):
                    import os
                    db_path = str(engine.url).replace('sqlite:///', '')
                    if os.path.exists(db_path):
                        size_bytes = os.path.getsize(db_path)
                        database_size = f"{size_bytes / (1024*1024):.2f} MB"
                    else:
                        database_size = "Unknown"
                else:
                    database_size = "Unknown"
            except Exception as e:
                logger.warning(f"Failed to get database size: {e}")
                database_size = "Unknown"
        
        return {
            "status": "success",
            "data": {
                "database_size": database_size,
                "table_statistics": statistics,
                "total_records": sum(stat['row_count'] for stat in statistics.values()),
                "timestamp": datetime.utcnow().isoformat()
            }
        }
    except Exception as e:
        logger.error(f"Failed to get database statistics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get statistics: {str(e)}")