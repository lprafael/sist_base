"""
Migration 007: Multitenancy Completo + Catálogos (Equipos por Torneo)
- modalidades: catálogo de formatos de competición (LIGA, PLAYOFF, MIXTO, SUIZO)
- categorias: catálogo de categorías (PRIMERA, SENIOR, EJECUTIVO...)
- canchas_torneo: N:M canchas habilitadas por torneo
- roles_complejo: tabla de roles por tenant (multitenancy de permisos)
- eventos_partido: tabla unificada de goles + tarjetas + eventos de jugadores en el torneo
- ALTER torneos: modalidad_id, categoria_id, slug, puntos configurables, etc.
- ALTER torneos_partidos: resultado_local, resultado_visitante, fase_nombre, etc.
- ALTER torneos_equipos: wo_acumulados, grupo, seed_num, etc.
Timestamp: 2026-06-30
"""

migration_up = """
-- ============================================================
-- MIGRACIÓN 007: MULTITENANCY COMPLETO + CATÁLOGOS
-- ============================================================

-- 1. CATÁLOGO: MODALIDADES
CREATE TABLE IF NOT EXISTS cancha.modalidades (
    id          SMALLINT     PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    codigo      VARCHAR(30)  NOT NULL UNIQUE,
    nombre      VARCHAR(100) NOT NULL,
    descripcion TEXT
);

INSERT INTO cancha.modalidades (codigo, nombre, descripcion) VALUES
    ('LIGA',    'Liga (Todos contra Todos)',  'Round-Robin con Algoritmo de Berger. Todos se enfrentan entre sí.'),
    ('PLAYOFF', 'Eliminación Directa',        'Brackets con BYEs automáticos. Eliminación tras una derrota.'),
    ('MIXTO',   'Grupos + Playoffs',          'Fase de grupos seguida de eliminatorias cruzadas.'),
    ('SUIZO',   'Sistema Suizo',              'Rondas progresivas enfrentando equipos con puntajes similares.')
ON CONFLICT (codigo) DO NOTHING;

-- 2. CATÁLOGO: CATEGORÍAS
CREATE TABLE IF NOT EXISTS cancha.categorias (
    id          SMALLINT     PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    codigo      VARCHAR(30)  NOT NULL UNIQUE,
    nombre      VARCHAR(100) NOT NULL,
    edad_minima SMALLINT     CHECK (edad_minima >= 0),
    edad_maxima SMALLINT     CHECK (edad_maxima >= 0)
);

INSERT INTO cancha.categorias (codigo, nombre, edad_minima, edad_maxima) VALUES
    ('PRIMERA',   'Primera División',   NULL, NULL),
    ('SENIOR',    'Senior / Veteranos',   35, NULL),
    ('EJECUTIVO', 'Ejecutivos',           28, NULL),
    ('JUVENIL',   'Juvenil',           NULL,   18),
    ('FEMENINO',  'Femenino',          NULL, NULL),
    ('EXALUMNOS', 'Exalumnos',         NULL, NULL),
    ('FUTSAL',    'Futsal',            NULL, NULL)
ON CONFLICT (codigo) DO NOTHING;

-- 3. COLUMNAS ADICIONALES EN torneos
ALTER TABLE torneos.torneos
    ADD COLUMN IF NOT EXISTS modalidad_id           SMALLINT REFERENCES cancha.modalidades(id),
    ADD COLUMN IF NOT EXISTS categoria_id           SMALLINT REFERENCES cancha.categorias(id),
    ADD COLUMN IF NOT EXISTS slug                   VARCHAR(170),
    ADD COLUMN IF NOT EXISTS temporada              VARCHAR(20),
    ADD COLUMN IF NOT EXISTS es_publico             BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS puntos_victoria        SMALLINT NOT NULL DEFAULT 3,
    ADD COLUMN IF NOT EXISTS puntos_empate          SMALLINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS puntos_derrota         SMALLINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS amarillas_suspension   SMALLINT NOT NULL DEFAULT 5,
    ADD COLUMN IF NOT EXISTS max_wo_descalificacion SMALLINT NOT NULL DEFAULT 2,
    ADD COLUMN IF NOT EXISTS max_refuerzos          SMALLINT DEFAULT 3,
    ADD COLUMN IF NOT EXISTS logo_url               TEXT;

-- Generar slugs para torneos existentes
UPDATE torneos.torneos
SET slug = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(nombre, '[^a-zA-Z0-9\\s]', '', 'g'), '[\\s]+', '-', 'g')) || '-' || SUBSTR(id::TEXT, 1, 8)
WHERE slug IS NULL;

-- Agregar constraint UNIQUE al slug solo si no existe ya
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'torneos_slug_key'
    ) THEN
        ALTER TABLE torneos.torneos ADD CONSTRAINT torneos_slug_key UNIQUE (slug);
    END IF;
END $$;

-- 4. TABLA: CANCHAS_TORNEO (N:M: qué canchas usa cada torneo)
CREATE TABLE IF NOT EXISTS cancha.canchas_torneo (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    torneo_id UUID NOT NULL REFERENCES torneos.torneos(id)  ON DELETE CASCADE,
    cancha_id UUID NOT NULL REFERENCES cancha.canchas(id)  ON DELETE CASCADE,
    CONSTRAINT uq_cancha_torneo UNIQUE (torneo_id, cancha_id)
);

CREATE INDEX IF NOT EXISTS idx_canchas_torneo_t ON cancha.canchas_torneo(torneo_id);
CREATE INDEX IF NOT EXISTS idx_canchas_torneo_c ON cancha.canchas_torneo(cancha_id);

-- 5. TABLA: ROLES_COMPLEJO (Multitenancy de permisos)
CREATE TABLE IF NOT EXISTS cancha.roles_complejo (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    complejo_id UUID        NOT NULL REFERENCES cancha.complejos(id) ON DELETE CASCADE,
    usuario_id  INTEGER     NOT NULL REFERENCES sistema.usuarios(id) ON DELETE CASCADE,
    rol         VARCHAR(30) NOT NULL DEFAULT 'organizador' CHECK (rol IN ('superadmin','admin_complejo','organizador','veedor')),
    activo      BOOLEAN     NOT NULL DEFAULT TRUE,
    creado_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_usuario_complejo UNIQUE (complejo_id, usuario_id)
);

CREATE INDEX IF NOT EXISTS idx_roles_usuario  ON cancha.roles_complejo(usuario_id);
CREATE INDEX IF NOT EXISTS idx_roles_complejo ON cancha.roles_complejo(complejo_id);

-- 6. TABLA: EVENTOS_PARTIDO (unificada para jugadores del torneo)
CREATE TABLE IF NOT EXISTS cancha.eventos_partido (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    partido_id          UUID        NOT NULL REFERENCES torneos.partidos(id) ON DELETE CASCADE,
    player_id           UUID        REFERENCES cancha.tournament_players(id) ON DELETE CASCADE,
    equipo_id           UUID        NOT NULL REFERENCES torneos.equipos(id) ON DELETE CASCADE,
    tipo                VARCHAR(25) NOT NULL CHECK (tipo IN ('GOL','GOL_PENAL','AUTOGOL','AMARILLA','ROJA','ROJA_DIRECTA','DOBLE_AMARILLA','LESION','SUSTITUCION')),
    minuto              SMALLINT    NOT NULL CHECK (minuto >= 0 AND minuto <= 150),
    periodo             SMALLINT    NOT NULL DEFAULT 1 CHECK (periodo IN (1, 2)),
    es_tiempo_adicional BOOLEAN     NOT NULL DEFAULT FALSE,
    observaciones       TEXT,
    registrado_en       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_eventos_partido_p ON cancha.eventos_partido(partido_id);
CREATE INDEX IF NOT EXISTS idx_eventos_partido_j ON cancha.eventos_partido(player_id);
CREATE INDEX IF NOT EXISTS idx_eventos_partido_t ON cancha.eventos_partido(tipo);

-- 7. COLUMNAS ADICIONALES EN torneos_partidos
ALTER TABLE torneos.partidos
    ADD COLUMN IF NOT EXISTS resultado_local     SMALLINT,
    ADD COLUMN IF NOT EXISTS resultado_visitante SMALLINT,
    ADD COLUMN IF NOT EXISTS fase_nombre         VARCHAR(60),
    ADD COLUMN IF NOT EXISTS numero_ronda        SMALLINT;

-- Mapear goles_ → resultado_ para compatibilidad
UPDATE torneos.partidos
SET resultado_local = goles_local, resultado_visitante = goles_visitante
WHERE resultado_local IS NULL AND goles_local IS NOT NULL;

-- 8. COLUMNAS ADICIONALES EN torneos_equipos
ALTER TABLE torneos.equipos
    ADD COLUMN IF NOT EXISTS wo_acumulados     SMALLINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS grupo             VARCHAR(5),
    ADD COLUMN IF NOT EXISTS seed_num          SMALLINT;
"""

