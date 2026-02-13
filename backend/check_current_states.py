
import asyncio
from sqlalchemy import text
from database import SessionLocal

async def check_states():
    db = SessionLocal()
    try:
        result = db.execute(text("SELECT DISTINCT estado FROM playa.pagares"))
        states = [row[0] for row in result]
        print(f"Current states in pagares: {states}")
    finally:
        db.close()

if __name__ == "__main__":
    import asyncio
    asyncio.run(check_states())
