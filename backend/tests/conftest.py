"""
Pytest配置文件和测试工具
提供测试所需的fixtures和工具函数
"""

import pytest
import asyncio
import tempfile
import os
from typing import Generator, Dict, Any
from unittest.mock import Mock

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

# 导入应用和数据库相关
from api.app import create_standardized_app
from database import get_db
from models.production_models import Base, User, Exam, Student, AnswerSheet
from auth import get_current_user, create_access_token
from schemas.response import SuccessResponse

# 测试数据库配置
TEST_DATABASE_URL = "sqlite:///./test_zhiyue.db"


@pytest.fixture(scope="session")
def test_engine():
    """创建测试数据库引擎"""
    engine = create_engine(
        TEST_DATABASE_URL,
        poolclass=StaticPool,
        connect_args={"check_same_thread": False}
    )
    
    # 创建所有表
    Base.metadata.create_all(bind=engine)
    
    yield engine
    
    # 清理：删除测试数据库文件
    try:
        os.remove("./test_zhiyue.db")
    except FileNotFoundError:
        pass


@pytest.fixture(scope="function")
def test_db(test_engine) -> Generator[Session, None, None]:
    """创建测试数据库会话"""
    TestingSessionLocal = sessionmaker(
        autocommit=False, 
        autoflush=False, 
        bind=test_engine
    )
    
    connection = test_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    
    yield session
    
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture(scope="function")
def test_client(test_db) -> TestClient:
    """创建测试客户端"""
    app = create_standardized_app()
    
    # 覆盖数据库依赖
    def override_get_db():
        yield test_db
    
    app.dependency_overrides[get_db] = override_get_db
    
    client = TestClient(app)
    yield client
    
    # 清理
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def test_user(test_db: Session) -> User:
    """创建测试用户"""
    user = User(
        id="test_user_001",
        username="testuser",
        email="test@zhiyue.ai",
        hashed_password="hashed_password_123",
        name="测试用户",
        role="teacher",
        is_active=True,
        is_verified=True
    )
    
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)
    
    return user


@pytest.fixture(scope="function")
def test_admin_user(test_db: Session) -> User:
    """创建测试管理员用户"""
    admin = User(
        id="test_admin_001",
        username="admin",
        email="admin@zhiyue.ai",
        hashed_password="hashed_admin_password",
        name="管理员",
        role="admin",
        is_active=True,
        is_verified=True
    )
    
    test_db.add(admin)
    test_db.commit()
    test_db.refresh(admin)
    
    return admin


@pytest.fixture(scope="function")
def auth_headers(test_user: User) -> Dict[str, str]:
    """创建认证头"""
    token = create_access_token(data={"sub": test_user.username})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="function")
def admin_auth_headers(test_admin_user: User) -> Dict[str, str]:
    """创建管理员认证头"""
    token = create_access_token(data={"sub": test_admin_user.username})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="function")
def test_exam(test_db: Session, test_user: User) -> Exam:
    """创建测试考试"""
    exam = Exam(
        id="test_exam_001",
        name="测试考试",
        subject="数学",
        grade="高一",
        status="待配置",
        paper_config={"total_score": 100, "time_limit": 120},
        grading_config={"strict_mode": False},
        created_by=test_user.id,
        total_students=0,
        completed_count=0
    )
    
    test_db.add(exam)
    test_db.commit()
    test_db.refresh(exam)
    
    return exam


@pytest.fixture(scope="function")
def test_student(test_db: Session, test_exam: Exam, test_user: User) -> Student:
    """创建测试学生"""
    student = Student(
        id="test_student_001",
        student_id="2024001",
        name="张三",
        class_name="高一(1)班",
        grade="高一",
        exam_id=test_exam.id,
        created_by=test_user.id,
        is_active=True
    )
    
    test_db.add(student)
    test_db.commit()
    test_db.refresh(student)
    
    return student


@pytest.fixture(scope="function")
def test_answer_sheet(test_db: Session, test_exam: Exam, test_student: Student) -> AnswerSheet:
    """创建测试答题卡"""
    answer_sheet = AnswerSheet(
        id="test_answer_sheet_001",
        exam_id=test_exam.id,
        student_uuid=test_student.id,
        student_id=test_student.student_id,
        student_name=test_student.name,
        class_name=test_student.class_name,
        original_file_path="/test/path/answer_sheet.jpg",
        ocr_status="completed",
        grading_status="pending",
        needs_review=False
    )
    
    test_db.add(answer_sheet)
    test_db.commit()
    test_db.refresh(answer_sheet)
    
    return answer_sheet


@pytest.fixture(scope="function")
def sample_exam_data() -> Dict[str, Any]:
    """示例考试数据"""
    return {
        "name": "期中考试",
        "subject": "语文",
        "grade": "高二",
        "paper_config": {
            "total_score": 150,
            "time_limit": 150,
            "question_count": 25
        },
        "grading_config": {
            "strict_mode": True,
            "partial_credit": True
        }
    }


@pytest.fixture(scope="function")
def sample_student_data() -> Dict[str, Any]:
    """示例学生数据"""
    return {
        "student_id": "2024002",
        "name": "李四",
        "class_name": "高二(2)班",
        "grade": "高二",
        "gender": "女",
        "phone": "13800138000",
        "email": "lisi@example.com"
    }


