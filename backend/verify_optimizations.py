import asyncio
from sqlalchemy import text
from database import engine, SessionLocal

async def check():
    async with SessionLocal() as session:
        result = await session.execute(text("SELECT indexname FROM pg_indexes WHERE indexname LIKE 'idx_%%'"))
        indexes = result.fetchall()
        print("Indices encontrados:")
        for idx in indexes:
            print(f" - {idx[0]}")

if __name__ == "__main__":
    asyncio.run(check())
