"""
自适应阅卷流程系统
基于AI学习和质量反馈动态调整阅卷策略和流程
"""
import asyncio
import logging
import json
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any, Callable
from dataclasses import dataclass, asdict
from enum import Enum
import torch
import torch.nn as nn
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, Boolean, Text
from sqlalchemy.ext.declarative import declarative_base
from database.connection import get_db
import uuid

logger = logging.getLogger(__name__)

class WorkflowStage(Enum):
    PREPROCESSING = "preprocessing"
    AI_GRADING = "ai_grading"
    QUALITY_CHECK = "quality_check"
    HUMAN_REVIEW = "human_review"
    FINAL_VALIDATION = "final_validation"
    POSTPROCESSING = "postprocessing"

class AdaptationStrategy(Enum):
    CONSERVATIVE = "conservative"     # 保守策略：更多人工干预
    BALANCED = "balanced"            # 平衡策略：AI和人工结合
    AGGRESSIVE = "aggressive"        # 激进策略：更多AI自动化
    CUSTOM = "custom"               # 自定义策略

class GradingMode(Enum):
    FULL_AUTO = "full_auto"         # 全自动
    AI_ASSISTED = "ai_assisted"     # AI辅助
    HYBRID = "hybrid"               # 混合模式
    MANUAL_DOMINANT = "manual_dominant"  # 人工主导

class PerformanceMetric(Enum):
    THROUGHPUT = "throughput"       # 吞吐量
    ACCURACY = "accuracy"           # 准确性
    CONSISTENCY = "consistency"     # 一致性
    EFFICIENCY = "efficiency"       # 效率
    QUALITY = "quality"            # 质量

@dataclass
class WorkflowRule:
    rule_id: str
    condition: Dict[str, Any]      # 触发条件
    action: Dict[str, Any]         # 执行动作
    priority: int                  # 优先级
    enabled: bool = True
    
@dataclass
class AdaptationContext:
    session_id: str
    historical_performance: Dict[str, float]
    current_metrics: Dict[str, float]
    workload_characteristics: Dict[str, Any]
    user_preferences: Dict[str, Any]
    system_constraints: Dict[str, Any]

@dataclass
class WorkflowConfiguration:
    config_id: str
    stages: List[Dict[str, Any]]   # 工作流阶段配置
    rules: List[WorkflowRule]      # 适应规则
    strategy: AdaptationStrategy
    mode: GradingMode
    parameters: Dict[str, Any]
    created_at: datetime
    performance_score: float = 0.0

Base = declarative_base()

class WorkflowSession(Base):
    __tablename__ = "workflow_sessions"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_name = Column(String, nullable=False)
    configuration_id = Column(String, nullable=False)
    strategy = Column(String, nullable=False)
    mode = Column(String, nullable=False)
    status = Column(String, nullable=False)
    total_items = Column(Integer, default=0)
    processed_items = Column(Integer, default=0)
    performance_metrics = Column(JSON)
    adaptation_history = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
    
class AdaptationEvent(Base):
    __tablename__ = "adaptation_events"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String, nullable=False)
    trigger_condition = Column(JSON, nullable=False)
    adaptation_action = Column(JSON, nullable=False)
    performance_before = Column(JSON)
    performance_after = Column(JSON)
    adaptation_timestamp = Column(DateTime, default=datetime.utcnow)
    effectiveness_score = Column(Float)

