import os
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv
from models import Base, FinanciamientoEgreso, FinanciamientoIngreso, FinanciamientoCumplimiento

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

async def create_financing_tables():
    engine = create_async_engine(DATABASE_URL, echo=True)
    async with engine.begin() as conn:
        print("Creating financing tables in schema 'electoral'...")
        # Asegurarse de que el schema existe
        await conn.execute(text("CREATE SCHEMA IF NOT EXISTS electoral"))
        # Crear las tablas definidas en los modelos importados
        await conn.run_sync(Base.metadata.create_all)
    
    print("✅ Tablas de financiamiento creadas (o ya existentes).")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(create_financing_tables())
