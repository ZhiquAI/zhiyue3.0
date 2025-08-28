"""
数据库配置和连接管理
"""

import os
from sqlalchemy import create_engine, MetaData
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


def get_database_url() -> str:
    """获取数据库连接URL"""
    # 从环境变量或配置文件获取数据库URL
    database_url = os.getenv('DATABASE_URL')
    
    if not database_url:
        # 默认使用项目目录下的SQLite数据库
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
        # 尝试多个可能的数据库文件位置
        db_files = [
            os.path.join(project_root, 'zhiyue_ai.db'),
            os.path.join(project_root, 'backend', 'zhiyue_ai.db'),
            os.path.join(project_root, 'data', 'zhiyue.db'),
            os.path.join(project_root, 'backend', 'test.db')
        ]
        
        db_path = None
        for db_file in db_files:
            if os.path.exists(db_file):
                db_path = db_file
                break
        
        if not db_path:
            # 如果没有找到数据库文件，使用默认路径
            db_path = db_files[0]
        
        database_url = f"sqlite:///{db_path}"
    
    return database_url


def create_database_engine(database_url: str = None):
    """创建数据库引擎"""
    if not database_url:
        database_url = get_database_url()
    
    # SQLite配置
    if database_url.startswith('sqlite'):
        engine = create_engine(
            database_url,
            echo=False,
            poolclass=StaticPool,
            connect_args={
                "check_same_thread": False,
                "timeout": 20
            }
        )
    # PostgreSQL配置
    elif database_url.startswith('postgresql'):
        engine = create_engine(
            database_url,
            echo=False,
            pool_size=10,
            max_overflow=20,
            pool_pre_ping=True,
            pool_recycle=300
        )
    # MySQL配置
    elif database_url.startswith('mysql'):
        engine = create_engine(
            database_url,
            echo=False,
            pool_size=10,
            max_overflow=20,
            pool_pre_ping=True,
            pool_recycle=300
        )
    else:
        # 通用配置
        engine = create_engine(database_url, echo=False)
    
    return engine


def create_session_factory(database_url: str = None):
    """创建会话工厂"""
    engine = create_database_engine(database_url)
    return sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_database_info(database_url: str = None) -> dict:
    """获取数据库信息"""
    if not database_url:
        database_url = get_database_url()
    
    engine = create_database_engine(database_url)
    metadata = MetaData()
    
    try:
        metadata.reflect(bind=engine)
        
        info = {
            'url': database_url,
            'dialect': engine.dialect.name,
            'driver': engine.dialect.driver,
            'tables': list(metadata.tables.keys()),
            'table_count': len(metadata.tables)
        }
        
        return info
    
    except Exception as e:
        return {
            'url': database_url,
            'error': str(e)
        }


# 数据库连接池配置
DATABASE_POOL_SETTINGS = {
    'sqlite': {
        'poolclass': StaticPool,
        'connect_args': {
            "check_same_thread": False,
            "timeout": 20
        }
    },
    'postgresql': {
        'pool_size': 10,
        'max_overflow': 20,
        'pool_pre_ping': True,
        'pool_recycle': 300
    },
    'mysql': {
        'pool_size': 10,
        'max_overflow': 20,
        'pool_pre_ping': True,
        'pool_recycle': 300
    }
}