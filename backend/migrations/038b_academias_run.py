"""Script simple para ejecutar la migración 038 en orden correcto."""
import asyncio
import os
import sys
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "").replace("host.docker.internal", "localhost")

STEPS = [
    # 0: Crear schema
    "CREATE SCHEMA IF NOT EXISTS academias",

    # 1-2: academias
    """CREATE TABLE IF NOT EXISTS academias.academias (
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
)""",
    "CREATE INDEX IF NOT EXISTS idx_academias_usuario ON academias.academias(usuario_id)",
    "CREATE INDEX IF NOT EXISTS idx_academias_enlace  ON academias.academias(enlace_sitio) WHERE enlace_sitio IS NOT NULL",

    # sucursales
    """CREATE TABLE IF NOT EXISTS academias.sucursales (
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
)""",
    "CREATE INDEX IF NOT EXISTS idx_sucursales_academia ON academias.sucursales(academia_id)",

    # miembros
    """CREATE TABLE IF NOT EXISTS academias.miembros (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    academia_id UUID        NOT NULL REFERENCES academias.academias(id) ON DELETE CASCADE,
    usuario_id  INTEGER     NOT NULL REFERENCES sistema.usuarios(id) ON DELETE CASCADE,
    rol         VARCHAR(30) NOT NULL CHECK (rol IN ('administrador','tesorero','profesor')),
    sucursal_id UUID        REFERENCES academias.sucursales(id) ON DELETE SET NULL,
    activo      BOOLEAN     NOT NULL DEFAULT TRUE,
    creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_miembro_academia UNIQUE (academia_id, usuario_id)
)""",
    "CREATE INDEX IF NOT EXISTS idx_miembros_academia ON academias.miembros(academia_id)",
    "CREATE INDEX IF NOT EXISTS idx_miembros_usuario  ON academias.miembros(usuario_id)",

    # alumnos
    """CREATE TABLE IF NOT EXISTS academias.alumnos (
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
    estado              VARCHAR(30)  NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','inactivo','prueba')),
    notas               TEXT,
    creado_en           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    actualizado_en      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
)""",
    "CREATE INDEX IF NOT EXISTS idx_alumnos_academia  ON academias.alumnos(academia_id)",
    "CREATE INDEX IF NOT EXISTS idx_alumnos_sucursal  ON academias.alumnos(sucursal_id)",
    "CREATE INDEX IF NOT EXISTS idx_alumnos_estado    ON academias.alumnos(estado)",

    # tutores
    """CREATE TABLE IF NOT EXISTS academias.tutores (
    id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    academia_id UUID         NOT NULL REFERENCES academias.academias(id) ON DELETE CASCADE,
    nombre      VARCHAR(150) NOT NULL,
    apellido    VARCHAR(150),
    telefono    VARCHAR(50),
    email       VARCHAR(100),
    vinculo     VARCHAR(50),
    es_pagador  BOOLEAN      NOT NULL DEFAULT TRUE,
    creado_en   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
)""",
    "CREATE INDEX IF NOT EXISTS idx_tutores_academia ON academias.tutores(academia_id)",

    # alumno_tutores
    """CREATE TABLE IF NOT EXISTS academias.alumno_tutores (
    alumno_id          UUID    NOT NULL REFERENCES academias.alumnos(id)  ON DELETE CASCADE,
    tutor_id           UUID    NOT NULL REFERENCES academias.tutores(id)  ON DELETE CASCADE,
    es_tutor_principal BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (alumno_id, tutor_id)
)""",

    # categorias
    """CREATE TABLE IF NOT EXISTS academias.categorias (
    id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    sucursal_id UUID         NOT NULL REFERENCES academias.sucursales(id) ON DELETE CASCADE,
    nombre      VARCHAR(100) NOT NULL,
    edad_min    SMALLINT     CHECK (edad_min >= 0),
    edad_max    SMALLINT     CHECK (edad_max >= 0),
    descripcion TEXT,
    color       VARCHAR(20)  NOT NULL DEFAULT '#3B82F6',
    activa      BOOLEAN      NOT NULL DEFAULT TRUE,
    creado_en   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
)""",
    "CREATE INDEX IF NOT EXISTS idx_categorias_sucursal ON academias.categorias(sucursal_id)",

    # inscripciones
    """CREATE TABLE IF NOT EXISTS academias.inscripciones (
    id                 UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    alumno_id          UUID          NOT NULL REFERENCES academias.alumnos(id)    ON DELETE CASCADE,
    categoria_id       UUID          NOT NULL REFERENCES academias.categorias(id) ON DELETE RESTRICT,
    fecha_inicio       DATE          NOT NULL,
    fecha_fin          DATE,
    dias_por_semana    SMALLINT      NOT NULL DEFAULT 3 CHECK (dias_por_semana BETWEEN 1 AND 7),
    cuota_mensual      NUMERIC(12,0) NOT NULL,
    estado             VARCHAR(30)   NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa','suspendida','finalizada')),
    descuento_aplicado NUMERIC(5,2)  NOT NULL DEFAULT 0,
    beca               BOOLEAN       NOT NULL DEFAULT FALSE,
    notas              TEXT,
    creado_en          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
)""",
    "CREATE INDEX IF NOT EXISTS idx_inscripciones_alumno    ON academias.inscripciones(alumno_id)",
    "CREATE INDEX IF NOT EXISTS idx_inscripciones_categoria ON academias.inscripciones(categoria_id)",
    "CREATE INDEX IF NOT EXISTS idx_inscripciones_estado    ON academias.inscripciones(estado)",

    # cuotas
    """CREATE TABLE IF NOT EXISTS academias.cuotas (
    id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    inscripcion_id    UUID          NOT NULL REFERENCES academias.inscripciones(id) ON DELETE CASCADE,
    alumno_id         UUID          NOT NULL REFERENCES academias.alumnos(id)       ON DELETE CASCADE,
    academia_id       UUID          NOT NULL REFERENCES academias.academias(id)     ON DELETE CASCADE,
    periodo           VARCHAR(7)    NOT NULL,
    monto_original    NUMERIC(12,0) NOT NULL,
    descuento         NUMERIC(12,0) NOT NULL DEFAULT 0,
    monto_final       NUMERIC(12,0) NOT NULL,
    estado            VARCHAR(30)   NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','pagada','vencida','becada','anulada')),
    fecha_vencimiento DATE          NOT NULL,
    fecha_pago        TIMESTAMPTZ,
    metodo_pago       VARCHAR(50),
    registrado_por    INTEGER       REFERENCES sistema.usuarios(id) ON DELETE SET NULL,
    notas             TEXT,
    creado_en         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_cuota_inscripcion_periodo UNIQUE (inscripcion_id, periodo)
)""",
    "CREATE INDEX IF NOT EXISTS idx_cuotas_academia  ON academias.cuotas(academia_id)",
    "CREATE INDEX IF NOT EXISTS idx_cuotas_alumno    ON academias.cuotas(alumno_id)",
    "CREATE INDEX IF NOT EXISTS idx_cuotas_estado    ON academias.cuotas(estado)",
    "CREATE INDEX IF NOT EXISTS idx_cuotas_periodo   ON academias.cuotas(periodo)",

    # config_cuotas
    """CREATE TABLE IF NOT EXISTS academias.config_cuotas (
    id                   UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    academia_id          UUID          NOT NULL UNIQUE REFERENCES academias.academias(id) ON DELETE CASCADE,
    descuento_2_hermanos NUMERIC(5,2)  NOT NULL DEFAULT 0 CHECK (descuento_2_hermanos BETWEEN 0 AND 100),
    descuento_3_hermanos NUMERIC(5,2)  NOT NULL DEFAULT 0 CHECK (descuento_3_hermanos BETWEEN 0 AND 100),
    permite_pago_anual   BOOLEAN       NOT NULL DEFAULT FALSE,
    descuento_pago_anual NUMERIC(5,2)  NOT NULL DEFAULT 0 CHECK (descuento_pago_anual BETWEEN 0 AND 100),
    dia_vencimiento      SMALLINT      NOT NULL DEFAULT 10 CHECK (dia_vencimiento BETWEEN 1 AND 28),
    matricula_anual      NUMERIC(12,0) NOT NULL DEFAULT 0,
    actualizado_en       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
)""",

    # asistencias
    """CREATE TABLE IF NOT EXISTS academias.asistencias (
    id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    alumno_id         UUID        NOT NULL REFERENCES academias.alumnos(id)    ON DELETE CASCADE,
    categoria_id      UUID        NOT NULL REFERENCES academias.categorias(id) ON DELETE CASCADE,
    fecha             DATE        NOT NULL,
    estado            VARCHAR(30) NOT NULL CHECK (estado IN ('presente','ausente_justificado','ausente','tarde','lesionado')),
    observaciones     TEXT,
    registrado_por_id INTEGER     REFERENCES sistema.usuarios(id) ON DELETE SET NULL,
    registrado_en     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_asistencia_alumno_fecha UNIQUE (alumno_id, categoria_id, fecha)
)""",
    "CREATE INDEX IF NOT EXISTS idx_asistencias_alumno    ON academias.asistencias(alumno_id)",
    "CREATE INDEX IF NOT EXISTS idx_asistencias_categoria ON academias.asistencias(categoria_id)",
    "CREATE INDEX IF NOT EXISTS idx_asistencias_fecha     ON academias.asistencias(fecha)",

    # triggers
    """CREATE OR REPLACE FUNCTION academias.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql""",

    """CREATE OR REPLACE TRIGGER trg_academias_updated
    BEFORE UPDATE ON academias.academias
    FOR EACH ROW EXECUTE FUNCTION academias.set_updated_at()""",

    """CREATE OR REPLACE TRIGGER trg_alumnos_updated
    BEFORE UPDATE ON academias.alumnos
    FOR EACH ROW EXECUTE FUNCTION academias.set_updated_at()""",
]


async def run():
    engine = create_async_engine(DATABASE_URL, echo=False)
    print("=" * 60)
    print("Migracion 038: Schema Academias Deportivas")
    print("=" * 60)
    ok = fail = 0
    async with engine.connect() as conn:
        for i, stmt in enumerate(STEPS):
            try:
                async with conn.begin():
                    await conn.execute(text(stmt))
                preview = stmt.strip()[:70].replace("\n", " ")
                print(f"  OK [{i:02d}] {preview}")
                ok += 1
            except Exception as e:
                preview = stmt.strip()[:70].replace("\n", " ")
                err = str(e).split("\n")[0][:120]
                print(f"  SKIP [{i:02d}] {preview}")
                print(f"       -> {err}")
                fail += 1
    await engine.dispose()
    print("=" * 60)
    print(f"Completado: {ok} OK | {fail} SKIP (ya existian o error)")
    print("=" * 60)


if __name__ == "__main__":
    if sys.platform == "win32":
        import asyncio
        asyncio.run(run())
    else:
        asyncio.run(run())
