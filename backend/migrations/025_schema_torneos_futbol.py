import asyncio
import os
import sys
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

# Añadir el directorio padre (backend) al sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL no definida")
    sys.exit(1)

if "host.docker.internal" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("host.docker.internal", "localhost")

migration_up = """
CREATE SCHEMA IF NOT EXISTS torneos_futbol;

-- 1. Eventos
CREATE TABLE IF NOT EXISTS torneos_futbol.eventos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complejo_id UUID REFERENCES cancha.complejos(id) ON DELETE CASCADE,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE,
    estado VARCHAR(30) DEFAULT 'abierto' CHECK (estado IN ('abierto','en_curso','finalizado','cancelado')),
    creado_en TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Torneos (Categorias)
CREATE TABLE IF NOT EXISTS torneos_futbol.torneos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evento_id UUID REFERENCES torneos_futbol.eventos(id) ON DELETE CASCADE,
    complejo_id UUID REFERENCES cancha.complejos(id) ON DELETE CASCADE,
    categoria VARCHAR(100),
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    deporte VARCHAR(50) NOT NULL,
    formato VARCHAR(50) DEFAULT 'eliminacion_simple' CHECK (formato IN ('liga', 'eliminacion_simple', 'mixto', 'suizo', 'eliminacion_doble', 'grupos')),
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE,
    max_equipos INTEGER DEFAULT 16,
    costo_inscripcion NUMERIC(12,0) DEFAULT 0,
    premio_1 VARCHAR(200),
    premio_2 VARCHAR(200),
    premio_3 VARCHAR(200),
    estado VARCHAR(30) DEFAULT 'abierto' CHECK (estado IN ('abierto','en_curso','finalizado','cancelado')),
    configuracion JSONB DEFAULT '{}'::jsonb,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Equipos
CREATE TABLE IF NOT EXISTS torneos_futbol.equipos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    torneo_id UUID REFERENCES torneos_futbol.torneos(id) ON DELETE CASCADE,
    nombre VARCHAR(150) NOT NULL,
    capitan_nombre VARCHAR(150),
    capitan_telefono VARCHAR(50),
    capitan_email VARCHAR(100),
    estado_inscripcion VARCHAR(30) DEFAULT 'pendiente' CHECK (estado_inscripcion IN ('pendiente','confirmado','eliminado')),
    semilla INTEGER,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Partidos
CREATE TABLE IF NOT EXISTS torneos_futbol.partidos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    torneo_id UUID REFERENCES torneos_futbol.torneos(id) ON DELETE CASCADE,
    cancha_id UUID REFERENCES cancha.canchas(id),
    equipo_local_id UUID REFERENCES torneos_futbol.equipos(id),
    equipo_visitante_id UUID REFERENCES torneos_futbol.equipos(id),
    fecha_hora TIMESTAMPTZ,
    fase VARCHAR(50) DEFAULT 'grupos',
    jornada INTEGER DEFAULT 1,
    estado VARCHAR(30) DEFAULT 'programado' CHECK (estado IN ('programado','en_curso','finalizado','cancelado','wo')),
    goles_local INTEGER,
    goles_visitante INTEGER,
    ganador_id UUID REFERENCES torneos_futbol.equipos(id),
    observaciones TEXT,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tournament Players
CREATE TABLE IF NOT EXISTS torneos_futbol.tournament_players (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    torneo_equipo_id    UUID NOT NULL REFERENCES torneos_futbol.equipos(id) ON DELETE CASCADE,
    nombre              VARCHAR(200) NOT NULL,
    dni                 VARCHAR(20) NOT NULL,
    fecha_nacimiento    DATE,
    numero_camiseta     SMALLINT,
    posicion            VARCHAR(40),
    foto_url            VARCHAR(500),
    estado              VARCHAR(20) NOT NULL DEFAULT 'habilitado',
    partidos_jugados    SMALLINT NOT NULL DEFAULT 0,
    amarillas_acum      SMALLINT NOT NULL DEFAULT 0,
    rojas_acum          SMALLINT NOT NULL DEFAULT 0,
    creado_en           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(torneo_equipo_id, dni),
    UNIQUE(torneo_equipo_id, numero_camiseta)
);

CREATE INDEX IF NOT EXISTS idx_tp_equipo ON torneos_futbol.tournament_players(torneo_equipo_id);

-- 6. Planilla
CREATE TABLE IF NOT EXISTS torneos_futbol.planilla (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partido_id          UUID NOT NULL REFERENCES torneos_futbol.partidos(id) ON DELETE CASCADE,
    player_id           UUID NOT NULL REFERENCES torneos_futbol.tournament_players(id),
    presente            BOOLEAN NOT NULL DEFAULT false,
    capitan             BOOLEAN NOT NULL DEFAULT false,
    es_titular          BOOLEAN NOT NULL DEFAULT false,
    minuto_ingreso      SMALLINT,
    minuto_salida       SMALLINT,
    creado_en           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(partido_id, player_id)
);

-- 7. Goles
CREATE TABLE IF NOT EXISTS torneos_futbol.goles (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partido_id          UUID NOT NULL REFERENCES torneos_futbol.partidos(id) ON DELETE CASCADE,
    player_id           UUID REFERENCES torneos_futbol.tournament_players(id),
    equipo_id           UUID NOT NULL REFERENCES torneos_futbol.equipos(id),
    minuto              SMALLINT,
    tipo                VARCHAR(20) NOT NULL DEFAULT 'normal',
    anulado             BOOLEAN NOT NULL DEFAULT false,
    creado_en           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Tarjetas
CREATE TABLE IF NOT EXISTS torneos_futbol.tarjetas (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partido_id          UUID NOT NULL REFERENCES torneos_futbol.partidos(id) ON DELETE CASCADE,
    player_id           UUID NOT NULL REFERENCES torneos_futbol.tournament_players(id),
    equipo_id           UUID NOT NULL REFERENCES torneos_futbol.equipos(id),
    minuto              SMALLINT,
    tipo                VARCHAR(20) NOT NULL,
    pts_fair_play       SMALLINT NOT NULL DEFAULT 0,
    genera_suspension   BOOLEAN NOT NULL DEFAULT false,
    partidos_suspension SMALLINT NOT NULL DEFAULT 0,
    creado_en           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Posiciones
CREATE TABLE IF NOT EXISTS torneos_futbol.posiciones (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    torneo_id           UUID NOT NULL REFERENCES torneos_futbol.torneos(id) ON DELETE CASCADE,
    equipo_id           UUID NOT NULL REFERENCES torneos_futbol.equipos(id) ON DELETE CASCADE,
    pj                  SMALLINT NOT NULL DEFAULT 0,
    pg                  SMALLINT NOT NULL DEFAULT 0,
    pe                  SMALLINT NOT NULL DEFAULT 0,
    pp                  SMALLINT NOT NULL DEFAULT 0,
    gf                  SMALLINT NOT NULL DEFAULT 0,
    gc                  SMALLINT NOT NULL DEFAULT 0,
    pts                 SMALLINT NOT NULL DEFAULT 0,
    pts_fair_play       SMALLINT NOT NULL DEFAULT 0,
    creado_en           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(torneo_id, equipo_id)
);

-- 10. Sanciones
CREATE TABLE IF NOT EXISTS torneos_futbol.sanciones (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    torneo_id           UUID NOT NULL REFERENCES torneos_futbol.torneos(id) ON DELETE CASCADE,
    player_id           UUID NOT NULL REFERENCES torneos_futbol.tournament_players(id),
    partidos_suspension SMALLINT NOT NULL DEFAULT 1,
    partidos_cumplidos  SMALLINT NOT NULL DEFAULT 0,
    estado              VARCHAR(20) NOT NULL DEFAULT 'vigente',
    motivo              TEXT,
    fecha_resolucion    DATE NOT NULL DEFAULT CURRENT_DATE,
    creado_en           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Pagos
CREATE TABLE IF NOT EXISTS torneos_futbol.pagos (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    torneo_id           UUID NOT NULL REFERENCES torneos_futbol.torneos(id) ON DELETE CASCADE,
    equipo_id           UUID NOT NULL REFERENCES torneos_futbol.equipos(id) ON DELETE CASCADE,
    monto               NUMERIC(10,2) NOT NULL,
    fecha_pago          DATE NOT NULL DEFAULT CURRENT_DATE,
    comprobante_url     VARCHAR(500),
    validado            BOOLEAN NOT NULL DEFAULT false,
    creado_en           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Noticias
CREATE TABLE IF NOT EXISTS torneos_futbol.noticias (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    torneo_id           UUID NOT NULL REFERENCES torneos_futbol.torneos(id) ON DELETE CASCADE,
    titulo              VARCHAR(255) NOT NULL,
    contenido           TEXT NOT NULL,
    imagen_url          VARCHAR(500),
    es_importante       BOOLEAN DEFAULT false,
    autor_id            UUID,
    fecha_publicacion   TIMESTAMPTZ DEFAULT NOW(),
    creado_en           TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en      TIMESTAMPTZ DEFAULT NOW()
);

"""

migration_down = """
DROP TABLE IF EXISTS torneos_futbol.noticias;
DROP TABLE IF EXISTS torneos_futbol.pagos;
DROP TABLE IF EXISTS torneos_futbol.sanciones;
DROP TABLE IF EXISTS torneos_futbol.posiciones;
DROP TABLE IF EXISTS torneos_futbol.tarjetas;
DROP TABLE IF EXISTS torneos_futbol.goles;
DROP TABLE IF EXISTS torneos_futbol.planilla;
DROP TABLE IF EXISTS torneos_futbol.tournament_players;
DROP TABLE IF EXISTS torneos_futbol.partidos;
DROP TABLE IF EXISTS torneos_futbol.equipos;
DROP TABLE IF EXISTS torneos_futbol.torneos;
DROP TABLE IF EXISTS torneos_futbol.eventos;
"""

async def run():
    print("Ejecutando migracion 025: Esquema Torneos Futbol...")
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
    print(f"\\nMigracion completada: {ok}/{len(statements)} sentencias OK.")

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(run())
