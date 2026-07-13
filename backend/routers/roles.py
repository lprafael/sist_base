from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List

from database import get_session
from models import Rol
from schemas import RolCreate, RolUpdate, RolResponse
from security import get_current_user

router = APIRouter(
    prefix="/api/roles",
    tags=["Roles del Sistema"]
)

@router.get("", response_model=List[RolResponse])
async def get_roles(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Rol).options(selectinload(Rol.permisos)).order_by(Rol.id))
    return result.scalars().all()

@router.post("", response_model=RolResponse, status_code=status.HTTP_201_CREATED)
async def create_rol(
    rol_in: RolCreate,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    result = await session.execute(select(Rol).where(Rol.nombre == rol_in.nombre))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Ya existe un rol con este nombre")

    nuevo = Rol(**rol_in.model_dump())
    if "user_id" in current_user:
        nuevo.creado_por = current_user["user_id"]
        
    session.add(nuevo)
    await session.commit()
    # Para refresh con relaciones necesitamos recargar
    result = await session.execute(select(Rol).options(selectinload(Rol.permisos)).where(Rol.id == nuevo.id))
    return result.scalar_one()

@router.put("/{id}", response_model=RolResponse)
async def update_rol(
    id: int,
    rol_in: RolUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    result = await session.execute(select(Rol).options(selectinload(Rol.permisos)).where(Rol.id == id))
    rol = result.scalar_one_or_none()
    if not rol:
        raise HTTPException(status_code=404, detail="Rol no encontrado")
    
    if rol_in.nombre and rol_in.nombre != rol.nombre:
        result_check = await session.execute(select(Rol).where(Rol.nombre == rol_in.nombre))
        if result_check.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Ya existe otro rol con este nombre")

    update_data = rol_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if key != 'permisos':  # Ignoramos permisos por ahora, se actualizarían diferente si se requiere
            setattr(rol, key, value)

    await session.commit()
    return rol

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_rol(
    id: int,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    rol = await session.get(Rol, id)
    if not rol:
        raise HTTPException(status_code=404, detail="Rol no encontrado")
        
    # Validar que no sea el rol admin o roles críticos si se requiere
    if rol.nombre in ['administrador', 'admin']:
        raise HTTPException(status_code=400, detail="No se puede eliminar el rol de administrador")

    await session.delete(rol)
    await session.commit()
    return None
