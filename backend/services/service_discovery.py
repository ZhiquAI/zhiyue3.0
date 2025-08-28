"""
Service Discovery and Configuration Management
智阅3.0服务发现和配置管理系统
"""

import asyncio
import json
import logging
import time
import uuid
import threading
from abc import ABC, abstractmethod
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, List, Optional, Any, Callable, Set, Union
from collections import defaultdict
import aiofiles
from pathlib import Path
import hashlib
import yaml
import os
from contextlib import asynccontextmanager
import weakref
import copy

logger = logging.getLogger(__name__)

class ServiceHealth(str, Enum):
    """服务健康状态"""
    PASSING = "passing"
    WARNING = "warning"
    CRITICAL = "critical"
    UNKNOWN = "unknown"

class ConfigurationFormat(str, Enum):
    """配置格式"""
    JSON = "json"
    YAML = "yaml"
    PROPERTIES = "properties"
    ENV = "env"

class DiscoveryEvent(str, Enum):
    """发现事件"""
    SERVICE_REGISTERED = "service_registered"
    SERVICE_DEREGISTERED = "service_deregistered"
    SERVICE_HEALTH_CHANGED = "service_health_changed"
    CONFIG_CHANGED = "config_changed"

@dataclass
class ServiceEndpoint:
    """服务端点"""
    service_id: str
    instance_id: str
    host: str
    port: int
    protocol: str = "http"
    path: str = "/"
    weight: int = 100
    tags: Dict[str, str] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    # 健康检查配置
    health_check_url: Optional[str] = None
    health_check_interval: int = 30
    health_check_timeout: int = 5
    health_check_ttl: int = 90
    
    # 状态信息
    health: ServiceHealth = ServiceHealth.UNKNOWN
    last_seen: datetime = field(default_factory=datetime.now)
    registered_at: datetime = field(default_factory=datetime.now)
    
    @property
    def url(self) -> str:
        """获取服务URL"""
        return f"{self.protocol}://{self.host}:{self.port}{self.path}"
    
    @property
    def health_check_endpoint(self) -> str:
        """获取健康检查端点"""
        if self.health_check_url:
            return self.health_check_url
        return f"{self.protocol}://{self.host}:{self.port}/health"
    
    def is_healthy(self) -> bool:
        """检查是否健康"""
        return self.health == ServiceHealth.PASSING
    
    def update_health(self, health: ServiceHealth):
        """更新健康状态"""
        old_health = self.health
        self.health = health
        self.last_seen = datetime.now()
        return old_health != health
    
    def to_dict(self) -> Dict[str, Any]:
        result = asdict(self)
        result['url'] = self.url
        result['is_healthy'] = self.is_healthy()
        return result

@dataclass
class ServiceDefinition:
    """服务定义"""
    name: str
    version: str = "1.0.0"
    description: str = ""
    environment: str = "production"
    datacenter: str = "default"
    
    # 服务配置
    endpoints: List[ServiceEndpoint] = field(default_factory=list)
    dependencies: List[str] = field(default_factory=list)
    
    # 负载均衡配置
    load_balancer_policy: str = "round_robin"
    
    # 服务发现配置
    discovery_enabled: bool = True
    auto_deregister_critical_service_after: int = 300  # 5分钟
    
    def add_endpoint(self, endpoint: ServiceEndpoint):
        """添加端点"""
        self.endpoints.append(endpoint)
        
    def remove_endpoint(self, instance_id: str):
        """移除端点"""
        self.endpoints = [ep for ep in self.endpoints if ep.instance_id != instance_id]
        
    def get_healthy_endpoints(self) -> List[ServiceEndpoint]:
        """获取健康端点"""
        return [ep for ep in self.endpoints if ep.is_healthy()]
    
    def to_dict(self) -> Dict[str, Any]:
        result = asdict(self)
        result['healthy_endpoints_count'] = len(self.get_healthy_endpoints())
        result['total_endpoints_count'] = len(self.endpoints)
        return result

@dataclass
class ConfigurationItem:
    """配置项"""
    key: str
    value: Any
    format: ConfigurationFormat = ConfigurationFormat.JSON
    source: str = "manual"
    version: int = 1
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    tags: Dict[str, str] = field(default_factory=dict)
    
    def update_value(self, new_value: Any):
        """更新值"""
        if self.value != new_value:
            self.value = new_value
            self.version += 1
            self.updated_at = datetime.now()
            return True
        return False
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

