"""
Migration 042: Hacer sucursal_id opcional en academias.categorias
"""

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


async def run_migration():
    engine = create_async_engine(DATABASE_URL, echo=False)

    async with engine.connect() as conn:
        print("=== RUNNING MIGRATION 042: academias.categorias sucursal_id DROP NOT NULL ===")

        await conn.execute(text("""
            ALTER TABLE academias.categorias ALTER COLUMN sucursal_id DROP NOT NULL;
        """))

        await conn.commit()
        print("MIGRATION 042 EXECUTED SUCCESSFULLY!")


if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(run_migration())
