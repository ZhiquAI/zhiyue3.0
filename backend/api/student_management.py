"""学生信息管理API"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, validator
from datetime import datetime
import uuid
import pandas as pd
import io
import json
import logging

try:
    from backend.database import get_db
    from backend.auth import get_current_user
    from backend.models.production_models import User, Exam, Student
    from backend.services.barcode_service import BarcodeService
except ImportError:
    from database import get_db
    from auth import get_current_user
    from models.production_models import User, Exam, Student
    from services.barcode_service import BarcodeService

router = APIRouter(prefix="/students", tags=["学生信息管理"])
logger = logging.getLogger(__name__)

# Pydantic模型
class StudentCreate(BaseModel):
    student_id: str
    name: str
    class_name: str
    grade: Optional[str] = None
    school: Optional[str] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    parent_phone: Optional[str] = None
    address: Optional[str] = None
    
    @validator('student_id')
    def validate_student_id(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('学号不能为空')
        return v.strip()
    
    @validator('name')
    def validate_name(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('姓名不能为空')
        return v.strip()

class StudentUpdate(BaseModel):
    name: Optional[str] = None
    class_name: Optional[str] = None
    grade: Optional[str] = None
    school: Optional[str] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    parent_phone: Optional[str] = None
    address: Optional[str] = None
    is_active: Optional[bool] = None

class StudentResponse(BaseModel):
    id: str
    student_id: str
    name: str
    class_name: str
    grade: Optional[str] = None
    school: Optional[str] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    parent_phone: Optional[str] = None
    address: Optional[str] = None
    exam_id: str
    barcode_data: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class BatchImportResult(BaseModel):
    total_count: int
    success_count: int
    failed_count: int
    failed_records: List[Dict[str, Any]]
    duplicate_count: int
    duplicate_records: List[Dict[str, str]]

# 学生信息CRUD操作
@router.post("/{exam_id}", response_model=StudentResponse)
async def create_student(
    exam_id: str,
    student_data: StudentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """创建单个学生信息"""
    # 验证考试是否存在
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="考试不存在")
    
    # 权限检查
    if current_user.role == "teacher" and exam.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="无权操作此考试的学生信息")
    
    # 检查学号是否重复
    existing_student = db.query(Student).filter(
        Student.exam_id == exam_id,
        Student.student_id == student_data.student_id
    ).first()
    if existing_student:
        raise HTTPException(status_code=400, detail="该考试中已存在相同学号的学生")
    
    # 生成条形码数据
    barcode_service = BarcodeService()
    barcode_data = barcode_service.generate_barcode_data({
        'student_id': student_data.student_id,
        'name': student_data.name,
        'class': student_data.class_name,
        'exam_id': exam_id
    }, format_type='pipe')
    
    # 创建学生记录
    student = Student(
        id=str(uuid.uuid4()),
        student_id=student_data.student_id,
        name=student_data.name,
        class_name=student_data.class_name,
        grade=student_data.grade,
        school=student_data.school,
        gender=student_data.gender,
        phone=student_data.phone,
        email=student_data.email,
        parent_phone=student_data.parent_phone,
        address=student_data.address,
        exam_id=exam_id,
        barcode_data=barcode_data,
        created_by=current_user.id
    )
    
    db.add(student)
    db.commit()
    db.refresh(student)
    
    return student

@router.get("/{exam_id}", response_model=List[StudentResponse])
async def get_students(
    exam_id: str,
    skip: int = 0,
    limit: int = 100,
    class_name: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取考试的学生列表"""
    # 验证考试是否存在
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="考试不存在")
    
    # 权限检查
    if current_user.role == "teacher" and exam.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="无权访问此考试的学生信息")
    
    # 构建查询
    query = db.query(Student).filter(Student.exam_id == exam_id, Student.is_active == True)
    
    # 添加筛选条件
    if class_name:
        query = query.filter(Student.class_name == class_name)
    
    if search:
        query = query.filter(
            (Student.name.contains(search)) |
            (Student.student_id.contains(search))
        )
    
    # 分页
    students = query.offset(skip).limit(limit).all()
    
    return students

