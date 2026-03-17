import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv('DATABASE_URL').replace('postgresql+asyncpg://', 'postgresql://')
if 'localhost' in db_url or '127.0.0.1' in db_url:
    db_url = db_url.replace(':5432', ':5434')
engine = create_engine(db_url)
with engine.connect() as conn:
    print("Tables in schema 'cartografia':")
    res = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'cartografia'"))
    for r in res:
        print(f" - '{r[0]}'")
