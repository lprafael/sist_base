
from sqlalchemy import create_engine, text
TARGET_URL = "postgresql://postgres:admin@187.77.247.23:5434/SIGEL"
engine = create_engine(TARGET_URL)
with engine.connect() as conn:
    res = conn.execute(text("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'electoral' AND table_name = 'choferes'
    """))
    for row in res:
        print(row)
