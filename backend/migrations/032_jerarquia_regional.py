import asyncio
import os
import sys
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL no definida")
    sys.exit(1)

if "host.docker.internal" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("host.docker.internal", "localhost")

migration_up = """
CREATE TABLE IF NOT EXISTS torneos_futbol.regiones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evento_id UUID NOT NULL REFERENCES torneos_futbol.eventos(id) ON DELETE CASCADE,
    nombre VARCHAR(150) NOT NULL,
    determinar_campeon_regional BOOLEAN NOT NULL DEFAULT false,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS torneos_futbol.ciudades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    region_id UUID NOT NULL REFERENCES torneos_futbol.regiones(id) ON DELETE CASCADE,
    nombre VARCHAR(150) NOT NULL,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE torneos_futbol.torneos
ADD COLUMN IF NOT EXISTS ciudad_id UUID REFERENCES torneos_futbol.ciudades(id) ON DELETE SET NULL;
"""

migration_down = """
ALTER TABLE torneos_futbol.torneos DROP COLUMN IF EXISTS ciudad_id;
DROP TABLE IF EXISTS torneos_futbol.ciudades CASCADE;
DROP TABLE IF EXISTS torneos_futbol.regiones CASCADE;
"""

async def run():
    print("Ejecutando migracion 032: Jerarquia Regional Futbol...")
    engine = create_async_engine(DATABASE_URL, echo=False)
    statements = [s.strip() for s in migration_up.split(";") if s.strip()]
    ok = 0
    async with engine.begin() as conn:
        for i, stmt in enumerate(statements, 1):
            if not stmt: continue
            try:
                await conn.execute(text(stmt))
                print(f"  OK [{i}/{len(statements)}]: {stmt[:55].replace(chr(10), ' ')}")
                ok += 1
            except Exception as e:
                print(f"  WARN [{i}/{len(statements)}]: {str(e)[:100]}")
    await engine.dispose()
    print(f"\\nMigracion completada: {ok}/{len(statements)} sentencias OK.")

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(run())
