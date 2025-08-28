"""文件上传API端点"""

import json
import logging
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

try:
    from database import get_db
    from services.file_storage_service import FileStorageService
    from services.exam_service import ExamService
    
    from services.processing_queue_service import ProcessingQueueService
    from services.auth_service import get_current_user
    from models.user import User
    
    from models.processing_queue import (
        ProcessingQueue, ProcessingStatus
    )
    from models.file_storage import FileStorage
    from utils.response import success_response
    from utils.file_security import FileSecurityValidator
    from utils.logger import get_logger
    from config import settings
except ImportError as e:
    logging.error(f"Import error: {e}")
    raise

logger = get_logger(__name__)
router = APIRouter(prefix="/api/files", tags=["files"])

# 初始化安全验证器
security_validator = FileSecurityValidator()


@router.post("/upload/answer-sheets")
async def upload_answer_sheets(
    exam_id: int = Form(...),
    files: List[UploadFile] = File(...),
    processing_config: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """批量上传答题卡"""
    try:
        # 验证考试是否存在
        exam_service = ExamService(db)
        exam = exam_service.get_exam_by_id(exam_id)
        if not exam:
            raise HTTPException(status_code=404, detail="考试不存在")

        # 验证文件
        if not files:
            raise HTTPException(status_code=400, detail="请选择要上传的文件")

        # 使用增强的安全验证
        for file in files:
            validation_result = security_validator.validate_file(
                file=file,
                allowed_types=[".pdf", ".jpg", ".jpeg", ".png"],
                max_size=10 * 1024 * 1024  # 10MB for answer sheets
            )
            
            logger.info(
                f"Security validation passed for {file.filename}: "
                f"type={validation_result['mime_type']}, "
                f"size={validation_result['file_size']}"
            )

        # 解析处理配置
        config = None
        if processing_config:
            try:
                config = json.loads(processing_config)
            except json.JSONDecodeError:
                raise HTTPException(
                    status_code=400, detail="处理配置格式错误"
                )

        # 批量上传文件
        storage_service = FileStorageService(db)
        result = await storage_service.batch_upload_answer_sheets(
            exam_id=exam_id,
            files=files,
            user_id=current_user.id,
            processing_config=config
        )

        return success_response(data=result, message="答题卡上传成功")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Answer sheet upload failed: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"答题卡上传失败: {str(e)}"
        )


