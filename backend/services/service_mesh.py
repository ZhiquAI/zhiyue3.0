"""
Service Mesh Architecture with Load Balancing
智阅3.0服务网格架构实现
"""

import asyncio
import json
import logging
import time
import hashlib
from abc import ABC, abstractmethod
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, List, Optional, Any, Callable, Set, Tuple
from collections import defaultdict, deque
import aiohttp
import random
import uuid
from contextlib import asynccontextmanager
import weakref

logger = logging.getLogger(__name__)

class ServiceStatus(str, Enum):
    """服务状态"""
    HEALTHY = "healthy"
    UNHEALTHY = "unhealthy"
    UNKNOWN = "unknown"
    DEGRADED = "degraded"

class LoadBalancingStrategy(str, Enum):
    """负载均衡策略"""
    ROUND_ROBIN = "round_robin"
    WEIGHTED_ROUND_ROBIN = "weighted_round_robin"
    LEAST_CONNECTIONS = "least_connections"
    LEAST_RESPONSE_TIME = "least_response_time"
    CONSISTENT_HASH = "consistent_hash"
    RANDOM = "random"

class ProtocolType(str, Enum):
    """协议类型"""
    HTTP = "http"
    HTTPS = "https"
    GRPC = "grpc"
    WEBSOCKET = "websocket"

@dataclass
class ServiceInstance:
    """服务实例"""
    service_id: str
    instance_id: str
    host: str
    port: int
    protocol: ProtocolType = ProtocolType.HTTP
    weight: int = 100
    tags: Dict[str, str] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    # 健康状态
    status: ServiceStatus = ServiceStatus.UNKNOWN
    last_health_check: datetime = field(default_factory=datetime.now)
    health_check_failures: int = 0
    
    # 性能指标
    active_connections: int = 0
    total_requests: int = 0
    failed_requests: int = 0
    avg_response_time: float = 0.0
    last_request_time: datetime = field(default_factory=datetime.now)
    
    @property
    def url(self) -> str:
        """获取服务URL"""
        return f"{self.protocol.value}://{self.host}:{self.port}"
    
    @property
    def health_score(self) -> float:
        """健康评分 (0-100)"""
        if self.status == ServiceStatus.HEALTHY:
            base_score = 100
        elif self.status == ServiceStatus.DEGRADED:
            base_score = 50
        elif self.status == ServiceStatus.UNHEALTHY:
            base_score = 0
        else:
            base_score = 25  # UNKNOWN
            
        # 根据失败率调整
        if self.total_requests > 0:
            success_rate = (self.total_requests - self.failed_requests) / self.total_requests
            base_score *= success_rate
            
        # 根据响应时间调整
        if self.avg_response_time > 0:
            time_penalty = min(self.avg_response_time / 1000, 0.5)  # 最多扣50分
            base_score *= (1 - time_penalty)
            
        return max(0, min(100, base_score))
    
    def update_request_stats(self, response_time: float, success: bool):
        """更新请求统计"""
        self.total_requests += 1
        if not success:
            self.failed_requests += 1
            
        # 更新平均响应时间 (指数移动平均)
        alpha = 0.1
        if self.avg_response_time == 0:
            self.avg_response_time = response_time
        else:
            self.avg_response_time = alpha * response_time + (1 - alpha) * self.avg_response_time
            
        self.last_request_time = datetime.now()
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

@dataclass
class ServiceDefinition:
    """服务定义"""
    service_id: str
    name: str
    version: str = "1.0.0"
    description: str = ""
    health_check_path: str = "/health"
    health_check_interval: int = 30  # 秒
    health_check_timeout: int = 5    # 秒
    max_failure_count: int = 3
    load_balancing_strategy: LoadBalancingStrategy = LoadBalancingStrategy.ROUND_ROBIN
    circuit_breaker_enabled: bool = True
    timeout: int = 30  # 请求超时

