"""
模型训练API接口
提供模型训练、部署和管理的REST API
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, File, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any, Union
from datetime import datetime
from enum import Enum
import json
import asyncio
import logging

from services.auth_service import get_current_user
from middleware.permissions import require_permissions
from models.user import User
from services.model_training_pipeline import (
    training_pipeline, 
    TrainingConfig, 
    ModelType, 
    TrainingStatus
)
from services.model_registry import (
    model_registry,
    ModelMetadata,
    ModelStatus,
    DeploymentEnvironment,
    DeploymentConfig
)
from models.custom_ai_models import AIModelFactory

router = APIRouter(prefix="/api/model-training", tags=["model_training"])
logger = logging.getLogger(__name__)

class TrainingRequest(BaseModel):
    model_type: ModelType
    model_name: str
    dataset_path: str
    epochs: int = Field(default=10, ge=1, le=100)
    batch_size: int = Field(default=32, ge=1, le=256)
    learning_rate: float = Field(default=2e-5, ge=1e-6, le=1e-2)
    validation_split: float = Field(default=0.2, ge=0.1, le=0.5)
    early_stopping_patience: int = Field(default=3, ge=1, le=10)
    max_sequence_length: int = Field(default=512, ge=64, le=2048)
    num_labels: Optional[int] = Field(default=None, ge=2, le=100)
    custom_parameters: Optional[Dict[str, Any]] = None

class ModelRegistrationRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    version: str = Field(..., pattern=r'^\d+\.\d+\.\d+$')
    model_type: str
    description: str = Field(..., min_length=1, max_length=500)
    framework: str = "pytorch"
    input_schema: Optional[Dict[str, Any]] = None
    output_schema: Optional[Dict[str, Any]] = None
    performance_metrics: Optional[Dict[str, float]] = None
    training_config: Optional[Dict[str, Any]] = None
    dependencies: Optional[List[str]] = None
    tags: Optional[List[str]] = None

class DeploymentRequest(BaseModel):
    environment: DeploymentEnvironment
    replicas: int = Field(default=1, ge=1, le=10)
    cpu_limit: str = "1000m"
    memory_limit: str = "2Gi"
    gpu_enabled: bool = False
    auto_scaling: bool = True
    health_check_path: str = "/health"
    environment_vars: Optional[Dict[str, str]] = None

class ModelComparisonRequest(BaseModel):
    model_ids: List[str] = Field(..., min_items=2, max_items=5)

class TrainingResponse(BaseModel):
    training_id: str
    status: str
    message: str

class ModelListResponse(BaseModel):
    models: List[Dict[str, Any]]
    total: int
    page: int
    size: int

class DeploymentResponse(BaseModel):
    deployment_id: str
    model_id: str
    environment: str
    endpoint_url: Optional[str]
    status: str

@router.post("/start-training", response_model=TrainingResponse)
@require_permissions("train_models")
async def start_model_training(
    request: TrainingRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user)
):
    """启动模型训练"""
    try:
        config = TrainingConfig(
            model_type=request.model_type,
            model_name=request.model_name,
            dataset_path=request.dataset_path,
            epochs=request.epochs,
            batch_size=request.batch_size,
            learning_rate=request.learning_rate,
            validation_split=request.validation_split,
            early_stopping_patience=request.early_stopping_patience,
            max_sequence_length=request.max_sequence_length,
            num_labels=request.num_labels,
            custom_parameters=request.custom_parameters
        )
        
        training_id = await training_pipeline.start_training(config)
        
        return TrainingResponse(
            training_id=training_id,
            status="started",
            message=f"模型训练已启动，训练ID: {training_id}"
        )
        
    except Exception as e:
        logger.error(f"启动训练失败: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/training-status/{training_id}")
@require_permissions("view_training_status")
async def get_training_status(
    training_id: str,
    current_user: User = Depends(get_current_user)
):
    """获取训练状态"""
    try:
        status = await training_pipeline.get_training_status(training_id)
        if not status:
            raise HTTPException(status_code=404, detail="训练记录不存在")
        
        return status
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取训练状态失败: {e}")
        raise HTTPException(status_code=500, detail="内部服务器错误")

@router.get("/training-records")
@require_permissions("view_training_records")
async def list_training_records(
    model_type: Optional[ModelType] = None,
    current_user: User = Depends(get_current_user)
):
    """列出训练记录"""
    try:
        records = await training_pipeline.list_training_records(model_type)
        return {"records": records, "total": len(records)}
        
    except Exception as e:
        logger.error(f"获取训练记录失败: {e}")
        raise HTTPException(status_code=500, detail="内部服务器错误")

@router.post("/cancel-training/{training_id}")
@require_permissions("manage_training")
async def cancel_training(
    training_id: str,
    current_user: User = Depends(get_current_user)
):
    """取消训练"""
    try:
        success = await training_pipeline.cancel_training(training_id)
        if not success:
            raise HTTPException(status_code=404, detail="训练记录不存在")
        
        return {"message": "训练已取消"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"取消训练失败: {e}")
        raise HTTPException(status_code=500, detail="内部服务器错误")

@router.post("/register-model", response_model=Dict[str, str])
@require_permissions("register_models")
async def register_model(
    request: ModelRegistrationRequest,
    model_file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """注册模型"""
    try:
        # 保存上传的模型文件
        import tempfile
        import os
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pt") as tmp_file:
            content = await model_file.read()
            tmp_file.write(content)
            tmp_file_path = tmp_file.name
        
        try:
            # 创建模型元数据
            metadata = ModelMetadata(
                name=request.name,
                version=request.version,
                model_type=request.model_type,
                description=request.description,
                author=current_user.username,
                created_at=datetime.utcnow(),
                framework=request.framework,
                input_schema=request.input_schema,
                output_schema=request.output_schema,
                performance_metrics=request.performance_metrics,
                training_config=request.training_config,
                dependencies=request.dependencies,
                tags=request.tags
            )
            
            # 注册模型
            model_id = await model_registry.register_model(metadata, tmp_file_path)
            
            return {"model_id": model_id, "message": "模型注册成功"}
            
        finally:
            # 清理临时文件
            os.unlink(tmp_file_path)
            
    except Exception as e:
        logger.error(f"模型注册失败: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/models", response_model=ModelListResponse)
@require_permissions("view_models")
async def list_models(
    model_type: Optional[str] = None,
    status: Optional[ModelStatus] = None,
    tags: Optional[str] = None,
    page: int = 1,
    size: int = 20,
    current_user: User = Depends(get_current_user)
):
    """列出模型"""
    try:
        tag_list = tags.split(",") if tags else None
        models = await model_registry.list_models(model_type, status, tag_list)
        
        # 分页
        start = (page - 1) * size
        end = start + size
        paginated_models = models[start:end]
        
        return ModelListResponse(
            models=paginated_models,
            total=len(models),
            page=page,
            size=size
        )
        
    except Exception as e:
        logger.error(f"获取模型列表失败: {e}")
        raise HTTPException(status_code=500, detail="内部服务器错误")

@router.get("/models/{model_name}")
@require_permissions("view_models")
async def get_model(
    model_name: str,
    version: str = "latest",
    current_user: User = Depends(get_current_user)
):
    """获取模型详情"""
    try:
        model = await model_registry.get_model(model_name, version)
        if not model:
            raise HTTPException(status_code=404, detail="模型不存在")
        
        return model
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取模型失败: {e}")
        raise HTTPException(status_code=500, detail="内部服务器错误")

@router.post("/models/{model_id}/deploy", response_model=DeploymentResponse)
@require_permissions("deploy_models")
async def deploy_model(
    model_id: str,
    request: DeploymentRequest,
    current_user: User = Depends(get_current_user)
):
    """部署模型"""
    try:
        config = DeploymentConfig(
            environment=request.environment,
            replicas=request.replicas,
            cpu_limit=request.cpu_limit,
            memory_limit=request.memory_limit,
            gpu_enabled=request.gpu_enabled,
            auto_scaling=request.auto_scaling,
            health_check_path=request.health_check_path,
            environment_vars=request.environment_vars
        )
        
        deployment_id = await model_registry.deploy_model(model_id, request.environment, config)
        
        # 获取部署信息
        deployment_info = await model_registry.get_deployment_info(deployment_id)
        
        return DeploymentResponse(
            deployment_id=deployment_id,
            model_id=model_id,
            environment=request.environment.value,
            endpoint_url=deployment_info.get("endpoint_url"),
            status="deployed"
        )
        
    except Exception as e:
        logger.error(f"模型部署失败: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/deployments")
@require_permissions("view_deployments")
async def list_deployments(
    environment: Optional[DeploymentEnvironment] = None,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """列出部署"""
    try:
        deployments = await model_registry.list_deployments(environment, status)
        return {"deployments": deployments, "total": len(deployments)}
        
    except Exception as e:
        logger.error(f"获取部署列表失败: {e}")
        raise HTTPException(status_code=500, detail="内部服务器错误")

@router.get("/deployments/{deployment_id}")
@require_permissions("view_deployments")
async def get_deployment(
    deployment_id: str,
    current_user: User = Depends(get_current_user)
):
    """获取部署详情"""
    try:
        deployment = await model_registry.get_deployment_info(deployment_id)
        if not deployment:
            raise HTTPException(status_code=404, detail="部署不存在")
        
        return deployment
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取部署信息失败: {e}")
        raise HTTPException(status_code=500, detail="内部服务器错误")

@router.delete("/deployments/{deployment_id}")
@require_permissions("manage_deployments")
async def undeploy_model(
    deployment_id: str,
    current_user: User = Depends(get_current_user)
):
    """取消部署"""
    try:
        success = await model_registry.undeploy_model(deployment_id)
        if not success:
            raise HTTPException(status_code=404, detail="部署不存在")
        
        return {"message": "模型已取消部署"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"取消部署失败: {e}")
        raise HTTPException(status_code=500, detail="内部服务器错误")

@router.get("/deployments/{deployment_id}/health")
@require_permissions("view_deployments")
async def check_deployment_health(
    deployment_id: str,
    current_user: User = Depends(get_current_user)
):
    """部署健康检查"""
    try:
        health_status = await model_registry.health_check(deployment_id)
        return health_status
        
    except Exception as e:
        logger.error(f"健康检查失败: {e}")
        raise HTTPException(status_code=500, detail="内部服务器错误")

@router.post("/models/compare")
@require_permissions("compare_models")
async def compare_models(
    request: ModelComparisonRequest,
    current_user: User = Depends(get_current_user)
):
    """比较模型"""
    try:
        comparison = await model_registry.compare_models(request.model_ids)
        return comparison
        
    except Exception as e:
        logger.error(f"模型比较失败: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/model-types")
@require_permissions("view_models")
async def get_supported_model_types(current_user: User = Depends(get_current_user)):
    """获取支持的模型类型"""
    try:
        model_types = {}
        for model_type in ["essay_evaluator", "math_evaluator", "handwriting_assessor", 
                          "multi_task", "adaptive_attention"]:
            info = AIModelFactory.get_model_info(model_type)
            model_types[model_type] = info
        
        return {"model_types": model_types}
        
    except Exception as e:
        logger.error(f"获取模型类型失败: {e}")
        raise HTTPException(status_code=500, detail="内部服务器错误")

@router.post("/models/{model_id}/status")
@require_permissions("manage_models")
async def update_model_status(
    model_id: str,
    status: ModelStatus,
    current_user: User = Depends(get_current_user)
):
    """更新模型状态"""
    try:
        success = await model_registry.update_model_status(model_id, status)
        if not success:
            raise HTTPException(status_code=404, detail="模型不存在")
        
        return {"message": "模型状态已更新"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"更新模型状态失败: {e}")
        raise HTTPException(status_code=500, detail="内部服务器错误")

@router.get("/training-metrics/{training_id}")
@require_permissions("view_training_status")
async def get_training_metrics(
    training_id: str,
    current_user: User = Depends(get_current_user)
):
    """获取训练指标"""
    try:
        status = await training_pipeline.get_training_status(training_id)
        if not status:
            raise HTTPException(status_code=404, detail="训练记录不存在")
        
        metrics = status.get("metrics", [])
        if not metrics:
            return {"message": "暂无训练指标数据"}
        
        # 格式化指标数据用于图表展示
        epochs = [m["epoch"] for m in metrics]
        train_losses = [m["train_loss"] for m in metrics]
        val_losses = [m["val_loss"] for m in metrics]
        train_accuracies = [m["train_accuracy"] for m in metrics]
        val_accuracies = [m["val_accuracy"] for m in metrics]
        
        return {
            "epochs": epochs,
            "losses": {
                "train": train_losses,
                "validation": val_losses
            },
            "accuracies": {
                "train": train_accuracies,
                "validation": val_accuracies
            },
            "latest_metrics": metrics[-1] if metrics else None,
            "best_performance": {
                "best_val_accuracy": max(val_accuracies) if val_accuracies else 0,
                "best_epoch": val_accuracies.index(max(val_accuracies)) + 1 if val_accuracies else 0
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取训练指标失败: {e}")
        raise HTTPException(status_code=500, detail="内部服务器错误")