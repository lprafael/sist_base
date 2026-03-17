import os
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv
from models import Base, ResultadoMesa

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

async def create_dia_d_tables():
    engine = create_async_engine(DATABASE_URL, echo=True)
    async with engine.begin() as conn:
        print("Creating Dia D tables in schema 'electoral'...")
        await conn.execute(text("CREATE SCHEMA IF NOT EXISTS electoral"))
        await conn.run_sync(Base.metadata.create_all)
    
    print("✅ Tablas del Día D creadas.")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(create_dia_d_tables())
