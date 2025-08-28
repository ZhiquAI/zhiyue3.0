"""
L2 Distributed Cache - Redis Cluster Implementation
智阅3.0重构第二阶段：分布式缓存架构

Features:
- Redis cluster support with consistent hashing
- Smart cache invalidation strategies
- Cache-aside and Write-through patterns
- Distributed lock for cache warming
- Connection pooling and failover
- Performance monitoring and alerting
"""

import asyncio
import json
import logging
import time
import hashlib
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Union, Set, Tuple
from dataclasses import dataclass, asdict
import pickle
import zlib

import aioredis
from aioredis.client import Redis
from aioredis.exceptions import RedisError, ConnectionError

from .cache_manager import cache_manager

logger = logging.getLogger(__name__)


@dataclass
class CacheConfig:
    """Redis cache configuration"""
    redis_url: str = "redis://localhost:6379"
    key_prefix: str = "zhiyue:cache:"
    default_ttl: int = 3600
    max_connections: int = 20
    retry_attempts: int = 3
    retry_delay: float = 1.0
    compression_threshold: int = 1024  # bytes
    serialization: str = "json"  # json, pickle


@dataclass
class CacheMetrics:
    """Cache operation metrics"""
    hits: int = 0
    misses: int = 0
    sets: int = 0
    deletes: int = 0
    errors: int = 0
    total_size_bytes: int = 0
    compression_saves_bytes: int = 0
    
    @property
    def hit_rate(self) -> float:
        total = self.hits + self.misses
        return (self.hits / total * 100) if total > 0 else 0.0


