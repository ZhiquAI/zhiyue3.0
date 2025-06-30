# Gemini 2.5 Pro API 配置指南

## 📋 概述

本文档详细介绍如何在智阅AI项目中配置和使用Google Gemini 2.5 Pro大模型API，以增强智能阅卷功能。

## 🔑 获取API密钥

### 1. 访问Google AI Studio
- 前往 [Google AI Studio](https://aistudio.google.com/)
- 使用Google账号登录

### 2. 创建API密钥
- 点击左侧菜单中的 "Get API key"
- 点击 "Create API key"
- 选择或创建一个Google Cloud项目
- 复制生成的API密钥

### 3. 设置配额和限制
- 在Google Cloud Console中设置API配额
- 建议设置合理的每日请求限制
- 监控API使用情况

## ⚙️ 项目配置

### 1. 环境变量配置

在项目根目录创建 `.env` 文件：

```bash
# Gemini AI 配置
VITE_GEMINI_API_KEY=your-actual-api-key-here
VITE_GEMINI_MODEL=gemini-2.5-pro
VITE_GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta
VITE_GEMINI_MAX_TOKENS=8192
VITE_GEMINI_TEMPERATURE=0.3
VITE_GEMINI_TOP_P=0.8
VITE_GEMINI_TOP_K=40

# AI功能开关
VITE_AI_GRADING_ENABLED=true
VITE_AI_ANALYSIS_ENABLED=true
VITE_AI_SUGGESTION_ENABLED=true
```

### 2. 参数说明

| 参数 | 说明 | 推荐值 |
|------|------|--------|
| `GEMINI_API_KEY` | API密钥 | 从Google AI Studio获取 |
| `GEMINI_MODEL` | 模型版本 | `gemini-2.5-pro` |
| `MAX_TOKENS` | 最大输出token数 | `8192` |
| `TEMPERATURE` | 创造性控制 | `0.3`（教育场景推荐较低值） |
| `TOP_P` | 核采样参数 | `0.8` |
| `TOP_K` | 候选词数量 | `40` |

## 🚀 功能特性

### 1. 智能评分
- **主观题评分**: 基于历史学科特点的多维度评分
- **批量处理**: 支持批量评分，提高效率
- **评分解释**: 提供详细的评分理由和建议

### 2. 学情分析
- **整体分析**: 班级和年级层面的学情分析
- **个性化建议**: 针对个别学生的学习建议
- **教学指导**: 为教师提供教学改进建议

### 3. 试卷分析
- **内容识别**: 自动识别题目类型和知识点
- **难度评估**: 评估题目难度等级
- **结构分析**: 分析试卷整体结构

## 🔧 使用方法

### 1. 在组件中使用

```tsx
import { useGeminiAI } from '../hooks/useGeminiAI';

const MyComponent = () => {
  const { gradeQuestion, isGradingLoading } = useGeminiAI();
  
  const handleGrading = async () => {
    const result = await gradeQuestion({
      question: "题目内容",
      referenceAnswer: "参考答案",
      rubric: rubricData,
      studentAnswer: "学生答案"
    });
    
    console.log('评分结果:', result);
  };
  
  return (
    <Button 
      loading={isGradingLoading} 
      onClick={handleGrading}
    >
      AI评分
    </Button>
  );
};
```

### 2. 状态监控

```tsx
import GeminiStatusIndicator from '../components/ai/GeminiStatusIndicator';

// 显示AI服务状态
<GeminiStatusIndicator showLabel />
```

## 🛡️ 安全考虑

### 1. API密钥安全
- ❌ 不要将API密钥提交到版本控制系统
- ✅ 使用环境变量存储敏感信息
- ✅ 在生产环境中使用密钥管理服务

### 2. 内容安全
- 配置了适合教育场景的安全过滤器
- 自动过滤不当内容
- 记录和监控API调用

### 3. 成本控制
- 设置API调用限制
- 监控token使用量
- 实现本地缓存减少重复调用

## 📊 监控和调试

### 1. 健康检查
```tsx
const { checkHealth, isHealthy } = useGeminiAI();

// 检查服务状态
await checkHealth();
console.log('服务状态:', isHealthy);
```

### 2. 错误处理
- 自动降级到本地算法
- 详细的错误日志记录
- 用户友好的错误提示

### 3. 性能监控
- API响应时间监控
- 成功率统计
- 使用量分析

## 🔄 最佳实践

### 1. 提示词优化
- 针对历史学科特点设计专用提示词
- 包含具体的评分标准和示例
- 定期根据使用效果优化提示词

### 2. 批量处理
- 合理控制批量大小
- 添加适当的延迟避免限流
- 实现断点续传机制

### 3. 缓存策略
- 缓存相似问题的评分结果
- 实现智能缓存失效机制
- 减少不必要的API调用

## 🐛 常见问题

### Q: API调用失败怎么办？
A: 系统会自动降级到本地评分算法，确保功能正常使用。

### Q: 如何控制API成本？
A: 通过设置每日限额、实现缓存机制、优化提示词长度等方式控制成本。

### Q: 评分结果不准确怎么办？
A: 可以通过优化提示词、调整模型参数、增加训练样本等方式提高准确性。

## 📞 技术支持

如有问题，请联系技术团队：
- 邮箱: tech@zhiyue-ai.com
- 文档: [内部技术文档](./TECHNICAL_DOCS.md)
- 监控: [系统监控面板](./monitoring)