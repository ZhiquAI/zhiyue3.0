"""
Enhanced Query Optimizer and Performance Enhancement
智阅3.0增强查询优化器 - 多层缓存集成版本
"""

import asyncio
import logging
import hashlib
import time
import json
import re
from typing import Dict, Any, List, Optional, Union, Tuple, Callable
from functools import wraps
from contextlib import contextmanager, asynccontextmanager
from sqlalchemy import text, event
from sqlalchemy.orm import Session
from sqlalchemy.engine import Engine
from sqlalchemy.ext.asyncio import AsyncSession, AsyncEngine
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum
from collections import defaultdict, deque
import threading
import asyncio

logger = logging.getLogger(__name__)

class QueryType(str, Enum):
    """查询类型"""
    SELECT = "SELECT"
    INSERT = "INSERT"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    UNKNOWN = "UNKNOWN"

class QueryComplexity(str, Enum):
    """查询复杂度"""
    SIMPLE = "simple"      # 单表查询，简单条件
    MEDIUM = "medium"      # 多表JOIN，复杂条件
    COMPLEX = "complex"    # 子查询，聚合，复杂JOIN

class OptimizationStrategy(str, Enum):
    """优化策略"""
    INDEX_SUGGESTION = "index_suggestion"
    QUERY_REWRITE = "query_rewrite"
    CACHE_OPTIMIZATION = "cache_optimization"
    PARTITION_SUGGESTION = "partition_suggestion"

@dataclass
class EnhancedQueryMetrics:
    """增强查询性能指标"""
    query_id: str
    sql: str
    query_type: QueryType
    complexity: QueryComplexity
    execution_time: float = 0.0
    rows_affected: int = 0
    rows_examined: int = 0
    temp_tables_created: int = 0
    sort_merge_passes: int = 0
    index_used: bool = False
    full_table_scan: bool = False
    cache_hit: bool = False
    connection_pool_wait_time: float = 0.0
    timestamp: datetime = field(default_factory=datetime.now)
    connection_id: str = ""
    database: str = ""
    optimization_suggestions: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "query_id": self.query_id,
            "sql": self.sql[:200] + '...' if len(self.sql) > 200 else self.sql,
            "query_type": self.query_type.value,
            "complexity": self.complexity.value,
            "execution_time": self.execution_time,
            "rows_affected": self.rows_affected,
            "rows_examined": self.rows_examined,
            "temp_tables_created": self.temp_tables_created,
            "sort_merge_passes": self.sort_merge_passes,
            "index_used": self.index_used,
            "full_table_scan": self.full_table_scan,
            "cache_hit": self.cache_hit,
            "connection_pool_wait_time": self.connection_pool_wait_time,
            "timestamp": self.timestamp.isoformat(),
            "connection_id": self.connection_id,
            "database": self.database,
            "optimization_suggestions": self.optimization_suggestions
        }

@dataclass
class QueryStats:
    """查询统计信息"""
    query_hash: str
    sql: str
    execution_count: int
    total_time: float
    avg_time: float
    min_time: float
    max_time: float
    last_executed: datetime
    cache_hits: int = 0
    cache_misses: int = 0
    
    # 增强统计字段
    query_type: QueryType = QueryType.UNKNOWN
    complexity: QueryComplexity = QueryComplexity.SIMPLE
    optimization_score: float = 0.0  # 0-100，优化程度评分
    suggested_optimizations: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'query_hash': self.query_hash,
            'sql': self.sql[:200] + '...' if len(self.sql) > 200 else self.sql,
            'execution_count': self.execution_count,
            'total_time': self.total_time,
            'avg_time': self.avg_time,
            'min_time': self.min_time,
            'max_time': self.max_time,
            'last_executed': self.last_executed.isoformat(),
            'cache_hits': self.cache_hits,
            'cache_misses': self.cache_misses,
            'cache_hit_rate': self.cache_hits / max(self.cache_hits + self.cache_misses, 1)
        }


