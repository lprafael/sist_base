import asyncio
import os
import sys

# Agrega la ruta base del backend para que pueda encontrar el módulo 'database'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from sqlalchemy import text

async def alter_table():
    async with SessionLocal() as session:
        try:
            # Check if column exists
            result = await session.execute(text("SELECT column_name FROM information_schema.columns WHERE table_schema='cancha' AND table_name='complejos' AND column_name='es_publico';"))
            if not result.fetchone():
                await session.execute(text("ALTER TABLE cancha.complejos ADD COLUMN es_publico BOOLEAN DEFAULT false;"))
                await session.commit()
                print("Column 'es_publico' added successfully.")
            else:
                print("Column 'es_publico' already exists.")
        except Exception as e:
            await session.rollback()
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(alter_table())
