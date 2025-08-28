# 智阅3.0团队重构技术培训实战练习

## 练习项目概览

本目录包含智阅3.0团队重构技术培训的所有实战练习项目，每个练习都对应培训计划中的具体技术主题。

## 练习项目列表

### 第一周基础技术栈练习

#### 1. React 18 + TypeScript Todo应用 (Day 1)
**目录**: `01-react18-todo-app/`  
**技术栈**: React 18, TypeScript, Vite, Ant Design  
**学习目标**:
- 掌握React 18新特性的使用
- 理解TypeScript类型系统
- 学习现代前端工程化配置

**核心功能要求**:
- ✅ 任务的增删改查(CRUD)
- ✅ 任务状态切换(完成/未完成)
- ✅ 任务优先级设置
- ✅ 任务分类筛选
- ✅ 本地存储持久化
- ✅ 响应式设计适配

**技术要点**:
- 使用React 18的Concurrent Features
- TypeScript接口定义与泛型应用
- 自定义Hook封装
- Context API状态管理
- useTransition性能优化

#### 2. FastAPI用户管理API (Day 2)
**目录**: `02-fastapi-user-management/`  
**技术栈**: FastAPI, SQLAlchemy, PostgreSQL, Redis  
**学习目标**:
- 掌握FastAPI框架核心概念
- 理解异步编程模型
- 学习API设计最佳实践

**核心功能要求**:
- ✅ 用户注册与登录
- ✅ JWT令牌认证
- ✅ 用户信息管理(CRUD)
- ✅ 角色权限控制
- ✅ 密码加密存储
- ✅ API文档自动生成

**技术要点**:
- 异步数据库操作
- 依赖注入系统使用
- 请求验证与响应序列化
- 中间件开发
- 统一错误处理

#### 3. 实时聊天应用 (Day 3)
**目录**: `03-websocket-chat-app/`  
**技术栈**: FastAPI WebSocket, React, Socket状态管理  
**学习目标**:
- 掌握WebSocket实时通信
- 理解前后端WebSocket集成
- 学习连接池管理技术

**核心功能要求**:
- ✅ 多用户实时聊天
- ✅ 在线用户列表
- ✅ 消息历史记录
- ✅ 消息类型支持(文本/图片)
- ✅ 断线重连机制
- ✅ 消息未读提醒

**技术要点**:
- WebSocket连接管理
- 消息广播机制
- 前端实时状态更新
- 心跳检测机制
- 异常处理与重连

#### 4. 数据库性能监控仪表板 (Day 4)
**目录**: `04-database-performance-dashboard/`  
**技术栈**: FastAPI, PostgreSQL, SQLAlchemy, Ant Design Charts  
**学习目标**:
- 掌握数据库性能分析技术
- 理解索引优化策略
- 学习监控系统设计

**核心功能要求**:
- ✅ 慢查询实时监控
- ✅ 数据库连接池状态
- ✅ 索引使用情况分析
- ✅ 查询性能统计图表
- ✅ 自动优化建议
- ✅ 性能告警通知

**技术要点**:
- 性能数据采集
- 实时数据可视化
- 查询执行计划分析
- 索引覆盖率计算
- 异步性能监控

#### 5. 代码质量检查工具 (Day 5)
**目录**: `05-code-quality-checker/`  
**技术栈**: Node.js, ESLint, Prettier, SonarQube  
**学习目标**:
- 掌握代码质量管理
- 理解自动化代码检查
- 学习CI/CD集成

**核心功能要求**:
- ✅ 代码风格检查
- ✅ 类型错误检测
- ✅ 代码复杂度分析
- ✅ 测试覆盖率统计
- ✅ 代码重复度检测
- ✅ 安全漏洞扫描

### 第二周高级技术练习

#### 6. Redux状态管理重构 (Day 6)
**目录**: `06-redux-state-management/`  
**技术栈**: Redux Toolkit, React Query, Immer  
**学习目标**:
- 掌握现代状态管理方案
- 理解数据获取最佳实践
- 学习状态持久化技术

