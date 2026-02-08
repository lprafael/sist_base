import os
import psycopg2
from dotenv import load_dotenv
from urllib.parse import urlparse

load_dotenv()

db_url = os.getenv("DATABASE_URL").replace('postgresql+asyncpg://', 'postgresql://')
parsed = urlparse(db_url)

try:
    conn = psycopg2.connect(
        host=parsed.hostname,
        port=parsed.port or 5432,
        database=parsed.path[1:],
        user=parsed.username,
        password=parsed.password
    )
    conn.autocommit = True
    cursor = conn.cursor()
    
    with open('update_ventas_mora.sql', 'r') as f:
        sql = f.read()
    
    cursor.execute(sql)
    print("✅ Migración exitosa: Campos de mora agregados a playa.ventas")
    
    cursor.close()
    conn.close()
except Exception as e:
    print(f"❌ Error: {e}")
