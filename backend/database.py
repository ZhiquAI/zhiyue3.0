
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from config.settings import settings

# 使用配置文件中的数据库URL，开发环境回退到SQLite
SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL if settings.DATABASE_URL.startswith("postgresql") else "sqlite:///./zhiyue_ai.db"

# 根据数据库类型设置连接参数
connect_args = {}
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args=connect_args,
    echo=settings.DEBUG  # 开发环境显示SQL语句
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """数据库依赖注入"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_tables():
    """创建所有数据库表"""
    try:
        from backend.models.production_models import Base
    except ImportError:
        from models.production_models import Base
    Base.metadata.create_all(bind=engine)

def drop_tables():
    """删除所有数据库表"""
    try:
        from backend.models.production_models import Base
    except ImportError:
        from models.production_models import Base
    Base.metadata.drop_all(bind=engine)
