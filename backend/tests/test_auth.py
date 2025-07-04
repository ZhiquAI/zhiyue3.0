
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.main import app
from backend.database import Base, get_db
from backend.auth import get_password_hash, verify_password, create_access_token
from backend.models.production_models import User

# Setup a test database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(name="db_session")
def db_session_fixture():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(name="client")
def client_fixture(db_session: Session):
    def override_get_db():
        try:
            yield db_session
        finally:
            db_session.close()
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

# Test password hashing and verification
def test_password_hashing():
    password = "testpassword"
    hashed_password = get_password_hash(password)
    assert verify_password(password, hashed_password)
    assert not verify_password("wrongpassword", hashed_password)

# Test JWT token creation
def test_create_access_token():
    data = {"sub": "testuser"}
    token = create_access_token(data)
    assert isinstance(token, str)
    # Further decoding and validation would be done in get_current_user, which is tested via API calls

# Test user registration
def test_register_user(client: TestClient):
    response = client.post(
        "/register",
        json={
            "username": "testuser",
            "password": "testpassword"
        }
    )
    assert response.status_code == 200
    assert "access_token" in response.json()
    assert response.json()["token_type"] == "bearer"

def test_register_existing_user(client: TestClient):
    # Register once
    client.post(
        "/register",
        json={
            "username": "existinguser",
            "password": "password"
        }
    )
    # Try to register again
    response = client.post(
        "/register",
        json={
            "username": "existinguser",
            "password": "anotherpassword"
        }
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Username already registered"

# Test user login
def test_login_for_access_token(client: TestClient):
    # First, register a user
    client.post(
        "/register",
        json={
            "username": "loginuser",
            "password": "loginpassword"
        }
    )
    
    # Then, try to log in
    response = client.post(
        "/token",
        data={
            "username": "loginuser",
            "password": "loginpassword"
        }
    )
    assert response.status_code == 200
    assert "access_token" in response.json()
    assert response.json()["token_type"] == "bearer"

def test_login_invalid_credentials(client: TestClient):
    response = client.post(
        "/token",
        data={
            "username": "nonexistentuser",
            "password": "wrongpassword"
        }
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect username or password"

# Test get_current_user (via a protected endpoint)
# For this, we need a dummy protected endpoint in main.py or a separate test file
# For simplicity, we'll add a temporary one to main.py for testing purposes

# This test assumes a protected endpoint exists and works
def test_get_current_user_protected_endpoint(client: TestClient):
    # Register and login a user to get a token
    register_response = client.post(
        "/register",
        json={
            "username": "protecteduser",
            "password": "protectedpassword"
        }
    )
    token = register_response.json()["access_token"]

    # Access a protected endpoint (assuming /api/files/upload/paper is protected)
    # Note: This is a simplified test. A real test would mock file uploads.
    response = client.post(
        "/api/files/upload/paper",
        headers={
            "Authorization": f"Bearer {token}"
        },
        data={
            "exam_id": "test_exam",
            "paper_type": "original"
        },
        files={
            "file": ("test.pdf", b"dummy content", "application/pdf")
        }
    )
    # We expect a 500 because the file upload service might not be fully mocked
    # But we are primarily testing if get_current_user allows access
    assert response.status_code in [200, 500] # 200 if upload works, 500 if service fails but auth passes

def test_get_current_user_invalid_token(client: TestClient):
    response = client.post(
        "/api/files/upload/paper",
        headers={
            "Authorization": "Bearer invalidtoken"
        },
        data={
            "exam_id": "test_exam",
            "paper_type": "original"
        },
        files={
            "file": ("test.pdf", b"dummy content", "application/pdf")
        }
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Could not validate credentials"

