import asyncio
import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from dotenv import load_dotenv

async def apply_indexes():
    dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
    load_dotenv(dotenv_path)
    db_url = os.getenv("DATABASE_URL").replace("postgresql://", "postgresql+asyncpg://")
    engine = create_async_engine(db_url)
    
    async with engine.begin() as conn:
        print("Creando índices para acelerar el tablero geográfico...")
        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_anr_geografia 
            ON electoral.anr_padron_2026 (departamento, distrito, seccional, local);
        """))
        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_ref_distritos_dpto 
            ON electoral.ref_distritos (departamento_id);
        """))
    await engine.dispose()
    print("Índices creados con éxito.")

if __name__ == "__main__":
    asyncio.run(apply_indexes())
