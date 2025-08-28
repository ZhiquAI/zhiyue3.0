"""
数据库同步脚本
将现有数据库结构同步到新的统一模型
"""

import sqlite3
import sys
import os
from datetime import datetime, timezone

def utcnow():
    """返回UTC时间"""
    return datetime.now(timezone.utc)

def sync_users_table():
    """同步用户表"""
    conn = sqlite3.connect('zhiyue_ai.db')
    cursor = conn.cursor()
    
    try:
        # 添加缺失的字段
        alter_commands = [
            "ALTER TABLE users ADD COLUMN department VARCHAR(100)",
            "ALTER TABLE users ADD COLUMN phone VARCHAR(20)",
            "ALTER TABLE users ADD COLUMN address VARCHAR(500)",
            "ALTER TABLE users ADD COLUMN permissions JSON"
        ]
        
        for cmd in alter_commands:
            try:
                cursor.execute(cmd)
                print(f"✅ 执行成功: {cmd}")
            except sqlite3.OperationalError as e:
                if "duplicate column name" in str(e).lower():
                    print(f"⚠️  字段已存在: {cmd}")
                else:
                    print(f"❌ 执行失败: {cmd} - {e}")
        
        conn.commit()
        print("✅ 用户表同步完成")
        
    except Exception as e:
        print(f"❌ 用户表同步失败: {e}")
        conn.rollback()
    finally:
        conn.close()

def create_system_configs_table():
    """创建系统配置表"""
    conn = sqlite3.connect('zhiyue_ai.db')
    cursor = conn.cursor()
    
    try:
        create_sql = """
        CREATE TABLE IF NOT EXISTS system_configs (
            id VARCHAR(36) PRIMARY KEY,
            config_key VARCHAR(100) UNIQUE NOT NULL,
            config_value JSON,
            description VARCHAR(500),
            category VARCHAR(50),
            is_public BOOLEAN DEFAULT 0,
            required_role VARCHAR(20),
            version INTEGER DEFAULT 1,
            is_active BOOLEAN DEFAULT 1,
            created_at DATETIME,
            updated_at DATETIME,
            updated_by VARCHAR(36)
        )
        """
        
        cursor.execute(create_sql)
        
        # 创建索引
        indexes = [
            "CREATE INDEX IF NOT EXISTS idx_config_key ON system_configs (config_key)",
            "CREATE INDEX IF NOT EXISTS idx_config_category ON system_configs (category)",
            "CREATE INDEX IF NOT EXISTS idx_config_active ON system_configs (is_active)"
        ]
        
        for index_sql in indexes:
            cursor.execute(index_sql)
        
        conn.commit()
        print("✅ 系统配置表创建完成")
        
    except Exception as e:
        print(f"❌ 系统配置表创建失败: {e}")
        conn.rollback()
    finally:
        conn.close()

def sync_students_table():
    """同步学生表"""
    conn = sqlite3.connect('zhiyue_ai.db')
    cursor = conn.cursor()
    
    try:
        # 检查students表结构
        cursor.execute("PRAGMA table_info(students)")
        columns = [col[1] for col in cursor.fetchall()]
        
        # 需要添加的字段
        new_columns = {
            'gender': 'VARCHAR(10)',
            'birth_date': 'DATETIME',
            'id_card': 'VARCHAR(20)',
            'parent_name': 'VARCHAR(100)',
            'parent_phone': 'VARCHAR(20)',
            'address': 'VARCHAR(500)',
            'seat_number': 'VARCHAR(20)',
            'barcode_data': 'VARCHAR(500)',
            'subject_preferences': 'JSON',
            'special_needs': 'TEXT',
            'created_by': 'VARCHAR(36)'
        }
        
        for column, column_type in new_columns.items():
            if column not in columns:
                try:
                    cursor.execute(f"ALTER TABLE students ADD COLUMN {column} {column_type}")
                    print(f"✅ 添加字段: students.{column}")
                except sqlite3.OperationalError as e:
                    print(f"❌ 添加字段失败: students.{column} - {e}")
        
        conn.commit()
        print("✅ 学生表同步完成")
        
    except Exception as e:
        print(f"❌ 学生表同步失败: {e}")
        conn.rollback()
    finally:
        conn.close()

