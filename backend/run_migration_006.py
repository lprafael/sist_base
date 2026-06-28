import os
import psycopg2
import importlib.util

def load_migration(filename):
    spec = importlib.util.spec_from_file_location("migration_module", filename)
    migration_module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration_module)
    return migration_module

def run():
    from dotenv import load_dotenv
    load_dotenv()
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        database_url = "postgresql://postgres:admin@187.77.247.23:5432/BBDD_micancha"
    
    # Ensure synchronous DSN format
    db_url = database_url.replace("postgresql+asyncpg://", "postgresql://")
    
    print(f"Connecting to {db_url}")
    conn = psycopg2.connect(db_url)
    conn.autocommit = True
    cursor = conn.cursor()
    
    try:
        print("Ejecutando migración 006...")
        m6 = load_migration("migrations/006_eventos_categorias.py")
        cursor.execute(m6.migration_up)
        print("✅ Migración 006 completada con éxito")
    except Exception as e:
        print("Error en migración 006:", e)
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    run()
