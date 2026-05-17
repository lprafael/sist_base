from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import text, func, and_, or_
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import uuid
import json

from database import get_session
from models import Chofer, PosibleVotante, Usuario, AnrPadron
from security import get_current_user, check_permission

router = APIRouter(prefix="/api/logistica", tags=["Logística Día D"])

# --- GESTIÓN DE CHOFERES (Admin) ---

@router.get("/choferes")
async def list_choferes(
    dept_id: Optional[int] = None,
    dist_id: Optional[int] = None,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    from hierarchy_utils import get_visible_user_ids
    user_id = current_user["user_id"]
    user_role = current_user.get("role", "referente")
    
    if user_role == "referente":
        return []

    # Obtener IDs de usuarios visibles según jerarquía
    if user_role == "concejal":
        # Concejales solo ven sus propios choferes (según requerimiento: "concejales solo sus choferes")
        visible_user_ids = [user_id]
    else:
        # Admin y Candidato Principal ven sus propios choferes + los de sus subordinados
        visible_user_ids = await get_visible_user_ids(user_id, user_role, session)
        visible_user_ids.append(user_id)
    
    # Query con JOIN para traer el nombre del creador
    stmt = (
        select(
            Chofer.id,
            Chofer.nombre,
            Chofer.telefono,
            Chofer.vehiculo_info,
            Chofer.token_seguimiento,
            Chofer.latitud,
            Chofer.longitud,
            Chofer.ultima_conexion,
            Chofer.activo,
            Chofer.departamento_id,
            Chofer.distrito_id,
            Chofer.creado_por,
            Usuario.nombre_completo.label("creador_nombre")
        )
        .outerjoin(Usuario, Chofer.creado_por == Usuario.id)
        .where(Chofer.activo == True)
    )
    
    if user_role != "admin":
        stmt = stmt.where(Chofer.creado_por.in_(visible_user_ids))
    
    if dept_id:
        stmt = stmt.where(Chofer.departamento_id == dept_id)
    if dist_id:
        stmt = stmt.where(Chofer.distrito_id == dist_id)
    
    result = await session.execute(stmt.order_by(Chofer.nombre))
    
    # Convertir filas a diccionarios
    return [dict(r._mapping) for r in result.all()]

@router.delete("/choferes/{chofer_id}")
async def delete_chofer(
    chofer_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["user_id"]
    user_role = current_user.get("role", "referente")
    
    if user_role not in ["admin", "candidato_principal", "equipo_electoral"]:
        raise HTTPException(status_code=403, detail="No tienes permisos para eliminar choferes")
        
    result = await session.execute(select(Chofer).where(Chofer.id == chofer_id))
    chofer = result.scalar_one_or_none()
    
    if not chofer:
        raise HTTPException(status_code=404, detail="Chofer no encontrado")
        
    # Verificar propiedad (solo el creador o un admin puede borrarlo)
    if user_role != "admin" and chofer.creado_por != user_id:
        raise HTTPException(status_code=403, detail="Solo puedes borrar tus propios choferes")
        
    chofer.activo = False
    await session.commit()
    return {"message": "Chofer eliminado correctamente"}

@router.post("/choferes")
async def create_chofer(
    data: Dict[str, Any],
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["user_id"]
    user_role = current_user.get("role")
    
    if user_role not in ["admin", "candidato_principal", "equipo_electoral"]:
        raise HTTPException(status_code=403, detail="No tienes permisos para crear choferes")

    # Asegurar que los IDs territoriales sean enteros o None (evitar error de asyncpg con strings vacíos)
    def to_int(v):
        if v is None or v == "":
            return None
        try:
            return int(v)
        except (ValueError, TypeError):
            return None

    nuevo_chofer = Chofer(
        nombre=data.get("nombre"),
        telefono=data.get("telefono"),
        vehiculo_info=data.get("vehiculo_info"),
        token_seguimiento=str(uuid.uuid4()),
        departamento_id=to_int(data.get("departamento_id")),
        distrito_id=to_int(data.get("distrito_id")),
        creado_por=user_id,
        activo=True
    )
    session.add(nuevo_chofer)
    await session.commit()
    await session.refresh(nuevo_chofer)
    return nuevo_chofer

# --- TRACKING PÚBLICO (Sin auth JWT, usa token de seguimiento) ---

@router.post("/tracking/update")
async def update_tracking(data: Dict[str, Any], session: AsyncSession = Depends(get_session)):
    token = data.get("token")
    lat = data.get("lat")
    lng = data.get("lng")
    
    if not token:
        raise HTTPException(status_code=400, detail="Token requerido")
        
    result = await session.execute(select(Chofer).where(Chofer.token_seguimiento == token))
    chofer = result.scalar_one_or_none()
    
    if not chofer:
        raise HTTPException(status_code=404, detail="Chofer no encontrado")
        
    def to_float(v):
        if v is None or v == "":
            return None
        try:
            return float(v)
        except (ValueError, TypeError):
            return None

    chofer.latitud = to_float(lat)
    chofer.longitud = to_float(lng)
    chofer.ultima_conexion = datetime.now(timezone.utc)
    
    await session.commit()
    return {"status": "ok", "chofer_nombre": chofer.nombre}

@router.get("/tracking/votantes")
async def get_votantes_para_chofer(token: str, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Chofer).where(Chofer.token_seguimiento == token))
    chofer = result.scalar_one_or_none()
    
    if not chofer:
        raise HTTPException(status_code=404, detail="Chofer no encontrado")
        
    # Buscar votantes pendientes en el mismo distrito del chofer, trayendo la info del local
    query = text("""
        SELECT pv.id, p.nombres, p.apellidos, pv.domicilio, pv.latitud, pv.longitud, pv.logistica_estado,
               l.descripcion as local_nombre, l.ubicacion as local_coords
        FROM electoral.posibles_votantes pv
        JOIN electoral.anr_padron_2026 p ON pv.cedula_votante = p.cedula
        LEFT JOIN electoral.ref_locales l ON p.local = l.local_id 
             AND p.departamento = l.departamento_id AND p.distrito = l.distrito_id
             AND p.seccional = l.seccional_id
        WHERE p.departamento = :d AND p.distrito = :di
        AND (pv.logistica_estado = 'pendiente' OR (pv.logistica_estado IN ('en_camino', 'en_destino') AND pv.chofer_id = :cid))
        ORDER BY pv.logistica_estado DESC, p.apellidos ASC
    """)
    
    result_votantes = await session.execute(query, {
        "d": chofer.departamento_id, 
        "di": chofer.distrito_id,
        "cid": chofer.id
    })
    
    votantes = []
    for r in result_votantes.fetchall():
        # Procesar coordenadas del local que vienen en JSON
        l_lat, l_lng = None, None
        if r.local_coords:
            try:
                # Si es string (PostgreSQL JSON) o dict
                coords = r.local_coords if isinstance(r.local_coords, dict) else json.loads(r.local_coords)
                l_lat = coords.get('lat')
                l_lng = coords.get('lng')
            except: pass

        votantes.append({
            "id": r.id,
            "nombre": f"{r.nombres} {r.apellidos}",
            "domicilio": r.domicilio,
            "lat": r.latitud,
            "lng": r.longitud,
            "estado": r.logistica_estado,
            "local_nombre": r.local_nombre,
            "local_lat": l_lat,
            "local_lng": l_lng
        })
    
    return votantes

# --- ACCIONES DEL CHOFER (Traslado) ---

@router.post("/marcar-traslado")
async def marcar_traslado(data: Dict[str, Any], session: AsyncSession = Depends(get_session)):
    token = data.get("token")
    votante_id = data.get("votante_id")
    
    result = await session.execute(select(Chofer).where(Chofer.token_seguimiento == token))
    chofer = result.scalar_one_or_none()
    
    if not chofer:
        raise HTTPException(status_code=404, detail="Acceso denegado")
        
    result = await session.execute(select(PosibleVotante).where(PosibleVotante.id == votante_id))
    votante = result.scalar_one_or_none()
    
    if not votante:
        raise HTTPException(status_code=404, detail="Votante no encontrado")
        
    votante.logistica_estado = 'en_camino'
    votante.chofer_id = chofer.id
    votante.fecha_traslado = datetime.now()
    
    await session.commit()
    return {"status": "ok", "message": "Votante marcado como en camino"}

@router.post("/marcar-destino")
async def marcar_destino(data: Dict[str, Any], session: AsyncSession = Depends(get_session)):
    token = data.get("token")
    votante_id = data.get("votante_id")
    
    result = await session.execute(select(Chofer).where(Chofer.token_seguimiento == token))
    chofer = result.scalar_one_or_none()
    
    if not chofer:
        raise HTTPException(status_code=404, detail="Acceso denegado")
        
    result = await session.execute(select(PosibleVotante).where(PosibleVotante.id == votante_id))
    votante = result.scalar_one_or_none()
    
    if not votante:
        raise HTTPException(status_code=404, detail="Votante no encontrado")
        
    votante.logistica_estado = 'en_destino'
    votante.fecha_destino = datetime.now()
    
    await session.commit()
    return {"status": "ok", "message": "Votante marcado como llegó a destino"}

# --- ACCIONES DEL VEEDOR (Voto) ---

@router.post("/cancelar-traslado")
async def cancelar_traslado(
    data: Dict[str, Any],
    session: AsyncSession = Depends(get_session)
):
    """Cancela un traslado en curso, devolviendo al votante a estado pendiente"""
    token = data.get("token")
    votante_id = data.get("votante_id")
    
    # Validar que el chofer con ese token existe (si viene token)
    if token:
        chofer_res = await session.execute(select(Chofer).where(Chofer.token_seguimiento == token))
        if not chofer_res.scalar_one_or_none():
            raise HTTPException(status_code=401, detail="Token de chofer inválido")

    result = await session.execute(select(PosibleVotante).where(PosibleVotante.id == votante_id))
    votante = result.scalar_one_or_none()
    
    if not votante:
        raise HTTPException(status_code=404, detail="Votante no encontrado")
        
    votante.logistica_estado = 'pendiente'
    votante.chofer_id = None
    votante.fecha_traslado = None
    votante.fecha_destino = None
    
    await session.commit()
    return {"status": "ok", "message": "Traslado cancelado correctamente"}

@router.post("/marcar-voto")
async def marcar_voto(
    data: Dict[str, Any], 
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    votante_id = data.get("votante_id")
    
    result = await session.execute(select(PosibleVotante).where(PosibleVotante.id == votante_id))
    votante = result.scalar_one_or_none()
    
    if not votante:
        raise HTTPException(status_code=404, detail="Votante no encontrado")
        
    votante.logistica_estado = 'voto'
    votante.veedor_id = current_user.get("user_id") # Asumiendo que el token tiene user_id
    votante.fecha_voto = datetime.now()
    
    await session.commit()
    return {"status": "ok", "message": "Voto registrado correctamente"}

# --- TABLERO DE CONTROL (Mapa) ---

@router.get("/control-mapa")
async def get_control_mapa(
    dept_id: int,
    dist_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    # 1. Obtener choferes activos en la zona
    # 1. Obtener choferes activos en la zona con el nombre de su creador
    stmt_choferes = (
        select(
            Chofer.id,
            Chofer.nombre,
            Chofer.latitud,
            Chofer.longitud,
            Chofer.ultima_conexion,
            Chofer.vehiculo_info,
            Usuario.nombre_completo.label("creador_nombre")
        )
        .outerjoin(Usuario, Chofer.creado_por == Usuario.id)
        .where(
            and_(
                Chofer.departamento_id == dept_id,
                Chofer.distrito_id == dist_id,
                Chofer.activo == True,
                Chofer.latitud.isnot(None)
            )
        )
    )
    result_choferes = await session.execute(stmt_choferes)
    choferes = result_choferes.all()
    
    # 2. Obtener simpatizantes que NO han votado
    # Hacemos join con Padron para tener nombre/apellido y local de votación
    query_votantes = text("""
        SELECT pv.id, pv.latitud, pv.longitud, pv.logistica_estado, pv.grado_seguridad,
               p.nombres, p.apellidos, p.cedula,
               l.descripcion as local_nombre
        FROM electoral.posibles_votantes pv
        JOIN electoral.anr_padron_2026 p ON pv.cedula_votante = p.cedula
        LEFT JOIN electoral.ref_locales l ON p.local = l.local_id 
             AND p.departamento = l.departamento_id AND p.distrito = l.distrito_id
             AND p.seccional = l.seccional_id
        WHERE p.departamento = :d AND p.distrito = :di
        AND (pv.logistica_estado IS NULL OR pv.logistica_estado != 'voto')
    """)
    
    result_votantes = await session.execute(query_votantes, {"d": dept_id, "di": dist_id})
    votantes = []
    for r in result_votantes.fetchall():
        votantes.append({
            "id": r.id,
            "lat": r.latitud,
            "lng": r.longitud,
            "estado": r.logistica_estado or 'pendiente',
            "nombre": f"{r.nombres} {r.apellidos}",
            "cedula": r.cedula,
            "local": r.local_nombre,
            "grado_seguridad": r.grado_seguridad
        })
        
    return {
        "choferes": [
            {
                "id": c.id,
                "nombre": c.nombre,
                "lat": c.latitud,
                "lng": c.longitud,
                "ultima_conexion": c.ultima_conexion,
                "vehiculo": c.vehiculo_info,
                "creador_nombre": c.creador_nombre
            } for c in choferes
        ],
        "votantes": votantes
    }

# --- GESTIÓN DE VEEDORES ---

@router.get("/veedores")
async def list_veedores(
    dept_id: Optional[int] = None,
    dist_id: Optional[int] = None,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """Lista usuarios que tienen asignaciones de veedor"""
    stmt = (
        select(Usuario.id, Usuario.nombre_completo, Usuario.username, 
               Usuario.veedor_local_id, Usuario.veedor_seccional_id, Usuario.veedor_mesas)
        .where(or_(Usuario.veedor_local_id.isnot(None), Usuario.rol == 'referente'))
    )
    # Filtro opcional por territorio si el usuario no es admin
    if current_user.get("role") != "admin":
        stmt = stmt.where(Usuario.departamento_id == current_user.get("departamento_id"))
        if current_user.get("distrito_id"):
            stmt = stmt.where(Usuario.distrito_id == current_user.get("distrito_id"))
            
    result = await session.execute(stmt)
    return [dict(r._mapping) for r in result.all()]

@router.get("/locales")
async def get_locales(
    dept_id: int,
    dist_id: int,
    session: AsyncSession = Depends(get_session)
):
    """Lista locales de un distrito para asignación de veedores"""
    stmt = text("""
        SELECT local_id as id, descripcion, seccional_id
        FROM electoral.ref_locales
        WHERE departamento_id = :d AND distrito_id = :di
        ORDER BY descripcion
    """)
    result = await session.execute(stmt, {"d": dept_id, "di": dist_id})
    return [dict(r._mapping) for r in result.all()]

@router.post("/veedores/asignar")
async def asignar_veedor(
    data: Dict[str, Any],
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """Asigna un local y mesas a un usuario"""
    if current_user.get("role") not in ["admin", "candidato_principal", "equipo_electoral"]:
        raise HTTPException(status_code=403, detail="No tienes permisos")
        
    user_id = data.get("user_id")
    local_id = data.get("local_id")
    seccional_id = data.get("seccional_id")
    mesas = data.get("mesas") # List[int]
    
    result = await session.execute(select(Usuario).where(Usuario.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    def to_int(v):
        if v is None or v == "":
            return None
        try:
            return int(v)
        except (ValueError, TypeError):
            return None

    user.veedor_local_id = to_int(local_id)
    user.veedor_seccional_id = to_int(seccional_id)
    user.veedor_mesas = mesas
    
    await session.commit()
    return {"status": "ok", "message": "Veedor asignado correctamente"}

@router.get("/veedor/mis-votantes")
async def get_mis_votantes_veedor(
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """Retorna los votantes asignados al veedor según su local y mesas"""
    # Recargar usuario para tener los campos de veedor
    result = await session.execute(select(Usuario).where(Usuario.id == current_user["user_id"]))
    user = result.scalar_one_or_none()
    
    if not user.veedor_local_id or not user.veedor_mesas:
        return []

    # Mesas es una lista [1, 2, 3] en JSONB
    query = text("""
        SELECT pv.id, p.nombres, p.apellidos, p.cedula, p.mesa, pv.logistica_estado,
               c.nombre as chofer_nombre, c.telefono as chofer_telefono
        FROM electoral.posibles_votantes pv
        JOIN electoral.anr_padron_2026 p ON pv.cedula_votante = p.cedula
        LEFT JOIN electoral.choferes c ON pv.chofer_id = c.id
        WHERE p.departamento = :dept AND p.distrito = :dist AND p.seccional = :sec AND p.local = :loc
        AND p.mesa = ANY(:mesas)
        ORDER BY p.mesa ASC, p.apellidos ASC
    """)
    
    # En PostgreSQL, ANY lo espera como un array literal o similar. 
    # SQLAlchemy maneja listas como arrays de PG en ANY.
    result_votantes = await session.execute(query, {
        "dept": user.departamento_id,
        "dist": user.distrito_id,
        "sec": user.veedor_seccional_id,
        "loc": user.veedor_local_id,
        "mesas": user.veedor_mesas
    })
    
    return [
        {
            "id": r.id,
            "nombre": f"{r.nombres} {r.apellidos}",
            "cedula": r.cedula,
            "mesa": r.mesa,
            "estado": r.logistica_estado or 'pendiente',
            "chofer": {"nombre": r.chofer_nombre, "telefono": r.chofer_telefono} if r.chofer_nombre else None
        } for r in result_votantes.fetchall()
    ]
