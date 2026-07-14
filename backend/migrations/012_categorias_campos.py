"""
Migración 012: Campos adicionales para categorías de torneos
- Agrega peso_min, peso_max, cinturon, modalidad a torneos.categorias
- edad_min y edad_max ya existen en torneos_generales.categorias pero no en torneos.categorias
"""

SQL = """
-- Campos de categoría para torneos deportivos (artes marciales y otros)
ALTER TABLE torneos.categorias
    ADD COLUMN IF NOT EXISTS genero VARCHAR(20),
    ADD COLUMN IF NOT EXISTS edad_min INTEGER,
    ADD COLUMN IF NOT EXISTS edad_max INTEGER,
    ADD COLUMN IF NOT EXISTS peso_min NUMERIC(6,2),
    ADD COLUMN IF NOT EXISTS peso_max NUMERIC(6,2),
    ADD COLUMN IF NOT EXISTS modalidad VARCHAR(100),
    ADD COLUMN IF NOT EXISTS cinturon VARCHAR(100),
    ADD COLUMN IF NOT EXISTS configuracion JSONB DEFAULT '{}';
"""

import asyncio, sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://postgres:admin@187.77.247.23:5436/BBDD_micancha"

async def run():
    engine = create_async_engine(DATABASE_URL)
    async with engine.connect() as conn:
        for stmt in SQL.split(';'):
            stmt = stmt.strip()
            if stmt:
                try:
                    await conn.execute(text(stmt))
                    print(f"OK: {stmt[:80]}")
                except Exception as e:
                    print(f"ERROR: {e}")
        await conn.commit()
        print("Migracion 012 completada.")

if __name__ == "__main__":
    asyncio.run(run())
