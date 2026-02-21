
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, joinedload, selectinload
from sqlalchemy.future import select
from models_playa import Venta, Producto, Cliente
from schemas_playa import VentaResponse
from database import DATABASE_URL
import json
from decimal import Decimal
from datetime import date, datetime

def default_json(obj):
    if isinstance(obj, (date, datetime)):
        return obj.isoformat()
    if isinstance(obj, Decimal):
        return float(obj)
    return str(obj)

async def test():
    engine = create_async_engine(DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
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
            .limit(10)
        )
        ventas = result.unique().scalars().all()
        print(f"Loaded {len(ventas)} ventas")
        
        for v in ventas:
            try:
                # Simulando lo que hace FastAPI/Pydantic
                resp = VentaResponse.model_validate(v)
                print(f"Validated venta {v.id_venta}")
            except Exception as e:
                print(f"Error validating venta {v.id_venta}: {e}")
                import traceback
                traceback.print_exc()

if __name__ == "__main__":
    # Fix for Pagare import in script
    from models_playa import Pagare
    asyncio.run(test())
