# routes_surtidor.py
# Router FastAPI con todos los endpoints del Sistema de Gestión de Surtidor

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text, and_, or_
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import date, datetime, timedelta
from decimal import Decimal

from database import get_session
from auth import get_current_user
from models import Usuario
from models_surtidor import (
    TipoCombustible, Tanque, Isla, Pico,
    TurnoConfig, Personal, Turno, AsignacionTurno,
    MovimientoStock, MedicionManual, MetodoPago,
    Venta, CajaMovimiento, CuentaBancaria, DepositoBancario,
    ReembolsoTarjeta, Proveedor, PedidoCombustible, RecepcionCombustible
)
from schemas_surtidor import (
    TipoCombustibleCreate, TipoCombustibleUpdate, TipoCombustibleOut,
    TanqueCreate, TanqueUpdate, TanqueOut,
    IslaCreate, IslaUpdate, IslaOut,
    PicoCreate, PicoUpdate, PicoOut,
    TurnoConfigCreate, TurnoConfigUpdate, TurnoConfigOut,
    PersonalCreate, PersonalUpdate, PersonalOut,
    TurnoCreate, TurnoOut, TurnoClose, AsignacionTurnoCreate, AsignacionTurnoOut,
    MedicionManualCreate, MedicionManualOut, ProyeccionStock,
    MetodoPagoCreate, MetodoPagoUpdate, MetodoPagoOut,
    VentaCreate, VentaOut, VentaAsignarReembolso, ResumenTurno,
    CuentaBancariaCreate, CuentaBancariaOut,
    ReembolsoTarjetaCreate, ReembolsoTarjetaOut,
    CajaMovimientoCreate, CajaMovimientoOut,
    DepositoBancarioCreate, DepositoBancarioOut,
    ProveedorCreate, ProveedorOut,
    PedidoCombustibleCreate, PedidoCombustibleOut,
    RecepcionCombustibleCreate, RecepcionCombustibleOut,
    DashboardKPIs
)

router = APIRouter(prefix="/api/surtidor", tags=["Surtidor"])


# ============================================================
# HELPERS
# ============================================================

async def _actualizar_stock_tanque(session: AsyncSession, tanque_id: int, delta_litros: Decimal,
                                    tipo: str, referencia: str = None, motivo: str = None,
                                    turno_id: int = None, usuario_id: int = None):
    """Actualiza el stock del tanque y registra el movimiento."""
    tanque = await session.get(Tanque, tanque_id)
    if not tanque:
        raise HTTPException(status_code=404, detail="Tanque no encontrado")

    stock_ant = tanque.stock_actual_litros
    stock_new = stock_ant + delta_litros

    if stock_new < 0:
        raise HTTPException(
            status_code=400,
            detail=f"Stock insuficiente. Stock actual: {float(stock_ant):.2f} L, Se necesitan: {abs(float(delta_litros)):.2f} L"
        )
    if tanque.capacidad_litros and stock_new > tanque.capacidad_litros:
        raise HTTPException(
            status_code=400,
            detail=f"No cabe en el tanque. Capacidad: {float(tanque.capacidad_litros):.2f} L, Stock actual: {float(stock_ant):.2f} L"
        )

    tanque.stock_actual_litros = stock_new
    mov = MovimientoStock(
        tanque_id=tanque_id,
        tipo=tipo,
        litros=abs(delta_litros),
        stock_anterior=stock_ant,
        stock_posterior=stock_new,
        referencia=referencia,
        motivo=motivo,
        turno_id=turno_id,
        registrado_por=usuario_id
    )
    session.add(mov)
    return tanque


async def _saldo_caja(session: AsyncSession) -> Decimal:
    """Calcula el saldo actual de caja sumando todos los movimientos."""
    result = await session.execute(
        select(func.coalesce(
            func.sum(
                func.case(
                    (CajaMovimiento.tipo == "ingreso", CajaMovimiento.monto),
                    else_=-CajaMovimiento.monto
                )
            ),
            Decimal("0")
        ))
    )
    return result.scalar_one()


# ============================================================
# DASHBOARD
# ============================================================

