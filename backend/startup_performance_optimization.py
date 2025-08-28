#!/usr/bin/env python3
"""
Performance Optimization and Service Decoupling Demo
智阅3.0性能优化和服务解耦演示启动脚本
"""

import asyncio
import json
import logging
import sys
import time
from datetime import datetime
from pathlib import Path

# 添加项目路径
sys.path.append(str(Path(__file__).parent))

from services.service_mesh import ServiceRegistry, ServiceInstance, ServiceDefinition, LoadBalancingStrategy, ServiceMeshClient
from services.async_pipeline import PipelineOrchestrator, TaskDefinition, TaskPriority, PreprocessingProcessor, OCRProcessor, GradingProcessor
from services.fault_tolerance import FaultToleranceManager, CircuitBreakerConfig, RetryConfig, fault_tolerant
from services.apm_monitoring import APMSystem, monitor_performance
from services.service_discovery import ServiceDiscoverySystem, ServiceEndpoint
from services.api_gateway import APIGateway, RouteConfig, RateLimitRule, RateLimitType, AuthRule, AuthType

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class PerformanceOptimizationDemo:
    """性能优化和服务解耦演示"""
    
    def __init__(self):
        self.service_registry = None
        self.pipeline_orchestrator = None
        self.fault_tolerance_manager = None
        self.apm_system = None
        self.service_discovery = None
        self.api_gateway = None
        
    async def initialize_systems(self):
        """初始化所有系统"""
        print("🚀 Initializing Performance Optimization Systems...")
        
        # 1. 初始化服务网格
        print("🌐 Setting up Service Mesh...")
        self.service_registry = ServiceRegistry()
        await self.service_registry.start()
        
        # 注册服务定义
        services = [
            ServiceDefinition(
                service_id="ocr-service",
                name="OCR Processing Service",
                version="2.0.0",
                load_balancing_strategy=LoadBalancingStrategy.LEAST_RESPONSE_TIME
            ),
            ServiceDefinition(
                service_id="grading-service",
                name="AI Grading Service", 
                version="2.0.0",
                load_balancing_strategy=LoadBalancingStrategy.WEIGHTED_ROUND_ROBIN
            ),
            ServiceDefinition(
                service_id="preprocessing-service",
                name="Image Preprocessing Service",
                version="1.0.0",
                load_balancing_strategy=LoadBalancingStrategy.ROUND_ROBIN
            )
        ]
        
        for service_def in services:
            self.service_registry.register_service(service_def)
            
        # 注册服务实例
        instances = [
            ServiceInstance("ocr-service", "ocr-1", "localhost", 8001, weight=100),
            ServiceInstance("ocr-service", "ocr-2", "localhost", 8002, weight=150),
            ServiceInstance("ocr-service", "ocr-3", "localhost", 8003, weight=200),
            ServiceInstance("grading-service", "grading-1", "localhost", 9001, weight=100),
            ServiceInstance("grading-service", "grading-2", "localhost", 9002, weight=150),
            ServiceInstance("preprocessing-service", "prep-1", "localhost", 7001, weight=100),
        ]
        
        for instance in instances:
            self.service_registry.register_instance(instance)
            
        # 2. 初始化异步处理管道
        print("⚙️ Setting up Async Processing Pipeline...")
        self.pipeline_orchestrator = PipelineOrchestrator()
        
        # 注册处理器
        self.pipeline_orchestrator.register_processor(PreprocessingProcessor())
        self.pipeline_orchestrator.register_processor(OCRProcessor())
        self.pipeline_orchestrator.register_processor(GradingProcessor())
        
        # 定义处理管道
        from services.async_pipeline import PipelineStage
        self.pipeline_orchestrator.define_pipeline("high_performance_grading", [
            PipelineStage.PREPROCESSING,
            PipelineStage.OCR_PROCESSING,
            PipelineStage.GRADING_ANALYSIS
        ])
        
        await self.pipeline_orchestrator.start()
        
        # 3. 初始化容错管理
        print("🛡️ Setting up Fault Tolerance...")
        self.fault_tolerance_manager = FaultToleranceManager()
        
        # 创建熔断器
        cb_configs = [
            ("ocr_service", CircuitBreakerConfig(failure_threshold=3, timeout=30.0)),
            ("grading_service", CircuitBreakerConfig(failure_threshold=5, timeout=60.0)),
            ("preprocessing_service", CircuitBreakerConfig(failure_threshold=2, timeout=15.0))
        ]
        
        for name, config in cb_configs:
            self.fault_tolerance_manager.create_circuit_breaker(name, config)
            
        # 创建重试处理器
        retry_configs = [
            ("ocr_retry", RetryConfig(max_attempts=3, base_delay=1.0)),
            ("grading_retry", RetryConfig(max_attempts=2, base_delay=2.0)),
        ]
        
        for name, config in retry_configs:
            self.fault_tolerance_manager.create_retry_handler(name, config)
            
        # 创建隔离舱
        bulkheads = [
            ("ocr_bulkhead", 10),
            ("grading_bulkhead", 8),
            ("preprocessing_bulkhead", 5)
        ]
        
        for name, size in bulkheads:
            self.fault_tolerance_manager.create_bulkhead(name, size)
            
        # 4. 初始化APM系统
        print("📊 Setting up APM Monitoring...")
        self.apm_system = APMSystem()
        await self.apm_system.start()
        
        # 5. 初始化服务发现
        print("🔍 Setting up Service Discovery...")
        self.service_discovery = ServiceDiscoverySystem()
        await self.service_discovery.start()
        
        registry = self.service_discovery.get_registry()
        config_manager = self.service_discovery.get_config_manager()
        
        # 注册服务端点到服务发现
        service_endpoints = [
            ("ocr-service", [
                ServiceEndpoint("ocr-service", "ocr-1", "localhost", 8001),
                ServiceEndpoint("ocr-service", "ocr-2", "localhost", 8002),
                ServiceEndpoint("ocr-service", "ocr-3", "localhost", 8003),
            ]),
            ("grading-service", [
                ServiceEndpoint("grading-service", "grading-1", "localhost", 9001),
                ServiceEndpoint("grading-service", "grading-2", "localhost", 9002),
            ]),
            ("preprocessing-service", [
                ServiceEndpoint("preprocessing-service", "prep-1", "localhost", 7001),
            ])
        ]
        
        for service_name, endpoints in service_endpoints:
            from services.service_discovery import ServiceDefinition as SDServiceDefinition
            service_def = SDServiceDefinition(
                name=service_name,
                version="2.0.0",
                environment="production"
            )
            
            for endpoint in endpoints:
                service_def.add_endpoint(endpoint)
                
            await registry.register_service(service_def)
            
        # 设置配置
        configs = [
            ("performance.max_concurrent_requests", 1000),
            ("performance.request_timeout", 30),
            ("performance.enable_caching", True),
            ("performance.cache_ttl", 300),
            ("monitoring.metrics_enabled", True),
            ("monitoring.tracing_enabled", True),
            ("monitoring.sampling_rate", 1.0),
            ("load_balancing.strategy", "least_response_time"),
            ("circuit_breaker.failure_threshold", 5),
            ("circuit_breaker.timeout", 60)
        ]
        
        for key, value in configs:
            await config_manager.set_configuration(key, value)
            
        # 6. 初始化API网关
        print("🌉 Setting up API Gateway...")
        self.api_gateway = APIGateway(host="localhost", port=8080)
        
        # 添加路由
        routes = [
            RouteConfig(
                path="/api/v2/ocr/*",
                methods=["POST"],
                upstream="http://localhost:8001",
                strip_path=True,
                add_headers={"X-Service": "OCR-v2", "X-Version": "2.0.0"}
            ),
            RouteConfig(
                path="/api/v2/grading/*", 
                methods=["POST"],
                upstream="http://localhost:9001",
                strip_path=True,
                add_headers={"X-Service": "Grading-v2", "X-Version": "2.0.0"}
            ),
            RouteConfig(
                path="/api/v2/preprocessing/*",
                methods=["POST"],
                upstream="http://localhost:7001",
                strip_path=True,
                add_headers={"X-Service": "Preprocessing-v1"}
            ),
            RouteConfig(
                path="/health",
                methods=["GET"],
                upstream="http://localhost:8080",
                auth_required=False,
                rate_limit_enabled=False
            ),
            RouteConfig(
                path="/metrics",
                methods=["GET"],
                upstream="http://localhost:8080",
                auth_required=False,
                rate_limit_enabled=False
            )
        ]
        
        for route in routes:
            self.api_gateway.add_route(route)
            
        # 设置高级限流规则
        advanced_rate_limits = [
            RateLimitRule(
                name="premium_api_limit",
                limit_type=RateLimitType.PER_API_KEY,
                max_requests=10000,
                window_seconds=3600,
                paths=["/api/v2/*"]
            ),
            RateLimitRule(
                name="ocr_intensive_limit",
                limit_type=RateLimitType.PER_IP,
                max_requests=50,
                window_seconds=60,
                paths=["/api/v2/ocr/*"]
            ),
            RateLimitRule(
                name="grading_burst_limit",
                limit_type=RateLimitType.PER_USER,
                max_requests=20,
                window_seconds=10,
                paths=["/api/v2/grading/*"]
            )
        ]
        
        for rule in advanced_rate_limits:
            self.api_gateway.rate_limiter.add_rule(rule)
            
        # 设置高级认证规则
        auth_rules = [
            AuthRule(
                name="premium_endpoints",
                auth_type=AuthType.JWT,
                paths=["/api/v2/premium/*"],
                required_scopes=["premium", "write"]
            ),
            AuthRule(
                name="standard_api",
                auth_type=AuthType.API_KEY,
                paths=["/api/v2/*"],
                required_scopes=["read", "write"]
            )
        ]
        
        for rule in auth_rules:
            self.api_gateway.authenticator.add_rule(rule)
            
        # 添加高级API密钥
        api_keys = [
            ("zhiyue_premium_key", "premium_user", ["read", "write", "premium", "admin"]),
            ("zhiyue_standard_key", "standard_user", ["read", "write"]),
            ("zhiyue_readonly_key", "readonly_user", ["read"])
        ]
        
        for key, user, scopes in api_keys:
            self.api_gateway.authenticator.add_api_key(key, user, scopes)
            
        await self.api_gateway.start()
        
        print("✅ All Systems Initialized Successfully!")
        
    async def demonstrate_service_mesh_performance(self):
        """演示服务网格性能"""
        print("\n🌐 Demonstrating Service Mesh Performance...")
        
        client = ServiceMeshClient(self.service_registry)
        
        async with client:
            # 并发服务调用测试
            print("🔄 Testing concurrent service calls...")
            
            tasks = []
            for i in range(50):  # 50个并发请求
                task = asyncio.create_task(
                    client.call_service("ocr-service", "/process", "POST", 
                                      {"test_data": f"request_{i}"})
                )
                tasks.append(task)
                
            start_time = time.time()
            results = await asyncio.gather(*tasks, return_exceptions=True)
            duration = time.time() - start_time
            
            successful = len([r for r in results if not isinstance(r, Exception)])
            failed = len(results) - successful
            
            print(f"  📊 Results: {successful} successful, {failed} failed in {duration:.2f}s")
            print(f"  ⚡ Throughput: {len(results)/duration:.1f} requests/sec")
            
            # 获取服务统计
            stats = self.service_registry.get_service_stats()
            print(f"  📈 Service Stats:")
            for service_id, service_info in stats['services'].items():
                healthy = service_info['healthy_instances']
                total = service_info['total_instances']
                print(f"    {service_id}: {healthy}/{total} healthy instances")
                
    async def demonstrate_pipeline_performance(self):
        """演示管道性能"""
        print("\n⚙️ Demonstrating Pipeline Performance...")
        
        # 创建测试文件
        test_file = Path("./test_performance.jpg")
        test_file.touch()  # 创建空文件用于测试
        
        try:
            # 提交高优先级管道任务
            print("🚀 Submitting high-priority pipeline tasks...")
            
            pipeline_tasks = []
            for i in range(20):  # 20个管道任务
                pipeline_input = {
                    'file_path': str(test_file),
                    'subject': 'math',
                    'answer_key': {'q1': 'A', 'q2': 'B', 'q3': 'C'},
                    'batch_id': f"batch_{i}"
                }
                
                task_ids = await self.pipeline_orchestrator.submit_pipeline(
                    "high_performance_grading", pipeline_input
                )
                pipeline_tasks.extend(task_ids)
                
            print(f"  📋 Submitted {len(pipeline_tasks)} pipeline tasks")
            
            # 监控执行进度
            completed_count = 0
            start_time = time.time()
            
            while completed_count < len(pipeline_tasks) and time.time() - start_time < 60:
                await asyncio.sleep(2)
                
                new_completed = 0
                for task_id in pipeline_tasks:
                    status = await self.pipeline_orchestrator.get_task_status(task_id)
                    if status and status.status.value in ['completed', 'failed']:
                        new_completed += 1
                        
                if new_completed > completed_count:
                    completed_count = new_completed
                    progress = (completed_count / len(pipeline_tasks)) * 100
                    print(f"  📊 Progress: {completed_count}/{len(pipeline_tasks)} ({progress:.1f}%)")
                    
            # 获取管道统计
            pipeline_stats = self.pipeline_orchestrator.get_pipeline_stats()
            print(f"  📈 Pipeline Stats:")
            print(f"    Average Processing Time: {pipeline_stats['orchestrator_stats']['average_processing_time']:.2f}s")
            print(f"    Completed Tasks: {pipeline_stats['orchestrator_stats']['completed_tasks']}")
            print(f"    Failed Tasks: {pipeline_stats['orchestrator_stats']['failed_tasks']}")
            
        finally:
            if test_file.exists():
                test_file.unlink()
                
    async def demonstrate_fault_tolerance(self):
        """演示容错能力"""
        print("\n🛡️ Demonstrating Fault Tolerance...")
        
        # 创建容错装饰的服务调用
        @fault_tolerant(
            circuit_breaker_config=CircuitBreakerConfig(failure_threshold=3, timeout=10.0),
            retry_config=RetryConfig(max_attempts=3, base_delay=0.5),
            bulkhead_size=5
        )
        async def unstable_service_call(failure_rate: float = 0.3):
            """模拟不稳定的服务调用"""
            await asyncio.sleep(0.1)
            
            import random
            if random.random() < failure_rate:
                raise Exception("Service temporarily unavailable")
                
            return {"status": "success", "data": f"processed_at_{time.time()}"}
            
        # 测试正常情况
        print("  ✅ Testing normal operation...")
        success_count = 0
        for i in range(20):
            try:
                result = await unstable_service_call(failure_rate=0.1)
                success_count += 1
            except Exception:
                pass
                
        print(f"    Success rate: {success_count}/20 ({success_count/20*100:.1f}%)")
        
        # 测试高失败率
        print("  ⚠️ Testing high failure rate...")
        success_count = 0
        circuit_breaker_count = 0
        
        for i in range(30):
            try:
                result = await unstable_service_call(failure_rate=0.8)
                success_count += 1
            except Exception as e:
                if "circuit breaker" in str(e).lower():
                    circuit_breaker_count += 1
                    
        print(f"    Success rate: {success_count}/30 ({success_count/30*100:.1f}%)")
        print(f"    Circuit breaker triggers: {circuit_breaker_count}")
        
        # 获取系统健康状况
        health = self.fault_tolerance_manager.get_system_health()
        print(f"  🏥 System Health: {health['overall_health']}")
        
    async def demonstrate_monitoring(self):
        """演示监控系统"""
        print("\n📊 Demonstrating APM Monitoring...")
        
        # 创建监控装饰的函数
        @monitor_performance("demo_operation", "demo_service")
        async def monitored_operation(complexity: str = "simple"):
            """被监控的操作"""
            if complexity == "simple":
                await asyncio.sleep(0.1)
            elif complexity == "medium":
                await asyncio.sleep(0.5)
            else:  # complex
                await asyncio.sleep(1.0)
                
            return {"result": f"completed_{complexity}_operation"}
            
        # 设置APM实例到函数上
        monitored_operation._apm_instance = self.apm_system
        
        # 生成监控数据
        print("  📈 Generating monitoring data...")
        
        operations = ["simple"] * 30 + ["medium"] * 15 + ["complex"] * 5
        
        tasks = []
        for i, complexity in enumerate(operations):
            task = asyncio.create_task(monitored_operation(complexity))
            tasks.append(task)
            
            if i % 10 == 0:  # 每10个任务暂停一下
                await asyncio.sleep(0.1)
                
        results = await asyncio.gather(*tasks, return_exceptions=True)
        successful = len([r for r in results if not isinstance(r, Exception)])
        
        print(f"    Executed {len(results)} operations, {successful} successful")
        
        # 等待指标收集
        await asyncio.sleep(2)
        
        # 获取监控数据
        dashboard_data = self.apm_system.get_dashboard_data()
        overview = dashboard_data['overview']
        
        print(f"  📊 Monitoring Overview:")
        print(f"    Total Metrics: {overview['metrics_summary']['total_metrics']}")
        print(f"    Active Traces: {overview['trace_summary']['active_traces']}")
        print(f"    Completed Traces: {overview['trace_summary']['completed_traces']}")
        print(f"    System Health: Good" if overview['active_alerts'] == 0 else f"Alerts: {overview['active_alerts']}")
        
    async def demonstrate_service_discovery(self):
        """演示服务发现"""
        print("\n🔍 Demonstrating Service Discovery...")
        
        client = self.service_discovery.get_client()
        config_manager = self.service_discovery.get_config_manager()
        
        # 服务发现测试
        print("  🔍 Testing service discovery...")
        
        services_to_discover = ["ocr-service", "grading-service", "preprocessing-service"]
        
        for service_name in services_to_discover:
            service = await client.discover(service_name)
            if service:
                healthy_endpoints = service.get_healthy_endpoints()
                print(f"    {service_name}: {len(healthy_endpoints)} healthy endpoints")
            else:
                print(f"    {service_name}: not found")
                
        # 配置管理测试
        print("  ⚙️ Testing configuration management...")
        
        # 动态更新配置
        await config_manager.set_configuration("performance.max_concurrent_requests", 2000)
        await config_manager.set_configuration("monitoring.sampling_rate", 0.5)
        
        # 读取配置
        max_requests = client.get_config("performance.max_concurrent_requests")
        sampling_rate = client.get_config("monitoring.sampling_rate")
        caching_enabled = client.get_config("performance.enable_caching")
        
        print(f"    Max concurrent requests: {max_requests}")
        print(f"    Sampling rate: {sampling_rate}")
        print(f"    Caching enabled: {caching_enabled}")
        
        # 获取系统状态
        status = self.service_discovery.get_system_status()
        print(f"  📈 Discovery System: {status['services_count']} services, {status['configurations_count']} configs")
        
    async def demonstrate_api_gateway_performance(self):
        """演示API网关性能"""
        print("\n🌉 Demonstrating API Gateway Performance...")
        
        print("  🚀 API Gateway is running on http://localhost:8080")
        print("  📋 Available endpoints:")
        print("    POST /api/v2/ocr/* (API Key: zhiyue_premium_key)")
        print("    POST /api/v2/grading/* (API Key: zhiyue_standard_key)")
        print("    GET  /health (no auth)")
        print("    GET  /metrics (no auth)")
        
        # 获取网关统计
        stats = self.api_gateway.get_stats()
        print(f"  📊 Gateway Stats:")
        print(f"    Routes: {stats['routes_count']}")
        print(f"    Total Requests: {stats['stats']['total_requests']}")
        print(f"    Success Rate: {stats['stats']['successful_requests']}/{stats['stats']['total_requests']}")
        if stats['stats']['average_response_time'] > 0:
            print(f"    Avg Response Time: {stats['stats']['average_response_time']*1000:.2f}ms")
            
        print("\n  💡 Test the gateway with:")
        print("    curl -H 'X-API-Key: zhiyue_premium_key' -X POST http://localhost:8080/api/v2/ocr/process")
        print("    curl http://localhost:8080/health")
        
    async def get_comprehensive_performance_report(self):
        """获取综合性能报告"""
        print("\n📈 Comprehensive Performance Report")
        print("=" * 50)
        
        # 服务网格统计
        service_stats = self.service_registry.get_service_stats()
        print(f"🌐 Service Mesh:")
        print(f"  Services: {service_stats['total_services']}")
        print(f"  Instances: {service_stats['total_instances']}")
        
        # 管道统计
        pipeline_stats = self.pipeline_orchestrator.get_pipeline_stats()
        print(f"\n⚙️ Processing Pipeline:")
        print(f"  Completed Tasks: {pipeline_stats['orchestrator_stats']['completed_tasks']}")
        print(f"  Failed Tasks: {pipeline_stats['orchestrator_stats']['failed_tasks']}")
        print(f"  Running Tasks: {pipeline_stats['running_tasks']}")
        print(f"  Avg Processing Time: {pipeline_stats['orchestrator_stats']['average_processing_time']:.2f}s")
        
        # 容错统计
        ft_health = self.fault_tolerance_manager.get_system_health()
        print(f"\n🛡️ Fault Tolerance:")
        print(f"  Overall Health: {ft_health['overall_health']}")
        print(f"  Circuit Breakers: {len(ft_health['circuit_breakers'])}")
        
        # 监控统计
        apm_overview = self.apm_system.get_system_overview()
        print(f"\n📊 APM Monitoring:")
        print(f"  Total Metrics: {apm_overview['metrics_summary']['total_metrics']}")
        print(f"  Active Traces: {apm_overview['trace_summary']['active_traces']}")
        print(f"  System Status: {apm_overview['status']}")
        
        # 服务发现统计
        sd_status = self.service_discovery.get_system_status()
        print(f"\n🔍 Service Discovery:")
        print(f"  Registered Services: {sd_status['services_count']}")
        print(f"  Configurations: {sd_status['configurations_count']}")
        
        # API网关统计
        gateway_stats = self.api_gateway.get_stats()
        print(f"\n🌉 API Gateway:")
        print(f"  Total Requests: {gateway_stats['stats']['total_requests']}")
        print(f"  Success Rate: {gateway_stats['stats']['successful_requests']}/{gateway_stats['stats']['total_requests']}")
        print(f"  Blocked Requests: {gateway_stats['stats']['blocked_requests']}")
        if gateway_stats['stats']['average_response_time'] > 0:
            print(f"  Avg Response Time: {gateway_stats['stats']['average_response_time']*1000:.2f}ms")
            
        print("\n" + "=" * 50)
        print("🎉 Performance Optimization Demo Completed Successfully!")
        
    async def cleanup(self):
        """清理资源"""
        print("\n🧹 Cleaning up resources...")
        
        if self.api_gateway:
            await self.api_gateway.stop()
            
        if self.service_discovery:
            await self.service_discovery.stop()
            
        if self.apm_system:
            await self.apm_system.stop()
            
        if self.pipeline_orchestrator:
            await self.pipeline_orchestrator.stop()
            
        if self.service_registry:
            await self.service_registry.stop()
            
        print("✅ Cleanup completed!")

