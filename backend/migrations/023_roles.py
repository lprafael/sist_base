"""
Migration 023: Crear tabla cancha.roles
"""

import asyncio
import os
import sys
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

migration_up = """
CREATE TABLE IF NOT EXISTS cancha.roles (
    id SMALLINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO cancha.roles (nombre, descripcion) VALUES
('Administrador', 'Administrador global del sistema con acceso total a todas las funcionalidades y complejos.'),
('Complejo Deportivo', 'Dueño o administrador de un complejo deportivo, gestiona sus canchas, reservas y reportes.'),
('Organizador', 'Persona que organiza torneos y competiciones dentro de uno o varios complejos.'),
('Veedor', 'Encargado de registrar los eventos, asistencia, goles y tarjetas durante los partidos.'),
('Delegado', 'Representante de un equipo en un torneo, encargado de gestionar su plantilla e inscribir jugadores.'),
('Jugador', 'Usuario final que participa en torneos, realiza reservas de canchas y ve sus estadísticas.')
ON CONFLICT (nombre) DO UPDATE SET descripcion = EXCLUDED.descripcion;
"""

migration_down = """
DROP TABLE IF EXISTS cancha.roles CASCADE;
"""

if __name__ == "__main__":
    load_dotenv()
    DATABASE_URL = os.getenv("DATABASE_URL")
    if not DATABASE_URL:
        print("ERROR: DATABASE_URL no definida")
        sys.exit(1)

    if "host.docker.internal" in DATABASE_URL:
        DATABASE_URL = DATABASE_URL.replace("host.docker.internal", "localhost")

    direction = sys.argv[1] if len(sys.argv) > 1 else "up"
    sql_block = migration_up if direction != "down" else migration_down

    async def run():
        print(f"Ejecutando migracion 023: Roles ({direction.upper()})...")
        engine = create_async_engine(DATABASE_URL, echo=False)
        statements = [s.strip() for s in sql_block.split(";") if s.strip()]
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
