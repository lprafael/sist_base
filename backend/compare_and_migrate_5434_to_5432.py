"""
compare_and_migrate_5434_to_5432.py

Compara la base de datos en el puerto 5434 con la de 5432 y reporta qué datos
hay en 5434 que podrían migrarse a 5432. Opcionalmente copia las coordenadas
de ref_locales desde 5434 hacia 5432 (solo donde 5432 no tiene datos).

Uso:
  python compare_and_migrate_5434_to_5432.py           # Solo comparar (reporte)
  python compare_and_migrate_5434_to_5432.py --migrate # Comparar y migrar ref_locales (ubicacion/geom)
"""

import os
import sys
import argparse
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# 5432 = BD principal (donde corre la app). 5434 = BD con posibles datos extra a migrar.
DB_5432 = os.getenv("DATABASE_URL_5432", "postgresql://postgres:admin@localhost:5432/SIGEL")
DB_5434 = os.getenv("DATABASE_URL_5434", "postgresql://postgres:admin@localhost:5434/SIGEL")


def _normalize_url(url: str) -> str:
    if not url:
        return url
    u = url.replace("postgresql+asyncpg://", "postgresql://")
    u = u.replace("postgresql+psycopg2://", "postgresql://")
    if "localhost" in u or "127.0.0.1" in u:
        u = u.replace("@db:", "@localhost:")
    return u


def get_conn(port: int):
    url = DB_5432 if port == 5432 else DB_5434
    url = _normalize_url(url)
    engine = create_engine(url)
    return engine.connect()


def table_exists(conn, schema: str, table: str) -> bool:
    r = conn.execute(text("""
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = :s AND table_name = :t
    """), {"s": schema, "t": table})
    return r.scalar() is not None


def column_exists(conn, schema: str, table: str, column: str) -> bool:
    r = conn.execute(text("""
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = :s AND table_name = :t AND column_name = :c
    """), {"s": schema, "t": table, "c": column})
    return r.scalar() is not None


