import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()
engine = create_async_engine(os.getenv('DATABASE_URL'))

async def list_tables():
    async with engine.begin() as conn:
        result = await conn.execute(text("SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema = 'cancha' AND (table_name LIKE 'torneo%' OR table_name = 'noticias_torneo')"))
        for row in result:
            print(f"{row[0]}.{row[1]}")

asyncio.run(list_tables())
