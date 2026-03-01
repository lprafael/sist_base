import asyncio
import os
from sqlalchemy import text, create_engine, MetaData, Table, select, insert
from sqlalchemy.engine import reflection
from dotenv import load_dotenv

# Configuración
SOURCE_URL = "postgresql://postgres:admin@localhost:5432/SIGEL"
TARGET_URL = "postgresql://postgres:admin@localhost:5433/SIGEL"

SCHEMAS = ["sistema", "electoral"]

def migrate():
    load_dotenv()
    source_engine = create_engine(SOURCE_URL)
    target_engine = create_engine(TARGET_URL)
    
    # 1. Crear esquemas en el destino
    with target_engine.begin() as target_conn:
        for schema in SCHEMAS:
            print(f"Creando esquema '{schema}' en el destino...")
            target_conn.execute(text(f"CREATE SCHEMA IF NOT EXISTS {schema}"))
    
    # 2. Obtener lista de tablas usando inspect
    from sqlalchemy import inspect
    inspector = inspect(source_engine)
    
    # Usar una sola conexión en el destino para mantener el rol de 'replica' si fuera necesario
    # o simplemente desactivar restricciones por tabla/sesión.
    
    for schema in SCHEMAS:
        tables = inspector.get_table_names(schema=schema)
        print(f"Migrando {len(tables)} tablas del esquema '{schema}'...")
        
        for table_name in tables:
            print(f"  -> Migrando tabla: {schema}.{table_name}")
            
            # Reflejar tabla del origen
            metadata_src = MetaData()
            table_src = Table(table_name, metadata_src, schema=schema, autoload_with=source_engine)
            
            # Crear tabla en el destino si no existe
            table_src.metadata.create_all(target_engine)
            
            # Copiar datos
            with source_engine.connect() as source_conn:
                data = source_conn.execute(select(table_src)).fetchall()
                print(f"     Encontrados {len(data)} registros.")
                
                if data:
                    records = [dict(row._mapping) for row in data]
                    
                    # Usar una conexión directa para deshabilitar restricciones
                    with target_engine.connect() as target_conn:
                        with target_conn.begin():
                            # DESHABILITAR RESTRICCIONES (Temporalmente para esta sesión)
                            target_conn.execute(text("SET session_replication_role = 'replica'"))
                            
                            # Limpiar tabla destino
                            target_conn.execute(table_src.delete())
                            
                            # Insertar datos
                            batch_size = 5000
                            for i in range(0, len(records), batch_size):
                                batch = records[i:i + batch_size]
                                target_conn.execute(insert(table_src), batch)
                                print(f"     Insertados {i + len(batch)} de {len(records)}...")
                            
                            # VOLVER A HABILITAR (Opcional, al cerrar la sesión se resetea)
                            target_conn.execute(text("SET session_replication_role = 'origin'"))

    # 3. Habilitar PostGIS explícitamente y crear columna geométrica si es necesario
    with target_engine.begin() as target_conn:
        print("Finalizando configuración espacial...")
        target_conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
        
        # Convertir campo JSONB a GEOMETRY en ref_locales si existe
        try:
            target_conn.execute(text("""
                ALTER TABLE electoral.ref_locales ADD COLUMN IF NOT EXISTS geom_ubicacion GEOMETRY(Point, 4326);
                UPDATE electoral.ref_locales 
                SET geom_ubicacion = ST_SetSRID(ST_Point((ubicacion->>'lng')::float, (ubicacion->>'lat')::float), 4326) 
                WHERE ubicacion IS NOT NULL;
            """))
            print("Columna geométrica 'geom_ubicacion' creada y poblada.")
        except Exception as e:
            print(f"Aviso: No se pudo crear la columna geométrica (posiblemente la tabla no existe aún): {e}")

    print("¡Migración completada con éxito!")

if __name__ == "__main__":
    migrate()
