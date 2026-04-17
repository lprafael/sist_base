import asyncio
from sqlalchemy import text
from database import engine

async def inspect_db():
    async with engine.connect() as conn:
        result = await conn.execute(text("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'sistema' AND table_name = 'usuarios'
            ORDER BY ordinal_position;
        """))
        columns = result.fetchall()
        print("Columns in sistema.usuarios:")
        for col in columns:
            print(f"- {col[0]} ({col[1]})")

if __name__ == "__main__":
    asyncio.run(inspect_db())
