"""
智能质量控制系统
实现自动化的质量检测、异常识别和质量保证功能
"""
import asyncio
import logging
import json
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any, Union
from dataclasses import dataclass, asdict
from enum import Enum
import torch
import torch.nn as nn
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import StandardScaler
from scipy import stats
from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, Boolean, Text
from sqlalchemy.ext.declarative import declarative_base
from db_connection import get_db
import uuid

logger = logging.getLogger(__name__)

class QualityLevel(Enum):
    EXCELLENT = "excellent"    # 优秀 (95-100)
    GOOD = "good"             # 良好 (85-94)
    FAIR = "fair"             # 一般 (70-84)
    POOR = "poor"             # 较差 (60-69)
    CRITICAL = "critical"     # 严重问题 (<60)

class AnomalyType(Enum):
    SCORE_OUTLIER = "score_outlier"           # 分数异常
    PATTERN_DEVIATION = "pattern_deviation"   # 模式偏离
    GRADER_INCONSISTENCY = "grader_inconsistency"  # 评卷员不一致
    SYSTEM_ERROR = "system_error"             # 系统错误
    DATA_QUALITY = "data_quality"             # 数据质量问题
    PERFORMANCE_DEGRADATION = "performance_degradation"  # 性能下降

class QualityControlAction(Enum):
    ALERT = "alert"                # 警报
    MANUAL_REVIEW = "manual_review"  # 人工复核
    AUTO_CORRECT = "auto_correct"    # 自动纠正
    ESCALATE = "escalate"           # 升级处理
    BLOCK = "block"                 # 阻断处理
    REPROCESS = "reprocess"         # 重新处理

@dataclass
class QualityMetric:
    metric_name: str
    value: float
    threshold: float
    status: str
    timestamp: datetime
    details: Dict[str, Any] = None

@dataclass
class QualityAnomaly:
    anomaly_id: str
    type: AnomalyType
    severity: QualityLevel
    description: str
    affected_items: List[str]
    detection_time: datetime
    confidence: float
    suggested_actions: List[QualityControlAction]
    metadata: Dict[str, Any] = None

@dataclass
class QualityReport:
    report_id: str
    assessment_period: Tuple[datetime, datetime]
    overall_quality: QualityLevel
    metrics: List[QualityMetric]
    anomalies: List[QualityAnomaly]
    recommendations: List[str]
    generated_at: datetime

Base = declarative_base()

class QualityControlRecord(Base):
    __tablename__ = "quality_control_records"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String, nullable=False)
    metric_name = Column(String, nullable=False)
    metric_value = Column(Float, nullable=False)
    threshold_value = Column(Float, nullable=False)
    status = Column(String, nullable=False)
    details = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

class QualityAnomalyRecord(Base):
    __tablename__ = "quality_anomalies"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String, nullable=False)
    anomaly_type = Column(String, nullable=False)
    severity = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    affected_items = Column(JSON)
    detection_time = Column(DateTime, default=datetime.utcnow)
    confidence = Column(Float, nullable=False)
    suggested_actions = Column(JSON)
    resolution_status = Column(String, default="pending")
    resolved_at = Column(DateTime)
    meta_data = Column(JSON)

