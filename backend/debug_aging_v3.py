import psycopg2
import os
import datetime
import json
from dotenv import load_dotenv

load_dotenv()

conn = psycopg2.connect(os.getenv('DATABASE_URL').replace('postgresql+asyncpg://', 'postgresql://'))
cur = conn.cursor()

hoy = datetime.date.today()

query = """
SET search_path TO playa, public;
SELECT 
    CASE 
        WHEN fecha_vencimiento >= %s THEN 'Al día'
        WHEN fecha_vencimiento >= %s::date - INTERVAL '30 days' THEN '1-30 días'
        WHEN fecha_vencimiento >= %s::date - INTERVAL '60 days' THEN '31-60 días'
        ELSE '61+ días'
    END as rango,
    SUM(saldo_pendiente) as total
FROM pagares p
JOIN ventas v ON p.id_venta = v.id_venta
WHERE p.estado IN ('PENDIENTE', 'VENCIDO', 'PARCIAL')
  AND v.estado_venta != 'ANULADA'
GROUP BY 1;
"""

try:
    cur.execute(query, (hoy, hoy, hoy))
    results = cur.fetchall()
    data = {row[0]: float(row[1]) for row in results}
    with open('aging_results.json', 'w') as f:
        json.dump(data, f)
    print("DONE")

except Exception as e:
    print(f"Error: {e}")
finally:
    cur.close()
    conn.close()
