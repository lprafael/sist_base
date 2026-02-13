
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

    print("--- BUSCANDO CUOTEROS SIN VENTA ASOCIADA ---")
    
    # Contar cuoteros con cuotanrof vacio o que no existe en ventas
    # Primero vacíos
    ms_cursor.execute("SELECT COUNT(*) FROM dbo.cuotero WHERE cuotanrof IS NULL OR RTRIM(LTRIM(cuotanrof)) = ''")
    cnt_vacio = ms_cursor.fetchone()[0]
    
    # Luego los que tienen algo pero no existe en ventas
    # Nota: Usamos una subconsulta para excluir los vacíos ya contados
    ms_cursor.execute("""
        SELECT COUNT(*) 
        FROM dbo.cuotero c
        WHERE RTRIM(LTRIM(c.cuotanrof)) <> '' 
        AND NOT EXISTS (SELECT 1 FROM dbo.ventas v WHERE v.factnro = TRY_CAST(c.cuotanrof AS NUMERIC))
    """)
    # El TRY_CAST puede fallar si cuotanrof no es numerico, pero suele serlo segun migration_execute.sql
    try:
        cnt_invalid = ms_cursor.fetchone()[0]
    except:
        cnt_invalid = "Error al verificar"

    print(f"Cuoteros con cuotanrof VACÍO: {cnt_vacio}")
    print(f"Cuoteros con cuotanrof que NO existe en ventas: {cnt_invalid}")

    # Ver algunos ejemplos de RUCs afectados
    ms_cursor.execute("SELECT DISTINCT cuotaci FROM dbo.cuotero WHERE cuotanrof IS NULL OR RTRIM(LTRIM(cuotanrof)) = ''")
    rucs = ms_cursor.fetchall()
    print(f"RUCs afectados por falta de cabecera: {[r[0].strip() for r in rucs[:10]]}")

    ms_conn.close()

if __name__ == "__main__":
    main()
