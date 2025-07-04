"""
考试管理API
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import uuid
import os
import json

try:
    from backend.database import get_db
    from backend.auth import get_current_user
    from backend.models.production_models import User, Exam, AnswerSheet
    from backend.config.settings import settings
except ImportError:
    from database import get_db
    from auth import get_current_user
    from models.production_models import User, Exam, AnswerSheet
    from config.settings import settings

router = APIRouter(prefix="/api/exams", tags=["考试管理"])

# Pydantic 模型
class ExamCreate(BaseModel):
    name: str
    subject: str
    grade: str
    paper_config: Optional[dict] = None
    grading_config: Optional[dict] = None

class ExamUpdate(BaseModel):
    name: Optional[str] = None
    subject: Optional[str] = None
    grade: Optional[str] = None
    status: Optional[str] = None
    paper_config: Optional[dict] = None
    grading_config: Optional[dict] = None

class ExamResponse(BaseModel):
    id: str
    name: str
    subject: str
    grade: str
    status: str
    paper_config: Optional[dict] = None
    grading_config: Optional[dict] = None
    total_students: int
    completed_count: int
    avg_score: Optional[float] = None
    created_at: datetime
    updated_at: datetime
    creator_name: str

    class Config:
        from_attributes = True

class AnswerSheetResponse(BaseModel):
    id: str
    student_id: Optional[str] = None
    student_name: Optional[str] = None
    class_name: Optional[str] = None
    ocr_status: str
    grading_status: str
    total_score: Optional[float] = None
    needs_review: bool
    created_at: datetime

    class Config:
        from_attributes = True

# 考试CRUD操作
@router.post("/", response_model=ExamResponse)
async def create_exam(
    exam_data: ExamCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """创建新考试"""
    exam = Exam(
        id=str(uuid.uuid4()),
        name=exam_data.name,
        subject=exam_data.subject,
        grade=exam_data.grade,
        paper_config=exam_data.paper_config,
        grading_config=exam_data.grading_config,
        created_by=current_user.id,
        status="待配置"
    )
    
    db.add(exam)
    db.commit()
    db.refresh(exam)
    
    # 添加创建者姓名
    exam_response = ExamResponse.from_orm(exam)
    exam_response.creator_name = current_user.name
    
    return exam_response

@router.get("/", response_model=List[ExamResponse])
async def get_exams(
    skip: int = 0,
    limit: int = 100,
    subject: Optional[str] = None,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取考试列表"""
    query = db.query(Exam, User.name.label('creator_name')).join(User, Exam.created_by == User.id)
    
    # 根据角色过滤
    if current_user.role == "teacher":
        query = query.filter(Exam.created_by == current_user.id)
    
    # 添加筛选条件
    if subject:
        query = query.filter(Exam.subject == subject)
    if status:
        query = query.filter(Exam.status == status)
    
    # 分页
    results = query.offset(skip).limit(limit).all()
    
    # 转换为响应模型
    exams = []
    for exam, creator_name in results:
        exam_response = ExamResponse.from_orm(exam)
        exam_response.creator_name = creator_name
        exams.append(exam_response)
    
    return exams

