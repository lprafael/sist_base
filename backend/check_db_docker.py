import asyncio
from sqlalchemy import text
from database import engine

async def check():
    async with engine.begin() as conn:
        res = await conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'playa' AND table_name = 'imagenes_productos' AND column_name = 'imagen_con_marca'"))
        print(res.all())
    await engine.dispose()

if __name__ == '__main__':
    asyncio.run(check())
