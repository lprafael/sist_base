
import asyncio
from sqlalchemy import text
from database import engine

async def check_columns():
    async with engine.connect() as conn:
        for table in ["pagares", "pagos"]:
            try:
                result = await conn.execute(text(f"SELECT id_playa FROM playa.{table} LIMIT 1"))
                print(f"Table playa.{table} has id_playa column")
            except Exception as e:
                print(f"Table playa.{table} does NOT have id_playa column: {e}")

if __name__ == "__main__":
    asyncio.run(check_columns())