class DiscoveryEventListener(ABC):
    """发现事件监听器"""
    
    @abstractmethod
    async def on_event(self, event_type: DiscoveryEvent, data: Dict[str, Any]):
        """处理事件"""
        pass

class HealthChecker:
    """健康检查器"""
    
    def __init__(self):
        self.running = False
        self.check_tasks: Dict[str, asyncio.Task] = {}
        self.session: Optional = None
        
    async def start(self):
        """启动健康检查"""
        if self.running:
            return
            
        self.running = True
        # 这里应该创建aiohttp session，但为了简化演示暂时省略
        logger.info("Health checker started")
        
    async def stop(self):
        """停止健康检查"""
        if not self.running:
            return
            
        self.running = False
        
        # 取消所有检查任务
        for task in self.check_tasks.values():
            task.cancel()
            
        await asyncio.gather(*self.check_tasks.values(), return_exceptions=True)
        self.check_tasks.clear()
        
        logger.info("Health checker stopped")
        
    def start_monitoring(self, endpoint: ServiceEndpoint):
        """开始监控端点"""
        if not self.running:
            return
            
        task_key = f"{endpoint.service_id}:{endpoint.instance_id}"
        
        # 取消现有任务
        if task_key in self.check_tasks:
            self.check_tasks[task_key].cancel()
            
        # 创建新任务
        task = asyncio.create_task(self._health_check_loop(endpoint))
        self.check_tasks[task_key] = task
        
    def stop_monitoring(self, service_id: str, instance_id: str):
        """停止监控端点"""
        task_key = f"{service_id}:{instance_id}"
        if task_key in self.check_tasks:
            self.check_tasks[task_key].cancel()
            del self.check_tasks[task_key]
            
    async def _health_check_loop(self, endpoint: ServiceEndpoint):
        """健康检查循环"""
        while self.running:
            try:
                health = await self._check_endpoint_health(endpoint)
                endpoint.update_health(health)
                await asyncio.sleep(endpoint.health_check_interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Health check error for {endpoint.instance_id}: {str(e)}")
                endpoint.update_health(ServiceHealth.CRITICAL)
                await asyncio.sleep(endpoint.health_check_interval)
                
    async def _check_endpoint_health(self, endpoint: ServiceEndpoint) -> ServiceHealth:
        """检查端点健康状态"""
        try:
            # 简化的健康检查实现
            # 实际实现中应该发送HTTP请求到健康检查端点
            
            # 模拟健康检查
            await asyncio.sleep(0.1)
            
            # 根据最后一次更新时间判断健康状态
            time_since_last_seen = datetime.now() - endpoint.last_seen
            
            if time_since_last_seen.total_seconds() < endpoint.health_check_ttl:
                return ServiceHealth.PASSING
            elif time_since_last_seen.total_seconds() < endpoint.health_check_ttl * 2:
                return ServiceHealth.WARNING
            else:
                return ServiceHealth.CRITICAL
                
        except Exception as e:
            logger.error(f"Health check failed for {endpoint.instance_id}: {str(e)}")
            return ServiceHealth.CRITICAL

class ServiceRegistry:
    """服务注册中心"""
    
    def __init__(self):
        self.services: Dict[str, ServiceDefinition] = {}
        self.endpoints: Dict[str, ServiceEndpoint] = {}  # instance_id -> endpoint
        self.listeners: List[DiscoveryEventListener] = []
        self.health_checker = HealthChecker()
        self.running = False
        self.cleanup_task: Optional[asyncio.Task] = None
        
    async def start(self):
        """启动服务注册中心"""
        if self.running:
            return
            
        self.running = True
        await self.health_checker.start()
        
        # 启动清理任务
        self.cleanup_task = asyncio.create_task(self._cleanup_loop())
        
        logger.info("Service registry started")
        
    async def stop(self):
        """停止服务注册中心"""
        if not self.running:
            return
            
        self.running = False
        
        if self.cleanup_task:
            self.cleanup_task.cancel()
            try:
                await self.cleanup_task
            except asyncio.CancelledError:
                pass
                
        await self.health_checker.stop()
        
        logger.info("Service registry stopped")
        
    def add_listener(self, listener: DiscoveryEventListener):
        """添加事件监听器"""
        self.listeners.append(listener)
        
    def remove_listener(self, listener: DiscoveryEventListener):
        """移除事件监听器"""
        if listener in self.listeners:
            self.listeners.remove(listener)
            
    async def _emit_event(self, event_type: DiscoveryEvent, data: Dict[str, Any]):
        """发射事件"""
        for listener in self.listeners:
            try:
                await listener.on_event(event_type, data)
            except Exception as e:
                logger.error(f"Event listener error: {str(e)}")
                
    async def register_service(self, service_def: ServiceDefinition) -> bool:
        """注册服务"""
        service_name = service_def.name
        
        if service_name not in self.services:
            self.services[service_name] = service_def
        else:
            # 合并端点
            existing_service = self.services[service_name]
            for endpoint in service_def.endpoints:
                existing_service.add_endpoint(endpoint)
                
        # 注册所有端点
        for endpoint in service_def.endpoints:
            self.endpoints[endpoint.instance_id] = endpoint
            
            # 开始健康检查
            self.health_checker.start_monitoring(endpoint)
            
            # 发射注册事件
            await self._emit_event(DiscoveryEvent.SERVICE_REGISTERED, {
                'service_name': service_name,
                'instance_id': endpoint.instance_id,
                'endpoint': endpoint.to_dict()
            })
            
        logger.info(f"Registered service: {service_name} with {len(service_def.endpoints)} endpoints")
        return True
        
    async def deregister_service(self, service_name: str, instance_id: str = None) -> bool:
        """注销服务"""
        if service_name not in self.services:
            return False
            
        service = self.services[service_name]
        
        if instance_id:
            # 注销特定实例
            endpoint = self.endpoints.get(instance_id)
            if endpoint:
                service.remove_endpoint(instance_id)
                del self.endpoints[instance_id]
                
                # 停止健康检查
                self.health_checker.stop_monitoring(service_name, instance_id)
                
                # 发射注销事件
                await self._emit_event(DiscoveryEvent.SERVICE_DEREGISTERED, {
                    'service_name': service_name,
                    'instance_id': instance_id
                })
                
                logger.info(f"Deregistered instance: {instance_id} from service {service_name}")
                
                # 如果没有端点了，删除服务
                if not service.endpoints:
                    del self.services[service_name]
                    
        else:
            # 注销整个服务
            for endpoint in service.endpoints:
                self.health_checker.stop_monitoring(service_name, endpoint.instance_id)
                del self.endpoints[endpoint.instance_id]
                
            del self.services[service_name]
            
            await self._emit_event(DiscoveryEvent.SERVICE_DEREGISTERED, {
                'service_name': service_name
            })
            
            logger.info(f"Deregistered service: {service_name}")
            
        return True
        
    def discover_service(self, service_name: str, healthy_only: bool = True) -> Optional[ServiceDefinition]:
        """发现服务"""
        service = self.services.get(service_name)
        if not service:
            return None
            
        if healthy_only:
            # 只返回健康的端点
            healthy_service = copy.deepcopy(service)
            healthy_service.endpoints = service.get_healthy_endpoints()
            return healthy_service
        
        return service
        
    def get_service_endpoints(self, service_name: str, healthy_only: bool = True) -> List[ServiceEndpoint]:
        """获取服务端点"""
        service = self.discover_service(service_name, healthy_only)
        return service.endpoints if service else []
        
    def get_all_services(self) -> Dict[str, ServiceDefinition]:
        """获取所有服务"""
        return self.services.copy()
        
    async def _cleanup_loop(self):
        """清理循环"""
        while self.running:
            try:
                await self._cleanup_critical_services()
                await asyncio.sleep(60)  # 每分钟清理一次
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Cleanup error: {str(e)}")
                await asyncio.sleep(60)
                
    async def _cleanup_critical_services(self):
        """清理严重状态的服务"""
        current_time = datetime.now()
        
        to_remove = []
        
        for service_name, service in self.services.items():
            critical_endpoints = []
            
            for endpoint in service.endpoints:
                if endpoint.health == ServiceHealth.CRITICAL:
                    time_critical = (current_time - endpoint.last_seen).total_seconds()
                    if time_critical > service.auto_deregister_critical_service_after:
                        critical_endpoints.append(endpoint)
                        
            # 移除严重状态的端点
            for endpoint in critical_endpoints:
                to_remove.append((service_name, endpoint.instance_id))
                
        # 执行清理
        for service_name, instance_id in to_remove:
            await self.deregister_service(service_name, instance_id)
            logger.info(f"Auto-deregistered critical service: {service_name}:{instance_id}")

class ConfigurationManager:
    """配置管理器"""
    
    def __init__(self, config_dir: str = "./config"):
        self.config_dir = Path(config_dir)
        self.config_dir.mkdir(exist_ok=True)
        
        self.configurations: Dict[str, ConfigurationItem] = {}
        self.listeners: List[Callable] = []
        self.file_watchers: Dict[str, asyncio.Task] = {}
        self.running = False
        
    async def start(self):
        """启动配置管理器"""
        if self.running:
            return
            
        self.running = True
        
        # 加载现有配置
        await self._load_configurations()
        
        logger.info("Configuration manager started")
        
    async def stop(self):
        """停止配置管理器"""
        if not self.running:
            return
            
        self.running = False
        
        # 停止文件监控
        for task in self.file_watchers.values():
            task.cancel()
            
        await asyncio.gather(*self.file_watchers.values(), return_exceptions=True)
        self.file_watchers.clear()
        
        logger.info("Configuration manager stopped")
        
    def add_change_listener(self, listener: Callable[[str, Any, Any], None]):
        """添加变更监听器"""
        self.listeners.append(listener)
        
    def remove_change_listener(self, listener: Callable):
        """移除变更监听器"""
        if listener in self.listeners:
            self.listeners.remove(listener)
            
    async def _notify_change(self, key: str, old_value: Any, new_value: Any):
        """通知变更"""
        for listener in self.listeners:
            try:
                await listener(key, old_value, new_value) if asyncio.iscoroutinefunction(listener) else listener(key, old_value, new_value)
            except Exception as e:
                logger.error(f"Configuration change listener error: {str(e)}")
                
    async def set_configuration(self, key: str, value: Any, 
                               format: ConfigurationFormat = ConfigurationFormat.JSON,
                               source: str = "manual",
                               persist: bool = True) -> bool:
        """设置配置"""
        old_value = None
        
        if key in self.configurations:
            config_item = self.configurations[key]
            old_value = config_item.value
            
            if not config_item.update_value(value):
                return False  # 值没有变化
        else:
            config_item = ConfigurationItem(
                key=key,
                value=value,
                format=format,
                source=source
            )
            self.configurations[key] = config_item
            
        # 持久化配置
        if persist:
            await self._persist_configuration(config_item)
            
        # 通知变更
        await self._notify_change(key, old_value, value)
        
        logger.info(f"Configuration updated: {key}")
        return True
        
    def get_configuration(self, key: str, default: Any = None) -> Any:
        """获取配置"""
        config_item = self.configurations.get(key)
        return config_item.value if config_item else default
        
    def get_configuration_item(self, key: str) -> Optional[ConfigurationItem]:
        """获取配置项"""
        return self.configurations.get(key)
        
    def get_all_configurations(self) -> Dict[str, ConfigurationItem]:
        """获取所有配置"""
        return self.configurations.copy()
        
    async def delete_configuration(self, key: str) -> bool:
        """删除配置"""
        if key not in self.configurations:
            return False
            
        config_item = self.configurations[key]
        old_value = config_item.value
        
        del self.configurations[key]
        
        # 删除持久化文件
        config_file = self.config_dir / f"{key}.json"
        if config_file.exists():
            config_file.unlink()
            
        # 通知变更
        await self._notify_change(key, old_value, None)
        
        logger.info(f"Configuration deleted: {key}")
        return True
        
    async def load_from_file(self, file_path: str, watch: bool = True) -> bool:
        """从文件加载配置"""
        file_path = Path(file_path)
        if not file_path.exists():
            return False
            
        try:
            if file_path.suffix.lower() == '.json':
                format = ConfigurationFormat.JSON
                async with aiofiles.open(file_path, 'r') as f:
                    content = await f.read()
                    data = json.loads(content)
            elif file_path.suffix.lower() in ['.yml', '.yaml']:
                format = ConfigurationFormat.YAML
                async with aiofiles.open(file_path, 'r') as f:
                    content = await f.read()
                    data = yaml.safe_load(content)
            else:
                return False
                
            # 递归设置配置
            await self._set_nested_config(data, format, str(file_path))
            
            # 启动文件监控
            if watch:
                await self._start_file_watcher(str(file_path))
                
            logger.info(f"Loaded configuration from: {file_path}")
            return True
            
        except Exception as e:
            logger.error(f"Error loading configuration from {file_path}: {str(e)}")
            return False
            
    async def _set_nested_config(self, data: Dict, format: ConfigurationFormat, source: str, prefix: str = ""):
        """递归设置嵌套配置"""
        for key, value in data.items():
            full_key = f"{prefix}.{key}" if prefix else key
            
            if isinstance(value, dict):
                await self._set_nested_config(value, format, source, full_key)
            else:
                await self.set_configuration(full_key, value, format, source, persist=False)
                
    async def _load_configurations(self):
        """加载配置"""
        if not self.config_dir.exists():
            return
            
        for config_file in self.config_dir.glob("*.json"):
            try:
                async with aiofiles.open(config_file, 'r') as f:
                    content = await f.read()
                    data = json.loads(content)
                    
                config_item = ConfigurationItem(**data)
                self.configurations[config_item.key] = config_item
                
            except Exception as e:
                logger.error(f"Error loading configuration file {config_file}: {str(e)}")
                
    async def _persist_configuration(self, config_item: ConfigurationItem):
        """持久化配置"""
        config_file = self.config_dir / f"{config_item.key}.json"
        
        try:
            config_data = config_item.to_dict()
            async with aiofiles.open(config_file, 'w') as f:
                await f.write(json.dumps(config_data, indent=2, default=str))
        except Exception as e:
            logger.error(f"Error persisting configuration {config_item.key}: {str(e)}")
            
    async def _start_file_watcher(self, file_path: str):
        """启动文件监控"""
        if file_path in self.file_watchers:
            return
            
        task = asyncio.create_task(self._file_watch_loop(file_path))
        self.file_watchers[file_path] = task
        
    async def _file_watch_loop(self, file_path: str):
        """文件监控循环"""
        file_path = Path(file_path)
        last_mtime = file_path.stat().st_mtime if file_path.exists() else 0
        
        while self.running:
            try:
                if file_path.exists():
                    current_mtime = file_path.stat().st_mtime
                    if current_mtime > last_mtime:
                        # 文件已修改，重新加载
                        await self.load_from_file(str(file_path), watch=False)
                        last_mtime = current_mtime
                        
                await asyncio.sleep(5)  # 每5秒检查一次
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"File watch error for {file_path}: {str(e)}")
                await asyncio.sleep(5)

