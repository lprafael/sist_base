import asyncio
import os
import time
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()

async def run_update():
    engine = create_async_engine(os.getenv('DATABASE_URL'))
    async_session = sessionmaker(engine, class_=AsyncSession)
    
    print("Iniciando actualización de direcciones en electoral.personas...")
    start_time = time.time()
    
    async with async_session() as s:
        # Query optimizada para concatenar direcciones de ANR y PLRA
        # Usamos subconsultas o un join directo si es posible
        query = """
            UPDATE electoral.personas p
            SET direccion_residencia = TRIM(BOTH '; ' FROM 
                CONCAT(
                    CASE WHEN a.direccion IS NOT NULL AND TRIM(a.direccion) != '' 
                         THEN CONCAT('1) ', TRIM(a.direccion)) 
                         ELSE '' END,
                    CASE WHEN (a.direccion IS NOT NULL AND TRIM(a.direccion) != '') 
                          AND (l.direcc IS NOT NULL AND TRIM(l.direcc) != '') 
                         THEN '; ' 
                         ELSE '' END,
                    CASE WHEN l.direcc IS NOT NULL AND TRIM(l.direcc) != '' 
                         THEN CONCAT('2) ', TRIM(l.direcc)) 
                         ELSE '' END
                )
            )
            FROM (
                SELECT p_sub.cedula, a_sub.direccion, l_sub.direcc
                FROM electoral.personas p_sub
                LEFT JOIN electoral.anr_padron_2026 a_sub ON p_sub.cedula = a_sub.cedula
                LEFT JOIN electoral.plra_padron l_sub ON p_sub.cedula = l_sub.cedula
                WHERE (a_sub.direccion IS NOT NULL AND TRIM(a_sub.direccion) != '')
                   OR (l_sub.direcc IS NOT NULL AND TRIM(l_sub.direcc) != '')
            ) sub
            WHERE p.cedula = sub.cedula;
        """
        
        print("Ejecutando actualización masiva (esto puede tardar unos minutos)...")
        result = await s.execute(text(query))
        await s.commit()
        print(f"Actualización completada. Filas afectadas: {result.rowcount}")
        
    end_time = time.time()
    print(f"Proceso finalizado en {end_time - start_time:.2f} segundos.")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(run_update())
