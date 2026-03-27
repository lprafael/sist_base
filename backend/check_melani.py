import asyncio
import os
import sys

# Añadir el path actual al sys.path para importar los modelos
sys.path.append(os.getcwd())

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from models_playa import Venta, Cliente, Pagare, Pago, Estado

async def fetch():
    try:
        engine = create_async_engine("postgresql+asyncpg://postgres:adminperalta@host.docker.internal:5432/BBDD_playa")
        async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        async with async_session() as session:
            # Buscar cliente MELANI
            q = select(Cliente).where(Cliente.numero_documento == '5511739')
            res = await session.execute(q)
            cliente = res.scalar_one_or_none()
            if not cliente:
                print("Cliente no encontrado")
                return
            
            # Buscar venta activa
            q = select(Venta).where(Venta.id_cliente == cliente.id_cliente, Venta.estado_venta == 'ACTIVA')
            res = await session.execute(q)
            venta = res.scalar_one_or_none()
            if not venta:
                print("Venta no encontrada")
                return
                
            print(f"Venta ID: {venta.id_venta}")
            print(f"Tasa Interes: {venta.tasa_interes}")
            print(f"Monto Mora: {venta.monto_int_mora}")
            print(f"Periodo Mora: {venta.periodo_int_mora}")
            print(f"Dias Gracia: {venta.dias_gracia}")
            print(f"Monto Cuota: {venta.monto_cuota}")
            
            # Buscar pagare 12
            q = select(Pagare).where(Pagare.id_venta == venta.id_venta, Pagare.numero_cuota == 12)
            res = await session.execute(q)
            pagare = res.scalar_one_or_none()
            if pagare:
                # Obtener nombre del estado
                q_estado = select(Estado).where(Estado.id_estado == pagare.id_estado)
                res_estado = await session.execute(q_estado)
                estado_nombre = res_estado.scalar_one_or_none().nombre if res_estado else "N/A"
                
                print(f"Pagare 12 - ID: {pagare.id_pagare}")
                print(f"Pagare 12 - Estado: {estado_nombre} (ID: {pagare.id_estado})")
                print(f"Pagare 12 - Cancelado: {pagare.cancelado}")
                print(f"Pagare 12 - Saldo: {pagare.saldo_pendiente}")
                print(f"Pagare 12 - Vencimiento: {pagare.fecha_vencimiento}")
                
                # Buscar pagos de este pagare
                q_pagos = select(Pago).where(Pago.id_pagare == pagare.id_pagare)
                res_pagos = await session.execute(q_pagos)
                pagos = res_pagos.scalars().all()
                print(f"Pagos encontrados: {len(pagos)}")
                for p in pagos:
                    print(f"  Pago ID: {p.id_pago}, Fecha: {p.fecha_pago}, Monto: {p.monto_pagado}, Mora: {p.mora_aplicada}")
            else:
                print("Pagare 12 no encontrado")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(fetch())
