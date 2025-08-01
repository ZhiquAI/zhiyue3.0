# 智阅AI服务持久化指南

## 📋 概述

本指南介绍如何让智阅AI后端服务持久化运行，避免每次都需要手动启动服务。我们提供了多种持久化方案，适用于不同的使用场景。

## 🎯 持久化方案

### 1. 系统服务方案（推荐）

#### macOS (launchd)
```bash
# 安装服务
./manage_backend.sh install

# 启动服务
./manage_backend.sh start

# 查看状态
./manage_backend.sh status

# 停止服务
./manage_backend.sh stop

# 卸载服务
./manage_backend.sh uninstall
```

#### Linux (systemd)
```bash
# 安装服务
sudo ./manage_backend.sh install

# 启动服务
sudo systemctl start zhiyue-backend
# 或使用管理脚本
./manage_backend.sh start

# 设置开机自启
sudo systemctl enable zhiyue-backend

# 查看状态
systemctl status zhiyue-backend
# 或使用管理脚本
./manage_backend.sh status
```

### 2. Docker方案

#### 开发环境
```bash
# 启动开发环境（包含热重载）
docker-compose -f docker-compose.dev.yml up -d

# 查看日志
docker-compose -f docker-compose.dev.yml logs -f

# 停止服务
docker-compose -f docker-compose.dev.yml down
```

#### 生产环境
```bash
# 启动生产环境
docker-compose -f docker-compose.production.yml up -d

# 查看状态
docker-compose -f docker-compose.production.yml ps

# 停止服务
docker-compose -f docker-compose.production.yml down
```

### 3. 快速启动方案

使用交互式启动脚本：
```bash
./quick_start_persistent.sh
```

## 🔧 服务管理

### 管理脚本功能

`manage_backend.sh` 脚本提供了完整的服务管理功能：

```bash
# 查看帮助
./manage_backend.sh help

# 服务控制
./manage_backend.sh start     # 启动服务
./manage_backend.sh stop      # 停止服务
./manage_backend.sh restart   # 重启服务
./manage_backend.sh status    # 查看状态

# 日志管理
./manage_backend.sh logs      # 查看日志

# 服务安装
./manage_backend.sh install   # 安装系统服务
./manage_backend.sh uninstall # 卸载系统服务

# 开发模式
./manage_backend.sh dev       # 前台运行（开发调试）
```

### 服务状态检查

```bash
# 检查端口占用
lsof -i :8000

# 检查进程
ps aux | grep "python.*start.py"

# 检查系统服务状态（macOS）
launchctl list | grep com.zhiyue.backend

# 检查系统服务状态（Linux）
systemctl status zhiyue-backend
```

## 📁 文件结构

```
智阅AI项目/
├── manage_backend.sh              # 服务管理脚本
├── quick_start_persistent.sh      # 快速启动脚本
├── zhiyue-backend.service         # systemd服务配置
├── docker-compose.dev.yml         # Docker开发环境
├── docker-compose.production.yml  # Docker生产环境
├── backend/
│   ├── Dockerfile.dev            # 开发环境Docker配置
│   ├── start.py                  # 服务启动脚本
│   └── ...
└── Dockerfile.frontend.dev       # 前端开发环境Docker配置
```

## 🚀 快速开始

### 第一次使用

1. **克隆项目并进入目录**
   ```bash
   cd /path/to/zhiyue3.0
   ```

2. **使用快速启动脚本**
   ```bash
   ./quick_start_persistent.sh
   ```
   选择 "1. 本地服务启动（推荐）"

3. **访问服务**
   - 前端应用: http://localhost:5173
   - 后端API: http://localhost:8000
   - API文档: http://localhost:8000/docs

### 日常使用

后端服务安装后会自动启动，只需要启动前端：
```bash
# 启动前端开发服务器
npm run dev
# 或
pnpm dev
```

## 🔍 故障排除

### 常见问题

#### 1. 端口被占用
```bash
# 查找占用8000端口的进程
lsof -i :8000

# 杀死进程
kill -9 <PID>
```

