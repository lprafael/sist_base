import psycopg2
import os

db_url = os.getenv("DATABASE_URL")
if db_url and db_url.startswith("postgresql+asyncpg://"):
    db_url = db_url.replace("postgresql+asyncpg://", "postgresql://")

try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    cur.execute('SELECT DISTINCT "DIST_DESC_", "BARLO_DESC" FROM cartografia.barrios WHERE "DPTO" = \'11\' LIMIT 50;')
    rows = cur.fetchall()
    for row in rows:
        print(f"Dist: {row[0]} | Barrio: {row[1]}")
    conn.close()
except Exception as e:
    print(f"Error: {e}")
