
import os
import pyodbc
import psycopg2
from dotenv import load_dotenv
from urllib.parse import urlparse

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL").replace('postgresql+asyncpg://', 'postgresql://')
parsed = urlparse(DATABASE_URL)

SQL_SERVER = os.getenv("SQL_SERVER", "localhost")
SQL_DATABASE = os.getenv("SQL_DATABASE", "Automotores")
SQL_USER = os.getenv("SQL_USER", "sa")
SQL_PASSWORD = os.getenv("SQL_PASSWORD", "Admin123")

def fix_migration():
    print("=== INICIANDO CORRECCIÓN DE MONTOS DE PAGOS PARCIALES ===")
    
    try:
        # 1. Conectar a PostgreSQL
        pg_conn = psycopg2.connect(
            host="host.docker.internal",
            port=parsed.port or 5432,
            database=parsed.path[1:],
            user=parsed.username,
            password=parsed.password
        )
        pg_conn.autocommit = True
        pg_cursor = pg_conn.cursor()

        # 2. Conectar a SQL Server
        server = "host.docker.internal"
        driver = "{ODBC Driver 18 for SQL Server}"
        conn_str = f"DRIVER={driver};SERVER={server};DATABASE={SQL_DATABASE};UID={SQL_USER};PWD={SQL_PASSWORD};TrustServerCertificate=yes"
        ms_conn = pyodbc.connect(conn_str)
        ms_cursor = ms_conn.cursor()

        # 3. Obtener los pagos reales de Pagoparcial
        print("📥 Obteniendo montos reales de SQL Server (Pagoparcial)...")
        ms_cursor.execute("""
            SELECT cuotacipp, cuotachapp, cuotanropp, cuotapagp, cuotafpp
            FROM dbo.Pagoparcial
        """)
        rows = ms_cursor.fetchall()
        print(f"Se encontraron {len(rows)} registros para verificar.")

        actualizados = 0
        for row in rows:
            ci = row[0].strip()
            chasis = row[1].strip()
            nro_cuota = row[2]
            monto_real = float(row[3])
            fecha_pago = row[4]

            # Buscar el ID del pagaré en Postgres para este cliente y cuota
            # Unimos por cliente y producto para estar seguros
            pg_cursor.execute("""
                SELECT p.id_pagare, p.monto_cuota
                FROM playa.pagares p
                JOIN playa.ventas v ON p.id_venta = v.id_venta
                JOIN playa.clientes c ON v.id_cliente = c.id_cliente
                JOIN playa.productos pr ON v.id_producto = pr.id_producto
                WHERE TRIM(c.numero_documento) = %s 
                AND (TRIM(pr.chasis) = %s OR TRIM(pr.codigo_interno) = %s)
                AND p.numero_cuota = %s
            """, (ci, chasis, chasis, nro_cuota))
            
            res = pg_cursor.fetchone()
            if res:
                id_pagare = res[0]
                monto_cuota = float(res[1])

                # Actualizar el pago en playa.pagos que sea tipo 'PP' (Pago Parcial)
                pg_cursor.execute("""
                    UPDATE playa.pagos 
                    SET monto_pagado = %s 
                    WHERE id_pagare = %s AND numero_recibo LIKE 'PP-%%'
                    RETURNING id_pago
                """, (monto_real, id_pagare))
                
                if pg_cursor.fetchone():
                    # El trigger trg_actualizar_estado_pagare se activará solo en INSERT.
                    # Como es un UPDATE, recalculamos manualmente el pagaré aquí:
                    pg_cursor.execute("""
                        SELECT COALESCE(SUM(monto_pagado), 0) FROM playa.pagos WHERE id_pagare = %s
                    """, (id_pagare,))
                    total_pagado = float(pg_cursor.fetchone()[0])
                    
                    nuevo_saldo = max(0, monto_cuota - total_pagado)
                    nuevo_estado = 'PAGADO' if nuevo_saldo <= 0 else ('PARCIAL' if total_pagado > 0 else 'PENDIENTE')
                    
                    pg_cursor.execute("""
                        UPDATE playa.pagares 
                        SET saldo_pendiente = %s, estado = %s 
                        WHERE id_pagare = %s
                    """, (nuevo_saldo, nuevo_estado, id_pagare))
                    
                    actualizados += 1

        print(f"\n✅ Proceso terminado. Se actualizaron {actualizados} pagos parciales.")
        
        ms_cursor.close()
        ms_conn.close()
        pg_cursor.close()
        pg_conn.close()

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    fix_migration()
