# 智阅AI 日志同步系统使用指南

## 📖 概述

智阅AI日志同步系统是一套完整的开发调试工具，可以将浏览器中的错误信息、API调用日志和控制台输出实时同步到Cursor编辑器中，让您在开发过程中能够及时发现和解决问题。

## 🏗️ 系统架构

```
浏览器前端 → 日志收集 → 后端服务 → 文件系统 → 实时监控 → Cursor终端
```

### 核心组件

- **前端日志收集器** (`src/utils/logSync.ts`) - 拦截并收集浏览器日志
- **后端日志服务** (`dev_log_server.py`) - 接收并存储日志到文件
- **实时监控工具** (`watch_logs.py`) - 监控日志文件变化并显示
- **开发者工具集成** (`src/utils/devtools.ts`) - 提供调试命令

## 🚀 快速开始

### 方法1：一键启动（推荐）

```bash
# 启动完整的开发环境（包含日志同步）
./start_dev_with_logs.sh
```

这个命令会自动：
- 安装必要的Python依赖
- 启动日志同步服务器（端口3001）
- 启动前端开发服务器（端口5174）
- 显示所有可用的监控命令

### 方法2：分步启动

如果您需要更精细的控制，可以分步启动各个服务：

```bash
# 1. 启动日志同步服务器
python3 dev_log_server.py

# 2. 在新终端启动前端服务
bash start_frontend.sh

# 3. 在新终端监控日志
python3 watch_logs.py -t all
```

## 📊 日志监控

### 实时日志监控命令

在Cursor终端中运行以下命令来实时查看不同类型的日志：

```bash
# 监控所有类型的日志
python3 watch_logs.py -t all

# 只监控前端日志（默认）
python3 watch_logs.py -t frontend

# 只监控API调用日志
python3 watch_logs.py -t api

# 只监控错误日志
python3 watch_logs.py -t errors

# 显示现有的所有日志内容（不只是新增的）
python3 watch_logs.py -t frontend --show-all

# 指定自定义日志目录
python3 watch_logs.py -t all --log-dir /path/to/logs
```

### 监控输出示例

```
🚀 启动日志监控...
📁 监控目录: /Users/hero/zhiyue3.0/logs
📄 监控 frontend 日志: logs/frontend.log

✅ frontend 日志监控已启动，按 Ctrl+C 停止

[14:30:25] 📝 新日志:
------------------------------------------------------------
[2024-01-15 14:30:25] ERROR api          Gemini API error: 400 - Invalid API key
  数据: {
    "url": "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent",
    "status": 400,
    "statusText": "Bad Request"
  }
------------------------------------------------------------
```

## 🔍 浏览器调试工具

### 控制台命令

在浏览器开发者工具的Console标签中，您可以使用以下命令：

```javascript
// 测试Gemini API连接
testGemini()

// 查看所有收集的错误
getErrors()

// 清除错误记录
clearErrors()

// 启用详细的API调用日志
__DEV_TOOLS__.enableVerboseLogging()

// 禁用详细的API调用日志
__DEV_TOOLS__.disableVerboseLogging()

// 下载所有日志为文本文件
__LOG_SYNC__.downloadLogs()

// 查看日志统计信息
__LOG_SYNC__.getLogs()

// 清除所有日志
__LOG_SYNC__.clearLogs()
```

### 错误监控面板

系统会在浏览器页面右上角显示一个浮动的错误监控面板，实时显示：
- JavaScript运行时错误
- 未处理的Promise拒绝
- 控制台警告和错误
- 详细的错误堆栈信息

## 📁 日志文件说明

所有日志文件都存储在项目根目录的 `logs/` 文件夹中：

### 文件结构
```
logs/
├── frontend.log      # 所有前端日志（主要文件）
├── api_calls.log     # API调用专用日志
└── errors.log        # 错误专用日志
```

### 日志格式
```
[2024-01-15 14:30:25] ERROR api          Gemini API调用失败
  数据: {
    "url": "https://...",
    "status": 400,
    "error": "Invalid API key"
  }
  堆栈: Error: API call failed
    at callGeminiAPI (geminiApi.ts:125)
    at ...
```

## 🔧 API接口

日志同步服务器提供以下REST API接口：

### 基础接口
- `POST /api/dev/sync-logs` - 同步日志数据
- `GET /api/dev/logs/status` - 获取日志文件状态
- `POST /api/dev/logs/clear` - 清除所有日志文件
- `GET /api/dev/logs/tail/<type>?lines=50` - 获取日志文件末尾内容

### 使用示例
```bash
# 查看日志状态
curl http://localhost:3001/api/dev/logs/status

# 获取最近50行错误日志
curl http://localhost:3001/api/dev/logs/tail/errors?lines=50

# 清除所有日志
curl -X POST http://localhost:3001/api/dev/logs/clear
```