@router.get("/{exam_id}/{student_id}", response_model=StudentResponse)
async def get_student(
    exam_id: str,
    student_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取单个学生信息"""
    student = db.query(Student).filter(
        Student.exam_id == exam_id,
        Student.id == student_id
    ).first()
    
    if not student:
        raise HTTPException(status_code=404, detail="学生信息不存在")
    
    # 权限检查
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if current_user.role == "teacher" and exam.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="无权访问此学生信息")
    
    return student

@router.put("/{exam_id}/{student_id}", response_model=StudentResponse)
async def update_student(
    exam_id: str,
    student_id: str,
    student_update: StudentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """更新学生信息"""
    student = db.query(Student).filter(
        Student.exam_id == exam_id,
        Student.id == student_id
    ).first()
    
    if not student:
        raise HTTPException(status_code=404, detail="学生信息不存在")
    
    # 权限检查
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if current_user.role == "teacher" and exam.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="无权修改此学生信息")
    
    # 更新字段
    update_data = student_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(student, field, value)
    
    # 如果姓名或班级发生变化，更新条形码数据
    if 'name' in update_data or 'class_name' in update_data:
        barcode_service = BarcodeService()
        student.barcode_data = barcode_service.generate_barcode_data({
            'student_id': student.student_id,
            'name': student.name,
            'class': student.class_name,
            'exam_id': exam_id
        }, format_type='pipe')
    
    student.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(student)
    
    return student

@router.delete("/{exam_id}/{student_id}", response_model=dict)
async def delete_student(
    exam_id: str,
    student_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """删除学生信息（软删除）"""
    student = db.query(Student).filter(
        Student.exam_id == exam_id,
        Student.id == student_id
    ).first()
    
    if not student:
        raise HTTPException(status_code=404, detail="学生信息不存在")
    
    # 权限检查
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if current_user.role == "teacher" and exam.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="无权删除此学生信息")
    
    # 软删除
    student.is_active = False
    student.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "学生信息删除成功"}

# 批量操作
@router.post("/{exam_id}/batch-import", response_model=BatchImportResult)
async def batch_import_students(
    exam_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """批量导入学生信息"""
    # 验证考试是否存在
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="考试不存在")
    
    # 权限检查
    if current_user.role == "teacher" and exam.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="无权操作此考试的学生信息")
    
    # 验证文件格式
    if not file.filename.endswith(('.xlsx', '.xls', '.csv')):
        raise HTTPException(status_code=400, detail="仅支持Excel(.xlsx, .xls)和CSV文件")
    
    try:
        # 读取文件内容
        content = await file.read()
        
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.StringIO(content.decode('utf-8')))
        else:
            df = pd.read_excel(io.BytesIO(content))
        
        # 验证必需列
        required_columns = ['student_id', 'name', 'class_name']
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            raise HTTPException(
                status_code=400, 
                detail=f"缺少必需列: {', '.join(missing_columns)}"
            )
        
        # 处理数据
        total_count = len(df)
        success_count = 0
        failed_count = 0
        failed_records = []
        duplicate_count = 0
        duplicate_records = []
        
        barcode_service = BarcodeService()
        
        for index, row in df.iterrows():
            try:
                # 检查必需字段
                if pd.isna(row['student_id']) or pd.isna(row['name']) or pd.isna(row['class_name']):
                    failed_count += 1
                    failed_records.append({
                        'row': index + 1,
                        'data': row.to_dict(),
                        'error': '学号、姓名、班级不能为空'
                    })
                    continue
                
                student_id_str = str(row['student_id']).strip()
                name_str = str(row['name']).strip()
                class_name_str = str(row['class_name']).strip()
                
                # 检查是否已存在
                existing_student = db.query(Student).filter(
                    Student.exam_id == exam_id,
                    Student.student_id == student_id_str
                ).first()
                
                if existing_student:
                    duplicate_count += 1
                    duplicate_records.append({
                        'student_id': student_id_str,
                        'name': name_str,
                        'class_name': class_name_str
                    })
                    continue
                
                # 生成条形码数据
                barcode_data = barcode_service.generate_barcode_data({
                    'student_id': student_id_str,
                    'name': name_str,
                    'class': class_name_str,
                    'exam_id': exam_id
                }, format_type='pipe')
                
                # 创建学生记录
                student = Student(
                    id=str(uuid.uuid4()),
                    student_id=student_id_str,
                    name=name_str,
                    class_name=class_name_str,
                    grade=str(row.get('grade', '')) if not pd.isna(row.get('grade')) else None,
                    school=str(row.get('school', '')) if not pd.isna(row.get('school')) else None,
                    gender=str(row.get('gender', '')) if not pd.isna(row.get('gender')) else None,
                    phone=str(row.get('phone', '')) if not pd.isna(row.get('phone')) else None,
                    email=str(row.get('email', '')) if not pd.isna(row.get('email')) else None,
                    parent_phone=str(row.get('parent_phone', '')) if not pd.isna(row.get('parent_phone')) else None,
                    address=str(row.get('address', '')) if not pd.isna(row.get('address')) else None,
                    exam_id=exam_id,
                    barcode_data=barcode_data,
                    created_by=current_user.id
                )
                
                db.add(student)
                success_count += 1
                
            except Exception as e:
                failed_count += 1
                failed_records.append({
                    'row': index + 1,
                    'data': row.to_dict(),
                    'error': str(e)
                })
        
        # 提交事务
        db.commit()
        
        # 更新考试的学生总数
        exam.total_students = db.query(Student).filter(
            Student.exam_id == exam_id,
            Student.is_active == True
        ).count()
        db.commit()
        
        return BatchImportResult(
            total_count=total_count,
            success_count=success_count,
            failed_count=failed_count,
            failed_records=failed_records,
            duplicate_count=duplicate_count,
            duplicate_records=duplicate_records
        )
        
    except Exception as e:
        logger.error(f"批量导入学生信息失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"导入失败: {str(e)}")

@router.get("/{exam_id}/export", response_model=dict)
async def export_students(
    exam_id: str,
    format: str = 'excel',
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """导出学生信息"""
    # 验证考试是否存在
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="考试不存在")
    
    # 权限检查
    if current_user.role == "teacher" and exam.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="无权导出此考试的学生信息")
    
    # 获取学生数据
    students = db.query(Student).filter(
        Student.exam_id == exam_id,
        Student.is_active == True
    ).all()
    
    # 转换为DataFrame
    data = []
    for student in students:
        data.append({
            'student_id': student.student_id,
            'name': student.name,
            'class_name': student.class_name,
            'grade': student.grade,
            'school': student.school,
            'gender': student.gender,
            'phone': student.phone,
            'email': student.email,
            'parent_phone': student.parent_phone,
            'address': student.address,
            'barcode_data': student.barcode_data,
            'created_at': student.created_at.strftime('%Y-%m-%d %H:%M:%S')
        })
    
    return {
        "message": "导出数据准备完成",
        "count": len(data),
        "data": data
    }

# 条形码相关
@router.get("/{exam_id}/{student_id}/barcode", response_model=dict)
async def get_student_barcode(
    exam_id: str,
    student_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取学生条形码数据"""
    student = db.query(Student).filter(
        Student.exam_id == exam_id,
        Student.id == student_id
    ).first()
    
    if not student:
        raise HTTPException(status_code=404, detail="学生信息不存在")
    
    # 权限检查
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if current_user.role == "teacher" and exam.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="无权访问此学生信息")
    
    return {
        "student_id": student.student_id,
        "name": student.name,
        "class_name": student.class_name,
        "barcode_data": student.barcode_data
    }

