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
    ParticipanteCreate, ParticipanteUpdate, ActividadFotoResponse
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
    
    # Volvemos a consultar para devolver el objeto con sus relaciones (fotos) cargadas para el response_model
    stmt = select(Actividad).where(Actividad.id == nueva.id).options(selectinload(Actividad.fotos))
    result = await session.execute(stmt)
    return result.scalar_one()

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

    # Verificar situación electoral y RESCATAR nombres si están vacíos
    # 1. ANR
    res_anr = await session.execute(select(AnrPadron).where(AnrPadron.cedula == data.cedula))
    person_anr = res_anr.scalar_one_or_none()
    
    en_anr = person_anr is not None
    en_plra = False
    
    final_nombre = data.nombre
    final_apellido = data.apellido

    if en_anr:
        if not final_nombre: final_nombre = person_anr.nombres
        if not final_apellido: final_apellido = person_anr.apellidos
    else:
        # 2. PLRA
        res_plra = await session.execute(select(PlraPadron).where(PlraPadron.cedula == data.cedula))
        person_plra = res_plra.scalar_one_or_none()
        if person_plra:
            en_plra = True
            if not final_nombre: final_nombre = person_plra.nombre
            if not final_apellido: final_apellido = person_plra.apellido

    nuevo = ActividadParticipante(
        **data.dict(exclude={"nombre", "apellido"}),
        nombre=final_nombre,
        apellido=final_apellido,
        actividad_id=actividad_id,
        en_padron_anr=en_anr,
        en_padron_plra=en_plra
    )
    session.add(nuevo)
    await session.commit()
    await session.refresh(nuevo)
    return nuevo

@router.put("/{actividad_id}/participantes/{participante_id}", response_model=ActividadParticipanteResponse)
async def update_participante(
    actividad_id: int,
    participante_id: int,
    data: ParticipanteUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    stmt = select(ActividadParticipante).where(
        and_(ActividadParticipante.id == participante_id, ActividadParticipante.actividad_id == actividad_id)
    )
    result = await session.execute(stmt)
    part = result.scalar_one_or_none()
    if not part:
        raise HTTPException(status_code=404, detail="Participante no encontrado")

    update_data = data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(part, key, value)

    await session.commit()
    await session.refresh(part)
    return part

@router.delete("/{actividad_id}/participantes/{participante_id}")
async def delete_participante(
    actividad_id: int,
    participante_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    stmt = select(ActividadParticipante).where(
        and_(ActividadParticipante.id == participante_id, ActividadParticipante.actividad_id == actividad_id)
    )
    result = await session.execute(stmt)
    part = result.scalar_one_or_none()
    if not part:
        raise HTTPException(status_code=404, detail="Participante no encontrado")

    await session.delete(part)
    await session.commit()
    return {"message": "Participante eliminado"}

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
