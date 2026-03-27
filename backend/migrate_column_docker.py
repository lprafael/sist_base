import asyncio
from sqlalchemy import text
from database import engine

async def migrate():
    try:
        async with engine.begin() as conn:
            print("Iniciando migración de columna imagen_con_marca...")
            
            # 1. Cambiar el tipo de datos de bytea a varchar
            # Primero ponemos a NULL los valores existentes ya que no son rutas válidas
            await conn.execute(text("UPDATE playa.imagenes_productos SET imagen_con_marca = NULL"))
            
            # 2. Alterar la columna
            await conn.execute(text("ALTER TABLE playa.imagenes_productos ALTER COLUMN imagen_con_marca TYPE VARCHAR(500) USING imagen_con_marca::varchar"))
            
            print("Migración completada con éxito.")
    except Exception as e:
        print(f"Error durante la migración: {e}")
    finally:
        await engine.dispose()

if __name__ == '__main__':
    asyncio.run(migrate())
