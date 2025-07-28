#!/usr/bin/env python3

import requests
import json
import random
import string

def generate_random_username():
    """生成随机用户名"""
    return 'testuser_' + ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))

def test_backend_api():
    base_url = "http://localhost:8000"
    
    print("=== 测试后端API ===")
    
    # 测试健康检查
    try:
        response = requests.get(f"{base_url}/health")
        print(f"健康检查状态码: {response.status_code}")
        print(f"健康检查响应: {response.json()}")
    except Exception as e:
        print(f"健康检查失败: {e}")
        return
    
    # 测试根路径
    try:
        response = requests.get(f"{base_url}/")
        print(f"根路径状态码: {response.status_code}")
        print(f"根路径响应: {response.json()}")
    except Exception as e:
        print(f"根路径测试失败: {e}")
    
    # 生成随机用户名
    username = generate_random_username()
    email = f"{username}@example.com"
    password = "password123"
    
    print(f"\n使用测试用户: {username}")
    
    # 测试注册接口
    try:
        register_data = {
            "username": username,
            "email": email,
            "password": password,
            "name": "测试用户",
            "school": "测试学校",
            "subject": "历史",
            "grades": ["高一", "高二"]
        }
        response = requests.post(f"{base_url}/auth/register", json=register_data)
        print(f"注册接口状态码: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print(f"注册成功: 用户ID {result['user']['id']}, Token类型: {result['token_type']}")
            access_token = result['access_token']
        else:
            print(f"注册失败: {response.json()}")
            return
    except Exception as e:
        print(f"注册接口测试失败: {e}")
        return
    
    # 测试登录接口
    try:
        login_data = {
            "username": username,
            "password": password
        }
        response = requests.post(f"{base_url}/auth/login", json=login_data)
        print(f"登录接口状态码: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print(f"登录成功: 用户 {result['user']['name']}, 角色: {result['user']['role']}")
        else:
            print(f"登录失败: {response.json()}")
    except Exception as e:
        print(f"登录接口测试失败: {e}")
    
    # 测试受保护的接口（获取当前用户信息）
    try:
        headers = {"Authorization": f"Bearer {access_token}"}
        response = requests.get(f"{base_url}/auth/me", headers=headers)
        print(f"获取用户信息状态码: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print(f"当前用户: {result['name']} ({result['username']})")
        else:
            print(f"获取用户信息失败: {response.json()}")
    except Exception as e:
        print(f"获取用户信息测试失败: {e}")

if __name__ == "__main__":
    test_backend_api()