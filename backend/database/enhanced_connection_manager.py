"""
Enhanced Database Connection Manager - Read/Write Separation
智阅3.0重构第二阶段：增强数据库连接管理器

Features:
- Read/Write database separation
- Connection pooling with PgBouncer-like functionality
- Query routing based on operation type
- Automatic failover and load balancing
- Connection health monitoring
- Transaction management across replicas
- Query performance analytics
"""

import asyncio
import logging
import time
import random
from typing import Any, Dict, List, Optional, Union, Callable, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum
from contextlib import asynccontextmanager
import weakref
import json

import asyncpg
from asyncpg import Pool, Connection
from asyncpg.exceptions import PostgresError, ConnectionFailureError

logger = logging.getLogger(__name__)


class DatabaseRole(str, Enum):
    """Database role types"""
    MASTER = "master"     # Write operations
    REPLICA = "replica"   # Read operations
    ANALYTICS = "analytics"  # Heavy analytical queries


class QueryType(str, Enum):
    """Query operation types"""
    SELECT = "select"
    INSERT = "insert"
    UPDATE = "update"
    DELETE = "delete"
    TRANSACTION = "transaction"
    DDL = "ddl"  # Data Definition Language


@dataclass
class DatabaseConfig:
    """Database configuration"""
    host: str
    port: int = 5432
    database: str = "zhiyue_ai"
    user: str = "postgres"
    password: str = ""
    role: DatabaseRole = DatabaseRole.MASTER
    
    # Connection pool settings
    min_connections: int = 5
    max_connections: int = 20
    
    # Health check settings
    health_check_interval: int = 30  # seconds
    connection_timeout: int = 30
    command_timeout: int = 60
    
    # Load balancing
    weight: float = 1.0  # Higher weight = more traffic
    
    # SSL settings
    ssl_mode: str = "prefer"
    
    def __post_init__(self):
        self.dsn = f"postgresql://{self.user}:{self.password}@{self.host}:{self.port}/{self.database}"


@dataclass
class ConnectionStats:
    """Connection pool statistics"""
    active_connections: int = 0
    idle_connections: int = 0
    total_queries: int = 0
    failed_queries: int = 0
    average_response_time: float = 0.0
    last_health_check: Optional[datetime] = None
    is_healthy: bool = True
    
    # Performance metrics
    read_queries: int = 0
    write_queries: int = 0
    transaction_queries: int = 0
    slow_queries: int = 0  # queries > 1s
    
    def update_query_stats(self, query_type: QueryType, duration: float):
        """Update query statistics"""
        self.total_queries += 1
        
        # Update average response time (moving average)
        if self.average_response_time == 0:
            self.average_response_time = duration
        else:
            self.average_response_time = (self.average_response_time * 0.9) + (duration * 0.1)
        
        # Update query type counters
        if query_type == QueryType.SELECT:
            self.read_queries += 1
        elif query_type in [QueryType.INSERT, QueryType.UPDATE, QueryType.DELETE]:
            self.write_queries += 1
        elif query_type == QueryType.TRANSACTION:
            self.transaction_queries += 1
        
        # Track slow queries
        if duration > 1.0:
            self.slow_queries += 1


