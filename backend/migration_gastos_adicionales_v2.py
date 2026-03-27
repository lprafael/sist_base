import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

async def migrate():
    engine = create_async_engine(DATABASE_URL)
    async with engine.begin() as conn:
        print("Creando tabla gastos_adicionales...")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS playa.gastos_adicionales (
                id_gasto_adicional SERIAL PRIMARY KEY,
                tipo VARCHAR(20) NOT NULL,
                monto DECIMAL(15, 2) NOT NULL,
                fecha DATE NOT NULL,
                concepto VARCHAR(200) NOT NULL,
                id_cuenta INTEGER NOT NULL REFERENCES playa.cuentas(id_cuenta),
                observaciones TEXT,
                fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """))
    print("Hecho.")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(migrate())
