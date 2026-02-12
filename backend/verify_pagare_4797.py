
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

ID_PAGARE_TEST = 4797

def verify_specific():
    print(f"--- Investigando Pagaré ID: {ID_PAGARE_TEST} ---")
    
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
        
        print("\n[PostgreSQL - Datos del Pagaré]")
        pg_cursor.execute("""
            SELECT p.id_pagare, p.numero_cuota, p.monto_cuota, p.estado, p.saldo_pendiente, c.numero_documento, c.nombre, v.numero_venta
            FROM playa.pagares p
            JOIN playa.ventas v ON p.id_venta = v.id_venta
            JOIN playa.clientes c ON v.id_cliente = c.id_cliente
            WHERE p.id_pagare = %s
        """, (ID_PAGARE_TEST,))
        pagare = pg_cursor.fetchone()
        
        if not pagare:
            print(f"No se encontró el pagaré {ID_PAGARE_TEST} en PostgreSQL.")
            return
        
        ci_cliente = pagare[5]
        nro_cuota = pagare[1]
        print(f"ID: {pagare[0]} | Cuota: {pagare[1]} | Monto: {pagare[2]} | Estado: {pagare[3]} | Saldo: {pagare[4]}")
        print(f"Cliente: {pagare[6]} (CI: {ci_cliente}) | Venta: {pagare[7]}")

        print("\n[PostgreSQL - Pagos registrados para este pagaré]")
        pg_cursor.execute("""
            SELECT numero_recibo, monto_pagado, fecha_pago, observaciones
            FROM playa.pagos
            WHERE id_pagare = %s
        """, (ID_PAGARE_TEST,))
        pagos = pg_cursor.fetchall()
        for pago in pagos:
            print(f"Recibo: {pago[0]} | Monto: {pago[1]} | Fecha: {pago[2]} | Obs: {pago[3]}")

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
        
        print(f"\n[SQL Server - dbo.cuoterodet para CI {ci_cliente}, Cuota {nro_cuota}]")
        ms_cursor.execute("""
            SELECT cuotaci, cuotacha, cuotanro, cuotamen, cuotafp, cuotaes
            FROM dbo.cuoterodet
            WHERE TRIM(cuotaci) = ? AND cuotanro = ?
        """, (ci_cliente.strip(), nro_cuota))
        cuotas = ms_cursor.fetchall()
        for row in cuotas:
            print(f"CI: {row[0]} | Cuota: {row[2]} | Monto: {row[3]} | F.Pago: {row[4]} | Estado SQL: {row[5]}")

        print(f"\n[SQL Server - dbo.Pagoparcial para CI {ci_cliente}, Cuota {nro_cuota}]")
        ms_cursor.execute("""
            SELECT cuotanropp, cuotamenpp, cuotafpp
            FROM dbo.Pagoparcial
            WHERE TRIM(cuotacipp) = ? AND cuotanropp = ?
        """, (ci_cliente.strip(), nro_cuota))
        pagos_pp = ms_cursor.fetchall()
        for row in pagos_pp:
            print(f"Cuota PP: {row[0]} | Monto: {row[1]} | Fecha: {row[2]}")

    except Exception as e:
        print(f"Error MS SQL: {e}")

if __name__ == "__main__":
    verify_specific()
