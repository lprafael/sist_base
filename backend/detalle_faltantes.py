
import os
import pyodbc
from dotenv import load_dotenv

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

    # Connect MS SQL
    print(f"Conectando a SQL Server ({SQL_SERVER})...")
    # Intentar con localhost si host.docker.internal falla y estamos fuera de docker
    servers = [SQL_SERVER, 'localhost', '127.0.0.1', r'.\SQLEXPRESS', r'DELL_RL\SQLEXPRESS']
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

    print("--- DETALLE DE REGISTROS NO MIGRADOS (FALTANTES) ---\n")

    # 1. Buscar cuotas que no tienen cliente en la tabla Maestro
    print("1. Cuotas (Pagarés) sin Cliente válido en Maestro:")
    query_cuotas = """
    SELECT d.cuotaci, d.cuotacha, d.cuotanro, d.cuotaven, d.cuotamen
    FROM dbo.cuoterodet d
    LEFT JOIN dbo.Cliente c ON RTRIM(d.cuotaci) = RTRIM(c.cliruc)
    WHERE c.cliruc IS NULL OR RTRIM(c.cliruc) = ''
    ORDER BY d.cuotaci, d.cuotacha, d.cuotanro
    """
    ms_cursor.execute(query_cuotas)
    rows = ms_cursor.fetchall()
    
    if rows:
        print(f"{'CI/RUC':<15} | {'Chasis':<12} | {'Cuota':<5} | {'Vencim.':<12} | {'Monto':>10}")
        print("-" * 65)
        for row in rows:
            print(f"{str(row.cuotaci).strip():<15} | {str(row.cuotacha).strip():<12} | {row.cuotanro:<5} | {str(row.cuotaven)[:10]:<12} | {row.cuotamen:>10,.0f}")
        print(f"\nTotal cuotas faltantes: {len(rows)}")
    else:
        print("No se encontraron cuotas sin cliente.")

    # 2. Buscar cobros (pagos) que no tienen cliente en la tabla Maestro
    print("\n2. Pagos (Cobros) sin Cliente válido en Maestro:")
    # Nota: Los pagos vienen de Pagoparcial o de cuoterodet con fecha de pago.
    # El informe dice 97 pagos. 23 cuotas + algunos cobros parciales?
    
    query_pagos = """
    SELECT p.cuotacipp, p.cuotachapp, p.cuotanropp, p.cuotafpp, p.cuotapagp
    FROM dbo.Pagoparcial p
    LEFT JOIN dbo.Cliente c ON RTRIM(p.cuotacipp) = RTRIM(c.cliruc)
    WHERE c.cliruc IS NULL OR RTRIM(c.cliruc) = ''
    UNION
    SELECT d.cuotaci, d.cuotacha, d.cuotanro, d.cuotafp, d.cuotamen
    FROM dbo.cuoterodet d
    LEFT JOIN dbo.Cliente c ON RTRIM(d.cuotaci) = RTRIM(c.cliruc)
    WHERE (c.cliruc IS NULL OR RTRIM(c.cliruc) = '') 
    AND d.cuotafp > '1900-01-01'
    ORDER BY 1, 2, 3
    """
    ms_cursor.execute(query_pagos)
    rows_pagos = ms_cursor.fetchall()

    if rows_pagos:
        print(f"{'CI/RUC':<15} | {'Chasis':<12} | {'Cuota':<5} | {'Fecha Pago':<12} | {'Monto':>10}")
        print("-" * 65)
        for row in rows_pagos:
            print(f"{str(row[0]).strip():<15} | {str(row[1]).strip():<12} | {row[2]:<5} | {str(row[3])[:10]:<12} | {row[4]:>10,.0f}")
        print(f"\nTotal pagos faltantes: {len(rows_pagos)}")
    else:
        print("No se encontraron pagos sin cliente.")

    ms_conn.close()

if __name__ == "__main__":
    main()
