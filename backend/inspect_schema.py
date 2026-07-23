import asyncio
import os
import sys
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from database import DATABASE_URL

async def inspect():
    engine = create_async_engine(DATABASE_URL)
    async with engine.begin() as conn:
        res = await conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='torneos'"))
        tables = [r[0] for r in res.fetchall()]
        print("Tables in torneos schema:", tables)

        res_org = await conn.execute(text("""
            SELECT o.id, o.usuario_id, o.nombre, u.email, u.nombre_completo 
            FROM cancha.organizadores o
            JOIN sistema.usuarios u ON o.usuario_id = u.id
        """))
        print("\nOrganizadores:")
        for r in res_org.fetchall():
            print(dict(r._mapping))

asyncio.run(inspect())
