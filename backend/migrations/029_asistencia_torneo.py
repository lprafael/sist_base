"""Migration 029: Tablas asistencia_torneo y asistencia_partido"""
import asyncio, os, sys
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

SQL_UP = """
CREATE TABLE IF NOT EXISTS cancha.asistencia_torneo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    jugador_id UUID NOT NULL REFERENCES cancha.tournament_players(id) ON DELETE CASCADE,
    torneo_id VARCHAR(50) NOT NULL,
    fecha_hora TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metodo VARCHAR(30) DEFAULT 'facial',
    verificado BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(jugador_id, torneo_id)
);
CREATE TABLE IF NOT EXISTS cancha.asistencia_partido (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    jugador_id UUID NOT NULL REFERENCES cancha.tournament_players(id) ON DELETE CASCADE,
    partido_id UUID NOT NULL,
    torneo_id VARCHAR(50),
    fecha_hora TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metodo VARCHAR(30) DEFAULT 'facial',
    verificado BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(jugador_id, partido_id)
);
CREATE INDEX IF NOT EXISTS idx_asist_torneo_t ON cancha.asistencia_torneo(torneo_id);
CREATE INDEX IF NOT EXISTS idx_asist_partido_p ON cancha.asistencia_partido(partido_id);
"""

if __name__ == "__main__":
    load_dotenv()
    url = os.getenv("DATABASE_URL", "").replace("host.docker.internal", "localhost")
    if not url:
        print("ERROR: DATABASE_URL not set"); sys.exit(1)
    async def run():
        engine = create_async_engine(url, echo=False)
        stmts = [s.strip() for s in SQL_UP.split(";") if s.strip()]
        ok = 0
        async with engine.begin() as conn:
            for i, s in enumerate(stmts, 1):
                try:
                    await conn.execute(text(s))
                    ok += 1
                    print(f"  OK [{i}]: {s[:60]}")
                except Exception as e:
                    print(f"  WARN [{i}]: {e}")
        await engine.dispose()
        print(f"Migration done: {ok}/{len(stmts)} OK")
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(run())
