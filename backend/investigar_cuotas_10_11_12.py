"""
Investigar cuotas 10, 11 y 12 del cliente 4933823
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

async def investigar_cuotas():
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        print("\n" + "="*100)
        print("🔍 INVESTIGACIÓN: Cuotas 10, 11 y 12 - Cliente 4933823")
        print("="*100 + "\n")
        
        for cuota_num in [10, 11, 12]:
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
                    COUNT(p.id_pago) as cantidad_pagos,
                    COALESCE(SUM(p.monto_pagado), 0) as total_pagado,
                    COALESCE(SUM(p.mora_aplicada), 0) as total_mora
                FROM playa.pagares pg
                JOIN playa.ventas v ON pg.id_venta = v.id_venta
                JOIN playa.clientes c ON v.id_cliente = c.id_cliente
                LEFT JOIN playa.estados e ON pg.id_estado = e.id_estado
                LEFT JOIN playa.pagos p ON pg.id_pagare = p.id_pagare
                WHERE c.numero_documento = '4933823' AND pg.numero_cuota = :cuota
                GROUP BY pg.id_pagare, pg.numero_pagare, pg.numero_cuota, 
                         pg.monto_cuota, pg.saldo_pendiente, pg.fecha_vencimiento,
                         e.nombre, pg.cancelado
            """), {"cuota": cuota_num})
            pagare = result.fetchone()
            
            if pagare:
                print(f"{'='*100}")
                print(f"CUOTA {cuota_num}/32")
                print(f"{'='*100}")
                print(f"  ID Pagaré: {pagare.id_pagare}")
                print(f"  Número: {pagare.numero_pagare}")
                print(f"  Monto Cuota: Gs. {float(pagare.monto_cuota):,.0f}")
                print(f"  Saldo Pendiente: Gs. {float(pagare.saldo_pendiente or 0):,.0f}")
                print(f"  Estado: {pagare.estado}")
                print(f"  Cancelado: {'SÍ' if pagare.cancelado else 'NO'}")
                print(f"  Vencimiento: {pagare.fecha_vencimiento}")
                print(f"  Cantidad de pagos: {pagare.cantidad_pagos}")
                print(f"  Total pagado: Gs. {float(pagare.total_pagado):,.0f}")
                print(f"  Total mora: Gs. {float(pagare.total_mora):,.0f}")
                
                # Calcular si está completamente pagado
                monto_total_esperado = float(pagare.monto_cuota)
                total_pagado = float(pagare.total_pagado)
                diferencia = monto_total_esperado - total_pagado
                
                print(f"\n  📊 ANÁLISIS:")
                print(f"    Monto esperado: Gs. {monto_total_esperado:,.0f}")
                print(f"    Total pagado: Gs. {total_pagado:,.0f}")
                print(f"    Diferencia: Gs. {diferencia:,.0f}")
                
                if diferencia > 0:
                    print(f"    ⚠️  PROBLEMA: Falta pagar Gs. {diferencia:,.0f} pero el saldo está en 0")
                    print(f"    🔧 CAUSA: El saldo_pendiente no refleja la realidad")
                elif diferencia < 0:
                    print(f"    ⚠️  PROBLEMA: Se pagó de más Gs. {abs(diferencia):,.0f}")
                else:
                    print(f"    ✅ CORRECTO: Está completamente pagado")
                
                # Detalle de pagos
                if pagare.cantidad_pagos > 0:
                    print(f"\n  💰 DETALLE DE PAGOS:")
                    result2 = await session.execute(text("""
                        SELECT 
                            id_pago,
                            numero_recibo,
                            fecha_pago,
                            monto_pagado,
                            mora_aplicada,
                            forma_pago
                        FROM playa.pagos
                        WHERE id_pagare = :id_pagare
                        ORDER BY fecha_pago ASC
                    """), {"id_pagare": pagare.id_pagare})
                    pagos = result2.fetchall()
                    
                    for i, pago in enumerate(pagos, 1):
                        print(f"    Pago #{i}:")
                        print(f"      ID: {pago.id_pago}")
                        print(f"      Recibo: {pago.numero_recibo}")
                        print(f"      Fecha: {pago.fecha_pago}")
                        print(f"      Monto: Gs. {float(pago.monto_pagado):,.0f}")
                        print(f"      Mora: Gs. {float(pago.mora_aplicada or 0):,.0f}")
                        print(f"      Forma: {pago.forma_pago}")
                
                print()
        
        print("\n" + "="*100)
        print("📋 RESUMEN Y RECOMENDACIONES")
        print("="*100 + "\n")
        
        # Verificar si hay cuotas con problemas
        result = await session.execute(text("""
            SELECT 
                pg.id_pagare,
                pg.numero_cuota,
                pg.monto_cuota,
                pg.saldo_pendiente,
                COALESCE(SUM(p.monto_pagado), 0) as total_pagado
            FROM playa.pagares pg
            JOIN playa.ventas v ON pg.id_venta = v.id_venta
            JOIN playa.clientes c ON v.id_cliente = c.id_cliente
            LEFT JOIN playa.pagos p ON pg.id_pagare = p.id_pagare
            WHERE c.numero_documento = '4933823' AND pg.numero_cuota IN (10, 11, 12)
            GROUP BY pg.id_pagare, pg.numero_cuota, pg.monto_cuota, pg.saldo_pendiente
        """))
        cuotas = result.fetchall()
        
        problemas = []
        for cuota in cuotas:
            monto_esperado = float(cuota.monto_cuota)
            total_pagado = float(cuota.total_pagado)
            saldo = float(cuota.saldo_pendiente or 0)
            saldo_correcto = monto_esperado - total_pagado
            
            if saldo != saldo_correcto:
                problemas.append({
                    'id_pagare': cuota.id_pagare,
                    'numero_cuota': cuota.numero_cuota,
                    'saldo_actual': saldo,
                    'saldo_correcto': saldo_correcto,
                    'diferencia': saldo - saldo_correcto
                })
        
        if problemas:
            print("  🚨 PROBLEMAS ENCONTRADOS:\n")
            for p in problemas:
                print(f"    Cuota {p['numero_cuota']} (ID: {p['id_pagare']}):")
                print(f"      Saldo actual: Gs. {p['saldo_actual']:,.0f}")
                print(f"      Saldo correcto: Gs. {p['saldo_correcto']:,.0f}")
                print(f"      Diferencia: Gs. {p['diferencia']:,.0f}")
                print()
            
            print("  🔧 SOLUCIÓN:")
            print("    Ejecutar script de corrección para actualizar saldo_pendiente")
            print("    basándose en los pagos reales registrados.\n")
            
            print("  📝 SQL para corregir:")
            for p in problemas:
                print(f"    UPDATE playa.pagares")
                print(f"    SET saldo_pendiente = {p['saldo_correcto']}")
                print(f"    WHERE id_pagare = {p['id_pagare']};")
                print()
        else:
            print("  ✅ No se encontraron problemas de saldo\n")
        
        await engine.dispose()

asyncio.run(investigar_cuotas())
