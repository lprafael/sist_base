import os
import psycopg2
from urllib.parse import urlparse

import importlib.util

def load_migration(filename):
    spec = importlib.util.spec_from_file_location("migration_module", filename)
    migration_module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration_module)
    return migration_module

def run():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        database_url = "postgresql://user:password@localhost/micancha"
    
    # Ensure synchronous DSN format
    db_url = database_url.replace("postgresql+asyncpg://", "postgresql://")
    
    conn = psycopg2.connect(db_url)
    conn.autocommit = True
    cursor = conn.cursor()
    
    print("Ejecutando migración 003...")
    m3 = load_migration("migrations/003_reva_features.py")
    cursor.execute(m3.migration_up)
    
    try:
        print("Ejecutando migración 004...")
        m4 = load_migration("migrations/004_torneo_reglas_premios.py")
        cursor.execute(m4.migration_up)
    except Exception as e:
        print("Migración 004 saltada o error:", e)
        
    print("✅ Migraciones completadas con éxito")
    
    cursor.close()
    conn.close()

if __name__ == "__main__":
    run()
