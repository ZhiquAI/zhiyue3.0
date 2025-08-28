"""
数据兼容性API路由
提供数据格式兼容性相关的服务
"""

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List
import logging

from utils.compatibility_manager import compatibility_manager
from utils.response import success_response, error_response
from middleware.response_middleware import get_request_id

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/compatibility", tags=["兼容性管理"])

class DataMigrationRequest(BaseModel):
    """数据迁移请求"""
    data: Dict[str, Any] = Field(..., description="待迁移的数据")
    target_version: Optional[str] = Field(None, description="目标版本")
    
class CompatibilityCheckRequest(BaseModel):
    """兼容性检查请求"""
    data: Dict[str, Any] = Field(..., description="待检查的数据")
    required_version: Optional[str] = Field(None, description="需要的版本")

class SchemaValidationRequest(BaseModel):
    """格式验证请求"""
    data: Dict[str, Any] = Field(..., description="待验证的数据")
    version: Optional[str] = Field(None, description="数据版本")

class DataNormalizationRequest(BaseModel):
    """数据规范化请求"""
    data: Dict[str, Any] = Field(..., description="待规范化的数据")
    target_format: str = Field("standard", description="目标格式 (standard/snake_case/camelCase)")

@router.post("/migrate")
async def migrate_data(
    request: DataMigrationRequest,
    request_id: str = Depends(get_request_id)
):
    """
    迁移数据到指定版本
    """
    try:
        logger.info(f"开始数据迁移, 目标版本: {request.target_version}")
        
        migrated_data = compatibility_manager.migrate_data(
            data=request.data,
            target_version=request.target_version
        )
        
        return success_response(
            data={
                "migrated_data": migrated_data,
                "source_version": compatibility_manager._detect_version(request.data),
                "target_version": request.target_version or compatibility_manager.current_version
            },
            message="数据迁移成功",
            request_id=request_id
        )
        
    except ValueError as e:
        logger.error(f"数据迁移失败: {e}")
        return error_response(
            message=f"数据迁移失败: {str(e)}",
            error_code="MIGRATION_FAILED",
            status_code=400,
            request_id=request_id
        )
    except Exception as e:
        logger.error(f"数据迁移异常: {e}", exc_info=True)
        return error_response(
            message="数据迁移服务异常",
            error_code="MIGRATION_ERROR",
            status_code=500,
            request_id=request_id
        )

@router.post("/check")
async def check_compatibility(
    request: CompatibilityCheckRequest,
    request_id: str = Depends(get_request_id)
):
    """
    检查数据兼容性
    """
    try:
        compatibility_result = compatibility_manager.check_compatibility(
            data=request.data,
            required_version=request.required_version
        )
        
        return success_response(
            data=compatibility_result,
            message="兼容性检查完成",
            request_id=request_id
        )
        
    except Exception as e:
        logger.error(f"兼容性检查异常: {e}", exc_info=True)
        return error_response(
            message="兼容性检查服务异常",
            error_code="COMPATIBILITY_CHECK_ERROR",
            status_code=500,
            request_id=request_id
        )

@router.post("/validate")
async def validate_schema(
    request: SchemaValidationRequest,
    request_id: str = Depends(get_request_id)
):
    """
    验证数据格式
    """
    try:
        validation_result = compatibility_manager.validate_schema(
            data=request.data,
            version=request.version
        )
        
        return success_response(
            data=validation_result,
            message="格式验证完成",
            request_id=request_id
        )
        
    except Exception as e:
        logger.error(f"格式验证异常: {e}", exc_info=True)
        return error_response(
            message="格式验证服务异常",
            error_code="SCHEMA_VALIDATION_ERROR",
            status_code=500,
            request_id=request_id
        )

@router.post("/normalize")
async def normalize_data(
    request: DataNormalizationRequest,
    request_id: str = Depends(get_request_id)
):
    """
    规范化数据格式
    """
    try:
        normalized_data = compatibility_manager.normalize_data(
            data=request.data,
            target_format=request.target_format
        )
        
        return success_response(
            data={
                "normalized_data": normalized_data,
                "target_format": request.target_format
            },
            message="数据规范化完成",
            request_id=request_id
        )
        
    except Exception as e:
        logger.error(f"数据规范化异常: {e}", exc_info=True)
        return error_response(
            message="数据规范化服务异常",
            error_code="DATA_NORMALIZATION_ERROR",
            status_code=500,
            request_id=request_id
        )

@router.get("/versions")
async def get_supported_versions(request_id: str = Depends(get_request_id)):
    """
    获取支持的数据版本列表
    """
    try:
        versions = ["1.0", "1.1", "2.0", "2.1"]
        
        return success_response(
            data={
                "supported_versions": versions,
                "current_version": compatibility_manager.current_version,
                "migration_paths": list(compatibility_manager.migrations.keys())
            },
            message="版本信息获取成功",
            request_id=request_id
        )
        
    except Exception as e:
        logger.error(f"获取版本信息异常: {e}", exc_info=True)
        return error_response(
            message="获取版本信息失败",
            error_code="VERSION_INFO_ERROR",
            status_code=500,
            request_id=request_id
        )

@router.get("/health")
async def compatibility_health_check(request_id: str = Depends(get_request_id)):
    """
    兼容性服务健康检查
    """
    try:
        health_status = {
            "service_status": "healthy",
            "registered_migrations": len(compatibility_manager.migrations),
            "current_version": compatibility_manager.current_version,
            "features": {
                "data_migration": True,
                "compatibility_check": True,
                "schema_validation": True,
                "data_normalization": True
            }
        }
        
        return success_response(
            data=health_status,
            message="兼容性服务运行正常",
            request_id=request_id
        )
        
    except Exception as e:
        logger.error(f"兼容性服务健康检查异常: {e}", exc_info=True)
        return error_response(
            message="兼容性服务异常",
            error_code="COMPATIBILITY_SERVICE_ERROR",
            status_code=500,
            request_id=request_id
        )

@router.post("/batch-migrate")
async def batch_migrate_data(
    items: List[Dict[str, Any]],
    target_version: Optional[str] = None,
    request_id: str = Depends(get_request_id)
):
    """
    批量数据迁移
    """
    try:
        logger.info(f"开始批量数据迁移，数据量: {len(items)}")
        
        results = []
        errors = []
        
        for i, item in enumerate(items):
            try:
                migrated_item = compatibility_manager.migrate_data(
                    data=item,
                    target_version=target_version
                )
                results.append({
                    "index": i,
                    "success": True,
                    "data": migrated_item
                })
            except Exception as e:
                logger.error(f"批量迁移第 {i} 项失败: {e}")
                errors.append({
                    "index": i,
                    "error": str(e)
                })
                results.append({
                    "index": i,
                    "success": False,
                    "error": str(e)
                })
        
        return success_response(
            data={
                "results": results,
                "summary": {
                    "total": len(items),
                    "successful": len(items) - len(errors),
                    "failed": len(errors),
                    "target_version": target_version or compatibility_manager.current_version
                },
                "errors": errors if errors else None
            },
            message=f"批量迁移完成，成功: {len(items) - len(errors)}/{len(items)}",
            request_id=request_id
        )
        
    except Exception as e:
        logger.error(f"批量数据迁移异常: {e}", exc_info=True)
        return error_response(
            message="批量数据迁移服务异常",
            error_code="BATCH_MIGRATION_ERROR",
            status_code=500,
            request_id=request_id
        )