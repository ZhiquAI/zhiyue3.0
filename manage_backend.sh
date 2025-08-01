#!/bin/bash
# 智阅AI后端服务管理脚本

SERVICE_NAME="zhiyue-backend"
SERVICE_FILE="/Users/hero/zhiyue3.0/zhiyue-backend.service"
SYSTEMD_DIR="/usr/local/lib/systemd/system"
PROJECT_DIR="/Users/hero/zhiyue3.0"
BACKEND_DIR="$PROJECT_DIR/backend"
PID_FILE="$PROJECT_DIR/backend.pid"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查是否为macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo -e "${YELLOW}检测到macOS系统，将使用launchd进行服务管理${NC}"
    USE_LAUNCHD=true
else
    echo -e "${BLUE}检测到Linux系统，将使用systemd进行服务管理${NC}"
    USE_LAUNCHD=false
fi

# 显示帮助信息
show_help() {
    echo "智阅AI后端服务管理脚本"
    echo "用法: $0 [命令]"
    echo ""
    echo "命令:"
    echo "  start     - 启动后端服务"
    echo "  stop      - 停止后端服务"
    echo "  restart   - 重启后端服务"
    echo "  status    - 查看服务状态"
    echo "  logs      - 查看服务日志"
    echo "  install   - 安装服务到系统"
    echo "  uninstall - 从系统卸载服务"
    echo "  dev       - 开发模式启动（前台运行）"
    echo "  help      - 显示此帮助信息"
}

# 检查服务状态
check_status() {
    if [ "$USE_LAUNCHD" = true ]; then
        # macOS launchd
        if launchctl list | grep -q "com.zhiyue.backend"; then
            echo -e "${GREEN}✅ 服务正在运行${NC}"
            return 0
        else
            echo -e "${RED}❌ 服务未运行${NC}"
            return 1
        fi
    else
        # Linux systemd
        if systemctl is-active --quiet "$SERVICE_NAME"; then
            echo -e "${GREEN}✅ 服务正在运行${NC}"
            return 0
        else
            echo -e "${RED}❌ 服务未运行${NC}"
            return 1
        fi
    fi
}

# 启动服务
start_service() {
    echo -e "${BLUE}🚀 启动智阅AI后端服务...${NC}"
    
    if [ "$USE_LAUNCHD" = true ]; then
        # macOS launchd
        if check_status > /dev/null 2>&1; then
            echo -e "${YELLOW}⚠️  服务已在运行${NC}"
            return 0
        fi
        
        # 创建launchd plist文件
        create_launchd_plist
        
        # 加载并启动服务
        launchctl load ~/Library/LaunchAgents/com.zhiyue.backend.plist
        launchctl start com.zhiyue.backend
    else
        # Linux systemd
        sudo systemctl start "$SERVICE_NAME"
    fi
    
    sleep 2
    if check_status > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 服务启动成功${NC}"
        echo -e "${BLUE}📖 API文档: http://localhost:8000/docs${NC}"
    else
        echo -e "${RED}❌ 服务启动失败${NC}"
        return 1
    fi
}

# 停止服务
stop_service() {
    echo -e "${BLUE}🛑 停止智阅AI后端服务...${NC}"
    
    if [ "$USE_LAUNCHD" = true ]; then
        # macOS launchd
        launchctl stop com.zhiyue.backend 2>/dev/null
        launchctl unload ~/Library/LaunchAgents/com.zhiyue.backend.plist 2>/dev/null
    else
        # Linux systemd
        sudo systemctl stop "$SERVICE_NAME"
    fi
    
    # 清理PID文件
    if [ -f "$PID_FILE" ]; then
        rm -f "$PID_FILE"
    fi
    
    echo -e "${GREEN}✅ 服务已停止${NC}"
}

# 重启服务
restart_service() {
    echo -e "${BLUE}🔄 重启智阅AI后端服务...${NC}"
    stop_service
    sleep 2
    start_service
}

# 查看服务状态
show_status() {
    echo -e "${BLUE}📊 智阅AI后端服务状态${NC}"
    echo "================================"
    
    if [ "$USE_LAUNCHD" = true ]; then
        # macOS launchd
        if launchctl list | grep -q "com.zhiyue.backend"; then
            echo -e "${GREEN}✅ 服务状态: 运行中${NC}"
            echo -e "${BLUE}📋 服务详情:${NC}"
            launchctl list | grep "com.zhiyue.backend"
        else
            echo -e "${RED}❌ 服务状态: 未运行${NC}"
        fi
    else
        # Linux systemd
        systemctl status "$SERVICE_NAME" --no-pager
    fi
    
    # 检查端口
    if lsof -i :8000 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 端口8000: 已监听${NC}"
    else
        echo -e "${RED}❌ 端口8000: 未监听${NC}"
    fi
    
    # 检查进程
    if pgrep -f "python.*start.py" > /dev/null; then
        echo -e "${GREEN}✅ 后端进程: 运行中${NC}"
        echo -e "${BLUE}📋 进程信息:${NC}"
        ps aux | grep "python.*start.py" | grep -v grep
    else
        echo -e "${RED}❌ 后端进程: 未运行${NC}"
    fi
}

