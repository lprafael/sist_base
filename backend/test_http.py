import asyncio
import httpx
import json

async def run():
    # Login to get token
    async with httpx.AsyncClient() as client:
        # I don't have the user credentials, but I can call the endpoint directly using fastapi TestClient
        pass

if __name__ == "__main__":
    asyncio.run(run())
