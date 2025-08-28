"""
阅卷前处理工作流API
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional, List
from pydantic import BaseModel
from pathlib import Path
import uuid
import logging
from datetime import datetime

from db_connection import get_db
from models.production_models import User
from models.grading_models import PreGradingWorkflow
from auth import get_current_user
from config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/pre-grading", tags=["阅卷前处理"])

# 数据模型
class PreGradingConfiguration(BaseModel):
    exam: Dict[str, Any]
    processing: Dict[str, Any]
    identity: Dict[str, Any]
    structure: Dict[str, Any]

class WorkflowInitRequest(BaseModel):
    examId: str
    configuration: PreGradingConfiguration

class WorkflowResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None

@router.post("/workflows", response_model=WorkflowResponse)
async def initialize_workflow(
    request: WorkflowInitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """初始化阅卷前处理工作流"""
    try:
        # 生成工作流ID
        workflow_id = str(uuid.uuid4())
        
        # 创建工作流状态
        workflow = PreGradingWorkflow(
            id=workflow_id,
            exam_id=request.examId,
            user_id=current_user.id,
            configuration=request.configuration.dict(),
            statistics={
                "totalUploaded": 0,
                "processed": 0,
                "verified": 0,
                "hasIssues": 0,
                "ready": 0
            }
        )
        
        # 存储工作流状态
        db.add(workflow)
        db.commit()
        db.refresh(workflow)
        
        logger.info(f"Pre-grading workflow initialized: {workflow_id} for exam: {request.examId}")
        
        return WorkflowResponse(
            success=True,
            message="阅卷前处理工作流初始化成功",
            data={"workflowId": workflow_id}
        )
        
    except Exception as e:
        logger.error(f"Failed to initialize workflow: {str(e)}")
        raise HTTPException(status_code=500, detail=f"工作流初始化失败: {str(e)}")

@router.get("/workflows/{workflow_id}", response_model=WorkflowResponse)
async def get_workflow_status(
    workflow_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取工作流状态"""
    try:
        workflow = db.query(PreGradingWorkflow).filter(PreGradingWorkflow.id == workflow_id).first()
        if not workflow:
            raise HTTPException(status_code=404, detail="工作流不存在")
        
        # 检查权限
        if workflow.user_id != current_user.id and current_user.role != "admin":
            raise HTTPException(status_code=403, detail="无权访问此工作流")
        
        return WorkflowResponse(
            success=True,
            message="获取工作流状态成功",
            data=workflow.__dict__
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get workflow status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取工作流状态失败: {str(e)}")

@router.put("/workflows/{workflow_id}/stage", response_model=WorkflowResponse)
async def update_workflow_stage(
    workflow_id: str,
    stage: str,
    progress: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """更新工作流阶段"""
    try:
        workflow = db.query(PreGradingWorkflow).filter(PreGradingWorkflow.id == workflow_id).first()
        if not workflow:
            raise HTTPException(status_code=404, detail="工作流不存在")
        
        # 检查权限
        if workflow.user_id != current_user.id and current_user.role != "admin":
            raise HTTPException(status_code=403, detail="无权修改此工作流")
        
        # 更新状态
        workflow.current_stage = stage
        if progress is not None:
            workflow.progress = progress
        
        db.commit()
        db.refresh(workflow)
        
        logger.info(f"Workflow {workflow_id} stage updated to: {stage}")
        
        return WorkflowResponse(
            success=True,
            message="工作流阶段更新成功",
            data=workflow.__dict__
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update workflow stage: {str(e)}")
        raise HTTPException(status_code=500, detail=f"更新工作流阶段失败: {str(e)}")

@router.put("/workflows/{workflow_id}/statistics", response_model=WorkflowResponse)
async def update_workflow_statistics(
    workflow_id: str,
    statistics: Dict[str, int],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """更新工作流统计信息"""
    try:
        workflow = db.query(PreGradingWorkflow).filter(PreGradingWorkflow.id == workflow_id).first()
        if not workflow:
            raise HTTPException(status_code=404, detail="工作流不存在")
        
        # 检查权限
        if workflow.user_id != current_user.id and current_user.role != "admin":
            raise HTTPException(status_code=403, detail="无权修改此工作流")
        
        # 更新统计信息
        workflow.statistics.update(statistics)
        
        db.commit()
        db.refresh(workflow)
        
        logger.info(f"Workflow {workflow_id} statistics updated")
        
        return WorkflowResponse(
            success=True,
            message="工作流统计信息更新成功",
            data=workflow.__dict__
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update workflow statistics: {str(e)}")
        raise HTTPException(status_code=500, detail=f"更新工作流统计信息失败: {str(e)}")

@router.delete("/workflows/{workflow_id}", response_model=WorkflowResponse)
async def delete_workflow(
    workflow_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """删除工作流"""
    try:
        workflow = db.query(PreGradingWorkflow).filter(PreGradingWorkflow.id == workflow_id).first()
        if not workflow:
            raise HTTPException(status_code=404, detail="工作流不存在")
        
        # 检查权限
        if workflow.user_id != current_user.id and current_user.role != "admin":
            raise HTTPException(status_code=403, detail="无权修改此工作流")
        
        db.delete(workflow)
        db.commit()
        
        logger.info(f"Workflow {workflow_id} deleted")
        
        return WorkflowResponse(
            success=True,
            message="工作流删除成功"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete workflow: {str(e)}")
        raise HTTPException(status_code=500, detail=f"删除工作流失败: {str(e)}")

@router.get("/workflows", response_model=WorkflowResponse)
async def list_workflows(
    exam_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取工作流列表"""
    try:
        query = db.query(PreGradingWorkflow)
        if current_user.role != "admin":
            query = query.filter(PreGradingWorkflow.user_id == current_user.id)
        if exam_id:
            query = query.filter(PreGradingWorkflow.exam_id == exam_id)
        
        workflows = query.all()
        return WorkflowResponse(
            success=True,
            message="获取工作流列表成功",
            data={"workflows": [w.__dict__ for w in workflows], "total": len(workflows)}
        )
        
    except Exception as e:
        logger.error(f"Failed to list workflows: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取工作流列表失败: {str(e)}")

@router.post("/workflows/{workflow_id}/process", response_model=WorkflowResponse)
async def process_answer_sheets(
    workflow_id: str,
    answer_sheet_ids: List[str],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """处理（预处理）答题卡"""
    try:
        workflow = db.query(PreGradingWorkflow).filter(PreGradingWorkflow.id == workflow_id).first()
        if not workflow:
            raise HTTPException(status_code=404, detail="工作流不存在")
        
        # 检查权限
        if workflow.user_id != current_user.id and current_user.role != "admin":
            raise HTTPException(status_code=403, detail="无权操作此工作流")

        from services.image_quality_service import image_quality_service
        from services.enhanced_processing_service import enhanced_processing_service
        from models.file_storage import FileStorage

        # 获取答题卡路径
        answer_sheets = db.query(FileStorage).filter(FileStorage.id.in_(answer_sheet_ids)).all()
        if len(answer_sheets) != len(answer_sheet_ids):
            raise HTTPException(status_code=404, detail="部分答题卡不存在")

        # 处理每张答题卡
        for sheet in answer_sheets:
            try:
                # 图像预处理
                preprocessed_image = image_quality_service.preprocess_image(
                    sheet.file_path, 
                    workflow.configuration.get('processing', {}).get('operations', ['correct_skew'])
                )

                # 版面切割
                segments = enhanced_processing_service.segment_image_by_template(
                    preprocessed_image, 
                    workflow.configuration.get('template', {})
                )

                # 保存处理后的图像切片
                output_dir = Path(settings.PROCESSED_IMAGES_DIR) / sheet.id
                output_dir.mkdir(parents=True, exist_ok=True)

                for region, image in segments.items():
                    try:
                        output_path = output_dir / f"{region}.jpg"
                        cv2.imwrite(str(output_path), image)
                    except Exception as e:
                        logger.error(f"保存图像切片失败 {sheet.id}/{region}: {str(e)}")

            except Exception as e:
                logger.error(f"处理答题卡失败 {sheet.id}: {str(e)}")
                # 可以考虑更新答题卡状态为“处理失败”
                continue

        # 更新工作流状态
        workflow.current_stage = "processing"
        workflow.progress = 50 # 示例进度
        db.commit()

        return WorkflowResponse(
            success=True,
            message="答题卡处理任务已开始"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to process answer sheets: {str(e)}")
        raise HTTPException(status_code=500, detail=f"答题卡处理失败: {str(e)}")