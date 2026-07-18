import asyncio
import asyncpg

async def main():
    conn = await asyncpg.connect('postgresql://postgres:admin@187.77.247.23:5436/BBDD_micancha')
    try:
        await conn.execute("ALTER TABLE torneos.categorias ADD COLUMN tipo_categoria VARCHAR(50) DEFAULT 'combate'")
        print("Column tipo_categoria added successfully.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
