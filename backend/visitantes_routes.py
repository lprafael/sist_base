# backend/visitantes_routes.py
# Módulo dedicado para registro y seguimiento independiente de visitantes del Tablero Electoral

import os
import logging
from datetime import datetime
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, desc
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from database import get_session
from models import VisitanteTablero, VisitanteHistorial
from audit_utils import get_client_ip, get_user_agent
from security import create_access_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/public/visitantes", tags=["Visitantes Tablero Electoral"])

class GoogleAuthVisitorDTO(BaseModel):
    credential: str
    device_id: Optional[str] = None
    origen: Optional[str] = "tablero_electoral"

class InteraccionVisitorDTO(BaseModel):
    email: Optional[str] = None
    accion: str
    detalles: Optional[Dict[str, Any]] = None

@router.post("/auth-google")
async def autenticar_visitante_google(
    data: GoogleAuthVisitorDTO,
    request: Request,
    session: AsyncSession = Depends(get_session)
):
    """
    Autentica un visitante del Tablero Electoral mediante Google OAuth2.
    Guarda los datos en la tabla dedicada 'visitantes_tablero' y registra el acceso
    en 'visitantes_historial' SIN vincular ni crear usuarios del sistema ni miembros electorales.
    """
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    if not client_id:
        # Fallback al client ID conocido del proyecto
        client_id = "1052650611016-o42m62srbuc0o76r40tjg26ue1i9e4m9.apps.googleusercontent.com"

    try:
        # Verificar el JWT emitido por Google Identity Services
        id_info = id_token.verify_oauth2_token(
            data.credential,
            google_requests.Request(),
            client_id
        )
    except Exception as e:
        logger.error(f"Error verificando Google Token de visitante: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Token de Google inválido o expirado: {str(e)}"
        )

    google_id = id_info.get("sub")
    email = id_info.get("email")
    name = id_info.get("name") or email.split("@")[0]
    picture = id_info.get("picture")

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La cuenta de Google no proporcionó una dirección de email válida."
        )

    client_ip = get_client_ip(request)
    client_ua = get_user_agent(request)
    now = datetime.utcnow()

    # Buscar si ya existe este visitante en la tabla independiente
    stmt = select(VisitanteTablero).where(
        (VisitanteTablero.email == email) | (VisitanteTablero.google_id == google_id)
    )
    result = await session.execute(stmt)
    visitante = result.scalar_one_or_none()

    if visitante:
        # Visitante recurrente: actualizar métricas
        visitante.total_visitas = (visitante.total_visitas or 0) + 1
        visitante.ultimo_acceso = now
        visitante.ip_ultimo_acceso = client_ip
        visitante.user_agent_ultimo = client_ua
        if name:
            visitante.nombre = name
        if picture:
            visitante.picture = picture
        if google_id and not visitante.google_id:
            visitante.google_id = google_id
    else:
        # Primer registro del visitante
        visitante = VisitanteTablero(
            google_id=google_id or f"google_{email}",
            email=email,
            nombre=name,
            picture=picture,
            primer_acceso=now,
            ultimo_acceso=now,
            total_visitas=1,
            ip_ultimo_acceso=client_ip,
            user_agent_ultimo=client_ua,
            activo=True,
            origen=data.origen or "tablero_electoral"
        )
        session.add(visitante)
        await session.flush()

    # Registrar evento en el historial detallado de visitas
    historial_entry = VisitanteHistorial(
        visitante_id=visitante.id,
        fecha=now,
        accion="login_google",
        detalles={
            "origen": data.origen or "tablero_electoral",
            "email": email,
            "nombre": name,
            "device_id": data.device_id
        },
        ip_address=client_ip,
        user_agent=client_ua
    )
    session.add(historial_entry)
    await session.commit()
    await session.refresh(visitante)

    # Generar token de sesión liviano para el visitante
    token_payload = {
        "sub": visitante.email,
        "visitor_id": visitante.id,
        "role": "visitante_tablero",
        "name": visitante.nombre
    }
    session_token = create_access_token(token_payload)

    return {
        "success": True,
        "mensaje": "Acceso interactivo concedido",
        "visitante": {
            "id": visitante.id,
            "email": visitante.email,
            "nombre": visitante.nombre,
            "picture": visitante.picture,
            "total_visitas": visitante.total_visitas,
            "primer_acceso": visitante.primer_acceso.isoformat() if visitante.primer_acceso else None,
            "ultimo_acceso": visitante.ultimo_acceso.isoformat() if visitante.ultimo_acceso else None
        },
        "token": session_token
    }

@router.post("/log-interaccion")
async def registrar_interaccion_visitante(
    data: InteraccionVisitorDTO,
    request: Request,
    session: AsyncSession = Depends(get_session)
):
    """
    Registra una acción interactiva relevante realizada por el visitante
    (ej: apertura del tablero, cambio de pestaña, filtro por distrito, descarga de datos).
    """
    if not data.email:
        return {"success": False, "message": "Email no especificado"}

    stmt = select(VisitanteTablero).where(VisitanteTablero.email == data.email)
    res = await session.execute(stmt)
    visitante = res.scalar_one_or_none()

    if not visitante:
        return {"success": False, "message": "Visitante no encontrado"}

    client_ip = get_client_ip(request)
    client_ua = get_user_agent(request)

    historial_entry = VisitanteHistorial(
        visitante_id=visitante.id,
        fecha=datetime.utcnow(),
        accion=data.accion,
        detalles=data.detalles or {},
        ip_address=client_ip,
        user_agent=client_ua
    )
    session.add(historial_entry)
    await session.commit()

    return {"success": True}

@router.get("/estadisticas")
async def obtener_metricas_visitantes(
    session: AsyncSession = Depends(get_session)
):
    """
    Retorna métricas agregadas de visitantes del Tablero Electoral
    """
    total_visitantes = (await session.execute(
        select(func.count(VisitanteTablero.id))
    )).scalar() or 0

    total_visitas = (await session.execute(
        select(func.sum(VisitanteTablero.total_visitas))
    )).scalar() or 0

    total_eventos = (await session.execute(
        select(func.count(VisitanteHistorial.id))
    )).scalar() or 0

    return {
        "total_visitantes_unicos": total_visitantes,
        "total_visitas_acumuladas": total_visitas,
        "total_interacciones": total_eventos
    }

@router.get("/listado")
async def listar_visitantes(
    limit: int = 50,
    offset: int = 0,
    session: AsyncSession = Depends(get_session)
):
    """
    Listado histórico de visitantes para consulta administrativa o reportes
    """
    stmt = (
        select(VisitanteTablero)
        .order_by(desc(VisitanteTablero.ultimo_acceso))
        .offset(offset)
        .limit(limit)
    )
    res = await session.execute(stmt)
    visitantes = res.scalars().all()

    return [
        {
            "id": v.id,
            "email": v.email,
            "nombre": v.nombre,
            "picture": v.picture,
            "primer_acceso": v.primer_acceso.isoformat() if v.primer_acceso else None,
            "ultimo_acceso": v.ultimo_acceso.isoformat() if v.ultimo_acceso else None,
            "total_visitas": v.total_visitas,
            "ip_ultimo_acceso": v.ip_ultimo_acceso,
            "origen": v.origen
        }
        for v in visitantes
    ]
