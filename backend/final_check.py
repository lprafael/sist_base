
import os
import psycopg2
from dotenv import load_dotenv

load_dotenv('backend/.env')
DATABASE_URL = os.getenv("DATABASE_URL").replace('postgresql+asyncpg://', 'postgresql://').replace('host.docker.internal', 'localhost')
conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

print("Detalle de cuotas huerfanas por RUC:")
cur.execute("""
    SELECT TRIM(cuotaci), COUNT(*) 
    FROM migracion.st_cuoterodet 
    WHERE TRIM(cuotaci) NOT IN (SELECT numero_documento FROM playa.clientes WHERE numero_documento IS NOT NULL)
    GROUP BY 1
""")
rows = cur.fetchall()
for r in rows:
    print(f"RUC: {r[0]} | Cuotas: {r[1]}")

print("\nDetalle de pagos huerfanos por RUC:")
cur.execute("""
    SELECT ruc, COUNT(*) FROM (
        SELECT TRIM(cuotacipp) as ruc FROM migracion.st_pagoparcial
        UNION ALL
        SELECT TRIM(cuotaci) as ruc FROM migracion.st_cuoterodet WHERE EXTRACT(YEAR FROM cuotafp) > 1900
    ) t
    WHERE ruc NOT IN (SELECT numero_documento FROM playa.clientes WHERE numero_documento IS NOT NULL)
    GROUP BY 1
""")
rows = cur.fetchall()
for r in rows:
    print(f"RUC: {r[0]} | Pagos: {r[1]}")

conn.close()
