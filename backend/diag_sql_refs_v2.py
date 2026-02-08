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
        print(f"TAB:{table}")
        cursor.execute(f"SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '{table}'")
        cols = [row[0] for row in cursor.fetchall()]
        print(f"COLS:{','.join(cols)}")
            
        cursor.execute(f"SELECT TOP 1 * FROM {table}")
        row = cursor.fetchone()
        if row:
            print(f"DATA:{list(row)}")
        print("-" * 20)
            
    cursor.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
