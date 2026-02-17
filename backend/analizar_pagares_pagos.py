"""
Script para analizar la relación entre pagares y pagos, y verificar los estados
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

async def analizar_relaciones():
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        try:
            print("\n" + "="*80)
            print("📊 ANÁLISIS DE RELACIONES: PAGARÉS Y PAGOS")
            print("="*80 + "\n")
            
            # 1. Ver estados disponibles
            print("1️⃣ ESTADOS DISPONIBLES EN playa.estados:")
            print("-" * 80)
            result = await session.execute(text("""
                SELECT id_estado, nombre, descripcion, color_hex, activo
                FROM playa.estados
                ORDER BY id_estado
            """))
            estados = result.fetchall()
            
            for e in estados:
                activo_str = "✅ ACTIVO" if e.activo else "❌ INACTIVO"
                print(f"  ID: {e.id_estado} | {e.nombre:15} | {e.descripcion or 'Sin descripción':30} | {e.color_hex or 'Sin color':10} | {activo_str}")
            
            # 2. Verificar relación pagares-pagos
            print("\n2️⃣ VERIFICACIÓN DE RELACIÓN pagares ↔ pagos:")
            print("-" * 80)
            result = await session.execute(text("""
                SELECT 
                    COUNT(DISTINCT pg.id_pagare) as total_pagares,
                    COUNT(DISTINCT CASE WHEN p.id_pago IS NOT NULL THEN pg.id_pagare END) as pagares_con_pagos,
                    COUNT(DISTINCT CASE WHEN p.id_pago IS NULL THEN pg.id_pagare END) as pagares_sin_pagos,
                    COUNT(p.id_pago) as total_pagos
                FROM playa.pagares pg
                LEFT JOIN playa.pagos p ON pg.id_pagare = p.id_pagare
            """))
            stats = result.fetchone()
            
            print(f"  Total de Pagarés: {stats.total_pagares}")
            print(f"  Pagarés con pagos registrados: {stats.pagares_con_pagos}")
            print(f"  Pagarés sin pagos: {stats.pagares_sin_pagos}")
            print(f"  Total de pagos registrados: {stats.total_pagos}")
            
            # 3. Verificar integridad de la relación
            print("\n3️⃣ INTEGRIDAD DE LA RELACIÓN:")
            print("-" * 80)
            result = await session.execute(text("""
                -- Verificar si hay pagos huérfanos (sin pagaré)
                SELECT COUNT(*) as pagos_huerfanos
                FROM playa.pagos p
                LEFT JOIN playa.pagares pg ON p.id_pagare = pg.id_pagare
                WHERE pg.id_pagare IS NULL
            """))
            huerfanos = result.scalar()
            
            if huerfanos > 0:
                print(f"  ⚠️  ADVERTENCIA: {huerfanos} pagos sin pagaré asociado (huérfanos)")
            else:
                print(f"  ✅ Todos los pagos tienen un pagaré asociado")
            
            # 4. Distribución de estados en pagarés
            print("\n4️⃣ DISTRIBUCIÓN DE ESTADOS EN PAGARÉS:")
            print("-" * 80)
            result = await session.execute(text("""
                SELECT 
                    e.nombre as estado,
                    COUNT(pg.id_pagare) as cantidad,
                    ROUND(COUNT(pg.id_pagare) * 100.0 / SUM(COUNT(pg.id_pagare)) OVER (), 2) as porcentaje
                FROM playa.pagares pg
                LEFT JOIN playa.estados e ON pg.id_estado = e.id_estado
                GROUP BY e.nombre, e.id_estado
                ORDER BY cantidad DESC
            """))
            distribucion = result.fetchall()
            
            for d in distribucion:
                estado_nombre = d.estado or "SIN ESTADO"
                barra = "█" * int(d.porcentaje / 2)
                print(f"  {estado_nombre:15} | {d.cantidad:6} pagarés | {d.porcentaje:6.2f}% | {barra}")
            
            # 5. Ejemplo de pagarés con sus pagos
            print("\n5️⃣ EJEMPLO: PAGARÉS CON SUS PAGOS (primeros 5):")
            print("-" * 80)
            result = await session.execute(text("""
                SELECT 
                    pg.id_pagare,
                    pg.numero_pagare,
                    pg.numero_cuota,
                    pg.monto_cuota,
                    pg.saldo_pendiente,
                    e.nombre as estado,
                    pg.cancelado,
                    COUNT(p.id_pago) as cantidad_pagos,
                    COALESCE(SUM(p.monto_pagado), 0) as total_pagado
                FROM playa.pagares pg
                LEFT JOIN playa.estados e ON pg.id_estado = e.id_estado
                LEFT JOIN playa.pagos p ON pg.id_pagare = p.id_pagare
                GROUP BY pg.id_pagare, pg.numero_pagare, pg.numero_cuota, 
                         pg.monto_cuota, pg.saldo_pendiente, e.nombre, pg.cancelado
                ORDER BY pg.id_pagare DESC
                LIMIT 5
            """))
            ejemplos = result.fetchall()
            
            for ej in ejemplos:
                print(f"\n  Pagaré #{ej.id_pagare} - {ej.numero_pagare} - Cuota {ej.numero_cuota}")
                print(f"    Monto Cuota: Gs. {float(ej.monto_cuota):,.0f}")
                print(f"    Saldo Pendiente: Gs. {float(ej.saldo_pendiente or 0):,.0f}")
                print(f"    Estado: {ej.estado} | Cancelado: {'SÍ' if ej.cancelado else 'NO'}")
                print(f"    Pagos registrados: {ej.cantidad_pagos} | Total pagado: Gs. {float(ej.total_pagado):,.0f}")
                
                # Mostrar detalle de pagos
                if ej.cantidad_pagos > 0:
                    result_pagos = await session.execute(text("""
                        SELECT fecha_pago, monto_pagado, numero_recibo, forma_pago
                        FROM playa.pagos
                        WHERE id_pagare = :id_pagare
                        ORDER BY fecha_pago DESC
                    """), {"id_pagare": ej.id_pagare})
                    pagos = result_pagos.fetchall()
                    
                    for i, pago in enumerate(pagos, 1):
                        print(f"      Pago {i}: {pago.fecha_pago} | Gs. {float(pago.monto_pagado):,.0f} | Recibo: {pago.numero_recibo} | {pago.forma_pago}")
            
            # 6. Verificar consistencia de estados
            print("\n6️⃣ VERIFICACIÓN DE CONSISTENCIA DE ESTADOS:")
            print("-" * 80)
            result = await session.execute(text("""
                SELECT 
                    pg.id_pagare,
                    pg.numero_pagare,
                    pg.monto_cuota,
                    pg.saldo_pendiente,
                    e.nombre as estado_actual,
                    pg.cancelado,
                    COALESCE(SUM(p.monto_pagado), 0) as total_pagado,
                    COUNT(p.id_pago) as cantidad_pagos,
                    CASE 
                        WHEN COALESCE(SUM(p.monto_pagado), 0) >= pg.monto_cuota THEN 'PAGADO'
                        WHEN COALESCE(SUM(p.monto_pagado), 0) > 0 THEN 'PARCIAL'
                        ELSE 'PENDIENTE'
                    END as estado_calculado
                FROM playa.pagares pg
                LEFT JOIN playa.estados e ON pg.id_estado = e.id_estado
                LEFT JOIN playa.pagos p ON pg.id_pagare = p.id_pagare
                GROUP BY pg.id_pagare, pg.numero_pagare, pg.monto_cuota, 
                         pg.saldo_pendiente, e.nombre, pg.cancelado
                HAVING e.nombre != CASE 
                    WHEN COALESCE(SUM(p.monto_pagado), 0) >= pg.monto_cuota THEN 'PAGADO'
                    WHEN COALESCE(SUM(p.monto_pagado), 0) > 0 THEN 'PARCIAL'
                    ELSE 'PENDIENTE'
                END
                LIMIT 10
            """))
            inconsistencias = result.fetchall()
            
            if inconsistencias:
                print(f"  ⚠️  Se encontraron {len(inconsistencias)} pagarés con estados inconsistentes:")
                for inc in inconsistencias:
                    print(f"\n    Pagaré #{inc.id_pagare} - {inc.numero_pagare}")
                    print(f"      Estado actual: {inc.estado_actual}")
                    print(f"      Estado calculado: {inc.estado_calculado}")
                    print(f"      Total pagado: Gs. {float(inc.total_pagado):,.0f} de Gs. {float(inc.monto_cuota):,.0f}")
            else:
                print(f"  ✅ Todos los estados son consistentes con los pagos registrados")
            
            print("\n" + "="*80)
            print("✅ ANÁLISIS COMPLETADO")
            print("="*80 + "\n")
            
        except Exception as e:
            print(f"\n❌ ERROR: {str(e)}\n")
            raise
        finally:
            await engine.dispose()

if __name__ == "__main__":
    asyncio.run(analizar_relaciones())
