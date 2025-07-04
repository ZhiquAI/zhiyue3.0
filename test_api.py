#!/usr/bin/env python3
"""
智阅AI API测试脚本
"""

import requests
import json
import time
from typing import Dict, Any

BASE_URL = "http://localhost:8000"

class APITester:
    def __init__(self, base_url: str = BASE_URL):
        self.base_url = base_url
        self.session = requests.Session()
        self.token = None
        
    def test_health_check(self) -> bool:
        """测试健康检查接口"""
        try:
            response = self.session.get(f"{self.base_url}/health")
            if response.status_code == 200:
                print("✅ 健康检查通过")
                return True
            else:
                print(f"❌ 健康检查失败: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ 健康检查异常: {e}")
            return False
    
    def test_register_user(self) -> bool:
        """测试用户注册"""
        try:
            user_data = {
                "username": "test_teacher",
                "email": "test@example.com",
                "password": "test123456",
                "name": "测试教师",
                "school": "测试学校",
                "subject": "历史"
            }
            
            response = self.session.post(
                f"{self.base_url}/auth/register",
                json=user_data
            )
            
            if response.status_code == 200:
                data = response.json()
                self.token = data["access_token"]
                self.session.headers.update({
                    "Authorization": f"Bearer {self.token}"
                })
                print("✅ 用户注册成功")
                return True
            else:
                print(f"❌ 用户注册失败: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ 用户注册异常: {e}")
            return False
    
    def test_login_user(self) -> bool:
        """测试用户登录"""
        try:
            login_data = {
                "username": "test_teacher",
                "password": "test123456"
            }
            
            response = self.session.post(
                f"{self.base_url}/auth/login",
                json=login_data
            )
            
            if response.status_code == 200:
                data = response.json()
                self.token = data["access_token"]
                self.session.headers.update({
                    "Authorization": f"Bearer {self.token}"
                })
                print("✅ 用户登录成功")
                return True
            else:
                print(f"❌ 用户登录失败: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ 用户登录异常: {e}")
            return False
    
    def test_get_current_user(self) -> bool:
        """测试获取当前用户信息"""
        try:
            response = self.session.get(f"{self.base_url}/auth/me")
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ 获取用户信息成功: {data['name']}")
                return True
            else:
                print(f"❌ 获取用户信息失败: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ 获取用户信息异常: {e}")
            return False
    
    def test_create_exam(self) -> str:
        """测试创建考试"""
        try:
            exam_data = {
                "name": "测试考试",
                "subject": "历史",
                "grade": "八年级",
                "paper_config": {
                    "total_questions": 10,
                    "question_types": ["选择题", "填空题", "简答题"]
                },
                "grading_config": {
                    "total_score": 100,
                    "objective_score": 60,
                    "subjective_score": 40
                }
            }
            
            response = self.session.post(
                f"{self.base_url}/api/exams/",
                json=exam_data
            )
            
            if response.status_code == 200:
                data = response.json()
                exam_id = data["id"]
                print(f"✅ 创建考试成功: {exam_id}")
                return exam_id
            else:
                print(f"❌ 创建考试失败: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            print(f"❌ 创建考试异常: {e}")
            return None
    
    def test_get_exams(self) -> bool:
        """测试获取考试列表"""
        try:
            response = self.session.get(f"{self.base_url}/api/exams/")
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ 获取考试列表成功: {len(data)} 个考试")
                return True
            else:
                print(f"❌ 获取考试列表失败: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ 获取考试列表异常: {e}")
            return False
    
    def test_get_config(self) -> bool:
        """测试获取配置信息"""
        try:
            response = self.session.get(f"{self.base_url}/api/config")
            
            if response.status_code == 200:
                data = response.json()
                print("✅ 获取配置信息成功")
                print(f"   OCR引擎: {data['ocr_config']['primary_engine']}")
                print(f"   AI评分: {'启用' if data['features']['ai_grading_enabled'] else '禁用'}")
                return True
            else:
                print(f"❌ 获取配置信息失败: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ 获取配置信息异常: {e}")
            return False
    
    def run_all_tests(self):
        """运行所有测试"""
        print("🧪 开始API测试")
        print("=" * 50)
        
        test_results = []
        
        # 基础测试
        test_results.append(("健康检查", self.test_health_check()))
        test_results.append(("获取配置", self.test_get_config()))
        
        # 认证测试
        test_results.append(("用户注册", self.test_register_user()))
        if self.token:
            test_results.append(("获取用户信息", self.test_get_current_user()))
            
            # 考试管理测试
            exam_id = self.test_create_exam()
            test_results.append(("创建考试", exam_id is not None))
            test_results.append(("获取考试列表", self.test_get_exams()))
        else:
            # 尝试登录
            test_results.append(("用户登录", self.test_login_user()))
        
        # 输出测试结果
        print("\n" + "=" * 50)
        print("📋 测试结果总结")
        print("=" * 50)
        
        passed = 0
        total = len(test_results)
        
        for test_name, result in test_results:
            status = "✅ 通过" if result else "❌ 失败"
            print(f"{test_name:<15} {status}")
            if result:
                passed += 1
        
        print(f"\n总计: {passed}/{total} 个测试通过")
        
        if passed == total:
            print("\n🎉 所有测试通过！API服务运行正常。")
        else:
            print(f"\n⚠️  有 {total - passed} 个测试失败，请检查服务配置。")

def main():
    """主函数"""
    print("智阅AI API测试工具")
    print("请确保后端服务已启动 (http://localhost:8000)")
    print()
    
    # 等待用户确认
    input("按回车键开始测试...")
    
    tester = APITester()
    tester.run_all_tests()

if __name__ == "__main__":
    main()