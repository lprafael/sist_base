
import asyncio
import sys
import os
sys.path.append(os.getcwd())
from sqlalchemy import text
from database import engine

async def check_playas():
    async with engine.connect() as conn:
        result = await conn.execute(text("SELECT id, nombre FROM sistema.playas"))
        rows = result.fetchall()
        print(f"Found {len(rows)} playas")
        for row in rows:
            print(f"ID: {row[0]}, Nombre: {row[1]}")

if __name__ == "__main__":
    asyncio.run(check_playas())
