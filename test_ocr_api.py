#!/usr/bin/env python3
"""
测试OCR API功能
"""

import httpx
import json
import asyncio

async def test_ocr_api():
    """测试OCR API是否正常工作"""
    
    # 测试API端点
    base_url = "http://localhost:8000"
    
    # 1. 测试登录获取token
    login_data = {
        "username": "admin",
        "password": "admin123"
    }
    
    try:
        async with httpx.AsyncClient() as client:
            print("1. 测试登录...")
            login_response = await client.post(f"{base_url}/auth/login", json=login_data)
            print(f"登录状态码: {login_response.status_code}")
            
            if login_response.status_code == 200:
                token = login_response.json().get("access_token")
                print(f"获取到token: {token[:20]}...")
                
                # 2. 测试OCR处理端点
                headers = {
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json"
                }
                
                print("\n2. 测试OCR处理API...")
                # 使用一个测试答题卡ID
                test_sheet_id = "test_sheet_001"
                ocr_url = f"{base_url}/api/ocr/process?answer_sheet_id={test_sheet_id}"
                
                ocr_response = await client.post(ocr_url, headers=headers)
                print(f"OCR API状态码: {ocr_response.status_code}")
                print(f"OCR API响应: {ocr_response.text[:200]}...")
                
                if ocr_response.status_code == 404:
                    print("答题卡不存在，这是正常的测试结果")
                elif ocr_response.status_code == 500:
                    print("服务器内部错误，可能是OCR服务配置问题")
                
            else:
                print(f"登录失败: {login_response.text}")
                
    except httpx.ConnectError:
        print("无法连接到后端服务，请确保后端正在运行")
    except Exception as e:
        print(f"测试过程中出现错误: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_ocr_api())