"""
routers/cantinas.py
===================
API REST para el Módulo 4: Gestión de Cantinas y Mininegocios Deportivos.
Maneja de forma desacoplada e independiente:
  - Cuentas financieras (Caja, Bancos, Billeteras)
  - Catálogo de productos e inventario
  - Turnos de encargados con chequeo de inventario inicial y final
  - Punto de venta ultrarrápido (Cajera)
  - Pantalla KDS en tiempo real y entrega con descuento automático de stock (Despachante)
  - Compras de insumos y gastos operativos
  - Menú digital público por QR
  - Reportes de rendimiento (Ingresos/horas, P&L, productos estrella)
"""

import uuid
from datetime import datetime, date, time
from typing import Optional, List, Dict, Any, Union
from fastapi import APIRouter, Depends, HTTPException, Request, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel, Field

from database import get_session
from security import get_current_user

router = APIRouter(prefix="/cantina", tags=["Cantinas"])


# ================================================================
# SCHEMAS PYDANTIC
# ================================================================

class CantinaLoginRequest(BaseModel):
    cantina_slug: Optional[str] = "cantina-central"
    nombre: Optional[str] = None
    rol: Optional[str] = "cajera" # 'admin', 'cajera', 'despachante', 'encargado'
    pin: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None

class CuentaCreate(BaseModel):
    nombre: str
    tipo: str = "efectivo" # efectivo, banco, billetera, otro
    numero_cuenta: Optional[str] = None
    saldo_actual: float = 0
    es_principal: bool = False

class CuentaUpdate(BaseModel):
    nombre: Optional[str] = None
    tipo: Optional[str] = None
    numero_cuenta: Optional[str] = None
    saldo_actual: Optional[float] = None
    es_principal: Optional[bool] = None
    activo: Optional[bool] = None

class ProductoCreate(BaseModel):
    nombre: str
    categoria: str = "Bebidas"
    descripcion: Optional[str] = None
    precio_costo: float = 0
    precio_venta: float
    stock_actual: float = 0
    stock_minimo: float = 5
    imagen_url: Optional[str] = None
    disponible_menu_qr: bool = True
    codigo_barra: Optional[str] = None

class ProductoUpdate(BaseModel):
    nombre: Optional[str] = None
    categoria: Optional[str] = None
    descripcion: Optional[str] = None
    precio_costo: Optional[float] = None
    precio_venta: Optional[float] = None
    stock_actual: Optional[float] = None
    stock_minimo: Optional[float] = None
    imagen_url: Optional[str] = None
    disponible_menu_qr: Optional[bool] = None
    codigo_barra: Optional[str] = None
    activo: Optional[bool] = None

class AjusteStockRequest(BaseModel):
    cantidad_ajuste: float # Positivo suma, negativo resta
    motivo: str # 'merma', 'conteo_fisico', 'rotura', 'donacion', 'ajuste'
    observaciones: Optional[str] = None

class TurnoCreate(BaseModel):
    encargado_nombre: str
    encargado_id: Optional[str] = None
    fecha: str # YYYY-MM-DD
    hora_inicio_prog: Optional[str] = "08:00"
    hora_fin_prog: Optional[str] = "13:00"
    fondo_inicial_caja: float = 0
    observaciones: Optional[str] = None

class ChequeoInventarioItem(BaseModel):
    producto_id: str
    nombre: str
    stock_sistema: float
    conteo_fisico: float
    diferencia: float = 0
    observaciones: Optional[str] = None

class IniciarTurnoRequest(BaseModel):
    fondo_inicial_caja: float = 0
    realizado_por: str
    items_chequeo: List[ChequeoInventarioItem] = []
    observaciones: Optional[str] = None

class FinalizarTurnoRequest(BaseModel):
    realizado_por: str
    items_chequeo: List[ChequeoInventarioItem] = []
    total_efectivo_en_caja: Optional[float] = None
    observaciones: Optional[str] = None

class PedidoItemInput(BaseModel):
    producto_id: str
    cantidad: float
    precio_unitario: float
    nombre: Optional[str] = None

class PedidoCreate(BaseModel):
    turno_id: Optional[str] = None
    cliente_nombre: Optional[str] = "Consumidor Final"
    cuenta_id: Optional[str] = None # Cuenta donde se cobra (Caja, Banco, etc.)
    items: List[PedidoItemInput]
    observaciones: Optional[str] = None
    creado_por: Optional[str] = "Cajera"

class ItemCompraInsumo(BaseModel):
    producto_id: Optional[str] = None
    nombre: Optional[str] = None
    cantidad: float = 1
    costo_unitario: float = 0

class CompraGastoCreate(BaseModel):
    turno_id: Optional[str] = None
    tipo: str = "compra_mercaderia" # 'compra_mercaderia', 'gasto_operativo'
    cuenta_id: Optional[str] = None # Cuenta de donde se paga
    monto_total: float
    concepto_proveedor: str
    comprobante_nro: Optional[str] = None
    items_comprados: List[ItemCompraInsumo] = []
    registrado_por: Optional[str] = "Encargado"
    observaciones: Optional[str] = None


# ================================================================
# HELPER DE RESOLUCIÓN DE CANTINA
# ================================================================

async def _get_default_cantina_id(session: AsyncSession, slug: Optional[str] = None) -> str:
    """Retorna el UUID de la cantina activa o por slug predeterminado."""
    if slug:
        res = await session.execute(text("SELECT id FROM cantinas.cantinas WHERE slug = :slug AND activo = TRUE LIMIT 1"), {"slug": slug})
    else:
        res = await session.execute(text("SELECT id FROM cantinas.cantinas WHERE activo = TRUE ORDER BY created_at ASC LIMIT 1"))
    row = res.fetchone()
    if not row:
        # Si no hay ninguna, crear la predeterminada
        create_res = await session.execute(text("""
            INSERT INTO cantinas.cantinas (nombre, slug, descripcion, moneda, activo)
            VALUES ('Cantina Deportiva MiCancha', 'cantina-central', 'Cantina oficial del club', 'GS', TRUE)
            RETURNING id
        """))
        await session.commit()
        return str(create_res.fetchone()[0])
    return str(row[0])


# ================================================================
# ENDPOINTS DE AUTENTICACIÓN Y CONFIGURACIÓN DE CANTINA
# ================================================================

@router.get("/lista")
async def listar_cantinas(session: AsyncSession = Depends(get_session)):
    """Lista todas las cantinas activas para selección o administración."""
    res = await session.execute(text("""
        SELECT id, nombre, slug, descripcion, logo_url, moneda, created_at
        FROM cantinas.cantinas
        WHERE activo = TRUE
        ORDER BY nombre ASC
    """))
    return [
        {
            "id": str(r[0]),
            "nombre": r[1],
            "slug": r[2],
            "descripcion": r[3],
            "logo_url": r[4],
            "moneda": r[5] or "GS",
            "created_at": r[6].isoformat() if r[6] else None
        }
        for r in res.fetchall()
    ]

