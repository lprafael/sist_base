"""
Migration 002: Módulo de Torneos Completo
- tournament_players → plantel de jugadores por equipo
- torneos_planilla   → asistencia digital de cada partido
- torneos_goles      → goles cronometrados por jugador
- torneos_tarjetas   → tarjetas amarillas y rojas
- torneos_posiciones → tabla de posiciones calculada
- torneos_sanciones  → suspensiones disciplinarias
Timestamp: 2026-05-29
"""

migration_up = """
-- ============================================================
-- 1. JUGADORES EN TORNEO (plantel por equipo)
-- ============================================================
CREATE TABLE IF NOT EXISTS cancha.tournament_players (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    torneo_equipo_id    UUID NOT NULL REFERENCES cancha.torneos_equipos(id) ON DELETE CASCADE,
    nombre              VARCHAR(200) NOT NULL,
    dni                 VARCHAR(20) NOT NULL,
    fecha_nacimiento    DATE,
    numero_camiseta     SMALLINT,
    posicion            VARCHAR(40),          -- arquero, defensor, mediocampista, delantero
    foto_url            VARCHAR(500),
    estado              VARCHAR(20) NOT NULL DEFAULT 'habilitado',
                        -- habilitado | suspendido | inhabilitado
    partidos_jugados    SMALLINT NOT NULL DEFAULT 0,
    amarillas_acum      SMALLINT NOT NULL DEFAULT 0,
    rojas_acum          SMALLINT NOT NULL DEFAULT 0,
    creado_en           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(torneo_equipo_id, dni),
    UNIQUE(torneo_equipo_id, numero_camiseta)
);

CREATE INDEX IF NOT EXISTS idx_tp_equipo ON cancha.tournament_players(torneo_equipo_id);
CREATE INDEX IF NOT EXISTS idx_tp_dni    ON cancha.tournament_players(dni);

-- ============================================================
-- 2. PLANILLA DIGITAL DE PARTIDO (asistencia por jugador)
-- ============================================================
CREATE TABLE IF NOT EXISTS cancha.torneos_planilla (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partido_id          UUID NOT NULL REFERENCES cancha.torneos_partidos(id) ON DELETE CASCADE,
    player_id           UUID NOT NULL REFERENCES cancha.tournament_players(id),
    presente            BOOLEAN NOT NULL DEFAULT false,
    capitan             BOOLEAN NOT NULL DEFAULT false,
    es_titular          BOOLEAN NOT NULL DEFAULT false,
    minuto_ingreso      SMALLINT,
    minuto_salida       SMALLINT,
    creado_en           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(partido_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_planilla_partido ON cancha.torneos_planilla(partido_id);
CREATE INDEX IF NOT EXISTS idx_planilla_player  ON cancha.torneos_planilla(player_id);

-- ============================================================
-- 3. GOLES CRONOMETRADOS
-- ============================================================
CREATE TABLE IF NOT EXISTS cancha.torneos_goles (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partido_id          UUID NOT NULL REFERENCES cancha.torneos_partidos(id) ON DELETE CASCADE,
    player_id           UUID REFERENCES cancha.tournament_players(id),
    equipo_id           UUID NOT NULL REFERENCES cancha.torneos_equipos(id),
    minuto              SMALLINT,
    tipo                VARCHAR(20) NOT NULL DEFAULT 'normal',
                        -- normal | penal | autogol
    anulado             BOOLEAN NOT NULL DEFAULT false,
    creado_en           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_goles_partido ON cancha.torneos_goles(partido_id);
CREATE INDEX IF NOT EXISTS idx_goles_player  ON cancha.torneos_goles(player_id);
CREATE INDEX IF NOT EXISTS idx_goles_equipo  ON cancha.torneos_goles(equipo_id);

-- ============================================================
-- 4. TARJETAS (amarillas y rojas)
-- ============================================================
CREATE TABLE IF NOT EXISTS cancha.torneos_tarjetas (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partido_id          UUID NOT NULL REFERENCES cancha.torneos_partidos(id) ON DELETE CASCADE,
    player_id           UUID NOT NULL REFERENCES cancha.tournament_players(id),
    equipo_id           UUID NOT NULL REFERENCES cancha.torneos_equipos(id),
    minuto              SMALLINT,
    tipo                VARCHAR(20) NOT NULL,
                        -- amarilla | roja_directa | roja_segunda
    -- Puntos fair-play acumulados (calculado al insertar)
    pts_fair_play       SMALLINT NOT NULL DEFAULT 0,
    genera_suspension   BOOLEAN NOT NULL DEFAULT false,
    partidos_suspension SMALLINT NOT NULL DEFAULT 0,
    creado_en           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tarjetas_partido ON cancha.torneos_tarjetas(partido_id);
CREATE INDEX IF NOT EXISTS idx_tarjetas_player  ON cancha.torneos_tarjetas(player_id);
CREATE INDEX IF NOT EXISTS idx_tarjetas_equipo  ON cancha.torneos_tarjetas(equipo_id);

-- ============================================================
-- 5. TABLA DE POSICIONES (actualizada al cerrar cada partido)
-- ============================================================
CREATE TABLE IF NOT EXISTS cancha.torneos_posiciones (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    torneo_id           UUID NOT NULL REFERENCES cancha.torneos(id) ON DELETE CASCADE,
    torneo_equipo_id    UUID NOT NULL REFERENCES cancha.torneos_equipos(id) ON DELETE CASCADE,
    posicion            SMALLINT NOT NULL DEFAULT 0,
    pj                  SMALLINT NOT NULL DEFAULT 0,
    pg                  SMALLINT NOT NULL DEFAULT 0,
    pe                  SMALLINT NOT NULL DEFAULT 0,
    pp                  SMALLINT NOT NULL DEFAULT 0,
    gf                  SMALLINT NOT NULL DEFAULT 0,
    gc                  SMALLINT NOT NULL DEFAULT 0,
    dg                  SMALLINT NOT NULL DEFAULT 0,
    pts                 SMALLINT NOT NULL DEFAULT 0,
    pts_fair_play_neg   SMALLINT NOT NULL DEFAULT 0,
    actualizado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(torneo_id, torneo_equipo_id)
);

CREATE INDEX IF NOT EXISTS idx_posiciones_torneo ON cancha.torneos_posiciones(torneo_id, pts DESC);

-- ============================================================
-- 6. SANCIONES DISCIPLINARIAS
-- ============================================================
CREATE TABLE IF NOT EXISTS cancha.torneos_sanciones (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    torneo_id           UUID NOT NULL REFERENCES cancha.torneos(id) ON DELETE CASCADE,
    player_id           UUID NOT NULL REFERENCES cancha.tournament_players(id),
    tarjeta_id          UUID REFERENCES cancha.torneos_tarjetas(id),
    tipo                VARCHAR(30) NOT NULL DEFAULT 'suspension',
                        -- suspension | multa | descalificacion
    descripcion         TEXT,
    partidos_suspension SMALLINT NOT NULL DEFAULT 1,
    partidos_cumplidos  SMALLINT NOT NULL DEFAULT 0,
    estado              VARCHAR(20) NOT NULL DEFAULT 'vigente',
                        -- vigente | cumplida | apelada | revertida
    creado_en           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sanciones_torneo  ON cancha.torneos_sanciones(torneo_id);
CREATE INDEX IF NOT EXISTS idx_sanciones_player  ON cancha.torneos_sanciones(player_id);
CREATE INDEX IF NOT EXISTS idx_sanciones_estado  ON cancha.torneos_sanciones(estado);

-- ============================================================
-- 7. COLUMNAS ADICIONALES EN torneos_partidos
-- ============================================================
ALTER TABLE cancha.torneos_partidos
    ADD COLUMN IF NOT EXISTS es_wo          BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS equipo_wo_id   UUID REFERENCES cancha.torneos_equipos(id),
    ADD COLUMN IF NOT EXISTS fecha_hora_inicio_real  TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS fecha_hora_fin_real     TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS jornada        SMALLINT,
    ADD COLUMN IF NOT EXISTS acta_cerrada_en TIMESTAMPTZ;

-- ============================================================
-- 8. COLUMNAS ADICIONALES EN torneos_equipos
-- ============================================================
ALTER TABLE cancha.torneos_equipos
    ADD COLUMN IF NOT EXISTS logo_url       VARCHAR(500),
    ADD COLUMN IF NOT EXISTS color_principal VARCHAR(7),
    ADD COLUMN IF NOT EXISTS color_secundario VARCHAR(7);

-- ============================================================
-- 9. TABLA DE PAGOS (si no existe, compatibilidad con migration 001)
-- ============================================================
CREATE TABLE IF NOT EXISTS cancha.torneos_pagos (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    torneo_equipo_id        UUID NOT NULL REFERENCES cancha.torneos_equipos(id) ON DELETE CASCADE,
    monto                   NUMERIC(12,2) NOT NULL,
    moneda                  VARCHAR(3) NOT NULL DEFAULT 'PYG',
    proveedor               VARCHAR(20) NOT NULL DEFAULT 'mercadopago',
    proveedor_preference_id VARCHAR(200),
    proveedor_payment_id    VARCHAR(200),
    estado                  VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    pagado_en               TIMESTAMPTZ,
    recibido_por            VARCHAR(150),
    creado_en               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pagos_equipo  ON cancha.torneos_pagos(torneo_equipo_id);
CREATE INDEX IF NOT EXISTS idx_pagos_estado  ON cancha.torneos_pagos(estado);
"""

