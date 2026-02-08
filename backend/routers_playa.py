import logging
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import join, and_, or_, func, case, text, delete
from sqlalchemy.orm import joinedload
from typing import List, Optional
from datetime import date, timedelta, datetime
from decimal import Decimal
from pydantic import BaseModel # Added BaseModel import
from database import get_session
from models_playa import CategoriaVehiculo, Producto, Cliente, Venta, Pagare, Pago, TipoGastoProducto, GastoProducto, TipoGastoEmpresa, GastoEmpresa, ConfigCalificacion, DetalleVenta, Vendedor, Gante, Referencia, UbicacionCliente # Added UbicacionCliente
from schemas_playa import (
    CategoriaVehiculoCreate, CategoriaVehiculoResponse,
    ProductoCreate, ProductoUpdate, ProductoResponse,
    ClienteCreate, ClienteResponse,
    VentaCreate, VentaResponse,
    PagoCreate, PagoResponse,
    PagareUpdate, PagareResponse,
    TipoGastoProductoCreate, TipoGastoProductoResponse, GastoProductoCreate, GastoProductoResponse,
    TipoGastoEmpresaCreate, TipoGastoEmpresaResponse, GastoEmpresaCreate, GastoEmpresaResponse,
    ConfigCalificacionCreate, ConfigCalificacionResponse,
    GanteCreate, GanteResponse, ReferenciaCreate, ReferenciaResponse, ClienteResponseFull,
    UbicacionClienteCreate, UbicacionClienteResponse # Added UbicacionCliente
)
from security import get_current_user, check_permission
from audit_utils import log_audit_action

router = APIRouter(prefix="/playa", tags=["Playa de Vehículos"])

# ===== CATEGORÍAS =====
@router.get("/categorias", response_model=List[CategoriaVehiculoResponse])
async def list_categorias(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(CategoriaVehiculo).order_by(CategoriaVehiculo.id_categoria.asc()))
    return result.scalars().all()

@router.post("/categorias", response_model=CategoriaVehiculoResponse)
async def create_categoria(
    categoria_data: CategoriaVehiculoCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    # Verificar si ya existe
    res = await session.execute(
        select(CategoriaVehiculo)
        .where(func.lower(CategoriaVehiculo.nombre) == func.lower(categoria_data.nombre))
    )
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"La categoría '{categoria_data.nombre}' ya existe.")

    new_cat = CategoriaVehiculo(**categoria_data.model_dump())
    session.add(new_cat)
    await session.commit()
    await session.refresh(new_cat)
    
    # Auditoría
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="create",
        table="categorias_vehiculos",
        record_id=new_cat.id_categoria,
        new_data=categoria_data.model_dump(exclude_none=True),
        details=f"Categoría de vehículo creada: {new_cat.nombre}"
    )
    
    return new_cat

@router.put("/categorias/{id_categoria}", response_model=CategoriaVehiculoResponse)
async def update_categoria(
    id_categoria: int,
    categoria_data: CategoriaVehiculoCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    res = await session.execute(select(CategoriaVehiculo).where(CategoriaVehiculo.id_categoria == id_categoria))
    cat = res.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")

    dup = await session.execute(
        select(CategoriaVehiculo)
        .where(
            and_(
                func.lower(CategoriaVehiculo.nombre) == func.lower(categoria_data.nombre),
                CategoriaVehiculo.id_categoria != id_categoria,
            )
        )
    )
    if dup.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"La categoría '{categoria_data.nombre}' ya existe.")

    old_data = {
        "id_categoria": cat.id_categoria,
        "nombre": cat.nombre,
        "descripcion": cat.descripcion,
    }

    cat.nombre = categoria_data.nombre
    cat.descripcion = categoria_data.descripcion

    await session.commit()
    await session.refresh(cat)

    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="update",
        table="categorias_vehiculos",
        record_id=cat.id_categoria,
        previous_data=old_data,
        new_data=categoria_data.model_dump(exclude_none=True),
        details=f"Categoría de vehículo actualizada: {cat.nombre}"
    )

    return cat

@router.delete("/categorias/{id_categoria}")
async def delete_categoria(
    id_categoria: int,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    res = await session.execute(select(CategoriaVehiculo).where(CategoriaVehiculo.id_categoria == id_categoria))
    cat = res.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")

    en_uso = await session.execute(
        select(Producto.id_producto)
        .where(Producto.id_categoria == id_categoria)
        .limit(1)
    )
    if en_uso.first() is not None:
        raise HTTPException(status_code=400, detail="No se puede eliminar la categoría porque tiene vehículos asociados")

    old_data = {
        "id_categoria": cat.id_categoria,
        "nombre": cat.nombre,
        "descripcion": cat.descripcion,
    }

    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="delete",
        table="categorias_vehiculos",
        record_id=cat.id_categoria,
        previous_data=old_data,
        details=f"Categoría de vehículo eliminada: {cat.nombre}"
    )

    await session.delete(cat)
    await session.commit()

    return {"message": "Categoría eliminada correctamente"}

# ===== CONFIGURACIÓN DE CALIFICACIONES =====
@router.get("/config-calificaciones", response_model=List[ConfigCalificacionResponse])
async def list_config_calificaciones(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(ConfigCalificacion).order_by(ConfigCalificacion.id_config.asc()))
    return result.scalars().all()

@router.post("/config-calificaciones", response_model=ConfigCalificacionResponse)
async def create_config_calificacion(
    config_data: ConfigCalificacionCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    # Verificar duplicado por nombre
    res = await session.execute(
        select(ConfigCalificacion)
        .where(func.lower(ConfigCalificacion.nombre) == func.lower(config_data.nombre))
    )
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"La configuración de calificación '{config_data.nombre}' ya existe.")

    new_config = ConfigCalificacion(**config_data.model_dump())
    session.add(new_config)
    await session.commit()
    await session.refresh(new_config)
    
    # Auditoría
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="create",
        table="config_calificaciones",
        record_id=new_config.id_config,
        new_data=config_data.model_dump(exclude_none=True),
        details=f"Configuración de calificación creada: {new_config.nombre} - {new_config.calificacion}"
    )
    
    return new_config

@router.put("/config-calificaciones/{id_config}", response_model=ConfigCalificacionResponse)
async def update_config_calificacion(
    id_config: int,
    config_data: ConfigCalificacionCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    res = await session.execute(select(ConfigCalificacion).where(ConfigCalificacion.id_config == id_config))
    config = res.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="Configuración de calificación no encontrada")

    dup = await session.execute(
        select(ConfigCalificacion)
        .where(
            and_(
                func.lower(ConfigCalificacion.nombre) == func.lower(config_data.nombre),
                ConfigCalificacion.id_config != id_config,
            )
        )
    )
    if dup.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"La configuración de calificación '{config_data.nombre}' ya existe.")

    old_data = {
        "id_config": config.id_config,
        "nombre": config.nombre,
        "dias_atraso_desde": config.dias_atraso_desde,
        "dias_atraso_hasta": config.dias_atraso_hasta,
        "calificacion": config.calificacion,
        "descripcion": config.descripcion,
        "activo": config.activo,
    }

    config.nombre = config_data.nombre
    config.dias_atraso_desde = config_data.dias_atraso_desde
    config.dias_atraso_hasta = config_data.dias_atraso_hasta
    config.calificacion = config_data.calificacion
    config.descripcion = config_data.descripcion
    config.activo = config_data.activo

    await session.commit()
    await session.refresh(config)

    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="update",
        table="config_calificaciones",
        record_id=config.id_config,
        previous_data=old_data,
        new_data=config_data.model_dump(exclude_none=True),
        details=f"Configuración de calificación actualizada: {config.nombre} - {config.calificacion}"
    )

    return config

@router.delete("/config-calificaciones/{id_config}")
async def delete_config_calificacion(
    id_config: int,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    res = await session.execute(select(ConfigCalificacion).where(ConfigCalificacion.id_config == id_config))
    config = res.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="Configuración de calificación no encontrada")

    old_data = {
        "id_config": config.id_config,
        "nombre": config.nombre,
        "dias_atraso_desde": config.dias_atraso_desde,
        "dias_atraso_hasta": config.dias_atraso_hasta,
        "calificacion": config.calificacion,
        "descripcion": config.descripcion,
        "activo": config.activo,
    }

    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="delete",
        table="config_calificaciones",
        record_id=config.id_config,
        previous_data=old_data,
        details=f"Configuración de calificación eliminada: {config.nombre} - {config.calificacion}"
    )

    await session.delete(config)
    await session.commit()

    return {"message": "Configuración de calificación eliminada correctamente"}

# ===== VEHÍCULOS =====
logger = logging.getLogger(__name__)

@router.get("/vehiculos", response_model=List[ProductoResponse])
async def list_vehiculos(
    available_only: bool = False,
    session: AsyncSession = Depends(get_session)
):
    try:
        query = select(Producto)
        if available_only:
            query = query.where(Producto.estado_disponibilidad == 'DISPONIBLE')
        result = await session.execute(query)
        return result.scalars().all()
    except Exception as e:
        logger.exception("Error en list_vehiculos")
        raise HTTPException(status_code=500, detail=str(e))

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
    # Verificar chasis duplicado
    res = await session.execute(select(Producto).where(Producto.chasis == vehiculo_data.chasis))
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"Ya existe un vehículo registrado con el chasis '{vehiculo_data.chasis}'.")

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
    
    await session.refresh(new_vehiculo)
    return new_vehiculo

@router.put("/vehiculos/{id_producto}", response_model=ProductoResponse)
async def update_vehiculo(
    id_producto: int,
    vehiculo_data: ProductoUpdate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    result = await session.execute(select(Producto).where(Producto.id_producto == id_producto))
    vehiculo = result.scalar_one_or_none()
    
    if not vehiculo:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    
    # Verificar chasis duplicado si cambió
    if vehiculo_data.chasis and vehiculo_data.chasis != vehiculo.chasis:
        res = await session.execute(select(Producto).where(Producto.chasis == vehiculo_data.chasis))
        if res.scalar_one_or_none():
            raise HTTPException(status_code=400, detail=f"Ya existe otro vehículo registrado con el chasis '{vehiculo_data.chasis}'.")

    # Auditoría: datos anteriores
    old_data = {
        column.name: getattr(vehiculo, column.name)
        for column in vehiculo.__table__.columns
    }
    # Convertir decimales y fechas para JSON
    for key, value in old_data.items():
        if isinstance(value, Decimal):
            old_data[key] = float(value)
        elif isinstance(value, (date, datetime)):
            old_data[key] = value.isoformat()

    # Actualizar campos
    update_data = vehiculo_data.model_dump(exclude_none=True)
    for field, value in update_data.items():
        setattr(vehiculo, field, value)
    
    await session.commit()
    await session.refresh(vehiculo)
    
    # Auditoría: nuevos datos
    new_data_for_audit = update_data.copy()
    for key, value in new_data_for_audit.items():
        if isinstance(value, Decimal):
            new_data_for_audit[key] = float(value)
        elif isinstance(value, (date, datetime)):
            new_data_for_audit[key] = value.isoformat()

    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="update",
        table="productos",
        record_id=vehiculo.id_producto,
        previous_data=old_data,
        new_data=new_data_for_audit,
        details=f"Vehículo actualizado: {vehiculo.marca} {vehiculo.modelo}"
    )
    
    await session.refresh(vehiculo)
    return vehiculo

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
        
    new_cliente = Cliente(**cliente_data.model_dump())
    session.add(new_cliente)
    await session.commit()
    await session.refresh(new_cliente)
    
    # Auditoría
    # Convertir Decimals a float y fechas a string para auditoría
    new_data_for_audit = cliente_data.model_dump(exclude_none=True)
    if 'ingreso_mensual' in new_data_for_audit and new_data_for_audit['ingreso_mensual']:
        new_data_for_audit['ingreso_mensual'] = float(new_data_for_audit['ingreso_mensual'])
    if 'fecha_nacimiento' in new_data_for_audit and new_data_for_audit['fecha_nacimiento']:
        if hasattr(new_data_for_audit['fecha_nacimiento'], 'isoformat'):
            new_data_for_audit['fecha_nacimiento'] = new_data_for_audit['fecha_nacimiento'].isoformat()
        else:
            new_data_for_audit['fecha_nacimiento'] = str(new_data_for_audit['fecha_nacimiento'])
    
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="create",
        table="clientes",
        record_id=new_cliente.id_cliente,
        new_data=new_data_for_audit,
        details=f"Cliente registrado: {new_cliente.nombre} {new_cliente.apellido} - CI: {new_cliente.numero_documento}"
    )
    
    await session.refresh(new_cliente)
    return new_cliente

