import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv('DATABASE_URL').replace('postgresql+asyncpg://', 'postgresql://')

try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    
    print("--- Breakdown of Barrios and Population by Department ---")
    query = """
        SELECT 
            COALESCE(dpto_nombre_ref, dpto_desc, 'Unknown') as dpto,
            COUNT(*) as total_barrios,
            COUNT(CASE WHEN poblacion_total > 0 THEN 1 END) as with_population,
            SUM(poblacion_total) as sum_population
        FROM cartografia.barrios
        GROUP BY 1
        ORDER BY total_barrios DESC
    """
    cur.execute(query)
    rows = cur.fetchall()
    print(f"{'Department':<30} | {'Total':<6} | {'With Pop':<8} | {'Sum Pop':<10}")
    print("-" * 65)
    for r in rows:
        print(f"{r[0]:<30} | {r[1]:<6} | {r[2]:<8} | {r[3]:<10,}")
        
    print("\n--- Neighborhoods without District Link (ref_distrito_id IS NULL) ---")
    cur.execute("SELECT COUNT(*) FROM cartografia.barrios WHERE ref_distrito_id IS NULL")
    null_dist = cur.fetchone()[0]
    print(f"Total barrios without link: {null_dist}")
    
    if null_dist > 0:
        print("\nSample (Department - District - Barrio):")
        cur.execute("SELECT dpto_desc, dist_desc_, barlo_desc FROM cartografia.barrios WHERE ref_distrito_id IS NULL LIMIT 10")
        for r in cur.fetchall():
            print(f" - {r[0]} | {r[1]} | {r[2]}")

    conn.close()
except Exception as e:
    print(f"Error: {e}")
