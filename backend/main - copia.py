"""
Ejecutar el comando:
uvicorn main:app --reload

main.py - Backend principal del Sistema de Catálogos VMT-CID

Este módulo implementa la API REST para la gestión de catálogos del sistema VMT-CID,
incluyendo operaciones CRUD para gremios, EOTs, feriados, rutas e itinerarios.

Características principales:
- Autenticación y autorización basada en JWT
- Operaciones CRUD para múltiples entidades
- Manejo de datos geoespaciales
- Exportación de datos a formatos estándar
"""

# ============================================
# 1. IMPORTACIONES DE BIBLIOTECAS ESTÁNDAR
# ============================================
import os
import json
import shutil
import tempfile
import zipfile
import traceback
from typing import List, Dict, Any, Optional

# ============================================
# 2. IMPORTACIONES DE TERCEROS
# ============================================
from fastapi import FastAPI, HTTPException, Depends, Response, status
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select
from sqlalchemy import select, func, text, and_, or_, cast, String, distinct, case, desc, asc, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB
from geoalchemy2.shape import to_shape
from shapely.geometry import mapping
from geoalchemy2.shape import to_shape, from_shape
from shapely.geometry import LineString, mapping, shape as shapely_shape
from shapely.wkb import loads as wkb_loads
from shapely import wkt
import binascii
try:
    import shapefile as shp_writer
except Exception:
    shp_writer = None
from sqlalchemy.exc import IntegrityError
from datetime import datetime, date
from dotenv import load_dotenv
import requests
import time

# ============================================
# 3. IMPORTACIONES DE MÓDULOS LOCALES
# ============================================
# Modelos de base de datos
from models import (
    Base, Gremio, EOT, Feriado, 
    CatalogoRuta, HistoricoItinerario
)
from models import HistoricoEotRuta

# Esquemas Pydantic
from schemas import (
    CatalogoRutaCreate, CatalogoRutaUpdate, CatalogoRutaResponse,
    HistoricoItinerarioCreate, HistoricoItinerarioUpdate, HistoricoItinerarioResponse
)
from schemas import (
    HistoricoEotRutaCreate, HistoricoEotRutaUpdate, HistoricoEotRutaResponse
)

# Utilidades de seguridad
from security import check_permission, get_current_user

# ============================================
# 4. CONFIGURACIÓN INICIAL
# ============================================
# Cargar variables de entorno
load_dotenv()

# Configuración del servidor
PORT = int(os.getenv("PORT", "8001"))  # 8000 como valor por defecto

# Configuración de la base de datos
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_async_engine(DATABASE_URL, echo=True)
SessionLocal = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

# ============================================
# 5. INICIALIZACIÓN DE FASTAPI
# ============================================
app = FastAPI(
    title="API del Sistema de Catálogos VMT-CID",
    description="API para la gestión de catálogos del sistema VMT-CID",
    version="1.0.0"
)

# Configuración de CORS - Debe estar antes de cualquier ruta
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://192.168.100.112:3001", "http://127.0.0.1:3001", "http://localhost:3001", "localhost:3001", "http://192.168.100.84:3001"],
    allow_credentials=True,
    allow_methods=["*"],  # Permitir todos los métodos
    allow_headers=["*"],  # Permitir todos los headers
    expose_headers=["Content-Disposition"],
    max_age=600  # Cache preflight requests for 10 minutes
)

# ============================================
# 6. FUNCIONES AUXILIARES
# ============================================

async def get_session():
    """
    Proveedor de dependencia para obtener una sesión de base de datos.
    
    Returns:
        AsyncSession: Sesión de SQLAlchemy para operaciones asíncronas
    """
    async with SessionLocal() as session:
        yield session

# ============================================
# 7. INCLUSIÓN DE ROUTERS EXTERNOS
# ============================================
# Importar y montar los routers de autenticación y gestión de usuarios
from auth import router as auth_router
from reactivate_user import router as reactivate_user_router
from delete_user_physical import router as delete_user_physical_router
from notify_admin_password_reset import router as notify_admin_password_reset_router
from resend_user_password import router as resend_user_password_router

# Montar los routers en la aplicación
app.include_router(auth_router)
app.include_router(reactivate_user_router)
app.include_router(delete_user_physical_router)
app.include_router(notify_admin_password_reset_router)
app.include_router(resend_user_password_router)

# ============================================
# 8. ENDPOINTS CRUD - GREMIOS
# ============================================
@app.get("/gremios", summary="Listar gremios")
async def listar_gremios(
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(check_permission("read"))
):
    result = await session.execute(select(Gremio))
    return result.scalars().all()

@app.post("/gremios", summary="Crear gremio")
async def crear_gremio(
    gremio: dict, 
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(check_permission("write"))
):
    # Asegurar tipos correctos: gre_estado en la base es INTEGER
    if "gre_estado" in gremio:
        try:
            gremio["gre_estado"] = int(gremio["gre_estado"]) if gremio["gre_estado"] != "" else None
        except Exception:
            # Si no se puede convertir, devolver error al cliente
            raise HTTPException(status_code=400, detail="gre_estado debe ser un número entero")

    nuevo = Gremio(**gremio)
    session.add(nuevo)
    await session.commit()
    await session.refresh(nuevo)
    return nuevo

@app.get("/gremios/{gre_id}", summary="Obtener gremio por ID")
async def obtener_gremio(
    gre_id: int, 
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(check_permission("read"))
):
    result = await session.execute(select(Gremio).where(Gremio.gre_id == gre_id))
    gremio = result.scalar_one_or_none()
    if not gremio:
        raise HTTPException(status_code=404, detail="Gremio no encontrado")
    return gremio

@app.put("/gremios/{gre_id}", summary="Actualizar gremio")
async def actualizar_gremio(
    gre_id: int, 
    gremio: dict, 
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(check_permission("write"))
):
    result = await session.execute(select(Gremio).where(Gremio.gre_id == gre_id))
    gremio_existente = result.scalar_one_or_none()
    if not gremio_existente:
        raise HTTPException(status_code=404, detail="Gremio no encontrado")
    
    # Coerce gre_estado to int if present
    if "gre_estado" in gremio:
        try:
            gremio["gre_estado"] = int(gremio["gre_estado"]) if gremio["gre_estado"] != "" else None
        except Exception:
            raise HTTPException(status_code=400, detail="gre_estado debe ser un número entero")

    for key, value in gremio.items():
        setattr(gremio_existente, key, value)
    
    await session.commit()
    await session.refresh(gremio_existente)
    return gremio_existente

@app.delete("/gremios/{gre_id}", summary="Eliminar gremio")
async def eliminar_gremio(
    gre_id: int, 
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(check_permission("delete"))
):
    result = await session.execute(select(Gremio).where(Gremio.gre_id == gre_id))
    gremio = result.scalar_one_or_none()
    if not gremio:
        raise HTTPException(status_code=404, detail="Gremio no encontrado")
    
    await session.delete(gremio)
    await session.commit()
    return {"message": "Gremio eliminado exitosamente"}

# ============================================
# 9. ENDPOINTS CRUD - EOTs
# ============================================
@app.get("/eots", summary="Listar EOTs")
async def listar_eots(
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(check_permission("read"))
):
    result = await session.execute(select(EOT))
    return result.scalars().all()

@app.post("/eots", summary="Crear EOT")
async def crear_eot(
    eot: dict, 
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(check_permission("write"))
):
    nuevo = EOT(**eot)
    session.add(nuevo)
    await session.commit()
    await session.refresh(nuevo)
    return nuevo

@app.get("/eots/{eot_id}", summary="Obtener EOT por ID")
async def obtener_eot(
    eot_id: int, 
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(check_permission("read"))
):
    result = await session.execute(select(EOT).where(EOT.eot_id == eot_id))
    eot = result.scalar_one_or_none()
    if not eot:
        raise HTTPException(status_code=404, detail="EOT no encontrado")
    return eot

@app.put("/eots/{eot_id}", summary="Actualizar EOT")
async def actualizar_eot(
    eot_id: int, 
    eot: dict, 
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(check_permission("write"))
):
    result = await session.execute(select(EOT).where(EOT.eot_id == eot_id))
    eot_existente = result.scalar_one_or_none()
    if not eot_existente:
        raise HTTPException(status_code=404, detail="EOT no encontrado")
    
    for key, value in eot.items():
        setattr(eot_existente, key, value)
    
    await session.commit()
    await session.refresh(eot_existente)
    return eot_existente

@app.delete("/eots/{eot_id}", summary="Eliminar EOT")
async def eliminar_eot(
    eot_id: int, 
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(check_permission("delete"))
):
    result = await session.execute(select(EOT).where(EOT.eot_id == eot_id))
    eot = result.scalar_one_or_none()
    if not eot:
        raise HTTPException(status_code=404, detail="EOT no encontrado")
    
    await session.delete(eot)
    await session.commit()
    return {"message": "EOT eliminado exitosamente"}

# ============================================
# 10. ENDPOINTS CRUD - FERIADOS
# ============================================
@app.get("/feriados", summary="Listar feriados")
async def listar_feriados(
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(check_permission("read"))
):
    result = await session.execute(select(Feriado))
    return result.scalars().all()

@app.post("/feriados", summary="Crear feriado")
async def crear_feriado(
    feriado: dict, 
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(check_permission("write"))
):
    nuevo = Feriado(**feriado)
    session.add(nuevo)
    await session.commit()
    await session.refresh(nuevo)
    return nuevo

@app.get("/feriados/{fecha}", summary="Obtener feriado por fecha")
async def obtener_feriado(
    fecha: str, 
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(check_permission("read"))
):
    result = await session.execute(select(Feriado).where(Feriado.fecha == fecha))
    feriado = result.scalar_one_or_none()
    if not feriado:
        raise HTTPException(status_code=404, detail="Feriado no encontrado")
    return feriado

@app.put("/feriados/{fecha}", summary="Actualizar feriado")
async def actualizar_feriado(
    fecha: str, 
    feriado: dict, 
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(check_permission("write"))
):
    result = await session.execute(select(Feriado).where(Feriado.fecha == fecha))
    feriado_existente = result.scalar_one_or_none()
    if not feriado_existente:
        raise HTTPException(status_code=404, detail="Feriado no encontrado")
    
    for key, value in feriado.items():
        setattr(feriado_existente, key, value)
    
    await session.commit()
    await session.refresh(feriado_existente)
    return feriado_existente

@app.delete("/feriados/{fecha}", summary="Eliminar feriado")
async def eliminar_feriado(
    fecha: str, 
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(check_permission("delete"))
):
    result = await session.execute(select(Feriado).where(Feriado.fecha == fecha))
    feriado = result.scalar_one_or_none()
    if not feriado:
        raise HTTPException(status_code=404, detail="Feriado no encontrado")
    
    await session.delete(feriado)
    await session.commit()
    return {"message": "Feriado eliminado exitosamente"}

# ============================================
# 11. MODELOS Y ESQUEMAS PARA RUTAS
# ============================================
class RutaExportacion(BaseModel):
    """
    Modelo Pydantic para la exportación de rutas.
    
    Atributos:
        ruta_hex (str): Identificador único de la ruta en formato hexadecimal
        id_eot_catalogo (int, opcional): ID del EOT asociado
        ruta_gtfs (float, opcional): Identificador GTFS de la ruta
        ruta_dec (int, opcional): Identificador decimal de la ruta
        sentido (str, opcional): Sentido de la ruta
        linea (str, opcional): Línea de transporte
        ramal (int, opcional): Número de ramal
        origen (str, opcional): Punto de origen
        destino (str, opcional): Punto de destino
        identificacion (str, opcional): Identificación adicional
        identificador_troncal (str, opcional): Identificador de troncal
        observaciones (str, opcional): Observaciones sobre la ruta
        par_id (int, opcional): ID de parada
        ingresa (int, opcional): Indicador de ingreso
        geom (str, opcional): Geometría en formato WKT/GeoJSON
        latitud_a (float, opcional): Latitud punto A
        longitud_a (float, opcional): Longitud punto A
        latitud_b (float, opcional): Latitud punto B
        longitud_b (float, opcional): Longitud punto B
        estado (bool, opcional): Estado de la ruta (activo/inactivo)
    """
    ruta_hex: str
    id_eot_catalogo: int = None
    ruta_gtfs: float = None
    ruta_dec: int = None
    sentido: str = None
    linea: str = None
    ramal: int = None
    origen: str = None
    destino: str = None
    identificacion: str = None
    identificador_troncal: str = None
    observaciones: str = None
    par_id: int = None
    ingresa: int = None
    geom: str = None
    latitud_a: float = None
    longitud_a: float = None
    latitud_b: float = None
    longitud_b: float = None
    estado: bool = None

