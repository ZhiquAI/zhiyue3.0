#!/bin/bash

# Git Hooks 安装脚本
# 用于配置项目的 Git hooks

set -e

echo "🔧 设置 Git Hooks..."

# 检查是否在 Git 仓库中
if [ ! -d ".git" ]; then
    echo "❌ 错误: 当前目录不是 Git 仓库"
    exit 1
fi

# 检查 .githooks 目录是否存在
if [ ! -d ".githooks" ]; then
    echo "❌ 错误: .githooks 目录不存在"
    exit 1
fi

# 配置 Git hooks 路径
echo "📁 配置 Git hooks 路径..."
git config core.hooksPath .githooks

# 确保 hooks 文件有执行权限
echo "🔐 设置执行权限..."
chmod +x .githooks/*

# 检查必要的工具是否安装
echo "🔍 检查必要工具..."

# 检查 Node.js 和 npm
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm 未安装，请先安装 npm"
    exit 1
fi

# 检查 Python
if ! command -v python &> /dev/null && ! command -v python3 &> /dev/null; then
    echo "❌ Python 未安装，请先安装 Python"
    exit 1
fi

# 安装前端依赖（如果需要）
if [ -f "package.json" ] && [ ! -d "node_modules" ]; then
    echo "📦 安装前端依赖..."
    npm install
fi

# 检查后端依赖
if [ -f "backend/requirements.txt" ]; then
    echo "🐍 检查后端环境..."
    
    # 检查是否有虚拟环境
    if [ ! -d "backend/venv" ] && [ ! -d "backend/.venv" ]; then
        echo "⚠️ 警告: 未检测到 Python 虚拟环境"
        echo "💡 建议创建虚拟环境:"
        echo "   cd backend && python -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
    fi
fi

# 创建 .git/hooks 目录的备份（如果存在旧的 hooks）
if [ -d ".git/hooks" ] && [ "$(ls -A .git/hooks)" ]; then
    echo "💾 备份现有的 Git hooks..."
    timestamp=$(date +"%Y%m%d_%H%M%S")
    mv .git/hooks .git/hooks_backup_$timestamp
    echo "✅ 备份保存到: .git/hooks_backup_$timestamp"
fi

echo ""
echo "🎉 Git Hooks 设置完成！"
echo ""
echo "📋 已配置的 hooks:"
ls -la .githooks/
echo ""
echo "🔍 验证配置:"
git config core.hooksPath
echo ""
echo "💡 使用说明:"
echo "  - pre-commit hook 会在每次提交前自动运行代码检查"
echo "  - 如果检查失败，提交会被阻止"
echo "  - 可以使用 'git commit --no-verify' 跳过检查（不推荐）"
echo ""
echo "🚀 现在可以正常使用 Git 提交，hooks 会自动运行！"