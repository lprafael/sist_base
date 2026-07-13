import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from models import ModuloSistema
from sqlalchemy.future import select

async def create_modulos():
    print("Conectando a la base de datos para crear módulos...")
    try:
        async with SessionLocal() as session:
            modulos_a_crear = [
                {"nombre": "Gestión de reservas", "ruta": "/reservas", "descripcion": "Módulo para administrar reservas de locales deportivos", "icono": "Calendar", "activo": True},
                {"nombre": "Gestión de torneos", "ruta": "/torneos", "descripcion": "Módulo para crear y gestionar torneos y campeonatos", "icono": "Trophy", "activo": True},
                {"nombre": "Gestión de academias", "ruta": "/academias", "descripcion": "Módulo para el control de academias deportivas", "icono": "GraduationCap", "activo": True},
            ]
            
            for mod_data in modulos_a_crear:
                query = select(ModuloSistema).where(ModuloSistema.nombre == mod_data["nombre"])
                result = await session.execute(query)
                modulo = result.scalars().first()
                
                if not modulo:
                    nuevo_modulo = ModuloSistema(**mod_data)
                    session.add(nuevo_modulo)
                    print(f"Módulo '{mod_data['nombre']}' creado.")
                else:
                    modulo.ruta = mod_data["ruta"]
                    modulo.descripcion = mod_data["descripcion"]
                    modulo.icono = mod_data["icono"]
                    print(f"Módulo '{mod_data['nombre']}' actualizado.")
            
            await session.commit()
            print("Módulos guardados exitosamente.")
    except Exception as e:
        print(f"Error gestionando módulos: {e}")

if __name__ == "__main__":
    asyncio.run(create_modulos())
