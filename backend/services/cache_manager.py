"""
Multi-Layer Cache Manager - L1 Application Cache
智阅3.0重构第二阶段：多层缓存架构管理器

Features:
- L1 Application Cache (Python LRU + Memory)
- Cache key management and namespacing
- TTL-based expiration
- Cache warming and preloading
- Performance monitoring and statistics
- Cache invalidation strategies
"""

import asyncio
import json
import logging
import time
import hashlib
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Union, Callable, Tuple
from functools import lru_cache, wraps
from collections import OrderedDict
import threading
from dataclasses import dataclass, asdict
import weakref

logger = logging.getLogger(__name__)


@dataclass
class CacheEntry:
    """Cache entry with metadata"""
    key: str
    value: Any
    created_at: float
    last_accessed: float
    access_count: int
    ttl: Optional[float] = None
    tags: Optional[List[str]] = None
    size_bytes: int = 0
    
    @property
    def is_expired(self) -> bool:
        """Check if cache entry is expired"""
        if not self.ttl:
            return False
        return time.time() - self.created_at > self.ttl
    
    @property
    def age_seconds(self) -> float:
        """Get age of cache entry in seconds"""
        return time.time() - self.created_at


@dataclass
class CacheStats:
    """Cache statistics"""
    hits: int = 0
    misses: int = 0
    evictions: int = 0
    size_bytes: int = 0
    entry_count: int = 0
    hit_rate: float = 0.0
    
    def update_hit_rate(self):
        """Update hit rate calculation"""
        total = self.hits + self.misses
        self.hit_rate = (self.hits / total * 100) if total > 0 else 0.0


class TTLCache:
    """Thread-safe TTL cache with LRU eviction"""
    
    def __init__(self, max_size: int = 1000, default_ttl: float = 3600):
        self.max_size = max_size
        self.default_ttl = default_ttl
        self._cache: OrderedDict[str, CacheEntry] = OrderedDict()
        self._lock = threading.RLock()
        self.stats = CacheStats()
        
        # Cleanup task
        self._cleanup_task: Optional[asyncio.Task] = None
        self._start_cleanup()
    
    def _start_cleanup(self):
        """Start background cleanup task"""
        if not self._cleanup_task or self._cleanup_task.done():
            self._cleanup_task = asyncio.create_task(self._cleanup_loop())
    
    async def _cleanup_loop(self):
        """Background cleanup of expired entries"""
        while True:
            try:
                await asyncio.sleep(60)  # Check every minute
                self._cleanup_expired()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Cache cleanup error: {e}")
    
    def _cleanup_expired(self):
        """Remove expired entries"""
        with self._lock:
            expired_keys = []
            for key, entry in self._cache.items():
                if entry.is_expired:
                    expired_keys.append(key)
            
            for key in expired_keys:
                del self._cache[key]
                self.stats.evictions += 1
    
    def _calculate_size(self, value: Any) -> int:
        """Estimate memory size of value"""
        try:
            if isinstance(value, (str, bytes)):
                return len(value)
            elif isinstance(value, (int, float)):
                return 8
            elif isinstance(value, (dict, list)):
                return len(json.dumps(value, default=str))
            else:
                return len(str(value))
        except:
            return 100  # Default estimate
    
    def _evict_lru(self):
        """Evict least recently used entries"""
        with self._lock:
            while len(self._cache) >= self.max_size:
                oldest_key = next(iter(self._cache))
                del self._cache[oldest_key]
                self.stats.evictions += 1
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        with self._lock:
            entry = self._cache.get(key)
            
            if not entry:
                self.stats.misses += 1
                return None
            
            if entry.is_expired:
                del self._cache[key]
                self.stats.misses += 1
                self.stats.evictions += 1
                return None
            
            # Update access info
            entry.last_accessed = time.time()
            entry.access_count += 1
            
            # Move to end (most recently used)
            self._cache.move_to_end(key)
            
            self.stats.hits += 1
            self.stats.update_hit_rate()
            
            return entry.value
    
    def set(self, key: str, value: Any, ttl: Optional[float] = None, tags: Optional[List[str]] = None):
        """Set value in cache"""
        with self._lock:
            if ttl is None:
                ttl = self.default_ttl
            
            size_bytes = self._calculate_size(value)
            
            entry = CacheEntry(
                key=key,
                value=value,
                created_at=time.time(),
                last_accessed=time.time(),
                access_count=1,
                ttl=ttl,
                tags=tags or [],
                size_bytes=size_bytes
            )
            
            # Remove old entry if exists
            if key in self._cache:
                old_entry = self._cache[key]
                self.stats.size_bytes -= old_entry.size_bytes
                self.stats.entry_count -= 1
            
            # Evict if necessary
            if len(self._cache) >= self.max_size:
                self._evict_lru()
            
            self._cache[key] = entry
            self.stats.size_bytes += size_bytes
            self.stats.entry_count += 1
    
    def delete(self, key: str) -> bool:
        """Delete key from cache"""
        with self._lock:
            if key in self._cache:
                entry = self._cache.pop(key)
                self.stats.size_bytes -= entry.size_bytes
                self.stats.entry_count -= 1
                return True
            return False
    
    def clear(self):
        """Clear all cache entries"""
        with self._lock:
            self._cache.clear()
            self.stats = CacheStats()
    
    def get_by_tags(self, tags: List[str]) -> Dict[str, Any]:
        """Get all entries with specified tags"""
        with self._lock:
            result = {}
            for key, entry in self._cache.items():
                if entry.tags and any(tag in entry.tags for tag in tags):
                    if not entry.is_expired:
                        result[key] = entry.value
            return result
    
    def invalidate_by_tags(self, tags: List[str]) -> int:
        """Invalidate entries by tags"""
        with self._lock:
            keys_to_delete = []
            for key, entry in self._cache.items():
                if entry.tags and any(tag in entry.tags for tag in tags):
                    keys_to_delete.append(key)
            
            for key in keys_to_delete:
                self.delete(key)
            
            return len(keys_to_delete)
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        with self._lock:
            return {
                "hits": self.stats.hits,
                "misses": self.stats.misses,
                "hit_rate": self.stats.hit_rate,
                "evictions": self.stats.evictions,
                "entry_count": self.stats.entry_count,
                "size_bytes": self.stats.size_bytes,
                "max_size": self.max_size,
                "utilization": (self.stats.entry_count / self.max_size * 100) if self.max_size > 0 else 0
            }


