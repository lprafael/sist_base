"""
Migration 008: Cobertura de Gaps de Lógica de Negocio
- tipos_evento : catálogo normalizado de tipos de evento de partido
                 (reemplaza el CHECK hardcodeado en eventos_partido.tipo)
- player_out_id: soporte a sustituciones en eventos_partido
                 (jugador que SALE, además del que entra / player_id)
- creado_por   : FK directa del torneo al usuario organizador
Timestamp: 2026-07-01
"""

# ── NOTA: Cada statement delimitado por ; en línea propia para el parser ──

migration_up = (
    # 1a. Catálogo tipos_evento
    "CREATE TABLE IF NOT EXISTS cancha.tipos_evento ("
    "    id                SMALLINT     PRIMARY KEY GENERATED ALWAYS AS IDENTITY,"
    "    codigo            VARCHAR(30)  NOT NULL UNIQUE,"
    "    nombre            VARCHAR(100) NOT NULL,"
    "    descripcion       TEXT,"
    "    aplica_a          VARCHAR(20)  NOT NULL DEFAULT 'jugador' CHECK (aplica_a IN ('jugador', 'equipo', 'partido')),"
    "    afecta_marcador   BOOLEAN      NOT NULL DEFAULT FALSE,"
    "    afecta_disciplina BOOLEAN      NOT NULL DEFAULT FALSE,"
    "    activo            BOOLEAN      NOT NULL DEFAULT TRUE"
    ");"
    "\n"
    # 1b. Índice
    "CREATE INDEX IF NOT EXISTS idx_tipos_evento_codigo ON cancha.tipos_evento(codigo);\n"
    # 1c. Datos semilla — tipos conocidos
    "INSERT INTO cancha.tipos_evento (codigo, nombre, descripcion, aplica_a, afecta_marcador, afecta_disciplina) VALUES "
    "('GOL',              'Gol',                    'Gol normal anotado por un jugador',            'jugador', TRUE,  FALSE),"
    "('GOL_PENAL',        'Gol de Penal',            'Gol convertido desde el punto de penal',       'jugador', TRUE,  FALSE),"
    "('AUTOGOL',          'Autogol',                 'Gol en contra convertido por un jugador',      'jugador', TRUE,  FALSE),"
    "('AMARILLA',         'Tarjeta Amarilla',         'Amonestación con tarjeta amarilla',            'jugador', FALSE, TRUE),"
    "('ROJA',             'Tarjeta Roja',             'Expulsión con tarjeta roja',                   'jugador', FALSE, TRUE),"
    "('ROJA_DIRECTA',     'Tarjeta Roja Directa',     'Expulsión directa sin previa amarilla',        'jugador', FALSE, TRUE),"
    "('DOBLE_AMARILLA',   'Doble Amarilla (Roja)',    'Expulsión por acumulación de dos amarillas',   'jugador', FALSE, TRUE),"
    "('SUSTITUCION',      'Sustitución',              'Cambio de jugador dentro del partido',         'jugador', FALSE, FALSE),"
    "('LESION',           'Lesión',                   'Jugador retirado por lesión',                  'jugador', FALSE, FALSE),"
    "('TIEMPO_EXTRA',     'Tiempo Extra',             'Inicio de periodo de tiempo extra',            'partido', FALSE, FALSE),"
    "('PENALES',          'Definición por Penales',   'Inicio de tanda de penales',                   'partido', FALSE, FALSE),"
    "('PENAL_CONVERTIDO', 'Penal Convertido (tanda)', 'Penal convertido en tanda de definición',      'jugador', FALSE, FALSE),"
    "('PENAL_ERRADO',     'Penal Errado (tanda)',     'Penal fallado en tanda de definición',         'jugador', FALSE, FALSE)"
    " ON CONFLICT (codigo) DO NOTHING;\n"
    # 2a. FK tipo_evento_id en eventos_partido
    "ALTER TABLE cancha.eventos_partido ADD COLUMN IF NOT EXISTS tipo_evento_id SMALLINT REFERENCES cancha.tipos_evento(id) ON DELETE RESTRICT;\n"
    # 2b. Índice FK
    "CREATE INDEX IF NOT EXISTS idx_eventos_tipo_evento ON cancha.eventos_partido(tipo_evento_id);\n"
    # 2c. Poblar tipo_evento_id desde tipo (código de texto existente)
    "UPDATE cancha.eventos_partido ep SET tipo_evento_id = te.id FROM cancha.tipos_evento te WHERE ep.tipo = te.codigo AND ep.tipo_evento_id IS NULL;\n"
    # 3. player_out_id para sustituciones
    "ALTER TABLE cancha.eventos_partido ADD COLUMN IF NOT EXISTS player_out_id UUID REFERENCES cancha.tournament_players(id) ON DELETE SET NULL;\n"
    # 3b. Índice player_out
    "CREATE INDEX IF NOT EXISTS idx_eventos_player_out ON cancha.eventos_partido(player_out_id);\n"
    # 4. creado_por en torneos
    "ALTER TABLE cancha.torneos ADD COLUMN IF NOT EXISTS creado_por INTEGER REFERENCES sistema.usuarios(id) ON DELETE SET NULL;\n"
    # 4b. Índice creado_por
    "CREATE INDEX IF NOT EXISTS idx_torneos_creado_por ON cancha.torneos(creado_por);\n"
)

migration_down = (
    "ALTER TABLE cancha.torneos DROP COLUMN IF EXISTS creado_por;\n"
    "ALTER TABLE cancha.eventos_partido DROP COLUMN IF EXISTS player_out_id;\n"
    "ALTER TABLE cancha.eventos_partido DROP COLUMN IF EXISTS tipo_evento_id;\n"
    "DROP TABLE IF EXISTS cancha.tipos_evento CASCADE;\n"
)


# ============================================================
# RUNNER STANDALONE: python migrations/008_gaps_logica_negocio.py [up|down]
# ============================================================
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
        print(f"Migración 008: Gaps de Lógica de Negocio — {direction.upper()}")
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
        print(f"Migración 008 completada: {ok} OK | {fail} WARN")
        print("=" * 60)

    asyncio.run(run())
