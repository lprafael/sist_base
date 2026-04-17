import asyncio
from sqlalchemy.future import select
from database import get_session
from models import Usuario

async def check_admin():
    async for session in get_session():
        result = await session.execute(select(Usuario).where(Usuario.username == 'admin'))
        user = result.scalar_one_or_none()
        if user:
            print(f"User: {user.username}")
            print(f"Role: '{user.rol}'")
            print(f"Active: {user.activo}")
        else:
            print("Admin user not found")
        break

if __name__ == "__main__":
    asyncio.run(check_admin())
