import asyncio
from database import SessionLocal
from models_playa import ImagenProducto
from sqlalchemy import select

async def check_images():
    async with SessionLocal() as session:
        result = await session.execute(select(ImagenProducto).limit(10))
        images = result.scalars().all()
        
        print(f"Total images found: {len(images)}")
        for img in images:
            print(f"ID: {img.id_imagen}, File: {img.nombre_archivo}, Path: {img.ruta_archivo}")

if __name__ == "__main__":
    asyncio.run(check_images())