class IntelligentQualityController:
    def __init__(self):
        self.quality_thresholds = {
            "accuracy": {"excellent": 0.95, "good": 0.85, "fair": 0.70, "poor": 0.60},
            "consistency": {"excellent": 0.90, "good": 0.80, "fair": 0.65, "poor": 0.50},
            "response_time": {"excellent": 500, "good": 1000, "fair": 2000, "poor": 3000},
            "error_rate": {"excellent": 0.01, "good": 0.03, "fair": 0.05, "poor": 0.10}
        }
        
        self.anomaly_detectors = {
            AnomalyType.SCORE_OUTLIER: self._detect_score_outliers,
            AnomalyType.PATTERN_DEVIATION: self._detect_pattern_deviations,
            AnomalyType.GRADER_INCONSISTENCY: self._detect_grader_inconsistency,
            AnomalyType.SYSTEM_ERROR: self._detect_system_errors,
            AnomalyType.DATA_QUALITY: self._detect_data_quality_issues,
            AnomalyType.PERFORMANCE_DEGRADATION: self._detect_performance_degradation
        }
        
        # 初始化机器学习模型
        self._initialize_ml_models()
    
    def _initialize_ml_models(self):
        """初始化机器学习模型"""
        # 异常检测模型
        self.anomaly_model = self._create_anomaly_detection_model()
        # 质量预测模型
        self.quality_predictor = self._create_quality_prediction_model()
        # 模式识别模型
        self.pattern_recognizer = self._create_pattern_recognition_model()
    
    def _create_anomaly_detection_model(self):
        """创建异常检测模型"""
        class AnomalyDetector(nn.Module):
            def __init__(self, input_dim=20, hidden_dim=64):
                super().__init__()
                self.encoder = nn.Sequential(
                    nn.Linear(input_dim, hidden_dim),
                    nn.ReLU(),
                    nn.Linear(hidden_dim, hidden_dim // 2),
                    nn.ReLU(),
                    nn.Linear(hidden_dim // 2, hidden_dim // 4)
                )
                self.decoder = nn.Sequential(
                    nn.Linear(hidden_dim // 4, hidden_dim // 2),
                    nn.ReLU(),
                    nn.Linear(hidden_dim // 2, hidden_dim),
                    nn.ReLU(),
                    nn.Linear(hidden_dim, input_dim)
                )
                
            def forward(self, x):
                encoded = self.encoder(x)
                decoded = self.decoder(encoded)
                return decoded
        
        return AnomalyDetector()
    
    def _create_quality_prediction_model(self):
        """创建质量预测模型"""
        class QualityPredictor(nn.Module):
            def __init__(self, input_dim=30, num_classes=5):
                super().__init__()
                self.classifier = nn.Sequential(
                    nn.Linear(input_dim, 128),
                    nn.BatchNorm1d(128),
                    nn.ReLU(),
                    nn.Dropout(0.3),
                    nn.Linear(128, 64),
                    nn.BatchNorm1d(64),
                    nn.ReLU(),
                    nn.Dropout(0.3),
                    nn.Linear(64, 32),
                    nn.ReLU(),
                    nn.Linear(32, num_classes)
                )
                
            def forward(self, x):
                return self.classifier(x)
        
        return QualityPredictor()
    
    def _create_pattern_recognition_model(self):
        """创建模式识别模型"""
        class PatternRecognizer(nn.Module):
            def __init__(self, sequence_length=50, feature_dim=10, hidden_dim=64):
                super().__init__()
                self.lstm = nn.LSTM(
                    feature_dim, hidden_dim, 
                    batch_first=True, 
                    bidirectional=True,
                    num_layers=2,
                    dropout=0.2
                )
                self.attention = nn.MultiheadAttention(
                    hidden_dim * 2, num_heads=8, dropout=0.1
                )
                self.classifier = nn.Sequential(
                    nn.Linear(hidden_dim * 2, 128),
                    nn.ReLU(),
                    nn.Dropout(0.3),
                    nn.Linear(128, 32),
                    nn.ReLU(),
                    nn.Linear(32, 8)  # 8种模式类型
                )
                
            def forward(self, x):
                lstm_out, _ = self.lstm(x)
                attended, _ = self.attention(
                    lstm_out.transpose(0, 1),
                    lstm_out.transpose(0, 1),
                    lstm_out.transpose(0, 1)
                )
                pooled = attended.mean(dim=0)
                return self.classifier(pooled)
        
        return PatternRecognizer()
    
    async def assess_quality(self, 
                           session_id: str, 
                           grading_results: List[Dict[str, Any]],
                           grader_info: Dict[str, Any] = None) -> QualityReport:
        """全面质量评估"""
        start_time = datetime.utcnow()
        
        # 1. 计算质量指标
        metrics = await self._calculate_quality_metrics(grading_results, grader_info)
        
        # 2. 检测异常
        anomalies = await self._detect_anomalies(session_id, grading_results, metrics)
        
        # 3. 确定整体质量等级
        overall_quality = self._determine_overall_quality(metrics)
        
        # 4. 生成建议
        recommendations = self._generate_recommendations(metrics, anomalies)
        
        # 5. 保存质量控制记录
        await self._save_quality_records(session_id, metrics, anomalies)
        
        end_time = datetime.utcnow()
        
        report = QualityReport(
            report_id=str(uuid.uuid4()),
            assessment_period=(start_time, end_time),
            overall_quality=overall_quality,
            metrics=metrics,
            anomalies=anomalies,
            recommendations=recommendations,
            generated_at=end_time
        )
        
        logger.info(f"质量评估完成: 会话{session_id}, 整体质量: {overall_quality.value}")
        return report
    
    async def _calculate_quality_metrics(self, 
                                       grading_results: List[Dict[str, Any]],
                                       grader_info: Dict[str, Any] = None) -> List[QualityMetric]:
        """计算质量指标"""
        metrics = []
        
        if not grading_results:
            return metrics
        
        # 1. 准确性指标
        accuracy_metric = await self._calculate_accuracy_metric(grading_results)
        metrics.append(accuracy_metric)
        
        # 2. 一致性指标
        consistency_metric = await self._calculate_consistency_metric(grading_results)
        metrics.append(consistency_metric)
        
        # 3. 响应时间指标
        response_time_metric = await self._calculate_response_time_metric(grading_results)
        metrics.append(response_time_metric)
        
        # 4. 错误率指标
        error_rate_metric = await self._calculate_error_rate_metric(grading_results)
        metrics.append(error_rate_metric)
        
        # 5. 置信度指标
        confidence_metric = await self._calculate_confidence_metric(grading_results)
        metrics.append(confidence_metric)
        
        # 6. 分数分布指标
        distribution_metric = await self._calculate_distribution_metric(grading_results)
        metrics.append(distribution_metric)
        
        return metrics
    
    async def _calculate_accuracy_metric(self, grading_results: List[Dict[str, Any]]) -> QualityMetric:
        """计算准确性指标"""
        if not grading_results:
            return QualityMetric("accuracy", 0.0, 0.8, "critical", datetime.utcnow())
        
        # 基于AI置信度和人工复核结果计算准确性
        accurate_count = 0
        total_count = len(grading_results)
        
        for result in grading_results:
            confidence = result.get("confidence", 0)
            manual_verified = result.get("manual_verified", False)
            
            # 如果有人工验证，以人工为准
            if manual_verified:
                is_accurate = result.get("verification_result", True)
            else:
                # 基于置信度判断
                is_accurate = confidence > 0.8
            
            if is_accurate:
                accurate_count += 1
        
        accuracy = accurate_count / total_count
        status = self._get_metric_status("accuracy", accuracy)
        threshold = self.quality_thresholds["accuracy"]["good"]
        
        return QualityMetric(
            "accuracy", accuracy, threshold, status, datetime.utcnow(),
            {"accurate_count": accurate_count, "total_count": total_count}
        )
    
    async def _calculate_consistency_metric(self, grading_results: List[Dict[str, Any]]) -> QualityMetric:
        """计算一致性指标"""
        if len(grading_results) < 2:
            return QualityMetric("consistency", 1.0, 0.8, "excellent", datetime.utcnow())
        
        # 计算分数的一致性（标准差）
        scores = [result.get("score", 0) for result in grading_results]
        std_dev = np.std(scores)
        mean_score = np.mean(scores)
        
        # 计算变异系数（CV）
        cv = std_dev / mean_score if mean_score > 0 else 1.0
        consistency = max(0, 1 - cv)  # CV越小，一致性越高
        
        status = self._get_metric_status("consistency", consistency)
        threshold = self.quality_thresholds["consistency"]["good"]
        
        return QualityMetric(
            "consistency", consistency, threshold, status, datetime.utcnow(),
            {"std_dev": std_dev, "mean_score": mean_score, "cv": cv}
        )
    
    async def _calculate_response_time_metric(self, grading_results: List[Dict[str, Any]]) -> QualityMetric:
        """计算响应时间指标"""
        response_times = [
            result.get("processing_time_ms", 1000) 
            for result in grading_results
        ]
        
        avg_response_time = np.mean(response_times)
        status = self._get_metric_status_reverse("response_time", avg_response_time)
        threshold = self.quality_thresholds["response_time"]["good"]
        
        return QualityMetric(
            "response_time", avg_response_time, threshold, status, datetime.utcnow(),
            {"avg_time": avg_response_time, "max_time": max(response_times), 
             "min_time": min(response_times)}
        )
    
    async def _calculate_error_rate_metric(self, grading_results: List[Dict[str, Any]]) -> QualityMetric:
        """计算错误率指标"""
        error_count = sum(1 for result in grading_results if result.get("has_error", False))
        total_count = len(grading_results)
        error_rate = error_count / total_count if total_count > 0 else 0
        
        status = self._get_metric_status_reverse("error_rate", error_rate)
        threshold = self.quality_thresholds["error_rate"]["good"]
        
        return QualityMetric(
            "error_rate", error_rate, threshold, status, datetime.utcnow(),
            {"error_count": error_count, "total_count": total_count}
        )
    
    async def _calculate_confidence_metric(self, grading_results: List[Dict[str, Any]]) -> QualityMetric:
        """计算置信度指标"""
        confidences = [result.get("confidence", 0.5) for result in grading_results]
        avg_confidence = np.mean(confidences)
        
        status = self._get_metric_status("accuracy", avg_confidence)  # 使用accuracy的阈值
        threshold = self.quality_thresholds["accuracy"]["good"]
        
        return QualityMetric(
            "confidence", avg_confidence, threshold, status, datetime.utcnow(),
            {"avg_confidence": avg_confidence, "min_confidence": min(confidences),
             "max_confidence": max(confidences)}
        )
    
    async def _calculate_distribution_metric(self, grading_results: List[Dict[str, Any]]) -> QualityMetric:
        """计算分数分布指标"""
        scores = [result.get("score", 0) for result in grading_results]
        
        if not scores:
            return QualityMetric("distribution", 0.0, 0.7, "critical", datetime.utcnow())
        
        # 使用Kolmogorov-Smirnov测试检查分布的正态性
        _, p_value = stats.normaltest(scores)
        normality_score = min(1.0, p_value * 10)  # 转换为0-1分数
        
        # 计算分数分布的合理性
        score_range = max(scores) - min(scores)
        expected_range = 100  # 假设满分100
        range_score = min(1.0, score_range / expected_range)
        
        distribution_score = (normality_score + range_score) / 2
        status = self._get_metric_status("consistency", distribution_score)
        threshold = self.quality_thresholds["consistency"]["fair"]
        
        return QualityMetric(
            "distribution", distribution_score, threshold, status, datetime.utcnow(),
            {
                "normality_p_value": p_value,
                "score_range": score_range,
                "mean_score": np.mean(scores),
                "std_score": np.std(scores)
            }
        )
    
    async def _detect_anomalies(self, 
                              session_id: str,
                              grading_results: List[Dict[str, Any]], 
                              metrics: List[QualityMetric]) -> List[QualityAnomaly]:
        """检测异常"""
        anomalies = []
        
        for anomaly_type, detector in self.anomaly_detectors.items():
            try:
                detected_anomalies = await detector(session_id, grading_results, metrics)
                anomalies.extend(detected_anomalies)
            except Exception as e:
                logger.error(f"异常检测失败 {anomaly_type}: {e}")
        
        # 去重和优先级排序
        anomalies = self._deduplicate_and_prioritize_anomalies(anomalies)
        
        return anomalies
    
    async def _detect_score_outliers(self, 
                                   session_id: str,
                                   grading_results: List[Dict[str, Any]], 
                                   metrics: List[QualityMetric]) -> List[QualityAnomaly]:
        """检测分数异常值"""
        scores = [result.get("score", 0) for result in grading_results]
        
        if len(scores) < 5:  # 样本太少，无法检测异常
            return []
        
        # 使用IQR方法检测异常值
        q1, q3 = np.percentile(scores, [25, 75])
        iqr = q3 - q1
        lower_bound = q1 - 1.5 * iqr
        upper_bound = q3 + 1.5 * iqr
        
        outlier_indices = [
            i for i, score in enumerate(scores) 
            if score < lower_bound or score > upper_bound
        ]
        
        if not outlier_indices:
            return []
        
        severity = QualityLevel.POOR if len(outlier_indices) > len(scores) * 0.1 else QualityLevel.FAIR
        
        return [QualityAnomaly(
            anomaly_id=str(uuid.uuid4()),
            type=AnomalyType.SCORE_OUTLIER,
            severity=severity,
            description=f"检测到{len(outlier_indices)}个分数异常值",
            affected_items=[str(i) for i in outlier_indices],
            detection_time=datetime.utcnow(),
            confidence=0.85,
            suggested_actions=[QualityControlAction.MANUAL_REVIEW],
            metadata={
                "outlier_scores": [scores[i] for i in outlier_indices],
                "bounds": {"lower": lower_bound, "upper": upper_bound},
                "total_scores": len(scores)
            }
        )]
    
    async def _detect_pattern_deviations(self, 
                                       session_id: str,
                                       grading_results: List[Dict[str, Any]], 
                                       metrics: List[QualityMetric]) -> List[QualityAnomaly]:
        """检测模式偏离"""
        if len(grading_results) < 10:
            return []
        
        # 提取时间序列特征
        timestamps = [
            result.get("timestamp", datetime.utcnow()) 
            for result in grading_results
        ]
        scores = [result.get("score", 0) for result in grading_results]
        
        # 检测趋势变化
        from scipy.stats import linregress
        time_indices = list(range(len(scores)))
        slope, _, r_value, p_value, _ = linregress(time_indices, scores)
        
        # 显著的趋势变化可能表示模式偏离
        if abs(slope) > 1.0 and p_value < 0.05:
            severity = QualityLevel.POOR if abs(slope) > 2.0 else QualityLevel.FAIR
            
            return [QualityAnomaly(
                anomaly_id=str(uuid.uuid4()),
                type=AnomalyType.PATTERN_DEVIATION,
                severity=severity,
                description=f"检测到评分趋势异常变化: 斜率{slope:.2f}",
                affected_items=[session_id],
                detection_time=datetime.utcnow(),
                confidence=min(0.95, (1 - p_value) * 0.9 + 0.05),
                suggested_actions=[QualityControlAction.ALERT, QualityControlAction.MANUAL_REVIEW],
                metadata={
                    "slope": slope,
                    "r_value": r_value,
                    "p_value": p_value,
                    "trend_direction": "increasing" if slope > 0 else "decreasing"
                }
            )]
        
        return []
    
    async def _detect_grader_inconsistency(self, 
                                         session_id: str,
                                         grading_results: List[Dict[str, Any]], 
                                         metrics: List[QualityMetric]) -> List[QualityAnomaly]:
        """检测评卷员不一致性"""
        # 根据评卷员ID分组
        grader_scores = {}
        for result in grading_results:
            grader_id = result.get("grader_id", "unknown")
            score = result.get("score", 0)
            
            if grader_id not in grader_scores:
                grader_scores[grader_id] = []
            grader_scores[grader_id].append(score)
        
        if len(grader_scores) < 2:  # 只有一个评卷员，无法比较
            return []
        
        # 计算评卷员之间的差异
        grader_means = {gid: np.mean(scores) for gid, scores in grader_scores.items()}
        mean_differences = []
        
        grader_ids = list(grader_means.keys())
        for i in range(len(grader_ids)):
            for j in range(i + 1, len(grader_ids)):
                diff = abs(grader_means[grader_ids[i]] - grader_means[grader_ids[j]])
                mean_differences.append(diff)
        
        max_diff = max(mean_differences) if mean_differences else 0
        
        # 如果最大差异超过阈值，标记为不一致
        if max_diff > 10:  # 分数差异超过10分
            severity = QualityLevel.CRITICAL if max_diff > 20 else QualityLevel.POOR
            
            return [QualityAnomaly(
                anomaly_id=str(uuid.uuid4()),
                type=AnomalyType.GRADER_INCONSISTENCY,
                severity=severity,
                description=f"评卷员评分不一致，最大差异: {max_diff:.1f}分",
                affected_items=list(grader_ids),
                detection_time=datetime.utcnow(),
                confidence=0.9,
                suggested_actions=[
                    QualityControlAction.MANUAL_REVIEW,
                    QualityControlAction.ESCALATE
                ],
                metadata={
                    "grader_means": grader_means,
                    "max_difference": max_diff,
                    "total_graders": len(grader_ids)
                }
            )]
        
        return []
    
    async def _detect_system_errors(self, 
                                  session_id: str,
                                  grading_results: List[Dict[str, Any]], 
                                  metrics: List[QualityMetric]) -> List[QualityAnomaly]:
        """检测系统错误"""
        error_results = [
            result for result in grading_results 
            if result.get("has_error", False) or result.get("error_code")
        ]
        
        if not error_results:
            return []
        
        error_rate = len(error_results) / len(grading_results)
        
        if error_rate > 0.05:  # 错误率超过5%
            severity = QualityLevel.CRITICAL if error_rate > 0.15 else QualityLevel.POOR
            
            # 统计错误类型
            error_types = {}
            for result in error_results:
                error_code = result.get("error_code", "unknown")
                error_types[error_code] = error_types.get(error_code, 0) + 1
            
            return [QualityAnomaly(
                anomaly_id=str(uuid.uuid4()),
                type=AnomalyType.SYSTEM_ERROR,
                severity=severity,
                description=f"系统错误率过高: {error_rate:.1%}",
                affected_items=[session_id],
                detection_time=datetime.utcnow(),
                confidence=0.95,
                suggested_actions=[
                    QualityControlAction.ALERT,
                    QualityControlAction.ESCALATE,
                    QualityControlAction.REPROCESS
                ],
                metadata={
                    "error_rate": error_rate,
                    "error_count": len(error_results),
                    "total_count": len(grading_results),
                    "error_types": error_types
                }
            )]
        
        return []
    
    async def _detect_data_quality_issues(self, 
                                        session_id: str,
                                        grading_results: List[Dict[str, Any]], 
                                        metrics: List[QualityMetric]) -> List[QualityAnomaly]:
        """检测数据质量问题"""
        issues = []
        
        # 检查缺失数据
        missing_scores = sum(1 for result in grading_results if not result.get("score"))
        missing_rate = missing_scores / len(grading_results) if grading_results else 0
        
        if missing_rate > 0.02:  # 缺失率超过2%
            issues.append({
                "type": "missing_scores",
                "count": missing_scores,
                "rate": missing_rate
            })
        
        # 检查无效数据
        invalid_scores = sum(
            1 for result in grading_results 
            if result.get("score") and (result["score"] < 0 or result["score"] > 100)
        )
        invalid_rate = invalid_scores / len(grading_results) if grading_results else 0
        
        if invalid_rate > 0.01:  # 无效率超过1%
            issues.append({
                "type": "invalid_scores", 
                "count": invalid_scores,
                "rate": invalid_rate
            })
        
        if issues:
            total_issue_rate = sum(issue["rate"] for issue in issues)
            severity = QualityLevel.CRITICAL if total_issue_rate > 0.1 else QualityLevel.POOR
            
            return [QualityAnomaly(
                anomaly_id=str(uuid.uuid4()),
                type=AnomalyType.DATA_QUALITY,
                severity=severity,
                description=f"数据质量问题: {len(issues)}类问题",
                affected_items=[session_id],
                detection_time=datetime.utcnow(),
                confidence=0.9,
                suggested_actions=[
                    QualityControlAction.AUTO_CORRECT,
                    QualityControlAction.REPROCESS
                ],
                metadata={"issues": issues, "total_issue_rate": total_issue_rate}
            )]
        
        return []
    
    async def _detect_performance_degradation(self, 
                                            session_id: str,
                                            grading_results: List[Dict[str, Any]], 
                                            metrics: List[QualityMetric]) -> List[QualityAnomaly]:
        """检测性能下降"""
        # 检查响应时间趋势
        response_times = [
            result.get("processing_time_ms", 1000) 
            for result in grading_results
        ]
        
        if len(response_times) < 10:
            return []
        
        # 比较前半部分和后半部分的响应时间
        mid_point = len(response_times) // 2
        early_times = response_times[:mid_point]
        recent_times = response_times[mid_point:]
        
        early_avg = np.mean(early_times)
        recent_avg = np.mean(recent_times)
        
        # 如果最近的响应时间比早期增加了50%以上
        if recent_avg > early_avg * 1.5:
            degradation_percent = ((recent_avg - early_avg) / early_avg) * 100
            severity = QualityLevel.CRITICAL if degradation_percent > 100 else QualityLevel.POOR
            
            return [QualityAnomaly(
                anomaly_id=str(uuid.uuid4()),
                type=AnomalyType.PERFORMANCE_DEGRADATION,
                severity=severity,
                description=f"性能下降 {degradation_percent:.1f}%",
                affected_items=[session_id],
                detection_time=datetime.utcnow(),
                confidence=0.8,
                suggested_actions=[
                    QualityControlAction.ALERT,
                    QualityControlAction.ESCALATE
                ],
                metadata={
                    "early_avg_time": early_avg,
                    "recent_avg_time": recent_avg,
                    "degradation_percent": degradation_percent
                }
            )]
        
        return []
    
    def _get_metric_status(self, metric_name: str, value: float) -> str:
        """获取指标状态"""
        thresholds = self.quality_thresholds.get(metric_name, {})
        
        if value >= thresholds.get("excellent", 0.95):
            return "excellent"
        elif value >= thresholds.get("good", 0.85):
            return "good"
        elif value >= thresholds.get("fair", 0.70):
            return "fair"
        elif value >= thresholds.get("poor", 0.60):
            return "poor"
        else:
            return "critical"
    
    def _get_metric_status_reverse(self, metric_name: str, value: float) -> str:
        """获取反向指标状态（值越小越好）"""
        thresholds = self.quality_thresholds.get(metric_name, {})
        
        if value <= thresholds.get("excellent", 0.01):
            return "excellent"
        elif value <= thresholds.get("good", 0.03):
            return "good"
        elif value <= thresholds.get("fair", 0.05):
            return "fair"
        elif value <= thresholds.get("poor", 0.10):
            return "poor"
        else:
            return "critical"
    
    def _determine_overall_quality(self, metrics: List[QualityMetric]) -> QualityLevel:
        """确定整体质量等级"""
        if not metrics:
            return QualityLevel.CRITICAL
        
        status_counts = {"excellent": 0, "good": 0, "fair": 0, "poor": 0, "critical": 0}
        for metric in metrics:
            status_counts[metric.status] += 1
        
        total_metrics = len(metrics)
        
        # 如果有超过20%的指标是critical，整体为critical
        if status_counts["critical"] / total_metrics > 0.2:
            return QualityLevel.CRITICAL
        # 如果有超过30%的指标是poor或更差，整体为poor
        elif (status_counts["poor"] + status_counts["critical"]) / total_metrics > 0.3:
            return QualityLevel.POOR
        # 如果有超过50%的指标是fair或更差，整体为fair
        elif (status_counts["fair"] + status_counts["poor"] + status_counts["critical"]) / total_metrics > 0.5:
            return QualityLevel.FAIR
        # 如果有超过70%的指标是good或更好，整体为good
        elif (status_counts["excellent"] + status_counts["good"]) / total_metrics > 0.7:
            return QualityLevel.GOOD
        else:
            return QualityLevel.EXCELLENT
    
    def _generate_recommendations(self, 
                                metrics: List[QualityMetric], 
                                anomalies: List[QualityAnomaly]) -> List[str]:
        """生成改进建议"""
        recommendations = []
        
        # 基于指标生成建议
        for metric in metrics:
            if metric.status in ["poor", "critical"]:
                if metric.metric_name == "accuracy":
                    recommendations.append("建议增加人工复核比例，优化AI模型参数")
                elif metric.metric_name == "consistency":
                    recommendations.append("建议统一评分标准，加强评卷员培训")
                elif metric.metric_name == "response_time":
                    recommendations.append("建议优化系统性能，增加服务器资源")
                elif metric.metric_name == "error_rate":
                    recommendations.append("建议检查系统稳定性，修复已知bug")
        
        # 基于异常生成建议
        for anomaly in anomalies:
            if anomaly.type == AnomalyType.GRADER_INCONSISTENCY:
                recommendations.append("建议对评卷员进行一致性培训，建立评分校准机制")
            elif anomaly.type == AnomalyType.SYSTEM_ERROR:
                recommendations.append("建议立即检查系统状态，修复关键错误")
            elif anomaly.type == AnomalyType.PERFORMANCE_DEGRADATION:
                recommendations.append("建议监控系统资源使用情况，考虑扩容")
        
        # 去重
        recommendations = list(set(recommendations))
        
        # 如果没有具体建议，给出通用建议
        if not recommendations:
            recommendations.append("当前质量状况良好，建议继续保持现有水平")
        
        return recommendations
    
    def _deduplicate_and_prioritize_anomalies(self, 
                                            anomalies: List[QualityAnomaly]) -> List[QualityAnomaly]:
        """异常去重和优先级排序"""
        # 按照严重程度排序
        severity_order = {
            QualityLevel.CRITICAL: 0,
            QualityLevel.POOR: 1,
            QualityLevel.FAIR: 2,
            QualityLevel.GOOD: 3,
            QualityLevel.EXCELLENT: 4
        }
        
        # 去重（基于类型和描述）
        seen = set()
        unique_anomalies = []
        for anomaly in anomalies:
            key = (anomaly.type, anomaly.description)
            if key not in seen:
                seen.add(key)
                unique_anomalies.append(anomaly)
        
        # 排序
        unique_anomalies.sort(
            key=lambda x: (severity_order[x.severity], -x.confidence)
        )
        
        return unique_anomalies
    
    async def _save_quality_records(self, 
                                  session_id: str,
                                  metrics: List[QualityMetric], 
                                  anomalies: List[QualityAnomaly]):
        """保存质量控制记录"""
        try:
            async with get_db() as db:
                # 保存指标记录
                for metric in metrics:
                    record = QualityControlRecord(
                        session_id=session_id,
                        metric_name=metric.metric_name,
                        metric_value=metric.value,
                        threshold_value=metric.threshold,
                        status=metric.status,
                        details=metric.details
                    )
                    db.add(record)
                
                # 保存异常记录
                for anomaly in anomalies:
                    record = QualityAnomalyRecord(
                        session_id=session_id,
                        anomaly_type=anomaly.type.value,
                        severity=anomaly.severity.value,
                        description=anomaly.description,
                        affected_items=anomaly.affected_items,
                        confidence=anomaly.confidence,
                        suggested_actions=[action.value for action in anomaly.suggested_actions],
                        metadata=anomaly.metadata
                    )
                    db.add(record)
                
                await db.commit()
                logger.info(f"质量控制记录已保存: 会话{session_id}")
                
        except Exception as e:
            logger.error(f"保存质量控制记录失败: {e}")

# 全局质量控制器实例
quality_controller = IntelligentQualityController()