class DatabasePool:
    """Enhanced database pool with monitoring"""
    
    def __init__(self, config: DatabaseConfig):
        self.config = config
        self.pool: Optional[Pool] = None
        self.stats = ConnectionStats()
        self._health_check_task: Optional[asyncio.Task] = None
        self._is_initializing = False
        self._initialization_lock = asyncio.Lock()
        
        logger.info(f"Database pool created for {config.role.value} at {config.host}:{config.port}")
    
    async def initialize(self):
        """Initialize connection pool"""
        async with self._initialization_lock:
            if self.pool or self._is_initializing:
                return
            
            self._is_initializing = True
            
            try:
                logger.info(f"Initializing {self.config.role.value} database pool...")
                
                self.pool = await asyncpg.create_pool(
                    self.config.dsn,
                    min_size=self.config.min_connections,
                    max_size=self.config.max_connections,
                    command_timeout=self.config.command_timeout,
                    server_settings={
                        'application_name': f'zhiyue_ai_{self.config.role.value}',
                        'tcp_keepalives_idle': '600',
                        'tcp_keepalives_interval': '30',
                        'tcp_keepalives_count': '3',
                    }
                )
                
                # Test connection
                async with self.pool.acquire() as conn:
                    await conn.execute('SELECT 1')
                
                self.stats.is_healthy = True
                
                # Start health check task
                self._start_health_check()
                
                logger.info(f"{self.config.role.value} database pool initialized successfully")
                
            except Exception as e:
                logger.error(f"Failed to initialize {self.config.role.value} pool: {e}")
                self.stats.is_healthy = False
                raise
            finally:
                self._is_initializing = False
    
    def _start_health_check(self):
        """Start background health check task"""
        if self._health_check_task and not self._health_check_task.done():
            return
        
        self._health_check_task = asyncio.create_task(self._health_check_loop())
    
    async def _health_check_loop(self):
        """Background health check loop"""
        while self.pool:
            try:
                await asyncio.sleep(self.config.health_check_interval)
                await self._perform_health_check()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Health check error for {self.config.role.value}: {e}")
                self.stats.is_healthy = False
    
    async def _perform_health_check(self):
        """Perform health check on the pool"""
        if not self.pool:
            self.stats.is_healthy = False
            return
        
        try:
            start_time = time.time()
            
            async with self.pool.acquire() as conn:
                await conn.execute('SELECT 1')
            
            response_time = time.time() - start_time
            
            # Update pool statistics
            self.stats.active_connections = self.pool._queue._maxsize - self.pool._queue.qsize()
            self.stats.idle_connections = self.pool._queue.qsize()
            self.stats.last_health_check = datetime.now()
            self.stats.is_healthy = True
            
            # Log if response time is concerning
            if response_time > 5.0:
                logger.warning(f"Slow health check for {self.config.role.value}: {response_time:.2f}s")
            
        except Exception as e:
            logger.error(f"Health check failed for {self.config.role.value}: {e}")
            self.stats.is_healthy = False
            self.stats.failed_queries += 1
    
    @asynccontextmanager
    async def acquire_connection(self):
        """Acquire connection from pool with monitoring"""
        if not self.pool:
            await self.initialize()
        
        if not self.stats.is_healthy:
            raise ConnectionError(f"Database pool {self.config.role.value} is unhealthy")
        
        start_time = time.time()
        
        try:
            async with self.pool.acquire() as conn:
                yield conn
                
        except Exception as e:
            self.stats.failed_queries += 1
            logger.error(f"Connection acquisition failed for {self.config.role.value}: {e}")
            raise
        finally:
            # Update connection time stats
            duration = time.time() - start_time
            if duration > 0.1:  # Only log if connection took > 100ms
                logger.debug(f"Connection acquired in {duration:.3f}s for {self.config.role.value}")
    
    async def execute_query(self, query: str, *args, query_type: QueryType = QueryType.SELECT) -> Any:
        """Execute query with performance monitoring"""
        start_time = time.time()
        
        try:
            async with self.acquire_connection() as conn:
                if query_type == QueryType.SELECT:
                    result = await conn.fetch(query, *args)
                else:
                    result = await conn.execute(query, *args)
                
                duration = time.time() - start_time
                self.stats.update_query_stats(query_type, duration)
                
                # Log slow queries
                if duration > 1.0:
                    logger.warning(f"Slow query ({duration:.2f}s) on {self.config.role.value}: {query[:100]}...")
                
                return result
                
        except Exception as e:
            duration = time.time() - start_time
            self.stats.failed_queries += 1
            logger.error(f"Query failed on {self.config.role.value} after {duration:.2f}s: {e}")
            raise
    
    async def execute_transaction(self, queries: List[Tuple[str, tuple]]) -> List[Any]:
        """Execute multiple queries in a transaction"""
        start_time = time.time()
        results = []
        
        try:
            async with self.acquire_connection() as conn:
                async with conn.transaction():
                    for query, args in queries:
                        if query.strip().upper().startswith('SELECT'):
                            result = await conn.fetch(query, *args)
                        else:
                            result = await conn.execute(query, *args)
                        results.append(result)
                
                duration = time.time() - start_time
                self.stats.update_query_stats(QueryType.TRANSACTION, duration)
                
                return results
                
        except Exception as e:
            duration = time.time() - start_time
            self.stats.failed_queries += 1
            logger.error(f"Transaction failed on {self.config.role.value} after {duration:.2f}s: {e}")
            raise
    
    def get_stats(self) -> Dict[str, Any]:
        """Get pool statistics"""
        return {
            "role": self.config.role.value,
            "host": self.config.host,
            "is_healthy": self.stats.is_healthy,
            "active_connections": self.stats.active_connections,
            "idle_connections": self.stats.idle_connections,
            "total_queries": self.stats.total_queries,
            "failed_queries": self.stats.failed_queries,
            "read_queries": self.stats.read_queries,
            "write_queries": self.stats.write_queries,
            "transaction_queries": self.stats.transaction_queries,
            "slow_queries": self.stats.slow_queries,
            "average_response_time": self.stats.average_response_time,
            "last_health_check": self.stats.last_health_check.isoformat() if self.stats.last_health_check else None,
            "error_rate": (self.stats.failed_queries / max(self.stats.total_queries, 1)) * 100
        }
    
    async def close(self):
        """Close the pool"""
        if self._health_check_task:
            self._health_check_task.cancel()
            try:
                await self._health_check_task
            except asyncio.CancelledError:
                pass
        
        if self.pool:
            await self.pool.close()
            self.pool = None
            
        logger.info(f"Database pool closed for {self.config.role.value}")


