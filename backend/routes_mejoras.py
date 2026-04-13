# routes_mejoras.py
# Módulo de gestión de mejoras / feature requests del sistema

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field

from database import get_session
from auth import get_current_user
from models import Usuario, Mejora

router = APIRouter(prefix="/api/mejoras", tags=["Mejoras"])


# ============================================================
# SCHEMAS
# ============================================================

class MejoraCreate(BaseModel):
    titulo: str = Field(..., min_length=5, max_length=200)
    modulo_afectado: Optional[str] = None
    funcionamiento_actual: Optional[str] = None  # cómo funciona HOY
    mejora_sugerida: str = Field(..., min_length=10)  # qué se pide
    prioridad: str = "media"  # baja, media, alta, critica


class MejoraUpdate(BaseModel):
    titulo: Optional[str] = None
    modulo_afectado: Optional[str] = None
    funcionamiento_actual: Optional[str] = None
    mejora_sugerida: Optional[str] = None
    prioridad: Optional[str] = None


class MejoraImplementar(BaseModel):
    descripcion_implementacion: str = Field(..., min_length=10)
    version_implementacion: Optional[str] = None  # commit hash / versión
    comentarios: Optional[str] = None


class MejoraRechazar(BaseModel):
    motivo_rechazo: str = Field(..., min_length=5)


class MejoraComentario(BaseModel):
    comentario: str = Field(..., min_length=1)


class UsuarioOut(BaseModel):
    id: int
    nombre_completo: str
    username: str
    model_config = {"from_attributes": True}


class MejoraOut(BaseModel):
    id: int
    titulo: str
    modulo_afectado: Optional[str]
    funcionamiento_actual: Optional[str]
    mejora_sugerida: str
    prioridad: str
    estado: str
    solicitado_por: int
    solicitante: Optional[UsuarioOut] = None
    fecha_solicitud: datetime
    implementada_por: Optional[int] = None
    implementador: Optional[UsuarioOut] = None
    fecha_implementacion: Optional[datetime] = None
    descripcion_implementacion: Optional[str] = None
    version_implementacion: Optional[str] = None
    motivo_rechazo: Optional[str] = None
    comentarios: Optional[str] = None
    model_config = {"from_attributes": True}


# ============================================================
# ENDPOINTS
# ============================================================