class HealthChecker:
    """健康检查器"""
    
    def __init__(self, timeout: int = 5):
        self.timeout = timeout
        self.session: Optional[aiohttp.ClientSession] = None
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=self.timeout)
        )
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
            
    async def check_health(self, instance: ServiceInstance, health_check_path: str = "/health") -> bool:
        """检查服务实例健康状态"""
        if not self.session:
            return False
            
        try:
            url = f"{instance.url}{health_check_path}"
            start_time = time.time()
            
            async with self.session.get(url) as response:
                response_time = time.time() - start_time
                
                if response.status == 200:
                    # 更新健康状态
                    instance.status = ServiceStatus.HEALTHY
                    instance.health_check_failures = 0
                    instance.last_health_check = datetime.now()
                    
                    # 更新响应时间统计
                    instance.update_request_stats(response_time * 1000, True)
                    
                    logger.debug(f"Health check passed for {instance.instance_id}: {response_time*1000:.2f}ms")
                    return True
                else:
                    logger.warning(f"Health check failed for {instance.instance_id}: HTTP {response.status}")
                    return False
                    
        except asyncio.TimeoutError:
            logger.warning(f"Health check timeout for {instance.instance_id}")
            return False
        except Exception as e:
            logger.error(f"Health check error for {instance.instance_id}: {str(e)}")
            return False
            
        # 健康检查失败
        instance.health_check_failures += 1
        instance.last_health_check = datetime.now()
        
        if instance.health_check_failures >= 3:
            instance.status = ServiceStatus.UNHEALTHY
        elif instance.health_check_failures >= 1:
            instance.status = ServiceStatus.DEGRADED
            
        return False

class LoadBalancer(ABC):
    """负载均衡器接口"""
    
    @abstractmethod
    def select_instance(self, instances: List[ServiceInstance]) -> Optional[ServiceInstance]:
        """选择服务实例"""
        pass
        
    @abstractmethod
    def update_instance_stats(self, instance: ServiceInstance, response_time: float, success: bool):
        """更新实例统计"""
        pass

class RoundRobinBalancer(LoadBalancer):
    """轮询负载均衡器"""
    
    def __init__(self):
        self.current_index = 0
        
    def select_instance(self, instances: List[ServiceInstance]) -> Optional[ServiceInstance]:
        if not instances:
            return None
            
        # 过滤健康实例
        healthy_instances = [i for i in instances if i.status == ServiceStatus.HEALTHY]
        if not healthy_instances:
            # 如果没有健康实例，尝试使用降级实例
            healthy_instances = [i for i in instances if i.status == ServiceStatus.DEGRADED]
            
        if not healthy_instances:
            return None
            
        selected = healthy_instances[self.current_index % len(healthy_instances)]
        self.current_index += 1
        
        return selected
        
    def update_instance_stats(self, instance: ServiceInstance, response_time: float, success: bool):
        instance.update_request_stats(response_time, success)

class WeightedRoundRobinBalancer(LoadBalancer):
    """加权轮询负载均衡器"""
    
    def __init__(self):
        self.weights: Dict[str, int] = {}
        self.current_weights: Dict[str, int] = {}
        
    def select_instance(self, instances: List[ServiceInstance]) -> Optional[ServiceInstance]:
        if not instances:
            return None
            
        healthy_instances = [i for i in instances if i.status != ServiceStatus.UNHEALTHY]
        if not healthy_instances:
            return None
            
        # 更新权重
        for instance in healthy_instances:
            self.weights[instance.instance_id] = instance.weight
            if instance.instance_id not in self.current_weights:
                self.current_weights[instance.instance_id] = 0
                
        # 选择当前权重最大的实例
        selected_id = max(self.current_weights.keys(), 
                         key=lambda k: self.current_weights[k] if k in [i.instance_id for i in healthy_instances] else -1)
        
        selected = next(i for i in healthy_instances if i.instance_id == selected_id)
        
        # 更新权重
        self.current_weights[selected_id] -= sum(self.weights.values())
        for instance_id in self.weights:
            self.current_weights[instance_id] += self.weights[instance_id]
            
        return selected
        
    def update_instance_stats(self, instance: ServiceInstance, response_time: float, success: bool):
        instance.update_request_stats(response_time, success)
        
        # 动态调整权重
        if success:
            instance.weight = min(200, instance.weight + 1)
        else:
            instance.weight = max(10, instance.weight - 5)

class LeastConnectionsBalancer(LoadBalancer):
    """最少连接负载均衡器"""
    
    def select_instance(self, instances: List[ServiceInstance]) -> Optional[ServiceInstance]:
        if not instances:
            return None
            
        healthy_instances = [i for i in instances if i.status != ServiceStatus.UNHEALTHY]
        if not healthy_instances:
            return None
            
        return min(healthy_instances, key=lambda i: i.active_connections)
        
    def update_instance_stats(self, instance: ServiceInstance, response_time: float, success: bool):
        instance.update_request_stats(response_time, success)

