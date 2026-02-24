import os
import psycopg2
from dotenv import load_dotenv

print("Cargando dotenv...")
load_dotenv('backend/.env')
print("Obteniendo URL...")
url = os.getenv('DATABASE_URL')
print(f"URL: {url[:20]}...")
if url.startswith("postgresql+asyncpg"):
    url = url.replace("postgresql+asyncpg", "postgresql", 1)

try:
    print("Conectando a DB...")
    conn = psycopg2.connect(url)
    cur = conn.cursor()
    cur.execute("SELECT indexname FROM pg_indexes WHERE indexname LIKE 'idx_%%'")
    indexes = cur.fetchall()
    print("Indices encontrados:")
    for idx in indexes:
        print(f" - {idx[0]}")
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