@router.get("/info")
async def obtener_info_cantina(slug: Optional[str] = None, session: AsyncSession = Depends(get_session)):
    """Obtiene datos de configuración de la cantina actual."""
    cantina_id = await _get_default_cantina_id(session, slug)
    res = await session.execute(text("""
        SELECT id, nombre, slug, descripcion, logo_url, moneda, created_at
        FROM cantinas.cantinas
        WHERE id = :cid
    """), {"cid": cantina_id})
    row = res.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Cantina no encontrada")
    return {
        "id": str(row[0]),
        "nombre": row[1],
        "slug": row[2],
        "descripcion": row[3],
        "logo_url": row[4],
        "moneda": row[5] or "GS",
        "created_at": row[6].isoformat() if row[6] else None
    }

@router.post("/auth/login")
async def cantina_login(req: CantinaLoginRequest, session: AsyncSession = Depends(get_session)):
    """
    Login independiente para personal de cantina.
    Permite ingreso por PIN rápido (para cajera o despacho en mostrador)
    o por nombre y rol para operar de manera ágil.
    """
    cantina_id = await _get_default_cantina_id(session, req.cantina_slug)
    
    # Buscar cantina
    c_res = await session.execute(text("SELECT nombre, slug FROM cantinas.cantinas WHERE id = :cid"), {"cid": cantina_id})
    c_row = c_res.fetchone()
    cantina_nombre = c_row[0] if c_row else "Cantina MiCancha"

    # Si se especificó PIN, buscar usuario por PIN
    if req.pin:
        u_res = await session.execute(text("""
            SELECT id, nombre, email, rol
            FROM cantinas.usuarios_cantina
            WHERE cantina_id = :cid AND pin = :pin AND activo = TRUE
            LIMIT 1
        """), {"cid": cantina_id, "pin": req.pin})
        u_row = u_res.fetchone()
        if u_row:
            return {
                "authorized": True,
                "token": f"cantina_token_{uuid.uuid4().hex[:16]}",
                "cantina_id": cantina_id,
                "cantina_nombre": cantina_nombre,
                "cantina_slug": c_row[1] if c_row else "cantina-central",
                "user": {
                    "id": str(u_row[0]),
                    "nombre": u_row[1],
                    "email": u_row[2],
                    "rol": u_row[3]
                }
            }

    # Si no coincide o se envió perfil directo
    rol = req.rol or "cajera"
    nombre = req.nombre or f"Operador ({rol.capitalize()})"
    
    # Verificar o crear perfil
    res_user = await session.execute(text("""
        SELECT id, nombre, email, rol
        FROM cantinas.usuarios_cantina
        WHERE cantina_id = :cid AND rol = :rol AND activo = TRUE
        LIMIT 1
    """), {"cid": cantina_id, "rol": rol})
    row = res_user.fetchone()
    
    user_id = str(row[0]) if row else str(uuid.uuid4())
    user_name = row[1] if row else nombre

    return {
        "authorized": True,
        "token": f"cantina_token_{uuid.uuid4().hex[:16]}",
        "cantina_id": cantina_id,
        "cantina_nombre": cantina_nombre,
        "cantina_slug": c_row[1] if c_row else "cantina-central",
        "user": {
            "id": user_id,
            "nombre": user_name,
            "email": f"{rol}@cantina.com",
            "rol": rol
        }
    }

@router.get("/usuarios")
async def listar_usuarios_cantina(slug: Optional[str] = None, session: AsyncSession = Depends(get_session)):
    """Lista los colaboradores y encargados registrados de la cantina."""
    cantina_id = await _get_default_cantina_id(session, slug)
    res = await session.execute(text("""
        SELECT id, nombre, email, rol, pin, activo
        FROM cantinas.usuarios_cantina
        WHERE cantina_id = :cid AND activo = TRUE
        ORDER BY rol ASC, nombre ASC
    """), {"cid": cantina_id})
    return [
        {
            "id": str(r[0]),
            "nombre": r[1],
            "email": r[2],
            "rol": r[3],
            "pin": r[4],
            "activo": r[5]
        }
        for r in res.fetchall()
    ]


# ================================================================
# CUENTAS Y TESORERÍA (MULTI-CUENTAS: CAJA, BANCO 1, BANCO 2)
# ================================================================

@router.get("/cuentas")
async def listar_cuentas(slug: Optional[str] = None, session: AsyncSession = Depends(get_session)):
    """Lista las cuentas de pago/cobro de la cantina con sus saldos actuales."""
    cantina_id = await _get_default_cantina_id(session, slug)
    res = await session.execute(text("""
        SELECT id, nombre, tipo, numero_cuenta, saldo_actual, es_principal, activo
        FROM cantinas.cuentas
        WHERE cantina_id = :cid AND activo = TRUE
        ORDER BY es_principal DESC, nombre ASC
    """), {"cid": cantina_id})
    return [
        {
            "id": str(r[0]),
            "nombre": r[1],
            "tipo": r[2],
            "numero_cuenta": r[3],
            "saldo_actual": float(r[4] or 0),
            "es_principal": bool(r[5]),
            "activo": bool(r[6])
        }
        for r in res.fetchall()
    ]

@router.post("/cuentas")
async def crear_cuenta(cuenta: CuentaCreate, slug: Optional[str] = None, session: AsyncSession = Depends(get_session)):
    """Crea una nueva cuenta financiera (ej: Banco Continental QR, Caja chica, etc.)."""
    cantina_id = await _get_default_cantina_id(session, slug)
    res = await session.execute(text("""
        INSERT INTO cantinas.cuentas (cantina_id, nombre, tipo, numero_cuenta, saldo_actual, es_principal)
        VALUES (:cid, :nombre, :tipo, :nro, :saldo, :es_p)
        RETURNING id
    """), {
        "cid": cantina_id,
        "nombre": cuenta.nombre,
        "tipo": cuenta.tipo,
        "nro": cuenta.numero_cuenta,
        "saldo": cuenta.saldo_actual,
        "es_p": cuenta.es_principal
    })
    new_id = res.fetchone()[0]
    await session.commit()
    return {"id": str(new_id), "message": "Cuenta creada con éxito"}

