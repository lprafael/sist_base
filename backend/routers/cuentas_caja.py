"""
routers/cuentas_caja.py
========================
API REST para el módulo de Tesorería de academias:
  - Cuentas del tenant (Caja, Banco Itaú, etc.)
  - Métodos de pago del tenant (Efectivo, Transferencia, QR, etc.)
  - Movimientos de caja: ingresos manuales + egresos
  - Cierre de caja / Reporte de flujo por período

Prefix: /academia
Roles: dueño, administrador → acceso total; tesorero → puede registrar movimientos y ver reportes
"""
from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Optional, List, Union

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel

from database import get_session
from security import get_current_user
from routers.academias import get_academia_context, require_roles

router = APIRouter(prefix="/academia", tags=["Tesorería / Cuentas"])


# ================================================================
# SCHEMAS (Pydantic)
# ================================================================

class CuentaCreate(BaseModel):
    nombre: str
    tipo: str = "efectivo"          # efectivo | banco | billetera_digital | otro
    descripcion: Optional[str] = None
    numero_cuenta: Optional[str] = None
    banco: Optional[str] = None
    moneda: str = "GS"
    es_principal: bool = False
    saldo_inicial: float = 0


class CuentaUpdate(BaseModel):
    nombre: Optional[str] = None
    tipo: Optional[str] = None
    descripcion: Optional[str] = None
    numero_cuenta: Optional[str] = None
    banco: Optional[str] = None
    moneda: Optional[str] = None
    activa: Optional[bool] = None
    es_principal: Optional[bool] = None


class MetodoPagoCreate(BaseModel):
    nombre: str
    tipo: str = "efectivo"          # efectivo | transferencia | tarjeta | qr | debito | otro
    descripcion: Optional[str] = None


class MetodoPagoUpdate(BaseModel):
    nombre: Optional[str] = None
    tipo: Optional[str] = None
    descripcion: Optional[str] = None
    activo: Optional[bool] = None


class MovimientoCreate(BaseModel):
    cuenta_id: str
    metodo_pago_id: Optional[str] = None
    tipo: str                       # "ingreso" | "egreso"
    categoria: str = "otro"         # cuota|matricula|inscripcion|alquiler|sueldos|materiales|servicios|impuestos|transferencia_interna|otro
    concepto: str
    monto: float
    fecha: Optional[str] = None     # YYYY-MM-DD; None = hoy
    referencia: Optional[str] = None
    notas: Optional[str] = None


class AnularMovimientoRequest(BaseModel):
    motivo_anulacion: Optional[str] = None


class ProveedorCreate(BaseModel):
    nombre: str
    ruc_ci: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    categoria_frecuente: Optional[str] = None
    direccion: Optional[str] = None
    notas: Optional[str] = None


class ProveedorUpdate(BaseModel):
    nombre: Optional[str] = None
    ruc_ci: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    categoria_frecuente: Optional[str] = None
    direccion: Optional[str] = None
    notas: Optional[str] = None
    activo: Optional[bool] = None


class CompraGastoCreate(BaseModel):
    proveedor_id: Optional[str] = None
    proveedor_nombre: Optional[str] = None
    tipo: str = "gasto_operativo"       # gasto_operativo | compra_equipamiento | alquiler_pista | honorarios_profesor | habilitacion_tasa | evento_cumpleanos | mantenimiento | otro
    categoria: str = "otro"             # alquiler_pista | sueldos | eventos_cumpleanos | impuestos | materiales | servicios | mantenimiento | otro
    concepto: str
    monto_total: float
    condicion_pago: str = "contado"     # contado | credito
    fecha_emision: Optional[str] = None # YYYY-MM-DD; default hoy
    fecha_vencimiento: Optional[str] = None # YYYY-MM-DD
    comprobante_nro: Optional[str] = None
    cuenta_id: Optional[str] = None     # Obligatorio si contado
    metodo_pago_id: Optional[str] = None
    notas: Optional[str] = None


class CompraGastoPagarRequest(BaseModel):
    cuenta_id: str
    monto: float
    metodo_pago_id: Optional[str] = None
    fecha: Optional[str] = None
    notas: Optional[str] = None


class CompraGastoAnularRequest(BaseModel):
    motivo_anulacion: Optional[str] = None


# ================================================================
# HELPERS
# ================================================================

def _clean(v: Optional[str]) -> Optional[str]:
    return v.strip() if v and isinstance(v, str) else v


def _clean_date(val: Optional[Union[str, date]]) -> Optional[date]:
    if not val:
        return None
    if isinstance(val, date):
        return val
    s = str(val).strip()
    if not s:
        return None
    if "T" in s:
        s = s.split("T")[0]
    try:
        return date.fromisoformat(s)
    except Exception:
        return None


async def _validar_cuenta(cuenta_id: str, academia_id: str, session: AsyncSession):
    """Valida que la cuenta pertenece al tenant y está activa."""
    res = await session.execute(
        text("SELECT id, nombre, activa FROM academias.cuentas WHERE id = CAST(:id AS UUID) AND academia_id = CAST(:aid AS UUID)"),
        {"id": cuenta_id, "aid": academia_id}
    )
    row = res.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Cuenta no encontrada.")
    if not row[2]:
        raise HTTPException(status_code=400, detail=f"La cuenta '{row[1]}' está desactivada.")
    return row


# ================================================================
# CUENTAS — CRUD
# ================================================================

@router.get("/cuentas")
async def listar_cuentas(
    request: Request,
    solo_activas: bool = True,
    current_user: dict = Depends(require_roles("dueño", "administrador", "tesorero")),
    session: AsyncSession = Depends(get_session),
):
    """Lista todas las cuentas del tenant. Por defecto solo las activas."""
    ctx = await get_academia_context(request, current_user, session)
    aid = str(ctx["academia_id"])

    try:
        where = "WHERE academia_id = CAST(:aid AS UUID)" + (" AND activa = TRUE" if solo_activas else "")
        res = await session.execute(
            text(f"""
                SELECT id, nombre, tipo, descripcion, numero_cuenta, banco,
                       moneda, activa, es_principal, saldo_inicial,
                       creado_en, actualizado_en
                FROM academias.cuentas
                {where}
                ORDER BY es_principal DESC, nombre
            """),
            {"aid": aid}
        )
        rows = res.fetchall()
        return [
            {
                "id": str(r[0]), "nombre": r[1], "tipo": r[2],
                "descripcion": r[3], "numero_cuenta": r[4], "banco": r[5],
                "moneda": r[6], "activa": r[7], "es_principal": r[8],
                "saldo_inicial": float(r[9]),
                "creado_en": r[10].isoformat() if r[10] else None,
                "actualizado_en": r[11].isoformat() if r[11] else None,
            }
            for r in rows
        ]
    except Exception as e:
        await session.rollback()
        print(f"WARN: Error en listar_cuentas: {e}")
        return []


