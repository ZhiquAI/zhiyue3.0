"""权限缓存优化模块"""

import redis
import json
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Set
from config.settings import settings
from middleware.permissions import permission_manager, get_user_permissions
import hashlib
import logging

logger = logging.getLogger(__name__)

class PermissionCache:
    """权限缓存管理器"""
    
    def __init__(self):
        self.redis_client = redis.from_url(settings.REDIS_URL)
        self.default_ttl = 3600  # 1小时
        self.role_ttl = 7200     # 2小时（角色权限变化较少）
        
    def get_user_permissions(self, user_id: str, user_role: str) -> List[str]:
        """获取用户权限（带缓存）"""
        cache_key = f"user_permissions:{user_id}"
        
        # 尝试从缓存获取
        cached_data = self.redis_client.get(cache_key)
        if cached_data:
            try:
                data = json.loads(cached_data)
                # 检查角色是否变化
                if data.get('role') == user_role:
                    logger.debug(f"从缓存获取用户权限: {user_id}")
                    return data['permissions']
            except (json.JSONDecodeError, KeyError):
                pass
        
        # 缓存未命中，从权限管理器获取
        permissions = get_user_permissions(user_role)
        
        # 存储到缓存
        cache_data = {
            'permissions': permissions,
            'role': user_role,
            'cached_at': datetime.utcnow().isoformat()
        }
        self.redis_client.setex(cache_key, self.default_ttl, json.dumps(cache_data))
        
        logger.debug(f"缓存用户权限: {user_id}")
        return permissions
    
    def get_role_permissions(self, role: str) -> List[str]:
        """获取角色权限（带缓存）"""
        cache_key = f"role_permissions:{role}"
        
        # 尝试从缓存获取
        cached_permissions = self.redis_client.get(cache_key)
        if cached_permissions:
            try:
                logger.debug(f"从缓存获取角色权限: {role}")
                return json.loads(cached_permissions)
            except json.JSONDecodeError:
                pass
        
        # 缓存未命中，从权限管理器获取
        permissions = get_user_permissions(role)
        
        # 存储到缓存
        self.redis_client.setex(cache_key, self.role_ttl, json.dumps(permissions))
        
        logger.debug(f"缓存角色权限: {role}")
        return permissions
    
    def check_user_permission(self, user_id: str, user_role: str, required_permission: str) -> bool:
        """检查用户是否具有特定权限"""
        permissions = self.get_user_permissions(user_id, user_role)
        return required_permission in permissions
    
    def check_user_permissions(self, user_id: str, user_role: str, required_permissions: List[str]) -> bool:
        """检查用户是否具有所有必需权限"""
        user_permissions = self.get_user_permissions(user_id, user_role)
        return all(perm in user_permissions for perm in required_permissions)
    
    def check_resource_access(self, user_id: str, user_role: str, resource: str) -> bool:
        """检查用户是否可以访问特定资源"""
        cache_key = f"resource_access:{user_id}:{resource}"
        
        # 尝试从缓存获取
        cached_result = self.redis_client.get(cache_key)
        if cached_result is not None:
            logger.debug(f"从缓存获取资源访问权限: {user_id} -> {resource}")
            return cached_result.decode() == 'true'
        
        # 缓存未命中，检查权限
        can_access = permission_manager.can_access_resource(user_role, resource)
        
        # 存储到缓存（较短的TTL，因为资源访问可能更动态）
        self.redis_client.setex(cache_key, 1800, 'true' if can_access else 'false')  # 30分钟
        
        logger.debug(f"缓存资源访问权限: {user_id} -> {resource} = {can_access}")
        return can_access
    
    def invalidate_user_cache(self, user_id: str):
        """清除用户相关缓存"""
        patterns = [
            f"user_permissions:{user_id}",
            f"resource_access:{user_id}:*",
            f"user_role_cache:{user_id}"
        ]
        
        for pattern in patterns:
            if '*' in pattern:
                keys = self.redis_client.keys(pattern)
                if keys:
                    self.redis_client.delete(*keys)
            else:
                self.redis_client.delete(pattern)
        
        logger.info(f"清除用户缓存: {user_id}")
    
    def invalidate_role_cache(self, role: str):
        """清除角色相关缓存"""
        # 清除角色权限缓存
        self.redis_client.delete(f"role_permissions:{role}")
        
        # 清除所有该角色用户的权限缓存
        user_permission_keys = self.redis_client.keys("user_permissions:*")
        for key in user_permission_keys:
            cached_data = self.redis_client.get(key)
            if cached_data:
                try:
                    data = json.loads(cached_data)
                    if data.get('role') == role:
                        self.redis_client.delete(key)
                except:
                    continue
        
        logger.info(f"清除角色缓存: {role}")
    
    def warm_up_cache(self, user_ids: List[str], roles: List[str]):
        """预热缓存"""
        logger.info("开始预热权限缓存")
        
        # 预热角色权限
        for role in roles:
            self.get_role_permissions(role)
        
        # 预热用户权限（需要从数据库获取用户角色信息）
        # 这里简化处理，实际应该从数据库批量获取用户信息
        logger.info(f"权限缓存预热完成，处理了 {len(roles)} 个角色")
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """获取缓存统计信息"""
        stats = {
            'user_permissions_count': 0,
            'role_permissions_count': 0,
            'resource_access_count': 0,
            'total_memory_usage': 0
        }
        
        # 统计各类缓存数量
        user_perm_keys = self.redis_client.keys("user_permissions:*")
        role_perm_keys = self.redis_client.keys("role_permissions:*")
        resource_access_keys = self.redis_client.keys("resource_access:*")
        
        stats['user_permissions_count'] = len(user_perm_keys)
        stats['role_permissions_count'] = len(role_perm_keys)
        stats['resource_access_count'] = len(resource_access_keys)
        
        # 计算内存使用（简化）
        all_keys = user_perm_keys + role_perm_keys + resource_access_keys
        total_size = 0
        for key in all_keys[:100]:  # 限制检查数量避免性能问题
            try:
                size = self.redis_client.memory_usage(key)
                if size:
                    total_size += size
            except:
                continue
        
        stats['estimated_memory_usage'] = total_size
        
        return stats
    
    def cleanup_expired_cache(self):
        """清理过期缓存"""
        # Redis会自动清理过期键，这里主要是记录日志
        stats = self.get_cache_stats()
        logger.info(f"权限缓存状态: {stats}")

