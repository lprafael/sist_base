import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine, SessionLocal
from models import Rol
from sqlalchemy.future import select

async def create_roles():
    print("Conectando a la base de datos para crear roles...")
    try:
        async with SessionLocal() as session:
            roles_a_crear = [
                {"nombre": "administrador", "descripcion": "dueño del sistema, el que puede ver, crear todo, etc"},
                {"nombre": "complejo", "descripcion": "dueño de los locales deportivos"},
                {"nombre": "organizador", "descripcion": "el que puede organizar torneos y campeonatos"},
                {"nombre": "veedor", "descripcion": "el que puede cargar resultados de partidos en los torneos"},
                {"nombre": "delegado", "descripcion": "el que crea un equipo y le pasa a los jugadores el enlace para que se anoten"},
                {"nombre": "jugadores", "descripcion": "miembros de los equipos"},
                {"nombre": "academia", "descripcion": "para los que tienen academias deportivas"},
            ]
            
            for rol_data in roles_a_crear:
                query = select(Rol).where(Rol.nombre == rol_data["nombre"])
                result = await session.execute(query)
                rol = result.scalars().first()
                
                if not rol:
                    nuevo_rol = Rol(**rol_data)
                    session.add(nuevo_rol)
                    print(f"Rol '{rol_data['nombre']}' creado.")
                else:
                    # Update description
                    rol.descripcion = rol_data["descripcion"]
                    print(f"Rol '{rol_data['nombre']}' actualizado.")
            
            await session.commit()
            print("Roles guardados exitosamente.")
    except Exception as e:
        print(f"Error gestionando roles: {e}")

if __name__ == "__main__":
    asyncio.run(create_roles())
