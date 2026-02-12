
import os
import pyodbc
from dotenv import load_dotenv

load_dotenv()

SQL_SERVER = os.getenv("SQL_SERVER", "localhost")
SQL_DATABASE = os.getenv("SQL_DATABASE", "Automotores")
SQL_USER = os.getenv("SQL_USER", "sa")
SQL_PASSWORD = os.getenv("SQL_PASSWORD", "Admin123")

def check_schema():
    try:
        server = "host.docker.internal"
        driver = "{ODBC Driver 18 for SQL Server}"
        conn_str = f"DRIVER={driver};SERVER={server};DATABASE={SQL_DATABASE};UID={SQL_USER};PWD={SQL_PASSWORD};TrustServerCertificate=yes"
        ms_conn = pyodbc.connect(conn_str)
        ms_cursor = ms_conn.cursor()
        
        print("\n--- Columnas en dbo.Pagoparcial ---")
        ms_cursor.execute("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Pagoparcial' AND TABLE_SCHEMA = 'dbo'")
        columns = ms_cursor.fetchall()
        for col in columns:
            print(col[0])

        print("\n--- Datos para CI 4878266, Cuota 16 ---")
        ms_cursor.execute("SELECT * FROM dbo.Pagoparcial WHERE TRIM(cuotacipp) = '4878266' AND cuotanropp = 16")
        row = ms_cursor.fetchone()
        if row:
            desc = [d[0] for d in ms_cursor.description]
            for i, val in enumerate(row):
                print(f"{desc[i]}: {val}")
        else:
            print("No se encontraron registros.")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_schema()
