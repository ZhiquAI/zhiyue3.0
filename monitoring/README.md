# 智阅3.0监控系统

基于Prometheus + Grafana + AlertManager的全面监控解决方案，为智阅3.0 AI阅卷系统提供实时性能监控、告警和可视化分析。

## 📊 监控架构

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   智阅3.0应用    │────│   Prometheus     │────│    Grafana      │
│                 │    │  (指标收集)      │    │   (可视化)      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         │              ┌──────────────────┐              │
         │              │  AlertManager    │              │
         └──────────────│   (告警管理)     │──────────────┘
                        └──────────────────┘
                                 │
                        ┌──────────────────┐
                        │   通知渠道       │
                        │ (邮件/钉钉/微信) │
                        └──────────────────┘
```

## 🚀 快速启动

### 1. 环境要求
- Docker >= 20.0
- Docker Compose >= 2.0
- 可用端口: 9090, 3001, 9093, 9100, 9121, 9187

### 2. 启动监控系统
```bash
cd monitoring
./start-monitoring.sh
```

### 3. 访问监控界面
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/zhiyue2024)
- **AlertManager**: http://localhost:9093

## 📈 监控指标

### 业务指标
- 考试创建成功率/失败率
- AI评分准确率和一致性
- 用户投诉数量和类型
- 活跃用户数量

### 技术指标
- API响应时间和吞吐量
- 数据库连接数和查询性能
- WebSocket连接状态和消息处理
- 系统错误率和异常

### 基础设施指标
- CPU、内存、磁盘使用率
- 网络延迟和带宽
- 服务可用性和健康状态

### WebSocket专用指标
- 连接池利用率
- 消息队列大小
- 平均响应时间
- 断线重连次数

## 🔔 告警规则

### 严重告警 (Critical)
- AI评分准确率 < 90%
- 数据库连接数 > 80%
- 系统错误率 > 1%
- 内存使用率 > 85%
- 磁盘使用率 > 90%

### 警告告警 (Warning)
- 考试创建失败率 > 5%
- API响应时间 > 2秒
- WebSocket断连率 > 10%
- CPU使用率 > 80%

### 信息告警 (Info)
- 用户投诉数量激增
- 新版本部署通知
- 定期维护提醒

## 📊 Grafana仪表盘

### 业务监控面板
- **考试管理**: 考试创建趋势、成功率统计
- **阅卷质量**: AI评分准确率、一致性分析
- **用户活跃**: 在线用户数、操作热力图
- **投诉分析**: 投诉类型分布、处理时效

### 技术监控面板
- **API性能**: 请求量、响应时间、错误率
- **数据库**: 连接池、查询性能、慢查询
- **WebSocket**: 连接状态、消息流量、性能指标
- **缓存**: 命中率、内存使用、清理频率

### 基础设施面板
- **系统资源**: CPU、内存、磁盘、网络
- **服务健康**: 可用性、延迟、错误
- **容器监控**: Docker容器状态和资源

### 告警管理面板
- **告警概览**: 当前告警状态、处理进度
- **告警历史**: 历史趋势、频率分析
- **通知统计**: 发送成功率、响应时间

## 🔧 配置说明

### Prometheus配置
```yaml
# prometheus/prometheus.yml
global:
  scrape_interval: 15s  # 全局抓取间隔
  evaluation_interval: 15s  # 规则评估间隔

scrape_configs:
  - job_name: 'zhiyue-backend'
    static_configs:
      - targets: ['host.docker.internal:8000']
    scrape_interval: 5s  # 高频抓取业务指标
```

### 告警规则
```yaml
# prometheus/rules/zhiyue_alerts.yml
- alert: APIResponseTimeHigh
  expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
  for: 3m
  labels:
    severity: warning
  annotations:
    summary: "API响应时间过长"
```

### AlertManager配置
```yaml
# alertmanager/alertmanager.yml
route:
  group_by: ['alertname', 'service']
  group_wait: 10s
  repeat_interval: 1h
  receiver: 'web.hook'
```

## 📱 告警通知

### 邮件通知
配置SMTP服务器信息到`alertmanager/alertmanager.yml`:
```yaml
global:
  smtp_smarthost: 'smtp.gmail.com:587'
  smtp_from: 'alerts@zhiyue-ai.com'
```

### 钉钉通知
使用Webhook集成钉钉群机器人:
```yaml
receivers:
  - name: 'dingtalk'
    webhook_configs:
      - url: 'https://oapi.dingtalk.com/robot/send?access_token=xxx'
```

### 微信通知
集成企业微信机器人:
```yaml
receivers:
  - name: 'wechat'
    webhook_configs:
      - url: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx'
```

## 🔍 故障排查

### 常见问题

1. **Prometheus无法抓取指标**
   - 检查智阅3.0后端`/metrics`端点是否可访问
   - 确认网络连通性: `curl http://localhost:8000/metrics`

2. **Grafana无法连接Prometheus**
   - 检查数据源配置: `http://prometheus:9090`
   - 确认容器网络通信正常

3. **告警不生效**
   - 检查告警规则语法: Prometheus Web UI -> Alerts
   - 确认AlertManager配置正确

4. **邮件通知不发送**
   - 检查SMTP配置和认证信息
   - 查看AlertManager日志: `docker logs zhiyue-alertmanager`

### 日志查看
```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f prometheus
docker-compose logs -f grafana
docker-compose logs -f alertmanager
```

### 性能调优

1. **Prometheus存储优化**
   - 调整retention时间: `--storage.tsdb.retention.time=15d`
   - 配置远程存储: VictoriaMetrics或Thanos

2. **抓取频率优化**
   - 业务关键指标: 5s间隔
   - 系统资源指标: 15s间隔
   - 历史数据指标: 60s间隔

3. **告警规则优化**
   - 设置合理的`for`持续时间避免误报
   - 使用`group_by`减少告警风暴
   - 配置告警抑制规则

## 🛠️ 维护操作

### 备份配置
```bash
# 备份Grafana仪表盘
docker exec zhiyue-grafana grafana-cli admin export-dashboard

# 备份Prometheus数据
docker run --rm -v prometheus_data:/data -v $(pwd):/backup alpine \
  tar czf /backup/prometheus-backup.tar.gz /data
```

### 更新服务
```bash
# 更新监控服务
docker-compose pull
docker-compose up -d

# 滚动更新（无停机）
docker-compose up -d --no-deps prometheus
```

### 清理数据
```bash
# 清理旧数据
docker-compose down
docker volume rm monitoring_prometheus_data
docker-compose up -d
```

## 📚 参考资料

- [Prometheus官方文档](https://prometheus.io/docs/)
- [Grafana用户指南](https://grafana.com/docs/)
- [AlertManager配置手册](https://prometheus.io/docs/alerting/latest/alertmanager/)
- [智阅3.0 API文档](http://localhost:8000/docs)