from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from database import get_session
from models_catalogos import RolCancha
from schemas_catalogos import RolCanchaCreate, RolCanchaUpdate, RolCanchaResponse
from security import get_current_user

router = APIRouter(
    prefix="/api/cancha/roles",
    tags=["Catálogo Roles Cancha"]
)

@router.get("", response_model=List[RolCanchaResponse])
async def get_roles(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(RolCancha).order_by(RolCancha.id))
    return result.scalars().all()

@router.post("", response_model=RolCanchaResponse, status_code=status.HTTP_201_CREATED)
async def create_rol(
    rol_in: RolCanchaCreate,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    result = await session.execute(select(RolCancha).where(RolCancha.nombre == rol_in.nombre))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Ya existe un rol con este nombre")

    nuevo = RolCancha(**rol_in.model_dump())
    session.add(nuevo)
    await session.commit()
    await session.refresh(nuevo)
    return nuevo

@router.put("/{id}", response_model=RolCanchaResponse)
async def update_rol(
    id: int,
    rol_in: RolCanchaUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    rol = await session.get(RolCancha, id)
    if not rol:
        raise HTTPException(status_code=404, detail="Rol no encontrado")
    
    if rol_in.nombre and rol_in.nombre != rol.nombre:
        result = await session.execute(select(RolCancha).where(RolCancha.nombre == rol_in.nombre))
        if result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Ya existe otro rol con este nombre")

    update_data = rol_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(rol, key, value)
        
    await session.commit()
    await session.refresh(rol)
    return rol

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_rol(
    id: int,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    rol = await session.get(RolCancha, id)
    if not rol:
        raise HTTPException(status_code=404, detail="Rol no encontrado")
        
    try:
        await session.delete(rol)
        await session.commit()
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail="No se puede eliminar este rol porque podría estar en uso.")
