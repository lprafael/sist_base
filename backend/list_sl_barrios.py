import psycopg2
import os

db_url = os.getenv("DATABASE_URL")
if db_url and db_url.startswith("postgresql+asyncpg://"):
    db_url = db_url.replace("postgresql+asyncpg://", "postgresql://")

try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    
    print("--- BARRIOS DE SAN LORENZO EN DB ---")
    cur.execute('SELECT "BARLO_DESC" FROM cartografia.barrios WHERE "DIST_DESC_" ILIKE \'%SAN LORENZO%\' LIMIT 100;')
    rows = cur.fetchall()
    for row in rows:
        print(f"'{row[0]}'")
        
    conn.close()
except Exception as e:
    print(f"Error: {e}")
