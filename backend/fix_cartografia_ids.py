import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv('DATABASE_URL').replace('postgresql+asyncpg://', 'postgresql://')
conn = psycopg2.connect(db_url)
cur = conn.cursor()

updates = [
    (1, 'CAPIAT_'),
    (11, 'J. AUGUSTO SALD_VAR'),
    (19, 'MARIANO ROQUE ALONSO'),
    (9, 'ITAUGU_'),
    (7, 'IT_'), # Ita
    (35, 'YPAN_'),
    (5, 'GUARAMBAR_'),
    (13, 'LAMBAR_'),
    (33, 'YPACARA_'),
    (23, '_EMBY'), # Ñemby
]

print("Updating barrios...")
for dist_id, name_pattern in updates:
    cur.execute("""
        UPDATE cartografia.barrios 
        SET ref_distrito_id = %s 
        WHERE dpto_id_ref = 11 AND dist_desc_ LIKE %s
    """, (dist_id, name_pattern))
    print(f"Updated {cur.rowcount} barrios to {dist_id} for pattern {name_pattern}")

print("Updating distritos...")
for dist_id, name_pattern in updates:
    cur.execute("""
        UPDATE cartografia.distritos 
        SET ref_distrito_id = %s 
        WHERE dpto_id_ref = 11 AND dist_desc_ LIKE %s
    """, (dist_id, name_pattern))
    print(f"Updated {cur.rowcount} distritos to {dist_id} for pattern {name_pattern}")

conn.commit()
conn.close()
