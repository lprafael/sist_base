from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case, text, or_
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
    Movimiento
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

# --- Endpoints ---

@router.get("/playa/reportes/ventas", response_model=List[VentaReporteResponse])
async def get_reporte_ventas(
    desde: Optional[date] = Query(None),
    hasta: Optional[date] = Query(None),
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Obtiene el listado de ventas realizadas en un rango determinado.
    """
    date_from = desde or date(2020, 1, 1)
    date_to = hasta or date.today()
    
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
            Vendedor.apellido.label('vend_ape')
        )
        .join(Producto, Venta.id_producto == Producto.id_producto)
        .join(Cliente, Venta.id_cliente == Cliente.id_cliente)
        .outerjoin(Vendedor, Venta.id_vendedor == Vendedor.id_vendedor)
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
            "comision": 0 # TODO: Implementar lógica de comisión si existe
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
        dias_atraso = (date_to - (row.fecha_mas_antigua or date_to)).days
        
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
    orden: str = Query('cliente'), # 'cliente' o 'dias_mora'
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
                dias_mora = (date_to - row.fecha_vencimiento).days
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
        
    # Reordenar el reporte final si es necesario (ya viene medio ordenado por el loop)
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
    Obtiene el stock de vehículos disponibles con su entrega inicial sugerida.
    """
    query = (
        select(Producto)
        .where(Producto.estado_disponibilidad == 'DISPONIBLE')
        .where(or_(Producto.activo == True, Producto.activo.is_(None)))
        .order_by(Producto.marca, Producto.modelo)
    )
    
    result = await session.execute(query)
    productos = result.scalars().all()
    
    reporte = []
    today = date.today()
    
    for p in productos:
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
            "dias_en_stock": dias_stock
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

    # 2. Calcular Saldo Anterior (antes de la fecha 'desde')
    # Sumar pagos
    q_pagos_ant = select(func.sum(Pago.monto_pagado)).where(Pago.id_cuenta.in_(id_cuentas)).where(Pago.fecha_pago < date_from)
    res_pagos_ant = await session.execute(q_pagos_ant)
    pagos_ant = float(res_pagos_ant.scalar() or 0)

    # Sumar movimientos destino (Entregas a las cuentas seleccionadas)
    # IMPORTANTE: Si es transferencia entre dos cuentas del mismo grupo (ambas seleccionadas), se netea.
    # Pero aquí calculamos saldo anterior, así que solo nos importa lo que entró desde fuera del grupo.
    # En realidad, el saldo anterior es la suma de saldos de cada cuenta.
    
    # Movimientos que entran a alguna de estas cuentas
    q_mov_in_ant = select(func.sum(Movimiento.monto)).where(Movimiento.id_cuenta_destino.in_(id_cuentas)).where(Movimiento.fecha < datetime_from)
    res_mov_in_ant = await session.execute(q_mov_in_ant)
    mov_in_ant = float(res_mov_in_ant.scalar() or 0)

    # Movimientos que salen de alguna de estas cuentas
    q_mov_out_ant = select(func.sum(Movimiento.monto)).where(Movimiento.id_cuenta_origen.in_(id_cuentas)).where(Movimiento.fecha < datetime_from)
    res_mov_out_ant = await session.execute(q_mov_out_ant)
    mov_out_ant = float(res_mov_out_ant.scalar() or 0)

    saldo_anterior = pagos_ant + mov_in_ant - mov_out_ant

    # 3. Obtener Movimientos del periodo
    # Pagos (Ingresos) - Unimos con Pagare para saber el tipo (CUOTA, ENTREGA, REFUERZO)
    q_pagos = (
        select(Pago, Cliente.nombre, Cliente.apellido, Cuenta.nombre.label('cuenta_nom'), Pagare.tipo_pagare)
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
    for p, nom, ape, cta_nom, tipo_pg in res_pagos.all():
        # Traducir tipo_pagare
        ref_text = "Entrega"
        if tipo_pg == 'ENTREGA': ref_text = "Entrega"
        elif tipo_pg == 'CUOTA': ref_text = "Cuota"
        elif tipo_pg == 'REFUERZO': ref_text = "Refuerzo"
        
        movs_pydantic.append({
            "fecha": datetime.combine(p.fecha_pago, datetime.min.time()),
            "concepto": f"[{cta_nom}] Cobro Cuota - Cliente: {nom} {ape}",
            "referencia": ref_text,
            "tipo": "INGRESO",
            "monto": float(p.monto_pagado),
            "id_cuenta": p.id_cuenta # Útil para el resumen por cuenta en el front
        })

    # Movimientos del periodo
    # Entregas a alguna cuenta del grupo
    q_mov_in = (
        select(Movimiento, Cuenta.nombre.label('cta_dest_nom'), Cuenta.id_cuenta.label('cta_dest_id'))
        .join(Cuenta, Movimiento.id_cuenta_destino == Cuenta.id_cuenta)
        .where(Movimiento.id_cuenta_destino.in_(id_cuentas))
        .where(Movimiento.fecha >= datetime_from)
        .where(Movimiento.fecha <= datetime_to)
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

    # Salidas de alguna de estas cuentas
    q_mov_out = (
        select(Movimiento, Cuenta.nombre.label('cta_orig_nom'), Cuenta.id_cuenta.label('cta_orig_id'))
        .join(Cuenta, Movimiento.id_cuenta_origen == Cuenta.id_cuenta)
        .where(Movimiento.id_cuenta_origen.in_(id_cuentas))
        .where(Movimiento.fecha >= datetime_from)
        .where(Movimiento.fecha <= datetime_to)
    )
    res_mov_out = await session.execute(q_mov_out)
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

    # 4. Calcular Resumen por Cuenta
    resumen_cuentas = []
    for cta in cuentas:
        # Saldo anterior por cuenta
        q_p_ant = select(func.sum(Pago.monto_pagado)).where(Pago.id_cuenta == cta.id_cuenta).where(Pago.fecha_pago < date_from)
        res_p_ant = await session.execute(q_p_ant)
        p_ant = float(res_p_ant.scalar() or 0)

        q_mi_ant = select(func.sum(Movimiento.monto)).where(Movimiento.id_cuenta_destino == cta.id_cuenta).where(Movimiento.fecha < datetime_from)
        res_mi_ant = await session.execute(q_mi_ant)
        mi_ant = float(res_mi_ant.scalar() or 0)

        q_mo_ant = select(func.sum(Movimiento.monto)).where(Movimiento.id_cuenta_origen == cta.id_cuenta).where(Movimiento.fecha < datetime_from)
        res_mo_ant = await session.execute(q_mo_ant)
        mo_ant = float(res_mo_ant.scalar() or 0)

        s_ant_cta = p_ant + mi_ant - mo_ant
        
        # Movimientos del periodo por cuenta
        movs_cta = [m for m in movs_pydantic if m.get("id_cuenta") == cta.id_cuenta]
        ing_cta = sum(m["monto"] for m in movs_cta if m["tipo"] == "INGRESO")
        egr_cta = sum(m["monto"] for m in movs_cta if m["tipo"] == "EGRESO")

        resumen_cuentas.append({
            "id_cuenta": cta.id_cuenta,
            "nombre": cta.nombre,
            "saldo_anterior": s_ant_cta,
            "ingresos": ing_cta,
            "egresos": egr_cta,
            "saldo_final": s_ant_cta + ing_cta - egr_cta
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
