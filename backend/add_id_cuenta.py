import asyncio
from database import engine
from sqlalchemy import text

async def run():
    try:
        async with engine.begin() as conn:
            await conn.execute(text('ALTER TABLE playa.gastos_productos ADD COLUMN IF NOT EXISTS id_cuenta INTEGER REFERENCES playa.cuentas(id_cuenta)'))
            await conn.execute(text('ALTER TABLE playa.gastos_empresa ADD COLUMN IF NOT EXISTS id_cuenta INTEGER REFERENCES playa.cuentas(id_cuenta)'))
            print('Columns added successfully')
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(run())
