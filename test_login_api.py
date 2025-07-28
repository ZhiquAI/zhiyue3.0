#!/usr/bin/env python3
"""
测试登录API是否正常工作
"""

import requests
import json

def test_login_api():
    """测试登录API"""
    url = "http://localhost:8000/auth/login"
    
    # 测试数据 - 使用数据库中存在的用户
    login_data = {
        "username": "testuser",
        "password": "password123"
    }
    
    try:
        print("正在测试登录API...")
        print(f"URL: {url}")
        print(f"数据: {login_data}")
        
        response = requests.post(
            url,
            json=login_data,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        print(f"\n响应状态码: {response.status_code}")
        print(f"响应头: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            print("\n✅ 登录成功!")
            print(f"访问令牌: {data.get('access_token', 'N/A')[:50]}...")
            print(f"用户名: {data.get('user', {}).get('username', 'N/A')}")
            print(f"用户角色: {data.get('user', {}).get('role', 'N/A')}")
            return True
        else:
            print(f"\n❌ 登录失败: {response.status_code}")
            try:
                error_data = response.json()
                print(f"错误信息: {error_data}")
            except:
                print(f"响应内容: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("\n❌ 连接失败: 无法连接到后端服务")
        print("请确保后端服务正在运行在 http://localhost:8000")
        return False
    except requests.exceptions.Timeout:
        print("\n❌ 请求超时")
        return False
    except Exception as e:
        print(f"\n❌ 测试失败: {str(e)}")
        return False

def test_server_health():
    """测试服务器健康状态"""
    try:
        response = requests.get("http://localhost:8000/docs", timeout=5)
        if response.status_code == 200:
            print("✅ 后端服务运行正常")
            return True
        else:
            print(f"❌ 后端服务响应异常: {response.status_code}")
            return False
    except:
        print("❌ 后端服务无法访问")
        return False

if __name__ == "__main__":
    print("=" * 50)
    print("智阅AI登录API测试")
    print("=" * 50)
    
    # 测试服务器健康状态
    print("\n1. 检查后端服务状态...")
    if not test_server_health():
        print("\n请先启动后端服务: cd backend && python3 start.py")
        exit(1)
    
    # 测试登录API
    print("\n2. 测试登录API...")
    success = test_login_api()
    
    print("\n" + "=" * 50)
    if success:
        print("🎉 所有测试通过！登录功能正常工作")
    else:
        print("💥 测试失败，需要检查后端服务")
    print("=" * 50)