import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv
import os

load_dotenv()
DB_URL = os.getenv("DATABASE_URL")

async def main():
    engine = create_async_engine(DB_URL)
    async with engine.connect() as conn:
        result = await conn.execute(text("SELECT id, nombre, complejo_id FROM cancha.canchas"))
        rows = result.fetchall()
        print(f"Total canchas: {len(rows)}")
        for r in rows:
            print(r)

if __name__ == "__main__":
    asyncio.run(main())
