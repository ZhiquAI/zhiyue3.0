#!/bin/bash
# 启动开发环境并启用日志同步

echo "🚀 启动智阅AI开发环境（带日志同步）"
echo "=================================="

# 检查Python依赖
echo "📦 检查Python依赖..."
if ! python3 -c "import flask, flask_cors, watchdog" 2>/dev/null; then
    echo "⚠️  缺少Python依赖，正在安装..."
    pip3 install flask flask-cors watchdog
fi

# 创建日志目录
mkdir -p logs

# 启动日志同步服务器（后台运行）
echo "🔧 启动日志同步服务器..."
python3 dev_log_server.py &
LOG_SERVER_PID=$!

# 等待服务器启动
sleep 2

# 检查日志服务器是否启动成功
if curl -s http://localhost:3001/api/dev/logs/status > /dev/null; then
    echo "✅ 日志同步服务器启动成功 (PID: $LOG_SERVER_PID)"
else
    echo "❌ 日志同步服务器启动失败"
fi

# 启动前端服务
echo "🌐 启动前端服务..."
bash start_frontend.sh &
FRONTEND_PID=$!

# 启动后端服务
echo "🔧 启动后端服务..."
cd backend && python3 start.py &
BACKEND_PID=$!
cd ..

echo ""
echo "🎉 开发环境启动完成！"
echo "=================================="
echo "📱 前端服务: http://localhost:5174/"
echo "🔧 后端服务: http://localhost:8000/"
echo "🔧 日志服务: http://localhost:3001/"
echo "📁 日志目录: $(pwd)/logs/"
echo ""
echo "📋 可用的日志监控命令："
echo "  python3 watch_logs.py -t frontend    # 监控前端日志"
echo "  python3 watch_logs.py -t api         # 监控API日志"
echo "  python3 watch_logs.py -t errors      # 监控错误日志"
echo "  python3 watch_logs.py -t all         # 监控所有日志"
echo ""
echo "🔍 浏览器控制台命令："
echo "  testGemini()                          # 测试API连接"
echo "  __LOG_SYNC__.downloadLogs()           # 下载日志文件"
echo "  __LOG_SYNC__.clearLogs()              # 清除日志"
echo ""
echo "按 Ctrl+C 停止所有服务"

# 等待用户中断
trap 'echo ""; echo "🛑 正在停止服务..."; kill $LOG_SERVER_PID $FRONTEND_PID $BACKEND_PID 2>/dev/null; exit 0' INT

# 保持脚本运行
wait
