"""
asignar_coordenadas_distrito.py

Script para asignar a cada local de votación la coordenada del CENTROIDE
del distrito al que pertenece, usando la cartografía que ya está cargada
en PostGIS (schema cartografia).

Para locales que ya tienen coordenada exacta, no se sobreescribe.
Para los demás, se asigna el centroide como aproximación, marcándolo
con un flag 'aprox: true' en el JSON.
"""

import os
import json
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

def main():
    load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))
    db_url = os.getenv("DATABASE_URL") \
        .replace("postgresql+asyncpg://", "postgresql://") \
        .replace("@db:5432/", "@localhost:5433/")

    engine = create_engine(db_url)

    with engine.begin() as conn:
        # Paso 1: Ver cuántos locales faltan
        result = conn.execute(text("""
            SELECT count(*) FROM electoral.ref_locales WHERE geom_ubicacion IS NULL
        """))
        print(f"Locales sin coordenada: {result.scalar()}")

        # Paso 2: Asignar centroide del DISTRITO desde la tabla cartografia.distritos
        # (uniendo por nombre de distrito y departamento)
        updated = conn.execute(text("""
            UPDATE electoral.ref_locales l
            SET 
                geom_ubicacion = ST_Centroid(d.geometry),
                ubicacion = json_build_object(
                    'lat', ST_Y(ST_Centroid(d.geometry)),
                    'lng', ST_X(ST_Centroid(d.geometry)),
                    'aprox', true,
                    'fuente', 'centroide_distrito'
                )::jsonb
            FROM cartografia.distritos d
            JOIN electoral.ref_distritos rd 
                ON rd.departamento_id = l.departamento_id 
                AND rd.id = l.distrito_id
            JOIN electoral.ref_departamentos dep ON dep.id = l.departamento_id
            WHERE l.geom_ubicacion IS NULL
            -- Intentamos unir por nombre del distrito (normalizado)
            AND (
                LOWER(UNACCENT(d.nombre)) = LOWER(UNACCENT(rd.descripcion))
                OR LOWER(UNACCENT(d.nombre)) LIKE '%' || LOWER(UNACCENT(split_part(rd.descripcion, ' ', 1))) || '%'
            )
        """))
        print(f"Locales actualizados con centroide de distrito (por nombre): {updated.rowcount}")

        # Paso 3: Para los que aún faltan, asignar el centroide del DEPARTAMENTO
        updated2 = conn.execute(text("""
            UPDATE electoral.ref_locales l
            SET 
                geom_ubicacion = ST_Centroid(dep_geo.geometry),
                ubicacion = json_build_object(
                    'lat', ST_Y(ST_Centroid(dep_geo.geometry)),
                    'lng', ST_X(ST_Centroid(dep_geo.geometry)),
                    'aprox', true,
                    'fuente', 'centroide_departamento'
                )::jsonb
            FROM cartografia.departamentos dep_geo
            JOIN electoral.ref_departamentos dep ON dep.id = l.departamento_id
            WHERE l.geom_ubicacion IS NULL
            AND (
                LOWER(UNACCENT(dep_geo.nombre)) = LOWER(UNACCENT(dep.descripcion))
                OR LOWER(UNACCENT(dep_geo.nombre)) LIKE '%' || LOWER(UNACCENT(split_part(dep.descripcion, ' ', 1))) || '%'
            )
        """))
        print(f"Locales actualizados con centroide de departamento: {updated2.rowcount}")

        # Estado final
        result = conn.execute(text("""
            SELECT count(*) as total, count(geom_ubicacion) as con_coord 
            FROM electoral.ref_locales
        """))
        row = result.fetchone()
        print(f"\nEstado final: {row.con_coord}/{row.total} locales con coordenadas")

    engine.dispose()

if __name__ == "__main__":
    main()
