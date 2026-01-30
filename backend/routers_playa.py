from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import join, and_, func
from sqlalchemy.orm import joinedload
from typing import List
from datetime import date, timedelta
from database import get_session
from models_playa import CategoriaVehiculo, Producto, Cliente, Venta, Pagare, Pago, TipoGastoProducto, GastoProducto, TipoGastoEmpresa, GastoEmpresa, ConfigCalificacion
from schemas_playa import (
    CategoriaVehiculoCreate, CategoriaVehiculoResponse,
    ProductoCreate, ProductoUpdate, ProductoResponse,
    ClienteCreate, ClienteResponse,
    VentaCreate, VentaResponse,
    PagoCreate, PagoResponse,
    TipoGastoProductoCreate, TipoGastoProductoResponse, GastoProductoCreate, GastoProductoResponse,
    TipoGastoEmpresaCreate, TipoGastoEmpresaResponse, GastoEmpresaCreate, GastoEmpresaResponse,
    ConfigCalificacionCreate, ConfigCalificacionResponse
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

# ===== VENTAS Y PAGARÉS =====
@router.get("/ventas", response_model=List[VentaResponse])
async def list_ventas(session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(Venta)
        .options(joinedload(Venta.pagares))
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
    new_venta = Venta(**venta_data.dict())
    session.add(new_venta)
    await session.flush() # Para obtener el ID de la venta

    # 3. Marcar vehículo como VENDIDO
    vehiculo.estado_disponibilidad = 'VENDIDO'
    
    # 4. Generar Pagarés si es FINANCIADO
    if venta_data.tipo_venta == 'FINANCIADO' and venta_data.cantidad_cuotas > 0:
        hoy = date.today()
        for i in range(1, venta_data.cantidad_cuotas + 1):
            # Vencimiento: mismo día del mes siguiente
            # Lógica simple: +30 días por cuota
            vencimiento = hoy + timedelta(days=30 * i)
            
            nuevo_pagare = Pagare(
                id_venta=new_venta.id_venta,
                numero_pagare=f"{new_venta.numero_venta}-{i}",
                numero_cuota=i,
                monto_cuota=venta_data.monto_cuota,
                fecha_vencimiento=vencimiento,
                tipo_pagare='CUOTA',
                estado='PENDIENTE',
                saldo_pendiente=venta_data.monto_cuota
            )
            session.add(nuevo_pagare)

    await session.commit()
    await session.refresh(new_venta)
    
    # Cargar la relación pagares para evitar error de lazy loading
    result = await session.execute(
        select(Venta).options(joinedload(Venta.pagares)).where(Venta.id_venta == new_venta.id_venta)
    )
    venta_with_pagares = result.scalar_one()
    
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
        record_id=venta_with_pagares.id_venta,
        new_data=new_data_for_audit,
        details=f"Venta registrada: {venta_with_pagares.numero_venta} - {venta_with_pagares.tipo_venta} - Vehículo ID {venta_data.id_producto}"
    )
    
    return venta_with_pagares

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
     if venta.producto:
         venta.producto.estado_disponibilidad = 'DISPONIBLE'

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

     # Recargar con relaciones para respuesta
     result = await session.execute(
         select(Venta).options(joinedload(Venta.pagares)).where(Venta.id_venta == venta_id)
     )
     venta_for_response = result.unique().scalar_one()
     return venta_for_response

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

    for field, value in venta_data.model_dump(exclude_none=True).items():
        setattr(venta, field, value)

    pagares_eliminados = 0
    for pagare in (venta.pagares or []):
        await session.delete(pagare)
        pagares_eliminados += 1

    pagares_generados = 0
    if venta_data.tipo_venta == 'FINANCIADO' and (venta_data.cantidad_cuotas or 0) > 0:
        base_date = venta_data.fecha_venta or date.today()
        for i in range(1, venta_data.cantidad_cuotas + 1):
            vencimiento = base_date + timedelta(days=30 * i)
            nuevo_pagare = Pagare(
                id_venta=venta.id_venta,
                numero_pagare=f"{venta.numero_venta}-{i}",
                numero_cuota=i,
                monto_cuota=venta_data.monto_cuota,
                fecha_vencimiento=vencimiento,
                tipo_pagare='CUOTA',
                estado='PENDIENTE',
                saldo_pendiente=venta_data.monto_cuota
            )
            session.add(nuevo_pagare)
            pagares_generados += 1

    await session.commit()

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

    result = await session.execute(
        select(Venta).options(joinedload(Venta.pagares)).where(Venta.id_venta == venta_id)
    )
    venta_for_response = result.unique().scalar_one()
    return venta_for_response

@router.get("/pagares/pendientes")
async def list_pagares_pendientes(session: AsyncSession = Depends(get_session)):
    # Traer pagarés pendientes con info de cliente y vehículo
    query = select(Pagare, Venta, Cliente, Producto).join(Venta, Pagare.id_venta == Venta.id_venta).join(Cliente, Venta.id_cliente == Cliente.id_cliente).join(Producto, Venta.id_producto == Producto.id_producto).where(Pagare.estado == 'PENDIENTE').order_by(Pagare.fecha_vencimiento)
    
    result = await session.execute(query)
    data = []
    for p, v, c, prod in result.all():
        data.append({
            "id_pagare": p.id_pagare,
            "id_venta": v.id_venta,
            "numero_cuota": p.numero_cuota,
            "monto_cuota": p.monto_cuota,
            "fecha_vencimiento": p.fecha_vencimiento,
            "cliente": f"{c.nombre} {c.apellido}",
            "vehiculo": f"{prod.marca} {prod.modelo}",
            "numero_documento": c.numero_documento
        })
    return data

@router.post("/pagos", response_model=PagoResponse)
async def create_pago(
    pago_data: PagoCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    # 1. Obtener el pagaré y validarlo
    res_p = await session.execute(select(Pagare).where(Pagare.id_pagare == pago_data.id_pagare))
    pagare = res_p.scalar_one_or_none()
    
    if not pagare or pagare.estado == 'PAGADO':
        raise HTTPException(status_code=400, detail="El pagaré no existe o ya ha sido pagado")

    # 2. Calcular atraso
    atraso = 0
    if pago_data.fecha_pago > pagare.fecha_vencimiento:
        atraso = (pago_data.fecha_pago - pagare.fecha_vencimiento).days

    # 3. Registrar el pago
    new_pago = Pago(
        **pago_data.dict(),
        dias_atraso=atraso,
        mora_aplicada=0 # Por ahora simple, se podría calcular mora según parámetros
    )
    session.add(new_pago)
    
    # 4. Actualizar estado del pagaré
    pagare.estado = 'PAGADO'
    pagare.saldo_pendiente = 0
    
    # 5. TODO: Lógica para actualizar calificación del cliente (HistorialCalificacion)
    
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
        details=f"Cobro registrado: Recibo {new_pago.numero_recibo} - Cuota {pagare.numero_cuota} Venta {pago_data.id_venta}"
    )
    
    return new_pago

# ===== GASTOS DE VEHÍCULOS =====
@router.get("/tipos-gastos", response_model=List[TipoGastoProductoResponse])
async def list_tipos_gastos(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(TipoGastoProducto).where(TipoGastoProducto.activo == True))
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
    return new_tipo


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
        record_id=gasto_with_tipo.id_gasto_producto,
        new_data=gasto_data.dict(exclude_none=True),
        details=f"Gasto registrado para vehículo ID {gasto_data.id_producto}: {gasto_data.monto}"
    )
    
    return gasto_with_tipo

