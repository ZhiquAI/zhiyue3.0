#!/usr/bin/env python3
# 测试前端登录API调用

import requests
import json

def test_frontend_login():
    """测试前端登录API调用"""
    url = "http://localhost:8000/auth/login"
    
    # 测试数据
    credentials = {
        "username": "testuser",
        "password": "password123"
    }
    
    headers = {
        "Content-Type": "application/json",
        "X-Request-ID": "test_frontend_login"
    }
    
    try:
        print(f"正在测试登录API: {url}")
        print(f"登录凭据: {credentials}")
        
        response = requests.post(url, json=credentials, headers=headers)
        
        print(f"\n响应状态码: {response.status_code}")
        print(f"响应头: {dict(response.headers)}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                print(f"\n响应数据: {json.dumps(data, indent=2, ensure_ascii=False)}")
                
                # 检查响应格式是否符合前端期望
                if isinstance(data, dict):
                    if 'access_token' in data:
                        print("\n✅ 登录成功 - 直接返回token格式")
                        # 转换为前端期望的格式
                        frontend_format = {
                            "success": True,
                            "data": {
                                "token": data.get('access_token'),
                                "user": {
                                    "id": "test-id",
                                    "username": credentials['username'],
                                    "name": credentials['username'],
                                    "email": f"{credentials['username']}@example.com",
                                    "role": "teacher",
                                    "permissions": []
                                }
                            }
                        }
                        print(f"\n前端期望格式: {json.dumps(frontend_format, indent=2, ensure_ascii=False)}")
                    elif 'success' in data:
                        print("\n✅ 登录成功 - 已是前端期望格式")
                    else:
                        print("\n❌ 响应格式不符合前端期望")
                else:
                    print("\n❌ 响应不是JSON对象")
                    
            except json.JSONDecodeError:
                print(f"\n❌ 响应不是有效的JSON: {response.text}")
        else:
            print(f"\n❌ 登录失败: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"\n❌ 请求失败: {e}")
    except Exception as e:
        print(f"\n❌ 测试过程中出错: {e}")

if __name__ == "__main__":
    test_frontend_login()