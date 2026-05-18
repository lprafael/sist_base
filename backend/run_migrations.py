"""
Script para ejecutar migraciones de BD
"""
import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
import os

# Importar migración
from migrations import migration_001_add_payments_and_tournaments
migration_up = migration_001_add_payments_and_tournaments.migration_up
migration_down = migration_001_add_payments_and_tournaments.migration_down


async def run_migration():
    """Ejecutar migración UP"""
    
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        # Para desarrollo local
        database_url = "postgresql+asyncpg://user:password@localhost/micancha"
    
    # Convertir a asyncpg
    database_url = database_url.replace("postgresql://", "postgresql+asyncpg://")
    
    engine = create_async_engine(database_url, echo=True)
    
    async with engine.begin() as conn:
        print("✅ Ejecutando migración...")
        await conn.execute(text(migration_up))
        print("✅ Migración completada con éxito")
    
    await engine.dispose()


async def revert_migration():
    """Ejecutar migración DOWN"""
    
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        database_url = "postgresql+asyncpg://user:password@localhost/micancha"
    
    database_url = database_url.replace("postgresql://", "postgresql+asyncpg://")
    
    engine = create_async_engine(database_url, echo=True)
    
    async with engine.begin() as conn:
        print("⚠️ Revirtiendo migración...")
        await conn.execute(text(migration_down))
        print("✅ Migración revertida")
    
    await engine.dispose()


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "down":
        asyncio.run(revert_migration())
    else:
        asyncio.run(run_migration())
