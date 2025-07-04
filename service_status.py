#!/usr/bin/env python3
"""
智阅AI服务状态检查工具
"""

import subprocess
import sys
import requests
import time
from pathlib import Path

def check_service_port(port, service_name):
    """检查端口是否被占用"""
    try:
        result = subprocess.run(['lsof', '-i', f':{port}'], 
                              capture_output=True, text=True)
        if result.returncode == 0 and result.stdout:
            print(f"✅ {service_name} 正在运行 (端口 {port})")
            return True
        else:
            print(f"❌ {service_name} 未运行 (端口 {port})")
            return False
    except:
        print(f"⚠️  无法检查 {service_name} 状态")
        return False

def check_http_service(url, service_name):
    """检查HTTP服务是否可访问"""
    try:
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            print(f"✅ {service_name} HTTP服务正常: {url}")
            return True
        else:
            print(f"⚠️  {service_name} HTTP响应异常: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print(f"❌ {service_name} 连接失败: {url}")
        return False
    except requests.exceptions.Timeout:
        print(f"⚠️  {service_name} 连接超时: {url}")
        return False
    except Exception as e:
        print(f"❌ {service_name} 检查错误: {str(e)}")
        return False

def main():
    """主函数"""
    print("🔍 智阅AI服务状态检查")
    print("=" * 50)
    
    # 检查前端服务
    print("\n📱 前端服务 (Vite)")
    frontend_running = check_service_port(5173, "前端服务")
    if frontend_running:
        check_http_service("http://localhost:5173", "前端页面")
    else:
        print("   启动命令: npm run dev")
    
    # 检查后端服务
    print("\n🚀 后端服务 (FastAPI)")
    backend_running = check_service_port(8000, "后端服务")
    if backend_running:
        check_http_service("http://localhost:8000/health", "后端健康检查")
        check_http_service("http://localhost:8000/docs", "API文档")
    else:
        print("   启动命令: python backend/start.py")
    
    # 检查配置文件
    print("\n⚙️  配置文件检查")
    env_files = [
        Path(".env"),
        Path("backend/.env")
    ]
    
    for env_file in env_files:
        if env_file.exists():
            print(f"✅ 配置文件存在: {env_file}")
            
            # 检查关键配置
            try:
                with open(env_file, 'r') as f:
                    content = f.read()
                    if 'GEMINI_API_KEY=' in content and 'your-gemini-api-key-here' not in content:
                        print(f"   ✅ Gemini API密钥已配置")
                    else:
                        print(f"   ⚠️  Gemini API密钥未配置")
            except:
                pass
        else:
            print(f"❌ 配置文件缺失: {env_file}")
    
    # 依赖检查
    print("\n📦 依赖检查")
    
    # Python依赖
    try:
        import fastapi
        print("✅ Python后端依赖已安装")
    except ImportError:
        print("❌ Python后端依赖未安装")
        print("   安装命令: pip install -r backend/requirements.txt")
    
    # Node.js依赖
    node_modules = Path("node_modules")
    if node_modules.exists():
        print("✅ Node.js前端依赖已安装")
    else:
        print("❌ Node.js前端依赖未安装")
        print("   安装命令: npm install")
    
    # 总结
    print("\n" + "=" * 50)
    print("📋 服务状态总结")
    print("=" * 50)
    
    if frontend_running and backend_running:
        print("🎉 所有服务运行正常！")
        print("\n🌐 访问地址:")
        print("• 前端应用: http://localhost:5173")
        print("• 后端API: http://localhost:8000")
        print("• API文档: http://localhost:8000/docs")
    elif frontend_running:
        print("⚠️  仅前端服务运行，需要启动后端服务")
        print("   启动命令: python backend/start.py")
    elif backend_running:
        print("⚠️  仅后端服务运行，需要启动前端服务")
        print("   启动命令: npm run dev")
    else:
        print("❌ 所有服务都未运行")
        print("\n🚀 启动步骤:")
        print("1. 启动后端: python backend/start.py")
        print("2. 启动前端: npm run dev")
        print("3. 访问应用: http://localhost:5173")

if __name__ == "__main__":
    main()