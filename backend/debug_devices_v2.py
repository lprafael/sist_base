import asyncio
from sqlalchemy import select
from database import engine
from models import EquiposAutorizados, Usuario

async def debug_devices():
    print("📋 Detalle completo de equipos_autorizados:")
    try:
        async with engine.connect() as conn:
            result = await conn.execute(select(EquiposAutorizados.id, Usuario.username, EquiposAutorizados.device_id, EquiposAutorizados.activo, EquiposAutorizados.descripcion, EquiposAutorizados.ip_solicitud)
                                        .join(Usuario, Usuario.id == EquiposAutorizados.usuario_id))
            rows = result.all()
            for row in rows:
                print(f"ID_PK: {row.id} | User: {row.username} | DeviceID: {row.device_id} | Activo: {row.activo} | IP: {row.ip_solicitud}")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(debug_devices())
