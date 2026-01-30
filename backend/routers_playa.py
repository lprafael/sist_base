from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import join, and_, func
from sqlalchemy.orm import joinedload
from typing import List
from datetime import date, timedelta
from database import get_session
from models_playa import CategoriaVehiculo, Producto, Cliente, Venta, Pagare, Pago, TipoGastoProducto, GastoProducto, TipoGastoEmpresa, GastoEmpresa
from schemas_playa import (
    CategoriaVehiculoCreate, CategoriaVehiculoResponse,
    ProductoCreate, ProductoUpdate, ProductoResponse,
    ClienteCreate, ClienteResponse,
    VentaCreate, VentaResponse,
    PagoCreate, PagoResponse,
    TipoGastoProductoCreate, TipoGastoProductoResponse, GastoProductoCreate, GastoProductoResponse,
    TipoGastoEmpresaCreate, TipoGastoEmpresaResponse, GastoEmpresaCreate, GastoEmpresaResponse
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
    # Verificar si ya existe
    res = await session.execute(select(CategoriaVehiculo).where(CategoriaVehiculo.nombre == categoria_data.nombre))
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"La categoría '{categoria_data.nombre}' ya existe.")

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
        
    new_cliente = Cliente(**cliente_data.dict())
    session.add(new_cliente)
    await session.commit()
    await session.refresh(new_cliente)
    
    return new_cliente

# ===== VENTAS Y PAGARÉS =====
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
    return new_venta

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
    
    return new_gasto

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
async def create_gasto_empresa(data: GastoEmpresaCreate, session: AsyncSession = Depends(get_session)):
    new_gasto = GastoEmpresa(**data.dict())
    session.add(new_gasto)
    await session.commit()
    await session.refresh(new_gasto)
    return new_gasto


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





