import os
import asyncio
import pandas as pd
import asyncpg
from dotenv import load_dotenv

# --- Configuración de Base de Datos ---
dotenv_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
load_dotenv(dotenv_path)
DATABASE_URL = os.getenv("DATABASE_URL", "")
DB_DSN = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://").replace("postgresql+psycopg2://", "postgresql://")

if not os.path.exists('/.dockerenv') and not os.path.exists('/run/.containerenv'):
    if "@db:5432/" in DB_DSN:
        DB_DSN = DB_DSN.replace("@db:5432/", "@localhost:5434/")
    elif "@localhost:5432/" in DB_DSN:
        DB_DSN = DB_DSN.replace("@localhost:5432/", "@localhost:5434/")

FILE_PATH = 'PADRON COMPLETO ANR SAN LORENZO.xlsx'

async def cotejar_padron():
    print("Cargando archivo Excel...")
    df = pd.read_excel(FILE_PATH)
    
    # Asegurar que numero_ced sea string para comparar correctamente
    df['numero_ced'] = df['numero_ced'].astype(str)
    
    print(f"Excel cargado: {len(df)} registros.")
    
    # Conexión a la base de datos
    conn = await asyncpg.connect(DB_DSN)
    
    # Obtener todos los registros de San Lorenzo del padrón descargado
    # Filtramos por cod_dist = 27 (San Lorenzo en Central según catálogos anteriores)
    print("Consultando padrón en base de datos...")
    rows = await conn.fetch("SELECT cedula, departamento, distrito FROM electoral.anr_padron_2026")
    
    # Crear un diccionario para búsqueda rápida: {cedula: (departamento, distrito)}
    # Convertimos cedula a str y removemos ceros a la izquierda si los hubiera
    padron_db = {str(int(r['cedula'])): (r['departamento'], r['distrito']) for r in rows}
    
    print(f"Padrón en DB cargado: {len(padron_db)} registros totales.")
    
    observaciones = []
    coincidencias = 0
    en_otro = 0
    no_encontrados = 0
    
    print("Cotejando registros...")
    for idx, row in df.iterrows():
        cedula = str(int(float(row['numero_ced']))) if pd.notnull(row['numero_ced']) else ""
        if not cedula:
            observaciones.append("Cédula vacía")
            continue
            
        if cedula in padron_db:
            dept_db, dist_db = padron_db[cedula]
            
            # San Lorenzo es Dept 11, Distrito 27
            if int(dept_db) == 11 and int(dist_db) == 27:
                observaciones.append("Coincide")
                coincidencias += 1
            else:
                # Buscar nombres descriptivos de la DB
                dept_name = await conn.fetchval("SELECT descripcion FROM electoral.ref_departamentos WHERE id = $1", int(dept_db))
                dist_name = await conn.fetchval("SELECT descripcion FROM electoral.ref_distritos WHERE departamento_id = $1 AND id = $2", int(dept_db), int(dist_db))
                
                obs = f"Figura en {dept_name or dept_db} - {dist_name or dist_db}"
                observaciones.append(obs)
                en_otro += 1
        else:
            observaciones.append("No encontrado")
            no_encontrados += 1
            
        if (idx + 1) % 5000 == 0:
            print(f"Procesados {idx+1}/{len(df)}...")

    # Agregar la columna P (índice 15 es la columna 16)
    df['observacion_sigel'] = observaciones
    
    output_file = 'PADRON_SAN_LORENZO_COTEJADO.xlsx'
    print(f"Guardando resultados en {output_file}...")
    df.to_excel(output_file, index=False)
    
    await conn.close()
    
    print("\n--- Resumen del Cotejo ---")
    print(f"Total registros: {len(df)}")
    print(f"Coinciden (San Lorenzo): {coincidencias}")
    print(f"Figuran en otro lugar: {en_otro}")
    print(f"No encontrados en ANR (Pre-padrón): {no_encontrados}")
    print("--------------------------")

if __name__ == "__main__":
    asyncio.run(cotejar_padron())
