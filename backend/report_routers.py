from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case, text, or_, and_, not_
from database import get_session
from typing import List, Optional
from datetime import date, datetime, timedelta
from pydantic import BaseModel

# Import necessary models
from models_playa import (
    Venta,
    DetalleVenta,
    Cliente,
    Producto,
    Pagare,
    ConfigCalificacion,
    Vendedor,
    Estado,
    Cuenta,
    Pago,
    Movimiento,
    GastoProducto,
    GastoEmpresa,
    TipoGastoProducto,
    TipoGastoEmpresa
)
from security import get_current_user

router = APIRouter()

# --- Schemas ---

class ClienteMoraResponse(BaseModel):
    cliente_id: int
    cliente_nombre: str
    cliente_ruc: str
    cliente_telefono: Optional[str] = None
    vehiculo_info: str
    cantidad_cuotas: int
    dias_atraso: int
    total_deuda: float

class CuotaMoraDetalle(BaseModel):
    cliente_id: int
    cliente_nombre: str
    cliente_ruc: str
    cliente_telefono: Optional[str] = None
    id_venta: int
    numero_cuota: int
    cantidad_cuotas_total: int # Para el formato 12/24
    fecha_vencimiento: date
    monto_cuota: float
    saldo_pendiente: float
    saldo_total_venta: float # Saldo dinámico descendente
    dias_mora: int
    interes_mora: float
    total_pago: float

class VentaReporteResponse(BaseModel):
    id_venta: int
    numero_venta: str
    fecha_venta: date
    tipo_venta: str
    vehiculo_descripcion: str
    chasis: Optional[str] = None
    cliente_nombre: str
    precio_final: float
    entrega_inicial: float
    vendedor_nombre: Optional[str] = None
    comision: float = 0

class StockDisponibleResponse(BaseModel):
    id_producto: int
    marca: str
    modelo: str
    año: Optional[int] = None
    color: Optional[str] = None
    chasis: Optional[str] = None
    motor: Optional[str] = None
    precio_contado_sugerido: Optional[float] = None
    precio_financiado_sugerido: Optional[float] = None
    entrega_inicial_sugerida: Optional[float] = None
    ubicacion_actual: Optional[str] = None
    dias_en_stock: int
    costo_final: float = 0

class MovimientoCuentaResponse(BaseModel):
    fecha: datetime
    concepto: str
    referencia: Optional[str] = None
    tipo: str # 'INGRESO', 'EGRESO'
    monto: float
    saldo_acumulado: float = 0

class ResumenCuenta(BaseModel):
    id_cuenta: int
    nombre: str
    saldo_anterior: float
    ingresos: float
    egresos: float
    saldo_final: float

class ReporteExtractoResponse(BaseModel):
    cuenta_nombre: str
    saldo_anterior: float
    movimientos: List[MovimientoCuentaResponse]
    saldo_final: float
    resumen_cuentas: List[ResumenCuenta] = []

class MovimientoDetalladoResponse(BaseModel):
    fecha: datetime
    concepto: str
    referencia: Optional[str] = None
    id_cuenta: int
    cuenta_nom: str
    
    # Ingresos desglosados
    ingreso_entrega: float = 0
    ingreso_cuota: float = 0
    ingreso_interes: float = 0
    ingreso_otros: float = 0
    
    # Egresos desglosados
    egreso_vehiculo: float = 0
    egreso_empresa: float = 0
    egreso_otros: float = 0
    
    monto_total: float = 0
    tipo: str # 'INGRESO', 'EGRESO'

class ReporteMovimientoDetalladoResponse(BaseModel):
    movimientos: List[MovimientoDetalladoResponse]
    totales: dict

# --- Endpoints ---

# ID del tipo de gasto que representa comisión por venta
ID_TIPO_GASTO_COMISION = 13

