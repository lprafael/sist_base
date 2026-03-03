import pandas as pd
import psycopg2
import os
from sqlalchemy import create_engine, text

# Configuración de la base de datos
db_url = os.getenv("DATABASE_URL").replace("postgresql+asyncpg://", "postgresql://")
engine = create_engine(db_url)

csv_path = '/app/resultados_anteriores/Electos-dhont-1996-a-2025-munic-gene-complem-votospreferentes-251125.csv'

def ingest_electos():
    print("Iniciando ingesta de electos históricos...")
    try:
        # Leer el CSV
        df = pd.read_csv(csv_path, encoding='latin-1', sep=';')
        
        # El campo 'año' parece ser una fecha completa en algunos casos, extraemos el año
        df['anho_num'] = pd.to_datetime(df['año'], format='%d/%m/%Y', errors='coerce').dt.year
        # Si falla el parseo (ya es año), recuperamos el valor original
        df.loc[df['anho_num'].isna(), 'anho_num'] = pd.to_numeric(df['año'], errors='coerce')
        
        # Renombrar y seleccionar columnas
        df.columns = [
            'fecha_original', 'tipo_eleccion', 'departamento_id', 'departamento_nombre',
            'distrito_id', 'distrito_nombre', 'cargo_id', 'cargo_nombre',
            'lista_numero', 'lista_nombre', 'lista_siglas', 'tit_sup', 'tit_sup_desc',
            'orden_dhont', 'apellido', 'nombre', 'sexo', 'edad', 'votos_lista',
            'divisor', 'cociente', 'orden_original_2021', 'votos_preferenciales_2021', 'anho'
        ]
        
        # Limpiar numéricos
        cols_to_fix = ['votos_lista', 'divisor', 'cociente', 'votos_preferenciales_2021', 'anho']
        for col in cols_to_fix:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)

        # Crear la tabla
        with engine.begin() as conn:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS electoral.electos_historicos (
                    id SERIAL PRIMARY KEY,
                    anho INTEGER,
                    fecha_original TEXT,
                    tipo_eleccion TEXT,
                    departamento_id INTEGER,
                    departamento_nombre TEXT,
                    distrito_id INTEGER,
                    distrito_nombre TEXT,
                    cargo_nombre TEXT,
                    lista_numero INTEGER,
                    lista_nombre TEXT,
                    lista_siglas TEXT,
                    tit_sup_desc TEXT,
                    orden_dhont INTEGER,
                    apellido TEXT,
                    nombre TEXT,
                    votos_lista INTEGER,
                    cociente FLOAT,
                    votos_preferenciales INTEGER
                );
            """))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_electos_dist ON electoral.electos_historicos (distrito_id, anho, cargo_nombre);"))
            print("Tabla creada/verificada.")

        # Vaciado para recarga
        with engine.begin() as conn:
            conn.execute(text("TRUNCATE TABLE electoral.electos_historicos"))

        # Seleccionar columnas finales para BD
        df_final = df[[
            'anho', 'fecha_original', 'tipo_eleccion', 'departamento_id', 'departamento_nombre',
            'distrito_id', 'distrito_nombre', 'cargo_nombre', 'lista_numero', 'lista_nombre',
            'lista_siglas', 'tit_sup_desc', 'orden_dhont', 'apellido', 'nombre', 
            'votos_lista', 'cociente', 'votos_preferenciales_2021'
        ]]
        df_final.columns = [
            'anho', 'fecha_original', 'tipo_eleccion', 'departamento_id', 'departamento_nombre',
            'distrito_id', 'distrito_nombre', 'cargo_nombre', 'lista_numero', 'lista_nombre',
            'lista_siglas', 'tit_sup_desc', 'orden_dhont', 'apellido', 'nombre', 
            'votos_lista', 'cociente', 'votos_preferenciales'
        ]

        print(f"Insertando {len(df_final)} registros de electos...")
        df_final.to_sql('electos_historicos', engine, schema='electoral', if_exists='append', index=False, chunksize=10000)
        
        print("¡Ingesta de electos completada!")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    ingest_electos()