@router.post("/cuentas", status_code=status.HTTP_201_CREATED)
async def crear_cuenta(
    data: CuentaCreate,
    request: Request,
    current_user: dict = Depends(require_roles("dueño", "administrador")),
    session: AsyncSession = Depends(get_session),
):
    """Crea una nueva cuenta contable para el tenant."""
    ctx = await get_academia_context(request, current_user, session)
    aid = str(ctx["academia_id"])

    tipo_valido = {"efectivo", "banco", "billetera_digital", "otro"}
    if data.tipo not in tipo_valido:
        raise HTTPException(status_code=422, detail=f"tipo debe ser uno de: {tipo_valido}")

    # Si es_principal = True, quitar la principal anterior
    if data.es_principal:
        await session.execute(
            text("UPDATE academias.cuentas SET es_principal = FALSE WHERE academia_id = CAST(:aid AS UUID)"),
            {"aid": aid}
        )

    res = await session.execute(
        text("""
            INSERT INTO academias.cuentas
                (academia_id, nombre, tipo, descripcion, numero_cuenta, banco,
                 moneda, es_principal, saldo_inicial)
            VALUES
                (CAST(:aid AS UUID), :nombre, :tipo, :desc, :num_cuenta, :banco,
                 :moneda, :es_principal, :saldo_inicial)
            RETURNING id
        """),
        {
            "aid": aid, "nombre": _clean(data.nombre), "tipo": data.tipo,
            "desc": _clean(data.descripcion), "num_cuenta": _clean(data.numero_cuenta),
            "banco": _clean(data.banco), "moneda": data.moneda or "GS",
            "es_principal": data.es_principal, "saldo_inicial": float(data.saldo_inicial or 0),
        }
    )
    new_id = str(res.scalar())
    await session.commit()
    return {"id": new_id, "message": f"Cuenta '{data.nombre}' creada correctamente."}


@router.put("/cuentas/{cuenta_id}")
async def actualizar_cuenta(
    cuenta_id: str,
    data: CuentaUpdate,
    request: Request,
    current_user: dict = Depends(require_roles("dueño", "administrador")),
    session: AsyncSession = Depends(get_session),
):
    """Actualiza los datos de una cuenta."""
    ctx = await get_academia_context(request, current_user, session)
    aid = str(ctx["academia_id"])
    await _validar_cuenta(cuenta_id, aid, session)

    updates: dict = {}
    if data.nombre is not None:        updates["nombre"] = _clean(data.nombre)
    if data.tipo is not None:          updates["tipo"] = data.tipo
    if data.descripcion is not None:   updates["descripcion"] = _clean(data.descripcion)
    if data.numero_cuenta is not None: updates["numero_cuenta"] = _clean(data.numero_cuenta)
    if data.banco is not None:         updates["banco"] = _clean(data.banco)
    if data.moneda is not None:        updates["moneda"] = data.moneda
    if data.activa is not None:        updates["activa"] = data.activa
    if data.es_principal is not None:
        updates["es_principal"] = data.es_principal
        if data.es_principal:
            await session.execute(
                text("UPDATE academias.cuentas SET es_principal = FALSE WHERE academia_id = CAST(:aid AS UUID)"),
                {"aid": aid}
            )

    if updates:
        set_clause = ", ".join(f"{k} = :{k}" for k in updates)
        updates["id"] = cuenta_id
        updates["ts"] = datetime.utcnow()
        await session.execute(
            text(f"UPDATE academias.cuentas SET {set_clause}, actualizado_en = :ts WHERE id = CAST(:id AS UUID)"),
            updates
        )
        await session.commit()
    return {"message": "Cuenta actualizada correctamente."}


@router.delete("/cuentas/{cuenta_id}")
async def desactivar_cuenta(
    cuenta_id: str,
    request: Request,
    current_user: dict = Depends(require_roles("dueño")),
    session: AsyncSession = Depends(get_session),
):
    """Desactiva una cuenta (no la elimina para preservar historial)."""
    ctx = await get_academia_context(request, current_user, session)
    aid = str(ctx["academia_id"])
    await _validar_cuenta(cuenta_id, aid, session)

    # Verificar si tiene movimientos activos
    res = await session.execute(
        text("SELECT COUNT(*) FROM academias.movimientos_caja WHERE cuenta_id = CAST(:id AS UUID) AND anulado = FALSE"),
        {"id": cuenta_id}
    )
    if (res.scalar() or 0) > 0:
        # Desactivar en lugar de eliminar
        await session.execute(
            text("UPDATE academias.cuentas SET activa = FALSE, actualizado_en = NOW() WHERE id = CAST(:id AS UUID)"),
            {"id": cuenta_id}
        )
        await session.commit()
        return {"message": "Cuenta desactivada (tiene movimientos asociados, no se puede eliminar)."}

    # Sin movimientos → eliminar físicamente
    await session.execute(
        text("DELETE FROM academias.cuentas WHERE id = CAST(:id AS UUID)"),
        {"id": cuenta_id}
    )
    await session.commit()
    return {"message": "Cuenta eliminada correctamente."}


# ================================================================
# MÉTODOS DE PAGO — CRUD
# ================================================================

@router.get("/metodos-pago")
async def listar_metodos_pago(
    request: Request,
    solo_activos: bool = True,
    current_user: dict = Depends(require_roles("dueño", "administrador", "tesorero")),
    session: AsyncSession = Depends(get_session),
):
    """Lista los métodos de pago configurados por el tenant."""
    ctx = await get_academia_context(request, current_user, session)
    aid = str(ctx["academia_id"])

    try:
        where = "WHERE academia_id = CAST(:aid AS UUID)" + (" AND activo = TRUE" if solo_activos else "")
        res = await session.execute(
            text(f"""
                SELECT id, nombre, tipo, descripcion, activo, creado_en
                FROM academias.metodos_pago
                {where}
                ORDER BY nombre
            """),
            {"aid": aid}
        )
        rows = res.fetchall()
        return [
            {
                "id": str(r[0]), "nombre": r[1], "tipo": r[2],
                "descripcion": r[3], "activo": r[4],
                "creado_en": r[5].isoformat() if r[5] else None,
            }
            for r in rows
        ]
    except Exception as e:
        await session.rollback()
        print(f"WARN: Error en listar_metodos_pago: {e}")
        return []


@router.post("/metodos-pago", status_code=status.HTTP_201_CREATED)
async def crear_metodo_pago(
    data: MetodoPagoCreate,
    request: Request,
    current_user: dict = Depends(require_roles("dueño", "administrador")),
    session: AsyncSession = Depends(get_session),
):
    """Crea un nuevo método de pago para el tenant."""
    ctx = await get_academia_context(request, current_user, session)
    aid = str(ctx["academia_id"])

    tipo_valido = {"efectivo", "transferencia", "tarjeta", "qr", "debito", "otro"}
    if data.tipo not in tipo_valido:
        raise HTTPException(status_code=422, detail=f"tipo debe ser uno de: {tipo_valido}")

    res = await session.execute(
        text("""
            INSERT INTO academias.metodos_pago (academia_id, nombre, tipo, descripcion)
            VALUES (CAST(:aid AS UUID), :nombre, :tipo, :desc)
            RETURNING id
        """),
        {"aid": aid, "nombre": _clean(data.nombre), "tipo": data.tipo, "desc": _clean(data.descripcion)}
    )
    new_id = str(res.scalar())
    await session.commit()
    return {"id": new_id, "message": f"Método de pago '{data.nombre}' creado correctamente."}


@router.put("/metodos-pago/{metodo_id}")
async def actualizar_metodo_pago(
    metodo_id: str,
    data: MetodoPagoUpdate,
    request: Request,
    current_user: dict = Depends(require_roles("dueño", "administrador")),
    session: AsyncSession = Depends(get_session),
):
    """Actualiza un método de pago."""
    ctx = await get_academia_context(request, current_user, session)
    aid = str(ctx["academia_id"])

    res = await session.execute(
        text("SELECT id FROM academias.metodos_pago WHERE id = CAST(:id AS UUID) AND academia_id = CAST(:aid AS UUID)"),
        {"id": metodo_id, "aid": aid}
    )
    if not res.fetchone():
        raise HTTPException(status_code=404, detail="Método de pago no encontrado.")

    updates: dict = {}
    if data.nombre is not None:      updates["nombre"] = _clean(data.nombre)
    if data.tipo is not None:        updates["tipo"] = data.tipo
    if data.descripcion is not None: updates["descripcion"] = _clean(data.descripcion)
    if data.activo is not None:      updates["activo"] = data.activo

    if updates:
        set_clause = ", ".join(f"{k} = :{k}" for k in updates)
        updates["id"] = metodo_id
        await session.execute(
            text(f"UPDATE academias.metodos_pago SET {set_clause} WHERE id = CAST(:id AS UUID)"),
            updates
        )
        await session.commit()
    return {"message": "Método de pago actualizado."}