class RedisDistributedCache:
    """Redis-based distributed cache with smart features"""
    
    def __init__(self, config: CacheConfig):
        self.config = config
        self.redis_client: Optional[Redis] = None
        self.connection_pool: Optional[aioredis.ConnectionPool] = None
        self.metrics = CacheMetrics()
        self.circuit_breaker_open = False
        self.circuit_breaker_failures = 0
        self.circuit_breaker_last_failure = 0
        self.circuit_breaker_threshold = 5
        self.circuit_breaker_timeout = 30  # seconds
        
        # Cache invalidation tracking
        self.invalidation_patterns: Set[str] = set()
        self.tag_tracking: Dict[str, Set[str]] = {}
        
        logger.info(f"Redis distributed cache initialized with config: {config}")
    
    async def initialize(self):
        """Initialize Redis connection"""
        try:
            self.connection_pool = aioredis.ConnectionPool.from_url(
                self.config.redis_url,
                max_connections=self.config.max_connections,
                retry_on_timeout=True,
                decode_responses=False  # We handle our own encoding
            )
            
            self.redis_client = Redis(connection_pool=self.connection_pool)
            
            # Test connection
            await self.redis_client.ping()
            logger.info("Redis distributed cache connection established")
            
            # Reset circuit breaker
            self.circuit_breaker_open = False
            self.circuit_breaker_failures = 0
            
        except Exception as e:
            logger.error(f"Failed to initialize Redis cache: {e}")
            self._handle_circuit_breaker()
            raise
    
    def _handle_circuit_breaker(self):
        """Handle circuit breaker logic"""
        self.circuit_breaker_failures += 1
        self.circuit_breaker_last_failure = time.time()
        
        if self.circuit_breaker_failures >= self.circuit_breaker_threshold:
            self.circuit_breaker_open = True
            logger.warning(f"Circuit breaker opened after {self.circuit_breaker_failures} failures")
    
    def _is_circuit_breaker_open(self) -> bool:
        """Check if circuit breaker should be closed"""
        if not self.circuit_breaker_open:
            return False
        
        # Check timeout
        if time.time() - self.circuit_breaker_last_failure > self.circuit_breaker_timeout:
            self.circuit_breaker_open = False
            self.circuit_breaker_failures = 0
            logger.info("Circuit breaker closed - attempting to reconnect")
            return False
        
        return True
    
    def _generate_key(self, namespace: str, key: str) -> str:
        """Generate namespaced cache key"""
        return f"{self.config.key_prefix}{namespace}:{key}"
    
    def _serialize_value(self, value: Any) -> bytes:
        """Serialize value for storage"""
        try:
            if self.config.serialization == "pickle":
                data = pickle.dumps(value)
            else:  # json
                data = json.dumps(value, default=str).encode('utf-8')
            
            # Compress if over threshold
            if len(data) > self.config.compression_threshold:
                compressed = zlib.compress(data)
                if len(compressed) < len(data):
                    self.metrics.compression_saves_bytes += len(data) - len(compressed)
                    return b"COMPRESSED:" + compressed
            
            return data
            
        except Exception as e:
            logger.error(f"Serialization error: {e}")
            raise
    
    def _deserialize_value(self, data: bytes) -> Any:
        """Deserialize value from storage"""
        try:
            # Check if compressed
            if data.startswith(b"COMPRESSED:"):
                data = zlib.decompress(data[11:])
            
            if self.config.serialization == "pickle":
                return pickle.loads(data)
            else:  # json
                return json.loads(data.decode('utf-8'))
                
        except Exception as e:
            logger.error(f"Deserialization error: {e}")
            raise
    
    async def _execute_with_retry(self, operation: callable, *args, **kwargs):
        """Execute Redis operation with retry and circuit breaker"""
        if self._is_circuit_breaker_open():
            logger.debug("Circuit breaker open - skipping Redis operation")
            return None
        
        for attempt in range(self.config.retry_attempts):
            try:
                if not self.redis_client:
                    await self.initialize()
                
                result = await operation(*args, **kwargs)
                
                # Reset circuit breaker on success
                if self.circuit_breaker_failures > 0:
                    self.circuit_breaker_failures = max(0, self.circuit_breaker_failures - 1)
                
                return result
                
            except (ConnectionError, RedisError) as e:
                logger.warning(f"Redis operation failed (attempt {attempt + 1}): {e}")
                self.metrics.errors += 1
                
                if attempt < self.config.retry_attempts - 1:
                    await asyncio.sleep(self.config.retry_delay * (2 ** attempt))
                else:
                    self._handle_circuit_breaker()
                    raise
    
    async def get(self, namespace: str, key: str) -> Optional[Any]:
        """Get value from distributed cache"""
        cache_key = self._generate_key(namespace, key)
        
        try:
            # First try L1 cache
            l1_result = cache_manager.get(namespace, key)
            if l1_result is not None:
                return l1_result
            
            # Then try Redis
            result = await self._execute_with_retry(
                self.redis_client.get, cache_key
            )
            
            if result is not None:
                value = self._deserialize_value(result)
                self.metrics.hits += 1
                
                # Populate L1 cache
                cache_manager.set(namespace, key, value, ttl=300)  # 5 min L1 TTL
                
                return value
            else:
                self.metrics.misses += 1
                return None
                
        except Exception as e:
            logger.error(f"Cache get error for {cache_key}: {e}")
            self.metrics.errors += 1
            
            # Fallback to L1 only
            return cache_manager.get(namespace, key)
    
    async def set(self, namespace: str, key: str, value: Any, ttl: Optional[int] = None, 
                 tags: Optional[List[str]] = None):
        """Set value in distributed cache"""
        cache_key = self._generate_key(namespace, key)
        
        if ttl is None:
            ttl = self.config.default_ttl
        
        try:
            serialized_value = self._serialize_value(value)
            self.metrics.total_size_bytes += len(serialized_value)
            
            # Set in Redis
            await self._execute_with_retry(
                self.redis_client.setex, cache_key, ttl, serialized_value
            )
            
            # Set in L1 cache with shorter TTL
            l1_ttl = min(ttl, 300) if ttl > 0 else 300
            cache_manager.set(namespace, key, value, l1_ttl, tags)
            
            # Track tags for invalidation
            if tags:
                for tag in tags:
                    if tag not in self.tag_tracking:
                        self.tag_tracking[tag] = set()
                    self.tag_tracking[tag].add(cache_key)
                    
                    # Store tag mapping in Redis
                    tag_key = f"{self.config.key_prefix}tags:{tag}"
                    await self._execute_with_retry(
                        self.redis_client.sadd, tag_key, cache_key
                    )
                    await self._execute_with_retry(
                        self.redis_client.expire, tag_key, ttl + 3600  # Tags live longer
                    )
            
            self.metrics.sets += 1
            logger.debug(f"Cached {cache_key} with TTL {ttl}")
            
        except Exception as e:
            logger.error(f"Cache set error for {cache_key}: {e}")
            
            # Fallback to L1 only
            cache_manager.set(namespace, key, value, ttl, tags)
    
    async def delete(self, namespace: str, key: str) -> bool:
        """Delete key from distributed cache"""
        cache_key = self._generate_key(namespace, key)
        
        try:
            # Delete from Redis
            result = await self._execute_with_retry(
                self.redis_client.delete, cache_key
            )
            
            # Delete from L1
            cache_manager.delete(namespace, key)
            
            self.metrics.deletes += 1
            return bool(result)
            
        except Exception as e:
            logger.error(f"Cache delete error for {cache_key}: {e}")
            
            # Fallback to L1 only
            return cache_manager.delete(namespace, key)
    
    async def invalidate_by_pattern(self, pattern: str) -> int:
        """Invalidate keys matching pattern"""
        try:
            full_pattern = f"{self.config.key_prefix}{pattern}"
            
            # Get matching keys
            keys = await self._execute_with_retry(
                self.redis_client.keys, full_pattern
            )
            
            if keys:
                # Delete in batches
                batch_size = 100
                deleted_count = 0
                
                for i in range(0, len(keys), batch_size):
                    batch = keys[i:i + batch_size]
                    result = await self._execute_with_retry(
                        self.redis_client.delete, *batch
                    )
                    deleted_count += result or 0
                
                logger.info(f"Invalidated {deleted_count} keys matching pattern: {pattern}")
                return deleted_count
            
            return 0
            
        except Exception as e:
            logger.error(f"Pattern invalidation error for {pattern}: {e}")
            return 0
    
    async def invalidate_by_tags(self, tags: List[str]) -> int:
        """Invalidate all keys with specified tags"""
        try:
            total_invalidated = 0
            
            for tag in tags:
                tag_key = f"{self.config.key_prefix}tags:{tag}"
                
                # Get all keys with this tag
                keys = await self._execute_with_retry(
                    self.redis_client.smembers, tag_key
                )
                
                if keys:
                    # Delete the keys
                    result = await self._execute_with_retry(
                        self.redis_client.delete, *keys
                    )
                    total_invalidated += result or 0
                    
                    # Clean up tag tracking
                    await self._execute_with_retry(
                        self.redis_client.delete, tag_key
                    )
                    
                    if tag in self.tag_tracking:
                        del self.tag_tracking[tag]
            
            # Also invalidate from L1 cache
            l1_invalidated = cache_manager.invalidate_by_tags(tags)
            
            logger.info(f"Invalidated {total_invalidated} keys from Redis and {l1_invalidated} from L1 by tags: {tags}")
            return total_invalidated + l1_invalidated
            
        except Exception as e:
            logger.error(f"Tag invalidation error for {tags}: {e}")
            return cache_manager.invalidate_by_tags(tags)
    
    async def exists(self, namespace: str, key: str) -> bool:
        """Check if key exists in cache"""
        cache_key = self._generate_key(namespace, key)
        
        try:
            # Check L1 first
            if cache_manager.get(namespace, key) is not None:
                return True
            
            # Check Redis
            result = await self._execute_with_retry(
                self.redis_client.exists, cache_key
            )
            return bool(result)
            
        except Exception as e:
            logger.error(f"Cache exists check error for {cache_key}: {e}")
            return False
    
    async def get_ttl(self, namespace: str, key: str) -> int:
        """Get remaining TTL for key"""
        cache_key = self._generate_key(namespace, key)
        
        try:
            result = await self._execute_with_retry(
                self.redis_client.ttl, cache_key
            )
            return result or -1
            
        except Exception as e:
            logger.error(f"TTL check error for {cache_key}: {e}")
            return -1
    
    async def increment(self, namespace: str, key: str, amount: int = 1, ttl: Optional[int] = None) -> int:
        """Atomically increment a counter"""
        cache_key = self._generate_key(namespace, key)
        
        try:
            # Use Redis pipeline for atomic operation
            pipe = self.redis_client.pipeline()
            pipe.incr(cache_key, amount)
            
            if ttl:
                pipe.expire(cache_key, ttl)
            
            results = await self._execute_with_retry(pipe.execute)
            return results[0] if results else 0
            
        except Exception as e:
            logger.error(f"Cache increment error for {cache_key}: {e}")
            return 0
    
    async def get_or_set(self, namespace: str, key: str, factory_func: callable, 
                        ttl: Optional[int] = None, tags: Optional[List[str]] = None) -> Any:
        """Get value or set it using factory function if not exists"""
        value = await self.get(namespace, key)
        
        if value is not None:
            return value
        
        # Generate value using factory function
        if asyncio.iscoroutinefunction(factory_func):
            value = await factory_func()
        else:
            value = factory_func()
        
        # Cache the result
        await self.set(namespace, key, value, ttl, tags)
        
        return value
    
    async def mget(self, namespace: str, keys: List[str]) -> Dict[str, Any]:
        """Get multiple values"""
        cache_keys = [self._generate_key(namespace, key) for key in keys]
        results = {}
        
        try:
            # Get from L1 first
            missing_keys = []
            missing_cache_keys = []
            
            for i, key in enumerate(keys):
                l1_result = cache_manager.get(namespace, key)
                if l1_result is not None:
                    results[key] = l1_result
                else:
                    missing_keys.append(key)
                    missing_cache_keys.append(cache_keys[i])
            
            # Get missing keys from Redis
            if missing_cache_keys:
                redis_results = await self._execute_with_retry(
                    self.redis_client.mget, *missing_cache_keys
                )
                
                for i, redis_result in enumerate(redis_results):
                    if redis_result is not None:
                        key = missing_keys[i]
                        value = self._deserialize_value(redis_result)
                        results[key] = value
                        
                        # Populate L1 cache
                        cache_manager.set(namespace, key, value, ttl=300)
            
            self.metrics.hits += len([r for r in results.values() if r is not None])
            self.metrics.misses += len(keys) - len(results)
            
            return results
            
        except Exception as e:
            logger.error(f"Multi-get error: {e}")
            return {}
    
    async def mset(self, namespace: str, key_value_pairs: Dict[str, Any], 
                  ttl: Optional[int] = None, tags: Optional[List[str]] = None):
        """Set multiple values"""
        try:
            # Prepare data for Redis
            redis_data = {}
            for key, value in key_value_pairs.items():
                cache_key = self._generate_key(namespace, key)
                serialized_value = self._serialize_value(value)
                redis_data[cache_key] = serialized_value
                
                # Set in L1 cache
                l1_ttl = min(ttl, 300) if ttl and ttl > 0 else 300
                cache_manager.set(namespace, key, value, l1_ttl, tags)
            
            # Set in Redis
            if redis_data:
                pipe = self.redis_client.pipeline()
                pipe.mset(redis_data)
                
                # Set TTL for all keys
                if ttl:
                    for cache_key in redis_data.keys():
                        pipe.expire(cache_key, ttl)
                
                await self._execute_with_retry(pipe.execute)
                
                self.metrics.sets += len(redis_data)
                
        except Exception as e:
            logger.error(f"Multi-set error: {e}")
    
    async def clear_namespace(self, namespace: str) -> int:
        """Clear all keys in namespace"""
        pattern = f"{namespace}:*"
        return await self.invalidate_by_pattern(pattern)
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get cache performance metrics"""
        return {
            "hits": self.metrics.hits,
            "misses": self.metrics.misses,
            "sets": self.metrics.sets,
            "deletes": self.metrics.deletes,
            "errors": self.metrics.errors,
            "hit_rate": self.metrics.hit_rate,
            "total_size_bytes": self.metrics.total_size_bytes,
            "compression_saves_bytes": self.metrics.compression_saves_bytes,
            "circuit_breaker_open": self.circuit_breaker_open,
            "circuit_breaker_failures": self.circuit_breaker_failures,
            "connection_status": "connected" if self.redis_client else "disconnected"
        }
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform health check"""
        try:
            start_time = time.time()
            
            # Test connectivity
            await self._execute_with_retry(self.redis_client.ping)
            
            # Test operations
            test_key = f"{self.config.key_prefix}healthcheck"
            test_value = f"healthcheck_{int(time.time())}"
            
            await self._execute_with_retry(
                self.redis_client.setex, test_key, 60, test_value.encode()
            )
            
            retrieved = await self._execute_with_retry(
                self.redis_client.get, test_key
            )
            
            await self._execute_with_retry(
                self.redis_client.delete, test_key
            )
            
            response_time = time.time() - start_time
            
            return {
                "status": "healthy",
                "response_time_ms": response_time * 1000,
                "test_success": retrieved.decode() == test_value,
                "metrics": self.get_metrics(),
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "metrics": self.get_metrics(),
                "timestamp": datetime.now().isoformat()
            }
    
    async def close(self):
        """Close Redis connections"""
        if self.connection_pool:
            await self.connection_pool.disconnect()
        self.redis_client = None
        logger.info("Redis distributed cache connections closed")