class ApplicationCacheManager:
    """L1 Application Cache Manager with multiple cache instances"""
    
    def __init__(self):
        # Different cache instances for different data types
        self.caches = {
            "default": TTLCache(max_size=1000, default_ttl=3600),
            "user_data": TTLCache(max_size=500, default_ttl=1800),
            "exam_data": TTLCache(max_size=2000, default_ttl=7200),
            "grading_results": TTLCache(max_size=5000, default_ttl=3600),
            "templates": TTLCache(max_size=100, default_ttl=86400),  # 24 hours
            "system_config": TTLCache(max_size=50, default_ttl=86400),
            "analytics": TTLCache(max_size=1000, default_ttl=1800),
            "ocr_results": TTLCache(max_size=3000, default_ttl=7200)
        }
        
        # Cache key prefixes for namespace management
        self.key_prefixes = {
            "user": "usr:",
            "exam": "exm:",
            "student": "std:",
            "template": "tpl:",
            "grading": "grd:",
            "analytics": "anl:",
            "system": "sys:",
            "ocr": "ocr:"
        }
        
        logger.info(f"Application cache manager initialized with {len(self.caches)} cache instances")
    
    def _get_cache_key(self, namespace: str, key: str) -> str:
        """Generate namespaced cache key"""
        prefix = self.key_prefixes.get(namespace, f"{namespace}:")
        return f"{prefix}{key}"
    
    def _select_cache(self, namespace: str) -> TTLCache:
        """Select appropriate cache instance based on namespace"""
        cache_mapping = {
            "user": "user_data",
            "exam": "exam_data", 
            "grading": "grading_results",
            "template": "templates",
            "system": "system_config",
            "analytics": "analytics",
            "ocr": "ocr_results"
        }
        
        cache_name = cache_mapping.get(namespace, "default")
        return self.caches[cache_name]
    
    def get(self, namespace: str, key: str) -> Optional[Any]:
        """Get value from appropriate cache"""
        cache_key = self._get_cache_key(namespace, key)
        cache = self._select_cache(namespace)
        return cache.get(cache_key)
    
    def set(self, namespace: str, key: str, value: Any, ttl: Optional[float] = None, tags: Optional[List[str]] = None):
        """Set value in appropriate cache"""
        cache_key = self._get_cache_key(namespace, key)
        cache = self._select_cache(namespace)
        
        # Add namespace to tags
        if tags is None:
            tags = []
        tags.append(f"ns:{namespace}")
        
        cache.set(cache_key, value, ttl, tags)
        logger.debug(f"Cached {cache_key} in {cache}")
    
    def delete(self, namespace: str, key: str) -> bool:
        """Delete key from cache"""
        cache_key = self._get_cache_key(namespace, key)
        cache = self._select_cache(namespace)
        return cache.delete(cache_key)
    
    def invalidate_namespace(self, namespace: str) -> int:
        """Invalidate all keys in namespace"""
        cache = self._select_cache(namespace)
        return cache.invalidate_by_tags([f"ns:{namespace}"])
    
    def invalidate_by_tags(self, tags: List[str]) -> int:
        """Invalidate entries by tags across all caches"""
        total_invalidated = 0
        for cache in self.caches.values():
            total_invalidated += cache.invalidate_by_tags(tags)
        return total_invalidated
    
    def get_all_stats(self) -> Dict[str, Any]:
        """Get statistics for all caches"""
        stats = {}
        total_stats = {
            "total_hits": 0,
            "total_misses": 0,
            "total_entries": 0,
            "total_size_bytes": 0,
            "total_evictions": 0,
            "overall_hit_rate": 0.0
        }
        
        for name, cache in self.caches.items():
            cache_stats = cache.get_stats()
            stats[name] = cache_stats
            
            total_stats["total_hits"] += cache_stats["hits"]
            total_stats["total_misses"] += cache_stats["misses"]
            total_stats["total_entries"] += cache_stats["entry_count"]
            total_stats["total_size_bytes"] += cache_stats["size_bytes"]
            total_stats["total_evictions"] += cache_stats["evictions"]
        
        # Calculate overall hit rate
        total_requests = total_stats["total_hits"] + total_stats["total_misses"]
        if total_requests > 0:
            total_stats["overall_hit_rate"] = (total_stats["total_hits"] / total_requests * 100)
        
        return {
            "caches": stats,
            "totals": total_stats,
            "timestamp": datetime.now().isoformat()
        }
    
    def warm_cache(self, warm_data: Dict[str, Dict[str, Any]]):
        """Warm cache with predefined data"""
        logger.info("Starting cache warming...")
        
        warmed_count = 0
        for namespace, data in warm_data.items():
            for key, value in data.items():
                self.set(namespace, key, value, tags=["warm_cache"])
                warmed_count += 1
        
        logger.info(f"Cache warming completed: {warmed_count} entries loaded")
    
    def clear_all(self):
        """Clear all caches"""
        for cache in self.caches.values():
            cache.clear()
        logger.info("All caches cleared")


