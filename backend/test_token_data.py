import asyncio
from sqlalchemy import select
from database import engine
from models import Usuario
from security import create_access_token
import os

async def test_token():
    async with engine.connect() as conn:
        res = await conn.execute(select(Usuario).where(Usuario.username == 'rlopez'))
        user = res.fetchone()
        if user:
            # Replicating login logic
            token_data = {
                "sub": user.username, 
                "role": user.rol, 
                "user_id": user.id,
                "departamento_id": user.departamento_id,
                "distrito_id": user.distrito_id
            }
            token = create_access_token(token_data)
            print(f"Generated Token Data: {token_data}")
        else:
            print("User rlopez not found")

if __name__ == "__main__":
    asyncio.run(test_token())