class ServiceDiscoveryClient:
    """服务发现客户端"""
    
    def __init__(self, registry: ServiceRegistry, config_manager: ConfigurationManager):
        self.registry = registry
        self.config_manager = config_manager
        self.local_cache: Dict[str, ServiceDefinition] = {}
        self.cache_ttl = 60  # 缓存60秒
        self.cache_timestamps: Dict[str, datetime] = {}
        
    async def discover(self, service_name: str, use_cache: bool = True) -> Optional[ServiceDefinition]:
        """发现服务"""
        # 检查本地缓存
        if use_cache and service_name in self.local_cache:
            cache_time = self.cache_timestamps.get(service_name)
            if cache_time and (datetime.now() - cache_time).total_seconds() < self.cache_ttl:
                return self.local_cache[service_name]
                
        # 从注册中心获取
        service = self.registry.discover_service(service_name)
        
        if service:
            # 更新缓存
            self.local_cache[service_name] = service
            self.cache_timestamps[service_name] = datetime.now()
            
        return service
        
    async def get_endpoint(self, service_name: str, instance_id: str = None) -> Optional[ServiceEndpoint]:
        """获取服务端点"""
        service = await self.discover(service_name)
        if not service:
            return None
            
        healthy_endpoints = service.get_healthy_endpoints()
        if not healthy_endpoints:
            return None
            
        if instance_id:
            # 获取指定实例
            for endpoint in healthy_endpoints:
                if endpoint.instance_id == instance_id:
                    return endpoint
            return None
        else:
            # 返回第一个健康端点
            return healthy_endpoints[0]
            
    def get_config(self, key: str, default: Any = None) -> Any:
        """获取配置"""
        return self.config_manager.get_configuration(key, default)
        
    async def watch_config(self, key: str, callback: Callable[[str, Any, Any], None]):
        """监控配置变化"""
        self.config_manager.add_change_listener(callback)

