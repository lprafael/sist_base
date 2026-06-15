"""
Script para ejecutar migración 003_reva_features
"""
import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
import os

import importlib.util

spec = importlib.util.spec_from_file_location("migration_003", "migrations/003_reva_features.py")
migration_003 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(migration_003)

migration_up = migration_003.migration_up
migration_down = migration_003.migration_down

async def run_migration():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        database_url = "postgresql+asyncpg://user:password@localhost/micancha"
    
    database_url = database_url.replace("postgresql://", "postgresql+asyncpg://")
    
    engine = create_async_engine(database_url, echo=True)
    
    async with engine.begin() as conn:
        print("✅ Ejecutando migración 003...")
        await conn.execute(text(migration_up))
        print("✅ Migración completada con éxito")
    
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(run_migration())
