import asyncio
import asyncpg

async def main():
    conn = await asyncpg.connect('postgresql://postgres:admin@187.77.247.23:5436/BBDD_micancha')
    try:
        # Create table if not exists
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS torneos.asam_formas (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                torneo_id UUID,
                categoria_id UUID,
                jugador_id UUID,
                juez_1 FLOAT,
                juez_2 FLOAT,
                juez_3 FLOAT,
                juez_4 FLOAT,
                juez_5 FLOAT,
                puntaje_descartado_alto FLOAT,
                puntaje_descartado_bajo FLOAT,
                puntaje_final FLOAT,
                estado VARCHAR(50) DEFAULT 'pendiente',
                creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("Table asam_formas checked/created successfully.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
