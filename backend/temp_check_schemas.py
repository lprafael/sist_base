import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()
url = os.getenv('DATABASE_URL').replace('postgresql+asyncpg', 'postgresql')
if 'host.docker.internal' in url:
    url = url.replace('host.docker.internal', 'localhost')
conn = psycopg2.connect(url)
cur = conn.cursor()
cur.execute("SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'torneos%'")
for row in cur.fetchall():
    print(row[0])
