import psycopg2
import os

db_url = os.getenv("DATABASE_URL")
if db_url and db_url.startswith("postgresql+asyncpg://"):
    db_url = db_url.replace("postgresql+asyncpg://", "postgresql://")

try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    
    cur.execute('SELECT "BARLO_DESC", "DIST_DESC_" FROM cartografia.barrios WHERE "DIST_DESC_" ILIKE %s AND "BARLO_DESC" ILIKE %s;', ('%SAN LORENZO%', '%ESPIRITU%'))
    row = cur.fetchone()
    if row:
        print(f"DB Barrio: '{row[0]}' ({[ord(c) for c in row[0]]})")
        print(f"DB Dist:   '{row[1]}' ({[ord(c) for c in row[1]]})")
    else:
        print("Not found in DB")
        
    conn.close()
except Exception as e:
    print(f"Error: {e}")
