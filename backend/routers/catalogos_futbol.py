from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from models_catalogos import TipoEventoFutbol, ModalidadFutbol
from schemas_catalogos import (
    TipoEventoFutbolCreate, TipoEventoFutbolUpdate, TipoEventoFutbolResponse,
    ModalidadFutbolCreate, ModalidadFutbolUpdate, ModalidadFutbolResponse
)
from database import get_session
from auth import get_current_user

router = APIRouter(
    prefix="/futbol",
    tags=["Catálogos Fútbol"]
)

# ==============================================================================
# TIPOS DE EVENTO
# ==============================================================================

@router.get("/tipos-evento", response_model=List[TipoEventoFutbolResponse])
async def get_tipos_evento(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(TipoEventoFutbol).order_by(TipoEventoFutbol.id))
    return result.scalars().all()

@router.post("/tipos-evento", response_model=TipoEventoFutbolResponse, status_code=status.HTTP_201_CREATED)
async def create_tipo_evento(
    tipo: TipoEventoFutbolCreate,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    result = await session.execute(select(TipoEventoFutbol).where(TipoEventoFutbol.codigo == tipo.codigo))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="El código de tipo de evento ya existe")
        
    nuevo = TipoEventoFutbol(**tipo.model_dump())
    session.add(nuevo)
    await session.commit()
    await session.refresh(nuevo)
    return nuevo

@router.put("/tipos-evento/{tipo_id}", response_model=TipoEventoFutbolResponse)
async def update_tipo_evento(
    tipo_id: int,
    tipo: TipoEventoFutbolUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    result = await session.execute(select(TipoEventoFutbol).where(TipoEventoFutbol.id == tipo_id))
    existente = result.scalars().first()
    if not existente:
        raise HTTPException(status_code=404, detail="Tipo de evento no encontrado")
        
    if tipo.codigo:
        check = await session.execute(select(TipoEventoFutbol).where(
            TipoEventoFutbol.codigo == tipo.codigo, TipoEventoFutbol.id != tipo_id
        ))
        if check.scalars().first():
            raise HTTPException(status_code=400, detail="El código de tipo de evento ya existe")

    for key, value in tipo.model_dump(exclude_unset=True).items():
        setattr(existente, key, value)
        
    await session.commit()
    await session.refresh(existente)
    return existente

@router.delete("/tipos-evento/{tipo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tipo_evento(
    tipo_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    result = await session.execute(select(TipoEventoFutbol).where(TipoEventoFutbol.id == tipo_id))
    existente = result.scalars().first()
    if not existente:
        raise HTTPException(status_code=404, detail="Tipo de evento no encontrado")
        
    await session.delete(existente)
    await session.commit()


# ==============================================================================
# MODALIDADES
# ==============================================================================

@router.get("/modalidades", response_model=List[ModalidadFutbolResponse])
async def get_modalidades(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(ModalidadFutbol).order_by(ModalidadFutbol.id))
    return result.scalars().all()

@router.post("/modalidades", response_model=ModalidadFutbolResponse, status_code=status.HTTP_201_CREATED)
async def create_modalidad(
    mod: ModalidadFutbolCreate,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    result = await session.execute(select(ModalidadFutbol).where(ModalidadFutbol.codigo == mod.codigo))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="El código de modalidad ya existe")
        
    nueva = ModalidadFutbol(**mod.model_dump())
    session.add(nueva)
    await session.commit()
    await session.refresh(nueva)
    return nueva

@router.put("/modalidades/{mod_id}", response_model=ModalidadFutbolResponse)
async def update_modalidad(
    mod_id: int,
    mod: ModalidadFutbolUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    result = await session.execute(select(ModalidadFutbol).where(ModalidadFutbol.id == mod_id))
    existente = result.scalars().first()
    if not existente:
        raise HTTPException(status_code=404, detail="Modalidad no encontrada")
        
    if mod.codigo:
        check = await session.execute(select(ModalidadFutbol).where(
            ModalidadFutbol.codigo == mod.codigo, ModalidadFutbol.id != mod_id
        ))
        if check.scalars().first():
            raise HTTPException(status_code=400, detail="El código de modalidad ya existe")

    for key, value in mod.model_dump(exclude_unset=True).items():
        setattr(existente, key, value)
        
    await session.commit()
    await session.refresh(existente)
    return existente

@router.delete("/modalidades/{mod_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_modalidad(
    mod_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    result = await session.execute(select(ModalidadFutbol).where(ModalidadFutbol.id == mod_id))
    existente = result.scalars().first()
    if not existente:
        raise HTTPException(status_code=404, detail="Modalidad no encontrada")
        
    await session.delete(existente)
    await session.commit()
