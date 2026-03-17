import pandas as pd
import psycopg2
import unicodedata
import re
import os

from dotenv import load_dotenv
load_dotenv()

# Path local si estamos en Windows
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
file_path = os.path.join(BASE_DIR, "cartografia", "Dpto Central_Población_Barrios_CNPV 2022 - 1916.xlsx")

db_url = os.getenv("DATABASE_URL")
if db_url and db_url.startswith("postgresql+asyncpg://"):
    db_url = db_url.replace("postgresql+asyncpg://", "postgresql://")

def clean_name(name):
    if not name or pd.isna(name): return ""
    name = str(name).strip()
    name = ''.join(c for c in unicodedata.normalize('NFD', name) if unicodedata.category(c) != 'Mn')
    name = re.sub(r'[^a-zA-Z0-9\s]', ' ', name)
    return ' '.join(name.upper().split())

distritos_central_norm = [
    "AREGUA", "CAPIATA", "FERNANDO DE LA MORA", "GUARAMBARE", "ITA", "ITAUGUA", 
    "J AUGUSTO SALDIVAR", "LAMBARE", "LIMPIO", "LUQUE", "MARIANO ROQUE ALONSO", 
    "NUEVA ITALIA", "NEMBY", "SAN ANTONIO", "SAN LORENZO", "VILLA ELISA", 
    "VILLETA", "YPACARAI", "YPANE"
]

try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    
    print("Leyendo Excel...")
    df = pd.read_excel(file_path, engine='openpyxl')
    
    current_dist = None
    updated = 0
    
    for index, row in df.iterrows():
        val = str(row.iloc[1]) # Columna B (Lugar)
        if "Distrito" in val:
            d_name = clean_name(val.replace("Distrito", ""))
            if d_name in distritos_central_norm:
                current_dist = d_name
                if current_dist == "NEMBY": current_dist = "ÑEMBY"
                print(f"DISTRITO: {current_dist}")
            continue
            
        if not current_dist: continue
        
        # Poblacion
        try:
            total = int(row.iloc[2]) if pd.notna(row.iloc[2]) else 0
            hombres = int(row.iloc[3]) if pd.notna(row.iloc[3]) else 0
            mujeres = int(row.iloc[4]) if pd.notna(row.iloc[4]) else 0
        except: continue
        
        if total < 5: continue # Evitar ruidos mínimos
        
        barrio = clean_name(val)
        if any(x in barrio for x in ["TOTAL", "AREA URBANA", "AREA RURAL"]): continue

        # Normalizamos para SQL (quitamos acentos y caracteres raros)
        def sql_clean(text):
            return re.sub(r'[^A-Z0-9]', '', clean_name(text))

        dist_match = f"%{sql_clean(current_dist)}%"
        barrio_match = sql_clean(barrio)
        
        cur.execute("""
            UPDATE cartografia.barrios 
            SET poblacion_total = %s, poblacion_hombres = %s, poblacion_mujeres = %s
            WHERE regexp_replace(unaccent(upper(dist_desc_)), '[^A-Z0-9]', '', 'g') ILIKE %s 
            AND (
                regexp_replace(unaccent(upper(barlo_desc)), '[^A-Z0-9]', '', 'g') = %s
                OR regexp_replace(unaccent(upper(barlo_desc)), '[^A-Z0-9]', '', 'g') ILIKE '%%' || %s || '%%'
                OR %s ILIKE '%%' || regexp_replace(unaccent(upper(barlo_desc)), '[^A-Z0-9]', '', 'g') || '%%'
            )
        """, (total, hombres, mujeres, dist_match, barrio_match, barrio_match, barrio_match))
        
        if cur.rowcount > 0:
            updated += cur.rowcount

    conn.commit()
    print(f"Finalizado. Total vinculados: {updated}")
    conn.close()
except Exception as e:
    print(f"Error: {e}")
