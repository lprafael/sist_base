
import asyncio
from database import engine
from sqlalchemy import text

async def check():
    async with engine.connect() as conn:
        try:
            res = await conn.execute(text("SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'electoral'"))
            exists = res.scalar() is not None
            print(f'Schema electoral exists: {exists}')
            
            res = await conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'electoral'"))
            print('Tables in electoral:')
            for row in res.all():
                print(f' - {row[0]}')
        except Exception as e:
            print(f'Error: {e}')

if __name__ == "__main__":
    asyncio.run(check())
