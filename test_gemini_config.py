#!/usr/bin/env python3
"""
Gemini API 配置测试脚本
"""

import asyncio
import sys
import os
from pathlib import Path

# 添加项目路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

try:
    # 添加后端路径到Python路径
    backend_path = project_root / "backend"
    sys.path.insert(0, str(backend_path))
    
    from services.gemini_ocr_service import GeminiOCRService
    from config.settings import settings
except ImportError as e:
    print(f"❌ 导入错误: {e}")
    print("请确保在项目根目录运行此脚本")
    sys.exit(1)

async def test_gemini_configuration():
    """测试Gemini配置"""
    print("🔧 Gemini 2.5 Pro API 配置测试")
    print("=" * 50)
    
    # 检查配置
    print("📋 配置检查:")
    print(f"   API密钥: {'已配置' if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY != 'your-gemini-api-key-here' else '❌ 未配置'}")
    print(f"   模型: {settings.GEMINI_MODEL}")
    print(f"   Base URL: {settings.GEMINI_BASE_URL}")
    print(f"   最大Token: {settings.GEMINI_MAX_TOKENS}")
    print(f"   温度: {settings.GEMINI_TEMPERATURE}")
    
    if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY == "your-gemini-api-key-here":
        print("\n❌ 错误: Gemini API密钥未配置!")
        print("\n📝 配置步骤:")
        print("1. 获取API密钥: https://aistudio.google.com/")
        print("2. 编辑文件: backend/.env")
        print("3. 设置: GEMINI_API_KEY=\"你的API密钥\"")
        return False
    
    print("\n🚀 服务连接测试:")
    
    try:
        # 初始化服务
        ocr_service = GeminiOCRService()
        print("✅ Gemini OCR服务初始化成功")
        
        # 检查服务状态
        health_status = ocr_service.get_health_status()
        print(f"✅ 服务状态: {health_status['status']}")
        print(f"✅ 支持功能: {', '.join(health_status['capabilities'])}")
        
        # 简单API连接测试
        print("\n🌐 API连接测试:")
        await test_api_connection(ocr_service)
        
        print("\n🎉 Gemini配置测试完成！")
        return True
        
    except Exception as e:
        print(f"❌ 服务测试失败: {str(e)}")
        return False

async def test_api_connection(ocr_service):
    """测试API连接"""
    import aiohttp
    import json
    
    # 简单的文本生成测试
    test_request = {
        "contents": [
            {
                "parts": [
                    {"text": "请回答：1+1等于多少？请用JSON格式回答：{\"answer\": \"数字\"}"}
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.1,
            "maxOutputTokens": 100
        }
    }
    
    url = f"{settings.GEMINI_BASE_URL}/models/{settings.GEMINI_MODEL}:generateContent"
    headers = {
        "Content-Type": "application/json",
        "x-goog-api-key": settings.GEMINI_API_KEY
    }
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=test_request, headers=headers, timeout=10) as response:
                if response.status == 200:
                    result = await response.json()
                    if result.get('candidates'):
                        content = result['candidates'][0]['content']['parts'][0]['text']
                        print(f"✅ API连接成功，响应: {content[:50]}...")
                    else:
                        print("⚠️  API连接成功，但响应格式异常")
                else:
                    error_text = await response.text()
                    print(f"❌ API连接失败: {response.status} - {error_text}")
                    
    except asyncio.TimeoutError:
        print("❌ API连接超时")
    except Exception as e:
        print(f"❌ API连接错误: {str(e)}")

def show_configuration_guide():
    """显示配置指南"""
    print("\n📖 Gemini 2.5 Pro API 配置指南")
    print("=" * 50)
    print("\n🔑 1. 获取API密钥:")
    print("   • 访问: https://aistudio.google.com/")
    print("   • 登录Google账户")
    print("   • 点击 'Get API Key' → 'Create API Key'")
    print("   • 复制生成的API密钥")
    
    print("\n⚙️  2. 配置后端:")
    print("   • 编辑文件: backend/.env")
    print("   • 设置: GEMINI_API_KEY=\"你的API密钥\"")
    
    print("\n🧪 3. 测试配置:")
    print("   • 运行: python test_gemini_config.py")
    
    print("\n📊 4. 使用配额:")
    print("   • 免费额度: 每分钟15次请求")
    print("   • 付费后: 每分钟1000次请求")
    print("   • 监控: https://aistudio.google.com/app/quota")
    
    print("\n🛠️  5. 功能特性:")
    print("   • 答题卡OCR识别")
    print("   • 试卷结构分析")
    print("   • 学生信息提取") 
    print("   • 手写文字识别")
    print("   • 批量图像处理")

async def main():
    """主函数"""
    print("智阅AI - Gemini配置工具\n")
    
    if len(sys.argv) > 1 and sys.argv[1] == "--guide":
        show_configuration_guide()
        return
    
    success = await test_gemini_configuration()
    
    if not success:
        print("\n" + "=" * 50)
        show_configuration_guide()
        sys.exit(1)
    else:
        print("\n🎯 下一步:")
        print("• 启动后端服务: python backend/start.py")
        print("• 启动前端服务: npm run dev")
        print("• 访问应用: http://localhost:5173")

if __name__ == "__main__":
    asyncio.run(main())