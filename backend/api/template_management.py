"""答题卡模板管理API

提供模板创建、编辑、预览、删除等功能的REST API
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from datetime import datetime
import json
import logging
import uuid
import os
from pathlib import Path

try:
    from database import get_db
    from auth import get_current_user
    from models.production_models import User, AnswerSheetTemplate, TemplateUsage
except ImportError:
    from db_connection import get_db
    from auth import get_current_user
    from models.production_models import User, AnswerSheetTemplate, TemplateUsage

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/templates", tags=["template_management"])

# 请求模型
class TemplateCreate(BaseModel):
    """创建模板请求模型"""
    name: str = Field(..., min_length=1, max_length=100, description="模板名称")
    description: Optional[str] = Field(None, max_length=500, description="模板描述")
    subject: Optional[str] = Field(None, max_length=50, description="科目")
    grade_level: Optional[str] = Field(None, max_length=20, description="年级")
    exam_type: Optional[str] = Field(None, max_length=50, description="考试类型")
    template_data: Dict[str, Any] = Field(..., description="模板配置数据")
    page_width: int = Field(210, ge=100, le=500, description="页面宽度(mm)")
    page_height: int = Field(297, ge=100, le=500, description="页面高度(mm)")
    dpi: int = Field(300, ge=150, le=600, description="分辨率")

class TemplateUpdate(BaseModel):
    """更新模板请求模型"""
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="模板名称")
    description: Optional[str] = Field(None, max_length=500, description="模板描述")
    subject: Optional[str] = Field(None, max_length=50, description="科目")
    grade_level: Optional[str] = Field(None, max_length=20, description="年级")
    exam_type: Optional[str] = Field(None, max_length=50, description="考试类型")
    template_data: Optional[Dict[str, Any]] = Field(None, description="模板配置数据")
    page_width: Optional[int] = Field(None, ge=100, le=500, description="页面宽度(mm)")
    page_height: Optional[int] = Field(None, ge=100, le=500, description="页面高度(mm)")
    dpi: Optional[int] = Field(None, ge=150, le=600, description="分辨率")
    is_active: Optional[bool] = Field(None, description="是否激活")

class TemplateResponse(BaseModel):
    """模板响应模型"""
    id: int
    name: str
    description: Optional[str]
    subject: Optional[str]
    grade_level: Optional[str]
    exam_type: Optional[str]
    template_data: Dict[str, Any]
    page_width: int
    page_height: int
    dpi: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    usage_count: int = 0

    class Config:
        from_attributes = True

@router.post("/", response_model=TemplateResponse)
async def create_template(
    template: TemplateCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """创建答题卡模板"""
    try:
        # 验证模板数据格式
        if not template.template_data or not isinstance(template.template_data, dict):
            raise HTTPException(
                status_code=400,
                detail="模板配置数据格式错误"
            )
        
        # 检查模板名称是否已存在
        existing_template = db.query(AnswerSheetTemplate).filter(
            AnswerSheetTemplate.name == template.name,
            AnswerSheetTemplate.created_by == current_user.id
        ).first()
        
        if existing_template:
            raise HTTPException(
                status_code=400,
                detail="模板名称已存在"
            )
        
        # 创建新模板
        new_template = AnswerSheetTemplate(
            name=template.name,
            description=template.description,
            subject=template.subject,
            grade_level=template.grade_level,
            exam_type=template.exam_type,
            template_data=template.template_data,
            page_width=template.page_width,
            page_height=template.page_height,
            dpi=template.dpi,
            created_by=current_user.id,
            updated_by=current_user.id
        )
        
        db.add(new_template)
        db.commit()
        db.refresh(new_template)
        
        logger.info(f"用户 {current_user.username} 创建了模板: {template.name}")
        
        # 构造响应数据
        response_data = TemplateResponse(
            id=new_template.id,
            name=new_template.name,
            description=new_template.description,
            subject=new_template.subject,
            grade_level=new_template.grade_level,
            exam_type=new_template.exam_type,
            template_data=new_template.template_data,
            page_width=new_template.page_width,
            page_height=new_template.page_height,
            dpi=new_template.dpi,
            is_active=new_template.is_active,
            created_at=new_template.created_at,
            updated_at=new_template.updated_at
        )
        
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"创建模板失败: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="创建模板失败"
        )

@router.get("/", response_model=List[TemplateResponse])
async def list_templates(
    subject: Optional[str] = None,
    grade_level: Optional[str] = None,
    exam_type: Optional[str] = None,
    is_active: Optional[bool] = True,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取模板列表"""
    try:
        query = db.query(AnswerSheetTemplate).filter(
            AnswerSheetTemplate.created_by == current_user.id
        )
        
        # 添加过滤条件
        if subject:
            query = query.filter(AnswerSheetTemplate.subject == subject)
        if grade_level:
            query = query.filter(AnswerSheetTemplate.grade_level == grade_level)
        if exam_type:
            query = query.filter(AnswerSheetTemplate.exam_type == exam_type)
        if is_active is not None:
            query = query.filter(AnswerSheetTemplate.is_active == is_active)
        
        # 分页和排序
        templates = query.order_by(
            AnswerSheetTemplate.updated_at.desc()
        ).offset(skip).limit(limit).all()
        
        # 获取使用次数统计
        template_ids = [t.id for t in templates]
        usage_counts = {}
        if template_ids:
            from sqlalchemy import func
            usage_stats = db.query(
                TemplateUsage.template_id,
                func.count(TemplateUsage.id).label('count')
            ).filter(
                TemplateUsage.template_id.in_(template_ids)
            ).group_by(TemplateUsage.template_id).all()
            
            usage_counts = {stat.template_id: stat.count for stat in usage_stats}
        
        # 构造响应数据
        response_data = []
        for template in templates:
            response_data.append(TemplateResponse(
                id=template.id,
                name=template.name,
                description=template.description,
                subject=template.subject,
                grade_level=template.grade_level,
                exam_type=template.exam_type,
                template_data=template.template_data,
                page_width=template.page_width,
                page_height=template.page_height,
                dpi=template.dpi,
                is_active=template.is_active,
                created_at=template.created_at,
                updated_at=template.updated_at,
                usage_count=usage_counts.get(template.id, 0)
            ))
        
        return response_data
        
    except Exception as e:
        logger.error(f"获取模板列表失败: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="获取模板列表失败"
        )

