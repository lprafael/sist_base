import asyncio
import asyncpg
import os
import re
from dotenv import load_dotenv

def clean_name(name):
    if not name: return ""
    # Map common differences
    name = name.upper().strip()
    name = name.replace("Á", "A").replace("É", "E").replace("Í", "I").replace("Ó", "O").replace("Ú", "U").replace("Ñ", "N")
    # Specific normalization for Central
    name = name.replace("MARIANO ROQUE ALONSO", "MARIANO R. ALONSO")
    name = name.replace("J. AUGUSTO SALDIVAR", "JUAN AUGUSTO SALDIVAR")
    name = re.sub(r'\s+', ' ', name)
    return name

async def main():
    load_dotenv(os.path.join("backend", ".env"))
    db_url = os.getenv("DATABASE_URL")
    dsn = db_url.replace("postgresql+asyncpg://", "postgresql://")
    
    if "@db:" in dsn:
        dsn = dsn.replace("@db:5432/", "@localhost:5433/")
    elif "@localhost:5432/" in dsn:
         dsn = dsn.replace("@localhost:5432/", "@localhost:5433/")
    
    conn = await asyncpg.connect(dsn)
    
    # 1. Get all departments to iterate
    dptos = await conn.fetch("SELECT id, descripcion FROM electoral.ref_departamentos ORDER BY id")
    
    total_mapped = 0
    total_distritos = 0

    print(f"{'DPTO':<20} | {'Mapeados':<10} | {'Total Ref'}")
    print("-" * 50)

    for dpto in dptos:
        dpto_id = dpto['id']
        dpto_desc = dpto['descripcion']
        
        # Get Ref Distritos
        ref_dists = await conn.fetch("SELECT id, descripcion FROM electoral.ref_distritos WHERE departamento_id = $1", dpto_id)
        
        # Get Carto Distritos for this Dpto
        # We try to match DPTO column strings. Ref id 1 -> '01', 11 -> '11'
        dpto_code = str(dpto_id).zfill(2)
        carto_dists = await conn.fetch('SELECT "DISTRITO", "DIST_DESC_" FROM cartografia.distritos WHERE "DPTO" = $1', dpto_code)
        
        mapped_count = 0
        for r in ref_dists:
            r_id = r['id']
            r_name = clean_name(r['descripcion'])
            
            # Find match in carto
            match_code = None
            for c in carto_dists:
                c_name = clean_name(c['DIST_DESC_'])
                if r_name == c_name or (r_name in c_name) or (c_name in r_name):
                    match_code = c['DISTRITO']
                    break
            
            if match_code:
                await conn.execute("""
                    UPDATE cartografia.distritos 
                    SET ref_distrito_id = $1 
                    WHERE "DPTO" = $2 AND "DISTRITO" = $3
                """, r_id, dpto_code, match_code)
                
                # Also update barrios table if possible
                await conn.execute("""
                    UPDATE cartografia.barrios 
                    SET dpto_id_ref = $1 
                    WHERE "DPTO" = $2 AND "DISTRITO" = $3
                """, dpto_id, dpto_code, match_code)
                
                mapped_count += 1
        
        print(f"{dpto_desc[:20]:<20} | {mapped_count:<10} | {len(ref_dists)}")
        total_mapped += mapped_count
        total_distritos += len(ref_dists)

    print("-" * 50)
    print(f"TOTAL                    | {total_mapped:<10} | {total_distritos}")
    
    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
