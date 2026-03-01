import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv('DATABASE_URL').replace('+asyncpg', '')
engine = create_engine(db_url)

with engine.connect() as conn:
    print("Columnas de anr_padron_2026:")
    res = conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'electoral' AND table_name = 'anr_padron_2026'"))
    for row in res:
        print(f" - {row[0]}: {row[1]}")
