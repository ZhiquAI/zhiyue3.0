"""
深度学习模型训练管道系统
实现自动化的AI模型训练、验证和部署流程
"""
import asyncio
import logging
import json
import pickle
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, Dataset
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score
from transformers import AutoTokenizer, AutoModel
from torch.optim import AdamW
import numpy as np
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any, Union
from dataclasses import dataclass, asdict
from enum import Enum
import mlflow
import mlflow.pytorch
from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, Boolean
from sqlalchemy.ext.declarative import declarative_base
from db_connection import get_db
import uuid

logger = logging.getLogger(__name__)

class ModelType(Enum):
    TEXT_CLASSIFICATION = "text_classification"
    SEMANTIC_SIMILARITY = "semantic_similarity"
    HANDWRITING_RECOGNITION = "handwriting_recognition"
    ANSWER_QUALITY_SCORER = "answer_quality_scorer"
    ESSAY_EVALUATOR = "essay_evaluator"
    CALCULATION_CHECKER = "calculation_checker"

class TrainingStatus(Enum):
    PENDING = "pending"
    PREPROCESSING = "preprocessing"
    TRAINING = "training"
    VALIDATING = "validating"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

@dataclass
class TrainingConfig:
    model_type: ModelType
    model_name: str
    dataset_path: str
    epochs: int = 10
    batch_size: int = 32
    learning_rate: float = 2e-5
    validation_split: float = 0.2
    early_stopping_patience: int = 3
    max_sequence_length: int = 512
    num_labels: Optional[int] = None
    custom_parameters: Dict[str, Any] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

@dataclass
class TrainingMetrics:
    epoch: int
    train_loss: float
    val_loss: float
    train_accuracy: float
    val_accuracy: float
    f1_score: float
    precision: float
    recall: float
    timestamp: datetime

Base = declarative_base()

class ModelTrainingRecord(Base):
    __tablename__ = "model_training_records"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    model_type = Column(String, nullable=False)
    model_name = Column(String, nullable=False)
    status = Column(String, nullable=False)
    config = Column(JSON, nullable=False)
    metrics = Column(JSON)
    model_path = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime)
    error_message = Column(String)
    best_score = Column(Float)

class CustomTextClassifier(nn.Module):
    def __init__(self, model_name: str, num_labels: int, dropout_rate: float = 0.3):
        super().__init__()
        self.bert = AutoModel.from_pretrained(model_name)
        self.dropout = nn.Dropout(dropout_rate)
        self.classifier = nn.Linear(self.bert.config.hidden_size, num_labels)
        self.num_labels = num_labels
    
    def forward(self, input_ids, attention_mask, labels=None):
        outputs = self.bert(input_ids=input_ids, attention_mask=attention_mask)
        pooled_output = outputs.pooler_output
        pooled_output = self.dropout(pooled_output)
        logits = self.classifier(pooled_output)
        
        loss = None
        if labels is not None:
            loss_fct = nn.CrossEntropyLoss()
            loss = loss_fct(logits.view(-1, self.num_labels), labels.view(-1))
        
        return {"loss": loss, "logits": logits}

class SemanticSimilarityModel(nn.Module):
    def __init__(self, model_name: str):
        super().__init__()
        self.bert = AutoModel.from_pretrained(model_name)
        self.similarity_head = nn.Sequential(
            nn.Linear(self.bert.config.hidden_size * 2, 256),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(256, 64),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(64, 1),
            nn.Sigmoid()
        )
    
    def forward(self, input_ids_1, attention_mask_1, input_ids_2, attention_mask_2, labels=None):
        outputs_1 = self.bert(input_ids=input_ids_1, attention_mask=attention_mask_1)
        outputs_2 = self.bert(input_ids=input_ids_2, attention_mask=attention_mask_2)
        
        pooled_1 = outputs_1.pooler_output
        pooled_2 = outputs_2.pooler_output
        
        combined = torch.cat([pooled_1, pooled_2], dim=1)
        similarity_score = self.similarity_head(combined)
        
        loss = None
        if labels is not None:
            loss_fct = nn.BCELoss()
            loss = loss_fct(similarity_score.squeeze(), labels.float())
        
        return {"loss": loss, "similarity_score": similarity_score}