# ============================================
# 12. ENDPOINTS CRUD - CATÁLOGO DE RUTAS
# ============================================


@app.get("/catalogo_rutas", response_model=List[CatalogoRutaResponse], summary="Listar rutas")
async def listar_catalogo_rutas(
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(check_permission("read"))
):
    # Obtener todos los campos y geom como GeoJSON
    from sqlalchemy import text
    rows = await session.execute(
        text("""
        SELECT ruta_hex, id_eot_catalogo, ruta_gtfs, ruta_dec, sentido, linea, ramal, origen, destino, identificacion, identificador_troncal, observaciones, par_id, ingresa,
        ST_AsGeoJSON(geom) as geom,
        latitud_a, longitud_a, latitud_b, longitud_b, estado
        FROM catalogo_rutas
        """),
    )
    rutas = list(rows.mappings())
    return rutas

@app.post("/catalogo_rutas", response_model=CatalogoRutaResponse, summary="Crear ruta")
async def crear_catalogo_ruta(
    ruta: CatalogoRutaCreate,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(check_permission("write"))
):
    data = ruta.dict()
    # Convertir geom a tipo geometry usando funciones PostGIS.
    # Si el cliente envía un objeto GeoJSON, usar ST_GeomFromGeoJSON.
    # Si envía WKT como string, usar ST_GeomFromText.
    # Convertir geom a un objeto geometry válido usando shapely + geoalchemy2.from_shape
    if "geom" in data and data["geom"] is not None:
        try:
            geom_data = data["geom"]
            
            # Si es un dict, verificar si es un Feature o Geometry
            if isinstance(geom_data, dict):
                # Si es un Feature, extraer la geometría
                if geom_data.get('type') == 'Feature':
                    geom_data = geom_data.get('geometry', {})
                
                # Si aún es un dict y tiene type, es una geometría GeoJSON
                if isinstance(geom_data, dict) and 'type' in geom_data:
                    geom_obj = shapely_shape(geom_data)
                    data["geom"] = from_shape(geom_obj, srid=4326)
                else:
                    raise ValueError("Formato de geometría no soportado")
                    
            elif isinstance(geom_data, str):
                # Intentar parsear como JSON (GeoJSON). Si falla, tratar como WKT
                try:
                    import json as _json
                    parsed = _json.loads(geom_data)
                    # Si es un Feature, extraer la geometría
                    if isinstance(parsed, dict) and parsed.get('type') == 'Feature':
                        parsed = parsed.get('geometry', {})
                    geom_obj = shapely_shape(parsed)
                    data["geom"] = from_shape(geom_obj, srid=4326)
                except Exception as e:
                    # Asumir WKT
                    geom_obj = wkt.loads(geom_data)
                    data["geom"] = from_shape(geom_obj, srid=4326)
        except Exception as e:
            # Dejar que la excepción sea manejada por el commit/validator y loggear
            print(f"Warning: no se pudo convertir geom: {e}")
            raise  # Re-lanzar la excepción para ver el error completo

    nueva = CatalogoRuta(**data)
    session.add(nueva)
    await session.commit()
    await session.refresh(nueva)
    
    # Convert the geometry to GeoJSON for the response
    response_data = nueva.__dict__.copy()
    if response_data.get('geom'):
        response_data['geom'] = json.dumps(mapping(to_shape(nueva.geom)))
    
    return response_data

@app.get("/catalogo_rutas/{ruta_hex}", response_model=CatalogoRutaResponse, summary="Obtener ruta por HEX")
async def obtener_catalogo_ruta(
    ruta_hex: str,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(check_permission("read"))
):
    from sqlalchemy import text
    row = await session.execute(
        text("""
        SELECT ruta_hex, id_eot_catalogo, ruta_gtfs, ruta_dec, sentido, linea, ramal, origen, destino, identificacion, identificador_troncal, observaciones, par_id, ingresa,
        ST_AsGeoJSON(geom) as geom,
        latitud_a, longitud_a, latitud_b, longitud_b, estado
        FROM catalogo_rutas WHERE ruta_hex = :ruta_hex
        """),
        {"ruta_hex": ruta_hex}
    )
    ruta = row.first()
    if not ruta:
        raise HTTPException(status_code=404, detail="Ruta no encontrada")
    return dict(ruta)

@app.put("/catalogo_rutas/{ruta_hex}", response_model=CatalogoRutaResponse, summary="Actualizar ruta")
async def actualizar_catalogo_ruta(
    ruta_hex: str,
    ruta_update: CatalogoRutaUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(check_permission("write"))
):
    result = await session.execute(select(CatalogoRuta).where(CatalogoRuta.ruta_hex == ruta_hex))
    ruta = result.scalar_one_or_none()
    if not ruta:
        raise HTTPException(status_code=404, detail="Ruta no encontrada")
    update_data = ruta_update.dict(exclude_unset=True)
    if "geom" in update_data and update_data["geom"] is not None:
        try:
            if isinstance(update_data["geom"], dict):
                geom_obj = shapely_shape(update_data["geom"])
                update_data["geom"] = from_shape(geom_obj, srid=4326)
            elif isinstance(update_data["geom"], str):
                try:
                    import json as _json
                    parsed = _json.loads(update_data["geom"])
                    geom_obj = shapely_shape(parsed)
                    update_data["geom"] = from_shape(geom_obj, srid=4326)
                except Exception:
                    geom_obj = wkt.loads(update_data["geom"])
                    update_data["geom"] = from_shape(geom_obj, srid=4326)
        except Exception as e:
            print(f"Warning: no se pudo convertir geom en update: {e}")

    for key, value in update_data.items():
        setattr(ruta, key, value)
    await session.commit()
    await session.refresh(ruta)
    return ruta

@app.delete("/catalogo_rutas/{ruta_hex}", summary="Eliminar ruta")
async def eliminar_catalogo_ruta(
    ruta_hex: str,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(check_permission("delete"))
):
    result = await session.execute(select(CatalogoRuta).where(CatalogoRuta.ruta_hex == ruta_hex))
    ruta = result.scalar_one_or_none()
    if not ruta:
        raise HTTPException(status_code=404, detail="Ruta no encontrada")
    await session.delete(ruta)
    await session.commit()
    return {"message": "Ruta eliminada exitosamente"}

# ============================================
# 13. ENDPOINTS DE SALUD Y UTILIDADES
# ============================================

@app.get("/health")
async def health_check():
    """
    Endpoint de verificación de salud de la API.
    
    Returns:
        dict: Estado actual de la API
    """
    return {"status": "ok"}

# ============================================
# 14. ENDPOINTS DE EXPORTACIÓN
# ============================================
# @app.post("/catalogo_rutas/exportar_shapes")
# async def exportar_shapes(
#     rutas_data: List[Dict[str, Any]],
#     session: AsyncSession = Depends(get_session),
#     current_user: dict = Depends(check_permission("read"))
# ):
#     """
#     Exporta las rutas a archivos shapefile y los devuelve en un archivo ZIP.
#     """
#     temp_dir = None
#     try:
#         if not rutas_data:
#             raise HTTPException(
#                 status_code=status.HTTP_400_BAD_REQUEST,
#                 detail="No se recibieron datos de rutas"
#             )
        
#         print(f"Recibidas {len(rutas_data)} rutas para exportar")

#         # Verificar que hay al menos una ruta con geometría
#         rutas_con_geometria = [r for r in rutas_data if r.get('geom')]
#         print(f"Rutas con geometría detectadas: {len(rutas_con_geometria)}")
#         if rutas_con_geometria:
#             try:
#                 print(f"Preview geom primera ruta: {str(rutas_con_geometria[0].get('geom'))[:200]}")
#             except Exception:
#                 pass
#         if not rutas_con_geometria:
#             raise HTTPException(
#                 status_code=status.HTTP_400_BAD_REQUEST,
#                 detail="Ninguna de las rutas seleccionadas tiene geometría válida"
#             )
    
#     # Crear un directorio temporal para los archivos
#         temp_dir = tempfile.mkdtemp()
#         zip_path = os.path.join(temp_dir, 'shapes_rutas.zip')
#         temp_shapefiles = []  # Para mantener referencia a los archivos temporales
        
#         try:
#             # Crear siempre un GeoJSON manual con las geometrías recibidas como fallback garantizado
#             try:
#                 geojson_all = {"type": "FeatureCollection", "features": []}
#                 for ruta in rutas_con_geometria:
#                     geom = ruta.get('geom')
#                     if isinstance(geom, str):
#                         try:
#                             geom = json.loads(geom)
#                         except Exception:
#                             pass
#                     # If Feature wrapper
#                     if isinstance(geom, dict) and geom.get('type') == 'Feature':
#                         geometry_obj = geom.get('geometry')
#                     else:
#                         geometry_obj = geom

#                     feature = {
#                         'type': 'Feature',
#                         'properties': {
#                             'ruta_hex': ruta.get('ruta_hex'),
#                             'linea': ruta.get('linea'),
#                             'origen': ruta.get('origen'),
#                             'destino': ruta.get('destino'),
#                         },
#                         'geometry': geometry_obj,
#                     }
#                     geojson_all['features'].append(feature)

#                 manual_geojson_path = os.path.join(temp_dir, 'rutas_geometria.geojson')
#                 with open(manual_geojson_path, 'w', encoding='utf-8') as mg:
#                     json.dump(geojson_all, mg, ensure_ascii=False)
#                 print(f"GeoJSON manual creado en {manual_geojson_path}")
#             except Exception as e:
#                 print(f"Error creando GeoJSON manual inicial: {e}")

#             # Procesar cada ruta y crear ZIP
#             with zipfile.ZipFile(zip_path, 'w') as zipf:
#                 # Añadir el geojson manual al zip de entrada para garantizar contenido
#                 if os.path.exists(os.path.join(temp_dir, 'rutas_geometria.geojson')):
#                     zipf.write(os.path.join(temp_dir, 'rutas_geometria.geojson'), arcname='rutas_geometria.geojson')
#                     temp_shapefiles.append(os.path.join(temp_dir, 'rutas_geometria.geojson'))
                
#                 for ruta in rutas_data:
#                     try:
#                         # Verificar que la geometría existe
#                         if not ruta.get('geom'):
#                             print(f"Ruta {ruta.get('ruta_hex', 'sin_id')} no tiene geometría, omitiendo...")
#                             continue
                            
#                         try:
#                             geom_data = ruta['geom']
#                             # Si ya es un dict, usarlo directamente; si es string, parsearlo
#                             if isinstance(geom_data, str):
#                                 try:
#                                     geom_data = json.loads(geom_data)
#                                 except json.JSONDecodeError:
#                                     # Si no es JSON válido, intentar como WKT
#                                     geometry = wkt.loads(geom_data)
#                                     print(f"Geometría cargada desde WKT para {ruta.get('ruta_hex', 'sin_id')}")
#                                     continue

#                             if not isinstance(geom_data, dict):
#                                 raise ValueError("La geometría debe ser un objeto GeoJSON o WKT")

#                             # Extraer coordenadas del objeto GeoJSON
#                             coords = geom_data.get('coordinates', [])
#                             if not coords:
#                                 raise ValueError("No se encontraron coordenadas en la geometría")
                            
#                             geom_type = str(geom_data.get('type', '')).upper()
#                             print(f"Procesando geometría tipo {geom_type} para {ruta.get('ruta_hex', 'sin_id')}")
                            
#                             if geom_type == 'MULTILINESTRING':
#                                 if not all(isinstance(line, list) and len(line) > 0 and all(isinstance(coord, (list, tuple)) and len(coord) >= 2 for coord in line) for line in coords):
#                                     raise ValueError("Formato de coordenadas MULTILINESTRING inválido")
#                                 wkt_str = 'MULTILINESTRING(' + ', '.join(
#                                     '(' + ', '.join(f'{coord[0]} {coord[1]}' for coord in line) + ')'
#                                     for line in coords
#                                 ) + ')'
#                             elif geom_type == 'LINESTRING':
#                                 if not all(isinstance(coord, (list, tuple)) and len(coord) >= 2 for coord in coords):
#                                     raise ValueError("Formato de coordenadas LINESTRING inválido")
#                                 wkt_str = 'LINESTRING(' + ', '.join(f'{coord[0]} {coord[1]}' for coord in coords) + ')'
#                             else:
#                                 raise ValueError(f"Tipo de geometría no soportado: {geom_type}")
                            
