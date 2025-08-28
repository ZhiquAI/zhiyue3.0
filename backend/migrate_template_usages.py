from db_connection import engine
from sqlalchemy import text

print("开始迁移template_usages表...")

with engine.connect() as conn:
    try:
        # 删除旧表
        conn.execute(text('DROP TABLE IF EXISTS template_usages'))
        
        # 创建新表结构
        conn.execute(text('''
            CREATE TABLE template_usages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                template_id INTEGER NOT NULL,
                exam_id VARCHAR(36) NOT NULL,
                used_by VARCHAR(36) NOT NULL,
                used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                usage_count INTEGER DEFAULT 1,
                FOREIGN KEY (template_id) REFERENCES answer_sheet_templates (id),
                FOREIGN KEY (exam_id) REFERENCES exams (id),
                FOREIGN KEY (used_by) REFERENCES users (id)
            )
        '''))
        
        # 创建索引
        conn.execute(text('CREATE INDEX idx_usage_template_exam ON template_usages(template_id, exam_id)'))
        conn.execute(text('CREATE INDEX idx_usage_user_date ON template_usages(used_by, used_at)'))
        
        conn.commit()
        print("✅ template_usages表迁移成功")
        
    except Exception as e:
        print(f"❌ template_usages表迁移失败: {e}")
        conn.rollback()

print("迁移完成")