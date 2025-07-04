# 智阅AI 快速开始指南

## 🚀 5分钟快速上手

### 1. 启动开发环境

```bash
# 一键启动（推荐）
./start_dev_with_logs.sh
```

### 2. 打开浏览器

访问: http://localhost:5174/

### 3. 开始监控日志

在新的终端窗口中运行：

```bash
# 监控所有日志
python3 watch_logs.py -t all
```

### 4. 测试AI服务

在浏览器控制台（F12）中运行：

```javascript
testGemini()
```

## 📊 实时查看结果

现在您可以在Cursor终端中实时看到：
- ✅ API调用成功/失败状态
- 🔍 详细的错误信息和堆栈
- 📱 前端运行时日志
- ⚡ 性能和响应时间数据

## 🛠️ 常用调试命令

### 浏览器控制台
```javascript
testGemini()                    // 测试API连接
getErrors()                     // 查看错误列表
__LOG_SYNC__.downloadLogs()     // 下载日志文件
```

### 终端命令
```bash
python3 watch_logs.py -t errors    // 只看错误
python3 watch_logs.py -t api       // 只看API调用
```

## 📁 日志文件位置

- `logs/frontend.log` - 所有前端日志
- `logs/errors.log` - 错误专用日志
- `logs/api_calls.log` - API调用日志

## 🆘 遇到问题？

1. **服务启动失败**: 检查端口3001和5174是否被占用
2. **日志不更新**: 确保在开发环境中运行
3. **API连接失败**: 检查Gemini API密钥配置

详细文档: [LOG_SYNC_GUIDE.md](./LOG_SYNC_GUIDE.md)

---

**🎯 目标**: 让您在Cursor中实时看到浏览器中发生的一切！