# 测试工具函数
class TestUtils:
    """测试工具类"""
    
    @staticmethod
    def assert_success_response(response, expected_message: str = None):
        """断言成功响应"""
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "data" in data
        assert "timestamp" in data
        assert "request_id" in data
        
        if expected_message:
            assert data["message"] == expected_message
    
    @staticmethod
    def assert_error_response(response, expected_code: int, expected_error_code: str = None):
        """断言错误响应"""
        assert response.status_code == expected_code
        data = response.json()
        assert data["success"] is False
        assert "message" in data
        assert "timestamp" in data
        
        if expected_error_code:
            assert data.get("error_code") == expected_error_code
    
    @staticmethod
    def assert_validation_error(response):
        """断言验证错误响应"""
        assert response.status_code == 422
        data = response.json()
        assert data["success"] is False
        assert data.get("error_code") == "VALIDATION_ERROR"
        assert "details" in data
    
    @staticmethod
    def assert_unauthorized(response):
        """断言未授权响应"""
        assert response.status_code == 401
        data = response.json()
        assert data["success"] is False
    
    @staticmethod
    def assert_forbidden(response):
        """断言权限不足响应"""
        assert response.status_code == 403
        data = response.json()
        assert data["success"] is False
    
    @staticmethod
    def assert_not_found(response):
        """断言资源不存在响应"""
        assert response.status_code == 404
        data = response.json()
        assert data["success"] is False
        assert data.get("error_code") == "RESOURCE_NOT_FOUND"
    
    @staticmethod
    def assert_paginated_response(response, expected_page: int = 1, expected_limit: int = 20):
        """断言分页响应"""
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "data" in data
        
        response_data = data["data"]
        assert "items" in response_data
        assert "pagination" in response_data
        
        pagination = response_data["pagination"]
        assert pagination["page"] == expected_page
        assert pagination["limit"] == expected_limit
        assert "total" in pagination
        assert "total_pages" in pagination
        assert "has_next" in pagination
        assert "has_prev" in pagination


@pytest.fixture
def test_utils():
    """测试工具fixture"""
    return TestUtils


# Mock工具
@pytest.fixture
def mock_gemini_service():
    """模拟Gemini服务"""
    with patch('backend.services.gemini_service.GeminiService') as mock:
        mock_instance = Mock()
        mock_instance.process_ocr.return_value = {
            "text": "测试OCR结果",
            "confidence": 0.95
        }
        mock_instance.grade_subjective_question.return_value = {
            "score": 8.5,
            "feedback": "回答较为完整",
            "confidence": 0.9
        }
        mock.return_value = mock_instance
        yield mock_instance


@pytest.fixture
def mock_file_storage():
    """模拟文件存储"""
    with patch('backend.services.file_storage_service.FileStorageService') as mock:
        mock_instance = Mock()
        mock_instance.save_file.return_value = "/mocked/file/path.jpg"
        mock_instance.delete_file.return_value = True
        mock_instance.get_file_url.return_value = "http://localhost/files/test.jpg"
        mock.return_value = mock_instance
        yield mock_instance


# 异步测试支持
@pytest.fixture(scope="session")
def event_loop():
    """创建事件循环"""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


# 数据清理工具
def cleanup_test_data(db: Session):
    """清理测试数据"""
    db.query(AnswerSheet).delete()
    db.query(Student).delete()
    db.query(Exam).delete()
    db.query(User).delete()
    db.commit()


# 性能测试工具
@pytest.fixture
def performance_timer():
    """性能计时器"""
    import time
    
    class Timer:
        def __init__(self):
            self.start_time = None
            self.end_time = None
        
        def start(self):
            self.start_time = time.time()
        
        def stop(self):
            self.end_time = time.time()
        
        @property
        def elapsed(self):
            if self.start_time and self.end_time:
                return self.end_time - self.start_time
            return None
        
        def assert_max_time(self, max_seconds: float):
            assert self.elapsed is not None, "Timer not properly used"
            assert self.elapsed <= max_seconds, f"Operation took {self.elapsed:.3f}s, expected <= {max_seconds}s"
    
    return Timer()


# 批量测试数据生成器
def generate_test_users(count: int) -> list:
    """生成测试用户数据"""
    users = []
    for i in range(count):
        users.append({
            "id": f"test_user_{i:03d}",
            "username": f"user{i:03d}",
            "email": f"user{i:03d}@test.com",
            "name": f"用户{i:03d}",
            "role": "teacher",
            "is_active": True,
            "is_verified": True
        })
    return users


def generate_test_exams(count: int, creator_id: str) -> list:
    """生成测试考试数据"""
    subjects = ["语文", "数学", "英语", "物理", "化学"]
    grades = ["高一", "高二", "高三"]
    
    exams = []
    for i in range(count):
        exams.append({
            "id": f"test_exam_{i:03d}",
            "name": f"测试考试{i:03d}",
            "subject": subjects[i % len(subjects)],
            "grade": grades[i % len(grades)],
            "status": "待配置",
            "created_by": creator_id,
            "total_students": 0,
            "completed_count": 0
        })
    return exams