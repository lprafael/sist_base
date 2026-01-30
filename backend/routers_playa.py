# routers_playa.py
# Endpoints para el sistema de Playa de Vehículos

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from database import get_session
from models_playa import CategoriaVehiculo, Producto, Cliente, Venta
from schemas_playa import (
    CategoriaVehiculoCreate, CategoriaVehiculoResponse,
    ProductoCreate, ProductoUpdate, ProductoResponse,
    ClienteCreate, ClienteResponse
)
from security import get_current_user, check_permission
from audit_utils import log_audit_action

router = APIRouter(prefix="/playa", tags=["Playa de Vehículos"])

# ===== CATEGORÍAS =====
@router.get("/categorias", response_model=List[CategoriaVehiculoResponse])
async def list_categorias(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(CategoriaVehiculo))
    return result.scalars().all()

@router.post("/categorias", response_model=CategoriaVehiculoResponse)
async def create_categoria(
    categoria_data: CategoriaVehiculoCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    new_cat = CategoriaVehiculo(**categoria_data.dict())
    session.add(new_cat)
    await session.commit()
    await session.refresh(new_cat)
    return new_cat

# ===== VEHÍCULOS =====
@router.get("/vehiculos", response_model=List[ProductoResponse])
async def list_vehiculos(
    available_only: bool = False,
    session: AsyncSession = Depends(get_session)
):
    query = select(Producto)
    if available_only:
        query = query.where(Producto.estado_disponibilidad == 'DISPONIBLE')
    result = await session.execute(query)
    return result.scalars().all()

@router.get("/vehiculos/{id_producto}", response_model=ProductoResponse)
async def get_vehiculo(id_producto: int, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Producto).where(Producto.id_producto == id_producto))
    vehiculo = result.scalar_one_or_none()
    if not vehiculo:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    return vehiculo

@router.post("/vehiculos", response_model=ProductoResponse)
async def create_vehiculo(
    vehiculo_data: ProductoCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    new_vehiculo = Producto(**vehiculo_data.dict())
    session.add(new_vehiculo)
    await session.commit()
    await session.refresh(new_vehiculo)
    
    # Auditoría
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="create",
        table="productos",
        record_id=new_vehiculo.id_producto,
        new_data=vehiculo_data.dict(exclude_none=True),
        details=f"Vehículo registrado: {new_vehiculo.marca} {new_vehiculo.modelo}"
    )
    
    return new_vehiculo

# ===== CLIENTES =====
@router.get("/clientes", response_model=List[ClienteResponse])
async def list_clientes(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Cliente))
    return result.scalars().all()

@router.post("/clientes", response_model=ClienteResponse)
async def create_cliente(
    cliente_data: ClienteCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    # Verificar si ya existe
    check = await session.execute(select(Cliente).where(Cliente.numero_documento == cliente_data.numero_documento))
    if check.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="El documento ya está registrado")
        
    new_cliente = Cliente(**cliente_data.dict())
    session.add(new_cliente)
    await session.commit()
    await session.refresh(new_cliente)
    
    return new_cliente
