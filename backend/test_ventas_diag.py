
import asyncio
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload, selectinload
from database import SessionLocal
from models_playa import Venta, Pagare, Pago, Estado
from schemas_playa import VentaResponse
from pydantic import TypeAdapter

async def test_list_ventas():
    async with SessionLocal() as session:
        result = await session.execute(
            select(Venta)
            .options(
                joinedload(Venta.cliente),
                joinedload(Venta.producto),
                joinedload(Venta.escribania_rel),
                joinedload(Venta.detalles),
                selectinload(Venta.pagares).options(
                    joinedload(Pagare.estado_rel),
                    selectinload(Pagare.pagos)
                )
            )
            .order_by(Venta.fecha_registro.desc())
        )
        ventas = result.unique().scalars().all()
        print(f"Fetched {len(ventas)} ventas")
        
        # Test serialization
        adapter = TypeAdapter(list[VentaResponse])
        try:
            serialized = adapter.validate_python(ventas)
            print("Serialization successful")
        except Exception as e:
            print(f"Serialization failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_list_ventas())
