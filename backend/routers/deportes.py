from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from typing import List

from database import get_session
from models_catalogos import Deporte, TipoDeporte, FormatoTorneo, deporte_formato
from schemas_catalogos import (
    DeporteCreate, DeporteUpdate, DeporteResponse, DeporteConFormatos,
    TipoDeporteCreate, TipoDeporteUpdate, TipoDeporteResponse, FormatoTorneoResponse
)
from security import get_current_user

router = APIRouter(
    prefix="/api/deportes",
    tags=["Catálogo Deportes"]
)

# ==============================================================================
# TIPOS DE DEPORTE
# ==============================================================================
@router.get("/tipos", response_model=List[TipoDeporteResponse])
async def get_tipos_deporte(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(TipoDeporte).order_by(TipoDeporte.nombre))
    return result.scalars().all()

@router.post("/tipos", response_model=TipoDeporteResponse, status_code=status.HTTP_201_CREATED)
async def create_tipo_deporte(
    tipo_in: TipoDeporteCreate,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    result = await session.execute(select(TipoDeporte).where(TipoDeporte.nombre == tipo_in.nombre))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Ya existe un tipo de deporte con este nombre")

    nuevo = TipoDeporte(**tipo_in.model_dump())
    session.add(nuevo)
    await session.commit()
    await session.refresh(nuevo)
    return nuevo

@router.put("/tipos/{id}", response_model=TipoDeporteResponse)
async def update_tipo_deporte(
    id: int,
    tipo_in: TipoDeporteUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    tipo = await session.get(TipoDeporte, id)
    if not tipo:
        raise HTTPException(status_code=404, detail="Tipo de deporte no encontrado")
    
    if tipo_in.nombre and tipo_in.nombre != tipo.nombre:
        result = await session.execute(select(TipoDeporte).where(TipoDeporte.nombre == tipo_in.nombre))
        if result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Ya existe otro tipo de deporte con este nombre")

    update_data = tipo_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(tipo, key, value)
        
    await session.commit()
    await session.refresh(tipo)
    return tipo

@router.delete("/tipos/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tipo_deporte(
    id: int,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    tipo = await session.get(TipoDeporte, id)
    if not tipo:
        raise HTTPException(status_code=404, detail="Tipo de deporte no encontrado")
        
    try:
        await session.delete(tipo)
        await session.commit()
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail="No se puede eliminar porque hay deportes asociados a este tipo.")


# ==============================================================================
# DEPORTES
# ==============================================================================
@router.get("", response_model=List[DeporteResponse])
async def get_deportes(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Deporte).options(joinedload(Deporte.tipo_deporte)).order_by(Deporte.nombre))
    return result.scalars().all()

@router.get("/{id}", response_model=DeporteResponse)
async def get_deporte(id: int, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Deporte).options(joinedload(Deporte.tipo_deporte)).where(Deporte.id == id))
    deporte = result.scalar_one_or_none()
    if not deporte:
        raise HTTPException(status_code=404, detail="Deporte no encontrado")
    return deporte

@router.post("", response_model=DeporteResponse, status_code=status.HTTP_201_CREATED)
async def create_deporte(
    deporte_in: DeporteCreate,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    result = await session.execute(select(Deporte).where(Deporte.nombre == deporte_in.nombre))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Ya existe un deporte con este nombre")

    new_deporte = Deporte(**deporte_in.model_dump())
    session.add(new_deporte)
    try:
        await session.commit()
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail="El tipo_id proporcionado no es válido.")
        
    await session.refresh(new_deporte)
    
    # Reload with relationship
    result = await session.execute(select(Deporte).options(joinedload(Deporte.tipo_deporte)).where(Deporte.id == new_deporte.id))
    return result.scalar_one()

@router.put("/{id}", response_model=DeporteResponse)
async def update_deporte(
    id: int,
    deporte_in: DeporteUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    result = await session.execute(select(Deporte).options(joinedload(Deporte.tipo_deporte)).where(Deporte.id == id))
    deporte = result.scalar_one_or_none()
    
    if not deporte:
        raise HTTPException(status_code=404, detail="Deporte no encontrado")
    
    if deporte_in.nombre and deporte_in.nombre != deporte.nombre:
        check = await session.execute(select(Deporte).where(Deporte.nombre == deporte_in.nombre))
        if check.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Ya existe otro deporte con este nombre")

    update_data = deporte_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(deporte, key, value)
        
    try:
        await session.commit()
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail="El tipo_id proporcionado no es válido.")
        
    await session.refresh(deporte)
    
    result = await session.execute(select(Deporte).options(joinedload(Deporte.tipo_deporte)).where(Deporte.id == deporte.id))
    return result.scalar_one()

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_deporte(
    id: int,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    deporte = await session.get(Deporte, id)
    if not deporte:
        raise HTTPException(status_code=404, detail="Deporte no encontrado")
        
    await session.delete(deporte)
    await session.commit()

# ==============================================================================
# DEPORTE <-> FORMATOS (N:M)
# ==============================================================================
@router.get("/{id}/formatos", response_model=List[FormatoTorneoResponse])
async def get_deporte_formatos(id: int, session: AsyncSession = Depends(get_session)):
    deporte = await session.get(Deporte, id, options=[joinedload(Deporte.formatos)])
    if not deporte:
        raise HTTPException(status_code=404, detail="Deporte no encontrado")
    return deporte.formatos

@router.post("/{id}/formatos/{formato_id}", status_code=status.HTTP_201_CREATED)
async def add_formato_to_deporte(
    id: int, 
    formato_id: int, 
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    deporte = await session.get(Deporte, id, options=[joinedload(Deporte.formatos)])
    if not deporte:
        raise HTTPException(status_code=404, detail="Deporte no encontrado")
        
    formato = await session.get(FormatoTorneo, formato_id)
    if not formato:
        raise HTTPException(status_code=404, detail="Formato no encontrado")
        
    if any(f.id == formato_id for f in deporte.formatos):
        raise HTTPException(status_code=400, detail="El formato ya está vinculado a este deporte")
        
    deporte.formatos.append(formato)
    await session.commit()
    return {"message": "Formato vinculado exitosamente"}

@router.delete("/{id}/formatos/{formato_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_formato_from_deporte(
    id: int, 
    formato_id: int, 
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    deporte = await session.get(Deporte, id, options=[joinedload(Deporte.formatos)])
    if not deporte:
        raise HTTPException(status_code=404, detail="Deporte no encontrado")
        
    formato = next((f for f in deporte.formatos if f.id == formato_id), None)
    if not formato:
        raise HTTPException(status_code=404, detail="El formato no está vinculado a este deporte")
        
    deporte.formatos.remove(formato)
    await session.commit()
