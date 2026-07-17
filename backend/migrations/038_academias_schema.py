"""
Migration 038: Schema Academias Deportivas (SAD-M)
====================================================
Crea el schema `academias` con todas las tablas necesarias para el
Sistema de Gestión de Academias Deportivas Multi-Tenant.

Tablas creadas:
  academias.academias      — Tenant principal (1 academia = 1 dueño usuario)
  academias.miembros       — Staff invitado (administrador, tesorero, profesor)
  academias.sucursales     — Sedes de la academia, cada una con un deporte
  academias.alumnos        — Estudiantes con ficha médica
  academias.tutores        — Padres/tutores vinculados a alumnos
  academias.alumno_tutores — Relación N:M alumno ↔ tutor
  academias.categorias     — Grupos por edad/nivel dentro de una sucursal
  academias.inscripciones  — Alumno inscrito en categoría con cuota pactada
  academias.cuotas         — Cuotas mensuales generadas
  academias.config_cuotas  — Motor de descuentos y configuración financiera
  academias.asistencias    — Control de presentismo por entrenamiento

Timestamp: 2026-07-17
"""

import asyncio
import os
import sys
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL no definida en .env")
    sys.exit(1)

if "host.docker.internal" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("host.docker.internal", "localhost")


migration_up = """
-- ============================================================
-- SCHEMA ACADEMIAS
-- ============================================================
CREATE SCHEMA IF NOT EXISTS academias;

-- ============================================================
-- 1. TABLA: ACADEMIAS (Tenant principal)
-- Una academia = un usuario dueño con rol='academia'
-- ============================================================
CREATE TABLE IF NOT EXISTS academias.academias (
    id             UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id     INTEGER      NOT NULL UNIQUE REFERENCES sistema.usuarios(id) ON DELETE CASCADE,
    nombre         VARCHAR(200) NOT NULL,
    descripcion    TEXT,
    logo_url       VARCHAR(500),
    banner_url     VARCHAR(500),
    color_primario VARCHAR(20)  DEFAULT '#1e3a8a',
    enlace_sitio   VARCHAR(100) UNIQUE,
    facebook       VARCHAR(200),
    instagram      VARCHAR(200),
    youtube        VARCHAR(200),
    whatsapp       VARCHAR(50),
    email          VARCHAR(100),
    telefono       VARCHAR(50),
    pais           VARCHAR(100),
    departamento   VARCHAR(100),
    ciudad         VARCHAR(100),
    acerca_de      TEXT,
    plan           VARCHAR(30)  NOT NULL DEFAULT 'basico' CHECK (plan IN ('basico','profesional','premium')),
    habilitada     BOOLEAN      NOT NULL DEFAULT TRUE,
    creado_en      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_academias_usuario ON academias.academias(usuario_id);
CREATE INDEX IF NOT EXISTS idx_academias_enlace  ON academias.academias(enlace_sitio) WHERE enlace_sitio IS NOT NULL;

-- ============================================================
-- 2. TABLA: SUCURSALES
-- Cada academia puede tener varias; cada sucursal tiene un deporte
-- ============================================================
CREATE TABLE IF NOT EXISTS academias.sucursales (
    id           UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    academia_id  UUID         NOT NULL REFERENCES academias.academias(id) ON DELETE CASCADE,
    nombre       VARCHAR(200) NOT NULL,
    deporte      VARCHAR(50)  NOT NULL,
    direccion    TEXT,
    ciudad       VARCHAR(100),
    departamento VARCHAR(100),
    ubicacion    GEOGRAPHY(POINT, 4326),
    telefono     VARCHAR(50),
    email        VARCHAR(100),
    activa       BOOLEAN      NOT NULL DEFAULT TRUE,
    creado_en    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sucursales_academia ON academias.sucursales(academia_id);

-- ============================================================
-- 3. TABLA: MIEMBROS (Staff interno de la academia)
-- Usuarios del sistema invitados con un rol interno.
-- El dueño NO aparece aquí (vínculo directo en academias.academias.usuario_id).
-- ============================================================
CREATE TABLE IF NOT EXISTS academias.miembros (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    academia_id UUID        NOT NULL REFERENCES academias.academias(id) ON DELETE CASCADE,
    usuario_id  INTEGER     NOT NULL REFERENCES sistema.usuarios(id) ON DELETE CASCADE,
    rol         VARCHAR(30) NOT NULL CHECK (rol IN ('administrador','tesorero','profesor')),
    sucursal_id UUID        REFERENCES academias.sucursales(id) ON DELETE SET NULL,
    activo      BOOLEAN     NOT NULL DEFAULT TRUE,
    creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_miembro_academia UNIQUE (academia_id, usuario_id)
);

CREATE INDEX IF NOT EXISTS idx_miembros_academia ON academias.miembros(academia_id);
CREATE INDEX IF NOT EXISTS idx_miembros_usuario  ON academias.miembros(usuario_id);

-- ============================================================
-- 4. TABLA: ALUMNOS
-- ============================================================
CREATE TABLE IF NOT EXISTS academias.alumnos (
    id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    academia_id         UUID        NOT NULL REFERENCES academias.academias(id) ON DELETE CASCADE,
    sucursal_id         UUID        REFERENCES academias.sucursales(id) ON DELETE SET NULL,
    nombre              VARCHAR(150) NOT NULL,
    apellido            VARCHAR(150),
    fecha_nacimiento    DATE,
    foto_perfil         VARCHAR(500),
    tipo_sangre         VARCHAR(10),
    alergias            TEXT,
    condiciones_medicas TEXT,
    seguro_medico       VARCHAR(200),
    contacto_emergencia VARCHAR(200),
    estado              VARCHAR(30)  NOT NULL DEFAULT 'activo'
                        CHECK (estado IN ('activo','inactivo','prueba')),
    notas               TEXT,
    creado_en           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    actualizado_en      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alumnos_academia  ON academias.alumnos(academia_id);
CREATE INDEX IF NOT EXISTS idx_alumnos_sucursal  ON academias.alumnos(sucursal_id);
CREATE INDEX IF NOT EXISTS idx_alumnos_estado    ON academias.alumnos(estado);

-- ============================================================
-- 5. TABLA: TUTORES (Padres / responsables)
-- ============================================================
CREATE TABLE IF NOT EXISTS academias.tutores (
    id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    academia_id UUID         NOT NULL REFERENCES academias.academias(id) ON DELETE CASCADE,
    nombre      VARCHAR(150) NOT NULL,
    apellido    VARCHAR(150),
    telefono    VARCHAR(50),
    email       VARCHAR(100),
    vinculo     VARCHAR(50),
    es_pagador  BOOLEAN      NOT NULL DEFAULT TRUE,
    creado_en   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tutores_academia ON academias.tutores(academia_id);

-- ============================================================
-- 6. TABLA: ALUMNO_TUTORES (N:M)
-- ============================================================
CREATE TABLE IF NOT EXISTS academias.alumno_tutores (
    alumno_id          UUID    NOT NULL REFERENCES academias.alumnos(id)  ON DELETE CASCADE,
    tutor_id           UUID    NOT NULL REFERENCES academias.tutores(id)  ON DELETE CASCADE,
    es_tutor_principal BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (alumno_id, tutor_id)
);

-- ============================================================
-- 7. TABLA: CATEGORIAS (Grupos dentro de una sucursal)
-- ============================================================
CREATE TABLE IF NOT EXISTS academias.categorias (
    id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    sucursal_id UUID         NOT NULL REFERENCES academias.sucursales(id) ON DELETE CASCADE,
    nombre      VARCHAR(100) NOT NULL,
    edad_min    SMALLINT     CHECK (edad_min >= 0),
    edad_max    SMALLINT     CHECK (edad_max >= 0),
    descripcion TEXT,
    color       VARCHAR(20)  NOT NULL DEFAULT '#3B82F6',
    activa      BOOLEAN      NOT NULL DEFAULT TRUE,
    creado_en   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categorias_sucursal ON academias.categorias(sucursal_id);

-- ============================================================
-- 8. TABLA: INSCRIPCIONES (Alumno en Categoría)
-- ============================================================
CREATE TABLE IF NOT EXISTS academias.inscripciones (
    id                 UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    alumno_id          UUID          NOT NULL REFERENCES academias.alumnos(id)    ON DELETE CASCADE,
    categoria_id       UUID          NOT NULL REFERENCES academias.categorias(id) ON DELETE RESTRICT,
    fecha_inicio       DATE          NOT NULL,
    fecha_fin          DATE,
    dias_por_semana    SMALLINT      NOT NULL DEFAULT 3 CHECK (dias_por_semana BETWEEN 1 AND 7),
    cuota_mensual      NUMERIC(12,0) NOT NULL,
    estado             VARCHAR(30)   NOT NULL DEFAULT 'activa'
                       CHECK (estado IN ('activa','suspendida','finalizada')),
    descuento_aplicado NUMERIC(5,2)  NOT NULL DEFAULT 0,
    beca               BOOLEAN       NOT NULL DEFAULT FALSE,
    notas              TEXT,
    creado_en          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inscripciones_alumno    ON academias.inscripciones(alumno_id);
CREATE INDEX IF NOT EXISTS idx_inscripciones_categoria ON academias.inscripciones(categoria_id);
CREATE INDEX IF NOT EXISTS idx_inscripciones_estado    ON academias.inscripciones(estado);

-- ============================================================
-- 9. TABLA: CUOTAS (Módulo Financiero)
-- ============================================================
CREATE TABLE IF NOT EXISTS academias.cuotas (
    id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    inscripcion_id    UUID          NOT NULL REFERENCES academias.inscripciones(id) ON DELETE CASCADE,
    alumno_id         UUID          NOT NULL REFERENCES academias.alumnos(id)       ON DELETE CASCADE,
    academia_id       UUID          NOT NULL REFERENCES academias.academias(id)     ON DELETE CASCADE,
    periodo           VARCHAR(7)    NOT NULL,
    monto_original    NUMERIC(12,0) NOT NULL,
    descuento         NUMERIC(12,0) NOT NULL DEFAULT 0,
    monto_final       NUMERIC(12,0) NOT NULL,
    estado            VARCHAR(30)   NOT NULL DEFAULT 'pendiente'
                      CHECK (estado IN ('pendiente','pagada','vencida','becada','anulada')),
    fecha_vencimiento DATE          NOT NULL,
    fecha_pago        TIMESTAMPTZ,
    metodo_pago       VARCHAR(50),
    registrado_por    INTEGER       REFERENCES sistema.usuarios(id) ON DELETE SET NULL,
    notas             TEXT,
    creado_en         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_cuota_inscripcion_periodo UNIQUE (inscripcion_id, periodo)
);

CREATE INDEX IF NOT EXISTS idx_cuotas_academia  ON academias.cuotas(academia_id);
CREATE INDEX IF NOT EXISTS idx_cuotas_alumno    ON academias.cuotas(alumno_id);
CREATE INDEX IF NOT EXISTS idx_cuotas_estado    ON academias.cuotas(estado);
CREATE INDEX IF NOT EXISTS idx_cuotas_periodo   ON academias.cuotas(periodo);

-- ============================================================
-- 10. TABLA: CONFIG_CUOTAS (Motor de descuentos)
-- ============================================================
CREATE TABLE IF NOT EXISTS academias.config_cuotas (
    id                   UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    academia_id          UUID          NOT NULL UNIQUE REFERENCES academias.academias(id) ON DELETE CASCADE,
    descuento_2_hermanos NUMERIC(5,2)  NOT NULL DEFAULT 0 CHECK (descuento_2_hermanos BETWEEN 0 AND 100),
    descuento_3_hermanos NUMERIC(5,2)  NOT NULL DEFAULT 0 CHECK (descuento_3_hermanos BETWEEN 0 AND 100),
    permite_pago_anual   BOOLEAN       NOT NULL DEFAULT FALSE,
    descuento_pago_anual NUMERIC(5,2)  NOT NULL DEFAULT 0 CHECK (descuento_pago_anual BETWEEN 0 AND 100),
    dia_vencimiento      SMALLINT      NOT NULL DEFAULT 10 CHECK (dia_vencimiento BETWEEN 1 AND 28),
    matricula_anual      NUMERIC(12,0) NOT NULL DEFAULT 0,
    actualizado_en       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 11. TABLA: ASISTENCIAS
-- ============================================================
CREATE TABLE IF NOT EXISTS academias.asistencias (
    id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    alumno_id         UUID        NOT NULL REFERENCES academias.alumnos(id)    ON DELETE CASCADE,
    categoria_id      UUID        NOT NULL REFERENCES academias.categorias(id) ON DELETE CASCADE,
    fecha             DATE        NOT NULL,
    estado            VARCHAR(30) NOT NULL
                      CHECK (estado IN ('presente','ausente_justificado','ausente','tarde','lesionado')),
    observaciones     TEXT,
    registrado_por_id INTEGER     REFERENCES sistema.usuarios(id) ON DELETE SET NULL,
    registrado_en     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_asistencia_alumno_fecha UNIQUE (alumno_id, categoria_id, fecha)
);

CREATE INDEX IF NOT EXISTS idx_asistencias_alumno    ON academias.asistencias(alumno_id);
CREATE INDEX IF NOT EXISTS idx_asistencias_categoria ON academias.asistencias(categoria_id);
CREATE INDEX IF NOT EXISTS idx_asistencias_fecha     ON academias.asistencias(fecha);

-- ============================================================
-- TRIGGER: actualizar timestamp en academias y alumnos
-- ============================================================
CREATE OR REPLACE FUNCTION academias.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_academias_updated
    BEFORE UPDATE ON academias.academias
    FOR EACH ROW EXECUTE FUNCTION academias.set_updated_at();

CREATE OR REPLACE TRIGGER trg_alumnos_updated
    BEFORE UPDATE ON academias.alumnos
    FOR EACH ROW EXECUTE FUNCTION academias.set_updated_at();
"""

