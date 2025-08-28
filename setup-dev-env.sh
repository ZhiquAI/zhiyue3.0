#!/bin/bash

# 开发环境设置脚本
# 用于快速配置智阅 AI 项目的开发环境

set -e

echo "🚀 智阅 AI 开发环境设置"
echo "========================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 检查命令是否存在
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 检查操作系统
detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "linux"
    else
        echo "unknown"
    fi
}

OS=$(detect_os)
print_info "检测到操作系统: $OS"

# 检查必要工具
print_info "检查必要工具..."

# 检查 Git
if ! command_exists git; then
    print_error "Git 未安装，请先安装 Git"
    exit 1
fi
print_success "Git 已安装: $(git --version)"

# 检查 Node.js
if ! command_exists node; then
    print_error "Node.js 未安装"
    if [[ "$OS" == "macos" ]]; then
        print_info "建议使用 Homebrew 安装: brew install node"
    elif [[ "$OS" == "linux" ]]; then
        print_info "建议使用包管理器安装或从官网下载: https://nodejs.org/"
    fi
    exit 1
fi

NODE_VERSION=$(node --version)
print_success "Node.js 已安装: $NODE_VERSION"

# 检查 Node.js 版本
NODE_MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
if [ "$NODE_MAJOR_VERSION" -lt 18 ]; then
    print_warning "Node.js 版本过低 ($NODE_VERSION)，建议使用 18.x 或更高版本"
fi

# 检查 npm
if ! command_exists npm; then
    print_error "npm 未安装，请重新安装 Node.js"
    exit 1
fi
print_success "npm 已安装: $(npm --version)"

# 检查 Python
PYTHON_CMD=""
if command_exists python3; then
    PYTHON_CMD="python3"
elif command_exists python; then
    PYTHON_CMD="python"
else
    print_error "Python 未安装"
    if [[ "$OS" == "macos" ]]; then
        print_info "建议使用 Homebrew 安装: brew install python"
    elif [[ "$OS" == "linux" ]]; then
        print_info "建议使用包管理器安装: sudo apt-get install python3 (Ubuntu/Debian)"
    fi
    exit 1
fi

PYTHON_VERSION=$($PYTHON_CMD --version)
print_success "Python 已安装: $PYTHON_VERSION"

# 检查 Python 版本
PYTHON_MAJOR_VERSION=$($PYTHON_CMD -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
if [[ "$PYTHON_MAJOR_VERSION" < "3.9" ]]; then
    print_warning "Python 版本过低 ($PYTHON_VERSION)，建议使用 3.9 或更高版本"
fi

# 检查 pip
if ! command_exists pip && ! command_exists pip3; then
    print_error "pip 未安装，请重新安装 Python"
    exit 1
fi

if command_exists pip3; then
    PIP_CMD="pip3"
else
    PIP_CMD="pip"
fi
print_success "pip 已安装: $($PIP_CMD --version)"

echo ""
print_info "开始设置开发环境..."
echo ""

# 1. 安装前端依赖
print_info "1. 安装前端依赖..."
if [ -f "package.json" ]; then
    npm install
    print_success "前端依赖安装完成"
else
    print_error "package.json 文件不存在"
    exit 1
fi

# 2. 设置后端环境
print_info "2. 设置后端 Python 环境..."
cd backend

# 创建虚拟环境
if [ ! -d "venv" ]; then
    print_info "创建 Python 虚拟环境..."
    $PYTHON_CMD -m venv venv
    print_success "虚拟环境创建完成"
else
    print_info "虚拟环境已存在"
fi

# 激活虚拟环境并安装依赖
print_info "激活虚拟环境并安装依赖..."
source venv/bin/activate

if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt
    print_success "后端依赖安装完成"
else
    print_error "requirements.txt 文件不存在"
    cd ..
    exit 1
fi

# 安装开发依赖
if [ -f "requirements-dev.txt" ]; then
    print_info "安装开发依赖..."
    pip install -r requirements-dev.txt
    print_success "开发依赖安装完成"
fi

cd ..

# 3. 设置环境变量
print_info "3. 设置环境变量..."
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_success "已复制 .env.example 到 .env"
        print_warning "请编辑 .env 文件，配置必要的环境变量"
    else
        print_warning ".env.example 文件不存在，请手动创建 .env 文件"
    fi
else
    print_info ".env 文件已存在"
fi

# 4. 设置 Git hooks
print_info "4. 设置 Git hooks..."
if [ -f "setup-git-hooks.sh" ]; then
    ./setup-git-hooks.sh
    print_success "Git hooks 设置完成"
else
    print_warning "setup-git-hooks.sh 文件不存在，跳过 Git hooks 设置"
fi

# 5. 安装 Playwright 浏览器（用于 E2E 测试）
print_info "5. 安装 Playwright 浏览器..."
if command_exists npx; then
    npx playwright install
    print_success "Playwright 浏览器安装完成"
else
    print_warning "npx 不可用，请手动运行: npx playwright install"
fi

# 6. 运行初始测试
print_info "6. 运行初始测试验证环境..."

# 前端类型检查
print_info "运行前端类型检查..."
if npm run type-check; then
    print_success "前端类型检查通过"
else
    print_warning "前端类型检查失败，请检查代码"
fi

# 前端 lint 检查
print_info "运行前端 lint 检查..."
if npm run lint:check; then
    print_success "前端 lint 检查通过"
else
    print_warning "前端 lint 检查失败，可运行 'npm run lint:fix' 自动修复"
fi

# 后端代码检查
print_info "运行后端代码检查..."
cd backend
source venv/bin/activate

if command_exists flake8; then
    if flake8 .; then
        print_success "后端 flake8 检查通过"
    else
        print_warning "后端 flake8 检查失败，请修复代码质量问题"
    fi
fi

if command_exists black; then
    if black --check .; then
        print_success "后端 black 格式检查通过"
    else
        print_warning "后端代码格式不规范，可运行 'black .' 自动格式化"
    fi
fi

cd ..

echo ""
echo "🎉 开发环境设置完成！"
echo "========================"
echo ""
print_info "下一步操作:"
echo "1. 编辑 .env 文件，配置数据库和其他环境变量"
echo "2. 启动后端服务: cd backend && source venv/bin/activate && python -m uvicorn main:app --reload"
echo "3. 启动前端服务: npm run dev"
echo "4. 运行测试: npm run test"
echo "5. 运行 E2E 测试: npm run test:e2e"
echo ""
print_info "有用的命令:"
echo "- 前端开发: npm run dev"
echo "- 后端开发: cd backend && source venv/bin/activate && python -m uvicorn main:app --reload"
echo "- 运行所有测试: npm run test && cd backend && source venv/bin/activate && pytest"
echo "- 代码格式化: npm run lint:fix && cd backend && source venv/bin/activate && black . && isort ."
echo "- Git hooks 测试: git add . && git commit -m 'test commit' --dry-run"
echo ""
print_success "开发环境已就绪，开始编码吧！🚀"