from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, and_, or_, text
import os
import json
import logging
from typing import List, Optional, Dict, Any

logger = logging.getLogger(__name__)


from database import get_session
from models import RefDepartamento, RefDistrito, RefSeccional, RefLocal, AnrPadron
from security import get_current_user, check_permission

router = APIRouter(prefix="/api/electoral/geo", tags=["Georreferenciación"])

# Ruta base de cartografía
CARTOGRAFIA_PATH = os.path.join(os.path.dirname(__file__), "cartografia")

@router.get("/barrios/{dpto_id}")
async def get_barrios(dpto_id: int, session: AsyncSession = Depends(get_session)):
    """Retorna el GeoJSON de barrios de un departamento desde PostGIS con conteo optimizado"""
    # Verificación preventiva: si no hay PostGIS, no intentamos la query pesada
    try:
        check_postgis = await session.execute(text("SELECT 1 FROM pg_extension WHERE extname = 'postgis'"))
        if not check_postgis.scalar():
            logger.warning("PostGIS no está instalado. Retornando colección de barrios vacía.")
            return {"type": "FeatureCollection", "features": []}
    except Exception:
        pass

    query = text("""
        WITH points AS (
            SELECT ST_SetSRID(ST_Point(longitud, latitud), 4326) as geom
            FROM electoral.posibles_votantes
            WHERE latitud IS NOT NULL AND longitud IS NOT NULL
        ),
        counts AS (
            SELECT b.ctid as barrio_id, count(p.geom) as total_captados
            FROM cartografia.barrios b
            LEFT JOIN points p ON ST_Contains(b.geometry, p.geom)
            WHERE b.dpto_id_ref = :dpto_id
            GROUP BY b.ctid
        )
        SELECT jsonb_build_object(
            'type',     'FeatureCollection',
            'features', jsonb_agg(features.feature)
        )
        FROM (
          SELECT jsonb_build_object(
            'type',       'Feature',
            'geometry',   ST_AsGeoJSON(b.geometry)::jsonb,
            'properties', jsonb_build_object(
                'nombre', COALESCE(b.barlo_desc, b.dist_desc_, 'Sin nombre'),
                'tipo', 'barrio',
                'dist_desc_', b.dist_desc_,
                'poblacion_total', b.poblacion_total,
                'poblacion_hombres', b.poblacion_hombres,
                'poblacion_mujeres', b.poblacion_mujeres,
                'captados_count', COALESCE(c.total_captados, 0)
            )
          ) AS feature
          FROM cartografia.barrios b
          LEFT JOIN counts c ON b.ctid = c.barrio_id
          WHERE b.dpto_id_ref = :dpto_id
        ) AS features;
    """)
    try:
        result = await session.execute(query, {"dpto_id": dpto_id})
        geojson = result.scalar()
        if not geojson or not geojson.get('features'):
            return {"type": "FeatureCollection", "features": []}
        return geojson
    except Exception as e:
        logger.error(f"Error querying PostGIS barrios: {e}")
        # Retornamos vacío en lugar de 500 para no romper el frontend
        return {"type": "FeatureCollection", "features": []}