@router.delete("/metodos-pago/{metodo_id}")
async def eliminar_metodo_pago(
    metodo_id: str,
    request: Request,
    current_user: dict = Depends(require_roles("dueño")),
    session: AsyncSession = Depends(get_session),
):
    """Desactiva un método de pago."""
    ctx = await get_academia_context(request, current_user, session)
    aid = str(ctx["academia_id"])

    res = await session.execute(
        text("SELECT id FROM academias.metodos_pago WHERE id = CAST(:id AS UUID) AND academia_id = CAST(:aid AS UUID)"),
        {"id": metodo_id, "aid": aid}
    )
    if not res.fetchone():
        raise HTTPException(status_code=404, detail="Método de pago no encontrado.")

    # Verificar uso
    uso = await session.execute(
        text("SELECT COUNT(*) FROM academias.movimientos_caja WHERE metodo_pago_id = CAST(:id AS UUID)"),
        {"id": metodo_id}
    )
    if (uso.scalar() or 0) > 0:
        await session.execute(
            text("UPDATE academias.metodos_pago SET activo = FALSE WHERE id = CAST(:id AS UUID)"),
            {"id": metodo_id}
        )
        await session.commit()
        return {"message": "Método de pago desactivado (tiene movimientos asociados)."}

    await session.execute(
        text("DELETE FROM academias.metodos_pago WHERE id = CAST(:id AS UUID)"),
        {"id": metodo_id}
    )
    await session.commit()
    return {"message": "Método de pago eliminado."}


# ================================================================
# MOVIMIENTOS DE CAJA — INGRESOS Y EGRESOS
# ================================================================

@router.get("/caja/movimientos")
async def listar_movimientos(
    request: Request,
    cuenta_id: Optional[str] = None,
    tipo: Optional[str] = None,          # "ingreso" | "egreso"
    categoria: Optional[str] = None,
    fecha_desde: Optional[str] = None,   # YYYY-MM-DD
    fecha_hasta: Optional[str] = None,   # YYYY-MM-DD
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(require_roles("dueño", "administrador", "tesorero")),
    session: AsyncSession = Depends(get_session),
):
    """
    Lista movimientos de caja del tenant con filtros.
    Incluye ingresos automáticos (pagos de cuotas) y manuales (egresos, ingresos libres).
    """
    ctx = await get_academia_context(request, current_user, session)
    aid = str(ctx["academia_id"])

    try:
        conditions = ["m.academia_id = CAST(:aid AS UUID)", "m.anulado = FALSE"]
        params: dict = {"aid": aid, "skip": skip, "limit": limit}

        if cuenta_id:
            conditions.append("m.cuenta_id = CAST(:cuenta_id AS UUID)")
            params["cuenta_id"] = cuenta_id
        if tipo:
            conditions.append("m.tipo = :tipo")
            params["tipo"] = tipo
        if categoria:
            conditions.append("m.categoria = :categoria")
            params["categoria"] = categoria
        if fecha_desde:
            conditions.append("m.fecha >= CAST(:fecha_desde AS DATE)")
            params["fecha_desde"] = _clean_date(fecha_desde)
        if fecha_hasta:
            conditions.append("m.fecha <= CAST(:fecha_hasta AS DATE)")
            params["fecha_hasta"] = _clean_date(fecha_hasta)

        where = " AND ".join(conditions)
        res = await session.execute(
            text(f"""
                SELECT m.id, m.cuenta_id, c.nombre AS cuenta_nombre, c.tipo AS cuenta_tipo,
                       m.metodo_pago_id, mp.nombre AS metodo_pago_nombre,
                       m.tipo, m.categoria, m.concepto, m.monto,
                       m.fecha, m.referencia, m.notas, m.pago_id,
                       COALESCE(u.nombre_completo, u.username) AS registrado_por,
                       m.creado_en
                FROM academias.movimientos_caja m
                JOIN academias.cuentas c ON c.id = m.cuenta_id
                LEFT JOIN academias.metodos_pago mp ON mp.id = m.metodo_pago_id
                LEFT JOIN sistema.usuarios u ON u.id = m.registrado_por
                WHERE {where}
                ORDER BY m.fecha DESC, m.creado_en DESC
                LIMIT :limit OFFSET :skip
            """),
            params
        )
        rows = res.fetchall()
        return [
            {
                "id": str(r[0]),
                "cuenta_id": str(r[1]), "cuenta_nombre": r[2], "cuenta_tipo": r[3],
                "metodo_pago_id": str(r[4]) if r[4] else None, "metodo_pago_nombre": r[5],
                "tipo": r[6], "categoria": r[7], "concepto": r[8],
                "monto": float(r[9]),
                "fecha": r[10].isoformat() if r[10] else None,
                "referencia": r[11], "notas": r[12],
                "pago_id": str(r[13]) if r[13] else None,
                "registrado_por": r[14],
                "creado_en": r[15].isoformat() if r[15] else None,
            }
            for r in rows
        ]
    except Exception as e:
        await session.rollback()
        print(f"WARN: Error en listar_movimientos: {e}")
        return []


@router.post("/caja/movimientos", status_code=status.HTTP_201_CREATED)
async def registrar_movimiento(
    data: MovimientoCreate,
    request: Request,
    current_user: dict = Depends(require_roles("dueño", "administrador", "tesorero")),
    session: AsyncSession = Depends(get_session),
):
    """
    Registra un movimiento de caja manual (ingreso o egreso).
    - Ingreso: dinero que entra a una cuenta (no asociado a cuota)
    - Egreso: dinero que sale de una cuenta (gastos, sueldos, etc.)
    """
    ctx = await get_academia_context(request, current_user, session)
    aid = str(ctx["academia_id"])

    if data.tipo not in ("ingreso", "egreso"):
        raise HTTPException(status_code=422, detail="tipo debe ser 'ingreso' o 'egreso'.")
    if data.monto <= 0:
        raise HTTPException(status_code=422, detail="monto debe ser mayor a 0.")

    await _validar_cuenta(data.cuenta_id, aid, session)

    # Validar método de pago si se provee
    if data.metodo_pago_id:
        res_mp = await session.execute(
            text("SELECT id FROM academias.metodos_pago WHERE id = CAST(:id AS UUID) AND academia_id = CAST(:aid AS UUID) AND activo = TRUE"),
            {"id": data.metodo_pago_id, "aid": aid}
        )
        if not res_mp.fetchone():
            raise HTTPException(status_code=404, detail="Método de pago no encontrado o inactivo.")

    fecha_mov = _clean_date(data.fecha) or date.today()

    res = await session.execute(
        text("""
            INSERT INTO academias.movimientos_caja
                (academia_id, cuenta_id, metodo_pago_id, tipo, categoria,
                 concepto, monto, fecha, referencia, notas, registrado_por)
            VALUES
                (CAST(:aid AS UUID), CAST(:cuenta_id AS UUID),
                 CAST(:metodo_pago_id AS UUID),
                 :tipo, :categoria, :concepto, :monto,
                 CAST(:fecha AS DATE), :referencia, :notas, :reg_por)
            RETURNING id
        """),
        {
            "aid": aid, "cuenta_id": data.cuenta_id,
            "metodo_pago_id": data.metodo_pago_id,
            "tipo": data.tipo, "categoria": data.categoria,
            "concepto": _clean(data.concepto), "monto": float(data.monto),
            "fecha": fecha_mov, "referencia": _clean(data.referencia),
            "notas": _clean(data.notas), "reg_por": current_user["user_id"],
        }
    )
    new_id = str(res.scalar())
    await session.commit()
    return {"id": new_id, "message": f"{data.tipo.capitalize()} de Gs. {data.monto:,.0f} registrado correctamente."}


