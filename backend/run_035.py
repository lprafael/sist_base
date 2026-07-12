import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://postgres:admin@187.77.247.23:5436/BBDD_micancha"

async def run():
    engine = create_async_engine(DATABASE_URL)
    async with engine.connect() as conn:
        # 1
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS torneos.grupos (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                torneo_id UUID NOT NULL REFERENCES torneos.torneos(id) ON DELETE CASCADE,
                division_id UUID REFERENCES torneos.divisiones(id) ON DELETE CASCADE,
                nombre VARCHAR(100) NOT NULL,
                estado VARCHAR(50) DEFAULT 'creado',
                creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        """))
        # 2
        await conn.execute(text("""
            ALTER TABLE torneos.partidos 
            ADD COLUMN IF NOT EXISTS division_id UUID REFERENCES torneos.divisiones(id) ON DELETE CASCADE,
            ADD COLUMN IF NOT EXISTS grupo_id UUID REFERENCES torneos.grupos(id) ON DELETE CASCADE,
            ADD COLUMN IF NOT EXISTS jugador_local_id UUID REFERENCES torneos.tournament_players(id) ON DELETE CASCADE,
            ADD COLUMN IF NOT EXISTS jugador_visitante_id UUID REFERENCES torneos.tournament_players(id) ON DELETE CASCADE,
            ADD COLUMN IF NOT EXISTS ganador_jugador_id UUID REFERENCES torneos.tournament_players(id) ON DELETE SET NULL,
            ADD COLUMN IF NOT EXISTS ronda VARCHAR(50)
        """))
        # 3
        await conn.execute(text("""
            ALTER TABLE torneos.partidos 
            ALTER COLUMN equipo_local_id DROP NOT NULL,
            ALTER COLUMN equipo_visitante_id DROP NOT NULL
        """))
        # 4
        await conn.execute(text("""
            ALTER TABLE torneos.posiciones 
            ADD COLUMN IF NOT EXISTS grupo_id UUID REFERENCES torneos.grupos(id) ON DELETE CASCADE,
            ADD COLUMN IF NOT EXISTS jugador_id UUID REFERENCES torneos.tournament_players(id) ON DELETE CASCADE
        """))
        # 5
        await conn.execute(text("""
            ALTER TABLE torneos.posiciones 
            ALTER COLUMN equipo_id DROP NOT NULL
        """))
        await conn.commit()
        print("Migration 035 applied successfully.")

if __name__ == "__main__":
    import sys
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(run())
