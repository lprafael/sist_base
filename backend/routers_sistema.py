from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from database import get_session
from models import Playa
from schemas import PlayaCreate, PlayaUpdate, PlayaResponse
from security import require_admin
from audit_utils import log_audit_action

router = APIRouter(prefix="/sistema/playas", tags=["Administración de Playas"])

@router.get("", response_model=List[PlayaResponse])
async def list_playas(
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(require_admin)
):
    """Lista todas las playas registradas en el sistema."""
    result = await session.execute(select(Playa).order_by(Playa.nombre.asc()))
    return result.scalars().all()

@router.post("", response_model=PlayaResponse, status_code=status.HTTP_201_CREATED)
async def create_playa(
    playa_data: PlayaCreate,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(require_admin)
):
    """Crea una nueva playa en el sistema."""
    # Verificar si ya existe el nombre o RUC
    existing = await session.execute(
        select(Playa).where((Playa.nombre == playa_data.nombre) | (Playa.ruc == playa_data.ruc))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe una playa con ese nombre o RUC."
        )
    
    new_playa = Playa(**playa_data.model_dump())
    session.add(new_playa)
    await session.commit()
    await session.refresh(new_playa)
    
    # Auditoría
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user.get("user_id"),
        action="create",
        table="playas",
        record_id=new_playa.id,
        new_data=playa_data.model_dump(),
        details=f"Nueva playa creada: {new_playa.nombre}"
    )
    
    return new_playa

@router.get("/{playa_id}", response_model=PlayaResponse)
async def get_playa(
    playa_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(require_admin)
):
    """Obtiene los detalles de una playa específica."""
    result = await session.execute(select(Playa).where(Playa.id == playa_id))
    playa = result.scalar_one_or_none()
    if not playa:
        raise HTTPException(status_code=404, detail="Playa no encontrada")
    return playa

@router.put("/{playa_id}", response_model=PlayaResponse)
async def update_playa(
    playa_id: int,
    playa_data: PlayaUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(require_admin)
):
    """Actualiza los datos de una playa."""
    result = await session.execute(select(Playa).where(Playa.id == playa_id))
    playa = result.scalar_one_or_none()
    if not playa:
        raise HTTPException(status_code=404, detail="Playa no encontrada")
    
    old_data = {c.name: getattr(playa, c.name) for c in playa.__table__.columns}
    
    update_dict = playa_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(playa, key, value)
    
    await session.commit()
    await session.refresh(playa)
    
    # Auditoría
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user.get("user_id"),
        action="update",
        table="playas",
        record_id=playa.id,
        previous_data=old_data,
        new_data=update_dict,
        details=f"Playa actualizada: {playa.nombre}"
    )
    
    return playa

@router.delete("/{playa_id}")
async def delete_playa(
    playa_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(require_admin)
):
    """Desactiva una playa (Soft Delete)."""
    result = await session.execute(select(Playa).where(Playa.id == playa_id))
    playa = result.scalar_one_or_none()
    if not playa:
        raise HTTPException(status_code=404, detail="Playa no encontrada")
    
    playa.activo = False
    await session.commit()
    
    # Auditoría
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user.get("user_id"),
        action="delete",
        table="playas",
        record_id=playa.id,
        details=f"Playa desactivada: {playa.nombre}"
    )
    
    return {"message": "Playa desactivada correctamente"}
