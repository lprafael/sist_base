import asyncio
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from database import SessionLocal
from models_playa import GastoAdicional, Movimiento

async def check():
    async with SessionLocal() as session:
        # Check the last 5 records
        res = await session.execute(
            select(GastoAdicional).order_by(GastoAdicional.id_gasto_adicional.desc()).limit(5)
        )
        items = res.scalars().all()
        for item in items:
            print(f"ID: {item.id_gasto_adicional}, Movimiento ID: {item.id_movimiento}, Concepto: {item.concepto}")

if __name__ == "__main__":
    asyncio.run(check())