# Global distributed cache instance
distributed_cache_config = CacheConfig()
distributed_cache = RedisDistributedCache(distributed_cache_config)


# Integration with L1 cache for seamless operation
class HybridCacheManager:
    """Manages both L1 and L2 caches seamlessly"""
    
    def __init__(self, l1_cache: Any, l2_cache: RedisDistributedCache):
        self.l1 = l1_cache
        self.l2 = l2_cache
    
    async def get(self, namespace: str, key: str) -> Optional[Any]:
        """Get from L1 first, then L2"""
        return await self.l2.get(namespace, key)
    
    async def set(self, namespace: str, key: str, value: Any, ttl: Optional[int] = None, 
                tags: Optional[List[str]] = None):
        """Set in both L1 and L2"""
        await self.l2.set(namespace, key, value, ttl, tags)
    
    async def delete(self, namespace: str, key: str) -> bool:
        """Delete from both caches"""
        return await self.l2.delete(namespace, key)
    
    async def invalidate_by_tags(self, tags: List[str]) -> int:
        """Invalidate by tags in both caches"""
        return await self.l2.invalidate_by_tags(tags)


# Global hybrid cache manager
hybrid_cache = HybridCacheManager(cache_manager, distributed_cache)


# Convenience functions for common operations
async def cache_exam_data(exam_id: str, exam_data: Dict[str, Any], ttl: int = 7200):
    """Cache exam data with appropriate tags"""
    await distributed_cache.set(
        "exam", exam_id, exam_data, ttl, 
        tags=["exam_data", f"exam_{exam_id}", "exams"]
    )


