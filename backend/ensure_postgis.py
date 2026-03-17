import os
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv('DATABASE_URL').replace('postgresql+asyncpg://', 'postgresql://')

print(f"Connecting to: {db_url}")
try:
    conn = psycopg2.connect(db_url)
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cur = conn.cursor()
    
    cur.execute("SELECT extname FROM pg_extension WHERE extname = 'postgis'")
    if cur.fetchone():
        print("PostGIS is already enabled.")
    else:
        print("Enabling PostGIS...")
        cur.execute("CREATE EXTENSION IF NOT EXISTS postgis")
        print("PostGIS enabled successfully.")
        
    cur.execute("SELECT postgis_full_version()")
    print(f"Version: {cur.fetchone()[0][:100]}")
    conn.close()
except Exception as e:
    print(f"Error: {e}")
