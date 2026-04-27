
import asyncio
import sys
import os
sys.path.append(os.getcwd()) # Add current directory to path
from sqlalchemy import text
from database import engine

async def migrate():
    async with engine.connect() as conn:
        print("Starting manual migration for multitenancy columns...")
        tables = ["pagares", "pagos", "historial_propietarios"]
        for table in tables:
            try:
                # Intentar añadir la columna. Si ya existe, fallará y pasaremos al siguiente.
                await conn.execute(text(f"ALTER TABLE playa.{table} ADD COLUMN IF NOT EXISTS id_playa INTEGER"))
                await conn.execute(text(f"CREATE INDEX IF NOT EXISTS ix_playa_{table}_id_playa ON playa.{table} (id_playa)"))
                print(f"Successfully added id_playa to playa.{table}")
            except Exception as e:
                print(f"Note: Could not add column to {table} (it might already exist): {e}")
        
        await conn.commit()
        print("Migration finished.")

if __name__ == "__main__":
    asyncio.run(migrate())
