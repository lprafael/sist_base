import psycopg2
import os

db_url = os.getenv("DATABASE_URL")
if db_url and db_url.startswith("postgresql+asyncpg://"):
    db_url = db_url.replace("postgresql+asyncpg://", "postgresql://")

try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    
    dist = "SAN LORENZO"
    barrio = "ESPIRITU SANTO"
    
    print(f"Probando query para Dist: '{dist}', Barrio: '{barrio}'")
    cur.execute("""
            SELECT count(*) 
            FROM cartografia.barrios 
            WHERE unaccent(trim(upper("DIST_DESC_"))) ILIKE %s 
            AND unaccent(trim(upper("BARLO_DESC"))) = %s
        """, (f"%{dist}%", barrio))
    
    count = cur.fetchone()[0]
    print(f"Match count: {count}")
    
    if count == 0:
        print("\nVerificando sin 'unaccent'...")
        cur.execute("""
            SELECT "BARLO_DESC", "DIST_DESC_" FROM cartografia.barrios WHERE "DIST_DESC_" ILIKE %s AND "BARLO_DESC" ILIKE %s
        """, (f"%{dist}%", f"%{barrio}%"))
        print(f"Direct select: {cur.fetchall()}")
        
    conn.close()
except Exception as e:
    print(f"Error: {e}")