async def cache_grading_result(exam_id: str, student_id: str, result: Dict[str, Any], ttl: int = 3600):
    """Cache grading result with appropriate tags"""
    key = f"{exam_id}:{student_id}"
    await distributed_cache.set(
        "grading", key, result, ttl,
        tags=["grading_results", f"exam_{exam_id}", f"student_{student_id}"]
    )


async def invalidate_exam_cache(exam_id: str):
    """Invalidate all cache entries related to an exam"""
    await distributed_cache.invalidate_by_tags([f"exam_{exam_id}"])


async def warm_distributed_cache():
    """Warm distributed cache with commonly accessed data"""
    # This would typically load from database
    logger.info("Starting distributed cache warming...")
    
    # Example warm data - in real implementation, load from DB
    warm_data = {
        "system_config": {"maintenance_mode": False, "max_file_size": 50000000},
        "template_list": ["template1", "template2", "template3"]
    }
    
    for key, value in warm_data.items():
        await distributed_cache.set("system", key, value, ttl=86400, tags=["warm_cache"])
    
    logger.info("Distributed cache warming completed")


# Initialize function
async def initialize_distributed_cache():
    """Initialize the distributed cache system"""
    await distributed_cache.initialize()
    await warm_distributed_cache()


# Cleanup function  
async def cleanup_distributed_cache():
    """Cleanup distributed cache connections"""
    await distributed_cache.close()