#                             print(f"WKT generado para {ruta.get('ruta_hex', 'sin_id')}: {wkt_str[:100]}...")
#                             geometry = wkt.loads(wkt_str)
#                             print(f"Geometría convertida exitosamente para {ruta.get('ruta_hex', 'sin_id')}")
                                
#                         except Exception as e:
#                             error_msg = f"Error al procesar geometría de la ruta {ruta.get('ruta_hex', 'sin_id')}: {str(e)}"
#                             print(error_msg)
#                             if 'geom' in ruta and ruta['geom']:
#                                 geom_preview = str(ruta['geom'])[:200] + ('...' if len(str(ruta['geom'])) > 200 else '')
#                                 print(f"Geometría problemática: {geom_preview}")
#                             continue
                        
#                         # Obtener nombre del EOT si está disponible
#                         nombre_eot = ""
#                         if ruta.get('id_eot_catalogo'):
#                             try:
#                                 result = await session.execute(
#                                     select(EOT).where(EOT.cod_catalogo == ruta['id_eot_catalogo'])
#                                 )
#                                 eot = result.scalars().first()
#                                 if eot and eot.eot_nombre:
#                                     nombre_eot = eot.eot_nombre.replace(" ", "_").replace("/", "-")
#                             except Exception as e:
#                                 print(f"Error al obtener EOT para la ruta {ruta.get('ruta_hex', 'sin_id')}: {str(e)}")
#                                 nombre_eot = ""
                        
#                         # Crear nombre base para carpeta y archivo
#                         nombre_base = f"{ruta.get('ruta_hex', 'ruta')}"
#                         if nombre_eot:
#                             nombre_base += f"_{nombre_eot}"
#                         if ruta.get('linea'):
#                             nombre_base += f"_{ruta['linea']}"
#                         nombre_base = "".join(c if c.isalnum() or c in ('_', '-') else '_' for c in nombre_base)

#                         # Si hay más de una ruta, agrupa cada shape en su carpeta
#                         if len(rutas_data) > 1:
#                             carpeta_shape = nombre_base
#                         else:
#                             carpeta_shape = ""

#                         # Crear GeoDataFrame con manejo de valores nulos
#                         try:
#                             gdf = gpd.GeoDataFrame(
#                             [{
#                                 'ruta_hex': ruta.get('ruta_hex', ''),
#                                 'linea': ruta.get('linea', ''),
#                                 'origen': ruta.get('origen', ''),
#                                 'destino': ruta.get('destino', ''),
#                                 'sentido': ruta.get('sentido', ''),
#                                 'geometry': geometry
#                             }],
#                             geometry='geometry',
#                             crs='EPSG:4326'  # WGS84
#                         )
#                         except Exception as e_gpd:
#                             print(f"Advertencia: imposible crear GeoDataFrame con geopandas para {ruta.get('ruta_hex','sin_id')}: {e_gpd}")
#                             gdf = None
                        
#                         # Guardar como shapefile temporal (forzar driver explícito)
#                         temp_shapefile = os.path.join(temp_dir, f"{nombre_base}.shp")
#                         try:
#                             gdf.to_file(temp_shapefile, driver='ESRI Shapefile', encoding='utf-8')
#                         except Exception as e:
#                             print(f"Advertencia: fallo al escribir shapefile para {nombre_base}: {e}")

#                         # Agregar archivos al ZIP, agrupando por carpeta si corresponde
#                         created_files = []
#                         for ext in ['.shp', '.shx', '.dbf', '.prj', '.cpg']:
#                             file_path = os.path.splitext(temp_shapefile)[0] + ext
#                             if os.path.exists(file_path):
#                                 created_files.append(file_path)
#                                 if carpeta_shape:
#                                     arcname = os.path.join(carpeta_shape, os.path.basename(file_path))
#                                 else:
#                                     arcname = os.path.basename(file_path)
#                                 zipf.write(file_path, arcname=arcname)
#                                 temp_shapefiles.append(file_path)  # Mantener referencia

#                         # Si no se generaron archivos shapefile (posible problema con dependencias),
#                         # escribir un GeoJSON como fallback para no devolver un ZIP vacío.
#                             if not created_files:
#                                 # Primero intentar escribir shapefile con pyshp si está disponible
#                                 try:
#                                     if gdf is not None:
#                                         # Construir features desde gdf
#                                         recs = gdf.to_dict(orient='records')
#                                         features = []
#                                         for rec in recs:
#                                             geom = rec.get('geometry')
#                                             if geom is None:
#                                                 continue
#                                             feat = {
#                                                 'type': 'Feature',
#                                                 'properties': {k: v for k, v in rec.items() if k != 'geometry'},
#                                                 'geometry': mapping(geom) if hasattr(geom, '__geo_interface__') or hasattr(geom, 'geom_type') else geom
#                                             }
#                                             features.append(feat)

#                                         if features and shp_writer is not None:
#                                             base_no_ext = os.path.splitext(temp_shapefile)[0]
#                                             written = write_shapefile_pyshp(base_no_ext, features)
#                                             if written:
#                                                 for fp in written:
#                                                     if carpeta_shape:
#                                                         arcname = os.path.join(carpeta_shape, os.path.basename(fp))
#                                                     else:
#                                                         arcname = os.path.basename(fp)
#                                                     zipf.write(fp, arcname=arcname)
#                                                     temp_shapefiles.append(fp)
#                                                 created_files = written
#                                                 print(f"pyshp escribió archivos para {nombre_base}: {written}")

#                                 except Exception as e_py:
#                                     print(f"pyshp fallback error para {nombre_base}: {e_py}")

#                                 # Si pyshp no produjo archivos, caer al fallback GeoJSON existente
#                                 try:
#                                     temp_geojson = os.path.join(temp_dir, f"{nombre_base}.geojson")
#                                     # Intentar escribir GeoJSON con geopandas
#                                     try:
#                                         if gdf is not None:
#                                             gdf.to_file(temp_geojson, driver='GeoJSON', encoding='utf-8')
#                                             if os.path.exists(temp_geojson):
#                                                 if carpeta_shape:
#                                                     arcname = os.path.join(carpeta_shape, os.path.basename(temp_geojson))
#                                                 else:
#                                                     arcname = os.path.basename(temp_geojson)
#                                                 zipf.write(temp_geojson, arcname=arcname)
#                                                 temp_shapefiles.append(temp_geojson)
#                                                 print(f"Fallback GeoJSON creado para {nombre_base}: {temp_geojson}")
#                                     except Exception as e_geo:
#                                         print(f"Fallo al escribir GeoJSON con geopandas para {nombre_base}: {e_geo}")
#                                         # Escritura manual de GeoJSON sin depender de geopandas/fiona
#                                         try:
#                                             geojson_obj = {
#                                                 "type": "FeatureCollection",
#                                                 "features": []
#                                             }
#                                             for rec in gdf.to_dict(orient='records'):
#                                                 geom = rec.get('geometry')
#                                                 if geom is None:
#                                                     continue
#                                                 feature = {
#                                                     "type": "Feature",
#                                                     "properties": {k: v for k, v in rec.items() if k != 'geometry'},
#                                                     "geometry": mapping(geom) if hasattr(geom, '__geo_interface__') or hasattr(geom, 'geom_type') else geom
#                                                 }
#                                                 geojson_obj['features'].append(feature)

#                                             with open(temp_geojson, 'w', encoding='utf-8') as fgeo:
#                                                 json.dump(geojson_obj, fgeo, ensure_ascii=False)
#                                             if os.path.exists(temp_geojson):
#                                                 if carpeta_shape:
#                                                     arcname = os.path.join(carpeta_shape, os.path.basename(temp_geojson))
#                                                 else:
#                                                     arcname = os.path.basename(temp_geojson)
#                                                 zipf.write(temp_geojson, arcname=arcname)
#                                                 temp_shapefiles.append(temp_geojson)
#                                                 print(f"Fallback GeoJSON (manual) creado para {nombre_base}: {temp_geojson}")
#                                         except Exception as e_manual:
#                                             print(f"Error creando GeoJSON manual para {nombre_base}: {e_manual}")
#                                 except Exception as e:
#                                     print(f"Error creando GeoJSON de fallback para {nombre_base}: {e}")

#                         if created_files:
#                             print(f"Archivos creados para {nombre_base}: {created_files}")
#                         else:
#                             print(f"No se generaron archivos shapefile para {nombre_base}; se intentó fallback GeoJSON.")
                        
#                     except Exception as e:
#                         print(f"Error procesando ruta {ruta.get('ruta_hex', 'desconocida')}: {str(e)}")
#                         continue
            
#             # Verificar si se generó algún archivo dentro del ZIP
#             if not temp_shapefiles:
#                 # No se escribió ningún archivo en el ZIP -> devolver error diagnóstico
#                 print("No se encontraron archivos agregados al ZIP (temp_shapefiles vacío).")
#                 raise HTTPException(
#                     status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#                     detail="No se pudieron generar archivos shape para las rutas. Revisa los logs del servidor para más detalles."
#                 )

#             # Verificar si el ZIP existe y no está vacío
#             if not os.path.exists(zip_path) or os.path.getsize(zip_path) == 0:
#                 raise HTTPException(
#                     status_code=status.HTTP_400_BAD_REQUEST,
#                     detail="No se pudo generar ningún archivo shape"
#                 )
            
#             print(f"Archivo ZIP generado correctamente en {zip_path}")
            
#             # Crear una respuesta de archivo con los headers CORS necesarios
#             response = FileResponse(
#                 path=zip_path,
#                 media_type='application/zip',
#                 filename=f'shapes_rutas_{len(rutas_con_geometria)}_rutas.zip',
#                 headers={
#                     "Content-Disposition": f"attachment; filename=shapes_rutas_{len(rutas_con_geometria)}_rutas.zip"
#                 }
#             )
            
#             return response
            
#         except Exception as e:
#             print(f"Error al generar el archivo ZIP: {str(e)}")
#             print(f"Tipo de error: {type(e).__name__}")
#             print(f"Traceback: {traceback.format_exc()}")
#             raise HTTPException(
#                 status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
#                 detail=f"Error al generar el archivo ZIP: {str(e)}"
#             )
            
#     except HTTPException:
#         # Re-lanzar las excepciones HTTP
#         raise
        
#     except Exception as e:
#         print(f"Error inesperado: {str(e)}")
#         print(f"Tipo de error: {type(e).__name__}")
#         print(f"Traceback: {traceback.format_exc()}")
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail=f"Error inesperado al procesar la solicitud: {str(e)}"
#         )
        