@router.put("/cuentas/{cuenta_id}")
async def actualizar_cuenta(cuenta_id: str, cuenta: CuentaUpdate, session: AsyncSession = Depends(get_session)):
    """Actualiza una cuenta financiera."""
    updates = []
    params: Dict[str, Any] = {"id": cuenta_id}
    if cuenta.nombre is not None:
        updates.append("nombre = :nombre")
        params["nombre"] = cuenta.nombre
    if cuenta.tipo is not None:
        updates.append("tipo = :tipo")
        params["tipo"] = cuenta.tipo
    if cuenta.numero_cuenta is not None:
        updates.append("numero_cuenta = :nro")
        params["nro"] = cuenta.numero_cuenta
    if cuenta.saldo_actual is not None:
        updates.append("saldo_actual = :saldo")
        params["saldo"] = cuenta.saldo_actual
    if cuenta.es_principal is not None:
        updates.append("es_principal = :es_p")
        params["es_p"] = cuenta.es_principal
    if cuenta.activo is not None:
        updates.append("activo = :act")
        params["act"] = cuenta.activo

    if updates:
        sql = f"UPDATE cantinas.cuentas SET {', '.join(updates)} WHERE id = :id"
        await session.execute(text(sql), params)
        await session.commit()
    return {"message": "Cuenta actualizada"}

@router.get("/cuentas/{cuenta_id}/movimientos")
async def listar_movimientos_cuenta(cuenta_id: str, limit: int = 50, session: AsyncSession = Depends(get_session)):
    """Obtiene el historial de transacciones de una cuenta específica."""
    res = await session.execute(text("""
        SELECT id, tipo, monto, saldo_posterior, concepto, referencia_tipo, fecha
        FROM cantinas.movimientos_cuenta
        WHERE cuenta_id = :cid
        ORDER BY fecha DESC
        LIMIT :lim
    """), {"cid": cuenta_id, "lim": limit})
    return [
        {
            "id": str(r[0]),
            "tipo": r[1],
            "monto": float(r[2]),
            "saldo_posterior": float(r[3]),
            "concepto": r[4],
            "referencia_tipo": r[5],
            "fecha": r[6].isoformat() if r[6] else None
        }
        for r in res.fetchall()
    ]


# ================================================================
# PRODUCTOS E INVENTARIO
# ================================================================

@router.get("/productos")
async def listar_productos(
    categoria: Optional[str] = None,
    busqueda: Optional[str] = None,
    solo_activos: bool = True,
    slug: Optional[str] = None,
    session: AsyncSession = Depends(get_session)
):
    """Lista los productos del catálogo con stock disponible y alertas de stock bajo."""
    cantina_id = await _get_default_cantina_id(session, slug)
    query = """
        SELECT id, codigo_barra, nombre, categoria, descripcion, precio_costo, precio_venta,
               stock_actual, stock_minimo, imagen_url, disponible_menu_qr, activo
        FROM cantinas.productos
        WHERE cantina_id = :cid
    """
    params: Dict[str, Any] = {"cid": cantina_id}
    if solo_activos:
        query += " AND activo = TRUE"
    if categoria and categoria != "Todos":
        query += " AND categoria = :cat"
        params["cat"] = categoria
    if busqueda:
        query += " AND (nombre ILIKE :q OR categoria ILIKE :q OR codigo_barra ILIKE :q)"
        params["q"] = f"%{busqueda}%"

    query += " ORDER BY categoria ASC, nombre ASC"
    res = await session.execute(text(query), params)
    rows = res.fetchall()
    return [
        {
            "id": str(r[0]),
            "codigo_barra": r[1],
            "nombre": r[2],
            "categoria": r[3],
            "descripcion": r[4],
            "precio_costo": float(r[5] or 0),
            "precio_venta": float(r[6] or 0),
            "stock_actual": float(r[7] or 0),
            "stock_minimo": float(r[8] or 0),
            "stock_bajo": float(r[7] or 0) <= float(r[8] or 0),
            "imagen_url": r[9],
            "disponible_menu_qr": bool(r[10]),
            "activo": bool(r[11])
        }
        for r in rows
    ]

@router.post("/productos")
async def crear_producto(prod: ProductoCreate, slug: Optional[str] = None, session: AsyncSession = Depends(get_session)):
    """Agrega un nuevo producto al catálogo."""
    cantina_id = await _get_default_cantina_id(session, slug)
    res = await session.execute(text("""
        INSERT INTO cantinas.productos (
            cantina_id, codigo_barra, nombre, categoria, descripcion,
            precio_costo, precio_venta, stock_actual, stock_minimo,
            imagen_url, disponible_menu_qr
        ) VALUES (
            :cid, :cb, :nombre, :cat, :desc,
            :pc, :pv, :sa, :sm,
            :img, :dqr
        ) RETURNING id
    """), {
        "cid": cantina_id,
        "cb": prod.codigo_barra,
        "nombre": prod.nombre,
        "cat": prod.categoria,
        "desc": prod.descripcion,
        "pc": prod.precio_costo,
        "pv": prod.precio_venta,
        "sa": prod.stock_actual,
        "sm": prod.stock_minimo,
        "img": prod.imagen_url,
        "dqr": prod.disponible_menu_qr
    })
    new_id = res.fetchone()[0]
    await session.commit()
    return {"id": str(new_id), "message": "Producto creado con éxito"}

@router.put("/productos/{producto_id}")
async def actualizar_producto(producto_id: str, prod: ProductoUpdate, session: AsyncSession = Depends(get_session)):
    """Modifica datos de un producto."""
    updates = []
    params: Dict[str, Any] = {"id": producto_id}
    if prod.nombre is not None:
        updates.append("nombre = :nom")
        params["nom"] = prod.nombre
    if prod.categoria is not None:
        updates.append("categoria = :cat")
        params["cat"] = prod.categoria
    if prod.descripcion is not None:
        updates.append("descripcion = :desc")
        params["desc"] = prod.descripcion
    if prod.precio_costo is not None:
        updates.append("precio_costo = :pc")
        params["pc"] = prod.precio_costo
    if prod.precio_venta is not None:
        updates.append("precio_venta = :pv")
        params["pv"] = prod.precio_venta
    if prod.stock_actual is not None:
        updates.append("stock_actual = :sa")
        params["sa"] = prod.stock_actual
    if prod.stock_minimo is not None:
        updates.append("stock_minimo = :sm")
        params["sm"] = prod.stock_minimo
    if prod.imagen_url is not None:
        updates.append("imagen_url = :img")
        params["img"] = prod.imagen_url
    if prod.disponible_menu_qr is not None:
        updates.append("disponible_menu_qr = :dqr")
        params["dqr"] = prod.disponible_menu_qr
    if prod.codigo_barra is not None:
        updates.append("codigo_barra = :cb")
        params["cb"] = prod.codigo_barra
    if prod.activo is not None:
        updates.append("activo = :act")
        params["act"] = prod.activo

    if updates:
        sql = f"UPDATE cantinas.productos SET {', '.join(updates)} WHERE id = :id"
        await session.execute(text(sql), params)
        await session.commit()
    return {"message": "Producto actualizado"}