@router.get("/", response_model=List[MejoraOut])
async def listar_mejoras(
    estado: Optional[str] = None,
    prioridad: Optional[str] = None,
    modulo: Optional[str] = None,
    solo_mias: bool = False,
    skip: int = 0,
    limit: int = Query(100, ge=1, le=500),
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    """Lista todas las mejoras con filtros opcionales."""
    q = select(Mejora).options(
        selectinload(Mejora.solicitante),
        selectinload(Mejora.implementador)
    )
    if estado:
        q = q.where(Mejora.estado == estado)
    if prioridad:
        q = q.where(Mejora.prioridad == prioridad)
    if modulo:
        q = q.where(Mejora.modulo_afectado.ilike(f"%{modulo}%"))
    if solo_mias:
        q = q.where(Mejora.solicitado_por == current_user.id)
    result = await session.execute(
        q.order_by(Mejora.fecha_solicitud.desc()).offset(skip).limit(limit)
    )
    return result.scalars().all()


@router.get("/estadisticas")
async def estadisticas_mejoras(
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    """Resumen estadístico por estado y prioridad."""
    result = await session.execute(
        select(Mejora.estado, func.count(Mejora.id).label("cantidad"))
        .group_by(Mejora.estado)
    )
    por_estado = {r.estado: r.cantidad for r in result}

    result2 = await session.execute(
        select(Mejora.prioridad, func.count(Mejora.id).label("cantidad"))
        .group_by(Mejora.prioridad)
    )
    por_prioridad = {r.prioridad: r.cantidad for r in result2}

    result3 = await session.execute(
        select(func.count(Mejora.id)).where(Mejora.solicitado_por == current_user.id)
    )
    mis_solicitudes = result3.scalar_one()

    return {
        "por_estado": por_estado,
        "por_prioridad": por_prioridad,
        "mis_solicitudes": mis_solicitudes,
        "total": sum(por_estado.values()),
    }


@router.get("/{id}", response_model=MejoraOut)
async def get_mejora(
    id: int,
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    m = await session.get(Mejora, id, options=[
        selectinload(Mejora.solicitante),
        selectinload(Mejora.implementador)
    ])
    if not m:
        raise HTTPException(404, "Mejora no encontrada")
    return m


@router.post("/", response_model=MejoraOut, status_code=201)
async def solicitar_mejora(
    data: MejoraCreate,
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    """Cualquier usuario puede solicitar una mejora."""
    mejora = Mejora(
        **data.model_dump(),
        solicitado_por=current_user.id,
        estado="pendiente",
        fecha_solicitud=datetime.now()
    )
    session.add(mejora)
    await session.commit()
    await session.refresh(mejora)

    # Recargar con relaciones
    return await get_mejora(mejora.id, session, current_user)


@router.put("/{id}/estado")
async def cambiar_estado(
    id: int,
    estado: str = Query(..., description="pendiente|en_analisis|diferida"),
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    """Admin/Manager puede cambiar el estado."""
    if current_user.rol not in ("admin", "manager"):
        raise HTTPException(403, "Sin permisos para modificar estado")
    estados_validos = ["pendiente", "en_analisis", "diferida"]
    if estado not in estados_validos:
        raise HTTPException(400, f"Estado debe ser uno de: {estados_validos}")

    m = await session.get(Mejora, id)
    if not m:
        raise HTTPException(404, "Mejora no encontrada")
    m.estado = estado
    await session.commit()
    return {"ok": True, "id": id, "estado": estado}


@router.put("/{id}/implementar", response_model=MejoraOut)
async def marcar_implementada(
    id: int,
    data: MejoraImplementar,
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    """Solo admin puede marcar como implementada con descripción de los cambios."""
    if current_user.rol != "admin":
        raise HTTPException(403, "Solo administradores pueden marcar mejoras como implementadas")

    m = await session.get(Mejora, id)
    if not m:
        raise HTTPException(404, "Mejora no encontrada")
    if m.estado == "implementada":
        raise HTTPException(400, "La mejora ya está implementada")

    m.estado = "implementada"
    m.implementada_por = current_user.id
    m.fecha_implementacion = datetime.now()
    m.descripcion_implementacion = data.descripcion_implementacion
    m.version_implementacion = data.version_implementacion
    if data.comentarios:
        m.comentarios = (m.comentarios or "") + f"\n[{datetime.now().strftime('%d/%m/%Y %H:%M')}] {data.comentarios}"

    await session.commit()
    return await get_mejora(id, session, current_user)


@router.put("/{id}/rechazar", response_model=MejoraOut)
async def rechazar_mejora(
    id: int,
    data: MejoraRechazar,
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    """Solo admin puede rechazar con motivo."""
    if current_user.rol != "admin":
        raise HTTPException(403, "Solo administradores pueden rechazar mejoras")

    m = await session.get(Mejora, id)
    if not m:
        raise HTTPException(404, "Mejora no encontrada")

    m.estado = "rechazada"
    m.motivo_rechazo = data.motivo_rechazo
    m.implementada_por = current_user.id  # quién tomó la decisión
    m.fecha_implementacion = datetime.now()
    await session.commit()
    return await get_mejora(id, session, current_user)


@router.post("/{id}/comentario", response_model=MejoraOut)
async def agregar_comentario(
    id: int,
    data: MejoraComentario,
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    """Cualquier usuario puede agregar comentarios a una mejora."""
    m = await session.get(Mejora, id)
    if not m:
        raise HTTPException(404, "Mejora no encontrada")

    nuevo = f"[{datetime.now().strftime('%d/%m/%Y %H:%M')} — {current_user.nombre_completo}] {data.comentario}"
    m.comentarios = (m.comentarios + "\n" + nuevo) if m.comentarios else nuevo
    await session.commit()
    return await get_mejora(id, session, current_user)


@router.put("/{id}/editar", response_model=MejoraOut)
async def editar_mejora(
    id: int,
    data: MejoraUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    """El solicitante puede editar su mejora si está pendiente."""
    m = await session.get(Mejora, id)
    if not m:
        raise HTTPException(404, "Mejora no encontrada")
    if m.solicitado_por != current_user.id and current_user.rol != "admin":
        raise HTTPException(403, "Solo el solicitante o un admin puede editar")
    if m.estado not in ("pendiente", "en_analisis") and current_user.rol != "admin":
        raise HTTPException(400, "Solo se pueden editar mejoras pendientes o en análisis")

    for k, v in data.model_dump(exclude_none=True).items():
        setattr(m, k, v)
    await session.commit()
    return await get_mejora(id, session, current_user)


@router.delete("/{id}", status_code=204)
async def eliminar_mejora(
    id: int,
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    """Solo admin o el solicitante (si está pendiente) puede eliminar."""
    m = await session.get(Mejora, id)
    if not m:
        raise HTTPException(404, "Mejora no encontrada")
    if m.solicitado_por != current_user.id and current_user.rol != "admin":
        raise HTTPException(403, "Sin permisos")
    if m.estado != "pendiente" and current_user.rol != "admin":
        raise HTTPException(400, "Solo se pueden eliminar solicitudes pendientes")
    await session.delete(m)
    await session.commit()
