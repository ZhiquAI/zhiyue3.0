"""
统一数据库连接管理器
基于新的core_models提供高性能数据库操作
"""

import os
import logging
from contextlib import contextmanager
from typing import Generator, Optional, Type, List, Dict, Any
from sqlalchemy import create_engine, MetaData, event
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from sqlalchemy.engine import Engine
from sqlalchemy.exc import SQLAlchemyError

from backend.config.models import Base, MODEL_REGISTRY
from backend.config.database import get_database_url, DATABASE_POOL_SETTINGS

logger = logging.getLogger(__name__)

class DatabaseManager:
    """统一数据库管理器"""
    
    def __init__(self, database_url: Optional[str] = None):
        self.database_url = database_url or get_database_url()
        self.engine: Optional[Engine] = None
        self.session_factory: Optional[sessionmaker] = None
        self._metadata = MetaData()
        
    def initialize(self) -> None:
        """初始化数据库连接"""
        try:
            self.engine = self._create_engine()
            self.session_factory = sessionmaker(
                autocommit=False, 
                autoflush=False, 
                bind=self.engine
            )
            
            # 添加连接事件监听器
            self._setup_connection_events()
            
            # 验证连接
            with self.get_session() as session:
                session.execute("SELECT 1")
                logger.info("数据库连接初始化成功")
                
        except Exception as e:
            logger.error(f"数据库初始化失败: {e}")
            raise
    
    def _create_engine(self) -> Engine:
        """创建数据库引擎"""
        # 根据数据库类型选择配置
        if self.database_url.startswith('sqlite'):
            config = DATABASE_POOL_SETTINGS['sqlite']
            engine = create_engine(
                self.database_url,
                echo=False,
                **config
            )
        elif self.database_url.startswith('postgresql'):
            config = DATABASE_POOL_SETTINGS['postgresql']
            engine = create_engine(
                self.database_url,
                echo=False,
                **config
            )
        elif self.database_url.startswith('mysql'):
            config = DATABASE_POOL_SETTINGS['mysql']
            engine = create_engine(
                self.database_url,
                echo=False,
                **config
            )
        else:
            engine = create_engine(self.database_url, echo=False)
        
        return engine
    
    def _setup_connection_events(self) -> None:
        """设置数据库连接事件监听器"""
        if not self.engine:
            return
            
        @event.listens_for(self.engine, "connect")
        def set_sqlite_pragma(dbapi_connection, connection_record):
            """SQLite性能优化设置"""
            if self.database_url.startswith('sqlite'):
                cursor = dbapi_connection.cursor()
                # 启用外键约束
                cursor.execute("PRAGMA foreign_keys=ON")
                # 优化性能设置
                cursor.execute("PRAGMA synchronous=NORMAL")
                cursor.execute("PRAGMA cache_size=10000")
                cursor.execute("PRAGMA temp_store=MEMORY")
                cursor.execute("PRAGMA mmap_size=67108864")  # 64MB
                cursor.close()
        
        @event.listens_for(self.engine, "engine_connect")
        def receive_engine_connect(conn, branch):
            """连接建立事件"""
            logger.debug("数据库连接建立")
    
    @contextmanager
    def get_session(self) -> Generator[Session, None, None]:
        """获取数据库会话上下文管理器"""
        if not self.session_factory:
            raise RuntimeError("数据库未初始化，请先调用initialize()方法")
        
        session = self.session_factory()
        try:
            yield session
            session.commit()
        except Exception as e:
            session.rollback()
            logger.error(f"数据库操作失败: {e}")
            raise
        finally:
            session.close()
    
    def create_all_tables(self) -> None:
        """创建所有表"""
        if not self.engine:
            raise RuntimeError("数据库引擎未初始化")
        
        try:
            Base.metadata.create_all(bind=self.engine)
            logger.info("数据库表创建成功")
        except Exception as e:
            logger.error(f"创建数据库表失败: {e}")
            raise
    
    def drop_all_tables(self) -> None:
        """删除所有表（谨慎使用）"""
        if not self.engine:
            raise RuntimeError("数据库引擎未初始化")
        
        try:
            Base.metadata.drop_all(bind=self.engine)
            logger.warning("所有数据库表已删除")
        except Exception as e:
            logger.error(f"删除数据库表失败: {e}")
            raise
    
    def get_table_info(self) -> Dict[str, Any]:
        """获取数据库表信息"""
        if not self.engine:
            return {"error": "数据库引擎未初始化"}
        
        try:
            self._metadata.reflect(bind=self.engine)
            
            tables_info = {}
            for table_name, table in self._metadata.tables.items():
                tables_info[table_name] = {
                    'columns': len(table.columns),
                    'indexes': len(table.indexes),
                    'foreign_keys': len(table.foreign_keys),
                    'column_names': [col.name for col in table.columns]
                }
            
            return {
                'database_url': self.database_url,
                'dialect': self.engine.dialect.name,
                'driver': self.engine.dialect.driver,
                'tables': tables_info,
                'table_count': len(tables_info)
            }
        except Exception as e:
            return {"error": str(e)}
    
    def health_check(self) -> Dict[str, Any]:
        """健康检查"""
        try:
            with self.get_session() as session:
                # 简单查询测试连接
                from sqlalchemy import text
                result = session.execute(text("SELECT 1")).scalar()
                
                return {
                    'status': 'healthy',
                    'database_url': self.database_url,
                    'query_result': result,
                    'engine_pool_size': getattr(self.engine.pool, 'size', None),
                    'engine_pool_checked_in': getattr(self.engine.pool, 'checkedin', None),
                    'engine_pool_checked_out': getattr(self.engine.pool, 'checkedout', None)
                }
        except Exception as e:
            return {
                'status': 'unhealthy',
                'error': str(e)
            }
    
    def close(self) -> None:
        """关闭数据库连接"""
        if self.engine:
            self.engine.dispose()
            logger.info("数据库连接已关闭")