@router.put("/caja/movimientos/{mov_id}/anular")
async def anular_movimiento(
    mov_id: str,
    data: AnularMovimientoRequest,
    request: Request,
    current_user: dict = Depends(require_roles("dueño", "administrador")),
    session: AsyncSession = Depends(get_session),
):
    """Anula un movimiento de caja manual."""
    ctx = await get_academia_context(request, current_user, session)
    aid = str(ctx["academia_id"])

    res = await session.execute(
        text("SELECT id, anulado, pago_id FROM academias.movimientos_caja WHERE id = CAST(:id AS UUID) AND academia_id = CAST(:aid AS UUID)"),
        {"id": mov_id, "aid": aid}
    )
    row = res.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Movimiento no encontrado.")
    if row[1]:
        raise HTTPException(status_code=400, detail="El movimiento ya está anulado.")
    if row[2]:
        raise HTTPException(status_code=400, detail="No se puede anular un movimiento originado por un pago de cuota. Anulá el pago directamente.")

    await session.execute(
        text("""
            UPDATE academias.movimientos_caja SET
                anulado = TRUE, anulado_en = NOW(),
                anulado_por = :por, motivo_anulacion = :motivo
            WHERE id = CAST(:id AS UUID)
        """),
        {"id": mov_id, "por": current_user["user_id"], "motivo": _clean(data.motivo_anulacion)}
    )
    await session.commit()
    return {"message": "Movimiento anulado correctamente."}


# ================================================================
# REPORTES — CIERRE DE CAJA Y FLUJO
# ================================================================

@router.get("/caja/cierre")
async def cierre_caja(
    request: Request,
    fecha_desde: Optional[str] = None,   # YYYY-MM-DD; default: 1er día del mes actual
    fecha_hasta: Optional[str] = None,   # YYYY-MM-DD; default: hoy
    cuenta_id: Optional[str] = None,     # filtrar por cuenta específica
    current_user: dict = Depends(require_roles("dueño", "administrador", "tesorero")),
    session: AsyncSession = Depends(get_session),
):
    """
    Reporte de cierre de caja para el período indicado.
    Devuelve por cada cuenta:
      - saldo_inicial configurado
      - total_ingresos del período (cuotas + manuales)
      - total_egresos del período
      - saldo_estimado = saldo_inicial + ingresos - egresos
      - desglose por método de pago
      - detalle de ingresos por categoría
    """
    ctx = await get_academia_context(request, current_user, session)
    aid = str(ctx["academia_id"])

    try:
        # Defaults de fecha: mes actual
        hoy = date.today()
        fd_date = _clean_date(fecha_desde) or hoy.replace(day=1)
        fh_date = _clean_date(fecha_hasta) or hoy

        # ── Resumen por cuenta ──
        cuenta_filter = "AND m.cuenta_id = CAST(:cuenta_id AS UUID)" if cuenta_id else ""
        params_resumen = {"aid": aid, "fd": fd_date, "fh": fh_date}
        if cuenta_id:
            params_resumen["cuenta_id"] = cuenta_id

        res_resumen = await session.execute(
            text(f"""
                SELECT
                    c.id, c.nombre, c.tipo, c.moneda, c.saldo_inicial,
                    COALESCE(SUM(CASE WHEN m.tipo = 'ingreso' AND m.anulado = FALSE THEN m.monto ELSE 0 END), 0) AS total_ingresos,
                    COALESCE(SUM(CASE WHEN m.tipo = 'egreso'  AND m.anulado = FALSE THEN m.monto ELSE 0 END), 0) AS total_egresos,
                    COUNT(CASE WHEN m.tipo = 'ingreso' AND m.anulado = FALSE THEN 1 END) AS cant_ingresos,
                    COUNT(CASE WHEN m.tipo = 'egreso'  AND m.anulado = FALSE THEN 1 END) AS cant_egresos
                FROM academias.cuentas c
                LEFT JOIN academias.movimientos_caja m
                    ON m.cuenta_id = c.id
                    AND m.fecha BETWEEN CAST(:fd AS DATE) AND CAST(:fh AS DATE)
                WHERE c.academia_id = CAST(:aid AS UUID) AND c.activa = TRUE
                {cuenta_filter}
                GROUP BY c.id, c.nombre, c.tipo, c.moneda, c.saldo_inicial
                ORDER BY c.es_principal DESC, c.nombre
            """),
            params_resumen
        )
        cuentas_rows = res_resumen.fetchall()

        # ── Desglose por método de pago dentro del período ──
        params_mp = {"aid": aid, "fd": fd_date, "fh": fh_date}
        if cuenta_id:
            params_mp["cuenta_id"] = cuenta_id
        mp_filter = "AND m.cuenta_id = CAST(:cuenta_id AS UUID)" if cuenta_id else ""

        res_mp = await session.execute(
            text(f"""
                SELECT
                    m.cuenta_id,
                    COALESCE(mp.nombre, 'Sin especificar') AS metodo_nombre,
                    mp.tipo AS metodo_tipo,
                    m.tipo AS mov_tipo,
                    COALESCE(SUM(m.monto), 0) AS total,
                    COUNT(*) AS cantidad
                FROM academias.movimientos_caja m
                LEFT JOIN academias.metodos_pago mp ON mp.id = m.metodo_pago_id
                WHERE m.academia_id = CAST(:aid AS UUID)
                  AND m.fecha BETWEEN CAST(:fd AS DATE) AND CAST(:fh AS DATE)
                  AND m.anulado = FALSE
                  {mp_filter}
                GROUP BY m.cuenta_id, mp.nombre, mp.tipo, m.tipo
                ORDER BY total DESC
            """),
            params_mp
        )
        mp_rows = res_mp.fetchall()

        # ── Desglose por categoría ──
        res_cat = await session.execute(
            text(f"""
                SELECT
                    m.cuenta_id,
                    m.categoria,
                    m.tipo AS mov_tipo,
                    COALESCE(SUM(m.monto), 0) AS total,
                    COUNT(*) AS cantidad
                FROM academias.movimientos_caja m
                WHERE m.academia_id = CAST(:aid AS UUID)
                  AND m.fecha BETWEEN CAST(:fd AS DATE) AND CAST(:fh AS DATE)
                  AND m.anulado = FALSE
                  {mp_filter}
                GROUP BY m.cuenta_id, m.categoria, m.tipo
                ORDER BY total DESC
            """),
            params_mp
        )
        cat_rows = res_cat.fetchall()

        # ── Construir respuesta ──
        mp_by_cuenta: dict = {}
        for r in mp_rows:
            cid = str(r[0])
            if cid not in mp_by_cuenta:
                mp_by_cuenta[cid] = []
            mp_by_cuenta[cid].append({
                "metodo": r[1], "metodo_tipo": r[2], "mov_tipo": r[3],
                "total": float(r[4]), "cantidad": int(r[5]),
            })

        cat_by_cuenta: dict = {}
        for r in cat_rows:
            cid = str(r[0])
            if cid not in cat_by_cuenta:
                cat_by_cuenta[cid] = []
            cat_by_cuenta[cid].append({
                "categoria": r[1], "mov_tipo": r[2],
                "total": float(r[3]), "cantidad": int(r[4]),
            })

        cuentas_resultado = []
        total_ingresos_global = 0.0
        total_egresos_global = 0.0

        for r in cuentas_rows:
            cid = str(r[0])
            saldo_ini = float(r[4])
            ingresos = float(r[5])
            egresos = float(r[6])
            saldo_est = saldo_ini + ingresos - egresos
            total_ingresos_global += ingresos
            total_egresos_global += egresos

            cuentas_resultado.append({
                "cuenta_id": cid, "cuenta_nombre": r[1],
                "cuenta_tipo": r[2], "moneda": r[3],
                "saldo_inicial": saldo_ini,
                "total_ingresos": ingresos,
                "total_egresos": egresos,
                "saldo_estimado": saldo_est,
                "cant_ingresos": int(r[7]),
                "cant_egresos": int(r[8]),
                "por_metodo_pago": mp_by_cuenta.get(cid, []),
                "por_categoria": cat_by_cuenta.get(cid, []),
            })

        return {
            "periodo": {"fecha_desde": fecha_desde, "fecha_hasta": fecha_hasta},
            "resumen_global": {
                "total_ingresos": total_ingresos_global,
                "total_egresos": total_egresos_global,
                "resultado_neto": total_ingresos_global - total_egresos_global,
            },
            "cuentas": cuentas_resultado,
        }
    except Exception as e:
        await session.rollback()
        print(f"WARN: Error en cierre_caja: {e}")
        return {
            "periodo": {"fecha_desde": fecha_desde or "", "fecha_hasta": fecha_hasta or ""},
            "resumen_global": {"total_ingresos": 0.0, "total_egresos": 0.0, "resultado_neto": 0.0},
            "cuentas": [],
        }