@router.get("/vehiculos/{id_producto}/gastos", response_model=List[GastoProductoResponse])
async def list_gastos_por_vehiculo(id_producto: int, session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(GastoProducto)
        .options(joinedload(GastoProducto.tipo_gasto))
        .where(GastoProducto.id_producto == id_producto)
    )
    return result.scalars().all()

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
async def list_tipos_gastos_empresa(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(TipoGastoEmpresa).where(TipoGastoEmpresa.activo == True))
    return result.scalars().all()

@router.post("/tipos-gastos-empresa", response_model=TipoGastoEmpresaResponse)
async def create_tipo_gasto_empresa(data: TipoGastoEmpresaCreate, session: AsyncSession = Depends(get_session)):
    # Verificar duplicado
    res = await session.execute(select(TipoGastoEmpresa).where(TipoGastoEmpresa.nombre == data.nombre))
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"El concepto '{data.nombre}' ya existe en los gastos operativos.")

    new_tipo = TipoGastoEmpresa(**data.dict())
    session.add(new_tipo)
    await session.commit()
    await session.refresh(new_tipo)
    return new_tipo

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
    if 'fecha_gasto' in new_data_for_audit and new_data_for_audit['fecha_gasto']:
        if hasattr(new_data_for_audit['fecha_gasto'], 'isoformat'):
            new_data_for_audit['fecha_gasto'] = new_data_for_audit['fecha_gasto'].isoformat()
        else:
            new_data_for_audit['fecha_gasto'] = str(new_data_for_audit['fecha_gasto'])
    
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="create",
        table="gastos_empresa",
        record_id=gasto_with_tipo.id_gasto_empresa,
        new_data=new_data_for_audit,
        details=f"Gasto de empresa registrado: {data.monto} - {data.descripcion}"
    )
    
    return gasto_with_tipo

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
    
    # Cargar la relación tipo_gasto
    result = await session.execute(
        select(GastoEmpresa).options(joinedload(GastoEmpresa.tipo_gasto)).where(GastoEmpresa.id_gasto_empresa == gasto_id)
    )
    updated_gasto = result.scalar_one()
    
    return updated_gasto

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
        select(func.sum(Pagare.saldo_pendiente)).where(Pagare.estado == 'PENDIENTE')
    )
    cartera_pendiente = res_cartera.scalar_one() or 0

    # 2b. Cartera en Mora (Pagarés vencidos)
    hoy = date.today()
    res_mora = await session.execute(
        select(func.sum(Pagare.saldo_pendiente))
        .where(and_(Pagare.estado == 'PENDIENTE', Pagare.fecha_vencimiento < hoy))
    )
    cartera_mora = res_mora.scalar_one() or 0

    # 3. Ventas y Utilidad Proyectada (De vehículos vendidos)
    res_ventas = await session.execute(
        select(func.sum(Venta.precio_final)).where(Venta.estado_venta == 'ACTIVA')
    )
    total_ventas = res_ventas.scalar_one() or 0
    
    # Para la utilidad: (Precio Venta Final) - (Costo Base + Gastos) de esos vehículos vendidos
    res_costo_vendidos = await session.execute(
        select(func.sum(Producto.costo_base))
        .join(Venta, Venta.id_producto == Producto.id_producto)
    )
    costo_base_vendidos = res_costo_vendidos.scalar_one() or 0
    
    res_gastos_vendidos = await session.execute(
        select(func.sum(GastoProducto.monto))
        .join(Producto, GastoProducto.id_producto == Producto.id_producto)
        .join(Venta, Venta.id_producto == Producto.id_producto)
    )
    gastos_totales_vendidos = res_gastos_vendidos.scalar_one() or 0
    
    utilidad_proyectada = total_ventas - (costo_base_vendidos + gastos_totales_vendidos)

    # 4. Conteos rápidos
    res_cont_disp = await session.execute(select(func.count(Producto.id_producto)).where(Producto.estado_disponibilidad == 'DISPONIBLE'))
    cant_disponibles = res_cont_disp.scalar_one() or 0
    
    res_cont_vend = await session.execute(select(func.count(Venta.id_venta)))
    cant_vendidos = res_cont_vend.scalar_one() or 0

    # 5. Gastos de Empresa (Alquiler, personal, etc)
    res_gastos_emp = await session.execute(select(func.sum(GastoEmpresa.monto)))
    total_gastos_empresa = res_gastos_emp.scalar_one() or 0

    return {
        "valor_stock_actual": valor_stock,
        "cartera_pendiente": cartera_pendiente,
        "cartera_mora": cartera_mora,
        "total_ventas_acumuladas": total_ventas,
        "utilidad_proyectada": utilidad_proyectada,
        "total_gastos_empresa": total_gastos_empresa,
        "cant_disponibles": cant_disponibles,
        "cant_vendidos": cant_vendidos
    }