# 查看日志
show_logs() {
    echo -e "${BLUE}📋 查看服务日志${NC}"
    
    if [ "$USE_LAUNCHD" = true ]; then
        # macOS launchd日志
        echo -e "${YELLOW}系统日志:${NC}"
        log show --predicate 'subsystem == "com.zhiyue.backend"' --last 50
        
        echo -e "\n${YELLOW}应用日志:${NC}"
        if [ -f "$BACKEND_DIR/logs/app.log" ]; then
            tail -f "$BACKEND_DIR/logs/app.log"
        else
            echo "日志文件不存在: $BACKEND_DIR/logs/app.log"
        fi
    else
        # Linux systemd日志
        journalctl -u "$SERVICE_NAME" -f
    fi
}

# 创建macOS launchd plist文件
create_launchd_plist() {
    local plist_file="$HOME/Library/LaunchAgents/com.zhiyue.backend.plist"
    
    # 确保目录存在
    mkdir -p "$HOME/Library/LaunchAgents"
    
    # 检查虚拟环境
    local python_path="/usr/bin/python3"
    if [ -f "$BACKEND_DIR/.venv/bin/python" ]; then
        python_path="$BACKEND_DIR/.venv/bin/python"
        echo -e "${GREEN}✅ 使用虚拟环境Python: $python_path${NC}"
    elif [ -f "$PROJECT_DIR/.venv/bin/python" ]; then
        python_path="$PROJECT_DIR/.venv/bin/python"
        echo -e "${GREEN}✅ 使用项目虚拟环境Python: $python_path${NC}"
    else
        echo -e "${YELLOW}⚠️  使用系统Python，可能缺少依赖包${NC}"
    fi
    
    cat > "$plist_file" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.zhiyue.backend</string>
    <key>ProgramArguments</key>
    <array>
        <string>$python_path</string>
        <string>$PROJECT_DIR/backend/start.py</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$BACKEND_DIR</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PYTHONPATH</key>
        <string>$PROJECT_DIR</string>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin</string>
    </dict>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>$BACKEND_DIR/logs/stdout.log</string>
    <key>StandardErrorPath</key>
    <string>$BACKEND_DIR/logs/stderr.log</string>
</dict>
</plist>
EOF
    
    echo -e "${GREEN}✅ 已创建launchd配置文件: $plist_file${NC}"
}

# 安装服务
install_service() {
    echo -e "${BLUE}📦 安装智阅AI后端服务...${NC}"
    
    # 确保日志目录存在
    mkdir -p "$BACKEND_DIR/logs"
    
    if [ "$USE_LAUNCHD" = true ]; then
        # macOS launchd安装
        create_launchd_plist
        echo -e "${GREEN}✅ 服务已安装到launchd${NC}"
        echo -e "${YELLOW}💡 使用 '$0 start' 启动服务${NC}"
    else
        # Linux systemd安装
        if [ ! -d "$SYSTEMD_DIR" ]; then
            sudo mkdir -p "$SYSTEMD_DIR"
        fi
        
        sudo cp "$SERVICE_FILE" "$SYSTEMD_DIR/"
        sudo systemctl daemon-reload
        sudo systemctl enable "$SERVICE_NAME"
        
        echo -e "${GREEN}✅ 服务已安装到systemd${NC}"
        echo -e "${YELLOW}💡 使用 'sudo systemctl start $SERVICE_NAME' 或 '$0 start' 启动服务${NC}"
    fi
}

# 卸载服务
uninstall_service() {
    echo -e "${BLUE}🗑️  卸载智阅AI后端服务...${NC}"
    
    # 先停止服务
    stop_service
    
    if [ "$USE_LAUNCHD" = true ]; then
        # macOS launchd卸载
        local plist_file="$HOME/Library/LaunchAgents/com.zhiyue.backend.plist"
        if [ -f "$plist_file" ]; then
            rm -f "$plist_file"
            echo -e "${GREEN}✅ 已从launchd卸载服务${NC}"
        else
            echo -e "${YELLOW}⚠️  服务未安装${NC}"
        fi
    else
        # Linux systemd卸载
        sudo systemctl disable "$SERVICE_NAME" 2>/dev/null
        sudo rm -f "$SYSTEMD_DIR/$SERVICE_NAME.service"
        sudo systemctl daemon-reload
        
        echo -e "${GREEN}✅ 已从systemd卸载服务${NC}"
    fi
}

# 开发模式启动
dev_mode() {
    echo -e "${BLUE}🔧 开发模式启动（前台运行）${NC}"
    echo -e "${YELLOW}💡 按 Ctrl+C 停止服务${NC}"
    echo "================================"
    
    cd "$BACKEND_DIR"
    export PYTHONPATH="$PROJECT_DIR"
    python3 start.py
}

# 主程序
case "$1" in
    start)
        start_service
        ;;
    stop)
        stop_service
        ;;
    restart)
        restart_service
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    install)
        install_service
        ;;
    uninstall)
        uninstall_service
        ;;
    dev)
        dev_mode
        ;;
    help|--help|-h)
        show_help
        ;;
    "")
        echo -e "${RED}❌ 请指定命令${NC}"
        echo ""
        show_help
        exit 1
        ;;
    *)
        echo -e "${RED}❌ 未知命令: $1${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac