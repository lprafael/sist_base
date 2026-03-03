import psycopg2
import os

db_url = os.getenv("DATABASE_URL")
if db_url and db_url.startswith("postgresql+asyncpg://"):
    db_url = db_url.replace("postgresql+asyncpg://", "postgresql://")

try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    
    # Buscar el barrio exacto que el usuario reporta
    print("--- CASO ESPIRITU SANTO ---")
    cur.execute('SELECT "BARLO_DESC", "DIST_DESC_", "DPTO", "DISTRITO", poblacion_total FROM cartografia.barrios WHERE "BARLO_DESC" ILIKE \'%ESPIRITU%\';')
    rows = cur.fetchall()
    if not rows:
        print("No se encontro ningun barrio con 'ESPIRITU' en BARLO_DESC")
        # Probar en DIST_DESC_ por si acaso
        cur.execute('SELECT "BARLO_DESC", "DIST_DESC_" FROM cartografia.barrios WHERE "DIST_DESC_" ILIKE \'%ESPIRITU%\';')
        rows = cur.fetchall()
        for r in rows: print(f"Encontrado en DIST_DESC_: Barrio: {r[0]}, Distrito: {r[1]}")
    else:
        for row in rows:
            print(f"Barrio: '{row[0]}' | Distrito: '{row[1]}' | DPTO: {row[2]} | DISTRITO: {row[3]} | Poblacion: {row[4]}")

    # Ver conteo total con poblacion > 0
    cur.execute('SELECT COUNT(*) FROM cartografia.barrios WHERE poblacion_total > 0;')
    count = cur.fetchone()[0]
    print(f"\nTotal barrios con poblacion > 0: {count}")

    conn.close()
except Exception as e:
    print(f"Error: {e}")
