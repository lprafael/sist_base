from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from database import get_session
from models_catalogos import FormatoTorneo
from schemas_catalogos import FormatoTorneoCreate, FormatoTorneoUpdate, FormatoTorneoResponse
from security import get_current_user

router = APIRouter(
    prefix="/api/torneos/formatos",
    tags=["Catálogo Formatos Torneo"]
)

@router.get("", response_model=List[FormatoTorneoResponse])
async def get_formatos(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(FormatoTorneo).order_by(FormatoTorneo.id))
    return result.scalars().all()

@router.post("", response_model=FormatoTorneoResponse, status_code=status.HTTP_201_CREATED)
async def create_formato(
    formato_in: FormatoTorneoCreate,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    result = await session.execute(select(FormatoTorneo).where(FormatoTorneo.nombre == formato_in.nombre))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Ya existe un formato con este nombre")

    nuevo = FormatoTorneo(**formato_in.model_dump())
    session.add(nuevo)
    await session.commit()
    await session.refresh(nuevo)
    return nuevo

@router.put("/{id}", response_model=FormatoTorneoResponse)
async def update_formato(
    id: int,
    formato_in: FormatoTorneoUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    formato = await session.get(FormatoTorneo, id)
    if not formato:
        raise HTTPException(status_code=404, detail="Formato no encontrado")
    
    if formato_in.nombre and formato_in.nombre != formato.nombre:
        result = await session.execute(select(FormatoTorneo).where(FormatoTorneo.nombre == formato_in.nombre))
        if result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Ya existe otro formato con este nombre")

    update_data = formato_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(formato, key, value)
        
    await session.commit()
    await session.refresh(formato)
    return formato

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_formato(
    id: int,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    formato = await session.get(FormatoTorneo, id)
    if not formato:
        raise HTTPException(status_code=404, detail="Formato no encontrado")
        
    try:
        await session.delete(formato)
        await session.commit()
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail="No se puede eliminar este formato porque podría estar en uso.")
