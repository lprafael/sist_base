# run_cloud_migration.py
import os
from pathlib import Path
from dotenv import load_dotenv

# 1. Cargar .env
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("[ERROR] No se encontro DATABASE_URL en el archivo .env")
    exit(1)

# Convertir url asíncrona a síncrona
db_url = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
print("[CONEXION] Conectando a la base de datos remota en la nube...")

# Importar psycopg2
try:
    import psycopg2
except ImportError:
    print("[INFO] psycopg2 no esta instalado en el entorno local. Intentando instalar...")
    import subprocess
    import sys
    subprocess.check_call([sys.executable, "-m", "pip", "install", "psycopg2-binary"])
    import psycopg2

# 2. Leer archivo SQL
sql_file = Path(__file__).parent / "migration_cancha.sql"
if not sql_file.exists():
    print("[ERROR] No se encontro el archivo " + str(sql_file))
    exit(1)

print("Leyendo archivo SQL: " + sql_file.name)
with open(sql_file, "r", encoding="utf-8") as f:
    sql_content = f.read()

# 3. Ejecutar SQL
try:
    conn = psycopg2.connect(db_url)
    conn.autocommit = True
    cursor = conn.cursor()
    
    print("[SQL] Ejecutando migracion geografica (complejos, canchas, PostGIS)...")
    cursor.execute(sql_content)
    print("[OK] Catalogo deportivo inyectado exitosamente en la base de datos de produccion! Success!")
    
    cursor.close()
    conn.close()
except Exception as e:
    print(f"[ERROR] Error durante la migracion: {e}")
    exit(1)
