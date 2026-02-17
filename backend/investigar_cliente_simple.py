"""
Script simplificado para investigar el cliente 4933823
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

async def investigar_cliente():
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        try:
            print("\n" + "="*80)
            print("🔍 INVESTIGACIÓN: Cliente 4933823 - ADRIANA DEL CARMEN IRALA CABRERA")
            print("="*80 + "\n")
            
            # 1. Pagarés del cliente
            print("1️⃣ PAGARÉS DEL CLIENTE:")
            print("-" * 80)
            result = await session.execute(text("""
                SELECT 
                    pg.id_pagare,
                    pg.numero_pagare,
                    pg.numero_cuota,
                    pg.monto_cuota,
                    pg.saldo_pendiente,
                    pg.fecha_vencimiento,
                    e.nombre as estado,
                    pg.cancelado,
                    pg.id_venta,
                    COUNT(p.id_pago) as cantidad_pagos,
                    COALESCE(SUM(p.monto_pagado), 0) as total_pagado
                FROM playa.pagares pg
                JOIN playa.ventas v ON pg.id_venta = v.id_venta
                JOIN playa.clientes c ON v.id_cliente = c.id_cliente
                LEFT JOIN playa.estados e ON pg.id_estado = e.id_estado
                LEFT JOIN playa.pagos p ON pg.id_pagare = p.id_pagare
                WHERE c.numero_documento = '4933823'
                GROUP BY pg.id_pagare, pg.numero_pagare, pg.numero_cuota, 
                         pg.monto_cuota, pg.saldo_pendiente, pg.fecha_vencimiento,
                         e.nombre, pg.cancelado, pg.id_venta
                ORDER BY pg.numero_cuota DESC
                LIMIT 10
            """))
            pagares = result.fetchall()
            
            print(f"  Total de pagarés (mostrando últimos 10): {len(pagares)}")
            
            pagares_problema = []
            for pg in pagares:
                es_problema = (pg.estado == 'PAGADO' or pg.saldo_pendiente == 0 or pg.cancelado) and pg.cantidad_pagos == 0
                
                if es_problema:
                    pagares_problema.append(pg)
                    print(f"\n  🚨 PAGARÉ PROBLEMÁTICO #{pg.id_pagare}")
                else:
                    print(f"\n  ✅ Pagaré #{pg.id_pagare}")
                
                print(f"    Número: {pg.numero_pagare}")
                print(f"    Cuota: {pg.numero_cuota}")
                print(f"    Monto: Gs. {float(pg.monto_cuota):,.0f}")
                print(f"    Saldo: Gs. {float(pg.saldo_pendiente or 0):,.0f}")
                print(f"    Vencimiento: {pg.fecha_vencimiento}")
                print(f"    Estado: {pg.estado}")
                print(f"    Cancelado: {'SÍ' if pg.cancelado else 'NO'}")
                print(f"    Pagos registrados: {pg.cantidad_pagos}")
                print(f"    Total pagado: Gs. {float(pg.total_pagado):,.0f}")
                
                if es_problema:
                    print(f"    ⚠️  PROBLEMA: Marcado como PAGADO/Cancelado pero SIN pagos registrados")
            
            # 2. Detalle de pagos (si existen)
            print("\n2️⃣ DETALLE DE PAGOS:")
            print("-" * 80)
            result = await session.execute(text("""
                SELECT 
                    p.id_pago,
                    p.id_pagare,
                    pg.numero_pagare,
                    pg.numero_cuota,
                    p.numero_recibo,
                    p.fecha_pago,
                    p.monto_pagado,
                    p.mora_aplicada,
                    p.forma_pago
                FROM playa.pagos p
                JOIN playa.pagares pg ON p.id_pagare = pg.id_pagare
                JOIN playa.ventas v ON pg.id_venta = v.id_venta
                JOIN playa.clientes c ON v.id_cliente = c.id_cliente
                WHERE c.numero_documento = '4933823'
                ORDER BY pg.numero_cuota DESC, p.fecha_pago DESC
                LIMIT 10
            """))
            pagos = result.fetchall()
            
            if pagos:
                print(f"  Total de pagos (mostrando últimos 10): {len(pagos)}")
                for pago in pagos:
                    print(f"\n  Pago #{pago.id_pago}")
                    print(f"    Pagaré: {pago.numero_pagare} - Cuota {pago.numero_cuota} (ID: {pago.id_pagare})")
                    print(f"    Recibo: {pago.numero_recibo}")
                    print(f"    Fecha: {pago.fecha_pago}")
                    print(f"    Monto: Gs. {float(pago.monto_pagado):,.0f}")
                    print(f"    Mora: Gs. {float(pago.mora_aplicada or 0):,.0f}")
                    print(f"    Forma: {pago.forma_pago}")
            else:
                print("  ❌ NO HAY PAGOS REGISTRADOS para este cliente")
            
            # 3. Resumen
            print("\n" + "="*80)
            print("📊 RESUMEN")
            print("="*80)
            
            if pagares_problema:
                print(f"\n  🚨 PROBLEMA ENCONTRADO:")
                print(f"  Se encontraron {len(pagares_problema)} pagarés marcados como PAGADO")
                print(f"  pero SIN pagos registrados en la tabla playa.pagos")
                print(f"\n  IDs de pagarés problemáticos:")
                for pg in pagares_problema:
                    print(f"    - Pagaré #{pg.id_pagare} ({pg.numero_pagare}) - Cuota {pg.numero_cuota}")
                    print(f"      Estado: {pg.estado} | Cancelado: {'SÍ' if pg.cancelado else 'NO'} | Saldo: Gs. {float(pg.saldo_pendiente or 0):,.0f}")
                
                print(f"\n  💡 CAUSA PROBABLE:")
                print(f"    El trigger antiguo 'trg_actualizar_estado_pagare' marcó estos")
                print(f"    pagarés como PAGADO antes de ser eliminado, pero no había")
                print(f"    registros de pagos en la tabla playa.pagos.")
                
                print(f"\n  🔧 SOLUCIÓN:")
                print(f"    Usar el endpoint de diagnóstico para corregir estos pagarés:")
                print(f"    POST /playa/diagnostico/corregir-pagare/{{id_pagare}}")
                print(f"    Con acción: 'restaurar_saldo'")
            else:
                print(f"\n  ✅ No se encontraron inconsistencias")
            
            print("\n" + "="*80)
            
        except Exception as e:
            print(f"\n❌ ERROR: {str(e)}\n")
            import traceback
            traceback.print_exc()
        finally:
            await engine.dispose()

if __name__ == "__main__":
    asyncio.run(investigar_cliente())
