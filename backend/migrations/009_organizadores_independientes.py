"""
Migration 009: Organizadores Independientes
- cancha.organizadores: Nueva tabla para usuarios organizadores sin complejo físico.
- cancha.torneos.complejo_id: Cambiar a nullable.
- cancha.torneos.organizador_id: FK a cancha.organizadores.
- cancha.torneos_eventos.complejo_id: Cambiar a nullable.
- cancha.torneos_eventos.organizador_id: FK a cancha.organizadores.
Timestamp: 2026-07-01
"""

migration_up = (
    # 1. Crear tabla cancha.organizadores
    "CREATE TABLE IF NOT EXISTS cancha.organizadores ("
    "    id          INTEGER      PRIMARY KEY GENERATED ALWAYS AS IDENTITY,"
    "    usuario_id  INTEGER      NOT NULL UNIQUE REFERENCES sistema.usuarios(id) ON DELETE CASCADE,"
    "    nombre      VARCHAR(200) NOT NULL,"
    "    habilitado  BOOLEAN      NOT NULL DEFAULT TRUE,"
    "    plan        VARCHAR(30)  NOT NULL DEFAULT 'basico',"
    "    max_torneos SMALLINT     NOT NULL DEFAULT 3,"
    "    creado_en   TIMESTAMPTZ  NOT NULL DEFAULT now()"
    ");\n"
    # 1b. Índice
    "CREATE INDEX IF NOT EXISTS idx_organizadores_usuario ON cancha.organizadores(usuario_id);\n"
    # 2. Hacer complejo_id nullable en torneos y torneos_eventos
    "ALTER TABLE cancha.torneos ALTER COLUMN complejo_id DROP NOT NULL;\n"
    "ALTER TABLE cancha.torneos_eventos ALTER COLUMN complejo_id DROP NOT NULL;\n"
    # 3. Agregar FK organizador_id
    "ALTER TABLE cancha.torneos ADD COLUMN IF NOT EXISTS organizador_id INTEGER REFERENCES cancha.organizadores(id) ON DELETE SET NULL;\n"
    "ALTER TABLE cancha.torneos_eventos ADD COLUMN IF NOT EXISTS organizador_id INTEGER REFERENCES cancha.organizadores(id) ON DELETE SET NULL;\n"
    # 3b. Índices
    "CREATE INDEX IF NOT EXISTS idx_torneos_organizador ON cancha.torneos(organizador_id);\n"
    "CREATE INDEX IF NOT EXISTS idx_torneos_eventos_organizador ON cancha.torneos_eventos(organizador_id);\n"
)

migration_down = (
    "ALTER TABLE cancha.torneos DROP COLUMN IF EXISTS organizador_id;\n"
    "ALTER TABLE cancha.torneos_eventos DROP COLUMN IF EXISTS organizador_id;\n"
    "ALTER TABLE cancha.torneos ALTER COLUMN complejo_id SET NOT NULL;\n"
    "ALTER TABLE cancha.torneos_eventos ALTER COLUMN complejo_id SET NOT NULL;\n"
    "DROP TABLE IF EXISTS cancha.organizadores CASCADE;\n"
)

if __name__ == "__main__":
    import asyncio
    import os
    import sys
    from dotenv import load_dotenv
    from sqlalchemy.ext.asyncio import create_async_engine
    from sqlalchemy import text

    load_dotenv()
    DATABASE_URL = os.getenv("DATABASE_URL")
    if not DATABASE_URL:
        print("ERROR: DATABASE_URL no definida en .env")
        sys.exit(1)

    direction = sys.argv[1] if len(sys.argv) > 1 else "up"
    sql_block = migration_up if direction != "down" else migration_down

    async def run():
        print("=" * 60)
        print(f"Migración 009: Organizadores Independientes — {direction.upper()}")
        print("=" * 60)
        engine = create_async_engine(DATABASE_URL, echo=False)
        ok = 0
        fail = 0

        statements = [s.strip() for s in sql_block.split(";\n") if s.strip()]

        async with engine.connect() as conn:
            for i, stmt in enumerate(statements, 1):
                stmt = stmt.strip().rstrip(";")
                if not stmt or stmt.startswith("--"):
                    continue
                try:
                    async with conn.begin():
                        await conn.execute(text(stmt))
                    preview = stmt[:75].replace("\n", " ")
                    print(f"  ✅ [{i:02d}] {preview}...")
                    ok += 1
                except Exception as e:
                    preview = stmt[:75].replace("\n", " ")
                    print(f"  ⚠️  [{i:02d}] {preview}...")
                    print(f"       → {str(e)[:130]}")
                    fail += 1

        await engine.dispose()
        print("=" * 60)
        print(f"Migración 009 completada: {ok} OK | {fail} WARN")
        print("=" * 60)

    asyncio.run(run())
