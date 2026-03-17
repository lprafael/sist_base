import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv('DATABASE_URL').replace('postgresql+asyncpg://', 'postgresql://')
if 'localhost' in db_url or '127.0.0.1' in db_url:
    db_url = db_url.replace(':5432', ':5434')
engine = create_engine(db_url)
with engine.connect() as conn:
    print("Checking population...")
    # Try case-insensitive or quoted
    try:
        res = conn.execute(text("SELECT count(*) FROM cartografia.barrios WHERE \"poblacion_total\" > 0"))
        print(f"poblacion_total > 0 (quoted): {res.scalar()}")
    except Exception as e:
        print(f"Error with quoted 'poblacion_total': {e}")
        
    try:
        # Check col types
        res = conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'cartografia' AND table_name = 'barrios' AND column_name ILIKE '%poblacion%'"))
        for r in res:
            print(f"Column found: '{r[0]}' ({r[1]})")
    except Exception as e:
        print(f"Error checking columns: {e}")
