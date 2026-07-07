import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
import sys
import os
import importlib.util

def load_migration_module(file_name):
    file_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "migrations", file_name)
    spec = importlib.util.spec_from_file_location("m030", file_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

async def run():
    module = load_migration_module("030_asam_y_multas.py")
    engine = create_async_engine('postgresql+asyncpg://postgres:admin@localhost/BBDD_micancha')
    async with engine.connect() as conn:
        for stmt in module.migration_up.split(';'):
            s = stmt.strip()
            if s:
                try:
                    await conn.execute(text(s))
                    print(f"Executed: {s[:50]}...")
                except Exception as e:
                    print(f"Error executing {s[:50]}...: {e}")
        await conn.commit()
    print("Migration 030 Applied!")
    await engine.dispose()

asyncio.run(run())