#     finally:
#         # ¡NO limpiar el directorio temporal aquí! Si se elimina antes de que FileResponse termine de enviar el archivo, dará error de archivo no encontrado.
#         # Si quieres limpiar archivos temporales, hazlo con un proceso asíncrono externo o una tarea programada, NUNCA en el finally de un endpoint que responde archivos.
#         pass  # Solo dejar el finally vacío para evitar errores de borrado prematuro
@app.post("/catalogo_rutas/exportar_shapes")
async def exportar_shapes(
    rutas_data: List[Dict[str, Any]],
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(check_permission("read"))
):
    """
    Exporta las rutas a archivos shapefile y los devuelve en un archivo ZIP.
    """
    temp_dir = None
    try:
        if not rutas_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se recibieron datos de rutas"
            )
        
        print(f"Recibidas {len(rutas_data)} rutas para exportar")

        # Verificar que hay al menos una ruta con geometría
        rutas_con_geometria = [r for r in rutas_data if r.get('geom')]
        print(f"Rutas con geometría detectadas: {len(rutas_con_geometria)}")
        if rutas_con_geometria:
            try:
                print(f"Preview geom primera ruta: {str(rutas_con_geometria[0].get('geom'))[:200]}")
            except Exception:
                pass
        if not rutas_con_geometria:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ninguna de las rutas seleccionadas tiene geometría válida"
            )
    
    # Crear un directorio temporal para los archivos
        temp_dir = tempfile.mkdtemp()
        zip_path = os.path.join(temp_dir, 'shapes_rutas.zip')
        temp_shapefiles = []  # Para mantener referencia a los archivos temporales
        
        try:
            # Crear siempre un GeoJSON manual con las geometrías recibidas como fallback garantizado
            try:
                geojson_all = {"type": "FeatureCollection", "features": []}
                for ruta in rutas_con_geometria:
                    geom = ruta.get('geom')
                    if isinstance(geom, str):
                        try:
                            geom = json.loads(geom)
                        except Exception:
                            pass
                    # If Feature wrapper
                    if isinstance(geom, dict) and geom.get('type') == 'Feature':
                        geometry_obj = geom.get('geometry')
                    else:
                        geometry_obj = geom

                    feature = {
                        'type': 'Feature',
                        'properties': {
                            'ruta_hex': ruta.get('ruta_hex'),
                            'linea': ruta.get('linea'),
                            'origen': ruta.get('origen'),
                            'destino': ruta.get('destino'),
                        },
                        'geometry': geometry_obj,
                    }
                    geojson_all['features'].append(feature)

                manual_geojson_path = os.path.join(temp_dir, 'rutas_geometria.geojson')
                with open(manual_geojson_path, 'w', encoding='utf-8') as mg:
                    json.dump(geojson_all, mg, ensure_ascii=False)
                print(f"GeoJSON manual creado en {manual_geojson_path}")
            except Exception as e:
                print(f"Error creando GeoJSON manual inicial: {e}")

            # Procesar cada ruta y crear ZIP
            with zipfile.ZipFile(zip_path, 'w') as zipf:
                # Añadir el geojson manual al zip de entrada para garantizar contenido
                if os.path.exists(os.path.join(temp_dir, 'rutas_geometria.geojson')):
                    zipf.write(os.path.join(temp_dir, 'rutas_geometria.geojson'), arcname='rutas_geometria.geojson')
                    temp_shapefiles.append(os.path.join(temp_dir, 'rutas_geometria.geojson'))
                
                for ruta in rutas_data:
                    try:
                        # Verificar que la geometría existe
                        if not ruta.get('geom'):
                            print(f"Ruta {ruta.get('ruta_hex', 'sin_id')} no tiene geometría, omitiendo...")
                            continue
                            
                        try:
                            geom_data = ruta['geom']
                            # Si ya es un dict, usarlo directamente; si es string, parsearlo
                            if isinstance(geom_data, str):
                                try:
                                    geom_data = json.loads(geom_data)
                                except json.JSONDecodeError:
                                    # Si no es JSON válido, intentar como WKT
                                    geometry = wkt.loads(geom_data)
                                    print(f"Geometría cargada desde WKT para {ruta.get('ruta_hex', 'sin_id')}")
                                    continue

                            if not isinstance(geom_data, dict):
                                raise ValueError("La geometría debe ser un objeto GeoJSON o WKT")

                            # Extraer coordenadas del objeto GeoJSON
                            coords = geom_data.get('coordinates', [])
                            if not coords:
                                raise ValueError("No se encontraron coordenadas en la geometría")
                            
                            geom_type = str(geom_data.get('type', '')).upper()
                            print(f"Procesando geometría tipo {geom_type} para {ruta.get('ruta_hex', 'sin_id')}")
                            
                            if geom_type == 'MULTILINESTRING':
                                if not all(isinstance(line, list) and len(line) > 0 and all(isinstance(coord, (list, tuple)) and len(coord) >= 2 for coord in line) for line in coords):
                                    raise ValueError("Formato de coordenadas MULTILINESTRING inválido")
                                wkt_str = 'MULTILINESTRING(' + ', '.join(
                                    '(' + ', '.join(f'{coord[0]} {coord[1]}' for coord in line) + ')'
                                    for line in coords
                                ) + ')'
                            elif geom_type == 'LINESTRING':
                                if not all(isinstance(coord, (list, tuple)) and len(coord) >= 2 for coord in coords):
                                    raise ValueError("Formato de coordenadas LINESTRING inválido")
                                wkt_str = 'LINESTRING(' + ', '.join(f'{coord[0]} {coord[1]}' for coord in coords) + ')'
                            else:
                                raise ValueError(f"Tipo de geometría no soportado: {geom_type}")
                            
                            print(f"WKT generado para {ruta.get('ruta_hex', 'sin_id')}: {wkt_str[:100]}...")
                            geometry = wkt.loads(wkt_str)
                            print(f"Geometría convertida exitosamente para {ruta.get('ruta_hex', 'sin_id')}")
                                
                        except Exception as e:
                            error_msg = f"Error al procesar geometría de la ruta {ruta.get('ruta_hex', 'sin_id')}: {str(e)}"
                            print(error_msg)
                            if 'geom' in ruta and ruta['geom']:
                                geom_preview = str(ruta['geom'])[:200] + ('...' if len(str(ruta['geom'])) > 200 else '')
                                print(f"Geometría problemática: {geom_preview}")
                            continue
                        
                        # Obtener nombre del EOT si está disponible
                        nombre_eot = ""
                        if ruta.get('id_eot_catalogo'):
                            try:
                                result = await session.execute(
                                    select(EOT).where(EOT.cod_catalogo == ruta['id_eot_catalogo'])
                                )
                                eot = result.scalars().first()
                                if eot and eot.eot_nombre:
                                    nombre_eot = eot.eot_nombre.replace(" ", "_").replace("/", "-")
                            except Exception as e:
                                print(f"Error al obtener EOT para la ruta {ruta.get('ruta_hex', 'sin_id')}: {str(e)}")
                                nombre_eot = ""
                        
                        # Crear nombre base para carpeta y archivo
                        nombre_base = f"{ruta.get('ruta_hex', 'ruta')}"
                        if nombre_eot:
                            nombre_base += f"_{nombre_eot}"
                        if ruta.get('linea'):
                            nombre_base += f"_{ruta['linea']}"
                        nombre_base = "".join(c if c.isalnum() or c in ('_', '-') else '_' for c in nombre_base)

                        # Si hay más de una ruta, agrupa cada shape en su carpeta
                        if len(rutas_data) > 1:
                            carpeta_shape = nombre_base
                        else:
                            carpeta_shape = ""

                        # Crear GeoDataFrame con manejo de valores nulos
                        try:
                            gdf = gpd.GeoDataFrame(
                            [{
                                'ruta_hex': ruta.get('ruta_hex', ''),
                                'linea': ruta.get('linea', ''),
                                'origen': ruta.get('origen', ''),
                                'destino': ruta.get('destino', ''),
                                'sentido': ruta.get('sentido', ''),
                                'geometry': geometry
                            }],
                            geometry='geometry',
                            crs='EPSG:4326'  # WGS84
                        )
                        except Exception as e_gpd:
                            print(f"Advertencia: imposible crear GeoDataFrame con geopandas para {ruta.get('ruta_hex','sin_id')}: {e_gpd}")
                            gdf = None
                        
                        # Guardar como shapefile temporal (forzar driver explícito)
                        temp_shapefile = os.path.join(temp_dir, f"{nombre_base}.shp")
                        try:
                            gdf.to_file(temp_shapefile, driver='ESRI Shapefile', encoding='utf-8')
                        except Exception as e:
                            print(f"Advertencia: fallo al escribir shapefile para {nombre_base}: {e}")

                        # Agregar archivos al ZIP, agrupando por carpeta si corresponde
                        created_files = []
                        for ext in ['.shp', '.shx', '.dbf', '.prj', '.cpg']:
                            file_path = os.path.splitext(temp_shapefile)[0] + ext
                            if os.path.exists(file_path):
                                created_files.append(file_path)
                                if carpeta_shape:
                                    arcname = os.path.join(carpeta_shape, os.path.basename(file_path))
                                else:
                                    arcname = os.path.basename(file_path)
                                zipf.write(file_path, arcname=arcname)
                                temp_shapefiles.append(file_path)  # Mantener referencia

                        # Si no se generaron archivos shapefile (posible problema con dependencias),
                        # escribir un GeoJSON como fallback para no devolver un ZIP vacío.
                            if not created_files:
                                # Primero intentar escribir shapefile con pyshp si está disponible
                                try:
                                    if gdf is not None:
                                        # Construir features desde gdf
                                        recs = gdf.to_dict(orient='records')
                                        features = []
                                        for rec in recs:
                                            geom = rec.get('geometry')
                                            if geom is None:
                                                continue
                                            feat = {
                                                'type': 'Feature',
                                                'properties': {k: v for k, v in rec.items() if k != 'geometry'},
                                                'geometry': mapping(geom) if hasattr(geom, '__geo_interface__') or hasattr(geom, 'geom_type') else geom
                                            }
                                            features.append(feat)

                                        if features and shp_writer is not None:
                                            base_no_ext = os.path.splitext(temp_shapefile)[0]
                                            written = write_shapefile_pyshp(base_no_ext, features)
                                            if written:
                                                for fp in written:
                                                    if carpeta_shape:
                                                        arcname = os.path.join(carpeta_shape, os.path.basename(fp))
                                                    else:
                                                        arcname = os.path.basename(fp)
                                                    zipf.write(fp, arcname=arcname)
                                                    temp_shapefiles.append(fp)
                                                created_files = written
                                                print(f"pyshp escribió archivos para {nombre_base}: {written}")

                                except Exception as e_py:
                                    print(f"pyshp fallback error para {nombre_base}: {e_py}")

                                # Si pyshp no produjo archivos, caer al fallback GeoJSON existente
                                try:
                                    temp_geojson = os.path.join(temp_dir, f"{nombre_base}.geojson")
                                    # Intentar escribir GeoJSON con geopandas
                                    try:
                                        if gdf is not None:
                                            gdf.to_file(temp_geojson, driver='GeoJSON', encoding='utf-8')
                                            if os.path.exists(temp_geojson):
                                                if carpeta_shape:
                                                    arcname = os.path.join(carpeta_shape, os.path.basename(temp_geojson))
                                                else:
                                                    arcname = os.path.basename(temp_geojson)
                                                zipf.write(temp_geojson, arcname=arcname)
                                                temp_shapefiles.append(temp_geojson)
                                                print(f"Fallback GeoJSON creado para {nombre_base}: {temp_geojson}")
                                    except Exception as e_geo:
                                        print(f"Fallo al escribir GeoJSON con geopandas para {nombre_base}: {e_geo}")
                                        # Escritura manual de GeoJSON sin depender de geopandas/fiona
                                        try:
                                            geojson_obj = {
                                                "type": "FeatureCollection",
                                                "features": []
                                            }
                                            for rec in gdf.to_dict(orient='records'):
                                                geom = rec.get('geometry')
                                                if geom is None:
                                                    continue
                                                feature = {
                                                    "type": "Feature",
                                                    "properties": {k: v for k, v in rec.items() if k != 'geometry'},
                                                    "geometry": mapping(geom) if hasattr(geom, '__geo_interface__') or hasattr(geom, 'geom_type') else geom
                                                }
                                                geojson_obj['features'].append(feature)

                                            with open(temp_geojson, 'w', encoding='utf-8') as fgeo:
                                                json.dump(geojson_obj, fgeo, ensure_ascii=False)
                                            if os.path.exists(temp_geojson):
                                                if carpeta_shape:
                                                    arcname = os.path.join(carpeta_shape, os.path.basename(temp_geojson))
                                                else:
                                                    arcname = os.path.basename(temp_geojson)
                                                zipf.write(temp_geojson, arcname=arcname)
                                                temp_shapefiles.append(temp_geojson)
                                                print(f"Fallback GeoJSON (manual) creado para {nombre_base}: {temp_geojson}")
                                        except Exception as e_manual:
                                            print(f"Error creando GeoJSON manual para {nombre_base}: {e_manual}")
                                except Exception as e:
                                    print(f"Error creando GeoJSON de fallback para {nombre_base}: {e}")

                        if created_files:
                            print(f"Archivos creados para {nombre_base}: {created_files}")
                        else:
                            print(f"No se generaron archivos shapefile para {nombre_base}; se intentó fallback GeoJSON.")
                        
                    except Exception as e:
                        print(f"Error procesando ruta {ruta.get('ruta_hex', 'desconocida')}: {str(e)}")
                        continue
            
            # Verificar si se generó algún archivo dentro del ZIP
            if not temp_shapefiles:
                # No se escribió ningún archivo en el ZIP -> devolver error diagnóstico
                print("No se encontraron archivos agregados al ZIP (temp_shapefiles vacío).")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="No se pudieron generar archivos shape para las rutas. Revisa los logs del servidor para más detalles."
                )

            # Verificar si el ZIP existe y no está vacío
            if not os.path.exists(zip_path) or os.path.getsize(zip_path) == 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No se pudo generar ningún archivo shape"
                )
            
            print(f"Archivo ZIP generado correctamente en {zip_path}")
            
            # Crear una respuesta de archivo con los headers CORS necesarios
            response = FileResponse(
                path=zip_path,
                media_type='application/zip',
                filename=f'shapes_rutas_{len(rutas_con_geometria)}_rutas.zip',
                headers={
                    "Content-Disposition": f"attachment; filename=shapes_rutas_{len(rutas_con_geometria)}_rutas.zip"
                }
            )
            
            return response
            
        except Exception as e:
            print(f"Error al generar el archivo ZIP: {str(e)}")
            print(f"Tipo de error: {type(e).__name__}")
            print(f"Traceback: {traceback.format_exc()}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                detail=f"Error al generar el archivo ZIP: {str(e)}"
            )
            
    except HTTPException:
        # Re-lanzar las excepciones HTTP
        raise
        
    except Exception as e:
        print(f"Error inesperado: {str(e)}")
        print(f"Tipo de error: {type(e).__name__}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error inesperado al procesar la solicitud: {str(e)}"
        )
        
    finally:
        # ¡NO limpiar el directorio temporal aquí! Si se elimina antes de que FileResponse termine de enviar el archivo, dará error de archivo no encontrado.
        # Si quieres limpiar archivos temporales, hazlo con un proceso asíncrono externo o una tarea programada, NUNCA en el finally de un endpoint que responde archivos.
        pass  # Solo dejar el finally vacío para evitar errores de borrado prematuro


