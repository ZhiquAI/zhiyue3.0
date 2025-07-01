# Gemini 2.5 Pro OCR 配置指南

## 📋 概述

智阅AI已全面升级为使用Google Gemini 2.5 Pro作为主要的OCR/HTR识别引擎。相比传统OCR技术，Gemini 2.5 Pro提供了更强大的多模态理解能力，特别适合处理复杂的手写文字识别和结构化信息提取。

## 🚀 核心优势

### 1. 多模态理解能力
- **图像+文本理解**: 同时理解图像内容和文字信息
- **上下文感知**: 基于整体内容理解局部信息
- **智能推理**: 能够推断模糊或部分遮挡的内容

### 2. 专业教育场景优化
- **手写识别**: 专门优化中文手写字体识别
- **答题卡理解**: 智能识别答题卡结构和学生信息
- **试卷解析**: 自动解析题目结构、分值、知识点

### 3. 高精度识别
- **置信度评估**: 提供详细的识别置信度分析
- **质量检查**: 自动评估图像质量并提供改进建议
- **错误检测**: 智能检测识别中的潜在问题

## ⚙️ 配置步骤

### 1. 获取Gemini API密钥

访问 [Google AI Studio](https://aistudio.google.com/)：
1. 使用Google账号登录
2. 创建新的API密钥
3. 选择或创建Google Cloud项目
4. 复制生成的API密钥

### 2. 环境变量配置

在项目根目录的 `.env` 文件中添加：

```bash
# Gemini 2.5 Pro OCR配置
VITE_GEMINI_API_KEY=your-actual-api-key-here
VITE_GEMINI_MODEL=gemini-2.5-pro
VITE_GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta
VITE_GEMINI_MAX_TOKENS=8192
VITE_GEMINI_TEMPERATURE=0.1
VITE_GEMINI_TOP_P=0.8
VITE_GEMINI_TOP_K=40

# OCR特定配置
VITE_OCR_MAX_IMAGE_SIZE=2048
VITE_OCR_BATCH_SIZE=3
VITE_OCR_RETRY_ATTEMPTS=3
VITE_OCR_TIMEOUT=60
```

### 3. 后端配置

在 `backend/config/settings.py` 中确保配置正确：

```python
# Gemini 2.5 Pro OCR配置
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-pro")
GEMINI_BASE_URL = os.getenv("GEMINI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta")
GEMINI_MAX_TOKENS = int(os.getenv("GEMINI_MAX_TOKENS", "8192"))
GEMINI_TEMPERATURE = float(os.getenv("GEMINI_TEMPERATURE", "0.1"))  # OCR任务使用低温度

# OCR特定配置
OCR_MAX_IMAGE_SIZE = int(os.getenv("OCR_MAX_IMAGE_SIZE", "2048"))
OCR_BATCH_SIZE = int(os.getenv("OCR_BATCH_SIZE", "3"))
OCR_RETRY_ATTEMPTS = int(os.getenv("OCR_RETRY_ATTEMPTS", "3"))
OCR_TIMEOUT = int(os.getenv("OCR_TIMEOUT", "60"))
```

## 🔧 使用方法

### 1. 前端组件使用

```tsx
import { useGeminiOCR } from '../hooks/useGeminiOCR';
import GeminiOCRPanel from '../components/ocr/GeminiOCRPanel';

const MyComponent = () => {
  const { recognizeAnswerSheet, isOCRLoading } = useGeminiOCR();
  
  const handleRecognition = async (file: File) => {
    try {
      const result = await recognizeAnswerSheet(file);
      console.log('识别结果:', result);
    } catch (error) {
      console.error('识别失败:', error);
    }
  };
  
  return (
    <GeminiOCRPanel
      type="answer_sheet"
      onRecognitionComplete={(results) => {
        console.log('批量识别完成:', results);
      }}
    />
  );
};
```

### 2. 后端服务调用

```python
from services.gemini_ocr_service import GeminiOCRService

# 初始化服务
ocr_service = GeminiOCRService()

# 处理答题卡
result = await ocr_service.process_answer_sheet("path/to/image.jpg")

# 处理试卷文档
result = await ocr_service.process_paper_document("path/to/paper.pdf")

# 批量处理
results = await ocr_service.batch_process_images(
    ["image1.jpg", "image2.jpg"], 
    task_type="answer_sheet"
)
```

## 📊 识别结果格式

### 答题卡识别结果

```json
{
  "student_info": {
    "student_id": "2024001",
    "name": "张三",
    "class": "八年级1班"
  },
  "objective_answers": {
    "1": "A",
    "2": "B",
    "3": "C"
  },
  "subjective_answers": {
    "13": "秦始皇统一中国的历史意义在于...",
    "14": "唐朝贞观之治的特点包括..."
  },
  "quality_assessment": {
    "clarity_score": 8,
    "issues": ["轻微污损"],
    "confidence": 0.95
  }
}
```

### 试卷识别结果

```json
{
  "paper_info": {
    "subject": "历史",
    "exam_name": "八年级期末考试",
    "total_score": 100,
    "duration": "90分钟"
  },
  "questions": [
    {
      "number": "1",
      "type": "choice",
      "content": "中国古代四大发明中，最早传入欧洲的是（）",
      "options": ["A. 造纸术", "B. 指南针", "C. 火药", "D. 印刷术"],
      "points": 2,
      "knowledge_points": ["古代科技", "四大发明"],
      "difficulty": "medium",
      "region": {
        "x": 10,
        "y": 20,
        "width": 80,
        "height": 15
      }
    }
  ],
  "quality_assessment": {
    "clarity_score": 9,
    "completeness": 1.0,
    "confidence": 0.96
  }
}
```

## 🛡️ 安全与隐私

### 1. 数据安全
- 所有图像数据通过HTTPS加密传输
- API密钥安全存储，不在客户端暴露
- 识别完成后及时清理临时文件

### 2. 隐私保护
- 学生信息仅用于教学目的
- 不存储原始图像到第三方服务
- 符合教育数据隐私保护要求

### 3. 内容过滤
- 配置了适合教育场景的安全过滤器
- 自动过滤不当内容
- 记录和监控API调用

## 📈 性能优化

### 1. 图像预处理
- 自动压缩大尺寸图像
- 优化图像质量以提高识别率
- 支持多种图像格式

### 2. 批量处理
- 控制并发数量避免API限流
- 智能重试机制
- 实时进度反馈

### 3. 缓存策略
- 缓存识别结果避免重复处理
- 智能缓存失效机制
- 减少API调用成本

## 🔍 质量控制

### 1. 置信度评估
- 提供详细的识别置信度分析
- 自动标记低置信度结果
- 建议人工复核机制

### 2. 质量检查
- 自动评估图像清晰度
- 检测常见问题（模糊、污损等）
- 提供改进建议

### 3. 错误处理
- 智能错误检测和恢复
- 详细的错误日志记录
- 用户友好的错误提示

## 🚨 故障排除

### 常见问题

1. **API密钥无效**
   - 检查密钥是否正确配置
   - 确认Google Cloud项目状态
   - 验证API配额是否充足

2. **识别准确率低**
   - 检查图像质量和清晰度
   - 确保图像尺寸适当
   - 考虑重新拍摄或扫描

3. **处理速度慢**
   - 检查网络连接状态
   - 优化图像大小
   - 调整批处理并发数

4. **内存使用过高**
   - 减少批处理文件数量
   - 及时清理临时文件
   - 监控系统资源使用

### 监控和调试

```python
# 检查服务健康状态
from services.gemini_ocr_service import GeminiOCRService

ocr_service = GeminiOCRService()
health_status = ocr_service.get_health_status()
print(health_status)

# 启用详细日志
import logging
logging.getLogger('gemini_ocr').setLevel(logging.DEBUG)
```

## 📞 技术支持

如有问题，请联系技术团队：
- 邮箱: tech@zhiyue-ai.com
- 文档: [技术文档](./TECHNICAL_DOCS.md)
- 监控: [系统监控面板](./monitoring)

---

通过使用Gemini 2.5 Pro作为OCR引擎，智阅AI在识别准确率、处理速度和用户体验方面都有了显著提升，为李老师等历史教师提供更加智能、可靠的阅卷服务！