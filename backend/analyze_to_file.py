import os
import psycopg2
from dotenv import load_dotenv
import json

load_dotenv()
db_url = os.getenv('DATABASE_URL').replace('postgresql+asyncpg://', 'postgresql://')

results = {}

try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    
    # 1. Stats per department
    cur.execute("""
        SELECT 
            COALESCE(dpto_desc, 'SUBTOTAL') as dpto,
            COUNT(*) as total,
            COUNT(CASE WHEN poblacion_total > 0 THEN 1 END) as with_pop
        FROM cartografia.barrios
        GROUP BY ROLLUP(dpto_desc)
    """)
    results['dept_stats'] = cur.fetchall()

    # 2. Central districts detail
    cur.execute("""
        SELECT 
            dist_desc_ as distrito,
            COUNT(*) as total,
            COUNT(CASE WHEN poblacion_total > 0 THEN 1 END) as with_pop
        FROM cartografia.barrios
        WHERE dpto_desc ILIKE '%CENTRAL%'
        GROUP BY 1
        ORDER BY total DESC
    """)
    results['central_dist_detail'] = cur.fetchall()

    # 3. Sample of zero pop in Central
    cur.execute("""
        SELECT dist_desc_, barlo_desc 
        FROM cartografia.barrios 
        WHERE dpto_desc ILIKE '%CENTRAL%' AND poblacion_total = 0 
        LIMIT 50
    """)
    results['zero_pop_samples'] = cur.fetchall()

    # 4. Check for null ref_distrito_id
    cur.execute("SELECT dpto_desc, dist_desc_, barlo_desc FROM cartografia.barrios WHERE ref_distrito_id IS NULL LIMIT 20")
    results['null_ref_samples'] = cur.fetchall()

    with open('integrity_results.json', 'w') as f:
        json.dump(results, f, indent=2, default=str)
    
    print("Integrity analysis written to integrity_results.json")
    conn.close()
except Exception as e:
    print(f"Error: {e}")