class ModelOperations:
    """模型操作工具类"""
    
    def __init__(self, db_manager: DatabaseManager):
        self.db_manager = db_manager
    
    def create_record(self, model_name: str, data: Dict[str, Any]) -> Optional[Any]:
        """创建记录"""
        model_class = MODEL_REGISTRY.get(model_name.lower())
        if not model_class:
            raise ValueError(f"未找到模型: {model_name}")
        
        try:
            with self.db_manager.get_session() as session:
                record = model_class(**data)
                session.add(record)
                session.flush()  # 获取ID
                # 不在这里refresh，因为会话即将关闭
                record_dict = record.to_dict() if hasattr(record, 'to_dict') else record
                return record_dict
        except SQLAlchemyError as e:
            logger.error(f"创建{model_name}记录失败: {e}")
            raise
    
    def get_record(self, model_name: str, record_id: Any) -> Optional[Any]:
        """获取单条记录"""
        model_class = MODEL_REGISTRY.get(model_name.lower())
        if not model_class:
            raise ValueError(f"未找到模型: {model_name}")
        
        try:
            with self.db_manager.get_session() as session:
                return session.query(model_class).filter(
                    model_class.id == record_id
                ).first()
        except SQLAlchemyError as e:
            logger.error(f"查询{model_name}记录失败: {e}")
            raise
    
    def update_record(self, model_name: str, record_id: Any, data: Dict[str, Any]) -> Optional[Any]:
        """更新记录"""
        model_class = MODEL_REGISTRY.get(model_name.lower())
        if not model_class:
            raise ValueError(f"未找到模型: {model_name}")
        
        try:
            with self.db_manager.get_session() as session:
                record = session.query(model_class).filter(
                    model_class.id == record_id
                ).first()
                
                if not record:
                    return None
                
                for key, value in data.items():
                    if hasattr(record, key):
                        setattr(record, key, value)
                
                session.flush()
                # 返回更新后的数据字典
                record_dict = record.to_dict() if hasattr(record, 'to_dict') else record
                return record_dict
        except SQLAlchemyError as e:
            logger.error(f"更新{model_name}记录失败: {e}")
            raise
    
    def delete_record(self, model_name: str, record_id: Any) -> bool:
        """删除记录"""
        model_class = MODEL_REGISTRY.get(model_name.lower())
        if not model_class:
            raise ValueError(f"未找到模型: {model_name}")
        
        try:
            with self.db_manager.get_session() as session:
                record = session.query(model_class).filter(
                    model_class.id == record_id
                ).first()
                
                if not record:
                    return False
                
                session.delete(record)
                return True
        except SQLAlchemyError as e:
            logger.error(f"删除{model_name}记录失败: {e}")
            raise
    
    def list_records(self, model_name: str, filters: Dict[str, Any] = None, 
                    limit: int = 100, offset: int = 0) -> List[Any]:
        """列表查询"""
        model_class = MODEL_REGISTRY.get(model_name.lower())
        if not model_class:
            raise ValueError(f"未找到模型: {model_name}")
        
        try:
            with self.db_manager.get_session() as session:
                query = session.query(model_class)
                
                # 应用过滤条件
                if filters:
                    for key, value in filters.items():
                        if hasattr(model_class, key):
                            query = query.filter(getattr(model_class, key) == value)
                
                return query.offset(offset).limit(limit).all()
        except SQLAlchemyError as e:
            logger.error(f"查询{model_name}列表失败: {e}")
            raise
    
    def count_records(self, model_name: str, filters: Dict[str, Any] = None) -> int:
        """计数查询"""
        model_class = MODEL_REGISTRY.get(model_name.lower())
        if not model_class:
            raise ValueError(f"未找到模型: {model_name}")
        
        try:
            with self.db_manager.get_session() as session:
                query = session.query(model_class)
                
                # 应用过滤条件
                if filters:
                    for key, value in filters.items():
                        if hasattr(model_class, key):
                            query = query.filter(getattr(model_class, key) == value)
                
                return query.count()
        except SQLAlchemyError as e:
            logger.error(f"计数{model_name}记录失败: {e}")
            raise

# 全局数据库管理器实例
db_manager = DatabaseManager()
model_ops = ModelOperations(db_manager)

# 便捷函数
def init_database() -> None:
    """初始化数据库"""
    db_manager.initialize()

def get_db_session():
    """获取数据库会话"""
    return db_manager.get_session()

def create_tables() -> None:
    """创建表"""
    db_manager.create_all_tables()

def get_database_info() -> Dict[str, Any]:
    """获取数据库信息"""
    return db_manager.get_table_info()

def database_health_check() -> Dict[str, Any]:
    """数据库健康检查"""
    return db_manager.health_check()