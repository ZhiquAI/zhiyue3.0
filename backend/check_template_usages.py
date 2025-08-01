from database import engine
from sqlalchemy import text

with engine.connect() as conn:
    result = conn.execute(text('PRAGMA table_info(template_usages)'))
    columns = [row for row in result]
    print("template_usages表结构:")
    for col in columns:
        print(f"  {col[1]} - {col[2]}")