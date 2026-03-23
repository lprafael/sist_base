import asyncio
from sqlalchemy import text
from database import get_session

async def run():
    async for session in get_session():
        await session.execute(text("ALTER TABLE sistema.usuarios ADD COLUMN IF NOT EXISTS terminos_aceptados BOOLEAN DEFAULT FALSE"))
        await session.commit()
        print("Migración de términos completada")
        break

if __name__ == "__main__":
    asyncio.run(run())