@router.post("/productos/{producto_id}/ajuste-stock")
async def ajustar_stock_producto(producto_id: str, req: AjusteStockRequest, session: AsyncSession = Depends(get_session)):
    """Ajusta manualmente el stock (mermas, roturas, conteo físico)."""
    res = await session.execute(text("SELECT stock_actual, nombre FROM cantinas.productos WHERE id = :id"), {"id": producto_id})
    row = res.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    stock_ant = float(row[0] or 0)
    stock_nuevo = max(0.0, stock_ant + req.cantidad_ajuste)
    
    await session.execute(text("""
        UPDATE cantinas.productos SET stock_actual = :nuevo WHERE id = :id
    """), {"nuevo": stock_nuevo, "id": producto_id})
    await session.commit()
    
    return {
        "producto_id": producto_id,
        "nombre": row[1],
        "stock_anterior": stock_ant,
        "ajuste": req.cantidad_ajuste,
        "stock_nuevo": stock_nuevo,
        "motivo": req.motivo
    }


# ================================================================
# MENÚ DIGITAL PÚBLICO (CÓDIGO QR - SIN AUTENTICACIÓN)
# ================================================================

@router.get("/publico/menu/{slug}")
async def obtener_menu_publico(slug: str, session: AsyncSession = Depends(get_session)):
    """
    Endpoint público optimizado para celulares que escanean el código QR.
    Retorna datos de la cantina, categorías y productos con precio y disponibilidad.
    """
    c_res = await session.execute(text("""
        SELECT id, nombre, slug, descripcion, logo_url, moneda
        FROM cantinas.cantinas
        WHERE slug = :slug AND activo = TRUE
    """), {"slug": slug})
    c_row = c_res.fetchone()
    if not c_row:
        raise HTTPException(status_code=404, detail="Cantina no encontrada")
    
    cantina_id = str(c_row[0])
    
    # Productos disponibles en menú
    p_res = await session.execute(text("""
        SELECT id, nombre, categoria, descripcion, precio_venta, stock_actual, imagen_url
        FROM cantinas.productos
        WHERE cantina_id = :cid AND activo = TRUE AND disponible_menu_qr = TRUE
        ORDER BY categoria ASC, nombre ASC
    """), {"cid": cantina_id})
    
    productos = []
    categorias_set = set()
    for r in p_res.fetchall():
        cat = r[2] or "General"
        categorias_set.add(cat)
        stock = float(r[5] or 0)
        productos.append({
            "id": str(r[0]),
            "nombre": r[1],
            "categoria": cat,
            "descripcion": r[3],
            "precio_venta": float(r[4] or 0),
            "disponible": stock > 0,
            "stock_actual": stock,
            "imagen_url": r[6]
        })
        
    return {
        "cantina": {
            "id": cantina_id,
            "nombre": c_row[1],
            "slug": c_row[2],
            "descripcion": c_row[3],
            "logo_url": c_row[4],
            "moneda": c_row[5] or "GS"
        },
        "categorias": sorted(list(categorias_set)),
        "productos": productos
    }


# ================================================================
# TURNOS Y CHEQUEO DE INVENTARIO (APERTURA / CIERRE)
# ================================================================

@router.get("/turnos")
async def listar_turnos(fecha: Optional[str] = None, slug: Optional[str] = None, session: AsyncSession = Depends(get_session)):
    """Lista los turnos programados, en curso y finalizados."""
    cantina_id = await _get_default_cantina_id(session, slug)
    query = """
        SELECT id, encargado_nombre, fecha, hora_inicio_prog, hora_fin_prog,
               hora_inicio_real, hora_fin_real, estado, fondo_inicial_caja,
               total_ventas, total_gastos, observaciones, created_at
        FROM cantinas.turnos
        WHERE cantina_id = :cid
    """
    params: Dict[str, Any] = {"cid": cantina_id}
    if fecha:
        query += " AND fecha = :f"
        params["f"] = fecha
    query += " ORDER BY fecha DESC, hora_inicio_prog ASC LIMIT 50"
    
    res = await session.execute(text(query), params)
    return [
        {
            "id": str(r[0]),
            "encargado_nombre": r[1],
            "fecha": r[2].isoformat() if r[2] else None,
            "hora_inicio_prog": str(r[3]) if r[3] else None,
            "hora_fin_prog": str(r[4]) if r[4] else None,
            "hora_inicio_real": r[5].isoformat() if r[5] else None,
            "hora_fin_real": r[6].isoformat() if r[6] else None,
            "estado": r[7],
            "fondo_inicial_caja": float(r[8] or 0),
            "total_ventas": float(r[9] or 0),
            "total_gastos": float(r[10] or 0),
            "observaciones": r[11]
        }
        for r in res.fetchall()
    ]

@router.get("/turnos/activo")
async def obtener_turno_activo(slug: Optional[str] = None, session: AsyncSession = Depends(get_session)):
    """Retorna el turno actualmente 'en_curso' para la cantina."""
    cantina_id = await _get_default_cantina_id(session, slug)
    res = await session.execute(text("""
        SELECT id, encargado_nombre, fecha, hora_inicio_prog, hora_fin_prog,
               hora_inicio_real, estado, fondo_inicial_caja, total_ventas, total_gastos, observaciones
        FROM cantinas.turnos
        WHERE cantina_id = :cid AND estado = 'en_curso'
        ORDER BY hora_inicio_real DESC LIMIT 1
    """), {"cid": cantina_id})
    row = res.fetchone()
    if not row:
        return {"activo": False, "turno": None}
    
    return {
        "activo": True,
        "turno": {
            "id": str(row[0]),
            "encargado_nombre": row[1],
            "fecha": row[2].isoformat() if row[2] else None,
            "hora_inicio_prog": str(row[3]) if row[3] else None,
            "hora_fin_prog": str(row[4]) if row[4] else None,
            "hora_inicio_real": row[5].isoformat() if row[5] else None,
            "estado": row[6],
            "fondo_inicial_caja": float(row[7] or 0),
            "total_ventas": float(row[8] or 0),
            "total_gastos": float(row[9] or 0),
            "observaciones": row[10]
        }
    }

@router.post("/turnos")
async def crear_turno(t: TurnoCreate, slug: Optional[str] = None, session: AsyncSession = Depends(get_session)):
    """Programa un nuevo turno asignando encargado, fecha y horario."""
    cantina_id = await _get_default_cantina_id(session, slug)
    res = await session.execute(text("""
        INSERT INTO cantinas.turnos (
            cantina_id, encargado_id, encargado_nombre, fecha,
            hora_inicio_prog, hora_fin_prog, estado, fondo_inicial_caja, observaciones
        ) VALUES (
            :cid, :eid, :enombre, :fecha,
            :hip, :hfp, 'programado', :fic, :obs
        ) RETURNING id
    """), {
        "cid": cantina_id,
        "eid": t.encargado_id,
        "enombre": t.encargado_nombre,
        "fecha": t.fecha,
        "hip": t.hora_inicio_prog,
        "hfp": t.hora_fin_prog,
        "fic": t.fondo_inicial_caja,
        "obs": t.observaciones
    })
    new_id = res.fetchone()[0]
    await session.commit()
    return {"id": str(new_id), "message": "Turno programado con éxito"}

