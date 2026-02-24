import asyncio
import os
from pathlib import Path
from sqlalchemy import text
from database import engine, SessionLocal

# Configuración
SCRIPT_DIR = Path(__file__).resolve().parent

async def apply_sql_file(session, filename):
    sql_file = SCRIPT_DIR / filename
    if not sql_file.exists():
        print(f"INFO: No se encuentra {filename}, saltando.")
        return

    print(f"Aplicando {filename}...")
    try:
        # Leer como utf-8
        sql = sql_file.read_text(encoding="utf-8")
        
        # Ejecutar SQL
        await session.execute(text(sql))
        await session.commit()
        print(f"  - {filename} aplicado correctamente.")
    except Exception as e:
        await session.rollback()
        print(f"  - ERROR en {filename}: {e}")

async def main():
    print("Iniciando optimizaciones de base de datos asincronas...")
    async with SessionLocal() as session:
        # 1. Aplicar índices de performance previos
        await apply_sql_file(session, "migration_performance_indexes.sql")
        
        # 2. Aplicar nuevos índices de performance V2
        await apply_sql_file(session, "migration_performance_indexes_v2.sql")
    
    print("Optimizaciones completadas.")

if __name__ == "__main__":
    asyncio.run(main())
