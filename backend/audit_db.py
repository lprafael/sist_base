import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()

async def run():
    engine = create_async_engine(os.getenv('DATABASE_URL'))
    async_session = sessionmaker(engine, class_=AsyncSession)
    async with async_session() as s:
        # 1. ¿Cuántas personas hay en personas que no están en padrones?
        res1 = await s.execute(text("SELECT count(*) FROM electoral.personas p LEFT JOIN electoral.padrones pd ON p.cedula = pd.cedula WHERE pd.cedula IS NULL"))
        print(f"Personas sin registro en padrones: {res1.scalar()}")
        
        # 2. ¿Cuántos registros en padrones no tienen persona?
        res2 = await s.execute(text("SELECT count(*) FROM electoral.padrones pd LEFT JOIN electoral.personas p ON pd.cedula = p.cedula WHERE p.cedula IS NULL"))
        print(f"Padrones sin registro en personas: {res2.scalar()}")
        
        # 3. ¿Cuántos en anr_padron_2026 no están en personas?
        res3 = await s.execute(text("SELECT count(*) FROM electoral.anr_padron_2026 a LEFT JOIN electoral.personas p ON a.cedula = p.cedula WHERE p.cedula IS NULL"))
        print(f"ANR Raw no en personas: {res3.scalar()}")
        
        # 4. ¿Cuántos en plra_padron no están en personas?
        res4 = await s.execute(text("SELECT count(*) FROM electoral.plra_padron l LEFT JOIN electoral.personas p ON l.cedula = p.cedula WHERE p.cedula IS NULL"))
        print(f"PLRA Raw no en personas: {res4.scalar()}")
        
        # 5. Verificar tabla 'padron' (singular)
        res5 = await s.execute(text("SELECT count(*) FROM electoral.padron"))
        print(f"Registros en tabla 'padron' (singular): {res5.scalar()}")

        # 6. Verificar tabla 'anr_padron_2026_staging'
        try:
            res6 = await s.execute(text("SELECT count(*) FROM electoral.anr_padron_2026_staging"))
            print(f"Registros en 'anr_padron_2026_staging': {res6.scalar()}")
        except:
            print("Tabla 'anr_padron_2026_staging' no accesible o vacía.")
            
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(run())
