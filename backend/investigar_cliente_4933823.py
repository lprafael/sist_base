"""
Script para investigar el caso específico del cliente 4933823
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
            
            # 1. Información del cliente
            print("1️⃣ INFORMACIÓN DEL CLIENTE:")
            print("-" * 80)
            result = await session.execute(text("""
                SELECT id_cliente, nombre, apellido, numero_documento, telefono
                FROM playa.clientes
                WHERE numero_documento = '4933823'
            """))
            cliente = result.fetchone()
            
            if cliente:
                print(f"  ID Cliente: {cliente.id_cliente}")
                print(f"  Nombre: {cliente.nombre} {cliente.apellido}")
                print(f"  Documento: {cliente.numero_documento}")
                print(f"  Teléfono: {cliente.telefono or 'N/A'}")
            else:
                print("  ❌ Cliente no encontrado")
                return
            
            # 2. Ventas del cliente
            print("\n2️⃣ VENTAS DEL CLIENTE:")
            print("-" * 80)
            result = await session.execute(text("""
                SELECT 
                    v.id_venta,
                    v.numero_venta,
                    v.fecha_venta,
                    v.monto_cuota,
                    v.cantidad_cuotas,
                    p.marca,
                    p.modelo,
                    p.anio
                FROM playa.ventas v
                JOIN playa.productos p ON v.id_producto = p.id_producto
                WHERE v.id_cliente = :id_cliente
                ORDER BY v.fecha_venta DESC
            """), {"id_cliente": cliente.id_cliente})
            ventas = result.fetchall()
            
            print(f"  Total de ventas: {len(ventas)}")
            for v in ventas:
                print(f"\n  Venta #{v.id_venta} - {v.numero_venta}")
                print(f"    Fecha: {v.fecha_venta}")
                print(f"    Vehículo: {v.marca} {v.modelo} {v.anio}")
                print(f"    Monto Cuota: Gs. {float(v.monto_cuota):,.0f}")
                print(f"    Cuotas: {v.cantidad_cuotas}")
            
            # 3. Pagarés del cliente
            print("\n3️⃣ PAGARÉS DEL CLIENTE:")
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
                LEFT JOIN playa.estados e ON pg.id_estado = e.id_estado
                LEFT JOIN playa.pagos p ON pg.id_pagare = p.id_pagare
                WHERE v.id_cliente = :id_cliente
                GROUP BY pg.id_pagare, pg.numero_pagare, pg.numero_cuota, 
                         pg.monto_cuota, pg.saldo_pendiente, pg.fecha_vencimiento,
                         e.nombre, pg.cancelado, pg.id_venta
                ORDER BY pg.fecha_vencimiento DESC
            """), {"id_cliente": cliente.id_cliente})
            pagares = result.fetchall()
            
            print(f"  Total de pagarés: {len(pagares)}")
            
            pagares_problema = []
            for pg in pagares:
                es_problema = (pg.estado == 'PAGADO' or pg.saldo_pendiente == 0 or pg.cancelado) and pg.cantidad_pagos == 0
                
                if es_problema:
                    pagares_problema.append(pg)
                    print(f"\n  ⚠️  PAGARÉ PROBLEMÁTICO #{pg.id_pagare}")
                else:
                    print(f"\n  Pagaré #{pg.id_pagare}")
                
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
                    print(f"    🚨 PROBLEMA: Marcado como PAGADO/Cancelado pero SIN pagos registrados")
            
            # 4. Detalle de pagos (si existen)
            print("\n4️⃣ DETALLE DE TODOS LOS PAGOS:")
            print("-" * 80)
            result = await session.execute(text("""
                SELECT 
                    p.id_pago,
                    p.id_pagare,
                    pg.numero_pagare,
                    p.numero_recibo,
                    p.fecha_pago,
                    p.monto_pagado,
                    p.mora_aplicada,
                    p.forma_pago,
                    c.nombre as cuenta
                FROM playa.pagos p
                JOIN playa.pagares pg ON p.id_pagare = pg.id_pagare
                JOIN playa.ventas v ON pg.id_venta = v.id_venta
                LEFT JOIN playa.cuentas c ON p.id_cuenta = c.id_cuenta
                WHERE v.id_cliente = :id_cliente
                ORDER BY p.fecha_pago DESC
            """), {"id_cliente": cliente.id_cliente})
            pagos = result.fetchall()
            
            if pagos:
                print(f"  Total de pagos: {len(pagos)}")
                for pago in pagos:
                    print(f"\n  Pago #{pago.id_pago}")
                    print(f"    Pagaré: {pago.numero_pagare} (ID: {pago.id_pagare})")
                    print(f"    Recibo: {pago.numero_recibo}")
                    print(f"    Fecha: {pago.fecha_pago}")
                    print(f"    Monto: Gs. {float(pago.monto_pagado):,.0f}")
                    print(f"    Mora: Gs. {float(pago.mora_aplicada or 0):,.0f}")
                    print(f"    Forma: {pago.forma_pago}")
                    print(f"    Cuenta: {pago.cuenta or 'N/A'}")
            else:
                print("  ❌ NO HAY PAGOS REGISTRADOS para este cliente")
            
            # 5. Resumen del problema
            print("\n" + "="*80)
            print("📊 RESUMEN DEL PROBLEMA")
            print("="*80)
            
            if pagares_problema:
                print(f"\n  ⚠️  Se encontraron {len(pagares_problema)} pagarés con inconsistencias:")
                print(f"\n  Estos pagarés están marcados como PAGADO o tienen saldo 0,")
                print(f"  pero NO tienen pagos registrados en la tabla playa.pagos")
                print(f"\n  IDs de pagarés problemáticos:")
                for pg in pagares_problema:
                    print(f"    - Pagaré #{pg.id_pagare} ({pg.numero_pagare}) - Cuota {pg.numero_cuota}")
                
                print(f"\n  💡 POSIBLES CAUSAS:")
                print(f"    1. Migración de datos incompleta")
                print(f"    2. Trigger antiguo que marcó como pagado sin registrar pago")
                print(f"    3. Actualización manual de la base de datos")
                print(f"    4. Error en el proceso de importación")
                
                print(f"\n  🔧 SOLUCIONES POSIBLES:")
                print(f"    1. Restaurar el saldo_pendiente al monto_cuota original")
                print(f"    2. Cambiar el estado a PENDIENTE")
                print(f"    3. Marcar cancelado = FALSE")
                print(f"    4. Investigar si hay pagos en el sistema antiguo")
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
