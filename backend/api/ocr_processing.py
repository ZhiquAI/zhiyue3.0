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
import time
import heapq
from dataclasses import dataclass, field
from enum import Enum

try:
    from database import get_db
    from auth import get_current_user
    from models.production_models import User, AnswerSheet, GradingTask
    from services.gemini_ocr_service import GeminiOCRService
    from services.question_segmentation_service import QuestionSegmentationService
    from services.ocr_service import OCRService
except ImportError:
    from db_connection import get_db
    from auth import get_current_user
    from models.production_models import User, AnswerSheet, GradingTask
    try:
        from services.gemini_ocr_service import GeminiOCRService
        from services.question_segmentation_service import QuestionSegmentationService
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
        
        class QuestionSegmentationService:
            def segment_questions(self, ocr_result):
                return []
            
            def validate_segmentation(self, segments):
                return {"quality_level": "poor", "total_questions": 0}
            
            def export_segmentation_result(self, segments):
                return {"questions": []}
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

# 初始化服务
# ocr_service = GeminiOCRService() # 将在依赖注入中创建
segmentation_service = QuestionSegmentationService()

# 线程池执行器
executor = ThreadPoolExecutor(max_workers=settings.OCR_BATCH_SIZE)

# 任务优先级枚举
class TaskPriority(Enum):
    LOW = 3
    NORMAL = 2
    HIGH = 1
    URGENT = 0

@dataclass
class PriorityTask:
    priority: int
    task_id: str
    exam_id: str
    answer_sheet_ids: list
    created_at: float = field(default_factory=time.time)
    
    def __lt__(self, other):
        return self.priority < other.priority

# 优先级队列和任务缓存
task_queue = []
task_cache = {}
queue_lock = asyncio.Lock()