@router.get("/playa/reportes/ventas", response_model=List[VentaReporteResponse])
async def get_reporte_ventas(
    desde: Optional[date] = Query(None),
    hasta: Optional[date] = Query(None),
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Obtiene el listado de ventas realizadas en un rango determinado.
    La columna 'comision' muestra la suma de gastos de tipo 'Comisión por venta'
    (id_tipo_gasto=13) registrados para el vehículo de cada venta.
    """
    date_from = desde or date(2020, 1, 1)
    date_to = hasta or date.today()

    # Subquery: suma de gastos de tipo comisión por producto
    subq_comision = (
        select(
            GastoProducto.id_producto,
            func.sum(GastoProducto.monto).label('total_comision')
        )
        .where(GastoProducto.id_tipo_gasto == ID_TIPO_GASTO_COMISION)
        .group_by(GastoProducto.id_producto)
        .subquery()
    )

    query = (
        select(
            Venta.id_venta,
            Venta.numero_venta,
            Venta.fecha_venta,
            Venta.tipo_venta,
            Venta.precio_final,
            Venta.entrega_inicial,
            Producto.marca,
            Producto.modelo,
            Producto.año,
            Producto.chasis,
            Producto.color,
            Producto.motor,
            Cliente.nombre,
            Cliente.apellido,
            Vendedor.nombre.label('vend_nom'),
            Vendedor.apellido.label('vend_ape'),
            func.coalesce(subq_comision.c.total_comision, 0).label('comision')
        )
        .join(Producto, Venta.id_producto == Producto.id_producto)
        .join(Cliente, Venta.id_cliente == Cliente.id_cliente)
        .outerjoin(Vendedor, Venta.id_vendedor == Vendedor.id_vendedor)
        .outerjoin(subq_comision, Producto.id_producto == subq_comision.c.id_producto)
        .where(Venta.fecha_venta >= date_from)
        .where(Venta.fecha_venta <= date_to)
        .order_by(Venta.fecha_venta.desc())
    )

    result = await session.execute(query)
    rows = result.all()

    reporte = []
    for r in rows:
        reporte.append({
            "id_venta": r.id_venta,
            "numero_venta": r.numero_venta,
            "fecha_venta": r.fecha_venta,
            "tipo_venta": r.tipo_venta,
            "vehiculo_descripcion": f"{r.marca} {r.modelo} Color: {r.color or ''} Año: {r.año or ''} Motor: {r.motor or ''}",
            "chasis": r.chasis,
            "cliente_nombre": f"{r.nombre} {r.apellido}",
            "precio_final": float(r.precio_final),
            "entrega_inicial": float(r.entrega_inicial or 0),
            "vendedor_nombre": f"{r.vend_nom} {r.vend_ape}" if r.vend_nom else "Sin asignar",
            "comision": float(r.comision or 0)
        })

    return reporte

@router.get("/playa/reportes/clientes-mora", response_model=List[ClienteMoraResponse])
async def get_clientes_en_mora(
    desde: Optional[date] = Query(None),
    hasta: Optional[date] = Query(None),
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Obtiene el listado de clientes que tienen cuotas vencidas en un rango determinado.
    """
    date_from = desde or date(2020, 1, 1)
    date_to = hasta or date.today()
    
    query = (
        select(
            Cliente.id_cliente,
            Cliente.nombre,
            Cliente.apellido,
            Cliente.numero_documento.label('ruc'),
            Cliente.telefono,
            Producto.marca,
            Producto.modelo,
            Producto.año,
            Producto.chasis,
            func.count(Pagare.id_pagare).label('cantidad_cuotas'),
            func.min(Pagare.fecha_vencimiento).label('fecha_mas_antigua'),
            func.sum(Pagare.saldo_pendiente).label('total_deuda')
        )
        .join(Venta, Cliente.id_cliente == Venta.id_cliente)
        .join(Producto, Venta.id_producto == Producto.id_producto)
        .join(Pagare, Venta.id_venta == Pagare.id_venta)
        .join(Estado, Pagare.id_estado == Estado.id_estado)
        .where(Estado.nombre != 'PAGADO')
        .where(Pagare.fecha_vencimiento >= date_from)
        .where(Pagare.fecha_vencimiento <= date_to)
        .group_by(
            Cliente.id_cliente,
            Cliente.nombre,
            Cliente.apellido,
            Cliente.numero_documento,
            Cliente.telefono,
            Producto.marca,
            Producto.modelo,
            Producto.año,
            Producto.chasis
        )
        .order_by(func.min(Pagare.fecha_vencimiento))
    )

    result = await session.execute(query)
    rows = result.all()

    reporte = []
    for row in rows:
        today = date.today()
        dias_atraso = (today - (row.fecha_mas_antigua or today)).days
        
        reporte.append({
            "cliente_id": row.id_cliente,
            "cliente_nombre": f"{row.nombre} {row.apellido}",
            "cliente_ruc": row.ruc,
            "cliente_telefono": row.telefono,
            "vehiculo_info": f"{row.marca or ''} {row.modelo or ''} ({row.año or ''})",
            "cantidad_cuotas": row.cantidad_cuotas or 0,
            "dias_atraso": max(0, dias_atraso),
            "total_deuda": float(row.total_deuda or 0)
        })

    return reporte

@router.get("/playa/reportes/cuotas-mora-detalle", response_model=List[CuotaMoraDetalle])
async def get_cuotas_mora_detalle(
    desde: Optional[date] = Query(None),
    hasta: Optional[date] = Query(None),
    orden: str = Query('cliente'), # 'cliente', 'dias_mora' o 'vencimiento'
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Obtiene el listado detallado de cuotas vencidas en un rango (formato para impresión).
    """
    date_from = desde or date(2020, 1, 1)
    date_to = hasta or date.today()
    
    # 1. Obtener los IDs de las ventas que tienen mora en este rango
    ventas_con_mora_res = await session.execute(
        select(Pagare.id_venta)
        .join(Estado, Pagare.id_estado == Estado.id_estado)
        .where(Estado.nombre != 'PAGADO')
        .where(Pagare.fecha_vencimiento >= date_from)
        .where(Pagare.fecha_vencimiento <= date_to)
        .distinct()
    )
    ventas_ids = [v[0] for v in ventas_con_mora_res.all() if v[0] is not None]
    
    if not ventas_ids:
        return []

    # 2. Traer TODAS las cuotas pendientes de esas ventas
    order_criteria = []
    if orden == 'dias_mora':
        # Ordenar por fecha de vencimiento más antigua (más días de mora)
        order_criteria = [Pagare.fecha_vencimiento.asc(), Cliente.nombre.asc(), Pagare.numero_cuota.asc()]
    elif orden == 'vencimiento':
        # Ordenar por fecha de vencimiento (más reciente primero o según se prefiera, usaremos asc para coherencia con mora)
        order_criteria = [Pagare.fecha_vencimiento.asc(), Cliente.nombre.asc()]
    else:
        # Por defecto: Cliente (Alfabético)
        order_criteria = [Cliente.nombre.asc(), Cliente.apellido.asc(), Pagare.id_venta.asc(), Pagare.numero_cuota.asc()]

    query_all_pending = (
        select(
            Pagare.id_venta,
            Pagare.numero_cuota,
            Pagare.monto_cuota,
            Pagare.saldo_pendiente,
            Pagare.fecha_vencimiento,
            Pagare.tipo_pagare,
            Estado.nombre.label('estado'),
            Venta.cantidad_cuotas,
            Venta.cantidad_refuerzos,
            Venta.monto_int_mora,
            Venta.periodo_int_mora,
            Venta.dias_gracia,
            Cliente.id_cliente,
            Cliente.nombre,
            Cliente.apellido,
            Cliente.numero_documento.label('ruc'),
            Cliente.telefono
        )
        .join(Venta, Pagare.id_venta == Venta.id_venta)
        .join(Cliente, Venta.id_cliente == Cliente.id_cliente)
        .join(Estado, Pagare.id_estado == Estado.id_estado)
        .where(Pagare.id_venta.in_(ventas_ids))
        .where(Estado.nombre != 'PAGADO')
        .order_by(*order_criteria)
    )
    
    result = await session.execute(query_all_pending)
    all_pending_rows = result.all()
    
    # Organizar por venta
    ventas_data = {}
    for row in all_pending_rows:
        vid = row.id_venta
        if vid not in ventas_data:
            ventas_data[vid] = []
        ventas_data[vid].append(row)
    
    reporte = []
    for vid in ventas_data:
        rows_venta = ventas_data[vid]
        # Calcular el saldo total inicial de la venta (suma de todos los pendientes)
        saldo_total_inicial = sum(float(r.saldo_pendiente or 0) for r in rows_venta)
        
        running_balance = saldo_total_inicial
        
        # Diccionario para cachear conteos reales si la venta tiene data en 0
        real_counts = {}

        for row in rows_venta:
            # Solo incluimos en el reporte las que están en mora según el rango
            is_in_mora = (row.fecha_vencimiento >= date_from and row.fecha_vencimiento <= date_to)
            
            # El saldo actual para esta fila es el balance antes de pagar esta cuota
            current_row_balance = running_balance
            
            # Restamos el saldo de esta cuota para la siguiente fila
            running_balance -= float(row.saldo_pendiente or 0)
            
            if is_in_mora:
                today = date.today()
                dias_mora = (today - row.fecha_vencimiento).days
                monto_s = float(row.saldo_pendiente or 0)
                
                # Nueva lógica de interés fijo por periodo
                interes = 0
                dias_gracia = row.dias_gracia or 0
                
                if dias_mora > dias_gracia:
                    monto_mora_fijo = float(row.monto_int_mora or 0)
                    periodo = row.periodo_int_mora or 'D'
                    
                    # Calcular cantidad de periodos transcurridos
                    cant_periodos = 0
                    if periodo == 'D':
                        cant_periodos = dias_mora
                    elif periodo == 'S':
                        cant_periodos = dias_mora // 7
                    elif periodo == 'M':
                        cant_periodos = dias_mora // 30
                    elif periodo == 'A':
                        cant_periodos = dias_mora // 365
                    
                    interes = cant_periodos * monto_mora_fijo
                
                # Determinar el total de cuotas según el tipo
                tipo = row.tipo_pagare
                total_quincena = 0
                if tipo == 'CUOTA':
                    total_quincena = row.cantidad_cuotas or 0
                elif tipo == 'REFUERZO':
                    total_quincena = row.cantidad_refuerzos or 0
                
                # Si sigue siendo 0 (data inconsistente), hacemos un fallback contando los pagarés reales
                if total_quincena == 0:
                    if tipo not in real_counts:
                        # Fetch count of pagares of this type for this sale
                        q_count = select(func.count(Pagare.id_pagare)).where(
                            Pagare.id_venta == row.id_venta,
                            Pagare.tipo_pagare == tipo
                        )
                        res_count = await session.execute(q_count)
                        real_counts[tipo] = res_count.scalar() or 0
                    total_quincena = real_counts[tipo]

                reporte.append({
                    "cliente_id": row.id_cliente,
                    "cliente_nombre": f"{row.nombre} {row.apellido}",
                    "cliente_ruc": row.ruc,
                    "cliente_telefono": row.telefono,
                    "id_venta": row.id_venta,
                    "numero_cuota": row.numero_cuota or 0,
                    "cantidad_cuotas_total": total_quincena,
                    "fecha_vencimiento": row.fecha_vencimiento,
                    "monto_cuota": float(row.monto_cuota or 0),
                    "saldo_pendiente": monto_s,
                    "saldo_total_venta": current_row_balance,
                    "dias_mora": max(0, dias_mora),
                    "interes_mora": interes,
                    "total_pago": monto_s + interes
                })
        
    # 4. Reordenar el reporte final según el criterio solicitado
    # El agrupamiento previo por venta es necesario para el saldo_total_venta, 
    # pero el usuario espera un orden global en la tabla.
    if orden == 'dias_mora' or orden == 'vencimiento':
        reporte.sort(key=lambda x: (x['fecha_vencimiento'], x['cliente_nombre']))
    elif orden == 'cliente':
        reporte.sort(key=lambda x: (x['cliente_nombre'], x['fecha_vencimiento']))

    return reporte
@router.post("/playa/reportes/recalcular-mora")
async def recalcular_mora_clientes(
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Analiza todos los pagarés y pagos para actualizar la mora acumulada 
    y la calificación actual de cada cliente.
    """
    today = date.today()
    
    # 1. Obtener todas las configuraciones de calificación ordenadas por días (desde menor a mayor)
    res_conf = await session.execute(
        select(ConfigCalificacion)
        .where(ConfigCalificacion.activo == True)
        .order_by(ConfigCalificacion.dias_atraso_desde.asc())
    )
    configs = res_conf.scalars().all()
    
    # 2. Obtener resumen de mora real (Pagarés con saldo > 0 y fecha vencida)
    # También traemos la fecha mas antigua para calcular dias de atraso
    query_mora = (
        select(
            Cliente.id_cliente,
            func.sum(case((Pagare.fecha_vencimiento < today, Pagare.saldo_pendiente), else_=0)).label('mora_vencida'),
            func.min(case((Pagare.fecha_vencimiento < today, Pagare.fecha_vencimiento), else_=None)).label('fecha_vencida_antigua')
        )
        .join(Venta, Cliente.id_cliente == Venta.id_cliente)
        .join(Pagare, Venta.id_venta == Pagare.id_venta)
        .join(Estado, Pagare.id_estado == Estado.id_estado)
        .where(Estado.nombre.in_(['PENDIENTE', 'PARCIAL', 'VENCIDO']))
        .where(Pagare.saldo_pendiente > 0)
        .group_by(Cliente.id_cliente)
    )
    
    res_mora = await session.execute(query_mora)
    mora_data = {row.id_cliente: row for row in res_mora.all()}
    
    # 3. Obtener IDs de clientes que tienen al menos una venta (para distinguir de 'NUEVO')
    res_ventas = await session.execute(select(Venta.id_cliente).distinct())
    clientes_con_ventas = {v_id for v_id in res_ventas.scalars().all()}
    
    # 4. Obtener todos los clientes para actualizar
    res_clientes = await session.execute(select(Cliente).where(Cliente.activo == True))
    clientes = res_clientes.scalars().all()
    
    actualizados = 0
    for cliente in clientes:
        data = mora_data.get(cliente.id_cliente)
        
        nueva_mora = 0
        dias_max_atraso = 0
        
        if data and data.mora_vencida and data.mora_vencida > 0:
            nueva_mora = float(data.mora_vencida)
            if data.fecha_vencida_antigua:
                dias_max_atraso = (today - data.fecha_vencida_antigua).days
        
        # Lógica de Calificación
        nueva_calif = 'NUEVO'
        if dias_max_atraso > 0:
            # Buscar en la configuración en qué rango cae
            for conf in configs:
                desde = conf.dias_atraso_desde
                hasta = conf.dias_atraso_hasta if conf.dias_atraso_hasta is not None else 999999
                if desde <= dias_max_atraso <= hasta:
                    nueva_calif = conf.calificacion
                    break
        elif cliente.id_cliente in clientes_con_ventas:
            # Tiene ventas pero no mora vencida
            nueva_calif = 'EXCELENTE'
            
        # Actualizar base de datos si hubo cambios
        if cliente.mora_acumulada != nueva_mora or cliente.calificacion_actual != nueva_calif:
            cliente.mora_acumulada = nueva_mora
            cliente.calificacion_actual = nueva_calif
            actualizados += 1
            
    await session.commit()
    
    return {
        "status": "success",
        "message": f"Se sincronizaron {actualizados} clientes.",
        "pago_mas_atrasado_hoy": today.isoformat()
    }
@router.get("/playa/reportes/stock-disponible", response_model=List[StockDisponibleResponse])
async def get_reporte_stock_disponible(
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Obtiene el stock de vehículos disponibles con su entrega inicial sugerida y costo total.
    """
    # Subquery para sumar gastos por producto
    from models_playa import GastoProducto
    subq_gastos = (
        select(
            GastoProducto.id_producto,
            func.sum(GastoProducto.monto).label("total_gastos")
        )
        .group_by(GastoProducto.id_producto)
        .subquery()
    )

    query = (
        select(
            Producto,
            func.coalesce(subq_gastos.c.total_gastos, 0).label("total_gastos")
        )
        .outerjoin(subq_gastos, Producto.id_producto == subq_gastos.c.id_producto)
        .where(Producto.estado_disponibilidad == 'DISPONIBLE')
        .where(or_(Producto.activo == True, Producto.activo.is_(None)))
        .order_by(Producto.marca, Producto.modelo)
    )
    
    result = await session.execute(query)
    rows = result.all()
    
    reporte = []
    today = date.today()
    
    for p, total_gastos in rows:
        dias_stock = 0
        if p.fecha_ingreso:
            dias_stock = (today - p.fecha_ingreso).days
            
        reporte.append({
            "id_producto": p.id_producto,
            "marca": p.marca if p.marca is not None else "",
            "modelo": p.modelo if p.modelo is not None else "",
            "año": getattr(p, 'año', None),
            "color": p.color if p.color else None,
            "chasis": p.chasis if p.chasis is not None else "",
            "precio_contado_sugerido": float(p.precio_contado_sugerido) if p.precio_contado_sugerido is not None else None,
            "precio_financiado_sugerido": float(p.precio_financiado_sugerido) if p.precio_financiado_sugerido is not None else None,
            "entrega_inicial_sugerida": float(p.entrega_inicial_sugerida) if p.entrega_inicial_sugerida is not None else None,
            "ubicacion_actual": p.ubicacion_actual if p.ubicacion_actual else None,
            "dias_en_stock": dias_stock,
            "costo_final": float((p.costo_base or 0) + total_gastos)
        })
        
    return reporte

@router.get("/playa/reportes/extracto-cuenta", response_model=ReporteExtractoResponse)
async def get_reporte_extracto_cuenta(
    id_cuentas: List[int] = Query(...),
    desde: Optional[date] = Query(None),
    hasta: Optional[date] = Query(None),
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Genera un extracto de movimientos (pagos y transferencias) para una o varias cuentas específicas.
    """
    date_from = desde or date(2020, 1, 1)
    date_to = hasta or date.today()
    datetime_from = datetime.combine(date_from, datetime.min.time())
    datetime_to = datetime.combine(date_to, datetime.max.time())

    # 1. Obtener información de las cuentas
    res_ctas = await session.execute(select(Cuenta).where(Cuenta.id_cuenta.in_(id_cuentas)))
    cuentas = res_ctas.scalars().all()
    if not cuentas:
        raise HTTPException(status_code=404, detail="Cuentas no encontradas")
    
    cuenta_nombres = ", ".join([c.nombre for c in cuentas])
    if len(cuentas) > 3:
        cuenta_nombres = f"{len(cuentas)} cuentas seleccionadas"

    # 2. Obtener Saldos Anteriores (antes de la fecha 'desde')
    # Sumar pagos (Capital + Interés)
    q_pagos_ant = select(func.sum(Pago.monto_pagado + func.coalesce(Pago.mora_aplicada, 0))).where(Pago.id_cuenta.in_(id_cuentas)).where(Pago.fecha_pago < date_from)
    res_pagos_ant = await session.execute(q_pagos_ant)
    pagos_ant = float(res_pagos_ant.scalar() or 0)

    # Sumar movimientos destino (Entregas a las cuentas seleccionadas)
    # IMPORTANTE: Excluir movimientos que ya son pagos (referencia PAGO-*) para evitar doble suma
    q_mov_in_ant = (
        select(func.sum(Movimiento.monto))
        .where(Movimiento.id_cuenta_destino.in_(id_cuentas))
        .where(Movimiento.fecha < datetime_from)
        .where(or_(
            Movimiento.referencia.is_(None),
            and_(
                not_(Movimiento.referencia.like('PAGO-%')),
                not_(Movimiento.referencia.in_(['Gasto Empresa', 'Gasto Vehículo']))
            )
        ))
    )
    res_mov_in_ant = await session.execute(q_mov_in_ant)
    mov_in_ant = float(res_mov_in_ant.scalar() or 0)

    # Movimientos que salen de alguna de estas cuentas
    # IMPORTANTE: Excluir gastos que se sumarán por separado (Gasto Empresa / Producto)
    q_mov_out_ant = (
        select(func.sum(Movimiento.monto))
        .where(Movimiento.id_cuenta_origen.in_(id_cuentas))
        .where(Movimiento.fecha < datetime_from)
        .where(or_(
            Movimiento.referencia.is_(None),
            and_(
                not_(Movimiento.referencia.like('PAGO-%')),
                not_(Movimiento.referencia.in_(['Gasto Empresa', 'Gasto Vehículo']))
            )
        ))
    )
    res_mov_out_ant = await session.execute(q_mov_out_ant)
    mov_out_ant = float(res_mov_out_ant.scalar() or 0)

    # Gastos de producto anteriores
    q_gastos_prod_ant = (
        select(func.sum(GastoProducto.monto))
        .where(GastoProducto.id_cuenta.in_(id_cuentas))
        .where(GastoProducto.fecha_gasto < date_from)
    )
    res_gastos_prod_ant = await session.execute(q_gastos_prod_ant)
    gastos_prod_ant = float(res_gastos_prod_ant.scalar() or 0)

    # Gastos de empresa anteriores
    q_gastos_emp_ant = (
        select(func.sum(GastoEmpresa.monto))
        .where(GastoEmpresa.id_cuenta.in_(id_cuentas))
        .where(GastoEmpresa.fecha_gasto < date_from)
    )
    res_gastos_emp_ant = await session.execute(q_gastos_emp_ant)
    gastos_emp_ant = float(res_gastos_emp_ant.scalar() or 0)

    saldo_anterior = pagos_ant + mov_in_ant - mov_out_ant - gastos_prod_ant - gastos_emp_ant

    # 3. Obtener Movimientos del periodo
    # Pagos (Ingresos) - Unimos con Pagare para saber el tipo (CUOTA, ENTREGA, REFUERZO)
    q_pagos = (
        select(
            Pago, 
            Cliente.nombre, 
            Cliente.apellido, 
            Cuenta.nombre.label('cuenta_nom'), 
            Pagare.tipo_pagare,
            Pagare.numero_cuota,
            Venta.cantidad_cuotas,
            Venta.cantidad_refuerzos
        )
        .join(Venta, Pago.id_venta == Venta.id_venta)
        .join(Cliente, Venta.id_cliente == Cliente.id_cliente)
        .join(Cuenta, Pago.id_cuenta == Cuenta.id_cuenta)
        .join(Pagare, Pago.id_pagare == Pagare.id_pagare)
        .where(Pago.id_cuenta.in_(id_cuentas))
        .where(Pago.fecha_pago >= date_from)
        .where(Pago.fecha_pago <= date_to)
    )
    res_pagos = await session.execute(q_pagos)
    movs_pydantic = []
    for p, nom, ape, cta_nom, tipo_pg, num_c, tot_c, tot_r in res_pagos.all():
        # Traducir tipo_pagare
        ref_text = "Entrega"
        info_cuota = ""
        if tipo_pg == 'ENTREGA_CONTADO':
            ref_text = "Entrega Contado"
        elif tipo_pg in ['ENTREGA', 'ENTREGA_INICIAL']: 
            ref_text = "Entrega Inicial"
        elif tipo_pg == 'CUOTA': 
            ref_text = "Cuota"
            info_cuota = f" {num_c}/{tot_c}"
        elif tipo_pg == 'REFUERZO': 
            ref_text = "Refuerzo"
            info_cuota = f" {num_c}/{tot_r}"
        
        capital = float(p.monto_pagado)
        interes = float(p.mora_aplicada or 0)
        total = capital + interes
        
        # Determinar prefijo (Cobro o Venta)
        prefijo = "Venta:" if "Entrega" in ref_text else "Cobro"
        
        concepto = f"[{cta_nom}] {prefijo} {ref_text}{info_cuota} - Cliente: {nom} {ape}"
        if interes > 0:
            concepto += f" (Cap: {int(capital):,} + Int: {int(interes):,})".replace(",", ".")
        
        movs_pydantic.append({
            "fecha": datetime.combine(p.fecha_pago, datetime.min.time()),
            "concepto": concepto,
            "referencia": ref_text,
            "tipo": "INGRESO",
            "monto": total,
            "monto_capital": capital,
            "monto_interes": interes,
            "id_cuenta": p.id_cuenta
        })

    # Movimientos del periodo
    # Entregas a alguna cuenta del grupo (Excluyendo PAGO-* y Gastos)
    q_mov_in = (
        select(Movimiento, Cuenta.nombre.label('cta_dest_nom'), Cuenta.id_cuenta.label('cta_dest_id'))
        .join(Cuenta, Movimiento.id_cuenta_destino == Cuenta.id_cuenta)
        .where(Movimiento.id_cuenta_destino.in_(id_cuentas))
        .where(Movimiento.fecha >= datetime_from)
        .where(Movimiento.fecha <= datetime_to)
        .where(or_(
            Movimiento.referencia.is_(None),
            and_(
                not_(Movimiento.referencia.like('PAGO-%')),
                not_(Movimiento.referencia.in_(['Gasto Empresa', 'Gasto Vehículo']))
            )
        ))
    )
    res_mov_in = await session.execute(q_mov_in)
    for m, cta_dest_nom, cta_dest_id in res_mov_in.all():
        is_internal = m.id_cuenta_origen in id_cuentas
        
        movs_pydantic.append({
            "fecha": m.fecha,
            "concepto": f"[{cta_dest_nom}] {m.concepto or 'Transferencia Recibida'}",
            "referencia": "Transf. Interna" if is_internal else "Ingreso Externo",
            "tipo": "INGRESO",
            "monto": float(m.monto),
            "id_cuenta": cta_dest_id
        })

    # Salidas de alguna de estas cuentas (Excluyendo PAGO-* y Gastos)
    q_mov_out = (
        select(Movimiento, Cuenta.nombre.label('cta_orig_nom'), Cuenta.id_cuenta.label('cta_orig_id'))
        .join(Cuenta, Movimiento.id_cuenta_origen == Cuenta.id_cuenta)
        .where(Movimiento.id_cuenta_origen.in_(id_cuentas))
        .where(Movimiento.fecha >= datetime_from)
        .where(Movimiento.fecha <= datetime_to)
        .where(or_(
            Movimiento.referencia.is_(None),
            and_(
                not_(Movimiento.referencia.like('PAGO-%')),
                not_(Movimiento.referencia.in_(['Gasto Empresa', 'Gasto Vehículo']))
            )
        ))
    )
    
    # NUEVO: Incluir gastos registrados directamente en las tablas de gastos que tengan id_cuenta
    q_gastos_prod = (
        select(GastoProducto, TipoGastoProducto.nombre.label('tipo_nom'), Producto.marca, Producto.modelo, Producto.chasis)
        .join(TipoGastoProducto, GastoProducto.id_tipo_gasto == TipoGastoProducto.id_tipo_gasto)
        .join(Producto, GastoProducto.id_producto == Producto.id_producto)
        .where(GastoProducto.id_cuenta.in_(id_cuentas))
        .where(GastoProducto.fecha_gasto >= date_from)
        .where(GastoProducto.fecha_gasto <= date_to)
    )
    
    q_gastos_emp = (
        select(GastoEmpresa, TipoGastoEmpresa.nombre.label('tipo_nom'))
        .join(TipoGastoEmpresa, GastoEmpresa.id_tipo_gasto_empresa == TipoGastoEmpresa.id_tipo_gasto_empresa)
        .where(GastoEmpresa.id_cuenta.in_(id_cuentas))
        .where(GastoEmpresa.fecha_gasto >= date_from)
        .where(GastoEmpresa.fecha_gasto <= date_to)
    )
    res_mov_out = await session.execute(q_mov_out)
    res_gastos_prod = await session.execute(q_gastos_prod)
    res_gastos_emp = await session.execute(q_gastos_emp)
    
    for m, cta_orig_nom, cta_orig_id in res_mov_out.all():
        is_internal = m.id_cuenta_destino in id_cuentas
        
        # Clasificación de Gastos por palabras clave
        ref_text = "Egreso Externo"
        if is_internal:
            ref_text = "Transf. Interna"
        else:
            conc = (m.concepto or "").lower()
            if any(k in conc for k in ["vehiculo", "vehículo", "chasis", "mecanico", "taller", "repuesto", "cubierta"]):
                ref_text = "Gasto Vehículo"
            else:
                ref_text = "Gasto Empresa"

        movs_pydantic.append({
            "fecha": m.fecha,
            "concepto": f"[{cta_orig_nom}] {m.concepto or 'Transferencia Realizada'}",
            "referencia": ref_text,
            "tipo": "EGRESO",
            "monto": float(m.monto),
            "id_cuenta": cta_orig_id
        })

    # Procesar Gastos Productos
    for g, tipo_nom, marca, modelo, chasis in res_gastos_prod.all():
        movs_pydantic.append({
            "fecha": datetime.combine(g.fecha_gasto, datetime.min.time()),
            "concepto": f"(Gasto Directo) {tipo_nom}: {g.descripcion or ''} - {marca} {modelo} ({chasis})",
            "referencia": "Gasto Vehículo",
            "tipo": "EGRESO",
            "monto": float(g.monto),
            "id_cuenta": g.id_cuenta
        })

    # Procesar Gastos Empresa
    for g, tipo_nom in res_gastos_emp.all():
        movs_pydantic.append({
            "fecha": datetime.combine(g.fecha_gasto, datetime.min.time()),
            "concepto": f"(Gasto Directo) {tipo_nom}: {g.descripcion or ''}",
            "referencia": "Gasto Empresa",
            "tipo": "EGRESO",
            "monto": float(g.monto),
            "id_cuenta": g.id_cuenta
        })

    # 4. Calcular Resumen por Cuenta
    resumen_cuentas = []
    for cta in cuentas:
        # Saldo anterior por cuenta
        q_p_ant = select(func.sum(Pago.monto_pagado + func.coalesce(Pago.mora_aplicada, 0))).where(Pago.id_cuenta == cta.id_cuenta).where(Pago.fecha_pago < date_from)
        res_p_ant = await session.execute(q_p_ant)
        p_ant = float(res_p_ant.scalar() or 0)

        q_mi_ant = (
            select(func.sum(Movimiento.monto))
            .where(Movimiento.id_cuenta_destino == cta.id_cuenta)
            .where(Movimiento.fecha < datetime_from)
            .where(or_(
                Movimiento.referencia.is_(None),
                and_(
                    not_(Movimiento.referencia.like('PAGO-%')),
                    not_(Movimiento.referencia.in_(['Gasto Empresa', 'Gasto Vehículo']))
                )
            ))
        )
        res_mi_ant = await session.execute(q_mi_ant)
        mi_ant = float(res_mi_ant.scalar() or 0)

        q_mo_ant = (
            select(func.sum(Movimiento.monto))
            .where(Movimiento.id_cuenta_origen == cta.id_cuenta)
            .where(Movimiento.fecha < datetime_from)
            .where(or_(
                Movimiento.referencia.is_(None),
                and_(
                    not_(Movimiento.referencia.like('PAGO-%')),
                    not_(Movimiento.referencia.in_(['Gasto Empresa', 'Gasto Vehículo']))
                )
            ))
        )
        res_mo_ant = await session.execute(q_mo_ant)
        mo_ant = float(res_mo_ant.scalar() or 0)

        # Gastos directos por cuenta
        q_gp_ant = select(func.sum(GastoProducto.monto)).where(GastoProducto.id_cuenta == cta.id_cuenta).where(GastoProducto.fecha_gasto < date_from)
        res_gp_ant = await session.execute(q_gp_ant)
        gp_ant = float(res_gp_ant.scalar() or 0)

        q_ge_ant = select(func.sum(GastoEmpresa.monto)).where(GastoEmpresa.id_cuenta == cta.id_cuenta).where(GastoEmpresa.fecha_gasto < date_from)
        res_ge_ant = await session.execute(q_ge_ant)
        ge_ant = float(res_ge_ant.scalar() or 0)

        s_ant_cta = p_ant + mi_ant - mo_ant - gp_ant - ge_ant
        
        # Movimientos del periodo por cuenta
        m_cta = [m for m in movs_pydantic if m["id_cuenta"] == cta.id_cuenta]
        total_in = sum(m["monto"] for m in m_cta if m["tipo"] == "INGRESO")
        total_out = sum(m["monto"] for m in m_cta if m["tipo"] == "EGRESO")

        resumen_cuentas.append({
            "id_cuenta": cta.id_cuenta,
            "nombre": cta.nombre,
            "saldo_anterior": s_ant_cta,
            "ingresos": total_in,
            "egresos": total_out,
            "saldo_final": s_ant_cta + total_in - total_out
        })

    # 5. Ordenar por fecha y calcular saldo acumulado global
    movs_pydantic.sort(key=lambda x: x["fecha"])
    
    current_balance = saldo_anterior
    for m in movs_pydantic:
        if m["tipo"] == "INGRESO":
            current_balance += m["monto"]
        else:
            current_balance -= m["monto"]
        m["saldo_acumulado"] = current_balance

    return {
        "cuenta_nombre": cuenta_nombres,
        "saldo_anterior": saldo_anterior,
        "movimientos": movs_pydantic,
        "saldo_final": current_balance,
        "resumen_cuentas": resumen_cuentas
    }

@router.get("/playa/reportes/movimiento-detallado", response_model=ReporteMovimientoDetalladoResponse)
async def get_reporte_movimiento_detallado(
    id_cuentas: List[int] = Query(...),
    desde: Optional[date] = Query(None),
    hasta: Optional[date] = Query(None),
    tipo_filtro: str = Query('AMBOS'), # 'AMBOS', 'INGRESO', 'EGRESO'
    subcategorias: List[str] = Query(None), # Filtro opcional por subcategoría
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Genera un extracto detallado/desglosado de movimientos.
    Ingresos: Entrega, Cuota, Interés, Otros.
    Egresos: Vehículo, Empresa, Otros.
    """
    date_from = desde or date(2020, 1, 1)
    date_to = hasta or date.today()
    datetime_from = datetime.combine(date_from, datetime.min.time())
    datetime_to = datetime.combine(date_to, datetime.max.time())

    movs = []

    # --- 1. INGRESOS (PAGOS) ---
    if tipo_filtro in ['AMBOS', 'INGRESO']:
        q_pagos = (
            select(
                Pago, 
                Cliente.nombre, 
                Cliente.apellido, 
                Cuenta.nombre.label('cuenta_nom'), 
                Pagare.tipo_pagare,
                Pagare.numero_cuota,
                Venta.cantidad_cuotas,
                Venta.cantidad_refuerzos
            )
            .join(Venta, Pago.id_venta == Venta.id_venta)
            .join(Cliente, Venta.id_cliente == Cliente.id_cliente)
            .join(Cuenta, Pago.id_cuenta == Cuenta.id_cuenta)
            .join(Pagare, Pago.id_pagare == Pagare.id_pagare)
            .where(Pago.id_cuenta.in_(id_cuentas))
            .where(Pago.fecha_pago >= date_from)
            .where(Pago.fecha_pago <= date_to)
        )
        res_pagos = await session.execute(q_pagos)
        for p, nom, ape, cta_nom, tipo_pg, num_c, tot_c, tot_r in res_pagos.all():
            m_cap = float(p.monto_pagado)
            m_int = float(p.mora_aplicada or 0)
            
            det = {
                "fecha": datetime.combine(p.fecha_pago, datetime.min.time()),
                "id_cuenta": p.id_cuenta,
                "cuenta_nom": cta_nom,
                "tipo": "INGRESO",
                "concepto": f"Cobro {tipo_pg} - {nom} {ape}",
                "referencia": tipo_pg,
                "monto_total": m_cap + m_int,
                "ingreso_entrega": 0,
                "ingreso_cuota": 0,
                "ingreso_interes": m_int,
                "ingreso_otros": 0,
                "egreso_vehiculo": 0,
                "egreso_empresa": 0,
                "egreso_otros": 0
            }
            
            if tipo_pg == 'ENTREGA_CONTADO':
                det["ingreso_entrega"] = m_cap
                det["referencia"] = "Entrega Contado"
                det["concepto"] = f"Venta: Entrega Contado - {nom} {ape}"
            elif tipo_pg in ['ENTREGA', 'ENTREGA_INICIAL']:
                det["ingreso_entrega"] = m_cap
                det["referencia"] = "Entrega Inicial"
                det["concepto"] = f"Venta: Entrega Inicial - {nom} {ape}"
            elif tipo_pg == 'CUOTA':
                det["ingreso_cuota"] = m_cap
                det["concepto"] = f"Cuota {num_c}/{tot_c} - {nom} {ape}"
                det["referencia"] = "Cuota"
            elif tipo_pg == 'REFUERZO':
                det["ingreso_cuota"] = m_cap
                det["concepto"] = f"Cobro Refuerzo {num_c}/{tot_r} - {nom} {ape}"
                det["referencia"] = "Refuerzo"
            
            movs.append(det)

    # --- 2. INGRESOS (TRANSFERENCIAS / OTROS) ---
    if tipo_filtro in ['AMBOS', 'INGRESO']:
        q_mov_in = (
            select(Movimiento, Cuenta.nombre.label('cta_dest_nom'), Cuenta.id_cuenta.label('cta_dest_id'))
            .join(Cuenta, Movimiento.id_cuenta_destino == Cuenta.id_cuenta)
            .where(Movimiento.id_cuenta_destino.in_(id_cuentas))
            .where(Movimiento.fecha >= datetime_from)
            .where(Movimiento.fecha <= datetime_to)
            .where(or_(
                Movimiento.referencia.is_(None),
                and_(
                    not_(Movimiento.referencia.like('PAGO-%')),
                    not_(Movimiento.referencia.in_(['Gasto Empresa', 'Gasto Vehículo']))
                )
            ))
        )
        res_mov_in = await session.execute(q_mov_in)
        for m, cta_dest_nom, cta_dest_id in res_mov_in.all():
            if m.id_cuenta_origen in id_cuentas: continue # Omitir internas para evitar duplicar
            
            movs.append({
                "fecha": m.fecha,
                "id_cuenta": cta_dest_id,
                "cuenta_nom": cta_dest_nom,
                "concepto": m.concepto or "Ingreso Externo",
                "referencia": "Transferencia",
                "tipo": "INGRESO",
                "monto_total": float(m.monto),
                "ingreso_entrega": 0,
                "ingreso_cuota": 0,
                "ingreso_interes": 0,
                "ingreso_otros": float(m.monto),
                "egreso_vehiculo": 0,
                "egreso_empresa": 0,
                "egreso_otros": 0
            })

    # --- 3. EGRESOS (GASTOS VEHICULO) ---
    if tipo_filtro in ['AMBOS', 'EGRESO']:
        q_gastos_prod = (
            select(GastoProducto, TipoGastoProducto.nombre.label('tipo_nom'), Producto.marca, Producto.modelo, Cuenta.nombre.label('cta_nom'))
            .join(TipoGastoProducto, GastoProducto.id_tipo_gasto == TipoGastoProducto.id_tipo_gasto)
            .join(Producto, GastoProducto.id_producto == Producto.id_producto)
            .join(Cuenta, GastoProducto.id_cuenta == Cuenta.id_cuenta)
            .where(GastoProducto.id_cuenta.in_(id_cuentas))
            .where(GastoProducto.fecha_gasto >= date_from)
            .where(GastoProducto.fecha_gasto <= date_to)
        )
        res_gp = await session.execute(q_gastos_prod)
        for g, tipo_nom, marca, modelo, cta_nom in res_gp.all():
            movs.append({
                "fecha": datetime.combine(g.fecha_gasto, datetime.min.time()),
                "id_cuenta": g.id_cuenta,
                "cuenta_nom": cta_nom,
                "concepto": f"{tipo_nom}: {g.descripcion or ''} - {marca} {modelo}",
                "referencia": "Gasto Vehículo",
                "tipo": "EGRESO",
                "monto_total": float(g.monto),
                "ingreso_entrega": 0, "ingreso_cuota": 0, "ingreso_interes": 0, "ingreso_otros": 0,
                "egreso_vehiculo": float(g.monto), "egreso_empresa": 0, "egreso_otros": 0
            })

    # --- 4. EGRESOS (GASTOS EMPRESA) ---
    if tipo_filtro in ['AMBOS', 'EGRESO']:
        q_gastos_emp = (
            select(GastoEmpresa, TipoGastoEmpresa.nombre.label('tipo_nom'), Cuenta.nombre.label('cta_nom'))
            .join(TipoGastoEmpresa, GastoEmpresa.id_tipo_gasto_empresa == TipoGastoEmpresa.id_tipo_gasto_empresa)
            .join(Cuenta, GastoEmpresa.id_cuenta == Cuenta.id_cuenta)
            .where(GastoEmpresa.id_cuenta.in_(id_cuentas))
            .where(GastoEmpresa.fecha_gasto >= date_from)
            .where(GastoEmpresa.fecha_gasto <= date_to)
        )
        res_ge = await session.execute(q_gastos_emp)
        for g, tipo_nom, cta_nom in res_ge.all():
            movs.append({
                "fecha": datetime.combine(g.fecha_gasto, datetime.min.time()),
                "id_cuenta": g.id_cuenta,
                "cuenta_nom": cta_nom,
                "concepto": f"{tipo_nom}: {g.descripcion or ''}",
                "referencia": "Gasto Empresa",
                "tipo": "EGRESO",
                "monto_total": float(g.monto),
                "ingreso_entrega": 0, "ingreso_cuota": 0, "ingreso_interes": 0, "ingreso_otros": 0,
                "egreso_vehiculo": 0, "egreso_empresa": float(g.monto), "egreso_otros": 0
            })

    # --- 5. EGRESOS (TRANSFERENCIAS SALIENTES / OTROS) ---
    if tipo_filtro in ['AMBOS', 'EGRESO']:
        q_mov_out = (
            select(Movimiento, Cuenta.nombre.label('cta_orig_nom'), Cuenta.id_cuenta.label('cta_orig_id'))
            .join(Cuenta, Movimiento.id_cuenta_origen == Cuenta.id_cuenta)
            .where(Movimiento.id_cuenta_origen.in_(id_cuentas))
            .where(Movimiento.fecha >= datetime_from)
            .where(Movimiento.fecha <= datetime_to)
            .where(or_(
                Movimiento.referencia.is_(None),
                and_(
                    not_(Movimiento.referencia.like('PAGO-%')),
                    not_(Movimiento.referencia.in_(['Gasto Empresa', 'Gasto Vehículo']))
                )
            ))
        )
        res_mov_out = await session.execute(q_mov_out)
        for m, cta_orig_nom, cta_orig_id in res_mov_out.all():
            if m.id_cuenta_destino in id_cuentas: continue
            
            movs.append({
                "fecha": m.fecha,
                "id_cuenta": cta_orig_id,
                "cuenta_nom": cta_orig_nom,
                "concepto": m.concepto or "Egreso Externo",
                "referencia": "Transferencia",
                "tipo": "EGRESO",
                "monto_total": float(m.monto),
                "ingreso_entrega": 0, "ingreso_cuota": 0, "ingreso_interes": 0, "ingreso_otros": 0,
                "egreso_vehiculo": 0, "egreso_empresa": 0, "egreso_otros": float(m.monto)
            })

    # --- 6. FILTRADO POR SUBCATEGORÍAS ---
    if subcategorias and len(subcategorias) > 0:
        filtered_movs = []
        for m in movs:
            keep = False
            for sc in subcategorias:
                if sc == 'ENTREGA' and m['ingreso_entrega'] > 0: keep = True
                elif sc == 'CUOTA' and m['ingreso_cuota'] > 0: keep = True
                elif sc == 'INTERES' and m['ingreso_interes'] > 0: keep = True
                elif sc == 'OTROS_IN' and m['ingreso_otros'] > 0: keep = True
                elif sc == 'GASTO_VEHICULO' and m['egreso_vehiculo'] > 0: keep = True
                elif sc == 'GASTO_EMPRESA' and m['egreso_empresa'] > 0: keep = True
                elif sc == 'OTROS_EG' and m['egreso_otros'] > 0: keep = True
            if keep:
                filtered_movs.append(m)
        movs = filtered_movs

    # Totales Finales
    totales = {
        "entregas": sum(m["ingreso_entrega"] for m in movs),
        "cuotas": sum(m["ingreso_cuota"] for m in movs),
        "interes": sum(m["ingreso_interes"] for m in movs),
        "ingreso_otros": sum(m["ingreso_otros"] for m in movs),
        "egreso_vehiculo": sum(m["egreso_vehiculo"] for m in movs),
        "egreso_empresa": sum(m["egreso_empresa"] for m in movs),
        "egreso_otros": sum(m["egreso_otros"] for m in movs),
        "total_ingreso": sum(m["monto_total"] for m in movs if m["tipo"] == "INGRESO"),
        "total_egreso": sum(m["monto_total"] for m in movs if m["tipo"] == "EGRESO"),
    }

    return {
        "movimientos": sorted(movs, key=lambda x: x["fecha"]),
        "totales": totales
    }
