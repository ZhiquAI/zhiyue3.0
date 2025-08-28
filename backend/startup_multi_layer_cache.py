#!/usr/bin/env python3
"""
Multi-Layer Cache Architecture Demonstration
智阅3.0多层缓存架构演示启动脚本
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

from services.cache_manager import CacheManager
from services.distributed_cache import DistributedCache, CacheConfig
from services.edge_cache import EdgeCache, CDNConfig, CDNProvider
from services.cache_consistency import CacheSystemManager, ConsistencyLevel
from database.enhanced_connection_manager import EnhancedConnectionManager, DatabaseRole
from database.query_optimizer import QueryOptimizer

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class MultiLayerCacheDemo:
    """多层缓存架构演示"""
    
    def __init__(self):
        self.l1_cache = None
        self.l2_cache = None
        self.l3_cache = None
        self.cache_system_manager = None
        self.db_manager = None
        self.query_optimizer = None
        
    async def initialize_system(self):
        """初始化多层缓存系统"""
        print("🚀 Initializing Multi-Layer Cache Architecture...")
        
        # 1. 初始化L1应用缓存
        print("📱 Setting up L1 Application Cache...")
        self.l1_cache = CacheManager(
            cache_configs={
                'user_data': {'max_size': 1000, 'ttl': 300},
                'exam_data': {'max_size': 500, 'ttl': 600},
                'grading_results': {'max_size': 2000, 'ttl': 1800}
            }
        )
        
        # 2. 初始化L2分布式缓存
        print("🌐 Setting up L2 Distributed Cache...")
        redis_config = CacheConfig(
            host='localhost',
            port=6379,
            db=1,
            max_connections=10,
            cluster_nodes=[],
            enable_cluster=False
        )
        self.l2_cache = DistributedCache(config=redis_config, cache_prefix="zhiyue3_l2")
        await self.l2_cache.__aenter__()
        
        # 3. 初始化L3边缘缓存
        print("🌍 Setting up L3 Edge Cache...")
        cdn_config = CDNConfig(
            provider=CDNProvider.LOCAL,
            endpoint="http://localhost:8080"
        )
        self.l3_cache = EdgeCache(
            cache_dir="./cache/edge_demo",
            max_size_gb=1.0,
            cdn_config=cdn_config
        )
        await self.l3_cache.__aenter__()
        
        # 4. 初始化缓存一致性管理器
        print("🔄 Setting up Cache Consistency Manager...")
        self.cache_system_manager = CacheSystemManager()
        
        cache_config = {
            'cache_relationships': {
                'l1_cache': ['l2_cache'],
                'l2_cache': ['l3_cache'],
                'database': ['l1_cache', 'l2_cache']
            },
            'invalidation_patterns': {
                'users': ['user:*', 'profile:*', 'session:*'],
                'exams': ['exam:*', 'question:*'],
                'grading': ['grading:*', 'score:*', 'feedback:*'],
                'files': ['file:*', 'image:*', 'document:*']
            }
        }
        
        await self.cache_system_manager.initialize(cache_config)
        
        # 5. 初始化数据库连接管理器
        print("🗄️ Setting up Enhanced Database Manager...")
        db_config = {
            'master': {
                'url': 'sqlite+aiosqlite:///./demo_master.db',
                'pool_size': 10,
                'max_overflow': 20
            },
            'replica': {
                'url': 'sqlite+aiosqlite:///./demo_replica.db',
                'pool_size': 15,
                'max_overflow': 25
            }
        }
        self.db_manager = EnhancedConnectionManager(db_config)
        
        # 6. 初始化查询优化器
        print("⚡ Setting up Query Optimizer...")
        optimizer_config = {
            'slow_query_threshold': 0.1,  # 100ms
            'enable_query_cache': True,
            'cache_size': 1000,
            'cache_ttl': 300
        }
        # self.query_optimizer = create_query_optimizer(optimizer_config)
        
        print("✅ Multi-Layer Cache Architecture Initialized!")
        
    async def demonstrate_cache_hierarchy(self):
        """演示缓存层次结构"""
        print("\n🔍 Demonstrating Cache Hierarchy...")
        
        test_data = {
            'user_123': {
                'id': 123,
                'name': 'Test User',
                'email': 'test@example.com',
                'profile': {
                    'avatar': '/images/avatar_123.jpg',
                    'preferences': {
                        'theme': 'dark',
                        'language': 'zh-CN'
                    }
                }
            }
        }
        
        # 1. 数据写入L1缓存
        print("📝 Writing data to L1 Cache...")
        start_time = time.time()
        self.l1_cache.set('user_data', 'user_123', test_data['user_123'])
        l1_write_time = time.time() - start_time
        print(f"   L1 Write Time: {l1_write_time*1000:.2f}ms")
        
        # 2. 数据同步到L2缓存
        print("🌐 Syncing data to L2 Cache...")
        start_time = time.time()
        await self.l2_cache.set('user_123', test_data['user_123'], ttl=600)
        l2_write_time = time.time() - start_time
        print(f"   L2 Write Time: {l2_write_time*1000:.2f}ms")
        
        # 3. 预取到L3缓存（模拟静态资源）
        avatar_url = "https://jsonplaceholder.typicode.com/photos/1"
        print("🌍 Prefetching static resources to L3 Cache...")
        start_time = time.time()
        await self.l3_cache.prefetch([avatar_url])
        l3_prefetch_time = time.time() - start_time
        print(f"   L3 Prefetch Time: {l3_prefetch_time*1000:.2f}ms")
        
        # 4. 测试读取性能
        print("\n📊 Testing Read Performance...")
        
        # L1读取
        start_time = time.time()
        l1_data = self.l1_cache.get('user_data', 'user_123')
        l1_read_time = time.time() - start_time
        print(f"   L1 Read: {l1_read_time*1000:.2f}ms - {'HIT' if l1_data else 'MISS'}")
        
        # L2读取
        start_time = time.time()
        l2_data = await self.l2_cache.get('user_123')
        l2_read_time = time.time() - start_time
        print(f"   L2 Read: {l2_read_time*1000:.2f}ms - {'HIT' if l2_data else 'MISS'}")
        
        # L3读取
        start_time = time.time()
        l3_data = await self.l3_cache.get(avatar_url)
        l3_read_time = time.time() - start_time
        print(f"   L3 Read: {l3_read_time*1000:.2f}ms - {'HIT' if l3_data else 'MISS'}")
        
    async def demonstrate_cache_consistency(self):
        """演示缓存一致性"""
        print("\n🔄 Demonstrating Cache Consistency...")
        
        # 模拟数据更新
        updated_data = {
            'id': 123,
            'name': 'Updated User',
            'email': 'updated@example.com',
            'last_modified': datetime.now().isoformat()
        }
        
        # 1. 更新数据并触发一致性事件
        print("📝 Updating data and triggering consistency events...")
        
        # 更新L1缓存
        self.l1_cache.set('user_data', 'user_123', updated_data)
        
        # 通知一致性管理器
        from services.cache_consistency import CacheEvent
        await self.cache_system_manager.consistency_manager.notify_cache_event(
            'l1_cache', CacheEvent.SET, 'user_123', updated_data
        )
        
        # 2. 等待一致性传播
        print("⏳ Waiting for consistency propagation...")
        await asyncio.sleep(1)
        
        # 3. 验证一致性
        print("✅ Verifying consistency across cache layers...")
        l1_data = self.l1_cache.get('user_data', 'user_123')
        l2_data = await self.l2_cache.get('user_123')
        
        print(f"   L1 Data: {l1_data.get('name') if l1_data else 'None'}")
        print(f"   L2 Data: {l2_data.get('name') if l2_data else 'None'}")
        
    async def demonstrate_performance_monitoring(self):
        """演示性能监控"""
        print("\n📈 Demonstrating Performance Monitoring...")
        
        # 生成一些测试负载
        print("🔄 Generating test load...")
        
        tasks = []
        for i in range(100):
            # 随机读写操作
            if i % 3 == 0:
                # L1读取
                task = asyncio.create_task(self._test_l1_operation(f"test_key_{i}"))
            elif i % 3 == 1:
                # L2读取
                task = asyncio.create_task(self._test_l2_operation(f"test_key_{i}"))
            else:
                # L3读取
                task = asyncio.create_task(self._test_l3_operation())
                
            tasks.append(task)
            
        # 执行所有测试任务
        await asyncio.gather(*tasks, return_exceptions=True)
        
        # 获取性能报告
        print("\n📊 Performance Report:")
        system_status = self.cache_system_manager.get_system_status()
        
        print(f"📋 System Status:")
        print(json.dumps(system_status, indent=2, default=str))
        
        # L1缓存统计
        l1_stats = self.l1_cache.get_cache_stats()
        print(f"\n📱 L1 Cache Stats:")
        for cache_name, stats in l1_stats.items():
            print(f"   {cache_name}: {stats}")
            
        # L2缓存统计
        l2_stats = self.l2_cache.get_stats()
        print(f"\n🌐 L2 Cache Stats:")
        print(f"   {json.dumps(l2_stats, indent=2)}")
        
        # L3缓存统计
        l3_stats = self.l3_cache.get_stats()
        print(f"\n🌍 L3 Cache Stats:")
        print(f"   {json.dumps(l3_stats, indent=2)}")
        
    async def _test_l1_operation(self, key: str):
        """测试L1缓存操作"""
        # 写入
        self.l1_cache.set('user_data', key, {'test': 'data', 'timestamp': time.time()})
        # 读取
        self.l1_cache.get('user_data', key)
        
    async def _test_l2_operation(self, key: str):
        """测试L2缓存操作"""
        # 写入
        await self.l2_cache.set(key, {'test': 'data', 'timestamp': time.time()})
        # 读取
        await self.l2_cache.get(key)
        
    async def _test_l3_operation(self):
        """测试L3缓存操作"""
        test_url = "https://httpbin.org/json"
        try:
            await self.l3_cache.get(test_url)
        except:
            pass  # 忽略网络错误
            
    async def demonstrate_database_optimization(self):
        """演示数据库优化"""
        print("\n🗄️ Demonstrating Database Optimization...")
        
        try:
            # 创建测试表（如果不存在）
            async with self.db_manager.get_connection(DatabaseRole.MASTER) as conn:
                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS demo_users (
                        id INTEGER PRIMARY KEY,
                        name TEXT NOT NULL,
                        email TEXT UNIQUE NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                await conn.commit()
                
            # 插入测试数据
            print("📝 Inserting test data...")
            async with self.db_manager.get_connection(DatabaseRole.MASTER) as conn:
                for i in range(10):
                    await conn.execute(
                        "INSERT OR REPLACE INTO demo_users (id, name, email) VALUES (?, ?, ?)",
                        (i, f"User {i}", f"user{i}@example.com")
                    )
                await conn.commit()
                
            # 读取数据（使用副本）
            print("📖 Reading data from replica...")
            async with self.db_manager.get_connection(DatabaseRole.REPLICA) as conn:
                cursor = await conn.execute("SELECT * FROM demo_users LIMIT 5")
                results = await cursor.fetchall()
                print(f"   Found {len(results)} users")
                
            # 获取连接池状态
            pool_status = self.db_manager.get_pool_status()
            print(f"\n📊 Database Pool Status:")
            print(json.dumps(pool_status, indent=2, default=str))
            
        except Exception as e:
            print(f"❌ Database operation failed: {str(e)}")
            
    async def cleanup(self):
        """清理资源"""
        print("\n🧹 Cleaning up resources...")
        
        if self.cache_system_manager:
            await self.cache_system_manager.shutdown()
            
        if self.l2_cache:
            await self.l2_cache.__aexit__(None, None, None)
            
        if self.l3_cache:
            await self.l3_cache.__aexit__(None, None, None)
            
        if self.db_manager:
            await self.db_manager.close_all()
            
        print("✅ Cleanup completed!")

async def run_demo():
    """运行演示"""
    demo = MultiLayerCacheDemo()
    
    try:
        # 初始化系统
        await demo.initialize_system()
        
        # 演示各个功能
        await demo.demonstrate_cache_hierarchy()
        await demo.demonstrate_cache_consistency()
        await demo.demonstrate_performance_monitoring()
        await demo.demonstrate_database_optimization()
        
        print("\n🎉 Multi-Layer Cache Architecture Demo Completed Successfully!")
        
    except Exception as e:
        print(f"❌ Demo failed: {str(e)}")
        logger.exception("Demo error")
        
    finally:
        await demo.cleanup()

def main():
    """主函数"""
    print("=" * 80)
    print("🚀 Smart Reading 3.0 Multi-Layer Cache Architecture Demo")
    print("=" * 80)
    print()
    print("This demo showcases:")
    print("✅ L1 Application Cache (LRU + Memory)")
    print("✅ L2 Distributed Cache (Redis with smart invalidation)")
    print("✅ L3 Edge Cache (CDN and static resource optimization)")
    print("✅ Cache Consistency Management")
    print("✅ Performance Monitoring and Analytics")
    print("✅ Database Connection Pool Optimization")
    print("✅ Query Optimization and Caching")
    print()
    
    try:
        asyncio.run(run_demo())
    except KeyboardInterrupt:
        print("\n👋 Demo interrupted by user")
    except Exception as e:
        print(f"\n❌ Demo failed: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()