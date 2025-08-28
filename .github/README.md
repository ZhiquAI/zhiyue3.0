# CI/CD 流程说明

本目录包含了智阅 AI 项目的持续集成和持续部署配置文件。

## 📁 文件结构

```
.github/
├── workflows/
│   └── ci.yml                 # 主要的 CI/CD 流水线
├── ISSUE_TEMPLATE/
│   ├── bug_report.md          # Bug 报告模板
│   ├── feature_request.md     # 功能请求模板
│   └── documentation.md       # 文档改进模板
├── PULL_REQUEST_TEMPLATE.md   # PR 模板
├── CODE_REVIEW_GUIDELINES.md  # 代码审查指南
├── CODEOWNERS                 # 代码审查责任人
├── dependabot.yml            # 依赖自动更新配置
└── README.md                 # 本文件
```

## 🚀 CI/CD 流水线

### 触发条件

- **Push 到主分支**: `main`, `develop`
- **Pull Request**: 针对 `main`, `develop` 分支

### 流水线阶段

#### 1. 前端测试和构建 (`frontend`)

- **环境**: Ubuntu Latest
- **Node.js 版本**: 18.x, 20.x (矩阵构建)
- **步骤**:
  - 代码检出
  - 安装依赖
  - ESLint 检查
  - 单元测试 + 覆盖率
  - 构建前端
  - 上传构建产物

#### 2. E2E 测试 (`e2e`)

- **环境**: Ubuntu Latest
- **依赖**: 前端构建完成
- **步骤**:
  - 安装 Playwright 浏览器
  - 运行端到端测试
  - 上传测试报告

#### 3. 后端测试 (`backend`)

- **环境**: Ubuntu Latest
- **Python 版本**: 3.9, 3.10, 3.11 (矩阵构建)
- **数据库**: PostgreSQL 15
- **步骤**:
  - 代码检查 (flake8, black, isort)
  - 单元测试 + 覆盖率
  - 上传覆盖率报告

#### 4. 安全扫描 (`security`)

- **工具**:
  - Trivy 漏洞扫描
  - npm audit
  - Python safety 检查
- **结果**: 上传到 GitHub Security

#### 5. 代码质量检查 (`code-quality`)

- **工具**: SonarCloud
- **分析**: 代码质量、技术债务、安全问题

#### 6. 部署到测试环境 (`deploy-staging`)

- **触发条件**: `develop` 分支推送
- **环境**: staging
- **步骤**: 部署 + 冒烟测试

#### 7. 部署到生产环境 (`deploy-production`)

- **触发条件**: `main` 分支推送
- **环境**: production
- **步骤**: 部署 + 生产冒烟测试

## 🔧 配置说明

### 环境变量

需要在 GitHub Secrets 中配置以下变量：

- `SONAR_TOKEN`: SonarCloud 访问令牌
- `CODECOV_TOKEN`: Codecov 上传令牌
- 部署相关的密钥和配置

### 分支保护规则

建议为 `main` 和 `develop` 分支设置以下保护规则：

- ✅ 要求 PR 审查
- ✅ 要求状态检查通过
- ✅ 要求分支为最新
- ✅ 限制推送到匹配分支
- ✅ 要求管理员遵循规则

### 必需的状态检查

- `frontend (18.x)`
- `frontend (20.x)`
- `backend (3.9)`
- `backend (3.10)`
- `backend (3.11)`
- `e2e`
- `security`

## 📋 代码审查流程

### 1. 创建 Pull Request

- 使用 PR 模板填写详细信息
- 确保所有检查项都已完成
- 分配合适的审查者

### 2. 自动检查

- CI 流水线自动运行
- 代码质量检查
- 安全扫描

### 3. 人工审查

- 根据 CODEOWNERS 自动分配审查者
- 遵循代码审查指南
- 至少需要 1 名审查者批准

### 4. 合并

- 所有检查通过
- 获得必要的审查批准
- 使用 "Squash and merge" 策略

## 🤖 自动化功能

### Dependabot

- **前端依赖**: 每周一更新
- **后端依赖**: 每周一更新
- **GitHub Actions**: 每周二更新
- **Docker 镜像**: 每周三更新

### 自动合并

- 安全更新自动合并
- 补丁版本更新自动合并
- 开发依赖的小版本更新自动合并

## 📊 质量门禁

### 代码覆盖率

- **前端**: 最低 80%
- **后端**: 最低 85%

### 代码质量

- **SonarCloud Quality Gate**: 必须通过
- **技术债务**: 控制在合理范围内
- **代码重复率**: < 3%

### 安全要求

- **漏洞扫描**: 无高危漏洞
- **依赖检查**: 无已知安全问题
- **代码扫描**: 无安全代码问题

## 🚨 故障处理

### CI 失败处理

1. **检查失败原因**: 查看 CI 日志
2. **本地复现**: 在本地环境复现问题
3. **修复问题**: 提交修复代码
4. **重新运行**: CI 自动重新运行

### 部署失败处理

1. **立即回滚**: 回滚到上一个稳定版本
2. **问题分析**: 分析失败原因
3. **修复验证**: 在测试环境验证修复
4. **重新部署**: 修复后重新部署

## 📈 监控和度量

### CI/CD 指标

- 构建成功率
- 构建时间
- 部署频率
- 平均修复时间

### 代码质量指标

- 代码覆盖率趋势
- 技术债务变化
- 代码重复率
- 安全问题数量

## 🔗 相关链接

- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [SonarCloud 文档](https://sonarcloud.io/documentation)
- [Dependabot 文档](https://docs.github.com/en/code-security/dependabot)
- [代码审查最佳实践](./CODE_REVIEW_GUIDELINES.md)

---

**注意**: 首次设置时，请确保所有必要的 Secrets 和环境变量都已正确配置。