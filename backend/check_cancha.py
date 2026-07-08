import asyncio
import sys
from sqlalchemy import text
from database import engine

async def check_schema(schema_name):
    print(f"--- TABLES IN SCHEMA {schema_name} ---")
    async with engine.connect() as conn:
        tables = await conn.execute(text(f"""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = '{schema_name}'
        """))
        for table in tables:
            tname = table[0]
            print(f"\nTable: {tname}")
            cols = await conn.execute(text(f"""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_schema = '{schema_name}' AND table_name = '{tname}'
            """))
            for col in cols:
                print(f"  - {col[0]} ({col[1]})")

async def main():
    await check_schema('cancha')

if __name__ == "__main__":
    asyncio.run(main())
