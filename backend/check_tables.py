import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

async def run():
    engine = create_async_engine('postgresql+asyncpg://postgres:admin@localhost/BBDD_micancha')
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog', 'information_schema')"))
        tables = res.fetchall()
        for t in tables:
            print(f"{t[0]}.{t[1]}")
    await engine.dispose()

asyncio.run(run())
