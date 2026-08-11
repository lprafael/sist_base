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
