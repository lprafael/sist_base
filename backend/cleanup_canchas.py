import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv
import os

load_dotenv()
DB_URL = os.getenv("DATABASE_URL")

async def main():
    engine = create_async_engine(DB_URL)
    async with engine.connect() as conn:
        # Get all canchas
        result = await conn.execute(text("SELECT id, complejo_id, nombre FROM cancha.canchas"))
        canchas = result.fetchall()
        
        # Group by (complejo_id, nombre)
        groups = {}
        for c in canchas:
            key = (str(c[1]), c[2])
            if key not in groups:
                groups[key] = []
            groups[key].append(str(c[0]))
            
        duplicates = {k: v for k, v in groups.items() if len(v) > 1}
        print(f"Found {len(duplicates)} groups of duplicates.")
        
        deleted_count = 0
        updated_res_count = 0
        
        for key, ids in duplicates.items():
            print(f"Resolving duplicates for Complejo: {key[0][:8]}... Cancha: {key[1]} ({len(ids)} copies)")
            # Find the one with most reservations
            res_counts = {}
            for cid in ids:
                c_res = await conn.execute(text("SELECT count(*) FROM cancha.reservas WHERE cancha_id = :cid"), {"cid": cid})
                res_counts[cid] = c_res.scalar()
                
            # Sort by reservations desc, then keep the first one
            sorted_ids = sorted(ids, key=lambda x: res_counts[x], reverse=True)
            keep_id = sorted_ids[0]
            delete_ids = sorted_ids[1:]
            
            # Reassign reservations
            for did in delete_ids:
                if res_counts[did] > 0:
                    await conn.execute(
                        text("UPDATE cancha.reservas SET cancha_id = :keep_id WHERE cancha_id = :did"),
                        {"keep_id": keep_id, "did": did}
                    )
                    updated_res_count += res_counts[did]
                
                # Delete duplicate
                await conn.execute(text("DELETE FROM cancha.canchas WHERE id = :did"), {"did": did})
                deleted_count += 1
                
        await conn.commit()
        print(f"Cleanup complete. Deleted {deleted_count} duplicate canchas. Reassigned {updated_res_count} reservations.")

if __name__ == "__main__":
    asyncio.run(main())
