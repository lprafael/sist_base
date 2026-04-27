
import asyncio
import sys
import os
sys.path.append(os.getcwd())
from sqlalchemy import text
from database import engine

async def migrate_categories():
    async with engine.connect() as conn:
        print("Migrating categories to global state...")
        # Set id_playa to NULL for all categories to make them global
        await conn.execute(text("UPDATE playa.categorias_vehiculos SET id_playa = NULL"))
        await conn.commit()
        print("Successfully migrated categories.")

if __name__ == "__main__":
    asyncio.run(migrate_categories())
