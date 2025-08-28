#!/usr/bin/env python3
"""
简化的登录后端服务
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

app = FastAPI(
    title="智阅AI - 登录服务",
    description="简化的用户认证API",
    version="1.0.0"
)

# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    success: bool
    message: str
    user: dict = None
    token: str = None

@app.get("/")
async def root():
    return {
        "message": "智阅AI登录服务正在运行",
        "version": "1.0.0",
        "status": "healthy"
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "message": "登录服务运行正常"
    }

@app.options("/auth/login")
async def login_options():
    """处理预检请求"""
    return {"message": "OK"}

@app.post("/auth/login")
async def login(request: LoginRequest):
    """用户登录接口"""
    
    # 打印调试信息
    print(f"收到登录请求: username={request.username}, password={request.password}")
    
    # 简化的用户验证 - 接受任何用户名，接受多种测试密码
    if request.password in ['demo', 'demo123', request.username]:
        user_data = {
            "id": request.username,
            "username": request.username,
            "name": request.username,
            "email": f"{request.username}@example.com",
            "role": "teacher",
            "permissions": ["read", "write"],
            "avatar": None,
            "school": "演示学校",
            "subject": "演示科目",
            "grades": ["高一", "高二", "高三"]
        }
        
        # 返回前端期望的标准API格式
        return {
            "success": True,
            "message": "登录成功",
            "data": {
                "user": user_data,
                "token": "demo_token_" + request.username,
                "refreshToken": "refresh_demo_token_" + request.username,
                "expiresAt": "2025-12-31T23:59:59Z"
            },
            "timestamp": "2025-08-25T07:15:00Z",
            "requestId": "demo-request-" + request.username
        }
    else:
        raise HTTPException(
            status_code=401,
            detail={
                "success": False,
                "message": "用户名或密码错误",
                "error": "INVALID_CREDENTIALS"
            }
        )

@app.get("/auth/me")
async def get_current_user():
    """获取当前用户信息"""
    return {
        "success": True,
        "message": "获取用户信息成功",
        "data": {
            "id": "demo",
            "username": "demo",
            "name": "demo",
            "email": "demo@example.com",
            "role": "teacher",
            "permissions": ["read", "write"],
            "avatar": None,
            "school": "演示学校",
            "subject": "演示科目",
            "grades": ["高一", "高二", "高三"],
            "createdAt": "2025-01-01T00:00:00Z",
            "updatedAt": "2025-08-25T07:15:00Z"
        },
        "timestamp": "2025-08-25T07:15:00Z",
        "requestId": "demo-me-request"
    }

@app.post("/auth/logout")
async def logout():
    """用户退出登录"""
    return {
        "success": True,
        "message": "退出登录成功"
    }

# 添加处理阶段信息端点（从simple_backend.py复制）
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

if __name__ == "__main__":
    print("🚀 启动智阅AI登录服务...")
    print("📖 API文档: http://localhost:8002/docs")
    print("🔗 健康检查: http://localhost:8002/health") 
    print("🔑 登录端点: http://localhost:8002/auth/login")
    print("💡 提示: 任何用户名 + 密码'demo'或'demo123'即可登录")
    
    uvicorn.run(
        "login_backend:app",
        host="0.0.0.0",
        port=8002,
        reload=True
    )