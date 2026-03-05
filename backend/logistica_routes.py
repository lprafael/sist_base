from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import text, func, and_, or_
from typing import List, Dict, Any, Optional
from datetime import datetime
import uuid

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
    query = select(Chofer)
    if dept_id:
        query = query.where(Chofer.departamento_id == dept_id)
    if dist_id:
        query = query.where(Chofer.distrito_id == dist_id)
    
    result = await session.execute(query)
    return result.scalars().all()

@router.post("/choferes")
async def create_chofer(
    data: Dict[str, Any],
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(check_permission("electoral_write"))
):
    nuevo_chofer = Chofer(
        nombre=data.get("nombre"),
        telefono=data.get("telefono"),
        vehiculo_info=data.get("vehiculo_info"),
        token_seguimiento=str(uuid.uuid4()),
        departamento_id=data.get("departamento_id"),
        distrito_id=data.get("distrito_id"),
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
        
    chofer.latitud = lat
    chofer.longitud = lng
    chofer.ultima_conexion = datetime.now()
    
    await session.commit()
    return {"status": "ok", "chofer_nombre": chofer.nombre}

@router.get("/tracking/votantes")
async def get_votantes_para_chofer(token: str, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Chofer).where(Chofer.token_seguimiento == token))
    chofer = result.scalar_one_or_none()
    
    if not chofer:
        raise HTTPException(status_code=404, detail="Chofer no encontrado")
        
    # Buscar votantes pendientes en el mismo distrito del chofer
    query = text("""
        SELECT pv.id, p.nombres, p.apellidos, pv.domicilio, pv.latitud, pv.longitud, pv.logistica_estado
        FROM electoral.posibles_votantes pv
        JOIN electoral.anr_padron_2026 p ON pv.cedula_votante = p.cedula
        WHERE p.departamento = :d AND p.distrito = :di
        AND (pv.logistica_estado = 'pendiente' OR (pv.logistica_estado = 'en_camino' AND pv.chofer_id = :cid))
        ORDER BY pv.logistica_estado DESC, p.apellidos ASC
    """)
    
    result_votantes = await session.execute(query, {
        "d": chofer.departamento_id, 
        "di": chofer.distrito_id,
        "cid": chofer.id
    })
    
    return [
        {
            "id": r.id,
            "nombre": f"{r.nombres} {r.apellidos}",
            "domicilio": r.domicilio,
            "lat": r.latitud,
            "lng": r.longitud,
            "estado": r.logistica_estado
        } for r in result_votantes.fetchall()
    ]

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

# --- ACCIONES DEL VEEDOR (Voto) ---

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
    result_choferes = await session.execute(
        select(Chofer).where(
            and_(
                Chofer.departamento_id == dept_id,
                Chofer.distrito_id == dist_id,
                Chofer.activo == True,
                Chofer.latitud.isnot(None)
            )
        )
    )
    choferes = result_choferes.scalars().all()
    
    # 2. Obtener simpatizantes que NO han votado
    # Hacemos join con Padron para tener nombre/apellido y local de votación
    query_votantes = text("""
        SELECT pv.id, pv.latitud, pv.longitud, pv.logistica_estado, 
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
            "local": r.local_nombre
        })
        
    return {
        "choferes": [
            {
                "id": c.id,
                "nombre": c.nombre,
                "lat": c.latitud,
                "lng": c.longitud,
                "ultima_conexion": c.ultima_conexion,
                "vehiculo": c.vehiculo_info
            } for c in choferes
        ],
        "votantes": votantes
    }
