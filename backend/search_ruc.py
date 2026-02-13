
import os
import pyodbc
from dotenv import load_dotenv

def main():
    load_dotenv('backend/.env')
    SQL_SERVER = os.getenv("SQL_SERVER")
    SQL_DATABASE = os.getenv("SQL_DATABASE")
    SQL_TRUSTED = os.getenv("SQL_TRUSTED_CONNECTION", "no").lower() in ("1", "true", "yes")
    SQL_USER = os.getenv("SQL_USER")
    SQL_PASSWORD = os.getenv("SQL_PASSWORD")

    driver = "{ODBC Driver 18 for SQL Server}"
    extra = ";TrustServerCertificate=yes"
    srv = SQL_SERVER
    if SQL_TRUSTED:
        conn_str = f"DRIVER={driver};SERVER={srv};DATABASE={SQL_DATABASE};Trusted_Connection=yes{extra}"
    else:
        conn_str = f"DRIVER={driver};SERVER={srv};DATABASE={SQL_DATABASE};UID={SQL_USER};PWD={SQL_PASSWORD}{extra}"
    
    ms_conn = pyodbc.connect(conn_str)
    ms_cursor = ms_conn.cursor()

    ruc_to_find = '3558002'
    print(f"Buscando RUC '{ruc_to_find}' en SQL Server...")
    
    ms_cursor.execute(f"SELECT cliruc, clinombre FROM dbo.Cliente WHERE cliruc LIKE ?", (f'%{ruc_to_find}%',))
    rows = ms_cursor.fetchall()
    
    if rows:
        for row in rows:
            print(f"Encontrado: cliruc='{row[0]}', clinombre='{row[1]}'")
    else:
        print("No se encontró en dbo.Cliente.")

    ms_conn.close()

if __name__ == "__main__":
    main()
