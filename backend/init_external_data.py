
import asyncio
import os
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from models import Base

# Cargar variables de entorno
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

async def init_external_data():
    if not DATABASE_URL:
        print("Error: DATABASE_URL no encontrada en .env")
        return

    # Crear engine
    engine = create_async_engine(DATABASE_URL, echo=True)
    
    async with engine.begin() as conn:
        # 1. Crear el schema si no existe
        await conn.execute(text("CREATE SCHEMA IF NOT EXISTS external_data"))
        print("Schema 'external_data' verificado/creado.")
        
        # 2. Crear las tablas definidas en models.py con el schema external_data
        # run_sync es necesario para Base.metadata.create_all que es síncrono
        def create_tables(connection):
            Base.metadata.create_all(connection)
        
        await conn.run_sync(create_tables)
        print("Tablas del schema 'external_data' creadas exitosamente.")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(init_external_data())
