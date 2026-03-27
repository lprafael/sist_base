
import asyncio
from sqlalchemy import text
from database import engine

async def run():
    try:
        async with engine.begin() as conn:
            # Primero verificamos si existe la tabla para estar seguros del esquema
            result = await conn.execute(text("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'playa' AND table_name = 'imagenes_productos')"))
            exists = result.scalar()
            
            if exists:
                print("Tabla 'playa.imagenes_productos' encontrada. Intentando agregar columna...")
                await conn.execute(text("ALTER TABLE playa.imagenes_productos ADD COLUMN IF NOT EXISTS imagen_con_marca VARCHAR(500)"))
                print("Operacion completada: Columna 'imagen_con_marca' procesada.")
            else:
                print("Error: La tabla 'playa.imagenes_productos' no existe.")
    except Exception as e:
        print(f"Error al ejecutar la migracion: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(run())
