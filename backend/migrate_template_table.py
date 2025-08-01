from database import engine
from sqlalchemy import text

print("开始迁移answer_sheet_templates表...")

with engine.connect() as conn:
    # 添加updated_by列
    try:
        conn.execute(text('ALTER TABLE answer_sheet_templates ADD COLUMN updated_by VARCHAR(36)'))
        print("✅ 添加updated_by列成功")
    except Exception as e:
        print(f"⚠️ 添加updated_by列失败（可能已存在）: {e}")
    
    # 修改created_by列类型（SQLite不支持直接修改列类型，需要重建表）
    try:
        # 创建新表
        conn.execute(text('''
            CREATE TABLE answer_sheet_templates_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(100) NOT NULL,
                description VARCHAR(500),
                subject VARCHAR(50),
                grade_level VARCHAR(20),
                exam_type VARCHAR(50),
                template_data JSON NOT NULL,
                page_width INTEGER DEFAULT 210,
                page_height INTEGER DEFAULT 297,
                dpi INTEGER DEFAULT 300,
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME,
                updated_at DATETIME,
                created_by VARCHAR(36) NOT NULL,
                updated_by VARCHAR(36) NOT NULL
            )
        '''))
        
        # 复制数据（将created_by转换为字符串）
        conn.execute(text('''
            INSERT INTO answer_sheet_templates_new 
            (id, name, description, subject, grade_level, exam_type, template_data, 
             page_width, page_height, dpi, is_active, created_at, updated_at, created_by, updated_by)
            SELECT id, name, description, subject, grade_level, exam_type, template_data,
                   page_width, page_height, dpi, is_active, created_at, updated_at, 
                   CAST(created_by AS TEXT), CAST(created_by AS TEXT)
            FROM answer_sheet_templates
        '''))
        
        # 删除旧表
        conn.execute(text('DROP TABLE answer_sheet_templates'))
        
        # 重命名新表
        conn.execute(text('ALTER TABLE answer_sheet_templates_new RENAME TO answer_sheet_templates'))
        
        # 创建索引
        conn.execute(text('CREATE INDEX idx_template_name_creator ON answer_sheet_templates(name, created_by)'))
        conn.execute(text('CREATE INDEX idx_template_subject_grade ON answer_sheet_templates(subject, grade_level)'))
        conn.execute(text('CREATE INDEX idx_template_active ON answer_sheet_templates(is_active)'))
        
        conn.commit()
        print("✅ 表结构迁移成功")
        
    except Exception as e:
        print(f"❌ 表结构迁移失败: {e}")
        conn.rollback()

print("迁移完成")