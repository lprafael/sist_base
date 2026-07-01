"""
Migration 011: Agregar columna email a cancha.tournament_players
Timestamp: 2026-07-01
"""

migration_up = (
    "ALTER TABLE cancha.tournament_players ADD COLUMN IF NOT EXISTS email VARCHAR(150);\n"
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_players_email ON cancha.tournament_players(email);\n"
)

migration_down = (
    "DROP INDEX IF EXISTS cancha.idx_players_email;\n"
    "ALTER TABLE cancha.tournament_players DROP COLUMN IF EXISTS email;\n"
)

if __name__ == "__main__":
    import asyncio
    import os
    import sys
    from dotenv import load_dotenv
    from sqlalchemy.ext.asyncio import create_async_engine
    from sqlalchemy import text

    main_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    load_dotenv(os.path.join(main_dir, ".env"))

    async def main():
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            print("No DATABASE_URL found.")
            sys.exit(1)
        
        engine = create_async_engine(database_url)
        async with engine.connect() as conn:
            if len(sys.argv) > 1 and sys.argv[1] == "down":
                print("Running DOWN migration...")
                for stmt in migration_down.split(";\n"):
                    if stmt.strip():
                        async with conn.begin():
                            await conn.execute(text(stmt))
                print("DOWN migration applied.")
            else:
                print("Running UP migration...")
                for stmt in migration_up.split(";\n"):
                    if stmt.strip():
                        async with conn.begin():
                            await conn.execute(text(stmt))
                print("UP migration applied.")
        await engine.dispose()

    asyncio.run(main())