@router.get("/caja/resumen-rapido")
async def resumen_rapido(
    request: Request,
    current_user: dict = Depends(require_roles("dueño", "administrador", "tesorero")),
    session: AsyncSession = Depends(get_session),
):
    """
    Resumen rápido del mes actual: ingresos, egresos y resultado neto por cuenta.
    Ideal para el dashboard.
    """
    ctx = await get_academia_context(request, current_user, session)
    aid = str(ctx["academia_id"])
    hoy = date.today()
    primer_dia = hoy.replace(day=1)

    res = await session.execute(
        text("""
            SELECT
                c.id, c.nombre, c.tipo,
                COALESCE(SUM(CASE WHEN m.tipo = 'ingreso' AND m.anulado = FALSE THEN m.monto ELSE 0 END), 0) AS ing,
                COALESCE(SUM(CASE WHEN m.tipo = 'egreso'  AND m.anulado = FALSE THEN m.monto ELSE 0 END), 0) AS eg
            FROM academias.cuentas c
            LEFT JOIN academias.movimientos_caja m
                ON m.cuenta_id = c.id
                AND m.fecha BETWEEN CAST(:fd AS DATE) AND CAST(:fh AS DATE)
            WHERE c.academia_id = CAST(:aid AS UUID) AND c.activa = TRUE
            GROUP BY c.id, c.nombre, c.tipo
            ORDER BY c.es_principal DESC, c.nombre
        """),
        {"aid": aid, "fd": primer_dia, "fh": hoy}
    )
    rows = res.fetchall()
    cuentas = [
        {
            "cuenta_id": str(r[0]), "cuenta_nombre": r[1], "cuenta_tipo": r[2],
            "ingresos_mes": float(r[3]), "egresos_mes": float(r[4]),
            "neto_mes": float(r[3]) - float(r[4]),
        }
        for r in rows
    ]
    return {
        "mes": hoy.strftime("%Y-%m"),
        "cuentas": cuentas,
        "total_ingresos": sum(c["ingresos_mes"] for c in cuentas),
        "total_egresos": sum(c["egresos_mes"] for c in cuentas),
        "resultado_neto": sum(c["neto_mes"] for c in cuentas),
    }


# ================================================================
# PROVEEDORES — CRUD
# ================================================================

@router.get("/proveedores")
async def listar_proveedores(
    request: Request,
    solo_activos: bool = True,
    current_user: dict = Depends(require_roles("dueño", "administrador", "tesorero")),
    session: AsyncSession = Depends(get_session),
):
    """Lista los proveedores de la academia con saldo pendiente acumulado."""
    ctx = await get_academia_context(request, current_user, session)
    aid = str(ctx["academia_id"])

    try:
        where = "WHERE p.academia_id = CAST(:aid AS UUID)" + (" AND p.activo = TRUE" if solo_activos else "")
        res = await session.execute(
            text(f"""
                SELECT p.id, p.nombre, p.ruc_ci, p.telefono, p.email,
                       p.categoria_frecuente, p.direccion, p.notas, p.activo,
                       p.creado_en,
                       COALESCE(SUM(CASE WHEN cg.estado IN ('pendiente', 'parcial') THEN (cg.monto_total - cg.monto_pagado) ELSE 0 END), 0) AS saldo_pendiente,
                       COALESCE(COUNT(cg.id), 0) AS cant_compras
                FROM academias.proveedores p
                LEFT JOIN academias.compras_gastos cg ON cg.proveedor_id = p.id AND cg.estado != 'anulado'
                {where}
                GROUP BY p.id, p.nombre, p.ruc_ci, p.telefono, p.email, p.categoria_frecuente, p.direccion, p.notas, p.activo, p.creado_en
                ORDER BY p.nombre ASC
            """),
            {"aid": aid}
        )
        rows = res.fetchall()
        return [
            {
                "id": str(r[0]), "nombre": r[1], "ruc_ci": r[2], "telefono": r[3],
                "email": r[4], "categoria_frecuente": r[5], "direccion": r[6],
                "notas": r[7], "activo": r[8],
                "creado_en": r[9].isoformat() if r[9] else None,
                "saldo_pendiente": float(r[10]),
                "cant_compras": int(r[11])
            }
            for r in rows
        ]
    except Exception as e:
        print(f"WARN: Error en listar_proveedores: {e}")
        return []


@router.post("/proveedores", status_code=status.HTTP_201_CREATED)
async def crear_proveedor(
    data: ProveedorCreate,
    request: Request,
    current_user: dict = Depends(require_roles("dueño", "administrador", "tesorero")),
    session: AsyncSession = Depends(get_session),
):
    """Crea un nuevo proveedor o prestador de servicios."""
    ctx = await get_academia_context(request, current_user, session)
    aid = str(ctx["academia_id"])

    nombre = _clean(data.nombre)
    if not nombre:
        raise HTTPException(status_code=422, detail="El nombre del proveedor es obligatorio.")

    res = await session.execute(
        text("""
            INSERT INTO academias.proveedores
                (academia_id, nombre, ruc_ci, telefono, email,
                 categoria_frecuente, direccion, notas)
            VALUES
                (CAST(:aid AS UUID), :nombre, :ruc_ci, :telefono, :email,
                 :cat, :dir, :notas)
            RETURNING id
        """),
        {
            "aid": aid, "nombre": nombre, "ruc_ci": _clean(data.ruc_ci),
            "telefono": _clean(data.telefono), "email": _clean(data.email),
            "cat": _clean(data.categoria_frecuente), "dir": _clean(data.direccion),
            "notas": _clean(data.notas)
        }
    )
    new_id = res.fetchone()[0]
    await session.commit()
    return {"message": "Proveedor registrado con éxito.", "id": str(new_id)}


