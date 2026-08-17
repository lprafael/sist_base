"""
Migration 046: Chess / Ajedrez Engine
Timestamp: 2026-08-17

Crea el módulo completo de Ajedrez sobre el schema torneos_generales existente.
No altera ninguna tabla de fútbol (schema torneos) ni artes marciales (PKF/ASAM).
Todas las sentencias son idempotentes (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).

Tablas nuevas:
  - torneos_generales.ajedrez_instituciones       -> Colegios/Universidades
  - torneos_generales.ajedrez_circuitos           -> Circuito anual (agrupa etapas)
  - torneos_generales.ajedrez_circuito_etapas     -> Relacion N:M circuito <-> torneo
  - torneos_generales.ajedrez_rondas              -> Rondas del Sistema Suizo
  - torneos_generales.ajedrez_partidas            -> Emparejamiento + resultado
  - torneos_generales.ajedrez_posiciones          -> Tabla de posiciones con desempates
  - torneos_generales.ajedrez_circuito_ranking    -> Ranking acumulado del circuito

Campos nuevos en torneos_generales.participantes:
  - rating_fide, codigo_fide, rating_nacional
  - usuario_lichess, usuario_chess_com
  - institucion_id, categoria_base, categoria_jugada
"""

migration_up = """
-- ============================================================
-- 1. INSTITUCIONES (Colegios / Universidades)
--    Debe ir primero porque participantes la referencia
-- ============================================================
CREATE TABLE IF NOT EXISTS torneos_generales.ajedrez_instituciones (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre          VARCHAR(200) NOT NULL,
    tipo            VARCHAR(30) NOT NULL DEFAULT 'colegio',
    ciudad          VARCHAR(100),
    pais            VARCHAR(100) DEFAULT 'Paraguay',
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_aj_inst_nombre
    ON torneos_generales.ajedrez_instituciones(nombre);

-- ============================================================
-- 2. EXTENDER participantes CON CAMPOS DE AJEDREZ
-- ============================================================
ALTER TABLE torneos_generales.participantes
    ADD COLUMN IF NOT EXISTS rating_fide        INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS codigo_fide        VARCHAR(20),
    ADD COLUMN IF NOT EXISTS rating_nacional    INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS usuario_lichess    VARCHAR(50),
    ADD COLUMN IF NOT EXISTS usuario_chess_com  VARCHAR(50),
    ADD COLUMN IF NOT EXISTS institucion_id     UUID
        REFERENCES torneos_generales.ajedrez_instituciones(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS categoria_base     VARCHAR(30),
    ADD COLUMN IF NOT EXISTS categoria_jugada   VARCHAR(30);

CREATE INDEX IF NOT EXISTS idx_tg_part_inst
    ON torneos_generales.participantes(institucion_id)
    WHERE institucion_id IS NOT NULL;

-- ============================================================
-- 3. CIRCUITOS ANUALES
-- ============================================================
CREATE TABLE IF NOT EXISTS torneos_generales.ajedrez_circuitos (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizador_id              INTEGER
        REFERENCES cancha.organizadores(id) ON DELETE SET NULL,
    nombre                      VARCHAR(200) NOT NULL,
    anio                        SMALLINT NOT NULL,
    modalidad                   VARCHAR(20) NOT NULL DEFAULT 'presencial',
    min_etapas_para_ranking     SMALLINT NOT NULL DEFAULT 1,
    estado                      VARCHAR(20) NOT NULL DEFAULT 'borrador',
    descripcion                 TEXT,
    creado_en                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_aj_circuitos_org
    ON torneos_generales.ajedrez_circuitos(organizador_id);
CREATE INDEX IF NOT EXISTS idx_aj_circuitos_anio
    ON torneos_generales.ajedrez_circuitos(anio);

-- ============================================================
-- 4. CIRCUITO <-> ETAPAS
-- ============================================================
CREATE TABLE IF NOT EXISTS torneos_generales.ajedrez_circuito_etapas (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    circuito_id     UUID NOT NULL
        REFERENCES torneos_generales.ajedrez_circuitos(id) ON DELETE CASCADE,
    torneo_id       UUID NOT NULL
        REFERENCES torneos_generales.torneos(id) ON DELETE CASCADE,
    numero_etapa    SMALLINT NOT NULL,
    puntos_tabla    JSONB NOT NULL DEFAULT '{"1":12,"2":11,"3":10,"4":9,"5":8,"6":7,"7":6,"8":5,"9":4,"10":3}',
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (circuito_id, torneo_id),
    UNIQUE (circuito_id, numero_etapa)
);
CREATE INDEX IF NOT EXISTS idx_aj_cet_circuito
    ON torneos_generales.ajedrez_circuito_etapas(circuito_id);
CREATE INDEX IF NOT EXISTS idx_aj_cet_torneo
    ON torneos_generales.ajedrez_circuito_etapas(torneo_id);

-- ============================================================
-- 5. RONDAS DEL TORNEO (Sistema Suizo)
-- ============================================================
CREATE TABLE IF NOT EXISTS torneos_generales.ajedrez_rondas (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    torneo_id           UUID NOT NULL
        REFERENCES torneos_generales.torneos(id) ON DELETE CASCADE,
    numero_ronda        SMALLINT NOT NULL,
    estado              VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    fecha_hora          TIMESTAMPTZ,
    modo_emparejamiento VARCHAR(30) NOT NULL DEFAULT 'automatico',
    notas               TEXT,
    creado_en           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (torneo_id, numero_ronda)
);
CREATE INDEX IF NOT EXISTS idx_aj_rondas_torneo
    ON torneos_generales.ajedrez_rondas(torneo_id);

-- ============================================================
-- 6. PARTIDAS (Emparejamiento + Resultado)
-- ============================================================
CREATE TABLE IF NOT EXISTS torneos_generales.ajedrez_partidas (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ronda_id            UUID NOT NULL
        REFERENCES torneos_generales.ajedrez_rondas(id) ON DELETE CASCADE,
    tablero_numero      SMALLINT,
    blancas_id          UUID
        REFERENCES torneos_generales.participantes(id) ON DELETE SET NULL,
    negras_id           UUID
        REFERENCES torneos_generales.participantes(id) ON DELETE SET NULL,
    resultado           VARCHAR(10),
    ganador_id          UUID
        REFERENCES torneos_generales.participantes(id) ON DELETE SET NULL,
    puntos_blancas      DECIMAL(3,1),
    puntos_negras       DECIMAL(3,1),
    modalidad_partida   VARCHAR(20) DEFAULT 'presencial',
    url_partida         VARCHAR(500),
    estado              VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    creado_en           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_aj_partidas_ronda
    ON torneos_generales.ajedrez_partidas(ronda_id);
CREATE INDEX IF NOT EXISTS idx_aj_partidas_blancas
    ON torneos_generales.ajedrez_partidas(blancas_id);
CREATE INDEX IF NOT EXISTS idx_aj_partidas_negras
    ON torneos_generales.ajedrez_partidas(negras_id);

-- ============================================================
-- 7. POSICIONES POR TORNEO (con desempates especificos ajedrez)
-- ============================================================
CREATE TABLE IF NOT EXISTS torneos_generales.ajedrez_posiciones (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    torneo_id           UUID NOT NULL
        REFERENCES torneos_generales.torneos(id) ON DELETE CASCADE,
    ronda_numero        SMALLINT NOT NULL DEFAULT 0,
    participante_id     UUID NOT NULL
        REFERENCES torneos_generales.participantes(id) ON DELETE CASCADE,
    puntos              DECIMAL(5,1) NOT NULL DEFAULT 0,
    partidas_jugadas    SMALLINT NOT NULL DEFAULT 0,
    victorias           SMALLINT NOT NULL DEFAULT 0,
    empates             SMALLINT NOT NULL DEFAULT 0,
    derrotas            SMALLINT NOT NULL DEFAULT 0,
    byes                SMALLINT NOT NULL DEFAULT 0,
    bucholz_cut1        DECIMAL(7,1) NOT NULL DEFAULT 0,
    bucholz_total       DECIMAL(7,1) NOT NULL DEFAULT 0,
    sonneborn_berger    DECIMAL(9,1) NOT NULL DEFAULT 0,
    posicion_final      SMALLINT,
    actualizado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (torneo_id, ronda_numero, participante_id)
);
CREATE INDEX IF NOT EXISTS idx_aj_pos_torneo
    ON torneos_generales.ajedrez_posiciones(torneo_id, ronda_numero);

-- ============================================================
-- 8. RANKING ACUMULADO DEL CIRCUITO
-- ============================================================
CREATE TABLE IF NOT EXISTS torneos_generales.ajedrez_circuito_ranking (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    circuito_id         UUID NOT NULL
        REFERENCES torneos_generales.ajedrez_circuitos(id) ON DELETE CASCADE,
    participante_id     UUID NOT NULL
        REFERENCES torneos_generales.participantes(id) ON DELETE CASCADE,
    categoria_base      VARCHAR(30),
    institucion_id      UUID
        REFERENCES torneos_generales.ajedrez_instituciones(id) ON DELETE SET NULL,
    puntos_totales      DECIMAL(8,1) NOT NULL DEFAULT 0,
    etapas_jugadas      SMALLINT NOT NULL DEFAULT 0,
    mejor_posicion      SMALLINT,
    actualizado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (circuito_id, participante_id)
);
CREATE INDEX IF NOT EXISTS idx_aj_crank_circuito
    ON torneos_generales.ajedrez_circuito_ranking(circuito_id, categoria_base);
CREATE INDEX IF NOT EXISTS idx_aj_crank_inst
    ON torneos_generales.ajedrez_circuito_ranking(circuito_id, institucion_id)
    WHERE institucion_id IS NOT NULL;
"""

migration_down = """
DROP TABLE IF EXISTS torneos_generales.ajedrez_circuito_ranking;
DROP TABLE IF EXISTS torneos_generales.ajedrez_posiciones;
DROP TABLE IF EXISTS torneos_generales.ajedrez_partidas;
DROP TABLE IF EXISTS torneos_generales.ajedrez_rondas;
DROP TABLE IF EXISTS torneos_generales.ajedrez_circuito_etapas;
DROP TABLE IF EXISTS torneos_generales.ajedrez_circuitos;
ALTER TABLE torneos_generales.participantes
    DROP COLUMN IF EXISTS rating_fide,
    DROP COLUMN IF EXISTS codigo_fide,
    DROP COLUMN IF EXISTS rating_nacional,
    DROP COLUMN IF EXISTS usuario_lichess,
    DROP COLUMN IF EXISTS usuario_chess_com,
    DROP COLUMN IF EXISTS institucion_id,
    DROP COLUMN IF EXISTS categoria_base,
    DROP COLUMN IF EXISTS categoria_jugada;
DROP TABLE IF EXISTS torneos_generales.ajedrez_instituciones;
"""