class TrainingDataset(Dataset):
    def __init__(self, data: List[Dict], tokenizer, max_length: int = 512, model_type: ModelType = ModelType.TEXT_CLASSIFICATION):
        self.data = data
        self.tokenizer = tokenizer
        self.max_length = max_length
        self.model_type = model_type
    
    def __len__(self):
        return len(self.data)
    
    def __getitem__(self, idx):
        item = self.data[idx]
        
        if self.model_type == ModelType.TEXT_CLASSIFICATION:
            encoding = self.tokenizer(
                item['text'],
                truncation=True,
                padding='max_length',
                max_length=self.max_length,
                return_tensors='pt'
            )
            return {
                'input_ids': encoding['input_ids'].flatten(),
                'attention_mask': encoding['attention_mask'].flatten(),
                'labels': torch.tensor(item['label'], dtype=torch.long)
            }
        
        elif self.model_type == ModelType.SEMANTIC_SIMILARITY:
            encoding_1 = self.tokenizer(
                item['text_1'],
                truncation=True,
                padding='max_length',
                max_length=self.max_length,
                return_tensors='pt'
            )
            encoding_2 = self.tokenizer(
                item['text_2'],
                truncation=True,
                padding='max_length',
                max_length=self.max_length,
                return_tensors='pt'
            )
            return {
                'input_ids_1': encoding_1['input_ids'].flatten(),
                'attention_mask_1': encoding_1['attention_mask'].flatten(),
                'input_ids_2': encoding_2['input_ids'].flatten(),
                'attention_mask_2': encoding_2['attention_mask'].flatten(),
                'labels': torch.tensor(item['similarity'], dtype=torch.float)
            }

