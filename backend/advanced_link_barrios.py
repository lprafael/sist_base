import os
import psycopg2
import unicodedata
import re
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv('DATABASE_URL').replace('postgresql+asyncpg://', 'postgresql://')

def normalize(text):
    if not text: return ""
    # Remove accents
    text = ''.join(c for c in unicodedata.normalize('NFD', str(text)) if unicodedata.category(c) != 'Mn')
    # To uppercase and keep only alpha
    text = re.sub(r'[^A-Z0-9]', '', text.upper())
    # Common abbreviations
    text = text.replace('MCAL', 'MARISCAL')
    text = text.replace('DOCTOR', 'DR')
    text = text.replace('GRAL', 'GENERAL')
    return text

def smart_normalize(text):
    if not text: return ""
    text = ''.join(c for c in unicodedata.normalize('NFD', str(text)) if unicodedata.category(c) != 'Mn')
    text = text.upper()
    # Replace common abbreviations with their full forms for better fuzzy matching
    replacements = {
        r'\bMCAL\b': 'MARISCAL',
        r'\bDR\b': 'DOCTOR',
        r'\bGRAL\b': 'GENERAL',
        r'\bF\.\b': 'FELIX',
        r'\bJ\.\b': 'JOSE'
    }
    for k, v in replacements.items():
        text = re.sub(k, v, text)
    return re.sub(r'[^A-Z0-9]', '', text)

try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    
    print("=== ADVANCED GLOBAL LINKING ===")
    
    # Get all electoral districts
    cur.execute("SELECT id, departamento_id, descripcion FROM electoral.ref_distritos")
    dist_catalog = cur.fetchall()
    
    linked_total = 0
    
    # First, let's fix Boqueron/Alto Paraguay IDs if they are still swapped in some places
    # (Based on previous observation that carto might have them swapped)
    # Ref says: 16 Alto Paraguay, 17 Boqueron.
    # Carto names: 'ALTO PARAGUAY', 'BOQUERÓN'.
    cur.execute("UPDATE cartografia.barrios SET dpto_id_ref = 16 WHERE dpto_desc ILIKE '%ALTO PARAGUAY%' AND dpto_id_ref != 16")
    cur.execute("UPDATE cartografia.barrios SET dpto_id_ref = 17 WHERE dpto_desc ILIKE '%BOQUER%N%' AND dpto_id_ref != 17")
    conn.commit()

    for d_id, dpto_id, d_desc in dist_catalog:
        norm_ref = smart_normalize(d_desc)
        
        # We'll use a python-side loop to find matches to be more flexible than simple SQL
        # Get unlinked barrios for this department
        cur.execute("""
            SELECT DISTINCT dist_desc_ 
            FROM cartografia.barrios 
            WHERE dpto_id_ref = %s AND ref_distrito_id IS NULL
        """, (dpto_id,))
        
        carto_districts = cur.fetchall()
        
        for (dist_carto,) in carto_districts:
            norm_carto = smart_normalize(dist_carto)
            
            # Match conditions
            match = False
            if norm_ref == norm_carto:
                match = True
            elif len(norm_ref) > 4 and len(norm_carto) > 4:
                if norm_ref in norm_carto or norm_carto in norm_ref:
                    match = True
            
            if match:
                cur.execute("""
                    UPDATE cartografia.barrios 
                    SET ref_distrito_id = %s 
                    WHERE dpto_id_ref = %s AND dist_desc_ = %s AND ref_distrito_id IS NULL
                """, (str(d_id), dpto_id, dist_carto))
                linked_total += cur.rowcount

    conn.commit()
    print(f"Total barrios linked in this pass: {linked_total}")
    
    # Final check
    cur.execute("""
        SELECT 
            dpto_desc, 
            COUNT(*) as total, 
            COUNT(ref_distrito_id) as linked,
            ROUND(COUNT(ref_distrito_id)*100.0/COUNT(*), 2) as pct
        FROM cartografia.barrios
        GROUP BY 1
        ORDER BY pct ASC
    """)
    print("\n--- Current Coverage ---")
    for r in cur.fetchall():
        print(f"{r[0]:<25} | {r[1]:<6} | {r[2]:<6} | {r[3]}%")

    conn.close()
except Exception as e:
    print(f"Error: {e}")
