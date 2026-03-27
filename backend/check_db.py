
import asyncio
from sqlalchemy import text
from database import engine

async def run():
    try:
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'playa' AND table_name = 'imagenes_productos'"))
            columns = result.fetchall()
            print("Columnas en playa.imagenes_productos:")
            for col in columns:
                print(f"- {col[0]}: {col[1]}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(run())
