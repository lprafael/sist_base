import pyodbc
import os
from dotenv import load_dotenv

load_dotenv()

SQL_SERVER = os.getenv('SQL_SERVER')
SQL_DATABASE = os.getenv('SQL_DATABASE')

conn_str = f'DRIVER={{SQL Server}};SERVER={SQL_SERVER};DATABASE={SQL_DATABASE};Trusted_Connection=yes;'

try:
    conn = pyodbc.connect(conn_str)
    cursor = conn.cursor()
    
    print("--- Tablas con 'Ref' ---")
    cursor.execute("SELECT name FROM sys.tables WHERE name LIKE '%Ref%'")
    for row in cursor.fetchall():
        print(row[0])
        
    print("\n--- Todas las tablas ---")
    cursor.execute("SELECT name FROM sys.tables")
    for row in cursor.fetchall():
        print(row[0])
        
    cursor.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