class EnhancedConnectionManager:
    """Master connection manager with read/write separation"""
    
    def __init__(self):
        self.pools: Dict[DatabaseRole, List[DatabasePool]] = {
            DatabaseRole.MASTER: [],
            DatabaseRole.REPLICA: [],
            DatabaseRole.ANALYTICS: []
        }
        
        self.default_configs = {
            DatabaseRole.MASTER: DatabaseConfig(
                host="localhost",
                role=DatabaseRole.MASTER,
                min_connections=5,
                max_connections=20
            ),
            DatabaseRole.REPLICA: DatabaseConfig(
                host="localhost",
                role=DatabaseRole.REPLICA,
                min_connections=3,
                max_connections=15
            ),
            DatabaseRole.ANALYTICS: DatabaseConfig(
                host="localhost",
                role=DatabaseRole.ANALYTICS,
                min_connections=2,
                max_connections=10
            )
        }
        
        self.query_router = QueryRouter()
        self.is_initialized = False
        
        logger.info("Enhanced connection manager initialized")
    
    def add_database(self, config: DatabaseConfig):
        """Add a database configuration"""
        pool = DatabasePool(config)
        self.pools[config.role].append(pool)
        logger.info(f"Added {config.role.value} database: {config.host}:{config.port}")
    
    async def initialize(self):
        """Initialize all database pools"""
        if self.is_initialized:
            return
        
        # Add default configurations if no pools exist
        for role, pools in self.pools.items():
            if not pools:
                self.add_database(self.default_configs[role])
        
        # Initialize all pools
        init_tasks = []
        for pools in self.pools.values():
            for pool in pools:
                init_tasks.append(pool.initialize())
        
        try:
            await asyncio.gather(*init_tasks)
            self.is_initialized = True
            logger.info("All database pools initialized successfully")
        except Exception as e:
            logger.error(f"Database initialization failed: {e}")
            raise
    
    def _select_pool(self, role: DatabaseRole) -> DatabasePool:
        """Select best pool for the given role using load balancing"""
        pools = [p for p in self.pools[role] if p.stats.is_healthy]
        
        if not pools:
            raise ConnectionError(f"No healthy {role.value} databases available")
        
        if len(pools) == 1:
            return pools[0]
        
        # Weighted round-robin selection based on performance
        weights = []
        for pool in pools:
            # Lower response time and fewer active connections = higher weight
            base_weight = pool.config.weight
            performance_factor = 1.0 / max(pool.stats.average_response_time, 0.001)
            connection_factor = 1.0 / max(pool.stats.active_connections, 1)
            
            weight = base_weight * performance_factor * connection_factor
            weights.append(weight)
        
        # Select pool based on weights
        total_weight = sum(weights)
        if total_weight == 0:
            return random.choice(pools)
        
        rand = random.uniform(0, total_weight)
        cumulative = 0
        
        for i, weight in enumerate(weights):
            cumulative += weight
            if rand <= cumulative:
                return pools[i]
        
        return pools[-1]  # Fallback
    
    async def execute_query(self, query: str, *args, **kwargs) -> Any:
        """Execute query with automatic routing"""
        if not self.is_initialized:
            await self.initialize()
        
        # Determine query type and route to appropriate database
        query_type = self.query_router.classify_query(query)
        role = self.query_router.route_query(query_type)
        
        # Handle read preference for SELECT queries
        if query_type == QueryType.SELECT and 'read_preference' in kwargs:
            read_pref = kwargs.pop('read_preference')
            if read_pref == 'replica' and self.pools[DatabaseRole.REPLICA]:
                role = DatabaseRole.REPLICA
            elif read_pref == 'analytics' and self.pools[DatabaseRole.ANALYTICS]:
                role = DatabaseRole.ANALYTICS
        
        pool = self._select_pool(role)
        return await pool.execute_query(query, *args, query_type=query_type)
    
    async def execute_transaction(self, queries: List[Tuple[str, tuple]]) -> List[Any]:
        """Execute transaction (always on master)"""
        if not self.is_initialized:
            await self.initialize()
        
        pool = self._select_pool(DatabaseRole.MASTER)
        return await pool.execute_transaction(queries)
    
    @asynccontextmanager
    async def acquire_connection(self, role: DatabaseRole = DatabaseRole.MASTER):
        """Acquire connection for manual operations"""
        if not self.is_initialized:
            await self.initialize()
        
        pool = self._select_pool(role)
        async with pool.acquire_connection() as conn:
            yield conn
    
    # Convenience methods for common operations
    async def fetch_all(self, query: str, *args, read_preference: str = "replica") -> List[Dict]:
        """Fetch all rows (prefer replica)"""
        return await self.execute_query(query, *args, read_preference=read_preference)
    
    async def fetch_one(self, query: str, *args, read_preference: str = "replica") -> Optional[Dict]:
        """Fetch one row (prefer replica)"""
        results = await self.fetch_all(query, *args, read_preference=read_preference)
        return results[0] if results else None
    
    async def execute_write(self, query: str, *args) -> str:
        """Execute write operation (always master)"""
        return await self.execute_query(query, *args)
    
    # Analytics and monitoring
    def get_all_stats(self) -> Dict[str, Any]:
        """Get statistics for all pools"""
        stats = {
            "pools": {},
            "summary": {
                "total_pools": 0,
                "healthy_pools": 0,
                "total_connections": 0,
                "total_queries": 0,
                "failed_queries": 0,
                "average_response_time": 0.0
            }
        }
        
        total_queries = 0
        total_response_time = 0.0
        
        for role, pools in self.pools.items():
            stats["pools"][role.value] = []
            
            for pool in pools:
                pool_stats = pool.get_stats()
                stats["pools"][role.value].append(pool_stats)
                
                stats["summary"]["total_pools"] += 1
                if pool_stats["is_healthy"]:
                    stats["summary"]["healthy_pools"] += 1
                
                stats["summary"]["total_connections"] += pool_stats["active_connections"]
                stats["summary"]["total_queries"] += pool_stats["total_queries"]
                stats["summary"]["failed_queries"] += pool_stats["failed_queries"]
                
                if pool_stats["total_queries"] > 0:
                    total_queries += pool_stats["total_queries"]
                    total_response_time += (pool_stats["average_response_time"] * pool_stats["total_queries"])
        
        if total_queries > 0:
            stats["summary"]["average_response_time"] = total_response_time / total_queries
        
        return stats
    
    async def health_check(self) -> Dict[str, Any]:
        """Comprehensive health check"""
        health = {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "databases": {}
        }
        
        all_healthy = True
        
        for role, pools in self.pools.items():
            role_health = {
                "total": len(pools),
                "healthy": 0,
                "unhealthy": 0,
                "pools": []
            }
            
            for pool in pools:
                if pool.stats.is_healthy:
                    role_health["healthy"] += 1
                else:
                    role_health["unhealthy"] += 1
                    all_healthy = False
                
                role_health["pools"].append({
                    "host": pool.config.host,
                    "healthy": pool.stats.is_healthy,
                    "last_check": pool.stats.last_health_check.isoformat() if pool.stats.last_health_check else None
                })
            
            health["databases"][role.value] = role_health
        
        if not all_healthy:
            health["status"] = "degraded"
        
        # Check if any role has no healthy pools
        for role_health in health["databases"].values():
            if role_health["healthy"] == 0:
                health["status"] = "unhealthy"
                break
        
        return health
    
    async def close_all(self):
        """Close all database pools"""
        close_tasks = []
        
        for pools in self.pools.values():
            for pool in pools:
                close_tasks.append(pool.close())
        
        await asyncio.gather(*close_tasks, return_exceptions=True)
        logger.info("All database pools closed")


