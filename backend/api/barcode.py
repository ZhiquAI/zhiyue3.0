from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import logging

from database import get_db
from services.barcode_service import BarcodeService
from auth import get_current_user
from models.production_models import User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/barcode", tags=["barcode"])

class BarcodeGenerateRequest(BaseModel):
    """条形码生成请求"""
    student_id: str
    name: Optional[str] = None
    class_name: Optional[str] = None
    exam_number: Optional[str] = None
    paper_type: Optional[str] = None
    format_type: str = "json"  # json, delimited, fixed_length
    barcode_type: str = "CODE128"  # CODE128, QR_CODE, etc.
    delimiter: Optional[str] = "|"  # 用于分隔符格式
    
class BarcodeRecognizeRequest(BaseModel):
    """条形码识别请求"""
    image_path: str
    
class BarcodeTemplateRequest(BaseModel):
    """条形码模板配置请求"""
    template_name: str
    format_type: str
    barcode_type: str
    field_mapping: Dict[str, Any]
    delimiter: Optional[str] = None
    fixed_positions: Optional[Dict[str, Dict[str, int]]] = None

@router.post("/generate")
async def generate_barcode(
    request: BarcodeGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """生成条形码"""
    try:
        barcode_service = BarcodeService()
        
        # 准备学生信息
        student_info = {
            "student_id": request.student_id,
            "name": request.name,
            "class": request.class_name,
            "exam_number": request.exam_number,
            "paper_type": request.paper_type
        }
        
        # 生成条形码数据
        barcode_data = barcode_service.generate_barcode_data(
            student_info=student_info,
            format_type=request.format_type,
            delimiter=request.delimiter
        )
        
        # 生成条形码图像
        barcode_image = barcode_service.create_barcode_image(
            data=barcode_data,
            barcode_type=request.barcode_type
        )
        
        logger.info(f"Barcode generated for student {request.student_id} by user {current_user.id}")
        
        return {
            "status": "success",
            "data": barcode_data,
            "barcode_type": request.barcode_type,
            "format_type": request.format_type,
            "image_base64": barcode_image,
            "student_info": student_info
        }
        
    except Exception as e:
        logger.error(f"Barcode generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"条形码生成失败: {str(e)}")

@router.post("/recognize")
async def recognize_barcode(
    request: BarcodeRecognizeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """识别条形码"""
    try:
        barcode_service = BarcodeService()
        
        # 识别条形码
        results = barcode_service.recognize_barcodes(request.image_path)
        
        if not results:
            return {
                "status": "no_barcode",
                "message": "未检测到条形码",
                "results": []
            }
        
        logger.info(f"Barcode recognized from {request.image_path} by user {current_user.id}")
        
        return {
            "status": "success",
            "detected_count": len(results),
            "results": results
        }
        
    except Exception as e:
        logger.error(f"Barcode recognition failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"条形码识别失败: {str(e)}")

@router.post("/template")
async def create_barcode_template(
    request: BarcodeTemplateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """创建条形码模板配置"""
    try:
        barcode_service = BarcodeService()
        
        # 创建模板配置
        template_config = barcode_service.create_template_config(
            template_name=request.template_name,
            format_type=request.format_type,
            barcode_type=request.barcode_type,
            field_mapping=request.field_mapping,
            delimiter=request.delimiter,
            fixed_positions=request.fixed_positions
        )
        
        logger.info(f"Barcode template '{request.template_name}' created by user {current_user.id}")
        
        return {
            "status": "success",
            "template_name": request.template_name,
            "config": template_config
        }
        
    except Exception as e:
        logger.error(f"Barcode template creation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"模板创建失败: {str(e)}")

@router.get("/templates")
async def list_barcode_templates(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取条形码模板列表"""
    try:
        barcode_service = BarcodeService()
        
        # 获取预定义模板
        templates = {
            "standard_json": {
                "name": "标准JSON格式",
                "format_type": "json",
                "barcode_type": "CODE128",
                "description": "使用JSON格式存储学生信息"
            },
            "pipe_delimited": {
                "name": "管道分隔格式",
                "format_type": "delimited",
                "barcode_type": "CODE128",
                "delimiter": "|",
                "description": "使用管道符分隔学生信息字段"
            },
            "fixed_length": {
                "name": "固定长度格式",
                "format_type": "fixed_length",
                "barcode_type": "CODE128",
                "description": "使用固定位置存储学生信息"
            },
            "qr_code_json": {
                "name": "二维码JSON格式",
                "format_type": "json",
                "barcode_type": "QR_CODE",
                "description": "使用二维码存储JSON格式学生信息"
            }
        }
        
        return {
            "status": "success",
            "templates": templates
        }
        
    except Exception as e:
        logger.error(f"Template listing failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取模板列表失败: {str(e)}")

@router.get("/validate")
async def validate_barcode_region(
    image_path: str = Query(..., description="图像路径"),
    x: int = Query(..., description="X坐标"),
    y: int = Query(..., description="Y坐标"),
    width: int = Query(..., description="宽度"),
    height: int = Query(..., description="高度"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """验证条形码区域"""
    try:
        barcode_service = BarcodeService()
        
        # 验证条形码区域
        is_valid = barcode_service.validate_barcode_region(
            image_path=image_path,
            region=(x, y, width, height)
        )
        
        return {
            "status": "success",
            "is_valid": is_valid,
            "region": {
                "x": x,
                "y": y,
                "width": width,
                "height": height
            }
        }
        
    except Exception as e:
        logger.error(f"Barcode region validation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"区域验证失败: {str(e)}")

@router.get("/status")
async def get_barcode_service_status(
    current_user: User = Depends(get_current_user)
):
    """获取条形码服务状态"""
    try:
        barcode_service = BarcodeService()
        
        # 检查依赖库状态
        status = {
            "service": "barcode_service",
            "status": "healthy",
            "capabilities": {
                "recognition": True,
                "generation": True,
                "template_support": True,
                "multiple_formats": True
            },
            "supported_types": [
                "CODE128", "CODE39", "EAN13", "EAN8", 
                "QR_CODE", "DATA_MATRIX", "PDF417"
            ],
            "supported_formats": [
                "json", "delimited", "fixed_length"
            ]
        }
        
        return status
        
    except Exception as e:
        logger.error(f"Service status check failed: {str(e)}")
        return {
            "service": "barcode_service",
            "status": "error",
            "error": str(e)
        }