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
    """Retorna el GeoJSON de barrios de un departamento desde PostGIS"""
    query = text("""
        SELECT jsonb_build_object(
            'type',     'FeatureCollection',
            'features', jsonb_agg(features.feature)
        )
        FROM (
          SELECT jsonb_build_object(
            'type',       'Feature',
            'geometry',   ST_AsGeoJSON(geometry)::jsonb,
            'properties', jsonb_build_object(
                'nombre', COALESCE(b."BARLO_DESC", b."DIST_DESC_", 'Sin nombre'),
                'tipo', 'barrio',
                'DIST_DESC_', b."DIST_DESC_",
                'poblacion_total', b.poblacion_total,
                'poblacion_hombres', b.poblacion_hombres,
                'poblacion_mujeres', b.poblacion_mujeres,
                'captados_count', (
                    SELECT count(*) 
                    FROM electoral.posibles_votantes p 
                    WHERE p.latitud IS NOT NULL AND p.longitud IS NOT NULL 
                    AND ST_Contains(b.geometry, ST_SetSRID(ST_Point(p.longitud, p.latitud), 4326))
                )
            )
          ) AS feature
          FROM cartografia.barrios b
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
        print(f"Error querying PostGIS barrios: {e}")
        raise HTTPException(status_code=500, detail="Error al recuperar cartografía de la base de datos")

@router.get("/cartografia/distrito/{dpto_id}/{dist_id}")
async def get_cartografia_distrito(dpto_id: int, dist_id: int, session: AsyncSession = Depends(get_session)):
    """Retorna el GeoJSON del polígono de un distrito específico con sus barrios/localidades"""
    # Primero buscamos el nombre del distrito en el catálogo
    nombre_query = text("""
        SELECT descripcion FROM electoral.ref_distritos 
        WHERE departamento_id = :dpto_id AND id = :dist_id
    """)
    res = await session.execute(nombre_query, {"dpto_id": dpto_id, "dist_id": dist_id})
    row = res.fetchone()
    
    # Formateamos los códigos como texto de 2 dígitos ('01', '02'...) para coincidir con la cartografía
    dpto_code = f"{dpto_id:02d}"
    dist_code = f"{dist_id:02d}"
    
    # Intentamos traer barrios del distrito usando el código del distrito unificado
    # Query unificada por ID de referencia (Lo más preciso)
    barrios_ref_query = text("""
        SELECT jsonb_build_object(
            'type',     'FeatureCollection',
            'features', jsonb_agg(features.feature)
        )
        FROM (
          SELECT jsonb_build_object(
            'type',       'Feature',
            'geometry',   ST_AsGeoJSON(b.geometry)::jsonb,
            'properties', jsonb_build_object(
                'nombre', COALESCE(b."BARLO_DESC", b."DIST_DESC_", 'Sin nombre'),
                'tipo', 'barrio',
                'DIST_DESC_', b."DIST_DESC_",
                'poblacion_total', b.poblacion_total,
                'poblacion_hombres', b.poblacion_hombres,
                'poblacion_mujeres', b.poblacion_mujeres,
                'captados_count', (
                    SELECT count(*) 
                    FROM electoral.posibles_votantes p 
                    WHERE p.latitud IS NOT NULL AND p.longitud IS NOT NULL 
                    AND ST_Contains(b.geometry, ST_SetSRID(ST_Point(p.longitud, p.latitud), 4326))
                )
            )
          ) AS feature
          FROM cartografia.barrios b
          WHERE b."DPTO" = :dpto_code
          AND b.ref_distrito_id = :dist_id
        ) AS features;
    """)

    barrios_query = text("""
        SELECT jsonb_build_object(
            'type',     'FeatureCollection',
            'features', jsonb_agg(features.feature)
        )
        FROM (
          SELECT jsonb_build_object(
            'type',       'Feature',
            'geometry',   ST_AsGeoJSON(b.geometry)::jsonb,
            'properties', jsonb_build_object(
                'nombre', COALESCE(b."BARLO_DESC", b."DIST_DESC_", 'Sin nombre'),
                'tipo', 'barrio',
                'DIST_DESC_', b."DIST_DESC_",
                'poblacion_total', b.poblacion_total,
                'poblacion_hombres', b.poblacion_hombres,
                'poblacion_mujeres', b.poblacion_mujeres,
                'captados_count', (
                    SELECT count(*) 
                    FROM electoral.posibles_votantes p 
                    WHERE p.latitud IS NOT NULL AND p.longitud IS NOT NULL 
                    AND ST_Contains(b.geometry, ST_SetSRID(ST_Point(p.longitud, p.latitud), 4326))
                )
            )
          ) AS feature
          FROM cartografia.barrios b
          WHERE b."DPTO" = :dpto_code
          AND b."DISTRITO" = :dist_code
        ) AS features;
    """)
    
    # Fallback: Si no hay barrios por código, probar por nombre (robusto)
    fallback_barrios_query = text("""
        SELECT jsonb_build_object(
            'type',     'FeatureCollection',
            'features', jsonb_agg(features.feature)
        )
        FROM (
          SELECT jsonb_build_object(
            'type',       'Feature',
            'geometry',   ST_AsGeoJSON(b.geometry)::jsonb,
            'properties', jsonb_build_object(
                'nombre', COALESCE(b."BARLO_DESC", b."DIST_DESC_", 'Sin nombre'),
                'tipo', 'barrio',
                'DIST_DESC_', b."DIST_DESC_",
                'poblacion_total', b.poblacion_total,
                'poblacion_hombres', b.poblacion_hombres,
                'poblacion_mujeres', b.poblacion_mujeres,
                'captados_count', (
                    SELECT count(*) 
                    FROM electoral.posibles_votantes p 
                    WHERE p.latitud IS NOT NULL AND p.longitud IS NOT NULL 
                    AND ST_Contains(b.geometry, ST_SetSRID(ST_Point(p.longitud, p.latitud), 4326))
                )
            )
          ) AS feature
          FROM cartografia.barrios b
          WHERE b."DPTO" = :dpto_code
          AND unaccent(TRIM(b."DIST_DESC_")) = unaccent(TRIM(CAST(:dist_nombre AS TEXT)))
        ) AS features;
    """)
    
    try:
        dist_nombre = row.descripcion if row else None
        
        # 1. Intentar por REF_ID (Lo más preciso ahora que está unificado)
        logger.info(f"Buscando cartografía por REF_ID: {dist_id}")
        result = await session.execute(barrios_ref_query, {
            "dpto_code": dpto_code, 
            "dist_id": dist_id
        })
        geojson = result.scalar()
        if geojson and geojson.get('features'):
            return geojson

        # 2. Intentar por NOMBRE (Fallback robusto)
        if dist_nombre:
            logger.info(f"Buscando cartografía por nombre: {dist_nombre}")
            result = await session.execute(fallback_barrios_query, {
                "dpto_code": dpto_code, 
                "dist_nombre": dist_nombre
            })
            geojson = result.scalar()
            if geojson and geojson.get('features'):
                return geojson

        # 3. Intentar por CÓDIGO (Último recurso)
        result = await session.execute(barrios_query, {"dpto_code": dpto_code, "dist_code": dist_code})
        geojson = result.scalar()
        if geojson and geojson.get('features'):
            return geojson
            
    except Exception as e:
        logger.error(f"Error buscando barrios: {e}")
    
    # Fallback Final: traer el polígono del distrito (cartografia.distritos) usando código o nombre
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
                'nombre', d."DIST_DESC_",
                'dpto', d."DPTO_DESC",
                'tipo', 'distrito'
            )
          ) AS feature
          FROM cartografia.distritos d
          WHERE d."DPTO" = :dpto_code
          AND (
              d.ref_distrito_id = :dist_id
              OR (
                  CAST(:dist_nombre AS TEXT) IS NOT NULL 
                  AND unaccent(TRIM(d."DIST_DESC_")) = unaccent(TRIM(CAST(:dist_nombre AS TEXT)))
              )
          )
        ) AS features;
    """)
    try:
        dist_nombre = row.descripcion if row else None
        result = await session.execute(distrito_query, {
            "dpto_code": dpto_code, 
            "dist_code": dist_code,
            "dist_id": dist_id,
            "dist_nombre": dist_nombre
        })
        geojson = result.scalar()
        if geojson and geojson.get('features'):
            return geojson
        return {"type": "FeatureCollection", "features": []}
    except Exception as e:
        print(f"Error querying PostGIS distrito: {e}")
        raise HTTPException(status_code=500, detail="Error al recuperar cartografía del distrito")


