#!/bin/bash
# 智阅AI持久化服务快速启动脚本

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 项目目录
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"

echo -e "${CYAN}🚀 智阅AI持久化服务启动器${NC}"
echo "===================================="
echo -e "${BLUE}项目目录: $PROJECT_DIR${NC}"
echo ""

# 检查环境
check_environment() {
    echo -e "${BLUE}🔍 检查运行环境...${NC}"
    
    # 检查Python
    if ! command -v python3 &> /dev/null; then
        echo -e "${RED}❌ Python3 未安装${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Python3: $(python3 --version)${NC}"
    
    # 检查Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js 未安装${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Node.js: $(node --version)${NC}"
    
    # 检查Docker（可选）
    if command -v docker &> /dev/null; then
        echo -e "${GREEN}✅ Docker: $(docker --version | cut -d' ' -f3 | cut -d',' -f1)${NC}"
        DOCKER_AVAILABLE=true
    else
        echo -e "${YELLOW}⚠️  Docker 未安装（可选）${NC}"
        DOCKER_AVAILABLE=false
    fi
    
    echo ""
}

# 显示启动选项
show_options() {
    echo -e "${PURPLE}📋 请选择启动方式:${NC}"
    echo "1. 🖥️  本地服务启动（推荐）"
    echo "2. 🐳 Docker开发环境启动"
    echo "3. 🔧 仅启动后端服务"
    echo "4. 🌐 仅启动前端服务"
    echo "5. 📊 查看服务状态"
    echo "6. 🛑 停止所有服务"
    echo "7. 📖 查看帮助文档"
    echo "0. ❌ 退出"
    echo ""
    read -p "请输入选项 (0-7): " choice
}

# 本地服务启动
start_local_services() {
    echo -e "${BLUE}🖥️  启动本地服务...${NC}"
    
    # 检查并安装后端依赖
    if [ ! -f "$BACKEND_DIR/.venv/bin/activate" ]; then
        echo -e "${YELLOW}📦 创建Python虚拟环境...${NC}"
        cd "$BACKEND_DIR"
        python3 -m venv .venv
        source .venv/bin/activate
        pip install -r requirements.txt
        cd "$PROJECT_DIR"
    fi
    
    # 检查并安装前端依赖
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}📦 安装前端依赖...${NC}"
        if command -v pnpm &> /dev/null; then
            pnpm install
        else
            npm install
        fi
    fi
    
    # 启动后端服务（持久化）
    echo -e "${BLUE}🚀 启动后端服务...${NC}"
    ./manage_backend.sh install
    ./manage_backend.sh start
    
    # 等待后端启动
    echo -e "${YELLOW}⏳ 等待后端服务启动...${NC}"
    sleep 5
    
    # 启动前端服务
    echo -e "${BLUE}🌐 启动前端服务...${NC}"
    if command -v pnpm &> /dev/null; then
        pnpm dev &
    else
        npm run dev &
    fi
    
    FRONTEND_PID=$!
    echo $FRONTEND_PID > frontend.pid
    
    echo -e "${GREEN}✅ 服务启动完成！${NC}"
    echo -e "${CYAN}🔗 访问地址:${NC}"
    echo -e "  • 前端应用: ${BLUE}http://localhost:5173${NC}"
    echo -e "  • 后端API: ${BLUE}http://localhost:8000${NC}"
    echo -e "  • API文档: ${BLUE}http://localhost:8000/docs${NC}"
    echo ""
    echo -e "${YELLOW}💡 提示: 后端服务已持久化，重启电脑后会自动启动${NC}"
    echo -e "${YELLOW}💡 使用 './manage_backend.sh status' 查看后端状态${NC}"
    echo -e "${YELLOW}💡 按 Ctrl+C 停止前端服务${NC}"
    
    # 等待前端进程
    wait $FRONTEND_PID
}

# Docker环境启动
start_docker_services() {
    if [ "$DOCKER_AVAILABLE" != true ]; then
        echo -e "${RED}❌ Docker 未安装，无法使用此选项${NC}"
        return 1
    fi
    
    echo -e "${BLUE}🐳 启动Docker开发环境...${NC}"
    
    # 检查.env文件
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            echo -e "${YELLOW}📝 复制环境配置文件...${NC}"
            cp .env.example .env
            echo -e "${YELLOW}⚠️  请编辑 .env 文件设置必要的环境变量${NC}"
        fi
    fi
    
    # 启动Docker服务
    docker-compose -f docker-compose.dev.yml up -d
    
    echo -e "${GREEN}✅ Docker服务启动完成！${NC}"
    echo -e "${CYAN}🔗 访问地址:${NC}"
    echo -e "  • 前端应用: ${BLUE}http://localhost:5173${NC}"
    echo -e "  • 后端API: ${BLUE}http://localhost:8000${NC}"
    echo -e "  • API文档: ${BLUE}http://localhost:8000/docs${NC}"
    echo -e "  • 数据库管理: ${BLUE}http://localhost:8080${NC}"
    echo -e "  • Redis管理: ${BLUE}http://localhost:8081${NC}"
    echo ""
    echo -e "${YELLOW}💡 使用 'docker-compose -f docker-compose.dev.yml logs -f' 查看日志${NC}"
    echo -e "${YELLOW}💡 使用 'docker-compose -f docker-compose.dev.yml down' 停止服务${NC}"
}

