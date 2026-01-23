import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

async def test():
    engine = create_async_engine('postgresql+asyncpg://jefe-CID:vmtdmt@monitoreo.vmt.gov.py:5432/bbdd-monitoreo-prod')
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT count(*) FROM app_monitoreo_mensajeoperativo WHERE agency_id = '0015' AND fecha_hora >= CURRENT_DATE - INTERVAL '1 day'"))
        print(f"Count for agency 0015 last 24h: {res.scalar()}")

if __name__ == "__main__":
    asyncio.run(test())
