import asyncio
from database import SessionLocal
from sqlalchemy import text

async def check_blobs_size():
    async with SessionLocal() as session:
        result = await session.execute(text("SELECT count(*) FROM playa.imagenes_productos WHERE length(imagen) > 0"))
        count_valid = result.scalar()
        
        result = await session.execute(text("SELECT count(*) FROM playa.imagenes_productos WHERE length(imagen) = 0"))
        count_zero = result.scalar()
        
        result = await session.execute(text("SELECT count(*) FROM playa.imagenes_productos WHERE imagen IS NULL"))
        count_null = result.scalar()
        
        print(f"Images with length > 0: {count_valid}")
        print(f"Images with length = 0: {count_zero}")
        print(f"Images with NULL data: {count_null}")

if __name__ == "__main__":
    asyncio.run(check_blobs_size())
