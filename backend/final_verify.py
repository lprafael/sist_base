import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv('DATABASE_URL').replace('postgresql+asyncpg://', 'postgresql://')
if 'localhost' in db_url or '127.0.0.1' in db_url:
    db_url = db_url.replace(':5432', ':5434')
engine = create_engine(db_url)
with engine.connect() as conn:
    print("Verifying data in 'cartografia.barrios'...")
    total = conn.execute(text("SELECT count(*) FROM \"cartografia\".\"barrios\"")).scalar()
    with_pop = conn.execute(text("SELECT count(*) FROM \"cartografia\".\"barrios\" WHERE \"poblacion_total\" > 0")).scalar()
    with_ref = conn.execute(text("SELECT count(*) FROM \"cartografia\".\"barrios\" WHERE \"ref_distrito_id\" IS NOT NULL")).scalar()
    
    print(f"Total: {total}")
    print(f"With population > 0: {with_pop}")
    print(f"Linked to RefDistrito: {with_ref}")
    
    if with_pop > 0:
        res = conn.execute(text("SELECT \"barlo_desc\", \"dist_desc_\", \"poblacion_total\" FROM \"cartografia\".\"barrios\" WHERE \"poblacion_total\" > 0 LIMIT 5"))
        print("\nSample population data:")
        for r in res:
            print(f" - {r[0]} ({r[1]}): {r[2]}")