@router.get("/dashboard", response_model=DashboardKPIs)
async def get_dashboard(
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    hoy = date.today()

    # Tanques con estado de stock
    result_tanques = await session.execute(
        select(Tanque).options(selectinload(Tanque.tipo_combustible)).where(Tanque.activo == True)
    )
    tanques = result_tanques.scalars().all()
    tanques_out = []
    alertas = []
    for t in tanques:
        pct = float(t.stock_actual_litros / t.capacidad_litros * 100) if t.capacidad_litros else 0
        if t.stock_actual_litros <= t.stock_minimo_litros * Decimal("0.5"):
            estado = "critico"
            alertas.append({"tanque": t.nombre, "nivel": "CRÍTICO", "stock": float(t.stock_actual_litros)})
        elif t.stock_actual_litros <= t.stock_minimo_litros:
            estado = "bajo"
            alertas.append({"tanque": t.nombre, "nivel": "BAJO", "stock": float(t.stock_actual_litros)})
        elif pct >= 95:
            estado = "lleno"
        else:
            estado = "ok"
        t_dict = TanqueOut.model_validate(t)
        t_dict.porcentaje_lleno = round(pct, 1)
        t_dict.estado_stock = estado
        tanques_out.append(t_dict)

    # Ventas hoy
    result_ventas_hoy = await session.execute(
        select(
            func.coalesce(func.sum(Venta.monto_total), Decimal("0")).label("total"),
            func.coalesce(func.sum(Venta.litros), Decimal("0")).label("litros"),
        ).join(MetodoPago, Venta.metodo_pago_id == MetodoPago.id)
        .where(
            func.date(Venta.fecha_hora) == hoy,
            Venta.anulada == False
        )
    )
    ventas_hoy = result_ventas_hoy.one()

    result_efectivo = await session.execute(
        select(func.coalesce(func.sum(Venta.monto_total), Decimal("0")))
        .join(MetodoPago, Venta.metodo_pago_id == MetodoPago.id)
        .where(
            func.date(Venta.fecha_hora) == hoy,
            Venta.anulada == False,
            MetodoPago.tipo == "efectivo"
        )
    )
    result_tarjeta = await session.execute(
        select(func.coalesce(func.sum(Venta.monto_total), Decimal("0")))
        .join(MetodoPago, Venta.metodo_pago_id == MetodoPago.id)
        .where(
            func.date(Venta.fecha_hora) == hoy,
            Venta.anulada == False,
            MetodoPago.tipo == "tarjeta"
        )
    )

    # Turno activo
    result_turno = await session.execute(
        select(Turno).options(
            selectinload(Turno.config_turno),
            selectinload(Turno.asignaciones).selectinload(AsignacionTurno.personal)
        ).where(Turno.estado == "abierto", Turno.fecha == hoy)
        .order_by(Turno.fecha_hora_apertura.desc()).limit(1)
    )
    turno_activo = result_turno.scalar_one_or_none()

    # Pedidos pendientes
    result_pedidos = await session.execute(
        select(func.count(PedidoCombustible.id)).where(PedidoCombustible.estado == "pendiente")
    )

    # Reembolsos pendientes
    result_reembolsos = await session.execute(
        select(func.coalesce(func.sum(Venta.monto_total), Decimal("0")))
        .where(Venta.estado_reembolso == "pendiente", Venta.anulada == False)
    )

    saldo = await _saldo_caja(session)

    return DashboardKPIs(
        stock_por_tanque=tanques_out,
        total_ventas_hoy=ventas_hoy.total,
        total_litros_hoy=ventas_hoy.litros,
        ventas_efectivo_hoy=result_efectivo.scalar_one(),
        ventas_tarjeta_hoy=result_tarjeta.scalar_one(),
        saldo_caja=saldo,
        turno_activo=TurnoOut.model_validate(turno_activo) if turno_activo else None,
        alertas_stock=alertas,
        pedidos_pendientes=result_pedidos.scalar_one(),
        reembolsos_pendientes_monto=result_reembolsos.scalar_one()
    )


# ============================================================
# TIPOS DE COMBUSTIBLE (dinámico)
# ============================================================

@router.get("/tipos-combustible", response_model=List[TipoCombustibleOut])
async def listar_tipos_combustible(
    activo: Optional[bool] = None,
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    q = select(TipoCombustible)
    if activo is not None:
        q = q.where(TipoCombustible.activo == activo)
    result = await session.execute(q.order_by(TipoCombustible.nombre))
    return result.scalars().all()


@router.post("/tipos-combustible", response_model=TipoCombustibleOut, status_code=201)
async def crear_tipo_combustible(
    data: TipoCombustibleCreate,
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    obj = TipoCombustible(**data.model_dump(), creado_por=current_user.id)
    session.add(obj)
    await session.commit()
    await session.refresh(obj)
    return obj


@router.put("/tipos-combustible/{id}", response_model=TipoCombustibleOut)
async def actualizar_tipo_combustible(
    id: int, data: TipoCombustibleUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    obj = await session.get(TipoCombustible, id)
    if not obj:
        raise HTTPException(404, "Tipo de combustible no encontrado")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    await session.commit()
    await session.refresh(obj)
    return obj


@router.delete("/tipos-combustible/{id}", status_code=204)
async def eliminar_tipo_combustible(
    id: int,
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    obj = await session.get(TipoCombustible, id)
    if not obj:
        raise HTTPException(404, "Tipo de combustible no encontrado")
    # Verificar que no haya tanques activos usándolo
    result = await session.execute(
        select(func.count(Tanque.id)).where(Tanque.tipo_combustible_id == id, Tanque.activo == True)
    )
    if result.scalar_one() > 0:
        raise HTTPException(400, "No se puede eliminar: hay tanques activos con este tipo de combustible")
    obj.activo = False  # Soft delete
    await session.commit()


# ============================================================
# TANQUES (dinámico)
# ============================================================

@router.get("/tanques", response_model=List[TanqueOut])
async def listar_tanques(
    activo: Optional[bool] = None,
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    q = select(Tanque).options(selectinload(Tanque.tipo_combustible))
    if activo is not None:
        q = q.where(Tanque.activo == activo)
    result = await session.execute(q.order_by(Tanque.numero))
    tanques = result.scalars().all()
    out = []
    for t in tanques:
        pct = float(t.stock_actual_litros / t.capacidad_litros * 100) if t.capacidad_litros else 0
        if t.stock_actual_litros <= t.stock_minimo_litros * Decimal("0.5"):
            estado = "critico"
        elif t.stock_actual_litros <= t.stock_minimo_litros:
            estado = "bajo"
        elif pct >= 95:
            estado = "lleno"
        else:
            estado = "ok"
        to = TanqueOut.model_validate(t)
        to.porcentaje_lleno = round(pct, 1)
        to.estado_stock = estado
        out.append(to)
    return out


@router.get("/tanques/{id}", response_model=TanqueOut)
async def get_tanque(
    id: int,
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    t = await session.get(Tanque, id, options=[selectinload(Tanque.tipo_combustible)])
    if not t:
        raise HTTPException(404, "Tanque no encontrado")
    pct = float(t.stock_actual_litros / t.capacidad_litros * 100) if t.capacidad_litros else 0
    to = TanqueOut.model_validate(t)
    to.porcentaje_lleno = round(pct, 1)
    return to


@router.post("/tanques", response_model=TanqueOut, status_code=201)
async def crear_tanque(
    data: TanqueCreate,
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    # Verificar que el tipo de combustible exista
    tc = await session.get(TipoCombustible, data.tipo_combustible_id)
    if not tc or not tc.activo:
        raise HTTPException(400, "Tipo de combustible inválido o inactivo")
    obj = Tanque(**data.model_dump(), creado_por=current_user.id)
    session.add(obj)
    await session.commit()
    await session.refresh(obj)
    return await get_tanque(obj.id, session, current_user)


@router.put("/tanques/{id}", response_model=TanqueOut)
async def actualizar_tanque(
    id: int, data: TanqueUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    obj = await session.get(Tanque, id)
    if not obj:
        raise HTTPException(404, "Tanque no encontrado")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    await session.commit()
    return await get_tanque(id, session, current_user)


@router.delete("/tanques/{id}", status_code=204)
async def eliminar_tanque(
    id: int,
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    obj = await session.get(Tanque, id)
    if not obj:
        raise HTTPException(404, "Tanque no encontrado")
    if float(obj.stock_actual_litros) > 0:
        raise HTTPException(400, "No se puede eliminar un tanque con stock. Primero vacíe el tanque.")
    obj.activo = False
    await session.commit()


# ============================================================
# ISLAS Y PICOS
# ============================================================

@router.get("/islas", response_model=List[IslaOut])
async def listar_islas(
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    result = await session.execute(
        select(Isla).options(
            selectinload(Isla.picos).selectinload(Pico.tipo_combustible)
        ).where(Isla.activo == True).order_by(Isla.numero)
    )
    return result.scalars().all()


@router.post("/islas", response_model=IslaOut, status_code=201)
async def crear_isla(
    data: IslaCreate,
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    obj = Isla(**data.model_dump())
    session.add(obj)
    await session.commit()
    await session.refresh(obj)
    return obj


@router.put("/islas/{id}", response_model=IslaOut)
async def actualizar_isla(
    id: int, data: IslaUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    obj = await session.get(Isla, id)
    if not obj:
        raise HTTPException(404, "Isla no encontrada")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    await session.commit()
    await session.refresh(obj)
    return obj


@router.delete("/islas/{id}", status_code=204)
async def eliminar_isla(id: int, session: AsyncSession = Depends(get_session),
                         current_user: Usuario = Depends(get_current_user)):
    obj = await session.get(Isla, id)
    if not obj:
        raise HTTPException(404, "Isla no encontrada")
    obj.activo = False
    await session.commit()


@router.get("/picos", response_model=List[PicoOut])
async def listar_picos(
    isla_id: Optional[int] = None,
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    q = select(Pico).options(
        selectinload(Pico.tipo_combustible),
        selectinload(Pico.isla)
    ).where(Pico.activo == True)
    if isla_id:
        q = q.where(Pico.isla_id == isla_id)
    result = await session.execute(q.order_by(Pico.isla_id, Pico.numero))
    return result.scalars().all()


@router.post("/picos", response_model=PicoOut, status_code=201)
async def crear_pico(
    data: PicoCreate,
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    obj = Pico(**data.model_dump())
    session.add(obj)
    await session.commit()
    await session.refresh(obj)
    return obj


@router.put("/picos/{id}", response_model=PicoOut)
async def actualizar_pico(id: int, data: PicoUpdate,
                           session: AsyncSession = Depends(get_session),
                           current_user: Usuario = Depends(get_current_user)):
    obj = await session.get(Pico, id)
    if not obj:
        raise HTTPException(404, "Pico no encontrado")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    await session.commit()
    await session.refresh(obj)
    return obj


@router.delete("/picos/{id}", status_code=204)
async def eliminar_pico(id: int, session: AsyncSession = Depends(get_session),
                         current_user: Usuario = Depends(get_current_user)):
    obj = await session.get(Pico, id)
    if not obj:
        raise HTTPException(404, "Pico no encontrado")
    obj.activo = False
    await session.commit()


# ============================================================
# CONFIGURACIÓN DE TURNOS
# ============================================================

@router.get("/turnos-config", response_model=List[TurnoConfigOut])
async def listar_turnos_config(
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    result = await session.execute(
        select(TurnoConfig).where(TurnoConfig.activo == True).order_by(TurnoConfig.orden)
    )
    return result.scalars().all()


@router.post("/turnos-config", response_model=TurnoConfigOut, status_code=201)
async def crear_turno_config(data: TurnoConfigCreate,
                              session: AsyncSession = Depends(get_session),
                              current_user: Usuario = Depends(get_current_user)):
    obj = TurnoConfig(**data.model_dump())
    session.add(obj)
    await session.commit()
    await session.refresh(obj)
    return obj


@router.put("/turnos-config/{id}", response_model=TurnoConfigOut)
async def actualizar_turno_config(id: int, data: TurnoConfigUpdate,
                                   session: AsyncSession = Depends(get_session),
                                   current_user: Usuario = Depends(get_current_user)):
    obj = await session.get(TurnoConfig, id)
    if not obj:
        raise HTTPException(404, "Configuración de turno no encontrada")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    await session.commit()
    await session.refresh(obj)
    return obj


@router.delete("/turnos-config/{id}", status_code=204)
async def eliminar_turno_config(id: int, session: AsyncSession = Depends(get_session),
                                 current_user: Usuario = Depends(get_current_user)):
    obj = await session.get(TurnoConfig, id)
    if not obj:
        raise HTTPException(404, "No encontrado")
    obj.activo = False
    await session.commit()


# ============================================================
# PERSONAL
# ============================================================

@router.get("/personal", response_model=List[PersonalOut])
async def listar_personal(
    activo: Optional[bool] = True,
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    q = select(Personal)
    if activo is not None:
        q = q.where(Personal.activo == activo)
    result = await session.execute(q.order_by(Personal.apellido, Personal.nombre))
    personal = result.scalars().all()
    out = []
    for p in personal:
        po = PersonalOut.model_validate(p)
        po.nombre_completo = f"{p.apellido}, {p.nombre}"
        out.append(po)
    return out


@router.post("/personal", response_model=PersonalOut, status_code=201)
async def crear_personal(data: PersonalCreate, session: AsyncSession = Depends(get_session),
                          current_user: Usuario = Depends(get_current_user)):
    obj = Personal(**data.model_dump(), creado_por=current_user.id)
    session.add(obj)
    await session.commit()
    await session.refresh(obj)
    return obj


@router.put("/personal/{id}", response_model=PersonalOut)
async def actualizar_personal(id: int, data: PersonalUpdate,
                               session: AsyncSession = Depends(get_session),
                               current_user: Usuario = Depends(get_current_user)):
    obj = await session.get(Personal, id)
    if not obj:
        raise HTTPException(404, "Personal no encontrado")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    await session.commit()
    await session.refresh(obj)
    return obj


@router.delete("/personal/{id}", status_code=204)
async def eliminar_personal(id: int, session: AsyncSession = Depends(get_session),
                             current_user: Usuario = Depends(get_current_user)):
    obj = await session.get(Personal, id)
    if not obj:
        raise HTTPException(404, "Personal no encontrado")
    obj.activo = False
    await session.commit()


# ============================================================
# TURNOS (apertura y cierre)
# ============================================================

@router.get("/turnos", response_model=List[TurnoOut])
async def listar_turnos(
    fecha_desde: Optional[date] = None,
    fecha_hasta: Optional[date] = None,
    estado: Optional[str] = None,
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    q = select(Turno).options(
        selectinload(Turno.config_turno),
        selectinload(Turno.asignaciones).selectinload(AsignacionTurno.personal)
    )
    if fecha_desde:
        q = q.where(Turno.fecha >= fecha_desde)
    if fecha_hasta:
        q = q.where(Turno.fecha <= fecha_hasta)
    if estado:
        q = q.where(Turno.estado == estado)
    result = await session.execute(q.order_by(Turno.fecha.desc(), Turno.id.desc()))
    return result.scalars().all()


@router.post("/turnos", response_model=TurnoOut, status_code=201)
async def abrir_turno(data: TurnoCreate, session: AsyncSession = Depends(get_session),
                      current_user: Usuario = Depends(get_current_user)):
    obj = Turno(**data.model_dump(), fecha_hora_apertura=datetime.now(),
                abierto_por=current_user.id)
    session.add(obj)
    await session.commit()
    await session.refresh(obj)
    return obj


@router.put("/turnos/{id}/cerrar", response_model=TurnoOut)
async def cerrar_turno(id: int, data: TurnoClose, session: AsyncSession = Depends(get_session),
                       current_user: Usuario = Depends(get_current_user)):
    obj = await session.get(Turno, id)
    if not obj:
        raise HTTPException(404, "Turno no encontrado")
    if obj.estado != "abierto":
        raise HTTPException(400, "El turno no está abierto")
    obj.estado = "cerrado"
    obj.fecha_hora_cierre = datetime.now()
    obj.cerrado_por = current_user.id
    if data.observaciones:
        obj.observaciones = data.observaciones
    await session.commit()
    await session.refresh(obj)
    return obj


@router.post("/turnos/{id}/asignar-personal", response_model=AsignacionTurnoOut, status_code=201)
async def asignar_personal_turno(id: int, data: AsignacionTurnoCreate,
                                  session: AsyncSession = Depends(get_session),
                                  current_user: Usuario = Depends(get_current_user)):
    turno = await session.get(Turno, id)
    if not turno or turno.estado != "abierto":
        raise HTTPException(400, "Turno inválido o cerrado")
    asig = AsignacionTurno(turno_id=id, **data.model_dump())
    session.add(asig)
    await session.commit()
    await session.refresh(asig)
    return asig


@router.delete("/turnos/{turno_id}/asignar-personal/{personal_id}", status_code=204)
async def remover_personal_turno(turno_id: int, personal_id: int,
                                  session: AsyncSession = Depends(get_session),
                                  current_user: Usuario = Depends(get_current_user)):
    result = await session.execute(
        select(AsignacionTurno).where(
            AsignacionTurno.turno_id == turno_id,
            AsignacionTurno.personal_id == personal_id
        )
    )
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(404, "Asignación no encontrada")
    await session.delete(obj)
    await session.commit()


@router.get("/turnos/{id}/resumen", response_model=ResumenTurno)
async def resumen_turno(id: int, session: AsyncSession = Depends(get_session),
                         current_user: Usuario = Depends(get_current_user)):
    result = await session.execute(
        select(
            func.coalesce(func.sum(Venta.monto_total), Decimal("0")).label("total"),
            func.coalesce(func.sum(Venta.litros), Decimal("0")).label("litros"),
            func.count(Venta.id).label("cantidad")
        ).where(Venta.turno_id == id, Venta.anulada == False)
    )
    row = result.one()

    # Por método de pago
    r_metodo = await session.execute(
        select(
            MetodoPago.nombre,
            MetodoPago.tipo,
            func.sum(Venta.monto_total).label("monto"),
            func.count(Venta.id).label("cantidad")
        ).join(Venta, Venta.metodo_pago_id == MetodoPago.id)
        .where(Venta.turno_id == id, Venta.anulada == False)
        .group_by(MetodoPago.nombre, MetodoPago.tipo)
    )
    por_metodo = [{"nombre": r.nombre, "tipo": r.tipo, "monto": float(r.monto), "cantidad": r.cantidad}
                  for r in r_metodo]

    efectivo = sum(m["monto"] for m in por_metodo if m["tipo"] == "efectivo")
    tarjeta = sum(m["monto"] for m in por_metodo if m["tipo"] == "tarjeta")

    # Por tipo de combustible
    r_comb = await session.execute(
        select(
            TipoCombustible.nombre,
            func.sum(Venta.litros).label("litros"),
            func.sum(Venta.monto_total).label("monto")
        ).join(Tanque, Venta.tanque_id == Tanque.id)
        .join(TipoCombustible, Tanque.tipo_combustible_id == TipoCombustible.id)
        .where(Venta.turno_id == id, Venta.anulada == False)
        .group_by(TipoCombustible.nombre)
    )
    por_tipo = [{"combustible": r.nombre, "litros": float(r.litros), "monto": float(r.monto)}
                for r in r_comb]

    return ResumenTurno(
        turno_id=id,
        total_ventas=row.total,
        total_litros=row.litros,
        ventas_efectivo=Decimal(str(efectivo)),
        ventas_tarjeta=Decimal(str(tarjeta)),
        cantidad_transacciones=row.cantidad,
        por_metodo_pago=por_metodo,
        por_tipo_combustible=por_tipo
    )


# ============================================================
# VENTAS
# ============================================================

@router.get("/ventas", response_model=List[VentaOut])
async def listar_ventas(
    turno_id: Optional[int] = None,
    fecha_desde: Optional[date] = None,
    fecha_hasta: Optional[date] = None,
    metodo_pago_id: Optional[int] = None,
    estado_reembolso: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    q = select(Venta).options(
        selectinload(Venta.metodo_pago),
        selectinload(Venta.pico).selectinload(Pico.tipo_combustible)
    ).where(Venta.anulada == False)
    if turno_id:
        q = q.where(Venta.turno_id == turno_id)
    if fecha_desde:
        q = q.where(func.date(Venta.fecha_hora) >= fecha_desde)
    if fecha_hasta:
        q = q.where(func.date(Venta.fecha_hora) <= fecha_hasta)
    if metodo_pago_id:
        q = q.where(Venta.metodo_pago_id == metodo_pago_id)
    if estado_reembolso:
        q = q.where(Venta.estado_reembolso == estado_reembolso)
    result = await session.execute(q.order_by(Venta.fecha_hora.desc()).offset(skip).limit(limit))
    return result.scalars().all()


@router.post("/ventas", response_model=VentaOut, status_code=201)
async def registrar_venta(
    data: VentaCreate,
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    turno = await session.get(Turno, data.turno_id)
    if not turno or turno.estado != "abierto":
        raise HTTPException(400, "El turno no está abierto")

    metodo = await session.get(MetodoPago, data.metodo_pago_id)
    if not metodo:
        raise HTTPException(400, "Método de pago inválido")

    monto_total = data.litros * data.precio_litro
    estado_reembolso = "na" if metodo.tipo == "efectivo" else "pendiente"

    # Descontar stock del tanque
    await _actualizar_stock_tanque(
        session, data.tanque_id, -data.litros,
        tipo="salida",
        referencia="venta",
        turno_id=data.turno_id,
        usuario_id=current_user.id
    )

    venta = Venta(
        **data.model_dump(),
        monto_total=monto_total,
        estado_reembolso=estado_reembolso,
        registrado_por=current_user.id
    )
    session.add(venta)

    # Si es efectivo, registrar en caja
    if metodo.tipo == "efectivo":
        saldo = await _saldo_caja(session)
        caja_mov = CajaMovimiento(
            turno_id=data.turno_id,
            tipo="ingreso",
            concepto=f"Venta combustible - {data.litros} litros",
            monto=monto_total,
            saldo_anterior=saldo,
            saldo_posterior=saldo + monto_total
        )
        session.add(caja_mov)

    await session.commit()
    await session.refresh(venta)
    return venta


@router.put("/ventas/{id}/anular", response_model=VentaOut)
async def anular_venta(id: int, session: AsyncSession = Depends(get_session),
                       current_user: Usuario = Depends(get_current_user)):
    venta = await session.get(Venta, id)
    if not venta:
        raise HTTPException(404, "Venta no encontrada")
    if venta.anulada:
        raise HTTPException(400, "La venta ya está anulada")
    # Reintegrar stock
    await _actualizar_stock_tanque(
        session, venta.tanque_id, venta.litros,
        tipo="ajuste_manual",
        referencia=f"anulacion_venta_{id}",
        motivo="Anulación de venta",
        usuario_id=current_user.id
    )
    venta.anulada = True
    await session.commit()
    await session.refresh(venta)
    return venta


@router.put("/ventas/{id}/asignar-reembolso", response_model=VentaOut)
async def asignar_reembolso(id: int, data: VentaAsignarReembolso,
                             session: AsyncSession = Depends(get_session),
                             current_user: Usuario = Depends(get_current_user)):
    venta = await session.get(Venta, id)
    if not venta:
        raise HTTPException(404, "Venta no encontrada")
    if venta.estado_reembolso == "na":
        raise HTTPException(400, "Esta venta es en efectivo, no tiene reembolso")
    venta.reembolso_id = data.reembolso_id
    venta.nro_comprobante_banco = data.nro_comprobante_banco
    venta.estado_reembolso = "reembolsado"
    await session.commit()
    await session.refresh(venta)
    return venta


# ============================================================
# STOCK - MEDICIONES MANUALES
# ============================================================

@router.post("/mediciones", response_model=MedicionManualOut, status_code=201)
async def registrar_medicion(data: MedicionManualCreate,
                              session: AsyncSession = Depends(get_session),
                              current_user: Usuario = Depends(get_current_user)):
    tanque = await session.get(Tanque, data.tanque_id)
    if not tanque:
        raise HTTPException(404, "Tanque no encontrado")

    med = MedicionManual(
        **data.model_dump(),
        litros_sistema=tanque.stock_actual_litros,
        medido_por=current_user.id
    )
    session.add(med)
    await session.commit()
    await session.refresh(med)
    return med


@router.get("/mediciones", response_model=List[MedicionManualOut])
async def listar_mediciones(
    tanque_id: Optional[int] = None,
    fecha_desde: Optional[date] = None,
    limit: int = 50,
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    q = select(MedicionManual)
    if tanque_id:
        q = q.where(MedicionManual.tanque_id == tanque_id)
    if fecha_desde:
        q = q.where(func.date(MedicionManual.fecha_hora) >= fecha_desde)
    result = await session.execute(q.order_by(MedicionManual.fecha_hora.desc()).limit(limit))
    return result.scalars().all()


# ============================================================
# PROYECCIÓN DE STOCK
# ============================================================

@router.get("/proyeccion-stock", response_model=List[ProyeccionStock])
async def proyeccion_stock(
    dias_historial: int = Query(default=30, ge=7, le=90),
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    desde = date.today() - timedelta(days=dias_historial)
    result_tanques = await session.execute(
        select(Tanque).options(selectinload(Tanque.tipo_combustible))
        .where(Tanque.activo == True)
    )
    tanques = result_tanques.scalars().all()
    proyecciones = []

    for t in tanques:
        # Promedio de ventas diarias sobre el período
        result_prom = await session.execute(
            select(func.coalesce(func.sum(Venta.litros), Decimal("0")))
            .where(
                Venta.tanque_id == t.id,
                func.date(Venta.fecha_hora) >= desde,
                Venta.anulada == False
            )
        )
        total_vendido = result_prom.scalar_one()
        promedio_diario = total_vendido / Decimal(str(dias_historial))

        if promedio_diario > 0:
            stock_sobre_minimo = t.stock_actual_litros - t.stock_minimo_litros
            dias_hasta_min = float(stock_sobre_minimo / promedio_diario) if stock_sobre_minimo > 0 else 0
            fecha_min = date.today() + timedelta(days=int(dias_hasta_min))
            se_requiere = dias_hasta_min <= 5 or t.stock_actual_litros <= t.stock_minimo_litros
            litros_pedir = t.capacidad_litros - t.stock_actual_litros if se_requiere else Decimal("0")
        else:
            dias_hasta_min = None
            fecha_min = None
            se_requiere = t.stock_actual_litros <= t.stock_minimo_litros
            litros_pedir = (t.capacidad_litros - t.stock_actual_litros) if se_requiere else Decimal("0")

        proyecciones.append(ProyeccionStock(
            tanque_id=t.id,
            nombre_tanque=t.nombre,
            tipo_combustible=t.tipo_combustible.nombre if t.tipo_combustible else "",
            stock_actual=t.stock_actual_litros,
            stock_minimo=t.stock_minimo_litros,
            venta_promedio_diaria=promedio_diario,
            dias_hasta_minimo=dias_hasta_min,
            fecha_minimo_estimada=fecha_min,
            se_requiere_pedido=se_requiere,
            litros_a_pedir=litros_pedir
        ))

    return sorted(proyecciones, key=lambda x: x.dias_hasta_minimo or 999)


# ============================================================
# MÉTODOS DE PAGO
# ============================================================

@router.get("/metodos-pago", response_model=List[MetodoPagoOut])
async def listar_metodos_pago(session: AsyncSession = Depends(get_session),
                               current_user: Usuario = Depends(get_current_user)):
    result = await session.execute(
        select(MetodoPago).where(MetodoPago.activo == True).order_by(MetodoPago.nombre)
    )
    return result.scalars().all()


@router.post("/metodos-pago", response_model=MetodoPagoOut, status_code=201)
async def crear_metodo_pago(data: MetodoPagoCreate, session: AsyncSession = Depends(get_session),
                             current_user: Usuario = Depends(get_current_user)):
    obj = MetodoPago(**data.model_dump())
    session.add(obj)
    await session.commit()
    await session.refresh(obj)
    return obj


@router.put("/metodos-pago/{id}", response_model=MetodoPagoOut)
async def actualizar_metodo_pago(id: int, data: MetodoPagoUpdate,
                                  session: AsyncSession = Depends(get_session),
                                  current_user: Usuario = Depends(get_current_user)):
    obj = await session.get(MetodoPago, id)
    if not obj:
        raise HTTPException(404, "Método de pago no encontrado")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    await session.commit()
    await session.refresh(obj)
    return obj


# ============================================================
# FINANZAS - CAJA
# ============================================================

@router.get("/caja/saldo")
async def saldo_caja(session: AsyncSession = Depends(get_session),
                     current_user: Usuario = Depends(get_current_user)):
    saldo = await _saldo_caja(session)
    return {"saldo": float(saldo)}


@router.get("/caja/movimientos", response_model=List[CajaMovimientoOut])
async def listar_movimientos_caja(
    fecha_desde: Optional[date] = None,
    fecha_hasta: Optional[date] = None,
    limit: int = 100,
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    q = select(CajaMovimiento)
    if fecha_desde:
        q = q.where(func.date(CajaMovimiento.fecha_hora) >= fecha_desde)
    if fecha_hasta:
        q = q.where(func.date(CajaMovimiento.fecha_hora) <= fecha_hasta)
    result = await session.execute(q.order_by(CajaMovimiento.fecha_hora.desc()).limit(limit))
    return result.scalars().all()


@router.post("/caja/movimientos", response_model=CajaMovimientoOut, status_code=201)
async def registrar_movimiento_caja(data: CajaMovimientoCreate,
                                    session: AsyncSession = Depends(get_session),
                                    current_user: Usuario = Depends(get_current_user)):
    saldo = await _saldo_caja(session)
    delta = data.monto if data.tipo == "ingreso" else -data.monto
    obj = CajaMovimiento(
        **data.model_dump(),
        saldo_anterior=saldo,
        saldo_posterior=saldo + delta,
        registrado_por=current_user.id
    )
    session.add(obj)
    await session.commit()
    await session.refresh(obj)
    return obj


# ============================================================
# FINANZAS - CUENTAS BANCARIAS
# ============================================================

@router.get("/cuentas-bancarias", response_model=List[CuentaBancariaOut])
async def listar_cuentas(session: AsyncSession = Depends(get_session),
                          current_user: Usuario = Depends(get_current_user)):
    result = await session.execute(
        select(CuentaBancaria).where(CuentaBancaria.activo == True)
    )
    return result.scalars().all()


@router.post("/cuentas-bancarias", response_model=CuentaBancariaOut, status_code=201)
async def crear_cuenta(data: CuentaBancariaCreate, session: AsyncSession = Depends(get_session),
                       current_user: Usuario = Depends(get_current_user)):
    obj = CuentaBancaria(**data.model_dump())
    session.add(obj)
    await session.commit()
    await session.refresh(obj)
    return obj


# ============================================================
# FINANZAS - REEMBOLSOS DE TARJETA
# ============================================================

@router.get("/reembolsos", response_model=List[ReembolsoTarjetaOut])
async def listar_reembolsos(
    conciliado: Optional[bool] = None,
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    q = select(ReembolsoTarjeta)
    if conciliado is not None:
        q = q.where(ReembolsoTarjeta.conciliado == conciliado)
    result = await session.execute(q.order_by(ReembolsoTarjeta.fecha_deposito.desc()))
    return result.scalars().all()


@router.post("/reembolsos", response_model=ReembolsoTarjetaOut, status_code=201)
async def registrar_reembolso(data: ReembolsoTarjetaCreate,
                               session: AsyncSession = Depends(get_session),
                               current_user: Usuario = Depends(get_current_user)):
    monto_neto = data.monto_bruto - data.comision
    obj = ReembolsoTarjeta(
        **data.model_dump(),
        monto_neto=monto_neto,
        registrado_por=current_user.id
    )
    session.add(obj)
    await session.commit()
    await session.refresh(obj)
    return obj


@router.get("/reembolsos/pendientes-conciliacion")
async def ventas_pendientes_conciliacion(
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    """Retorna ventas con tarjeta que aún no tienen reembolso asignado."""
    result = await session.execute(
        select(Venta, MetodoPago).join(MetodoPago, Venta.metodo_pago_id == MetodoPago.id)
        .where(Venta.estado_reembolso == "pendiente", Venta.anulada == False)
        .order_by(Venta.fecha_hora.asc())
    )
    rows = result.all()

    total_pendiente = sum(float(r[0].monto_total) for r in rows)
    return {
        "cantidad": len(rows),
        "monto_total": total_pendiente,
        "ventas": [{"id": r[0].id, "fecha": str(r[0].fecha_hora), "monto": float(r[0].monto_total),
                    "metodo": r[1].nombre} for r in rows]
    }


# ============================================================
# ADQUISICIONES
# ============================================================

@router.get("/proveedores", response_model=List[ProveedorOut])
async def listar_proveedores(session: AsyncSession = Depends(get_session),
                              current_user: Usuario = Depends(get_current_user)):
    result = await session.execute(select(Proveedor).where(Proveedor.activo == True))
    return result.scalars().all()


@router.post("/proveedores", response_model=ProveedorOut, status_code=201)
async def crear_proveedor(data: ProveedorCreate, session: AsyncSession = Depends(get_session),
                          current_user: Usuario = Depends(get_current_user)):
    obj = Proveedor(**data.model_dump())
    session.add(obj)
    await session.commit()
    await session.refresh(obj)
    return obj


@router.get("/pedidos", response_model=List[PedidoCombustibleOut])
async def listar_pedidos(estado: Optional[str] = None, session: AsyncSession = Depends(get_session),
                          current_user: Usuario = Depends(get_current_user)):
    q = select(PedidoCombustible).options(selectinload(PedidoCombustible.proveedor))
    if estado:
        q = q.where(PedidoCombustible.estado == estado)
    result = await session.execute(q.order_by(PedidoCombustible.fecha_pedido.desc()))
    return result.scalars().all()


@router.post("/pedidos", response_model=PedidoCombustibleOut, status_code=201)
async def crear_pedido(data: PedidoCombustibleCreate, session: AsyncSession = Depends(get_session),
                       current_user: Usuario = Depends(get_current_user)):
    obj = PedidoCombustible(**data.model_dump(), creado_por=current_user.id)
    session.add(obj)
    await session.commit()
    await session.refresh(obj)
    return obj


@router.put("/pedidos/{id}/estado")
async def cambiar_estado_pedido(id: int, estado: str, session: AsyncSession = Depends(get_session),
                                 current_user: Usuario = Depends(get_current_user)):
    obj = await session.get(PedidoCombustible, id)
    if not obj:
        raise HTTPException(404, "Pedido no encontrado")
    obj.estado = estado
    await session.commit()
    return {"ok": True}


@router.post("/recepciones", response_model=RecepcionCombustibleOut, status_code=201)
async def registrar_recepcion(data: RecepcionCombustibleCreate,
                               session: AsyncSession = Depends(get_session),
                               current_user: Usuario = Depends(get_current_user)):
    """Registra la recepción de combustible y actualiza el stock del tanque."""
    obj = RecepcionCombustible(**data.model_dump(), recibido_por=current_user.id)
    session.add(obj)

    # Actualizar stock
    await _actualizar_stock_tanque(
        session, data.tanque_id, data.litros_recibidos,
        tipo="entrada",
        referencia=f"recepcion_remito_{data.nro_remito}",
        motivo="Recepción de combustible",
        usuario_id=current_user.id
    )

    # Marcar pedido como entregado si corresponde
    if data.pedido_id:
        pedido = await session.get(PedidoCombustible, data.pedido_id)
        if pedido:
            pedido.estado = "entregado"

    await session.commit()
    await session.refresh(obj)
    return obj


# ============================================================
# CUENTAS BANCARIAS
# ============================================================

@router.get("/cuentas-bancarias", response_model=List[CuentaBancariaOut])
async def listar_cuentas_bancarias(
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    result = await session.execute(
        select(CuentaBancaria).where(CuentaBancaria.activo == True)
        .order_by(CuentaBancaria.banco)
    )
    return result.scalars().all()


@router.post("/cuentas-bancarias", response_model=CuentaBancariaOut, status_code=201)
async def crear_cuenta_bancaria(
    data: CuentaBancariaCreate,
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    obj = CuentaBancaria(**data.model_dump())
    session.add(obj)
    await session.commit()
    await session.refresh(obj)
    return obj


# ============================================================
# REEMBOLSOS DE TARJETA
# ============================================================

@router.get("/reembolsos", response_model=List[ReembolsoTarjetaOut])
async def listar_reembolsos(
    conciliado: Optional[bool] = None,
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    q = select(ReembolsoTarjeta)
    if conciliado is not None:
        q = q.where(ReembolsoTarjeta.conciliado == conciliado)
    result = await session.execute(q.order_by(ReembolsoTarjeta.fecha_deposito.desc()))
    return result.scalars().all()


@router.post("/reembolsos", response_model=ReembolsoTarjetaOut, status_code=201)
async def crear_reembolso(
    data: ReembolsoTarjetaCreate,
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    monto_neto = data.monto_bruto - (data.comision or Decimal("0"))
    obj = ReembolsoTarjeta(
        **data.model_dump(),
        monto_neto=monto_neto,
        registrado_por=current_user.id
    )
    session.add(obj)
    await session.commit()
    await session.refresh(obj)
    return obj


@router.put("/ventas/{id}/asignar-reembolso", response_model=VentaOut)
async def asignar_reembolso_venta(
    id: int,
    data: VentaAsignarReembolso,
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    """Vincula una venta con tarjeta a un reembolso bancario específico."""
    venta = await session.get(Venta, id, options=[
        selectinload(Venta.metodo_pago),
        selectinload(Venta.pico).selectinload(Pico.tipo_combustible)
    ])
    if not venta:
        raise HTTPException(404, "Venta no encontrada")
    if venta.estado_reembolso != "pendiente":
        raise HTTPException(400, "La venta no está pendiente de reembolso")

    venta.estado_reembolso = "reembolsado"
    if data.nro_comprobante_banco:
        venta.nro_comprobante = data.nro_comprobante_banco

    # Marcar el reembolso como conciliado si se vincula
    if data.reembolso_id:
        reembolso = await session.get(ReembolsoTarjeta, data.reembolso_id)
        if reembolso:
            reembolso.conciliado = True

    await session.commit()
    await session.refresh(venta)
    return venta


@router.put("/ventas/{id}/anular", response_model=VentaOut)
async def anular_venta(
    id: int,
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    """Anula una venta y devuelve los litros al tanque."""
    venta = await session.get(Venta, id, options=[
        selectinload(Venta.metodo_pago),
        selectinload(Venta.pico).selectinload(Pico.tipo_combustible)
    ])
    if not venta:
        raise HTTPException(404, "Venta no encontrada")
    if venta.anulada:
        raise HTTPException(400, "La venta ya está anulada")

    # Reintegrar stock al tanque
    await _actualizar_stock_tanque(
        session, venta.tanque_id, venta.litros,
        tipo="ajuste",
        referencia=f"anulacion_venta_{id}",
        motivo="Anulación de venta",
        turno_id=venta.turno_id,
        usuario_id=current_user.id
    )

    venta.anulada = True

    # Si fue en efectivo, registrar salida de caja
    metodo = await session.get(MetodoPago, venta.metodo_pago_id)
    if metodo and metodo.tipo == "efectivo":
        saldo = await _saldo_caja(session)
        caja_mov = CajaMovimiento(
            turno_id=venta.turno_id,
            tipo="egreso",
            concepto=f"Anulación venta #{id}",
            monto=venta.monto_total,
            saldo_anterior=saldo,
            saldo_posterior=saldo - venta.monto_total,
            registrado_por=current_user.id
        )
        session.add(caja_mov)

    await session.commit()
    await session.refresh(venta)
    return venta


# ============================================================
# PROYECCIÓN DE STOCK
# ============================================================

@router.get("/proyeccion-stock")
async def proyeccion_stock(
    dias_historial: int = Query(30, ge=7, le=365),
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Calcula la proyección de agotamiento de stock por tanque.
    Para cada tanque activo:
    - Calcula el promedio de litros vendidos por día en los últimos N días
    - Estima cuántos días faltan para llegar al stock mínimo
    - Sugiere la cantidad a pedir (capacidad - stock_actual)
    """
    hoy = date.today()
    fecha_desde = hoy - timedelta(days=dias_historial)

    # Obtener todos los tanques activos
    result_tanques = await session.execute(
        select(Tanque).options(selectinload(Tanque.tipo_combustible))
        .where(Tanque.activo == True)
        .order_by(Tanque.numero)
    )
    tanques = result_tanques.scalars().all()

    proyecciones = []

    for tanque in tanques:
        # Calcular venta promedio diaria en el período
        result_litros = await session.execute(
            select(
                func.coalesce(func.sum(Venta.litros), Decimal("0")).label("total_litros"),
                func.count(func.distinct(func.date(Venta.fecha_hora))).label("dias_con_venta")
            ).where(
                Venta.tanque_id == tanque.id,
                Venta.anulada == False,
                func.date(Venta.fecha_hora) >= fecha_desde,
                func.date(Venta.fecha_hora) <= hoy
            )
        )
        row = result_litros.one()
        total_litros = float(row.total_litros)
        dias_con_venta = row.dias_con_venta

        # Promedio: usar días con venta o el período completo (el mayor es más conservador)
        # Usamos días del período para ser más conservadores
        promedio_diario = total_litros / dias_historial if dias_historial > 0 else 0

        stock_actual = float(tanque.stock_actual_litros)
        stock_minimo = float(tanque.stock_minimo_litros)
        capacidad = float(tanque.capacidad_litros)

        # Días hasta llegar al stock mínimo
        stock_disponible_util = stock_actual - stock_minimo
        if promedio_diario > 0 and stock_disponible_util > 0:
            dias_hasta_minimo = stock_disponible_util / promedio_diario
            fecha_minimo = hoy + timedelta(days=dias_hasta_minimo)
        elif stock_actual <= stock_minimo:
            dias_hasta_minimo = 0
            fecha_minimo = hoy
        else:
            dias_hasta_minimo = None  # Sin historial de venta
            fecha_minimo = None

        # Litros a pedir: llenar hasta capacidad máxima
        litros_a_pedir = max(0, capacidad - stock_actual)

        # ¿Se requiere pedido? Sí si está bajo el mínimo o faltan menos de 7 días
        se_requiere_pedido = (
            stock_actual <= stock_minimo or
            (dias_hasta_minimo is not None and dias_hasta_minimo <= 7)
        )

        proyecciones.append({
            "tanque_id": tanque.id,
            "nombre_tanque": tanque.nombre,
            "tipo_combustible": tanque.tipo_combustible.nombre if tanque.tipo_combustible else "—",
            "stock_actual": round(stock_actual, 1),
            "stock_minimo": round(stock_minimo, 1),
            "capacidad": round(capacidad, 1),
            "venta_promedio_diaria": round(promedio_diario, 1),
            "dias_historial_analizado": dias_historial,
            "dias_con_datos": dias_con_venta,
            "dias_hasta_minimo": round(dias_hasta_minimo, 1) if dias_hasta_minimo is not None else None,
            "fecha_minimo_estimada": fecha_minimo.isoformat() if fecha_minimo else None,
            "litros_a_pedir": round(litros_a_pedir, 1),
            "se_requiere_pedido": se_requiere_pedido,
        })

    # Ordenar: críticos primero, luego por días hasta mínimo
    proyecciones.sort(key=lambda p: (
        not p["se_requiere_pedido"],
        p["dias_hasta_minimo"] if p["dias_hasta_minimo"] is not None else 9999
    ))

    return proyecciones
