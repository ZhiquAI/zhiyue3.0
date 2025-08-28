# 智岳3.0后端测试框架

全面的测试框架，支持单元测试、集成测试、性能测试和自动化CI/CD。

## 📁 目录结构

```
backend/tests/
├── conftest.py              # Pytest配置和共享fixtures
├── pytest.ini              # Pytest配置文件
├── requirements.txt         # 测试依赖包
├── Makefile                # 测试自动化脚本
├── test_runner.py          # 统一测试运行器
├── test_basic.py           # 基础服务测试
├── README.md               # 文档
│
├── unit/                   # 单元测试
│   ├── test_auth.py        # 认证模块测试
│   ├── test_models.py      # 数据模型测试
│   └── test_database_performance.py  # 数据库性能测试
│
├── integration/            # 集成测试
│   ├── test_standardized_exam_api.py  # 标准化API测试
│   └── test_websocket.py   # WebSocket集成测试
│
└── performance/            # 性能测试
    └── test_load_testing.py  # 负载测试
```

## 🚀 快速开始

### 1. 安装依赖

```bash
# 使用Makefile (推荐)
make install

# 或手动安装
pip install -r requirements.txt
```

### 2. 运行测试

```bash
# 快速测试 (推荐用于开发)
make test-quick

# 运行所有测试
make test-all

# 运行特定类型测试
make test-unit           # 单元测试
make test-integration    # 集成测试
make test-performance    # 性能测试
```

### 3. 生成覆盖率报告

```bash
make test-coverage
# 查看报告: htmlcov/index.html
```

## 📋 测试类型说明

### 单元测试 (Unit Tests)
- **位置**: `unit/` 目录
- **目的**: 测试独立的函数、类和模块
- **特点**: 快速执行，使用mock隔离依赖
- **覆盖模块**:
  - 认证系统 (`test_auth.py`)
  - 数据模型 (`test_models.py`)
  - 数据库性能组件 (`test_database_performance.py`)

### 集成测试 (Integration Tests)
- **位置**: `integration/` 目录
- **目的**: 测试多个组件协作
- **特点**: 使用真实数据库，测试API端点
- **覆盖场景**:
  - 标准化API流程 (`test_standardized_exam_api.py`)
  - WebSocket实时通信 (`test_websocket.py`)

### 性能测试 (Performance Tests)
- **位置**: `performance/` 目录
- **目的**: 验证系统性能指标
- **特点**: 并发测试，响应时间验证
- **测试内容**:
  - API负载测试
  - 数据库查询性能
  - 内存使用监控

## 🛠️ 测试工具

### 测试运行器
```bash
# 直接使用Python
python test_runner.py quick
python test_runner.py unit
python test_runner.py integration
python test_runner.py performance
python test_runner.py all

# 运行特定测试文件
python test_runner.py specific --test-path unit/test_auth.py
```

### Makefile命令
```bash
make help              # 查看所有可用命令
make install           # 安装依赖
make test-quick        # 快速测试
make test-coverage     # 覆盖率测试
make lint              # 代码检查
make format            # 代码格式化
make check-security    # 安全检查
make clean             # 清理测试文件
make ci                # CI环境测试
make dev               # 开发环境测试
make full              # 完整测试流程
```

## 📊 测试标记 (Markers)

使用pytest标记来分类和过滤测试:

```python
@pytest.mark.unit          # 单元测试
@pytest.mark.integration   # 集成测试
@pytest.mark.performance   # 性能测试
@pytest.mark.slow          # 慢速测试
@pytest.mark.database      # 数据库测试
@pytest.mark.auth          # 认证测试
@pytest.mark.api           # API测试
@pytest.mark.websocket     # WebSocket测试
```

运行特定标记的测试:
```bash
pytest -m "unit and not slow"
pytest -m "performance"
pytest -m "api or websocket"
```

## 🔧 配置说明

### Pytest配置 (`pytest.ini`)
- 测试发现规则
- 标记定义
- 输出格式配置
- 覆盖率设置
- 日志配置

### 共享Fixtures (`conftest.py`)
- `test_engine`: 测试数据库引擎
- `test_db`: 测试数据库会话
- `test_client`: FastAPI测试客户端
- `test_user`: 测试用户
- `auth_headers`: 认证头
- `performance_timer`: 性能计时器

## 📈 性能基准

### API响应时间基准
- 获取考试列表: < 500ms
- 获取单个考试: < 300ms
- 创建考试: < 500ms
- 复杂查询: < 1000ms

### 负载测试基准
- 并发请求: 50个并发用户
- 成功率: > 95%
- 错误率: < 5%
- 吞吐量: > 100 requests/s

### 数据库性能基准
- 简单查询: < 100ms
- 复杂查询: < 500ms
- 批量操作: < 1000ms
- 连接获取: < 50ms

## 🔍 代码质量检查

### 代码风格
```bash
make format     # 自动格式化
make lint       # 代码检查
```

使用的工具:
- **Black**: 代码格式化
- **isort**: 导入排序
- **flake8**: 代码风格检查
- **mypy**: 类型检查

### 安全检查
```bash
make check-security
```

使用的工具:
- **bandit**: 安全漏洞扫描
- **safety**: 依赖安全检查

## 🔄 CI/CD集成

### GitHub Actions配置示例
```yaml
name: Backend Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.9'
      - name: Run CI tests
        run: make ci
        working-directory: backend/tests
```

### 本地CI测试
```bash
make ci  # 运行完整CI流程
```

## 🐛 调试测试

### 运行失败的测试
```bash
# 详细输出
pytest -v --tb=long

# 进入调试模式
pytest --pdb

# 只运行失败的测试
pytest --lf
```

### 查看覆盖率详情
```bash
make test-coverage
open htmlcov/index.html  # macOS
```

### 性能分析
```bash
# 查看最慢的测试
pytest --durations=20

# 内存使用分析
pytest --profile
```

## 📝 编写测试

### 单元测试示例
```python
def test_user_creation(test_db):
    \"\"\"测试用户创建\"\"\"
    user = User(username="test", email="test@example.com")
    test_db.add(user)
    test_db.commit()
    
    assert user.id is not None
    assert user.username == "test"
```

### 集成测试示例
```python
def test_exam_api(test_client, auth_headers):
    \"\"\"测试考试API\"\"\"
    exam_data = {"name": "测试考试", "subject": "数学"}
    response = test_client.post(
        "/api/v1/exams/", 
        json=exam_data, 
        headers=auth_headers
    )
    
    assert response.status_code == 200
    assert response.json()["success"] is True
```

### 性能测试示例
```python
@pytest.mark.performance
def test_api_performance(test_client, auth_headers, performance_timer):
    \"\"\"测试API性能\"\"\"
    performance_timer.start()
    response = test_client.get("/api/v1/exams/", headers=auth_headers)
    performance_timer.stop()
    
    assert response.status_code == 200
    performance_timer.assert_max_time(1.0)
```

## 🤝 贡献指南

1. 编写测试前先运行现有测试确保环境正常
2. 新功能必须包含相应的单元测试和集成测试
3. 性能敏感的功能需要添加性能测试
4. 测试代码需要包含清晰的文档字符串
5. 提交前运行完整测试套件: `make full`

## 📞 获取帮助

- 查看可用命令: `make help`
- 查看测试配置: `cat pytest.ini`
- 查看Fixtures: `pytest --fixtures`
- 查看标记: `pytest --markers`

---

**注意**: 确保在运行测试前已经正确配置了开发环境，包括数据库连接和必要的环境变量。