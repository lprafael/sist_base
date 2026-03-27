import asyncio
import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from database import engine
from sqlalchemy import text

async def check_triggers():
    async with engine.connect() as conn:
        print("Checking triggers for 'pagares' and 'pagos' tables...")
        query = text("""
            SELECT trigger_name, event_manipulation, event_object_table, action_statement 
            FROM information_schema.triggers 
            WHERE event_object_table = 'pagares' OR event_object_table = 'pagos'
               OR (event_object_schema = 'playa' AND (event_object_table = 'pagares' OR event_object_table = 'pagos'))
        """)
        res = await conn.execute(query)
        rows = res.fetchall()
        if not rows:
            print("No triggers found.")
        for row in rows:
            print(f"Trigger: {row[0]}, Event: {row[1]}, Table: {row[2]}")
            # print(f"Action: {row[3]}")

if __name__ == "__main__":
    asyncio.run(check_triggers())