@router.put("/clientes/{cliente_id}", response_model=ClienteResponse)
async def update_cliente(
    cliente_id: int,
    cliente_data: ClienteCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    # Obtener el cliente existente
    result = await session.execute(select(Cliente).where(Cliente.id_cliente == cliente_id))
    cliente = result.scalar_one_or_none()
    
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    # Verificar si el nuevo documento ya existe (si es diferente)
    if cliente.numero_documento != cliente_data.numero_documento:
        check = await session.execute(select(Cliente).where(Cliente.numero_documento == cliente_data.numero_documento))
        if check.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="El documento ya está registrado")
    
    # Guardar datos antiguos para auditoría
    old_data = {
        "tipo_documento": cliente.tipo_documento,
        "numero_documento": cliente.numero_documento,
        "nombre": cliente.nombre,
        "apellido": cliente.apellido,
        "fecha_nacimiento": cliente.fecha_nacimiento.isoformat() if cliente.fecha_nacimiento else None,
        "telefono": cliente.telefono,
        "celular": cliente.celular,
        "email": cliente.email,
        "direccion": cliente.direccion,
        "ciudad": cliente.ciudad,
        "departamento": cliente.departamento,
        "codigo_postal": cliente.codigo_postal,
        "estado_civil": cliente.estado_civil,
        "profesion": cliente.profesion,
        "lugar_trabajo": cliente.lugar_trabajo,
        "telefono_trabajo": cliente.telefono_trabajo,
        "ingreso_mensual": float(cliente.ingreso_mensual) if cliente.ingreso_mensual else None,
        "observaciones": cliente.observaciones,
        "activo": cliente.activo
    }
    
    # Actualizar campos
    for field, value in cliente_data.model_dump(exclude_none=True).items():
        setattr(cliente, field, value)
    
    await session.commit()
    await session.refresh(cliente)
    
    # Convertir Decimals a float y fechas a string para auditoría
    new_data_for_audit = cliente_data.model_dump(exclude_none=True)
    if 'ingreso_mensual' in new_data_for_audit and new_data_for_audit['ingreso_mensual']:
        new_data_for_audit['ingreso_mensual'] = float(new_data_for_audit['ingreso_mensual'])
    if 'fecha_nacimiento' in new_data_for_audit and new_data_for_audit['fecha_nacimiento']:
        if hasattr(new_data_for_audit['fecha_nacimiento'], 'isoformat'):
            new_data_for_audit['fecha_nacimiento'] = new_data_for_audit['fecha_nacimiento'].isoformat()
        else:
            new_data_for_audit['fecha_nacimiento'] = str(new_data_for_audit['fecha_nacimiento'])
    
    # Auditoría
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="update",
        table="clientes",
        record_id=cliente_id,
        previous_data=old_data,
        new_data=new_data_for_audit,
        details=f"Cliente actualizado: {cliente_data.nombre} {cliente_data.apellido}"
    )
    
    await session.refresh(cliente)
    return cliente

@router.delete("/clientes/{cliente_id}")
async def delete_cliente(
    cliente_id: int,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    result = await session.execute(select(Cliente).where(Cliente.id_cliente == cliente_id))
    cliente = result.scalar_one_or_none()
    
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    # Verificar si tiene ventas relacionadas
    ventas_check = await session.execute(select(Venta).where(Venta.id_cliente == cliente_id))
    if ventas_check.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="No se puede eliminar el cliente porque tiene ventas registradas")
    
    # Guardar datos para auditoría
    old_data = {
        "tipo_documento": cliente.tipo_documento,
        "numero_documento": cliente.numero_documento,
        "nombre": cliente.nombre,
        "apellido": cliente.apellido,
        "fecha_nacimiento": cliente.fecha_nacimiento.isoformat() if cliente.fecha_nacimiento else None,
        "telefono": cliente.telefono,
        "celular": cliente.celular,
        "email": cliente.email,
        "direccion": cliente.direccion,
        "ciudad": cliente.ciudad,
        "departamento": cliente.departamento,
        "codigo_postal": cliente.codigo_postal,
        "estado_civil": cliente.estado_civil,
        "profesion": cliente.profesion,
        "lugar_trabajo": cliente.lugar_trabajo,
        "telefono_trabajo": cliente.telefono_trabajo,
        "ingreso_mensual": float(cliente.ingreso_mensual) if cliente.ingreso_mensual else None,
        "observaciones": cliente.observaciones,
        "activo": cliente.activo
    }
    
    # Auditoría (antes de eliminar)
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="delete",
        table="clientes",
        record_id=cliente_id,
        previous_data=old_data,
        details=f"Cliente eliminado: {cliente.nombre} {cliente.apellido}"
    )
    
    await session.delete(cliente)
    await session.commit()
    
    return {"message": "Cliente eliminado correctamente"}

# ===== GARANTES =====
@router.get("/clientes/{cliente_id}/full", response_model=ClienteResponseFull)
async def get_cliente_full(cliente_id: int, session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(Cliente)
        .options(
            joinedload(Cliente.garantes).joinedload(Gante.referencias),
            joinedload(Cliente.referencias),
            joinedload(Cliente.ubicaciones)
        )
        .where(Cliente.id_cliente == cliente_id)
    )
    cliente = result.unique().scalar_one_or_none()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return cliente

@router.get("/garantes", response_model=List[GanteResponse])
async def list_garantes(id_cliente: Optional[int] = None, session: AsyncSession = Depends(get_session)):
    query = select(Gante).options(joinedload(Gante.referencias))
    if id_cliente:
        query = query.where(Gante.id_cliente == id_cliente)
    result = await session.execute(query)
    return result.unique().scalars().all()

@router.post("/garantes", response_model=GanteResponse)
async def create_garante(
    data: GanteCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    new_garante = Gante(**data.model_dump())
    session.add(new_garante)
    await session.commit()
    await session.refresh(new_garante)
    
    # Auditoría
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="create",
        table="garantes",
        record_id=new_garante.id_garante,
        new_data=data.model_dump(exclude_none=True),
        details=f"Garante registrado para cliente ID {data.id_cliente}: {new_garante.nombre} {new_garante.apellido}"
    )
    
    # Recargar para incluir referencias (vacías)
    result = await session.execute(select(Gante).options(joinedload(Gante.referencias)).where(Gante.id_garante == new_garante.id_garante))
    return result.unique().scalar_one()

@router.put("/garantes/{id_garante}", response_model=GanteResponse)
async def update_garante(
    id_garante: int,
    data: GanteCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    result = await session.execute(select(Gante).where(Gante.id_garante == id_garante))
    garante = result.scalar_one_or_none()
    if not garante:
        raise HTTPException(status_code=404, detail="Garante no encontrado")
    
    old_data = {c.name: getattr(garante, c.name) for c in garante.__table__.columns}
    
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(garante, field, value)
        
    await session.commit()
    await session.refresh(garante)
    
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="update",
        table="garantes",
        record_id=id_garante,
        previous_data=old_data,
        new_data=data.model_dump(exclude_none=True),
        details=f"Gante actualizado: {garante.nombre} {garante.apellido}"
    )
    
    result = await session.execute(select(Gante).options(joinedload(Gante.referencias)).where(Gante.id_garante == id_garante))
    return result.unique().scalar_one()