class LeastResponseTimeBalancer(LoadBalancer):
    """最短响应时间负载均衡器"""
    
    def select_instance(self, instances: List[ServiceInstance]) -> Optional[ServiceInstance]:
        if not instances:
            return None
            
        healthy_instances = [i for i in instances if i.status != ServiceStatus.UNHEALTHY]
        if not healthy_instances:
            return None
            
        # 综合考虑响应时间和连接数
        def score(instance):
            base_score = instance.avg_response_time or 1000  # 默认1秒
            connection_penalty = instance.active_connections * 10  # 每个连接增加10ms
            return base_score + connection_penalty
            
        return min(healthy_instances, key=score)
        
    def update_instance_stats(self, instance: ServiceInstance, response_time: float, success: bool):
        instance.update_request_stats(response_time, success)

class ConsistentHashBalancer(LoadBalancer):
    """一致性哈希负载均衡器"""
    
    def __init__(self, virtual_nodes: int = 100):
        self.virtual_nodes = virtual_nodes
        self.hash_ring: Dict[int, str] = {}
        
    def _hash(self, key: str) -> int:
        """计算哈希值"""
        return int(hashlib.md5(key.encode()).hexdigest(), 16)
        
    def _build_hash_ring(self, instances: List[ServiceInstance]):
        """构建哈希环"""
        self.hash_ring.clear()
        
        for instance in instances:
            if instance.status == ServiceStatus.UNHEALTHY:
                continue
                
            for i in range(self.virtual_nodes):
                virtual_key = f"{instance.instance_id}:{i}"
                hash_value = self._hash(virtual_key)
                self.hash_ring[hash_value] = instance.instance_id
                
    def select_instance(self, instances: List[ServiceInstance], key: str = None) -> Optional[ServiceInstance]:
        if not instances:
            return None
            
        healthy_instances = [i for i in instances if i.status != ServiceStatus.UNHEALTHY]
        if not healthy_instances:
            return None
            
        self._build_hash_ring(healthy_instances)
        
        if not self.hash_ring:
            return None
            
        if key is None:
            key = str(uuid.uuid4())
            
        key_hash = self._hash(key)
        
        # 找到第一个大于等于key_hash的节点
        sorted_hashes = sorted(self.hash_ring.keys())
        selected_hash = None
        
        for hash_value in sorted_hashes:
            if hash_value >= key_hash:
                selected_hash = hash_value
                break
                
        if selected_hash is None:
            selected_hash = sorted_hashes[0]  # 环形，回到第一个
            
        selected_id = self.hash_ring[selected_hash]
        return next(i for i in healthy_instances if i.instance_id == selected_id)
        
    def update_instance_stats(self, instance: ServiceInstance, response_time: float, success: bool):
        instance.update_request_stats(response_time, success)