class AdaptiveGradingWorkflow:
    def __init__(self):
        self.adaptation_rules = []
        self.performance_predictors = {}
        self.workflow_templates = {}
        self.active_sessions = {}
        
        # 初始化机器学习组件
        self._initialize_ml_components()
        
        # 加载默认规则和模板
        self._load_default_configurations()
    
    def _initialize_ml_components(self):
        """初始化机器学习组件"""
        # 性能预测器
        self.performance_predictor = self._create_performance_predictor()
        # 工作流优化器
        self.workflow_optimizer = self._create_workflow_optimizer()
        # 适应策略生成器
        self.strategy_generator = self._create_strategy_generator()
    
    def _create_performance_predictor(self):
        """创建性能预测模型"""
        class PerformancePredictor(nn.Module):
            def __init__(self, input_dim=25, hidden_dim=128):
                super().__init__()
                self.predictor = nn.Sequential(
                    nn.Linear(input_dim, hidden_dim),
                    nn.BatchNorm1d(hidden_dim),
                    nn.ReLU(),
                    nn.Dropout(0.3),
                    nn.Linear(hidden_dim, hidden_dim // 2),
                    nn.BatchNorm1d(hidden_dim // 2),
                    nn.ReLU(),
                    nn.Dropout(0.3),
                    nn.Linear(hidden_dim // 2, 32),
                    nn.ReLU(),
                    nn.Linear(32, 5)  # 5个性能指标
                )
                
            def forward(self, x):
                return self.predictor(x)
        
        return PerformancePredictor()
    
    def _create_workflow_optimizer(self):
        """创建工作流优化器"""
        class WorkflowOptimizer(nn.Module):
            def __init__(self, context_dim=30, action_dim=20):
                super().__init__()
                # 价值网络
                self.value_network = nn.Sequential(
                    nn.Linear(context_dim, 256),
                    nn.ReLU(),
                    nn.Linear(256, 128),
                    nn.ReLU(),
                    nn.Linear(128, 64),
                    nn.ReLU(),
                    nn.Linear(64, 1)
                )
                
                # 策略网络
                self.policy_network = nn.Sequential(
                    nn.Linear(context_dim, 256),
                    nn.ReLU(),
                    nn.Linear(256, 128),
                    nn.ReLU(),
                    nn.Linear(128, action_dim),
                    nn.Softmax(dim=1)
                )
                
            def forward(self, context):
                value = self.value_network(context)
                policy = self.policy_network(context)
                return value, policy
        
        return WorkflowOptimizer()
    
    def _create_strategy_generator(self):
        """创建策略生成器"""
        class StrategyGenerator(nn.Module):
            def __init__(self, feature_dim=40, strategy_dim=15):
                super().__init__()
                # 编码器
                self.encoder = nn.Sequential(
                    nn.Linear(feature_dim, 128),
                    nn.ReLU(),
                    nn.Linear(128, 64),
                    nn.ReLU(),
                    nn.Linear(64, 32)
                )
                
                # 策略解码器
                self.strategy_decoder = nn.Sequential(
                    nn.Linear(32, 64),
                    nn.ReLU(),
                    nn.Linear(64, strategy_dim),
                    nn.Sigmoid()
                )
                
                # 参数解码器
                self.param_decoder = nn.Sequential(
                    nn.Linear(32, 64),
                    nn.ReLU(),
                    nn.Linear(64, 20),
                    nn.Sigmoid()
                )
                
            def forward(self, features):
                encoded = self.encoder(features)
                strategy = self.strategy_decoder(encoded)
                parameters = self.param_decoder(encoded)
                return strategy, parameters
        
        return StrategyGenerator()
    
    def _load_default_configurations(self):
        """加载默认配置"""
        # 默认工作流模板
        self.workflow_templates = {
            "standard": {
                "stages": [
                    {"name": "preprocessing", "ai_threshold": 0.9, "manual_review": False},
                    {"name": "ai_grading", "confidence_threshold": 0.8, "batch_size": 50},
                    {"name": "quality_check", "sample_rate": 0.1, "anomaly_threshold": 0.05},
                    {"name": "human_review", "trigger_conditions": ["low_confidence", "anomaly_detected"]},
                    {"name": "final_validation", "validation_rate": 0.02}
                ],
                "performance_targets": {
                    "throughput": 100,  # items/hour
                    "accuracy": 0.95,
                    "consistency": 0.90
                }
            },
            "high_accuracy": {
                "stages": [
                    {"name": "preprocessing", "ai_threshold": 0.95, "manual_review": True},
                    {"name": "ai_grading", "confidence_threshold": 0.9, "batch_size": 30},
                    {"name": "quality_check", "sample_rate": 0.2, "anomaly_threshold": 0.03},
                    {"name": "human_review", "trigger_conditions": ["any_uncertainty"]},
                    {"name": "final_validation", "validation_rate": 0.05}
                ],
                "performance_targets": {
                    "throughput": 60,
                    "accuracy": 0.98,
                    "consistency": 0.95
                }
            },
            "high_throughput": {
                "stages": [
                    {"name": "preprocessing", "ai_threshold": 0.8, "manual_review": False},
                    {"name": "ai_grading", "confidence_threshold": 0.7, "batch_size": 100},
                    {"name": "quality_check", "sample_rate": 0.05, "anomaly_threshold": 0.1},
                    {"name": "human_review", "trigger_conditions": ["critical_errors_only"]},
                    {"name": "final_validation", "validation_rate": 0.01}
                ],
                "performance_targets": {
                    "throughput": 200,
                    "accuracy": 0.90,
                    "consistency": 0.85
                }
            }
        }
        
        # 默认适应规则
        self.adaptation_rules = [
            WorkflowRule(
                rule_id="accuracy_drop",
                condition={"metric": "accuracy", "operator": "<", "threshold": 0.9},
                action={"type": "increase_human_review", "parameter": "review_rate", "adjustment": 0.1},
                priority=1
            ),
            WorkflowRule(
                rule_id="throughput_low",
                condition={"metric": "throughput", "operator": "<", "threshold": 80},
                action={"type": "increase_batch_size", "parameter": "batch_size", "adjustment": 1.2},
                priority=2
            ),
            WorkflowRule(
                rule_id="error_spike",
                condition={"metric": "error_rate", "operator": ">", "threshold": 0.1},
                action={"type": "trigger_manual_review", "parameter": "all_uncertain_items"},
                priority=1
            ),
            WorkflowRule(
                rule_id="performance_stable",
                condition={"metric": "stability", "operator": ">", "threshold": 0.95},
                action={"type": "optimize_efficiency", "parameter": "reduce_redundancy"},
                priority=3
            )
        ]
    
    async def create_adaptive_session(self, 
                                    session_name: str,
                                    items: List[Dict[str, Any]],
                                    requirements: Dict[str, Any] = None) -> str:
        """创建自适应阅卷会话"""
        session_id = str(uuid.uuid4())
        
        # 分析工作负载特征
        workload_characteristics = self._analyze_workload(items)
        
        # 生成初始配置
        initial_config = await self._generate_initial_configuration(
            workload_characteristics, requirements
        )
        
        # 创建会话记录
        async with get_db() as db:
            session = WorkflowSession(
                id=session_id,
                session_name=session_name,
                configuration_id=initial_config.config_id,
                strategy=initial_config.strategy.value,
                mode=initial_config.mode.value,
                status="active",
                total_items=len(items),
                performance_metrics={},
                adaptation_history=[]
            )
            db.add(session)
            await db.commit()
        
        # 缓存活跃会话
        self.active_sessions[session_id] = {
            "config": initial_config,
            "items": items,
            "processed_count": 0,
            "performance_history": [],
            "adaptation_count": 0
        }
        
        logger.info(f"创建自适应阅卷会话: {session_id}, 策略: {initial_config.strategy.value}")
        return session_id
    
    def _analyze_workload(self, items: List[Dict[str, Any]]) -> Dict[str, Any]:
        """分析工作负载特征"""
        characteristics = {
            "total_items": len(items),
            "item_complexity": self._estimate_complexity(items),
            "subject_distribution": self._analyze_subjects(items),
            "difficulty_distribution": self._analyze_difficulty(items),
            "estimated_processing_time": self._estimate_processing_time(items)
        }
        
        return characteristics
    
    def _estimate_complexity(self, items: List[Dict[str, Any]]) -> Dict[str, float]:
        """估算题目复杂度"""
        complexities = []
        
        for item in items:
            # 基于题目类型、字数、图片数量等估算复杂度
            complexity = 1.0
            
            # 题目类型影响
            question_type = item.get("question_type", "unknown")
            type_complexity = {
                "multiple_choice": 0.5,
                "fill_in_blank": 0.7,
                "short_answer": 1.0,
                "essay": 1.5,
                "calculation": 1.2,
                "diagram": 1.3
            }
            complexity *= type_complexity.get(question_type, 1.0)
            
            # 内容长度影响
            content_length = len(item.get("content", ""))
            if content_length > 500:
                complexity *= 1.2
            elif content_length > 200:
                complexity *= 1.1
            
            # 图片数量影响
            image_count = len(item.get("images", []))
            complexity *= (1 + image_count * 0.1)
            
            complexities.append(complexity)
        
        return {
            "average": np.mean(complexities),
            "std": np.std(complexities),
            "max": np.max(complexities),
            "min": np.min(complexities)
        }
    
    def _analyze_subjects(self, items: List[Dict[str, Any]]) -> Dict[str, int]:
        """分析学科分布"""
        subjects = {}
        for item in items:
            subject = item.get("subject", "unknown")
            subjects[subject] = subjects.get(subject, 0) + 1
        return subjects
    
    def _analyze_difficulty(self, items: List[Dict[str, Any]]) -> Dict[str, float]:
        """分析难度分布"""
        difficulties = [item.get("difficulty", 0.5) for item in items]
        
        return {
            "average": np.mean(difficulties),
            "std": np.std(difficulties),
            "distribution": {
                "easy": sum(1 for d in difficulties if d < 0.3) / len(difficulties),
                "medium": sum(1 for d in difficulties if 0.3 <= d < 0.7) / len(difficulties),
                "hard": sum(1 for d in difficulties if d >= 0.7) / len(difficulties)
            }
        }
    
    def _estimate_processing_time(self, items: List[Dict[str, Any]]) -> Dict[str, float]:
        """估算处理时间"""
        base_time_per_item = 30  # 秒
        
        total_estimated_time = 0
        for item in items:
            item_time = base_time_per_item
            
            # 根据复杂度调整
            question_type = item.get("question_type", "unknown")
            type_multiplier = {
                "multiple_choice": 0.5,
                "fill_in_blank": 0.7,
                "short_answer": 1.0,
                "essay": 2.0,
                "calculation": 1.5,
                "diagram": 1.8
            }
            item_time *= type_multiplier.get(question_type, 1.0)
            
            total_estimated_time += item_time
        
        return {
            "total_seconds": total_estimated_time,
            "total_hours": total_estimated_time / 3600,
            "average_per_item": total_estimated_time / len(items)
        }
    
    async def _generate_initial_configuration(self, 
                                            workload_characteristics: Dict[str, Any],
                                            requirements: Dict[str, Any] = None) -> WorkflowConfiguration:
        """生成初始工作流配置"""
        requirements = requirements or {}
        
        # 选择基础模板
        template_name = self._select_template(workload_characteristics, requirements)
        base_template = self.workflow_templates[template_name]
        
        # 根据工作负载特征调整配置
        adjusted_config = self._adjust_configuration(base_template, workload_characteristics)
        
        # 确定策略和模式
        strategy = self._determine_strategy(workload_characteristics, requirements)
        mode = self._determine_mode(strategy, workload_characteristics)
        
        config = WorkflowConfiguration(
            config_id=str(uuid.uuid4()),
            stages=adjusted_config["stages"],
            rules=self.adaptation_rules.copy(),
            strategy=strategy,
            mode=mode,
            parameters=adjusted_config.get("parameters", {}),
            created_at=datetime.utcnow()
        )
        
        return config
    
    def _select_template(self, 
                        workload_characteristics: Dict[str, Any],
                        requirements: Dict[str, Any]) -> str:
        """选择工作流模板"""
        # 优先级：用户要求 > 工作负载特征
        
        if requirements.get("priority") == "accuracy":
            return "high_accuracy"
        elif requirements.get("priority") == "speed":
            return "high_throughput"
        
        # 基于工作负载特征自动选择
        complexity = workload_characteristics["item_complexity"]["average"]
        total_items = workload_characteristics["total_items"]
        
        if complexity > 1.3 or total_items < 100:
            return "high_accuracy"
        elif total_items > 1000 and complexity < 0.8:
            return "high_throughput"
        else:
            return "standard"
    
    def _adjust_configuration(self, 
                            base_template: Dict[str, Any],
                            workload_characteristics: Dict[str, Any]) -> Dict[str, Any]:
        """根据工作负载调整配置"""
        config = base_template.copy()
        
        complexity = workload_characteristics["item_complexity"]["average"]
        total_items = workload_characteristics["total_items"]
        
        # 调整AI置信度阈值
        for stage in config["stages"]:
            if stage["name"] == "ai_grading":
                if complexity > 1.2:
                    stage["confidence_threshold"] *= 1.1  # 提高阈值
                elif complexity < 0.8:
                    stage["confidence_threshold"] *= 0.9  # 降低阈值
            
            elif stage["name"] == "quality_check":
                if complexity > 1.2:
                    stage["sample_rate"] *= 1.5  # 增加抽样率
                elif total_items > 1000:
                    stage["sample_rate"] *= 0.8  # 减少抽样率
        
        return config
    
    def _determine_strategy(self, 
                          workload_characteristics: Dict[str, Any],
                          requirements: Dict[str, Any]) -> AdaptationStrategy:
        """确定适应策略"""
        if requirements.get("strategy"):
            return AdaptationStrategy(requirements["strategy"])
        
        complexity = workload_characteristics["item_complexity"]["average"]
        
        if complexity > 1.3:
            return AdaptationStrategy.CONSERVATIVE
        elif complexity < 0.7:
            return AdaptationStrategy.AGGRESSIVE
        else:
            return AdaptationStrategy.BALANCED
    
    def _determine_mode(self, 
                       strategy: AdaptationStrategy,
                       workload_characteristics: Dict[str, Any]) -> GradingMode:
        """确定阅卷模式"""
        if strategy == AdaptationStrategy.AGGRESSIVE:
            return GradingMode.FULL_AUTO
        elif strategy == AdaptationStrategy.CONSERVATIVE:
            return GradingMode.MANUAL_DOMINANT
        else:
            return GradingMode.HYBRID
    
    async def process_item(self, 
                          session_id: str, 
                          item: Dict[str, Any]) -> Dict[str, Any]:
        """处理单个项目"""
        if session_id not in self.active_sessions:
            raise ValueError(f"会话不存在: {session_id}")
        
        session_data = self.active_sessions[session_id]
        config = session_data["config"]
        
        # 执行工作流阶段
        result = await self._execute_workflow_stages(config, item)
        
        # 更新处理计数
        session_data["processed_count"] += 1
        
        # 记录性能指标
        await self._record_performance_metrics(session_id, result)
        
        # 检查是否需要适应
        await self._check_adaptation_triggers(session_id)
        
        return result
    
    async def _execute_workflow_stages(self, 
                                     config: WorkflowConfiguration,
                                     item: Dict[str, Any]) -> Dict[str, Any]:
        """执行工作流阶段"""
        result = {
            "item_id": item.get("id"),
            "stages_executed": [],
            "final_score": None,
            "confidence": 0.0,
            "processing_time": 0.0,
            "human_involvement": False
        }
        
        start_time = datetime.utcnow()
        
        for stage_config in config.stages:
            stage_name = stage_config["name"]
            stage_result = await self._execute_stage(stage_name, stage_config, item, result)
            
            result["stages_executed"].append({
                "stage": stage_name,
                "result": stage_result,
                "timestamp": datetime.utcnow().isoformat()
            })
            
            # 检查是否需要跳转到其他阶段
            if stage_result.get("skip_remaining"):
                break
            
            # 检查是否需要人工干预
            if stage_result.get("requires_human_review"):
                result["human_involvement"] = True
                # 这里可以触发人工审核流程
        
        end_time = datetime.utcnow()
        result["processing_time"] = (end_time - start_time).total_seconds()
        
        return result
    
    async def _execute_stage(self, 
                           stage_name: str,
                           stage_config: Dict[str, Any],
                           item: Dict[str, Any],
                           current_result: Dict[str, Any]) -> Dict[str, Any]:
        """执行单个工作流阶段"""
        stage_result = {"stage": stage_name, "success": True}
        
        if stage_name == "preprocessing":
            stage_result.update(await self._preprocessing_stage(stage_config, item))
        
        elif stage_name == "ai_grading":
            stage_result.update(await self._ai_grading_stage(stage_config, item))
            current_result["final_score"] = stage_result.get("score")
            current_result["confidence"] = stage_result.get("confidence", 0.0)
        
        elif stage_name == "quality_check":
            stage_result.update(await self._quality_check_stage(stage_config, current_result))
        
        elif stage_name == "human_review":
            stage_result.update(await self._human_review_stage(stage_config, current_result))
        
        elif stage_name == "final_validation":
            stage_result.update(await self._final_validation_stage(stage_config, current_result))
        
        return stage_result
    
    async def _preprocessing_stage(self, 
                                 config: Dict[str, Any], 
                                 item: Dict[str, Any]) -> Dict[str, Any]:
        """预处理阶段"""
        # 模拟预处理逻辑
        return {
            "preprocessed": True,
            "quality_score": 0.95,
            "ready_for_grading": True
        }
    
    async def _ai_grading_stage(self, 
                              config: Dict[str, Any], 
                              item: Dict[str, Any]) -> Dict[str, Any]:
        """AI阅卷阶段"""
        # 模拟AI阅卷
        confidence_threshold = config.get("confidence_threshold", 0.8)
        
        # 模拟AI评分
        score = np.random.normal(85, 10)  # 模拟分数
        confidence = np.random.beta(8, 2)  # 模拟置信度
        
        return {
            "score": max(0, min(100, score)),
            "confidence": confidence,
            "requires_human_review": confidence < confidence_threshold,
            "ai_model_used": "multimodal_grading_engine_v1"
        }
    
    async def _quality_check_stage(self, 
                                 config: Dict[str, Any], 
                                 current_result: Dict[str, Any]) -> Dict[str, Any]:
        """质量检查阶段"""
        sample_rate = config.get("sample_rate", 0.1)
        
        # 随机抽样进行质量检查
        should_check = np.random.random() < sample_rate
        
        if should_check:
            # 模拟质量检查
            quality_score = np.random.beta(9, 1)
            anomaly_detected = quality_score < config.get("anomaly_threshold", 0.05)
            
            return {
                "quality_checked": True,
                "quality_score": quality_score,
                "anomaly_detected": anomaly_detected,
                "requires_human_review": anomaly_detected
            }
        
        return {"quality_checked": False}
    
    async def _human_review_stage(self, 
                                config: Dict[str, Any], 
                                current_result: Dict[str, Any]) -> Dict[str, Any]:
        """人工复核阶段"""
        # 检查触发条件
        trigger_conditions = config.get("trigger_conditions", [])
        should_review = False
        
        for condition in trigger_conditions:
            if condition == "low_confidence" and current_result["confidence"] < 0.8:
                should_review = True
            elif condition == "anomaly_detected":
                for stage in current_result["stages_executed"]:
                    if stage["result"].get("anomaly_detected"):
                        should_review = True
            elif condition == "any_uncertainty":
                should_review = True
        
        if should_review:
            # 模拟人工复核
            return {
                "human_reviewed": True,
                "review_score": current_result["final_score"] + np.random.normal(0, 2),
                "reviewer_confidence": 0.95,
                "review_time": np.random.exponential(300)  # 秒
            }
        
        return {"human_reviewed": False}
    
    async def _final_validation_stage(self, 
                                    config: Dict[str, Any], 
                                    current_result: Dict[str, Any]) -> Dict[str, Any]:
        """最终验证阶段"""
        validation_rate = config.get("validation_rate", 0.02)
        
        if np.random.random() < validation_rate:
            return {
                "validated": True,
                "validation_passed": True,
                "final_quality_score": 0.98
            }
        
        return {"validated": False}
    
    async def _record_performance_metrics(self, 
                                        session_id: str, 
                                        result: Dict[str, Any]):
        """记录性能指标"""
        session_data = self.active_sessions[session_id]
        
        # 计算当前指标
        current_metrics = {
            "processing_time": result["processing_time"],
            "confidence": result["confidence"],
            "human_involvement": 1.0 if result["human_involvement"] else 0.0,
            "stages_count": len(result["stages_executed"])
        }
        
        # 添加到历史记录
        session_data["performance_history"].append({
            "timestamp": datetime.utcnow().isoformat(),
            "metrics": current_metrics,
            "processed_count": session_data["processed_count"]
        })
        
        # 保持历史记录在合理范围内
        if len(session_data["performance_history"]) > 1000:
            session_data["performance_history"] = session_data["performance_history"][-500:]
    
    async def _check_adaptation_triggers(self, session_id: str):
        """检查适应触发条件"""
        session_data = self.active_sessions[session_id]
        config = session_data["config"]
        
        # 每处理100个项目检查一次
        if session_data["processed_count"] % 100 != 0:
            return
        
        # 计算最近的性能指标
        recent_performance = self._calculate_recent_performance(session_data["performance_history"])
        
        # 检查每个适应规则
        for rule in config.rules:
            if not rule.enabled:
                continue
                
            if self._evaluate_rule_condition(rule.condition, recent_performance):
                await self._execute_adaptation_action(session_id, rule)
    
    def _calculate_recent_performance(self, 
                                    performance_history: List[Dict[str, Any]]) -> Dict[str, float]:
        """计算最近的性能指标"""
        if not performance_history:
            return {}
        
        # 取最近50个记录
        recent_records = performance_history[-50:]
        
        metrics = {}
        for metric_name in ["processing_time", "confidence", "human_involvement", "stages_count"]:
            values = [record["metrics"].get(metric_name, 0) for record in recent_records]
            if values:
                metrics[metric_name] = {
                    "mean": np.mean(values),
                    "std": np.std(values),
                    "trend": self._calculate_trend(values)
                }
        
        # 计算综合指标
        if "processing_time" in metrics and "confidence" in metrics:
            efficiency = metrics["confidence"]["mean"] / max(metrics["processing_time"]["mean"], 1)
            metrics["efficiency"] = {"mean": efficiency}
        
        return metrics
    
    def _calculate_trend(self, values: List[float]) -> float:
        """计算趋势（正值表示上升，负值表示下降）"""
        if len(values) < 2:
            return 0.0
        
        x = np.arange(len(values))
        slope = np.polyfit(x, values, 1)[0]
        return slope
    
    def _evaluate_rule_condition(self, 
                                condition: Dict[str, Any], 
                                performance: Dict[str, float]) -> bool:
        """评估规则条件"""
        metric_name = condition.get("metric")
        operator = condition.get("operator")
        threshold = condition.get("threshold")
        
        if metric_name not in performance:
            return False
        
        current_value = performance[metric_name].get("mean", 0)
        
        if operator == "<":
            return current_value < threshold
        elif operator == ">":
            return current_value > threshold
        elif operator == "<=":
            return current_value <= threshold
        elif operator == ">=":
            return current_value >= threshold
        elif operator == "==":
            return abs(current_value - threshold) < 0.01
        
        return False
    
    async def _execute_adaptation_action(self, 
                                       session_id: str, 
                                       rule: WorkflowRule):
        """执行适应动作"""
        session_data = self.active_sessions[session_id]
        config = session_data["config"]
        action = rule.action
        
        logger.info(f"执行适应动作: {action['type']} (会话: {session_id})")
        
        adaptation_applied = False
        
        if action["type"] == "increase_human_review":
            # 增加人工复核比例
            for stage in config.stages:
                if stage["name"] == "human_review":
                    # 降低触发阈值
                    if "confidence_threshold" in stage:
                        stage["confidence_threshold"] *= (1 - action.get("adjustment", 0.1))
                        adaptation_applied = True
        
        elif action["type"] == "increase_batch_size":
            # 增加批处理大小
            for stage in config.stages:
                if stage["name"] == "ai_grading" and "batch_size" in stage:
                    stage["batch_size"] = int(stage["batch_size"] * action.get("adjustment", 1.2))
                    adaptation_applied = True
        
        elif action["type"] == "trigger_manual_review":
            # 触发人工复核
            for stage in config.stages:
                if stage["name"] == "human_review":
                    stage["trigger_conditions"] = ["any_uncertainty"]
                    adaptation_applied = True
        
        elif action["type"] == "optimize_efficiency":
            # 优化效率
            for stage in config.stages:
                if stage["name"] == "quality_check":
                    stage["sample_rate"] *= 0.8  # 减少抽样
                    adaptation_applied = True
        
        if adaptation_applied:
            # 记录适应事件
            await self._record_adaptation_event(session_id, rule, action)
            session_data["adaptation_count"] += 1
    
    async def _record_adaptation_event(self, 
                                     session_id: str, 
                                     rule: WorkflowRule, 
                                     action: Dict[str, Any]):
        """记录适应事件"""
        async with get_db() as db:
            event = AdaptationEvent(
                session_id=session_id,
                trigger_condition=rule.condition,
                adaptation_action=action,
                performance_before=self._get_current_performance(session_id),
                adaptation_timestamp=datetime.utcnow()
            )
            db.add(event)
            await db.commit()
    
    def _get_current_performance(self, session_id: str) -> Dict[str, Any]:
        """获取当前性能状态"""
        session_data = self.active_sessions[session_id]
        return self._calculate_recent_performance(session_data["performance_history"])
    
    async def get_session_status(self, session_id: str) -> Dict[str, Any]:
        """获取会话状态"""
        if session_id not in self.active_sessions:
            # 从数据库查询
            async with get_db() as db:
                session = await db.get(WorkflowSession, session_id)
                if not session:
                    raise ValueError(f"会话不存在: {session_id}")
                
                return {
                    "session_id": session.id,
                    "name": session.session_name,
                    "status": session.status,
                    "progress": session.processed_items / session.total_items if session.total_items > 0 else 0,
                    "performance_metrics": session.performance_metrics,
                    "adaptation_history": session.adaptation_history
                }
        
        session_data = self.active_sessions[session_id]
        recent_performance = self._calculate_recent_performance(session_data["performance_history"])
        
        return {
            "session_id": session_id,
            "status": "active",
            "total_items": len(session_data["items"]),
            "processed_items": session_data["processed_count"],
            "progress": session_data["processed_count"] / len(session_data["items"]),
            "current_configuration": asdict(session_data["config"]),
            "recent_performance": recent_performance,
            "adaptation_count": session_data["adaptation_count"]
        }
    
    async def complete_session(self, session_id: str):
        """完成会话"""
        if session_id in self.active_sessions:
            session_data = self.active_sessions[session_id]
            
            # 计算最终性能指标
            final_performance = self._calculate_recent_performance(session_data["performance_history"])
            
            # 更新数据库
            async with get_db() as db:
                session = await db.get(WorkflowSession, session_id)
                if session:
                    session.status = "completed"
                    session.completed_at = datetime.utcnow()
                    session.processed_items = session_data["processed_count"]
                    session.performance_metrics = final_performance
                    await db.commit()
            
            # 从活跃会话中移除
            del self.active_sessions[session_id]
            
            logger.info(f"会话完成: {session_id}")

# 全局自适应工作流实例
adaptive_workflow = AdaptiveGradingWorkflow()