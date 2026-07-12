import asyncio
from database import engine
from sqlalchemy import text

async def run():
    try:
        async with engine.connect() as conn:
            # Let's mock a PUT request call
            jugador_id = "da4f2b70-750d-4f62-a3ed-a6a6f11981d6"
            print(f"Testing for jid: {jugador_id}")
            
            await conn.execute(text("""
                UPDATE torneos_futbol.tournament_players
                SET nombre = COALESCE(:nombre, nombre),
                    nombre_abreviado = COALESCE(:nombre_abreviado, nombre_abreviado),
                    dni = COALESCE(:dni, dni),
                    fecha_nacimiento = COALESCE(CAST(:fecha_nacimiento AS DATE), fecha_nacimiento),
                    numero_camiseta = COALESCE(:numero_camiseta, numero_camiseta),
                    posicion = COALESCE(:posicion, posicion),
                    telefono = COALESCE(:telefono, telefono),
                    foto_url = COALESCE(:foto_url, foto_url),
                    biometria_aprobada = COALESCE(:biometria_aprobada, biometria_aprobada)
                WHERE id = :jid
            """), {
                "jid": jugador_id,
                "nombre": "Test",
                "nombre_abreviado": None,
                "dni": "123",
                "fecha_nacimiento": None,
                "numero_camiseta": None,
                "posicion": None,
                "telefono": None,
                "foto_url": None,
                "biometria_aprobada": True
            })
            await conn.commit()
            print("Success")
    except Exception as e:
        print(f"Exception: {type(e).__name__}: {str(e)}")

asyncio.run(run())