@router.delete("/garantes/{id_garante}")
async def delete_garante(
    id_garante: int,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    result = await session.execute(select(Gante).where(Gante.id_garante == id_garante))
    garante = result.scalar_one_or_none()
    if not garante:
        raise HTTPException(status_code=404, detail="Garante no encontrado")
    
    # Eliminar referencias asociadas
    await session.execute(delete(Referencia).where(and_(Referencia.id_cliente == id_garante, Referencia.tipo_entidad == 'GARANTE')))
    
    await session.delete(garante)
    await session.commit()
    
    return {"message": "Garante eliminado correctamente"}

# ===== REFERENCIAS =====
@router.post("/referencias", response_model=ReferenciaResponse)
async def create_referencia(
    data: ReferenciaCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    new_ref = Referencia(**data.model_dump())
    session.add(new_ref)
    await session.commit()
    await session.refresh(new_ref)
    
    # Auditoría
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="create",
        table="referencias",
        record_id=new_ref.id_referencia,
        new_data=data.model_dump(exclude_none=True),
        details=f"Referencia {data.tipo_referencia} creada para {data.tipo_entidad} ID {data.id_cliente}"
    )
    
    return new_ref

@router.put("/referencias/{id_referencia}", response_model=ReferenciaResponse)
async def update_referencia(
    id_referencia: int,
    data: ReferenciaCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    result = await session.execute(select(Referencia).where(Referencia.id_referencia == id_referencia))
    ref = result.scalar_one_or_none()
    if not ref:
        raise HTTPException(status_code=404, detail="Referencia no encontrada")
    
    old_data = {c.name: getattr(ref, c.name) for c in ref.__table__.columns}
    
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(ref, field, value)
        
    await session.commit()
    await session.refresh(ref)
    
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="update",
        table="referencias",
        record_id=id_referencia,
        previous_data=old_data,
        new_data=data.model_dump(exclude_none=True),
        details=f"Referencia actualizada: {ref.nombre}"
    )
    
    return ref

@router.delete("/referencias/{id_referencia}")
async def delete_referencia(
    id_referencia: int,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    result = await session.execute(select(Referencia).where(Referencia.id_referencia == id_referencia))
    ref = result.scalar_one_or_none()
    if not ref:
        raise HTTPException(status_code=404, detail="Referencia no encontrada")
    
    await session.delete(ref)
    await session.commit()
    
    return {"message": "Referencia eliminada correctamente"}

# ===== UBICACIONES CLIENTE =====
@router.post("/ubicaciones-cliente", response_model=UbicacionClienteResponse)
async def create_ubicacion_cliente(
    data: UbicacionClienteCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    new_ub = UbicacionCliente(**data.model_dump())
    session.add(new_ub)
    await session.commit()
    await session.refresh(new_ub)
    
    # Auditoría
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="create",
        table="ubicaciones_cliente",
        record_id=new_ub.id_ubicacion,
        new_data=data.model_dump(exclude_none=True),
        details=f"Ubicación '{data.nombre_lugar}' creada para cliente ID {data.id_cliente}"
    )
    
    return new_ub

@router.put("/ubicaciones-cliente/{id_ubicacion}", response_model=UbicacionClienteResponse)
async def update_ubicacion_cliente(
    id_ubicacion: int,
    data: UbicacionClienteCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    result = await session.execute(select(UbicacionCliente).where(UbicacionCliente.id_ubicacion == id_ubicacion))
    ub = result.scalar_one_or_none()
    if not ub:
        raise HTTPException(status_code=404, detail="Ubicación no encontrada")
    
    old_data = {c.name: getattr(ub, c.name) for c in ub.__table__.columns}
    
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(ub, field, value)
        
    await session.commit()
    await session.refresh(ub)
    
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="update",
        table="ubicaciones_cliente",
        record_id=id_ubicacion,
        previous_data=old_data,
        new_data=data.model_dump(exclude_none=True),
        details=f"Ubicación actualizada: {ub.nombre_lugar}"
    )
    
    return ub

@router.delete("/ubicaciones-cliente/{id_ubicacion}")
async def delete_ubicacion_cliente(
    id_ubicacion: int,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    result = await session.execute(select(UbicacionCliente).where(UbicacionCliente.id_ubicacion == id_ubicacion))
    ub = result.scalar_one_or_none()
    if not ub:
        raise HTTPException(status_code=404, detail="Ubicación no encontrada")
    
    await session.delete(ub)
    await session.commit()
    
    return {"message": "Ubicación eliminada correctamente"}

# ===== VENTAS Y PAGARÉS =====
@router.get("/ventas", response_model=List[VentaResponse])
async def list_ventas(session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(Venta)
        .options(
            joinedload(Venta.cliente),
            joinedload(Venta.producto),
            joinedload(Venta.pagares), 
            joinedload(Venta.detalles)
        )
        .order_by(Venta.fecha_registro.desc())
    )
    return result.unique().scalars().all()

@router.post("/ventas", response_model=VentaResponse)
async def create_venta(
    venta_data: VentaCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    # 1. Verificar disponibilidad del vehículo
    res_v = await session.execute(select(Producto).where(Producto.id_producto == venta_data.id_producto))
    vehiculo = res_v.scalar_one_or_none()
    
    if not vehiculo or vehiculo.estado_disponibilidad != 'DISPONIBLE':
        raise HTTPException(status_code=400, detail="El vehículo no está disponible para la venta")

    # 2. Crear la venta
    venta_dict = venta_data.dict()
    detalles_data = venta_dict.pop('detalles', [])
    new_venta = Venta(**venta_dict)
    session.add(new_venta)
    await session.flush() # Para obtener el ID de la venta

    # 2.1 Crear detalles de venta
    for det in detalles_data:
        nuevo_detalle = DetalleVenta(id_venta=new_venta.id_venta, **det)
        session.add(nuevo_detalle)

    # 3. Marcar vehículo como VENDIDO
    vehiculo.estado_disponibilidad = 'VENDIDO'
    
    # 4. Generar Pagarés
    hoy = new_venta.fecha_venta or date.today()
    
    # 4.1 Pagaré de Entrega Inicial (Aplica para Contado y Financiado si hay entrega)
    if (new_venta.entrega_inicial or 0) > 0:
        session.add(Pagare(
            id_venta=new_venta.id_venta,
            numero_pagare=f"{new_venta.numero_venta}-EI",
            numero_cuota=0,
            monto_cuota=new_venta.entrega_inicial,
            fecha_vencimiento=hoy,
            tipo_pagare='ENTREGA_INICIAL',
            estado='PENDIENTE',
            saldo_pendiente=new_venta.entrega_inicial
        ))

    # 4.2 Pagarés de Financiación
    if venta_data.tipo_venta == 'FINANCIADO':
        # Pagarés de Cuotas
        if (venta_data.cantidad_cuotas or 0) > 0:
            for i in range(1, venta_data.cantidad_cuotas + 1):
                vencimiento = hoy + timedelta(days=30 * i)
                nuevo_pagare = Pagare(
                    id_venta=new_venta.id_venta,
                    numero_pagare=f"{new_venta.numero_venta}-C{i}",
                    numero_cuota=i,
                    monto_cuota=venta_data.monto_cuota,
                    fecha_vencimiento=vencimiento,
                    tipo_pagare='CUOTA',
                    estado='PENDIENTE',
                    saldo_pendiente=venta_data.monto_cuota
                )
                session.add(nuevo_pagare)
        
        # Pagarés de Refuerzos
        if (venta_data.cantidad_refuerzos or 0) > 0:
            for i in range(1, venta_data.cantidad_refuerzos + 1):
                vencimiento = hoy + timedelta(days=365 * i)
                nuevo_pagare = Pagare(
                    id_venta=new_venta.id_venta,
                    numero_pagare=f"{new_venta.numero_venta}-R{i}",
                    numero_cuota=i,
                    monto_cuota=venta_data.monto_refuerzo,
                    fecha_vencimiento=vencimiento,
                    tipo_pagare='REFUERZO',
                    estado='PENDIENTE',
                    saldo_pendiente=venta_data.monto_refuerzo
                )
                session.add(nuevo_pagare)

    await session.commit()
    await session.refresh(new_venta)
    
    # Cargar la relación pagares y detalles para evitar error de lazy loading
    result = await session.execute(
        select(Venta).options(joinedload(Venta.pagares), joinedload(Venta.detalles)).where(Venta.id_venta == new_venta.id_venta)
    )
    venta_with_relations = result.unique().scalar_one()
    
    # Auditoría
    # Convertir Decimals a float y fechas a string para auditoría
    new_data_for_audit = venta_data.dict(exclude_none=True)
    decimal_fields = ['precio_venta', 'descuento', 'precio_final', 'entrega_inicial', 'saldo_financiar', 'monto_cuota', 'tasa_interes', 'monto_refuerzo']
    for field in decimal_fields:
        if field in new_data_for_audit and new_data_for_audit[field] is not None:
            new_data_for_audit[field] = float(new_data_for_audit[field])
    
    # Convertir fecha_venta a string si existe
    if 'fecha_venta' in new_data_for_audit and new_data_for_audit['fecha_venta']:
        if hasattr(new_data_for_audit['fecha_venta'], 'isoformat'):
            new_data_for_audit['fecha_venta'] = new_data_for_audit['fecha_venta'].isoformat()
        else:
            new_data_for_audit['fecha_venta'] = str(new_data_for_audit['fecha_venta'])
    
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="create",
        table="ventas",
        record_id=venta_with_relations.id_venta,
        new_data=new_data_for_audit,
        details=f"Venta registrada: {venta_with_relations.numero_venta} - {venta_with_relations.tipo_venta} - Vehículo ID {venta_data.id_producto}"
    )
    
    # RE-FETCH
    result = await session.execute(
        select(Venta).options(joinedload(Venta.pagares), joinedload(Venta.detalles)).where(Venta.id_venta == new_venta.id_venta)
    )
    return result.unique().scalar_one()

@router.put("/ventas/{venta_id}/anular", response_model=VentaResponse)
async def anular_venta(
    venta_id: int,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    result = await session.execute(
        select(Venta)
        .options(joinedload(Venta.pagares), joinedload(Venta.producto), joinedload(Venta.cliente))
        .where(Venta.id_venta == venta_id)
    )
    venta = result.unique().scalar_one_or_none()

    if not venta:
        raise HTTPException(status_code=404, detail="Venta no encontrada")

    if venta.estado_venta == 'ANULADA':
        raise HTTPException(status_code=400, detail="La venta ya está anulada")

    # Validar que no existan pagos registrados
    pagos_check = await session.execute(select(Pago).where(Pago.id_venta == venta_id))
    if pagos_check.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="No se puede anular la venta porque tiene pagos registrados")

    # Guardar datos para auditoría
    old_data = {
        "numero_venta": venta.numero_venta,
        "id_cliente": venta.id_cliente,
        "id_producto": venta.id_producto,
        "fecha_venta": venta.fecha_venta.isoformat() if venta.fecha_venta else None,
        "tipo_venta": venta.tipo_venta,
        "precio_venta": float(venta.precio_venta) if venta.precio_venta is not None else None,
        "descuento": float(venta.descuento) if venta.descuento is not None else None,
        "precio_final": float(venta.precio_final) if venta.precio_final is not None else None,
        "entrega_inicial": float(venta.entrega_inicial) if venta.entrega_inicial is not None else None,
        "saldo_financiar": float(venta.saldo_financiar) if venta.saldo_financiar is not None else None,
        "cantidad_cuotas": venta.cantidad_cuotas,
        "monto_cuota": float(venta.monto_cuota) if venta.monto_cuota is not None else None,
        "estado_venta": venta.estado_venta,
        "pagares": [
            {
                "id_pagare": p.id_pagare,
                "numero_pagare": p.numero_pagare,
                "numero_cuota": p.numero_cuota,
                "monto_cuota": float(p.monto_cuota) if p.monto_cuota is not None else None,
                "fecha_vencimiento": p.fecha_vencimiento.isoformat() if p.fecha_vencimiento else None,
                "estado": p.estado,
                "saldo_pendiente": float(p.saldo_pendiente) if p.saldo_pendiente is not None else None,
            }
            for p in (venta.pagares or [])
        ],
    }

    pagares_eliminados = 0
    for pagare in (venta.pagares or []):
        await session.delete(pagare)
        pagares_eliminados += 1

    # Anular venta
    venta.estado_venta = 'ANULADA'

    # Revertir vehículo a DISPONIBLE
    if venta.id_producto:
        # Usamos una consulta directa para asegurar que el estado del vehículo se actualice
        res_v = await session.execute(select(Producto).where(Producto.id_producto == venta.id_producto))
        vehiculo_para_revertir = res_v.scalar_one_or_none()
        if vehiculo_para_revertir:
            vehiculo_para_revertir.estado_disponibilidad = 'DISPONIBLE'

    await session.commit()
    await session.refresh(venta)

    new_data_for_audit = {
        "estado_venta": venta.estado_venta,
        "pagares_eliminados": pagares_eliminados,
        "vehiculo_estado": venta.producto.estado_disponibilidad if venta.producto else None,
    }

    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="update",
        table="ventas",
        record_id=venta_id,
        previous_data=old_data,
        new_data=new_data_for_audit,
        details=f"Venta anulada: {venta.numero_venta}"
    )
    
    # RE-FETCH
    result = await session.execute(
        select(Venta)
        .options(joinedload(Venta.pagares), joinedload(Venta.detalles))
        .where(Venta.id_venta == venta_id)
    )
    return result.unique().scalar_one()

@router.put("/ventas/{venta_id}", response_model=VentaResponse)
async def update_venta(
    venta_id: int,
    venta_data: VentaCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    result = await session.execute(
        select(Venta)
        .options(joinedload(Venta.pagares), joinedload(Venta.producto), joinedload(Venta.cliente))
        .where(Venta.id_venta == venta_id)
    )
    venta = result.unique().scalar_one_or_none()

    if not venta:
        raise HTTPException(status_code=404, detail="Venta no encontrada")

    if venta.estado_venta == 'ANULADA':
        raise HTTPException(status_code=400, detail="No se puede modificar una venta anulada")

    pagos_check = await session.execute(select(Pago).where(Pago.id_venta == venta_id))
    if pagos_check.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="No se puede modificar la venta porque tiene pagos registrados")

    if venta.id_producto != venta_data.id_producto:
        raise HTTPException(status_code=400, detail="No se puede cambiar el vehículo de una venta")

    if venta.numero_venta != venta_data.numero_venta:
        raise HTTPException(status_code=400, detail="No se puede cambiar el número de venta")

    old_data = {
        "numero_venta": venta.numero_venta,
        "id_cliente": venta.id_cliente,
        "id_producto": venta.id_producto,
        "fecha_venta": venta.fecha_venta.isoformat() if venta.fecha_venta else None,
        "tipo_venta": venta.tipo_venta,
        "precio_venta": float(venta.precio_venta) if venta.precio_venta is not None else None,
        "descuento": float(venta.descuento) if venta.descuento is not None else None,
        "precio_final": float(venta.precio_final) if venta.precio_final is not None else None,
        "entrega_inicial": float(venta.entrega_inicial) if venta.entrega_inicial is not None else None,
        "saldo_financiar": float(venta.saldo_financiar) if venta.saldo_financiar is not None else None,
        "cantidad_cuotas": venta.cantidad_cuotas,
        "monto_cuota": float(venta.monto_cuota) if venta.monto_cuota is not None else None,
        "estado_venta": venta.estado_venta,
        "pagares": [
            {
                "id_pagare": p.id_pagare,
                "numero_pagare": p.numero_pagare,
                "numero_cuota": p.numero_cuota,
                "monto_cuota": float(p.monto_cuota) if p.monto_cuota is not None else None,
                "fecha_vencimiento": p.fecha_vencimiento.isoformat() if p.fecha_vencimiento else None,
                "estado": p.estado,
                "saldo_pendiente": float(p.saldo_pendiente) if p.saldo_pendiente is not None else None,
            }
            for p in (venta.pagares or [])
        ],
    }

    venta_dict = venta_data.dict()
    detalles_data = venta_dict.pop('detalles', [])
    
    for field, value in venta_dict.items():
        if field in ['precio_venta', 'descuento', 'precio_final', 'entrega_inicial', 'saldo_financiar', 'monto_cuota', 'monto_refuerzo']:
            setattr(venta, field, Decimal(str(value)) if value is not None else None)
        else:
            setattr(venta, field, value)

    # Eliminar detalles antiguos y crear nuevos
    for d in (venta.detalles or []):
        await session.delete(d)
    
    for det in detalles_data:
        nuevo_detalle = DetalleVenta(id_venta=venta.id_venta, **det)
        session.add(nuevo_detalle)

    pagares_eliminados = 0
    for pagare in (venta.pagares or []):
        await session.delete(pagare)
        pagares_eliminados += 1

    pagares_generados = 0
    base_date = venta.fecha_venta or date.today()

    # 4.1 Pagaré de Entrega Inicial
    if (venta.entrega_inicial or 0) > 0:
        session.add(Pagare(
            id_venta=venta.id_venta,
            numero_pagare=f"{venta.numero_venta}-EI",
            numero_cuota=0,
            monto_cuota=venta.entrega_inicial,
            fecha_vencimiento=base_date,
            tipo_pagare='ENTREGA_INICIAL',
            estado='PENDIENTE',
            saldo_pendiente=venta.entrega_inicial
        ))
        pagares_generados += 1

    # 4.2 Pagarés de Financiación
    if venta_data.tipo_venta == 'FINANCIADO':
        # Cuotas
        if (venta_data.cantidad_cuotas or 0) > 0:
            for i in range(1, venta_data.cantidad_cuotas + 1):
                vencimiento = base_date + timedelta(days=30 * i)
                nuevo_pagare = Pagare(
                    id_venta=venta.id_venta,
                    numero_pagare=f"{venta.numero_venta}-C{i}",
                    numero_cuota=i,
                    monto_cuota=venta_data.monto_cuota,
                    fecha_vencimiento=vencimiento,
                    tipo_pagare='CUOTA',
                    estado='PENDIENTE',
                    saldo_pendiente=venta_data.monto_cuota
                )
                session.add(nuevo_pagare)
                pagares_generados += 1
        
        # Refuerzos
        if (venta_data.cantidad_refuerzos or 0) > 0:
            for i in range(1, venta_data.cantidad_refuerzos + 1):
                vencimiento = base_date + timedelta(days=365 * i)
                nuevo_pagare = Pagare(
                    id_venta=venta.id_venta,
                    numero_pagare=f"{venta.numero_venta}-R{i}",
                    numero_cuota=i,
                    monto_cuota=venta_data.monto_refuerzo,
                    fecha_vencimiento=vencimiento,
                    tipo_pagare='REFUERZO',
                    estado='PENDIENTE',
                    saldo_pendiente=venta_data.monto_refuerzo
                )
                session.add(nuevo_pagare)
                pagares_generados += 1

    await session.commit()
    await session.refresh(venta) # Refresh after commit to ensure relationships are loaded for audit

    new_data_for_audit = venta_data.model_dump(exclude_none=True)
    decimal_fields = ['precio_venta', 'descuento', 'precio_final', 'entrega_inicial', 'saldo_financiar', 'monto_cuota', 'tasa_interes', 'monto_refuerzo']
    for field in decimal_fields:
        if field in new_data_for_audit and new_data_for_audit[field] is not None:
            new_data_for_audit[field] = float(new_data_for_audit[field])
    if 'fecha_venta' in new_data_for_audit and new_data_for_audit['fecha_venta']:
        if hasattr(new_data_for_audit['fecha_venta'], 'isoformat'):
            new_data_for_audit['fecha_venta'] = new_data_for_audit['fecha_venta'].isoformat()
        else:
            new_data_for_audit['fecha_venta'] = str(new_data_for_audit['fecha_venta'])

    new_data_for_audit["pagares_eliminados"] = pagares_eliminados
    new_data_for_audit["pagares_generados"] = pagares_generados

    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="update",
        table="ventas",
        record_id=venta_id,
        previous_data=old_data,
        new_data=new_data_for_audit,
        details=f"Venta actualizada: {venta.numero_venta}"
    )
    
    # RE-FETCH
    result = await session.execute(
        select(Venta)
        .options(joinedload(Venta.pagares), joinedload(Venta.detalles))
        .where(Venta.id_venta == venta_id)
    )
    return result.unique().scalar_one()
@router.get("/pagares/pendientes")
async def list_pagares_pendientes(session: AsyncSession = Depends(get_session)):
    # Traer pagarés con saldo pendiente (PENDIENTE o PARCIAL)
    query = (
        select(Pagare, Venta, Cliente, Producto)
        .join(Venta, Pagare.id_venta == Venta.id_venta)
        .join(Cliente, Venta.id_cliente == Cliente.id_cliente)
        .join(Producto, Venta.id_producto == Producto.id_producto)
        .where(Pagare.estado.in_(['PENDIENTE', 'PARCIAL']))
        .where(Pagare.saldo_pendiente > 0)
        .order_by(Pagare.fecha_vencimiento)
    )
    
    result = await session.execute(query)
    pagares_list = result.all()
    
    # Obtener todos los IDs de venta únicos
    venta_ids = list(set([v.id_venta for _, v, _, _ in pagares_list]))
    
    # Obtener total de cuotas por venta en una sola consulta
    if venta_ids:
        count_query = (
            select(Pagare.id_venta, func.count(Pagare.id_pagare).label('total'))
            .where(Pagare.id_venta.in_(venta_ids))
            .group_by(Pagare.id_venta)
        )
        count_result = await session.execute(count_query)
        ventas_cuotas = {row.id_venta: row.total for row in count_result.all()}
    else:
        ventas_cuotas = {}
    
    data = []
    for p, v, c, prod in pagares_list:
        total_cuotas = ventas_cuotas.get(v.id_venta, 0)
        
        data.append({
            "id_pagare": p.id_pagare,
            "id_venta": v.id_venta,
            "numero_cuota": p.numero_cuota,
            "total_cuotas": total_cuotas,
            "monto_cuota": float(p.monto_cuota),
            "saldo_pendiente": float(p.saldo_pendiente) if p.saldo_pendiente is not None else float(p.monto_cuota),
            "fecha_vencimiento": p.fecha_vencimiento.isoformat() if hasattr(p.fecha_vencimiento, 'isoformat') else str(p.fecha_vencimiento),
            "cliente": f"{c.nombre} {c.apellido}",
            "vehiculo": f"{prod.marca} {prod.modelo}",
            "numero_documento": c.numero_documento,
            "estado": p.estado
        })
    return data

@router.get("/pagares", response_model=List[PagareResponse])
async def list_pagares(
    id_venta: Optional[int] = None,
    estado: Optional[str] = None,
    session: AsyncSession = Depends(get_session)
):
    query = select(Pagare)
    if id_venta:
        query = query.where(Pagare.id_venta == id_venta)
    if estado:
        query = query.where(Pagare.estado == estado)
    
    query = query.order_by(Pagare.fecha_vencimiento.asc())
    result = await session.execute(query)
    return result.scalars().all()

@router.put("/pagares/{id_pagare}", response_model=PagareResponse)
async def update_pagare(
    id_pagare: int,
    data: PagareUpdate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    result = await session.execute(select(Pagare).where(Pagare.id_pagare == id_pagare))
    pagare = result.scalar_one_or_none()
    
    if not pagare:
        raise HTTPException(status_code=404, detail="Pagaré no encontrado")
        
    # Auditoría: datos anteriores
    old_data = {
        "id_pagare": pagare.id_pagare,
        "numero_pagare": pagare.numero_pagare,
        "monto_cuota": float(pagare.monto_cuota) if pagare.monto_cuota else None,
        "fecha_vencimiento": pagare.fecha_vencimiento.isoformat() if pagare.fecha_vencimiento else None,
        "estado": pagare.estado,
        "saldo_pendiente": float(pagare.saldo_pendiente) if pagare.saldo_pendiente else None,
        "observaciones": pagare.observaciones
    }
    
    # Actualizar campos
    update_data = data.model_dump(exclude_none=True)
    for field, value in update_data.items():
        setattr(pagare, field, value)
        
    await session.commit()
    await session.refresh(pagare)
    
    # Auditoría: nuevos datos
    new_data_for_audit = update_data.copy()
    for key, value in new_data_for_audit.items():
        if isinstance(value, Decimal):
            new_data_for_audit[key] = float(value)
        elif isinstance(value, (date, datetime)):
            new_data_for_audit[key] = value.isoformat()

    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="update",
        table="pagares",
        record_id=id_pagare,
        previous_data=old_data,
        new_data=new_data_for_audit,
        details=f"Pagaré actualizado: {pagare.numero_pagare}"
    )
    
    return pagare

@router.post("/pagos", response_model=PagoResponse)
async def create_pago(
    pago_data: PagoCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    # Establecer el search_path al inicio para asegurar que PostgreSQL encuentre las tablas del schema playa
    await session.execute(text("SET LOCAL search_path TO playa, public"))
    
    # 1. Obtener el pagaré con su venta asociada
    res_p = await session.execute(
        select(Pagare)
        .options(joinedload(Pagare.venta))
        .where(Pagare.id_pagare == pago_data.id_pagare)
    )
    pagare = res_p.scalar_one_or_none()
    
    if not pagare:
        raise HTTPException(status_code=404, detail="El pagaré no existe")
    
    if pagare.estado == 'PAGADO':
        raise HTTPException(status_code=400, detail="El pagaré ya ha sido pagado completamente")

    # Obtener la venta asociada al pagaré
    if not pagare.id_venta:
        raise HTTPException(status_code=400, detail="El pagaré no tiene una venta asociada")
    
    # Obtener la venta directamente por id_venta para asegurar que existe
    res_v = await session.execute(
        select(Venta).where(Venta.id_venta == pagare.id_venta)
    )
    venta = res_v.scalar_one_or_none()
    
    if not venta:
        raise HTTPException(status_code=404, detail="No se encontró la venta asociada al pagaré")

    # 2. Calcular atraso y mora
    atraso_dias = 0
    mora_calculada = Decimal("0.00")
    
    if pago_data.fecha_pago > pagare.fecha_vencimiento:
        atraso_dias = (pago_data.fecha_pago - pagare.fecha_vencimiento).days
        
        # Verificar días de gracia
        dias_afectivos = atraso_dias - (venta.dias_gracia or 0)
        
        if dias_afectivos > 0:
            # Calcular periodos según configuración de la venta
            periodo = venta.periodo_int_mora or 'D'
            
            dias_por_periodo = 1
            if periodo == 'S': dias_por_periodo = 7
            elif periodo == 'M': dias_por_periodo = 30
            elif periodo == 'A': dias_por_periodo = 365
            
            # Cantidad de periodos (proporcional)
            num_periodos = Decimal(str(dias_afectivos)) / Decimal(str(dias_por_periodo))
            
            # NUEVA FÓRMULA SOLICITADA POR EL USUARIO:
            # Mora = Saldo Pendiente * (Tasa % / 100) + (Cantidad de Periodos de Atraso * monto_int_mora)
            tasa_porc = venta.tasa_interes or Decimal("0.00")
            cargo_fijo = venta.monto_int_mora or Decimal("0.00")
            
            interes_al_saldo = pagare.saldo_pendiente * (tasa_porc / Decimal("100"))
            multa_periodica = num_periodos * cargo_fijo
            
            mora_calculada = interes_al_saldo + multa_periodica

    # 3. Registrar el pago
    # El monto pagado se aplica al saldo pendiente.
    # Si el usuario quiere que la mora se pague primero, deberíamos restar de la mora primero.
    # Pero como el saldo_pendiente solo rastrea capital, lo dejamos así por ahora.
    # Asegurarse de usar el id_venta de la venta obtenida, no del pago_data
    pago_dict = pago_data.dict()
    pago_dict['id_venta'] = venta.id_venta  # Usar el id_venta de la venta obtenida
    
    new_pago = Pago(
        **pago_dict,
        dias_atraso=atraso_dias,
        mora_aplicada=mora_calculada.quantize(Decimal("1.00")) # Redondeo a entero para Gs.
    )
    session.add(new_pago)
    
    # 4. Actualizar estado del pagaré (SOPORTE PAGOS PARCIALES)
    monto_a_aplicar = Decimal(str(pago_data.monto_pagado))
    
    # Actualizamos el saldo pendiente del pagaré
    if pagare.saldo_pendiente is None:
        pagare.saldo_pendiente = pagare.monto_cuota
        
    pagare.saldo_pendiente -= monto_a_aplicar
    
    if pagare.saldo_pendiente <= 0:
        pagare.estado = 'PAGADO'
        pagare.saldo_pendiente = 0
    else:
        pagare.estado = 'PARCIAL'
    
    # 5. TODO: Actualizar calificación del cliente si es necesario
    
    await session.commit()
    await session.refresh(new_pago)
    
    # Auditoría
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="create",
        table="pagos",
        record_id=new_pago.id_pago,
        new_data=pago_data.dict(exclude_none=True),
        details=f"Cobro registrado: Recibo {new_pago.numero_recibo} - Cuota {pagare.numero_cuota} Venta {pago_data.id_venta}. Mora calc: {mora_calculada}"
    )
    
    await session.refresh(new_pago)
    return new_pago

# ===== GASTOS DE VEHÍCULOS =====
@router.get("/tipos-gastos", response_model=List[TipoGastoProductoResponse])
async def list_tipos_gastos(
    todo: bool = False,
    session: AsyncSession = Depends(get_session)
):
    query = select(TipoGastoProducto)
    if not todo:
        query = query.where(TipoGastoProducto.activo == True)
        
    result = await session.execute(query)
    return result.scalars().all()

@router.post("/tipos-gastos", response_model=TipoGastoProductoResponse)
async def create_tipo_gasto(
    data: TipoGastoProductoCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    # Verificar duplicado
    res = await session.execute(select(TipoGastoProducto).where(TipoGastoProducto.nombre == data.nombre))
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"El concepto de gasto '{data.nombre}' ya está registrado.")

    new_tipo = TipoGastoProducto(**data.dict())
    session.add(new_tipo)
    await session.commit()
    await session.refresh(new_tipo)

    # Auditoría
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="create",
        table="tipos_gastos_productos",
        record_id=new_tipo.id_tipo_gasto,
        new_data=data.dict(exclude_none=True),
        details=f"Nuevo tipo de gasto de vehículo creado: {new_tipo.nombre}"
    )

    return new_tipo

