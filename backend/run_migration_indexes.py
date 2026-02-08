#!/usr/bin/env python3
"""
Aplica solo la migración de índices (migration_add_indexes.sql).
Útil cuando la BD ya existe y quieres añadir índices sin psql.

Uso:
  python run_migration_indexes.py

Con Docker:
  docker compose exec backend python run_migration_indexes.py
"""
import os
import sys
from pathlib import Path

# Cargar .env (desde el directorio del script)
SCRIPT_DIR = Path(__file__).resolve().parent
os.chdir(SCRIPT_DIR)

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL no está definida en el entorno o en .env", file=sys.stderr)
    sys.exit(1)

# Ajustar URL para psycopg2 (postgresql+asyncpg -> postgresql)
url = DATABASE_URL
if url.startswith("postgresql+asyncpg"):
    url = url.replace("postgresql+asyncpg", "postgresql", 1)

try:
    import psycopg2
except ImportError:
    print("ERROR: instala psycopg2-binary: pip install psycopg2-binary", file=sys.stderr)
    sys.exit(1)

sql_file = SCRIPT_DIR / "migration_add_indexes.sql"
if not sql_file.exists():
    print(f"ERROR: No se encuentra {sql_file}", file=sys.stderr)
    sys.exit(1)

sql = sql_file.read_text(encoding="utf-8")

print("Aplicando índices (migration_add_indexes.sql)...")
try:
    conn = psycopg2.connect(url)
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute(sql)
    cur.close()
    conn.close()
    print("Índices creados correctamente.")
except Exception as e:
    print(f"ERROR: {e}", file=sys.stderr)
    sys.exit(1)
