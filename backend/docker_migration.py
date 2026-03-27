import asyncio
from database import engine
from sqlalchemy import text

async def run():
    print("Iniciando creación de tabla...")
    try:
        async with engine.begin() as conn:
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
        print("Tabla creada o ya existente.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(run())