@router.get("/cartografia/distrito/{dpto_id}/{dist_id}")
async def get_cartografia_distrito(dpto_id: int, dist_id: int, session: AsyncSession = Depends(get_session)):
    """Retorna el GeoJSON del polígono de un distrito específico con sus barrios/localidades"""
    # Verificación preventiva de PostGIS
    try:
        check_postgis = await session.execute(text("SELECT 1 FROM pg_extension WHERE extname = 'postgis'"))
        if not check_postgis.scalar():
            logger.warning("PostGIS no está instalado. No se puede recuperar cartografía.")
            return {"type": "FeatureCollection", "features": []}
    except Exception:
        pass

    # Primero buscamos el nombre del distrito en el catálogo
    try:
        nombre_query = text("""
            SELECT descripcion FROM electoral.ref_distritos 
            WHERE departamento_id = :dpto_id AND id = :dist_id
        """)
        res = await session.execute(nombre_query, {"dpto_id": dpto_id, "dist_id": dist_id})
        row = res.fetchone()
    except Exception as e:
        logger.error(f"Error buscando nombre de distrito: {e}")
        return {"type": "FeatureCollection", "features": []}
    
    # Formateamos los códigos como texto de 2 dígitos ('01', '02'...) para coincidir con la cartografía
    # Los códigos de departamento en cartografía suelen ser '01', '02'...
    # Pero el ref_distrito_id puede ser el ID numérico como texto ('0', '1'...) o con padding.
    dist_code = str(dist_id) # Usamos el ID plano como primera opción 
    dist_code_padded = f"{dist_id:02d}" # Y el padded como fallback indirecto si fuera necesario

    dist_nombre = row.descripcion if row else None
    
    # Queries unificadas
    barrios_ref_query = text("""
        WITH points AS (
            SELECT ST_SetSRID(ST_Point(longitud, latitud), 4326) as geom
            FROM electoral.posibles_votantes
            WHERE latitud IS NOT NULL AND longitud IS NOT NULL
        ),
        counts AS (
            SELECT b.ctid as barrio_id, count(p.geom) as total_captados
            FROM cartografia.barrios b
            LEFT JOIN points p ON ST_Contains(b.geometry, p.geom)
            WHERE b.dpto_id_ref = :dpto_id
              AND (b.ref_distrito_id = :dist_id_str OR b.ref_distrito_id = :dist_id_padded)
            GROUP BY b.ctid
        )
        SELECT jsonb_build_object(
            'type',     'FeatureCollection',
            'features', jsonb_agg(features.feature)
        )
        FROM (
          SELECT jsonb_build_object(
            'type',       'Feature',
            'geometry',   ST_AsGeoJSON(b.geometry)::jsonb,
            'properties', jsonb_build_object(
                'nombre', COALESCE(b.barlo_desc, b.dist_desc_, 'Sin nombre'),
                'tipo', 'barrio',
                'dist_desc_', b.dist_desc_,
                'barlo_desc', b.barlo_desc,
                'poblacion_total', b.poblacion_total,
                'poblacion_hombres', b.poblacion_hombres,
                'poblacion_mujeres', b.poblacion_mujeres,
                'captados_count', COALESCE(c.total_captados, 0)
            )
          ) AS feature
          FROM cartografia.barrios b
          LEFT JOIN counts c ON b.ctid = c.barrio_id
          WHERE b.dpto_id_ref = :dpto_id
            AND (b.ref_distrito_id = :dist_id_str OR b.ref_distrito_id = :dist_id_padded)
        ) AS features;
    """)

    fallback_barrios_query = text("""
        WITH points AS (
            SELECT ST_SetSRID(ST_Point(longitud, latitud), 4326) as geom
            FROM electoral.posibles_votantes
            WHERE latitud IS NOT NULL AND longitud IS NOT NULL
        ),
        counts AS (
            SELECT b.ctid as barrio_id, count(p.geom) as total_captados
            FROM cartografia.barrios b
            LEFT JOIN points p ON ST_Contains(b.geometry, p.geom)
            WHERE b.dpto_id_ref = :dpto_id
              AND unaccent(TRIM(b.dist_desc_)) = unaccent(TRIM(:dist_nombre))
            GROUP BY b.ctid
        )
        SELECT jsonb_build_object(
            'type',     'FeatureCollection',
            'features', jsonb_agg(features.feature)
        )
        FROM (
          SELECT jsonb_build_object(
            'type',       'Feature',
            'geometry',   ST_AsGeoJSON(b.geometry)::jsonb,
            'properties', jsonb_build_object(
                'nombre', COALESCE(b.barlo_desc, b.dist_desc_, 'Sin nombre'),
                'tipo', 'barrio',
                'dist_desc_', b.dist_desc_,
                'barlo_desc', b.barlo_desc,
                'poblacion_total', b.poblacion_total,
                'poblacion_hombres', b.poblacion_hombres,
                'poblacion_mujeres', b.poblacion_mujeres,
                'captados_count', COALESCE(c.total_captados, 0)
            )
          ) AS feature
          FROM cartografia.barrios b
          LEFT JOIN counts c ON b.ctid = c.barrio_id
          WHERE b.dpto_id_ref = :dpto_id
            AND unaccent(TRIM(b.dist_desc_)) = unaccent(TRIM(:dist_nombre))
        ) AS features;
    """)
    


    try:
        # 1. Intentar por REF_ID (principal)
        result = await session.execute(barrios_ref_query, {
                "dpto_id": dpto_id,
                "dist_id_str": dist_code,
                "dist_id_padded": dist_code_padded
            })
        geojson = result.scalar()
        if geojson and geojson.get('features'):
            logger.info(f"Barrios encontrados por ref_id para dpto={dpto_id}, dist={dist_id}: {len(geojson['features'])}")
            return geojson

        # 2. Fallback por NOMBRE del distrito
        if dist_nombre:
            result = await session.execute(fallback_barrios_query, {
                "dpto_id": dpto_id,
                "dist_nombre": dist_nombre
            })
            geojson = result.scalar()
            if geojson and geojson.get('features'):
                logger.info(f"Barrios encontrados por nombre='{dist_nombre}': {len(geojson['features'])}")
                return geojson

        logger.warning(f"Sin barrios para dpto_id={dpto_id}, dist_id={dist_id}, nombre='{dist_nombre}'");
    except Exception as e:
        logger.error(f"Error procesando barrios: {e}")
    
    # Fallback Final: polígono del distrito
    distrito_query = text("""
        SELECT jsonb_build_object(
            'type',     'FeatureCollection',
            'features', jsonb_agg(features.feature)
        )
        FROM (
          SELECT jsonb_build_object(
            'type',       'Feature',
            'geometry',   ST_AsGeoJSON(d.geometry)::jsonb,
            'properties', jsonb_build_object(
                'nombre', d.dist_desc_,
                'dpto', d.dpto_desc,
                'tipo', 'distrito'
            )
          ) AS feature
          FROM cartografia.distritos d
          WHERE d.dpto_id_ref = :dpto_id
          AND (
              d.ref_distrito_id = CAST(:dist_id AS TEXT)
              OR (
                  CAST(:dist_nombre AS TEXT) IS NOT NULL 
                  AND unaccent(TRIM(d.dist_desc_)) = unaccent(TRIM(CAST(:dist_nombre AS TEXT)))
              )
          )
        ) AS features;
    """)
    try:
        result = await session.execute(distrito_query, {
            "dpto_id": dpto_id, 
            "dist_id": dist_id,
            "dist_nombre": dist_nombre
        })
        geojson = result.scalar()
        if geojson and geojson.get('features'):
            return geojson
    except Exception as e:
        logger.error(f"Error final de cartografía: {e}")
        
    return {"type": "FeatureCollection", "features": []}