# 仅启动后端
start_backend_only() {
    echo -e "${BLUE}🔧 仅启动后端服务...${NC}"
    ./manage_backend.sh install
    ./manage_backend.sh start
    ./manage_backend.sh status
}

# 仅启动前端
start_frontend_only() {
    echo -e "${BLUE}🌐 仅启动前端服务...${NC}"
    
    # 检查依赖
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}📦 安装前端依赖...${NC}"
        if command -v pnpm &> /dev/null; then
            pnpm install
        else
            npm install
        fi
    fi
    
    # 启动前端
    if command -v pnpm &> /dev/null; then
        pnpm dev
    else
        npm run dev
    fi
}

# 查看服务状态
show_service_status() {
    echo -e "${BLUE}📊 服务状态检查${NC}"
    echo "===================================="
    
    # 后端状态
    echo -e "${PURPLE}🔧 后端服务状态:${NC}"
    ./manage_backend.sh status
    echo ""
    
    # 前端状态
    echo -e "${PURPLE}🌐 前端服务状态:${NC}"
    if [ -f "frontend.pid" ]; then
        PID=$(cat frontend.pid)
        if ps -p $PID > /dev/null 2>&1; then
            echo -e "${GREEN}✅ 前端服务运行中 (PID: $PID)${NC}"
        else
            echo -e "${RED}❌ 前端服务未运行${NC}"
            rm -f frontend.pid
        fi
    else
        echo -e "${RED}❌ 前端服务未运行${NC}"
    fi
    
    # Docker状态
    if [ "$DOCKER_AVAILABLE" = true ]; then
        echo ""
        echo -e "${PURPLE}🐳 Docker服务状态:${NC}"
        if docker-compose -f docker-compose.dev.yml ps | grep -q "Up"; then
            docker-compose -f docker-compose.dev.yml ps
        else
            echo -e "${RED}❌ Docker服务未运行${NC}"
        fi
    fi
}

# 停止所有服务
stop_all_services() {
    echo -e "${BLUE}🛑 停止所有服务...${NC}"
    
    # 停止后端服务
    echo -e "${YELLOW}停止后端服务...${NC}"
    ./manage_backend.sh stop
    
    # 停止前端服务
    if [ -f "frontend.pid" ]; then
        PID=$(cat frontend.pid)
        if ps -p $PID > /dev/null 2>&1; then
            echo -e "${YELLOW}停止前端服务...${NC}"
            kill $PID
        fi
        rm -f frontend.pid
    fi
    
    # 停止Docker服务
    if [ "$DOCKER_AVAILABLE" = true ]; then
        echo -e "${YELLOW}停止Docker服务...${NC}"
        docker-compose -f docker-compose.dev.yml down
    fi
    
    echo -e "${GREEN}✅ 所有服务已停止${NC}"
}

# 显示帮助文档
show_help() {
    echo -e "${CYAN}📖 智阅AI持久化服务帮助文档${NC}"
    echo "===================================="
    echo ""
    echo -e "${PURPLE}🎯 项目简介:${NC}"
    echo "智阅AI是一个智能阅卷系统，支持多种题型的自动批改和分析。"
    echo ""
    echo -e "${PURPLE}🚀 快速启动:${NC}"
    echo "1. 推荐使用'本地服务启动'，后端会持久化运行"
    echo "2. 首次运行会自动安装依赖"
    echo "3. 后端服务安装后会开机自启"
    echo ""
    echo -e "${PURPLE}🔧 服务管理:${NC}"
    echo "• 后端管理: ./manage_backend.sh [start|stop|restart|status]"
    echo "• 查看日志: ./manage_backend.sh logs"
    echo "• 开发模式: ./manage_backend.sh dev"
    echo ""
    echo -e "${PURPLE}🐳 Docker使用:${NC}"
    echo "• 启动: docker-compose -f docker-compose.dev.yml up -d"
    echo "• 停止: docker-compose -f docker-compose.dev.yml down"
    echo "• 日志: docker-compose -f docker-compose.dev.yml logs -f"
    echo ""
    echo -e "${PURPLE}📁 重要目录:${NC}"
    echo "• 后端代码: ./backend/"
    echo "• 前端代码: ./src/"
    echo "• 存储目录: ./storage/"
    echo "• 日志目录: ./logs/"
    echo ""
    echo -e "${PURPLE}🔗 访问地址:${NC}"
    echo "• 前端应用: http://localhost:5173"
    echo "• 后端API: http://localhost:8000"
    echo "• API文档: http://localhost:8000/docs"
    echo ""
    echo -e "${YELLOW}💡 提示: 按任意键返回主菜单${NC}"
    read -n 1
}

# 主程序
main() {
    check_environment
    
    while true; do
        show_options
        
        case $choice in
            1)
                start_local_services
                ;;
            2)
                start_docker_services
                ;;
            3)
                start_backend_only
                ;;
            4)
                start_frontend_only
                ;;
            5)
                show_service_status
                echo ""
                echo -e "${YELLOW}按任意键继续...${NC}"
                read -n 1
                ;;
            6)
                stop_all_services
                echo ""
                echo -e "${YELLOW}按任意键继续...${NC}"
                read -n 1
                ;;
            7)
                show_help
                ;;
            0)
                echo -e "${GREEN}👋 再见！${NC}"
                exit 0
                ;;
            *)
                echo -e "${RED}❌ 无效选项，请重新选择${NC}"
                sleep 1
                ;;
        esac
        
        echo ""
    done
}

# 运行主程序
main