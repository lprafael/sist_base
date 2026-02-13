
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

    print("===============================================================")
    print("   INFORME DE AUDITORÍA Y CALIDAD DE MIGRACIÓN      ")
    print("===============================================================\n")

    # --- 1. ENTIDADES MAESTRAS ---
    print("1. RESUMEN CUANTITATIVO (Origen vs Destino)")
    print("------------------------------------------")
    
    # Clientes
    ms_cursor.execute("SELECT COUNT(*) FROM dbo.Cliente WHERE cliruc IS NOT NULL AND RTRIM(cliruc) <> ''")
    ms_cli = ms_cursor.fetchone()[0]
    pg_cursor.execute("SELECT COUNT(*) FROM playa.clientes")
    pg_cli = pg_cursor.fetchone()[0]
    print(f"Clientes:       Origen={ms_cli:<5} | Destino={pg_cli:<5} | {'OK' if ms_cli <= pg_cli else 'FALTOU'}")

    # Productos
    ms_cursor.execute("SELECT COUNT(*) FROM dbo.Productos")
    ms_pro = ms_cursor.fetchone()[0]
    pg_cursor.execute("SELECT COUNT(*) FROM playa.productos")
    pg_pro = pg_cursor.fetchone()[0]
    print(f"Productos:      Origen={ms_pro:<5} | Destino={pg_pro:<5} | {'OK (Inc. Huérfanos)' if ms_pro <= pg_pro else 'REVISAR'}")

    # Ventas
    ms_cursor.execute("SELECT COUNT(*) FROM dbo.Ventas")
    ms_ven = ms_cursor.fetchone()[0]
    pg_cursor.execute("SELECT COUNT(*) FROM playa.ventas")
    pg_ven = pg_cursor.fetchone()[0]
    print(f"Ventas:         Origen={ms_ven:<5} | Destino={pg_ven:<5} | {'OK (Inc. Virtuales)' if ms_ven <= pg_ven else 'REVISAR'}")

    # Cuotas/Pagarés
    ms_cursor.execute("SELECT COUNT(*) FROM dbo.cuoterodet")
    ms_cuo = ms_cursor.fetchone()[0]
    pg_cursor.execute("SELECT COUNT(*) FROM playa.pagares")
    pg_pag = pg_cursor.fetchone()[0]
    print(f"Pagarés/Cuotas: Origen={ms_cuo:<5} | Destino={pg_pag:<5} | {'OK' if ms_cuo <= pg_pag else 'FALTOU'}")

    # Pagos
    ms_cursor.execute("SELECT (SELECT COUNT(*) FROM dbo.Pagoparcial) + (SELECT COUNT(*) FROM dbo.cuoterodet WHERE RTRIM(CAST(cuotafp AS VARCHAR)) <> '' AND YEAR(cuotafp) > 1900)")
    ms_pay = ms_cursor.fetchone()[0]
    pg_cursor.execute("SELECT COUNT(*) FROM playa.pagos")
    pg_pay = pg_cursor.fetchone()[0]
    print(f"Pagos:          Origen ~{ms_pay:<4} | Destino={pg_pay:<5} | {'OK' if ms_pay <= pg_pay else 'REVISAR'}")

    # --- 2. INTEGRIDAD DE RELACIONES EN DESTINO ---
    print("\n2. INTEGRIDAD DE DATOS EN DESTINO (PostgreSQL)")
    print("------------------------------------------------")
    
    # Pagarés sin venta
    pg_cursor.execute("SELECT COUNT(*) FROM playa.pagares WHERE id_venta IS NULL")
    orphan_pagares = pg_cursor.fetchone()[0]
    print(f"Pagarés sin Venta:            {orphan_pagares}")

    # Ventas sin cliente
    pg_cursor.execute("SELECT COUNT(*) FROM playa.ventas WHERE id_cliente IS NULL")
    orphan_ventas = pg_cursor.fetchone()[0]
    print(f"Ventas sin Cliente:           {orphan_ventas}")

    # Ventas sin producto
    pg_cursor.execute("SELECT COUNT(*) FROM playa.ventas WHERE id_producto IS NULL")
    orphan_prod_ventas = pg_cursor.fetchone()[0]
    print(f"Ventas sin Producto:          {orphan_prod_ventas}")

    # --- 3. ANÁLISIS DE CASOS DE LEGADO (VIRTUALES) ---
    print("\n3. ANÁLISIS DE REGISTROS DE LEGADO (HUÉRFANOS)")
    print("---------------------------------------------")
    pg_cursor.execute("SELECT COUNT(*) FROM playa.ventas WHERE numero_venta LIKE 'PEND-%'")
    virtual_sales = pg_cursor.fetchone()[0]
    print(f"Ventas Virtuales creadas:     {virtual_sales} (Casos sin factura en origen)")

    pg_cursor.execute("SELECT COUNT(*) FROM playa.productos WHERE modelo = 'PRODUCTO MIGRADO (SIN DETALLE)'")
    virtual_prods = pg_cursor.fetchone()[0]
    print(f"Productos Virtuales creados:  {virtual_prods} (Casos sin chapa en inventario)")

    # --- 4. CALIDAD DE DOCUMENTOS (RUC/CI) ---
    print("\n4. VALIDACIÓN DE IDENTIDAD")
    print("--------------------------")
    pg_cursor.execute("SELECT tipo_documento, COUNT(*) FROM playa.clientes GROUP BY tipo_documento")
    doc_types = pg_cursor.fetchall()
    for dt in doc_types:
        print(f"Tipo {dt[0] or 'NULO'}: {dt[1]} registros")

    # --- 5. SALDOS Y MORAS ---
    print("\n5. CONSISTENCIA FINANCIERA (Muestreo)")
    print("-------------------------------------")
    pg_cursor.execute("SELECT SUM(saldo_pendiente) FROM playa.pagares WHERE estado IN ('PENDIENTE', 'VENCIDO')")
    total_deuda = pg_cursor.fetchone()[0] or 0
    print(f"Cartera Total Pendiente:      {total_deuda:,.0f} Gs.")

    ms_conn.close()
    pg_conn.close()

if __name__ == "__main__":
    main()
