import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv('DATABASE_URL').replace('postgresql+asyncpg://', 'postgresql://')
conn = psycopg2.connect(db_url)
cur = conn.cursor()

try:
    print("Vaciando logs de auditoria...")
    cur.execute("TRUNCATE TABLE sistema.logs_auditoria RESTART IDENTITY;")
    print("Vaciando logs de acceso...")
    cur.execute("TRUNCATE TABLE sistema.logs_acceso RESTART IDENTITY;")
    conn.commit()
    print("Logs vaciados exitosamente.")
except Exception as e:
    conn.rollback()
    print(f"Error: {e}")
finally:
    conn.close()