@router.get("/exam/{exam_id}")
async def get_exam_files(
    exam_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取考试的文件列表"""
    try:
        storage_service = FileStorageService(db)
        files = storage_service.get_files_by_exam(exam_id)
        return success_response(data=files)
    except Exception as e:
        logger.error(f"Get exam files failed: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"获取文件列表失败: {str(e)}"
        )


@router.get("/download/{file_id}")
async def download_file(
    file_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """下载文件"""
    try:
        storage_service = FileStorageService(db)
        file_record = storage_service.get_file_by_id(file_id)

        if not file_record:
            raise HTTPException(status_code=404, detail="文件不存在")

        file_path = Path(settings.STORAGE_BASE_PATH) / file_record.file_path

        if not file_path.exists():
            raise HTTPException(status_code=404, detail="文件不存在")

        return FileResponse(
            path=str(file_path),
            filename=file_record.original_filename,
            media_type=file_record.mime_type
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"File download failed: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"文件下载失败: {str(e)}"
        )


@router.delete("/delete/{file_id}")
async def delete_file(
    file_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """删除文件"""
    try:
        storage_service = FileStorageService(db)
        success = storage_service.delete_file(file_id)

        if not success:
            raise HTTPException(status_code=404, detail="文件不存在")

        return success_response(message="文件删除成功")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"File deletion failed: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"文件删除失败: {str(e)}"
        )


@router.post("/process/paper/{file_id}")
async def trigger_paper_processing(
    file_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """手动触发试卷文件处理"""
    try:
        storage_service = FileStorageService(db)
        file_record = storage_service.get_file_by_id(file_id)

        if not file_record:
            raise HTTPException(status_code=404, detail="文件不存在")

        if file_record.file_type != "paper":
            raise HTTPException(
                status_code=400, detail="只能处理试卷文件"
            )

        # 添加到处理队列
        queue_service = ProcessingQueueService(db)
        task = queue_service.add_task(
            file_id=file_id,
            task_type="paper_ocr",
            priority=1
        )

        return success_response(
            data={"task_id": task.id}, message="试卷处理任务已添加到队列"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Paper processing trigger failed: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"触发试卷处理失败: {str(e)}"
        )


@router.post("/process/answer-sheet/{file_id}")
async def trigger_answer_sheet_processing(
    file_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """手动触发答题卡文件处理"""
    try:
        storage_service = FileStorageService(db)
        file_record = storage_service.get_file_by_id(file_id)

        if not file_record:
            raise HTTPException(status_code=404, detail="文件不存在")

        if file_record.file_type != "answer_sheet":
            raise HTTPException(
                status_code=400, detail="只能处理答题卡文件"
            )

        # 添加到处理队列
        queue_service = ProcessingQueueService(db)
        task = queue_service.add_task(
            file_id=file_id,
            task_type="answer_recognition",
            priority=2
        )

        return success_response(
            data={"task_id": task.id}, message="答题卡处理任务已添加到队列"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Answer sheet processing trigger failed: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"触发答题卡处理失败: {str(e)}"
        )


@router.get("/processing-status/{file_id}")
async def get_file_processing_status(
    file_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取文件处理状态"""
    try:
        queue_service = ProcessingQueueService(db)
        tasks = queue_service.get_tasks_by_file_id(file_id)

        if not tasks:
            return success_response(
                data={"status": "not_queued", "tasks": []}
            )

        task_data = []
        for task in tasks:
            task_data.append({
                "id": task.id,
                "task_type": task.task_type,
                "status": task.status.value,
                "progress": task.progress,
                "error_message": task.error_message,
                "created_at": task.created_at.isoformat(),
                "updated_at": task.updated_at.isoformat()
            })

        return success_response(data={"tasks": task_data})

    except Exception as e:
        logger.error(f"Get processing status failed: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"获取处理状态失败: {str(e)}"
        )


@router.get("/exam/{exam_id}/processing-stats")
async def get_exam_processing_stats(
    exam_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取考试答题卡处理统计"""
    try:
        # 获取考试的所有答题卡文件
        files = db.query(FileStorage).filter(
            FileStorage.exam_id == exam_id,
            FileStorage.file_type == "answer_sheet"
        ).all()

        total_count = len(files)
        completed_count = 0
        processing_count = 0
        error_count = 0
        pending_count = 0
        matched_students = 0
        unmatched_students = 0

        for file in files:
            # 检查处理状态
            tasks = db.query(ProcessingQueue).filter(
                ProcessingQueue.file_id == file.id
            ).all()

            if not tasks:
                pending_count += 1
            else:
                latest_task = max(tasks, key=lambda t: t.updated_at)
                if latest_task.status == ProcessingStatus.COMPLETED:
                    completed_count += 1
                elif latest_task.status == ProcessingStatus.PROCESSING:
                    processing_count += 1
                elif latest_task.status == ProcessingStatus.FAILED:
                    error_count += 1
                else:
                    pending_count += 1

            # 检查学生匹配状态
            if hasattr(file, 'student_id') and file.student_id:
                matched_students += 1
            else:
                unmatched_students += 1

        stats = {
            "total_count": total_count,
            "completed_count": completed_count,
            "processing_count": processing_count,
            "error_count": error_count,
            "pending_count": pending_count,
            "matched_students": matched_students,
            "unmatched_students": unmatched_students,
            "completion_rate": (
                completed_count / total_count * 100 if total_count > 0 else 0
            ),
            "match_rate": (
                matched_students / total_count * 100 if total_count > 0 else 0
            )
        }

        return success_response(data=stats)

    except Exception as e:
        logger.error(f"Get processing stats failed: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"获取处理统计失败: {str(e)}"
        )


@router.get("/segmentation/{file_id}", response_model=dict)
async def get_file_segmentation(
    file_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取文件的分割信息"""
    try:
        storage_service = FileStorageService(db)
        file_record = storage_service.get_file_by_id(file_id)

        if not file_record:
            raise HTTPException(status_code=404, detail="文件不存在")

        # 这里应该返回文件的分割信息
        # 具体实现取决于分割数据的存储方式
        segmentation_data = {
            "file_id": file_id,
            "segments": [],  # 实际的分割数据
            "metadata": {}
        }

        return success_response(data=segmentation_data)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get file segmentation failed: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"获取文件分割信息失败: {str(e)}"
        )