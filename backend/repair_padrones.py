import asyncio
import os
import time
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()

async def run_repair():
    engine = create_async_engine(os.getenv('DATABASE_URL'))
    async_session = sessionmaker(engine, class_=AsyncSession)
    
    print("Iniciando reparación de IDs en electoral.padrones...")
    start_time = time.time()
    
    async with async_session() as s:
        # 1. Actualizar Elección 1 (ANR 2026)
        print("Actualizando datos de la Elección 1 desde anr_padron_2026...")
        query = """
            UPDATE electoral.padrones p
            SET 
                local_id = a.local,
                distrito_id = a.distrito,
                departamento_id = a.departamento,
                seccional_id = a.seccional
            FROM electoral.anr_padron_2026 a
            WHERE p.cedula = a.cedula AND p.eleccion_id = 1;
        """
        result = await s.execute(text(query))
        await s.commit()
        print(f"Reparación completada para Elección 1. Filas afectadas: {result.rowcount}")
        
    end_time = time.time()
    print(f"Proceso finalizado en {end_time - start_time:.2f} segundos.")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(run_repair())
