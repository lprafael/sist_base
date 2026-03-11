
import asyncio
import asyncpg
import os
from dotenv import load_dotenv

async def find_gaps():
    load_dotenv()
    db_url = os.getenv("DATABASE_URL").replace("postgresql+asyncpg://", "postgresql://")
    
    conn = await asyncpg.connect(db_url)
    
    print("Obteniendo todas las cédulas de la base de datos...")
    rows = await conn.fetch("SELECT cedula::integer FROM electoral.anr_padron_2026 ORDER BY cedula::integer")
    await conn.close()
    
    cedulas = [r['cedula'] for r in rows]
    if not cedulas:
        print("La tabla está vacía.")
        return

    min_ci = cedulas[0]
    max_ci = cedulas[-1]
    
    print(f"Rango actual en DB: {min_ci:,} - {max_ci:,}")
    print(f"Total registros: {len(cedulas):,}")
    
    # Encontrar huecos grandes o simplemente contar cuántos faltan
    total_theoretical = max_ci - min_ci + 1
    total_missing = total_theoretical - len(cedulas)
    print(f"Total faltantes en este rango: {total_missing:,}")
    
    # Identificar los primeros 10 huecos (gaps)
    gaps = []
    for i in range(len(cedulas) - 1):
        if cedulas[i+1] - cedulas[i] > 1:
            gaps.append((cedulas[i] + 1, cedulas[i+1] - 1))
            if len(gaps) >= 20:
                break
                
    if gaps:
        print("\nPrimeros 20 huecos detectados:")
        for start, end in gaps:
            size = end - start + 1
            print(f"- Desde {start:,} hasta {end:,} (Tamaño: {size:,})")
    else:
        print("\nNo se detectaron huecos secuenciales.")

if __name__ == "__main__":
    asyncio.run(find_gaps())