@router.get("/stats/departamentos")
async def get_stats_departamentos(session: AsyncSession = Depends(get_session)):
    """Obtiene cantidad de votantes, distritos y locales por departamento"""
    # 1. Conteo de votantes (Padron)
    votantes_subq = (
        select(AnrPadron.departamento, func.count(AnrPadron.cedula).label("total"))
        .group_by(AnrPadron.departamento)
    ).subquery()

    # 2. Conteo de distritos
    distritos_subq = (
        select(RefDistrito.departamento_id, func.count(RefDistrito.id).label("total_distritos"))
        .group_by(RefDistrito.departamento_id)
    ).subquery()

    # 3. Conteo de locales
    locales_subq = (
        select(RefLocal.departamento_id, func.count(RefLocal.local_id).label("total_locales"))
        .group_by(RefLocal.departamento_id)
    ).subquery()

    stmt = (
        select(
            RefDepartamento.id,
            RefDepartamento.descripcion,
            func.coalesce(votantes_subq.c.total, 0),
            func.coalesce(distritos_subq.c.total_distritos, 0),
            func.coalesce(locales_subq.c.total_locales, 0)
        )
        .outerjoin(votantes_subq, RefDepartamento.id == votantes_subq.c.departamento)
        .outerjoin(distritos_subq, RefDepartamento.id == distritos_subq.c.departamento_id)
        .outerjoin(locales_subq, RefDepartamento.id == locales_subq.c.departamento_id)
        .order_by(votantes_subq.c.total.desc().nulls_last())
    )
    
    result = await session.execute(stmt)
    return [
        {
            "id": r[0], 
            "nombre": r[1] or f"ID {r[0]}", 
            "votantes": r[2], 
            "distritos_count": r[3],
            "locales_count": r[4]
        } for r in result.all()
    ]

