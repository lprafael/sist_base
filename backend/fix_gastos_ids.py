
import asyncio
from sqlalchemy import text
from database import engine

async def update_ids():
    async with engine.begin() as conn:
        print("Actualizando gastos_empresa...")
        await conn.execute(text("UPDATE playa.gastos_empresa SET id_cuenta = 1 WHERE id_cuenta IS NULL"))
        
        print("Actualizando gastos_productos...")
        await conn.execute(text("UPDATE playa.gastos_productos SET id_cuenta = 1 WHERE id_cuenta IS NULL"))
        
        print("Actualización completada exitosamente.")

if __name__ == "__main__":
    asyncio.run(update_ids())