migration_down = """
DROP TABLE IF EXISTS cancha.torneos_sanciones CASCADE;
DROP TABLE IF EXISTS cancha.torneos_posiciones CASCADE;
DROP TABLE IF EXISTS cancha.torneos_tarjetas CASCADE;
DROP TABLE IF EXISTS cancha.torneos_goles CASCADE;
DROP TABLE IF EXISTS cancha.torneos_planilla CASCADE;
DROP TABLE IF EXISTS cancha.tournament_players CASCADE;
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
        print("ERROR: DATABASE_URL no definida")
        sys.exit(1)

    async def run():
        print("Ejecutando migracion 002: Modulo de Torneos Completo...")
        engine = create_async_engine(DATABASE_URL, echo=False)
        statements = [s.strip() for s in migration_up.split(";") if s.strip()]
        ok = 0
        async with engine.begin() as conn:
            for i, stmt in enumerate(statements, 1):
                try:
                    await conn.execute(text(stmt))
                    print(f"  OK [{i}/{len(statements)}]: {stmt[:55].replace(chr(10), ' ')}")
                    ok += 1
                except Exception as e:
                    print(f"  WARN [{i}/{len(statements)}]: {str(e)[:100]}")
        await engine.dispose()
        print(f"\nMigracion completada: {ok}/{len(statements)} sentencias OK.")

    asyncio.run(run())

