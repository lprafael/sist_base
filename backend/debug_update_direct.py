import psycopg2
import os

db_url = os.getenv("DATABASE_URL")
if db_url and db_url.startswith("postgresql+asyncpg://"):
    db_url = db_url.replace("postgresql+asyncpg://", "postgresql://")

try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    
    current_dist = "SAN LORENZO"
    target_barrio = "ESPIRITU SANTO"
    total, hombres, mujeres = 10924, 5396, 5528
    
    print(f"Buscando el registro antes de update...")
    cur.execute('SELECT "BARLO_DESC", "DIST_DESC_", poblacion_total FROM cartografia.barrios WHERE "BARLO_DESC" = \'ESPIRITU SANTO\' AND "DIST_DESC_" = \'SAN LORENZO\';')
    print(f"Pre-check: {cur.fetchone()}")

    print(f"\nEjecutando UPDATE...")
    cur.execute("""
            UPDATE cartografia.barrios 
            SET poblacion_total = %s, poblacion_hombres = %s, poblacion_mujeres = %s
            WHERE unaccent(trim(upper("DIST_DESC_"))) ILIKE %s 
            AND (
                unaccent(trim(upper("BARLO_DESC"))) = %s
                OR unaccent(trim(upper("BARLO_DESC"))) ILIKE %s
                OR %s ILIKE '%%' || unaccent(trim(upper("BARLO_DESC"))) || '%%'
            )
        """, (total, hombres, mujeres, f"%{current_dist.replace('.', '')}%", target_barrio, f"%{target_barrio}%", target_barrio))
    
    print(f"Rows affected: {cur.rowcount}")
    
    conn.commit()
    
    print(f"Verificando despues de update...")
    cur.execute('SELECT "BARLO_DESC", "DIST_DESC_", poblacion_total FROM cartografia.barrios WHERE "BARLO_DESC" = \'ESPIRITU SANTO\' AND "DIST_DESC_" = \'SAN LORENZO\';')
    print(f"Post-check: {cur.fetchone()}")

    conn.close()
except Exception as e:
    print(f"Error: {e}")