# ============================================
# 15. ENDPOINTS CRUD - HISTÓRICO DE ITINERARIOS
# ============================================
# Nota: Las importaciones necesarias ya se realizaron al inicio del archivo

def wkb_to_geojson(wkb_hex):
    """
    Convierte una geometría en formato WKB (hex) a GeoJSON.
    
    Args:
        wkb_hex (str): Geometría en formato WKB hexadecimal
        
    Returns:
        dict: Geometría en formato GeoJSON Feature
    """
    try:
        # Eliminar cualquier prefijo o espacios en blanco
        wkb_hex = wkb_hex.strip()
        
        # Si el string comienza con '\x', eliminarlo (formato común de PostgreSQL)
        if wkb_hex.startswith('\\x'):
            wkb_hex = wkb_hex[2:]
            
        # Convertir de hex a bytes
        wkb_bin = binascii.unhexlify(wkb_hex)
        
        # Cargar la geometría desde WKB
        geom = wkb_loads(wkb_bin)
        
        # Convertir a GeoJSON Feature
        return {
            'type': 'Feature',
            'geometry': mapping(geom),
            'properties': {}
        }
        
    except Exception as e:
        print(f"Error al convertir WKB a GeoJSON: {e}")
        return None


def write_shapefile_pyshp(base_path_no_ext, features):
    """
    Escribe un shapefile (shp, shx, dbf) usando pyshp a partir de una lista de GeoJSON features.
    base_path_no_ext: ruta sin extensión, por ejemplo /tmp/myshape
    features: lista de dicts {type: 'Feature', geometry: {...}, properties: {...}}
    Devuelve lista de archivos escritos.
    """
    if shp_writer is None:
        raise RuntimeError("pyshp no está disponible")

    shp_path = base_path_no_ext + '.shp'
    dbf_fields = []
    # Collect field names and types (simple: all strings)
    props_union = {}
    for f in features:
        for k, v in (f.get('properties') or {}).items():
            props_union[k] = True

    try:
        with shp_writer.Writer(base_path_no_ext) as w:
            # set as polyline (shapefile type 3)
            w.shapeType = shp_writer.POLYLINE
            # define fields
            for k in props_union.keys():
                # Field name max 10 chars in DBF
                fname = k[:10]
                w.field(fname, 'C')

            # write each feature
            for feat in features:
                geom = feat.get('geometry')
                props = feat.get('properties') or {}
                # convert geometry into pyshp format
                try:
                    # handle LineString and MultiLineString
                    if not geom:
                        continue
                    gtype = geom.get('type')
                    if gtype == 'LineString':
                        coords = geom.get('coordinates', [])
                        w.line([coords])
                    elif gtype == 'MultiLineString':
                        lines = geom.get('coordinates', [])
                        w.line(lines)
                    else:
                        # try to coerce other types
                        coords = geom.get('coordinates', [])
                        w.line([coords])
                except Exception as e:
                    print(f"pyshp: error escribiendo geometría: {e}")
                    continue

                # write record with property values (truncate field names to 10)
                rec = []
                for k in props_union.keys():
                    v = props.get(k, '')
                    if v is None:
                        v = ''
                    rec.append(str(v))
                w.record(*rec)

        written = [base_path_no_ext + ext for ext in ['.shp', '.shx', '.dbf']]
        return [p for p in written if os.path.exists(p)]
    except Exception as e:
        print(f"write_shapefile_pyshp fallo: {e}")
        return []

