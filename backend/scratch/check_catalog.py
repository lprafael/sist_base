
import asyncio
import sys
import os
sys.path.append(os.getcwd())
from sqlalchemy import text
from database import engine

async def check_catalog():
    async with engine.connect() as conn:
        for table in ["catalogo_tipos_vehiculo", "catalogo_marcas", "catalogo_modelos"]:
            result = await conn.execute(text(f"SELECT COUNT(*) FROM playa.{table}"))
            count = result.scalar()
            print(f"Table playa.{table} has {count} records")

if __name__ == "__main__":
    asyncio.run(check_catalog())
