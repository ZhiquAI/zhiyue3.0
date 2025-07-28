#!/usr/bin/env python3
"""
数据库迁移脚本：添加 grading_details 字段
为 AnswerSheet 表添加详细评分结果存储字段
"""

from sqlalchemy import text
from database import engine
import logging

logger = logging.getLogger(__name__)

def upgrade():
    """添加 grading_details 字段"""
    try:
        with engine.connect() as conn:
            # 检查字段是否已存在
            result = conn.execute(text("""
                SELECT COUNT(*) as count
                FROM information_schema.columns 
                WHERE table_name = 'answer_sheets' 
                AND column_name = 'grading_details'
            """))
            
            count = result.fetchone()[0]
            
            if count == 0:
                # 添加 grading_details 字段
                conn.execute(text("""
                    ALTER TABLE answer_sheets 
                    ADD COLUMN grading_details JSON COMMENT '详细评分结果和质量评估'
                """))
                
                conn.commit()
                logger.info("Successfully added grading_details field to answer_sheets table")
                print("✓ 成功添加 grading_details 字段")
            else:
                logger.info("grading_details field already exists")
                print("✓ grading_details 字段已存在")
                
    except Exception as e:
        logger.error(f"Migration failed: {str(e)}")
        print(f"✗ 迁移失败: {str(e)}")
        raise

def downgrade():
    """移除 grading_details 字段"""
    try:
        with engine.connect() as conn:
            # 检查字段是否存在
            result = conn.execute(text("""
                SELECT COUNT(*) as count
                FROM information_schema.columns 
                WHERE table_name = 'answer_sheets' 
                AND column_name = 'grading_details'
            """))
            
            count = result.fetchone()[0]
            
            if count > 0:
                # 移除 grading_details 字段
                conn.execute(text("""
                    ALTER TABLE answer_sheets 
                    DROP COLUMN grading_details
                """))
                
                conn.commit()
                logger.info("Successfully removed grading_details field from answer_sheets table")
                print("✓ 成功移除 grading_details 字段")
            else:
                logger.info("grading_details field does not exist")
                print("✓ grading_details 字段不存在")
                
    except Exception as e:
        logger.error(f"Downgrade failed: {str(e)}")
        print(f"✗ 回滚失败: {str(e)}")
        raise

def check_migration_status():
    """检查迁移状态"""
    try:
        with engine.connect() as conn:
            # 检查表结构
            result = conn.execute(text("""
                DESCRIBE answer_sheets
            """))
            
            columns = [row[0] for row in result.fetchall()]
            
            print("当前 answer_sheets 表字段:")
            for col in columns:
                print(f"  - {col}")
            
            has_grading_details = 'grading_details' in columns
            print(f"\ngrading_details 字段状态: {'存在' if has_grading_details else '不存在'}")
            
            return has_grading_details
            
    except Exception as e:
        logger.error(f"Status check failed: {str(e)}")
        print(f"✗ 状态检查失败: {str(e)}")
        return False

if __name__ == "__main__":
    import sys
    
    print("数据库迁移工具 - grading_details 字段")
    print("=" * 50)
    
    if len(sys.argv) < 2:
        print("用法:")
        print("  python add_grading_details_field.py upgrade    # 添加字段")
        print("  python add_grading_details_field.py downgrade  # 移除字段")
        print("  python add_grading_details_field.py status     # 检查状态")
        sys.exit(1)
    
    command = sys.argv[1].lower()
    
    try:
        if command == "upgrade":
            print("执行升级迁移...")
            upgrade()
        elif command == "downgrade":
            print("执行降级迁移...")
            downgrade()
        elif command == "status":
            print("检查迁移状态...")
            check_migration_status()
        else:
            print(f"未知命令: {command}")
            sys.exit(1)
            
        print("\n✓ 操作完成")
        
    except Exception as e:
        print(f"\n✗ 操作失败: {str(e)}")
        sys.exit(1)