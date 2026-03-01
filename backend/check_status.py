import asyncio, os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from dotenv import load_dotenv

async def check():
    load_dotenv()
    engine = create_async_engine(os.getenv('DATABASE_URL').replace('postgresql://', 'postgresql+asyncpg://'))
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_schema = 'electoral' AND table_name = 'ref_locales' AND column_name = 'ubicacion'"))
        col = res.scalar()
        print(f"La columna 'ubicacion' existe: {col is not None}")
        
        # También ver cuántos tienen ubicación ahora
        res2 = await conn.execute(text("SELECT count(*) FROM electoral.ref_locales WHERE ubicacion IS NOT NULL"))
        print(f"Locales con ubicación: {res2.scalar()}")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check())
