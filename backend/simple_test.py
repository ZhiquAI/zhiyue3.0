"""
简化的系统测试脚本
测试核心功能是否正常工作
"""

import sys
import os
from datetime import datetime, timezone

# 添加项目根目录到Python路径
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
sys.path.insert(0, project_root)

def test_database_connection():
    """测试数据库连接"""
    try:
        from backend.database.unified_connection import database_health_check
        health = database_health_check()
        print(f"✅ 数据库健康检查: {health['status']}")
        return health['status'] == 'healthy'
    except Exception as e:
        print(f"❌ 数据库连接失败: {e}")
        return False

def test_model_creation():
    """测试模型创建"""
    try:
        from backend.config.models import UserRole
        
        # 直接使用SQLAlchemy创建记录
        import sqlite3
        conn = sqlite3.connect('zhiyue_ai.db')
        cursor = conn.cursor()
        
        # 插入测试用户
        user_id = str(__import__('uuid').uuid4())
        cursor.execute("""
            INSERT INTO users (id, username, email, hashed_password, name, role, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            user_id,
            'test_user_simple',
            'simple@test.com',
            'hashed_password',
            '简单测试用户',
            'teacher',
            datetime.now(timezone.utc).isoformat()
        ))
        
        # 查询验证
        cursor.execute("SELECT id, username, name FROM users WHERE id = ?", (user_id,))
        result = cursor.fetchone()
        
        conn.commit()
        conn.close()
        
        if result:
            print(f"✅ 用户创建成功: {result[1]} - {result[2]}")
            return True, user_id
        else:
            print("❌ 用户创建失败")
            return False, None
            
    except Exception as e:
        print(f"❌ 模型创建测试失败: {e}")
        return False, None

def test_exam_creation(user_id):
    """测试考试创建"""
    try:
        import sqlite3
        conn = sqlite3.connect('zhiyue_ai.db')
        cursor = conn.cursor()
        
        # 插入测试考试
        exam_id = str(__import__('uuid').uuid4())
        cursor.execute("""
            INSERT INTO exams (id, name, subject, grade, status, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            exam_id,
            '简单测试考试',
            '数学',
            '高三',
            '草稿',
            user_id,
            datetime.now(timezone.utc).isoformat()
        ))
        
        # 查询验证
        cursor.execute("SELECT id, name, subject FROM exams WHERE id = ?", (exam_id,))
        result = cursor.fetchone()
        
        conn.commit()
        conn.close()
        
        if result:
            print(f"✅ 考试创建成功: {result[1]} - {result[2]}")
            return True, exam_id
        else:
            print("❌ 考试创建失败")
            return False, None
            
    except Exception as e:
        print(f"❌ 考试创建测试失败: {e}")
        return False, None

def test_student_creation(user_id, exam_id):
    """测试学生创建"""
    try:
        import sqlite3
        conn = sqlite3.connect('zhiyue_ai.db')
        cursor = conn.cursor()
        
        # 插入测试学生
        student_id = str(__import__('uuid').uuid4())
        cursor.execute("""
            INSERT INTO students (id, student_id, name, class_name, grade, exam_id, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            student_id,
            'ST001',
            '测试学生',
            '高三1班',
            '高三',
            exam_id,
            user_id,
            datetime.now(timezone.utc).isoformat()
        ))
        
        # 查询验证
        cursor.execute("SELECT id, student_id, name, class_name FROM students WHERE id = ?", (student_id,))
        result = cursor.fetchone()
        
        conn.commit()
        conn.close()
        
        if result:
            print(f"✅ 学生创建成功: {result[1]} - {result[2]} ({result[3]})")
            return True
        else:
            print("❌ 学生创建失败")
            return False
            
    except Exception as e:
        print(f"❌ 学生创建测试失败: {e}")
        return False

def test_system_config():
    """测试系统配置"""
    try:
        import sqlite3
        conn = sqlite3.connect('zhiyue_ai.db')
        cursor = conn.cursor()
        
        # 查询系统配置
        cursor.execute("SELECT config_key, description FROM system_configs LIMIT 5")
        results = cursor.fetchall()
        
        conn.close()
        
        if results:
            print(f"✅ 系统配置查询成功，共 {len(results)} 条配置:")
            for config in results:
                print(f"   - {config[0]}: {config[1]}")
            return True
        else:
            print("❌ 系统配置查询失败")
            return False
            
    except Exception as e:
        print(f"❌ 系统配置测试失败: {e}")
        return False

def test_api_import():
    """测试API导入"""
    try:
        from backend.api.unified_router import unified_router
        print(f"✅ API路由导入成功，共 {len(unified_router.routes)} 个路由")
        
        # 显示主要路由
        for route in unified_router.routes[:5]:
            if hasattr(route, 'path') and hasattr(route, 'methods'):
                methods = list(route.methods) if route.methods else ['GET']
                print(f"   - {methods[0]} {route.path}")
        
        return True
    except Exception as e:
        print(f"❌ API导入失败: {e}")
        return False

def main():
    """主函数"""
    print("🧪 智阅3.0简化系统测试")
    print("=" * 40)
    
    tests_passed = 0
    total_tests = 6
    
    # 1. 数据库连接测试
    if test_database_connection():
        tests_passed += 1
    
    # 2. 模型创建测试
    success, user_id = test_model_creation()
    if success:
        tests_passed += 1
    
    # 3. 考试创建测试
    exam_success, exam_id = False, None
    if user_id:
        exam_success, exam_id = test_exam_creation(user_id)
        if exam_success:
            tests_passed += 1
    
    # 4. 学生创建测试
    if user_id and exam_id:
        if test_student_creation(user_id, exam_id):
            tests_passed += 1
    
    # 5. 系统配置测试
    if test_system_config():
        tests_passed += 1
    
    # 6. API导入测试
    if test_api_import():
        tests_passed += 1
    
    print("=" * 40)
    success_rate = (tests_passed / total_tests) * 100
    print(f"📊 测试结果: {tests_passed}/{total_tests} 通过 ({success_rate:.1f}%)")
    
    if tests_passed == total_tests:
        print("🎉 所有测试通过！系统基础功能正常。")
        return 0
    else:
        print("⚠️  部分测试失败，请检查系统配置。")
        return 1

if __name__ == "__main__":
    sys.exit(main())