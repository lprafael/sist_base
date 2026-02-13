
import os
import pyodbc
import psycopg2
from dotenv import load_dotenv
from urllib.parse import urlparse

def main():
    # Intentar cargar .env desde el directorio local o backend/
    if os.path.exists('.env'):
        load_dotenv('.env')
    elif os.path.exists('backend/.env'):
        load_dotenv('backend/.env')
    else:
        load_dotenv()
    
    # PG Config
    DATABASE_URL = os.getenv("DATABASE_URL")
    db_url = DATABASE_URL.replace('postgresql+asyncpg://', 'postgresql://')
    parsed = urlparse(db_url)
    
    # SQL Server Config
    SQL_SERVER = os.getenv("SQL_SERVER")
    SQL_DATABASE = os.getenv("SQL_DATABASE")
    SQL_TRUSTED = os.getenv("SQL_TRUSTED_CONNECTION", "no").lower() in ("1", "true", "yes")
    SQL_USER = os.getenv("SQL_USER")
    SQL_PASSWORD = os.getenv("SQL_PASSWORD")
    
    # Connect PG
    print(f"Conectando a PostgreSQL ({parsed.hostname})...")
    pg_conn = psycopg2.connect(
        host=parsed.hostname,
        port=parsed.port or 5432,
        database=parsed.path[1:],
        user=parsed.username,
        password=parsed.password
    )
    pg_cursor = pg_conn.cursor()
    
    # Connect MS SQL
    print(f"Conectando a SQL Server ({SQL_SERVER})...")
    # Intentar con localhost si host.docker.internal falla y estamos fuera de docker
    servers = [SQL_SERVER, 'localhost', '127.0.0.1', r'.\SQLEXPRESS']
    ms_conn = None
    for srv in servers:
        try:
            driver = "{ODBC Driver 18 for SQL Server}"
            extra = ";TrustServerCertificate=yes"
            if SQL_TRUSTED:
                conn_str = f"DRIVER={driver};SERVER={srv};DATABASE={SQL_DATABASE};Trusted_Connection=yes{extra}"
            else:
                conn_str = f"DRIVER={driver};SERVER={srv};DATABASE={SQL_DATABASE};UID={SQL_USER};PWD={SQL_PASSWORD}{extra}"
            ms_conn = pyodbc.connect(conn_str, timeout=5)
            print(f"Conectado exitosamente a {srv}")
            break
        except Exception as e:
            print(f"Falla al conectar a {srv}: {e}")

    if not ms_conn:
        print("No se pudo conectar a SQL Server.")
        return

    ms_cursor = ms_conn.cursor()

    # Query Source Details
    ms_cursor.execute("SELECT RTRIM(LTRIM(cliruc)) FROM dbo.Cliente WHERE cliruc IS NOT NULL AND RTRIM(LTRIM(cliruc)) <> ''")
    source_rucs = set(row[0] for row in ms_cursor.fetchall())
    source_count = len(source_rucs)
    
    # Query Destination Details
    pg_cursor.execute("SELECT numero_documento FROM playa.clientes")
    dest_rucs = set(row[0] for row in pg_cursor.fetchall() if row[0])
    dest_count = len(dest_rucs)

    print("\n--- COMPARACIÓN DE CLIENTES ---")
    print(f"Origen (SQL Server - dbo.Cliente - RUCs únicos): {source_count}")
    print(f"Destino (PostgreSQL - playa.clientes - RUCs únicos): {dest_count}")
    
    if source_count == dest_count and source_rucs == dest_rucs:
        print("✅ La cantidad y los RUCs coinciden exactamente.")
    else:
        print("❌ Hay discrepancias en los RUCs.")
        
        missing_in_dest = source_rucs - dest_rucs
        if missing_in_dest:
            print(f"⚠️ RUCs en Origen pero NO en Destino ({len(missing_in_dest)}): {list(missing_in_dest)[:10]}...")
        
        extra_in_dest = dest_rucs - source_rucs
        if extra_in_dest:
            print(f"⚠️ RUCs en Destino pero NO en Origen ({len(extra_in_dest)}): {list(extra_in_dest)[:10]}...")

    # Verificar si hay clientes sin numero_documento en el destino
    pg_cursor.execute("SELECT COUNT(*) FROM playa.clientes WHERE numero_documento IS NULL OR numero_documento = ''")
    null_dest = pg_cursor.fetchone()[0]
    if null_dest > 0:
        print(f"Aviso: Hay {null_dest} clientes sin número de documento en el destino.")

    ms_conn.close()
    pg_conn.close()

if __name__ == "__main__":
    main()