#### 2. 权限问题（Linux）
```bash
# 给脚本添加执行权限
chmod +x manage_backend.sh
chmod +x quick_start_persistent.sh

# 使用sudo运行systemd命令
sudo systemctl start zhiyue-backend
```

#### 3. Python环境问题
```bash
# 检查Python版本
python3 --version

# 检查虚拟环境
which python3

# 重新安装依赖
cd backend
pip install -r requirements.txt
```

#### 4. 数据库连接问题
```bash
# 检查数据库文件
ls -la backend/zhiyue_dev.db

# 重新初始化数据库
cd backend
python -m alembic upgrade head
```

### 日志查看

#### 系统服务日志
```bash
# macOS
log show --predicate 'subsystem == "com.zhiyue.backend"' --last 50

# Linux
journalctl -u zhiyue-backend -f

# 使用管理脚本
./manage_backend.sh logs
```

#### 应用日志
```bash
# 查看应用日志
tail -f backend/logs/app.log

# 查看错误日志
tail -f backend/logs/error.log
```

## ⚙️ 配置说明

### 环境变量

创建 `.env` 文件（基于 `.env.example`）：
```bash
cp .env.example .env
```

重要配置项：
```env
# Gemini API配置
GEMINI_API_KEY=your_gemini_api_key

# 数据库配置
DATABASE_URL=sqlite:///./zhiyue_dev.db

# 安全配置
SECRET_KEY=your_secret_key

# 调试模式
DEBUG=true
```

### 服务配置

#### systemd服务配置 (zhiyue-backend.service)
- 自动重启：服务异常退出时自动重启
- 开机自启：系统启动时自动启动服务
- 日志管理：集成系统日志
- 安全限制：限制服务权限

#### launchd配置 (macOS)
- 用户级服务：在用户登录时启动
- 自动重启：进程退出时自动重启
- 环境变量：设置必要的环境变量
- 日志重定向：输出到指定日志文件

## 🔄 更新和维护

### 更新代码
```bash
# 拉取最新代码
git pull origin main

# 重启服务
./manage_backend.sh restart

# 或重新构建Docker镜像
docker-compose -f docker-compose.dev.yml build
docker-compose -f docker-compose.dev.yml up -d
```

### 备份数据
```bash
# 备份数据库
cp backend/zhiyue_dev.db backup/zhiyue_dev_$(date +%Y%m%d).db

# 备份存储文件
tar -czf backup/storage_$(date +%Y%m%d).tar.gz storage/
```

### 清理日志
```bash
# 清理应用日志
find backend/logs -name "*.log" -mtime +7 -delete

# 清理系统日志（Linux）
sudo journalctl --vacuum-time=7d
```

## 📊 监控和性能

### 性能监控
```bash
# 查看系统资源使用
top -p $(pgrep -f "python.*start.py")

# 查看内存使用
ps aux | grep "python.*start.py" | awk '{print $4, $6}'

# 查看网络连接
netstat -tulpn | grep :8000
```

### 健康检查
```bash
# API健康检查
curl -f http://localhost:8000/health

# 服务状态检查
./manage_backend.sh status
```

## 🔐 安全建议

1. **生产环境配置**
   - 修改默认密钥
   - 禁用调试模式
   - 配置HTTPS
   - 设置防火墙规则

2. **文件权限**
   ```bash
   # 设置适当的文件权限
   chmod 600 .env
   chmod 755 manage_backend.sh
   chmod 644 zhiyue-backend.service
   ```

3. **日志安全**
   - 定期清理日志文件
   - 避免在日志中记录敏感信息
   - 设置日志文件权限

## 📞 技术支持

如果遇到问题，请按以下步骤排查：

1. 查看服务状态：`./manage_backend.sh status`
2. 查看日志：`./manage_backend.sh logs`
3. 检查配置文件：确认 `.env` 文件配置正确
4. 重启服务：`./manage_backend.sh restart`
5. 如问题持续，请提供详细的错误日志

---

**注意**: 本指南适用于开发和测试环境。生产环境部署请参考 `docker-compose.production.yml` 配置，并确保做好安全加固。