@router.put("/tipos-gastos/{id_tipo_gasto}", response_model=TipoGastoProductoResponse)
async def update_tipo_gasto(
    id_tipo_gasto: int,
    data: TipoGastoProductoCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    result = await session.execute(select(TipoGastoProducto).where(TipoGastoProducto.id_tipo_gasto == id_tipo_gasto))
    tipo = result.scalar_one_or_none()
    
    if not tipo:
        raise HTTPException(status_code=404, detail="Concepto de gasto no encontrado")

    # Verificar duplicado de nombre si cambia
    if tipo.nombre != data.nombre:
        res = await session.execute(select(TipoGastoProducto).where(TipoGastoProducto.nombre == data.nombre))
        if res.scalar_one_or_none():
            raise HTTPException(status_code=400, detail=f"El concepto de gasto '{data.nombre}' ya está registrado.")

    old_data = {
        "nombre": tipo.nombre,
        "descripcion": tipo.descripcion,
        "activo": tipo.activo
    }

    tipo.nombre = data.nombre
    tipo.descripcion = data.descripcion
    tipo.activo = data.activo
    
    await session.commit()
    await session.refresh(tipo)

    # Auditoría
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="update",
        table="tipos_gastos_productos",
        record_id=id_tipo_gasto,
        previous_data=old_data,
        new_data=data.dict(exclude_none=True),
        details=f"Tipo de gasto de vehículo actualizado: {tipo.nombre}"
    )

    return tipo

