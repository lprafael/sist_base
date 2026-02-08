import psycopg2
import os
import datetime
from dotenv import load_dotenv

load_dotenv()

conn = psycopg2.connect(os.getenv('DATABASE_URL').replace('postgresql+asyncpg://', 'postgresql://'))
cur = conn.cursor()

hoy = datetime.date.today()
print(f"Hoy: {hoy}")

query = """
SET search_path TO playa, public;
SELECT 
    CASE 
        WHEN fecha_vencimiento >= %s THEN 'Al día'
        WHEN fecha_vencimiento >= %s - INTERVAL '30 days' THEN '1-30 días'
        WHEN fecha_vencimiento >= %s - INTERVAL '60 days' THEN '31-60 días'
        ELSE '61+ días'
    END as rango,
    SUM(saldo_pendiente) as total,
    COUNT(*) as cantidad
FROM pagares p
JOIN ventas v ON p.id_venta = v.id_venta
WHERE p.estado IN ('PENDIENTE', 'VENCIDO', 'PARCIAL')
  AND v.estado_venta != 'ANULADA'
GROUP BY rango;
"""

try:
    cur.execute(query, (hoy, hoy, hoy))
    results = cur.fetchall()
    print("Resultados de Envejecimiento:")
    for row in results:
        print(f"Rango: {row[0]}, Total: {row[1]}, Cantidad: {row[2]}")
        
    cur.execute("SELECT MIN(fecha_vencimiento), MAX(fecha_vencimiento) FROM pagares WHERE estado != 'PAGADO'")
    rango_fechas = cur.fetchone()
    print(f"Rango de vencimientos pendientes: {rango_fechas}")

except Exception as e:
    print(f"Error: {e}")
finally:
    cur.close()
    conn.close()