class ModelTrainingPipeline:
    def __init__(self, base_model_path: str = "models/", mlflow_tracking_uri: str = "sqlite:///mlflow.db"):
        self.base_model_path = Path(base_model_path)
        self.base_model_path.mkdir(exist_ok=True)
        
        mlflow.set_tracking_uri(mlflow_tracking_uri)
        mlflow.set_experiment("smart_reading_ai_training")
        
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        logger.info(f"使用设备: {self.device}")
    
    async def start_training(self, config: TrainingConfig) -> str:
        """启动模型训练任务"""
        training_id = str(uuid.uuid4())
        
        try:
            # 创建训练记录
            async with get_db() as db:
                record = ModelTrainingRecord(
                    id=training_id,
                    model_type=config.model_type.value,
                    model_name=config.model_name,
                    status=TrainingStatus.PENDING.value,
                    config=config.to_dict()
                )
                db.add(record)
                await db.commit()
            
            # 异步启动训练
            asyncio.create_task(self._run_training_pipeline(training_id, config))
            
            return training_id
            
        except Exception as e:
            logger.error(f"启动训练任务失败: {e}")
            await self._update_training_status(training_id, TrainingStatus.FAILED, error_message=str(e))
            raise
    
    async def _run_training_pipeline(self, training_id: str, config: TrainingConfig):
        """运行完整的训练管道"""
        try:
            await self._update_training_status(training_id, TrainingStatus.PREPROCESSING)
            
            # 1. 数据预处理
            train_data, val_data = await self._preprocess_data(config)
            logger.info(f"数据预处理完成: 训练集{len(train_data)}条, 验证集{len(val_data)}条")
            
            # 2. 初始化模型
            model, tokenizer = await self._initialize_model(config)
            model = model.to(self.device)
            
            # 3. 准备数据加载器
            train_dataset = TrainingDataset(train_data, tokenizer, config.max_sequence_length, config.model_type)
            val_dataset = TrainingDataset(val_data, tokenizer, config.max_sequence_length, config.model_type)
            
            train_loader = DataLoader(train_dataset, batch_size=config.batch_size, shuffle=True)
            val_loader = DataLoader(val_dataset, batch_size=config.batch_size)
            
            # 4. 开始训练
            await self._update_training_status(training_id, TrainingStatus.TRAINING)
            
            with mlflow.start_run(run_name=f"{config.model_name}_{training_id}"):
                mlflow.log_params(config.to_dict())
                
                best_model, training_metrics = await self._train_model(
                    model, train_loader, val_loader, config, training_id
                )
                
                # 5. 保存模型
                model_path = self.base_model_path / f"{config.model_name}_{training_id}"
                model_path.mkdir(exist_ok=True)
                
                torch.save(best_model.state_dict(), model_path / "model.pt")
                tokenizer.save_pretrained(str(model_path))
                
                with open(model_path / "config.json", 'w') as f:
                    json.dump(config.to_dict(), f, indent=2)
                
                # 6. 记录到MLflow
                mlflow.pytorch.log_model(best_model, "model")
                mlflow.log_artifacts(str(model_path))
                
                # 7. 更新训练记录
                best_score = max([m.val_accuracy for m in training_metrics])
                await self._update_training_record(
                    training_id,
                    TrainingStatus.COMPLETED,
                    metrics=[asdict(m) for m in training_metrics],
                    model_path=str(model_path),
                    best_score=best_score
                )
                
                logger.info(f"模型训练完成: {training_id}, 最佳验证准确率: {best_score:.4f}")
        
        except Exception as e:
            logger.error(f"训练管道执行失败: {e}")
            await self._update_training_status(training_id, TrainingStatus.FAILED, error_message=str(e))
    
    async def _preprocess_data(self, config: TrainingConfig) -> Tuple[List[Dict], List[Dict]]:
        """数据预处理"""
        with open(config.dataset_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        train_data, val_data = train_test_split(
            data, 
            test_size=config.validation_split, 
            random_state=42,
            stratify=[item.get('label') for item in data] if config.model_type == ModelType.TEXT_CLASSIFICATION else None
        )
        
        return train_data, val_data
    
    async def _initialize_model(self, config: TrainingConfig) -> Tuple[nn.Module, Any]:
        """初始化模型"""
        base_model_name = "bert-base-chinese"
        tokenizer = AutoTokenizer.from_pretrained(base_model_name)
        
        if config.model_type == ModelType.TEXT_CLASSIFICATION:
            model = CustomTextClassifier(
                base_model_name, 
                config.num_labels or 2
            )
        elif config.model_type == ModelType.SEMANTIC_SIMILARITY:
            model = SemanticSimilarityModel(base_model_name)
        else:
            raise ValueError(f"不支持的模型类型: {config.model_type}")
        
        return model, tokenizer
    
    async def _train_model(
        self, 
        model: nn.Module, 
        train_loader: DataLoader, 
        val_loader: DataLoader, 
        config: TrainingConfig,
        training_id: str
    ) -> Tuple[nn.Module, List[TrainingMetrics]]:
        """训练模型"""
        optimizer = AdamW(model.parameters(), lr=config.learning_rate)
        
        best_model = None
        best_score = 0.0
        patience_counter = 0
        training_metrics = []
        
        for epoch in range(config.epochs):
            # 训练阶段
            model.train()
            train_loss = 0.0
            train_correct = 0
            train_total = 0
            
            for batch in train_loader:
                batch = {k: v.to(self.device) for k, v in batch.items()}
                
                optimizer.zero_grad()
                outputs = model(**batch)
                loss = outputs["loss"]
                loss.backward()
                optimizer.step()
                
                train_loss += loss.item()
                
                if config.model_type == ModelType.TEXT_CLASSIFICATION:
                    predictions = torch.argmax(outputs["logits"], dim=1)
                    train_correct += (predictions == batch["labels"]).sum().item()
                    train_total += batch["labels"].size(0)
                elif config.model_type == ModelType.SEMANTIC_SIMILARITY:
                    predictions = (outputs["similarity_score"] > 0.5).float().squeeze()
                    train_correct += (predictions == batch["labels"]).sum().item()
                    train_total += batch["labels"].size(0)
            
            train_accuracy = train_correct / train_total
            avg_train_loss = train_loss / len(train_loader)
            
            # 验证阶段
            model.eval()
            val_loss = 0.0
            val_predictions = []
            val_labels = []
            
            with torch.no_grad():
                for batch in val_loader:
                    batch = {k: v.to(self.device) for k, v in batch.items()}
                    outputs = model(**batch)
                    val_loss += outputs["loss"].item()
                    
                    if config.model_type == ModelType.TEXT_CLASSIFICATION:
                        predictions = torch.argmax(outputs["logits"], dim=1)
                        val_predictions.extend(predictions.cpu().numpy())
                        val_labels.extend(batch["labels"].cpu().numpy())
                    elif config.model_type == ModelType.SEMANTIC_SIMILARITY:
                        predictions = (outputs["similarity_score"] > 0.5).float().squeeze()
                        val_predictions.extend(predictions.cpu().numpy())
                        val_labels.extend(batch["labels"].cpu().numpy())
            
            avg_val_loss = val_loss / len(val_loader)
            val_accuracy = accuracy_score(val_labels, val_predictions)
            val_f1 = f1_score(val_labels, val_predictions, average='weighted')
            val_precision = precision_score(val_labels, val_predictions, average='weighted')
            val_recall = recall_score(val_labels, val_predictions, average='weighted')
            
            # 记录指标
            metrics = TrainingMetrics(
                epoch=epoch + 1,
                train_loss=avg_train_loss,
                val_loss=avg_val_loss,
                train_accuracy=train_accuracy,
                val_accuracy=val_accuracy,
                f1_score=val_f1,
                precision=val_precision,
                recall=val_recall,
                timestamp=datetime.now()
            )
            training_metrics.append(metrics)
            
            # MLflow日志记录
            mlflow.log_metrics({
                "train_loss": avg_train_loss,
                "val_loss": avg_val_loss,
                "train_accuracy": train_accuracy,
                "val_accuracy": val_accuracy,
                "f1_score": val_f1,
                "precision": val_precision,
                "recall": val_recall
            }, step=epoch)
            
            logger.info(f"Epoch {epoch+1}/{config.epochs}: "
                       f"Train Loss: {avg_train_loss:.4f}, Train Acc: {train_accuracy:.4f}, "
                       f"Val Loss: {avg_val_loss:.4f}, Val Acc: {val_accuracy:.4f}")
            
            # 早停和最佳模型保存
            if val_accuracy > best_score:
                best_score = val_accuracy
                best_model = model.state_dict().copy()
                patience_counter = 0
            else:
                patience_counter += 1
            
            if patience_counter >= config.early_stopping_patience:
                logger.info(f"早停触发，在第{epoch+1}轮停止训练")
                break
        
        # 加载最佳模型
        model.load_state_dict(best_model)
        
        return model, training_metrics
    
    async def _update_training_status(self, training_id: str, status: TrainingStatus, error_message: str = None):
        """更新训练状态"""
        async with get_db() as db:
            record = await db.get(ModelTrainingRecord, training_id)
            if record:
                record.status = status.value
                record.updated_at = datetime.utcnow()
                if error_message:
                    record.error_message = error_message
                if status == TrainingStatus.COMPLETED:
                    record.completed_at = datetime.utcnow()
                await db.commit()
    
    async def _update_training_record(
        self, 
        training_id: str, 
        status: TrainingStatus, 
        metrics: List[Dict] = None, 
        model_path: str = None,
        best_score: float = None
    ):
        """更新完整的训练记录"""
        async with get_db() as db:
            record = await db.get(ModelTrainingRecord, training_id)
            if record:
                record.status = status.value
                record.updated_at = datetime.utcnow()
                if metrics:
                    record.metrics = metrics
                if model_path:
                    record.model_path = model_path
                if best_score:
                    record.best_score = best_score
                if status == TrainingStatus.COMPLETED:
                    record.completed_at = datetime.utcnow()
                await db.commit()
    
    async def get_training_status(self, training_id: str) -> Dict[str, Any]:
        """获取训练状态"""
        async with get_db() as db:
            record = await db.get(ModelTrainingRecord, training_id)
            if record:
                return {
                    "training_id": record.id,
                    "model_type": record.model_type,
                    "model_name": record.model_name,
                    "status": record.status,
                    "config": record.config,
                    "metrics": record.metrics,
                    "model_path": record.model_path,
                    "created_at": record.created_at,
                    "updated_at": record.updated_at,
                    "completed_at": record.completed_at,
                    "error_message": record.error_message,
                    "best_score": record.best_score
                }
            return None
    
    async def list_training_records(self, model_type: Optional[ModelType] = None) -> List[Dict[str, Any]]:
        """列出所有训练记录"""
        async with get_db() as db:
            query = db.query(ModelTrainingRecord)
            if model_type:
                query = query.filter(ModelTrainingRecord.model_type == model_type.value)
            
            records = await query.all()
            return [
                {
                    "training_id": record.id,
                    "model_type": record.model_type,
                    "model_name": record.model_name,
                    "status": record.status,
                    "best_score": record.best_score,
                    "created_at": record.created_at,
                    "completed_at": record.completed_at
                }
                for record in records
            ]
    
    async def cancel_training(self, training_id: str) -> bool:
        """取消训练任务"""
        try:
            await self._update_training_status(training_id, TrainingStatus.CANCELLED)
            return True
        except Exception as e:
            logger.error(f"取消训练任务失败: {e}")
            return False

# 全局训练管道实例
training_pipeline = ModelTrainingPipeline()