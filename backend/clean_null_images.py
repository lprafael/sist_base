import asyncio
from database import SessionLocal
from models_playa import ImagenProducto
from sqlalchemy import delete

async def clean_null_images():
    async with SessionLocal() as session:
        # Delete all images with NULL path
        result = await session.execute(
            delete(ImagenProducto)
            .where(ImagenProducto.ruta_archivo.is_(None))
        )
        
        deleted_count = result.rowcount
        await session.commit()
        
        print(f"Deleted {deleted_count} image records with NULL paths")
        
        # Count remaining
        from sqlalchemy import select, func
        result = await session.execute(select(func.count(ImagenProducto.id_imagen)))
        remaining = result.scalar()
        
        print(f"Remaining images: {remaining}")

if __name__ == "__main__":
    asyncio.run(clean_null_images())
