"""
文件上传API端点
"""

from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import logging

try:
    from backend.database import get_db
    from backend.services.file_storage_service import FileStorageService
    from backend.services.ocr_service import OCRService
    from backend.models.file_storage import FileStorage
    from backend.auth import get_current_user
except ImportError:
    from database import get_db
    from services.file_storage_service import FileStorageService
    from services.ocr_service import OCRService
    from models.file_storage import FileStorage
    from auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/files", tags=["文件管理"])

@router.post("/upload/paper", response_model=dict)
async def upload_paper(
    exam_id: str = Form(...),
    paper_type: str = Form(..., description="试卷类型: original/reference_answer"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """上传试卷文件"""
    try:
        storage_service = FileStorageService(db)
        
        # 验证试卷类型
        if paper_type not in ['original', 'reference_answer']:
            raise HTTPException(status_code=400, detail="无效的试卷类型")
        
        # 上传文件
        file_record = await storage_service.upload_file(
            file=file,
            exam_id=exam_id,
            file_category='paper',
            uploaded_by=current_user.id
        )
        
        return {
            "success": True,
            "message": "试卷上传成功",
            "data": {
                "file_id": file_record.id,
                "filename": file_record.original_filename,
                "file_size": file_record.file_size,
                "processing_status": file_record.processing_status
            }
        }
        
    except Exception as e:
        logger.error(f"Paper upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"试卷上传失败: {str(e)}")

@router.post("/upload/answer-sheets", response_model=dict)
async def upload_answer_sheets(
    exam_id: str = Form(...),
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """批量上传答题卡"""
    try:
        storage_service = FileStorageService(db)
        
        # 批量上传
        results = await storage_service.batch_upload_answer_sheets(
            files=files,
            exam_id=exam_id,
            uploaded_by=current_user.id
        )
        
        return {
            "success": True,
            "message": f"答题卡上传完成，成功{results['success_count']}个，失败{results['failed_count']}个",
            "data": results
        }
        
    except Exception as e:
        logger.error(f"Answer sheets upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"答题卡上传失败: {str(e)}")

@router.get("/exam/{exam_id}", response_model=dict)
async def get_exam_files(
    exam_id: str,
    file_category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """获取考试相关文件列表"""
    try:
        storage_service = FileStorageService(db)
        files = storage_service.get_files_by_exam(exam_id, file_category)
        
        return {
            "success": True,
            "data": [
                {
                    "id": f.id,
                    "original_filename": f.original_filename,
                    "file_category": f.file_category,
                    "file_purpose": f.file_purpose,
                    "file_size": f.file_size,
                    "processing_status": f.processing_status,
                    "created_at": f.created_at.isoformat(),
                    "mime_type": f.mime_type
                }
                for f in files
            ]
        }
        
    except Exception as e:
        logger.error(f"Get exam files failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取文件列表失败: {str(e)}")

@router.get("/download/{file_id}")
async def download_file(
    file_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
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
        
    except Exception as e:
        logger.error(f"File download failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"文件下载失败: {str(e)}")

@router.delete("/{file_id}", response_model=dict)
async def delete_file(
    file_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """删除文件"""
    try:
        storage_service = FileStorageService(db)
        success = storage_service.delete_file(file_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="文件不存在或删除失败")
        
        return {
            "success": True,
            "message": "文件删除成功"
        }
        
    except Exception as e:
        logger.error(f"File deletion failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"文件删除失败: {str(e)}")

@router.post("/process/{file_id}", response_model=dict)
async def process_file(
    file_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """手动触发文件处理"""
    try:
        storage_service = FileStorageService(db)
        file_record = storage_service.get_file_by_id(file_id)
        
        if not file_record:
            raise HTTPException(status_code=404, detail="文件不存在")
        
        ocr_service = OCRService(db)
        
        if file_record.file_category == 'paper':
            result = await ocr_service.process_paper_document(file_record)
        elif file_record.file_category == 'answer_sheet':
            result = await ocr_service.process_answer_sheet(file_record)
        else:
            raise HTTPException(status_code=400, detail="不支持的文件类型")
        
        return {
            "success": True,
            "message": "文件处理完成",
            "data": result
        }
        
    except Exception as e:
        logger.error(f"File processing failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"文件处理失败: {str(e)}")

@router.get("/processing-status/{file_id}", response_model=dict)
async def get_processing_status(
    file_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """获取文件处理状态"""
    try:
        storage_service = FileStorageService(db)
        file_record = storage_service.get_file_by_id(file_id)
        
        if not file_record:
            raise HTTPException(status_code=404, detail="文件不存在")
        
        return {
            "success": True,
            "data": {
                "file_id": file_record.id,
                "processing_status": file_record.processing_status,
                "processing_result": file_record.processing_result,
                "error_message": file_record.error_message,
                "updated_at": file_record.updated_at.isoformat()
            }
        }
        
    except Exception as e:
        logger.error(f"Get processing status failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取处理状态失败: {str(e)}")