@router.post("/turnos/{turno_id}/iniciar")
async def iniciar_turno(turno_id: str, req: IniciarTurnoRequest, session: AsyncSession = Depends(get_session)):
    """
    Inicia el turno y guarda el Chequeo Inicial de Inventario.
    Permite registrar fondo de caja y validar el stock inicial producto por producto.
    """
    import json
    # 1. Cambiar estado a 'en_curso'
    await session.execute(text("""
        UPDATE cantinas.turnos
        SET estado = 'en_curso',
            hora_inicio_real = NOW(),
            fondo_inicial_caja = :fic,
            observaciones = COALESCE(observaciones || ' | ' || :obs, :obs)
        WHERE id = :tid
    """), {"tid": turno_id, "fic": req.fondo_inicial_caja, "obs": req.observaciones or ""})

    # 2. Guardar chequeo inicial
    items_json = [item.dict() for item in req.items_chequeo]
    await session.execute(text("""
        INSERT INTO cantinas.chequeos_inventario (
            turno_id, tipo, realizado_por, items_detalle, observaciones
        ) VALUES (
            :tid, 'inicio', :por, :items::jsonb, :obs
        )
    """), {
        "tid": turno_id,
        "por": req.realizado_por,
        "items": json.dumps(items_json),
        "obs": req.observaciones
    })

    # 3. Si hubo ajustes en el conteo físico, sincronizar el stock del sistema
    for item in req.items_chequeo:
        if item.diferencia != 0 and item.conteo_fisico is not None:
            await session.execute(text("""
                UPDATE cantinas.productos
                SET stock_actual = :conteo
                WHERE id = :pid
            """), {"conteo": item.conteo_fisico, "pid": item.producto_id})

    await session.commit()
    return {"message": "Turno iniciado correctamente con arqueo inicial de inventario"}

@router.post("/turnos/{turno_id}/finalizar")
async def finalizar_turno(turno_id: str, req: FinalizarTurnoRequest, session: AsyncSession = Depends(get_session)):
    """
    Finaliza el turno y realiza el Chequeo Final de Inventario y arqueo de caja.
    Calcula ventas totales del turno, gastos y discrepancias de stock.
    """
    import json
    # 1. Calcular ventas acumuladas del turno
    v_res = await session.execute(text("""
        SELECT COALESCE(SUM(monto_total), 0)
        FROM cantinas.pedidos
        WHERE turno_id = :tid AND estado_pago = 'pagado'
    """), {"tid": turno_id})
    total_ventas = float(v_res.fetchone()[0] or 0)

    # 2. Calcular compras/gastos del turno
    g_res = await session.execute(text("""
        SELECT COALESCE(SUM(monto_total), 0)
        FROM cantinas.compras_gastos
        WHERE turno_id = :tid
    """), {"tid": turno_id})
    total_gastos = float(g_res.fetchone()[0] or 0)

    # 3. Guardar chequeo final
    items_json = [item.dict() for item in req.items_chequeo]
    await session.execute(text("""
        INSERT INTO cantinas.chequeos_inventario (
            turno_id, tipo, realizado_por, items_detalle, observaciones
        ) VALUES (
            :tid, 'fin', :por, :items::jsonb, :obs
        )
    """), {
        "tid": turno_id,
        "por": req.realizado_por,
        "items": json.dumps(items_json),
        "obs": req.observaciones
    })

    # 4. Actualizar estado del turno a finalizado
    await session.execute(text("""
        UPDATE cantinas.turnos
        SET estado = 'finalizado',
            hora_fin_real = NOW(),
            total_ventas = :tv,
            total_gastos = :tg,
            observaciones = COALESCE(observaciones || ' | Cierre: ' || :obs, :obs)
        WHERE id = :tid
    """), {
        "tid": turno_id,
        "tv": total_ventas,
        "tg": total_gastos,
        "obs": req.observaciones or ""
    })

    await session.commit()
    return {
        "message": "Turno cerrado exitosamente",
        "total_ventas": total_ventas,
        "total_gastos": total_gastos,
        "balance_neto": total_ventas - total_gastos
    }

@router.get("/turnos/{turno_id}/chequeos")
async def obtener_chequeos_turno(turno_id: str, session: AsyncSession = Depends(get_session)):
    """Obtiene el historial de chequeos de inventario (inicio y fin) de un turno."""
    res = await session.execute(text("""
        SELECT id, tipo, fecha_hora, realizado_por, items_detalle, observaciones
        FROM cantinas.chequeos_inventario
        WHERE turno_id = :tid
        ORDER BY fecha_hora ASC
    """), {"tid": turno_id})
    return [
        {
            "id": str(r[0]),
            "tipo": r[1],
            "fecha_hora": r[2].isoformat() if r[2] else None,
            "realizado_por": r[3],
            "items_detalle": r[4],
            "observaciones": r[5]
        }
        for r in res.fetchall()
    ]


# ================================================================
# PUNTO DE VENTA (POS CAJERA - CREACIÓN RÁPIDA DE COMANDA)
# ================================================================

