import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from database import engine
from models_playa import GastoAdicional

async def create_table():
    print("Verificando tabla gastos_adicionales...")
    async with engine.begin() as conn:
        # Esto creará la tabla si no existe (basado en el modelo importado)
        await conn.run_sync(GastoAdicional.__table__.create, checkfirst=True)
    print("Tabla verificada/creada correctamente.")

if __name__ == "__main__":
    asyncio.run(create_table())
