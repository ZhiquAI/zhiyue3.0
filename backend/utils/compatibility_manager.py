"""
数据格式兼容性管理器
确保系统对不同版本和格式的数据具有良好的兼容性
"""

import json
import logging
from typing import Any, Dict, List, Optional, Union, Type
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime
import re
from packaging import version

logger = logging.getLogger(__name__)

class DataVersion(Enum):
    """数据版本"""
    V1_0 = "1.0"
    V1_1 = "1.1"
    V2_0 = "2.0"
    V2_1 = "2.1"
    CURRENT = "2.1"  # 当前版本

class CompatibilityLevel(Enum):
    """兼容性级别"""
    FULL = "full"           # 完全兼容
    PARTIAL = "partial"     # 部分兼容
    LIMITED = "limited"     # 有限兼容
    NONE = "none"          # 不兼容

@dataclass
class FieldMapping:
    """字段映射规则"""
    old_field: str
    new_field: str
    converter: Optional[callable] = None
    default_value: Any = None
    required: bool = True

@dataclass
class VersionMigration:
    """版本迁移规则"""
    from_version: str
    to_version: str
    field_mappings: List[FieldMapping] = field(default_factory=list)
    custom_converter: Optional[callable] = None
    compatibility_level: CompatibilityLevel = CompatibilityLevel.FULL

