import os
import psycopg2
import unicodedata
import re
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv('DATABASE_URL').replace('postgresql+asyncpg://', 'postgresql://')

def normalize(text):
    if not text: return ""
    text = ''.join(c for c in unicodedata.normalize('NFD', str(text)) if unicodedata.category(c) != 'Mn')
    text = re.sub(r'[^A-Z0-9]', '', text.upper())
    return text

# Dictionaries of known mismatches
HARDCODED_MATCHES = {
    16: { # Alto Paraguay
        'PUERTO LA VICTORIA': 3, # PUERTO CASADO
        'PT-CASADO': 3
    },
    14: { # Canindeyu
        'LA PALOMA': 7,
        'LA PALOMA DEL ESPIRITU SANTO': 7
    },
    13: { # Amambay
        'PEDRO JUAN CABALLERO': 1,
        'CHIRIGUELO': 1 # Pedro Juan sub-area
    },
    17: { # Boqueron
        'BOQUERON': 1 # Mcal Estigarribia is the original "Boqueron" district
    },
    3: { # Cordillera
         'SANTOS MARTIRES': 11 # Guessing Santa Elena? No, let's leave it.
    }
}

try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    
    print("=== FINAL AGGRESSIVE LINKING ===")
    
    # Apply hardcoded matches
    for dpto_id, matches in HARDCODED_MATCHES.items():
        for carto_name, ref_id in matches.items():
            cur.execute("""
                UPDATE cartografia.barrios 
                SET ref_distrito_id = %s 
                WHERE dpto_id_ref = %s AND dist_desc_ ILIKE %s AND ref_distrito_id IS NULL
            """, (str(ref_id), dpto_id, f"%{carto_name}%"))
            if cur.rowcount > 0:
                print(f"Hardcoded: {dpto_id} | '{carto_name}' -> ID {ref_id} ({cur.rowcount} barrios)")

    # Final logic: if a district name contains a known reference name, link it
    cur.execute("SELECT id, departamento_id, descripcion FROM electoral.ref_distritos")
    catalog = cur.fetchall()
    
    total_linked = 0
    for d_id, dpto_id, d_desc in catalog:
        norm_ref = normalize(d_desc)
        if len(norm_ref) < 4: continue
        
        cur.execute("""
            UPDATE cartografia.barrios 
            SET ref_distrito_id = %s 
            WHERE dpto_id_ref = %s 
            AND ref_distrito_id IS NULL 
            AND (
                regexp_replace(unaccent(upper(dist_desc_)), '[^A-Z0-9]', '', 'g') ILIKE '%%' || %s || '%%'
                OR %s ILIKE '%%' || regexp_replace(unaccent(upper(dist_desc_)), '[^A-Z0-9]', '', 'g') || '%%'
            )
        """, (str(d_id), dpto_id, norm_ref, norm_ref))
        total_linked += cur.rowcount

    conn.commit()
    print(f"Pass complete. Linked {total_linked} more barrios.")
    
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
    print("\n--- FINAL COVERAGE ---")
    for r in cur.fetchall():
        status = "✅" if r[3] > 98 else "⚠️"
        print(f"{status} {r[0]:<25} | {r[1]:<6} | {r[2]:<6} | {r[3]}%")

    conn.close()
except Exception as e:
    print(f"Error: {e}")
