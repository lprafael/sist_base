import pandas as pd
import psycopg2
import unicodedata
import re
import os

# Configuración del archivo (dentro del contenedor)
file_path = '/app/cartografia/Dpto Central_Población_Barrios_CNPV 2022 - 1916.xlsx'
db_url = os.getenv("DATABASE_URL")
if db_url and db_url.startswith("postgresql+asyncpg://"):
    db_url = db_url.replace("postgresql+asyncpg://", "postgresql://")

def clean_name(name):
    if not name or pd.isna(name): return ""
    name = str(name).strip()
    # Quitar tildes
    name = ''.join(c for c in unicodedata.normalize('NFD', name) if unicodedata.category(c) != 'Mn')
    # Quitar puntos y caracteres especiales
    name = re.sub(r'[^a-zA-Z0-9\s]', '', name)
    return name.upper().strip()

# Conexión a la DB
try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
except Exception as e:
    print(f"Error de conexión a DB: {e}")
    exit(1)

distritos_central = [
    "AREGUA", "CAPIATA", "FERNANDO DE LA MORA", "GUARAMBARE", "ITA", "ITAUGUA", 
    "J AUGUSTO SALDIVAR", "LAMBARE", "LIMPIO", "LUQUE", "MARIANO ROQUE ALONSO", 
    "NUEVA ITALIA", "NEMBY", "SAN ANTONIO", "SAN LORENZO", "VILLA ELISA", 
    "VILLETA", "YPACARAI", "YPANE"
]

try:
    print(f"Analizando Excel: {file_path}")
    df = pd.read_excel(file_path, sheet_name=0, skiprows=6, engine='openpyxl')
    df.columns = ['Empty', 'Lugar', 'Total', 'Hombres', 'Mujeres']
    df = df[df['Lugar'].notna()]

    current_dist = None
    processed_count = 0
    updated_count = 0

    for index, row in df.iterrows():
        lugar_raw = str(row['Lugar']).strip()
        lugar_clean = clean_name(lugar_raw)
        
        # Detectar si es un distrito
        if (lugar_raw.isupper() and len(lugar_raw) > 3) or lugar_clean in distritos_central:
            if lugar_clean != "TOTAL":
                current_dist = lugar_clean
                # Normalizaciones comunes
                if "MARIANO R ALONSO" in current_dist or "MARIANO ROQUE ALONSO" in current_dist:
                    current_dist = "MARIANO ROQUE ALONSO"
                if "J AUGUSTO SALDIVAR" in current_dist:
                    current_dist = "J. AUGUSTO SALDIVAR"
                print(f"Distrito: {current_dist}")
            continue
        
        if not current_dist: continue
        
        # Población
        try:
            total = int(row['Total']) if pd.notna(row['Total']) else 0
            hombres = int(row['Hombres']) if pd.notna(row['Hombres']) else 0
            mujeres = int(row['Mujeres']) if pd.notna(row['Mujeres']) else 0
        except:
            continue
            
        if total == 0: continue
        processed_count += 1
        
        # Update
        # Usamos unaccent para mayor flexibilidad
        cur.execute("""
            UPDATE cartografia.barrios 
            SET poblacion_total = %s, poblacion_hombres = %s, poblacion_mujeres = %s
            WHERE unaccent(trim(upper(dist_desc_))) ILIKE %s 
            AND (
                unaccent(trim(upper(barlo_desc))) = %s
                OR unaccent(trim(upper(barlo_desc))) ILIKE %s
            )
        """, (total, hombres, mujeres, f"%{current_dist}%", lugar_clean, f"%{lugar_clean}%"))
        
        if cur.rowcount > 0:
            updated_count += 1

    conn.commit()
    print(f"\nExito:")
    print(f"- Leidos del Excel: {processed_count}")
    print(f"- Actualizados en PG: {updated_count}")

except Exception as e:
    print(f"Error: {e}")
    conn.rollback()
finally:
    cur.close()
    conn.close()
