"""
统一API路由管理器
按照智阅3.0工作流程组织API：学生管理 → 考试管理 → 智能阅卷 → 成绩分析
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Path, Body
from fastapi.security import HTTPBearer
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from datetime import datetime
import logging

from backend.database.unified_connection import model_ops, get_db_session
from backend.config.models import UserRole, ExamStatus, GradingStatus, check_permission
from backend.middleware.simple_auth import get_current_user

logger = logging.getLogger(__name__)
security = HTTPBearer()

# 响应模型
class BaseResponse(BaseModel):
    """基础响应模型"""
    success: bool = True
    message: str = "操作成功"
    data: Optional[Any] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class PaginatedResponse(BaseResponse):
    """分页响应模型"""
    total: int = 0
    page: int = 1
    page_size: int = 20
    pages: int = 0

# 请求模型
class StudentCreateRequest(BaseModel):
    """学生创建请求"""
    student_id: str = Field(..., description="学号/准考证号")
    name: str = Field(..., description="学生姓名")
    class_name: str = Field(..., description="班级")
    grade: str = Field(..., description="年级")
    school: Optional[str] = Field(None, description="学校")
    gender: Optional[str] = Field(None, description="性别")
    phone: Optional[str] = Field(None, description="联系电话")
    email: Optional[str] = Field(None, description="邮箱")
    parent_name: Optional[str] = Field(None, description="家长姓名")
    parent_phone: Optional[str] = Field(None, description="家长电话")
    exam_id: str = Field(..., description="关联考试ID")

class ExamCreateRequest(BaseModel):
    """考试创建请求"""
    name: str = Field(..., description="考试名称")
    subject: str = Field(..., description="考试科目")
    grade: str = Field(..., description="年级")
    exam_type: Optional[str] = Field("期中考试", description="考试类型")
    description: Optional[str] = Field(None, description="考试描述")
    total_score: float = Field(100.0, description="总分")
    duration: Optional[int] = Field(None, description="考试时长(分钟)")
    exam_date: Optional[datetime] = Field(None, description="考试日期")

class AnswerSheetUploadRequest(BaseModel):
    """答题卡上传请求"""
    exam_id: str = Field(..., description="考试ID")
    file_paths: List[str] = Field(..., description="文件路径列表")
    auto_process: bool = Field(True, description="是否自动处理")

# 创建统一路由
unified_router = APIRouter(prefix="/api/v1", tags=["智阅3.0统一API"])

# ==================== 1. 学生管理模块 (优先级最高) ====================
@unified_router.post("/students", response_model=BaseResponse, summary="创建学生")
async def create_student(
    request: StudentCreateRequest,
    current_user = Depends(get_current_user)
):
    """
    创建学生信息 - 考试创建的前置条件
    按照工作流程，学生管理是第一步
    """
    if not check_permission(current_user.role, 'can_manage_students'):
        raise HTTPException(status_code=403, detail="权限不足：无法管理学生")
    
    try:
        # 检查学生是否已存在
        existing_students = model_ops.list_records(
            'student', 
            filters={'student_id': request.student_id, 'exam_id': request.exam_id}
        )
        if existing_students:
            raise HTTPException(status_code=400, detail="学生已存在于该考试中")
        
        # 验证考试是否存在
        exam = model_ops.get_record('exam', request.exam_id)
        if not exam:
            raise HTTPException(status_code=404, detail="关联的考试不存在")
        
        # 创建学生数据
        student_data = request.dict()
        student_data['created_by'] = current_user.id
        
        student = model_ops.create_record('student', student_data)
        
        logger.info(f"用户 {current_user.username} 创建学生: {student.name}")
        
        return BaseResponse(
            message="学生创建成功",
            data=student.to_dict()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"创建学生失败: {e}")
        raise HTTPException(status_code=500, detail="创建学生失败")

@unified_router.get("/students", response_model=PaginatedResponse, summary="学生列表")
async def list_students(
    exam_id: Optional[str] = Query(None, description="考试ID筛选"),
    class_name: Optional[str] = Query(None, description="班级筛选"),
    grade: Optional[str] = Query(None, description="年级筛选"),
    search: Optional[str] = Query(None, description="姓名或学号搜索"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    current_user = Depends(get_current_user)
):
    """
    获取学生列表
    支持多维度筛选和搜索
    """
    try:
        # 构建筛选条件
        filters = {}
        if exam_id:
            filters['exam_id'] = exam_id
        if class_name:
            filters['class_name'] = class_name
        if grade:
            filters['grade'] = grade
        
        # 获取总数
        total = model_ops.count_records('student', filters)
        
        # 获取分页数据
        offset = (page - 1) * page_size
        students = model_ops.list_records('student', filters, page_size, offset)
        
        # 如果有搜索条件，需要进一步过滤
        if search:
            students = [s for s in students if search.lower() in s.name.lower() or search in s.student_id]
            total = len(students)
        
        return PaginatedResponse(
            message="获取学生列表成功",
            data=[student.to_dict() for student in students],
            total=total,
            page=page,
            page_size=page_size,
            pages=(total + page_size - 1) // page_size
        )
        
    except Exception as e:
        logger.error(f"获取学生列表失败: {e}")
        raise HTTPException(status_code=500, detail="获取学生列表失败")

@unified_router.post("/students/batch", response_model=BaseResponse, summary="批量导入学生")
async def batch_create_students(
    students_data: List[StudentCreateRequest],
    current_user = Depends(get_current_user)
):
    """
    批量导入学生数据
    支持Excel模板导入的核心API
    """
    if not check_permission(current_user.role, 'can_manage_students'):
        raise HTTPException(status_code=403, detail="权限不足：无法管理学生")
    
    try:
        created_students = []
        failed_students = []
        
        for student_request in students_data:
            try:
                # 检查重复
                existing = model_ops.list_records(
                    'student',
                    filters={'student_id': student_request.student_id, 'exam_id': student_request.exam_id}
                )
                
                if existing:
                    failed_students.append({
                        'student_id': student_request.student_id,
                        'error': '学生已存在'
                    })
                    continue
                
                # 创建学生
                student_data = student_request.dict()
                student_data['created_by'] = current_user.id
                
                student = model_ops.create_record('student', student_data)
                created_students.append(student.to_dict())
                
            except Exception as e:
                failed_students.append({
                    'student_id': student_request.student_id,
                    'error': str(e)
                })
        
        logger.info(f"批量导入学生: 成功 {len(created_students)}, 失败 {len(failed_students)}")
        
        return BaseResponse(
            message=f"批量导入完成: 成功 {len(created_students)}, 失败 {len(failed_students)}",
            data={
                'created': created_students,
                'failed': failed_students,
                'summary': {
                    'total': len(students_data),
                    'success': len(created_students),
                    'failed': len(failed_students)
                }
            }
        )
        
    except Exception as e:
        logger.error(f"批量导入学生失败: {e}")
        raise HTTPException(status_code=500, detail="批量导入学生失败")

# ==================== 2. 考试管理模块 ====================
@unified_router.post("/exams", response_model=BaseResponse, summary="创建考试")
async def create_exam(
    request: ExamCreateRequest,
    current_user = Depends(get_current_user)
):
    """
    创建考试 - 依赖学生数据
    """
    if not check_permission(current_user.role, 'can_create_exam'):
        raise HTTPException(status_code=403, detail="权限不足：无法创建考试")
    
    try:
        exam_data = request.dict()
        exam_data['status'] = ExamStatus.DRAFT
        exam_data['created_by'] = current_user.id
        exam_data['ai_grading_enabled'] = True  # 默认启用AI评分
        
        exam = model_ops.create_record('exam', exam_data)
        
        logger.info(f"用户 {current_user.username} 创建考试: {exam.name}")
        
        return BaseResponse(
            message="考试创建成功",
            data=exam.to_dict()
        )
        
    except Exception as e:
        logger.error(f"创建考试失败: {e}")
        raise HTTPException(status_code=500, detail="创建考试失败")

@unified_router.get("/exams", response_model=PaginatedResponse, summary="考试列表")
async def list_exams(
    status: Optional[str] = Query(None, description="状态筛选"),
    subject: Optional[str] = Query(None, description="科目筛选"),
    grade: Optional[str] = Query(None, description="年级筛选"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    current_user = Depends(get_current_user)
):
    """获取考试列表"""
    try:
        filters = {}
        if status:
            filters['status'] = status
        if subject:
            filters['subject'] = subject
        if grade:
            filters['grade'] = grade
        
        # 根据用户角色过滤数据
        if current_user.role != UserRole.ADMIN:
            filters['created_by'] = current_user.id
        
        total = model_ops.count_records('exam', filters)
        offset = (page - 1) * page_size
        exams = model_ops.list_records('exam', filters, page_size, offset)
        
        return PaginatedResponse(
            message="获取考试列表成功",
            data=[exam.to_dict() for exam in exams],
            total=total,
            page=page,
            page_size=page_size,
            pages=(total + page_size - 1) // page_size
        )
        
    except Exception as e:
        logger.error(f"获取考试列表失败: {e}")
        raise HTTPException(status_code=500, detail="获取考试列表失败")

@unified_router.get("/exams/{exam_id}/statistics", response_model=BaseResponse, summary="考试统计")
async def get_exam_statistics(
    exam_id: str = Path(..., description="考试ID"),
    current_user = Depends(get_current_user)
):
    """
    获取考试统计信息
    包括学生数量、答题卡状态、评分进度等
    """
    try:
        exam = model_ops.get_record('exam', exam_id)
        if not exam:
            raise HTTPException(status_code=404, detail="考试不存在")
        
        # 统计学生数量
        student_count = model_ops.count_records('student', {'exam_id': exam_id})
        
        # 统计答题卡状态
        answer_sheets = model_ops.list_records('answer_sheet', {'exam_id': exam_id}, limit=1000)
        
        grading_stats = {}
        for status in GradingStatus:
            grading_stats[status.value] = len([
                sheet for sheet in answer_sheets 
                if sheet.grading_status == status
            ])
        
        # 分数统计
        scores = [sheet.total_score for sheet in answer_sheets if sheet.total_score is not None]
        score_stats = {}
        if scores:
            score_stats = {
                'count': len(scores),
                'average': sum(scores) / len(scores),
                'max': max(scores),
                'min': min(scores),
                'pass_count': len([s for s in scores if s >= 60]),
                'pass_rate': len([s for s in scores if s >= 60]) / len(scores)
            }
        
        return BaseResponse(
            message="获取考试统计成功",
            data={
                'exam_info': exam.to_dict(),
                'student_count': student_count,
                'answer_sheet_count': len(answer_sheets),
                'grading_status_stats': grading_stats,
                'score_statistics': score_stats
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取考试统计失败: {e}")
        raise HTTPException(status_code=500, detail="获取考试统计失败")

# ==================== 3. 智能阅卷模块 ====================
@unified_router.post("/answer-sheets/upload", response_model=BaseResponse, summary="上传答题卡")
async def upload_answer_sheets(
    request: AnswerSheetUploadRequest,
    current_user = Depends(get_current_user)
):
    """
    上传答题卡进行处理
    启动OCR和AI评分流程
    """
    if not check_permission(current_user.role, 'can_grade_papers'):
        raise HTTPException(status_code=403, detail="权限不足：无法处理答题卡")
    
    try:
        exam = model_ops.get_record('exam', request.exam_id)
        if not exam:
            raise HTTPException(status_code=404, detail="考试不存在")
        
        created_sheets = []
        failed_sheets = []
        
        for file_path in request.file_paths:
            try:
                # 创建答题卡记录
                sheet_data = {
                    'exam_id': request.exam_id,
                    'original_file_path': file_path,
                    'ocr_status': GradingStatus.PENDING,
                    'grading_status': GradingStatus.PENDING
                }
                
                answer_sheet = model_ops.create_record('answer_sheet', sheet_data)
                created_sheets.append(answer_sheet.to_dict())
                
                # 如果启用自动处理，创建处理任务
                if request.auto_process:
                    task_data = {
                        'answer_sheet_id': answer_sheet.id,
                        'task_type': 'ocr',
                        'priority': 5
                    }
                    model_ops.create_record('grading_task', task_data)
                
            except Exception as e:
                failed_sheets.append({
                    'file_path': file_path,
                    'error': str(e)
                })
        
        logger.info(f"上传答题卡: 成功 {len(created_sheets)}, 失败 {len(failed_sheets)}")
        
        return BaseResponse(
            message=f"答题卡上传完成: 成功 {len(created_sheets)}, 失败 {len(failed_sheets)}",
            data={
                'created': created_sheets,
                'failed': failed_sheets,
                'auto_process': request.auto_process
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"上传答题卡失败: {e}")
        raise HTTPException(status_code=500, detail="上传答题卡失败")

@unified_router.get("/answer-sheets/{sheet_id}", response_model=BaseResponse, summary="获取答题卡详情")
async def get_answer_sheet(
    sheet_id: str = Path(..., description="答题卡ID"),
    current_user = Depends(get_current_user)
):
    """获取答题卡详细信息和处理结果"""
    try:
        answer_sheet = model_ops.get_record('answer_sheet', sheet_id)
        if not answer_sheet:
            raise HTTPException(status_code=404, detail="答题卡不存在")
        
        # 获取相关任务
        tasks = model_ops.list_records('grading_task', {'answer_sheet_id': sheet_id})
        
        return BaseResponse(
            message="获取答题卡详情成功",
            data={
                'answer_sheet': answer_sheet.to_dict(),
                'tasks': [task.to_dict() for task in tasks]
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取答题卡详情失败: {e}")
        raise HTTPException(status_code=500, detail="获取答题卡详情失败")

@unified_router.post("/answer-sheets/{sheet_id}/review", response_model=BaseResponse, summary="人工复核")
async def review_answer_sheet(
    sheet_id: str = Path(..., description="答题卡ID"),
    review_data: Dict[str, Any] = Body(..., description="复核数据"),
    current_user = Depends(get_current_user)
):
    """
    人工复核答题卡评分结果
    """
    if not check_permission(current_user.role, 'can_review_grading'):
        raise HTTPException(status_code=403, detail="权限不足：无法复核评分")
    
    try:
        answer_sheet = model_ops.get_record('answer_sheet', sheet_id)
        if not answer_sheet:
            raise HTTPException(status_code=404, detail="答题卡不存在")
        
        # 更新复核信息
        update_data = {
            'reviewed_by': current_user.id,
            'reviewed_at': datetime.utcnow(),
            'review_comments': review_data.get('comments', ''),
            'grading_status': GradingStatus.REVIEWED
        }
        
        # 如果有分数调整
        if 'score_changes' in review_data:
            update_data['review_score_changes'] = review_data['score_changes']
            # 重新计算总分
            new_total = review_data.get('new_total_score')
            if new_total:
                update_data['total_score'] = new_total
        
        updated_sheet = model_ops.update_record('answer_sheet', sheet_id, update_data)
        
        logger.info(f"用户 {current_user.username} 复核答题卡 {sheet_id}")
        
        return BaseResponse(
            message="复核完成",
            data=updated_sheet.to_dict()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"复核答题卡失败: {e}")
        raise HTTPException(status_code=500, detail="复核答题卡失败")

# ==================== 4. 成绩分析模块 ====================
@unified_router.get("/exams/{exam_id}/analysis", response_model=BaseResponse, summary="成绩分析")
async def get_exam_analysis(
    exam_id: str = Path(..., description="考试ID"),
    analysis_type: str = Query("overview", description="分析类型：overview/detailed/comparison"),
    current_user = Depends(get_current_user)
):
    """
    获取考试成绩分析报告
    包括分数分布、班级对比、知识点分析等
    """
    try:
        exam = model_ops.get_record('exam', exam_id)
        if not exam:
            raise HTTPException(status_code=404, detail="考试不存在")
        
        # 获取所有已评分的答题卡
        answer_sheets = model_ops.list_records(
            'answer_sheet', 
            {'exam_id': exam_id, 'grading_status': GradingStatus.FINALIZED.value},
            limit=1000
        )
        
        if analysis_type == "overview":
            # 概览分析
            analysis_data = _generate_overview_analysis(answer_sheets)
        elif analysis_type == "detailed":
            # 详细分析
            analysis_data = _generate_detailed_analysis(answer_sheets)
        elif analysis_type == "comparison":
            # 对比分析
            analysis_data = _generate_comparison_analysis(exam_id, answer_sheets)
        else:
            raise HTTPException(status_code=400, detail="不支持的分析类型")
        
        return BaseResponse(
            message="成绩分析获取成功",
            data={
                'exam_info': exam.to_dict(),
                'analysis_type': analysis_type,
                'analysis_data': analysis_data,
                'generated_at': datetime.utcnow()
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取成绩分析失败: {e}")
        raise HTTPException(status_code=500, detail="获取成绩分析失败")

# ==================== 5. 系统管理模块 ====================
@unified_router.get("/system/health", response_model=BaseResponse, summary="系统健康检查")
async def system_health_check():
    """系统健康检查"""
    try:
        from backend.database.unified_connection import database_health_check, get_database_info
        
        health_data = database_health_check()
        db_info = get_database_info()
        
        return BaseResponse(
            message="系统健康检查完成",
            data={
                'database_health': health_data,
                'database_info': db_info,
                'api_status': 'healthy',
                'timestamp': datetime.utcnow()
            }
        )
        
    except Exception as e:
        logger.error(f"系统健康检查失败: {e}")
        return BaseResponse(
            success=False,
            message="系统健康检查失败",
            data={'error': str(e)}
        )

# 辅助函数
def _generate_overview_analysis(answer_sheets: List[Any]) -> Dict[str, Any]:
    """生成概览分析"""
    if not answer_sheets:
        return {'message': '暂无数据'}
    
    scores = [sheet.total_score for sheet in answer_sheets if sheet.total_score is not None]
    
    if not scores:
        return {'message': '暂无分数数据'}
    
    return {
        'total_students': len(answer_sheets),
        'average_score': sum(scores) / len(scores),
        'max_score': max(scores),
        'min_score': min(scores),
        'pass_rate': len([s for s in scores if s >= 60]) / len(scores),
        'score_distribution': _calculate_score_distribution(scores)
    }

def _generate_detailed_analysis(answer_sheets: List[Any]) -> Dict[str, Any]:
    """生成详细分析"""
    # 这里可以添加更复杂的分析逻辑
    overview = _generate_overview_analysis(answer_sheets)
    
    # 按班级分组分析
    class_stats = {}
    for sheet in answer_sheets:
        if sheet.class_name and sheet.total_score is not None:
            if sheet.class_name not in class_stats:
                class_stats[sheet.class_name] = []
            class_stats[sheet.class_name].append(sheet.total_score)
    
    class_analysis = {}
    for class_name, scores in class_stats.items():
        if scores:
            class_analysis[class_name] = {
                'count': len(scores),
                'average': sum(scores) / len(scores),
                'max': max(scores),
                'min': min(scores),
                'pass_rate': len([s for s in scores if s >= 60]) / len(scores)
            }
    
    return {
        **overview,
        'class_analysis': class_analysis
    }

def _generate_comparison_analysis(exam_id: str, answer_sheets: List[Any]) -> Dict[str, Any]:
    """生成对比分析"""
    # 这里可以与历史考试进行对比
    return _generate_detailed_analysis(answer_sheets)

def _calculate_score_distribution(scores: List[float]) -> Dict[str, int]:
    """计算分数分布"""
    distribution = {
        '90-100': 0,
        '80-89': 0,
        '70-79': 0,
        '60-69': 0,
        '0-59': 0
    }
    
    for score in scores:
        if score >= 90:
            distribution['90-100'] += 1
        elif score >= 80:
            distribution['80-89'] += 1
        elif score >= 70:
            distribution['70-79'] += 1
        elif score >= 60:
            distribution['60-69'] += 1
        else:
            distribution['0-59'] += 1
    
    return distribution