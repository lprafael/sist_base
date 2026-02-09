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
    ConfigCalificacion
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
    fecha_vencimiento: date
    monto_cuota: float
    saldo_pendiente: float
    saldo_total_venta: float # Saldo acumulado de la venta (para el formato solicitado)
    dias_mora: int
    interes_mora: float
    total_pago: float

class StockDisponibleResponse(BaseModel):
    # (Existing StockDisponibleResponse schema remains same)
    id_producto: int
    marca: Optional[str] = None
    modelo: Optional[str] = None
    año: Optional[int] = None
    color: Optional[str] = None
    chasis: Optional[str] = None
    precio_contado_sugerido: Optional[float] = None
    precio_financiado_sugerido: Optional[float] = None
    entrega_inicial_sugerida: Optional[float] = None
    ubicacion_actual: Optional[str] = None
    dias_en_stock: int

# --- Endpoints ---

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
        .where(Pagare.estado != 'PAGADO')
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
        dias_atraso = (date_to - row.fecha_mas_antigua).days
        
        reporte.append({
            "cliente_id": row.id_cliente,
            "cliente_nombre": f"{row.nombre} {row.apellido}",
            "cliente_ruc": row.ruc,
            "cliente_telefono": row.telefono,
            "vehiculo_info": f"{row.marca} {row.modelo} ({row.año})",
            "cantidad_cuotas": row.cantidad_cuotas,
            "dias_atraso": dias_atraso,
            "total_deuda": float(row.total_deuda)
        })

    return reporte

@router.get("/playa/reportes/cuotas-mora-detalle", response_model=List[CuotaMoraDetalle])
async def get_cuotas_mora_detalle(
    desde: Optional[date] = Query(None),
    hasta: Optional[date] = Query(None),
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Obtiene el listado detallado de cuotas vencidas en un rango (formato para impresión).
    """
    date_from = desde or date(2020, 1, 1)
    date_to = hasta or date.today()
    
    # Query para todas las cuotas vencidas
    query = (
        select(
            Cliente.id_cliente,
            Cliente.nombre,
            Cliente.apellido,
            Cliente.numero_documento.label('ruc'),
            Cliente.telefono,
            Pagare.id_venta,
            Pagare.numero_cuota,
            Pagare.fecha_vencimiento,
            Pagare.monto_cuota,
            Pagare.saldo_pendiente,
            Venta.monto_int_mora.label('tasa_config') # Usar columna existente
        )
        .join(Venta, Pagare.id_venta == Venta.id_venta)
        .join(Cliente, Venta.id_cliente == Cliente.id_cliente)
        .where(Pagare.estado != 'PAGADO')
        .where(Pagare.fecha_vencimiento >= date_from)
        .where(Pagare.fecha_vencimiento <= date_to)
        .order_by(Cliente.nombre, Cliente.apellido, Pagare.id_venta, Pagare.numero_cuota)
    )
    
    result = await session.execute(query)
    rows = result.all()
    
    # Calcular saldos acumulados por venta
    reporte = []
    ventas_saldos = {}
    
    for row in rows:
        vid = row.id_venta
        if vid not in ventas_saldos:
            ventas_saldos[vid] = 0
        ventas_saldos[vid] += float(row.saldo_pendiente)

    for row in rows:
        dias_mora = (date_to - row.fecha_vencimiento).days
        # Lógica de interés basada en el monto_int_mora configurado o cálculo base
        # Usamos una tasa base si el monto_int_mora es 0
        tasa_uso = float(row.tasa_config) if row.tasa_config and float(row.tasa_config) > 0 else 0.0005 # 0.05% diario default
        interes = float(row.saldo_pendiente) * (dias_mora * tasa_uso)
        
        reporte.append({
            "cliente_id": row.id_cliente,
            "cliente_nombre": f"{row.nombre} {row.apellido}",
            "cliente_ruc": row.ruc,
            "cliente_telefono": row.telefono,
            "id_venta": row.id_venta,
            "numero_cuota": row.numero_cuota,
            "fecha_vencimiento": row.fecha_vencimiento,
            "monto_cuota": float(row.monto_cuota),
            "saldo_pendiente": float(row.saldo_pendiente),
            "saldo_total_venta": float(ventas_saldos[row.id_venta]),
            "dias_mora": dias_mora,
            "interes_mora": interes,
            "total_pago": float(row.saldo_pendiente) + interes
        })
        
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
        .where(Pagare.estado.in_(['PENDIENTE', 'PARCIAL', 'VENCIDO']))
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