@router.delete("/tipos-gastos/{id_tipo_gasto}")
async def delete_tipo_gasto(
    id_tipo_gasto: int,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    result = await session.execute(select(TipoGastoProducto).where(TipoGastoProducto.id_tipo_gasto == id_tipo_gasto))
    tipo = result.scalar_one_or_none()
    
    if not tipo:
        raise HTTPException(status_code=404, detail="Concepto de gasto no encontrado")
        
    # Verificar uso
    uso = await session.execute(select(GastoProducto).where(GastoProducto.id_tipo_gasto == id_tipo_gasto).limit(1))
    if uso.first():
         raise HTTPException(status_code=400, detail="No se puede eliminar porque existen gastos asociados a este concepto.")

    old_data = {
        "nombre": tipo.nombre,
        "descripcion": tipo.descripcion,
        "activo": tipo.activo
    }

    await session.delete(tipo)
    await session.commit()

    # Auditoría
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="delete",
        table="tipos_gastos_productos",
        record_id=id_tipo_gasto,
        previous_data=old_data,
        details=f"Tipo de gasto de vehículo eliminado: {tipo.nombre}"
    )

    return {"message": "Concepto eliminado correctamente"}


@router.post("/gastos", response_model=GastoProductoResponse)
async def create_gasto_vehiculo(
    gasto_data: GastoProductoCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    new_gasto = GastoProducto(**gasto_data.dict())
    session.add(new_gasto)
    await session.commit()
    await session.refresh(new_gasto)
    
    # Cargar la relación tipo_gasto para evitar error de lazy loading
    result = await session.execute(
        select(GastoProducto).options(joinedload(GastoProducto.tipo_gasto)).where(GastoProducto.id_gasto_producto == new_gasto.id_gasto_producto)
    )
    gasto_with_tipo = result.scalar_one()
    
    # Auditoría
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="create",
        table="gastos_productos",
        record_id=new_gasto.id_gasto_producto,
        new_data=gasto_data.dict(exclude_none=True),
        details=f"Gasto registrado para vehículo ID {gasto_data.id_producto}: {gasto_data.monto}"
    )
    
    # RE-FETCH después de la auditoría para evitar MissingGreenlet (commit expira objetos)
    result = await session.execute(
        select(GastoProducto).options(joinedload(GastoProducto.tipo_gasto)).where(GastoProducto.id_gasto_producto == new_gasto.id_gasto_producto)
    )
    return result.scalar_one()

@router.get("/vehiculos/{id_producto}/gastos", response_model=List[GastoProductoResponse])
async def list_gastos_por_vehiculo(id_producto: int, session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(GastoProducto)
        .options(joinedload(GastoProducto.tipo_gasto))
        .where(GastoProducto.id_producto == id_producto)
    )
    return result.scalars().all()

