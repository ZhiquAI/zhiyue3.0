# 智阅AI - 智能历史阅卷助手

一个专为初中历史教师设计的智能阅卷系统，结合先进的OCR识别和NLP技术，让您从繁重的阅卷工作中解脱，专注于更有价值的教学活动。

## ✨ 特性

- 🤖 **AI智能识别** - 先进的OCR技术，精准识别手写文字，准确率高达98%
- 🎯 **多维度评分** - 基于历史学科特点，从知识点、论证能力、史料运用等维度智能评分
- 📊 **深度数据分析** - 生成详细的学情分析报告，为教学决策提供数据支撑
- 🚀 **高效便捷** - 阅卷效率提升85%，让教师有更多时间专注教学

## 🛠️ 技术栈

- **前端**: React 18 + TypeScript + Tailwind CSS + Ant Design
- **状态管理**: Zustand
- **图表**: Recharts
- **构建工具**: Vite
- **测试**: Vitest + Testing Library
- **代码质量**: ESLint + TypeScript

## 🚀 快速开始

### 环境要求

- Node.js >= 16.0.0
- npm >= 8.0.0
- Python 3.8+ (用于日志同步服务)

### 安装依赖

```bash
# 安装前端依赖
npm install

# 安装Python依赖（用于开发调试）
pip3 install flask flask-cors watchdog
```

### 启动开发环境

#### 方法1: 一键启动（推荐）
```bash
# 启动完整开发环境（包含实时日志同步）
./start_dev_with_logs.sh
```

#### 方法2: 分别启动
```bash
# 启动前端服务
bash start_frontend.sh

# 启动后端服务（可选）
python3 simple_backend.py
```

### 访问应用

- 🌐 **前端应用**: http://localhost:5174/
- 🔧 **日志服务**: http://localhost:3001/
- 📊 **后端API**: http://localhost:8000/

## 🔍 开发调试

### 实时日志监控

在开发过程中，您可以实时监控浏览器中的错误和API调用：

```bash
# 监控所有日志
python3 watch_logs.py -t all

# 只监控错误
python3 watch_logs.py -t errors

# 只监控API调用
python3 watch_logs.py -t api
```

### 浏览器调试工具

在浏览器控制台中使用以下命令：

```javascript
// 测试Gemini API连接
testGemini()

// 查看错误列表
getErrors()

// 下载调试日志
__LOG_SYNC__.downloadLogs()
```

详细使用指南: [docs/QUICK_START.md](docs/QUICK_START.md)

## 📚 文档

- [快速开始指南](docs/QUICK_START.md) - 5分钟快速上手
- [日志同步系统](docs/LOG_SYNC_GUIDE.md) - 完整的调试工具文档
- [Gemini配置指南](docs/GEMINI_SETUP.md) - AI服务配置说明

## 🎯 核心功能

### 智能试卷识别
- 📄 支持PDF、JPG、PNG格式试卷
- 🔍 自动识别题目类型和分值
- 📝 提取完整题目内容和知识点

### 智能阅卷评分
- 🤖 多维度评分标准
- 📊 实时评分进度跟踪
- 💡 AI生成评分建议

### 数据分析报告
- 📈 班级成绩分析
- 👤 个人能力画像
- 🎯 学习建议生成

## 🛠️ 开发工具

本项目集成了强大的开发调试工具：

- **实时错误监控** - 浮动面板显示运行时错误
- **API调用日志** - 详细记录所有网络请求
- **日志文件同步** - 将浏览器日志同步到Cursor
- **性能监控** - 响应时间和成功率统计

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🙏 致谢

- [Ant Design](https://ant.design/) - 优秀的React UI组件库
- [Recharts](https://recharts.org/) - 强大的图表库
- [Gemini AI](https://ai.google.dev/) - 先进的AI服务
- [Vite](https://vitejs.dev/) - 快速的构建工具

---

**💡 提示**: 首次使用请查看 [快速开始指南](docs/QUICK_START.md) 获得最佳体验！
