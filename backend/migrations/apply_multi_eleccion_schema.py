"""
apply_multi_eleccion_schema.py
Aplica las mejoras estructurales para garantizar independencia total entre elecciones:
- Agrega eleccion_id a electoral.resultados_mesas
- Agrega eleccion_id a electoral.candidatos
- Crea indices de optimizacion
"""

import asyncio
import os
import asyncpg
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL").replace("postgresql+asyncpg://", "postgresql://")

async def apply_migration():
    print(f"Conectando a la base de datos...")
    conn = await asyncpg.connect(DATABASE_URL)
    
    try:
        async with conn.transaction():
            print("1. Verificando y agregando eleccion_id a electoral.resultados_mesas...")
            await conn.execute("""
                ALTER TABLE electoral.resultados_mesas 
                ADD COLUMN IF NOT EXISTS eleccion_id INTEGER 
                REFERENCES electoral.elecciones(id) ON DELETE CASCADE;
            """)
            
            print("2. Creando indice para electoral.resultados_mesas...")
            await conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_resultados_mesas_eleccion 
                ON electoral.resultados_mesas (eleccion_id, local_id, nro_mesa, id_candidato);
            """)

            print("3. Verificando y agregando eleccion_id a electoral.candidatos...")
            await conn.execute("""
                ALTER TABLE electoral.candidatos 
                ADD COLUMN IF NOT EXISTS eleccion_id INTEGER 
                REFERENCES electoral.elecciones(id) ON DELETE SET NULL;
            """)
            
            print("4. Creando indice para electoral.candidatos...")
            await conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_candidatos_eleccion 
                ON electoral.candidatos (eleccion_id);
            """)

        print("[OK] Migracion de esquema completada exitosamente.")
    except Exception as e:
        print(f"[ERROR] Error durante la migracion: {e}")
        raise
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(apply_migration())