@router.post("/pedidos")
async def crear_pedido_pos(p: PedidoCreate, slug: Optional[str] = None, session: AsyncSession = Depends(get_session)):
    """
    Cajera toma el pedido de forma ágil:
    - Asigna número de comanda correlativo (#1, #2, #3...).
    - Estado de pago: 'pagado'.
    - Estado de entrega: 'pendiente' (aparece en la pantalla del despachante).
    - Registra el cobro en la cuenta financiera correspondiente (Caja, Banco 1, etc.).
    - NOTA: El stock aún NO se descuenta aquí; se descontará cuando el despachante entregue.
    """
    cantina_id = await _get_default_cantina_id(session, slug)
    
    # Resolver cuenta si no vino
    cuenta_id = p.cuenta_id
    if not cuenta_id:
        c_res = await session.execute(text("""
            SELECT id FROM cantinas.cuentas
            WHERE cantina_id = :cid AND es_principal = TRUE AND activo = TRUE LIMIT 1
        """), {"cid": cantina_id})
        c_row = c_res.fetchone()
        cuenta_id = str(c_row[0]) if c_row else None

    # Correlativo diario para el ticket comanda
    num_res = await session.execute(text("""
        SELECT COALESCE(MAX(numero_pedido), 0) + 1
        FROM cantinas.pedidos
        WHERE cantina_id = :cid AND created_at::date = CURRENT_DATE
    """), {"cid": cantina_id})
    numero_pedido = int(num_res.fetchone()[0])

    monto_total = sum(item.cantidad * item.precio_unitario for item in p.items)

    # Insertar pedido en estado pagado y entrega pendiente
    res = await session.execute(text("""
        INSERT INTO cantinas.pedidos (
            cantina_id, turno_id, numero_pedido, cliente_nombre,
            cuenta_id, monto_total, estado_pago, estado_entrega,
            creado_por, observaciones, created_at
        ) VALUES (
            :cid, :tid, :nump, :cli,
            :cuid, :total, 'pagado', 'pendiente',
            :creado, :obs, NOW()
        ) RETURNING id
    """), {
        "cid": cantina_id,
        "tid": p.turno_id,
        "nump": numero_pedido,
        "cli": p.cliente_nombre or "Consumidor Final",
        "cuid": cuenta_id,
        "total": monto_total,
        "creado": p.creado_por or "Cajera",
        "obs": p.observaciones
    })
    pedido_id = res.fetchone()[0]

    # Insertar items
    for item in p.items:
        await session.execute(text("""
            INSERT INTO cantinas.pedido_items (
                pedido_id, producto_id, cantidad, precio_unitario, subtotal, stock_descontado
            ) VALUES (
                :pid, :prid, :cant, :pu, :sub, FALSE
            )
        """), {
            "pid": pedido_id,
            "prid": item.producto_id,
            "cant": item.cantidad,
            "pu": item.precio_unitario,
            "sub": item.cantidad * item.precio_unitario
        })

    # Acreditar saldo en la cuenta de cobro seleccionada
    if cuenta_id:
        await session.execute(text("""
            UPDATE cantinas.cuentas
            SET saldo_actual = saldo_actual + :monto
            WHERE id = :cuid
        """), {"monto": monto_total, "cuid": cuenta_id})

        # Registrar movimiento en libro mayor
        await session.execute(text("""
            INSERT INTO cantinas.movimientos_cuenta (
                cuenta_id, tipo, monto, saldo_posterior, concepto, referencia_tipo, referencia_id
            ) VALUES (
                :cuid, 'ingreso', :monto,
                (SELECT saldo_actual FROM cantinas.cuentas WHERE id = :cuid),
                :concepto, 'pedido', :pid
            )
        """), {
            "cuid": cuenta_id,
            "monto": monto_total,
            "concepto": f"Venta Comanda #{numero_pedido}",
            "pid": pedido_id
        })

    await session.commit()
    return {
        "id": str(pedido_id),
        "numero_pedido": numero_pedido,
        "monto_total": monto_total,
        "estado_pago": "pagado",
        "estado_entrega": "pendiente",
        "mensaje": f"Pedido #{numero_pedido} registrado y enviado al despachante"
    }

@router.get("/pedidos")
async def listar_pedidos(
    estado_entrega: Optional[str] = None,
    limit: int = 50,
    slug: Optional[str] = None,
    session: AsyncSession = Depends(get_session)
):
    """Lista pedidos de la cantina."""
    cantina_id = await _get_default_cantina_id(session, slug)
    query = """
        SELECT p.id, p.numero_pedido, p.cliente_nombre, p.monto_total,
               p.estado_pago, p.estado_entrega, p.creado_por, p.despachado_por,
               p.observaciones, p.created_at, p.entregado_at, c.nombre as cuenta_nombre
        FROM cantinas.pedidos p
        LEFT JOIN cantinas.cuentas c ON p.cuenta_id = c.id
        WHERE p.cantina_id = :cid
    """
    params: Dict[str, Any] = {"cid": cantina_id, "lim": limit}
    if estado_entrega:
        query += " AND p.estado_entrega = :ee"
        params["ee"] = estado_entrega

    query += " ORDER BY p.created_at DESC LIMIT :lim"
    res = await session.execute(text(query), params)
    return [
        {
            "id": str(r[0]),
            "numero_pedido": r[1],
            "cliente_nombre": r[2],
            "monto_total": float(r[3] or 0),
            "estado_pago": r[4],
            "estado_entrega": r[5],
            "creado_por": r[6],
            "despachado_por": r[7],
            "observaciones": r[8],
            "created_at": r[9].isoformat() if r[9] else None,
            "entregado_at": r[10].isoformat() if r[10] else None,
            "cuenta_nombre": r[11]
        }
        for r in res.fetchall()
    ]


# ================================================================
# PANTALLA DE DESPACHO EN TIEMPO REAL (KDS DESPACHANTE)
# ================================================================

@router.get("/despacho/pedidos")
async def listar_pedidos_despacho(slug: Optional[str] = None, session: AsyncSession = Depends(get_session)):
    """
    Pantalla del Despachante: lista en tiempo real los pedidos en cola ('pendiente' o 'en_preparacion')
    con detalle completo de productos, cantidades y observaciones de cocina/mostrador.
    """
    cantina_id = await _get_default_cantina_id(session, slug)
    
    # 1. Traer pedidos no entregados
    ped_res = await session.execute(text("""
        SELECT p.id, p.numero_pedido, p.cliente_nombre, p.monto_total,
               p.estado_entrega, p.creado_por, p.observaciones, p.created_at
        FROM cantinas.pedidos p
        WHERE p.cantina_id = :cid AND p.estado_entrega IN ('pendiente', 'en_preparacion')
        ORDER BY p.created_at ASC
    """), {"cid": cantina_id})
    
    pedidos_rows = ped_res.fetchall()
    if not pedidos_rows:
        return []

    pedido_ids = [r[0] for r in pedidos_rows]

    # 2. Traer items de estos pedidos
    items_res = await session.execute(text("""
        SELECT pi.pedido_id, pi.producto_id, prod.nombre, pi.cantidad, prod.categoria
        FROM cantinas.pedido_items pi
        JOIN cantinas.productos prod ON pi.producto_id = prod.id
        WHERE pi.pedido_id = ANY(:pids)
    """), {"pids": pedido_ids})

    items_por_pedido: Dict[str, List[Dict[str, Any]]] = {}
    for ir in items_res.fetchall():
        pid_str = str(ir[0])
        if pid_str not in items_por_pedido:
            items_por_pedido[pid_str] = []
        items_por_pedido[pid_str].append({
            "producto_id": str(ir[1]),
            "nombre": ir[2],
            "cantidad": float(ir[3]),
            "categoria": ir[4]
        })

    # 3. Armar respuesta
    resultado = []
    for pr in pedidos_rows:
        pid = str(pr[0])
        resultado.append({
            "id": pid,
            "numero_pedido": pr[1],
            "cliente_nombre": pr[2],
            "monto_total": float(pr[3]),
            "estado_entrega": pr[4],
            "creado_por": pr[5],
            "observaciones": pr[6],
            "created_at": pr[7].isoformat() if pr[7] else None,
            "items": items_por_pedido.get(pid, [])
        })

    return resultado