class ServiceRegistry:
    """服务注册中心"""
    
    def __init__(self):
        self.services: Dict[str, ServiceDefinition] = {}
        self.instances: Dict[str, List[ServiceInstance]] = defaultdict(list)
        self.health_checker: Optional[HealthChecker] = None
        self.health_check_tasks: Dict[str, asyncio.Task] = {}
        self.load_balancers: Dict[str, LoadBalancer] = {}
        self.running = False
        
    async def start(self):
        """启动服务注册中心"""
        if self.running:
            return
            
        self.running = True
        self.health_checker = HealthChecker()
        await self.health_checker.__aenter__()
        
        logger.info("Service registry started")
        
    async def stop(self):
        """停止服务注册中心"""
        if not self.running:
            return
            
        self.running = False
        
        # 停止健康检查任务
        for task in self.health_check_tasks.values():
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
                
        self.health_check_tasks.clear()
        
        if self.health_checker:
            await self.health_checker.__aexit__(None, None, None)
            
        logger.info("Service registry stopped")
        
    def register_service(self, service_def: ServiceDefinition):
        """注册服务定义"""
        self.services[service_def.service_id] = service_def
        
        # 创建负载均衡器
        strategy = service_def.load_balancing_strategy
        if strategy == LoadBalancingStrategy.ROUND_ROBIN:
            self.load_balancers[service_def.service_id] = RoundRobinBalancer()
        elif strategy == LoadBalancingStrategy.WEIGHTED_ROUND_ROBIN:
            self.load_balancers[service_def.service_id] = WeightedRoundRobinBalancer()
        elif strategy == LoadBalancingStrategy.LEAST_CONNECTIONS:
            self.load_balancers[service_def.service_id] = LeastConnectionsBalancer()
        elif strategy == LoadBalancingStrategy.LEAST_RESPONSE_TIME:
            self.load_balancers[service_def.service_id] = LeastResponseTimeBalancer()
        elif strategy == LoadBalancingStrategy.CONSISTENT_HASH:
            self.load_balancers[service_def.service_id] = ConsistentHashBalancer()
        else:
            self.load_balancers[service_def.service_id] = RoundRobinBalancer()
            
        logger.info(f"Registered service: {service_def.service_id}")
        
    def register_instance(self, instance: ServiceInstance):
        """注册服务实例"""
        if instance.service_id not in self.services:
            raise ValueError(f"Service {instance.service_id} not registered")
            
        # 检查是否已存在
        existing = next((i for i in self.instances[instance.service_id] 
                        if i.instance_id == instance.instance_id), None)
        
        if existing:
            # 更新现有实例
            idx = self.instances[instance.service_id].index(existing)
            self.instances[instance.service_id][idx] = instance
        else:
            # 添加新实例
            self.instances[instance.service_id].append(instance)
            
        # 启动健康检查
        self._start_health_check(instance)
        
        logger.info(f"Registered instance: {instance.instance_id} for service {instance.service_id}")
        
    def deregister_instance(self, service_id: str, instance_id: str):
        """注销服务实例"""
        instances = self.instances.get(service_id, [])
        self.instances[service_id] = [i for i in instances if i.instance_id != instance_id]
        
        # 停止健康检查
        task_key = f"{service_id}:{instance_id}"
        if task_key in self.health_check_tasks:
            self.health_check_tasks[task_key].cancel()
            del self.health_check_tasks[task_key]
            
        logger.info(f"Deregistered instance: {instance_id} from service {service_id}")
        
    def get_service_instance(self, service_id: str, key: str = None) -> Optional[ServiceInstance]:
        """获取服务实例"""
        if service_id not in self.services:
            return None
            
        instances = self.instances.get(service_id, [])
        if not instances:
            return None
            
        balancer = self.load_balancers.get(service_id)
        if not balancer:
            return None
            
        if isinstance(balancer, ConsistentHashBalancer):
            return balancer.select_instance(instances, key)
        else:
            return balancer.select_instance(instances)
            
    def get_all_instances(self, service_id: str) -> List[ServiceInstance]:
        """获取所有服务实例"""
        return self.instances.get(service_id, []).copy()
        
    def get_healthy_instances(self, service_id: str) -> List[ServiceInstance]:
        """获取健康的服务实例"""
        instances = self.instances.get(service_id, [])
        return [i for i in instances if i.status == ServiceStatus.HEALTHY]
        
    def update_instance_stats(self, service_id: str, instance_id: str, response_time: float, success: bool):
        """更新实例统计信息"""
        instances = self.instances.get(service_id, [])
        instance = next((i for i in instances if i.instance_id == instance_id), None)
        
        if instance:
            balancer = self.load_balancers.get(service_id)
            if balancer:
                balancer.update_instance_stats(instance, response_time, success)
                
    def _start_health_check(self, instance: ServiceInstance):
        """启动健康检查任务"""
        if not self.running or not self.health_checker:
            return
            
        service_def = self.services.get(instance.service_id)
        if not service_def:
            return
            
        task_key = f"{instance.service_id}:{instance.instance_id}"
        
        # 取消现有任务
        if task_key in self.health_check_tasks:
            self.health_check_tasks[task_key].cancel()
            
        # 创建新任务
        task = asyncio.create_task(
            self._health_check_loop(instance, service_def)
        )
        self.health_check_tasks[task_key] = task
        
    async def _health_check_loop(self, instance: ServiceInstance, service_def: ServiceDefinition):
        """健康检查循环"""
        while self.running:
            try:
                await self.health_checker.check_health(instance, service_def.health_check_path)
                await asyncio.sleep(service_def.health_check_interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Health check loop error for {instance.instance_id}: {str(e)}")
                await asyncio.sleep(service_def.health_check_interval)
                
    def get_service_stats(self) -> Dict[str, Any]:
        """获取服务统计信息"""
        stats = {
            'timestamp': datetime.now().isoformat(),
            'services': {},
            'total_services': len(self.services),
            'total_instances': sum(len(instances) for instances in self.instances.values())
        }
        
        for service_id, service_def in self.services.items():
            instances = self.instances.get(service_id, [])
            healthy_count = len([i for i in instances if i.status == ServiceStatus.HEALTHY])
            
            stats['services'][service_id] = {
                'name': service_def.name,
                'version': service_def.version,
                'total_instances': len(instances),
                'healthy_instances': healthy_count,
                'load_balancing_strategy': service_def.load_balancing_strategy.value,
                'instances': [instance.to_dict() for instance in instances]
            }
            
        return stats

# 服务网格客户端
class ServiceMeshClient:
    """服务网格客户端"""
    
    def __init__(self, registry: ServiceRegistry):
        self.registry = registry
        self.session: Optional[aiohttp.ClientSession] = None
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
            
    async def call_service(self, service_id: str, path: str = "/", method: str = "GET", 
                          data: Any = None, headers: Dict[str, str] = None,
                          key: str = None, timeout: int = 30) -> Dict[str, Any]:
        """调用服务"""
        if not self.session:
            raise RuntimeError("ServiceMeshClient not initialized")
            
        instance = self.registry.get_service_instance(service_id, key)
        if not instance:
            raise RuntimeError(f"No healthy instance found for service {service_id}")
            
        url = f"{instance.url}{path}"
        start_time = time.time()
        success = False
        response_data = None
        
        try:
            # 增加连接计数
            instance.active_connections += 1
            
            timeout_config = aiohttp.ClientTimeout(total=timeout)
            
            async with self.session.request(
                method, url, 
                json=data if data else None,
                headers=headers or {},
                timeout=timeout_config
            ) as response:
                response_time = time.time() - start_time
                
                if response.status == 200:
                    success = True
                    response_data = await response.json()
                else:
                    raise aiohttp.ClientResponseError(
                        request_info=response.request_info,
                        history=response.history,
                        status=response.status
                    )
                    
        except Exception as e:
            response_time = time.time() - start_time
            logger.error(f"Service call failed: {service_id} - {str(e)}")
            raise
        finally:
            # 减少连接计数
            instance.active_connections = max(0, instance.active_connections - 1)
            
            # 更新统计信息
            self.registry.update_instance_stats(
                service_id, instance.instance_id, 
                response_time * 1000, success
            )
            
        return response_data or {}

# 使用示例
async def demo_service_mesh():
    """服务网格演示"""
    print("🚀 Service Mesh Demo Starting...")
    
    # 创建服务注册中心
    registry = ServiceRegistry()
    await registry.start()
    
    try:
        # 注册服务定义
        ocr_service = ServiceDefinition(
            service_id="ocr-service",
            name="OCR Processing Service",
            version="1.0.0",
            health_check_path="/health",
            load_balancing_strategy=LoadBalancingStrategy.LEAST_RESPONSE_TIME
        )
        registry.register_service(ocr_service)
        
        grading_service = ServiceDefinition(
            service_id="grading-service", 
            name="Grading Service",
            version="1.0.0",
            load_balancing_strategy=LoadBalancingStrategy.WEIGHTED_ROUND_ROBIN
        )
        registry.register_service(grading_service)
        
        # 注册服务实例
        instances = [
            ServiceInstance("ocr-service", "ocr-1", "localhost", 8001, weight=100),
            ServiceInstance("ocr-service", "ocr-2", "localhost", 8002, weight=150),
            ServiceInstance("grading-service", "grading-1", "localhost", 9001, weight=100),
            ServiceInstance("grading-service", "grading-2", "localhost", 9002, weight=200)
        ]
        
        for instance in instances:
            registry.register_instance(instance)
            
        # 等待健康检查
        await asyncio.sleep(2)
        
        # 获取服务统计
        stats = registry.get_service_stats()
        print(f"📊 Service Stats:\n{json.dumps(stats, indent=2)}")
        
    finally:
        await registry.stop()
        
    print("✅ Service Mesh Demo Completed!")

if __name__ == "__main__":
    asyncio.run(demo_service_mesh())