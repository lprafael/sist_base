
import os
import pyodbc
import psycopg2
from dotenv import load_dotenv
from urllib.parse import urlparse

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL").replace('postgresql+asyncpg://', 'postgresql://')
parsed = urlparse(DATABASE_URL)

SQL_SERVER = os.getenv("SQL_SERVER", "localhost")
SQL_DATABASE = os.getenv("SQL_DATABASE", "Automotores")
SQL_USER = os.getenv("SQL_USER", "sa")
SQL_PASSWORD = os.getenv("SQL_PASSWORD", "Admin123")

CI_CLIENTE = "4878266"

def verify():
    print(f"--- Verificando Cliente CI: {CI_CLIENTE} ---")
    
    # 1. PostgreSQL
    try:
        pg_conn = psycopg2.connect(
            host="host.docker.internal",
            port=parsed.port or 5432,
            database=parsed.path[1:],
            user=parsed.username,
            password=parsed.password
        )
        pg_cursor = pg_conn.cursor()
        
        print("\n[PostgreSQL - playa.pagares]")
        query_pg = """
            SELECT p.numero_pagare, p.numero_cuota, p.monto_cuota, p.fecha_vencimiento, p.estado, v.numero_venta
            FROM playa.pagares p
            JOIN playa.ventas v ON p.id_venta = v.id_venta
            JOIN playa.clientes c ON v.id_cliente = c.id_cliente
            WHERE c.numero_documento = %s
            ORDER BY p.numero_cuota;
        """
        pg_cursor.execute(query_pg, (CI_CLIENTE,))
        pagares_pg = pg_cursor.fetchall()
        for row in pagares_pg:
            print(f"Venta: {row[5]} | Cuota: {row[1]} | Monto: {row[2]} | Venc: {row[3]} | Estado: {row[4]}")

        print("\n[PostgreSQL - playa.pagos]")
        query_pg_pagos = """
            SELECT p.numero_recibo, p.monto_pagado, p.fecha_pago, pg.numero_cuota
            FROM playa.pagos p
            JOIN playa.pagares pg ON p.id_pagare = pg.id_pagare
            JOIN playa.ventas v ON pg.id_venta = v.id_venta
            JOIN playa.clientes c ON v.id_cliente = c.id_cliente
            WHERE c.numero_documento = %s
            ORDER BY pg.numero_cuota, p.fecha_pago;
        """
        pg_cursor.execute(query_pg_pagos, (CI_CLIENTE,))
        pagos_pg = pg_cursor.fetchall()
        for row in pagos_pg:
            print(f"Cuota: {row[3]} | Pago: {row[1]} | Fecha: {row[2]} | Recibo: {row[0]}")

    except Exception as e:
        print(f"Error PG: {e}")
        return

    # 2. SQL Server
    try:
        server = "host.docker.internal"
        driver = "{ODBC Driver 18 for SQL Server}"
        conn_str = f"DRIVER={driver};SERVER={server};DATABASE={SQL_DATABASE};UID={SQL_USER};PWD={SQL_PASSWORD};TrustServerCertificate=yes"
        ms_conn = pyodbc.connect(conn_str)
        ms_cursor = ms_conn.cursor()
        
        print("\n[SQL Server - dbo.cuoterodet]")
        query_ms = """
            SELECT d.cuotanro, d.cuotamen, d.cuotaven, d.cuotafp, c.cuotanrof
            FROM dbo.cuoterodet d
            JOIN dbo.cuotero c ON TRIM(c.cuotaci) = TRIM(d.cuotaci) AND TRIM(c.cuotacha) = TRIM(d.cuotacha)
            WHERE TRIM(d.cuotaci) = ?
            ORDER BY d.cuotanro;
        """
        ms_cursor.execute(query_ms, (CI_CLIENTE,))
        cuotas_ms = ms_cursor.fetchall()
        for row in cuotas_ms:
            pagado = row[3] and row[3].year > 1900
            estado = "PAGADO" if pagado else "PENDIENTE/VENCIDO"
            print(f"Venta SQL: {row[4]} | Cuota: {row[0]} | Monto: {row[1]} | Venc: {row[2].date() if row[2] else 'N/A'} | F.Pago: {row[3]} ({estado})")

        print("\n[SQL Server - dbo.Pagoparcial]")
        query_pp = """
            SELECT cuotanropp, cuotamenpp, cuotafpp
            FROM dbo.Pagoparcial
            WHERE TRIM(cuotacipp) = ?
            ORDER BY cuotanropp, cuotafpp;
        """
        ms_cursor.execute(query_pp, (CI_CLIENTE,))
        pagos_pp = ms_cursor.fetchall()
        for row in pagos_pp:
            print(f"Cuota PP: {row[0]} | Monto: {row[1]} | Fecha: {row[2]}")

    except Exception as e:
        print(f"Error MS SQL: {e}")

if __name__ == "__main__":
    verify()