# Cache decorators for easy function caching
def cached(namespace: str = "default", ttl: Optional[float] = None, 
          key_func: Optional[Callable] = None, tags: Optional[List[str]] = None):
    """Decorator for caching function results"""
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            # Generate cache key
            if key_func:
                cache_key = key_func(*args, **kwargs)
            else:
                # Default key generation
                key_parts = [func.__name__]
                key_parts.extend([str(arg) for arg in args])
                key_parts.extend([f"{k}={v}" for k, v in sorted(kwargs.items())])
                cache_key = hashlib.md5(":".join(key_parts).encode()).hexdigest()
            
            # Try to get from cache
            cached_result = cache_manager.get(namespace, cache_key)
            if cached_result is not None:
                logger.debug(f"Cache hit for {func.__name__}: {cache_key}")
                return cached_result
            
            # Execute function and cache result
            result = await func(*args, **kwargs)
            cache_manager.set(namespace, cache_key, result, ttl, tags)
            logger.debug(f"Cached result for {func.__name__}: {cache_key}")
            
            return result
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            # Generate cache key (same logic as async)
            if key_func:
                cache_key = key_func(*args, **kwargs)
            else:
                key_parts = [func.__name__]
                key_parts.extend([str(arg) for arg in args])
                key_parts.extend([f"{k}={v}" for k, v in sorted(kwargs.items())])
                cache_key = hashlib.md5(":".join(key_parts).encode()).hexdigest()
            
            # Try to get from cache
            cached_result = cache_manager.get(namespace, cache_key)
            if cached_result is not None:
                logger.debug(f"Cache hit for {func.__name__}: {cache_key}")
                return cached_result
            
            # Execute function and cache result
            result = func(*args, **kwargs)
            cache_manager.set(namespace, cache_key, result, ttl, tags)
            logger.debug(f"Cached result for {func.__name__}: {cache_key}")
            
            return result
        
        # Return appropriate wrapper based on function type
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator


