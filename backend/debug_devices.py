import asyncio
from sqlalchemy import select
from database import engine
from models import EquiposAutorizados, Usuario

async def debug_devices():
    print("📋 Listado de dispositivos en la BD:")
    try:
        async with engine.connect() as conn:
            result = await conn.execute(select(Usuario.username, EquiposAutorizados.device_id, EquiposAutorizados.activo, EquiposAutorizados.descripcion)
                                        .join(EquiposAutorizados, Usuario.id == EquiposAutorizados.usuario_id))
            rows = result.all()
            if not rows:
                print("No hay dispositivos registrados.")
            for row in rows:
                print(f"Usuario: {row.username} | ID: {row.device_id[:15]}... | Activo: {row.activo} | Desc: {row.descripcion}")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(debug_devices())
