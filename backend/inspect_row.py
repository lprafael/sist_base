import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv('DATABASE_URL').replace('postgresql+asyncpg://', 'postgresql://')
if 'localhost' in db_url or '127.0.0.1' in db_url:
    db_url = db_url.replace(':5432', ':5434')
engine = create_engine(db_url)
with engine.connect() as conn:
    res = conn.execute(text("SELECT * FROM \"cartografia\".\"barrios\" LIMIT 1"))
    print(f"Total columns: {len(res.keys())}")
    for k in res.keys():
        print(f"Col: {k}")
