import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

engine = create_async_engine("postgresql+asyncpg://postgres:admin@localhost:5432/BBDD_micancha")


async def seed_torneo():
    async with engine.begin() as conn:
        try:
            # Insert a dummy tournament
            sql = """
            INSERT INTO cancha.torneos 
            (nombre, formato, categoria, deporte, fecha_inicio, fecha_fin, estado, max_equipos, costo_inscripcion, descripcion, complejo_id)
            VALUES 
            ('Copa de Verano Poliverso', 'liga', 'Libre', 'Fútbol 5', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', 'abierto', 16, 500000, 'El mejor torneo de fútbol de Asunción. ¡Inscribe a tu equipo!', (SELECT id FROM cancha.complejos LIMIT 1))
            RETURNING id;
            """
            result = await conn.execute(text(sql))
            id_torneo = result.scalar_one()
            print(f"Torneo insertado con ID: {id_torneo}")
            
            # Let's insert a couple of mock teams
            sql_teams = """
            INSERT INTO cancha.torneos_equipos (torneo_id, nombre, estado_inscripcion)
            VALUES 
            (:id_torneo, 'Los Galácticos', 'confirmado'),
            (:id_torneo, 'Real Añil', 'confirmado')
            """
            await conn.execute(text(sql_teams), {"id_torneo": id_torneo})
            print("Equipos insertados.")
            
        except Exception as e:
            print(f"Error: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(seed_torneo())
