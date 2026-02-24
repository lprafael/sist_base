#!/usr/bin/env python3
import os
import sys
from pathlib import Path
import psycopg2

# Configuración
SCRIPT_DIR = Path(__file__).resolve().parent
os.chdir(SCRIPT_DIR)

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL no definida")
    sys.exit(1)

# URLs para psycopg2
url = DATABASE_URL
if url.startswith("postgresql+asyncpg"):
    url = url.replace("postgresql+asyncpg", "postgresql", 1)

def apply_sql_file(filename):
    sql_file = SCRIPT_DIR / filename
    if not sql_file.exists():
        print(f"INFO: No se encuentra {filename}, saltando.")
        return

    print(f"Aplicando {filename}...")
    try:
        # Intentar leer con utf-8-sig primero (maneja BOM) y luego con latin-1 como fallback
        try:
            sql = sql_file.read_text(encoding="utf-8-sig")
        except UnicodeDecodeError:
            sql = sql_file.read_text(encoding="latin-1")
            
        conn = psycopg2.connect(url)
        conn.autocommit = True
        cur = conn.cursor()
        cur.execute(sql)
        cur.close()
        conn.close()
        print(f"  - {filename} aplicado correctamente.")
    except Exception as e:
        print(f"  - ERROR en {filename}: {e}")

if __name__ == "__main__":
    print("Iniciando optimizaciones de base de datos...")
    
    # 1. Aplicar índices de performance previos (por si no se aplicaron)
    apply_sql_file("migration_performance_indexes.sql")
    
    # 2. Aplicar nuevos índices de performance V2 (todas las FKs)
    apply_sql_file("migration_performance_indexes_v2.sql")
    
    print("Optimizaciones completadas.")