# 集成系统
class ServiceDiscoverySystem:
    """服务发现系统"""
    
    def __init__(self, config_dir: str = "./config"):
        self.registry = ServiceRegistry()
        self.config_manager = ConfigurationManager(config_dir)
        self.client = ServiceDiscoveryClient(self.registry, self.config_manager)
        self.running = False
        
    async def start(self):
        """启动系统"""
        if self.running:
            return
            
        self.running = True
        
        await self.registry.start()
        await self.config_manager.start()
        
        logger.info("Service discovery system started")
        
    async def stop(self):
        """停止系统"""
        if not self.running:
            return
            
        self.running = False
        
        await self.registry.stop()
        await self.config_manager.stop()
        
        logger.info("Service discovery system stopped")
        
    def get_registry(self) -> ServiceRegistry:
        """获取服务注册中心"""
        return self.registry
        
    def get_config_manager(self) -> ConfigurationManager:
        """获取配置管理器"""
        return self.config_manager
        
    def get_client(self) -> ServiceDiscoveryClient:
        """获取客户端"""
        return self.client
        
    def get_system_status(self) -> Dict[str, Any]:
        """获取系统状态"""
        return {
            'running': self.running,
            'services_count': len(self.registry.services),
            'configurations_count': len(self.config_manager.configurations),
            'timestamp': datetime.now().isoformat()
        }

