"""
AI模型注册和版本管理系统
提供模型的注册、版本控制、部署和监控功能
"""
import asyncio
import logging
import json
import hashlib
import shutil
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, asdict
from enum import Enum
import torch
import pickle
import boto3
from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, Boolean, Text
from sqlalchemy.ext.declarative import declarative_base
from db_connection import get_db
import uuid
import semantic_version
from contextlib import asynccontextmanager
import aiofiles

logger = logging.getLogger(__name__)

class ModelStatus(Enum):
    REGISTERED = "registered"
    TRAINING = "training"
    READY = "ready"
    DEPLOYED = "deployed"
    DEPRECATED = "deprecated"
    ARCHIVED = "archived"
    FAILED = "failed"

class DeploymentEnvironment(Enum):
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"
    A_B_TESTING = "ab_testing"

@dataclass
class ModelMetadata:
    name: str
    version: str
    model_type: str
    description: str
    author: str
    created_at: datetime
    framework: str = "pytorch"
    model_size_mb: float = 0.0
    input_schema: Dict[str, Any] = None
    output_schema: Dict[str, Any] = None
    performance_metrics: Dict[str, float] = None
    training_config: Dict[str, Any] = None
    dependencies: List[str] = None
    tags: List[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

@dataclass
class DeploymentConfig:
    environment: DeploymentEnvironment
    replicas: int = 1
    cpu_limit: str = "1000m"
    memory_limit: str = "2Gi"
    gpu_enabled: bool = False
    auto_scaling: bool = True
    health_check_path: str = "/health"
    environment_vars: Dict[str, str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

Base = declarative_base()

class ModelRegistry(Base):
    __tablename__ = "model_registry"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    version = Column(String, nullable=False)
    model_type = Column(String, nullable=False)
    status = Column(String, nullable=False)
    description = Column(Text)
    author = Column(String, nullable=False)
    framework = Column(String, default="pytorch")
    model_path = Column(String)
    model_size_mb = Column(Float)
    model_hash = Column(String)
    input_schema = Column(JSON)
    output_schema = Column(JSON)
    performance_metrics = Column(JSON)
    training_config = Column(JSON)
    dependencies = Column(JSON)
    tags = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = Column(Boolean, default=True)

class ModelDeployment(Base):
    __tablename__ = "model_deployments"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    model_id = Column(String, nullable=False)
    environment = Column(String, nullable=False)
    deployment_config = Column(JSON)
    endpoint_url = Column(String)
    status = Column(String, nullable=False)
    deployed_at = Column(DateTime)
    health_status = Column(String, default="unknown")
    last_health_check = Column(DateTime)
    request_count = Column(Integer, default=0)
    avg_response_time_ms = Column(Float, default=0.0)
    error_rate = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class AIModelRegistry:
    def __init__(self, 
                 storage_path: str = "models/registry/",
                 remote_storage_config: Dict[str, str] = None):
        self.storage_path = Path(storage_path)
        self.storage_path.mkdir(parents=True, exist_ok=True)
        
        self.remote_storage = None
        if remote_storage_config:
            self.remote_storage = boto3.client('s3', **remote_storage_config)
        
        self.deployed_models = {}  # 内存中的已部署模型缓存
    
    async def register_model(self, 
                           metadata: ModelMetadata, 
                           model_path: str,
                           upload_to_remote: bool = True) -> str:
        """注册新模型"""
        try:
            # 验证版本格式
            semantic_version.Version(metadata.version)
            
            # 计算模型文件哈希
            model_hash = await self._calculate_file_hash(model_path)
            model_size = (Path(model_path).stat().st_size / 1024 / 1024)  # MB
            
            # 检查是否已存在相同版本
            async with get_db() as db:
                existing = await db.query(ModelRegistry).filter(
                    ModelRegistry.name == metadata.name,
                    ModelRegistry.version == metadata.version
                ).first()
                
                if existing:
                    raise ValueError(f"模型 {metadata.name} 版本 {metadata.version} 已存在")
            
            # 创建存储目录
            model_storage_path = self.storage_path / metadata.name / metadata.version
            model_storage_path.mkdir(parents=True, exist_ok=True)
            
            # 复制模型文件
            local_model_path = model_storage_path / "model.pt"
            shutil.copy2(model_path, local_model_path)
            
            # 保存元数据
            metadata_path = model_storage_path / "metadata.json"
            async with aiofiles.open(metadata_path, 'w') as f:
                await f.write(json.dumps(metadata.to_dict(), indent=2, default=str))
            
            # 上传到远程存储
            if upload_to_remote and self.remote_storage:
                await self._upload_to_remote(model_storage_path, metadata.name, metadata.version)
            
            # 注册到数据库
            model_id = str(uuid.uuid4())
            async with get_db() as db:
                registry_record = ModelRegistry(
                    id=model_id,
                    name=metadata.name,
                    version=metadata.version,
                    model_type=metadata.model_type,
                    status=ModelStatus.REGISTERED.value,
                    description=metadata.description,
                    author=metadata.author,
                    framework=metadata.framework,
                    model_path=str(local_model_path),
                    model_size_mb=model_size,
                    model_hash=model_hash,
                    input_schema=metadata.input_schema,
                    output_schema=metadata.output_schema,
                    performance_metrics=metadata.performance_metrics,
                    training_config=metadata.training_config,
                    dependencies=metadata.dependencies,
                    tags=metadata.tags
                )
                db.add(registry_record)
                await db.commit()
            
            logger.info(f"模型 {metadata.name}:{metadata.version} 注册成功")
            return model_id
            
        except Exception as e:
            logger.error(f"模型注册失败: {e}")
            raise
    
    async def get_model(self, name: str, version: str = "latest") -> Optional[Dict[str, Any]]:
        """获取模型信息"""
        async with get_db() as db:
            query = db.query(ModelRegistry).filter(
                ModelRegistry.name == name,
                ModelRegistry.is_active == True
            )
            
            if version == "latest":
                # 获取最新版本
                models = await query.all()
                if not models:
                    return None
                
                latest_model = max(models, key=lambda m: semantic_version.Version(m.version))
            else:
                latest_model = await query.filter(ModelRegistry.version == version).first()
            
            if not latest_model:
                return None
            
            return {
                "id": latest_model.id,
                "name": latest_model.name,
                "version": latest_model.version,
                "model_type": latest_model.model_type,
                "status": latest_model.status,
                "description": latest_model.description,
                "author": latest_model.author,
                "framework": latest_model.framework,
                "model_path": latest_model.model_path,
                "model_size_mb": latest_model.model_size_mb,
                "model_hash": latest_model.model_hash,
                "input_schema": latest_model.input_schema,
                "output_schema": latest_model.output_schema,
                "performance_metrics": latest_model.performance_metrics,
                "training_config": latest_model.training_config,
                "dependencies": latest_model.dependencies,
                "tags": latest_model.tags,
                "created_at": latest_model.created_at,
                "updated_at": latest_model.updated_at
            }
    
    async def list_models(self, 
                         model_type: Optional[str] = None,
                         status: Optional[ModelStatus] = None,
                         tags: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        """列出所有模型"""
        async with get_db() as db:
            query = db.query(ModelRegistry).filter(ModelRegistry.is_active == True)
            
            if model_type:
                query = query.filter(ModelRegistry.model_type == model_type)
            
            if status:
                query = query.filter(ModelRegistry.status == status.value)
            
            models = await query.all()
            
            result = []
            for model in models:
                # 标签过滤
                if tags:
                    model_tags = model.tags or []
                    if not any(tag in model_tags for tag in tags):
                        continue
                
                result.append({
                    "id": model.id,
                    "name": model.name,
                    "version": model.version,
                    "model_type": model.model_type,
                    "status": model.status,
                    "description": model.description,
                    "author": model.author,
                    "model_size_mb": model.model_size_mb,
                    "performance_metrics": model.performance_metrics,
                    "tags": model.tags,
                    "created_at": model.created_at,
                    "updated_at": model.updated_at
                })
            
            return result
    
    async def update_model_status(self, model_id: str, status: ModelStatus) -> bool:
        """更新模型状态"""
        try:
            async with get_db() as db:
                model = await db.get(ModelRegistry, model_id)
                if model:
                    model.status = status.value
                    model.updated_at = datetime.utcnow()
                    await db.commit()
                    return True
                return False
        except Exception as e:
            logger.error(f"更新模型状态失败: {e}")
            return False
    
    async def deploy_model(self, 
                          model_id: str, 
                          environment: DeploymentEnvironment,
                          config: DeploymentConfig) -> str:
        """部署模型"""
        try:
            # 获取模型信息
            async with get_db() as db:
                model = await db.get(ModelRegistry, model_id)
                if not model:
                    raise ValueError(f"模型不存在: {model_id}")
                
                # 检查模型是否准备就绪
                if model.status not in [ModelStatus.READY.value, ModelStatus.DEPLOYED.value]:
                    raise ValueError(f"模型状态不允许部署: {model.status}")
            
            # 加载模型到内存
            model_instance = await self._load_model(model.model_path)
            
            # 生成部署ID
            deployment_id = str(uuid.uuid4())
            
            # 创建部署记录
            async with get_db() as db:
                deployment = ModelDeployment(
                    id=deployment_id,
                    model_id=model_id,
                    environment=environment.value,
                    deployment_config=config.to_dict(),
                    status="deploying"
                )
                db.add(deployment)
                await db.commit()
            
            # 部署到指定环境
            endpoint_url = await self._deploy_to_environment(
                model_id, model_instance, environment, config
            )
            
            # 更新部署记录
            async with get_db() as db:
                deployment = await db.get(ModelDeployment, deployment_id)
                deployment.endpoint_url = endpoint_url
                deployment.status = "deployed"
                deployment.deployed_at = datetime.utcnow()
                await db.commit()
            
            # 更新模型状态
            await self.update_model_status(model_id, ModelStatus.DEPLOYED)
            
            # 缓存已部署的模型
            self.deployed_models[f"{model_id}_{environment.value}"] = {
                "model": model_instance,
                "deployment_id": deployment_id,
                "endpoint_url": endpoint_url
            }
            
            logger.info(f"模型 {model_id} 成功部署到 {environment.value}")
            return deployment_id
            
        except Exception as e:
            logger.error(f"模型部署失败: {e}")
            raise
    
    async def get_deployment_info(self, deployment_id: str) -> Optional[Dict[str, Any]]:
        """获取部署信息"""
        async with get_db() as db:
            deployment = await db.get(ModelDeployment, deployment_id)
            if deployment:
                return {
                    "id": deployment.id,
                    "model_id": deployment.model_id,
                    "environment": deployment.environment,
                    "deployment_config": deployment.deployment_config,
                    "endpoint_url": deployment.endpoint_url,
                    "status": deployment.status,
                    "deployed_at": deployment.deployed_at,
                    "health_status": deployment.health_status,
                    "last_health_check": deployment.last_health_check,
                    "request_count": deployment.request_count,
                    "avg_response_time_ms": deployment.avg_response_time_ms,
                    "error_rate": deployment.error_rate
                }
            return None
    
    async def list_deployments(self, 
                              environment: Optional[DeploymentEnvironment] = None,
                              status: Optional[str] = None) -> List[Dict[str, Any]]:
        """列出部署"""
        async with get_db() as db:
            query = db.query(ModelDeployment)
            
            if environment:
                query = query.filter(ModelDeployment.environment == environment.value)
            
            if status:
                query = query.filter(ModelDeployment.status == status)
            
            deployments = await query.all()
            
            return [
                {
                    "id": d.id,
                    "model_id": d.model_id,
                    "environment": d.environment,
                    "endpoint_url": d.endpoint_url,
                    "status": d.status,
                    "deployed_at": d.deployed_at,
                    "health_status": d.health_status,
                    "request_count": d.request_count,
                    "avg_response_time_ms": d.avg_response_time_ms,
                    "error_rate": d.error_rate
                }
                for d in deployments
            ]
    
    async def undeploy_model(self, deployment_id: str) -> bool:
        """取消部署模型"""
        try:
            async with get_db() as db:
                deployment = await db.get(ModelDeployment, deployment_id)
                if not deployment:
                    return False
                
                # 从缓存中移除
                cache_key = f"{deployment.model_id}_{deployment.environment}"
                if cache_key in self.deployed_models:
                    del self.deployed_models[cache_key]
                
                # 更新状态
                deployment.status = "undeployed"
                deployment.updated_at = datetime.utcnow()
                await db.commit()
                
                return True
                
        except Exception as e:
            logger.error(f"取消部署失败: {e}")
            return False
    
    async def health_check(self, deployment_id: str) -> Dict[str, Any]:
        """健康检查"""
        try:
            async with get_db() as db:
                deployment = await db.get(ModelDeployment, deployment_id)
                if not deployment:
                    return {"status": "not_found"}
                
                # 执行健康检查
                cache_key = f"{deployment.model_id}_{deployment.environment}"
                if cache_key in self.deployed_models:
                    # 模型在内存中，执行简单测试
                    model_info = self.deployed_models[cache_key]
                    
                    # 这里可以执行更复杂的健康检查逻辑
                    health_status = "healthy"
                    response_time = 10.0  # 模拟响应时间
                    
                    # 更新健康状态
                    deployment.health_status = health_status
                    deployment.last_health_check = datetime.utcnow()
                    await db.commit()
                    
                    return {
                        "status": health_status,
                        "response_time_ms": response_time,
                        "last_check": deployment.last_health_check,
                        "endpoint_url": deployment.endpoint_url
                    }
                else:
                    return {"status": "unhealthy", "reason": "model_not_loaded"}
                    
        except Exception as e:
            logger.error(f"健康检查失败: {e}")
            return {"status": "error", "error": str(e)}
    
    async def compare_models(self, model_ids: List[str]) -> Dict[str, Any]:
        """比较多个模型"""
        models = []
        for model_id in model_ids:
            async with get_db() as db:
                model = await db.get(ModelRegistry, model_id)
                if model:
                    models.append(model)
        
        if len(models) < 2:
            raise ValueError("至少需要2个模型进行比较")
        
        comparison = {
            "models": [],
            "comparison_metrics": {},
            "recommendations": []
        }
        
        for model in models:
            comparison["models"].append({
                "id": model.id,
                "name": model.name,
                "version": model.version,
                "model_type": model.model_type,
                "performance_metrics": model.performance_metrics,
                "model_size_mb": model.model_size_mb,
                "created_at": model.created_at
            })
        
        # 性能指标比较
        if all(m.performance_metrics for m in models):
            metrics = {}
            for metric_name in models[0].performance_metrics.keys():
                metrics[metric_name] = [
                    m.performance_metrics.get(metric_name, 0) for m in models
                ]
            comparison["comparison_metrics"] = metrics
            
            # 生成建议
            best_accuracy_idx = np.argmax([
                m.performance_metrics.get("accuracy", 0) for m in models
            ])
            smallest_size_idx = np.argmin([m.model_size_mb for m in models])
            
            comparison["recommendations"] = [
                f"最佳准确率: {models[best_accuracy_idx].name}:{models[best_accuracy_idx].version}",
                f"最小模型: {models[smallest_size_idx].name}:{models[smallest_size_idx].version}"
            ]
        
        return comparison
    
    async def _calculate_file_hash(self, file_path: str) -> str:
        """计算文件哈希"""
        hash_md5 = hashlib.md5()
        async with aiofiles.open(file_path, 'rb') as f:
            async for chunk in f:
                hash_md5.update(chunk)
        return hash_md5.hexdigest()
    
    async def _upload_to_remote(self, model_path: Path, name: str, version: str):
        """上传到远程存储"""
        if not self.remote_storage:
            return
        
        bucket_name = "smart-reading-models"
        prefix = f"{name}/{version}/"
        
        for file_path in model_path.rglob("*"):
            if file_path.is_file():
                key = prefix + str(file_path.relative_to(model_path))
                self.remote_storage.upload_file(str(file_path), bucket_name, key)
    
    async def _load_model(self, model_path: str) -> Any:
        """加载模型"""
        try:
            model = torch.load(model_path, map_location='cpu')
            return model
        except Exception as e:
            logger.error(f"加载模型失败: {e}")
            raise
    
    async def _deploy_to_environment(self, 
                                   model_id: str, 
                                   model_instance: Any,
                                   environment: DeploymentEnvironment,
                                   config: DeploymentConfig) -> str:
        """部署到指定环境"""
        # 这里实现具体的部署逻辑
        # 可以是Kubernetes部署、Docker容器或简单的HTTP服务
        
        # 模拟部署过程
        await asyncio.sleep(1)
        
        # 返回端点URL
        base_url = {
            DeploymentEnvironment.DEVELOPMENT: "http://dev-api.smartreading.com",
            DeploymentEnvironment.STAGING: "http://staging-api.smartreading.com", 
            DeploymentEnvironment.PRODUCTION: "http://api.smartreading.com",
            DeploymentEnvironment.A_B_TESTING: "http://ab-api.smartreading.com"
        }
        
        return f"{base_url[environment]}/models/{model_id}/predict"

# 全局模型注册表实例
model_registry = AIModelRegistry()