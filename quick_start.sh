#!/bin/bash
# 智阅AI快速启动脚本

echo "🚀 智阅AI后端服务快速启动"
echo "================================"

# 检查Python版本
python_version=$(python3 -c "import sys; print(sys.version_info.major, sys.version_info.minor)" 2>/dev/null)
if [ $? -ne 0 ]; then
    echo "❌ Python3 未安装或不可用"
    exit 1
fi

echo "✅ Python版本检查通过"

# 创建虚拟环境
if [ ! -d "venv" ]; then
    echo "📦 创建Python虚拟环境..."
    python3 -m venv venv
    echo "✅ 虚拟环境创建完成"
fi

# 激活虚拟环境
echo "🔄 激活虚拟环境..."
source venv/bin/activate

# 安装依赖
echo "📥 安装Python依赖..."
pip install -r backend/requirements.txt

# 创建必要目录
echo "📁 创建必要目录..."
mkdir -p storage/exam_papers
mkdir -p storage/answer_sheets
mkdir -p logs

# 复制环境配置文件
if [ ! -f ".env" ]; then
    echo "⚙️  创建环境配置文件..."
    cp .env.example .env
    echo "✅ 请编辑 .env 文件配置您的设置"
fi

# 检查Gemini API密钥
if grep -q "your-gemini-api-key-here" .env; then
    echo "⚠️  警告: 请在 .env 文件中设置 GEMINI_API_KEY"
    echo "   否则OCR功能将使用模拟数据"
fi

echo ""
echo "🎉 环境准备完成！"
echo ""
echo "启动方式："
echo "1. 开发模式：python backend/start.py"
echo "2. 生产模式：uvicorn backend.main:app --host 0.0.0.0 --port 8000"
echo ""
echo "访问地址："
echo "- API服务: http://localhost:8000"
echo "- API文档: http://localhost:8000/docs"
echo "- 健康检查: http://localhost:8000/health"
echo ""
echo "配置文件："
echo "- 环境变量: .env"
echo "- 存储目录: ./storage/"
echo "- 日志目录: ./logs/"