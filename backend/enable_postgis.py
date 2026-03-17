import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv('DATABASE_URL').replace('postgresql+asyncpg://', 'postgresql://')

print(f"Connecting to: {db_url}")
try:
    conn = psycopg2.connect(db_url)
    conn.autocommit = True
    cur = conn.cursor()
    
    # Check current DB
    cur.execute("SELECT current_database()")
    db_name = cur.fetchone()[0]
    print(f"Database: {db_name}")
    
    # Enable PostGIS
    print("Enabling PostGIS...")
    try:
        cur.execute("CREATE EXTENSION IF NOT EXISTS postgis")
        print("SUCCESS: PostGIS extension enabled.")
    except Exception as e:
        print(f"ERROR enabling PostGIS: {e}")
        
    cur.execute("SELECT postgis_full_version()")
    print(f"PostGIS Version: {cur.fetchone()[0][:80]}...")
    
    conn.close()
except Exception as e:
    print(f"CRITICAL ERROR: {e}")
