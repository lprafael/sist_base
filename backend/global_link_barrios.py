import os
import psycopg2
import unicodedata
import re
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv('DATABASE_URL').replace('postgresql+asyncpg://', 'postgresql://')

def clean_for_sql(text):
    if not text: return ""
    text = str(text).strip()
    text = ''.join(c for c in unicodedata.normalize('NFD', text) if unicodedata.category(c) != 'Mn')
    text = re.sub(r'[^a-zA-Z0-9]', '', text).upper()
    return text

try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    
    print("=== GLOBAL LINKING: CARTOGRAPHY TO ELECTORAL CATALOG ===")
    
    # Get all electoral districts
    cur.execute("SELECT id, departamento_id, descripcion FROM electoral.ref_distritos")
    dist_catalog = cur.fetchall()
    
    linked_total = 0
    
    for d_id, dpto_id, d_desc in dist_catalog:
        norm_name = clean_for_sql(d_desc)
        
        # 1. Exact match (normalized)
        cur.execute("""
            UPDATE cartografia.barrios 
            SET ref_distrito_id = %s 
            WHERE ref_distrito_id IS NULL
            AND dpto_id_ref = %s
            AND regexp_replace(unaccent(upper(dist_desc_)), '[^A-Z0-9]', '', 'g') = %s
        """, (str(d_id), dpto_id, norm_name))
        
        # 2. Partial match (if still null)
        if cur.rowcount == 0:
            cur.execute("""
                UPDATE cartografia.barrios 
                SET ref_distrito_id = %s 
                WHERE ref_distrito_id IS NULL
                AND dpto_id_ref = %s
                AND (
                    regexp_replace(unaccent(upper(dist_desc_)), '[^A-Z0-9]', '', 'g') ILIKE '%%' || %s || '%%'
                    OR %s ILIKE '%%' || regexp_replace(unaccent(upper(dist_desc_)), '[^A-Z0-9]', '', 'g') || '%%'
                )
            """, (str(d_id), dpto_id, norm_name, norm_name))

        if cur.rowcount > 0:
            linked_total += cur.rowcount

    conn.commit()
    print(f"\nSUCCESS: Total barrios linked globally: {linked_total}")
    
    # Final health check
    cur.execute("""
        SELECT 
            dpto_desc, 
            COUNT(*) as total, 
            COUNT(ref_distrito_id) as linked,
            ROUND(COUNT(ref_distrito_id)*100.0/COUNT(*), 2) as pct
        FROM cartografia.barrios
        GROUP BY 1
        ORDER BY pct DESC
    """)
    print("\n--- Final Linkage Status ---")
    print(f"{'Department':<25} | {'Total':<6} | {'Linked':<6} | {'%'}")
    print("-" * 55)
    for r in cur.fetchall():
        print(f"{r[0]:<25} | {r[1]:<6} | {r[2]:<6} | {r[3]}%")

    conn.close()
except Exception as e:
    print(f"Error: {e}")