@router.post("/{exam_id}/match-student", response_model=dict)
async def match_student_by_barcode(
    exam_id: str,
    barcode_data: str = Form(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """通过条形码数据匹配学生信息"""
    # 验证考试是否存在
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="考试不存在")
    
    # 权限检查
    if current_user.role == "teacher" and exam.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="无权操作此考试")
    
    # 解析条形码数据
    barcode_service = BarcodeService()
    student_info = barcode_service._parse_student_info(barcode_data)
    
    if 'student_id' not in student_info:
        raise HTTPException(status_code=400, detail="条形码数据格式错误，无法解析学号")
    
    # 查找匹配的学生
    student = db.query(Student).filter(
        Student.exam_id == exam_id,
        Student.student_id == student_info['student_id'],
        Student.is_active == True
    ).first()
    
    if not student:
        return {
            "matched": False,
            "message": "未找到匹配的学生信息",
            "parsed_data": student_info
        }
    
    return {
        "matched": True,
        "student": {
            "id": student.id,
            "student_id": student.student_id,
            "name": student.name,
            "class_name": student.class_name,
            "grade": student.grade
        },
        "parsed_data": student_info
    }

# 统计信息
@router.get("/{exam_id}/statistics", response_model=dict)
async def get_student_statistics(
    exam_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取学生信息统计"""
    # 验证考试是否存在
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="考试不存在")
    
    # 权限检查
    if current_user.role == "teacher" and exam.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="无权访问此考试信息")
    
    # 统计数据
    total_students = db.query(Student).filter(
        Student.exam_id == exam_id,
        Student.is_active == True
    ).count()
    
    # 按班级统计
    class_stats = db.query(
        Student.class_name,
        db.func.count(Student.id).label('count')
    ).filter(
        Student.exam_id == exam_id,
        Student.is_active == True
    ).group_by(Student.class_name).all()
    
    # 按性别统计
    gender_stats = db.query(
        Student.gender,
        db.func.count(Student.id).label('count')
    ).filter(
        Student.exam_id == exam_id,
        Student.is_active == True,
        Student.gender.isnot(None)
    ).group_by(Student.gender).all()
    
    return {
        "total_students": total_students,
        "class_distribution": [{
            "class_name": class_name,
            "count": count
        } for class_name, count in class_stats],
        "gender_distribution": [{
            "gender": gender,
            "count": count
        } for gender, count in gender_stats]
    }