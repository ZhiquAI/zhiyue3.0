#!/usr/bin/env python3
"""
智阅AI简化版后端服务 - 用于快速启动测试
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI(
    title="智阅AI - 简化版",
    description="智能阅卷系统API",
    version="1.0.0"
)

# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 开发环境允许所有来源
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {
        "message": "智阅AI后端服务正在运行",
        "version": "1.0.0",
        "status": "healthy"
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "message": "服务运行正常"
    }

@app.get("/api/test")
async def api_test():
    return {
        "status": "success",
        "message": "API连接测试成功",
        "data": {
            "frontend_url": "http://localhost:5175",
            "backend_url": "http://localhost:8002",
            "timestamp": "2025-08-25"
        }
    }

@app.get("/api/answer-sheet-processing/stages")
async def get_processing_stages():
    """获取答题卡处理阶段信息"""
    return {
        "success": True,
        "data": {
            "processing_stages": [
                {
                    "stage": "uploaded",
                    "name": "文件上传",
                    "description": "答题卡文件已上传到服务器",
                    "typical_duration": "1-2秒"
                },
                {
                    "stage": "preprocessing", 
                    "name": "图像预处理",
                    "description": "图像质量检查、格式转换、倾斜校正",
                    "typical_duration": "5-10秒"
                },
                {
                    "stage": "student_info_recognition",
                    "name": "学生信息识别", 
                    "description": "条形码识别、OCR提取姓名学号等信息",
                    "typical_duration": "10-20秒"
                },
                {
                    "stage": "question_segmentation",
                    "name": "题目切分",
                    "description": "智能检测题目区域，识别题目类型", 
                    "typical_duration": "15-30秒"
                },
                {
                    "stage": "answer_extraction",
                    "name": "答案提取",
                    "description": "从每个题目区域提取学生答案内容",
                    "typical_duration": "20-40秒"
                },
                {
                    "stage": "grading",
                    "name": "智能评分",
                    "description": "根据题目类型应用相应的评分算法",
                    "typical_duration": "30-60秒"
                },
                {
                    "stage": "quality_check",
                    "name": "质量检查", 
                    "description": "评估识别和评分质量，标记需要人工复核的项目",
                    "typical_duration": "5-10秒"
                },
                {
                    "stage": "completed",
                    "name": "处理完成",
                    "description": "所有处理阶段完成，结果可用",
                    "typical_duration": "即时"
                }
            ],
            "typical_total_processing_time": "2-3分钟/张答题卡",
            "current_implementation_status": {
                "批量上传": "✅ 已实现",
                "学生信息识别": "✅ 已实现", 
                "题目切分": "✅ 已实现",
                "智能评分": "🟡 基础版本",
                "质量控制": "🟡 开发中",
                "完整流程": "✅ 可测试"
            }
        }
    }

@app.post("/api/batch-upload/demo")
async def demo_batch_upload():
    """演示批量上传功能（模拟）"""
    import asyncio
    await asyncio.sleep(1)  # 模拟处理时间
    
    return {
        "success": True,
        "message": "批量上传演示完成",
        "data": {
            "batch_id": "demo_batch_123",
            "upload_summary": {
                "total_files": 5,
                "success_count": 5,
                "failed_count": 0,
                "success_rate": 1.0
            },
            "processing_status": "started",
            "estimated_processing_time": 150
        }
    }

@app.get("/api/batch-upload/batch-status/{batch_id}")
async def demo_batch_status(batch_id: str):
    """演示批量处理状态（模拟）"""
    return {
        "success": True,
        "data": {
            "batch_id": batch_id,
            "overall_status": "processing",
            "progress": {
                "total_files": 5,
                "completed_files": 3,
                "processing_files": 1,
                "failed_files": 0, 
                "pending_files": 1,
                "completion_percentage": 60.0
            },
            "processing_stages": {
                "uploaded": 5,
                "preprocessing": 5,
                "student_info_recognition": 4,
                "question_segmentation": 3,
                "answer_extraction": 3,
                "grading": 2,
                "quality_check": 1,
                "completed": 1
            },
            "estimated_completion_time": "2025-08-25T03:30:00Z"
        }
    }

if __name__ == "__main__":
    print("🚀 启动智阅AI简化版后端服务...")
    print("📖 API文档: http://localhost:8002/docs")
    print("🔗 健康检查: http://localhost:8002/health")
    
    uvicorn.run(
        "simple_backend:app",
        host="0.0.0.0",
        port=8002,
        reload=True
    )