import asyncio
from database import SessionLocal
from sqlalchemy import text

async def check_st_images():
    async with SessionLocal() as session:
        result = await session.execute(text(
            "SELECT count(*) FROM migracion.st_productos WHERE proimagen IS NOT NULL"
        ))
        total_not_null = result.scalar()
        
        result = await session.execute(text(
            "SELECT count(*) FROM migracion.st_productos WHERE length(proimagen) > 0"
        ))
        valid_main = result.scalar()
        
        print(f"ST_productos with proimagen NOT NULL: {total_not_null}")
        print(f"ST_productos with proimagen length > 0: {valid_main}")

if __name__ == "__main__":
    asyncio.run(check_st_images())
