import asyncio
import asyncpg
import json

async def main():
    conn = await asyncpg.connect('postgresql://postgres:admin@187.77.247.23:5436/BBDD_micancha')
    
    print("\n--- PARTIDOS WITH POPULATED ESTADISTICAS ---")
    p = await conn.fetch("SELECT * FROM torneos.partidos WHERE estadisticas IS NOT NULL AND estadisticas::text != '{}' LIMIT 10")
    for row in p:
        d = dict(row)
        print(d['id'], d.get('estadisticas'))

    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