@router.put("/gastos/{gasto_id}", response_model=GastoProductoResponse)
async def update_gasto_vehiculo(
    gasto_id: int,
    data: GastoProductoCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    # Obtener el gasto existente
    result = await session.execute(select(GastoProducto).where(GastoProducto.id_gasto_producto == gasto_id))
    gasto = result.scalar_one_or_none()
    
    if not gasto:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")
    
    # Guardar datos antiguos para auditoría
    old_data = {
        "id_producto": gasto.id_producto,
        "id_tipo_gasto": gasto.id_tipo_gasto,
        "descripcion": gasto.descripcion,
        "monto": float(gasto.monto),
        "fecha_gasto": gasto.fecha_gasto.isoformat() if gasto.fecha_gasto else None,
        "proveedor": gasto.proveedor,
        "numero_factura": gasto.numero_factura
    }
    
    # Actualizar campos
    for field, value in data.dict(exclude_none=True).items():
        setattr(gasto, field, value)
    
    await session.commit()
    await session.refresh(gasto)
    
    # Convertir Decimals a float y fechas a string para auditoría
    new_data_for_audit = data.dict(exclude_none=True)
    if 'monto' in new_data_for_audit:
        new_data_for_audit['monto'] = float(new_data_for_audit['monto'])
    if 'fecha_gasto' in new_data_for_audit and new_data_for_audit['fecha_gasto']:
        if hasattr(new_data_for_audit['fecha_gasto'], 'isoformat'):
            new_data_for_audit['fecha_gasto'] = new_data_for_audit['fecha_gasto'].isoformat()
        else:
            new_data_for_audit['fecha_gasto'] = str(new_data_for_audit['fecha_gasto'])
    
    # Auditoría
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="update",
        table="gastos_productos",
        record_id=gasto_id,
        previous_data=old_data,
        new_data=new_data_for_audit,
        details=f"Gasto de vehículo actualizado: {data.monto} - {data.descripcion}"
    )
    
    # RE-FETCH después de la auditoría para evitar MissingGreenlet
    result = await session.execute(
        select(GastoProducto).options(joinedload(GastoProducto.tipo_gasto)).where(GastoProducto.id_gasto_producto == gasto_id)
    )
    return result.scalar_one()

@router.delete("/gastos/{gasto_id}")
async def delete_gasto_vehiculo(
    gasto_id: int,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    result = await session.execute(select(GastoProducto).where(GastoProducto.id_gasto_producto == gasto_id))
    gasto = result.scalar_one_or_none()
    
    if not gasto:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")
    
    # Guardar datos para auditoría
    old_data = {
        "id_producto": gasto.id_producto,
        "id_tipo_gasto": gasto.id_tipo_gasto,
        "descripcion": gasto.descripcion,
        "monto": float(gasto.monto),
        "fecha_gasto": gasto.fecha_gasto.isoformat() if gasto.fecha_gasto else None,
        "proveedor": gasto.proveedor,
        "numero_factura": gasto.numero_factura
    }
    
    # Auditoría
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="delete",
        table="gastos_productos",
        record_id=gasto_id,
        previous_data=old_data,
        details=f"Gasto de vehículo eliminado: {gasto.monto} - {gasto.descripcion}"
    )
    
    await session.delete(gasto)
    await session.commit()
    
    return {"message": "Gasto eliminado correctamente"}


@router.get("/vehiculos/{id_producto}/costo-total")
async def get_costo_total_vehiculo(id_producto: int, session: AsyncSession = Depends(get_session)):
    # Obtener costo base
    res_v = await session.execute(select(Producto.costo_base).where(Producto.id_producto == id_producto))
    costo_base = res_v.scalar_one_or_none() or 0
    
    # Obtener suma de gastos
    res_g = await session.execute(
        select(func.sum(GastoProducto.monto)).where(GastoProducto.id_producto == id_producto)
    )
    total_gastos = res_g.scalar_one() or 0
    
    return {
        "id_producto": id_producto,
        "costo_base": costo_base,
        "total_gastos": total_gastos,
        "costo_final": costo_base + total_gastos
    }

# ===== GASTOS DE EMPRESA (ADMINISTRATIVOS) =====
@router.get("/tipos-gastos-empresa", response_model=List[TipoGastoEmpresaResponse])
async def list_tipos_gastos_empresa(
    todo: bool = False,
    session: AsyncSession = Depends(get_session)
):
    query = select(TipoGastoEmpresa)
    if not todo:
        query = query.where(TipoGastoEmpresa.activo == True)
    
    result = await session.execute(query)
    return result.scalars().all()

@router.post("/tipos-gastos-empresa", response_model=TipoGastoEmpresaResponse)
async def create_tipo_gasto_empresa(
    data: TipoGastoEmpresaCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    # Verificar duplicado
    res = await session.execute(select(TipoGastoEmpresa).where(TipoGastoEmpresa.nombre == data.nombre))
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"El concepto '{data.nombre}' ya existe en los gastos operativos.")

    new_tipo = TipoGastoEmpresa(**data.dict())
    session.add(new_tipo)
    await session.commit()
    await session.refresh(new_tipo)

    # Auditoría
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="create",
        table="tipos_gastos_empresa",
        record_id=new_tipo.id_tipo_gasto_empresa,
        new_data=data.dict(exclude_none=True),
        details=f"Nuevo tipo de gasto empresa creado: {new_tipo.nombre}"
    )

    return new_tipo

@router.put("/tipos-gastos-empresa/{id_tipo_gasto_empresa}", response_model=TipoGastoEmpresaResponse)
async def update_tipo_gasto_empresa(
    id_tipo_gasto_empresa: int,
    data: TipoGastoEmpresaCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    result = await session.execute(select(TipoGastoEmpresa).where(TipoGastoEmpresa.id_tipo_gasto_empresa == id_tipo_gasto_empresa))
    tipo = result.scalar_one_or_none()
    
    if not tipo:
        raise HTTPException(status_code=404, detail="Concepto de gasto no encontrado")

    if tipo.nombre != data.nombre:
        res = await session.execute(select(TipoGastoEmpresa).where(TipoGastoEmpresa.nombre == data.nombre))
        if res.scalar_one_or_none():
            raise HTTPException(status_code=400, detail=f"El concepto '{data.nombre}' ya existe.")

    old_data = {
        "nombre": tipo.nombre,
        "descripcion": tipo.descripcion,
        "es_fijo": tipo.es_fijo,
        "activo": tipo.activo
    }

    tipo.nombre = data.nombre
    tipo.descripcion = data.descripcion
    tipo.es_fijo = data.es_fijo
    tipo.activo = data.activo
    
    await session.commit()
    await session.refresh(tipo)

    # Auditoría
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="update",
        table="tipos_gastos_empresa",
        record_id=id_tipo_gasto_empresa,
        previous_data=old_data,
        new_data=data.dict(exclude_none=True),
        details=f"Tipo de gasto empresa actualizado: {tipo.nombre}"
    )

    return tipo

@router.delete("/tipos-gastos-empresa/{id_tipo_gasto_empresa}")
async def delete_tipo_gasto_empresa(
    id_tipo_gasto_empresa: int,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    result = await session.execute(select(TipoGastoEmpresa).where(TipoGastoEmpresa.id_tipo_gasto_empresa == id_tipo_gasto_empresa))
    tipo = result.scalar_one_or_none()
    
    if not tipo:
        raise HTTPException(status_code=404, detail="Concepto de gasto no encontrado")
        
    uso = await session.execute(select(GastoEmpresa).where(GastoEmpresa.id_tipo_gasto_empresa == id_tipo_gasto_empresa).limit(1))
    if uso.first():
         raise HTTPException(status_code=400, detail="No se puede eliminar porque existen gastos asociados a este concepto.")

    old_data = {
        "nombre": tipo.nombre,
        "descripcion": tipo.descripcion,
        "es_fijo": tipo.es_fijo,
        "activo": tipo.activo
    }

    await session.delete(tipo)
    await session.commit()

    # Auditoría
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="delete",
        table="tipos_gastos_empresa",
        record_id=id_tipo_gasto_empresa,
        previous_data=old_data,
        details=f"Tipo de gasto empresa eliminado: {tipo.nombre}"
    )

    return {"message": "Concepto eliminado correctamente"}

@router.get("/gastos-empresa", response_model=List[GastoEmpresaResponse])
async def list_gastos_empresa(session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(GastoEmpresa).options(joinedload(GastoEmpresa.tipo_gasto)).order_by(GastoEmpresa.fecha_gasto.desc())
    )
    return result.scalars().all()

@router.post("/gastos-empresa", response_model=GastoEmpresaResponse)
async def create_gasto_empresa(
    data: GastoEmpresaCreate, 
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    new_gasto = GastoEmpresa(**data.dict())
    session.add(new_gasto)
    await session.commit()
    await session.refresh(new_gasto)
    
    # Cargar la relación tipo_gasto para evitar error de lazy loading
    result = await session.execute(
        select(GastoEmpresa).options(joinedload(GastoEmpresa.tipo_gasto)).where(GastoEmpresa.id_gasto_empresa == new_gasto.id_gasto_empresa)
    )
    gasto_with_tipo = result.scalar_one()
    
    # Auditoría
    # Convertir Decimals a float y fechas a string para auditoría
    new_data_for_audit = data.dict(exclude_none=True)
    if 'monto' in new_data_for_audit:
        new_data_for_audit['monto'] = float(new_data_for_audit['monto'])
    # Convertir Decimals a float y fechas a string para auditoría
    new_data_for_audit = data.dict(exclude_none=True)
    if 'monto' in new_data_for_audit:
        new_data_for_audit['monto'] = float(new_data_for_audit['monto'])
    if 'fecha_gasto' in new_data_for_audit and new_data_for_audit['fecha_gasto']:
        if hasattr(new_data_for_audit['fecha_gasto'], 'isoformat'):
            new_data_for_audit['fecha_gasto'] = new_data_for_audit['fecha_gasto'].isoformat()
        else:
            new_data_for_audit['fecha_gasto'] = str(new_data_for_audit['fecha_gasto'])
    # Auditoría
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="create",
        table="gastos_empresa",
        record_id=new_gasto.id_gasto_empresa,
        new_data=data.dict(exclude_none=True),
        details=f"Gasto de empresa registrado: {data.monto} - {data.descripcion}"
    )
    
    # RE-FETCH
    result = await session.execute(
        select(GastoEmpresa).options(joinedload(GastoEmpresa.tipo_gasto)).where(GastoEmpresa.id_gasto_empresa == new_gasto.id_gasto_empresa)
    )
    return result.scalar_one()

@router.put("/gastos-empresa/{gasto_id}", response_model=GastoEmpresaResponse)
async def update_gasto_empresa(
    gasto_id: int,
    data: GastoEmpresaCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    # Obtener el gasto existente
    result = await session.execute(select(GastoEmpresa).where(GastoEmpresa.id_gasto_empresa == gasto_id))
    gasto = result.scalar_one_or_none()
    
    if not gasto:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")
    
    # Guardar datos antiguos para auditoría
    old_data = {
        "id_tipo_gasto_empresa": gasto.id_tipo_gasto_empresa,
        "descripcion": gasto.descripcion,
        "monto": float(gasto.monto),
        "fecha_gasto": gasto.fecha_gasto.isoformat() if gasto.fecha_gasto else None,
        "proveedor": gasto.proveedor,
        "numero_factura": gasto.numero_factura
    }
    
    # Actualizar campos
    for field, value in data.dict(exclude_none=True).items():
        setattr(gasto, field, value)
    
    await session.commit()
    await session.refresh(gasto)
    
    # Convertir Decimals a float y fechas a string para auditoría
    new_data_for_audit = data.dict(exclude_none=True)
    if 'monto' in new_data_for_audit:
        new_data_for_audit['monto'] = float(new_data_for_audit['monto'])
    if 'fecha_gasto' in new_data_for_audit and new_data_for_audit['fecha_gasto']:
        if hasattr(new_data_for_audit['fecha_gasto'], 'isoformat'):
            new_data_for_audit['fecha_gasto'] = new_data_for_audit['fecha_gasto'].isoformat()
        else:
            new_data_for_audit['fecha_gasto'] = str(new_data_for_audit['fecha_gasto'])
    
    # Auditoría (antes de cargar relaciones para evitar error de lazy loading)
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="update",
        table="gastos_empresa",
        record_id=gasto_id,
        previous_data=old_data,
        new_data=new_data_for_audit,
        details=f"Gasto de empresa actualizado: {data.monto} - {data.descripcion}"
    )
    
    # RE-FETCH
    result = await session.execute(
        select(GastoEmpresa).options(joinedload(GastoEmpresa.tipo_gasto)).where(GastoEmpresa.id_gasto_empresa == gasto_id)
    )
    return result.scalar_one()

