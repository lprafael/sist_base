import asyncio
import os
import sys
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

migration_up = """
CREATE SCHEMA IF NOT EXISTS torneos_generales;

CREATE TABLE IF NOT EXISTS torneos_generales.torneos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(200) NOT NULL,
    fecha_inicio DATE,
    fecha_fin DATE,
    lugar VARCHAR(200),
    modalidades_permitidas TEXT[],
    estado VARCHAR(50) DEFAULT 'Borrador',
    creado_en TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS torneos_generales.participantes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    torneo_id UUID NOT NULL REFERENCES torneos_generales.torneos(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    documento VARCHAR(50) NOT NULL,
    fecha_nacimiento DATE NOT NULL,
    genero VARCHAR(20) NOT NULL,
    email VARCHAR(150),
    telefono VARCHAR(50),
    modalidad VARCHAR(100) NOT NULL,
    nivel_experiencia VARCHAR(100) NOT NULL,
    peso_declarado NUMERIC(5,2),
    estatura_declarada NUMERIC(5,2),
    peso_verificado NUMERIC(5,2),
    estatura_verificada NUMERIC(5,2),
    pago_confirmado BOOLEAN DEFAULT FALSE,
    token_confirmacion UUID DEFAULT gen_random_uuid(),
    estado VARCHAR(50) DEFAULT 'Pendiente',
    creado_en TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS torneos_generales.penalidades_catalogo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    torneo_id UUID NOT NULL REFERENCES torneos_generales.torneos(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    monto_gs NUMERIC(12,2) NOT NULL DEFAULT 0,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS torneos_generales.participantes_multas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participante_id UUID NOT NULL REFERENCES torneos_generales.participantes(id) ON DELETE CASCADE,
    penalidad_id UUID NOT NULL REFERENCES torneos_generales.penalidades_catalogo(id),
    estado_pago VARCHAR(50) DEFAULT 'Pendiente',
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS torneos_generales.grupos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    torneo_id UUID NOT NULL REFERENCES torneos_generales.torneos(id) ON DELETE CASCADE,
    nombre_categoria VARCHAR(200) NOT NULL,
    formato_competicion VARCHAR(50) DEFAULT 'Eliminatorias',
    rango_edad_min INTEGER,
    rango_edad_max INTEGER,
    rango_peso_min NUMERIC(5,2),
    rango_peso_max NUMERIC(5,2),
    genero VARCHAR(20),
    modalidad VARCHAR(100),
    nivel VARCHAR(100),
    estado VARCHAR(50) DEFAULT 'Pendiente',
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS torneos_generales.grupo_participantes (
    grupo_id UUID NOT NULL REFERENCES torneos_generales.grupos(id) ON DELETE CASCADE,
    participante_id UUID NOT NULL REFERENCES torneos_generales.participantes(id) ON DELETE CASCADE,
    PRIMARY KEY (grupo_id, participante_id)
);

CREATE TABLE IF NOT EXISTS torneos_generales.encuentros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grupo_id UUID NOT NULL REFERENCES torneos_generales.grupos(id) ON DELETE CASCADE,
    participante1_id UUID REFERENCES torneos_generales.participantes(id) ON DELETE SET NULL,
    participante2_id UUID REFERENCES torneos_generales.participantes(id) ON DELETE SET NULL,
    ronda VARCHAR(50) DEFAULT 'Fase Grupos',
    estado VARCHAR(50) DEFAULT 'Programado',
    ganador_id UUID REFERENCES torneos_generales.participantes(id) ON DELETE SET NULL,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS torneos_generales.puntuaciones_jueces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encuentro_id UUID NOT NULL REFERENCES torneos_generales.encuentros(id) ON DELETE CASCADE,
    participante_id UUID NOT NULL REFERENCES torneos_generales.participantes(id) ON DELETE CASCADE,
    juez_id VARCHAR(100),
    valor_puntos INTEGER DEFAULT 0,
    tipo_registro VARCHAR(50) DEFAULT 'Punto',
    nota TEXT,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tg_part_torneo ON torneos_generales.participantes(torneo_id);
CREATE INDEX IF NOT EXISTS idx_tg_grupos_torneo ON torneos_generales.grupos(torneo_id);
CREATE INDEX IF NOT EXISTS idx_tg_encuentros_grupo ON torneos_generales.encuentros(grupo_id);
"""

migration_down = """
DROP SCHEMA IF EXISTS torneos_generales CASCADE;
"""

if __name__ == "__main__":
    load_dotenv()
    DATABASE_URL = os.getenv("DATABASE_URL")
    if not DATABASE_URL:
        print("ERROR: DATABASE_URL no definida")
        sys.exit(1)

    if "host.docker.internal" in DATABASE_URL:
        DATABASE_URL = DATABASE_URL.replace("host.docker.internal", "localhost")

    async def run():
        print("Ejecutando migracion 015: Torneos Generales (Artes Marciales)...")
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

    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(run())
