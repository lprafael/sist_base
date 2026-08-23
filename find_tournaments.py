import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv
import os

load_dotenv('backend/.env')
DB_URL = os.getenv('DATABASE_URL')
engine = create_async_engine(DB_URL, echo=False)

async def main():
    async with engine.begin() as conn:
        res = await conn.execute(text("SELECT id, nombre_academia, nombre FROM torneos.equipos WHERE nombre='Academia Central Dojo'"))
        for r in res.fetchall():
            print(r)
        
        await conn.execute(text("UPDATE torneos.equipos SET nombre='Independiente', nombre_academia='Independiente' WHERE nombre='Academia Central Dojo'"))
        print('Updated to Independiente')

if __name__ == '__main__':
    asyncio.run(main())