class CompatibilityManager:
    """兼容性管理器"""
    
    def __init__(self):
        self.migrations: Dict[str, VersionMigration] = {}
        self.schema_validators = {}
        self.current_version = DataVersion.CURRENT.value
        
        # 注册默认迁移规则
        self._register_default_migrations()
    
    def _register_default_migrations(self):
        """注册默认迁移规则"""
        
        # V1.0 -> V1.1 迁移
        self.register_migration(VersionMigration(
            from_version="1.0",
            to_version="1.1",
            field_mappings=[
                FieldMapping("student_name", "student_info.name"),
                FieldMapping("student_id", "student_info.id"),
                FieldMapping("exam_name", "exam_metadata.name"),
                FieldMapping("score", "grading_result.score"),
            ],
            compatibility_level=CompatibilityLevel.FULL
        ))
        
        # V1.1 -> V2.0 迁移
        self.register_migration(VersionMigration(
            from_version="1.1",
            to_version="2.0",
            field_mappings=[
                FieldMapping("exam_metadata", "exam_info", self._convert_exam_metadata),
                FieldMapping("grading_result", "ai_grading_result", self._convert_grading_result),
            ],
            custom_converter=self._v11_to_v20_converter,
            compatibility_level=CompatibilityLevel.PARTIAL
        ))
        
        # V2.0 -> V2.1 迁移
        self.register_migration(VersionMigration(
            from_version="2.0",
            to_version="2.1",
            field_mappings=[
                FieldMapping("ai_grading_result.confidence", "ai_grading_result.confidence_metrics", 
                           self._convert_confidence_to_metrics),
                FieldMapping("", "api_version", default_value="2.1"),
                FieldMapping("", "enhanced_features", default_value={
                    "multi_modal_support": True,
                    "advanced_ai": True,
                    "quality_control": True
                }),
            ],
            compatibility_level=CompatibilityLevel.FULL
        ))
    
    def register_migration(self, migration: VersionMigration):
        """注册迁移规则"""
        key = f"{migration.from_version}->{migration.to_version}"
        self.migrations[key] = migration
        logger.info(f"已注册迁移规则: {key}")
    
    def migrate_data(
        self,
        data: Dict[str, Any],
        target_version: str = None
    ) -> Dict[str, Any]:
        """迁移数据到指定版本"""
        if target_version is None:
            target_version = self.current_version
        
        # 检测当前数据版本
        current_version = self._detect_version(data)
        
        if current_version == target_version:
            return data
        
        # 执行迁移路径
        migration_path = self._find_migration_path(current_version, target_version)
        
        migrated_data = data.copy()
        for migration_key in migration_path:
            migration = self.migrations[migration_key]
            migrated_data = self._apply_migration(migrated_data, migration)
        
        # 添加版本信息
        migrated_data["data_version"] = target_version
        migrated_data["migration_timestamp"] = datetime.now().isoformat()
        
        return migrated_data
    
    def check_compatibility(
        self,
        data: Dict[str, Any],
        required_version: str = None
    ) -> Dict[str, Any]:
        """检查数据兼容性"""
        if required_version is None:
            required_version = self.current_version
        
        current_version = self._detect_version(data)
        
        result = {
            "current_version": current_version,
            "required_version": required_version,
            "compatible": False,
            "compatibility_level": CompatibilityLevel.NONE.value,
            "migration_required": False,
            "migration_path": [],
            "issues": []
        }
        
        if current_version == required_version:
            result.update({
                "compatible": True,
                "compatibility_level": CompatibilityLevel.FULL.value
            })
            return result
        
        # 查找迁移路径
        try:
            migration_path = self._find_migration_path(current_version, required_version)
            result["migration_path"] = migration_path
            result["migration_required"] = True
            
            # 评估兼容性级别
            min_compatibility = CompatibilityLevel.FULL
            for migration_key in migration_path:
                migration = self.migrations[migration_key]
                if migration.compatibility_level.value < min_compatibility.value:
                    min_compatibility = migration.compatibility_level
            
            result["compatibility_level"] = min_compatibility.value
            result["compatible"] = min_compatibility != CompatibilityLevel.NONE
            
        except ValueError as e:
            result["issues"].append(str(e))
        
        return result
    
    def validate_schema(
        self,
        data: Dict[str, Any],
        version: str = None
    ) -> Dict[str, Any]:
        """验证数据格式"""
        if version is None:
            version = self._detect_version(data)
        
        validation_result = {
            "valid": True,
            "version": version,
            "errors": [],
            "warnings": [],
            "missing_fields": [],
            "extra_fields": []
        }
        
        # 获取版本对应的架构
        expected_schema = self._get_schema_for_version(version)
        
        # 验证必需字段
        for field in expected_schema.get("required", []):
            if not self._has_nested_field(data, field):
                validation_result["missing_fields"].append(field)
                validation_result["valid"] = False
        
        # 检查数据类型
        for field, expected_type in expected_schema.get("fields", {}).items():
            if self._has_nested_field(data, field):
                value = self._get_nested_field(data, field)
                if not self._validate_field_type(value, expected_type):
                    validation_result["errors"].append(f"字段 {field} 类型不匹配，期望 {expected_type}")
                    validation_result["valid"] = False
        
        return validation_result
    
    def normalize_data(
        self,
        data: Dict[str, Any],
        target_format: str = "standard"
    ) -> Dict[str, Any]:
        """规范化数据格式"""
        normalized = data.copy()
        
        # 标准化字段名（驼峰式转下划线）
        if target_format == "snake_case":
            normalized = self._convert_keys_to_snake_case(normalized)
        elif target_format == "camelCase":
            normalized = self._convert_keys_to_camel_case(normalized)
        
        # 清理空值
        normalized = self._remove_empty_values(normalized)
        
        # 标准化数据类型
        normalized = self._normalize_data_types(normalized)
        
        return normalized
    
    def _detect_version(self, data: Dict[str, Any]) -> str:
        """检测数据版本"""
        # 显式版本字段
        if "data_version" in data:
            return data["data_version"]
        
        if "api_version" in data:
            return data["api_version"]
        
        # 基于字段特征推断版本
        if "enhanced_features" in data:
            return "2.1"
        
        if "ai_grading_result" in data and "confidence_metrics" in data.get("ai_grading_result", {}):
            return "2.1"
        
        if "ai_grading_result" in data:
            return "2.0"
        
        if "student_info" in data:
            return "1.1"
        
        # 默认为最早版本
        return "1.0"
    
    def _find_migration_path(self, from_version: str, to_version: str) -> List[str]:
        """查找迁移路径"""
        # 简单的直接路径查找
        direct_key = f"{from_version}->{to_version}"
        if direct_key in self.migrations:
            return [direct_key]
        
        # 多步迁移路径查找
        available_versions = ["1.0", "1.1", "2.0", "2.1"]
        
        try:
            from_idx = available_versions.index(from_version)
            to_idx = available_versions.index(to_version)
        except ValueError:
            raise ValueError(f"不支持的版本: {from_version} 或 {to_version}")
        
        if from_idx > to_idx:
            raise ValueError(f"不支持向下迁移: {from_version} -> {to_version}")
        
        path = []
        for i in range(from_idx, to_idx):
            migration_key = f"{available_versions[i]}->{available_versions[i + 1]}"
            if migration_key not in self.migrations:
                raise ValueError(f"缺少迁移规则: {migration_key}")
            path.append(migration_key)
        
        return path
    
    def _apply_migration(
        self,
        data: Dict[str, Any],
        migration: VersionMigration
    ) -> Dict[str, Any]:
        """应用单个迁移"""
        result = data.copy()
        
        # 应用自定义转换器
        if migration.custom_converter:
            result = migration.custom_converter(result)
        
        # 应用字段映射
        for mapping in migration.field_mappings:
            if mapping.old_field:
                # 有源字段
                if self._has_nested_field(result, mapping.old_field):
                    value = self._get_nested_field(result, mapping.old_field)
                    
                    # 应用转换器
                    if mapping.converter:
                        value = mapping.converter(value)
                    
                    # 设置新字段
                    self._set_nested_field(result, mapping.new_field, value)
                    
                    # 删除旧字段（如果不同）
                    if mapping.old_field != mapping.new_field:
                        self._delete_nested_field(result, mapping.old_field)
                elif mapping.required:
                    logger.warning(f"迁移时缺少必需字段: {mapping.old_field}")
            else:
                # 新增字段
                if mapping.default_value is not None:
                    self._set_nested_field(result, mapping.new_field, mapping.default_value)
        
        return result
    
    def _get_schema_for_version(self, version: str) -> Dict[str, Any]:
        """获取版本对应的数据架构"""
        schemas = {
            "1.0": {
                "required": ["student_name", "student_id", "exam_name", "score"],
                "fields": {
                    "student_name": str,
                    "student_id": str,
                    "exam_name": str,
                    "score": (int, float)
                }
            },
            "1.1": {
                "required": ["student_info", "exam_metadata", "grading_result"],
                "fields": {
                    "student_info.name": str,
                    "student_info.id": str,
                    "exam_metadata.name": str,
                    "grading_result.score": (int, float)
                }
            },
            "2.0": {
                "required": ["student_info", "exam_info", "ai_grading_result"],
                "fields": {
                    "student_info.name": str,
                    "student_info.id": str,
                    "exam_info.name": str,
                    "ai_grading_result.score": (int, float),
                    "ai_grading_result.confidence": (int, float)
                }
            },
            "2.1": {
                "required": ["student_info", "exam_info", "ai_grading_result", "api_version"],
                "fields": {
                    "student_info.name": str,
                    "student_info.id": str,
                    "exam_info.name": str,
                    "ai_grading_result.score": (int, float),
                    "ai_grading_result.confidence_metrics": dict,
                    "api_version": str,
                    "enhanced_features": dict
                }
            }
        }
        
        return schemas.get(version, {})
    
    # 工具方法
    def _has_nested_field(self, data: Dict, field_path: str) -> bool:
        """检查嵌套字段是否存在"""
        try:
            self._get_nested_field(data, field_path)
            return True
        except (KeyError, TypeError):
            return False
    
    def _get_nested_field(self, data: Dict, field_path: str) -> Any:
        """获取嵌套字段值"""
        keys = field_path.split('.')
        value = data
        for key in keys:
            value = value[key]
        return value
    
    def _set_nested_field(self, data: Dict, field_path: str, value: Any):
        """设置嵌套字段值"""
        keys = field_path.split('.')
        current = data
        
        for key in keys[:-1]:
            if key not in current:
                current[key] = {}
            current = current[key]
        
        current[keys[-1]] = value
    
    def _delete_nested_field(self, data: Dict, field_path: str):
        """删除嵌套字段"""
        try:
            keys = field_path.split('.')
            current = data
            
            for key in keys[:-1]:
                current = current[key]
            
            del current[keys[-1]]
        except (KeyError, TypeError):
            pass
    
    def _validate_field_type(self, value: Any, expected_type: Type) -> bool:
        """验证字段类型"""
        if isinstance(expected_type, tuple):
            return isinstance(value, expected_type)
        return isinstance(value, expected_type)
    
    def _convert_keys_to_snake_case(self, data: Dict) -> Dict:
        """转换键名为下划线格式"""
        if not isinstance(data, dict):
            return data
        
        result = {}
        for key, value in data.items():
            snake_key = re.sub(r'([A-Z])', r'_\1', key).lower()
            if isinstance(value, dict):
                result[snake_key] = self._convert_keys_to_snake_case(value)
            elif isinstance(value, list):
                result[snake_key] = [
                    self._convert_keys_to_snake_case(item) if isinstance(item, dict) else item
                    for item in value
                ]
            else:
                result[snake_key] = value
        return result
    
    def _convert_keys_to_camel_case(self, data: Dict) -> Dict:
        """转换键名为驼峰格式"""
        if not isinstance(data, dict):
            return data
        
        result = {}
        for key, value in data.items():
            camel_key = re.sub(r'_(.)', lambda m: m.group(1).upper(), key)
            if isinstance(value, dict):
                result[camel_key] = self._convert_keys_to_camel_case(value)
            elif isinstance(value, list):
                result[camel_key] = [
                    self._convert_keys_to_camel_case(item) if isinstance(item, dict) else item
                    for item in value
                ]
            else:
                result[camel_key] = value
        return result
    
    def _remove_empty_values(self, data: Dict) -> Dict:
        """移除空值"""
        if not isinstance(data, dict):
            return data
        
        result = {}
        for key, value in data.items():
            if isinstance(value, dict):
                cleaned_value = self._remove_empty_values(value)
                if cleaned_value:  # 只保留非空字典
                    result[key] = cleaned_value
            elif isinstance(value, list):
                cleaned_list = [item for item in value if item is not None]
                if cleaned_list:  # 只保留非空列表
                    result[key] = cleaned_list
            elif value is not None and value != "":
                result[key] = value
        
        return result
    
    def _normalize_data_types(self, data: Dict) -> Dict:
        """规范化数据类型"""
        if not isinstance(data, dict):
            return data
        
        result = {}
        for key, value in data.items():
            if isinstance(value, dict):
                result[key] = self._normalize_data_types(value)
            elif isinstance(value, list):
                result[key] = [
                    self._normalize_data_types(item) if isinstance(item, dict) else item
                    for item in value
                ]
            else:
                # 规范化常见类型
                if isinstance(value, str):
                    # 尝试转换数字字符串
                    if value.isdigit():
                        result[key] = int(value)
                    elif re.match(r'^\d+\.\d+$', value):
                        result[key] = float(value)
                    else:
                        result[key] = value.strip()
                else:
                    result[key] = value
        
        return result
    
    # 转换器方法
    def _convert_exam_metadata(self, metadata: Dict) -> Dict:
        """转换考试元数据"""
        return {
            "name": metadata.get("name"),
            "description": metadata.get("description", ""),
            "created_time": metadata.get("created_time"),
            "total_questions": metadata.get("total_questions", 0)
        }
    
    def _convert_grading_result(self, result: Dict) -> Dict:
        """转换评分结果"""
        return {
            "score": result.get("score"),
            "max_score": result.get("max_score"),
            "confidence": result.get("confidence", 0.8),
            "ai_reasoning": result.get("reasoning", ""),
            "timestamp": result.get("timestamp", datetime.now().isoformat())
        }
    
    def _convert_confidence_to_metrics(self, confidence: Union[float, Dict]) -> Dict:
        """转换置信度为详细指标"""
        if isinstance(confidence, dict):
            return confidence
        
        return {
            "final_confidence": confidence,
            "text_quality_score": confidence * 0.9,
            "semantic_score": confidence * 0.95,
            "completeness_score": confidence * 0.85,
            "consistency_score": confidence * 0.9
        }
    
    def _v11_to_v20_converter(self, data: Dict) -> Dict:
        """V1.1 到 V2.0 的自定义转换器"""
        result = data.copy()
        
        # 添加AI相关字段
        if "grading_result" in result:
            grading = result["grading_result"]
            result["ai_grading_result"] = {
                **grading,
                "ai_version": "2.0",
                "model_used": "multimodal_grading_engine"
            }
        
        return result

# 全局兼容性管理器实例
compatibility_manager = CompatibilityManager()