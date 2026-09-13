"""
Migration 050: Mejoras Completas de Gestión de Academias Deportivas
===================================================================
1. Modifica constraint de estado en academias.alumnos para admitir 'suspendido' y 'baja_temporal'.
2. Crea academias.alumnos_suspensiones (bajas temporales por rango de meses).
3. Crea academias.productos (uniformes con talles y accesorios deportivos).
4. Crea academias.ventas_productos (pedidos y ventas a alumnos vinculados a caja).
5. Crea academias.competencias (gestión de torneos y competencias de la academia).
6. Crea academias.competencia_participantes (alumnos inscritos, aranceles y podios).
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

statements = [
    # 0. Asegurar esquema facturacion
    "CREATE SCHEMA IF NOT EXISTS facturacion;",

    # 1. Ampliar estados en alumnos
    """
    ALTER TABLE academias.alumnos
        DROP CONSTRAINT IF EXISTS alumnos_estado_check;
    """,
    """
    ALTER TABLE academias.alumnos
        ADD CONSTRAINT alumnos_estado_check
        CHECK (estado IN ('activo', 'inactivo', 'prueba', 'suspendido', 'baja_temporal'));
    """,

    # 2. Suspensiones temporales de alumnos (baja por unos meses)
    """
    CREATE TABLE IF NOT EXISTS academias.alumnos_suspensiones (
        id             UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
        alumno_id      UUID         NOT NULL REFERENCES academias.alumnos(id) ON DELETE CASCADE,
        academia_id    UUID         NOT NULL REFERENCES academias.academias(id) ON DELETE CASCADE,
        fecha_inicio   DATE         NOT NULL,
        fecha_fin      DATE         NOT NULL,
        motivo         TEXT,
        activa         BOOLEAN      NOT NULL DEFAULT TRUE,
        registrado_por INTEGER      REFERENCES sistema.usuarios(id) ON DELETE SET NULL,
        creado_en      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );
    """,
    "CREATE INDEX IF NOT EXISTS idx_suspensiones_alumno ON academias.alumnos_suspensiones(alumno_id);",
    "CREATE INDEX IF NOT EXISTS idx_suspensiones_acad   ON academias.alumnos_suspensiones(academia_id);",
    "CREATE INDEX IF NOT EXISTS idx_suspensiones_fechas ON academias.alumnos_suspensiones(fecha_inicio, fecha_fin);",

    # 3. Productos (Uniformes y Accesorios)
    """
    CREATE TABLE IF NOT EXISTS academias.productos (
        id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
        academia_id     UUID          NOT NULL REFERENCES academias.academias(id) ON DELETE CASCADE,
        tipo            VARCHAR(30)   NOT NULL CHECK (tipo IN ('uniforme', 'accesorio', 'otro')),
        nombre          VARCHAR(200)  NOT NULL,
        descripcion     TEXT,
        talle_variante  VARCHAR(50),
        precio_venta    NUMERIC(12,0) NOT NULL,
        costo           NUMERIC(12,0) DEFAULT 0,
        stock_actual    INTEGER       NOT NULL DEFAULT 0,
        stock_minimo    INTEGER       DEFAULT 2,
        imagen_url      VARCHAR(500),
        activo          BOOLEAN       NOT NULL DEFAULT TRUE,
        creado_en       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        actualizado_en  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
    );
    """,
    "CREATE INDEX IF NOT EXISTS idx_productos_acad ON academias.productos(academia_id);",
    "CREATE INDEX IF NOT EXISTS idx_productos_tipo ON academias.productos(tipo);",

    # 4. Ventas y pedidos de productos a alumnos
    """
    CREATE TABLE IF NOT EXISTS academias.ventas_productos (
        id                       UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
        academia_id              UUID          NOT NULL REFERENCES academias.academias(id) ON DELETE CASCADE,
        producto_id              UUID          NOT NULL REFERENCES academias.productos(id) ON DELETE RESTRICT,
        alumno_id                UUID          REFERENCES academias.alumnos(id) ON DELETE SET NULL,
        tutor_id                 UUID          REFERENCES academias.tutores(id) ON DELETE SET NULL,
        cantidad                 INTEGER       NOT NULL DEFAULT 1,
        precio_unitario          NUMERIC(12,0) NOT NULL,
        descuento                NUMERIC(12,0) NOT NULL DEFAULT 0,
        monto_total              NUMERIC(12,0) NOT NULL,
        metodo_pago              VARCHAR(50)   NOT NULL DEFAULT 'efectivo',
        metodo_pago_id           UUID          REFERENCES academias.metodos_pago(id) ON DELETE SET NULL,
        cuenta_id                UUID          REFERENCES academias.cuentas(id) ON DELETE SET NULL,
        fecha                    DATE          NOT NULL DEFAULT CURRENT_DATE,
        estado_pago              VARCHAR(30)   NOT NULL DEFAULT 'pagado'
                                 CHECK (estado_pago IN ('pagado', 'pendiente', 'anulado')),
        entregado                BOOLEAN       NOT NULL DEFAULT TRUE,
        fecha_entrega            DATE,
        documento_electronico_id UUID,
        notas                    TEXT,
        registrado_por           INTEGER       REFERENCES sistema.usuarios(id) ON DELETE SET NULL,
        creado_en                TIMESTAMPTZ   NOT NULL DEFAULT NOW()
    );
    """,
    "CREATE INDEX IF NOT EXISTS idx_ventas_acad     ON academias.ventas_productos(academia_id);",
    "CREATE INDEX IF NOT EXISTS idx_ventas_prod     ON academias.ventas_productos(producto_id);",
    "CREATE INDEX IF NOT EXISTS idx_ventas_alumno   ON academias.ventas_productos(alumno_id);",
    "CREATE INDEX IF NOT EXISTS idx_ventas_fecha    ON academias.ventas_productos(fecha);",

    # 5. Competencias y Torneos de la Academia
    """
    CREATE TABLE IF NOT EXISTS academias.competencias (
        id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
        academia_id       UUID          NOT NULL REFERENCES academias.academias(id) ON DELETE CASCADE,
        torneo_id         UUID,
        nombre            VARCHAR(255)  NOT NULL,
        organizador       VARCHAR(200),
        deporte           VARCHAR(100),
        lugar             VARCHAR(255),
        fecha_inicio      DATE          NOT NULL,
        fecha_fin         DATE,
        costo_inscripcion NUMERIC(12,0) DEFAULT 0,
        estado            VARCHAR(30)   NOT NULL DEFAULT 'proxima'
                          CHECK (estado IN ('proxima', 'en_curso', 'finalizada', 'cancelada')),
        notas             TEXT,
        creado_en         TIMESTAMPTZ   NOT NULL DEFAULT NOW()
    );
    """,
    "CREATE INDEX IF NOT EXISTS idx_competencias_acad ON academias.competencias(academia_id);",
    "CREATE INDEX IF NOT EXISTS idx_competencias_fechas ON academias.competencias(fecha_inicio);",

    # 6. Alumnos participantes en competencias
    """
    CREATE TABLE IF NOT EXISTS academias.competencia_participantes (
        id                  UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
        competencia_id      UUID          NOT NULL REFERENCES academias.competencias(id) ON DELETE CASCADE,
        alumno_id           UUID          NOT NULL REFERENCES academias.alumnos(id) ON DELETE CASCADE,
        categoria_modalidad VARCHAR(100),
        arancel_abonado     BOOLEAN       NOT NULL DEFAULT FALSE,
        monto_arancel       NUMERIC(12,0) DEFAULT 0,
        resultado_logro     VARCHAR(100),
        notas               TEXT,
        creado_en           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_competencia_alumno UNIQUE (competencia_id, alumno_id)
    );
    """,
    "CREATE INDEX IF NOT EXISTS idx_comp_part_comp   ON academias.competencia_participantes(competencia_id);",
    "CREATE INDEX IF NOT EXISTS idx_comp_part_alumno ON academias.competencia_participantes(alumno_id);"
]

async def run_migration():
    engine = create_async_engine(DATABASE_URL, echo=False)
    print("=" * 65)
    print("Ejecutando Migración 050: Mejoras Completas de Academias")
    print("=" * 65)
    ok = fail = 0
    async with engine.connect() as conn:
        for i, stmt in enumerate(statements, 1):
            stmt_clean = stmt.strip()
            if not stmt_clean:
                continue
            try:
                async with conn.begin():
                    await conn.execute(text(stmt_clean))
                preview = stmt_clean[:75].replace("\n", " ")
                print(f"  OK [{i:02d}] {preview}")
                ok += 1
            except Exception as e:
                preview = stmt_clean[:75].replace("\n", " ")
                print(f"  WARN [{i:02d}] {preview} -> {str(e)[:120]}")
                fail += 1

    await engine.dispose()
    print("=" * 65)
    print(f"Migración 050 finalizada: {ok} OK | {fail} WARN/ERR")
    print("=" * 65)

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(run_migration())
