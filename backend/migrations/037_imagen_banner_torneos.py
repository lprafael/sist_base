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
ALTER TABLE torneos.torneos ADD COLUMN IF NOT EXISTS imagen_banner VARCHAR;
"""

migration_down = """
ALTER TABLE torneos.torneos DROP COLUMN IF EXISTS imagen_banner;
"""

async def run_migration():
    engine = create_async_engine(DATABASE_URL)
    async with engine.begin() as conn:
        print("Ejecutando migración 037_imagen_banner_torneos...")
        
        # DOWN
        # await conn.execute(text(migration_down))
        
        # UP
        await conn.execute(text(migration_up))
        
        print("Migración completada con éxito.")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(run_migration())