def compare_and_report():
    load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
    db_5432 = _normalize_url(DB_5432)
    db_5434 = _normalize_url(DB_5434)

    print("=" * 60)
    print("Comparación BD 5434 (origen) vs 5432 (destino/principal)")
    print("=" * 60)
    print(f"  5432: {db_5432.split('@')[1] if '@' in db_5432 else db_5432}")
    print(f"  5434: {db_5434.split('@')[1] if '@' in db_5434 else db_5434}")
    print()

    engine_5432 = create_engine(db_5432)
    engine_5434 = create_engine(db_5434)

    with engine_5432.connect() as c32, engine_5434.connect() as c34:
        # 1) ref_locales
        if table_exists(c32, "electoral", "ref_locales") and table_exists(c34, "electoral", "ref_locales"):
            for label, conn in [("5432", c32), ("5434", c34)]:
                r = conn.execute(text("SELECT count(*) FROM electoral.ref_locales"))
                total = r.scalar()
                # Con coordenadas: ubicacion (jsonb) o geom_ubicacion
                has_ubic = column_exists(conn, "electoral", "ref_locales", "ubicacion")
                has_geom = column_exists(conn, "electoral", "ref_locales", "geom_ubicacion")
                con_coord = 0
                if has_ubic and has_geom:
                    conn2 = c32 if label == "5432" else c34
                    r2 = conn2.execute(text("""
                        SELECT count(*) FROM electoral.ref_locales
                        WHERE ubicacion IS NOT NULL OR geom_ubicacion IS NOT NULL
                    """))
                    con_coord = r2.scalar()
                elif has_ubic:
                    r2 = conn.execute(text("SELECT count(*) FROM electoral.ref_locales WHERE ubicacion IS NOT NULL"))
                    con_coord = r2.scalar()
                elif has_geom:
                    r2 = conn.execute(text("SELECT count(*) FROM electoral.ref_locales WHERE geom_ubicacion IS NOT NULL"))
                    con_coord = r2.scalar()
                print(f"  [ref_locales] {label}: total={total}, con coordenadas={con_coord}")
            print()
        else:
            print("  [ref_locales] No existe en ambas BD, se omite.")
            print()

        # 2) anr_padron_2026
        for table in ["anr_padron_2026", "ref_departamentos", "ref_distritos", "ref_seccionales"]:
            if not table_exists(c32, "electoral", table) or not table_exists(c34, "electoral", table):
                continue
            n32 = c32.execute(text(f"SELECT count(*) FROM electoral.{table}")).scalar()
            n34 = c34.execute(text(f"SELECT count(*) FROM electoral.{table}")).scalar()
            diff = n34 - n32
            print(f"  [electoral.{table}] 5432: {n32:,}  |  5434: {n34:,}  |  diferencia: {diff:+,}")
        print()

        # 3) Cuántos ref_locales tienen coords en 5434 y no en 5432 (candidatos a migrar)
        candidatos = 0
        if table_exists(c32, "electoral", "ref_locales") and table_exists(c34, "electoral", "ref_locales"):
            has_geom_34 = column_exists(c34, "electoral", "ref_locales", "geom_ubicacion")
            has_ubic_34 = column_exists(c34, "electoral", "ref_locales", "ubicacion")
            has_geom_32 = column_exists(c32, "electoral", "ref_locales", "geom_ubicacion")
            has_ubic_32 = column_exists(c32, "electoral", "ref_locales", "ubicacion")

            if has_ubic_34 or has_geom_34:
                # Tomar todos los locales con alguna coordenada en 5434
                if has_geom_34:
                    r34 = c34.execute(text("""
                        SELECT departamento_id, distrito_id, seccional_id, local_id
                        FROM electoral.ref_locales
                        WHERE geom_ubicacion IS NOT NULL OR ubicacion IS NOT NULL
                    """))
                else:
                    r34 = c34.execute(text("""
                        SELECT departamento_id, distrito_id, seccional_id, local_id
                        FROM electoral.ref_locales WHERE ubicacion IS NOT NULL
                    """))
                rows_5434_with_coord = r34.fetchall()

                # Para cada uno, ver si en 5432 no hay ni ubicacion ni geom_ubicacion
                for row in rows_5434_with_coord:
                    d, di, s, l = row[0], row[1], row[2], row[3]
                    # Armar SELECT solo con las columnas que existan en 5432
                    cols = []
                    if has_ubic_32:
                        cols.append("ubicacion")
                    if has_geom_32:
                        cols.append("geom_ubicacion")
                    if not cols:
                        # No hay columnas de coordenadas en 5432, nada que comparar
                        break
                    sel = ", ".join(cols)
                    r32 = c32.execute(
                        text(f"SELECT {sel} FROM electoral.ref_locales "
                             "WHERE departamento_id = :d AND distrito_id = :di AND seccional_id = :s AND local_id = :l"),
                        {"d": d, "di": di, "s": s, "l": l},
                    )
                    row32 = r32.fetchone()
                    if not row32:
                        continue
                    # Consideramos que falta si todas las columnas presentes vienen en NULL
                    if all(val is None for val in row32):
                        candidatos += 1

                print(f"  Locales con coords en 5434 y sin coords en 5432 (candidatos a migrar): {candidatos}")
        print()

    engine_5432.dispose()
    engine_5434.dispose()
    return candidatos


