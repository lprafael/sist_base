import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv('DATABASE_URL').replace('postgresql+asyncpg://', 'postgresql://')
if 'localhost' in db_url or '127.0.0.1' in db_url:
    db_url = db_url.replace(':5432', ':5434')
engine = create_engine(db_url)
with engine.connect() as conn:
    print("Finding 'barrios' table...")
    res = conn.execute(text("SELECT table_schema, table_name FROM information_schema.tables WHERE table_name = 'barrios'"))
    for r in res:
        print(f"Schema: {r[0]}, Table: {r[1]}")
    
    # Try querying with explicit schema and quotes
    try:
        res = conn.execute(text("SELECT count(*) FROM \"cartografia\".\"barrios\""))
        print(f"Count with quotes: {res.scalar()}")
    except Exception as e:
        print(f"Error with quotes: {e}")
