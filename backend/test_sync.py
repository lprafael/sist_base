import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

def test_sync_connection():
    # Use the DATABASE_URL and parse it manually for psycopg2
    # DATABASE_URL=postgresql+asyncpg://postgres:adminperalta@170.51.29.84:5432/BBDD_playa
    database_url = os.getenv("DATABASE_URL")
    
    # Remove the +asyncpg bit
    sync_url = database_url.replace("+asyncpg", "")
    print(f"Probando conexión síncrona a: {sync_url}")
    
    try:
        conn = psycopg2.connect(sync_url)
        print("CONEXIÓN EXITOSA!")
        cur = conn.cursor()
        cur.execute("SELECT version();")
        print(f"Versión: {cur.fetchone()[0]}")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error al conectar síncronamente: {e}")

if __name__ == "__main__":
    test_sync_connection()
