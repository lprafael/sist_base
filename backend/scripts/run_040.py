import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database import SessionLocal
from sqlalchemy import text

async def run_migration():
    print("Iniciando migración 040...")
    
    # Read the migration script
    mig_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "migrations", "040_academias_mejoras.py")
    mig_globals = {}
    with open(mig_path, "r", encoding="utf-8") as f:
        exec(f.read(), mig_globals)
        
    migration_up = mig_globals.get("migration_up")
    
    async with SessionLocal() as session:
        try:
            await session.execute(text(migration_up))
            await session.commit()
            print("¡Migración 040 completada con éxito!")
        except Exception as e:
            await session.rollback()
            print(f"Error ejecutando la migración: {e}")

if __name__ == "__main__":
    asyncio.run(run_migration())
