# 智阅AI后端API开发文档

## 📋 项目概述

智阅AI后端是一个基于FastAPI的现代化Web API服务，专为智能历史阅卷系统设计。提供用户认证、考试管理、OCR处理、AI评分等核心功能。

## 🏗️ 技术架构

### 核心技术栈
- **Web框架**: FastAPI 0.104.1
- **数据库**: SQLAlchemy + PostgreSQL/SQLite
- **认证**: JWT + OAuth2
- **OCR引擎**: Gemini 2.5 Pro
- **异步任务**: Celery + Redis
- **API文档**: Swagger/OpenAPI

### 系统架构
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   前端应用      │    │   API网关       │    │   认证服务      │
│   React/Vue     │────│   FastAPI       │────│   JWT/OAuth2    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                    ┌───────────┼───────────┐
                    │                       │
        ┌─────────────────┐        ┌─────────────────┐
        │   业务服务      │        │   数据存储      │
        │   考试管理      │        │   PostgreSQL    │
        │   OCR处理      │        │   Redis缓存     │
        │   AI评分       │        │   文件存储      │
        └─────────────────┘        └─────────────────┘
                    │
        ┌─────────────────┐
        │   外部服务      │
        │   Gemini API    │
        │   文件处理      │
        └─────────────────┘
```

## 🚀 快速开始

### 1. 环境要求
- Python 3.8+
- Redis (可选，用于缓存和任务队列)
- PostgreSQL (生产环境推荐)

### 2. 安装和配置

```bash
# 克隆项目
cd zhiyue3.0

# 快速启动 (推荐)
./quick_start.sh

# 或手动安装
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r backend/requirements.txt
```

### 3. 环境配置

复制环境配置文件：
```bash
cp .env.example .env
```

编辑 `.env` 文件，配置关键参数：
```env
# 数据库
DATABASE_URL="sqlite:///./zhiyue_ai.db"  # 开发环境
# DATABASE_URL="postgresql://user:pass@localhost/zhiyue_ai"  # 生产环境

# 安全密钥
SECRET_KEY="your-super-secret-key-here"

# Gemini API
GEMINI_API_KEY="your-gemini-api-key"
```

### 4. 启动服务

```bash
# 开发模式
python backend/start.py

# 或使用uvicorn
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

### 5. 验证安装

```bash
# 运行API测试
python test_api.py

# 访问API文档
open http://localhost:8000/docs
```

## 📚 API文档

### 认证接口 `/auth`

#### 用户注册
```http
POST /auth/register
Content-Type: application/json

{
  "username": "teacher1",
  "email": "teacher@school.com",
  "password": "password123",
  "name": "张老师",
  "school": "测试中学",
  "subject": "历史"
}
```

#### 用户登录
```http
POST /auth/login
Content-Type: application/json

{
  "username": "teacher1",
  "password": "password123"
}
```

#### 获取用户信息
```http
GET /auth/me
Authorization: Bearer <token>
```

### 考试管理 `/api/exams`

#### 创建考试
```http
POST /api/exams/
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "八年级历史期末考试",
  "subject": "历史",
  "grade": "八年级",
  "paper_config": {
    "total_questions": 25,
    "question_types": ["选择题", "填空题", "简答题"]
  },
  "grading_config": {
    "total_score": 100,
    "objective_score": 60,
    "subjective_score": 40
  }
}
```

#### 获取考试列表
```http
GET /api/exams/?skip=0&limit=20&subject=历史&status=进行中
Authorization: Bearer <token>
```

#### 上传试卷文件
```http
POST /api/exams/{exam_id}/upload-paper
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <PDF或图片文件>
```

#### 批量上传答题卡
```http
POST /api/exams/{exam_id}/batch-upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

files: <多个答题卡文件>
```

### OCR处理 `/api/ocr`

#### 处理单个答题卡
```http
POST /api/ocr/process?answer_sheet_id={sheet_id}
Authorization: Bearer <token>
```

#### 批量OCR处理
```http
POST /api/ocr/batch-process
Authorization: Bearer <token>
Content-Type: application/json

{
  "answer_sheet_ids": ["uuid1", "uuid2", "uuid3"],
  "priority": 5,
  "batch_mode": true
}
```

#### 查看处理状态
```http
GET /api/ocr/task/{task_id}/status
Authorization: Bearer <token>
```

### 配置信息 `/api/config`

```http
GET /api/config

# 响应示例
{
  "ocr_config": {
    "primary_engine": "gemini-2.5-pro",
    "api_key_configured": true,
    "max_image_size": 2048,
    "batch_size": 3
  },
  "file_config": {
    "max_file_size": 52428800,
    "allowed_extensions": [".pdf", ".jpg", ".jpeg", ".png"]
  },
  "features": {
    "ai_grading_enabled": true,
    "ai_analysis_enabled": true
  }
}
```

