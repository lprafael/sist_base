import psycopg2
import os

db_url = os.getenv("DATABASE_URL")
if db_url and db_url.startswith("postgresql+asyncpg://"):
    db_url = db_url.replace("postgresql+asyncpg://", "postgresql://")

try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    # Buscar barrios que contengan ESPIRITU o algo similar para ver como estan escritos
    print("Buscando barrios con 'ESPIRITU'...")
    cur.execute('SELECT "BARLO_DESC", "DIST_DESC_", poblacion_total FROM cartografia.barrios WHERE "BARLO_DESC" ILIKE \'%ESPIRITU%\' LIMIT 10;')
    rows = cur.fetchall()
    for row in rows:
        print(f"Barrio: '{row[0]}' | Distrito: '{row[1]}' | Poblacion: {row[2]}")
    
    # Tambien ver un par de barrios al azar de Central para ver el formato
    print("\nEjemplos de barrios en Central:")
    cur.execute('SELECT "BARLO_DESC", "DIST_DESC_" FROM cartografia.barrios WHERE "DPTO" = \'11\' LIMIT 20;')
    rows = cur.fetchall()
    for row in rows:
        print(f"Barrio: '{row[0]}' | Distrito: '{row[1]}'")
        
    conn.close()
except Exception as e:
    print(f"Error: {e}")
