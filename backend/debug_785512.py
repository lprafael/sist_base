
import os
import pyodbc
import psycopg2
from dotenv import load_dotenv
from urllib.parse import urlparse

def main():
    if os.path.exists('.env'): load_dotenv('.env')
    elif os.path.exists('backend/.env'): load_dotenv('backend/.env')
    else: load_dotenv()

    # SQL Server Config
    SQL_SERVER = os.getenv("SQL_SERVER")
    SQL_DATABASE = os.getenv("SQL_DATABASE")
    SQL_TRUSTED = os.getenv("SQL_TRUSTED_CONNECTION", "no").lower() in ("1", "true", "yes")
    SQL_USER = os.getenv("SQL_USER")
    SQL_PASSWORD = os.getenv("SQL_PASSWORD")

    driver = "{ODBC Driver 18 for SQL Server}"
    extra = ";TrustServerCertificate=yes"
    if SQL_TRUSTED:
        conn_str = f"DRIVER={driver};SERVER={SQL_SERVER};DATABASE={SQL_DATABASE};Trusted_Connection=yes{extra}"
    else:
        conn_str = f"DRIVER={driver};SERVER={SQL_SERVER};DATABASE={SQL_DATABASE};UID={SQL_USER};PWD={SQL_PASSWORD}{extra}"
    
    ms_conn = pyodbc.connect(conn_str)
    ms_cursor = ms_conn.cursor()

    ruc = '785512'
    print(f"--- INVESTIGACIÓN CLIENTE {ruc} (SQL SERVER) ---")
    
    # 1. dbo.Cliente
    ms_cursor.execute("SELECT cliruc, clinombre FROM dbo.Cliente WHERE cliruc = ?", (ruc,))
    cliente = ms_cursor.fetchone()
    print(f"Cliente: {cliente}")

    # 2. dbo.ventas
    ms_cursor.execute("SELECT * FROM dbo.ventas WHERE cliruc = ?", (ruc,))
    ventas = ms_cursor.fetchall()
    print(f"Ventas trovadas: {len(ventas)}")
    for v in ventas:
        print(f"  Venta: {v}")

    # 3. dbo.cuotero
    ms_cursor.execute("SELECT cuotaci, cuotacha, cuotanrof, cuotamon, cuotasal, cuotanrof FROM dbo.cuotero WHERE cuotaci = ?", (ruc,))
    cuoteros = ms_cursor.fetchall()
    print(f"\nCuoteros encontrados ({len(cuoteros)}):")
    cuotanrofs = []
    for c in cuoteros:
        print(f"  cuotaci={c.cuotaci}, cuotacha={c.cuotacha}, cuotanrof='{c.cuotanrof}', monto={c.cuotamon}")
        cuotanrofs.append(c.cuotanrof)

    # 4. Verificar si los cuotanrof existen en ventas
    if cuotanrofs:
        for ref in set(cuotanrofs):
            ms_cursor.execute("SELECT COUNT(*) FROM dbo.ventas WHERE factnro = ?", (ref,))
            count = ms_cursor.fetchone()[0]
            print(f"  Ref {ref} en dbo.ventas: {count} registros")
            
            # Intentar por factnum/otro campo si factnro no matchea? 
            # El script de migración usa: JOIN playa.ventas v ON v.numero_venta = TRIM(c.cuotanrof)
            # En PostgreSQL numero_venta es LPAD(s.facserie1::TEXT, 3, '0') || '-' || LPAD(s.facserie2::TEXT, 3, '0') || '-' || LPAD(s.factnum::TEXT, 7, '0')

    ms_conn.close()

if __name__ == "__main__":
    main()
