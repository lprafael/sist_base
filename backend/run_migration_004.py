"""
Script para ejecutar migraciones de BD (004)
"""
import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
import os

import importlib.util
spec = importlib.util.spec_from_file_location("m004", os.path.join(os.path.dirname(__file__), "migrations", "004_torneo_reglas_premios.py"))
m004 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m004)

async def run_migration():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        database_url = "postgresql+asyncpg://user:password@localhost:5432/micancha"
    
    database_url = database_url.replace("postgresql://", "postgresql+asyncpg://")
    
    engine = create_async_engine(database_url, echo=True)
    
    async with engine.begin() as conn:
        print("✅ Ejecutando migración...")
        await conn.execute(text(m004.migration_up))
        print("✅ Migración completada con éxito")
    
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(run_migration())