@router.get("/{template_id}", response_model=TemplateResponse)
async def get_template(
    template_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取单个模板详情"""
    try:
        template = db.query(AnswerSheetTemplate).filter(
            AnswerSheetTemplate.id == template_id,
            AnswerSheetTemplate.created_by == current_user.id
        ).first()
        
        if not template:
            raise HTTPException(
                status_code=404,
                detail="模板不存在"
            )
        
        # 获取使用次数
        usage_count = db.query(TemplateUsage).filter(
            TemplateUsage.template_id == template_id
        ).count()
        
        response_data = TemplateResponse(
            id=template.id,
            name=template.name,
            description=template.description,
            subject=template.subject,
            grade_level=template.grade_level,
            exam_type=template.exam_type,
            template_data=template.template_data,
            page_width=template.page_width,
            page_height=template.page_height,
            dpi=template.dpi,
            is_active=template.is_active,
            created_at=template.created_at,
            updated_at=template.updated_at,
            usage_count=usage_count
        )
        
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取模板详情失败: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="获取模板详情失败"
        )

@router.put("/{template_id}", response_model=TemplateResponse)
async def update_template(
    template_id: int,
    template_update: TemplateUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """更新模板"""
    try:
        template = db.query(AnswerSheetTemplate).filter(
            AnswerSheetTemplate.id == template_id,
            AnswerSheetTemplate.created_by == current_user.id
        ).first()
        
        if not template:
            raise HTTPException(
                status_code=404,
                detail="模板不存在"
            )
        
        # 检查名称是否重复
        if template_update.name and template_update.name != template.name:
            existing_template = db.query(AnswerSheetTemplate).filter(
                AnswerSheetTemplate.name == template_update.name,
                AnswerSheetTemplate.created_by == current_user.id,
                AnswerSheetTemplate.id != template_id
            ).first()
            
            if existing_template:
                raise HTTPException(
                    status_code=400,
                    detail="模板名称已存在"
                )
        
        # 更新字段
        update_data = template_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(template, field, value)
        
        template.updated_by = current_user.id
        template.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(template)
        
        logger.info(f"用户 {current_user.username} 更新了模板: {template.name}")
        
        # 获取使用次数
        usage_count = db.query(TemplateUsage).filter(
            TemplateUsage.template_id == template_id
        ).count()
        
        response_data = TemplateResponse(
            id=template.id,
            name=template.name,
            description=template.description,
            subject=template.subject,
            grade_level=template.grade_level,
            exam_type=template.exam_type,
            template_data=template.template_data,
            page_width=template.page_width,
            page_height=template.page_height,
            dpi=template.dpi,
            is_active=template.is_active,
            created_at=template.created_at,
            updated_at=template.updated_at,
            usage_count=usage_count
        )
        
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"更新模板失败: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="更新模板失败"
        )

@router.delete("/{template_id}")
async def delete_template(
    template_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """删除模板"""
    try:
        template = db.query(AnswerSheetTemplate).filter(
            AnswerSheetTemplate.id == template_id,
            AnswerSheetTemplate.created_by == current_user.id
        ).first()
        
        if not template:
            raise HTTPException(
                status_code=404,
                detail="模板不存在"
            )
        
        # 检查是否有使用记录
        usage_count = db.query(TemplateUsage).filter(
            TemplateUsage.template_id == template_id
        ).count()
        
        if usage_count > 0:
            # 如果有使用记录，只标记为非激活状态
            template.is_active = False
            template.updated_by = current_user.id
            template.updated_at = datetime.utcnow()
            db.commit()
            
            logger.info(f"用户 {current_user.username} 停用了模板: {template.name}")
            return {"message": "模板已停用"}
        else:
            # 如果没有使用记录，可以直接删除
            db.delete(template)
            db.commit()
            
            logger.info(f"用户 {current_user.username} 删除了模板: {template.name}")
            return {"message": "模板已删除"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"删除模板失败: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="删除模板失败"
        )

@router.get("/{template_id}/preview")
async def preview_template(
    template_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """预览模板效果"""
    try:
        template = db.query(AnswerSheetTemplate).filter(
            AnswerSheetTemplate.id == template_id,
            AnswerSheetTemplate.created_by == current_user.id
        ).first()
        
        if not template:
            raise HTTPException(
                status_code=404,
                detail="模板不存在"
            )
        
        # 构造预览数据
        preview_data = {
            "template_id": template.id,
            "name": template.name,
            "page_config": {
                "width": template.page_width,
                "height": template.page_height,
                "dpi": template.dpi
            },
            "regions": template.template_data.get("regions", []),
            "metadata": {
                "subject": template.subject,
                "grade_level": template.grade_level,
                "exam_type": template.exam_type
            }
        }
        
        return preview_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"预览模板失败: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="预览模板失败"
        )

@router.post("/{template_id}/duplicate")
async def duplicate_template(
    template_id: int,
    new_name: str = Form(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """复制模板"""
    try:
        original_template = db.query(AnswerSheetTemplate).filter(
            AnswerSheetTemplate.id == template_id,
            AnswerSheetTemplate.created_by == current_user.id
        ).first()
        
        if not original_template:
            raise HTTPException(
                status_code=404,
                detail="原模板不存在"
            )
        
        # 检查新名称是否已存在
        existing_template = db.query(AnswerSheetTemplate).filter(
            AnswerSheetTemplate.name == new_name,
            AnswerSheetTemplate.created_by == current_user.id
        ).first()
        
        if existing_template:
            raise HTTPException(
                status_code=400,
                detail="模板名称已存在"
            )
        
        # 创建副本
        new_template = AnswerSheetTemplate(
            name=new_name,
            description=f"复制自: {original_template.name}",
            subject=original_template.subject,
            grade_level=original_template.grade_level,
            exam_type=original_template.exam_type,
            template_data=original_template.template_data.copy(),
            page_width=original_template.page_width,
            page_height=original_template.page_height,
            dpi=original_template.dpi,
            created_by=current_user.id,
            updated_by=current_user.id
        )
        
        db.add(new_template)
        db.commit()
        db.refresh(new_template)
        
        logger.info(f"用户 {current_user.username} 复制了模板: {original_template.name} -> {new_name}")
        
        response_data = TemplateResponse(
            id=new_template.id,
            name=new_template.name,
            description=new_template.description,
            subject=new_template.subject,
            grade_level=new_template.grade_level,
            exam_type=new_template.exam_type,
            template_data=new_template.template_data,
            page_width=new_template.page_width,
            page_height=new_template.page_height,
            dpi=new_template.dpi,
            is_active=new_template.is_active,
            created_at=new_template.created_at,
            updated_at=new_template.updated_at
        )
        
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"复制模板失败: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="复制模板失败"
        )

@router.post("/upload-background")
async def upload_background_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """上传答题卡背景图片"""
    try:
        # 验证文件类型
        allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/gif"]
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail="不支持的文件类型，请上传 JPG、PNG 或 GIF 格式的图片"
            )
        
        # 验证文件大小 (最大10MB)
        max_size = 10 * 1024 * 1024  # 10MB
        file_content = await file.read()
        if len(file_content) > max_size:
            raise HTTPException(
                status_code=400,
                detail="文件大小超过限制，最大支持10MB"
            )
        
        # 生成唯一文件名
        file_extension = Path(file.filename).suffix.lower()
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        
        # 确保上传目录存在
        upload_dir = Path("storage/template_backgrounds")
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        # 保存文件
        file_path = upload_dir / unique_filename
        with open(file_path, "wb") as f:
            f.write(file_content)
        
        # 返回文件信息
        file_url = f"/api/templates/background/{unique_filename}"
        
        logger.info(f"用户 {current_user.username} 上传了背景图片: {file.filename}")
        
        return {
            "filename": unique_filename,
            "original_name": file.filename,
            "url": file_url,
            "size": len(file_content),
            "content_type": file.content_type
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"上传背景图片失败: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="上传背景图片失败"
        )

@router.get("/background/{filename}")
async def get_background_image(filename: str):
    """获取背景图片"""
    try:
        file_path = Path("storage/template_backgrounds") / filename
        
        if not file_path.exists():
            raise HTTPException(
                status_code=404,
                detail="图片文件不存在"
            )
        
        from fastapi.responses import FileResponse
        return FileResponse(
            path=str(file_path),
            media_type="image/*",
            filename=filename
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取背景图片失败: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="获取背景图片失败"
        )