@router.get("/stats/departamentos")
async def get_stats_departamentos(session: AsyncSession = Depends(get_session)):
    """Obtiene cantidad de votantes por departamento"""
    # Join con RefDepartamento para tener los nombres
    stmt = (
        select(
            AnrPadron.departamento,
            RefDepartamento.descripcion,
            func.count(AnrPadron.cedula).label("total")
        )
        .outerjoin(RefDepartamento, AnrPadron.departamento == RefDepartamento.id)
        .group_by(AnrPadron.departamento, RefDepartamento.descripcion)
        .order_by(func.count(AnrPadron.cedula).desc())
    )
    
    result = await session.execute(stmt)
    return [{"id": r[0], "nombre": r[1] or f"ID {r[0]}", "votantes": r[2]} for r in result.all()]

@router.get("/stats/distritos/{dpto_id}")
async def get_stats_distritos(dpto_id: int, session: AsyncSession = Depends(get_session)):
    """Obtiene cantidad de votantes por distrito en un departamento"""
    stmt = (
        select(
            AnrPadron.distrito,
            RefDistrito.descripcion,
            func.count(AnrPadron.cedula).label("total")
        )
        .outerjoin(RefDistrito, and_(AnrPadron.departamento == RefDistrito.departamento_id, AnrPadron.distrito == RefDistrito.id))
        .where(AnrPadron.departamento == dpto_id)
        .group_by(AnrPadron.distrito, RefDistrito.descripcion)
        .order_by(func.count(AnrPadron.cedula).desc())
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
    # Seleccionamos explícitamente las columnas para evitar el error de mapeo de tipos
    # Ya que 'ubicacion' es JSONB en la DB pero el modelo dice Geometry
    stmt = text("""
        SELECT 
            departamento_id, distrito_id, seccional_id, local_id, 
            descripcion, domicilio, ubicacion,
            ST_AsGeoJSON(geom_ubicacion)::jsonb as geom
        FROM electoral.ref_locales
        WHERE (CAST(:d AS INTEGER) IS NULL OR departamento_id = CAST(:d AS INTEGER))
        AND (CAST(:di AS INTEGER) IS NULL OR distrito_id = CAST(:di AS INTEGER))
    """)
    
    result = await session.execute(stmt, {"d": departamento_id, "di": distrito_id})
    rows = result.fetchall()
    
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
        
        # Procesar ubicación (priorizar geom de PostGIS)
        coord = row.ubicacion # Fallback
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
    """Actualiza la ubicación GPS de un local de votación en ambos campos"""
    stmt = text("""
        UPDATE electoral.ref_locales 
        SET ubicacion = :json_val,
            geom_ubicacion = ST_SetSRID(ST_Point(:lng, :lat), 4326)
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
        raise HTTPException(status_code=500, detail=f"Error al actualizar ubicación: {str(e)}")
