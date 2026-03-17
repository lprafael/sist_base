import os
import psycopg2
import unicodedata
import re
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv('DATABASE_URL').replace('postgresql+asyncpg://', 'postgresql://')

def normalize(text):
    if not text: return ""
    text = str(text).strip().upper()
    text = ''.join(c for c in unicodedata.normalize('NFD', text) if unicodedata.category(c) != 'Mn')
    text = re.sub(r'[^A-Z0-9]', '', text)
    return text

try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    
    print("--- Analysis of Unlinked Barrios ---")
    cur.execute("""
        SELECT dpto_desc, dpto_id_ref, dist_desc_, COUNT(*) 
        FROM cartografia.barrios 
        WHERE ref_distrito_id IS NULL 
        GROUP BY 1, 2, 3 
        ORDER BY 4 DESC 
        LIMIT 30
    """)
    unlinked = cur.fetchall()
    
    for dpto_name, dpto_id, dist_carto, count in unlinked:
        norm_carto = normalize(dist_carto)
        
        # Search for candidates in the reference catalog
        cur.execute("""
            SELECT id, descripcion 
            FROM electoral.ref_distritos 
            WHERE departamento_id = %s
        """, (dpto_id,))
        candidates = cur.fetchall()
        
        match = None
        for c_id, c_name in candidates:
            norm_ref = normalize(c_name)
            if norm_ref == norm_carto or norm_ref in norm_carto or norm_carto in norm_ref:
                match = (c_id, c_name)
                break
        
        if match:
            print(f"[FOUND] {dpto_name} | '{dist_carto}' -> '{match[1]}' (ID {match[0]}) | Count: {count}")
        else:
            print(f"[MISSING] {dpto_name} | '{dist_carto}' | Count: {count}")

    conn.close()
except Exception as e:
    print(f"Error: {e}")