def sync_exams_table():
    """同步考试表"""
    conn = sqlite3.connect('zhiyue_ai.db')
    cursor = conn.cursor()
    
    try:
        # 检查exams表结构
        cursor.execute("PRAGMA table_info(exams)")
        columns = [col[1] for col in cursor.fetchall()]
        
        # 需要添加的字段
        new_columns = {
            'exam_type': 'VARCHAR(50)',
            'instructions': 'TEXT',
            'start_time': 'DATETIME',
            'end_time': 'DATETIME',
            'paper_config': 'JSON',
            'grading_config': 'JSON',
            'template_id': 'INTEGER',
            'status': 'VARCHAR(20)',
            'submitted_count': 'INTEGER DEFAULT 0',
            'graded_count': 'INTEGER DEFAULT 0',
            'max_score': 'REAL',
            'min_score': 'REAL',
            'pass_rate': 'REAL',
            'ai_grading_enabled': 'BOOLEAN DEFAULT 1',
            'double_blind_review': 'BOOLEAN DEFAULT 0',
            'review_sample_rate': 'REAL DEFAULT 0.1',
            'created_by': 'VARCHAR(36)'
        }
        
        for column, column_type in new_columns.items():
            if column not in columns:
                try:
                    cursor.execute(f"ALTER TABLE exams ADD COLUMN {column} {column_type}")
                    print(f"✅ 添加字段: exams.{column}")
                except sqlite3.OperationalError as e:
                    print(f"❌ 添加字段失败: exams.{column} - {e}")
        
        conn.commit()
        print("✅ 考试表同步完成")
        
    except Exception as e:
        print(f"❌ 考试表同步失败: {e}")
        conn.rollback()
    finally:
        conn.close()

def sync_answer_sheets_table():
    """同步答题卡表"""
    conn = sqlite3.connect('zhiyue_ai.db')
    cursor = conn.cursor()
    
    try:
        # 检查answer_sheets表结构
        cursor.execute("PRAGMA table_info(answer_sheets)")
        columns = [col[1] for col in cursor.fetchall()]
        
        # 需要添加的字段
        new_columns = {
            'student_number': 'VARCHAR(50)',
            'student_name': 'VARCHAR(100)',
            'class_name': 'VARCHAR(50)',
            'thumbnail_path': 'VARCHAR(500)',
            'file_hash': 'VARCHAR(64)',
            'file_size': 'INTEGER',
            'image_quality': 'JSON',
            'resolution': 'VARCHAR(20)',
            'scan_quality_score': 'REAL',
            'ocr_processing_time': 'REAL',
            'segmentation_quality': 'JSON',
            'manual_adjustments': 'JSON',
            'score_breakdown': 'JSON',
            'ai_grading_result': 'JSON',
            'ai_confidence_scores': 'JSON',
            'ai_processing_time': 'REAL',
            'review_reasons': 'JSON',
            'review_score_changes': 'JSON',
            'finalized_by': 'VARCHAR(36)',
            'finalized_at': 'DATETIME',
            'is_finalized': 'BOOLEAN DEFAULT 0'
        }
        
        for column, column_type in new_columns.items():
            if column not in columns:
                try:
                    cursor.execute(f"ALTER TABLE answer_sheets ADD COLUMN {column} {column_type}")
                    print(f"✅ 添加字段: answer_sheets.{column}")
                except sqlite3.OperationalError as e:
                    print(f"❌ 添加字段失败: answer_sheets.{column} - {e}")
        
        conn.commit()
        print("✅ 答题卡表同步完成")
        
    except Exception as e:
        print(f"❌ 答题卡表同步失败: {e}")
        conn.rollback()
    finally:
        conn.close()

def sync_grading_tasks_table():
    """同步评分任务表"""
    conn = sqlite3.connect('zhiyue_ai.db')
    cursor = conn.cursor()
    
    try:
        # 检查grading_tasks表结构
        cursor.execute("PRAGMA table_info(grading_tasks)")
        columns = [col[1] for col in cursor.fetchall()]
        
        # 需要添加的字段
        new_columns = {
            'batch_id': 'VARCHAR(36)',
            'progress': 'REAL DEFAULT 0.0',
            'result_data': 'JSON',
            'processing_logs': 'JSON',
            'estimated_duration': 'INTEGER',
            'actual_duration': 'INTEGER',
            'next_retry_at': 'DATETIME',
            'depends_on': 'JSON',
            'blocks_tasks': 'JSON'
        }
        
        for column, column_type in new_columns.items():
            if column not in columns:
                try:
                    cursor.execute(f"ALTER TABLE grading_tasks ADD COLUMN {column} {column_type}")
                    print(f"✅ 添加字段: grading_tasks.{column}")
                except sqlite3.OperationalError as e:
                    print(f"❌ 添加字段失败: grading_tasks.{column} - {e}")
        
        conn.commit()
        print("✅ 评分任务表同步完成")
        
    except Exception as e:
        print(f"❌ 评分任务表同步失败: {e}")
        conn.rollback()
    finally:
        conn.close()