class QueryRouter:
    """Route queries to appropriate database based on operation type"""
    
    def __init__(self):
        # Query patterns for classification
        self.read_patterns = ['SELECT', 'WITH', 'EXPLAIN', 'SHOW', 'DESCRIBE']
        self.write_patterns = ['INSERT', 'UPDATE', 'DELETE', 'UPSERT']
        self.ddl_patterns = ['CREATE', 'DROP', 'ALTER', 'TRUNCATE']
        self.transaction_patterns = ['BEGIN', 'COMMIT', 'ROLLBACK', 'START TRANSACTION']
    
    def classify_query(self, query: str) -> QueryType:
        """Classify query type based on SQL statement"""
        query_upper = query.strip().upper()
        
        # Handle common transaction statements
        for pattern in self.transaction_patterns:
            if query_upper.startswith(pattern):
                return QueryType.TRANSACTION
        
        # Handle DDL statements
        for pattern in self.ddl_patterns:
            if query_upper.startswith(pattern):
                return QueryType.DDL
        
        # Handle write operations
        for pattern in self.write_patterns:
            if query_upper.startswith(pattern):
                if pattern == 'INSERT':
                    return QueryType.INSERT
                elif pattern == 'UPDATE':
                    return QueryType.UPDATE
                elif pattern == 'DELETE':
                    return QueryType.DELETE
        
        # Default to SELECT for read operations
        return QueryType.SELECT
    
    def route_query(self, query_type: QueryType) -> DatabaseRole:
        """Route query to appropriate database role"""
        if query_type in [QueryType.INSERT, QueryType.UPDATE, QueryType.DELETE, 
                         QueryType.TRANSACTION, QueryType.DDL]:
            return DatabaseRole.MASTER
        else:
            return DatabaseRole.REPLICA  # SELECT queries go to replica by default


