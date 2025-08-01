#!/bin/bash

# 测试后端服务持久性脚本
# 用于验证服务在重启后是否自动启动

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 智阅AI后端服务持久性测试${NC}"
echo "================================"

# 测试API响应
echo -e "${YELLOW}📡 测试API响应...${NC}"
if curl -s -f http://localhost:8000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API响应正常${NC}"
else
    echo -e "${RED}❌ API无响应，尝试访问docs页面...${NC}"
    if curl -s -f http://localhost:8000/docs > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Docs页面可访问${NC}"
    else
        echo -e "${RED}❌ 服务无响应${NC}"
        exit 1
    fi
fi

# 检查进程
echo -e "${YELLOW}🔍 检查后端进程...${NC}"
if pgrep -f "start.py" > /dev/null; then
    echo -e "${GREEN}✅ 后端进程运行中${NC}"
    echo "进程信息:"
    ps aux | grep 'start.py' | grep -v grep | head -1
else
    echo -e "${RED}❌ 后端进程未找到${NC}"
fi

# 检查端口监听
echo -e "${YELLOW}🔌 检查端口监听...${NC}"
if lsof -i :8000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 端口8000已监听${NC}"
    lsof -i :8000
else
    echo -e "${RED}❌ 端口8000未监听${NC}"
fi

# 检查launchd服务状态
echo -e "${YELLOW}⚙️  检查launchd服务状态...${NC}"
if launchctl list | grep com.zhiyue.backend > /dev/null; then
    echo -e "${GREEN}✅ launchd服务已注册${NC}"
    launchctl list | grep com.zhiyue.backend
else
    echo -e "${RED}❌ launchd服务未注册${NC}"
fi

echo ""
echo -e "${BLUE}📋 持久性验证完成${NC}"
echo -e "${GREEN}💡 提示: 重启系统后，服务应该自动启动${NC}"
echo -e "${GREEN}💡 使用 './manage_backend.sh status' 检查服务状态${NC}"
echo -e "${GREEN}💡 使用 './manage_backend.sh logs' 查看服务日志${NC}"