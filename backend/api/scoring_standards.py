from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import List, Optional
from pydantic import BaseModel
import json
import os
from datetime import datetime
import uuid

router = APIRouter(prefix="/api/scoring-standards", tags=["scoring-standards"])

# 数据模型
class ScoringCriterion(BaseModel):
    id: str
    description: str
    score: float
    isRequired: bool

class Question(BaseModel):
    id: str
    number: str
    type: str  # 'choice' | 'subjective' | 'calculation' | 'essay'
    content: str
    totalScore: float
    scoringCriteria: List[ScoringCriterion]

class ScoringStandardsRequest(BaseModel):
    examId: Optional[str] = None
    questions: List[Question]

class ScoringStandardsResponse(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None

# 存储路径
STORAGE_PATH = "storage/scoring_standards"
os.makedirs(STORAGE_PATH, exist_ok=True)

@router.post("/upload/paper")
async def upload_paper_file(file: UploadFile = File(...)):
    """上传试卷文件"""
    try:
        # 验证文件类型
        allowed_types = ['application/pdf', 'image/jpeg', 'image/png']
        if file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail="不支持的文件格式")
        
        # 验证文件大小 (10MB)
        max_size = 10 * 1024 * 1024
        content = await file.read()
        if len(content) > max_size:
            raise HTTPException(status_code=400, detail="文件大小超过限制")
        
        # 生成唯一文件名
        file_id = str(uuid.uuid4())
        file_extension = os.path.splitext(file.filename)[1]
        filename = f"paper_{file_id}{file_extension}"
        
        # 保存文件
        file_path = os.path.join(STORAGE_PATH, filename)
        with open(file_path, "wb") as f:
            f.write(content)
        
        return {
            "success": True,
            "message": "试卷文件上传成功",
            "data": {
                "fileId": file_id,
                "filename": filename,
                "originalName": file.filename,
                "size": len(content),
                "type": file.content_type,
                "url": f"/api/files/{filename}"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"文件上传失败: {str(e)}")

@router.post("/upload/answer")
async def upload_answer_file(file: UploadFile = File(...)):
    """上传参考答案文件"""
    try:
        # 验证文件类型
        allowed_types = ['application/pdf', 'image/jpeg', 'image/png', 'text/plain']
        if file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail="不支持的文件格式")
        
        # 验证文件大小 (10MB)
        max_size = 10 * 1024 * 1024
        content = await file.read()
        if len(content) > max_size:
            raise HTTPException(status_code=400, detail="文件大小超过限制")
        
        # 生成唯一文件名
        file_id = str(uuid.uuid4())
        file_extension = os.path.splitext(file.filename)[1]
        filename = f"answer_{file_id}{file_extension}"
        
        # 保存文件
        file_path = os.path.join(STORAGE_PATH, filename)
        with open(file_path, "wb") as f:
            f.write(content)
        
        return {
            "success": True,
            "message": "参考答案文件上传成功",
            "data": {
                "fileId": file_id,
                "filename": filename,
                "originalName": file.filename,
                "size": len(content),
                "type": file.content_type,
                "url": f"/api/files/{filename}"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"文件上传失败: {str(e)}")

@router.post("/generate")
async def generate_scoring_standards(
    paper_file_id: str = Form(...),
    answer_file_id: Optional[str] = Form(None)
):
    """AI生成评分标准"""
    try:
        # 这里应该调用AI服务来分析试卷并生成评分标准
        # 目前返回模拟数据
        
        mock_questions = [
            {
                "id": "1",
                "number": "1",
                "type": "choice",
                "content": "下列哪个选项是正确的？A. 选项A  B. 选项B  C. 选项C  D. 选项D",
                "totalScore": 5,
                "scoringCriteria": [
                    {"id": "1-1", "description": "选择正确答案A", "score": 5, "isRequired": True},
                    {"id": "1-2", "description": "选择其他错误答案", "score": 0, "isRequired": False}
                ]
            },
            {
                "id": "2",
                "number": "2",
                "type": "subjective",
                "content": "请简述牛顿第一定律的内容和意义。",
                "totalScore": 10,
                "scoringCriteria": [
                    {"id": "2-1", "description": "正确表述定律内容：物体在不受外力或合外力为零时保持静止或匀速直线运动状态", "score": 6, "isRequired": True},
                    {"id": "2-2", "description": "说明物理意义：揭示了力和运动的关系", "score": 3, "isRequired": False},
                    {"id": "2-3", "description": "举例说明或补充说明", "score": 1, "isRequired": False}
                ]
            },
            {
                "id": "3",
                "number": "3",
                "type": "calculation",
                "content": "一个质量为2kg的物体从10m高处自由落下，求落地时的速度。(g=10m/s²)",
                "totalScore": 15,
                "scoringCriteria": [
                    {"id": "3-1", "description": "列出正确公式：v²=2gh 或 v=√(2gh)", "score": 5, "isRequired": True},
                    {"id": "3-2", "description": "正确代入数值：v=√(2×10×10)", "score": 5, "isRequired": True},
                    {"id": "3-3", "description": "计算过程正确", "score": 3, "isRequired": True},
                    {"id": "3-4", "description": "最终答案正确：v=14.14m/s", "score": 2, "isRequired": False}
                ]
            },
            {
                "id": "4",
                "number": "4",
                "type": "essay",
                "content": "论述可持续发展的重要性及其实现途径。",
                "totalScore": 20,
                "scoringCriteria": [
                    {"id": "4-1", "description": "明确定义可持续发展概念", "score": 4, "isRequired": True},
                    {"id": "4-2", "description": "分析可持续发展的重要性（环境、经济、社会三个维度）", "score": 8, "isRequired": True},
                    {"id": "4-3", "description": "提出具体的实现途径和措施", "score": 6, "isRequired": True},
                    {"id": "4-4", "description": "论述逻辑清晰，语言表达准确", "score": 2, "isRequired": False}
                ]
            }
        ]
        
        return {
            "success": True,
            "message": "AI评分标准生成成功",
            "data": {
                "questions": mock_questions,
                "totalQuestions": len(mock_questions),
                "totalScore": sum(q["totalScore"] for q in mock_questions)
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI生成失败: {str(e)}")

@router.post("/save")
async def save_scoring_standards(request: ScoringStandardsRequest):
    """保存评分标准"""
    try:
        # 生成唯一ID
        standards_id = str(uuid.uuid4())
        
        # 准备保存数据
        save_data = {
            "id": standards_id,
            "examId": request.examId,
            "questions": [q.dict() for q in request.questions],
            "createdAt": datetime.now().isoformat(),
            "updatedAt": datetime.now().isoformat(),
            "totalQuestions": len(request.questions),
            "totalScore": sum(q.totalScore for q in request.questions)
        }
        
        # 保存到文件
        filename = f"standards_{standards_id}.json"
        file_path = os.path.join(STORAGE_PATH, filename)
        
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(save_data, f, ensure_ascii=False, indent=2)
        
        return ScoringStandardsResponse(
            success=True,
            message="评分标准保存成功",
            data={
                "standardsId": standards_id,
                "totalQuestions": save_data["totalQuestions"],
                "totalScore": save_data["totalScore"]
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"保存失败: {str(e)}")

@router.get("/{standards_id}")
async def get_scoring_standards(standards_id: str):
    """获取评分标准"""
    try:
        filename = f"standards_{standards_id}.json"
        file_path = os.path.join(STORAGE_PATH, filename)
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="评分标准不存在")
        
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        return {
            "success": True,
            "message": "获取评分标准成功",
            "data": data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取失败: {str(e)}")

@router.get("/exam/{exam_id}")
async def get_scoring_standards_by_exam(exam_id: str):
    """根据考试ID获取评分标准"""
    try:
        # 遍历所有评分标准文件，查找匹配的考试ID
        for filename in os.listdir(STORAGE_PATH):
            if filename.startswith("standards_") and filename.endswith(".json"):
                file_path = os.path.join(STORAGE_PATH, filename)
                with open(file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if data.get("examId") == exam_id:
                        return {
                            "success": True,
                            "message": "获取评分标准成功",
                            "data": data
                        }
        
        return {
            "success": True,
            "message": "未找到评分标准",
            "data": None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取失败: {str(e)}")

@router.delete("/{standards_id}")
async def delete_scoring_standards(standards_id: str):
    """删除评分标准"""
    try:
        filename = f"standards_{standards_id}.json"
        file_path = os.path.join(STORAGE_PATH, filename)
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="评分标准不存在")
        
        os.remove(file_path)
        
        return {
            "success": True,
            "message": "评分标准删除成功"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除失败: {str(e)}")

@router.get("/")
async def list_scoring_standards():
    """获取所有评分标准列表"""
    try:
        standards_list = []
        
        for filename in os.listdir(STORAGE_PATH):
            if filename.startswith("standards_") and filename.endswith(".json"):
                file_path = os.path.join(STORAGE_PATH, filename)
                with open(file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    standards_list.append({
                        "id": data["id"],
                        "examId": data.get("examId"),
                        "totalQuestions": data["totalQuestions"],
                        "totalScore": data["totalScore"],
                        "createdAt": data["createdAt"],
                        "updatedAt": data["updatedAt"]
                    })
        
        # 按创建时间排序
        standards_list.sort(key=lambda x: x["createdAt"], reverse=True)
        
        return {
            "success": True,
            "message": "获取评分标准列表成功",
            "data": {
                "standards": standards_list,
                "total": len(standards_list)
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取失败: {str(e)}")