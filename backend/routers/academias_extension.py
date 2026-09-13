"""
routers/academias_extension.py
==============================
Módulo de extensión para gestión completa de Academias Deportivas:
  1. Bajas Temporales / Suspensiones por rango de meses con exclusión de cuotas
  2. Inscripciones múltiples simultáneas a cursos/categorías
  3. Estado de Cuenta Corriente consolidado por alumno con impresión de extracto
  4. Tienda de Uniformes y Accesorios (catálogo, stock, ventas a alumnos y caja)
  5. Competencias y Torneos de la Academia (participantes, aranceles y podios)
  6. Informes mensuales y anuales de cobranzas con métricas de efectividad

Prefix: /academia
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

router = APIRouter(prefix="/academia", tags=["Academias Extensiones"])

# ================================================================
# SCHEMAS PYDANTIC
# ================================================================

class SuspensionRequest(BaseModel):
    fecha_inicio: str               # YYYY-MM-DD
    fecha_fin: str                  # YYYY-MM-DD
    motivo: Optional[str] = None
    meses: Optional[int] = None

class ProductoCreate(BaseModel):
    tipo: str                       # 'uniforme' | 'accesorio' | 'otro'
    nombre: str
    descripcion: Optional[str] = None
    talle_variante: Optional[str] = None
    precio_venta: float
    costo: Optional[float] = 0.0
    stock_actual: int = 0
    stock_minimo: Optional[int] = 2
    imagen_url: Optional[str] = None

class ProductoUpdate(BaseModel):
    tipo: Optional[str] = None
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    talle_variante: Optional[str] = None
    precio_venta: Optional[float] = None
    costo: Optional[float] = None
    stock_actual: Optional[int] = None
    stock_minimo: Optional[int] = None
    imagen_url: Optional[str] = None
    activo: Optional[bool] = None

class VentaProductoCreate(BaseModel):
    producto_id: str
    alumno_id: Optional[str] = None
    tutor_id: Optional[str] = None
    cantidad: int = 1
    precio_unitario: Optional[float] = None
    descuento: Optional[float] = 0.0
    metodo_pago: str = "efectivo"
    metodo_pago_id: Optional[str] = None
    cuenta_id: Optional[str] = None
    fecha: Optional[str] = None
    estado_pago: str = "pagado"     # 'pagado' | 'pendiente'
    entregado: bool = True
    notas: Optional[str] = None

class CompetenciaCreate(BaseModel):
    nombre: str
    organizador: Optional[str] = None
    deporte: Optional[str] = None
    lugar: Optional[str] = None
    fecha_inicio: str               # YYYY-MM-DD
    fecha_fin: Optional[str] = None
    costo_inscripcion: Optional[float] = 0.0
    estado: str = "proxima"         # 'proxima' | 'en_curso' | 'finalizada' | 'cancelada'
    notas: Optional[str] = None

class CompetenciaUpdate(BaseModel):
    nombre: Optional[str] = None
    organizador: Optional[str] = None
    deporte: Optional[str] = None
    lugar: Optional[str] = None
    fecha_inicio: Optional[str] = None
    fecha_fin: Optional[str] = None
    costo_inscripcion: Optional[float] = None
    estado: Optional[str] = None
    notas: Optional[str] = None

class CompetenciaParticipanteCreate(BaseModel):
    alumno_id: str
    categoria_modalidad: Optional[str] = None
    arancel_abonado: bool = False
    monto_arancel: Optional[float] = 0.0
    resultado_logro: Optional[str] = None
    notas: Optional[str] = None

class CompetenciaParticipanteUpdate(BaseModel):
    categoria_modalidad: Optional[str] = None
    arancel_abonado: Optional[bool] = None
    monto_arancel: Optional[float] = None
    resultado_logro: Optional[str] = None
    notas: Optional[str] = None

class InscripcionItem(BaseModel):
    categoria_id: str
    cuota_mensual: Optional[float] = 0.0
    dias_por_semana: Optional[int] = 3
    descuento_aplicado: Optional[float] = 0.0
    beca: Optional[bool] = False

class InscripcionesMultiplesRequest(BaseModel):
    alumno_id: str
    categorias: List[InscripcionItem]
    fecha_inicio: Optional[str] = None
    notas: Optional[str] = None


# ================================================================
# 1. BAJAS TEMPORALES / SUSPENSIONES POR MESES
# ================================================================

@router.post("/alumnos/{alumno_id}/suspension")
async def registrar_suspension(
    alumno_id: str,
    data: SuspensionRequest,
    request: Request,
    current_user: dict = Depends(require_roles("dueño", "administrador")),
    session: AsyncSession = Depends(get_session)
):
    """
    Registra una baja temporal/suspensión por unos meses.
    Pasa el alumno a estado 'suspendido'. Durante ese rango no se generan cuotas.
    """
    ctx = await get_academia_context(request, current_user, session)
    aid = str(ctx["academia_id"])

    # Validar que el alumno pertenece a la academia
    res_al = await session.execute(
        text("SELECT id, nombre, apellido FROM academias.alumnos WHERE id = CAST(:id AS UUID) AND academia_id = CAST(:aid AS UUID)"),
        {"id": alumno_id, "aid": aid}
    )
    if not res_al.fetchone():
        raise HTTPException(status_code=404, detail="Alumno no encontrado.")

    susp_id = str(uuid.uuid4())
    await session.execute(
        text("""
            INSERT INTO academias.alumnos_suspensiones
                (id, alumno_id, academia_id, fecha_inicio, fecha_fin, motivo, activa, registrado_por)
            VALUES
                (CAST(:id AS UUID), CAST(:alumno_id AS UUID), CAST(:aid AS UUID),
                 CAST(:ini AS DATE), CAST(:fin AS DATE), :motivo, TRUE, :reg_por)
        """),
        {
            "id": susp_id, "alumno_id": alumno_id, "aid": aid,
            "ini": data.fecha_inicio, "fin": data.fecha_fin,
            "motivo": data.motivo, "reg_por": current_user["user_id"]
        }
    )

    # Actualizar estado del alumno a 'suspendido'
    await session.execute(
        text("UPDATE academias.alumnos SET estado = 'suspendido', actualizado_en = NOW() WHERE id = CAST(:id AS UUID)"),
        {"id": alumno_id}
    )

    # También actualizar estado en inscripciones activas a 'suspendida'
    await session.execute(
        text("UPDATE academias.inscripciones SET estado = 'suspendida' WHERE alumno_id = CAST(:id AS UUID) AND estado = 'activa'"),
        {"id": alumno_id}
    )

    await session.commit()
    return {"status": "ok", "message": "Baja temporal registrada correctamente.", "suspension_id": susp_id}


@router.get("/alumnos/{alumno_id}/suspensiones")
async def listar_suspensiones_alumno(
    alumno_id: str,
    request: Request,
    current_user: dict = Depends(require_roles("dueño", "administrador", "tesorero")),
    session: AsyncSession = Depends(get_session)
):
    """Consulta el historial de suspensiones/bajas temporales del alumno."""
    ctx = await get_academia_context(request, current_user, session)
    aid = str(ctx["academia_id"])

    res = await session.execute(
        text("""
            SELECT s.id, s.fecha_inicio, s.fecha_fin, s.motivo, s.activa, s.creado_en,
                   COALESCE(u.nombre_completo, u.username) AS registrado_por
            FROM academias.alumnos_suspensiones s
            LEFT JOIN sistema.usuarios u ON u.id = s.registrado_por
            WHERE s.alumno_id = CAST(:id AS UUID) AND s.academia_id = CAST(:aid AS UUID)
            ORDER BY s.creado_en DESC
        """),
        {"id": alumno_id, "aid": aid}
    )
    rows = res.fetchall()
    return [
        {
            "id": str(r[0]),
            "fecha_inicio": r[1].isoformat() if r[1] else None,
            "fecha_fin": r[2].isoformat() if r[2] else None,
            "motivo": r[3],
            "activa": r[4],
            "creado_en": r[5].isoformat() if r[5] else None,
            "registrado_por": r[6],
        }
        for r in rows
    ]


@router.put("/alumnos/suspensiones/{suspension_id}/reactivar")
async def reactivar_alumno(
    suspension_id: str,
    request: Request,
    current_user: dict = Depends(require_roles("dueño", "administrador")),
    session: AsyncSession = Depends(get_session)
):
    """Finaliza anticipadamente una suspensión temporal y reactiva al alumno."""
    ctx = await get_academia_context(request, current_user, session)
    aid = str(ctx["academia_id"])

    res = await session.execute(
        text("SELECT id, alumno_id FROM academias.alumnos_suspensiones WHERE id = CAST(:id AS UUID) AND academia_id = CAST(:aid AS UUID)"),
        {"id": suspension_id, "aid": aid}
    )
    row = res.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Suspensión no encontrada.")

    alumno_id = str(row[1])

    # Marcar suspensión como inactiva y ajustar fecha_fin al día de hoy
    await session.execute(
        text("""
            UPDATE academias.alumnos_suspensiones
            SET activa = FALSE, fecha_fin = CURRENT_DATE
            WHERE id = CAST(:id AS UUID)
        """),
        {"id": suspension_id}
    )

    # Reactivar alumno
    await session.execute(
        text("UPDATE academias.alumnos SET estado = 'activo', actualizado_en = NOW() WHERE id = CAST(:id AS UUID)"),
        {"id": alumno_id}
    )

    # Reactivar inscripciones
    await session.execute(
        text("UPDATE academias.inscripciones SET estado = 'activa' WHERE alumno_id = CAST(:id AS UUID) AND estado = 'suspendida'"),
        {"id": alumno_id}
    )

    await session.commit()
    return {"status": "ok", "message": "Alumno reactivado exitosamente."}


# ================================================================
# 2. INSCRIPCIONES MÚLTIPLES A CURSOS
# ================================================================

@router.post("/inscripciones/multiples")
async def inscribir_multiples_cursos(
    data: InscripcionesMultiplesRequest,
    request: Request,
    current_user: dict = Depends(require_roles("dueño", "administrador", "tesorero")),
    session: AsyncSession = Depends(get_session)
):
    """Inscribe a un alumno a varios cursos/categorías a la vez."""
    ctx = await get_academia_context(request, current_user, session)
    aid = str(ctx["academia_id"])
    fecha_ini = data.fecha_inicio or date.today().isoformat()

    res_al = await session.execute(
        text("SELECT id, nombre, apellido FROM academias.alumnos WHERE id = CAST(:id AS UUID) AND academia_id = CAST(:aid AS UUID)"),
        {"id": data.alumno_id, "aid": aid}
    )
    if not res_al.fetchone():
        raise HTTPException(status_code=404, detail="Alumno no encontrado.")

    if not data.categorias:
        raise HTTPException(status_code=400, detail="Debe seleccionar al menos un curso o categoría.")

    inscritas = 0
    for item in data.categorias:
        # Verificar que no esté ya inscrito en esa categoría activa
        res_ya = await session.execute(
            text("""
                SELECT id FROM academias.inscripciones
                WHERE alumno_id = CAST(:aid AS UUID) AND categoria_id = CAST(:cid AS UUID) AND estado = 'activa'
            """),
            {"aid": data.alumno_id, "cid": item.categoria_id}
        )
        if res_ya.fetchone():
            continue  # ya está inscrito en esa

        new_id = str(uuid.uuid4())
        await session.execute(
            text("""
                INSERT INTO academias.inscripciones
                    (id, alumno_id, categoria_id, fecha_inicio, dias_por_semana,
                     cuota_mensual, descuento_aplicado, beca, notas)
                VALUES
                    (CAST(:id AS UUID), CAST(:alumno_id AS UUID), CAST(:categoria_id AS UUID),
                     CAST(:fecha_inicio AS DATE), :dias, :cuota, :desc, :beca, :notas)
            """),
            {
                "id": new_id, "alumno_id": data.alumno_id, "categoria_id": item.categoria_id,
                "fecha_inicio": fecha_ini, "dias": item.dias_por_semana or 3,
                "cuota": float(item.cuota_mensual or 0), "desc": float(item.descuento_aplicado or 0),
                "beca": item.beca or False, "notas": data.notas,
            }
        )
        inscritas += 1

    await session.commit()
    return {"status": "ok", "message": f"Inscrito con éxito a {inscritas} curso(s).", "inscritas": inscritas}


# ================================================================
# 3. ESTADO DE CUENTA CORRIENTE CONSOLIDADO POR ALUMNO
# ================================================================

@router.get("/alumnos/{alumno_id}/estado-cuenta")
async def obtener_estado_cuenta(
    alumno_id: str,
    request: Request,
    current_user: dict = Depends(require_roles("dueño", "administrador", "tesorero")),
    session: AsyncSession = Depends(get_session)
):
    """
    Genera el Estado de Cuenta Corriente unificado del alumno:
      - Datos personales y tutores
      - Datos de facturación
      - Detalle de cargos (cuotas mensuales, matrículas, compras de productos)
      - Detalle de pagos realizados con comprobantes
      - Resumen de saldo pendiente o al día
    """
    ctx = await get_academia_context(request, current_user, session)
    aid = str(ctx["academia_id"])

    # 1. Alumno
    res_al = await session.execute(
        text("""
            SELECT a.id, a.nombre, a.apellido, a.fecha_nacimiento, a.estado,
                   s.nombre AS sucursal_nombre, ac.nombre AS academia_nombre,
                   ac.telefono AS academia_telefono, ac.email AS academia_email, ac.ruc_con_dv AS academia_ruc
            FROM academias.alumnos a
            JOIN academias.academias ac ON ac.id = a.academia_id
            LEFT JOIN academias.sucursales s ON s.id = a.sucursal_id
            WHERE a.id = CAST(:id AS UUID) AND a.academia_id = CAST(:aid AS UUID)
        """),
        {"id": alumno_id, "aid": aid}
    )
    row_al = res_al.fetchone()
    if not row_al:
        raise HTTPException(status_code=404, detail="Alumno no encontrado.")

    # 2. Datos de facturación vinculados
    res_df = await session.execute(
        text("""
            SELECT receptor_nombre, receptor_ruc, receptor_dv, receptor_email
            FROM facturacion.datos_facturacion
            WHERE academia_id = CAST(:aid AS UUID) AND (alumno_id = CAST(:id AS UUID) OR tutor_id IN (
                SELECT tutor_id FROM academias.alumno_tutores WHERE alumno_id = CAST(:id AS UUID)
            ))
            ORDER BY es_pagador_principal DESC LIMIT 1
        """),
        {"aid": aid, "id": alumno_id}
    )
    row_df = res_df.fetchone()

    # 3. Tutor principal
    res_tut = await session.execute(
        text("""
            SELECT t.nombre || ' ' || COALESCE(t.apellido, '') AS nombre, t.telefono, t.email, t.vinculo
            FROM academias.tutores t
            JOIN academias.alumno_tutores at2 ON at2.tutor_id = t.id
            WHERE at2.alumno_id = CAST(:id AS UUID)
            ORDER BY at2.es_tutor_principal DESC LIMIT 1
        """),
        {"id": alumno_id}
    )
    row_tut = res_tut.fetchone()

    # 4. Cargos: Cuotas
    res_cuotas = await session.execute(
        text("""
            SELECT q.id, q.periodo, c.nombre AS categoria, q.monto_final,
                   COALESCE(q.monto_pagado, 0) AS monto_pagado,
                   (q.monto_final - COALESCE(q.monto_pagado, 0)) AS saldo_pendiente,
                   q.estado, q.fecha_vencimiento
            FROM academias.cuotas q
            JOIN academias.inscripciones i ON i.id = q.inscripcion_id
            LEFT JOIN academias.categorias c ON c.id = i.categoria_id
            WHERE q.alumno_id = CAST(:id AS UUID) AND q.academia_id = CAST(:aid AS UUID)
            ORDER BY q.periodo ASC
        """),
        {"id": alumno_id, "aid": aid}
    )
    cuotas_list = [
        {
            "id": str(r[0]), "tipo": "cuota", "concepto": f"Cuota {r[1]} ({r[2] or 'General'})",
            "periodo": r[1], "monto_total": float(r[3]), "monto_pagado": float(r[4]),
            "saldo": float(r[5]), "estado": r[6], "fecha_vencimiento": r[7].isoformat() if r[7] else None,
        }
        for r in res_cuotas.fetchall()
    ]

    # 5. Cargos: Matrículas
    res_mat = await session.execute(
        text("""
            SELECT id, anio, monto, estado, fecha_vencimiento
            FROM academias.matriculas
            WHERE alumno_id = CAST(:id AS UUID) AND academia_id = CAST(:aid AS UUID)
            ORDER BY anio ASC
        """),
        {"id": alumno_id, "aid": aid}
    )
    mat_list = [
        {
            "id": str(r[0]), "tipo": "matricula", "concepto": f"Matrícula Anual {r[1]}",
            "periodo": str(r[1]), "monto_total": float(r[2]),
            "monto_pagado": float(r[2]) if r[3] == "pagada" else 0.0,
            "saldo": 0.0 if r[3] == "pagada" else float(r[2]),
            "estado": r[3], "fecha_vencimiento": r[4].isoformat() if r[4] else None,
        }
        for r in res_mat.fetchall()
    ]

    # 6. Cargos: Compras de productos (uniformes/accesorios)
    res_prod = await session.execute(
        text("""
            SELECT v.id, p.nombre, p.tipo, v.cantidad, v.monto_total, v.estado_pago, v.fecha
            FROM academias.ventas_productos v
            JOIN academias.productos p ON p.id = v.producto_id
            WHERE v.alumno_id = CAST(:id AS UUID) AND v.academia_id = CAST(:aid AS UUID)
            ORDER BY v.fecha ASC
        """),
        {"id": alumno_id, "aid": aid}
    )
    prod_list = [
        {
            "id": str(r[0]), "tipo": "producto", "concepto": f"{r[1]} (x{r[3]})",
            "periodo": r[6].isoformat() if r[6] else "", "monto_total": float(r[4]),
            "monto_pagado": float(r[4]) if r[5] == "pagado" else 0.0,
            "saldo": 0.0 if r[5] == "pagado" else float(r[4]),
            "estado": r[5], "fecha_vencimiento": r[6].isoformat() if r[6] else None,
        }
        for r in res_prod.fetchall()
    ]

    todos_cargos = cuotas_list + mat_list + prod_list

    # 7. Pagos realizados
    res_pagos = await session.execute(
        text("""
            SELECT p.id, p.fecha_pago, p.monto, p.metodo_pago, p.notas,
                   c.periodo, p.anulado
            FROM academias.pagos p
            JOIN academias.cuotas c ON c.id = p.cuota_id
            WHERE p.alumno_id = CAST(:id AS UUID) AND p.academia_id = CAST(:aid AS UUID)
            ORDER BY p.fecha_pago DESC
        """),
        {"id": alumno_id, "aid": aid}
    )
    pagos_list = [
        {
            "id": str(r[0]), "fecha": r[1].isoformat() if r[1] else None,
            "monto": float(r[2]), "metodo_pago": r[3], "notas": r[4],
            "periodo": r[5], "anulado": r[6],
        }
        for r in res_pagos.fetchall()
    ]

    # Cálculos totales
    total_cargos = sum(c["monto_total"] for c in todos_cargos if c["estado"] != "anulada")
    total_pagado = sum(c["monto_pagado"] for c in todos_cargos if c["estado"] != "anulada")
    saldo_total = sum(c["saldo"] for c in todos_cargos if c["estado"] not in ("anulada", "becada"))

    return {
        "alumno": {
            "id": str(row_al[0]),
            "nombre_completo": f"{row_al[1]} {row_al[2] or ''}".strip(),
            "fecha_nacimiento": row_al[3].isoformat() if row_al[3] else None,
            "estado": row_al[4],
            "sucursal": row_al[5] or "Sede Central",
        },
        "academia": {
            "nombre": row_al[6], "telefono": row_al[7], "email": row_al[8], "ruc": row_al[9],
        },
        "tutor": {
            "nombre": row_tut[0] if row_tut else "No asignado",
            "telefono": row_tut[1] if row_tut else "",
            "email": row_tut[2] if row_tut else "",
            "vinculo": row_tut[3] if row_tut else "",
        },
        "datos_facturacion": {
            "nombre": row_df[0] if row_df else (f"{row_al[1]} {row_al[2] or ''}".strip()),
            "ruc": f"{row_df[1]}-{row_df[2]}" if (row_df and row_df[2]) else (row_df[1] if row_df else ""),
            "email": row_df[3] if row_df else "",
        },
        "totales": {
            "total_cargos": total_cargos,
            "total_pagado": total_pagado,
            "saldo_pendiente": saldo_total,
            "al_dia": saldo_total <= 0,
        },
        "cargos": todos_cargos,
        "pagos": pagos_list,
        "fecha_emision": date.today().isoformat(),
    }


# ================================================================
# 4. TIENDA: UNIFORMES Y ACCESORIOS
# ================================================================

@router.get("/productos")
async def listar_productos(
    request: Request,
    tipo: Optional[str] = None,      # 'uniforme' | 'accesorio' | 'otro'
    solo_activos: bool = True,
    current_user: dict = Depends(require_roles("dueño", "administrador", "tesorero", "profesor")),
    session: AsyncSession = Depends(get_session)
):
    """Lista el catálogo de uniformes y accesorios de la academia."""
    ctx = await get_academia_context(request, current_user, session)
    aid = str(ctx["academia_id"])

    conditions = ["academia_id = CAST(:aid AS UUID)"]
    params: dict = {"aid": aid}
    if solo_activos:
        conditions.append("activo = TRUE")
    if tipo:
        conditions.append("tipo = :tipo")
        params["tipo"] = tipo

    where = " AND ".join(conditions)
    res = await session.execute(
        text(f"""
            SELECT id, tipo, nombre, descripcion, talle_variante, precio_venta, costo,
                   stock_actual, stock_minimo, imagen_url, activo, creado_en
            FROM academias.productos
            WHERE {where}
            ORDER BY tipo, nombre, talle_variante
        """),
        params
    )
    rows = res.fetchall()
    return [
        {
            "id": str(r[0]), "tipo": r[1], "nombre": r[2], "descripcion": r[3],
            "talle_variante": r[4], "precio_venta": float(r[5]), "costo": float(r[6] or 0),
            "stock_actual": int(r[7]), "stock_minimo": int(r[8] or 2),
            "stock_bajo": int(r[7]) <= int(r[8] or 2),
            "imagen_url": r[9], "activo": r[10],
            "creado_en": r[11].isoformat() if r[11] else None,
        }
        for r in rows
    ]


@router.post("/productos", status_code=status.HTTP_201_CREATED)
async def crear_producto(
    data: ProductoCreate,
    request: Request,
    current_user: dict = Depends(require_roles("dueño", "administrador")),
    session: AsyncSession = Depends(get_session)
):
    """Agrega un nuevo uniforme o accesorio al catálogo."""
    ctx = await get_academia_context(request, current_user, session)
    aid = str(ctx["academia_id"])

    new_id = str(uuid.uuid4())
    await session.execute(
        text("""
            INSERT INTO academias.productos
                (id, academia_id, tipo, nombre, descripcion, talle_variante,
                 precio_venta, costo, stock_actual, stock_minimo, imagen_url)
            VALUES
                (CAST(:id AS UUID), CAST(:aid AS UUID), :tipo, :nombre, :desc, :talle,
                 :precio, :costo, :stock, :stock_min, :img)
        """),
        {
            "id": new_id, "aid": aid, "tipo": data.tipo, "nombre": data.nombre.strip(),
            "desc": data.descripcion, "talle": data.talle_variante,
            "precio": float(data.precio_venta), "costo": float(data.costo or 0),
            "stock": int(data.stock_actual or 0), "stock_min": int(data.stock_minimo or 2),
            "img": data.imagen_url,
        }
    )
    await session.commit()
    return {"status": "ok", "message": f"{data.tipo.capitalize()} '{data.nombre}' creado correctamente.", "id": new_id}


@router.put("/productos/{producto_id}")
async def actualizar_producto(
    producto_id: str,
    data: ProductoUpdate,
    request: Request,
    current_user: dict = Depends(require_roles("dueño", "administrador")),
    session: AsyncSession = Depends(get_session)
):
    """Actualiza datos, precio o stock de un producto."""
    ctx = await get_academia_context(request, current_user, session)
    aid = str(ctx["academia_id"])

    updates = {}
    if data.tipo is not None:           updates["tipo"] = data.tipo
    if data.nombre is not None:         updates["nombre"] = data.nombre.strip()
    if data.descripcion is not None:    updates["descripcion"] = data.descripcion
    if data.talle_variante is not None: updates["talle_variante"] = data.talle_variante
    if data.precio_venta is not None:   updates["precio_venta"] = float(data.precio_venta)
    if data.costo is not None:          updates["costo"] = float(data.costo)
    if data.stock_actual is not None:   updates["stock_actual"] = int(data.stock_actual)
    if data.stock_minimo is not None:   updates["stock_minimo"] = int(data.stock_minimo)
    if data.imagen_url is not None:     updates["imagen_url"] = data.imagen_url
    if data.activo is not None:         updates["activo"] = data.activo

    if updates:
        set_clauses = ", ".join(f"{k} = :{k}" for k in updates)
        updates["id"] = producto_id
        updates["aid"] = aid
        await session.execute(
            text(f"UPDATE academias.productos SET {set_clauses}, actualizado_en = NOW() WHERE id = CAST(:id AS UUID) AND academia_id = CAST(:aid AS UUID)"),
            updates
        )
        await session.commit()

    return {"status": "ok", "message": "Producto actualizado correctamente."}


@router.delete("/productos/{producto_id}")
async def eliminar_producto(
    producto_id: str,
    request: Request,
    current_user: dict = Depends(require_roles("dueño")),
    session: AsyncSession = Depends(get_session)
):
    """Desactiva un producto del catálogo."""
    ctx = await get_academia_context(request, current_user, session)
    aid = str(ctx["academia_id"])

    await session.execute(
        text("UPDATE academias.productos SET activo = FALSE, actualizado_en = NOW() WHERE id = CAST(:id AS UUID) AND academia_id = CAST(:aid AS UUID)"),
        {"id": producto_id, "aid": aid}
    )
    await session.commit()
    return {"status": "ok", "message": "Producto desactivado."}


@router.get("/ventas-productos")
async def listar_ventas_productos(
    request: Request,
    alumno_id: Optional[str] = None,
    limit: int = 100,
    current_user: dict = Depends(require_roles("dueño", "administrador", "tesorero")),
    session: AsyncSession = Depends(get_session)
):
    """Lista las ventas de uniformes y accesorios."""
    ctx = await get_academia_context(request, current_user, session)
    aid = str(ctx["academia_id"])

    conditions = ["v.academia_id = CAST(:aid AS UUID)"]
    params: dict = {"aid": aid, "limit": limit}
    if alumno_id:
        conditions.append("v.alumno_id = CAST(:alumno_id AS UUID)")
        params["alumno_id"] = alumno_id

    where = " AND ".join(conditions)
    res = await session.execute(
        text(f"""
            SELECT v.id, p.nombre AS producto_nombre, p.tipo AS producto_tipo, p.talle_variante,
                   a.nombre || ' ' || COALESCE(a.apellido, '') AS alumno_nombre,
                   v.cantidad, v.precio_unitario, v.descuento, v.monto_total,
                   v.metodo_pago, c.nombre AS cuenta_nombre, v.fecha,
                   v.estado_pago, v.entregado, v.fecha_entrega, v.notas, v.creado_en
            FROM academias.ventas_productos v
            JOIN academias.productos p ON p.id = v.producto_id
            LEFT JOIN academias.alumnos a ON a.id = v.alumno_id
            LEFT JOIN academias.cuentas c ON c.id = v.cuenta_id
            WHERE {where}
            ORDER BY v.fecha DESC, v.creado_en DESC
            LIMIT :limit
        """),
        params
    )
    rows = res.fetchall()
    return [
        {
            "id": str(r[0]), "producto_nombre": r[1], "producto_tipo": r[2], "talle_variante": r[3],
            "alumno_nombre": r[4] if r[4] else "Venta mostrador",
            "cantidad": int(r[5]), "precio_unitario": float(r[6]), "descuento": float(r[7]),
            "monto_total": float(r[8]), "metodo_pago": r[9], "cuenta_nombre": r[10] or "Caja Principal",
            "fecha": r[11].isoformat() if r[11] else None, "estado_pago": r[12],
            "entregado": r[13], "fecha_entrega": r[14].isoformat() if r[14] else None,
            "notas": r[15], "creado_en": r[16].isoformat() if r[16] else None,
        }
        for r in rows
    ]


@router.post("/ventas-productos", status_code=status.HTTP_201_CREATED)
async def registrar_venta_producto(
    data: VentaProductoCreate,
    request: Request,
    current_user: dict = Depends(require_roles("dueño", "administrador", "tesorero")),
    session: AsyncSession = Depends(get_session)
):
    """
    Registra una venta de uniforme/accesorio:
      1. Descuenta stock del producto
      2. Registra la venta
      3. Registra movimiento de ingreso en Tesorería / Caja si se especificó cuenta
    """
    ctx = await get_academia_context(request, current_user, session)
    aid = str(ctx["academia_id"])

    # Validar producto y stock
    res_p = await session.execute(
        text("SELECT id, nombre, tipo, precio_venta, stock_actual FROM academias.productos WHERE id = CAST(:id AS UUID) AND academia_id = CAST(:aid AS UUID) AND activo = TRUE"),
        {"id": data.producto_id, "aid": aid}
    )
    prod = res_p.fetchone()
    if not prod:
        raise HTTPException(status_code=404, detail="Producto no encontrado o inactivo.")

    prod_id, prod_nom, prod_tipo, precio_base, stock_disp = prod
    cant = max(data.cantidad, 1)

    if stock_disp < cant:
        raise HTTPException(status_code=400, detail=f"Stock insuficiente para '{prod_nom}'. Disponible: {stock_disp}, Solicitado: {cant}")

    precio_unit = float(data.precio_unitario if data.precio_unitario is not None else precio_base)
    desc = float(data.descuento or 0)
    monto_total = max((precio_unit * cant) - desc, 0)
    fecha_venta = data.fecha or date.today().isoformat()

    venta_id = str(uuid.uuid4())
    await session.execute(
        text("""
            INSERT INTO academias.ventas_productos
                (id, academia_id, producto_id, alumno_id, tutor_id, cantidad,
                 precio_unitario, descuento, monto_total, metodo_pago, metodo_pago_id,
                 cuenta_id, fecha, estado_pago, entregado, fecha_entrega, notas, registrado_por)
            VALUES
                (CAST(:id AS UUID), CAST(:aid AS UUID), CAST(:pid AS UUID),
                 CAST(:alid AS UUID), CAST(:tid AS UUID), :cant,
                 :p_unit, :desc, :total, :metodo, CAST(:mid AS UUID),
                 CAST(:cid AS UUID), CAST(:fecha AS DATE), :estado, :entregado,
                 CASE WHEN :entregado THEN CAST(:fecha AS DATE) ELSE NULL END,
                 :notas, :reg_por)
        """),
        {
            "id": venta_id, "aid": aid, "pid": data.producto_id,
            "alid": data.alumno_id, "tid": data.tutor_id, "cant": cant,
            "p_unit": precio_unit, "desc": desc, "total": monto_total,
            "metodo": data.metodo_pago, "mid": data.metodo_pago_id,
            "cid": data.cuenta_id, "fecha": fecha_venta,
            "estado": data.estado_pago, "entregado": data.entregado,
            "notas": data.notas, "reg_por": current_user["user_id"]
        }
    )

    # Descontar stock
    await session.execute(
        text("UPDATE academias.productos SET stock_actual = stock_actual - :cant, actualizado_en = NOW() WHERE id = CAST(:id AS UUID)"),
        {"cant": cant, "id": data.producto_id}
    )

    # Registrar ingreso en Tesorería / Caja si la venta está pagada y tiene cuenta destino
    if data.estado_pago == "pagado" and data.cuenta_id:
        concepto = f"Venta {prod_tipo.capitalize()}: {prod_nom} (x{cant})"
        await session.execute(
            text("""
                INSERT INTO academias.movimientos_caja
                    (academia_id, cuenta_id, metodo_pago_id, tipo, categoria, concepto, monto, fecha, notas, registrado_por)
                VALUES
                    (CAST(:aid AS UUID), CAST(:cid AS UUID), CAST(:mid AS UUID),
                     'ingreso', 'materiales', :concepto, :monto, CAST(:fecha AS DATE), :notas, :reg_por)
            """),
            {
                "aid": aid, "cid": data.cuenta_id, "mid": data.metodo_pago_id,
                "concepto": concepto, "monto": monto_total, "fecha": fecha_venta,
                "notas": f"Venta ID {venta_id[:8]}", "reg_por": current_user["user_id"]
            }
        )

    await session.commit()
    return {"status": "ok", "message": f"Venta de {cant}x '{prod_nom}' registrada exitosamente.", "id": venta_id}


@router.put("/ventas-productos/{venta_id}/entregar")
async def marcar_venta_entregada(
    venta_id: str,
    request: Request,
    current_user: dict = Depends(require_roles("dueño", "administrador", "tesorero")),
    session: AsyncSession = Depends(get_session)
):
    """Marca un pedido de uniforme o accesorio como entregado al alumno."""
    ctx = await get_academia_context(request, current_user, session)
    aid = str(ctx["academia_id"])

    await session.execute(
        text("UPDATE academias.ventas_productos SET entregado = TRUE, fecha_entrega = CURRENT_DATE WHERE id = CAST(:id AS UUID) AND academia_id = CAST(:aid AS UUID)"),
        {"id": venta_id, "aid": aid}
    )
    await session.commit()
    return {"status": "ok", "message": "Producto marcado como entregado."}


# ================================================================
# 5. COMPETENCIAS Y TORNEOS DE LA ACADEMIA
# ================================================================

@router.get("/competencias")
async def listar_competencias(
    request: Request,
    estado: Optional[str] = None,
    current_user: dict = Depends(require_roles("dueño", "administrador", "tesorero", "profesor")),
    session: AsyncSession = Depends(get_session)
):
    """Lista las competencias y torneos en los que participa la academia."""
    ctx = await get_academia_context(request, current_user, session)
    aid = str(ctx["academia_id"])

    conditions = ["c.academia_id = CAST(:aid AS UUID)"]
    params: dict = {"aid": aid}
    if estado:
        conditions.append("c.estado = :estado")
        params["estado"] = estado

    where = " AND ".join(conditions)
    res = await session.execute(
        text(f"""
            SELECT c.id, c.nombre, c.organizador, c.deporte, c.lugar,
                   c.fecha_inicio, c.fecha_fin, c.costo_inscripcion, c.estado, c.notas,
                   COUNT(cp.id) AS cant_participantes,
                   COUNT(CASE WHEN cp.resultado_logro IS NOT NULL AND cp.resultado_logro != '' THEN 1 END) AS cant_podios
            FROM academias.competencias c
            LEFT JOIN academias.competencia_participantes cp ON cp.competencia_id = c.id
            WHERE {where}
            GROUP BY c.id
            ORDER BY c.fecha_inicio DESC
        """),
        params
    )
    rows = res.fetchall()
    return [
        {
            "id": str(r[0]), "nombre": r[1], "organizador": r[2], "deporte": r[3],
            "lugar": r[4], "fecha_inicio": r[5].isoformat() if r[5] else None,
            "fecha_fin": r[6].isoformat() if r[6] else None,
            "costo_inscripcion": float(r[7] or 0), "estado": r[8], "notas": r[9],
            "cant_participantes": int(r[10]), "cant_podios": int(r[11]),
        }
        for r in rows
    ]


@router.post("/competencias", status_code=status.HTTP_201_CREATED)
async def crear_competencia(
    data: CompetenciaCreate,
    request: Request,
    current_user: dict = Depends(require_roles("dueño", "administrador")),
    session: AsyncSession = Depends(get_session)
):
    """Registra una nueva competencia o torneo."""
    ctx = await get_academia_context(request, current_user, session)
    aid = str(ctx["academia_id"])

    new_id = str(uuid.uuid4())
    await session.execute(
        text("""
            INSERT INTO academias.competencias
                (id, academia_id, nombre, organizador, deporte, lugar, fecha_inicio, fecha_fin, costo_inscripcion, estado, notas)
            VALUES
                (CAST(:id AS UUID), CAST(:aid AS UUID), :nom, :org, :dep, :lugar,
                 CAST(:ini AS DATE), CAST(:fin AS DATE), :costo, :estado, :notas)
        """),
        {
            "id": new_id, "aid": aid, "nom": data.nombre.strip(), "org": data.organizador,
            "dep": data.deporte, "lugar": data.lugar, "ini": data.fecha_inicio,
            "fin": data.fecha_fin, "costo": float(data.costo_inscripcion or 0),
            "estado": data.estado, "notas": data.notas
        }
    )
    await session.commit()
    return {"status": "ok", "message": f"Competencia '{data.nombre}' registrada correctamente.", "id": new_id}


@router.put("/competencias/{competencia_id}")
async def actualizar_competencia(
    competencia_id: str,
    data: CompetenciaUpdate,
    request: Request,
    current_user: dict = Depends(require_roles("dueño", "administrador")),
    session: AsyncSession = Depends(get_session)
):
    """Actualiza los datos de una competencia."""
    ctx = await get_academia_context(request, current_user, session)
    aid = str(ctx["academia_id"])

    updates = {}
    if data.nombre is not None:            updates["nombre"] = data.nombre.strip()
    if data.organizador is not None:       updates["organizador"] = data.organizador
    if data.deporte is not None:           updates["deporte"] = data.deporte
    if data.lugar is not None:             updates["lugar"] = data.lugar
    if data.fecha_inicio is not None:      updates["fecha_inicio"] = data.fecha_inicio
    if data.fecha_fin is not None:         updates["fecha_fin"] = data.fecha_fin
    if data.costo_inscripcion is not None: updates["costo_inscripcion"] = float(data.costo_inscripcion)
    if data.estado is not None:            updates["estado"] = data.estado
    if data.notas is not None:             updates["notas"] = data.notas

    if updates:
        set_clauses = ", ".join(f"{k} = :{k}" for k in updates)
        updates["id"] = competencia_id
        updates["aid"] = aid
        await session.execute(
            text(f"UPDATE academias.competencias SET {set_clauses} WHERE id = CAST(:id AS UUID) AND academia_id = CAST(:aid AS UUID)"),
            updates
        )
        await session.commit()

    return {"status": "ok", "message": "Competencia actualizada."}


@router.delete("/competencias/{competencia_id}")
async def eliminar_competencia(
    competencia_id: str,
    request: Request,
    current_user: dict = Depends(require_roles("dueño", "administrador")),
    session: AsyncSession = Depends(get_session)
):
    """Elimina una competencia."""
    ctx = await get_academia_context(request, current_user, session)
    aid = str(ctx["academia_id"])

    await session.execute(
        text("DELETE FROM academias.competencias WHERE id = CAST(:id AS UUID) AND academia_id = CAST(:aid AS UUID)"),
        {"id": competencia_id, "aid": aid}
    )
    await session.commit()
    return {"status": "ok", "message": "Competencia eliminada."}


@router.get("/competencias/{competencia_id}/participantes")
async def listar_participantes_competencia(
    competencia_id: str,
    request: Request,
    current_user: dict = Depends(require_roles("dueño", "administrador", "tesorero", "profesor")),
    session: AsyncSession = Depends(get_session)
):
    """Lista los alumnos de la academia inscritos en una competencia."""
    ctx = await get_academia_context(request, current_user, session)
    aid = str(ctx["academia_id"])

    res = await session.execute(
        text("""
            SELECT cp.id, cp.alumno_id, a.nombre || ' ' || COALESCE(a.apellido, '') AS alumno_nombre,
                   a.foto_perfil, cp.categoria_modalidad, cp.arancel_abonado, cp.monto_arancel,
                   cp.resultado_logro, cp.notas, cp.creado_en
            FROM academias.competencia_participantes cp
            JOIN academias.alumnos a ON a.id = cp.alumno_id
            JOIN academias.competencias c ON c.id = cp.competencia_id
            WHERE cp.competencia_id = CAST(:cid AS UUID) AND c.academia_id = CAST(:aid AS UUID)
            ORDER BY cp.resultado_logro DESC, a.apellido, a.nombre
        """),
        {"cid": competencia_id, "aid": aid}
    )
    rows = res.fetchall()
    return [
        {
            "id": str(r[0]), "alumno_id": str(r[1]), "alumno_nombre": r[2],
            "foto_perfil": r[3], "categoria_modalidad": r[4] or "General",
            "arancel_abonado": r[5], "monto_arancel": float(r[6] or 0),
            "resultado_logro": r[7], "notas": r[8],
            "creado_en": r[9].isoformat() if r[9] else None,
        }
        for r in rows
    ]


@router.post("/competencias/{competencia_id}/participantes", status_code=status.HTTP_201_CREATED)
async def inscribir_alumno_competencia(
    competencia_id: str,
    data: CompetenciaParticipanteCreate,
    request: Request,
    current_user: dict = Depends(require_roles("dueño", "administrador", "profesor")),
    session: AsyncSession = Depends(get_session)
):
    """Inscribe a un alumno en una competencia."""
    ctx = await get_academia_context(request, current_user, session)
    aid = str(ctx["academia_id"])

    # Validar que la competencia y el alumno pertenecen a la academia
    res_c = await session.execute(
        text("SELECT id FROM academias.competencias WHERE id = CAST(:id AS UUID) AND academia_id = CAST(:aid AS UUID)"),
        {"id": competencia_id, "aid": aid}
    )
    if not res_c.fetchone():
        raise HTTPException(status_code=404, detail="Competencia no encontrada.")

    res_a = await session.execute(
        text("SELECT id, nombre, apellido FROM academias.alumnos WHERE id = CAST(:id AS UUID) AND academia_id = CAST(:aid AS UUID)"),
        {"id": data.alumno_id, "aid": aid}
    )
    al = res_a.fetchone()
    if not al:
        raise HTTPException(status_code=404, detail="Alumno no encontrado.")

    part_id = str(uuid.uuid4())
    await session.execute(
        text("""
            INSERT INTO academias.competencia_participantes
                (id, competencia_id, alumno_id, categoria_modalidad, arancel_abonado, monto_arancel, resultado_logro, notas)
            VALUES
                (CAST(:id AS UUID), CAST(:cid AS UUID), CAST(:aid AS UUID),
                 :cat, :abonado, :monto, :logro, :notas)
            ON CONFLICT (competencia_id, alumno_id) DO UPDATE SET
                categoria_modalidad = EXCLUDED.categoria_modalidad,
                arancel_abonado = EXCLUDED.arancel_abonado,
                monto_arancel = EXCLUDED.monto_arancel,
                resultado_logro = EXCLUDED.resultado_logro,
                notas = EXCLUDED.notas
        """),
        {
            "id": part_id, "cid": competencia_id, "aid": data.alumno_id,
            "cat": data.categoria_modalidad, "abonado": data.arancel_abonado,
            "monto": float(data.monto_arancel or 0), "logro": data.resultado_logro,
            "notas": data.notas
        }
    )
    await session.commit()
    return {"status": "ok", "message": f"Alumno '{al[1]}' inscrito en la competencia."}


@router.put("/competencias/participantes/{participante_id}")
async def actualizar_participante_competencia(
    participante_id: str,
    data: CompetenciaParticipanteUpdate,
    request: Request,
    current_user: dict = Depends(require_roles("dueño", "administrador", "profesor")),
    session: AsyncSession = Depends(get_session)
):
    """Actualiza categoría, resultado/podio o arancel de un participante."""
    ctx = await get_academia_context(request, current_user, session)
    aid = str(ctx["academia_id"])

    updates = {}
    if data.categoria_modalidad is not None: updates["categoria_modalidad"] = data.categoria_modalidad
    if data.arancel_abonado is not None:     updates["arancel_abonado"] = data.arancel_abonado
    if data.monto_arancel is not None:       updates["monto_arancel"] = float(data.monto_arancel)
    if data.resultado_logro is not None:     updates["resultado_logro"] = data.resultado_logro
    if data.notas is not None:               updates["notas"] = data.notas

    if updates:
        set_clauses = ", ".join(f"{k} = :{k}" for k in updates)
        updates["id"] = participante_id
        await session.execute(
            text(f"UPDATE academias.competencia_participantes SET {set_clauses} WHERE id = CAST(:id AS UUID)"),
            updates
        )
        await session.commit()

    return {"status": "ok", "message": "Datos de participación actualizados."}


@router.delete("/competencias/participantes/{participante_id}")
async def eliminar_participante_competencia(
    participante_id: str,
    request: Request,
    current_user: dict = Depends(require_roles("dueño", "administrador")),
    session: AsyncSession = Depends(get_session)
):
    """Elimina la inscripción de un alumno a una competencia."""
    await session.execute(
        text("DELETE FROM academias.competencia_participantes WHERE id = CAST(:id AS UUID)"),
        {"id": participante_id}
    )
    await session.commit()
    return {"status": "ok", "message": "Participante removido de la competencia."}


# ================================================================
# 6. INFORMES MENSUALES Y ANUALES DE COBRANZAS
# ================================================================

@router.get("/reportes/cobranzas-anuales")
async def reporte_cobranzas_anuales(
    request: Request,
    anio: Optional[int] = None,
    current_user: dict = Depends(require_roles("dueño", "administrador", "tesorero")),
    session: AsyncSession = Depends(get_session)
):
    """
    Informe consolidado de cobranzas mes a mes (Enero a Diciembre) para un año:
      - Total devengado/emitido por mes
      - Total recaudado/cobrado por mes
      - Porcentaje de efectividad de cobro (%)
      - Saldo moroso acumulado
      - Desglose por categoría
      - Resumen general del año
    """
    ctx = await get_academia_context(request, current_user, session)
    aid = str(ctx["academia_id"])
    target_year = anio or date.today().year

    meses_nombres = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ]

    # Consultar cuotas del año agrupadas por mes
    res_meses = await session.execute(
        text("""
            SELECT
                SUBSTRING(q.periodo FROM 6 FOR 2)::INT AS mes_num,
                COALESCE(SUM(q.monto_final), 0) AS total_emitido,
                COALESCE(SUM(COALESCE(q.monto_pagado, 0)), 0) AS total_cobrado,
                COUNT(q.id) AS cant_cuotas,
                COUNT(CASE WHEN q.estado = 'pagada' THEN 1 END) AS cant_pagadas,
                COUNT(CASE WHEN q.estado = 'parcial' THEN 1 END) AS cant_parciales,
                COUNT(CASE WHEN q.estado IN ('pendiente', 'vencida') THEN 1 END) AS cant_pendientes
            FROM academias.cuotas q
            WHERE q.academia_id = CAST(:aid AS UUID)
              AND q.periodo LIKE :anio_prefix
              AND q.estado != 'anulada'
            GROUP BY mes_num
            ORDER BY mes_num
        """),
        {"aid": aid, "anio_prefix": f"{target_year}-%"}
    )
    rows_meses = {r[0]: r for r in res_meses.fetchall()}

    # Desglose por categoría en el año
    res_cat = await session.execute(
        text("""
            SELECT
                COALESCE(c.nombre, 'General / Sin categoría') AS cat_nombre,
                COALESCE(SUM(q.monto_final), 0) AS emitido,
                COALESCE(SUM(COALESCE(q.monto_pagado, 0)), 0) AS cobrado,
                COUNT(q.id) AS cant
            FROM academias.cuotas q
            JOIN academias.inscripciones i ON i.id = q.inscripcion_id
            LEFT JOIN academias.categorias c ON c.id = i.categoria_id
            WHERE q.academia_id = CAST(:aid AS UUID)
              AND q.periodo LIKE :anio_prefix
              AND q.estado != 'anulada'
            GROUP BY c.nombre
            ORDER BY cobrado DESC
        """),
        {"aid": aid, "anio_prefix": f"{target_year}-%"}
    )
    rows_cat = res_cat.fetchall()

    detalle_meses = []
    total_anual_emitido = 0.0
    total_anual_cobrado = 0.0
    total_anual_cuotas = 0
    total_anual_pagadas = 0

    for m in range(1, 13):
        r = rows_meses.get(m)
        emitido = float(r[1]) if r else 0.0
        cobrado = float(r[2]) if r else 0.0
        cant = int(r[3]) if r else 0
        pagadas = int(r[4]) if r else 0
        parciales = int(r[5]) if r else 0
        pendientes = int(r[6]) if r else 0

        efectividad = round((cobrado / emitido * 100), 1) if emitido > 0 else 0.0
        saldo_moroso = max(emitido - cobrado, 0.0)

        total_anual_emitido += emitido
        total_anual_cobrado += cobrado
        total_anual_cuotas += cant
        total_anual_pagadas += pagadas

        detalle_meses.append({
            "mes": m,
            "periodo": f"{target_year}-{m:02d}",
            "nombre_mes": meses_nombres[m - 1],
            "total_emitido": emitido,
            "total_cobrado": cobrado,
            "saldo_moroso": saldo_moroso,
            "efectividad_pct": efectividad,
            "cant_cuotas": cant,
            "cant_pagadas": pagadas,
            "cant_parciales": parciales,
            "cant_pendientes": pendientes,
        })

    efectividad_anual = round((total_anual_cobrado / total_anual_emitido * 100), 1) if total_anual_emitido > 0 else 0.0

    return {
        "anio": target_year,
        "resumen_anual": {
            "total_emitido": total_anual_emitido,
            "total_cobrado": total_anual_cobrado,
            "saldo_moroso": max(total_anual_emitido - total_anual_cobrado, 0.0),
            "efectividad_pct": efectividad_anual,
            "total_cuotas": total_anual_cuotas,
            "cuotas_cobradas": total_anual_pagadas,
        },
        "meses": detalle_meses,
        "por_categoria": [
            {
                "categoria": r[0],
                "total_emitido": float(r[1]),
                "total_cobrado": float(r[2]),
                "efectividad_pct": round((float(r[2]) / float(r[1]) * 100), 1) if float(r[1]) > 0 else 0.0,
                "cant_cuotas": int(r[3]),
            }
            for r in rows_cat
        ]
    }