@router.get("/stats/distritos/{dpto_id}")
async def get_stats_distritos(dpto_id: int, session: AsyncSession = Depends(get_session)):
    """Obtiene cantidad de votantes, barrios y locales por distrito en un departamento"""
    # 1. Conteo de votantes (Padron)
    votantes_subq = (
        select(AnrPadron.distrito, func.count(AnrPadron.cedula).label("total"))
        .where(AnrPadron.departamento == dpto_id)
        .group_by(AnrPadron.distrito)
    ).subquery()

    # 2. Conteo de barrios (Cartografía)
    # Nota: ref_distrito_id es string en BD segun queries anteriores o compatible con dpto_id
    barrios_subq = text("""
        SELECT ref_distrito_id, count(*) as total_barrios 
        FROM cartografia.barrios 
        WHERE dpto_id_ref = :dpto_id AND ref_distrito_id IS NOT NULL 
        GROUP BY ref_distrito_id
    """)

    # 3. Conteo de locales
    locales_subq = (
        select(RefLocal.distrito_id, func.count(RefLocal.local_id).label("total_locales"))
        .where(RefLocal.departamento_id == dpto_id)
        .group_by(RefLocal.distrito_id)
    ).subquery()

    # Executing subqueries or preparing a more complex SQL
    # Simplificamos trayendo primero los barrios_count
    barrios_res = await session.execute(barrios_subq, {"dpto_id": dpto_id})
    # Normalizamos el mapa de barrios para que acepte tanto IDs planos como padded ('1', '01'...)
    barrios_map = {}
    for r in barrios_res.fetchall():
        rid = str(r[0])
        count = r[1]
        barrios_map[rid] = count
        # Si es un solo dígito, agregamos la versión con padding
        if len(rid) == 1:
            barrios_map[f"0{rid}"] = count
        # Si es '01', grabamos '1'
        if rid.startswith('0') and len(rid) == 2:
            barrios_map[rid[1]] = count


    stmt = (
        select(
            RefDistrito.id,
            RefDistrito.descripcion,
            func.coalesce(votantes_subq.c.total, 0),
            func.coalesce(locales_subq.c.total_locales, 0)
        )
        .where(RefDistrito.departamento_id == dpto_id)
        .outerjoin(votantes_subq, RefDistrito.id == votantes_subq.c.distrito)
        .outerjoin(locales_subq, RefDistrito.id == locales_subq.c.distrito_id)
        .order_by(votantes_subq.c.total.desc().nulls_last())
    )
    
    result = await session.execute(stmt)
    return [
        {
            "id": r[0], 
            "nombre": r[1] or f"ID {r[0]}", 
            "votantes": r[2], 
            "locales_count": r[3],
            "barrios_count": barrios_map.get(str(r[0]), 0)
        } for r in result.all()
    ]

# --- CRUD PARA LOCALES DE VOTACION ---

