import asyncio
import os
import sys
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

# Añadir el directorio padre (backend) al sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL no definida")
    sys.exit(1)

if "host.docker.internal" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("host.docker.internal", "localhost")

migration_up = """
-- Agregar columna inscripcion_confirmada y token_invitacion
ALTER TABLE torneos.equipos ADD COLUMN IF NOT EXISTS inscripcion_confirmada BOOLEAN DEFAULT FALSE;
ALTER TABLE torneos.equipos ADD COLUMN IF NOT EXISTS token_invitacion VARCHAR(100) UNIQUE;

-- Asegurarnos de que los jugadores tengan más columnas disponibles de ser necesario
ALTER TABLE torneos.tournament_players ADD COLUMN IF NOT EXISTS telefono VARCHAR(50);
"""

async def run_migration():
    engine = create_async_engine(DATABASE_URL, echo=True)
    async with engine.begin() as conn:
        print("Ejecutando migración 026...")
        for query in migration_up.strip().split(';'):
            if query.strip():
                await conn.execute(text(query.strip()))
        print("Migración completada exitosamente.")
    await engine.dispose()

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(run_migration())