async def run_performance_demo():
    """运行性能优化演示"""
    demo = PerformanceOptimizationDemo()
    
    try:
        # 初始化所有系统
        await demo.initialize_systems()
        
        # 等待系统稳定
        print("\n⏳ Waiting for systems to stabilize...")
        await asyncio.sleep(5)
        
        # 演示各个功能
        await demo.demonstrate_service_mesh_performance()
        await demo.demonstrate_pipeline_performance()
        await demo.demonstrate_fault_tolerance()
        await demo.demonstrate_monitoring()
        await demo.demonstrate_service_discovery()
        await demo.demonstrate_api_gateway_performance()
        
        # 生成综合报告
        await demo.get_comprehensive_performance_report()
        
        # 保持API网关运行以供测试
        print("\n🚀 Systems are running. API Gateway available at http://localhost:8080")
        print("Press Ctrl+C to shutdown...")
        
        try:
            while True:
                await asyncio.sleep(10)
                # 定期输出简要统计
                gateway_stats = demo.api_gateway.get_stats()
                if gateway_stats['stats']['total_requests'] > 0:
                    print(f"📊 Gateway: {gateway_stats['stats']['total_requests']} total requests, "
                          f"{gateway_stats['stats']['successful_requests']} successful")
        except KeyboardInterrupt:
            print("\n👋 Shutting down systems...")
        
    except Exception as e:
        print(f"❌ Demo failed: {str(e)}")
        logger.exception("Demo error")
    finally:
        await demo.cleanup()

def main():
    """主函数"""
    print("=" * 80)
    print("🚀 Smart Reading 3.0 Performance Optimization & Service Decoupling Demo")
    print("=" * 80)
    print()
    print("This comprehensive demo showcases:")
    print("✅ Service Mesh Architecture with Load Balancing")
    print("✅ Async Processing Pipeline for OCR and Grading")
    print("✅ Circuit Breaker and Fault Tolerance Patterns")
    print("✅ Comprehensive Performance Monitoring (APM)")
    print("✅ Service Discovery and Configuration Management")
    print("✅ API Gateway with Rate Limiting and Authentication")
    print()
    print("🎯 Key Performance Features:")
    print("• Multi-instance load balancing with health checks")
    print("• High-throughput async pipeline processing")
    print("• Circuit breaker protection and auto-recovery")
    print("• Real-time performance monitoring and alerting")
    print("• Dynamic service discovery and configuration")
    print("• Advanced API gateway with security and rate limiting")
    print()
    
    try:
        asyncio.run(run_performance_demo())
    except KeyboardInterrupt:
        print("\n👋 Demo interrupted by user")
    except Exception as e:
        print(f"\n❌ Demo failed: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()