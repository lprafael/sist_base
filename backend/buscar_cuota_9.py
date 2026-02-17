"""
Buscar cuota 9 del cliente 4933823
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

async def buscar_cuota_9():
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
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
            JOIN playa.ventas v ON pg.id_venta = v.id_venta
            JOIN playa.clientes c ON v.id_cliente = c.id_cliente
            LEFT JOIN playa.estados e ON pg.id_estado = e.id_estado
            LEFT JOIN playa.pagos p ON pg.id_pagare = p.id_pagare
            WHERE c.numero_documento = '4933823' AND pg.numero_cuota = 9
            GROUP BY pg.id_pagare, pg.numero_pagare, pg.numero_cuota, 
                     pg.monto_cuota, pg.saldo_pendiente, e.nombre, pg.cancelado
        """))
        pagare = result.fetchone()
        
        if pagare:
            print(f"\n🔍 Pagaré Cuota 9:")
            print(f"  ID: {pagare.id_pagare}")
            print(f"  Número: {pagare.numero_pagare}")
            print(f"  Monto: Gs. {float(pagare.monto_cuota):,.0f}")
            print(f"  Saldo: Gs. {float(pagare.saldo_pendiente or 0):,.0f}")
            print(f"  Estado: {pagare.estado}")
            print(f"  Cancelado: {'SÍ' if pagare.cancelado else 'NO'}")
            print(f"  Pagos registrados: {pagare.cantidad_pagos}")
            print(f"  Total pagado: Gs. {float(pagare.total_pagado):,.0f}")
            
            if pagare.cantidad_pagos > 0:
                print(f"\n  Detalle de pagos:")
                result2 = await session.execute(text("""
                    SELECT numero_recibo, fecha_pago, monto_pagado, mora_aplicada
                    FROM playa.pagos
                    WHERE id_pagare = :id_pagare
                    ORDER BY fecha_pago DESC
                """), {"id_pagare": pagare.id_pagare})
                pagos = result2.fetchall()
                for pago in pagos:
                    print(f"    - {pago.fecha_pago}: Gs. {float(pago.monto_pagado):,.0f} (Recibo: {pago.numero_recibo})")
        else:
            print("\n❌ No se encontró la cuota 9")
        
        await engine.dispose()

asyncio.run(buscar_cuota_9())
