import requests
import json

# 创建新的测试用户
register_data = {
    "username": "test_teacher3",
    "email": "test3@example.com",
    "password": "password123",
    "name": "测试老师3",
    "school": "测试学校",
    "subject": "数学",
    "grades": ["高一", "高二"]
}

print("正在注册新用户...")
register_response = requests.post(
    "http://localhost:8001/auth/register",
    json=register_data
)

print(f"注册响应状态: {register_response.status_code}")
print(f"注册响应内容: {register_response.text}")

if register_response.status_code == 200:
    print("\n用户注册成功！")
    
    # 立即测试登录
    login_data = {
        "username": "test_teacher3",
        "password": "password123"
    }
    
    print("\n正在测试登录...")
    login_response = requests.post(
        "http://localhost:8001/auth/login",
        json=login_data
    )
    
    print(f"登录响应状态: {login_response.status_code}")
    print(f"登录响应内容: {login_response.text}")
    
    if login_response.status_code == 200:
        token_data = login_response.json()
        token = token_data["access_token"]
        print(f"\n登录成功！获取到token: {token[:50]}...")
        
        # 测试创建考试
        exam_data = {
            "name": "测试考试",
            "subject": "数学",
            "grade": "高一",
            "paper_config": {"total_questions": 20, "question_types": ["选择题", "填空题"]},
            "grading_config": {"auto_grade": True, "review_required": False}
        }
        
        print("\n正在创建考试...")
        exam_response = requests.post(
            "http://localhost:8001/api/exams/",
            json=exam_data,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        print(f"考试创建响应状态: {exam_response.status_code}")
        print(f"考试创建响应内容: {exam_response.text}")
        
        if exam_response.status_code == 200:
            print("\n考试创建成功！")
        else:
            print("\n考试创建失败！")
    else:
        print("\n登录失败！")
else:
    print("\n用户注册失败！")