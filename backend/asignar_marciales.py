import asyncio
import os
import sys
import uuid

# Configurar PYTHONPATH para importar módulos locales
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

DATABASE_URL = "postgresql+asyncpg://postgres:admin@187.77.247.23:5436/BBDD_micancha"

async def run():
    engine = create_async_engine(DATABASE_URL)
    async with engine.connect() as conn:
        # Buscar el torneo
        res = await conn.execute(text("SELECT id, nombre FROM torneos.torneos WHERE nombre ILIKE '%Marciales%'"))
        torneos = res.fetchall()
        
        if not torneos:
            print("No se encontró el torneo de Artes Marciales.")
            # Mostrar torneos disponibles
            res_all = await conn.execute(text("SELECT id, nombre FROM torneos.torneos LIMIT 10"))
            print("Torneos disponibles:", res_all.fetchall())
            return
        
        torneo_id = torneos[0][0]
        torneo_nombre = torneos[0][1]
        print(f"Torneo encontrado: {torneo_nombre} (ID: {torneo_id})")
        
        # Asignar todos los equipos a este torneo
        await conn.execute(text("""
            UPDATE torneos.equipos 
            SET torneo_id = :tid 
        """), {"tid": torneo_id})
        
        print("Equipos asignados.")
        await conn.commit()
        print("Proceso completado.")

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(run())
