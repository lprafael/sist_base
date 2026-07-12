import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import sys

DATABASE_URL = "postgresql+asyncpg://postgres:admin@187.77.247.23:5436/BBDD_micancha"

async def run_migration():
    engine = create_async_engine(DATABASE_URL)
    async with engine.begin() as conn:
        print("Creando tabla torneos.arbitros...")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS torneos.arbitros (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                torneo_id UUID NOT NULL REFERENCES torneos.torneos(id) ON DELETE CASCADE,
                nombre VARCHAR(100) NOT NULL,
                dni VARCHAR(50),
                rol VARCHAR(50), -- Arbitro Principal, Juez, Veedor
                creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """))

        print("Agregando arbitro_id a torneos.partidos...")
        try:
            await conn.execute(text("ALTER TABLE torneos.partidos ADD COLUMN arbitro_id UUID REFERENCES torneos.arbitros(id) ON DELETE SET NULL;"))
        except Exception as e:
            print(f"La columna arbitro_id podría ya existir en partidos: {e}")

        print("Agregando campos de puntuacion a torneos.categorias...")
        try:
            await conn.execute(text("ALTER TABLE torneos.categorias ADD COLUMN pts_victoria INTEGER DEFAULT 3;"))
        except Exception as e:
            print(f"pts_victoria ya existe: {e}")

        try:
            await conn.execute(text("ALTER TABLE torneos.categorias ADD COLUMN pts_empate INTEGER DEFAULT 1;"))
        except Exception as e:
            print(f"pts_empate ya existe: {e}")
            
        try:
            await conn.execute(text("ALTER TABLE torneos.categorias ADD COLUMN pts_derrota INTEGER DEFAULT 0;"))
        except Exception as e:
            print(f"pts_derrota ya existe: {e}")
            
        try:
            await conn.execute(text("ALTER TABLE torneos.categorias ADD COLUMN criterio_desempate VARCHAR(100);"))
        except Exception as e:
            print(f"criterio_desempate ya existe: {e}")

    print("Migracion 036 completada exitosamente!")
    await engine.dispose()

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(run_migration())
