
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

    driver = "{ODBC Driver 18 for SQL Server}"
    extra = ";TrustServerCertificate=yes"
    conn_str = f"DRIVER={driver};SERVER={SQL_SERVER};DATABASE={SQL_DATABASE};UID={SQL_USER};PWD={SQL_PASSWORD}{extra}" if not SQL_TRUSTED else f"DRIVER={driver};SERVER={SQL_SERVER};DATABASE={SQL_DATABASE};Trusted_Connection=yes{extra}"
    
    ms_conn = pyodbc.connect(conn_str)
    ms_cursor = ms_conn.cursor()

    # Revisar cabecera de cuotero para Ruben 785512
    ms_cursor.execute("SELECT cuotaci, cuotacha, cuotanrof, cuotaent FROM dbo.cuotero WHERE cuotaci = '785512'")
    row = ms_cursor.fetchone()
    print(f"Orphan Header: {row}")
    # En la ejecución anterior vimos: cuotaci=785512, cuotacha=NZT2400014504, cuotanrof='  ', monto=67000000

    # ¿Existe el chasis NZT2400014504 en Productos?
    ms_cursor.execute("SELECT procodigo, prodescri FROM dbo.Productos WHERE prochapa LIKE '%NZT2400014504%' OR procodigo LIKE '%NZT2400014504%'")
    prod = ms_cursor.fetchone()
    print(f"Product related: {prod}")

    ms_conn.close()

if __name__ == "__main__":
    main()
