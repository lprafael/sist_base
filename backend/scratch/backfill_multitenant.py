
import asyncio
import sys
import os
sys.path.append(os.getcwd())
from sqlalchemy import text
from database import engine

async def backfill():
    async with engine.connect() as conn:
        print("Backfilling id_playa from parent tables...")
        
        # Pagares
        await conn.execute(text("""
            UPDATE playa.pagares p
            SET id_playa = v.id_playa
            FROM playa.ventas v
            WHERE p.id_venta = v.id_venta AND p.id_playa IS NULL
        """))
        print("Backfilled playa.pagares")
        
        # Pagos
        await conn.execute(text("""
            UPDATE playa.pagos p
            SET id_playa = v.id_playa
            FROM playa.ventas v
            WHERE p.id_venta = v.id_venta AND p.id_playa IS NULL
        """))
        print("Backfilled playa.pagos")
        
        # Historial Propietarios
        await conn.execute(text("""
            UPDATE playa.historial_propietarios h
            SET id_playa = p.id_playa
            FROM playa.productos p
            WHERE h.id_producto = p.id_producto AND h.id_playa IS NULL
        """))
        print("Backfilled playa.historial_propietarios")
        
        await conn.commit()
        print("Backfill finished.")

if __name__ == "__main__":
    asyncio.run(backfill())
