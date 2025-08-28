# Makefile for Backend Testing
# 后端测试自动化脚本

.PHONY: help install test test-unit test-integration test-performance test-all test-quick test-coverage clean lint format check-security

# 默认目标
help:
	@echo "智岳3.0后端测试自动化"
	@echo "========================"
	@echo ""
	@echo "可用命令:"
	@echo "  install           安装测试依赖"
	@echo "  test-quick        运行快速测试 (推荐)"
	@echo "  test-unit         运行单元测试"
	@echo "  test-integration  运行集成测试"
	@echo "  test-performance  运行性能测试"
	@echo "  test-all          运行所有测试"
	@echo "  test-coverage     运行覆盖率测试"
	@echo "  lint              代码检查"
	@echo "  format            代码格式化"
	@echo "  check-security    安全检查"
	@echo "  clean             清理测试文件"

# 安装测试依赖
install:
	@echo "📦 安装测试依赖..."
	pip install -r requirements.txt
	@echo "✅ 依赖安装完成"

# 快速测试 (推荐用于开发)
test-quick:
	@echo "⚡ 运行快速测试..."
	python test_runner.py quick

# 单元测试
test-unit:
	@echo "🧪 运行单元测试..."
	python test_runner.py unit

# 集成测试
test-integration:
	@echo "🔗 运行集成测试..."
	python test_runner.py integration

# 性能测试
test-performance:
	@echo "⚡ 运行性能测试..."
	python test_runner.py performance

# 所有测试
test-all:
	@echo "🚀 运行所有测试..."
	python test_runner.py all

# 覆盖率测试
test-coverage:
	@echo "📊 运行覆盖率测试..."
	python test_runner.py coverage
	@echo "📈 覆盖率报告已生成: htmlcov/index.html"

# 运行特定测试文件
test-file:
	@if [ -z "$(FILE)" ]; then \
		echo "❌ 请指定测试文件: make test-file FILE=path/to/test.py"; \
	else \
		echo "🎯 运行特定测试: $(FILE)"; \
		python test_runner.py specific --test-path $(FILE); \
	fi

# 代码检查
lint:
	@echo "🔍 运行代码检查..."
	flake8 ../backend --max-line-length=100 --exclude=migrations,__pycache__
	mypy ../backend --ignore-missing-imports
	@echo "✅ 代码检查完成"

# 代码格式化
format:
	@echo "🎨 格式化代码..."
	black ../backend --line-length=100
	isort ../backend --profile black
	@echo "✅ 代码格式化完成"

# 安全检查
check-security:
	@echo "🔒 运行安全检查..."
	bandit -r ../backend -f json -o security-report.json || true
	safety check --json --output safety-report.json || true
	@echo "✅ 安全检查完成，报告已生成"

# 清理测试文件
clean:
	@echo "🧹 清理测试文件..."
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	rm -rf htmlcov/
	rm -rf .coverage
	rm -f test_zhiyue.db
	rm -f *.log
	rm -f *-report.json
	@echo "✅ 清理完成"

# 检查测试环境
check-env:
	@echo "🔧 检查测试环境..."
	@python -c "import sys; print(f'Python版本: {sys.version}')"
	@python -c "import pytest; print(f'Pytest版本: {pytest.__version__}')"
	@echo "✅ 环境检查完成"

# 生成测试报告
report:
	@echo "📊 生成测试报告..."
	python test_runner.py all --no-summary > test-report.txt 2>&1 || true
	@echo "✅ 测试报告已生成: test-report.txt"

# 持续集成测试
ci:
	@echo "🔄 运行CI测试..."
	make clean
	make install
	make lint
	make check-security
	make test-coverage
	@echo "✅ CI测试完成"

# 开发环境测试
dev:
	@echo "🛠️  运行开发环境测试..."
	make clean
	make test-quick
	@echo "✅ 开发环境测试完成"

# 完整测试流程
full:
	@echo "🎯 运行完整测试流程..."
	make clean
	make check-env
	make install
	make format
	make lint
	make test-all
	make test-coverage
	make check-security
	@echo "🎉 完整测试流程完成"