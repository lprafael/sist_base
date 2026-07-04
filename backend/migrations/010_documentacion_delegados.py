"""
Migration 010: Documentación de Delegados e Integrantes de Equipos
- torneos.equipos.token_delegado: Token de acceso (UUID) para carga sin contraseña.
- cancha.tournament_players.documento_firmado_url: PDF/Imagen de deslinde firmado.
- cancha.tournament_players.cedula_anverso_url: Foto cédula anverso.
- cancha.tournament_players.cedula_reverso_url: Foto cédula reverso.
Timestamp: 2026-07-01
"""

migration_up = (
    # 1. Agregar token_delegado a torneos_equipos
    "ALTER TABLE torneos.equipos ADD COLUMN IF NOT EXISTS token_delegado UUID DEFAULT gen_random_uuid();\n"
    "CREATE INDEX IF NOT EXISTS idx_equipos_token ON torneos.equipos(token_delegado);\n"
    # 2. Rellenar existentes
    "UPDATE torneos.equipos SET token_delegado = gen_random_uuid() WHERE token_delegado IS NULL;\n"
    # 3. Agregar campos de documentación a tournament_players
    "ALTER TABLE cancha.tournament_players ADD COLUMN IF NOT EXISTS documento_firmado_url VARCHAR(500);\n"
    "ALTER TABLE cancha.tournament_players ADD COLUMN IF NOT EXISTS cedula_anverso_url VARCHAR(500);\n"
    "ALTER TABLE cancha.tournament_players ADD COLUMN IF NOT EXISTS cedula_reverso_url VARCHAR(500);\n"
)

migration_down = (
    "ALTER TABLE cancha.tournament_players DROP COLUMN IF EXISTS documento_firmado_url;\n"
    "ALTER TABLE cancha.tournament_players DROP COLUMN IF EXISTS cedula_anverso_url;\n"
    "ALTER TABLE cancha.tournament_players DROP COLUMN IF EXISTS cedula_reverso_url;\n"
    "DROP INDEX IF EXISTS cancha.idx_equipos_token;\n"
    "ALTER TABLE torneos.equipos DROP COLUMN IF EXISTS token_delegado;\n"
)

if __name__ == "__main__":
    import asyncio
    import os
    import sys
    from dotenv import load_dotenv
    from sqlalchemy.ext.asyncio import create_async_engine
    from sqlalchemy import text

    # Cargar variables de entorno del directorio backend si es necesario
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
