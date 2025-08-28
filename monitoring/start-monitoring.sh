#!/bin/bash

# 智阅3.0监控系统启动脚本
# 包含Prometheus, Grafana, AlertManager等组件

set -e

echo "🚀 启动智阅3.0监控系统..."

# 检查Docker是否运行
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker未运行，请先启动Docker"
    exit 1
fi

# 创建必要的目录
echo "📁 创建监控目录结构..."
mkdir -p prometheus/rules
mkdir -p grafana/dashboards/{business,technical,infrastructure}
mkdir -p alertmanager
mkdir -p logs

# 设置权限
chmod 755 prometheus/rules
chmod 755 grafana/dashboards

# 检查配置文件
echo "🔍 检查配置文件..."
REQUIRED_FILES=(
    "docker-compose.yml"
    "prometheus/prometheus.yml"
    "prometheus/rules/zhiyue_alerts.yml"
    "alertmanager/alertmanager.yml"
    "grafana/provisioning/datasources/prometheus.yml"
    "grafana/provisioning/dashboards/default.yml"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [[ ! -f "$file" ]]; then
        echo "❌ 缺少配置文件: $file"
        exit 1
    fi
done

echo "✅ 配置文件检查完成"

# 停止现有容器（如果存在）
echo "🔄 停止现有监控容器..."
docker-compose down --remove-orphans || true

# 拉取最新镜像
echo "📦 拉取最新监控镜像..."
docker-compose pull

# 启动监控服务
echo "🚀 启动监控服务..."
docker-compose up -d

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 10

# 检查服务状态
echo "🔍 检查服务状态..."
SERVICES=(
    "zhiyue-prometheus:9090"
    "zhiyue-grafana:3000"
    "zhiyue-alertmanager:9093"
    "zhiyue-node-exporter:9100"
)

for service in "${SERVICES[@]}"; do
    container_name="${service%:*}"
    port="${service#*:}"
    
    if docker ps | grep -q "$container_name"; then
        echo "✅ $container_name 运行正常"
    else
        echo "❌ $container_name 启动失败"
        docker logs "$container_name" --tail 20
    fi
done

# 检查端口连通性
echo "🌐 检查服务端口..."
check_port() {
    local port=$1
    local service=$2
    if nc -z localhost "$port" 2>/dev/null; then
        echo "✅ $service ($port) 可访问"
    else
        echo "❌ $service ($port) 不可访问"
    fi
}

check_port 9090 "Prometheus"
check_port 3001 "Grafana"
check_port 9093 "AlertManager"
check_port 9100 "Node Exporter"

# 显示访问信息
echo ""
echo "🎉 智阅3.0监控系统启动完成！"
echo ""
echo "📊 访问地址:"
echo "  • Prometheus:    http://localhost:9090"
echo "  • Grafana:       http://localhost:3001 (admin/zhiyue2024)"
echo "  • AlertManager:  http://localhost:9093"
echo "  • Node Exporter: http://localhost:9100"
echo ""
echo "📖 使用说明:"
echo "  1. 打开Grafana导入仪表盘模板"
echo "  2. 配置告警通知渠道"
echo "  3. 检查Prometheus targets状态"
echo ""
echo "🔧 管理命令:"
echo "  • 查看日志: docker-compose logs -f [service]"
echo "  • 停止服务: docker-compose down"
echo "  • 重启服务: docker-compose restart [service]"
echo ""

# 显示容器状态
echo "📋 容器状态:"
docker-compose ps

echo ""
echo "✨ 监控系统已就绪，开始监控智阅3.0系统性能！"