import asyncio
import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

# Database credentials (from .env or container environment)
DB_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:admin@db:5432/SIGEL")

async def update_addresses():
    engine = create_async_engine(DB_URL)
    
    async with engine.begin() as conn:
        print("Checking/Adding direccion column...")
        await conn.execute(text("""
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                               WHERE table_schema = 'electoral' 
                               AND table_name = 'anr_padron_2026' 
                               AND column_name = 'direccion') THEN
                    ALTER TABLE electoral.anr_padron_2026 ADD COLUMN direccion TEXT;
                END IF;
            END $$;
        """))
        
        print("Creating indices for performance...")
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_anr_2026_cedula ON electoral.anr_padron_2026 (cedula)"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_plra_cedula_search ON electoral.plra_padron (cedula)"))

    # Batch update
    offset = 0
    batch_size = 5000
    total_updated = 0
    
    print("Starting batch update...")
    
    while True:
        async with engine.begin() as conn:
            # We use a subquery to find matching cedulas that haven't been updated yet
            # and update them in small chunks.
            result = await conn.execute(text(f"""
                UPDATE electoral.anr_padron_2026 a
                SET direccion = p.direcc
                FROM (
                    SELECT a2.cedula, p2.direcc
                    FROM electoral.anr_padron_2026 a2
                    JOIN electoral.plra_padron p2 ON a2.cedula::text = p2.cedula::text
                    WHERE a2.direccion IS NULL
                    AND p2.direcc IS NOT NULL AND p2.direcc <> ''
                    LIMIT {batch_size}
                ) p
                WHERE a.cedula = p.cedula
                RETURNING a.cedula;
            """))
            
            rows = result.fetchall()
            count = len(rows)
            total_updated += count
            
            if count == 0:
                break
            
            print(f"Updated {count} records... Total: {total_updated}")
            
    print(f"Finished. Total updated: {total_updated}")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(update_addresses())
