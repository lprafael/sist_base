import asyncio
import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from dotenv import load_dotenv
from models import Base

async def create_tables():
    load_dotenv()
    db_url = os.getenv("DATABASE_URL").replace("postgresql://", "postgresql+asyncpg://")
    engine = create_async_engine(db_url)
    
    async with engine.begin() as conn:
        print("Asegurando que el esquema 'electoral' existe...")
        await conn.execute(text("CREATE SCHEMA IF NOT EXISTS electoral"))
        
        print("Creando nuevas tablas para Actividades...")
        await conn.run_sync(Base.metadata.create_all)
        
    await engine.dispose()
    print("Tablas creadas con éxito.")

if __name__ == "__main__":
    asyncio.run(create_tables())