migration_down = """
DROP TABLE IF EXISTS cancha.eventos_partido CASCADE;
DROP TABLE IF EXISTS cancha.roles_complejo CASCADE;
DROP TABLE IF EXISTS cancha.canchas_torneo CASCADE;
DROP TABLE IF EXISTS cancha.categorias CASCADE;
DROP TABLE IF EXISTS cancha.modalidades CASCADE;

ALTER TABLE torneos.torneos
    DROP COLUMN IF EXISTS modalidad_id,
    DROP COLUMN IF EXISTS categoria_id,
    DROP COLUMN IF EXISTS slug,
    DROP COLUMN IF EXISTS temporada,
    DROP COLUMN IF EXISTS es_publico,
    DROP COLUMN IF EXISTS puntos_victoria,
    DROP COLUMN IF EXISTS puntos_empate,
    DROP COLUMN IF EXISTS puntos_derrota,
    DROP COLUMN IF EXISTS amarillas_suspension,
    DROP COLUMN IF EXISTS max_wo_descalificacion,
    DROP COLUMN IF EXISTS max_refuerzos,
    DROP COLUMN IF EXISTS logo_url;

ALTER TABLE torneos.partidos
    DROP COLUMN IF EXISTS resultado_local,
    DROP COLUMN IF EXISTS resultado_visitante,
    DROP COLUMN IF EXISTS fase_nombre,
    DROP COLUMN IF EXISTS numero_ronda;

ALTER TABLE torneos.equipos
    DROP COLUMN IF EXISTS wo_acumulados,
    DROP COLUMN IF EXISTS grupo,
    DROP COLUMN IF EXISTS seed_num;
"""

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

    async def run():
        print("=" * 60)
        print("Ejecutando Migración 007: Multitenancy + Catálogos (Equipos por Torneo)")
        print("=" * 60)
        engine = create_async_engine(DATABASE_URL, echo=False)
        ok = 0
        fail = 0

        # Dividir por ; pero manejar bloques DO $$ ... $$
        raw = migration_up
        statements = []
        buf = []
        in_block = False
        for line in raw.splitlines():
            stripped = line.strip()
            if stripped.startswith("DO $$"):
                in_block = True
            if in_block:
                buf.append(line)
                if stripped.endswith("$$;") or stripped == "END $$;":
                    statements.append("\n".join(buf))
                    buf = []
                    in_block = False
            else:
                buf.append(line)
                if stripped.endswith(";") and not in_block:
                    stmt = "\n".join(buf).strip()
                    if stmt and stmt != ";":
                        statements.append(stmt)
                    buf = []

        async with engine.begin() as conn:
            for i, stmt in enumerate(statements, 1):
                stmt = stmt.strip()
                if not stmt or stmt.startswith("--"):
                    continue
                try:
                    await conn.execute(text(stmt))
                    preview = stmt[:70].replace("\n", " ")
                    print(f"  ✅ [{i:02d}] {preview}...")
                    ok += 1
                except Exception as e:
                    preview = stmt[:70].replace("\n", " ")
                    print(f"  ⚠️  [{i:02d}] {preview}...")
                    print(f"       → {str(e)[:120]}")
                    fail += 1

        await engine.dispose()
        print("=" * 60)
        print(f"Migración 007 completada: {ok} OK | {fail} WARN")
        print("=" * 60)

    asyncio.run(run())
