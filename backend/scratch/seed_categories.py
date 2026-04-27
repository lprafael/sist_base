
import asyncio
import sys
import os
sys.path.append(os.getcwd())
from sqlalchemy import text
from database import engine

async def seed_categories():
    async with engine.connect() as conn:
        print("Seeding standard categories...")
        categories = [
            ("USADOS IMPORTADOS", "Vehículos importados de otros países"),
            ("USADOS LOCALES", "Vehículos usados con procedencia local"),
            ("0 KM", "Vehículos nuevos sin uso")
        ]
        for nombre, desc in categories:
            # Check if exists
            res = await conn.execute(text("SELECT id_categoria FROM playa.categorias_vehiculos WHERE nombre = :n"), {"n": nombre})
            if not res.fetchone():
                await conn.execute(text("INSERT INTO playa.categorias_vehiculos (nombre, descripcion) VALUES (:n, :d)"), {"n": nombre, "d": desc})
                print(f"Added category: {nombre}")
        
        await conn.commit()
        print("Seeding finished.")

if __name__ == "__main__":
    asyncio.run(seed_categories())
