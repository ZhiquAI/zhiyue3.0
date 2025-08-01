from database import engine
from sqlalchemy import text

with engine.connect() as conn:
    result = conn.execute(text('PRAGMA table_info(answer_sheet_templates)'))
    columns = [row for row in result]
    print("answer_sheet_templates表结构:")
    for col in columns:
        print(f"  {col[1]} - {col[2]}")