#### 7. 微服务架构demo (Day 7)
**目录**: `07-microservices-demo/`  
**技术栈**: FastAPI, Docker, Kubernetes, API Gateway  
**学习目标**:
- 掌握微服务拆分原则
- 理解容器编排技术
- 学习服务治理策略

#### 8. Prometheus监控系统 (Day 8)
**目录**: `08-prometheus-monitoring/`  
**技术栈**: Prometheus, Grafana, AlertManager  
**学习目标**:
- 掌握监控系统搭建
- 理解指标收集与告警
- 学习可观测性设计

#### 9. JWT认证授权系统 (Day 9)
**目录**: `09-jwt-auth-system/`  
**技术栈**: FastAPI, JWT, RBAC, OAuth2  
**学习目标**:
- 掌握现代认证机制
- 理解权限控制模型
- 学习安全防护策略

#### 10. 智阅3.0核心模块原型 (Day 10)
**目录**: `10-zhiyue-core-prototype/`  
**技术栈**: 综合所有学习的技术栈  
**学习目标**:
- 综合运用所学技术
- 实现真实业务场景
- 团队协作开发实践

---

## 练习完成标准

### 代码质量要求
- ✅ 通过ESLint代码检查(0 error, 0 warning)
- ✅ 通过TypeScript类型检查
- ✅ 代码覆盖率 >= 80%
- ✅ 性能测试通过基准要求
- ✅ 安全扫描无高危漏洞

### 功能完整性要求
- ✅ 核心功能100%实现
- ✅ 边界条件处理完备
- ✅ 错误处理机制健全
- ✅ 用户体验流畅
- ✅ 响应式适配良好

### 文档要求
- ✅ README.md使用说明完整
- ✅ API文档自动生成
- ✅ 代码注释充分清晰
- ✅ 架构设计文档
- ✅ 部署运行指南

### 提交要求
- ✅ Git提交记录清晰
- ✅ 分支管理规范
- ✅ Pull Request格式正确
- ✅ Code Review通过
- ✅ CI/CD流水线通过

---

## 练习评分标准

| 评分项 | 权重 | 评分标准 |
|--------|------|----------|
| 功能实现 | 40% | 核心功能完整性、业务逻辑正确性 |
| 代码质量 | 30% | 代码规范、架构设计、可维护性 |
| 技术应用 | 20% | 技术栈使用深度、最佳实践应用 |
| 文档质量 | 10% | 文档完整性、可读性、准确性 |

### 评分等级
- **A级** (90-100分): 优秀，超出预期完成
- **B级** (80-89分): 良好，达到预期要求  
- **C级** (70-79分): 及格，基本功能实现
- **D级** (60-69分): 不及格，需要重做
- **F级** (0-59分): 严重不足，需要补充学习

---

## 学习资源

### 官方文档
- [React 18 Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Vite Documentation](https://vitejs.dev/)

### 学习视频
- React 18新特性深度解析
- FastAPI异步编程实战
- WebSocket实时通信开发
- 数据库性能优化实践

### 参考项目
- [智阅3.0项目源码](../../../)
- [最佳实践示例集](./best-practices/)
- [常见问题解答](./faq.md)
- [技术选型对比](./tech-comparison.md)

---

## 技术支持

### 答疑时间
- **工作日**: 14:00-16:00 在线答疑
- **技术群**: 24小时即时支持
- **一对一指导**: 预约制专家指导

### 支持渠道
- 📧 邮箱: tech-training@zhiyue-ai.com
- 💬 企业微信: 智阅技术培训群
- 📞 电话: 400-888-0001 (工作时间)
- 🎯 在线: https://training.zhiyue-ai.com

### 常见问题
详见 [FAQ文档](./faq.md)

---

**创建日期**: 2025-08-21  
**维护者**: 智阅3.0技术团队  
**版本**: v1.0