# 使用示例
async def demo_service_discovery():
    """服务发现演示"""
    print("🚀 Service Discovery Demo Starting...")
    
    system = ServiceDiscoverySystem()
    await system.start()
    
    try:
        registry = system.get_registry()
        config_manager = system.get_config_manager()
        client = system.get_client()
        
        # 设置一些配置
        print("⚙️ Setting up configurations...")
        await config_manager.set_configuration("app.name", "ZhiYue3.0")
        await config_manager.set_configuration("app.version", "1.0.0")
        await config_manager.set_configuration("database.host", "localhost")
        await config_manager.set_configuration("database.port", 5432)
        await config_manager.set_configuration("cache.redis.host", "localhost")
        await config_manager.set_configuration("cache.redis.port", 6379)
        
        # 注册一些服务
        print("📋 Registering services...")
        
        # OCR服务
        ocr_service = ServiceDefinition(
            name="ocr-service",
            version="1.0.0",
            description="OCR Processing Service"
        )
        
        ocr_endpoints = [
            ServiceEndpoint("ocr-service", "ocr-1", "localhost", 8001),
            ServiceEndpoint("ocr-service", "ocr-2", "localhost", 8002),
        ]
        
        for endpoint in ocr_endpoints:
            ocr_service.add_endpoint(endpoint)
            
        await registry.register_service(ocr_service)
        
        # 阅卷服务
        grading_service = ServiceDefinition(
            name="grading-service",
            version="1.0.0",
            description="Intelligent Grading Service"
        )
        
        grading_endpoints = [
            ServiceEndpoint("grading-service", "grading-1", "localhost", 9001),
            ServiceEndpoint("grading-service", "grading-2", "localhost", 9002),
        ]
        
        for endpoint in grading_endpoints:
            grading_service.add_endpoint(endpoint)
            
        await registry.register_service(grading_service)
        
        # 等待健康检查
        await asyncio.sleep(2)
        
        # 服务发现
        print("🔍 Discovering services...")
        
        discovered_ocr = await client.discover("ocr-service")
        if discovered_ocr:
            print(f"  Found OCR service with {len(discovered_ocr.endpoints)} endpoints")
            
        discovered_grading = await client.discover("grading-service")
        if discovered_grading:
            print(f"  Found Grading service with {len(discovered_grading.endpoints)} endpoints")
            
        # 获取配置
        print("⚙️ Reading configurations...")
        print(f"  App Name: {client.get_config('app.name')}")
        print(f"  App Version: {client.get_config('app.version')}")
        print(f"  Database Host: {client.get_config('database.host')}")
        print(f"  Redis Host: {client.get_config('cache.redis.host')}")
        
        # 系统状态
        status = system.get_system_status()
        print(f"\n📊 System Status: {json.dumps(status, indent=2)}")
        
    finally:
        await system.stop()
        
    print("✅ Service Discovery Demo Completed!")

if __name__ == "__main__":
    asyncio.run(demo_service_discovery())