@router.put("/proveedores/{proveedor_id}")
async def actualizar_proveedor(
    proveedor_id: str,
    data: ProveedorUpdate,
    request: Request,
    current_user: dict = Depends(require_roles("dueño", "administrador", "tesorero")),
    session: AsyncSession = Depends(get_session),
):
    """Actualiza los datos de un proveedor."""
    ctx = await get_academia_context(request, current_user, session)
    aid = str(ctx["academia_id"])

    # Verificar existencia
    chk = await session.execute(
        text("SELECT id FROM academias.proveedores WHERE id = CAST(:id AS UUID) AND academia_id = CAST(:aid AS UUID)"),
        {"id": proveedor_id, "aid": aid}
    )
    if not chk.fetchone():
        raise HTTPException(status_code=404, detail="Proveedor no encontrado.")

    updates = []
    params: dict = {"id": proveedor_id, "aid": aid}

    if data.nombre is not None:
        updates.append("nombre = :nombre")
        params["nombre"] = _clean(data.nombre)
    if data.ruc_ci is not None:
        updates.append("ruc_ci = :ruc_ci")
        params["ruc_ci"] = _clean(data.ruc_ci)
    if data.telefono is not None:
        updates.append("telefono = :telefono")
        params["telefono"] = _clean(data.telefono)
    if data.email is not None:
        updates.append("email = :email")
        params["email"] = _clean(data.email)
    if data.categoria_frecuente is not None:
        updates.append("categoria_frecuente = :categoria_frecuente")
        params["categoria_frecuente"] = _clean(data.categoria_frecuente)
    if data.direccion is not None:
        updates.append("direccion = :direccion")
        params["direccion"] = _clean(data.direccion)
    if data.notas is not None:
        updates.append("notas = :notas")
        params["notas"] = _clean(data.notas)
    if data.activo is not None:
        updates.append("activo = :activo")
        params["activo"] = data.activo

    if updates:
        await session.execute(
            text(f"UPDATE academias.proveedores SET {', '.join(updates)} WHERE id = CAST(:id AS UUID) AND academia_id = CAST(:aid AS UUID)"),
            params
        )
        await session.commit()

    return {"message": "Proveedor actualizado correctamente."}


@router.delete("/proveedores/{proveedor_id}")
async def eliminar_proveedor(
    proveedor_id: str,
    request: Request,
    current_user: dict = Depends(require_roles("dueño", "administrador")),
    session: AsyncSession = Depends(get_session),
):
    """Desactiva un proveedor."""
    ctx = await get_academia_context(request, current_user, session)
    aid = str(ctx["academia_id"])

    res = await session.execute(
        text("UPDATE academias.proveedores SET activo = FALSE WHERE id = CAST(:id AS UUID) AND academia_id = CAST(:aid AS UUID) RETURNING id"),
        {"id": proveedor_id, "aid": aid}
    )
    if not res.fetchone():
        raise HTTPException(status_code=404, detail="Proveedor no encontrado.")
    await session.commit()
    return {"message": "Proveedor desactivado correctamente."}


# ================================================================
# COMPRAS Y GASTOS DE EMPRESA — CRUD & CUENTAS POR PAGAR
# ================================================================

@router.get("/compras-gastos")
async def listar_compras_gastos(
    request: Request,
    estado: Optional[str] = None,
    condicion_pago: Optional[str] = None,
    categoria: Optional[str] = None,
    proveedor_id: Optional[str] = None,
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 150,
    offset: int = 0,
    current_user: dict = Depends(require_roles("dueño", "administrador", "tesorero")),
    session: AsyncSession = Depends(get_session),
):
    """Lista las compras y gastos de empresa con soporte para filtros y estado de pago."""
    ctx = await get_academia_context(request, current_user, session)
    aid = str(ctx["academia_id"])

    try:
        clauses = ["cg.academia_id = CAST(:aid AS UUID)"]
        params: dict = {"aid": aid, "limit": limit, "offset": offset}

        if estado:
            clauses.append("cg.estado = :estado")
            params["estado"] = estado
        if condicion_pago:
            clauses.append("cg.condicion_pago = :condicion_pago")
            params["condicion_pago"] = condicion_pago
        if categoria:
            clauses.append("cg.categoria = :categoria")
            params["categoria"] = categoria
        if proveedor_id:
            clauses.append("cg.proveedor_id = CAST(:proveedor_id AS UUID)")
            params["proveedor_id"] = proveedor_id
        if fecha_desde:
            clauses.append("cg.fecha_emision >= CAST(:fecha_desde AS DATE)")
            params["fecha_desde"] = fecha_desde
        if fecha_hasta:
            clauses.append("cg.fecha_emision <= CAST(:fecha_hasta AS DATE)")
            params["fecha_hasta"] = fecha_hasta
        if search:
            clauses.append("(cg.concepto ILIKE :search OR cg.proveedor_nombre ILIKE :search OR cg.comprobante_nro ILIKE :search)")
            params["search"] = f"%{search}%"

        where = " AND ".join(clauses)

        res = await session.execute(
            text(f"""
                SELECT cg.id, cg.proveedor_id,
                       COALESCE(p.nombre, cg.proveedor_nombre, 'Sin proveedor') AS proveedor_nombre,
                       cg.tipo, cg.categoria, cg.concepto,
                       cg.monto_total, cg.monto_pagado,
                       (cg.monto_total - cg.monto_pagado) AS saldo_pendiente,
                       cg.condicion_pago, cg.estado,
                       cg.fecha_emision, cg.fecha_vencimiento,
                       cg.comprobante_nro,
                       cg.cuenta_id, c.nombre AS cuenta_nombre,
                       cg.metodo_pago_id, mp.nombre AS metodo_pago_nombre,
                       cg.movimiento_caja_id, cg.notas, cg.creado_en
                FROM academias.compras_gastos cg
                LEFT JOIN academias.proveedores p ON p.id = cg.proveedor_id
                LEFT JOIN academias.cuentas c ON c.id = cg.cuenta_id
                LEFT JOIN academias.metodos_pago mp ON mp.id = cg.metodo_pago_id
                WHERE {where}
                ORDER BY cg.fecha_emision DESC, cg.creado_en DESC
                LIMIT :limit OFFSET :offset
            """),
            params
        )
        rows = res.fetchall()
        return [
            {
                "id": str(r[0]),
                "proveedor_id": str(r[1]) if r[1] else None,
                "proveedor_nombre": r[2],
                "tipo": r[3],
                "categoria": r[4],
                "concepto": r[5],
                "monto_total": float(r[6]),
                "monto_pagado": float(r[7]),
                "saldo_pendiente": max(float(r[8]), 0.0),
                "condicion_pago": r[9],
                "estado": r[10],
                "fecha_emision": r[11].isoformat() if r[11] else None,
                "fecha_vencimiento": r[12].isoformat() if r[12] else None,
                "comprobante_nro": r[13],
                "cuenta_id": str(r[14]) if r[14] else None,
                "cuenta_nombre": r[15],
                "metodo_pago_id": str(r[16]) if r[16] else None,
                "metodo_pago_nombre": r[17],
                "movimiento_caja_id": str(r[18]) if r[18] else None,
                "notas": r[19],
                "creado_en": r[20].isoformat() if r[20] else None,
            }
            for r in rows
        ]
    except Exception as e:
        print(f"WARN: Error en listar_compras_gastos: {e}")
        return []