@router.post("/despacho/pedidos/{pedido_id}/entregar")
async def marcar_pedido_entregado(
    pedido_id: str,
    despachado_por: Optional[str] = "Despachante",
    session: AsyncSession = Depends(get_session)
):
    """
    ACCIÓN CRÍTICA DE NEGOCIO:
    Al confirmar la entrega del pedido por el despachante:
    1. Marca el pedido como 'entregado' con timestamp y despachante.
    2. DESCUENTA AUTOMÁTICAMENTE EL STOCK DISPONIBLE de cada producto del pedido.
    3. Marca stock_descontado = TRUE en los items para evitar doble descuento.
    """
    # 1. Verificar estado actual del pedido
    res = await session.execute(text("""
        SELECT id, estado_entrega, numero_pedido
        FROM cantinas.pedidos
        WHERE id = :pid
    """), {"pid": pedido_id})
    p_row = res.fetchone()
    if not p_row:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    
    if p_row[1] == "entregado":
        return {"message": f"El pedido #{p_row[2]} ya había sido entregado previamente"}

    # 2. Obtener items con stock no descontado
    items_res = await session.execute(text("""
        SELECT id, producto_id, cantidad, stock_descontado
        FROM cantinas.pedido_items
        WHERE pedido_id = :pid
    """), {"pid": pedido_id})
    
    items = items_res.fetchall()
    
    # 3. Descontar stock de cada producto
    for item in items:
        item_id = item[0]
        prod_id = item[1]
        cant = float(item[2])
        ya_descontado = bool(item[3])
        
        if not ya_descontado:
            # Descontar de cantinas.productos
            await session.execute(text("""
                UPDATE cantinas.productos
                SET stock_actual = GREATEST(0.0, stock_actual - :cant)
                WHERE id = :prid
            """), {"cant": cant, "prid": prod_id})

            # Marcar item como descontado
            await session.execute(text("""
                UPDATE cantinas.pedido_items
                SET stock_descontado = TRUE
                WHERE id = :iid
            """), {"iid": item_id})

    # 4. Actualizar estado del pedido a 'entregado'
    await session.execute(text("""
        UPDATE cantinas.pedidos
        SET estado_entrega = 'entregado',
            despachado_por = :dpor,
            entregado_at = NOW()
        WHERE id = :pid
    """), {"dpor": despachado_por or "Despachante", "pid": pedido_id})

    await session.commit()
    return {
        "pedido_id": pedido_id,
        "numero_pedido": p_row[2],
        "estado_entrega": "entregado",
        "stock_actualizado": True,
        "mensaje": f"Pedido #{p_row[2]} entregado con éxito y stock descontado del inventario"
    }


# ================================================================
# COMPRAS DE INSUMOS Y GASTOS (MININEGOCIO DE PADRES)
# ================================================================

@router.post("/compras-gastos")
async def registrar_compra_gasto(cg: CompraGastoCreate, slug: Optional[str] = None, session: AsyncSession = Depends(get_session)):
    """
    Permite a los padres/encargados registrar sus compras de productos o gastos:
    - Si es 'compra_mercaderia', SUMA AUTOMÁTICAMENTE al stock de cada producto comprado.
    - Debita el dinero de la cuenta de pago seleccionada (Caja, Banco 1, etc.).
    - Genera el movimiento en el libro mayor.
    """
    import json
    cantina_id = await _get_default_cantina_id(session, slug)
    
    # 1. Registrar compra/gasto
    items_json = [item.dict() for item in cg.items_comprados]
    res = await session.execute(text("""
        INSERT INTO cantinas.compras_gastos (
            cantina_id, turno_id, tipo, cuenta_id, monto_total,
            concepto_proveedor, comprobante_nro, items_comprados,
            registrado_por, observaciones, fecha
        ) VALUES (
            :cid, :tid, :tipo, :cuid, :monto,
            :conc, :comp, :items::jsonb,
            :reg, :obs, NOW()
        ) RETURNING id
    """), {
        "cid": cantina_id,
        "tid": cg.turno_id,
        "tipo": cg.tipo,
        "cuid": cg.cuenta_id,
        "monto": cg.monto_total,
        "conc": cg.concepto_proveedor,
        "comp": cg.comprobante_nro,
        "items": json.dumps(items_json),
        "reg": cg.registrado_por or "Encargado",
        "obs": cg.observaciones
    })
    compra_id = res.fetchone()[0]

    # 2. Si es compra de mercadería con productos especificados, sumar al stock
    if cg.tipo == "compra_mercaderia" and cg.items_comprados:
        for it in cg.items_comprados:
            if it.producto_id and it.cantidad > 0:
                await session.execute(text("""
                    UPDATE cantinas.productos
                    SET stock_actual = stock_actual + :cant,
                        precio_costo = CASE WHEN :costo > 0 THEN :costo ELSE precio_costo END
                    WHERE id = :prid
                """), {"cant": it.cantidad, "costo": it.costo_unitario, "prid": it.producto_id})

    # 3. Debitar de la cuenta correspondiente
    if cg.cuenta_id:
        await session.execute(text("""
            UPDATE cantinas.cuentas
            SET saldo_actual = saldo_actual - :monto
            WHERE id = :cuid
        """), {"monto": cg.monto_total, "cuid": cg.cuenta_id})

        await session.execute(text("""
            INSERT INTO cantinas.movimientos_cuenta (
                cuenta_id, tipo, monto, saldo_posterior, concepto, referencia_tipo, referencia_id
            ) VALUES (
                :cuid, 'egreso', :monto,
                (SELECT saldo_actual FROM cantinas.cuentas WHERE id = :cuid),
                :concepto, 'compra_gasto', :cgid
            )
        """), {
            "cuid": cg.cuenta_id,
            "monto": cg.monto_total,
            "concepto": f"Egreso: {cg.concepto_proveedor}",
            "cgid": compra_id
        })

    await session.commit()
    return {
        "id": str(compra_id),
        "monto_total": cg.monto_total,
        "tipo": cg.tipo,
        "mensaje": "Compra o gasto registrado con éxito"
    }

@router.get("/compras-gastos")
async def listar_compras_gastos(limit: int = 50, slug: Optional[str] = None, session: AsyncSession = Depends(get_session)):
    """Lista las compras de insumos y gastos registrados."""
    cantina_id = await _get_default_cantina_id(session, slug)
    res = await session.execute(text("""
        SELECT cg.id, cg.tipo, cg.monto_total, cg.concepto_proveedor,
               cg.comprobante_nro, cg.items_comprados, cg.registrado_por,
               cg.fecha, c.nombre as cuenta_nombre
        FROM cantinas.compras_gastos cg
        LEFT JOIN cantinas.cuentas c ON cg.cuenta_id = c.id
        WHERE cg.cantina_id = :cid
        ORDER BY cg.fecha DESC LIMIT :lim
    """), {"cid": cantina_id, "lim": limit})
    return [
        {
            "id": str(r[0]),
            "tipo": r[1],
            "monto_total": float(r[2]),
            "concepto_proveedor": r[3],
            "comprobante_nro": r[4],
            "items_comprados": r[5],
            "registrado_por": r[6],
            "fecha": r[7].isoformat() if r[7] else None,
            "cuenta_nombre": r[8]
        }
        for r in res.fetchall()
    ]


