
import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from models import Usuario
from security import create_access_token
import httpx
from dotenv import load_dotenv

load_dotenv()

async def test_api_call():
    DATABASE_URL = os.getenv("DATABASE_URL")
    engine = create_async_engine(DATABASE_URL, echo=False)
    SessionLocal = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    
    async with SessionLocal() as session:
        result = await session.execute(select(Usuario).where(Usuario.username == "admin"))
        user = result.scalar_one()
        
        # Generate a token like the real login does
        token_data = {
            "sub": user.username,
            "role": user.rol,
            "user_id": user.id
        }
        token = create_access_token(token_data)
        
        print(f"Token generated for {user.username} with role {user.rol}")
        
    await engine.dispose()
    
    # Now call the API (assuming it's running on localhost:8001 or whatever PORT is in .env)
    PORT = os.getenv("PORT", "8001")
    url = f"http://localhost:{PORT}/api/auth/users"
    
    print(f"Calling API at {url}...")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers={"Authorization": f"Bearer {token}"})
            print(f"Status Code: {response.status_code}")
            if response.status_code == 200:
                users = response.json()
                print(f"Found {len(users)} users")
                for u in users[:3]:
                    print(f" - {u['username']} ({u['rol']})")
            else:
                print(f"Error: {response.text}")
    except Exception as e:
        print(f"Connection failed: {e}. (Is the server running?)")

if __name__ == "__main__":
    asyncio.run(test_api_call())
