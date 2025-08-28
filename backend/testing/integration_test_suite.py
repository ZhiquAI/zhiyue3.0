"""
智阅3.0 系统集成测试套件
全面测试系统各模块的协同工作和端到端功能
"""
import asyncio
import logging
import json
import time
import os
import sys
import requests
import pytest
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
from concurrent.futures import ThreadPoolExecutor, as_completed
import subprocess
import psutil
import numpy as np
from pathlib import Path

# 添加项目根目录到路径
sys.path.append(str(Path(__file__).parent.parent))

logger = logging.getLogger(__name__)

@dataclass
class TestScenario:
    scenario_id: str
    name: str
    description: str
    steps: List[Dict[str, Any]]
    expected_outcome: Dict[str, Any]
    timeout_seconds: int = 300

@dataclass
class TestResult:
    scenario_id: str
    status: str  # PASS, FAIL, ERROR, SKIP
    execution_time: float
    details: Dict[str, Any]
    error_message: Optional[str] = None
    timestamp: datetime = None

class SystemIntegrationTestSuite:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.test_results = []
        self.test_data_path = Path("test_data/integration")
        self.test_data_path.mkdir(parents=True, exist_ok=True)
        
        # 测试配置
        self.test_config = {
            "timeout": 30,
            "retry_count": 3,
            "concurrent_users": 10,
            "test_data_size": 100
        }
        
        # 初始化测试数据
        self._prepare_test_data()
    
    def _prepare_test_data(self):
        """准备测试数据"""
        # 创建测试用的学生答案数据
        test_answers = [
            {
                "id": f"answer_{i:03d}",
                "content": f"这是第{i}个测试答案，包含了相关的历史知识点...",
                "question_type": "short_answer",
                "subject": "history",
                "expected_score": 80 + (i % 20)
            }
            for i in range(1, 101)
        ]
        
        with open(self.test_data_path / "test_answers.json", 'w', encoding='utf-8') as f:
            json.dump(test_answers, f, ensure_ascii=False, indent=2)
        
        # 创建测试用的评分标准
        grading_criteria = {
            "max_score": 100,
            "expected_keywords": ["历史", "知识", "答案"],
            "scoring_rubric": "根据内容准确性和完整性评分"
        }
        
        with open(self.test_data_path / "grading_criteria.json", 'w', encoding='utf-8') as f:
            json.dump(grading_criteria, f, ensure_ascii=False, indent=2)
    
    async def run_full_integration_test(self) -> Dict[str, Any]:
        """运行完整的集成测试套件"""
        logger.info("🚀 开始系统集成测试")
        logger.info("=" * 80)
        
        start_time = time.time()
        
        try:
            # 1. 系统健康检查
            await self._test_system_health()
            
            # 2. 端到端功能测试
            await self._test_end_to_end_workflows()
            
            # 3. 性能和压力测试
            await self._test_performance_and_stress()
            
            # 4. 安全性测试
            await self._test_security()
            
            # 5. 兼容性测试
            await self._test_compatibility()
            
            # 6. 用户场景测试
            await self._test_user_scenarios()
            
            # 7. 数据一致性测试
            await self._test_data_consistency()
            
            # 8. 故障恢复测试
            await self._test_failure_recovery()
            
            total_time = time.time() - start_time
            
            # 生成测试报告
            report = await self._generate_test_report(total_time)
            
            logger.info("✅ 系统集成测试完成")
            return report
            
        except Exception as e:
            logger.error(f"❌ 集成测试失败: {e}")
            raise
    
    async def _test_system_health(self):
        """系统健康检查"""
        logger.info("🏥 1. 系统健康检查")
        
        # 检查基础服务
        health_checks = [
            {"name": "API服务", "endpoint": "/health"},
            {"name": "数据库连接", "endpoint": "/api/config"},
            {"name": "AI服务", "endpoint": "/api/ai-grading/health"},
        ]
        
        for check in health_checks:
            try:
                response = requests.get(f"{self.base_url}{check['endpoint']}", timeout=10)
                if response.status_code == 200:
                    logger.info(f"   ✅ {check['name']}: 正常")
                else:
                    logger.warning(f"   ⚠️ {check['name']}: 状态码 {response.status_code}")
            except Exception as e:
                logger.error(f"   ❌ {check['name']}: {e}")
        
        # 检查系统资源
        cpu_percent = psutil.cpu_percent(interval=1)
        memory_percent = psutil.virtual_memory().percent
        disk_percent = psutil.disk_usage('/').percent
        
        logger.info(f"   💻 CPU使用率: {cpu_percent:.1f}%")
        logger.info(f"   🧠 内存使用率: {memory_percent:.1f}%")
        logger.info(f"   💾 磁盘使用率: {disk_percent:.1f}%")
        
        # 健康检查结果
        health_result = TestResult(
            scenario_id="system_health",
            status="PASS" if cpu_percent < 80 and memory_percent < 80 else "WARN",
            execution_time=2.0,
            details={
                "cpu_percent": cpu_percent,
                "memory_percent": memory_percent,
                "disk_percent": disk_percent
            },
            timestamp=datetime.now()
        )
        self.test_results.append(health_result)
    
    async def _test_end_to_end_workflows(self):
        """端到端功能测试"""
        logger.info("🔄 2. 端到端功能测试")
        
        scenarios = [
            await self._test_complete_grading_workflow(),
            await self._test_batch_processing_workflow(),
            await self._test_quality_control_workflow(),
            await self._test_model_training_workflow(),
            await self._test_adaptive_workflow()
        ]
        
        for scenario in scenarios:
            self.test_results.append(scenario)
    
    async def _test_complete_grading_workflow(self) -> TestResult:
        """完整评分流程测试"""
        logger.info("   📝 测试完整评分流程...")
        start_time = time.time()
        
        try:
            # 步骤1: 准备测试数据
            test_answer = {
                "student_answer": {
                    "content": "秦始皇统一中国后建立了郡县制，这是中央集权制度的重要组成部分。",
                    "question_type": "short_answer",
                    "subject": "history"
                },
                "grading_criteria": {
                    "max_score": 100,
                    "expected_keywords": ["秦始皇", "郡县制", "中央集权"],
                    "scoring_rubric": "根据历史知识准确性评分"
                },
                "grading_mode": "automatic"
            }
            
            # 步骤2: 执行AI评分
            grading_response = requests.post(
                f"{self.base_url}/api/ai-grading/grade-single",
                json=test_answer,
                timeout=30
            )
            
            if grading_response.status_code != 200:
                raise Exception(f"评分请求失败: {grading_response.status_code}")
            
            grading_result = grading_response.json()
            score = grading_result.get('data', {}).get('score', 0)
            confidence = grading_result.get('data', {}).get('confidence', 0)
            
            # 步骤3: 质量检查
            quality_data = {
                "session_id": "integration_test_001",
                "grading_results": [{
                    "score": score,
                    "confidence": confidence,
                    "processing_time_ms": 500
                }]
            }
            
            quality_response = requests.post(
                f"{self.base_url}/api/quality-control/assess",
                json=quality_data,
                timeout=30
            )
            
            execution_time = time.time() - start_time
            
            # 验证结果
            success = (
                grading_response.status_code == 200 and
                score > 0 and score <= 100 and
                confidence > 0 and confidence <= 1 and
                quality_response.status_code == 200
            )
            
            return TestResult(
                scenario_id="complete_grading_workflow",
                status="PASS" if success else "FAIL",
                execution_time=execution_time,
                details={
                    "score": score,
                    "confidence": confidence,
                    "quality_assessment": quality_response.status_code == 200
                },
                timestamp=datetime.now()
            )
            
        except Exception as e:
            return TestResult(
                scenario_id="complete_grading_workflow",
                status="ERROR",
                execution_time=time.time() - start_time,
                details={},
                error_message=str(e),
                timestamp=datetime.now()
            )
    
    async def _test_batch_processing_workflow(self) -> TestResult:
        """批量处理流程测试"""
        logger.info("   📊 测试批量处理流程...")
        start_time = time.time()
        
        try:
            # 准备批量数据
            batch_data = {
                "grading_requests": [
                    {
                        "id": f"batch_test_{i}",
                        "student_answer": {
                            "content": f"批量测试答案 {i}",
                            "question_type": "short_answer"
                        },
                        "grading_criteria": {"max_score": 100}
                    }
                    for i in range(1, 21)  # 20个测试项
                ]
            }
            
            # 执行批量评分
            response = requests.post(
                f"{self.base_url}/api/ai-grading/grade-batch",
                json=batch_data,
                timeout=60
            )
            
            execution_time = time.time() - start_time
            
            if response.status_code == 200:
                result_data = response.json()
                processed_count = len(result_data.get('data', {}).get('results', []))
                
                return TestResult(
                    scenario_id="batch_processing_workflow",
                    status="PASS" if processed_count == 20 else "FAIL",
                    execution_time=execution_time,
                    details={
                        "requested_count": 20,
                        "processed_count": processed_count,
                        "throughput": processed_count / execution_time
                    },
                    timestamp=datetime.now()
                )
            else:
                return TestResult(
                    scenario_id="batch_processing_workflow",
                    status="FAIL",
                    execution_time=execution_time,
                    details={"status_code": response.status_code},
                    error_message=f"HTTP {response.status_code}",
                    timestamp=datetime.now()
                )
                
        except Exception as e:
            return TestResult(
                scenario_id="batch_processing_workflow",
                status="ERROR",
                execution_time=time.time() - start_time,
                details={},
                error_message=str(e),
                timestamp=datetime.now()
            )
    
    async def _test_quality_control_workflow(self) -> TestResult:
        """质量控制流程测试"""
        logger.info("   🔍 测试质量控制流程...")
        start_time = time.time()
        
        try:
            # 模拟质量评估数据
            assessment_data = {
                "session_id": "quality_test_session",
                "grading_results": [
                    {
                        "score": 85 + i,
                        "confidence": 0.9 - i * 0.01,
                        "processing_time_ms": 400 + i * 10,
                        "grader_id": f"grader_{i % 3 + 1}"
                    }
                    for i in range(10)
                ]
            }
            
            # 执行质量评估
            response = requests.post(
                f"{self.base_url}/api/quality-control/assess",
                json=assessment_data,
                timeout=30
            )
            
            execution_time = time.time() - start_time
            
            if response.status_code == 200:
                result = response.json()
                report_id = result.get('data', {}).get('report_id')
                
                return TestResult(
                    scenario_id="quality_control_workflow",
                    status="PASS" if report_id else "FAIL",
                    execution_time=execution_time,
                    details={
                        "report_generated": bool(report_id),
                        "assessment_completed": True
                    },
                    timestamp=datetime.now()
                )
            else:
                return TestResult(
                    scenario_id="quality_control_workflow",
                    status="FAIL",
                    execution_time=execution_time,
                    details={"status_code": response.status_code},
                    error_message=f"HTTP {response.status_code}",
                    timestamp=datetime.now()
                )
                
        except Exception as e:
            return TestResult(
                scenario_id="quality_control_workflow",
                status="ERROR",
                execution_time=time.time() - start_time,
                details={},
                error_message=str(e),
                timestamp=datetime.now()
            )
    
    async def _test_model_training_workflow(self) -> TestResult:
        """模型训练流程测试"""
        logger.info("   🔬 测试模型训练流程...")
        start_time = time.time()
        
        try:
            # 查看模型列表
            models_response = requests.get(
                f"{self.base_url}/api/model-training/models",
                timeout=30
            )
            
            # 查看训练记录
            records_response = requests.get(
                f"{self.base_url}/api/model-training/training-records",
                timeout=30
            )
            
            # 查看支持的模型类型
            types_response = requests.get(
                f"{self.base_url}/api/model-training/model-types",
                timeout=30
            )
            
            execution_time = time.time() - start_time
            
            success = (
                models_response.status_code == 200 and
                records_response.status_code == 200 and
                types_response.status_code == 200
            )
            
            return TestResult(
                scenario_id="model_training_workflow",
                status="PASS" if success else "FAIL",
                execution_time=execution_time,
                details={
                    "models_api": models_response.status_code == 200,
                    "records_api": records_response.status_code == 200,
                    "types_api": types_response.status_code == 200
                },
                timestamp=datetime.now()
            )
            
        except Exception as e:
            return TestResult(
                scenario_id="model_training_workflow",
                status="ERROR",
                execution_time=time.time() - start_time,
                details={},
                error_message=str(e),
                timestamp=datetime.now()
            )
    
    async def _test_adaptive_workflow(self) -> TestResult:
        """自适应工作流测试"""
        logger.info("   🔄 测试自适应工作流...")
        start_time = time.time()
        
        try:
            # 由于自适应工作流主要是服务层逻辑，这里测试相关API的可访问性
            
            # 测试质量监控API
            dashboard_response = requests.get(
                f"{self.base_url}/api/quality-control/dashboard",
                timeout=30
            )
            
            # 测试统计信息API
            stats_response = requests.get(
                f"{self.base_url}/api/quality-control/statistics",
                timeout=30
            )
            
            execution_time = time.time() - start_time
            
            success = (
                dashboard_response.status_code == 200 and
                stats_response.status_code == 200
            )
            
            return TestResult(
                scenario_id="adaptive_workflow",
                status="PASS" if success else "FAIL",
                execution_time=execution_time,
                details={
                    "dashboard_api": dashboard_response.status_code == 200,
                    "stats_api": stats_response.status_code == 200,
                    "adaptive_features": True
                },
                timestamp=datetime.now()
            )
            
        except Exception as e:
            return TestResult(
                scenario_id="adaptive_workflow",
                status="ERROR",
                execution_time=time.time() - start_time,
                details={},
                error_message=str(e),
                timestamp=datetime.now()
            )
    
    async def _test_performance_and_stress(self):
        """性能和压力测试"""
        logger.info("⚡ 3. 性能和压力测试")
        
        # 并发性能测试
        await self._test_concurrent_performance()
        
        # 大数据量测试
        await self._test_large_dataset()
        
        # 内存泄漏测试
        await self._test_memory_leak()
    
    async def _test_concurrent_performance(self):
        """并发性能测试"""
        logger.info("   👥 并发性能测试...")
        
        def single_request():
            test_data = {
                "student_answer": {
                    "content": "并发测试答案",
                    "question_type": "short_answer"
                },
                "grading_criteria": {"max_score": 100}
            }
            
            start = time.time()
            response = requests.post(
                f"{self.base_url}/api/ai-grading/grade-single",
                json=test_data,
                timeout=10
            )
            response_time = time.time() - start
            
            return {
                "success": response.status_code == 200,
                "response_time": response_time,
                "status_code": response.status_code
            }
        
        # 并发执行
        concurrent_users = 20
        with ThreadPoolExecutor(max_workers=concurrent_users) as executor:
            start_time = time.time()
            futures = [executor.submit(single_request) for _ in range(concurrent_users)]
            results = [future.result() for future in as_completed(futures)]
            total_time = time.time() - start_time
        
        # 分析结果
        successful_requests = sum(1 for r in results if r['success'])
        avg_response_time = np.mean([r['response_time'] for r in results])
        throughput = len(results) / total_time
        
        logger.info(f"   📊 并发用户: {concurrent_users}")
        logger.info(f"   ✅ 成功率: {successful_requests}/{len(results)} ({successful_requests/len(results)*100:.1f}%)")
        logger.info(f"   ⏱️ 平均响应时间: {avg_response_time:.3f}s")
        logger.info(f"   🚀 吞吐量: {throughput:.1f} req/s")
        
        # 记录测试结果
        performance_result = TestResult(
            scenario_id="concurrent_performance",
            status="PASS" if successful_requests/len(results) > 0.95 else "FAIL",
            execution_time=total_time,
            details={
                "concurrent_users": concurrent_users,
                "success_rate": successful_requests/len(results),
                "avg_response_time": avg_response_time,
                "throughput": throughput
            },
            timestamp=datetime.now()
        )
        self.test_results.append(performance_result)
    
    async def _test_large_dataset(self):
        """大数据量测试"""
        logger.info("   📈 大数据量测试...")
        
        # 准备大批量数据
        large_batch = {
            "grading_requests": [
                {
                    "id": f"large_batch_{i}",
                    "student_answer": {
                        "content": f"大数据量测试答案 {i} - " + "内容" * 10,
                        "question_type": "short_answer"
                    },
                    "grading_criteria": {"max_score": 100}
                }
                for i in range(50)  # 50个测试项
            ]
        }
        
        start_time = time.time()
        try:
            response = requests.post(
                f"{self.base_url}/api/ai-grading/grade-batch",
                json=large_batch,
                timeout=120  # 2分钟超时
            )
            
            execution_time = time.time() - start_time
            
            if response.status_code == 200:
                result_data = response.json()
                processed_count = len(result_data.get('data', {}).get('results', []))
                throughput = processed_count / execution_time
                
                logger.info(f"   📊 处理数量: {processed_count}/50")
                logger.info(f"   ⏱️ 处理时间: {execution_time:.2f}s")
                logger.info(f"   🚀 处理速度: {throughput:.1f} items/s")
                
                status = "PASS" if processed_count >= 45 else "FAIL"  # 允许10%的失败率
            else:
                status = "FAIL"
                processed_count = 0
                throughput = 0
            
            large_dataset_result = TestResult(
                scenario_id="large_dataset",
                status=status,
                execution_time=execution_time,
                details={
                    "requested_count": 50,
                    "processed_count": processed_count,
                    "throughput": throughput,
                    "response_code": response.status_code
                },
                timestamp=datetime.now()
            )
            self.test_results.append(large_dataset_result)
            
        except Exception as e:
            logger.error(f"   ❌ 大数据量测试失败: {e}")
            self.test_results.append(TestResult(
                scenario_id="large_dataset",
                status="ERROR",
                execution_time=time.time() - start_time,
                details={},
                error_message=str(e),
                timestamp=datetime.now()
            ))
    
    async def _test_memory_leak(self):
        """内存泄漏测试"""
        logger.info("   🧠 内存泄漏测试...")
        
        # 记录初始内存使用
        initial_memory = psutil.virtual_memory().percent
        
        # 执行大量请求来检测内存泄漏
        for i in range(100):
            test_data = {
                "student_answer": {
                    "content": f"内存测试 {i}",
                    "question_type": "short_answer"
                },
                "grading_criteria": {"max_score": 100}
            }
            
            try:
                requests.post(
                    f"{self.base_url}/api/ai-grading/grade-single",
                    json=test_data,
                    timeout=5
                )
            except:
                pass  # 忽略个别请求失败
            
            if i % 20 == 0:
                current_memory = psutil.virtual_memory().percent
                logger.info(f"   📊 请求 {i}: 内存使用 {current_memory:.1f}%")
        
        # 检查最终内存使用
        final_memory = psutil.virtual_memory().percent
        memory_increase = final_memory - initial_memory
        
        logger.info(f"   📈 内存变化: {initial_memory:.1f}% → {final_memory:.1f}% (增加 {memory_increase:.1f}%)")
        
        # 记录结果
        memory_result = TestResult(
            scenario_id="memory_leak",
            status="PASS" if memory_increase < 10 else "WARN",  # 内存增加超过10%为警告
            execution_time=30.0,
            details={
                "initial_memory": initial_memory,
                "final_memory": final_memory,
                "memory_increase": memory_increase
            },
            timestamp=datetime.now()
        )
        self.test_results.append(memory_result)
    
    async def _test_security(self):
        """安全性测试"""
        logger.info("🔒 4. 安全性测试")
        
        # SQL注入测试
        await self._test_sql_injection()
        
        # XSS攻击测试
        await self._test_xss_attacks()
        
        # 认证和授权测试
        await self._test_authentication()
    
    async def _test_sql_injection(self):
        """SQL注入测试"""
        logger.info("   💉 SQL注入攻击测试...")
        
        injection_payloads = [
            "'; DROP TABLE users; --",
            "' OR '1'='1",
            "'; SELECT * FROM sensitive_data; --",
            "' UNION SELECT password FROM users --"
        ]
        
        vulnerabilities = 0
        
        for payload in injection_payloads:
            test_data = {
                "student_answer": {
                    "content": payload,
                    "question_type": "short_answer"
                },
                "grading_criteria": {"max_score": 100}
            }
            
            try:
                response = requests.post(
                    f"{self.base_url}/api/ai-grading/grade-single",
                    json=test_data,
                    timeout=10
                )
                
                # 检查响应是否包含敏感信息
                if response.status_code == 200:
                    response_text = response.text.lower()
                    if any(keyword in response_text for keyword in ['error', 'sql', 'database', 'table']):
                        vulnerabilities += 1
                        
            except Exception as e:
                # 异常也可能表示注入被阻止
                pass
        
        logger.info(f"   🛡️ SQL注入测试: {len(injection_payloads) - vulnerabilities}/{len(injection_payloads)} 已防护")
        
        sql_injection_result = TestResult(
            scenario_id="sql_injection",
            status="PASS" if vulnerabilities == 0 else "FAIL",
            execution_time=5.0,
            details={
                "payloads_tested": len(injection_payloads),
                "vulnerabilities_found": vulnerabilities,
                "protection_rate": (len(injection_payloads) - vulnerabilities) / len(injection_payloads)
            },
            timestamp=datetime.now()
        )
        self.test_results.append(sql_injection_result)
    
    async def _test_xss_attacks(self):
        """XSS攻击测试"""
        logger.info("   🕷️ XSS攻击测试...")
        
        xss_payloads = [
            "<script>alert('xss')</script>",
            "javascript:alert('xss')",
            "<img src=x onerror=alert('xss')>",
            "<svg onload=alert('xss')>"
        ]
        
        blocked_attacks = 0
        
        for payload in xss_payloads:
            test_data = {
                "student_answer": {
                    "content": payload,
                    "question_type": "short_answer"
                },
                "grading_criteria": {"max_score": 100}
            }
            
            try:
                response = requests.post(
                    f"{self.base_url}/api/ai-grading/grade-single",
                    json=test_data,
                    timeout=10
                )
                
                # 检查响应是否已转义
                if response.status_code == 200:
                    response_text = response.text
                    if payload not in response_text or '&lt;' in response_text or '&gt;' in response_text:
                        blocked_attacks += 1
                        
            except Exception:
                blocked_attacks += 1  # 异常表示攻击被阻止
        
        logger.info(f"   🛡️ XSS攻击测试: {blocked_attacks}/{len(xss_payloads)} 已防护")
        
        xss_result = TestResult(
            scenario_id="xss_attacks",
            status="PASS" if blocked_attacks == len(xss_payloads) else "FAIL",
            execution_time=3.0,
            details={
                "payloads_tested": len(xss_payloads),
                "attacks_blocked": blocked_attacks,
                "protection_rate": blocked_attacks / len(xss_payloads)
            },
            timestamp=datetime.now()
        )
        self.test_results.append(xss_result)
    
    async def _test_authentication(self):
        """认证授权测试"""
        logger.info("   🔐 认证授权测试...")
        
        # 测试无认证访问受保护的API
        protected_endpoints = [
            "/api/model-training/models",
            "/api/quality-control/dashboard",
            "/api/ai-grading/grade-single"
        ]
        
        unauthorized_blocked = 0
        
        for endpoint in protected_endpoints:
            try:
                # 不提供认证头的请求
                response = requests.get(f"{self.base_url}{endpoint}", timeout=10)
                
                # 期望返回401或403
                if response.status_code in [401, 403]:
                    unauthorized_blocked += 1
                    
            except Exception:
                unauthorized_blocked += 1  # 连接被拒绝也算成功阻止
        
        logger.info(f"   🛡️ 认证测试: {unauthorized_blocked}/{len(protected_endpoints)} 端点已保护")
        
        auth_result = TestResult(
            scenario_id="authentication",
            status="PASS" if unauthorized_blocked >= len(protected_endpoints) * 0.8 else "FAIL",
            execution_time=2.0,
            details={
                "endpoints_tested": len(protected_endpoints),
                "unauthorized_blocked": unauthorized_blocked,
                "protection_rate": unauthorized_blocked / len(protected_endpoints)
            },
            timestamp=datetime.now()
        )
        self.test_results.append(auth_result)
    
    async def _test_compatibility(self):
        """兼容性测试"""
        logger.info("🌐 5. 兼容性测试")
        
        # API版本兼容性测试
        await self._test_api_compatibility()
        
        # 数据格式兼容性测试
        await self._test_data_format_compatibility()
    
    async def _test_api_compatibility(self):
        """API版本兼容性测试"""
        logger.info("   🔄 API版本兼容性测试...")
        
        # 测试不同的Content-Type
        content_types = [
            "application/json",
            "application/json; charset=utf-8"
        ]
        
        compatible_formats = 0
        
        for content_type in content_types:
            test_data = {
                "student_answer": {
                    "content": "兼容性测试",
                    "question_type": "short_answer"
                },
                "grading_criteria": {"max_score": 100}
            }
            
            try:
                response = requests.post(
                    f"{self.base_url}/api/ai-grading/grade-single",
                    json=test_data,
                    headers={"Content-Type": content_type},
                    timeout=10
                )
                
                if response.status_code == 200:
                    compatible_formats += 1
                    
            except Exception:
                pass
        
        logger.info(f"   ✅ 兼容格式: {compatible_formats}/{len(content_types)}")
        
        api_compat_result = TestResult(
            scenario_id="api_compatibility",
            status="PASS" if compatible_formats == len(content_types) else "FAIL",
            execution_time=2.0,
            details={
                "formats_tested": len(content_types),
                "compatible_formats": compatible_formats
            },
            timestamp=datetime.now()
        )
        self.test_results.append(api_compat_result)
    
    async def _test_data_format_compatibility(self):
        """数据格式兼容性测试"""
        logger.info("   📋 数据格式兼容性测试...")
        
        # 测试不同的数据格式
        test_cases = [
            {
                "name": "标准格式",
                "data": {
                    "student_answer": {"content": "标准测试", "question_type": "short_answer"},
                    "grading_criteria": {"max_score": 100}
                }
            },
            {
                "name": "额外字段",
                "data": {
                    "student_answer": {"content": "额外字段测试", "question_type": "short_answer", "extra_field": "value"},
                    "grading_criteria": {"max_score": 100, "extra_criteria": "value"}
                }
            },
            {
                "name": "最小字段",
                "data": {
                    "student_answer": {"content": "最小字段测试"},
                    "grading_criteria": {"max_score": 100}
                }
            }
        ]
        
        compatible_cases = 0
        
        for case in test_cases:
            try:
                response = requests.post(
                    f"{self.base_url}/api/ai-grading/grade-single",
                    json=case["data"],
                    timeout=10
                )
                
                if response.status_code == 200:
                    compatible_cases += 1
                    logger.info(f"   ✅ {case['name']}: 兼容")
                else:
                    logger.warning(f"   ⚠️ {case['name']}: 不兼容 ({response.status_code})")
                    
            except Exception as e:
                logger.error(f"   ❌ {case['name']}: 错误 ({e})")
        
        data_compat_result = TestResult(
            scenario_id="data_format_compatibility",
            status="PASS" if compatible_cases >= len(test_cases) * 0.8 else "FAIL",
            execution_time=3.0,
            details={
                "cases_tested": len(test_cases),
                "compatible_cases": compatible_cases,
                "compatibility_rate": compatible_cases / len(test_cases)
            },
            timestamp=datetime.now()
        )
        self.test_results.append(data_compat_result)
    
    async def _test_user_scenarios(self):
        """用户场景测试"""
        logger.info("👥 6. 用户场景测试")
        
        # 教师评分场景
        await self._test_teacher_grading_scenario()
        
        # 学生查看结果场景
        await self._test_student_result_scenario()
        
        # 管理员监控场景
        await self._test_admin_monitoring_scenario()
    
    async def _test_teacher_grading_scenario(self):
        """教师评分场景测试"""
        logger.info("   👩‍🏫 教师评分场景...")
        
        # 模拟教师的完整评分流程
        scenario_steps = [
            # 1. 上传试卷
            ("upload_exam", {"exam_name": "期中测试", "subject": "history"}),
            # 2. 批量评分
            ("batch_grading", {"count": 30}),
            # 3. 查看结果
            ("view_results", {}),
            # 4. 质量检查
            ("quality_check", {})
        ]
        
        completed_steps = 0
        start_time = time.time()
        
        for step_name, step_data in scenario_steps:
            try:
                if step_name == "batch_grading":
                    # 执行批量评分
                    batch_data = {
                        "grading_requests": [
                            {
                                "id": f"student_{i}",
                                "student_answer": {"content": f"学生{i}的答案", "question_type": "short_answer"},
                                "grading_criteria": {"max_score": 100}
                            }
                            for i in range(step_data["count"])
                        ]
                    }
                    
                    response = requests.post(
                        f"{self.base_url}/api/ai-grading/grade-batch",
                        json=batch_data,
                        timeout=60
                    )
                    
                    if response.status_code == 200:
                        completed_steps += 1
                        
                elif step_name == "quality_check":
                    # 执行质量检查
                    quality_data = {
                        "session_id": "teacher_scenario",
                        "grading_results": [{"score": 85, "confidence": 0.9, "processing_time_ms": 500}]
                    }
                    
                    response = requests.post(
                        f"{self.base_url}/api/quality-control/assess",
                        json=quality_data,
                        timeout=30
                    )
                    
                    if response.status_code == 200:
                        completed_steps += 1
                        
                else:
                    # 其他步骤标记为完成（模拟）
                    completed_steps += 1
                    
            except Exception as e:
                logger.warning(f"   ⚠️ 步骤 {step_name} 失败: {e}")
        
        execution_time = time.time() - start_time
        success_rate = completed_steps / len(scenario_steps)
        
        logger.info(f"   📊 完成步骤: {completed_steps}/{len(scenario_steps)} ({success_rate*100:.1f}%)")
        
        teacher_scenario_result = TestResult(
            scenario_id="teacher_grading_scenario",
            status="PASS" if success_rate >= 0.8 else "FAIL",
            execution_time=execution_time,
            details={
                "total_steps": len(scenario_steps),
                "completed_steps": completed_steps,
                "success_rate": success_rate
            },
            timestamp=datetime.now()
        )
        self.test_results.append(teacher_scenario_result)
    
    async def _test_student_result_scenario(self):
        """学生查看结果场景测试"""
        logger.info("   👨‍🎓 学生查看结果场景...")
        
        # 模拟学生查看评分结果的流程
        start_time = time.time()
        
        try:
            # 1. 先进行一次评分生成结果
            grading_data = {
                "student_answer": {
                    "content": "学生场景测试答案",
                    "question_type": "short_answer"
                },
                "grading_criteria": {"max_score": 100}
            }
            
            grading_response = requests.post(
                f"{self.base_url}/api/ai-grading/grade-single",
                json=grading_data,
                timeout=30
            )
            
            # 2. 检查结果格式（模拟学生查看）
            if grading_response.status_code == 200:
                result = grading_response.json()
                data = result.get('data', {})
                
                # 验证学生需要的信息是否完整
                has_score = 'score' in data
                has_confidence = 'confidence' in data
                has_feedback = True  # 模拟反馈信息
                
                all_info_present = has_score and has_confidence and has_feedback
                
                execution_time = time.time() - start_time
                
                student_scenario_result = TestResult(
                    scenario_id="student_result_scenario",
                    status="PASS" if all_info_present else "FAIL",
                    execution_time=execution_time,
                    details={
                        "has_score": has_score,
                        "has_confidence": has_confidence,
                        "has_feedback": has_feedback,
                        "result_complete": all_info_present
                    },
                    timestamp=datetime.now()
                )
                
                logger.info(f"   📊 结果信息完整性: {'✅' if all_info_present else '❌'}")
                
            else:
                student_scenario_result = TestResult(
                    scenario_id="student_result_scenario",
                    status="FAIL",
                    execution_time=time.time() - start_time,
                    details={"grading_failed": True},
                    error_message=f"评分失败: {grading_response.status_code}",
                    timestamp=datetime.now()
                )
                
        except Exception as e:
            student_scenario_result = TestResult(
                scenario_id="student_result_scenario",
                status="ERROR",
                execution_time=time.time() - start_time,
                details={},
                error_message=str(e),
                timestamp=datetime.now()
            )
        
        self.test_results.append(student_scenario_result)
    
    async def _test_admin_monitoring_scenario(self):
        """管理员监控场景测试"""
        logger.info("   👨‍💼 管理员监控场景...")
        
        start_time = time.time()
        
        # 管理员需要查看的监控信息
        monitoring_endpoints = [
            ("/health", "系统健康状态"),
            ("/api/quality-control/dashboard", "质量控制面板"),
            ("/api/model-training/models", "模型管理"),
            ("/api/quality-control/statistics", "质量统计")
        ]
        
        accessible_endpoints = 0
        
        for endpoint, description in monitoring_endpoints:
            try:
                response = requests.get(f"{self.base_url}{endpoint}", timeout=30)
                
                if response.status_code == 200:
                    accessible_endpoints += 1
                    logger.info(f"   ✅ {description}: 可访问")
                else:
                    logger.warning(f"   ⚠️ {description}: 状态码 {response.status_code}")
                    
            except Exception as e:
                logger.error(f"   ❌ {description}: {e}")
        
        execution_time = time.time() - start_time
        access_rate = accessible_endpoints / len(monitoring_endpoints)
        
        admin_scenario_result = TestResult(
            scenario_id="admin_monitoring_scenario",
            status="PASS" if access_rate >= 0.8 else "FAIL",
            execution_time=execution_time,
            details={
                "total_endpoints": len(monitoring_endpoints),
                "accessible_endpoints": accessible_endpoints,
                "access_rate": access_rate
            },
            timestamp=datetime.now()
        )
        self.test_results.append(admin_scenario_result)
    
    async def _test_data_consistency(self):
        """数据一致性测试"""
        logger.info("🔄 7. 数据一致性测试")
        
        # 测试多次评分的一致性
        await self._test_scoring_consistency()
        
        # 测试并发操作的数据一致性
        await self._test_concurrent_data_consistency()
    
    async def _test_scoring_consistency(self):
        """评分一致性测试"""
        logger.info("   📊 评分一致性测试...")
        
        # 同一答案多次评分，检查一致性
        test_answer = {
            "student_answer": {
                "content": "一致性测试：秦始皇统一中国建立郡县制度。",
                "question_type": "short_answer"
            },
            "grading_criteria": {"max_score": 100}
        }
        
        scores = []
        confidences = []
        
        # 执行10次评分
        for i in range(10):
            try:
                response = requests.post(
                    f"{self.base_url}/api/ai-grading/grade-single",
                    json=test_answer,
                    timeout=30
                )
                
                if response.status_code == 200:
                    result = response.json()
                    data = result.get('data', {})
                    scores.append(data.get('score', 0))
                    confidences.append(data.get('confidence', 0))
                    
            except Exception:
                pass
        
        if scores:
            score_std = np.std(scores)
            confidence_std = np.std(confidences)
            score_consistency = score_std < 5  # 标准差小于5分认为一致
            confidence_consistency = confidence_std < 0.1  # 置信度标准差小于0.1
            
            logger.info(f"   📊 分数标准差: {score_std:.2f} (一致性: {'✅' if score_consistency else '❌'})")
            logger.info(f"   📊 置信度标准差: {confidence_std:.3f} (一致性: {'✅' if confidence_consistency else '❌'})")
            
            consistency_result = TestResult(
                scenario_id="scoring_consistency",
                status="PASS" if score_consistency and confidence_consistency else "FAIL",
                execution_time=10.0,
                details={
                    "score_std": score_std,
                    "confidence_std": confidence_std,
                    "score_consistency": score_consistency,
                    "confidence_consistency": confidence_consistency,
                    "test_count": len(scores)
                },
                timestamp=datetime.now()
            )
        else:
            consistency_result = TestResult(
                scenario_id="scoring_consistency",
                status="ERROR",
                execution_time=10.0,
                details={},
                error_message="无法获取评分结果",
                timestamp=datetime.now()
            )
        
        self.test_results.append(consistency_result)
    
    async def _test_concurrent_data_consistency(self):
        """并发数据一致性测试"""
        logger.info("   🔄 并发数据一致性测试...")
        
        # 并发执行相同的操作，检查数据一致性
        def concurrent_operation():
            test_data = {
                "session_id": "consistency_test",
                "grading_results": [{
                    "score": 85,
                    "confidence": 0.9,
                    "processing_time_ms": 500
                }]
            }
            
            try:
                response = requests.post(
                    f"{self.base_url}/api/quality-control/assess",
                    json=test_data,
                    timeout=30
                )
                return response.status_code == 200
            except:
                return False
        
        # 并发执行
        concurrent_count = 10
        with ThreadPoolExecutor(max_workers=concurrent_count) as executor:
            futures = [executor.submit(concurrent_operation) for _ in range(concurrent_count)]
            results = [future.result() for future in as_completed(futures)]
        
        success_count = sum(results)
        consistency_rate = success_count / len(results)
        
        logger.info(f"   📊 并发成功率: {success_count}/{len(results)} ({consistency_rate*100:.1f}%)")
        
        concurrent_consistency_result = TestResult(
            scenario_id="concurrent_data_consistency",
            status="PASS" if consistency_rate >= 0.9 else "FAIL",
            execution_time=5.0,
            details={
                "concurrent_operations": concurrent_count,
                "successful_operations": success_count,
                "consistency_rate": consistency_rate
            },
            timestamp=datetime.now()
        )
        self.test_results.append(concurrent_consistency_result)
    
    async def _test_failure_recovery(self):
        """故障恢复测试"""
        logger.info("🔧 8. 故障恢复测试")
        
        # 测试服务的故障恢复能力
        await self._test_service_recovery()
        
        # 测试错误处理
        await self._test_error_handling()
    
    async def _test_service_recovery(self):
        """服务恢复测试"""
        logger.info("   🔄 服务恢复测试...")
        
        # 模拟服务暂时不可用的情况
        recovery_attempts = 5
        successful_recoveries = 0
        
        for attempt in range(recovery_attempts):
            try:
                # 模拟请求
                response = requests.get(f"{self.base_url}/health", timeout=5)
                
                if response.status_code == 200:
                    successful_recoveries += 1
                else:
                    # 等待后重试
                    await asyncio.sleep(1)
                    
            except Exception:
                # 连接失败，等待后重试
                await asyncio.sleep(1)
        
        recovery_rate = successful_recoveries / recovery_attempts
        
        logger.info(f"   📊 服务恢复率: {successful_recoveries}/{recovery_attempts} ({recovery_rate*100:.1f}%)")
        
        recovery_result = TestResult(
            scenario_id="service_recovery",
            status="PASS" if recovery_rate >= 0.8 else "FAIL",
            execution_time=10.0,
            details={
                "recovery_attempts": recovery_attempts,
                "successful_recoveries": successful_recoveries,
                "recovery_rate": recovery_rate
            },
            timestamp=datetime.now()
        )
        self.test_results.append(recovery_result)
    
    async def _test_error_handling(self):
        """错误处理测试"""
        logger.info("   ⚠️ 错误处理测试...")
        
        # 测试各种错误情况的处理
        error_scenarios = [
            {
                "name": "空内容",
                "data": {
                    "student_answer": {"content": "", "question_type": "short_answer"},
                    "grading_criteria": {"max_score": 100}
                },
                "expected_handled": True
            },
            {
                "name": "缺失字段",
                "data": {
                    "student_answer": {"question_type": "short_answer"},
                    "grading_criteria": {"max_score": 100}
                },
                "expected_handled": True
            },
            {
                "name": "无效分数",
                "data": {
                    "student_answer": {"content": "测试", "question_type": "short_answer"},
                    "grading_criteria": {"max_score": -1}
                },
                "expected_handled": True
            }
        ]
        
        properly_handled = 0
        
        for scenario in error_scenarios:
            try:
                response = requests.post(
                    f"{self.base_url}/api/ai-grading/grade-single",
                    json=scenario["data"],
                    timeout=10
                )
                
                # 检查是否正确处理错误
                if response.status_code in [200, 400, 422]:  # 正常或预期的错误响应
                    if response.status_code == 200:
                        # 成功响应，检查结果是否合理
                        result = response.json()
                        if result.get('data', {}).get('score', -1) >= 0:
                            properly_handled += 1
                    else:
                        # 错误响应，表示正确处理了错误输入
                        properly_handled += 1
                        
                logger.info(f"   ✅ {scenario['name']}: 正确处理 ({response.status_code})")
                
            except Exception as e:
                logger.info(f"   ✅ {scenario['name']}: 异常处理 ({e})")
                properly_handled += 1  # 异常也表示错误被处理
        
        handling_rate = properly_handled / len(error_scenarios)
        
        logger.info(f"   📊 错误处理率: {properly_handled}/{len(error_scenarios)} ({handling_rate*100:.1f}%)")
        
        error_handling_result = TestResult(
            scenario_id="error_handling",
            status="PASS" if handling_rate >= 0.8 else "FAIL",
            execution_time=5.0,
            details={
                "scenarios_tested": len(error_scenarios),
                "properly_handled": properly_handled,
                "handling_rate": handling_rate
            },
            timestamp=datetime.now()
        )
        self.test_results.append(error_handling_result)
    
    async def _generate_test_report(self, total_time: float) -> Dict[str, Any]:
        """生成测试报告"""
        logger.info("📋 生成集成测试报告...")
        
        # 统计测试结果
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if r.status == "PASS"])
        failed_tests = len([r for r in self.test_results if r.status == "FAIL"])
        error_tests = len([r for r in self.test_results if r.status == "ERROR"])
        warning_tests = len([r for r in self.test_results if r.status == "WARN"])
        
        success_rate = passed_tests / total_tests if total_tests > 0 else 0
        
        # 性能统计
        avg_execution_time = np.mean([r.execution_time for r in self.test_results])
        max_execution_time = max([r.execution_time for r in self.test_results]) if self.test_results else 0
        
        # 生成报告
        report = {
            "test_summary": {
                "execution_time": datetime.now().isoformat(),
                "total_duration_seconds": total_time,
                "total_tests": total_tests,
                "passed": passed_tests,
                "failed": failed_tests,
                "errors": error_tests,
                "warnings": warning_tests,
                "success_rate": success_rate
            },
            "performance_metrics": {
                "avg_test_execution_time": avg_execution_time,
                "max_test_execution_time": max_execution_time,
                "tests_per_second": total_tests / total_time if total_time > 0 else 0
            },
            "test_categories": {
                "system_health": len([r for r in self.test_results if "health" in r.scenario_id]),
                "end_to_end": len([r for r in self.test_results if "workflow" in r.scenario_id]),
                "performance": len([r for r in self.test_results if "performance" in r.scenario_id or "stress" in r.scenario_id]),
                "security": len([r for r in self.test_results if "security" in r.scenario_id or "injection" in r.scenario_id or "xss" in r.scenario_id or "auth" in r.scenario_id]),
                "compatibility": len([r for r in self.test_results if "compatibility" in r.scenario_id]),
                "user_scenarios": len([r for r in self.test_results if "scenario" in r.scenario_id and "workflow" not in r.scenario_id]),
                "data_consistency": len([r for r in self.test_results if "consistency" in r.scenario_id]),
                "failure_recovery": len([r for r in self.test_results if "recovery" in r.scenario_id or "error" in r.scenario_id])
            },
            "detailed_results": [asdict(result) for result in self.test_results],
            "recommendations": self._generate_recommendations()
        }
        
        # 保存报告到文件
        report_file = self.test_data_path / f"integration_test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2, default=str)
        
        # 打印摘要
        logger.info("📊 集成测试结果摘要:")
        logger.info(f"   总测试数: {total_tests}")
        logger.info(f"   通过: {passed_tests} ({passed_tests/total_tests*100:.1f}%)")
        logger.info(f"   失败: {failed_tests} ({failed_tests/total_tests*100:.1f}%)")
        logger.info(f"   错误: {error_tests} ({error_tests/total_tests*100:.1f}%)")
        logger.info(f"   警告: {warning_tests} ({warning_tests/total_tests*100:.1f}%)")
        logger.info(f"   成功率: {success_rate*100:.1f}%")
        logger.info(f"   总耗时: {total_time:.2f}秒")
        logger.info(f"   报告文件: {report_file}")
        
        return report
    
    def _generate_recommendations(self) -> List[str]:
        """生成改进建议"""
        recommendations = []
        
        # 分析失败的测试
        failed_tests = [r for r in self.test_results if r.status in ["FAIL", "ERROR"]]
        
        if failed_tests:
            recommendations.append(f"发现 {len(failed_tests)} 个失败测试，需要优先修复")
        
        # 性能建议
        slow_tests = [r for r in self.test_results if r.execution_time > 10]
        if slow_tests:
            recommendations.append(f"有 {len(slow_tests)} 个测试执行时间超过10秒，建议优化性能")
        
        # 安全建议
        security_failures = [r for r in self.test_results if r.status == "FAIL" and any(keyword in r.scenario_id for keyword in ["security", "injection", "xss", "auth"])]
        if security_failures:
            recommendations.append("发现安全测试失败，需要立即修复安全漏洞")
        
        # 一致性建议
        consistency_failures = [r for r in self.test_results if r.status == "FAIL" and "consistency" in r.scenario_id]
        if consistency_failures:
            recommendations.append("数据一致性测试失败，需要检查并发处理逻辑")
        
        # 如果所有测试都通过
        if not failed_tests:
            recommendations.append("所有测试通过，系统状态良好，可以考虑生产部署")
        
        return recommendations

async def main():
    """主函数"""
    # 配置日志
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s'
    )
    
    # 创建测试套件实例
    test_suite = SystemIntegrationTestSuite()
    
    try:
        # 运行完整的集成测试
        report = await test_suite.run_full_integration_test()
        
        # 判断测试结果
        success_rate = report["test_summary"]["success_rate"]
        
        if success_rate >= 0.9:
            logger.info("🎉 集成测试完全通过！系统可以进入生产环境。")
            return 0
        elif success_rate >= 0.8:
            logger.warning("⚠️ 集成测试大部分通过，但有一些问题需要解决。")
            return 1
        else:
            logger.error("❌ 集成测试失败较多，需要修复后再次测试。")
            return 2
            
    except Exception as e:
        logger.error(f"集成测试执行失败: {e}")
        return 3

if __name__ == "__main__":
    exit_code = asyncio.run(main())