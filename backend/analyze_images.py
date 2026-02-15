import asyncio
from database import SessionLocal
from models_playa import ImagenProducto
from sqlalchemy import select, func

async def analyze_images():
    async with SessionLocal() as session:
        # Count total
        result = await session.execute(select(func.count(ImagenProducto.id_imagen)))
        total = result.scalar()
        
        # Count with NULL paths
        result = await session.execute(
            select(func.count(ImagenProducto.id_imagen))
            .where(ImagenProducto.ruta_archivo.is_(None))
        )
        null_paths = result.scalar()
        
        # Get some examples with data
        result = await session.execute(
            select(ImagenProducto)
            .where(ImagenProducto.ruta_archivo.isnot(None))
            .limit(5)
        )
        valid_images = result.scalars().all()
        
        print(f"Total images: {total}")
        print(f"Images with NULL path: {null_paths}")
        print(f"Images with valid path: {total - null_paths}")
        
        print("\nSample valid images:")
        for img in valid_images:
            print(f"ID: {img.id_imagen}, Product: {img.id_producto}, File: {img.nombre_archivo}, Path: {img.ruta_archivo}")

if __name__ == "__main__":
    asyncio.run(analyze_images())
