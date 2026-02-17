
import asyncio
from sqlalchemy import select
from backend.database import get_session
from backend.models_playa import Estado

async def check_states():
    async for session in get_session():
        result = await session.execute(select(Estado))
        states = result.scalars().all()
        for s in states:
            print(f'ID: {s.id_estado}, Nombre: {s.nombre}')
        break

if __name__ == '__main__':
    asyncio.run(check_states())

