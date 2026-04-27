
import asyncio
import sys
import os
sys.path.append(os.getcwd())
from sqlalchemy import text
from database import engine

async def check_products():
    async with engine.connect() as conn:
        result = await conn.execute(text("SELECT id_producto, marca, modelo, id_playa FROM playa.productos"))
        rows = result.fetchall()
        print(f"Found {len(rows)} products in database")
        for row in rows:
            print(f"ID: {row[0]}, {row[1]} {row[2]}, Playa ID: {row[3]}")

if __name__ == "__main__":
    asyncio.run(check_products())