class QueryCache:
    """查询结果缓存"""
    
    def __init__(self, max_size: int = 1000, ttl_seconds: int = 300):
        self.max_size = max_size
        self.ttl = timedelta(seconds=ttl_seconds)
        self._cache: Dict[str, Tuple[Any, datetime]] = {}
        self._lock = threading.RLock()
        self._access_times: Dict[str, datetime] = {}
        
    def get(self, key: str) -> Optional[Any]:
        """从缓存获取数据"""
        with self._lock:
            if key in self._cache:
                value, timestamp = self._cache[key]
                if datetime.utcnow() - timestamp <= self.ttl:
                    self._access_times[key] = datetime.utcnow()
                    return value
                else:
                    # 过期，删除
                    del self._cache[key]
                    self._access_times.pop(key, None)
        return None
    
    def set(self, key: str, value: Any):
        """设置缓存数据"""
        with self._lock:
            # 如果缓存已满，删除最久未使用的项
            if len(self._cache) >= self.max_size and key not in self._cache:
                self._evict_lru()
            
            self._cache[key] = (value, datetime.utcnow())
            self._access_times[key] = datetime.utcnow()
    
    def _evict_lru(self):
        """删除最久未使用的项"""
        if not self._access_times:
            return
        
        lru_key = min(self._access_times.items(), key=lambda x: x[1])[0]
        self._cache.pop(lru_key, None)
        self._access_times.pop(lru_key, None)
    
    def clear(self):
        """清空缓存"""
        with self._lock:
            self._cache.clear()
            self._access_times.clear()
    
    def stats(self) -> Dict[str, Any]:
        """获取缓存统计信息"""
        with self._lock:
            return {
                'size': len(self._cache),
                'max_size': self.max_size,
                'ttl_seconds': self.ttl.total_seconds(),
                'hit_rate': 0  # 在QueryOptimizer中计算
            }


