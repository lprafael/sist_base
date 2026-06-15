"""
Script para ejecutar la migración 002: Módulo de Torneos Completo.
Uso: python run_migration_002.py
"""
import asyncio
import os
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL no definida en .env")

from migrations.torneo_completo_002 import migration_up


async def main():
    print("🔄 Ejecutando migración 002: Módulo de Torneos Completo...")
    engine = create_async_engine(DATABASE_URL, echo=False)
    
    # Dividir en sentencias individuales (separadas por ';')
    statements = [s.strip() for s in migration_up.split(";") if s.strip()]
    
    async with engine.begin() as conn:
        for i, stmt in enumerate(statements, 1):
            try:
                await conn.execute(text(stmt))
                print(f"  ✅ [{i}/{len(statements)}] OK")
            except Exception as e:
                print(f"  ⚠️  [{i}/{len(statements)}] {str(e)[:120]}")
    
    await engine.dispose()
    print("\n✅ Migración completada.")

if __name__ == "__main__":
    asyncio.run(main())
