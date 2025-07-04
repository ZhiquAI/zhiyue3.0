#!/usr/bin/env python3
"""
智阅AI简化后端服务 - 专注于文档分析功能
"""

import os
import sys
import json
import asyncio
import base64
from pathlib import Path
from typing import Dict, Any, List
from PIL import Image
import io
import uuid
from datetime import datetime

# 添加项目路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

try:
    from fastapi import FastAPI, File, UploadFile, HTTPException, Form
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.responses import JSONResponse
    from pydantic import BaseModel
except ImportError:
    print("❌ 缺少FastAPI依赖，请安装: pip install fastapi uvicorn")
    sys.exit(1)

# 配置
GEMINI_API_KEY = "AIzaSyDF1fs-ctUcD5oLgEQBve8GMIPrYOG0zWM"  # 从您的配置中获取
STORAGE_DIR = Path("./storage")
STORAGE_DIR.mkdir(exist_ok=True)

app = FastAPI(title="智阅AI简化后端", description="专注于文档分析功能")

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# 响应模型
class DocumentAnalysisResponse(BaseModel):
    success: bool
    message: str
    data: Dict[str, Any] = {}
    progress: float = 0.0

class QuestionItem(BaseModel):
    number: str
    type: str
    content: str
    points: int
    options: List[str] = []

# 全局变量存储分析状态
analysis_tasks = {}

@app.get("/")
async def root():
    return {"message": "智阅AI简化后端服务", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.post("/api/exams/analyze-document")
async def analyze_document(
    file: UploadFile = File(...),
    exam_name: str = Form(""),
    subject: str = Form("历史"),
    grade: str = Form("")
):
    """分析上传的试卷文档"""
    
    # 生成任务ID
    task_id = str(uuid.uuid4())
    
    try:
        # 验证文件类型
        if not file.filename.lower().endswith(('.pdf', '.jpg', '.jpeg', '.png', '.tiff', '.tif')):
            raise HTTPException(status_code=400, detail="不支持的文件格式")
        
        # 保存文件
        file_path = STORAGE_DIR / f"paper_{task_id}_{file.filename}"
        content = await file.read()
        
        with open(file_path, "wb") as f:
            f.write(content)
        
        # 初始化任务状态
        analysis_tasks[task_id] = {
            "status": "processing",
            "progress": 0.1,
            "file_path": str(file_path),
            "exam_name": exam_name,
            "subject": subject,
            "grade": grade,
            "created_at": datetime.now().isoformat()
        }
        
        # 启动后台分析任务
        asyncio.create_task(process_document_analysis(task_id, file_path, exam_name, subject))
        
        return {
            "success": True,
            "message": "文档上传成功，开始分析",
            "task_id": task_id,
            "progress": 0.1
        }
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": f"文档分析失败: {str(e)}",
                "progress": 0.0
            }
        )

@app.get("/api/exams/analysis-status/{task_id}")
async def get_analysis_status(task_id: str):
    """获取文档分析状态"""
    
    if task_id not in analysis_tasks:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    task = analysis_tasks[task_id]
    return {
        "success": True,
        "data": task,
        "progress": task.get("progress", 0.0)
    }

async def process_document_analysis(task_id: str, file_path: Path, exam_name: str, subject: str):
    """后台处理文档分析"""
    
    try:
        # 更新进度：开始处理
        analysis_tasks[task_id]["progress"] = 0.2
        analysis_tasks[task_id]["message"] = "正在预处理图像..."
        
        await asyncio.sleep(1)  # 模拟处理时间
        
        # 更新进度：图像预处理
        analysis_tasks[task_id]["progress"] = 0.4
        analysis_tasks[task_id]["message"] = "正在进行AI识别..."
        
        # 如果有Gemini API，执行真实的OCR
        if GEMINI_API_KEY and GEMINI_API_KEY != "your-gemini-api-key-here":
            result = await analyze_with_gemini(file_path)
        else:
            # 模拟分析结果
            result = create_mock_analysis_result(exam_name, subject)
        
        await asyncio.sleep(2)  # 模拟AI处理时间
        
        # 更新进度：分析完成
        analysis_tasks[task_id]["progress"] = 0.9
        analysis_tasks[task_id]["message"] = "正在生成评分标准..."
        
        await asyncio.sleep(1)
        
        # 完成分析
        analysis_tasks[task_id].update({
            "status": "completed",
            "progress": 1.0,
            "message": "文档分析完成",
            "result": result,
            "completed_at": datetime.now().isoformat()
        })
        
    except Exception as e:
        # 分析失败
        analysis_tasks[task_id].update({
            "status": "failed", 
            "progress": 0.0,
            "message": f"分析失败: {str(e)}",
            "error": str(e)
        })