@router.get("/locales", summary="Listar locales de votación")
async def list_locales(
    departamento_id: Optional[int] = None,
    distrito_id: Optional[int] = None,
    session: AsyncSession = Depends(get_session)
):
    # Verificación dinámica: ¿Existe la columna geom_ubicacion y funciona PostGIS?
    has_postgis = False
    has_geom_col = False
    try:
        ext_check = await session.execute(text("SELECT 1 FROM pg_extension WHERE extname = 'postgis'"))
        has_postgis = ext_check.scalar() == 1
        
        col_check = await session.execute(text("""
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'electoral' AND table_name = 'ref_locales' 
            AND column_name = 'geom_ubicacion'
        """))
        has_geom_col = col_check.scalar() == 1
    except Exception:
        pass

    if has_postgis and has_geom_col:
        # Query completa con PostGIS
        stmt = text("""
            SELECT 
                departamento_id, distrito_id, seccional_id, local_id, 
                descripcion, domicilio, ubicacion,
                ST_AsGeoJSON(geom_ubicacion)::jsonb as geom
            FROM electoral.ref_locales
            WHERE (CAST(:d AS INTEGER) IS NULL OR departamento_id = CAST(:d AS INTEGER))
            AND (CAST(:di AS INTEGER) IS NULL OR distrito_id = CAST(:di AS INTEGER))
        """)
    else:
        # Query simple sin PostGIS
        stmt = text("""
            SELECT 
                departamento_id, distrito_id, seccional_id, local_id, 
                descripcion, domicilio, ubicacion,
                NULL as geom
            FROM electoral.ref_locales
            WHERE (CAST(:d AS INTEGER) IS NULL OR departamento_id = CAST(:d AS INTEGER))
            AND (CAST(:di AS INTEGER) IS NULL OR distrito_id = CAST(:di AS INTEGER))
        """)
    
    try:
        result = await session.execute(stmt, {"d": departamento_id, "di": distrito_id})
        rows = result.fetchall()
    except Exception as e:
        logger.error(f"Error listing locales: {e}")
        return []
    
    items = []
    for row in rows:
        # Votantes por local
        count_stmt = select(func.count(AnrPadron.cedula)).where(
            and_(
                AnrPadron.departamento == row.departamento_id,
                AnrPadron.distrito == row.distrito_id,
                AnrPadron.seccional == row.seccional_id,
                AnrPadron.local == row.local_id
            )
        )
        count_res = await session.execute(count_stmt)
        votantes = count_res.scalar() or 0
        
        # Procesar ubicación (priorizar geom de PostGIS si existe)
        coord = row.ubicacion # Fallback JSON
        if row.geom:
            geom_data = row.geom
            coord = {"lat": geom_data['coordinates'][1], "lng": geom_data['coordinates'][0]}
            
        items.append({
            "departamento_id": row.departamento_id,
            "distrito_id": row.distrito_id,
            "seccional_id": row.seccional_id,
            "local_id": row.local_id,
            "descripcion": row.descripcion,
            "domicilio": row.domicilio,
            "ubicacion": coord,
            "votantes": votantes
        })
    return items

@router.put("/locales/ubicacion")
async def update_local_ubicacion(
    departamento_id: int,
    distrito_id: int,
    seccional_id: int,
    local_id: int,
    lat: float,
    lng: float,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(check_permission("electoral_admin"))
):
    """Actualiza la ubicación GPS de un local de votación en ambos campos si es posible"""
    # Verificación dinámica
    has_postgis = False
    has_geom_col = False
    try:
        ext_check = await session.execute(text("SELECT 1 FROM pg_extension WHERE extname = 'postgis'"))
        has_postgis = ext_check.scalar() == 1
        
        col_check = await session.execute(text("""
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'electoral' AND table_name = 'ref_locales' 
            AND column_name = 'geom_ubicacion'
        """))
        has_geom_col = col_check.scalar() == 1
    except Exception:
        pass

    if has_postgis and has_geom_col:
        stmt = text("""
            UPDATE electoral.ref_locales 
            SET ubicacion = :json_val,
                geom_ubicacion = ST_SetSRID(ST_Point(:lng, :lat), 4326)
            WHERE departamento_id = :d AND distrito_id = :di AND seccional_id = :s AND local_id = :l
        """)
    else:
        stmt = text("""
            UPDATE electoral.ref_locales 
            SET ubicacion = :json_val
            WHERE departamento_id = :d AND distrito_id = :di AND seccional_id = :s AND local_id = :l
        """)
    
    try:
        await session.execute(stmt, {
            "json_val": json.dumps({"lat": lat, "lng": lng}),
            "lat": lat, "lng": lng,
            "d": departamento_id, "di": distrito_id, "s": seccional_id, "l": local_id
        })
        await session.commit()
        return {"message": "Ubicación actualizada correctamente"}
    except Exception as e:
        await session.rollback()
        logger.error(f"Error updating location: {e}")
        raise HTTPException(status_code=500, detail=f"Error al actualizar ubicación: {str(e)}")
