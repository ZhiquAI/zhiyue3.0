"""
OCR处理API
"""

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime
import uuid
import asyncio
from concurrent.futures import ThreadPoolExecutor
import json

try:
    from backend.database import get_db
    from backend.auth import get_current_user
    from backend.models.production_models import User, AnswerSheet, GradingTask
    from backend.services.gemini_ocr_service import GeminiOCRService
except ImportError:
    from database import get_db
    from auth import get_current_user
    from models.production_models import User, AnswerSheet, GradingTask
    try:
        from services.gemini_ocr_service import GeminiOCRService
    except ImportError:
    # 如果导入失败，创建一个模拟服务
    class GeminiOCRService:
        async def process_answer_sheet(self, image_path):
            return {
                "success": False,
                "error": "OCR服务未配置",
                "recognized_data": {},
                "confidence": 0.0
            }
from config.settings import settings

router = APIRouter(prefix="/api/ocr", tags=["OCR处理"])

# Pydantic 模型
class OCRRequest(BaseModel):
    answer_sheet_ids: List[str]
    priority: Optional[int] = 5
    batch_mode: Optional[bool] = True

class OCRResult(BaseModel):
    answer_sheet_id: str
    status: str
    confidence: Optional[float] = None
    recognized_text: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    processing_time: Optional[float] = None

class OCRBatchResult(BaseModel):
    task_id: str
    total_sheets: int
    processed_count: int
    success_count: int
    failed_count: int
    results: List[OCRResult]
    started_at: datetime
    completed_at: Optional[datetime] = None

class TaskStatus(BaseModel):
    task_id: str
    status: str
    progress: float
    total_sheets: int
    processed_count: int
    success_count: int
    failed_count: int
    started_at: datetime
    estimated_completion: Optional[datetime] = None
    current_sheet: Optional[str] = None

# 初始化OCR服务
ocr_service = GeminiOCRService()

# 线程池执行器
executor = ThreadPoolExecutor(max_workers=settings.OCR_BATCH_SIZE)

# 存储任务状态的内存缓存（生产环境应使用Redis）
task_cache = {}

@router.post("/process", response_model=OCRResult)
async def process_single_answer_sheet(
    answer_sheet_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """处理单个答题卡的OCR识别"""
    answer_sheet = db.query(AnswerSheet).filter(AnswerSheet.id == answer_sheet_id).first()
    
    if not answer_sheet:
        raise HTTPException(status_code=404, detail="答题卡不存在")
    
    # 权限检查
    exam = answer_sheet.exam
    if current_user.role == "teacher" and exam.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="无权处理此答题卡")
    
    try:
        # 更新状态为处理中
        answer_sheet.ocr_status = "processing"
        db.commit()
        
        # 执行OCR识别
        start_time = datetime.utcnow()
        result = await ocr_service.process_answer_sheet(answer_sheet.original_file_path)
        processing_time = (datetime.utcnow() - start_time).total_seconds()
        
        # 更新结果
        answer_sheet.ocr_result = result["recognized_data"]
        answer_sheet.ocr_confidence = result["confidence"]
        answer_sheet.ocr_status = "completed" if result["success"] else "failed"
        
        # 如果识别成功，提取学生信息
        if result["success"] and result["recognized_data"]:
            student_info = result["recognized_data"].get("student_info", {})
            if student_info:
                answer_sheet.student_id = student_info.get("student_id")
                answer_sheet.student_name = student_info.get("student_name")
                answer_sheet.class_name = student_info.get("class_name")
        
        answer_sheet.updated_at = datetime.utcnow()
        db.commit()
        
        return OCRResult(
            answer_sheet_id=answer_sheet_id,
            status=answer_sheet.ocr_status,
            confidence=answer_sheet.ocr_confidence,
            recognized_text=answer_sheet.ocr_result,
            processing_time=processing_time
        )
        
    except Exception as e:
        # 更新失败状态
        answer_sheet.ocr_status = "failed"
        answer_sheet.updated_at = datetime.utcnow()
        db.commit()
        
        return OCRResult(
            answer_sheet_id=answer_sheet_id,
            status="failed",
            error_message=str(e)
        )