def cache_invalidate(namespace: str, key: Optional[str] = None, tags: Optional[List[str]] = None):
    """Invalidate cache entries"""
    if key:
        cache_manager.delete(namespace, key)
    elif tags:
        cache_manager.invalidate_by_tags(tags)
    else:
        cache_manager.invalidate_namespace(namespace)


def cache_warm_exam_data(exam_id: str, exam_data: Dict[str, Any]):
    """Warm cache with exam-related data"""
    cache_manager.set("exam", exam_id, exam_data, ttl=7200, tags=["exam_data", f"exam_{exam_id}"])


def cache_warm_user_data(user_id: str, user_data: Dict[str, Any]):
    """Warm cache with user-related data"""
    cache_manager.set("user", user_id, user_data, ttl=1800, tags=["user_data", f"user_{user_id}"])


# Global cache manager instance
cache_manager = ApplicationCacheManager()


# Example usage functions
@cached(namespace="exam", ttl=3600, tags=["exam_list"])
async def get_user_exams(user_id: str) -> List[Dict[str, Any]]:
    """Example cached function - get user's exams"""
    # This would normally query the database
    logger.info(f"Fetching exams from database for user {user_id}")
    return [
        {"id": "exam1", "name": "Math Test", "status": "active"},
        {"id": "exam2", "name": "Science Quiz", "status": "completed"}
    ]


@cached(namespace="grading", ttl=7200, tags=["grading_results"])
def get_grading_results(exam_id: str, student_id: str) -> Dict[str, Any]:
    """Example cached function - get grading results"""
    logger.info(f"Fetching grading results for exam {exam_id}, student {student_id}")
    return {
        "exam_id": exam_id,
        "student_id": student_id,
        "score": 85.5,
        "graded_at": datetime.now().isoformat()
    }


# Cache monitoring functions
def get_cache_health() -> Dict[str, Any]:
    """Get cache health metrics"""
    stats = cache_manager.get_all_stats()
    
    health_status = "healthy"
    if stats["totals"]["overall_hit_rate"] < 50:
        health_status = "degraded"
    elif stats["totals"]["total_entries"] == 0:
        health_status = "cold"
    
    return {
        "status": health_status,
        "statistics": stats,
        "recommendations": _generate_cache_recommendations(stats)
    }


def _generate_cache_recommendations(stats: Dict[str, Any]) -> List[str]:
    """Generate cache optimization recommendations"""
    recommendations = []
    
    total_stats = stats["totals"]
    
    if total_stats["overall_hit_rate"] < 70:
        recommendations.append("Consider increasing cache TTL or warming more data")
    
    if total_stats["total_evictions"] > total_stats["total_hits"] * 0.1:
        recommendations.append("High eviction rate detected - consider increasing cache sizes")
    
    # Check individual cache utilization
    for cache_name, cache_stats in stats["caches"].items():
        if cache_stats["utilization"] > 90:
            recommendations.append(f"Cache '{cache_name}' is near capacity - consider increasing max_size")
        elif cache_stats["utilization"] < 20 and cache_stats["entry_count"] > 0:
            recommendations.append(f"Cache '{cache_name}' has low utilization - consider reducing max_size")
    
    if not recommendations:
        recommendations.append("Cache performance is optimal")
    
    return recommendations