@router.post("/compras-gastos", status_code=status.HTTP_201_CREATED)
async def registrar_compra_gasto(
    data: CompraGastoCreate,
    request: Request,
    current_user: dict = Depends(require_roles("dueño", "administrador", "tesorero")),
    session: AsyncSession = Depends(get_session),
):
    """
    Registra una compra o gasto operativo.
    - Si es contado: descuenta inmediatamente de la cuenta seleccionada generando un movimiento_caja de egreso.
    - Si es crédito: queda como cuenta por pagar pendiente hasta que se registre su pago.
    """
    ctx = await get_academia_context(request, current_user, session)
    aid = str(ctx["academia_id"])

    if data.monto_total <= 0:
        raise HTTPException(status_code=422, detail="El monto debe ser mayor a 0.")

    concepto = _clean(data.concepto)
    if not concepto:
        raise HTTPException(status_code=422, detail="El concepto o detalle del gasto es obligatorio.")

    prov_nombre = _clean(data.proveedor_nombre)
    if data.proveedor_id:
        p_row = await session.execute(
            text("SELECT nombre FROM academias.proveedores WHERE id = CAST(:id AS UUID) AND academia_id = CAST(:aid AS UUID)"),
            {"id": data.proveedor_id, "aid": aid}
        )
        p_data = p_row.fetchone()
        if p_data:
            prov_nombre = p_data[0]

    fecha_emision = _clean_date(data.fecha_emision) or date.today()
    fecha_vencimiento = _clean_date(data.fecha_vencimiento)

    mov_id = None
    monto_pagado = 0.0
    estado = "pendiente"

    if data.condicion_pago == "contado":
        if not data.cuenta_id:
            raise HTTPException(status_code=422, detail="Para compras o gastos al contado, debes seleccionar una cuenta.")
        await _validar_cuenta(data.cuenta_id, aid, session)

        if data.metodo_pago_id:
            mp_chk = await session.execute(
                text("SELECT id FROM academias.metodos_pago WHERE id = CAST(:id AS UUID) AND academia_id = CAST(:aid AS UUID) AND activo = TRUE"),
                {"id": data.metodo_pago_id, "aid": aid}
            )
            if not mp_chk.fetchone():
                raise HTTPException(status_code=404, detail="Método de pago no encontrado o inactivo.")

        concepto_egreso = f"Gasto: {concepto}" + (f" ({prov_nombre})" if prov_nombre else "")
        res_mov = await session.execute(
            text("""
                INSERT INTO academias.movimientos_caja
                    (academia_id, cuenta_id, metodo_pago_id, tipo, categoria,
                     concepto, monto, fecha, referencia, notas, registrado_por)
                VALUES
                    (CAST(:aid AS UUID), CAST(:cuenta_id AS UUID), CAST(:metodo_pago_id AS UUID),
                     'egreso', :categoria, :concepto, :monto,
                     CAST(:fecha AS DATE), :referencia, :notas, :reg_por)
                RETURNING id
            """),
            {
                "aid": aid, "cuenta_id": data.cuenta_id, "metodo_pago_id": data.metodo_pago_id,
                "categoria": data.categoria, "concepto": concepto_egreso, "monto": float(data.monto_total),
                "fecha": fecha_emision, "referencia": _clean(data.comprobante_nro),
                "notas": _clean(data.notas), "reg_por": current_user["user_id"]
            }
        )
        mov_id = res_mov.fetchone()[0]
        monto_pagado = float(data.monto_total)
        estado = "pagado"
    else:
        # Crédito
        monto_pagado = 0.0
        estado = "pendiente"

    res = await session.execute(
        text("""
            INSERT INTO academias.compras_gastos
                (academia_id, proveedor_id, proveedor_nombre, tipo, categoria, concepto,
                 monto_total, monto_pagado, condicion_pago, estado,
                 fecha_emision, fecha_vencimiento, comprobante_nro,
                 cuenta_id, metodo_pago_id, movimiento_caja_id, notas, registrado_por)
            VALUES
                (CAST(:aid AS UUID), CAST(:proveedor_id AS UUID), :proveedor_nombre, :tipo, :categoria, :concepto,
                 :monto_total, :monto_pagado, :condicion_pago, :estado,
                 CAST(:fecha_emision AS DATE), CAST(:fecha_vencimiento AS DATE), :comprobante_nro,
                 CAST(:cuenta_id AS UUID), CAST(:metodo_pago_id AS UUID), CAST(:mov_id AS UUID), :notas, :reg_por)
            RETURNING id
        """),
        {
            "aid": aid, "proveedor_id": data.proveedor_id, "proveedor_nombre": prov_nombre,
            "tipo": data.tipo, "categoria": data.categoria, "concepto": concepto,
            "monto_total": float(data.monto_total), "monto_pagado": monto_pagado,
            "condicion_pago": data.condicion_pago, "estado": estado,
            "fecha_emision": fecha_emision, "fecha_vencimiento": fecha_vencimiento,
            "comprobante_nro": _clean(data.comprobante_nro), "cuenta_id": data.cuenta_id,
            "metodo_pago_id": data.metodo_pago_id, "mov_id": mov_id,
            "notas": _clean(data.notas), "reg_por": current_user["user_id"]
        }
    )
    new_compra_id = res.fetchone()[0]
    await session.commit()
    return {"message": "Compra / Gasto registrado correctamente.", "id": str(new_compra_id), "estado": estado}


@router.post("/compras-gastos/{compra_id}/pagar")
async def pagar_compra_gasto(
    compra_id: str,
    data: CompraGastoPagarRequest,
    request: Request,
    current_user: dict = Depends(require_roles("dueño", "administrador", "tesorero")),
    session: AsyncSession = Depends(get_session),
):
    """Registra el pago (total o parcial) de una compra o gasto pendiente a crédito."""
    ctx = await get_academia_context(request, current_user, session)
    aid = str(ctx["academia_id"])

    res_c = await session.execute(
        text("""
            SELECT id, concepto, proveedor_nombre, categoria, monto_total, monto_pagado, estado, comprobante_nro
            FROM academias.compras_gastos
            WHERE id = CAST(:id AS UUID) AND academia_id = CAST(:aid AS UUID)
        """),
        {"id": compra_id, "aid": aid}
    )
    compra = res_c.fetchone()
    if not compra:
        raise HTTPException(status_code=404, detail="Gasto o compra no encontrada.")

    if compra[6] in ("pagado", "anulado"):
        raise HTTPException(status_code=400, detail=f"Esta compra ya está en estado '{compra[6]}'.")

    monto_total = float(compra[4])
    monto_pagado_actual = float(compra[5])
    saldo_pendiente = max(monto_total - monto_pagado_actual, 0.0)

    if data.monto <= 0:
        raise HTTPException(status_code=422, detail="El monto a abonar debe ser mayor a 0.")
    if data.monto > (saldo_pendiente + 0.01):
        raise HTTPException(status_code=422, detail=f"El monto (Gs. {data.monto:,.0f}) supera el saldo pendiente de Gs. {saldo_pendiente:,.0f}.")

    await _validar_cuenta(data.cuenta_id, aid, session)
    if data.metodo_pago_id:
        mp_chk = await session.execute(
            text("SELECT id FROM academias.metodos_pago WHERE id = CAST(:id AS UUID) AND academia_id = CAST(:aid AS UUID) AND activo = TRUE"),
            {"id": data.metodo_pago_id, "aid": aid}
        )
        if not mp_chk.fetchone():
            raise HTTPException(status_code=404, detail="Método de pago no encontrado o inactivo.")

    fecha_pago = _clean_date(data.fecha) or date.today()
    concepto_egreso = f"Pago deuda: {compra[1]}" + (f" ({compra[2]})" if compra[2] else "")

    res_mov = await session.execute(
        text("""
            INSERT INTO academias.movimientos_caja
                (academia_id, cuenta_id, metodo_pago_id, tipo, categoria,
                 concepto, monto, fecha, referencia, notas, registrado_por)
            VALUES
                (CAST(:aid AS UUID), CAST(:cuenta_id AS UUID), CAST(:metodo_pago_id AS UUID),
                 'egreso', :categoria, :concepto, :monto,
                 CAST(:fecha AS DATE), :referencia, :notas, :reg_por)
            RETURNING id
        """),
        {
            "aid": aid, "cuenta_id": data.cuenta_id, "metodo_pago_id": data.metodo_pago_id,
            "categoria": compra[3], "concepto": concepto_egreso, "monto": float(data.monto),
            "fecha": fecha_pago, "referencia": compra[7],
            "notas": _clean(data.notas), "reg_por": current_user["user_id"]
        }
    )
    mov_id = res_mov.fetchone()[0]

    nuevo_monto_pagado = monto_pagado_actual + float(data.monto)
    nuevo_estado = "pagado" if nuevo_monto_pagado >= (monto_total - 0.01) else "parcial"

    await session.execute(
        text("""
            UPDATE academias.compras_gastos
            SET monto_pagado = :mp,
                estado = :estado,
                cuenta_id = CAST(:cuenta_id AS UUID),
                metodo_pago_id = CAST(:metodo_pago_id AS UUID),
                movimiento_caja_id = CAST(:mov_id AS UUID)
            WHERE id = CAST(:id AS UUID) AND academia_id = CAST(:aid AS UUID)
        """),
        {
            "id": compra_id, "aid": aid, "mp": nuevo_monto_pagado,
            "estado": nuevo_estado, "cuenta_id": data.cuenta_id,
            "metodo_pago_id": data.metodo_pago_id, "mov_id": mov_id
        }
    )
    await session.commit()
    return {
        "message": f"Pago registrado exitosamente. Estado actual: {nuevo_estado}.",
        "monto_pagado": nuevo_monto_pagado,
        "saldo_restante": max(monto_total - nuevo_monto_pagado, 0.0),
        "estado": nuevo_estado
    }


