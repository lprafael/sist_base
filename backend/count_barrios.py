import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv('DATABASE_URL').replace('postgresql+asyncpg://', 'postgresql://')
if 'localhost' in db_url or '127.0.0.1' in db_url:
    db_url = db_url.replace(':5432', ':5434')
engine = create_engine(db_url)
with engine.connect() as conn:
    try:
        # Get columns
        res_cols = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_schema = 'cartografia' AND table_name = 'barrios'"))
        cols = [r[0] for r in res_cols]
        print(f"Columns in barrios: {cols}")
        
        res = conn.execute(text("SELECT count(*) FROM cartografia.barrios"))
        print(f"Barrios: {res.scalar()}")
        
        if 'poblacion_total' in cols:
            res2 = conn.execute(text("SELECT count(*) FROM cartografia.barrios WHERE poblacion_total IS NOT NULL AND poblacion_total > 0"))
            print(f"Barrios with population: {res2.scalar()}")
        
        if 'ref_distrito_id' in cols:
            res3 = conn.execute(text("SELECT count(*) FROM cartografia.barrios WHERE ref_distrito_id IS NOT NULL"))
            print(f"Barrios with ref_distrito_id: {res3.scalar()}")
    except Exception as e:
        print(f"Error: {e}")
