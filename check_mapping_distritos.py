import asyncio
import asyncpg
import os
from dotenv import load_dotenv

async def main():
    # Look for .env in backend/
    load_dotenv(os.path.join("backend", ".env"))
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("Error: DATABASE_URL not found in backend/.env")
        return
        
    dsn = db_url.replace("postgresql+asyncpg://", "postgresql://")
    
    # Local dev adjustment
    if "@db:" in dsn:
        dsn = dsn.replace("@db:5432/", "@localhost:5433/")
    elif "@localhost:5432/" in dsn:
         dsn = dsn.replace("@localhost:5432/", "@localhost:5433/")
    
    conn = await asyncpg.connect(dsn)
    
    print("--- DISTRITOS EN ELECTORAL.REF_DISTRITOS (DPTO 11) ---")
    ref_rows = await conn.fetch("""
        SELECT id, descripcion 
        FROM electoral.ref_distritos 
        WHERE departamento_id = 11 
        ORDER BY descripcion
    """)
    ref_map = {row['descripcion'].strip().upper(): row['id'] for row in ref_rows}
    for row in ref_rows:
        print(f"ID: {row['id']:2} | Nombre: {row['descripcion']}")

    print("\n--- DISTRITOS EN CARTOGRAFIA.DISTRITOS (DPTO 11) ---")
    carto_rows = await conn.fetch("""
        SELECT "DISTRITO", "DIST_DESC_" 
        FROM cartografia.distritos 
        WHERE "DPTO" = '11'
        ORDER BY "DIST_DESC_"
    """)
    carto_map = {row['DIST_DESC_'].strip().upper(): row['DISTRITO'] for row in carto_rows}
    for row in carto_rows:
        print(f"Code: {row['DISTRITO']} | Nombre: {row['DIST_DESC_']}")

    print("\n--- COMPARACIÓN (Mapeo Sugerido) ---")
    all_names = sorted(set(list(ref_map.keys()) + list(carto_map.keys())))
    
    print(f"{'Nombre':<25} | {'Ref ID':<7} | {'Carto Code':<10} | {'Status'}")
    print("-" * 60)
    for name in all_names:
        ref_id = ref_map.get(name, "MISSING")
        carto_code = carto_map.get(name, "MISSING")
        
        try:
            r_id_str = str(ref_id).zfill(2)
            c_id_str = str(carto_code).strip().zfill(2)
            status = "OK" if r_id_str == c_id_str else "MISMATCH"
        except:
            status = "ERROR"
            
        if ref_id == "MISSING" or carto_code == "MISSING":
            status = "MISSING"
            
        print(f"{name:<25} | {ref_id:<7} | {carto_code:<10} | {status}")

    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