# Global connection manager instance
connection_manager = EnhancedConnectionManager()


# Convenience functions for easy use
async def initialize_database():
    """Initialize the database connection manager"""
    await connection_manager.initialize()


async def execute_query(query: str, *args, **kwargs) -> Any:
    """Execute query with automatic routing"""
    return await connection_manager.execute_query(query, *args, **kwargs)


async def fetch_all(query: str, *args, **kwargs) -> List[Dict]:
    """Fetch all rows"""
    return await connection_manager.fetch_all(query, *args, **kwargs)


async def fetch_one(query: str, *args, **kwargs) -> Optional[Dict]:
    """Fetch one row"""
    return await connection_manager.fetch_one(query, *args, **kwargs)


async def execute_write(query: str, *args) -> str:
    """Execute write operation"""
    return await connection_manager.execute_write(query, *args)


async def execute_transaction(queries: List[Tuple[str, tuple]]) -> List[Any]:
    """Execute transaction"""
    return await connection_manager.execute_transaction(queries)


@asynccontextmanager
async def get_connection(role: DatabaseRole = DatabaseRole.MASTER):
    """Get database connection"""
    async with connection_manager.acquire_connection(role) as conn:
        yield conn


def get_database_stats() -> Dict[str, Any]:
    """Get database statistics"""
    return connection_manager.get_all_stats()


async def database_health_check() -> Dict[str, Any]:
    """Perform database health check"""
    return await connection_manager.health_check()


# Database configuration from environment or settings
def configure_databases():
    """Configure databases from environment variables"""
    import os
    
    # Master database (write)
    master_config = DatabaseConfig(
        host=os.getenv('DB_MASTER_HOST', 'localhost'),
        port=int(os.getenv('DB_MASTER_PORT', 5432)),
        database=os.getenv('DB_NAME', 'zhiyue_ai'),
        user=os.getenv('DB_USER', 'postgres'),
        password=os.getenv('DB_PASSWORD', ''),
        role=DatabaseRole.MASTER
    )
    
    connection_manager.add_database(master_config)
    
    # Replica database (read) - if different from master
    replica_host = os.getenv('DB_REPLICA_HOST')
    if replica_host and replica_host != master_config.host:
        replica_config = DatabaseConfig(
            host=replica_host,
            port=int(os.getenv('DB_REPLICA_PORT', 5432)),
            database=os.getenv('DB_NAME', 'zhiyue_ai'),
            user=os.getenv('DB_REPLICA_USER', master_config.user),
            password=os.getenv('DB_REPLICA_PASSWORD', master_config.password),
            role=DatabaseRole.REPLICA
        )
        connection_manager.add_database(replica_config)
    
    # Analytics database - if configured
    analytics_host = os.getenv('DB_ANALYTICS_HOST')
    if analytics_host:
        analytics_config = DatabaseConfig(
            host=analytics_host,
            port=int(os.getenv('DB_ANALYTICS_PORT', 5432)),
            database=os.getenv('DB_ANALYTICS_NAME', 'zhiyue_analytics'),
            user=os.getenv('DB_ANALYTICS_USER', master_config.user),
            password=os.getenv('DB_ANALYTICS_PASSWORD', master_config.password),
            role=DatabaseRole.ANALYTICS
        )
        connection_manager.add_database(analytics_config)