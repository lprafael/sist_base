"""
Script para ejecutar de forma secuencial todas las migraciones del sistema (001, 002, 003, 004).
Uso:
  py run_migrations.py        (Ejecutar UP)
  py run_migrations.py down   (Ejecutar DOWN - Revertir)
"""
import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
import os
import importlib.util
from pathlib import Path

# Directorio base
BASE_DIR = Path(__file__).resolve().parent

# Lista de migraciones ordenadas
MIGRATIONS = [
    {"name": "001_add_payments_and_tournaments.py", "module": "m001"},
    {"name": "002_torneo_completo.py", "module": "m002"},
    {"name": "003_reva_features.py", "module": "m003"},
    {"name": "004_torneo_reglas_premios.py", "module": "m004"},
    {"name": "005_add_rules_fields.py", "module": "m005"},
    {"name": "006_eventos_categorias.py", "module": "m006"},
    {"name": "007_multitenancy_catalogos.py", "module": "m007"},
]

def load_migration_module(file_name: str, module_name: str):
    """Carga dinámicamente un archivo de migración como módulo Python"""
    file_path = BASE_DIR / "migrations" / file_name
    if not file_path.exists():
        raise FileNotFoundError(f"No se encontró el archivo de migración: {file_path}")
    
    spec = importlib.util.spec_from_file_location(module_name, str(file_path))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

async def run_migrations():
    """Ejecutar todas las migraciones UP en orden"""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        database_url = "postgresql+asyncpg://postgres:admin@localhost/BBDD_micancha"
    
    database_url = database_url.replace("postgresql://", "postgresql+asyncpg://")
    print(f"Connecting to database for migrations...")
    engine = create_async_engine(database_url, echo=False)
    
    async with engine.connect() as conn:
        for migration in MIGRATIONS:
            print(f"Loading migration {migration['name']}...")
            module = load_migration_module(migration["name"], migration["module"])
            
            # Obtener sentencias individuales
            statements = [s.strip() for s in module.migration_up.split(";") if s.strip()]
            
            print(f"Applying {migration['name']} ({len(statements)} statements)...")
            for i, stmt in enumerate(statements, 1):
                try:
                    # Usar transacción individual para cada sentencia
                    async with conn.begin():
                        await conn.execute(text(stmt))
                except Exception as e:
                    err_snippet = str(e)[:120].replace('\n', ' ')
                    print(f"  Warning [Stmt {i}/{len(statements)}]: {err_snippet}")
            print(f"Migration {migration['name']} processed.")
            
    await engine.dispose()
    print("\nAll UP migrations processed.")

async def revert_migrations():
    """Ejecutar todas las migraciones DOWN en orden inverso"""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        database_url = "postgresql+asyncpg://postgres:admin@localhost/BBDD_micancha"
    
    database_url = database_url.replace("postgresql://", "postgresql+asyncpg://")
    print(f"Connecting to database for reversion...")
    engine = create_async_engine(database_url, echo=False)
    
    async with engine.connect() as conn:
        # Orden inverso para revertir dependencias correctamente
        for migration in reversed(MIGRATIONS):
            print(f"Loading migration {migration['name']}...")
            module = load_migration_module(migration["name"], migration["module"])
            
            statements = [s.strip() for s in module.migration_down.split(";") if s.strip()]
            
            print(f"Reverting {migration['name']} ({len(statements)} statements)...")
            for i, stmt in enumerate(statements, 1):
                try:
                    async with conn.begin():
                        await conn.execute(text(stmt))
                except Exception as e:
                    err_snippet = str(e)[:120].replace('\n', ' ')
                    print(f"  Warning [Stmt {i}/{len(statements)}]: {err_snippet}")
            print(f"Migration {migration['name']} processed.")
            
    await engine.dispose()
    print("\nAll DOWN migrations processed.")

if __name__ == "__main__":
    import sys
    from dotenv import load_dotenv
    load_dotenv()
    
    if len(sys.argv) > 1 and sys.argv[1] == "down":
        asyncio.run(revert_migrations())
    else:
        asyncio.run(run_migrations())
