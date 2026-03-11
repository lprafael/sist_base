from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, or_, func
from sqlalchemy.orm import selectinload
from typing import List, Optional
import os
import shutil
from datetime import datetime
import uuid

from database import get_session
from models import Actividad, ActividadParticipante, ActividadFoto, AnrPadron, PlraPadron, Usuario
from schemas import (
    ActividadResponse, ActividadCreate, ActividadUpdate, ActividadParticipanteResponse, 
    ParticipanteCreate, ActividadFotoResponse
)
from security import get_current_user

router = APIRouter(prefix="/api/actividades", tags=["Actividades"])

# Directorio para subir fotos
UPLOAD_DIR = "uploads/actividades"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

@router.get("/", response_model=List[ActividadResponse])
async def list_actividades(
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    stmt = select(Actividad).options(selectinload(Actividad.fotos))
    # Si no es admin, filtramos por las que él creó o las de su zona
    if current_user.get('role') != 'admin':
        stmt = stmt.where(Actividad.creado_por == current_user.get('user_id'))
    
    result = await session.execute(stmt)
    return result.scalars().all()

@router.post("/", response_model=ActividadResponse)
async def create_actividad(
    actividad: ActividadCreate,
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    nueva = Actividad(
        **actividad.dict(),
        creado_por=current_user.get('user_id')
    )
    session.add(nueva)
    await session.commit()
    await session.refresh(nueva)
    nueva.fotos = [] # Durante creación siempre es vacío, lo seteamos manual para evitar lazy-load error
    return nueva

@router.get("/{actividad_id}", response_model=ActividadResponse)
async def get_actividad(
    actividad_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    stmt = select(Actividad).where(Actividad.id == actividad_id).options(selectinload(Actividad.fotos))
    result = await session.execute(stmt)
    act = result.scalar_one_or_none()
    if not act:
        raise HTTPException(status_code=404, detail="Actividad no encontrada")
    return act

@router.put("/{actividad_id}", response_model=ActividadResponse)
async def update_actividad(
    actividad_id: int,
    actividad: ActividadUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    stmt = select(Actividad).where(Actividad.id == actividad_id).options(selectinload(Actividad.fotos))
    result = await session.execute(stmt)
    act = result.scalar_one_or_none()
    if not act:
        raise HTTPException(status_code=404, detail="Actividad no encontrada")

    # Solo admin o el creador pueden editar
    if current_user.get('role') != 'admin' and act.creado_por != current_user.get('user_id'):
        raise HTTPException(status_code=403, detail="No tienes permiso para editar esta actividad")

    update_data = actividad.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(act, key, value)

    await session.commit()
    await session.refresh(act)
    return act

@router.delete("/{actividad_id}")
async def delete_actividad(
    actividad_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    stmt = select(Actividad).where(Actividad.id == actividad_id)
    result = await session.execute(stmt)
    act = result.scalar_one_or_none()
    if not act:
        raise HTTPException(status_code=404, detail="Actividad no encontrada")

    # Solo admin o el creador pueden eliminar
    if current_user.get('role') != 'admin' and act.creado_por != current_user.get('user_id'):
        raise HTTPException(status_code=403, detail="No tienes permiso para eliminar esta actividad")

    await session.delete(act)
    await session.commit()
    return {"message": "Actividad eliminada"}

@router.post("/{actividad_id}/participantes", response_model=ActividadParticipanteResponse)
async def add_participante(
    actividad_id: int,
    data: ParticipanteCreate,
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    # Verificar si ya existe en esta actividad
    check = await session.execute(
        select(ActividadParticipante).where(
            and_(ActividadParticipante.actividad_id == actividad_id, ActividadParticipante.cedula == data.cedula)
        )
    )
    if check.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="El participante ya está registrado en esta actividad")

    # Verificar situación electoral
    # 1. ANR
    res_anr = await session.execute(select(AnrPadron).where(AnrPadron.cedula == data.cedula))
    en_anr = res_anr.scalar_one_or_none() is not None
    
    # 2. PLRA (solo si no está en ANR o siempre para tener el dato?) El user dice "y de los que no están, consultar si están en el padrón del PLRA"
    en_plra = False
    if not en_anr:
        res_plra = await session.execute(select(PlraPadron).where(PlraPadron.cedula == data.cedula))
        en_plra = res_plra.scalar_one_or_none() is not None

    nuevo = ActividadParticipante(
        **data.dict(),
        actividad_id=actividad_id,
        en_padron_anr=en_anr,
        en_padron_plra=en_plra
    )
    session.add(nuevo)
    await session.commit()
    await session.refresh(nuevo)
    return nuevo

@router.get("/{actividad_id}/participantes", response_model=List[ActividadParticipanteResponse])
async def list_participantes(
    actividad_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    result = await session.execute(
        select(ActividadParticipante).where(ActividadParticipante.actividad_id == actividad_id)
    )
    return result.scalars().all()

@router.post("/{actividad_id}/fotos", response_model=ActividadFotoResponse)
async def upload_foto(
    actividad_id: int,
    descripcion: Optional[str] = Form(None),
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    # Generar nombre único
    extension = os.path.splitext(file.filename)[1]
    nombre_archivo = f"{actividad_id}_{uuid.uuid4()}{extension}"
    ruta_completa = os.path.join(UPLOAD_DIR, nombre_archivo)
    
    with open(ruta_completa, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    nueva_foto = ActividadFoto(
        actividad_id=actividad_id,
        ruta_archivo=ruta_completa,
        descripcion=descripcion
    )
    session.add(nueva_foto)
    await session.commit()
    await session.refresh(nueva_foto)
    return nueva_foto
