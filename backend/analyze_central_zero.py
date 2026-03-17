import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv('DATABASE_URL').replace('postgresql+asyncpg://', 'postgresql://')

try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    
    print("--- Detailed Analysis: DEPARTAMENTO CENTRAL ---")
    query = """
        SELECT 
            dist_desc_ as distrito,
            COUNT(*) as total_barrios,
            COUNT(CASE WHEN poblacion_total > 0 THEN 1 END) as with_pop,
            COUNT(CASE WHEN poblacion_total = 0 THEN 1 END) as zero_pop
        FROM cartografia.barrios
        WHERE dpto_desc ILIKE '%CENTRAL%'
        GROUP BY 1
        ORDER BY zero_pop DESC
    """
    cur.execute(query)
    rows = cur.fetchall()
    print(f"{'Distrito':<25} | {'Total':<6} | {'With Pop':<8} | {'Zero Pop':<8}")
    print("-" * 55)
    for r in rows:
        print(f"{r[0]:<25} | {r[1]:<6} | {r[2]:<8} | {r[3]:<8}")

    print("\n--- Examples of zero-pop barrios in Central ---")
    cur.execute("""
        SELECT dist_desc_, barlo_desc 
        FROM cartografia.barrios 
        WHERE dpto_desc ILIKE '%CENTRAL%' AND poblacion_total = 0 
        LIMIT 20
    """)
    for r in cur.fetchall():
        print(f" - {r[0]} | {r[1]}")

    conn.close()
except Exception as e:
    print(f"Error: {e}")
