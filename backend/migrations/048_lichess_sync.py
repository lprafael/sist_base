import asyncio
import os
import sys
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

migration_up = """
CREATE TABLE IF NOT EXISTS torneos_generales.ajedrez_lichess_sync (
    torneo_id UUID PRIMARY KEY REFERENCES torneos_generales.torneos(id) ON DELETE CASCADE,
    lichess_id VARCHAR(50) NOT NULL,
    auto_sync BOOLEAN DEFAULT TRUE,
    ultima_sincronizacion TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lichess_sync_auto ON torneos_generales.ajedrez_lichess_sync(auto_sync);
"""

migration_down = """
DROP TABLE IF EXISTS torneos_generales.ajedrez_lichess_sync;
"""

async def run_migration():
    load_dotenv()
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("Error: DATABASE_URL no está definida.")
        sys.exit(1)

    engine = create_async_engine(database_url, echo=True)
    async with engine.begin() as conn:
        print("Ejecutando migración UP...")
        await conn.execute(text(migration_up))
        print("Migración completada.")

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(run_migration())
