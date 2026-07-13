import asyncio
import os
import sys

# Agregar el directorio padre al sys.path para poder importar los módulos del proyecto
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine
from models import ModuloSistema

async def create_table():
    print("Conectando a la base de datos y creando tabla sistema.modulos...")
    try:
        async with engine.begin() as conn:
            # Crear la tabla específica
            await conn.run_sync(ModuloSistema.__table__.create, checkfirst=True)
            print("Tabla sistema.modulos creada exitosamente (o ya existía).")
    except Exception as e:
        print(f"Error creando tabla: {e}")
        
if __name__ == "__main__":
    asyncio.run(create_table())