@router.get("/{exam_id}", response_model=ExamResponse)
async def get_exam(
    exam_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取单个考试详情"""
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    
    if not exam:
        raise HTTPException(status_code=404, detail="考试不存在")
    
    # 权限检查
    if current_user.role == "teacher" and exam.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="无权访问此考试")
    
    # 获取创建者姓名
    creator = db.query(User).filter(User.id == exam.created_by).first()
    exam_response = ExamResponse.from_orm(exam)
    exam_response.creator_name = creator.name if creator else "未知"
    
    return exam_response

@router.put("/{exam_id}", response_model=ExamResponse)
async def update_exam(
    exam_id: str,
    exam_update: ExamUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """更新考试信息"""
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    
    if not exam:
        raise HTTPException(status_code=404, detail="考试不存在")
    
    # 权限检查
    if current_user.role == "teacher" and exam.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="无权修改此考试")
    
    # 更新字段
    update_data = exam_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(exam, field, value)
    
    exam.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(exam)
    
    # 添加创建者姓名
    exam_response = ExamResponse.from_orm(exam)
    exam_response.creator_name = current_user.name
    
    return exam_response

@router.delete("/{exam_id}")
async def delete_exam(
    exam_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """删除考试"""
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    
    if not exam:
        raise HTTPException(status_code=404, detail="考试不存在")
    
    # 权限检查
    if current_user.role == "teacher" and exam.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="无权删除此考试")
    
    # 检查是否有关联的答题卡
    answer_sheets_count = db.query(AnswerSheet).filter(AnswerSheet.exam_id == exam_id).count()
    if answer_sheets_count > 0:
        raise HTTPException(status_code=400, detail="存在关联答题卡，无法删除考试")
    
    db.delete(exam)
    db.commit()
    
    return {"message": "考试删除成功"}

# 试卷文件上传
@router.post("/{exam_id}/upload-paper")
async def upload_exam_paper(
    exam_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """上传考试试卷文件"""
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    
    if not exam:
        raise HTTPException(status_code=404, detail="考试不存在")
    
    # 权限检查
    if current_user.role == "teacher" and exam.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="无权修改此考试")
    
    # 验证文件类型
    if not file.filename.lower().endswith(tuple(settings.ALLOWED_FILE_EXTENSIONS)):
        raise HTTPException(status_code=400, detail="不支持的文件格式")
    
    # 验证文件大小
    if file.size > settings.MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="文件大小超过限制")
    
    # 创建存储目录
    storage_dir = settings.STORAGE_BASE_PATH / "exam_papers" / exam_id
    storage_dir.mkdir(parents=True, exist_ok=True)
    
    # 保存文件
    file_extension = os.path.splitext(file.filename)[1]
    new_filename = f"paper_{datetime.now().strftime('%Y%m%d_%H%M%S')}{file_extension}"
    file_path = storage_dir / new_filename
    
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)
    
    # 更新考试配置
    if not exam.paper_config:
        exam.paper_config = {}
    
    exam.paper_config["paper_file"] = str(file_path)
    exam.paper_config["original_filename"] = file.filename
    exam.paper_config["uploaded_at"] = datetime.utcnow().isoformat()
    exam.updated_at = datetime.utcnow()
    
    db.commit()
    
    return {
        "message": "试卷上传成功",
        "filename": new_filename,
        "file_path": str(file_path)
    }

# 答题卡管理
@router.get("/{exam_id}/answer-sheets", response_model=List[AnswerSheetResponse])
async def get_answer_sheets(
    exam_id: str,
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取考试的答题卡列表"""
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    
    if not exam:
        raise HTTPException(status_code=404, detail="考试不存在")
    
    # 权限检查
    if current_user.role == "teacher" and exam.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="无权访问此考试")
    
    query = db.query(AnswerSheet).filter(AnswerSheet.exam_id == exam_id)
    
    if status:
        query = query.filter(AnswerSheet.grading_status == status)
    
    answer_sheets = query.offset(skip).limit(limit).all()
    
    return [AnswerSheetResponse.from_orm(sheet) for sheet in answer_sheets]

@router.post("/{exam_id}/batch-upload")
async def batch_upload_answer_sheets(
    exam_id: str,
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """批量上传答题卡"""
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    
    if not exam:
        raise HTTPException(status_code=404, detail="考试不存在")
    
    # 权限检查
    if current_user.role == "teacher" and exam.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="无权修改此考试")
    
    # 创建存储目录
    storage_dir = settings.STORAGE_BASE_PATH / "answer_sheets" / exam_id
    storage_dir.mkdir(parents=True, exist_ok=True)
    
    uploaded_files = []
    failed_files = []
    
    for file in files:
        try:
            # 验证文件
            if not file.filename.lower().endswith(tuple(settings.ALLOWED_FILE_EXTENSIONS)):
                failed_files.append({"filename": file.filename, "error": "不支持的文件格式"})
                continue
            
            if file.size > settings.MAX_FILE_SIZE:
                failed_files.append({"filename": file.filename, "error": "文件大小超过限制"})
                continue
            
            # 保存文件
            file_extension = os.path.splitext(file.filename)[1]
            answer_sheet_id = str(uuid.uuid4())
            new_filename = f"answer_{answer_sheet_id}{file_extension}"
            file_path = storage_dir / new_filename
            
            content = await file.read()
            with open(file_path, "wb") as f:
                f.write(content)
            
            # 创建答题卡记录
            answer_sheet = AnswerSheet(
                id=answer_sheet_id,
                exam_id=exam_id,
                original_file_path=str(file_path),
                ocr_status="pending",
                grading_status="pending"
            )
            
            db.add(answer_sheet)
            uploaded_files.append({
                "filename": file.filename,
                "answer_sheet_id": answer_sheet_id,
                "file_path": str(file_path)
            })
            
        except Exception as e:
            failed_files.append({"filename": file.filename, "error": str(e)})
    
    # 更新考试统计
    exam.total_students = db.query(AnswerSheet).filter(AnswerSheet.exam_id == exam_id).count()
    exam.updated_at = datetime.utcnow()
    
    db.commit()
    
    return {
        "message": f"批量上传完成，成功：{len(uploaded_files)}，失败：{len(failed_files)}",
        "uploaded_files": uploaded_files,
        "failed_files": failed_files
    }

# 考试状态管理
@router.post("/{exam_id}/status")
async def update_exam_status(
    exam_id: str,
    status: str = Form(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """更新考试状态"""
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    
    if not exam:
        raise HTTPException(status_code=404, detail="考试不存在")
    
    # 权限检查
    if current_user.role == "teacher" and exam.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="无权修改此考试")
    
    # 验证状态
    valid_statuses = ["待配置", "配置完成", "上传中", "处理中", "已完成", "已归档"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail="无效的状态值")
    
    exam.status = status
    exam.updated_at = datetime.utcnow()
    
    db.commit()
    
    return {"message": f"考试状态已更新为：{status}"}