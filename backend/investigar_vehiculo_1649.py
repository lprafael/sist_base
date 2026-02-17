"""
Investigar dependencias de vehiculo 1649
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

async def investigar_vehiculo(id_vehiculo):
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        print(f"\n🔍 INVESTIGANDO DEPENDENCIAS DEL VEHÍCULO ID: {id_vehiculo}")
        
        # 1. Verificar producto
        res = await session.execute(text("SELECT * FROM playa.productos WHERE id_producto = :id"), {"id": id_vehiculo})
        producto = res.fetchone()
        if not producto:
            print("❌ Vehículo no encontrado.")
            return

        print(f"📦 Vehículo: {producto.marca} {producto.modelo} ({producto.chasis})")
        
        # 2. Verificar imágenes
        res = await session.execute(text("SELECT count(*) FROM playa.imagenes_productos WHERE id_producto = :id"), {"id": id_vehiculo})
        count_img = res.scalar()
        print(f"🖼️ Imágenes: {count_img}")
        
        # 3. Verificar gastos
        res = await session.execute(text("SELECT count(*) FROM playa.gastos_productos WHERE id_producto = :id"), {"id": id_vehiculo})
        count_gastos = res.scalar()
        print(f"💰 Gastos: {count_gastos}")
        
        # 4. Verificar ventas
        res = await session.execute(text("SELECT count(*) FROM playa.ventas WHERE id_producto = :id"), {"id": id_vehiculo})
        count_ventas = res.scalar()
        print(f"🤝 Ventas: {count_ventas}")
        
        # 5. Verificar detalle_venta
        res = await session.execute(text("SELECT count(*) FROM playa.detalle_venta WHERE concepto LIKE :chasis"), {"chasis": f"%{producto.chasis}%"})
        count_det = res.scalar()
        print(f"📝 Detalles de venta por chasis: {count_det}")
        
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(investigar_vehiculo(1649))