@app.get("/historico_itinerario", response_model=List[Dict])
async def listar_itinerarios(ruta_hex: str, session: AsyncSession = Depends(get_session), current_user: dict = Depends(check_permission("read"))):
    try:
        print(f"[DEBUG] Buscando itinerarios para ruta_hex: {ruta_hex}")
        
        # Verificación de la tabla usando SQL directo
        from sqlalchemy import text
        
        # Verificar si la tabla existe usando una consulta directa
        table_check = await session.execute(
            text("""
            SELECT EXISTS (
                SELECT 1 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'historico_itinerario'
            )
            """)
        )
        table_exists = table_check.scalar()
        
        if not table_exists:
            print("[ERROR] La tabla 'historico_itinerario' no existe en la base de datos")
            return []
        
        # Primero, obtener las columnas de la tabla
        columns_query = text("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'historico_itinerario'
        """)
        
        columns_result = await session.execute(columns_query)
        columns = [row[0] for row in columns_result]
        
        # Construir dinámicamente la consulta con las columnas existentes
        select_columns = []
        
        # Asegurarse de que las columnas requeridas existan
        required_columns = [
            'ruta_hex', 
            'fecha_inicio_vigencia', 
            'fecha_fin_vigencia',
            'estado'
        ]
        
        for col in required_columns:
            if col not in columns:
                print(f"[WARN] Columna requerida no encontrada: {col}")
        
        # Agregar todas las columnas excepto geom
        select_columns.extend([col for col in columns if col != 'geom'])
        
        # Agregar la columna geom con ST_AsGeoJSON si existe
        if 'geom' in columns:
            select_columns.append("""
            CASE
                WHEN geom IS NOT NULL THEN ST_AsGeoJSON(geom)::jsonb
                ELSE NULL
            END as geom
            """)
        
        # Construir la consulta final
        query_str = f"""
        SELECT
            {', '.join(select_columns)}
        FROM historico_itinerario
        WHERE ruta_hex = :ruta_hex
        ORDER BY 
            CASE 
                WHEN 'fecha_inicio_vigencia' = ANY(ARRAY{columns}::text[]) 
                THEN fecha_inicio_vigencia 
                ELSE NULL 
            END DESC NULLS LAST
        """
        
        print(f"[DEBUG] Consulta SQL generada: {query_str}")
        query = text(query_str)
        
        print("[DEBUG] Ejecutando consulta SQL...")
        result = await session.execute(query, {"ruta_hex": ruta_hex})
        rows = result.mappings().all()
        print(f"[DEBUG] Se encontraron {len(rows)} itinerarios")
        
        # Convertir las filas a diccionarios simples
        itinerarios = []
        for row in rows:
            try:
                item = dict(row)
                
                # Si geom ya es un diccionario (por el ::jsonb), no necesitamos hacer json.loads
                if isinstance(item.get('geom'), dict):
                    geom_data = item['geom']
                elif item.get('geom'):
                    try:
                        geom_data = json.loads(item['geom'])
                    except (json.JSONDecodeError, TypeError) as e:
                        print(f"[WARN] Error al parsear GeoJSON: {e}")
                        geom_data = None
                else:
                    geom_data = None
                
                # Formatear como Feature de GeoJSON si existe geometría
                if geom_data:
                    if isinstance(geom_data, dict):
                        if geom_data.get('type') == 'Feature':
                            item['geom'] = geom_data
                        else:
                            item['geom'] = {
                                'type': 'Feature',
                                'geometry': geom_data,
                                'properties': {}
                            }
                
                # Agregar el ítem a la lista de resultados
                itinerarios.append(item)
                
            except Exception as e:
                print(f"[ERROR] Error procesando fila: {e}")
                import traceback
                traceback.print_exc()
                continue
        
        print(f"[DEBUG] Devolviendo {len(itinerarios)} itinerarios")
        # print(f"[DEBUG] Primer itinerario: {itinerarios[0] if itinerarios else 'No hay datos'}")
        return itinerarios
        
    except Exception as e:
        error_msg = f"Error en listar_itinerarios: {str(e)}"
        print(f"[ERROR] {error_msg}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500, 
            detail=error_msg
        )

# En el endpoint de creación
@app.post("/historico_itinerario", response_model=HistoricoItinerarioResponse)
async def crear_itinerario(itinerario: HistoricoItinerarioCreate, session: AsyncSession = Depends(get_session), current_user: dict = Depends(check_permission("write"))):
    # Validar que solo uno vigente por ruta
    if itinerario.vigente:
        result = await session.execute(select(HistoricoItinerario).where(and_(
            HistoricoItinerario.ruta_hex == itinerario.ruta_hex, 
            HistoricoItinerario.vigente == True
        )))
        existente = result.scalar()
        if existente:
            raise HTTPException(status_code=400, detail="Ya existe un itinerario vigente para esta ruta")
    
    # Insert without geom first (models store geom as Text currently)
    # Si viene como vigente=True, primero desactivar 'vigente' en otros registros de la misma ruta
    if itinerario.vigente:
        await session.execute(
            text(
                """
                UPDATE historico_itinerario
                SET vigente = FALSE
                WHERE ruta_hex = :ruta_hex
                """
            ),
            {"ruta_hex": itinerario.ruta_hex}
        )

    # Insertar registro usando SQL explícito sin la columna geom (evitar enviar NULL como VARCHAR a geometry)
    try:
        # Debug: comprobar si ya existe exactamente ese PK (ruta_hex + fecha_inicio_vigencia)
        print(f"[DEBUG] comprobar existencia antes de INSERT: ruta={itinerario.ruta_hex} fecha={itinerario.fecha_inicio_vigencia}")
        exists_check = await session.execute(
            select(HistoricoItinerario).where(and_(
                HistoricoItinerario.ruta_hex == itinerario.ruta_hex,
                HistoricoItinerario.fecha_inicio_vigencia == itinerario.fecha_inicio_vigencia
            ))
        )
        existing_pk = exists_check.scalar_one_or_none()
        print(f"[DEBUG] existing_pk -> {existing_pk}")
        if existing_pk:
            raise HTTPException(status_code=400, detail="Itinerario ya existe para esa fecha de inicio")

        # Debug: prepare parameters used for insert
        print(f"[DEBUG] INSERT params: ruta_hex={itinerario.ruta_hex}, fecha_inicio={itinerario.fecha_inicio_vigencia}, fecha_fin={itinerario.fecha_fin_vigencia}, vigente={itinerario.vigente}, observacion={itinerario.observacion}")

        # Determine if payload includes geom and prepare SQL accordingly
        geom_in_insert = False
        params = {
            "ruta_hex": itinerario.ruta_hex,
            "fecha_inicio": itinerario.fecha_inicio_vigencia,
            "fecha_fin": itinerario.fecha_fin_vigencia,
            "vigente": bool(itinerario.vigente),
            "observacion": itinerario.observacion,
        }

        if getattr(itinerario, "geom", None):
            # Normalize geom to a GeoJSON geometry object (not a Feature)
            try:
                raw = itinerario.geom
                if isinstance(raw, dict):
                    if raw.get("type") == "Feature":
                        geom_obj = raw.get("geometry")
                    else:
                        geom_obj = raw
                else:
                    parsed = json.loads(raw)
                    if isinstance(parsed, dict) and parsed.get("type") == "Feature":
                        geom_obj = parsed.get("geometry")
                    else:
                        geom_obj = parsed
                geom_json = json.dumps(geom_obj)
            except Exception:
                geom_json = itinerario.geom

            insert_stmt = text(
                """
                INSERT INTO historico_itinerario (ruta_hex, fecha_inicio_vigencia, fecha_fin_vigencia, geom, vigente, observacion)
                VALUES (:ruta_hex, :fecha_inicio, :fecha_fin, ST_SetSRID(ST_GeomFromGeoJSON(:geom_json), 4326), :vigente, :observacion)
                """
            )
            params["geom_json"] = geom_json
            geom_in_insert = True
        else:
            # Table requires geom NOT NULL; insert an empty geometry to satisfy constraint
            insert_stmt = text(
                """
                INSERT INTO historico_itinerario (ruta_hex, fecha_inicio_vigencia, fecha_fin_vigencia, geom, vigente, observacion)
                VALUES (:ruta_hex, :fecha_inicio, :fecha_fin, ST_SetSRID(ST_GeomFromText('GEOMETRYCOLLECTION EMPTY'), 4326), :vigente, :observacion)
                """
            )

        await session.execute(insert_stmt, params)
        await session.commit()
    except IntegrityError as e:
        await session.rollback()
        # Mostrar detalles para diagnóstico
        try:
            orig = getattr(e, 'orig', None)
        except Exception:
            orig = None
        print(f"[ERROR] IntegrityError en INSERT para ruta={itinerario.ruta_hex} fecha={itinerario.fecha_inicio_vigencia}")
        print(f"[ERROR] IntegrityError args: {e.args}")
        print(f"[ERROR] IntegrityError orig: {orig}")
        # Devolver mensaje más informativo al cliente
        detail_msg = str(orig) if orig else (e.args[0] if e.args else "IntegrityError")
        raise HTTPException(status_code=400, detail=f"Itinerario ya existe para esa fecha de inicio: {detail_msg}")

    # Recuperar el registro recién insertado
    result = await session.execute(
        select(HistoricoItinerario).where(and_(
            HistoricoItinerario.ruta_hex == itinerario.ruta_hex,
            HistoricoItinerario.fecha_inicio_vigencia == itinerario.fecha_inicio_vigencia
        ))
    )
    db_item = result.scalar_one_or_none()

    # If geom was provided but not inserted (shouldn't happen), update it; otherwise skip
    if getattr(itinerario, "geom", None) and not geom_in_insert:
        try:
            if isinstance(itinerario.geom, dict) and itinerario.geom.get("type") == "Feature":
                geom_obj = itinerario.geom.get("geometry")
            elif isinstance(itinerario.geom, dict):
                geom_obj = itinerario.geom
            else:
                geom_obj = json.loads(itinerario.geom)
            geom_json = json.dumps(geom_obj)
        except Exception:
            geom_json = itinerario.geom

        await session.execute(
            text(
                """
                UPDATE historico_itinerario
                SET geom = ST_SetSRID(ST_GeomFromGeoJSON(:geom_json), 4326)
                WHERE ruta_hex = :ruta_hex AND fecha_inicio_vigencia = :fecha_inicio
                """
            ),
            {"geom_json": geom_json, "ruta_hex": itinerario.ruta_hex, "fecha_inicio": itinerario.fecha_inicio_vigencia}
        )
        await session.commit()

    await session.refresh(db_item)
    return db_item

# En el endpoint de actualización
@app.put("/historico_itinerario/{ruta_hex}/{fecha_inicio_vigencia}", response_model=HistoricoItinerarioResponse)
async def actualizar_itinerario(
    ruta_hex: str, 
    fecha_inicio_vigencia: str, 
    itinerario: HistoricoItinerarioUpdate, 
    session: AsyncSession = Depends(get_session), 
    current_user: dict = Depends(check_permission("write"))
):
    # Convertir la fecha recibida (string) a date para evitar comparaciones date = varchar
    try:
        fecha_dt = date.fromisoformat(fecha_inicio_vigencia)
    except Exception:
        raise HTTPException(status_code=400, detail="Formato de fecha_inicio_vigencia inválido. Use YYYY-MM-DD")
    result = await session.execute(select(HistoricoItinerario).where(and_(
        HistoricoItinerario.ruta_hex == ruta_hex, 
        HistoricoItinerario.fecha_inicio_vigencia == fecha_dt
    )))
    db_item = result.scalar_one_or_none()
    
    if not db_item:
        raise HTTPException(status_code=404, detail="Itinerario no encontrado")
    
    if itinerario.vigente is not None and itinerario.vigente:
        result = await session.execute(select(HistoricoItinerario).where(and_(
            HistoricoItinerario.ruta_hex == ruta_hex, 
            HistoricoItinerario.vigente == True, 
            HistoricoItinerario.fecha_inicio_vigencia != fecha_dt
        )))
        existente = result.scalar()
        if existente:
            raise HTTPException(status_code=400, detail="Ya existe un itinerario vigente para esta ruta")
    
    # Separar y manejar geom por separado (evitar asignar varchar a columna geometry)
    update_fields = itinerario.dict(exclude_unset=True)

    # Si viene geom, convertir a GeoJSON geometry (no Feature) y actualizar con ST_GeomFromGeoJSON
    geom_value = None
    if 'geom' in update_fields:
        raw_geom = update_fields.pop('geom')
        try:
            # Normalize to a GeoJSON geometry object (not a Feature)
            if isinstance(raw_geom, dict):
                if raw_geom.get('type') == 'Feature':
                    geom_obj = raw_geom.get('geometry')
                else:
                    geom_obj = raw_geom
            else:
                # raw string: try to parse
                parsed = json.loads(raw_geom)
                if isinstance(parsed, dict) and parsed.get('type') == 'Feature':
                    geom_obj = parsed.get('geometry')
                else:
                    geom_obj = parsed
            geom_json = json.dumps(geom_obj)
        except Exception:
            # Fallback: send raw string as-is
            geom_json = raw_geom

        # Use a direct SQL update to convert GeoJSON -> PostGIS geometry in-place
        await session.execute(
            text(
                """
                UPDATE historico_itinerario
                SET geom = ST_SetSRID(ST_GeomFromGeoJSON(:geom_json), 4326)
                WHERE ruta_hex = :ruta_hex AND fecha_inicio_vigencia = :fecha_dt
                """
            ),
            {"geom_json": geom_json, "ruta_hex": ruta_hex, "fecha_dt": fecha_dt}
        )

    # Si estamos activando vigente en este registro, desactivar otros vigentes de la misma ruta
    if 'vigente' in update_fields and update_fields.get('vigente'):
        await session.execute(
            text(
                """
                UPDATE historico_itinerario
                SET vigente = FALSE
                WHERE ruta_hex = :ruta_hex AND fecha_inicio_vigencia != :fecha_dt
                """
            ),
            {"ruta_hex": ruta_hex, "fecha_dt": fecha_dt}
        )

    # Actualizar los demás campos vía ORM
    for field, value in update_fields.items():
        setattr(db_item, field, value)

    session.add(db_item)
    await session.commit()
    await session.refresh(db_item)
    return db_item

@app.post("/historico_itinerario/exportar_shapes")
async def exportar_shapes_itinerarios(
    itinerarios_data: List[Dict[str, Any]],
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(check_permission("read"))
):
    """
    Exporta los itinerarios a archivos shapefile y los devuelve en un archivo ZIP.
    """
    temp_dir = None
    try:
        if not itinerarios_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se recibieron datos de itinerarios"
            )
        
        print(f"Recibidas {len(itinerarios_data)} itinerarios para exportar")
        # DEBUG: estado de pyshp import
        try:
            print(f"DEBUG: shp_writer is {'set' if shp_writer is not None else 'None'}; type={type(shp_writer)}")
        except Exception as _:
            print("DEBUG: shp_writer status unknown")
        
        # Verificar que hay al menos un itinerario con geometría
        itinerarios_con_geometria = [i for i in itinerarios_data if i.get('geom')]
        if not itinerarios_con_geometria:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ninguno de los itinerarios seleccionados tiene geometría válida"
            )
    
        # Crear un directorio temporal para los archivos
        temp_dir = tempfile.mkdtemp()
        zip_path = os.path.join(temp_dir, 'shapes_itinerarios.zip')
        temp_shapefiles = []  # Para mantener referencia a los archivos temporales

        try:
            # Crear siempre un GeoJSON manual con las geometrías recibidas como fallback garantizado
            try:
                geojson_all = {"type": "FeatureCollection", "features": []}
                for it in itinerarios_con_geometria:
                    geom = it.get('geom')
                    if isinstance(geom, str):
                        try:
                            geom = json.loads(geom)
                        except Exception:
                            pass
                    if isinstance(geom, dict) and geom.get('type') == 'Feature':
                        geometry_obj = geom.get('geometry')
                    else:
                        geometry_obj = geom
                    feature = {
                        'type': 'Feature',
                        'properties': {
                            'ruta_hex': it.get('ruta_hex'),
                            'fecha_inicio_vigencia': it.get('fecha_inicio_vigencia'),
                        },
                        'geometry': geometry_obj,
                    }
                    geojson_all['features'].append(feature)
                manual_geojson_path = os.path.join(temp_dir, 'itinerarios_geometria.geojson')
                with open(manual_geojson_path, 'w', encoding='utf-8') as mg:
                    json.dump(geojson_all, mg, ensure_ascii=False)
                print(f"GeoJSON manual creado en {manual_geojson_path}")
                # DEBUG: listar contenido del temp_dir después de crear geojson
                try:
                    print(f"DEBUG: temp_dir contents after geojson: {os.listdir(temp_dir)}")
                except Exception as el:
                    print(f"DEBUG: no se pudo listar temp_dir: {el}")

                # Intentar crear un shapefile global usando pyshp a partir del geojson_all
                try:
                    if shp_writer is not None and geojson_all.get('features'):
                        base_no_ext = os.path.join(temp_dir, 'itinerarios_geometria')
                        # construir features list en el formato esperado por write_shapefile_pyshp
                        features_for_py = []
                        for f in geojson_all.get('features', []):
                            feat = {
                                'type': 'Feature',
                                'properties': f.get('properties', {}),
                                'geometry': f.get('geometry')
                            }
                            features_for_py.append(feat)

                        written_global = write_shapefile_pyshp(base_no_ext, features_for_py)
                        if written_global:
                            print(f"pyshp escribió archivos globales para itinerarios: {written_global}")
                            # DEBUG: existence per expected ext
                            for ext in ['.shp', '.shx', '.dbf', '.prj', '.cpg']:
                                ptest = base_no_ext + ext
                                try:
                                    print(f"DEBUG: exists {ptest}: {os.path.exists(ptest)}")
                                except Exception:
                                    pass
                            try:
                                print(f"DEBUG: temp_dir contents after pyshp global: {os.listdir(temp_dir)}")
                            except Exception as el:
                                print(f"DEBUG: no se pudo listar temp_dir post-pyshp: {el}")
                            # Also write a .prj for EPSG:4326
                            try:
                                prj_path = base_no_ext + '.prj'
                                with open(prj_path, 'w', encoding='utf-8') as prjf:
                                    prj_f = 'GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]]'
                                    prjf.write(prj_f)
                                written_global.append(prj_path)
                            except Exception as eprj:
                                print(f"No se pudo crear .prj global para itinerarios: {eprj}")
                            # Añadir archivos escritos al zip y registro temporal
                            for fp in written_global:
                                try:
                                    arcname = os.path.basename(fp)
                                    zipf.write(fp, arcname=arcname)
                                    temp_shapefiles.append(fp)
                                except Exception as eadd:
                                    print(f"Fallo añadiendo archivo global pyshp al zip: {eadd}")
                except Exception as eglob:
                    print(f"Error en pyshp global fallback itinerarios: {eglob}")
            except Exception as e:
                print(f"Error creando GeoJSON manual inicial (itinerarios): {e}")

            # Procesar cada itinerario y crear ZIP
            with zipfile.ZipFile(zip_path, 'w') as zipf:
                # Añadir el geojson manual al zip para garantizar contenido
                if os.path.exists(os.path.join(temp_dir, 'itinerarios_geometria.geojson')):
                    zipf.write(os.path.join(temp_dir, 'itinerarios_geometria.geojson'), arcname='itinerarios_geometria.geojson')
                    temp_shapefiles.append(os.path.join(temp_dir, 'itinerarios_geometria.geojson'))

                for itinerario in itinerarios_data:
                    try:
                        # Verificar que la geometría existe
                        if not itinerario.get('geom'):
                            print(f"Itinerario de fecha {itinerario.get('fecha_inicio_vigencia', 'sin_fecha')} no tiene geometría, omitiendo...")
                            continue
                            
                        try:
                            geom_str = str(itinerario['geom']).strip()
                            if not geom_str:
                                raise ValueError("Geometría vacía")
                                
                            # Verificar si la geometría está en formato JSON
                            if geom_str.startswith('{'):
                                try:
                                    geom_data = json.loads(geom_str)
                                    if not isinstance(geom_data, dict) or 'coordinates' not in geom_data:
                                        raise ValueError("Formato de geometría JSON no reconocido")
                                        
                                    coords = geom_data.get('coordinates', [])
                                    if not coords:
                                        raise ValueError("No se encontraron coordenadas en la geometría")
                                        
                                    geom_type = str(geom_data.get('type', '')).upper()
                                    
                                    if geom_type == 'MULTILINESTRING':
                                        # Asegurarse de que las coordenadas tengan el formato correcto
                                        if not all(isinstance(line, list) and len(line) > 0 and all(isinstance(coord, (list, tuple)) and len(coord) >= 2 for coord in line) for line in coords):
                                            raise ValueError("Formato de coordenadas MULTILINESTRING inválido")
                                        wkt_str = 'MULTILINESTRING(' + ', '.join(
                                            '(' + ', '.join(f'{lon} {lat}' for lon, lat in line) + ')' 
                                            for line in coords
                                        ) + ')'
                                    else:  # LINESTRING por defecto
                                        if not all(isinstance(coord, (list, tuple)) and len(coord) >= 2 for coord in coords):
                                            raise ValueError("Formato de coordenadas LINESTRING inválido")
                                        wkt_str = 'LINESTRING(' + ', '.join(f'{lon} {lat}' for lon, lat in coords) + ')'
                                        
                                    geometry = wkt.loads(wkt_str)
                                    
                                except json.JSONDecodeError:
                                    # Si falla el parseo JSON, intentar como WKT directamente
                                    geometry = wkt.loads(geom_str)
                            else:
                                # Intentar cargar como WKT directamente
                                geometry = wkt.loads(geom_str)
                                
                        except Exception as e:
                            error_msg = f"Error al procesar geometría del itinerario: {str(e)}"
                            print(error_msg)
                            if 'geom' in itinerario and itinerario['geom']:
                                geom_preview = str(itinerario['geom'])[:200] + ('...' if len(str(itinerario['geom'])) > 200 else '')
                                print(f"Geometría problemática: {geom_preview}")
                            continue

                        # Crear nombre base para carpeta y archivo
                        nombre_base = f"itinerario_{itinerario.get('ruta_hex', 'ruta')}_{itinerario.get('fecha_inicio_vigencia', 'fecha').split('T')[0]}"
                        nombre_base = "".join(c if c.isalnum() or c in ('_', '-') else '_' for c in nombre_base)

                        # Si hay más de un itinerario, agrupa cada shape en su carpeta
                        if len(itinerarios_data) > 1:
                            carpeta_shape = nombre_base
                        else:
                            carpeta_shape = ""

                        # Crear GeoDataFrame con manejo de valores nulos
                        try:
                            gdf = gpd.GeoDataFrame(
                                [{
                                    'ruta_hex': itinerario.get('ruta_hex', ''),
                                    'fecha_inicio': itinerario.get('fecha_inicio_vigencia', ''),
                                    'fecha_fin': itinerario.get('fecha_fin_vigencia', ''),
                                    'vigente': itinerario.get('vigente', False),
                                    'observacion': itinerario.get('observacion', ''),
                                    'geometry': geometry
                                }],
                                geometry='geometry',
                                crs='EPSG:4326'  # WGS84
                            )
                        except Exception as e_gpd:
                            print(f"Advertencia: imposible crear GeoDataFrame (itinerarios) para {itinerario.get('fecha_inicio_vigencia','sin_fecha')}: {e_gpd}")
                            gdf = None

                        # Guardar como shapefile temporal si gdf creado
                        if gdf is not None:
                            temp_shapefile = os.path.join(temp_dir, f"{nombre_base}.shp")
                            try:
                                gdf.to_file(temp_shapefile, driver='ESRI Shapefile', encoding='utf-8')
                            except Exception as e:
                                print(f"Advertencia: fallo al escribir shapefile para {nombre_base}: {e}")

                            # Agregar archivos al ZIP, agrupando por carpeta si corresponde
                            created_files = []
                            for ext in ['.shp', '.shx', '.dbf', '.prj', '.cpg']:
                                file_path = os.path.splitext(temp_shapefile)[0] + ext
                                if os.path.exists(file_path):
                                    created_files.append(file_path)
                                    if carpeta_shape:
                                        arcname = os.path.join(carpeta_shape, os.path.basename(file_path))
                                    else:
                                        arcname = os.path.basename(file_path)
                                    zipf.write(file_path, arcname=arcname)
                                    temp_shapefiles.append(file_path)

                            # Si no se generaron archivos shapefile (posible problema con dependencias),
                            # intentar pyshp fallback, luego GeoJSON con geopandas y luego manual
                            if not created_files:
                                try:
                                    if gdf is not None:
                                        recs = gdf.to_dict(orient='records')
                                        features = []
                                        for rec in recs:
                                            geom_rec = rec.get('geometry')
                                            if geom_rec is None:
                                                continue
                                            feat = {
                                                'type': 'Feature',
                                                'properties': {k: v for k, v in rec.items() if k != 'geometry'},
                                                'geometry': mapping(geom_rec) if hasattr(geom_rec, '__geo_interface__') or hasattr(geom_rec, 'geom_type') else geom_rec
                                            }
                                            features.append(feat)

                                        if features and shp_writer is not None:
                                            base_no_ext = os.path.splitext(temp_shapefile)[0]
                                            written = write_shapefile_pyshp(base_no_ext, features)
                                            if written:
                                                for fp in written:
                                                    if carpeta_shape:
                                                        arcname = os.path.join(carpeta_shape, os.path.basename(fp))
                                                    else:
                                                        arcname = os.path.basename(fp)
                                                    zipf.write(fp, arcname=arcname)
                                                    temp_shapefiles.append(fp)
                                                created_files = written
                                                print(f"pyshp escribió archivos para {nombre_base}: {written}")
                                except Exception as e_py:
                                    print(f"pyshp fallback error para {nombre_base}: {e_py}")

                                try:
                                    temp_geojson = os.path.join(temp_dir, f"{nombre_base}.geojson")
                                    gdf.to_file(temp_geojson, driver='GeoJSON', encoding='utf-8')
                                    if os.path.exists(temp_geojson):
                                        if carpeta_shape:
                                            arcname = os.path.join(carpeta_shape, os.path.basename(temp_geojson))
                                        else:
                                            arcname = os.path.basename(temp_geojson)
                                        zipf.write(temp_geojson, arcname=arcname)
                                        temp_shapefiles.append(temp_geojson)
                                        print(f"Fallback GeoJSON creado para {nombre_base}: {temp_geojson}")
                                except Exception as e_geo:
                                    print(f"Fallo al escribir GeoJSON con geopandas para {nombre_base}: {e_geo}")
                                    # Escritura manual de GeoJSON
                                    try:
                                        temp_geojson = os.path.join(temp_dir, f"{nombre_base}.geojson")
                                        geojson_obj = {
                                            "type": "FeatureCollection",
                                            "features": []
                                        }
                                        for rec in gdf.to_dict(orient='records'):
                                            geom_rec = rec.get('geometry')
                                            if geom_rec is None:
                                                continue
                                            feature = {
                                                "type": "Feature",
                                                "properties": {k: v for k, v in rec.items() if k != 'geometry'},
                                                "geometry": mapping(geom_rec) if hasattr(geom_rec, '__geo_interface__') or hasattr(geom_rec, 'geom_type') else geom_rec
                                            }
                                            geojson_obj['features'].append(feature)
                                        with open(temp_geojson, 'w', encoding='utf-8') as fgeo:
                                            json.dump(geojson_obj, fgeo, ensure_ascii=False)
                                        if os.path.exists(temp_geojson):
                                            if carpeta_shape:
                                                arcname = os.path.join(carpeta_shape, os.path.basename(temp_geojson))
                                            else:
                                                arcname = os.path.basename(temp_geojson)
                                            zipf.write(temp_geojson, arcname=arcname)
                                            temp_shapefiles.append(temp_geojson)
                                            print(f"Fallback GeoJSON (manual) creado para {nombre_base}: {temp_geojson}")
                                    except Exception as e_manual:
                                        print(f"Error creando GeoJSON manual para {nombre_base}: {e_manual}")
                        
                    except Exception as e:
                        print(f"Error procesando itinerario {itinerario.get('fecha_inicio_vigencia', 'desconocido')}: {str(e)}")
                        continue
            
            # Verificar si se generó algún archivo
            try:
                # DEBUG: listar contenido final de temp_dir
                print(f"DEBUG: final temp_dir listing: {os.listdir(temp_dir)}")
            except Exception:
                pass
            if not os.path.exists(zip_path) or os.path.getsize(zip_path) == 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No se pudo generar ningún archivo shape"
                )
            
            try:
                with zipfile.ZipFile(zip_path, 'r') as zf:
                    print(f"DEBUG: zip namelist: {zf.namelist()}")
            except Exception as ez:
                print(f"DEBUG: no se pudo leer zip para listar contenido: {ez}")
            print(f"Archivo ZIP generado correctamente en {zip_path}")
            
            # Crear una respuesta de archivo con los headers CORS necesarios
            response = FileResponse(
                path=zip_path,
                media_type='application/zip',
                filename=f'shapes_itinerarios_{len(itinerarios_con_geometria)}_itinerarios.zip',
                headers={
                    "Content-Disposition": f"attachment; filename=shapes_itinerarios_{len(itinerarios_con_geometria)}_itinerarios.zip"
                }
            )
            
            return response
            
        except Exception as e:
            print(f"Error al generar el archivo ZIP: {str(e)}")
            print(f"Tipo de error: {type(e).__name__}")
            print(f"Traceback: {traceback.format_exc()}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                detail=f"Error al generar el archivo ZIP: {str(e)}"
            )
            
    except HTTPException:
        # Re-lanzar las excepciones HTTP
        raise
        
    except Exception as e:
        print(f"Error inesperado: {str(e)}")
        print(f"Tipo de error: {type(e).__name__}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error inesperado al procesar la solicitud: {str(e)}"
        )
        
    finally:
        pass

@app.delete("/historico_itinerario/{ruta_hex}/{fecha_inicio_vigencia}", status_code=204)
async def eliminar_itinerario(ruta_hex: str, fecha_inicio_vigencia: str, session: AsyncSession = Depends(get_session), current_user: dict = Depends(check_permission("delete"))):
    try:
        fecha_dt = date.fromisoformat(fecha_inicio_vigencia)
    except Exception:
        raise HTTPException(status_code=400, detail="Formato de fecha_inicio_vigencia inválido. Use YYYY-MM-DD")
    result = await session.execute(select(HistoricoItinerario).where(and_(HistoricoItinerario.ruta_hex == ruta_hex, HistoricoItinerario.fecha_inicio_vigencia == fecha_dt)))
    db_item = result.scalar_one_or_none()
    if not db_item:
        raise HTTPException(status_code=404, detail="Itinerario no encontrado")
    await session.delete(db_item)
    await session.commit()
    return Response(status_code=204)


# ===== HISTORICO EOT POR RUTA =====
@app.get("/historico_eot_ruta", response_model=List[Dict])
async def listar_historico_eot(ruta_hex: str, session: AsyncSession = Depends(get_session), current_user: dict = Depends(check_permission("read"))):
    try:
        query = text(
            """
            SELECT h.id_hist_eot, h.ruta_hex, h.id_eot, h.fecha_inicio, h.fecha_fin, h.observacion, e.eot_nombre
            FROM historico_eot_ruta h
            LEFT JOIN eots e ON e.eot_id = h.id_eot
            WHERE h.ruta_hex = :ruta_hex
            ORDER BY h.fecha_inicio DESC
            """
        )
        result = await session.execute(query, {"ruta_hex": ruta_hex})
        rows = [dict(r) for r in result.mappings().all()]
        return rows
    except Exception as e:
        print(f"Error listar_historico_eot: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/historico_eot_ruta", response_model=HistoricoEotRutaResponse)
async def crear_historico_eot(item: HistoricoEotRutaCreate, session: AsyncSession = Depends(get_session), current_user: dict = Depends(check_permission("write"))):
    try:
        # Validate date ordering
        if item.fecha_fin is not None and item.fecha_fin < item.fecha_inicio:
            raise HTTPException(status_code=400, detail="fecha_fin no puede ser anterior a fecha_inicio")

        # Check for overlapping intervals on the same ruta_hex
        new_start = item.fecha_inicio
        new_end = item.fecha_fin
        if new_end is None:
            overlap_query = text(
                """
                SELECT COUNT(1) as cnt FROM historico_eot_ruta
                WHERE ruta_hex = :ruta_hex
                  AND (fecha_fin IS NULL OR fecha_fin >= :new_start)
                """
            )
            params = {"ruta_hex": item.ruta_hex, "new_start": new_start}
        else:
            overlap_query = text(
                """
                SELECT COUNT(1) as cnt FROM historico_eot_ruta
                WHERE ruta_hex = :ruta_hex
                  AND fecha_inicio <= :new_end
                  AND (fecha_fin IS NULL OR fecha_fin >= :new_start)
                """
            )
            params = {"ruta_hex": item.ruta_hex, "new_start": new_start, "new_end": new_end}

        overlap_res = await session.execute(overlap_query, params)
        overlap_count = overlap_res.scalar_one()
        if overlap_count and overlap_count > 0:
            raise HTTPException(status_code=400, detail="Fechas superpuestas con registro existente para esta ruta")
        insert_stmt = text(
            """
            INSERT INTO historico_eot_ruta (ruta_hex, id_eot, fecha_inicio, fecha_fin, observacion)
            VALUES (:ruta_hex, :id_eot, :fecha_inicio, :fecha_fin, :observacion)
            RETURNING id_hist_eot
            """
        )
        res = await session.execute(insert_stmt, {
            "ruta_hex": item.ruta_hex,
            "id_eot": item.id_eot,
            "fecha_inicio": item.fecha_inicio,
            "fecha_fin": item.fecha_fin,
            "observacion": item.observacion,
        })
        new_id = res.scalar_one()
        await session.commit()
        # Return created object
        result = await session.execute(text("SELECT * FROM historico_eot_ruta WHERE id_hist_eot = :id"), {"id": new_id})
        row = result.mappings().first()
        return dict(row)
    except IntegrityError as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/historico_eot_ruta/{id_hist_eot}", status_code=204)
async def eliminar_historico_eot(id_hist_eot: int, session: AsyncSession = Depends(get_session), current_user: dict = Depends(check_permission("delete"))):
    try:
        await session.execute(text("DELETE FROM historico_eot_ruta WHERE id_hist_eot = :id"), {"id": id_hist_eot})
        await session.commit()
        return Response(status_code=204)
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/historico_eot_ruta/{id_hist_eot}", response_model=HistoricoEotRutaResponse)
async def actualizar_historico_eot(id_hist_eot: int, item: HistoricoEotRutaUpdate, session: AsyncSession = Depends(get_session), current_user: dict = Depends(check_permission("write"))):
    try:
        # verificar existencia
        result = await session.execute(select(HistoricoEotRuta).where(HistoricoEotRuta.id_hist_eot == id_hist_eot))
        db_item = result.scalar_one_or_none()
        if not db_item:
            raise HTTPException(status_code=404, detail="Registro no encontrado")

        update_fields = item.dict(exclude_unset=True)

        # Construir parámetros para UPDATE
        params = {"id": id_hist_eot}
        set_clauses = []
        if "id_eot" in update_fields:
            set_clauses.append("id_eot = :id_eot")
            params["id_eot"] = update_fields["id_eot"]
        if "fecha_inicio" in update_fields:
            set_clauses.append("fecha_inicio = :fecha_inicio")
            params["fecha_inicio"] = update_fields["fecha_inicio"]
        if "fecha_fin" in update_fields:
            set_clauses.append("fecha_fin = :fecha_fin")
            params["fecha_fin"] = update_fields["fecha_fin"]
        if "observacion" in update_fields:
            set_clauses.append("observacion = :observacion")
            params["observacion"] = update_fields["observacion"]

        if set_clauses:
            # Before applying update, if fechas change, validate no solapamiento
            # Determine new candidate start/end for overlap check
            candidate_start = params.get('fecha_inicio', None)
            candidate_end = params.get('fecha_fin', None)
            if candidate_start is not None or candidate_end is not None:
                # fetch ruta_hex for this record
                r = await session.execute(text("SELECT ruta_hex FROM historico_eot_ruta WHERE id_hist_eot = :id"), {"id": id_hist_eot})
                row = r.mappings().first()
                ruta_hex_val = row['ruta_hex'] if row else None
                if ruta_hex_val:
                    # Build overlap query excluding current id
                    if candidate_end is None:
                        overlap_q = text(
                            """
                            SELECT COUNT(1) FROM historico_eot_ruta
                            WHERE ruta_hex = :ruta_hex AND id_hist_eot != :id
                              AND (fecha_fin IS NULL OR fecha_fin >= :candidate_start)
                            """
                        )
                        ov_params = {"ruta_hex": ruta_hex_val, "candidate_start": candidate_start, "id": id_hist_eot}
                    else:
                        overlap_q = text(
                            """
                            SELECT COUNT(1) FROM historico_eot_ruta
                            WHERE ruta_hex = :ruta_hex AND id_hist_eot != :id
                              AND fecha_inicio <= :candidate_end
                              AND (fecha_fin IS NULL OR fecha_fin >= :candidate_start)
                            """
                        )
                        ov_params = {"ruta_hex": ruta_hex_val, "candidate_start": candidate_start, "candidate_end": candidate_end, "id": id_hist_eot}

                    overlap_r = await session.execute(overlap_q, ov_params)
                    overlap_cnt = overlap_r.scalar_one()
                    if overlap_cnt and overlap_cnt > 0:
                        raise HTTPException(status_code=400, detail="Fechas superpuestas con registro existente para esta ruta")

            stmt = text(f"UPDATE historico_eot_ruta SET {', '.join(set_clauses)} WHERE id_hist_eot = :id")
            await session.execute(stmt, params)
            await session.commit()

        # Devolver registro actualizado
        result = await session.execute(text("SELECT * FROM historico_eot_ruta WHERE id_hist_eot = :id"), {"id": id_hist_eot})
        row = result.mappings().first()
        return dict(row)
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        print(f"Error actualizar_historico_eot: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# 16. ANÁLISIS DE RECORRIDOS
# ============================================

def get_location_info(lat, lon):
    """Obtiene información de ubicación usando Nominatim (OpenStreetMap)"""
    try:
        from geopy.geocoders import Nominatim
        from geopy.exc import GeocoderTimedOut
        
        geolocator = Nominatim(user_agent="vmt_catalogos")
        location = geolocator.reverse(f"{lat}, {lon}", language="es")
        
        if location and location.raw.get('address'):
            addr = location.raw['address']
            return {
                'road': addr.get('road', ''),
                'suburb': addr.get('suburb', ''),
                'city': addr.get('city', addr.get('town', addr.get('village', ''))),
                'state': addr.get('state', ''),
                'postcode': addr.get('postcode', ''),
                'country': addr.get('country', '')
            }
    except Exception as e:
        print(f"Error obteniendo ubicación: {e}")
    return None

def get_street_names(coords):
    """Obtiene nombres de calles a lo largo del recorrido usando Overpass API.

    Implementación via HTTP para controlar exactamente la consulta y evitar que
    librerías intermedias dupliquen cláusulas como `[out:json]` o `out body`.
    """
    try:
        streets = []
        # Tomar puntos cada cierta distancia para no sobrecargar la API
        sample_points = coords[:: max(1, len(coords) // 10)] if len(coords) > 10 else coords

        overpass_endpoints = [
            "https://overpass-api.de/api/interpreter",
            "https://overpass.kumi.systems/api/interpreter",
            "https://z.overpass-api.de/api/interpreter",
        ]

        def try_query(url, query):
            # Exponential backoff retries
            backoff = 1
            for attempt in range(3):
                try:
                    resp = requests.post(url, data={"data": query}, timeout=10)
                    resp.raise_for_status()
                    return resp.json()
                except Exception as e:
                    print(f"Overpass attempt {attempt+1} failed for {url}: {e}")
                    time.sleep(backoff)
                    backoff *= 2
            return None

        # Try queries; if many endpoints/timeouts, reduce sampling and keep trying
        for lat, lon in sample_points:
            query = f"[out:json];way(around:50,{lat},{lon})[highway];out tags;"
            result = None
            for endpoint in overpass_endpoints:
                result = try_query(endpoint, query)
                if result is not None:
                    break
            if result is None:
                print(f"All Overpass endpoints failed for point {lat},{lon}")
                continue

            # Collect names for this sample point; if none, mark unknown
            names = []
            for element in result.get('elements', []):
                tags = element.get('tags') or {}
                name = tags.get('name')
                if name:
                    names.append(name)

            if not names:
                streets.append({"lat": lat, "lon": lon, "name": "nombre desconocido"})
            else:
                # Deduplicate names for this point
                unique = list(dict.fromkeys(names))
                for n in unique:
                    streets.append({"lat": lat, "lon": lon, "name": n})

        return streets
    except Exception as e:
        print(f"Error obteniendo nombres de calles: {e}")
        return []

@app.post("/analizar_recorrido")
async def analizar_recorrido(
    ruta_data: Dict[str, Any],
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(check_permission("read"))
):
    """
    Analiza un recorrido y devuelve información sobre su ubicación de inicio,
    calles por las que pasa y ubicación final.
    """
    try:
        geom = ruta_data.get('geom')
        if not geom or 'coordinates' not in geom:
            raise HTTPException(
                status_code=400,
                detail="Geometría no válida o ausente"
            )
            
        coords = geom['coordinates']
        if geom['type'] == 'MultiLineString':
            # Tomar el primer linestring
            coords = coords[0]
        
        if not coords or len(coords) < 2:
            raise HTTPException(
                status_code=400,
                detail="No hay suficientes coordenadas para analizar"
            )
            
        # Obtener información de inicio
        start_point = coords[0]
        start_info = get_location_info(start_point[1], start_point[0])
        
        # Obtener información de fin
        end_point = coords[-1]
        end_info = get_location_info(end_point[1], end_point[0])
        
        # Obtener calles del recorrido
        street_entries = get_street_names([(p[1], p[0]) for p in coords])

        # Crear análisis textual legible
        lines = []
        lines.append(f"Inicio: {start_point[1]}, {start_point[0]} - {start_info or {}}")
        for e in street_entries:
            lines.append(f"Calle: {e.get('name')} (cerca de {e.get('lat')},{e.get('lon')})")
        lines.append(f"Fin: {end_point[1]}, {end_point[0]} - {end_info or {}}")

        analisis_text = "\n".join(lines)

        return {
            "analisis": analisis_text,
            "inicio": {
                "coordenadas": {"lat": start_point[1], "lon": start_point[0]},
                "ubicacion": start_info
            },
            "fin": {
                "coordenadas": {"lat": end_point[1], "lon": end_point[0]},
                "ubicacion": end_info
            },
            "calles_recorrido": street_entries,
            "cantidad_puntos": len(coords)
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error analizando recorrido: {str(e)}"
        )

# ============================================
# 17. EVENTOS DE INICIO/SHUTDOWN
# ============================================

@app.on_event("startup")
async def startup():
    """
    Evento que se ejecuta al iniciar la aplicación.
    Crea las tablas de la base de datos si no existen.
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