## 🗄️ 数据库设计

### 核心表结构

#### 用户表 (users)
```sql
- id: 主键UUID
- username: 用户名 (唯一)
- email: 邮箱 (唯一)
- hashed_password: 密码哈希
- name: 真实姓名
- role: 角色 (teacher/admin)
- school: 学校
- subject: 任教科目
- is_active: 是否启用
- created_at: 创建时间
```

#### 考试表 (exams)
```sql
- id: 主键UUID
- name: 考试名称
- subject: 科目
- grade: 年级
- status: 状态
- paper_config: 试卷配置JSON
- grading_config: 评分配置JSON
- total_students: 参考学生数
- created_by: 创建者ID
- created_at: 创建时间
```

#### 答题卡表 (answer_sheets)
```sql
- id: 主键UUID
- exam_id: 考试ID
- student_id: 学号
- student_name: 学生姓名
- class_name: 班级
- original_file_path: 原始文件路径
- ocr_status: OCR状态
- ocr_result: OCR结果JSON
- ocr_confidence: 置信度
- grading_status: 评分状态
- total_score: 总分
- created_at: 创建时间
```

## 🔒 安全特性

### 认证和授权
- JWT令牌认证
- 密码哈希 (bcrypt)
- 角色权限控制
- 令牌过期机制

### API安全
- 请求限流 (slowapi)
- SQL注入防护
- XSS防护
- 文件上传安全检查
- IP封禁机制

### 数据保护
- 敏感数据脱敏
- 请求参数验证
- 错误信息安全处理
- 访问日志记录

## 📊 监控和日志

### 日志配置
```python
# 日志级别: DEBUG, INFO, WARNING, ERROR
LOG_LEVEL="INFO"
LOG_FILE="./logs/app.log"

# 日志格式
'%(asctime)s - %(name)s - %(levelname)s - %(message)s'
```

### 健康检查
```http
GET /health

# 响应
{
  "status": "healthy",
  "timestamp": "2025-01-01T12:00:00Z",
  "version": "1.0.0"
}
```

### 性能监控
- 请求响应时间
- API调用次数
- 错误率统计
- 资源使用情况

## 🧪 测试

### 运行测试
```bash
# API功能测试
python test_api.py

# 单元测试
pytest backend/tests/

# 覆盖率测试
pytest --cov=backend backend/tests/
```

### 测试覆盖
- 认证流程测试
- 考试管理功能测试
- OCR处理测试
- 安全机制测试

## 🚀 部署指南

### 开发环境
```bash
# 使用内置开发服务器
python backend/start.py
```

### 生产环境
```bash
# 使用Gunicorn
pip install gunicorn
gunicorn backend.main:app -w 4 -k uvicorn.workers.UvicornWorker

# 使用Docker
docker build -t zhiyue-ai-backend .
docker run -p 8000:8000 zhiyue-ai-backend
```

### 环境变量配置
```env
# 生产环境必须修改
SECRET_KEY="production-secret-key"
DATABASE_URL="postgresql://user:pass@db:5432/zhiyue_ai"
DEBUG=false
```

## 🔧 故障排除

### 常见问题

1. **数据库连接失败**
   - 检查DATABASE_URL配置
   - 确认数据库服务运行状态
   - 验证数据库用户权限

2. **Gemini API错误**
   - 验证GEMINI_API_KEY配置
   - 检查网络连接
   - 查看API配额使用情况

3. **文件上传失败**
   - 检查存储目录权限
   - 验证文件大小限制
   - 确认文件格式支持

4. **认证令牌问题**
   - 检查SECRET_KEY配置
   - 验证令牌过期时间
   - 确认时间同步

### 日志分析
```bash
# 查看应用日志
tail -f logs/app.log

# 查看错误日志
grep ERROR logs/app.log

# 查看访问日志
grep "GET\|POST" logs/app.log
```

## 📈 性能优化

### 数据库优化
- 添加适当索引
- 查询优化
- 连接池配置
- 分页查询

### 缓存策略
- Redis缓存热点数据
- 静态文件缓存
- API响应缓存
- 数据库查询缓存

### 异步处理
- OCR任务异步化
- 批量处理优化
- 队列管理
- 并发控制

## 🤝 开发指南

### 代码规范
- 使用Black格式化
- 遵循PEP8规范
- 添加类型注解
- 编写文档字符串

### API设计原则
- RESTful设计
- 统一错误处理
- 版本控制
- 向后兼容

### 贡献流程
1. Fork项目
2. 创建功能分支
3. 编写测试用例
4. 提交代码审查
5. 合并主分支

## 📞 技术支持

如有问题，请通过以下方式联系：

- 📧 邮箱：support@zhiyue-ai.com
- 📱 GitHub Issues
- 📖 在线文档：http://docs.zhiyue-ai.com

---

**智阅AI后端团队**  
*让AI赋能教育，让教学更智能*