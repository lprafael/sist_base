from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.future import select
from sqlalchemy import update, delete
from typing import List

from database import get_session
from models import ModuloSistema, Usuario
from schemas import ModuloSistemaCreate, ModuloSistemaUpdate, ModuloSistemaResponse
from security import get_current_user, check_permission

router = APIRouter(
    prefix="/api/modulos",
    tags=["Modulos Sistema"],
    responses={404: {"description": "No encontrado"}},
)

@router.get("/", response_model=List[ModuloSistemaResponse])
async def obtener_modulos(
    db: Session = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    # Opcionalmente se puede requerir un permiso:
    # await check_permission(current_user, "modulos_sistema", "read", db)
    
    query = select(ModuloSistema).order_by(ModuloSistema.nombre)
    result = await db.execute(query)
    modulos = result.scalars().all()
    return modulos

@router.post("/", response_model=ModuloSistemaResponse, status_code=status.HTTP_201_CREATED)
async def crear_modulo(
    modulo: ModuloSistemaCreate,
    db: Session = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    await check_permission(current_user, "admin", "manage", db) # Ejemplo de protección admin
    
    query = select(ModuloSistema).where(ModuloSistema.nombre == modulo.nombre)
    result = await db.execute(query)
    existente = result.scalars().first()
    
    if existente:
        raise HTTPException(status_code=400, detail="Ya existe un módulo con ese nombre")
        
    nuevo_modulo = ModuloSistema(**modulo.dict())
    db.add(nuevo_modulo)
    await db.commit()
    await db.refresh(nuevo_modulo)
    
    return nuevo_modulo

@router.put("/{modulo_id}", response_model=ModuloSistemaResponse)
async def actualizar_modulo(
    modulo_id: int,
    modulo_update: ModuloSistemaUpdate,
    db: Session = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    await check_permission(current_user, "admin", "manage", db)
    
    query = select(ModuloSistema).where(ModuloSistema.id == modulo_id)
    result = await db.execute(query)
    modulo = result.scalars().first()
    
    if not modulo:
        raise HTTPException(status_code=404, detail="Módulo no encontrado")
        
    update_data = modulo_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(modulo, key, value)
        
    await db.commit()
    await db.refresh(modulo)
    return modulo

@router.delete("/{modulo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_modulo(
    modulo_id: int,
    db: Session = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    await check_permission(current_user, "admin", "manage", db)
    
    query = select(ModuloSistema).where(ModuloSistema.id == modulo_id)
    result = await db.execute(query)
    modulo = result.scalars().first()
    
    if not modulo:
        raise HTTPException(status_code=404, detail="Módulo no encontrado")
        
    await db.delete(modulo)
    await db.commit()
    return None
