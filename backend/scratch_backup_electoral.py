
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import os
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

async def backup_electoral():
    engine = create_async_engine(DATABASE_URL)
    
    async with engine.begin() as conn:
        print("--- Iniciando Backup de Tablas Electorales ---")
        
        # 1. Crear schema de backup
        await conn.execute(text("CREATE SCHEMA IF NOT EXISTS electoral_backup;"))
        print("Schema electoral_backup verificado/creado.")
        
        # 2. Lista de tablas a respaldar
        tables = [
            "padron", 
            "anr_padron_2026", 
            "plra_padron", 
            "locales_votacion", 
            "posibles_votantes",
            "referentes",
            "candidatos"
        ]
        
        for table in tables:
            try:
                print(f"Respaldando {table}...")
                # DROP si existe para que sea un backup fresco
                await conn.execute(text(f"DROP TABLE IF EXISTS electoral_backup.{table} CASCADE;"))
                # Copiar estructura y datos
                await conn.execute(text(f"CREATE TABLE electoral_backup.{table} AS SELECT * FROM electoral.{table};"))
                print(f"OK: electoral_backup.{table} creada.")
            except Exception as e:
                print(f"ERROR respaldando {table}: {str(e)}")
                
        print("--- Backup Finalizado con Éxito ---")

if __name__ == "__main__":
    asyncio.run(backup_electoral())