@router.delete("/gastos-empresa/{gasto_id}")
async def delete_gasto_empresa(
    gasto_id: int,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    result = await session.execute(select(GastoEmpresa).where(GastoEmpresa.id_gasto_empresa == gasto_id))
    gasto = result.scalar_one_or_none()
    
    if not gasto:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")
    
    # Guardar datos para auditoría
    old_data = {
        "id_tipo_gasto_empresa": gasto.id_tipo_gasto_empresa,
        "descripcion": gasto.descripcion,
        "monto": float(gasto.monto),
        "fecha_gasto": gasto.fecha_gasto.isoformat() if gasto.fecha_gasto else None,
        "proveedor": gasto.proveedor,
        "numero_factura": gasto.numero_factura
    }
    
    # Auditoría (antes de eliminar para evitar error de lazy loading)
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="delete",
        table="gastos_empresa",
        record_id=gasto_id,
        previous_data=old_data,
        details=f"Gasto de empresa eliminado: {gasto.monto} - {gasto.descripcion}"
    )
    
    await session.delete(gasto)
    await session.commit()
    
    return {"message": "Gasto eliminado correctamente"}


# ===== DASHBOARD FINANCIERO =====
@router.get("/dashboard/stats")
async def get_dashboard_stats(session: AsyncSession = Depends(get_session)):
    # 1. Valor del Stock (Vehículos Disponibles)
    # Costo base de disponibles
    res_stock_base = await session.execute(
        select(func.sum(Producto.costo_base)).where(Producto.estado_disponibilidad == 'DISPONIBLE')
    )
    stock_base = res_stock_base.scalar_one() or 0
    
    # Gastos de vehículos disponibles
    res_stock_gastos = await session.execute(
        select(func.sum(GastoProducto.monto))
        .join(Producto, GastoProducto.id_producto == Producto.id_producto)
        .where(Producto.estado_disponibilidad == 'DISPONIBLE')
    )
    stock_gastos = res_stock_gastos.scalar_one() or 0
    
    valor_stock = stock_base + stock_gastos

    # 2. Cartera Pendiente (Pagarés no cobrados)
    res_cartera = await session.execute(
        select(func.sum(Pagare.saldo_pendiente))
        .join(Venta, Pagare.id_venta == Venta.id_venta)
        .where(and_(
            Pagare.estado.in_(['PENDIENTE', 'VENCIDO', 'PARCIAL']), 
            Venta.estado_venta != 'ANULADA'
        ))
    )
    cartera_pendiente = res_cartera.scalar_one() or 0

    # 2b. Cartera en Mora (Pagarés vencidos)
    hoy_date = date.today()
    res_mora = await session.execute(
        select(func.sum(Pagare.saldo_pendiente))
        .join(Venta, Pagare.id_venta == Venta.id_venta)
        .where(and_(
            Pagare.estado.in_(['PENDIENTE', 'VENCIDO', 'PARCIAL']), 
            or_(Pagare.estado == 'VENCIDO', Pagare.fecha_vencimiento < hoy_date),
            Venta.estado_venta != 'ANULADA'
        ))
    )
    cartera_mora = res_mora.scalar_one() or 0

    # 3. Ventas y Utilidad Proyectada (De vehículos vendidos)
    res_ventas = await session.execute(
        select(func.sum(Venta.precio_final)).where(Venta.estado_venta != 'ANULADA')
    )
    total_ventas = res_ventas.scalar_one() or 0
    
    # Para la utilidad: (Precio Venta Final) - (Costo Base + Gastos) de esos vehículos vendidos
    res_costo_vendidos = await session.execute(
        select(func.sum(Producto.costo_base))
        .join(Venta, Venta.id_producto == Producto.id_producto)
        .where(Venta.estado_venta != 'ANULADA')
    )
    costo_base_vendidos = res_costo_vendidos.scalar_one() or 0
    
    res_gastos_vendidos = await session.execute(
        select(func.sum(GastoProducto.monto))
        .join(Producto, GastoProducto.id_producto == Producto.id_producto)
        .join(Venta, Venta.id_producto == Producto.id_producto)
        .where(Venta.estado_venta != 'ANULADA')
    )
    gastos_totales_vendidos = res_gastos_vendidos.scalar_one() or 0
    
    utilidad_proyectada = total_ventas - (costo_base_vendidos + gastos_totales_vendidos)

    # 4. Conteos rápidos
    res_cont_disp = await session.execute(select(func.count(Producto.id_producto)).where(Producto.estado_disponibilidad == 'DISPONIBLE'))
    cant_disponibles = res_cont_disp.scalar_one() or 0
    
    res_cont_vend = await session.execute(select(func.count(Venta.id_venta)).where(Venta.estado_venta != 'ANULADA'))
    cant_vendidos = res_cont_vend.scalar_one() or 0

    # 5. Gastos de Empresa (Alquiler, personal, etc)
    res_gastos_emp = await session.execute(select(func.sum(GastoEmpresa.monto)))
    total_gastos_empresa = res_gastos_emp.scalar_one() or 0

    # --- REPORTES DETALLADOS PARA GRÁFICOS ---
    
    # 6. Ventas Mensuales (Últimos 6 meses)
    res_mes = await session.execute(
        select(
            func.date_trunc('month', Venta.fecha_venta).label('mes'),
            func.sum(Venta.precio_final).label('total')
        ).where(Venta.estado_venta != 'ANULADA')
        .group_by(text('mes'))
        .order_by(text('mes'))
    )
    ventas_mensuales = [
        {"mes": row.mes.strftime('%b %Y') if row.mes else 'N/A', "total": float(row.total)} 
        for row in res_mes.all()
    ][-6:] # Tomamos los últimos 6

    # 7. Ventas por Categoría
    res_cat = await session.execute(
        select(
            CategoriaVehiculo.nombre,
            func.sum(Venta.precio_final).label('total'),
            func.count(Venta.id_venta).label('cantidad')
        ).join(Producto, Venta.id_producto == Producto.id_producto)
        .join(CategoriaVehiculo, Producto.id_categoria == CategoriaVehiculo.id_categoria)
        .where(Venta.estado_venta != 'ANULADA')
        .group_by(CategoriaVehiculo.nombre)
    )
    ventas_por_categoria = [
        {"nombre": row.nombre, "total": float(row.total), "cantidad": row.cantidad} 
        for row in res_cat.all()
    ]

    # 8. Cartera por Vencimiento (Envejecimiento)
    aging_case = case(
        (Pagare.fecha_vencimiento >= hoy_date, 'A_DIA'),
        (Pagare.fecha_vencimiento >= hoy_date - timedelta(days=30), 'B_1_30'),
        (Pagare.fecha_vencimiento >= hoy_date - timedelta(days=60), 'C_31_60'),
        else_='D_61_MAS'
    )
    
    res_venc = await session.execute(
        select(
            aging_case.label('rango_key'),
            func.sum(Pagare.saldo_pendiente).label('total')
        ).join(Venta, Pagare.id_venta == Venta.id_venta)
        .where(and_(
            Pagare.estado.in_(['PENDIENTE', 'VENCIDO', 'PARCIAL']), 
            Venta.estado_venta != 'ANULADA'
        ))
        .group_by(aging_case)
    )
    
    # Mapeo de keys a etiquetas legibles
    label_map = {
        'A_DIA': 'Al día',
        'B_1_30': '1-30 días',
        'C_31_60': '31-60 días',
        'D_61_MAS': '61+ días'
    }
    
    db_results = {row.rango_key: float(row.total) for row in res_venc.all()}
    cartera_por_vencimiento = {label: db_results.get(key, 0.0) for key, label in label_map.items()}

    # 9. Gastos por Tipo
    res_gastos_tipo = await session.execute(
        select(
            TipoGastoEmpresa.nombre,
            func.sum(GastoEmpresa.monto).label('total')
        ).join(GastoEmpresa, TipoGastoEmpresa.id_tipo_gasto_empresa == GastoEmpresa.id_tipo_gasto_empresa)
        .group_by(TipoGastoEmpresa.nombre)
    )
    gastos_por_tipo = [
        {"nombre": row.nombre, "total": float(row.total)} 
        for row in res_gastos_tipo.all()
    ]

    return {
        "valor_stock_actual": valor_stock,
        "cartera_pendiente": cartera_pendiente,
        "cartera_mora": cartera_mora,
        "total_ventas_acumuladas": total_ventas,
        "utilidad_proyectada": utilidad_proyectada,
        "total_gastos_empresa": total_gastos_empresa,
        "cant_disponibles": cant_disponibles,
        "cant_vendidos": cant_vendidos,
        "ventas_mensuales": ventas_mensuales,
        "ventas_por_categoria": ventas_por_categoria,
        "cartera_por_vencimiento": cartera_por_vencimiento,
        "gastos_por_tipo": gastos_por_tipo
    }


