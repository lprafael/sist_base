import asyncio
import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

async def migration():
    # Intentar con localhost si host.docker.internal falla
    urls = [
        "postgresql+asyncpg://postgres:admin@localhost:5432/mi_playa",
        "postgresql+asyncpg://postgres:admin@127.0.0.1:5432/mi_playa",
        "postgresql+asyncpg://postgres:admin@host.docker.internal:5432/mi_playa"
    ]
    
    for url in urls:
        print(f"Trying to connect to {url}...")
        try:
            engine = create_async_engine(url)
            async with engine.connect() as conn:
                res = await conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_schema = 'playa' AND table_name = 'productos'"))
                columns = [row[0] for row in res.fetchall()]
                print(f"Columns: {columns}")
                
                if 'id_usuario' not in columns:
                    print("Adding id_usuario column...")
                    await conn.execute(text("ALTER TABLE playa.productos ADD COLUMN id_usuario INTEGER REFERENCES sistema.usuarios(id)"))
                    await conn.commit()
                    print("Column added successfully.")
                else:
                    print("Column id_usuario already exists.")
                return # Exit on success
        except Exception as e:
            print(f"Failed to connect to {url}: {e}")

if __name__ == "__main__":
    asyncio.run(migration())
