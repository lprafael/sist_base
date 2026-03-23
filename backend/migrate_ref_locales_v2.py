
import os
from sqlalchemy import create_engine, text, MetaData, Table, select, insert
from dotenv import load_dotenv

# Configuración
SOURCE_URL = "postgresql://postgres:admin@localhost:5432/SIGEL"
TARGET_URL = "postgresql://postgres:admin@187.77.247.23:5434/SIGEL"

def migrate_ref_locales():
    print(f"--- Iniciando migración de electoral.ref_locales ---")
    source_engine = create_engine(SOURCE_URL)
    target_engine = create_engine(TARGET_URL)
    
    # 1. Asegurar esquema electoral en destino
    with target_engine.begin() as target_conn:
        target_conn.execute(text("CREATE SCHEMA IF NOT EXISTS electoral"))
        print("Schema 'electoral' verificado en el destino.")
    
    # 2. Reflejar tabla del origen
    metadata_src = MetaData()
    table_name = "ref_locales"
    schema = "electoral"
    table_src = Table(table_name, metadata_src, schema=schema, autoload_with=source_engine)
    
    # 3. Crear tabla en el destino si no existe (con el esquema reflejado)
    table_src.metadata.create_all(target_engine)
    print(f"Tabla {schema}.{table_name} verificada/creada en el destino.")
    
    # 4. Copiar datos
    with source_engine.connect() as source_conn:
        # Cargamos los datos ignorando geom_ubicacion pues suele dar problemas en la inserción bruta
        # Y es mejor recrearlo en el destino después
        cols = [c for c in table_src.columns if c.name != 'geom_ubicacion']
        stmt = select(*cols)
        data = source_conn.execute(stmt).fetchall()
        print(f"Encontrados {len(data)} registros en el origen.")
        
        if data:
            records = [dict(row._mapping) for row in data]
            
            with target_engine.connect() as target_conn:
                with target_conn.begin():
                    # Deshabilitar restricciones
                    target_conn.execute(text("SET session_replication_role = 'replica'"))
                    
                    # Limpiar tabla destino para evitar duplicados
                    print(f"Limpiando tabla {schema}.{table_name} en destino...")
                    target_conn.execute(table_src.delete())
                    
                    # Insertar datos por lotes
                    batch_size = 100
                    for i in range(0, len(records), batch_size):
                        batch = records[i:i + batch_size]
                        # Aseguramos que solo usamos las columnas que extrajimos
                        target_conn.execute(table_src.insert(), batch)
                        print(f"  -> Insertados {i + len(batch)} de {len(records)}...")
                    
                    target_conn.execute(text("SET session_replication_role = 'origin'"))

    # 5. Re-calcular geom_ubicacion en el destino si existe PostGIS
    try:
        with target_engine.begin() as target_conn:
            target_conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
            # Verificar si existe la columna geom_ubicacion
            target_conn.execute(text("""
                DO $$ 
                BEGIN 
                    IF EXISTS (SELECT 1 FROM information_schema.columns 
                               WHERE table_schema = 'electoral' AND table_name = 'ref_locales' AND column_name = 'ubicacion') THEN
                        ALTER TABLE electoral.ref_locales ADD COLUMN IF NOT EXISTS geom_ubicacion GEOMETRY(Point, 4326);
                        UPDATE electoral.ref_locales 
                        SET geom_ubicacion = ST_SetSRID(ST_Point((ubicacion->>'lng')::float, (ubicacion->>'lat')::float), 4326) 
                        WHERE ubicacion IS NOT NULL AND ubicacion::text != 'null';
                    END IF;
                END $$;
            """))
            print("Columna geométrica 'geom_ubicacion' procesada con éxito.")
    except Exception as e:
        print(f"Aviso no crítico (Geometría): {e}")

    print("--- ¡Migración de locales completada! ---")

if __name__ == "__main__":
    migrate_ref_locales()