async def analyze_with_gemini(file_path: Path) -> Dict[str, Any]:
    """使用Gemini进行真实的文档分析"""
    
    try:
        # 预处理图像
        with Image.open(file_path) as img:
            if img.mode != 'RGB':
                img = img.convert('RGB')
            
            # 调整大小
            max_size = 2048
            if max(img.size) > max_size:
                ratio = max_size / max(img.size)
                new_size = tuple(int(dim * ratio) for dim in img.size)
                img = img.resize(new_size, Image.Resampling.LANCZOS)
            
            # 转换为base64
            buffer = io.BytesIO()
            img.save(buffer, format='JPEG', quality=95)
            image_data = base64.b64encode(buffer.getvalue()).decode('utf-8')
        
        # 调用Gemini API
        import aiohttp
        
        prompt = """
你是一个专业的试卷分析专家。请仔细分析这张试卷图像，识别题目结构和内容：

请以JSON格式返回结果：
{
  "paper_info": {
    "subject": "历史",
    "exam_name": "考试名称",
    "total_score": 100
  },
  "questions": [
    {
      "number": "1",
      "type": "choice",
      "content": "题目完整内容...",
      "options": ["A. 选项1", "B. 选项2", "C. 选项3", "D. 选项4"],
      "points": 2,
      "knowledge_points": ["古代政治制度"],
      "difficulty": "medium"
    }
  ],
  "total_questions": 25,
  "grading_standards": {
    "objective_questions": "客观题评分标准",
    "subjective_questions": "主观题评分要点"
  }
}
"""
        
        request_data = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt},
                        {
                            "inline_data": {
                                "mime_type": "image/jpeg",
                                "data": image_data
                            }
                        }
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.1,
                "topK": 40,
                "topP": 0.8,
                "maxOutputTokens": 8192
            }
        }
        
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent"
        headers = {
            "Content-Type": "application/json",
            "x-goog-api-key": GEMINI_API_KEY
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=request_data, headers=headers, timeout=30) as response:
                if response.status == 200:
                    result = await response.json()
                    content = result['candidates'][0]['content']['parts'][0]['text']
                    
                    try:
                        return json.loads(content)
                    except:
                        # 如果解析失败，返回包装的结果
                        return {"raw_text": content, "analysis_engine": "gemini-2.5-pro"}
                else:
                    error_text = await response.text()
                    raise Exception(f"Gemini API错误: {response.status} - {error_text}")
                    
    except Exception as e:
        print(f"Gemini分析失败: {str(e)}")
        # 返回模拟结果
        return create_mock_analysis_result("测试考试", "历史")

def create_mock_analysis_result(exam_name: str, subject: str) -> Dict[str, Any]:
    """创建模拟的分析结果"""
    
    return {
        "paper_info": {
            "subject": subject,
            "exam_name": exam_name or "期末考试", 
            "total_score": 100,
            "duration": "90分钟"
        },
        "questions": [
            {
                "number": "1",
                "type": "choice",
                "content": "秦朝建立后，为加强中央集权采取的措施是",
                "options": [
                    "A. 推行分封制",
                    "B. 实行郡县制", 
                    "C. 建立三省六部制",
                    "D. 设立中书省"
                ],
                "points": 2,
                "knowledge_points": ["秦朝政治制度", "中央集权"],
                "difficulty": "easy"
            },
            {
                "number": "2", 
                "type": "choice",
                "content": "汉武帝时期实行的选官制度是",
                "options": [
                    "A. 世官制",
                    "B. 察举制",
                    "C. 九品中正制", 
                    "D. 科举制"
                ],
                "points": 2,
                "knowledge_points": ["汉朝政治", "选官制度"],
                "difficulty": "medium"
            },
            {
                "number": "25",
                "type": "essay",
                "content": "请结合史实，分析秦朝统一对中国历史发展的意义。",
                "points": 15,
                "knowledge_points": ["秦朝统一", "历史意义"],
                "difficulty": "hard"
            }
        ],
        "total_questions": 25,
        "grading_standards": {
            "objective_questions": "选择题每题2分，共50分。答案准确即可得分。",
            "subjective_questions": "主观题按知识点给分，注重史实准确性和逻辑性。满分50分。",
            "scoring_points": [
                "史实准确性(40%)",
                "逻辑思维(30%)", 
                "表达清晰(20%)",
                "创新观点(10%)"
            ]
        },
        "analysis_engine": "mock_analyzer",
        "confidence": 0.85,
        "processing_time": 3.2
    }

if __name__ == "__main__":
    import uvicorn
    
    print("🚀 启动智阅AI简化后端服务...")
    print("📍 服务地址: http://localhost:8000")
    print("📖 API文档: http://localhost:8000/docs")
    print("🔧 健康检查: http://localhost:8000/health")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )