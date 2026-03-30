import asyncio
import os
from sqlalchemy import text, select, func
from database import engine
from models_playa import Producto

async def count_products():
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT count(*) FROM playa.productos"))
        count_db = res.scalar()
        print(f"Total products in DB (raw SQL): {count_db}")
        
        res_activo = await conn.execute(text("SELECT count(*) FROM playa.productos WHERE activo = true"))
        count_activo = res_activo.scalar()
        print(f"Total active products: {count_activo}")

        res_disp = await conn.execute(text("SELECT count(*) FROM playa.productos WHERE estado_disponibilidad = 'DISPONIBLE'"))
        count_disp = res_disp.scalar()
        print(f"Total available products: {count_disp}")

    async with engine.connect() as conn:
        res_cols = await conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_schema = 'playa' AND table_name = 'productos'"))
        cols = [r[0] for r in res_cols.fetchall()]
        print(f"Columns: {cols}")

if __name__ == "__main__":
    asyncio.run(count_products())