## 🛠️ 配置选项

### 环境变量
```bash
# 日志同步服务器端口（默认3001）
LOG_SERVER_PORT=3001

# 最大日志条数（默认1000）
MAX_LOG_ENTRIES=1000

# 日志同步间隔（秒，默认5）
LOG_SYNC_INTERVAL=5
```

### 自定义配置
您可以修改以下文件来自定义日志行为：

- `src/utils/logSync.ts` - 前端日志收集配置
- `dev_log_server.py` - 后端服务配置
- `watch_logs.py` - 监控工具配置

## 🚨 故障排除

### 常见问题

**1. 日志同步服务器启动失败**
```bash
# 检查端口是否被占用
lsof -i :3001

# 安装缺失的Python依赖
pip3 install flask flask-cors watchdog
```

**2. 日志文件没有更新**
```bash
# 检查日志目录权限
ls -la logs/

# 检查服务器状态
curl http://localhost:3001/api/dev/logs/status
```

**3. 前端日志收集不工作**
- 确保在开发环境中运行（`NODE_ENV=development`）
- 检查浏览器控制台是否有错误
- 验证Vite代理配置是否正确

### 调试模式

启用详细调试信息：
```bash
# 启动时显示详细日志
DEBUG=1 python3 dev_log_server.py

# 前端启用详细API日志
# 在浏览器控制台运行：
__DEV_TOOLS__.enableVerboseLogging()
```

## 📝 最佳实践

1. **开发流程**
   - 启动开发环境时总是使用 `./start_dev_with_logs.sh`
   - 在一个终端窗口中持续监控错误日志
   - 定期下载和备份重要的调试日志

2. **性能优化**
   - 在生产环境中禁用日志同步
   - 定期清理旧的日志文件
   - 根据需要调整日志同步间隔

3. **团队协作**
   - 将日志文件添加到 `.gitignore`
   - 分享重要的错误日志截图
   - 使用统一的日志格式和命名规范

## 🔗 相关链接

- [Gemini API文档](https://ai.google.dev/docs)
- [Vite配置指南](https://vitejs.dev/config/)
- [Flask开发文档](https://flask.palletsprojects.com/)
- [Watchdog库文档](https://python-watchdog.readthedocs.io/)

## 📋 快速参考

### 常用命令速查表

| 功能 | 命令 | 说明 |
|------|------|------|
| 一键启动 | `./start_dev_with_logs.sh` | 启动完整开发环境 |
| 监控所有日志 | `python3 watch_logs.py -t all` | 实时查看所有类型日志 |
| 监控错误 | `python3 watch_logs.py -t errors` | 只查看错误日志 |
| 测试API | `testGemini()` | 浏览器控制台测试Gemini连接 |
| 下载日志 | `__LOG_SYNC__.downloadLogs()` | 下载所有日志为文件 |
| 清除日志 | `clearErrors()` | 清除错误记录 |

### 日志级别说明

| 级别 | 颜色 | 用途 |
|------|------|------|
| ERROR | 🔴 红色 | 运行时错误、API失败 |
| WARN | 🟡 黄色 | 警告信息、降级提示 |
| INFO | 🔵 蓝色 | 一般信息、状态更新 |
| DEBUG | ⚪ 灰色 | 调试信息、详细日志 |

### 文件监控状态

- ✅ **正常**: 日志文件正在更新
- ⚠️ **警告**: 日志文件存在但长时间未更新
- ❌ **错误**: 日志文件不存在或无法访问

## 🎯 使用场景示例

### 场景1: 调试Gemini API连接问题

```bash
# 1. 启动日志监控
python3 watch_logs.py -t api

# 2. 在浏览器中测试API
# 打开 http://localhost:5174
# 控制台运行: testGemini()

# 3. 查看详细的API调用日志
# 终端会实时显示API请求和响应信息
```

### 场景2: 排查前端运行时错误

```bash
# 1. 监控错误日志
python3 watch_logs.py -t errors

# 2. 在浏览器中操作应用
# 任何JavaScript错误都会立即显示在终端

# 3. 查看错误详情
# 包含完整的堆栈信息和上下文数据
```

### 场景3: 性能分析和优化

```bash
# 1. 启用详细API日志
# 浏览器控制台: __DEV_TOOLS__.enableVerboseLogging()

# 2. 监控所有日志
python3 watch_logs.py -t all

# 3. 执行操作并观察性能指标
# 查看API响应时间、请求频率等
```

---

**💡 提示**: 如果您在使用过程中遇到问题，请查看 `logs/` 目录中的错误日志，或在浏览器控制台运行 `getErrors()` 查看详细的错误信息。
