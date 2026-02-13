
import os
import pyodbc
import psycopg2
from dotenv import load_dotenv
from urllib.parse import urlparse

def main():
    if os.path.exists('.env'): load_dotenv('.env')
    elif os.path.exists('backend/.env'): load_dotenv('backend/.env')
    else: load_dotenv()

    # PG Config
    DATABASE_URL = os.getenv("DATABASE_URL").replace('postgresql+asyncpg://', 'postgresql://')
    parsed = urlparse(DATABASE_URL)
    pg_conn = psycopg2.connect(
        host=parsed.hostname, port=parsed.port or 5432,
        database=parsed.path[1:], user=parsed.username, password=parsed.password
    )
    pg_cursor = pg_conn.cursor()

    # SQL Server Config
    SQL_SERVER = os.getenv("SQL_SERVER")
    SQL_DATABASE = os.getenv("SQL_DATABASE")
    SQL_TRUSTED = os.getenv("SQL_TRUSTED_CONNECTION", "no").lower() in ("1", "true", "yes")
    SQL_USER = os.getenv("SQL_USER")
    SQL_PASSWORD = os.getenv("SQL_PASSWORD")

    driver = "{ODBC Driver 18 for SQL Server}"
    extra = ";TrustServerCertificate=yes"
    conn_str = f"DRIVER={driver};SERVER={SQL_SERVER};DATABASE={SQL_DATABASE};UID={SQL_USER};PWD={SQL_PASSWORD}{extra}" if not SQL_TRUSTED else f"DRIVER={driver};SERVER={SQL_SERVER};DATABASE={SQL_DATABASE};Trusted_Connection=yes{extra}"
    
    ms_conn = pyodbc.connect(conn_str)
    ms_cursor = ms_conn.cursor()

    ruc = '785512'
    print(f"--- DETALLE DE CUOTAS PARA EL CLIENTE {ruc} ---")
    
    # 1. dbo.cuoterodet
    ms_cursor.execute("SELECT cuotaci, cuotacha, cuotanro, cuotaven, cuotasald, cuotamen, cuotafp FROM dbo.cuoterodet WHERE cuotaci = ?", (ruc,))
    detalles = ms_cursor.fetchall()
    print(f"Cuotas encontradas en SQL Server (cuoterodet): {len(detalles)}")
    for d in detalles[:5]:
        print(f"  Nro: {d.cuotanro}, Vence: {d.cuotaven}, Saldo: {d.cuotasald}, Cuota: {d.cuotamen}, Pago: {d.cuotafp}")
    if len(detalles) > 5: print("  ...")

    # 2. Verificar en PostgreSQL (Destino)
    print(f"\n--- VERIFICACIÓN EN POSTGRESQL ---")
    
    # Buscar cliente por numero_documento
    pg_cursor.execute("SELECT id_cliente, nombre, apellido FROM playa.clientes WHERE numero_documento = %s", (ruc,))
    client_pg = pg_cursor.fetchone()
    if client_pg:
        id_cliente = client_pg[0]
        print(f"Cliente encontrado en PG: ID={id_cliente}, Nombre={client_pg[1]} {client_pg[2]}")
        
        # Buscar ventas
        pg_cursor.execute("SELECT id_venta, numero_venta FROM playa.ventas WHERE id_cliente = %s", (id_cliente,))
        ventas_pg = pg_cursor.fetchall()
        print(f"Ventas en PG: {len(ventas_pg)}")
        
        # Buscar pagares (a través de ventas si existen)
        if ventas_pg:
            id_ventas = [v[0] for v in ventas_pg]
            pg_cursor.execute("SELECT COUNT(*) FROM playa.pagares WHERE id_venta IN %s", (tuple(id_ventas),))
            cnt_pagares = pg_cursor.fetchone()[0]
            print(f"Pagarés en PG: {cnt_pagares}")
        else:
            # Quizás hay pagares huérfanos? (Difícil por FK)
            print("No hay ventas para este cliente en PG, por lo tanto no se migraron los pagarés.")
    else:
        print("Cliente NOT FOUND in PostgreSQL.")

    ms_conn.close()
    pg_conn.close()

if __name__ == "__main__":
    main()