class QueryOptimizer:
    """查询优化器"""
    
    def __init__(self, engine: Engine, enable_cache: bool = True, cache_ttl: int = 300):
        self.engine = engine
        self.enable_cache = enable_cache
        self.cache = QueryCache(ttl_seconds=cache_ttl) if enable_cache else None
        
        # 查询统计
        self._query_stats: Dict[str, QueryStats] = {}
        self._stats_lock = threading.RLock()
        
        # 慢查询阈值（秒）
        self.slow_query_threshold = 1.0
        
        # 设置查询拦截器
        self._setup_query_interceptor()
        
        logger.info("Query optimizer initialized")
    
    def _setup_query_interceptor(self):
        """设置查询拦截器"""
        
        @event.listens_for(self.engine, "before_cursor_execute")
        def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
            context._query_start_time = time.time()
        
        @event.listens_for(self.engine, "after_cursor_execute")
        def after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
            if hasattr(context, '_query_start_time'):
                execution_time = time.time() - context._query_start_time
                self._record_query_stats(statement, execution_time, parameters)
    
    def _record_query_stats(self, sql: str, execution_time: float, parameters: Any = None):
        """记录查询统计信息"""
        query_hash = self._get_query_hash(sql)
        
        with self._stats_lock:
            if query_hash in self._query_stats:
                stats = self._query_stats[query_hash]
                stats.execution_count += 1
                stats.total_time += execution_time
                stats.avg_time = stats.total_time / stats.execution_count
                stats.min_time = min(stats.min_time, execution_time)
                stats.max_time = max(stats.max_time, execution_time)
                stats.last_executed = datetime.utcnow()
            else:
                self._query_stats[query_hash] = QueryStats(
                    query_hash=query_hash,
                    sql=sql,
                    execution_count=1,
                    total_time=execution_time,
                    avg_time=execution_time,
                    min_time=execution_time,
                    max_time=execution_time,
                    last_executed=datetime.utcnow()
                )
            
            # 记录慢查询
            if execution_time > self.slow_query_threshold:
                logger.warning(f"Slow query detected ({execution_time:.3f}s): {sql[:100]}...")
    
    def _get_query_hash(self, sql: str) -> str:
        """获取查询哈希"""
        # 标准化SQL（移除额外空白字符，转换为小写）
        normalized_sql = ' '.join(sql.strip().lower().split())
        return hashlib.md5(normalized_sql.encode()).hexdigest()
    
    def cached_execute(self, session: Session, sql: str, params: Dict = None, cache_key: str = None) -> Any:
        """执行缓存查询"""
        if not self.enable_cache or not self.cache:
            return session.execute(text(sql), params or {})
        
        # 生成缓存键
        if not cache_key:
            cache_key = self._generate_cache_key(sql, params)
        
        # 尝试从缓存获取
        cached_result = self.cache.get(cache_key)
        if cached_result is not None:
            # 更新缓存命中统计
            query_hash = self._get_query_hash(sql)
            with self._stats_lock:
                if query_hash in self._query_stats:
                    self._query_stats[query_hash].cache_hits += 1
            
            logger.debug(f"Cache hit for query: {sql[:50]}...")
            return cached_result
        
        # 缓存未命中，执行查询
        start_time = time.time()
        result = session.execute(text(sql), params or {})
        
        # 将结果转换为可缓存的格式
        if hasattr(result, 'fetchall'):
            cacheable_result = result.fetchall()
        else:
            cacheable_result = result
        
        # 存储到缓存
        self.cache.set(cache_key, cacheable_result)
        
        # 更新缓存未命中统计
        query_hash = self._get_query_hash(sql)
        with self._stats_lock:
            if query_hash in self._query_stats:
                self._query_stats[query_hash].cache_misses += 1
        
        execution_time = time.time() - start_time
        logger.debug(f"Cache miss for query ({execution_time:.3f}s): {sql[:50]}...")
        
        return cacheable_result
    
    def _generate_cache_key(self, sql: str, params: Dict = None) -> str:
        """生成缓存键"""
        cache_data = {
            'sql': sql.strip().lower(),
            'params': params or {}
        }
        cache_string = json.dumps(cache_data, sort_keys=True)
        return hashlib.md5(cache_string.encode()).hexdigest()
    
    def optimize_query(self, sql: str) -> str:
        """优化SQL查询"""
        optimized_sql = sql.strip()
        
        # 基本优化规则
        optimizations = [
            self._add_limit_if_missing,
            self._optimize_joins,
            self._optimize_where_clauses,
            self._optimize_select_fields
        ]
        
        for optimization in optimizations:
            try:
                optimized_sql = optimization(optimized_sql)
            except Exception as e:
                logger.warning(f"Query optimization failed: {e}")
        
        return optimized_sql
    
    def _add_limit_if_missing(self, sql: str) -> str:
        """为没有LIMIT的SELECT查询添加合理的LIMIT"""
        sql_lower = sql.lower().strip()
        
        if (sql_lower.startswith('select') and 
            'limit' not in sql_lower and 
            'count(' not in sql_lower):
            
            # 为可能返回大量结果的查询添加LIMIT
            if any(keyword in sql_lower for keyword in ['join', 'where', 'group by']):
                return f"{sql.rstrip().rstrip(';')} LIMIT 1000"
        
        return sql
    
    def _optimize_joins(self, sql: str) -> str:
        """优化JOIN查询"""
        # 建议使用INNER JOIN而不是WHERE子句连接
        # 这里只是示例，实际实现需要更复杂的SQL解析
        if 'where' in sql.lower() and '=' in sql and 'join' not in sql.lower():
            logger.info("Consider using INNER JOIN instead of WHERE clause for table joins")
        
        return sql
    
    def _optimize_where_clauses(self, sql: str) -> str:
        """优化WHERE子句"""
        # 检查是否在WHERE子句中使用了函数，建议添加函数索引
        sql_lower = sql.lower()
        if 'where' in sql_lower:
            functions = ['lower(', 'upper(', 'substr(', 'date(', 'year(', 'month(']
            for func in functions:
                if func in sql_lower:
                    logger.info(f"Consider creating a function-based index for {func}")
                    break
        
        return sql
    
    def _optimize_select_fields(self, sql: str) -> str:
        """优化SELECT字段"""
        # 建议避免SELECT *
        if 'select *' in sql.lower():
            logger.info("Consider selecting specific columns instead of using SELECT *")
        
        return sql
    
    def get_slow_queries(self, threshold: float = None) -> List[QueryStats]:
        """获取慢查询列表"""
        threshold = threshold or self.slow_query_threshold
        
        with self._stats_lock:
            return [
                stats for stats in self._query_stats.values()
                if stats.avg_time > threshold
            ]
    
    def get_most_frequent_queries(self, limit: int = 10) -> List[QueryStats]:
        """获取最频繁执行的查询"""
        with self._stats_lock:
            return sorted(
                self._query_stats.values(),
                key=lambda x: x.execution_count,
                reverse=True
            )[:limit]
    
    def get_query_stats(self) -> List[Dict[str, Any]]:
        """获取所有查询统计信息"""
        with self._stats_lock:
            return [stats.to_dict() for stats in self._query_stats.values()]
    
    def clear_stats(self):
        """清空统计信息"""
        with self._stats_lock:
            self._query_stats.clear()
        
        if self.cache:
            self.cache.clear()
        
        logger.info("Query statistics and cache cleared")
    
    def generate_optimization_report(self) -> Dict[str, Any]:
        """生成优化报告"""
        with self._stats_lock:
            total_queries = len(self._query_stats)
            if total_queries == 0:
                return {'status': 'no_data', 'message': 'No query statistics available'}
            
            slow_queries = self.get_slow_queries()
            most_frequent = self.get_most_frequent_queries()
            
            total_execution_time = sum(stats.total_time for stats in self._query_stats.values())
            total_executions = sum(stats.execution_count for stats in self._query_stats.values())
            
            cache_stats = self.cache.stats() if self.cache else None
            if cache_stats and total_executions > 0:
                total_cache_hits = sum(stats.cache_hits for stats in self._query_stats.values())
                total_cache_misses = sum(stats.cache_misses for stats in self._query_stats.values())
                cache_stats['hit_rate'] = total_cache_hits / max(total_cache_hits + total_cache_misses, 1)
            
            recommendations = []
            
            # 分析并生成建议
            if slow_queries:
                recommendations.append(f"发现 {len(slow_queries)} 个慢查询，建议优化")
            
            if cache_stats and cache_stats['hit_rate'] < 0.5:
                recommendations.append("缓存命中率较低，考虑调整缓存策略或TTL")
            
            if total_execution_time / max(total_executions, 1) > 0.1:
                recommendations.append("平均查询时间较长，建议检查索引和查询结构")
            
            return {
                'timestamp': datetime.utcnow().isoformat(),
                'summary': {
                    'total_unique_queries': total_queries,
                    'total_executions': total_executions,
                    'total_execution_time': total_execution_time,
                    'avg_execution_time': total_execution_time / max(total_executions, 1),
                    'slow_queries_count': len(slow_queries),
                    'cache_enabled': self.enable_cache
                },
                'slow_queries': [query.to_dict() for query in slow_queries[:10]],
                'most_frequent_queries': [query.to_dict() for query in most_frequent],
                'cache_stats': cache_stats,
                'recommendations': recommendations
            }


