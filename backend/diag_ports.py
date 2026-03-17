import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
base_url = os.getenv('DATABASE_URL').replace('postgresql+asyncpg://', 'postgresql://')
# Remove port if exists
if ':' in base_url.split('@')[1]:
    base_url = base_url.rsplit(':', 1)[0]
else:
    # If no port, it might be default 5432, let's just use the parts
    pass

ports = [5432, 5433, 5434]
for port in ports:
    url = f"{base_url}:{port}/SIGEL"
    print(f"\n--- Checking Port {port} ---")
    try:
        engine = create_engine(url, connect_args={'connect_timeout': 2})
        with engine.connect() as conn:
            print(f"Connected to {url}")
            res = conn.execute(text("SELECT count(*) FROM information_schema.tables WHERE table_schema = 'cartografia'"))
            print(f"Tables in 'cartografia': {res.scalar()}")
            
            try:
                postgis = conn.execute(text("SELECT postgis_full_version()")).scalar()
                print(f"PostGIS version: {postgis[:50]}...")
            except:
                print("PostGIS: NOT INSTALLED")
                
            if res.scalar() > 0:
                barrios = conn.execute(text("SELECT count(*) FROM cartografia.barrios")).scalar()
                print(f"Barrios count: {barrios}")
    except Exception as e:
        print(f"Could not connect to port {port}: {str(e)[:100]}")
