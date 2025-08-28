"""
自定义深度学习模型
针对智阅3.0项目的特定任务设计的专用AI模型
"""
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.nn import TransformerEncoder, TransformerEncoderLayer
from transformers import AutoModel, AutoTokenizer
import numpy as np
from typing import Dict, List, Tuple, Optional, Any
import math

class AdvancedEssayEvaluator(nn.Module):
    """高级作文评估模型"""
    def __init__(self, 
                 pretrained_model: str = "bert-base-chinese",
                 num_aspects: int = 6,  # 内容、结构、语言、创新、逻辑、表达
                 hidden_size: int = 768,
                 dropout_rate: float = 0.3):
        super().__init__()
        
        self.bert = AutoModel.from_pretrained(pretrained_model)
        self.hidden_size = hidden_size
        self.num_aspects = num_aspects
        
        # 多维度评分头
        self.aspect_heads = nn.ModuleList([
            nn.Sequential(
                nn.Linear(hidden_size, hidden_size // 2),
                nn.ReLU(),
                nn.Dropout(dropout_rate),
                nn.Linear(hidden_size // 2, 128),
                nn.ReLU(),
                nn.Dropout(dropout_rate),
                nn.Linear(128, 5)  # 1-5分评分
            ) for _ in range(num_aspects)
        ])
        
        # 整体质量评估
        self.quality_head = nn.Sequential(
            nn.Linear(hidden_size + num_aspects, 256),
            nn.ReLU(),
            nn.Dropout(dropout_rate),
            nn.Linear(256, 128),
            nn.ReLU(),
            nn.Dropout(dropout_rate),
            nn.Linear(128, 1),
            nn.Sigmoid()
        )
        
        # 注意力机制
        self.attention = nn.MultiheadAttention(hidden_size, num_heads=8, dropout=dropout_rate)
        
        # 句子级特征提取
        self.sentence_encoder = nn.LSTM(
            hidden_size, 
            hidden_size // 2, 
            batch_first=True, 
            bidirectional=True,
            dropout=dropout_rate
        )
    
    def forward(self, input_ids, attention_mask, sentence_boundaries=None):
        # BERT编码
        outputs = self.bert(input_ids=input_ids, attention_mask=attention_mask)
        sequence_output = outputs.last_hidden_state
        pooled_output = outputs.pooler_output
        
        # 句子级编码（如果提供了句子边界）
        if sentence_boundaries is not None:
            sentence_features = self._extract_sentence_features(sequence_output, sentence_boundaries)
            enhanced_pooled = torch.cat([pooled_output, sentence_features], dim=1)
        else:
            enhanced_pooled = pooled_output
        
        # 自注意力增强
        attended_features, _ = self.attention(
            sequence_output.transpose(0, 1),
            sequence_output.transpose(0, 1),
            sequence_output.transpose(0, 1)
        )
        attended_pooled = attended_features.mean(dim=0)
        
        # 多维度评分
        aspect_scores = []
        for head in self.aspect_heads:
            score = head(attended_pooled)
            aspect_scores.append(F.softmax(score, dim=1))
        
        # 转换为数值分数 (1-5)
        aspect_values = []
        for score in aspect_scores:
            value = torch.sum(score * torch.arange(1, 6, device=score.device).float(), dim=1)
            aspect_values.append(value.unsqueeze(1))
        aspect_tensor = torch.cat(aspect_values, dim=1)
        
        # 整体质量评估
        quality_input = torch.cat([attended_pooled, aspect_tensor], dim=1)
        overall_quality = self.quality_head(quality_input)
        
        return {
            "aspect_scores": aspect_tensor,  # [batch_size, num_aspects]
            "overall_quality": overall_quality.squeeze(),  # [batch_size]
            "attention_weights": attended_features
        }
    
    def _extract_sentence_features(self, sequence_output, sentence_boundaries):
        """提取句子级特征"""
        batch_size = sequence_output.size(0)
        sentence_features = []
        
        for i in range(batch_size):
            sentences = []
            boundaries = sentence_boundaries[i]
            
            for start, end in boundaries:
                if end > start:
                    sentence_emb = sequence_output[i, start:end].mean(dim=0)
                    sentences.append(sentence_emb)
            
            if sentences:
                sentence_tensor = torch.stack(sentences).unsqueeze(0)
                lstm_out, _ = self.sentence_encoder(sentence_tensor)
                sentence_feature = lstm_out.mean(dim=1).squeeze(0)
            else:
                sentence_feature = torch.zeros(self.hidden_size, device=sequence_output.device)
            
            sentence_features.append(sentence_feature)
        
        return torch.stack(sentence_features)

class MathExpressionEvaluator(nn.Module):
    """数学表达式评估模型"""
    def __init__(self, 
                 vocab_size: int = 10000,
                 hidden_size: int = 512,
                 num_layers: int = 6,
                 num_heads: int = 8,
                 max_sequence_length: int = 256):
        super().__init__()
        
        self.hidden_size = hidden_size
        self.max_seq_len = max_sequence_length
        
        # 数学符号嵌入
        self.token_embedding = nn.Embedding(vocab_size, hidden_size)
        self.position_embedding = nn.Embedding(max_sequence_length, hidden_size)
        
        # Transformer编码器
        encoder_layer = TransformerEncoderLayer(
            d_model=hidden_size,
            nhead=num_heads,
            dim_feedforward=hidden_size * 4,
            dropout=0.1,
            activation='gelu'
        )
        self.transformer = TransformerEncoder(encoder_layer, num_layers)
        
        # 表达式类型分类器
        self.expression_type_classifier = nn.Linear(hidden_size, 10)  # 加减乘除等
        
        # 计算步骤验证器
        self.step_validator = nn.Sequential(
            nn.Linear(hidden_size * 2, hidden_size),
            nn.ReLU(),
            nn.Linear(hidden_size, 1),
            nn.Sigmoid()
        )
        
        # 最终答案验证器
        self.answer_validator = nn.Sequential(
            nn.Linear(hidden_size, 256),
            nn.ReLU(),
            nn.Linear(256, 64),
            nn.ReLU(),
            nn.Linear(64, 1),
            nn.Sigmoid()
        )
    
    def forward(self, input_ids, step_pairs=None):
        batch_size, seq_len = input_ids.shape
        
        # 位置编码
        positions = torch.arange(seq_len, device=input_ids.device).unsqueeze(0).expand(batch_size, -1)
        
        # 嵌入
        token_emb = self.token_embedding(input_ids)
        pos_emb = self.position_embedding(positions)
        embeddings = token_emb + pos_emb
        
        # Transformer编码
        encoded = self.transformer(embeddings.transpose(0, 1)).transpose(0, 1)
        
        # 序列表示
        sequence_repr = encoded.mean(dim=1)
        
        # 表达式类型分类
        expr_type = self.expression_type_classifier(sequence_repr)
        
        # 步骤验证（如果提供了步骤对）
        step_validations = []
        if step_pairs is not None:
            for step_before, step_after in step_pairs:
                step_before_repr = encoded[step_before].mean(dim=1)
                step_after_repr = encoded[step_after].mean(dim=1)
                step_input = torch.cat([step_before_repr, step_after_repr], dim=1)
                step_valid = self.step_validator(step_input)
                step_validations.append(step_valid)
        
        # 答案验证
        answer_validity = self.answer_validator(sequence_repr)
        
        return {
            "expression_type": F.softmax(expr_type, dim=1),
            "step_validations": step_validations,
            "answer_validity": answer_validity.squeeze(),
            "sequence_representation": sequence_repr
        }

class HandwritingQualityAssessor(nn.Module):
    """手写质量评估模型"""
    def __init__(self, 
                 input_channels: int = 3,
                 num_quality_aspects: int = 4):  # 笔画、结构、整齐度、美观度
        super().__init__()
        
        # CNN特征提取器
        self.feature_extractor = nn.Sequential(
            # 第一层卷积
            nn.Conv2d(input_channels, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(),
            nn.MaxPool2d(2),
            
            # 第二层卷积
            nn.Conv2d(64, 128, kernel_size=3, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(),
            nn.MaxPool2d(2),
            
            # 第三层卷积
            nn.Conv2d(128, 256, kernel_size=3, padding=1),
            nn.BatchNorm2d(256),
            nn.ReLU(),
            nn.MaxPool2d(2),
            
            # 第四层卷积
            nn.Conv2d(256, 512, kernel_size=3, padding=1),
            nn.BatchNorm2d(512),
            nn.ReLU(),
            nn.AdaptiveAvgPool2d((4, 4))
        )
        
        # 注意力机制
        self.spatial_attention = nn.Sequential(
            nn.Conv2d(512, 256, kernel_size=1),
            nn.ReLU(),
            nn.Conv2d(256, 1, kernel_size=1),
            nn.Sigmoid()
        )
        
        # 质量评估头
        self.quality_heads = nn.ModuleList([
            nn.Sequential(
                nn.Linear(512 * 4 * 4, 256),
                nn.ReLU(),
                nn.Dropout(0.3),
                nn.Linear(256, 64),
                nn.ReLU(),
                nn.Dropout(0.3),
                nn.Linear(64, 5)  # 1-5分评分
            ) for _ in range(num_quality_aspects)
        ])
        
        # 整体质量评估
        self.overall_quality = nn.Sequential(
            nn.Linear(512 * 4 * 4 + num_quality_aspects, 256),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(256, 1),
            nn.Sigmoid()
        )
    
    def forward(self, images):
        # 特征提取
        features = self.feature_extractor(images)
        
        # 空间注意力
        attention_weights = self.spatial_attention(features)
        attended_features = features * attention_weights
        
        # 展平特征
        flattened = attended_features.view(attended_features.size(0), -1)
        
        # 各维度质量评分
        aspect_scores = []
        for head in self.quality_heads:
            score = head(flattened)
            aspect_scores.append(F.softmax(score, dim=1))
        
        # 转换为数值分数
        aspect_values = []
        for score in aspect_scores:
            value = torch.sum(score * torch.arange(1, 6, device=score.device).float(), dim=1)
            aspect_values.append(value.unsqueeze(1))
        aspect_tensor = torch.cat(aspect_values, dim=1)
        
        # 整体质量
        overall_input = torch.cat([flattened, aspect_tensor], dim=1)
        overall_score = self.overall_quality(overall_input)
        
        return {
            "aspect_scores": aspect_tensor,
            "overall_quality": overall_score.squeeze(),
            "attention_maps": attention_weights,
            "features": flattened
        }

class MultiTaskLearningModel(nn.Module):
    """多任务学习模型"""
    def __init__(self, 
                 pretrained_model: str = "bert-base-chinese",
                 task_configs: Dict[str, Dict] = None):
        super().__init__()
        
        # 共享编码器
        self.shared_encoder = AutoModel.from_pretrained(pretrained_model)
        hidden_size = self.shared_encoder.config.hidden_size
        
        # 任务特定层
        self.task_heads = nn.ModuleDict()
        
        default_configs = {
            "text_classification": {"num_classes": 5, "type": "classification"},
            "semantic_similarity": {"output_size": 1, "type": "regression"},
            "answer_quality": {"output_size": 1, "type": "regression"},
            "essay_scoring": {"num_aspects": 6, "type": "multi_output"}
        }
        
        configs = task_configs or default_configs
        
        for task_name, config in configs.items():
            if config["type"] == "classification":
                self.task_heads[task_name] = nn.Sequential(
                    nn.Linear(hidden_size, 256),
                    nn.ReLU(),
                    nn.Dropout(0.3),
                    nn.Linear(256, config["num_classes"])
                )
            elif config["type"] == "regression":
                self.task_heads[task_name] = nn.Sequential(
                    nn.Linear(hidden_size, 128),
                    nn.ReLU(),
                    nn.Dropout(0.3),
                    nn.Linear(128, config["output_size"]),
                    nn.Sigmoid()
                )
            elif config["type"] == "multi_output":
                self.task_heads[task_name] = nn.Sequential(
                    nn.Linear(hidden_size, 256),
                    nn.ReLU(),
                    nn.Dropout(0.3),
                    nn.Linear(256, config["num_aspects"])
                )
        
        # 任务权重学习
        self.task_weights = nn.Parameter(torch.ones(len(configs)))
    
    def forward(self, input_ids, attention_mask, task_name: str = None):
        # 共享特征提取
        outputs = self.shared_encoder(input_ids=input_ids, attention_mask=attention_mask)
        shared_features = outputs.pooler_output
        
        results = {}
        
        if task_name:
            # 单任务推理
            if task_name in self.task_heads:
                results[task_name] = self.task_heads[task_name](shared_features)
        else:
            # 多任务推理
            for name, head in self.task_heads.items():
                results[name] = head(shared_features)
        
        return {
            "task_outputs": results,
            "shared_features": shared_features,
            "task_weights": F.softmax(self.task_weights, dim=0)
        }

class AdaptiveAttentionModel(nn.Module):
    """自适应注意力模型"""
    def __init__(self, 
                 pretrained_model: str = "bert-base-chinese",
                 num_attention_heads: int = 8,
                 attention_types: List[str] = ["content", "structure", "language"]):
        super().__init__()
        
        self.bert = AutoModel.from_pretrained(pretrained_model)
        hidden_size = self.bert.config.hidden_size
        
        # 多类型注意力头
        self.attention_heads = nn.ModuleDict()
        for att_type in attention_types:
            self.attention_heads[att_type] = nn.MultiheadAttention(
                hidden_size, num_attention_heads, dropout=0.1
            )
        
        # 注意力融合
        self.attention_fusion = nn.Sequential(
            nn.Linear(hidden_size * len(attention_types), hidden_size),
            nn.LayerNorm(hidden_size),
            nn.ReLU()
        )
        
        # 动态权重生成器
        self.dynamic_weights = nn.Sequential(
            nn.Linear(hidden_size, 128),
            nn.ReLU(),
            nn.Linear(128, len(attention_types)),
            nn.Softmax(dim=1)
        )
    
    def forward(self, input_ids, attention_mask, question_type: str = None):
        outputs = self.bert(input_ids=input_ids, attention_mask=attention_mask)
        sequence_output = outputs.last_hidden_state
        pooled_output = outputs.pooler_output
        
        # 多类型注意力
        attended_outputs = []
        attention_weights = {}
        
        for att_type, attention in self.attention_heads.items():
            attended, weights = attention(
                sequence_output.transpose(0, 1),
                sequence_output.transpose(0, 1),
                sequence_output.transpose(0, 1)
            )
            attended_outputs.append(attended.transpose(0, 1).mean(dim=1))
            attention_weights[att_type] = weights
        
        # 注意力融合
        fused_features = torch.cat(attended_outputs, dim=1)
        fused_output = self.attention_fusion(fused_features)
        
        # 动态权重
        dynamic_w = self.dynamic_weights(pooled_output)
        
        # 加权融合
        weighted_features = torch.zeros_like(fused_output)
        for i, features in enumerate(attended_outputs):
            weighted_features += dynamic_w[:, i:i+1] * features
        
        return {
            "fused_features": fused_output,
            "weighted_features": weighted_features,
            "attention_weights": attention_weights,
            "dynamic_weights": dynamic_w
        }

# 模型工厂类
class AIModelFactory:
    """AI模型工厂"""
    
    @staticmethod
    def create_model(model_type: str, config: Dict[str, Any] = None) -> nn.Module:
        """创建指定类型的模型"""
        config = config or {}
        
        if model_type == "essay_evaluator":
            return AdvancedEssayEvaluator(**config)
        elif model_type == "math_evaluator":
            return MathExpressionEvaluator(**config)
        elif model_type == "handwriting_assessor":
            return HandwritingQualityAssessor(**config)
        elif model_type == "multi_task":
            return MultiTaskLearningModel(**config)
        elif model_type == "adaptive_attention":
            return AdaptiveAttentionModel(**config)
        else:
            raise ValueError(f"不支持的模型类型: {model_type}")
    
    @staticmethod
    def get_model_info(model_type: str) -> Dict[str, Any]:
        """获取模型信息"""
        model_info = {
            "essay_evaluator": {
                "description": "高级作文评估模型",
                "input_format": "文本序列",
                "output_format": "多维度评分 + 整体质量",
                "use_cases": ["作文评分", "写作质量评估", "语言表达分析"]
            },
            "math_evaluator": {
                "description": "数学表达式评估模型",
                "input_format": "数学表达式序列",
                "output_format": "步骤验证 + 答案正确性",
                "use_cases": ["数学解题验证", "计算过程检查", "数学推理评估"]
            },
            "handwriting_assessor": {
                "description": "手写质量评估模型",
                "input_format": "手写图像",
                "output_format": "多维度质量评分",
                "use_cases": ["手写质量评估", "书写规范检查", "美观度评分"]
            },
            "multi_task": {
                "description": "多任务学习模型",
                "input_format": "文本序列",
                "output_format": "多任务预测结果",
                "use_cases": ["统一模型多任务处理", "资源优化", "知识共享"]
            },
            "adaptive_attention": {
                "description": "自适应注意力模型",
                "input_format": "文本序列",
                "output_format": "加权特征表示",
                "use_cases": ["动态特征关注", "上下文感知", "个性化处理"]
            }
        }
        
        return model_info.get(model_type, {"description": "未知模型类型"})