# ================================================================
# REPORTES Y ANALYTICS (RENDIMIENTO POR TURNOS E INGRESOS / GASTOS)
# ================================================================

@router.get("/reportes/resumen-financiero")
async def reporte_resumen_financiero(slug: Optional[str] = None, session: AsyncSession = Depends(get_session)):
    """
    Resumen integral de finanzas del mininegocio:
    - Total ventas cobradas
    - Total compras y gastos
    - Ganancia neta
    - Desglose de saldos actuales por cuenta (Caja, Banco 1, Banco 2)
    """
    cantina_id = await _get_default_cantina_id(session, slug)

    # Ventas totales
    v_res = await session.execute(text("""
        SELECT COALESCE(SUM(monto_total), 0), COUNT(id)
        FROM cantinas.pedidos
        WHERE cantina_id = :cid AND estado_pago = 'pagado'
    """), {"cid": cantina_id})
    v_row = v_res.fetchone()
    total_ingresos = float(v_row[0] or 0)
    cant_pedidos = int(v_row[1] or 0)

    # Gastos totales
    g_res = await session.execute(text("""
        SELECT COALESCE(SUM(monto_total), 0), COUNT(id)
        FROM cantinas.compras_gastos
        WHERE cantina_id = :cid
    """), {"cid": cantina_id})
    g_row = g_res.fetchone()
    total_gastos = float(g_row[0] or 0)
    cant_gastos = int(g_row[1] or 0)

    # Saldos por cuenta
    c_res = await session.execute(text("""
        SELECT nombre, tipo, saldo_actual
        FROM cantinas.cuentas
        WHERE cantina_id = :cid AND activo = TRUE
    """), {"cid": cantina_id})
    cuentas_saldos = [
        {"nombre": r[0], "tipo": r[1], "saldo": float(r[2] or 0)}
        for r in c_res.fetchall()
    ]

    ticket_promedio = (total_ingresos / cant_pedidos) if cant_pedidos > 0 else 0

    return {
        "total_ingresos": total_ingresos,
        "total_gastos": total_gastos,
        "ganancia_neta": total_ingresos - total_gastos,
        "cant_pedidos": cant_pedidos,
        "cant_gastos": cant_gastos,
        "ticket_promedio": round(ticket_promedio, 2),
        "cuentas": cuentas_saldos
    }

@router.get("/reportes/rendimiento-turnos")
async def reporte_rendimiento_turnos(slug: Optional[str] = None, session: AsyncSession = Depends(get_session)):
    """
    Métrica clave solicitada:
    - Gráfico/Listado de mejores rendimientos por turno:
      Calcula para cada turno la cantidad de horas trabajadas y la relación INGRESOS / HORAS.
    - Ranking de turnos más eficientes.
    - Top productos más vendidos.
    """
    cantina_id = await _get_default_cantina_id(session, slug)

    # 1. Turnos con horas y ventas
    turnos_res = await session.execute(text("""
        SELECT t.id, t.encargado_nombre, t.fecha, t.hora_inicio_prog, t.hora_fin_prog,
               t.hora_inicio_real, t.hora_fin_real, t.estado,
               COALESCE((
                   SELECT SUM(p.monto_total)
                   FROM cantinas.pedidos p
                   WHERE p.turno_id = t.id AND p.estado_pago = 'pagado'
               ), t.total_ventas, 0) as ingresos,
               COALESCE((
                   SELECT SUM(cg.monto_total)
                   FROM cantinas.compras_gastos cg
                   WHERE cg.turno_id = t.id
               ), t.total_gastos, 0) as egresos
        FROM cantinas.turnos t
        WHERE t.cantina_id = :cid
        ORDER BY t.fecha DESC, t.hora_inicio_prog DESC
        LIMIT 20
    """), {"cid": cantina_id})

    turnos_analisis = []
    for r in turnos_res.fetchall():
        ingresos = float(r[8] or 0)
        egresos = float(r[9] or 0)
        
        # Calcular duración en horas
        horas = 4.0 # default estimado
        if r[5] and r[6]:
            delta = r[6] - r[5]
            horas = max(0.5, delta.total_seconds() / 3600.0)
        elif r[3] and r[4]:
            try:
                # Si son objetos time o string
                t1 = datetime.combine(date.today(), r[3]) if isinstance(r[3], time) else datetime.strptime(str(r[3]), "%H:%M:%S")
                t2 = datetime.combine(date.today(), r[4]) if isinstance(r[4], time) else datetime.strptime(str(r[4]), "%H:%M:%S")
                delta = t2 - t1
                horas = max(0.5, delta.total_seconds() / 3600.0)
            except Exception:
                horas = 4.0

        horas_redondeadas = round(horas, 1)
        ingreso_por_hora = round(ingresos / horas_redondeadas, 2) if horas_redondeadas > 0 else 0

        turnos_analisis.append({
            "turno_id": str(r[0]),
            "encargado": r[1],
            "fecha": r[2].isoformat() if r[2] else None,
            "estado": r[7],
            "ingresos": ingresos,
            "egresos": egresos,
            "ganancia_neta": ingresos - egresos,
            "horas": horas_redondeadas,
            "ingreso_por_hora": ingreso_por_hora,
            "etiqueta": f"{r[1][:15]} ({r[2]})"
        })

    # 2. Top productos vendidos
    top_res = await session.execute(text("""
        SELECT prod.nombre, prod.categoria, SUM(pi.cantidad) as total_unidades, SUM(pi.subtotal) as total_gs
        FROM cantinas.pedido_items pi
        JOIN cantinas.productos prod ON pi.producto_id = prod.id
        JOIN cantinas.pedidos ped ON pi.pedido_id = ped.id
        WHERE ped.cantina_id = :cid AND ped.estado_pago = 'pagado'
        GROUP BY prod.nombre, prod.categoria
        ORDER BY total_unidades DESC
        LIMIT 5
    """), {"cid": cantina_id})

    top_productos = [
        {
            "nombre": r[0],
            "categoria": r[1],
            "unidades": float(r[2]),
            "total_gs": float(r[3])
        }
        for r in top_res.fetchall()
    ]

    return {
        "turnos": turnos_analisis,
        "top_productos": top_productos
    }