@router.post("/batch-process", response_model=Dict[str, str])
async def start_batch_ocr_processing(
    request: OCRRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """启动批量OCR处理任务"""
    # 验证答题卡存在性和权限
    answer_sheets = db.query(AnswerSheet).filter(AnswerSheet.id.in_(request.answer_sheet_ids)).all()
    
    if len(answer_sheets) != len(request.answer_sheet_ids):
        raise HTTPException(status_code=400, detail="部分答题卡不存在")
    
    # 权限检查
    for sheet in answer_sheets:
        exam = sheet.exam
        if current_user.role == "teacher" and exam.created_by != current_user.id:
            raise HTTPException(status_code=403, detail="无权处理部分答题卡")
    
    # 创建批处理任务
    task_id = str(uuid.uuid4())
    
    # 初始化任务状态
    task_cache[task_id] = {
        "status": "pending",
        "progress": 0.0,
        "total_sheets": len(answer_sheets),
        "processed_count": 0,
        "success_count": 0,
        "failed_count": 0,
        "started_at": datetime.utcnow(),
        "results": []
    }
    
    # 创建数据库任务记录
    for sheet in answer_sheets:
        grading_task = GradingTask(
            id=str(uuid.uuid4()),
            answer_sheet_id=sheet.id,
            task_type="ocr",
            priority=request.priority,
            status="pending"
        )
        db.add(grading_task)
    
    db.commit()
    
    # 启动后台处理
    background_tasks.add_task(
        process_batch_ocr_background,
        task_id,
        request.answer_sheet_ids,
        request.priority
    )
    
    return {
        "task_id": task_id,
        "message": f"批量OCR任务已启动，共{len(answer_sheets)}张答题卡"
    }

async def process_batch_ocr_background(task_id: str, answer_sheet_ids: List[str], priority: int):
    """后台批量OCR处理"""
    try:
        # 更新任务状态为进行中
        task_cache[task_id]["status"] = "processing"
        
        # 获取数据库会话
        from backend.database import SessionLocal
        db = SessionLocal()
        
        try:
            # 分批处理
            batch_size = settings.OCR_BATCH_SIZE
            for i in range(0, len(answer_sheet_ids), batch_size):
                batch_ids = answer_sheet_ids[i:i + batch_size]
                
                # 并行处理当前批次
                tasks = []
                for sheet_id in batch_ids:
                    task_cache[task_id]["current_sheet"] = sheet_id
                    task = asyncio.create_task(process_single_sheet_internal(sheet_id, db))
                    tasks.append(task)
                
                # 等待当前批次完成
                batch_results = await asyncio.gather(*tasks, return_exceptions=True)
                
                # 更新结果
                for j, result in enumerate(batch_results):
                    sheet_id = batch_ids[j]
                    task_cache[task_id]["processed_count"] += 1
                    
                    if isinstance(result, Exception):
                        task_cache[task_id]["failed_count"] += 1
                        task_cache[task_id]["results"].append({
                            "answer_sheet_id": sheet_id,
                            "status": "failed",
                            "error_message": str(result)
                        })
                    else:
                        if result["status"] == "completed":
                            task_cache[task_id]["success_count"] += 1
                        else:
                            task_cache[task_id]["failed_count"] += 1
                        
                        task_cache[task_id]["results"].append(result)
                
                # 更新进度
                progress = task_cache[task_id]["processed_count"] / task_cache[task_id]["total_sheets"]
                task_cache[task_id]["progress"] = progress
                
                # 避免过度并发
                if i + batch_size < len(answer_sheet_ids):
                    await asyncio.sleep(1)
            
            # 任务完成
            task_cache[task_id]["status"] = "completed"
            task_cache[task_id]["completed_at"] = datetime.utcnow()
            task_cache[task_id]["current_sheet"] = None
            
        finally:
            db.close()
            
    except Exception as e:
        task_cache[task_id]["status"] = "failed"
        task_cache[task_id]["error"] = str(e)

async def process_single_sheet_internal(sheet_id: str, db: Session) -> Dict[str, Any]:
    """内部单个答题卡处理函数"""
    try:
        answer_sheet = db.query(AnswerSheet).filter(AnswerSheet.id == sheet_id).first()
        if not answer_sheet:
            return {
                "answer_sheet_id": sheet_id,
                "status": "failed",
                "error_message": "答题卡不存在"
            }
        
        # 更新状态
        answer_sheet.ocr_status = "processing"
        db.commit()
        
        # 执行OCR
        start_time = datetime.utcnow()
        result = await ocr_service.process_answer_sheet(answer_sheet.original_file_path)
        processing_time = (datetime.utcnow() - start_time).total_seconds()
        
        # 更新结果
        answer_sheet.ocr_result = result["recognized_data"]
        answer_sheet.ocr_confidence = result["confidence"]
        answer_sheet.ocr_status = "completed" if result["success"] else "failed"
        
        # 提取学生信息
        if result["success"] and result["recognized_data"]:
            student_info = result["recognized_data"].get("student_info", {})
            if student_info:
                answer_sheet.student_id = student_info.get("student_id")
                answer_sheet.student_name = student_info.get("student_name")
                answer_sheet.class_name = student_info.get("class_name")
        
        answer_sheet.updated_at = datetime.utcnow()
        db.commit()
        
        return {
            "answer_sheet_id": sheet_id,
            "status": answer_sheet.ocr_status,
            "confidence": answer_sheet.ocr_confidence,
            "recognized_text": answer_sheet.ocr_result,
            "processing_time": processing_time
        }
        
    except Exception as e:
        # 更新失败状态
        if answer_sheet:
            answer_sheet.ocr_status = "failed"
            answer_sheet.updated_at = datetime.utcnow()
            db.commit()
        
        return {
            "answer_sheet_id": sheet_id,
            "status": "failed",
            "error_message": str(e)
        }

@router.get("/task/{task_id}/status", response_model=TaskStatus)
async def get_task_status(
    task_id: str,
    current_user: User = Depends(get_current_user)
):
    """获取批处理任务状态"""
    if task_id not in task_cache:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    task_data = task_cache[task_id]
    
    # 估算完成时间
    estimated_completion = None
    if task_data["status"] == "processing" and task_data["processed_count"] > 0:
        elapsed = (datetime.utcnow() - task_data["started_at"]).total_seconds()
        avg_time_per_sheet = elapsed / task_data["processed_count"]
        remaining_sheets = task_data["total_sheets"] - task_data["processed_count"]
        remaining_time = remaining_sheets * avg_time_per_sheet
        estimated_completion = datetime.utcnow().timestamp() + remaining_time
        estimated_completion = datetime.fromtimestamp(estimated_completion)
    
    return TaskStatus(
        task_id=task_id,
        status=task_data["status"],
        progress=task_data["progress"],
        total_sheets=task_data["total_sheets"],
        processed_count=task_data["processed_count"],
        success_count=task_data["success_count"],
        failed_count=task_data["failed_count"],
        started_at=task_data["started_at"],
        estimated_completion=estimated_completion,
        current_sheet=task_data.get("current_sheet")
    )

@router.get("/task/{task_id}/results", response_model=OCRBatchResult)
async def get_task_results(
    task_id: str,
    current_user: User = Depends(get_current_user)
):
    """获取批处理任务结果"""
    if task_id not in task_cache:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    task_data = task_cache[task_id]
    
    return OCRBatchResult(
        task_id=task_id,
        total_sheets=task_data["total_sheets"],
        processed_count=task_data["processed_count"],
        success_count=task_data["success_count"],
        failed_count=task_data["failed_count"],
        results=[OCRResult(**result) for result in task_data["results"]],
        started_at=task_data["started_at"],
        completed_at=task_data.get("completed_at")
    )

@router.post("/retry")
async def retry_failed_ocr(
    answer_sheet_ids: List[str],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """重试失败的OCR任务"""
    answer_sheets = db.query(AnswerSheet).filter(
        AnswerSheet.id.in_(answer_sheet_ids),
        AnswerSheet.ocr_status == "failed"
    ).all()
    
    if not answer_sheets:
        raise HTTPException(status_code=400, detail="没有找到失败的OCR任务")
    
    # 权限检查
    for sheet in answer_sheets:
        exam = sheet.exam
        if current_user.role == "teacher" and exam.created_by != current_user.id:
            raise HTTPException(status_code=403, detail="无权处理部分答题卡")
    
    # 重置状态为待处理
    for sheet in answer_sheets:
        sheet.ocr_status = "pending"
        sheet.ocr_result = None
        sheet.ocr_confidence = None
        sheet.updated_at = datetime.utcnow()
    
    db.commit()
    
    return {"message": f"已重置{len(answer_sheets)}个失败任务，可重新处理"}

@router.get("/statistics")
async def get_ocr_statistics(
    exam_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取OCR处理统计信息"""
    query = db.query(AnswerSheet)
    
    if exam_id:
        # 权限检查
        from backend.models.production_models import Exam
        exam = db.query(Exam).filter(Exam.id == exam_id).first()
        if not exam:
            raise HTTPException(status_code=404, detail="考试不存在")
        
        if current_user.role == "teacher" and exam.created_by != current_user.id:
            raise HTTPException(status_code=403, detail="无权访问此考试")
        
        query = query.filter(AnswerSheet.exam_id == exam_id)
    elif current_user.role == "teacher":
        # 教师只能看自己创建的考试
        from backend.models.production_models import Exam
        teacher_exams = db.query(Exam).filter(Exam.created_by == current_user.id).all()
        exam_ids = [exam.id for exam in teacher_exams]
        query = query.filter(AnswerSheet.exam_id.in_(exam_ids))
    
    # 统计各状态数量
    from sqlalchemy import func
    status_stats = db.query(
        AnswerSheet.ocr_status,
        func.count(AnswerSheet.id).label('count')
    ).filter(query.whereclause).group_by(AnswerSheet.ocr_status).all()
    
    # 计算平均置信度
    avg_confidence = db.query(func.avg(AnswerSheet.ocr_confidence)).filter(
        query.whereclause,
        AnswerSheet.ocr_status == "completed"
    ).scalar()
    
    return {
        "status_statistics": {status: count for status, count in status_stats},
        "average_confidence": float(avg_confidence) if avg_confidence else None,
        "total_sheets": sum(count for _, count in status_stats)
    }