@router.post("/grade_subjective/{answer_sheet_id}", status_code=status.HTTP_202_ACCEPTED)
async def grade_subjective_questions_endpoint(
    answer_sheet_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """触发单个答题卡的主观题智能评分"""
    answer_sheet = db.query(AnswerSheet).filter(AnswerSheet.id == answer_sheet_id).first()
    if not answer_sheet:
        raise HTTPException(status_code=404, detail="答题卡不存在")

    # 权限检查 (示例)
    # if answer_sheet.exam.created_by != current_user.id:
    #     raise HTTPException(status_code=403, detail="无权操作")

    ocr_service = OCRService(db)
    background_tasks.add_task(ocr_service.grade_subjective_questions, answer_sheet_id)

    return {"message": "主观题评分任务已启动", "answer_sheet_id": answer_sheet_id}


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
        
        # 更新OCR结果
        answer_sheet.ocr_result = result["recognized_data"]
        answer_sheet.ocr_confidence = result["confidence"]
        answer_sheet.ocr_status = "completed" if result["success"] else "failed"
        
        # 如果OCR识别成功，进行题目分割
        segmented_questions = None
        segmentation_quality = None
        
        if result["success"] and result["recognized_data"]:
            try:
                # 执行题目分割
                segments = segmentation_service.segment_questions(result["recognized_data"])
                
                # 验证分割质量
                segmentation_quality = segmentation_service.validate_segmentation(segments)
                
                # 导出分割结果
                segmented_questions = segmentation_service.export_segmentation_result(segments)
                
                # 保存分割结果到答题卡
                answer_sheet.segmented_questions = segmented_questions
                answer_sheet.segmentation_quality = segmentation_quality
                
            except Exception as seg_error:
                # 分割失败不影响OCR结果
                print(f"题目分割失败: {str(seg_error)}")
                answer_sheet.segmented_questions = None
                answer_sheet.segmentation_quality = {"quality_level": "failed", "error": str(seg_error)}
            
            # 提取学生信息
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
    
    # 验证优先级
    priority_map = {
        1: TaskPriority.URGENT.value,
        2: TaskPriority.HIGH.value,
        3: TaskPriority.NORMAL.value,
        4: TaskPriority.LOW.value,
        5: TaskPriority.LOW.value
    }
    
    priority_value = priority_map.get(request.priority, TaskPriority.NORMAL.value)
    
    # 创建批处理任务
    task_id = str(uuid.uuid4())
    
    # 初始化任务状态
    task_cache[task_id] = {
        "status": "queued",
        "priority": request.priority,
        "progress": 0.0,
        "total_sheets": len(answer_sheets),
        "processed_count": 0,
        "success_count": 0,
        "failed_count": 0,
        "started_at": datetime.utcnow(),
        "queue_time": datetime.utcnow(),
        "processing_start_time": None,
        "estimated_completion": None,
        "average_processing_time": None,
        "current_sheet": None,
        "queue_position": 0,
        "results": []
    }
    
    # 创建优先级任务并加入队列
    priority_task = PriorityTask(
        priority=priority_value,
        task_id=task_id,
        exam_id=answer_sheets[0].exam_id if answer_sheets else "",
        answer_sheet_ids=request.answer_sheet_ids
    )
    
    async with queue_lock:
        heapq.heappush(task_queue, priority_task)
        task_cache[task_id]["queue_position"] = len(task_queue)
    
    # 创建数据库任务记录
    for sheet in answer_sheets:
        grading_task = GradingTask(
            id=str(uuid.uuid4()),
            answer_sheet_id=sheet.id,
            task_type="ocr",
            priority=request.priority,
            status="queued"
        )
        db.add(grading_task)
    
    db.commit()
    
    # 启动队列处理器（如果还没有运行）
    background_tasks.add_task(process_task_queue)
    
    return {
        "task_id": task_id,
        "message": f"批量OCR任务已启动，共{len(answer_sheets)}张答题卡"
    }

async def process_task_queue():
    """处理任务队列"""
    while True:
        try:
            async with queue_lock:
                if not task_queue:
                    await asyncio.sleep(5)  # 队列为空时等待
                    continue
                
                # 获取最高优先级任务
                priority_task = heapq.heappop(task_queue)
            
            # 处理任务
            await process_batch_ocr_background(
                priority_task.task_id,
                priority_task.answer_sheet_ids,
                priority_task.priority
            )
            
        except Exception as e:
            print(f"队列处理错误: {str(e)}")
            await asyncio.sleep(1)

async def process_batch_ocr_background(task_id: str, answer_sheet_ids: List[str], priority: int):
    """后台批量OCR处理"""
    try:
        # 更新任务状态为进行中
        task_cache[task_id]["status"] = "processing"
        task_cache[task_id]["processing_start_time"] = time.time()
        task_cache[task_id]["queue_position"] = 0
        task_cache[task_id]["progress_details"] = []
        
        # 获取数据库会话
        from database import SessionLocal
        db = SessionLocal()
        
        try:
            # 分批处理
            batch_size = settings.OCR_BATCH_SIZE
            processing_times = []
            
            for i in range(0, len(answer_sheet_ids), batch_size):
                batch_ids = answer_sheet_ids[i:i + batch_size]
                batch_start_time = time.time()
                
                # 并行处理当前批次
                tasks = []
                for sheet_id in batch_ids:
                    task_cache[task_id]["current_sheet"] = sheet_id
                    task = asyncio.create_task(process_single_sheet_internal(sheet_id, db))
                    tasks.append(task)
                
                # 等待当前批次完成
                batch_results = await asyncio.gather(*tasks, return_exceptions=True)
                batch_end_time = time.time()
                batch_processing_time = batch_end_time - batch_start_time
                processing_times.append(batch_processing_time)
                
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
                
                # 更新进度和统计信息
                progress = task_cache[task_id]["processed_count"] / task_cache[task_id]["total_sheets"]
                task_cache[task_id]["progress"] = progress
                
                # 计算平均处理时间和预估完成时间
                if processing_times:
                    avg_time = sum(processing_times) / len(processing_times)
                    task_cache[task_id]["average_processing_time"] = avg_time
                    
                    remaining_batches = (len(answer_sheet_ids) - task_cache[task_id]["processed_count"]) / batch_size
                    estimated_remaining_time = remaining_batches * avg_time
                    task_cache[task_id]["estimated_completion"] = time.time() + estimated_remaining_time
                
                # 记录详细进度
                progress_detail = {
                    "batch_index": i // batch_size + 1,
                    "batch_size": len(batch_ids),
                    "processing_time": batch_processing_time,
                    "timestamp": time.time(),
                    "successful_in_batch": sum(1 for r in batch_results if not isinstance(r, Exception) and r.get("status") == "completed"),
                    "failed_in_batch": sum(1 for r in batch_results if isinstance(r, Exception) or (not isinstance(r, Exception) and r.get("status") != "completed"))
                }
                task_cache[task_id]["progress_details"].append(progress_detail)
                
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
        
        # 更新OCR结果
        answer_sheet.ocr_result = result["recognized_data"]
        answer_sheet.ocr_confidence = result["confidence"]
        answer_sheet.ocr_status = "completed" if result["success"] else "failed"
        
        # 如果OCR识别成功，进行题目分割
        segmented_questions = None
        segmentation_quality = None
        
        if result["success"] and result["recognized_data"]:
            try:
                # 执行题目分割
                segments = segmentation_service.segment_questions(result["recognized_data"])
                
                # 验证分割质量
                segmentation_quality = segmentation_service.validate_segmentation(segments)
                
                # 导出分割结果
                segmented_questions = segmentation_service.export_segmentation_result(segments)
                
                # 保存分割结果到答题卡
                answer_sheet.segmented_questions = segmented_questions
                answer_sheet.segmentation_quality = segmentation_quality
                
            except Exception as seg_error:
                # 分割失败不影响OCR结果
                print(f"题目分割失败: {str(seg_error)}")
                answer_sheet.segmented_questions = None
                answer_sheet.segmentation_quality = {"quality_level": "failed", "error": str(seg_error)}
            
            # 提取学生信息
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

@router.post("/retry", response_model=dict)
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

@router.get("/statistics", response_model=dict)
async def get_ocr_statistics(
    exam_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取OCR处理统计信息"""
    query = db.query(AnswerSheet)
    
    if exam_id:
        # 权限检查
        from models.production_models import Exam
        exam = db.query(Exam).filter(Exam.id == exam_id).first()
        if not exam:
            raise HTTPException(status_code=404, detail="考试不存在")
        
        if current_user.role == "teacher" and exam.created_by != current_user.id:
            raise HTTPException(status_code=403, detail="无权访问此考试")
        
        query = query.filter(AnswerSheet.exam_id == exam_id)
    elif current_user.role == "teacher":
        # 教师只能看自己创建的考试
        from models.production_models import Exam
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