# 查询优化装饰器
def optimize_query(cache_ttl: int = 300, cache_key: str = None):
    """查询优化装饰器"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # 这里可以实现查询优化逻辑
            return func(*args, **kwargs)
        return wrapper
    return decorator


# 批量查询优化
@contextmanager
def batch_query_context(session: Session, batch_size: int = 100):
    """批量查询上下文管理器"""
    original_autoflush = session.autoflush
    session.autoflush = False
    
    try:
        yield session
        session.flush()
    finally:
        session.autoflush = original_autoflush


# 使用示例
if __name__ == "__main__":
    from config.database import create_database_engine
    
    try:
        engine = create_database_engine()
        optimizer = QueryOptimizer(engine)
        
        # 模拟一些查询来测试统计功能
        with engine.connect() as conn:
            conn.execute(text("SELECT COUNT(*) FROM users"))
            conn.execute(text("SELECT * FROM exams LIMIT 10"))
        
        # 生成优化报告
        report = optimizer.generate_optimization_report()
        print(f"Query optimization report: {json.dumps(report, indent=2)}")
        
    except Exception as e:
        print(f"Query optimizer test failed: {e}")

# 创建全局实例
query_optimizer = None

def get_query_optimizer(engine=None):
    """获取查询优化器实例"""
    global query_optimizer
    if query_optimizer is None:
        if engine is None:
            from config.database import create_database_engine
            engine = create_database_engine()
        query_optimizer = QueryOptimizer(engine)
    return query_optimizer