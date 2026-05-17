import asyncio
import os
import time
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()

async def run_cleanup():
    engine = create_async_engine(os.getenv('DATABASE_URL'))
    async_session = sessionmaker(engine, class_=AsyncSession)
    
    print("Iniciando unificación de género y limpieza de tablas...")
    start_time = time.time()
    
    async with async_session() as s:
        # 1. Unificar género desde PLRA
        print("Actualizando campo 'genero' en electoral.personas desde plra_padron...")
        query_gender = """
            UPDATE electoral.personas p
            SET genero = l.sexo
            FROM electoral.plra_padron l
            WHERE p.cedula = l.cedula 
              AND (p.genero IS NULL OR p.genero = '')
              AND l.sexo IN ('M', 'F');
        """
        res_gender = await s.execute(text(query_gender))
        await s.commit()
        print(f"Género actualizado para {res_gender.rowcount} personas.")

        # 2. Eliminar tablas redundantes
        print("Eliminando tablas redundantes...")
        tables_to_drop = [
            "electoral.anr_padron_2026_staging",
            "electoral.padron"
        ]
        for table in tables_to_drop:
            try:
                await s.execute(text(f"DROP TABLE IF EXISTS {table} CASCADE"))
                print(f"Tabla {table} eliminada.")
            except Exception as e:
                print(f"Error al eliminar {table}: {e}")
        
        await s.commit()
        
    end_time = time.time()
    print(f"Proceso de limpieza finalizado en {end_time - start_time:.2f} segundos.")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(run_cleanup())
