import pyodbc
import os
from dotenv import load_dotenv

load_dotenv()

SQL_SERVER = os.getenv('SQL_SERVER')
SQL_DATABASE = os.getenv('SQL_DATABASE')

conn_str = f'DRIVER={{SQL Server}};SERVER={SQL_SERVER};DATABASE={SQL_DATABASE};Trusted_Connection=yes;'

tables = ['Clientecgarefla', 'Clientecgrefper', 'Clienteclireflab', 'ClientecliRefPer']

try:
    conn = pyodbc.connect(conn_str)
    cursor = conn.cursor()
    
    for table in tables:
        print(f"\n--- Estructura de {table} ---")
        cursor.execute(f"SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '{table}'")
        for row in cursor.fetchall():
            print(f"{row[0]}: {row[1]}")
            
        print(f"\n--- Primeros 2 datos de {table} ---")
        cursor.execute(f"SELECT TOP 2 * FROM {table}")
        columns = [column[0] for column in cursor.description]
        rows = cursor.fetchall()
        for row in rows:
            print(dict(zip(columns, row)))
            
    cursor.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