def migrate_ref_locales():
    """Copia ubicacion y geom_ubicacion desde 5434 a 5432 para ref_locales donde 5432 no tiene."""
    load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
    db_5432 = _normalize_url(DB_5432)
    db_5434 = _normalize_url(DB_5434)

    engine_5432 = create_engine(db_5432)
    engine_5434 = create_engine(db_5434)

    # Paso 0: asegurar que ref_locales en 5432 tenga columnas de coordenadas
    with engine_5432.begin() as conn32:
        conn32.execute(text("""
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'electoral' AND table_name = 'ref_locales' AND column_name = 'ubicacion') THEN
                    ALTER TABLE electoral.ref_locales ADD COLUMN ubicacion JSONB;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'electoral' AND table_name = 'ref_locales' AND column_name = 'geom_ubicacion') THEN
                    ALTER TABLE electoral.ref_locales ADD COLUMN geom_ubicacion GEOMETRY(Point, 4326);
                END IF;
            END $$;
        """))
        n32 = conn32.execute(text("SELECT count(*) FROM electoral.ref_locales")).scalar()

    # Si ref_locales en 5432 está vacía, copiamos TODAS las filas desde 5434
    if n32 == 0:
        import json
        with engine_5434.connect() as c34, engine_5432.begin() as c32b:
            rows_all = c34.execute(text("""
                SELECT departamento_id, distrito_id, seccional_id, local_id,
                       descripcion, domicilio, ubicacion, geom_ubicacion
                FROM electoral.ref_locales
            """)).fetchall()
            if not rows_all:
                print("ref_locales en 5434 no tiene filas; nada que copiar.")
            else:
                insert_stmt = text("""
                    INSERT INTO electoral.ref_locales
                        (departamento_id, distrito_id, seccional_id, local_id,
                         descripcion, domicilio, ubicacion, geom_ubicacion)
                    VALUES
                        (:d, :di, :s, :l, :desc, :dom, :ubic, :geom)
                    ON CONFLICT (departamento_id, distrito_id, seccional_id, local_id)
                    DO NOTHING
                """)
                for r in rows_all:
                    ubic_val = r[6]
                    if isinstance(ubic_val, dict):
                        ubic_val = json.dumps(ubic_val)
                    c32b.execute(insert_stmt, {
                        "d": r[0], "di": r[1], "s": r[2], "l": r[3],
                        "desc": r[4], "dom": r[5], "ubic": ubic_val, "geom": r[7],
                    })
                print(f"Copia inicial: {len(rows_all)} filas insertadas en electoral.ref_locales (5432).")

    # A partir de aquí, actualizar solo coordenadas donde 5432 tiene filas pero sin coords
    with engine_5434.connect() as c34:
        # Todos los que tienen coordenadas en 5434
        has_geom = column_exists(c34, "electoral", "ref_locales", "geom_ubicacion")
        has_ubic = column_exists(c34, "electoral", "ref_locales", "ubicacion")
        if not has_ubic and not has_geom:
            print("En 5434 no hay columnas ubicacion ni geom_ubicacion. Nada que migrar.")
            return
        if has_geom:
            stmt = text("""
                SELECT departamento_id, distrito_id, seccional_id, local_id,
                       ubicacion,
                       ST_X(geom_ubicacion) as lng, ST_Y(geom_ubicacion) as lat
                FROM electoral.ref_locales
                WHERE geom_ubicacion IS NOT NULL OR ubicacion IS NOT NULL
            """)
        else:
            stmt = text("""
                SELECT departamento_id, distrito_id, seccional_id, local_id, ubicacion, NULL::float as lng, NULL::float as lat
                FROM electoral.ref_locales
                WHERE ubicacion IS NOT NULL
            """)
        rows = c34.execute(stmt).fetchall()

    with engine_5432.connect() as c32:
        has_geom_32 = column_exists(c32, "electoral", "ref_locales", "geom_ubicacion")
        has_ubic_32 = column_exists(c32, "electoral", "ref_locales", "ubicacion")
        updated = 0
        for row in rows:
            d, di, s, l, ubic, lng, lat = row[0], row[1], row[2], row[3], row[4], row[5], row[6]
            # ¿En 5432 este local tiene ya coordenadas?
            r = c32.execute(text("""
                SELECT ubicacion, geom_ubicacion FROM electoral.ref_locales
                WHERE departamento_id = :d AND distrito_id = :di AND seccional_id = :s AND local_id = :l
            """), {"d": d, "di": di, "s": s, "l": l})
            row32 = r.fetchone()
            if not row32 or (row32[0] is not None or row32[1] is not None):
                continue
            # Migrar: actualizar 5432 con ubicacion (y geom si existe)
            import json
            ub = ubic
            if ub is None and lng is not None and lat is not None:
                ub = {"lat": float(lat), "lng": float(lng)}
            if has_ubic_32 and ub is not None:
                ub_str = json.dumps(ub) if isinstance(ub, dict) else ub
                if has_geom_32 and lng is not None and lat is not None:
                    c32.execute(text("""
                        UPDATE electoral.ref_locales
                        SET ubicacion = :ubic, geom_ubicacion = ST_SetSRID(ST_Point(:lng, :lat), 4326)
                        WHERE departamento_id = :d AND distrito_id = :di AND seccional_id = :s AND local_id = :l
                    """), {"ubic": ub_str, "lng": float(lng), "lat": float(lat), "d": d, "di": di, "s": s, "l": l})
                else:
                    c32.execute(text("""
                        UPDATE electoral.ref_locales SET ubicacion = :ubic
                        WHERE departamento_id = :d AND distrito_id = :di AND seccional_id = :s AND local_id = :l
                    """), {"ubic": ub_str, "d": d, "di": di, "s": s, "l": l})
                c32.commit()
                updated += 1
        print(f"Migración: {updated} locales actualizados en 5432 con coordenadas desde 5434.")
    engine_5432.dispose()
    engine_5434.dispose()


def main():
    parser = argparse.ArgumentParser(description="Comparar BD 5434 vs 5432 y opcionalmente migrar ref_locales")
    parser.add_argument("--migrate", action="store_true", help="Migrar coordenadas de ref_locales desde 5434 a 5432")
    args = parser.parse_args()

    compare_and_report()
    if args.migrate:
        print("Ejecutando migración de ref_locales (ubicacion/geom) 5434 -> 5432...")
        migrate_ref_locales()


if __name__ == "__main__":
    main()
