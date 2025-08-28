"""
数据库连接池优化
提供高性能的数据库连接管理和监控
"""

import logging
import time
from typing import Dict, Any, Optional
from contextlib import contextmanager
from sqlalchemy import create_engine, event, pool
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool, StaticPool
from sqlalchemy.engine import Engine
import threading
from dataclasses import dataclass
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


@dataclass
class ConnectionPoolStats:
    """连接池统计信息"""
    pool_size: int
    checked_in: int
    checked_out: int
    overflow: int
    invalid: int
    total_connections: int
    peak_connections: int
    connection_requests: int
    pool_hits: int
    pool_misses: int
    average_checkout_time: float
    longest_checkout_time: float
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'pool_size': self.pool_size,
            'checked_in': self.checked_in,
            'checked_out': self.checked_out,
            'overflow': self.overflow,
            'invalid': self.invalid,
            'total_connections': self.total_connections,
            'peak_connections': self.peak_connections,
            'connection_requests': self.connection_requests,
            'pool_hits': self.pool_hits,
            'pool_misses': self.pool_misses,
            'average_checkout_time': self.average_checkout_time,
            'longest_checkout_time': self.longest_checkout_time
        }


class OptimizedConnectionPool:
    """优化的数据库连接池"""
    
    def __init__(self, database_url: str, **kwargs):
        self.database_url = database_url
        self.engine = None
        self.session_factory = None
        
        # 统计信息
        self._stats_lock = threading.Lock()
        self._connection_requests = 0
        self._pool_hits = 0
        self._pool_misses = 0
        self._checkout_times = []
        self._peak_connections = 0
        
        # 配置参数
        self.config = self._get_optimal_config(**kwargs)
        
        # 创建引擎
        self._create_engine()
        
        # 设置事件监听器
        self._setup_event_listeners()
        
        logger.info(f"Optimized connection pool created for {self._get_db_type()}")
    
    def _get_db_type(self) -> str:
        """获取数据库类型"""
        if self.database_url.startswith('sqlite'):
            return 'sqlite'
        elif self.database_url.startswith('postgresql'):
            return 'postgresql'
        elif self.database_url.startswith('mysql'):
            return 'mysql'
        else:
            return 'unknown'
    
    def _get_optimal_config(self, **kwargs) -> Dict[str, Any]:
        """获取最优配置参数"""
        db_type = self._get_db_type()
        
        # 默认配置
        default_configs = {
            'sqlite': {
                'poolclass': StaticPool,
                'connect_args': {
                    "check_same_thread": False,
                    "timeout": 20,
                    "isolation_level": None
                }
            },
            'postgresql': {
                'pool_size': 20,
                'max_overflow': 30,
                'pool_timeout': 30,
                'pool_recycle': 3600,  # 1 hour
                'pool_pre_ping': True,
                'poolclass': QueuePool,
                'connect_args': {
                    "connect_timeout": 10,
                    "server_settings": {
                        "jit": "off"
                    }
                }
            },
            'mysql': {
                'pool_size': 20,
                'max_overflow': 30,
                'pool_timeout': 30,
                'pool_recycle': 3600,  # 1 hour
                'pool_pre_ping': True,
                'poolclass': QueuePool,
                'connect_args': {
                    "connect_timeout": 10,
                    "charset": "utf8mb4"
                }
            }
        }
        
        config = default_configs.get(db_type, default_configs['postgresql'])
        config.update(kwargs)  # 覆盖用户提供的参数
        
        return config
    
    def _create_engine(self):
        """创建数据库引擎"""
        try:
            self.engine = create_engine(
                self.database_url,
                echo=False,
                **self.config
            )
            
            # 创建会话工厂
            self.session_factory = sessionmaker(
                autocommit=False,
                autoflush=False,
                bind=self.engine
            )
            
            logger.info(f"Database engine created with pool_size={self.config.get('pool_size', 'N/A')}")
            
        except Exception as e:
            logger.error(f"Failed to create database engine: {e}")
            raise
    
    def _setup_event_listeners(self):
        """设置事件监听器用于统计"""
        
        @event.listens_for(self.engine, "connect")
        def on_connect(dbapi_connection, connection_record):
            """连接建立时的回调"""
            with self._stats_lock:
                self._connection_requests += 1
                current_connections = self.get_pool_stats().total_connections
                self._peak_connections = max(self._peak_connections, current_connections)
        
        @event.listens_for(self.engine, "checkout")
        def on_checkout(dbapi_connection, connection_record, connection_proxy):
            """连接检出时的回调"""
            connection_record.checkout_start = time.time()
            with self._stats_lock:
                pool_stats = self.engine.pool.status()
                if 'Pool size' in pool_stats and pool_stats.split('checked in')[0]:
                    self._pool_hits += 1
                else:
                    self._pool_misses += 1
        
        @event.listens_for(self.engine, "checkin")
        def on_checkin(dbapi_connection, connection_record):
            """连接归还时的回调"""
            if hasattr(connection_record, 'checkout_start'):
                checkout_time = time.time() - connection_record.checkout_start
                with self._stats_lock:
                    self._checkout_times.append(checkout_time)
                    # 只保留最近1000个时间记录
                    if len(self._checkout_times) > 1000:
                        self._checkout_times = self._checkout_times[-500:]
        
        # 对于PostgreSQL和MySQL，设置连接参数
        if self._get_db_type() in ['postgresql', 'mysql']:
            @event.listens_for(self.engine, "connect")
            def set_connection_parameters(dbapi_connection, connection_record):
                """设置连接参数"""
                try:
                    if self._get_db_type() == 'postgresql':
                        # PostgreSQL优化
                        with dbapi_connection.cursor() as cursor:
                            cursor.execute("SET statement_timeout = '30s'")
                            cursor.execute("SET idle_in_transaction_session_timeout = '60s'")
                    elif self._get_db_type() == 'mysql':
                        # MySQL优化
                        with dbapi_connection.cursor() as cursor:
                            cursor.execute("SET SESSION wait_timeout = 3600")
                            cursor.execute("SET SESSION interactive_timeout = 3600")
                except Exception as e:
                    logger.warning(f"Failed to set connection parameters: {e}")
    
    @contextmanager
    def get_session(self):
        """获取数据库会话的上下文管理器"""
        session = self.session_factory()
        try:
            yield session
            session.commit()
        except Exception as e:
            session.rollback()
            logger.error(f"Database session error: {e}")
            raise
        finally:
            session.close()
    
    def get_pool_stats(self) -> ConnectionPoolStats:
        """获取连接池统计信息"""
        if not self.engine or not hasattr(self.engine, 'pool'):
            return ConnectionPoolStats(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.0, 0.0)
        
        pool = self.engine.pool
        
        # 获取基础统计信息
        try:
            pool_size = getattr(pool, 'size', lambda: 0)()
            checked_in = getattr(pool, 'checkedin', lambda: 0)()
            checked_out = getattr(pool, 'checkedout', lambda: 0)()
            overflow = getattr(pool, 'overflow', lambda: 0)()
            invalid = getattr(pool, 'invalidated', lambda: 0)()
        except:
            pool_size = checked_in = checked_out = overflow = invalid = 0
        
        total_connections = checked_in + checked_out
        
        # 计算平均和最长检出时间
        with self._stats_lock:
            avg_checkout_time = (
                sum(self._checkout_times) / len(self._checkout_times)
                if self._checkout_times else 0.0
            )
            longest_checkout_time = max(self._checkout_times) if self._checkout_times else 0.0
            
            return ConnectionPoolStats(
                pool_size=pool_size,
                checked_in=checked_in,
                checked_out=checked_out,
                overflow=overflow,
                invalid=invalid,
                total_connections=total_connections,
                peak_connections=self._peak_connections,
                connection_requests=self._connection_requests,
                pool_hits=self._pool_hits,
                pool_misses=self._pool_misses,
                average_checkout_time=avg_checkout_time,
                longest_checkout_time=longest_checkout_time
            )
    
    def health_check(self) -> Dict[str, Any]:
        """健康检查"""
        health_info = {
            'status': 'unknown',
            'database_type': self._get_db_type(),
            'pool_stats': None,
            'connection_test': False,
            'response_time': None,
            'error': None
        }
        
        try:
            start_time = time.time()
            
            # 测试数据库连接
            with self.get_session() as session:
                if self._get_db_type() == 'sqlite':
                    session.execute("SELECT 1")
                elif self._get_db_type() == 'postgresql':
                    session.execute("SELECT version()")
                elif self._get_db_type() == 'mysql':
                    session.execute("SELECT version()")
                
                health_info['connection_test'] = True
            
            health_info['response_time'] = time.time() - start_time
            health_info['pool_stats'] = self.get_pool_stats().to_dict()
            health_info['status'] = 'healthy'
            
        except Exception as e:
            health_info['status'] = 'unhealthy'
            health_info['error'] = str(e)
            logger.error(f"Database health check failed: {e}")
        
        return health_info
    
    def optimize_pool_size(self) -> Dict[str, Any]:
        """动态优化连接池大小"""
        stats = self.get_pool_stats()
        recommendations = []
        
        # 分析连接池使用情况
        if stats.checked_out / max(stats.pool_size, 1) > 0.8:
            recommendations.append("考虑增加连接池大小，当前使用率过高")
        
        if stats.pool_misses / max(stats.connection_requests, 1) > 0.1:
            recommendations.append("连接池未命中率较高，建议增加pool_size")
        
        if stats.average_checkout_time > 1.0:
            recommendations.append("平均连接检出时间较长，可能需要优化查询或增加连接数")
        
        if stats.overflow > 0:
            recommendations.append("出现溢出连接，建议增加基础连接池大小")
        
        return {
            'current_stats': stats.to_dict(),
            'recommendations': recommendations,
            'optimal_pool_size': self._calculate_optimal_pool_size(stats)
        }
    
    def _calculate_optimal_pool_size(self, stats: ConnectionPoolStats) -> int:
        """计算最优连接池大小"""
        current_size = stats.pool_size
        
        # 基于使用率计算
        utilization = stats.checked_out / max(current_size, 1)
        
        if utilization > 0.8:
            return min(current_size * 2, 50)  # 最大不超过50
        elif utilization < 0.3 and current_size > 5:
            return max(current_size // 2, 5)  # 最小保持5个连接
        else:
            return current_size
    
    def close(self):
        """关闭连接池"""
        if self.engine:
            self.engine.dispose()
            logger.info("Database connection pool closed")


class ConnectionPoolManager:
    """连接池管理器"""
    
    def __init__(self):
        self._pools: Dict[str, OptimizedConnectionPool] = {}
        self._lock = threading.Lock()
    
    def get_pool(self, database_url: str, pool_name: str = 'default', **kwargs) -> OptimizedConnectionPool:
        """获取或创建连接池"""
        with self._lock:
            pool_key = f"{pool_name}:{database_url}"
            
            if pool_key not in self._pools:
                self._pools[pool_key] = OptimizedConnectionPool(database_url, **kwargs)
                logger.info(f"Created new connection pool: {pool_name}")
            
            return self._pools[pool_key]
    
    def get_all_stats(self) -> Dict[str, Dict[str, Any]]:
        """获取所有连接池的统计信息"""
        stats = {}
        for pool_key, pool in self._pools.items():
            stats[pool_key] = pool.get_pool_stats().to_dict()
        return stats
    
    def health_check_all(self) -> Dict[str, Dict[str, Any]]:
        """对所有连接池进行健康检查"""
        health_reports = {}
        for pool_key, pool in self._pools.items():
            health_reports[pool_key] = pool.health_check()
        return health_reports
    
    def close_all(self):
        """关闭所有连接池"""
        with self._lock:
            for pool in self._pools.values():
                pool.close()
            self._pools.clear()
            logger.info("All connection pools closed")


# 全局连接池管理器实例
pool_manager = ConnectionPoolManager()


def get_optimized_pool(database_url: str, **kwargs) -> OptimizedConnectionPool:
    """获取优化的连接池实例"""
    return pool_manager.get_pool(database_url, **kwargs)


def monitor_connection_pools() -> Dict[str, Any]:
    """监控所有连接池状态"""
    return {
        'timestamp': datetime.utcnow().isoformat(),
        'pool_stats': pool_manager.get_all_stats(),
        'health_checks': pool_manager.health_check_all()
    }


# 使用示例
if __name__ == "__main__":
    # 测试连接池
    from config.database import get_database_url
    
    try:
        database_url = get_database_url()
        pool = get_optimized_pool(database_url)
        
        # 健康检查
        health = pool.health_check()
        print(f"Health check: {health['status']}")
        print(f"Response time: {health['response_time']:.3f}s")
        
        # 获取统计信息
        stats = pool.get_pool_stats()
        print(f"Pool stats: {stats.to_dict()}")
        
        # 优化建议
        optimization = pool.optimize_pool_size()
        print(f"Optimization recommendations: {optimization['recommendations']}")
        
    except Exception as e:
        print(f"Connection pool test failed: {e}")