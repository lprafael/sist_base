
import asyncio
from sqlalchemy import select
from backend.database import get_session
from backend.models_playa import Venta

async def check_sale_data():
    async for session in get_session():
        stmt = select(Venta).where(Venta.numero_venta == '001-001-0000150')
        result = await session.execute(stmt)
        venta = result.scalar_one_or_none()
        
        if venta:
            print(f"Venta: {venta.numero_venta}")
            print(f"Tipo: {venta.tipo_venta}")
            print(f"Precio Final: {venta.precio_final}")
            print(f"Cantidad Cuotas: {venta.cantidad_cuotas}")
            print(f"Monto Cuota: {venta.monto_cuota}")
        else:
            print("Venta no encontrada")

if __name__ == "__main__":
    asyncio.run(check_sale_data())