# ===== GASTOS FILTRADOS PARA DASHBOARD =====
@router.get("/dashboard/gastos-filtrados")
async def get_gastos_filtrados(
    tipo_gasto: Optional[str] = None,  # 'empresa', 'vehiculo', 'ambos'
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    session: AsyncSession = Depends(get_session)
):
    """
    Obtiene gastos filtrados por tipo (empresa, vehículo, ambos) y rango de fechas.
    tipo_gasto: 'empresa', 'vehiculo', 'ambos' o None (ambos por defecto)
    fecha_desde y fecha_hasta: formato 'YYYY-MM-DD'
    """
    # Parsear fechas si se proporcionan
    fecha_desde_obj = None
    fecha_hasta_obj = None
    if fecha_desde:
        try:
            fecha_desde_obj = datetime.strptime(fecha_desde, '%Y-%m-%d').date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Formato de fecha_desde inválido. Use YYYY-MM-DD")
    if fecha_hasta:
        try:
            fecha_hasta_obj = datetime.strptime(fecha_hasta, '%Y-%m-%d').date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Formato de fecha_hasta inválido. Use YYYY-MM-DD")
    
    # Si no se especifica tipo, por defecto ambos
    if tipo_gasto is None:
        tipo_gasto = 'ambos'
    
    gastos_empresa = []
    gastos_vehiculo = []
    total_empresa = 0
    total_vehiculo = 0
    
    # Gastos de Empresa
    detalles_empresa = []
    if tipo_gasto in ['empresa', 'ambos']:
        # Query para totales agrupados por tipo
        query_empresa = select(
            TipoGastoEmpresa.nombre,
            func.sum(GastoEmpresa.monto).label('total')
        ).join(GastoEmpresa, TipoGastoEmpresa.id_tipo_gasto_empresa == GastoEmpresa.id_tipo_gasto_empresa)
        
        # Aplicar filtro de fechas si existe
        condiciones_fecha_empresa = []
        if fecha_desde_obj:
            condiciones_fecha_empresa.append(GastoEmpresa.fecha_gasto >= fecha_desde_obj)
        if fecha_hasta_obj:
            condiciones_fecha_empresa.append(GastoEmpresa.fecha_gasto <= fecha_hasta_obj)
        if condiciones_fecha_empresa:
            query_empresa = query_empresa.where(and_(*condiciones_fecha_empresa))
        
        query_empresa = query_empresa.group_by(TipoGastoEmpresa.nombre)
        
        res_empresa = await session.execute(query_empresa)
        gastos_empresa = [
            {"nombre": row.nombre, "total": float(row.total), "tipo": "empresa"}
            for row in res_empresa.all()
        ]
        
        # Query para detalles individuales
        query_detalles_empresa = select(
            TipoGastoEmpresa.nombre.label('tipo_nombre'),
            GastoEmpresa.fecha_gasto,
            GastoEmpresa.descripcion,
            GastoEmpresa.monto
        ).join(TipoGastoEmpresa, TipoGastoEmpresa.id_tipo_gasto_empresa == GastoEmpresa.id_tipo_gasto_empresa)
        
        if condiciones_fecha_empresa:
            query_detalles_empresa = query_detalles_empresa.where(and_(*condiciones_fecha_empresa))
        
        query_detalles_empresa = query_detalles_empresa.order_by(GastoEmpresa.fecha_gasto.desc(), TipoGastoEmpresa.nombre)
        
        res_detalles_empresa = await session.execute(query_detalles_empresa)
        detalles_empresa = [
            {
                "tipo_nombre": row.tipo_nombre,
                "fecha_gasto": row.fecha_gasto.isoformat() if row.fecha_gasto else None,
                "descripcion": row.descripcion or "",
                "monto": float(row.monto),
                "tipo": "empresa"
            }
            for row in res_detalles_empresa.all()
        ]
        
        # Total de gastos de empresa
        query_total_empresa = select(func.sum(GastoEmpresa.monto))
        if condiciones_fecha_empresa:
            query_total_empresa = query_total_empresa.where(and_(*condiciones_fecha_empresa))
        res_total_empresa = await session.execute(query_total_empresa)
        total_empresa = float(res_total_empresa.scalar_one() or 0)
    
    # Gastos de Vehículo
    detalles_vehiculo = []
    if tipo_gasto in ['vehiculo', 'ambos']:
        # Query para totales agrupados por tipo
        query_vehiculo = select(
            TipoGastoProducto.nombre,
            func.sum(GastoProducto.monto).label('total')
        ).join(GastoProducto, TipoGastoProducto.id_tipo_gasto == GastoProducto.id_tipo_gasto)
        
        # Aplicar filtro de fechas si existe
        condiciones_fecha_vehiculo = []
        if fecha_desde_obj:
            condiciones_fecha_vehiculo.append(GastoProducto.fecha_gasto >= fecha_desde_obj)
        if fecha_hasta_obj:
            condiciones_fecha_vehiculo.append(GastoProducto.fecha_gasto <= fecha_hasta_obj)
        if condiciones_fecha_vehiculo:
            query_vehiculo = query_vehiculo.where(and_(*condiciones_fecha_vehiculo))
        
        query_vehiculo = query_vehiculo.group_by(TipoGastoProducto.nombre)
        
        res_vehiculo = await session.execute(query_vehiculo)
        gastos_vehiculo = [
            {"nombre": row.nombre, "total": float(row.total), "tipo": "vehiculo"}
            for row in res_vehiculo.all()
        ]
        
        # Query para detalles individuales
        query_detalles_vehiculo = select(
            TipoGastoProducto.nombre.label('tipo_nombre'),
            GastoProducto.fecha_gasto,
            GastoProducto.descripcion,
            GastoProducto.monto
        ).join(TipoGastoProducto, TipoGastoProducto.id_tipo_gasto == GastoProducto.id_tipo_gasto)
        
        if condiciones_fecha_vehiculo:
            query_detalles_vehiculo = query_detalles_vehiculo.where(and_(*condiciones_fecha_vehiculo))
        
        query_detalles_vehiculo = query_detalles_vehiculo.order_by(GastoProducto.fecha_gasto.desc(), TipoGastoProducto.nombre)
        
        res_detalles_vehiculo = await session.execute(query_detalles_vehiculo)
        detalles_vehiculo = [
            {
                "tipo_nombre": row.tipo_nombre,
                "fecha_gasto": row.fecha_gasto.isoformat() if row.fecha_gasto else None,
                "descripcion": row.descripcion or "",
                "monto": float(row.monto),
                "tipo": "vehiculo"
            }
            for row in res_detalles_vehiculo.all()
        ]
        
        # Total de gastos de vehículo
        query_total_vehiculo = select(func.sum(GastoProducto.monto))
        if condiciones_fecha_vehiculo:
            query_total_vehiculo = query_total_vehiculo.where(and_(*condiciones_fecha_vehiculo))
        res_total_vehiculo = await session.execute(query_total_vehiculo)
        total_vehiculo = float(res_total_vehiculo.scalar_one() or 0)
    
    # Combinar ambos tipos de gastos
    gastos_combinados = gastos_empresa + gastos_vehiculo
    total_general = total_empresa + total_vehiculo
    detalles_combinados = detalles_empresa + detalles_vehiculo
    
    return {
        "gastos": gastos_combinados,
        "gastos_empresa": gastos_empresa,
        "gastos_vehiculo": gastos_vehiculo,
        "detalles_empresa": detalles_empresa,
        "detalles_vehiculo": detalles_vehiculo,
        "detalles": detalles_combinados,
        "total_empresa": total_empresa,
        "total_vehiculo": total_vehiculo,
        "total_general": total_general,
        "filtros_aplicados": {
            "tipo_gasto": tipo_gasto,
            "fecha_desde": fecha_desde,
            "fecha_hasta": fecha_hasta
        }
    }


# ===== VENTAS FILTRADAS PARA DASHBOARD =====
@router.get("/dashboard/ventas-filtradas")
async def get_ventas_filtradas(
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    session: AsyncSession = Depends(get_session)
):
    """
    Obtiene el total de ingresos filtrados por rango de fechas, incluyendo:
    - Ventas realizadas en el período
    - Entregas iniciales de ventas realizadas en el período
    - Cobros de pagarés realizados en el período
    fecha_desde y fecha_hasta: formato 'YYYY-MM-DD'
    """
    # Parsear fechas si se proporcionan
    fecha_desde_obj = None
    fecha_hasta_obj = None
    if fecha_desde:
        try:
            fecha_desde_obj = datetime.strptime(fecha_desde, '%Y-%m-%d').date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Formato de fecha_desde inválido. Use YYYY-MM-DD")
    if fecha_hasta:
        try:
            fecha_hasta_obj = datetime.strptime(fecha_hasta, '%Y-%m-%d').date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Formato de fecha_hasta inválido. Use YYYY-MM-DD")
    
    # 1. VENTAS REALIZADAS EN EL PERÍODO (precio_final)
    condiciones_ventas = [Venta.estado_venta != 'ANULADA']
    if fecha_desde_obj:
        condiciones_ventas.append(Venta.fecha_venta >= fecha_desde_obj)
    if fecha_hasta_obj:
        condiciones_ventas.append(Venta.fecha_venta <= fecha_hasta_obj)
    
    query_ventas = select(func.sum(Venta.precio_final)).where(and_(*condiciones_ventas))
    res_ventas = await session.execute(query_ventas)
    total_ventas = float(res_ventas.scalar_one() or 0)
    
    # 2. ENTREGAS INICIALES DE VENTAS REALIZADAS EN EL PERÍODO
    query_entregas = select(func.sum(Venta.entrega_inicial)).where(and_(*condiciones_ventas))
    res_entregas = await session.execute(query_entregas)
    total_entregas_iniciales = float(res_entregas.scalar_one() or 0)
    
    # Contar cantidad de ventas
    query_cantidad = select(func.count(Venta.id_venta)).where(and_(*condiciones_ventas))
    res_cantidad = await session.execute(query_cantidad)
    cantidad_ventas = int(res_cantidad.scalar_one() or 0)
    
    # 3. COBROS DE PAGARÉS REALIZADOS EN EL PERÍODO (fecha_pago)
    condiciones_pagos = []
    if fecha_desde_obj:
        condiciones_pagos.append(Pago.fecha_pago >= fecha_desde_obj)
    if fecha_hasta_obj:
        condiciones_pagos.append(Pago.fecha_pago <= fecha_hasta_obj)
    
    # Solo contar pagos de ventas no anuladas
    if condiciones_pagos:
        query_cobros = select(func.sum(Pago.monto_pagado)).join(
            Venta, Pago.id_venta == Venta.id_venta
        ).where(and_(
            Venta.estado_venta != 'ANULADA',
            *condiciones_pagos
        ))
    else:
        query_cobros = select(func.sum(Pago.monto_pagado)).join(
            Venta, Pago.id_venta == Venta.id_venta
        ).where(Venta.estado_venta != 'ANULADA')
    
    res_cobros = await session.execute(query_cobros)
    total_cobros_pagares = float(res_cobros.scalar_one() or 0)
    
    # Contar cantidad de pagos
    if condiciones_pagos:
        query_cantidad_pagos = select(func.count(Pago.id_pago)).join(
            Venta, Pago.id_venta == Venta.id_venta
        ).where(and_(
            Venta.estado_venta != 'ANULADA',
            *condiciones_pagos
        ))
    else:
        query_cantidad_pagos = select(func.count(Pago.id_pago)).join(
            Venta, Pago.id_venta == Venta.id_venta
        ).where(Venta.estado_venta != 'ANULADA')
    
    res_cantidad_pagos = await session.execute(query_cantidad_pagos)
    cantidad_pagos = int(res_cantidad_pagos.scalar_one() or 0)
    
    # Total de ingresos = Ventas + Cobros de pagarés
    # Nota: Las entregas iniciales ya están incluidas en precio_final, pero las mostramos por separado
    # para claridad. Los cobros de pagarés son adicionales.
    total_ingresos = total_ventas + total_cobros_pagares
    
    return {
        "total_ventas": total_ventas,
        "total_entregas_iniciales": total_entregas_iniciales,
        "total_cobros_pagares": total_cobros_pagares,
        "total_ingresos": total_ingresos,
        "cantidad_ventas": cantidad_ventas,
        "cantidad_pagos": cantidad_pagos,
        "filtros_aplicados": {
            "fecha_desde": fecha_desde,
            "fecha_hasta": fecha_hasta
        }
    }