migration_down = """
DROP SCHEMA IF EXISTS academias CASCADE;
"""


async def run_migration(direction: str = "up"):
    engine = create_async_engine(DATABASE_URL, echo=False)
    sql_block = migration_up if direction != "down" else migration_down

    print("=" * 65)
    print(f"Migracion 038: Schema Academias Deportivas -- {direction.upper()}")
    print("=" * 65)

    if direction == "up":
        statements = []
        buf = []
        in_block = False
        for line in sql_block.splitlines():
            stripped = line.strip()
            if "$$" in stripped and not in_block:
                in_block = True
            buf.append(line)
            if in_block and stripped.endswith("$$;"):
                statements.append("\n".join(buf))
                buf = []
                in_block = False
            elif not in_block and stripped.endswith(";") and not stripped.startswith("--"):
                stmt = "\n".join(buf).strip()
                if stmt and stmt != ";":
                    statements.append(stmt)
                buf = []
    else:
        statements = [s.strip() for s in sql_block.split(";") if s.strip()]

    ok = fail = 0

    # Paso 1: Ejecutar CREATE SCHEMA primero, en transaccion propia
    schema_stmts = [s for s in statements if s.strip().upper().startswith("CREATE SCHEMA")]
    rest_stmts   = [s for s in statements if not s.strip().upper().startswith("CREATE SCHEMA")]

    async with engine.connect() as conn:
        for stmt in schema_stmts:
            stmt = stmt.strip()
            if not stmt:
                continue
            try:
                async with conn.begin():
                    await conn.execute(text(stmt))
                preview = stmt[:80].replace("\n", " ")
                print(f"  OK [schema] {preview}")
                ok += 1
            except Exception as e:
                preview = stmt[:80].replace("\n", " ")
                print(f"  WARN [schema] {preview}")
                print(f"       -> {str(e)[:140]}")
                fail += 1

        # Paso 2: El resto de los statements
        for i, stmt in enumerate(rest_stmts, 1):
            stmt = stmt.strip()
            if not stmt or stmt.startswith("--"):
                continue
            try:
                async with conn.begin():
                    await conn.execute(text(stmt))
                preview = stmt[:80].replace("\n", " ")
                print(f"  OK [{i:02d}] {preview}")
                ok += 1
            except Exception as e:
                preview = stmt[:80].replace("\n", " ")
                print(f"  WARN [{i:02d}] {preview}")
                print(f"       -> {str(e)[:140]}")
                fail += 1

    await engine.dispose()
    print("=" * 65)
    print(f"Migracion 038 completada: {ok} OK | {fail} WARN/ERR")
    print("=" * 65)


if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    direction = sys.argv[1] if len(sys.argv) > 1 else "up"
    asyncio.run(run_migration(direction))
