
import asyncio
import sys
import os
sys.path.append(os.getcwd())
from sqlalchemy import text
from database import engine

async def check_catalog_active():
    async with engine.connect() as conn:
        result = await conn.execute(text("SELECT id_tipo, nombre, activo FROM playa.catalogo_tipos_vehiculo"))
        rows = result.fetchall()
        for row in rows:
            print(f"ID: {row[0]}, Nombre: {row[1]}, Activo: {row[2]}")

if __name__ == "__main__":
    asyncio.run(check_catalog_active())
