#!/bin/bash
# 智阅AI前端启动脚本

echo "🚀 启动智阅AI前端服务..."

# 切换到项目目录
cd "$(dirname "$0")"

# 检查是否安装了依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装前端依赖..."
    npm install
fi

# 检查环境配置
if [ ! -f ".env" ]; then
    echo "⚙️  创建环境配置文件..."
    cat > .env << EOF
# 智阅AI前端环境配置
VITE_API_BASE_URL=http://localhost:8001
VITE_APP_NAME=智阅AI
VITE_APP_VERSION=1.0.0

# 开发模式配置
VITE_NODE_ENV=development
VITE_API_TIMEOUT=30000

# 文件上传配置
VITE_MAX_FILE_SIZE=52428800
VITE_ALLOWED_FILE_TYPES=.pdf,.jpg,.jpeg,.png,.tiff,.tif

# WebSocket配置已移除
# VITE_WS_URL=ws://localhost:8001
EOF
fi

echo "✅ 环境配置完成"
echo ""
echo "🌐 前端服务信息："
echo "- 访问地址: http://localhost:5173"
echo "- API后端: http://localhost:8001"
echo "- 开发工具: 按 o + Enter 自动打开浏览器"
echo ""

# 启动开发服务器
echo "🎯 启动开发服务器..."
npm run dev