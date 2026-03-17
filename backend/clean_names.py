import asyncio
from sqlalchemy import text
from database import get_session

async def clean_database_names():
    async for session in get_session():
        print("Cleaning electoral.ref_distritos names...")
        # Update names by removing all newlines, carriage returns, and extra spaces
        update_dist = text("""
            UPDATE electoral.ref_distritos 
            SET descripcion = regexp_replace(descripcion, '[\r\n\t]+', ' ', 'g')
        """)
        await session.execute(update_dist)
        
        # Second pass to trim and collapse multiple spaces
        update_dist2 = text("""
            UPDATE electoral.ref_distritos 
            SET descripcion = TRIM(regexp_replace(descripcion, '\s+', ' ', 'g'))
        """)
        await session.execute(update_dist2)

        print("Cleaning electoral.ref_locales names...")
        update_loc = text("""
            UPDATE electoral.ref_locales 
            SET descripcion = TRIM(regexp_replace(descripcion, '[\r\n\t]+', ' ', 'g'))
        """)
        await session.execute(update_loc)
        
        update_loc2 = text("""
            UPDATE electoral.ref_locales 
            SET descripcion = TRIM(regexp_replace(descripcion, '\s+', ' ', 'g'))
        """)
        await session.execute(update_loc2)

        await session.commit()
        print("Database names cleaned.")
        
        # Verify Mariano name
        res = await session.execute(text("SELECT descripcion FROM electoral.ref_distritos WHERE id=19 AND departamento_id=11"))
        name = res.scalar()
        print(f"Verified Mariano name: '{name}'")
        break

if __name__ == "__main__":
    asyncio.run(clean_database_names())
