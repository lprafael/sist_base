import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv('DATABASE_URL').replace('postgresql+asyncpg://', 'postgresql://')

try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    
    output = []
    output.append("=== GLOBAL INTEGRITY REPORT (CARTOGRAPHY VS ELECTORAL) ===")
    
    # 1. Department Linkage Analysis
    output.append("\n--- 1. Department Mapping Status ---")
    query = """
    SELECT 
        b.dpto_desc,
        COUNT(*) as total_barrios,
        COUNT(b.ref_distrito_id) as linked_barrios,
        ROUND(COUNT(b.ref_distrito_id) * 100.0 / COUNT(*), 2) as pct_linked,
        SUM(b.poblacion_total) as total_pop
    FROM cartografia.barrios b
    GROUP BY b.dpto_desc
    ORDER BY pct_linked ASC
    """
    cur.execute(query)
    rows = cur.fetchall()
    output.append(f"{'Department':<25} | {'Total':<6} | {'Linked':<6} | {'%':<7} | {'Population':<10}")
    output.append("-" * 65)
    for r in rows:
        output.append(f"{r[0]:<25} | {r[1]:<6} | {r[2]:<6} | {r[3]:<7} | {r[4]:<10,}")

    # 2. Districts with most unlinked
    output.append("\n--- 2. Districts with MOST unlinked barrios by Dept ---")
    output.append(f"{'Department':<20} | {'District (Carto)':<25} | {'Unlinked'}")
    output.append("-" * 65)
    for r in rows:
        cur.execute("SELECT dpto_desc, dist_desc_, COUNT(*) FROM cartografia.barrios WHERE ref_distrito_id IS NULL AND dpto_desc = %s GROUP BY 1, 2 ORDER BY 3 DESC LIMIT 1", (r[0],))
        sample = cur.fetchone()
        if sample:
            output.append(f"{sample[0]:<20} | {sample[1]:<25} | {sample[2]}")

    # 3. Cartography Schema Counts
    output.append("\n--- 3. Cartography Schema Counts ---")
    cur.execute("SELECT COUNT(*) FROM cartografia.departamentos")
    dptos_geo = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM cartografia.distritos")
    dist_geo = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM cartografia.barrios")
    bar_geo = cur.fetchone()[0]
    
    output.append(f"Table 'departamentos': {dptos_geo}")
    output.append(f"Table 'distritos':     {dist_geo}")
    output.append(f"Table 'barrios':       {bar_geo}")

    # 4. Electoral Reference Counts
    output.append("\n--- 4. Electoral Reference Counts ---")
    cur.execute("SELECT COUNT(*) FROM electoral.ref_departamentos")
    dptos_ref = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM electoral.ref_distritos")
    dist_ref = cur.fetchone()[0]
    
    output.append(f"Reference 'departamentos': {dptos_ref}")
    output.append(f"Reference 'distritos':     {dist_ref}")

    with open('global_integrity_report.txt', 'w', encoding='utf-8') as f:
        f.write("\n".join(output))
    
    print("Report written to global_integrity_report.txt")

    conn.close()
except Exception as e:
    print(f"Error: {e}")
