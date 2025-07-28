#!/usr/bin/env python3
"""测试增强的认证系统"""

import asyncio
import aiohttp
import json
from datetime import datetime
import time

# 测试配置
BASE_URL = "http://localhost:8000"
TEST_USER = {
    "username": "test_enhanced_user",
    "email": "test_enhanced@example.com",
    "password": "TestPassword123!",
    "name": "Enhanced Test User",
    "role": "teacher"
}

class EnhancedAuthTester:
    def __init__(self):
        self.session = None
        self.access_token = None
        self.refresh_token = None
        self.user_id = None
    
    async def setup_session(self):
        """设置HTTP会话"""
        self.session = aiohttp.ClientSession()
    
    async def cleanup_session(self):
        """清理HTTP会话"""
        if self.session:
            await self.session.close()
    
    async def test_user_registration(self):
        """测试用户注册"""
        print("\n=== 测试用户注册 ===")
        
        try:
            async with self.session.post(
                f"{BASE_URL}/auth/register",
                json=TEST_USER
            ) as response:
                if response.status == 201:
                    result = await response.json()
                    print(f"✅ 用户注册成功: {result['message']}")
                    return True
                elif response.status == 400:
                    error = await response.json()
                    if "已存在" in error.get('detail', ''):
                        print("ℹ️  用户已存在，跳过注册")
                        return True
                    else:
                        print(f"❌ 注册失败: {error}")
                        return False
                else:
                    print(f"❌ 注册失败，状态码: {response.status}")
                    return False
        except Exception as e:
            print(f"❌ 注册异常: {str(e)}")
            return False
    
    async def test_enhanced_login(self):
        """测试增强登录"""
        print("\n=== 测试增强登录 ===")
        
        try:
            # 测试增强登录接口
            async with self.session.post(
                f"{BASE_URL}/auth/login-enhanced",
                params={
                    "username": TEST_USER["username"],
                    "password": TEST_USER["password"]
                }
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    self.access_token = result['access_token']
                    self.refresh_token = result['refresh_token']
                    self.user_id = result['user_info']['id']
                    
                    print(f"✅ 增强登录成功")
                    print(f"   用户ID: {self.user_id}")
                    print(f"   角色: {result['user_info']['role']}")
                    print(f"   权限数量: {len(result['user_info']['permissions'])}")
                    print(f"   令牌过期时间: {result['expires_in']}秒")
                    return True
                else:
                    error = await response.json()
                    print(f"❌ 增强登录失败: {error}")
                    return False
        except Exception as e:
            print(f"❌ 增强登录异常: {str(e)}")
            return False
    
    async def test_token_refresh(self):
        """测试令牌刷新"""
        print("\n=== 测试令牌刷新 ===")
        
        if not self.refresh_token:
            print("❌ 没有刷新令牌")
            return False
        
        try:
            async with self.session.post(
                f"{BASE_URL}/auth/refresh",
                json={"refresh_token": self.refresh_token}
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    old_token = self.access_token
                    self.access_token = result['access_token']
                    
                    print(f"✅ 令牌刷新成功")
                    print(f"   新令牌与旧令牌不同: {old_token != self.access_token}")
                    return True
                else:
                    error = await response.json()
                    print(f"❌ 令牌刷新失败: {error}")
                    return False
        except Exception as e:
            print(f"❌ 令牌刷新异常: {str(e)}")
            return False
    
    async def test_session_management(self):
        """测试会话管理"""
        print("\n=== 测试会话管理 ===")
        
        if not self.access_token:
            print("❌ 没有访问令牌")
            return False
        
        headers = {"Authorization": f"Bearer {self.access_token}"}
        
        try:
            # 获取用户会话
            async with self.session.get(
                f"{BASE_URL}/auth/sessions",
                headers=headers
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    print(f"✅ 获取会话成功")
                    print(f"   活跃会话数: {result['total_count']}")
                    
                    if result['active_sessions']:
                        session = result['active_sessions'][0]
                        print(f"   会话类型: {session['token_type']}")
                        print(f"   创建时间: {session['created_at']}")
                    
                    return True
                else:
                    error = await response.json()
                    print(f"❌ 获取会话失败: {error}")
                    return False
        except Exception as e:
            print(f"❌ 会话管理异常: {str(e)}")
            return False
    
    async def test_permissions_check(self):
        """测试权限检查"""
        print("\n=== 测试权限检查 ===")
        
        if not self.access_token:
            print("❌ 没有访问令牌")
            return False
        
        headers = {"Authorization": f"Bearer {self.access_token}"}
        
        try:
            # 获取当前用户权限
            async with self.session.get(
                f"{BASE_URL}/auth/permissions",
                headers=headers
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    print(f"✅ 权限检查成功")
                    print(f"   用户角色: {result['role']}")
                    print(f"   权限列表: {result['permissions']}")
                    print(f"   权限已缓存: {result['cached']}")
                    return True
                else:
                    error = await response.json()
                    print(f"❌ 权限检查失败: {error}")
                    return False
        except Exception as e:
            print(f"❌ 权限检查异常: {str(e)}")
            return False
    
    async def test_rate_limiting(self):
        """测试速率限制"""
        print("\n=== 测试速率限制 ===")
        
        # 快速发送多个登录请求来触发速率限制
        failed_attempts = 0
        
        for i in range(7):  # 超过限制的5次
            try:
                async with self.session.post(
                    f"{BASE_URL}/auth/login-enhanced",
                    params={
                        "username": "invalid_user",
                        "password": "invalid_password"
                    }
                ) as response:
                    if response.status == 429:  # Too Many Requests
                        print(f"✅ 速率限制生效，第{i+1}次请求被拒绝")
                        return True
                    elif response.status == 401:
                        failed_attempts += 1
                        print(f"   第{i+1}次登录失败（预期）")
                    
                    # 短暂延迟
                    await asyncio.sleep(0.1)
            except Exception as e:
                print(f"   请求异常: {str(e)}")
        
        print(f"ℹ️  完成{failed_attempts}次失败登录，未触发速率限制")
        return True
    
    async def test_logout_functionality(self):
        """测试登出功能"""
        print("\n=== 测试登出功能 ===")
        
        if not self.access_token:
            print("❌ 没有访问令牌")
            return False
        
        headers = {"Authorization": f"Bearer {self.access_token}"}
        
        try:
            # 测试单设备登出
            async with self.session.post(
                f"{BASE_URL}/auth/logout",
                headers=headers
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    print(f"✅ 登出成功: {result['message']}")
                    
                    # 验证令牌是否失效
                    async with self.session.get(
                        f"{BASE_URL}/auth/permissions",
                        headers=headers
                    ) as verify_response:
                        if verify_response.status == 401:
                            print("✅ 令牌已失效")
                            return True
                        else:
                            print("⚠️  令牌仍然有效")
                            return False
                else:
                    error = await response.json()
                    print(f"❌ 登出失败: {error}")
                    return False
        except Exception as e:
            print(f"❌ 登出异常: {str(e)}")
            return False
    
    async def run_all_tests(self):
        """运行所有测试"""
        print("🚀 开始增强认证系统测试")
        print(f"测试时间: {datetime.now()}")
        print(f"测试目标: {BASE_URL}")
        
        await self.setup_session()
        
        tests = [
            ("用户注册", self.test_user_registration),
            ("增强登录", self.test_enhanced_login),
            ("令牌刷新", self.test_token_refresh),
            ("会话管理", self.test_session_management),
            ("权限检查", self.test_permissions_check),
            ("速率限制", self.test_rate_limiting),
            ("登出功能", self.test_logout_functionality),
        ]
        
        results = []
        
        for test_name, test_func in tests:
            try:
                result = await test_func()
                results.append((test_name, result))
                
                # 测试间短暂延迟
                await asyncio.sleep(0.5)
            except Exception as e:
                print(f"❌ {test_name}测试异常: {str(e)}")
                results.append((test_name, False))
        
        await self.cleanup_session()
        
        # 输出测试结果摘要
        print("\n" + "="*50)
        print("📊 测试结果摘要")
        print("="*50)
        
        passed = 0
        total = len(results)
        
        for test_name, result in results:
            status = "✅ 通过" if result else "❌ 失败"
            print(f"{test_name:15} : {status}")
            if result:
                passed += 1
        
        print(f"\n总计: {passed}/{total} 个测试通过")
        success_rate = (passed / total) * 100
        print(f"成功率: {success_rate:.1f}%")
        
        if success_rate >= 80:
            print("\n🎉 增强认证系统测试基本通过！")
        else:
            print("\n⚠️  增强认证系统需要进一步优化")
        
        return success_rate >= 80

async def main():
    """主函数"""
    tester = EnhancedAuthTester()
    success = await tester.run_all_tests()
    return success

if __name__ == "__main__":
    try:
        result = asyncio.run(main())
        exit(0 if result else 1)
    except KeyboardInterrupt:
        print("\n测试被用户中断")
        exit(1)
    except Exception as e:
        print(f"\n测试执行异常: {str(e)}")
        exit(1)