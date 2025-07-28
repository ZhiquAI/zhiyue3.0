#!/usr/bin/env python3
"""
数据库迁移：添加题目分割相关字段
"""

import sqlite3
import json
from datetime import datetime

def migrate_database(db_path: str = "zhiyue_ai.db"):
    """
    添加题目分割相关字段到答题卡表
    """
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        print("开始数据库迁移：添加题目分割字段...")
        
        # 检查字段是否已存在
        cursor.execute("PRAGMA table_info(answer_sheets)")
        columns = [column[1] for column in cursor.fetchall()]
        
        # 添加 segmented_questions 字段
        if 'segmented_questions' not in columns:
            cursor.execute("""
                ALTER TABLE answer_sheets 
                ADD COLUMN segmented_questions TEXT
            """)
            print("✓ 添加 segmented_questions 字段")
        else:
            print("✓ segmented_questions 字段已存在")
        
        # 添加 segmentation_quality 字段
        if 'segmentation_quality' not in columns:
            cursor.execute("""
                ALTER TABLE answer_sheets 
                ADD COLUMN segmentation_quality TEXT
            """)
            print("✓ 添加 segmentation_quality 字段")
        else:
            print("✓ segmentation_quality 字段已存在")
        
        # 提交更改
        conn.commit()
        print("✓ 数据库迁移完成")
        
        # 验证迁移结果
        cursor.execute("PRAGMA table_info(answer_sheets)")
        updated_columns = [column[1] for column in cursor.fetchall()]
        
        if 'segmented_questions' in updated_columns and 'segmentation_quality' in updated_columns:
            print("✓ 迁移验证成功")
        else:
            print("✗ 迁移验证失败")
            return False
        
        return True
        
    except Exception as e:
        print(f"✗ 数据库迁移失败: {str(e)}")
        conn.rollback()
        return False
        
    finally:
        conn.close()

def rollback_migration(db_path: str = "zhiyue_ai.db"):
    """
    回滚迁移（SQLite不支持DROP COLUMN，需要重建表）
    """
    print("警告：SQLite不支持删除列，如需回滚请手动处理")
    return False

if __name__ == "__main__":
    import sys
    import os
    
    # 获取数据库路径
    if len(sys.argv) > 1:
        db_path = sys.argv[1]
    else:
        # 默认路径
        current_dir = os.path.dirname(os.path.abspath(__file__))
        db_path = os.path.join(os.path.dirname(current_dir), "zhiyue_ai.db")
    
    print(f"数据库路径: {db_path}")
    
    if not os.path.exists(db_path):
        print(f"错误：数据库文件不存在: {db_path}")
        sys.exit(1)
    
    # 执行迁移
    success = migrate_database(db_path)
    
    if success:
        print("\n🎉 迁移成功完成！")
        print("现在可以使用题目分割功能了。")
    else:
        print("\n❌ 迁移失败！")
        sys.exit(1)