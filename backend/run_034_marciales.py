import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://postgres:admin@187.77.247.23:5436/BBDD_micancha"

async def run():
    engine = create_async_engine(DATABASE_URL)
    async with engine.connect() as conn:
        await conn.execute(text("""
            ALTER TABLE torneos.tournament_players 
            ADD COLUMN IF NOT EXISTS peso_verificado DECIMAL(5,2),
            ADD COLUMN IF NOT EXISTS estatura_verificada DECIMAL(5,2),
            ADD COLUMN IF NOT EXISTS pago_confirmado BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS modalidad VARCHAR(50),
            ADD COLUMN IF NOT EXISTS nivel_experiencia VARCHAR(50);
        """))
        await conn.commit()
        print("Migration 034 applied successfully.")

if __name__ == "__main__":
    import sys
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(run())
