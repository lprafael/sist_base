
import asyncio
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload, selectinload
from database import SessionLocal
from models_playa import Venta, Pagare, Pago, Estado, Cliente, Producto
from pydantic import TypeAdapter
from decimal import Decimal

async def test_list_pagares_pendientes():
    async with SessionLocal() as session:
        # Match the query in list_pagares_pendientes
        query = (
            select(Pagare, Venta, Cliente, Producto, Estado)
            .options(selectinload(Pagare.pagos))
            .join(Venta, Pagare.id_venta == Venta.id_venta)
            .join(Cliente, Venta.id_cliente == Cliente.id_cliente)
            .join(Producto, Venta.id_producto == Producto.id_producto)
            .join(Estado, Pagare.id_estado == Estado.id_estado)
            .where(Estado.nombre.in_(['PENDIENTE', 'PARCIAL', 'VENCIDO']))
            .where(Pagare.cancelado == False)
            .order_by(Pagare.fecha_vencimiento)
        )
        
        result = await session.execute(query)
        rows = result.all()
        print(f"Fetched {len(rows)} pagares pendientes")
        
        data = []
        for p, v, c, prod, st in rows:
            # Replicate the logic in the router
            total_cuotas = 0 # Dummy
            is_overdue = False
            estado_display = st.nombre
            
            fecha_pago_val = None
            if p.pagos:
                latest_pago = max(p.pagos, key=lambda x: x.fecha_pago)
                fecha_pago_val = latest_pago.fecha_pago.isoformat()

            item = {
                "id_pagare": p.id_pagare,
                "id_venta": v.id_venta,
                "numero_cuota": p.numero_cuota,
                "monto_cuota": float(p.monto_cuota),
                "saldo_pendiente": float(p.saldo_pendiente) if p.saldo_pendiente is not None else float(p.monto_cuota),
                "fecha_vencimiento": p.fecha_vencimiento.isoformat(),
                "fecha_pago": fecha_pago_val,
                "cliente": f"{c.nombre} {c.apellido}",
                "vehiculo": f"{prod.marca} {prod.modelo}",
                "estado": estado_display,
                "pagos": [
                    {
                        "id_pago": pg.id_pago,
                        "fecha_pago": pg.fecha_pago.isoformat(),
                        "monto_pagado": float(pg.monto_pagado),
                        "numero_recibo": pg.numero_recibo,
                        "mora_aplicada": float(pg.mora_aplicada or 0),
                        "forma_pago": pg.forma_pago
                    } for pg in sorted(p.pagos, key=lambda x: x.fecha_pago, reverse=True)
                ] if p.pagos else []
            }
            data.append(item)
        print("Success processing data")

if __name__ == "__main__":
    asyncio.run(test_list_pagares_pendientes())