class PermissionCacheMiddleware:
    """权限缓存中间件"""
    
    def __init__(self):
        self.cache = PermissionCache()
    
    def check_permission_cached(self, user_id: str, user_role: str, required_permissions: List[str]) -> bool:
        """带缓存的权限检查"""
        if not required_permissions:
            return True
        
        return self.cache.check_user_permissions(user_id, user_role, required_permissions)
    
    def check_resource_access_cached(self, user_id: str, user_role: str, resource: str) -> bool:
        """带缓存的资源访问检查"""
        return self.cache.check_resource_access(user_id, user_role, resource)
    
    def invalidate_user_permissions(self, user_id: str):
        """清除用户权限缓存"""
        self.cache.invalidate_user_cache(user_id)
    
    def invalidate_role_permissions(self, role: str):
        """清除角色权限缓存"""
        self.cache.invalidate_role_cache(role)

class PermissionPreloader:
    """权限预加载器"""
    
    def __init__(self, cache: PermissionCache):
        self.cache = cache
    
    async def preload_common_permissions(self):
        """预加载常用权限"""
        common_roles = ['admin', 'teacher', 'assistant', 'student', 'guest']
        
        # 预加载角色权限
        for role in common_roles:
            self.cache.get_role_permissions(role)
        
        logger.info("常用权限预加载完成")
    
    async def preload_user_permissions(self, user_ids: List[str]):
        """预加载用户权限"""
        # 这里需要从数据库获取用户角色信息
        # 简化实现
        logger.info(f"用户权限预加载完成: {len(user_ids)} 个用户")

# 全局实例
permission_cache = PermissionCache()
permission_cache_middleware = PermissionCacheMiddleware()
permission_preloader = PermissionPreloader(permission_cache)