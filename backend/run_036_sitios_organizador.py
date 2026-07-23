import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://postgres:admin@187.77.247.23:5436/BBDD_micancha"

async def run():
    engine = create_async_engine(DATABASE_URL)
    async with engine.connect() as conn:
        # 1. Create sitios_organizador table
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS sistema.sitios_organizador (
                id VARCHAR(50) PRIMARY KEY,
                usuario_id INTEGER REFERENCES sistema.usuarios(id) ON DELETE CASCADE,
                nombre VARCHAR(100) NOT NULL,
                ciudad VARCHAR(100),
                ubicacion_gmaps VARCHAR(255),
                latitud FLOAT,
                longitud FLOAT,
                fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        """))
        await conn.commit()
        print("Migration 036 applied successfully.")

if __name__ == "__main__":
    import sys
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(run())