def update_template_usages_table():
    """更新模板使用记录表"""
    conn = sqlite3.connect('zhiyue_ai.db')
    cursor = conn.cursor()
    
    try:
        # 检查template_usages表结构
        cursor.execute("PRAGMA table_info(template_usages)")
        columns = [col[1] for col in cursor.fetchall()]
        
        # 需要添加的字段
        new_columns = {
            'answer_sheets_count': 'INTEGER DEFAULT 0',
            'success_rate': 'REAL',
            'average_confidence': 'REAL',
            'quality_rating': 'INTEGER',
            'feedback_comments': 'TEXT'
        }
        
        for column, column_type in new_columns.items():
            if column not in columns:
                try:
                    cursor.execute(f"ALTER TABLE template_usages ADD COLUMN {column} {column_type}")
                    print(f"✅ 添加字段: template_usages.{column}")
                except sqlite3.OperationalError as e:
                    print(f"❌ 添加字段失败: template_usages.{column} - {e}")
        
        conn.commit()
        print("✅ 模板使用记录表同步完成")
        
    except Exception as e:
        print(f"❌ 模板使用记录表同步失败: {e}")
        conn.rollback()
    finally:
        conn.close()

def insert_default_configs():
    """插入默认系统配置"""
    conn = sqlite3.connect('zhiyue_ai.db')
    cursor = conn.cursor()
    
    try:
        default_configs = [
            {
                'id': str(__import__('uuid').uuid4()),
                'config_key': 'ai_grading_enabled',
                'config_value': '{"value": true}',
                'description': '全局AI评分开关',
                'category': 'grading',
                'is_public': 0,
                'created_at': utcnow().isoformat()
            },
            {
                'id': str(__import__('uuid').uuid4()),
                'config_key': 'default_review_sample_rate',
                'config_value': '{"value": 0.1}',
                'description': '默认抽样复核比例',
                'category': 'quality_control',
                'is_public': 0,
                'created_at': utcnow().isoformat()
            },
            {
                'id': str(__import__('uuid').uuid4()),
                'config_key': 'ocr_confidence_threshold',
                'config_value': '{"value": 0.85}',
                'description': 'OCR置信度阈值',
                'category': 'processing',
                'is_public': 0,
                'created_at': utcnow().isoformat()
            },
            {
                'id': str(__import__('uuid').uuid4()),
                'config_key': 'supported_image_formats',
                'config_value': '{"formats": ["jpg", "jpeg", "png", "pdf", "tiff"]}',
                'description': '支持的图像格式',
                'category': 'upload',
                'is_public': 1,
                'created_at': utcnow().isoformat()
            }
        ]
        
        for config in default_configs:
            try:
                cursor.execute("""
                    INSERT OR IGNORE INTO system_configs 
                    (id, config_key, config_value, description, category, is_public, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    config['id'],
                    config['config_key'],
                    config['config_value'],
                    config['description'],
                    config['category'],
                    config['is_public'],
                    config['created_at']
                ))
                print(f"✅ 插入配置: {config['config_key']}")
            except Exception as e:
                print(f"❌ 插入配置失败: {config['config_key']} - {e}")
        
        conn.commit()
        print("✅ 默认配置插入完成")
        
    except Exception as e:
        print(f"❌ 默认配置插入失败: {e}")
        conn.rollback()
    finally:
        conn.close()

def main():
    """主函数"""
    print("🔄 开始数据库同步...")
    print("=" * 50)
    
    try:
        # 检查数据库文件是否存在
        if not os.path.exists('zhiyue_ai.db'):
            print("❌ 数据库文件不存在：zhiyue_ai.db")
            sys.exit(1)
        
        # 同步各个表
        sync_users_table()
        print()
        
        create_system_configs_table()
        print()
        
        sync_students_table()
        print()
        
        sync_exams_table()
        print()
        
        sync_answer_sheets_table()
        print()
        
        sync_grading_tasks_table()
        print()
        
        update_template_usages_table()
        print()
        
        insert_default_configs()
        
        print("=" * 50)
        print("🎉 数据库同步完成！")
        
    except Exception as e:
        print(f"💥 数据库同步失败: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()