
import os
import psycopg2
from dotenv import load_dotenv

def main():
    if os.path.exists('.env'): load_dotenv('.env')
    elif os.path.exists('backend/.env'): load_dotenv('backend/.env')
    else: load_dotenv()

    DATABASE_URL = os.getenv("DATABASE_URL").replace('postgresql+asyncpg://', 'postgresql://').replace('host.docker.internal', 'localhost')
    
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()

    print("--- DETALLE DE REGISTROS NO MIGRADOS (FALTANTES) - DESDE STAGING ---")

    # 1. Cuotas en staging que no tienen cliente en playa.clientes
    print("\n1. Cuotas (Pagarés) sin Cliente válido en Destino:")
    cursor.execute("""
        SELECT DISTINCT d.cuotaci, d.cuotacha, COUNT(*) as cantidad
        FROM migracion.st_cuoterodet d
        LEFT JOIN playa.clientes c ON TRIM(d.cuotaci) = c.numero_documento
        WHERE c.id_cliente IS NULL
        GROUP BY d.cuotaci, d.cuotacha
        ORDER BY d.cuotaci
    """)
    rows = cursor.fetchall()
    
    if rows:
        print(f"{'CI/RUC':<15} | {'Chasis':<25} | {'Cuotas Faltantes':<5}")
        print("-" * 60)
        total_cuotas = 0
        for row in rows:
            print(f"{str(row[0]).strip():<15} | {str(row[1]).strip():<25} | {row[2]:<5}")
            total_cuotas += row[2]
        print(f"\nTotal cuotas faltantes: {total_cuotas}")
    else:
        print("No se encontraron cuotas sin cliente.")

    # 2. Pagos en staging que no tienen cliente en playa.clientes
    print("\n2. Pagos (Cobros) sin Cliente válido en Destino:")
    cursor.execute("""
        SELECT COUNT(*) FROM (
            SELECT p.cuotacipp, p.cuotachapp, p.cuotanropp
            FROM migracion.st_pagoparcial p
            LEFT JOIN playa.clientes c ON TRIM(p.cuotacipp) = c.numero_documento
            WHERE c.id_cliente IS NULL
            UNION ALL
            SELECT d.cuotaci, d.cuotacha, d.cuotanro
            FROM migracion.st_cuoterodet d
            LEFT JOIN playa.clientes c ON TRIM(d.cuotaci) = c.numero_documento
            WHERE c.id_cliente IS NULL AND EXTRACT(YEAR FROM d.cuotafp) > 1900
        ) t
    """)
    cnt_pagos = cursor.fetchone()[0]
    print(f"Total pagos faltantes estimados: {cnt_pagos}")

    # Detalle de clientes afectados
    print("\n3. Clientes con RUC inválido u omitido en Maestro que causan faltantes:")
    cursor.execute("""
        SELECT DISTINCT TRIM(d.cuotaci)
        FROM migracion.st_cuoterodet d
        LEFT JOIN playa.clientes c ON TRIM(d.cuotaci) = c.numero_documento
        WHERE c.id_cliente IS NULL
    """)
    rucs = cursor.fetchall()
    for r in rucs:
        print(f"- RUC: {r[0]}")

    conn.close()

if __name__ == "__main__":
    main()
