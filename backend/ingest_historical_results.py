import pandas as pd
import psycopg2
import os
from sqlalchemy import create_engine

# Configuración de la base de datos
db_url = os.getenv("DATABASE_URL").replace("postgresql+asyncpg://", "postgresql://")
engine = create_engine(db_url)

csv_path = '/app/resultados_anteriores/Resultados-1996-a-2023-municipales-y-generales-por-distrito.csv'

def ingest_results():
    print("Iniciando ingesta de resultados históricos...")
    try:
        # Leer el CSV completo
        df = pd.read_csv(csv_path, encoding='latin-1', sep=';')
        
        # Renombrar columnas para que coincidan con la base de datos (snake_case)
        df.columns = [
            'indice', 'anho', 'tipo_eleccion', 'departamento_id', 'departamento_nombre',
            'distrito_id', 'distrito_nombre', 'cargo_id', 'cargo_nombre',
            'lista_numero', 'lista_siglas', 'lista_nombre', 'votos'
        ]
        
        # Limpiar datos nulos en votos
        df['votos'] = df['votos'].fillna(0).astype(int)
        
        # Crear la tabla si no existe
        from sqlalchemy import text
        with engine.begin() as conn:
            conn.execute(text("""
                CREATE SCHEMA IF NOT EXISTS electoral;
                CREATE TABLE IF NOT EXISTS electoral.resultados_historicos (
                    id SERIAL PRIMARY KEY,
                    indice INTEGER UNIQUE,
                    anho INTEGER,
                    tipo_eleccion TEXT,
                    departamento_id INTEGER,
                    departamento_nombre TEXT,
                    distrito_id INTEGER,
                    distrito_nombre TEXT,
                    cargo_id INTEGER,
                    cargo_nombre TEXT,
                    lista_numero INTEGER,
                    lista_siglas TEXT,
                    lista_nombre TEXT,
                    votos INTEGER
                );
            """))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_hist_dist_anho ON electoral.resultados_historicos (distrito_id, anho, cargo_nombre);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_hist_dpto ON electoral.resultados_historicos (departamento_id);"))
            print("Tabla creada/verificada.")

        # Verificar si ya hay datos para evitar duplicados si se corre de nuevo
        with engine.connect() as conn:
            count = conn.execute(text("SELECT count(*) FROM electoral.resultados_historicos")).scalar()
            if count > 0:
                print(f"La tabla ya contiene {count} registros. Vaciando para recarga...")
                with engine.begin() as delete_conn:
                    delete_conn.execute(text("TRUNCATE TABLE electoral.resultados_historicos"))

        # Insertar datos utilizando to_sql
        print(f"Insertando {len(df)} registros...")
        df.to_sql('resultados_historicos', engine, schema='electoral', if_exists='append', index=False, chunksize=10000)
        
        print("¡Ingesta completada con éxito!")
        
    except Exception as e:
        print(f"Error durante la ingesta: {e}")

if __name__ == "__main__":
    ingest_results()
