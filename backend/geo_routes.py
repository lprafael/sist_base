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
    dpto_code = f"{dpto_id:02d}"
    dist_code = f"{dist_id:02d}"
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
              AND b.ref_distrito_id = :dist_id_str
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
            AND b.ref_distrito_id = :dist_id_str
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
    
    dist_id_str = str(dist_id)  # Ensure text comparison

    try:
        # 1. Intentar por REF_ID (principal)
        result = await session.execute(barrios_ref_query, {
            "dpto_id": dpto_id,
            "dist_id_str": dist_id_str
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
    """Obtiene cantidad de votantes por departamento (Optimizado)"""
    # Usamos una subconsulta para contar primero (más rápido con índices) y luego el join para el nombre
    subq = (
        select(
            AnrPadron.departamento,
            func.count(AnrPadron.cedula).label("total")
        )
        .group_by(AnrPadron.departamento)
    ).subquery()

    stmt = (
        select(
            subq.c.departamento,
            RefDepartamento.descripcion,
            subq.c.total
        )
        .outerjoin(RefDepartamento, subq.c.departamento == RefDepartamento.id)
        .order_by(subq.c.total.desc())
    )
    
    result = await session.execute(stmt)
    return [{"id": r[0], "nombre": r[1] or f"ID {r[0]}", "votantes": r[2]} for r in result.all()]

@router.get("/stats/distritos/{dpto_id}")
async def get_stats_distritos(dpto_id: int, session: AsyncSession = Depends(get_session)):
    """Obtiene cantidad de votantes por distrito en un departamento (Optimizado)"""
    subq = (
        select(
            AnrPadron.distrito,
            func.count(AnrPadron.cedula).label("total")
        )
        .where(AnrPadron.departamento == dpto_id)
        .group_by(AnrPadron.distrito)
    ).subquery()

    stmt = (
        select(
            subq.c.distrito,
            RefDistrito.descripcion,
            subq.c.total
        )
        .outerjoin(RefDistrito, and_(RefDistrito.departamento_id == dpto_id, subq.c.distrito == RefDistrito.id))
        .order_by(subq.c.total.desc())
    )
    
    result = await session.execute(stmt)
    return [{"id": r[0], "nombre": r[1] or f"ID {r[0]}", "votantes": r[2]} for r in result.all()]

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