@router.put("/compras-gastos/{compra_id}/anular")
async def anular_compra_gasto(
    compra_id: str,
    data: CompraGastoAnularRequest,
    request: Request,
    current_user: dict = Depends(require_roles("dueño", "administrador")),
    session: AsyncSession = Depends(get_session),
):
    """Anula un registro de compra/gasto y su movimiento de caja correspondiente."""
    ctx = await get_academia_context(request, current_user, session)
    aid = str(ctx["academia_id"])

    res = await session.execute(
        text("""
            SELECT id, movimiento_caja_id, estado, concepto
            FROM academias.compras_gastos
            WHERE id = CAST(:id AS UUID) AND academia_id = CAST(:aid AS UUID)
        """),
        {"id": compra_id, "aid": aid}
    )
    row = res.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Compra o gasto no encontrado.")

    if row[2] == "anulado":
        raise HTTPException(status_code=400, detail="Este registro ya se encuentra anulado.")

    mov_id = row[1]
    motivo = _clean(data.motivo_anulacion) or "Anulado por el usuario"

    if mov_id:
        await session.execute(
            text("""
                UPDATE academias.movimientos_caja
                SET anulado = TRUE,
                    anulado_en = NOW(),
                    anulado_por = :user_id,
                    motivo_anulacion = :motivo
                WHERE id = CAST(:mov_id AS UUID)
            """),
            {"mov_id": mov_id, "user_id": current_user["user_id"], "motivo": motivo}
        )

    await session.execute(
        text("""
            UPDATE academias.compras_gastos
            SET estado = 'anulado',
                notas = CASE WHEN notas IS NOT NULL THEN CONCAT(notas, E'\n[ANULADO]: ', :motivo) ELSE CONCAT('[ANULADO]: ', :motivo) END
            WHERE id = CAST(:id AS UUID) AND academia_id = CAST(:aid AS UUID)
        """),
        {"id": compra_id, "aid": aid, "motivo": motivo}
    )
    await session.commit()
    return {"message": "Compra / Gasto anulado correctamente."}


@router.get("/compras-gastos/resumen")
async def resumen_compras_gastos(
    request: Request,
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    current_user: dict = Depends(require_roles("dueño", "administrador", "tesorero")),
    session: AsyncSession = Depends(get_session),
):
    """Retorna un resumen analítico de compras y cuentas por pagar."""
    ctx = await get_academia_context(request, current_user, session)
    aid = str(ctx["academia_id"])

    hoy = date.today()
    primer_dia = hoy.replace(day=1)
    fd = _clean_date(fecha_desde) or primer_dia
    fh = _clean_date(fecha_hasta) or hoy

    try:
        # Totales generales del período
        res_tot = await session.execute(
            text("""
                SELECT
                    COALESCE(SUM(monto_total), 0) AS total_gastos,
                    COALESCE(SUM(monto_pagado), 0) AS total_pagado,
                    COALESCE(SUM(CASE WHEN estado IN ('pendiente', 'parcial') THEN (monto_total - monto_pagado) ELSE 0 END), 0) AS total_por_pagar
                FROM academias.compras_gastos
                WHERE academia_id = CAST(:aid AS UUID)
                  AND estado != 'anulado'
                  AND fecha_emision BETWEEN CAST(:fd AS DATE) AND CAST(:fh AS DATE)
            """),
            {"aid": aid, "fd": fd, "fh": fh}
        )
        row_tot = res_tot.fetchone()
        total_gastos = float(row_tot[0]) if row_tot else 0.0
        total_pagado = float(row_tot[1]) if row_tot else 0.0
        total_por_pagar = float(row_tot[2]) if row_tot else 0.0

        # Cuentas por pagar vencidas a hoy (histórico completo no anulado)
        res_venc = await session.execute(
            text("""
                SELECT
                    COUNT(id) AS cant_vencidas,
                    COALESCE(SUM(monto_total - monto_pagado), 0) AS monto_vencido
                FROM academias.compras_gastos
                WHERE academia_id = CAST(:aid AS UUID)
                  AND estado IN ('pendiente', 'parcial')
                  AND fecha_vencimiento < CURRENT_DATE
            """),
            {"aid": aid}
        )
        row_venc = res_venc.fetchone()
        cant_vencidas = int(row_venc[0]) if row_venc else 0
        monto_vencido = float(row_venc[1]) if row_venc else 0.0

        # Desglose por categoría
        res_cat = await session.execute(
            text("""
                SELECT categoria, COUNT(id) AS cant, COALESCE(SUM(monto_total), 0) AS total
                FROM academias.compras_gastos
                WHERE academia_id = CAST(:aid AS UUID)
                  AND estado != 'anulado'
                  AND fecha_emision BETWEEN CAST(:fd AS DATE) AND CAST(:fh AS DATE)
                GROUP BY categoria
                ORDER BY total DESC
            """),
            {"aid": aid, "fd": fd, "fh": fh}
        )
        desglose = [
            {"categoria": r[0], "cantidad": int(r[1]), "total": float(r[2])}
            for r in res_cat.fetchall()
        ]

        return {
            "periodo": {"desde": fd.isoformat(), "hasta": fh.isoformat()},
            "total_gastos": total_gastos,
            "total_pagado": total_pagado,
            "total_por_pagar": total_por_pagar,
            "cuentas_vencidas": {
                "cantidad": cant_vencidas,
                "monto_total": monto_vencido
            },
            "desglose_por_categoria": desglose
        }
    except Exception as e:
        print(f"WARN: Error en resumen_compras_gastos: {e}")
        return {
            "periodo": {"desde": fd.isoformat(), "hasta": fh.isoformat()},
            "total_gastos": 0, "total_pagado": 0, "total_por_pagar": 0,
            "cuentas_vencidas": {"cantidad": 0, "monto_total": 0},
            "desglose_por_categoria": []
        }

