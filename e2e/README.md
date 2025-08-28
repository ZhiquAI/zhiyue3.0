# E2E 测试说明

本项目使用 Playwright 进行端到端测试，确保应用的核心功能正常工作。

## 测试覆盖范围

### 1. 首页测试 (`homepage.spec.ts`)
- 页面加载和标题验证
- 导航元素检查
- 功能卡片显示
- 响应式设计验证

### 2. 用户认证测试 (`auth.spec.ts`)
- 用户登录流程
- 用户注册流程
- 表单验证
- 密码重置功能

### 3. 考试管理测试 (`exam-management.spec.ts`)
- 考试列表显示
- 创建新考试流程
- 考试搜索功能
- 考试状态筛选
- 考试编辑和删除
- 批量操作功能

### 4. 学生管理测试 (`student-management.spec.ts`)
- 学生列表显示
- 添加新学生流程
- 学生信息编辑
- 学生删除功能
- 批量导入学生
- 学生班级筛选
- 学生详情和成绩查看
- 批量操作学生

### 5. 阅卷功能测试 (`grading.spec.ts`)
- 阅卷页面显示
- 选择考试进行阅卷
- 客观题自动阅卷
- 主观题手动阅卷
- 智能阅卷功能
- 阅卷进度查看
- 阅卷结果统计
- 导出阅卷结果
- 阅卷历史记录
- 批量阅卷操作
- 阅卷质量检查

## 运行测试

### 安装依赖
```bash
npm install
```

### 安装 Playwright 浏览器
```bash
npx playwright install
```

### 运行所有 E2E 测试
```bash
npm run test:e2e
```

### 以 UI 模式运行测试
```bash
npm run test:e2e:ui
```

### 以有头模式运行测试（显示浏览器窗口）
```bash
npm run test:e2e:headed
```

### 调试模式运行测试
```bash
npm run test:e2e:debug
```

### 运行特定测试文件
```bash
npx playwright test homepage.spec.ts
npx playwright test auth.spec.ts
npx playwright test exam-management.spec.ts
npx playwright test student-management.spec.ts
npx playwright test grading.spec.ts
```

### 运行特定浏览器的测试
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

## 测试配置

测试配置文件位于 `playwright.config.ts`，包含以下设置：

- **并行执行**: 启用并行测试以提高执行速度
- **重试机制**: 失败的测试会自动重试 2 次
- **多浏览器支持**: 支持 Chromium、Firefox 和 WebKit
- **自动启动开发服务器**: 测试前自动启动 `npm run dev`
- **截图和视频**: 失败时自动保存截图和视频

## 测试最佳实践

1. **使用数据测试 ID**: 优先使用 `data-testid` 属性定位元素
2. **等待策略**: 使用适当的等待策略确保元素可见
3. **独立性**: 每个测试应该独立运行，不依赖其他测试
4. **清理**: 测试后清理创建的数据
5. **错误处理**: 优雅处理可能的错误情况

## 持续集成

这些测试可以集成到 CI/CD 流水线中：

```yaml
# GitHub Actions 示例
- name: Install dependencies
  run: npm ci

- name: Install Playwright
  run: npx playwright install --with-deps

- name: Run E2E tests
  run: npm run test:e2e
```

## 故障排除

### 常见问题

1. **测试超时**: 增加 `playwright.config.ts` 中的超时时间
2. **元素未找到**: 检查选择器是否正确，使用 Playwright Inspector 调试
3. **网络问题**: 确保开发服务器正常运行
4. **浏览器问题**: 重新安装 Playwright 浏览器

### 调试技巧

1. 使用 `--debug` 模式逐步执行测试
2. 使用 `page.pause()` 在特定位置暂停测试
3. 查看测试报告中的截图和视频
4. 使用 Playwright Inspector 检查页面状态

## 贡献指南

添加新的 E2E 测试时，请遵循以下规范：

1. 在适当的测试文件中添加测试用例
2. 使用描述性的测试名称
3. 添加必要的注释说明测试目的
4. 确保测试的稳定性和可靠性
5. 更新本 README 文件的测试覆盖范围