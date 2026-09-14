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
import os
import re
import json
import secrets
from datetime import datetime, date, time
from typing import Optional, List, Dict, Any, Union
from fastapi import APIRouter, Depends, HTTPException, Request, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select, func
from pydantic import BaseModel, Field

from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from database import get_session
from models import Usuario
from security import (
    verify_password, get_password_hash, create_access_token, 
    get_current_user
)

router = APIRouter(prefix="/cantina", tags=["Cantinas"])


# ================================================================
# HELPERS DE UTILIDAD Y VIGENCIA TEMPORAL
# ================================================================

def slugify(text_val: str) -> str:
    """Convierte texto en slug URL-friendly."""
    text_val = text_val.lower().strip()
    text_val = re.sub(r'[^\w\s-]', '', text_val)
    text_val = re.sub(r'[\s_-]+', '-', text_val)
    return text_val.strip('-')

def _verificar_vigencia_cantina(row: Any) -> Dict[str, Any]:
    """
    Evalúa si la cantina se encuentra aprobada, activa y temporalmente vigente hoy.
    Acepta un diccionario o tupla con campos:
    (estado_aprobacion, activo, fecha_inicio, fecha_fin, tipo_temporalidad, dias_habilitados, evento_nombre)
    """
    if isinstance(row, dict):
        estado_aprobacion = row.get("estado_aprobacion") or "aprobada"
        activo = row.get("activo", True)
        fecha_inicio = row.get("fecha_inicio")
        fecha_fin = row.get("fecha_fin")
        tipo_temporalidad = row.get("tipo_temporalidad") or "evento"
        dias_habilitados = row.get("dias_habilitados") or []
        evento_nombre = row.get("evento_nombre") or "Evento Deportivo"
    else:
        estado_aprobacion = row[0] if len(row) > 0 and row[0] else "aprobada"
        activo = bool(row[1]) if len(row) > 1 else True
        fecha_inicio = row[2] if len(row) > 2 else None
        fecha_fin = row[3] if len(row) > 3 else None
        tipo_temporalidad = row[4] if len(row) > 4 and row[4] else "evento"
        dias_habilitados = row[5] if len(row) > 5 and row[5] else []
        evento_nombre = row[6] if len(row) > 6 and row[6] else "Evento Deportivo"

    if isinstance(dias_habilitados, str):
        try:
            dias_habilitados = json.loads(dias_habilitados)
        except Exception:
            dias_habilitados = []

    # 1. Estado de aprobación
    if estado_aprobacion != "aprobada":
        return {
            "vigente": False,
            "estado": estado_aprobacion,
            "motivo": f"La cantina se encuentra en estado '{estado_aprobacion}' y aún no ha sido habilitada por el Administrador de la Plataforma.",
            "fecha_inicio": fecha_inicio.isoformat() if hasattr(fecha_inicio, 'isoformat') else str(fecha_inicio or ''),
            "fecha_fin": fecha_fin.isoformat() if hasattr(fecha_fin, 'isoformat') else str(fecha_fin or ''),
            "evento_nombre": evento_nombre
        }

    # 2. Estado activo general
    if not activo:
        return {
            "vigente": False,
            "estado": "inactiva",
            "motivo": "La cantina se encuentra desactivada por la administración de la plataforma.",
            "fecha_inicio": fecha_inicio.isoformat() if hasattr(fecha_inicio, 'isoformat') else str(fecha_inicio or ''),
            "fecha_fin": fecha_fin.isoformat() if hasattr(fecha_fin, 'isoformat') else str(fecha_fin or ''),
            "evento_nombre": evento_nombre
        }

    today = date.today()

    # Convertir a date si vienen como datetime o str
    if isinstance(fecha_inicio, datetime):
        fecha_inicio = fecha_inicio.date()
    elif isinstance(fecha_inicio, str) and fecha_inicio:
        try:
            fecha_inicio = date.fromisoformat(fecha_inicio[:10])
        except Exception:
            pass

    if isinstance(fecha_fin, datetime):
        fecha_fin = fecha_fin.date()
    elif isinstance(fecha_fin, str) and fecha_fin:
        try:
            fecha_fin = date.fromisoformat(fecha_fin[:10])
        except Exception:
            pass

    # 3. Control de fechas de inicio y fin
    if fecha_inicio and today < fecha_inicio:
        dias_faltantes = (fecha_inicio - today).days
        return {
            "vigente": False,
            "estado": "proxima",
            "motivo": f"La concesión temporal inicia el {fecha_inicio.strftime('%d/%m/%Y')} (en {dias_faltantes} días).",
            "fecha_inicio": fecha_inicio.isoformat(),
            "fecha_fin": fecha_fin.isoformat() if fecha_fin else None,
            "evento_nombre": evento_nombre
        }

    if fecha_fin and today > fecha_fin:
        return {
            "vigente": False,
            "estado": "vencida",
            "motivo": f"La concesión temporal de esta cantina finalizó el {fecha_fin.strftime('%d/%m/%Y')}.",
            "fecha_inicio": fecha_inicio.isoformat() if fecha_inicio else None,
            "fecha_fin": fecha_fin.isoformat(),
            "evento_nombre": evento_nombre
        }

    # 4. Control de días habilitados (para fines de semana)
    dias_semana_map = {0: 'lunes', 1: 'martes', 2: 'miercoles', 3: 'jueves', 4: 'viernes', 5: 'sabado', 6: 'domingo'}
    dia_hoy = dias_semana_map.get(today.weekday())

    dias_hab_lower = [str(d).lower().strip() for d in (dias_habilitados or [])]
    if tipo_temporalidad in ['fines_de_semana', 'fin_de_semana'] and not dias_hab_lower:
        dias_hab_lower = ['sabado', 'domingo']

    es_dia_operativo = True
    if dias_hab_lower and dia_hoy not in dias_hab_lower:
        es_dia_operativo = False

    dias_restantes = (fecha_fin - today).days if fecha_fin else 999

    return {
        "vigente": True,
        "es_dia_operativo": es_dia_operativo,
        "estado": "vigente",
        "motivo": f"Concesión activa para {evento_nombre} hasta el {fecha_fin.strftime('%d/%m/%Y') if fecha_fin else 'fin de torneo'}.",
        "dias_restantes": dias_restantes,
        "fecha_inicio": fecha_inicio.isoformat() if fecha_inicio else None,
        "fecha_fin": fecha_fin.isoformat() if fecha_fin else None,
        "evento_nombre": evento_nombre
    }


# ================================================================
# SCHEMAS PYDANTIC
# ================================================================

class CantinaLoginRequest(BaseModel):
    cantina_id: Optional[str] = None
    cantina_slug: Optional[str] = None
    rol: Optional[str] = "admin" # 'admin', 'cajera', 'despachante', 'encargado'
    pin: Optional[str] = None     # Obligatorio para cajera/despachante/encargado
    email: Optional[str] = None   # Para admin
    password: Optional[str] = None # Para admin

class CantinaGoogleLogin(BaseModel):
    credential: str
    cantina_id: Optional[str] = None

class CantinaSolicitudCreate(BaseModel):
    nombre: str
    slug: Optional[str] = None
    descripcion: Optional[str] = None
    evento_nombre: str
    tipo_temporalidad: str = "fin_de_semana" # 'dia', 'semana', 'fines_de_semana', 'personalizado'
    fecha_inicio: str # YYYY-MM-DD
    fecha_fin: str # YYYY-MM-DD
    dias_habilitados: Optional[List[str]] = ["sabado", "domingo"]
    solicitante_nombre: str
    solicitante_email: str
    solicitante_telefono: Optional[str] = None
    password: Optional[str] = None
    google_credential: Optional[str] = None

class CantinaAprobarRequest(BaseModel):
    fecha_inicio: Optional[str] = None
    fecha_fin: Optional[str] = None
    tipo_temporalidad: Optional[str] = None
    dias_habilitados: Optional[List[str]] = None

class CantinaRechazarRequest(BaseModel):
    motivo_rechazo: Optional[str] = "No cumple los requisitos para este evento."

class CantinaCrearDirecta(BaseModel):
    nombre: str
    slug: Optional[str] = None
    descripcion: Optional[str] = None
    evento_nombre: str
    tipo_temporalidad: str = "fin_de_semana"
    fecha_inicio: str
    fecha_fin: str
    dias_habilitados: Optional[List[str]] = ["sabado", "domingo"]
    admin_nombre: str
    admin_email: str
    admin_password: Optional[str] = "Cantina2026!"
    admin_telefono: Optional[str] = None

class CantinaVigenciaUpdate(BaseModel):
    fecha_inicio: Optional[str] = None
    fecha_fin: Optional[str] = None
    tipo_temporalidad: Optional[str] = None
    dias_habilitados: Optional[List[str]] = None
    activo: Optional[bool] = None
    estado_aprobacion: Optional[str] = None

class UsuarioCantinaCreate(BaseModel):
    nombre: str
    email: Optional[str] = None
    rol: str = "cajera" # 'cajera', 'despachante', 'encargado'
    pin: str = "1234" # PIN de 4 a 6 dígitos para ingreso rápido

class UsuarioCantinaUpdate(BaseModel):
    nombre: Optional[str] = None
    email: Optional[str] = None
    rol: Optional[str] = None
    pin: Optional[str] = None
    activo: Optional[bool] = None

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
    cantidad_ajuste: float
    motivo: str
    observaciones: Optional[str] = None

class TurnoCreate(BaseModel):
    encargado_nombre: str
    encargado_id: Optional[str] = None
    fecha: str
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
    cuenta_id: Optional[str] = None
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
    tipo: str = "compra_mercaderia"
    cuenta_id: Optional[str] = None
    monto_total: float
    concepto_proveedor: str
    comprobante_nro: Optional[str] = None
    items_comprados: List[ItemCompraInsumo] = []
    registrado_por: Optional[str] = "Encargado"
    observaciones: Optional[str] = None


# ================================================================
# HELPER DE RESOLUCIÓN DE CANTINA
# ================================================================

async def _get_default_cantina_id(session: AsyncSession, slug: Optional[str] = None, cantina_id: Optional[str] = None) -> str:
    """Retorna el UUID de la cantina activa por ID, slug o predeterminada."""
    if cantina_id:
        res = await session.execute(text("SELECT id FROM cantinas.cantinas WHERE id = :cid LIMIT 1"), {"cid": cantina_id})
        row = res.fetchone()
        if row:
            return str(row[0])

    if slug:
        res = await session.execute(text("SELECT id FROM cantinas.cantinas WHERE slug = :slug LIMIT 1"), {"slug": slug})
        row = res.fetchone()
        if row:
            return str(row[0])

    # Buscar la primera cantina activa aprobada
    res = await session.execute(text("""
        SELECT id FROM cantinas.cantinas 
        WHERE activo = TRUE AND estado_aprobacion = 'aprobada'
        ORDER BY created_at ASC LIMIT 1
    """))
    row = res.fetchone()
    if not row:
        # Fallback a cualquier cantina activa
        res_any = await session.execute(text("SELECT id FROM cantinas.cantinas WHERE activo = TRUE ORDER BY created_at ASC LIMIT 1"))
        row_any = res_any.fetchone()
        if row_any:
            return str(row_any[0])

        # Crear predeterminada si no existe ninguna
        create_res = await session.execute(text("""
            INSERT INTO cantinas.cantinas (
                nombre, slug, descripcion, moneda, activo, estado_aprobacion, 
                tipo_temporalidad, fecha_inicio, fecha_fin, evento_nombre
            ) VALUES (
                'Cantina Central MiCancha', 'cantina-central', 'Cantina oficial de demostración', 
                'GS', TRUE, 'aprobada', 'permanente', '2025-01-01', '2030-12-31', 'Sede Central'
            ) RETURNING id
        """))
        await session.commit()
        return str(create_res.fetchone()[0])
    return str(row[0])


# ================================================================
# SOLICITUDES Y GESTIÓN DE CANTINAS
# ================================================================

@router.post("/solicitudes")
async def solicitar_cantina(req: CantinaSolicitudCreate, session: AsyncSession = Depends(get_session)):
    """
    Solicitud pública desde la pantalla de login para habilitar una cantina temporal.
    Queda en estado 'pendiente' y activo=FALSE hasta que el Super Admin la apruebe.
    """
    clean_email = req.solicitante_email.strip().lower()
    
    # 1. Si viene credencial de Google, validar
    full_name = req.solicitante_nombre.strip()
    if req.google_credential:
        try:
            id_info = id_token.verify_oauth2_token(
                req.google_credential,
                google_requests.Request(),
                os.getenv("GOOGLE_CLIENT_ID")
            )
            clean_email = id_info['email'].strip().lower()
            full_name = id_info.get('name', full_name)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Token de Google inválido: {str(e)}")

    # 2. Buscar o crear usuario en sistema.usuarios para el administrador
    u_res = await session.execute(select(Usuario).where(func.lower(Usuario.email) == clean_email))
    user = u_res.scalar_one_or_none()

    if not user:
        username = clean_email.split('@')[0]
        # Verificar unicidad de username
        un_chk = await session.execute(select(Usuario).where(Usuario.username == username))
        if un_chk.scalar_one_or_none():
            username = f"{username}_{secrets.token_hex(2)}"

        pwd_raw = req.password or secrets.token_urlsafe(12)
        user = Usuario(
            username=username,
            email=clean_email,
            nombre_completo=full_name,
            hashed_password=get_password_hash(pwd_raw),
            rol="cantina",
            activo=True
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)

    # 3. Generar slug único
    base_slug = slugify(req.slug or req.nombre)
    final_slug = base_slug
    idx = 1
    while True:
        s_chk = await session.execute(text("SELECT id FROM cantinas.cantinas WHERE slug = :s"), {"s": final_slug})
        if not s_chk.fetchone():
            break
        final_slug = f"{base_slug}-{idx}"
        idx += 1

    # 4. Insertar cantina en estado PENDIENTE
    ins_res = await session.execute(text("""
        INSERT INTO cantinas.cantinas (
            usuario_id, nombre, slug, descripcion, evento_nombre,
            tipo_temporalidad, fecha_inicio, fecha_fin, dias_habilitados,
            solicitante_nombre, solicitante_email, solicitante_telefono,
            admin_email, estado_aprobacion, activo
        ) VALUES (
            :uid, :nom, :slug, :desc, :eve,
            :ttipo, :fini::date, :ffin::date, :dias::jsonb,
            :snom, :semail, :stel,
            :aemail, 'pendiente', FALSE
        ) RETURNING id
    """), {
        "uid": user.id,
        "nom": req.nombre.strip(),
        "slug": final_slug,
        "desc": req.descripcion or f"Cantina para {req.evento_nombre}",
        "eve": req.evento_nombre.strip(),
        "ttipo": req.tipo_temporalidad,
        "fini": req.fecha_inicio,
        "ffin": req.fecha_fin,
        "dias": json.dumps(req.dias_habilitados or ["sabado", "domingo"]),
        "snom": full_name,
        "semail": clean_email,
        "stel": req.solicitante_telefono,
        "aemail": clean_email
    })
    cantina_id = ins_res.fetchone()[0]
    await session.commit()

    return {
        "success": True,
        "cantina_id": str(cantina_id),
        "slug": final_slug,
        "estado": "pendiente",
        "message": "Solicitud enviada al Administrador de la Plataforma. Una vez habilitada, podrás ingresar con tu email o Google y cargar a tus colaboradores (cajeros, despachantes)."
    }

@router.get("/mis-cantinas")
async def listar_mis_cantinas(email: Optional[str] = None, session: AsyncSession = Depends(get_session)):
    """
    Lista todas las cantinas administradas por el usuario (multi-cantinas).
    Permite alternar entre eventos y ver el estado de vigencia de cada una.
    """
    clean_email = (email or "").strip().lower()
    if not clean_email:
        # Si no vino email, retornar cantinas activas generales
        res = await session.execute(text("""
            SELECT id, nombre, slug, descripcion, evento_nombre, tipo_temporalidad, 
                   fecha_inicio, fecha_fin, dias_habilitados, estado_aprobacion, activo, created_at
            FROM cantinas.cantinas
            ORDER BY created_at DESC
        """))
    else:
        res = await session.execute(text("""
            SELECT id, nombre, slug, descripcion, evento_nombre, tipo_temporalidad, 
                   fecha_inicio, fecha_fin, dias_habilitados, estado_aprobacion, activo, created_at
            FROM cantinas.cantinas
            WHERE LOWER(admin_email) = :email OR LOWER(solicitante_email) = :email
            ORDER BY created_at DESC
        """), {"email": clean_email})

    items = []
    for r in res.fetchall():
        cid = str(r[0])
        # Colaboradores count
        u_count_res = await session.execute(text("SELECT COUNT(*) FROM cantinas.usuarios_cantina WHERE cantina_id = :cid AND activo = TRUE"), {"cid": cid})
        u_count = int(u_count_res.fetchone()[0])
        
        # Productos count
        p_count_res = await session.execute(text("SELECT COUNT(*) FROM cantinas.productos WHERE cantina_id = :cid AND activo = TRUE"), {"cid": cid})
        p_count = int(p_count_res.fetchone()[0])

        vigencia = _verificar_vigencia_cantina({
            "estado_aprobacion": r[9],
            "activo": r[10],
            "fecha_inicio": r[6],
            "fecha_fin": r[7],
            "tipo_temporalidad": r[5],
            "dias_habilitados": r[8],
            "evento_nombre": r[4]
        })

        items.append({
            "id": cid,
            "nombre": r[1],
            "slug": r[2],
            "descripcion": r[3],
            "evento_nombre": r[4],
            "tipo_temporalidad": r[5],
            "fecha_inicio": r[6].isoformat() if r[6] else None,
            "fecha_fin": r[7].isoformat() if r[7] else None,
            "dias_habilitados": r[8] if isinstance(r[8], list) else (json.loads(r[8]) if r[8] else []),
            "estado_aprobacion": r[9],
            "activo": bool(r[10]),
            "vigencia": vigencia,
            "total_colaboradores": u_count,
            "total_productos": p_count,
            "created_at": r[11].isoformat() if r[11] else None
        })

    return items

@router.get("/lista")
async def listar_cantinas(session: AsyncSession = Depends(get_session)):
    """Lista cantinas públicas y activas."""
    res = await session.execute(text("""
        SELECT id, nombre, slug, descripcion, logo_url, moneda, evento_nombre, fecha_inicio, fecha_fin, created_at
        FROM cantinas.cantinas
        WHERE activo = TRUE AND estado_aprobacion = 'aprobada'
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
            "evento_nombre": r[6],
            "fecha_inicio": r[7].isoformat() if r[7] else None,
            "fecha_fin": r[8].isoformat() if r[8] else None,
            "created_at": r[9].isoformat() if r[9] else None
        }
        for r in res.fetchall()
    ]

@router.get("/info")
async def obtener_info_cantina(slug: Optional[str] = None, cantina_id: Optional[str] = None, session: AsyncSession = Depends(get_session)):
    """Obtiene datos de configuración y estado de vigencia de la cantina."""
    cid = await _get_default_cantina_id(session, slug, cantina_id)
    res = await session.execute(text("""
        SELECT id, nombre, slug, descripcion, logo_url, moneda, 
               tipo_temporalidad, fecha_inicio, fecha_fin, dias_habilitados, 
               evento_nombre, estado_aprobacion, activo, admin_email, created_at
        FROM cantinas.cantinas
        WHERE id = :cid
    """), {"cid": cid})
    row = res.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Cantina no encontrada")

    vigencia = _verificar_vigencia_cantina({
        "estado_aprobacion": row[11],
        "activo": row[12],
        "fecha_inicio": row[7],
        "fecha_fin": row[8],
        "tipo_temporalidad": row[6],
        "dias_habilitados": row[9],
        "evento_nombre": row[10]
    })

    return {
        "id": str(row[0]),
        "nombre": row[1],
        "slug": row[2],
        "descripcion": row[3],
        "logo_url": row[4],
        "moneda": row[5] or "GS",
        "tipo_temporalidad": row[6],
        "fecha_inicio": row[7].isoformat() if row[7] else None,
        "fecha_fin": row[8].isoformat() if row[8] else None,
        "dias_habilitados": row[9] if isinstance(row[9], list) else (json.loads(row[9]) if row[9] else []),
        "evento_nombre": row[10],
        "estado_aprobacion": row[11],
        "activo": bool(row[12]),
        "admin_email": row[13],
        "vigencia": vigencia,
        "created_at": row[14].isoformat() if row[14] else None
    }


# ================================================================
# AUTENTICACIÓN: LOGIN Y GOOGLE OAUTH
# ================================================================

@router.post("/auth/login")
async def cantina_login(req: CantinaLoginRequest, session: AsyncSession = Depends(get_session)):
    """
    Login para el personal o el administrador de la cantina.
    - Rol 'admin': requiere email y contraseña (o PIN asignado).
    - Roles 'cajera', 'despachante', 'encargado': requieren PIN y deben estar previamente cargados por el Administrador.
    - Valida que la cantina esté aprobada, activa y temporalmente vigente.
    """
    cantina_id = await _get_default_cantina_id(session, req.cantina_slug, req.cantina_id)

    # 1. Obtener cantina y verificar vigencia
    c_res = await session.execute(text("""
        SELECT id, nombre, slug, estado_aprobacion, activo, fecha_inicio, fecha_fin, 
               tipo_temporalidad, dias_habilitados, evento_nombre, admin_email, usuario_id
        FROM cantinas.cantinas
        WHERE id = :cid
    """), {"cid": cantina_id})
    c_row = c_res.fetchone()
    if not c_row:
        raise HTTPException(status_code=404, detail="Cantina no encontrada.")

    vigencia = _verificar_vigencia_cantina({
        "estado_aprobacion": c_row[3],
        "activo": c_row[4],
        "fecha_inicio": c_row[5],
        "fecha_fin": c_row[6],
        "tipo_temporalidad": c_row[7],
        "dias_habilitados": c_row[8],
        "evento_nombre": c_row[9]
    })

    # Si no está aprobada
    if c_row[3] != "aprobada":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"La cantina '{c_row[1]}' está en estado '{c_row[3]}' y requiere habilitación del Administrador de la Plataforma."
        )

    # Si está inactiva
    if not c_row[4]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Esta cantina se encuentra temporalmente desactivada por el Administrador de la Plataforma."
        )

    # Rol solicitado
    rol = (req.rol or "cajera").lower().strip()

    # -------------------------------------------------------------
    # A) ACCESO COMO ADMINISTRADOR DE LA CANTINA
    # -------------------------------------------------------------
    if rol == "admin":
        # Puede autenticar por email/password o por PIN
        admin_auth_ok = False
        user_obj = None

        if req.email and req.password:
            clean_email = req.email.strip().lower()
            res_u = await session.execute(
                select(Usuario).where(
                    (func.lower(Usuario.email) == clean_email) | (func.lower(Usuario.username) == clean_email)
                )
            )
            user_candidate = res_u.scalar_one_or_none()
            if user_candidate and verify_password(req.password, user_candidate.hashed_password):
                # Verificar que sea el administrador de esta cantina o superadmin
                if user_candidate.rol in ["admin", "superadmin"] or (c_row[10] and c_row[10].lower() == user_candidate.email.lower()) or c_row[11] == user_candidate.id:
                    admin_auth_ok = True
                    user_obj = user_candidate
                else:
                    raise HTTPException(status_code=403, detail="Esta cuenta no es administradora de esta cantina.")

        # Fallback a PIN si no vino contraseña
        if not admin_auth_ok and req.pin:
            p_res = await session.execute(text("""
                SELECT id, nombre, email, rol 
                FROM cantinas.usuarios_cantina 
                WHERE cantina_id = :cid AND pin = :pin AND rol = 'admin' AND activo = TRUE
                LIMIT 1
            """), {"cid": cantina_id, "pin": req.pin})
            p_row = p_res.fetchone()
            if p_row:
                admin_auth_ok = True
                user_obj = {"id": str(p_row[0]), "nombre": p_row[1], "email": p_row[2], "rol": "admin"}

        if not admin_auth_ok:
            raise HTTPException(status_code=401, detail="Credenciales incorrectas de Administrador de Cantina.")

        user_id = str(user_obj.id) if hasattr(user_obj, 'id') else str(user_obj['id'])
        user_name = user_obj.nombre_completo if hasattr(user_obj, 'nombre_completo') else user_obj['nombre']
        user_email = user_obj.email if hasattr(user_obj, 'email') else user_obj['email']

        token = create_access_token({"sub": user_email, "role": "cantina", "rol_cantina": "admin", "cantina_id": cantina_id})

        return {
            "authorized": True,
            "token": token,
            "cantina_id": cantina_id,
            "cantina_nombre": c_row[1],
            "cantina_slug": c_row[2],
            "evento_nombre": c_row[9],
            "vigencia": vigencia,
            "user": {
                "id": user_id,
                "nombre": user_name,
                "email": user_email,
                "rol": "admin"
            }
        }

    # -------------------------------------------------------------
    # B) ACCESO DE PERSONAL (CAJERA / DESPACHANTE / ENCARGADO)
    # -------------------------------------------------------------
    # La cantina DEBE estar vigente para operar
    if not vigencia["vigente"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=vigencia["motivo"]
        )

    if not req.pin:
        raise HTTPException(status_code=400, detail="Se requiere el PIN de 4 dígitos asignado por el Administrador.")

    # Buscar usuario en cantinas.usuarios_cantina
    u_res = await session.execute(text("""
        SELECT id, nombre, email, rol, activo
        FROM cantinas.usuarios_cantina
        WHERE cantina_id = :cid AND pin = :pin AND activo = TRUE
        LIMIT 1
    """), {"cid": cantina_id, "pin": req.pin})
    u_row = u_res.fetchone()

    if not u_row:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="PIN no encontrado o colaborador no dado de alta por el Administrador de la Cantina."
        )

    token = create_access_token({"sub": u_row[2] or f"{u_row[3]}@cantina.local", "role": "cantina", "rol_cantina": u_row[3], "cantina_id": cantina_id})

    return {
        "authorized": True,
        "token": token,
        "cantina_id": cantina_id,
        "cantina_nombre": c_row[1],
        "cantina_slug": c_row[2],
        "evento_nombre": c_row[9],
        "vigencia": vigencia,
        "user": {
            "id": str(u_row[0]),
            "nombre": u_row[1],
            "email": u_row[2] or f"{u_row[3]}@cantina.local",
            "rol": u_row[3]
        }
    }


@router.post("/auth/google-login")
async def cantina_google_login(data: CantinaGoogleLogin, session: AsyncSession = Depends(get_session)):
    """
    Autenticación con Google OAuth para Administradores de Cantina.
    - Identifica si el correo tiene una o más cantinas asignadas a lo largo del tiempo.
    - Si tiene cantinas aprobadas, ingresa a la activa y devuelve la lista de todas sus cantinas.
    - Si tiene cantinas pendientes, informa al usuario.
    - Si no tiene cantina, devuelve datos listos para autocompletar la solicitud.
    """
    try:
        id_info = id_token.verify_oauth2_token(
            data.credential,
            google_requests.Request(),
            os.getenv("GOOGLE_CLIENT_ID")
        )
        email = id_info['email'].strip().lower()
        full_name = id_info.get('name', '')
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Token de Google inválido: {str(e)}")

    # Buscar usuario
    u_res = await session.execute(select(Usuario).where(func.lower(Usuario.email) == email))
    user = u_res.scalar_one_or_none()

    # Buscar cantinas donde es admin
    c_res = await session.execute(text("""
        SELECT id, nombre, slug, estado_aprobacion, activo, fecha_inicio, fecha_fin, 
               tipo_temporalidad, dias_habilitados, evento_nombre
        FROM cantinas.cantinas
        WHERE LOWER(admin_email) = :email OR LOWER(solicitante_email) = :email
        ORDER BY created_at DESC
    """), {"email": email})
    cantinas = c_res.fetchall()

    if not cantinas:
        # Verificar si es colaborador en alguna cantina
        colab_res = await session.execute(text("""
            SELECT uc.id, uc.cantina_id, uc.nombre, uc.rol, c.nombre AS cantina_nombre, c.slug, c.evento_nombre
            FROM cantinas.usuarios_cantina uc
            JOIN cantinas.cantinas c ON c.id = uc.cantina_id
            WHERE LOWER(uc.email) = :email AND uc.activo = TRUE
            LIMIT 1
        """), {"email": email})
        colab = colab_res.fetchone()

        if colab:
            token = create_access_token({"sub": email, "role": "cantina", "rol_cantina": colab[3], "cantina_id": str(colab[1])})
            return {
                "status": "colaborador",
                "authorized": True,
                "token": token,
                "cantina_id": str(colab[1]),
                "cantina_nombre": colab[4],
                "cantina_slug": colab[5],
                "evento_nombre": colab[6],
                "user": {"id": str(colab[0]), "nombre": colab[2], "email": email, "rol": colab[3]}
            }

        return {
            "status": "no_registrado",
            "authorized": False,
            "email": email,
            "nombre": full_name,
            "message": "Tu cuenta de Google no tiene ninguna cantina asignada aún. Puedes solicitar la creación de una cantina temporal ahora mismo."
        }

    # Revisar si tiene cantinas aprobadas
    aprobadas = [c for c in cantinas if c[3] == 'aprobada' and c[4] is True]
    pendientes = [c for c in cantinas if c[3] == 'pendiente']

    if not aprobadas and pendientes:
        p_cantina = pendientes[0]
        return {
            "status": "pendiente",
            "authorized": False,
            "cantina_nombre": p_cantina[1],
            "evento_nombre": p_cantina[9],
            "message": f"Tu solicitud para '{p_cantina[1]}' ({p_cantina[9]}) está pendiente de revisión y habilitación por el Administrador de la Plataforma."
        }

    if not aprobadas:
        raise HTTPException(
            status_code=403, 
            detail="Tus solicitudes de cantina están inactivas o rechazadas. Contacta al Administrador de la Plataforma."
        )

    # Seleccionar cantina: si especificó cantina_id, buscarla; sino, la primera aprobada
    selected = aprobadas[0]
    if data.cantina_id:
        match = next((c for c in aprobadas if str(c[0]) == str(data.cantina_id)), None)
        if match:
            selected = match

    vigencia = _verificar_vigencia_cantina({
        "estado_aprobacion": selected[3],
        "activo": selected[4],
        "fecha_inicio": selected[5],
        "fecha_fin": selected[6],
        "tipo_temporalidad": selected[7],
        "dias_habilitados": selected[8],
        "evento_nombre": selected[9]
    })

    user_id = str(user.id) if user else str(uuid.uuid4())
    token = create_access_token({"sub": email, "role": "cantina", "rol_cantina": "admin", "cantina_id": str(selected[0])})

    # Lista de todas sus cantinas para el switcher
    mis_cantinas = [
        {
            "id": str(c[0]),
            "nombre": c[1],
            "slug": c[2],
            "estado_aprobacion": c[3],
            "activo": bool(c[4]),
            "evento_nombre": c[9],
            "fecha_inicio": c[5].isoformat() if c[5] else None,
            "fecha_fin": c[6].isoformat() if c[6] else None,
        }
        for c in cantinas
    ]

    return {
        "status": "aprobada",
        "authorized": True,
        "token": token,
        "cantina_id": str(selected[0]),
        "cantina_nombre": selected[1],
        "cantina_slug": selected[2],
        "evento_nombre": selected[9],
        "vigencia": vigencia,
        "mis_cantinas": mis_cantinas,
        "user": {
            "id": user_id,
            "nombre": full_name or (user.nombre_completo if user else "Administrador"),
            "email": email,
            "rol": "admin"
        }
    }


# ================================================================
# SUPER ADMINISTRADOR: GESTIÓN DE SOLICITUDES Y CANTINAS
# ================================================================

@router.get("/admin/solicitudes")
async def listar_solicitudes_super_admin(session: AsyncSession = Depends(get_session)):
    """Lista las solicitudes de cantina pendientes de revisión por el Super Administrador."""
    res = await session.execute(text("""
        SELECT id, nombre, slug, evento_nombre, tipo_temporalidad, 
               fecha_inicio, fecha_fin, dias_habilitados, solicitante_nombre, 
               solicitante_email, solicitante_telefono, estado_aprobacion, created_at
        FROM cantinas.cantinas
        WHERE estado_aprobacion = 'pendiente'
        ORDER BY created_at DESC
    """))
    return [
        {
            "id": str(r[0]),
            "nombre": r[1],
            "slug": r[2],
            "evento_nombre": r[3],
            "tipo_temporalidad": r[4],
            "fecha_inicio": r[5].isoformat() if r[5] else None,
            "fecha_fin": r[6].isoformat() if r[6] else None,
            "dias_habilitados": r[7] if isinstance(r[7], list) else (json.loads(r[7]) if r[7] else []),
            "solicitante_nombre": r[8],
            "solicitante_email": r[9],
            "solicitante_telefono": r[10],
            "estado_aprobacion": r[11],
            "created_at": r[12].isoformat() if r[12] else None
        }
        for r in res.fetchall()
    ]

@router.post("/admin/solicitudes/{cantina_id}/aprobar")
async def aprobar_solicitud_cantina(cantina_id: str, req: Optional[CantinaAprobarRequest] = None, session: AsyncSession = Depends(get_session)):
    """
    Super Admin aprueba y habilita la cantina:
    - Activa la cantina con vigencia confirmada.
    - Activa la cuenta del Administrador de Cantina en sistema.usuarios.
    - Crea automáticamente la cuenta inicial 'Caja Efectivo'.
    """
    c_res = await session.execute(text("""
        SELECT id, nombre, usuario_id, admin_email, solicitante_email, solicitante_nombre
        FROM cantinas.cantinas WHERE id = :cid
    """), {"cid": cantina_id})
    c_row = c_res.fetchone()
    if not c_row:
        raise HTTPException(status_code=404, detail="Cantina no encontrada.")

    admin_email = (c_row[3] or c_row[4] or "").lower().strip()

    # Actualizar fechas si vinieron en el request
    updates = ["activo = TRUE", "estado_aprobacion = 'aprobada'", "aprobado_at = NOW()"]
    params: Dict[str, Any] = {"cid": cantina_id}

    if req:
        if req.fecha_inicio:
            updates.append("fecha_inicio = :fini::date")
            params["fini"] = req.fecha_inicio
        if req.fecha_fin:
            updates.append("fecha_fin = :ffin::date")
            params["ffin"] = req.fecha_fin
        if req.tipo_temporalidad:
            updates.append("tipo_temporalidad = :ttipo")
            params["ttipo"] = req.tipo_temporalidad
        if req.dias_habilitados:
            updates.append("dias_habilitados = :dias::jsonb")
            params["dias"] = json.dumps(req.dias_habilitados)

    sql_up = f"UPDATE cantinas.cantinas SET {', '.join(updates)} WHERE id = :cid"
    await session.execute(text(sql_up), params)

    # Activar usuario en sistema.usuarios si existe
    if admin_email:
        await session.execute(text("""
            UPDATE sistema.usuarios SET activo = TRUE WHERE LOWER(email) = :email
        """), {"email": admin_email})

    # Crear cuenta 'Caja Efectivo' por defecto si no tiene ninguna
    await session.execute(text("""
        INSERT INTO cantinas.cuentas (cantina_id, nombre, tipo, saldo_actual, es_principal, activo)
        SELECT :cid, 'Caja Efectivo', 'efectivo', 0, TRUE, TRUE
        WHERE NOT EXISTS (SELECT 1 FROM cantinas.cuentas WHERE cantina_id = :cid)
    """), {"cid": cantina_id})

    await session.commit()
    return {"success": True, "message": f"Cantina '{c_row[1]}' aprobada y habilitada con éxito."}

@router.post("/admin/solicitudes/{cantina_id}/rechazar")
async def rechazar_solicitud_cantina(cantina_id: str, req: CantinaRechazarRequest, session: AsyncSession = Depends(get_session)):
    """Super Admin rechaza una solicitud de cantina especificando el motivo."""
    await session.execute(text("""
        UPDATE cantinas.cantinas 
        SET estado_aprobacion = 'rechazada', activo = FALSE, motivo_rechazo = :motivo
        WHERE id = :cid
    """), {"cid": cantina_id, "motivo": req.motivo_rechazo})
    await session.commit()
    return {"success": True, "message": "Solicitud rechazada."}

@router.post("/admin/crear-directa")
async def crear_cantina_directa(req: CantinaCrearDirecta, session: AsyncSession = Depends(get_session)):
    """
    El Super Administrador crea y habilita una cantina directamente,
    asignando a su administrador y fijando sus fechas de vigencia.
    """
    clean_email = req.admin_email.strip().lower()

    # Buscar o crear usuario
    u_res = await session.execute(select(Usuario).where(func.lower(Usuario.email) == clean_email))
    user = u_res.scalar_one_or_none()

    if not user:
        username = clean_email.split('@')[0]
        un_chk = await session.execute(select(Usuario).where(Usuario.username == username))
        if un_chk.scalar_one_or_none():
            username = f"{username}_{secrets.token_hex(2)}"

        user = Usuario(
            username=username,
            email=clean_email,
            nombre_completo=req.admin_nombre.strip(),
            hashed_password=get_password_hash(req.admin_password or "Cantina2026!"),
            rol="cantina",
            activo=True
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)

    # Slug
    base_slug = slugify(req.slug or req.nombre)
    final_slug = base_slug
    idx = 1
    while True:
        s_chk = await session.execute(text("SELECT id FROM cantinas.cantinas WHERE slug = :s"), {"s": final_slug})
        if not s_chk.fetchone():
            break
        final_slug = f"{base_slug}-{idx}"
        idx += 1

    # Insertar cantina aprobada
    ins_res = await session.execute(text("""
        INSERT INTO cantinas.cantinas (
            usuario_id, nombre, slug, descripcion, evento_nombre,
            tipo_temporalidad, fecha_inicio, fecha_fin, dias_habilitados,
            solicitante_nombre, solicitante_email, solicitante_telefono,
            admin_email, estado_aprobacion, activo, aprobado_at
        ) VALUES (
            :uid, :nom, :slug, :desc, :eve,
            :ttipo, :fini::date, :ffin::date, :dias::jsonb,
            :snom, :semail, :stel,
            :aemail, 'aprobada', TRUE, NOW()
        ) RETURNING id
    """), {
        "uid": user.id,
        "nom": req.nombre.strip(),
        "slug": final_slug,
        "desc": req.descripcion or f"Cantina para {req.evento_nombre}",
        "eve": req.evento_nombre.strip(),
        "ttipo": req.tipo_temporalidad,
        "fini": req.fecha_inicio,
        "ffin": req.fecha_fin,
        "dias": json.dumps(req.dias_habilitados or ["sabado", "domingo"]),
        "snom": req.admin_nombre.strip(),
        "semail": clean_email,
        "stel": req.admin_telefono,
        "aemail": clean_email
    })
    new_id = ins_res.fetchone()[0]

    # Crear cuenta 'Caja Efectivo'
    await session.execute(text("""
        INSERT INTO cantinas.cuentas (cantina_id, nombre, tipo, saldo_actual, es_principal, activo)
        VALUES (:cid, 'Caja Efectivo', 'efectivo', 0, TRUE, TRUE)
    """), {"cid": str(new_id)})

    await session.commit()
    return {
        "success": True,
        "id": str(new_id),
        "slug": final_slug,
        "message": f"Cantina '{req.nombre}' creada y habilitada exitosamente."
    }

@router.get("/admin/todas")
async def listar_todas_cantinas_admin(session: AsyncSession = Depends(get_session)):
    """Lista todas las cantinas del sistema para monitoreo central del Super Admin."""
    res = await session.execute(text("""
        SELECT id, nombre, slug, evento_nombre, tipo_temporalidad, fecha_inicio, 
               fecha_fin, dias_habilitados, admin_email, solicitante_nombre, 
               estado_aprobacion, activo, created_at
        FROM cantinas.cantinas
        ORDER BY created_at DESC
    """))

    cantinas = []
    for r in res.fetchall():
        cid = str(r[0])
        u_count_res = await session.execute(text("SELECT COUNT(*) FROM cantinas.usuarios_cantina WHERE cantina_id = :cid AND activo = TRUE"), {"cid": cid})
        u_count = int(u_count_res.fetchone()[0])
        
        p_count_res = await session.execute(text("SELECT COUNT(*) FROM cantinas.productos WHERE cantina_id = :cid AND activo = TRUE"), {"cid": cid})
        p_count = int(p_count_res.fetchone()[0])

        vigencia = _verificar_vigencia_cantina({
            "estado_aprobacion": r[10],
            "activo": r[11],
            "fecha_inicio": r[5],
            "fecha_fin": r[6],
            "tipo_temporalidad": r[4],
            "dias_habilitados": r[7],
            "evento_nombre": r[3]
        })

        cantinas.append({
            "id": cid,
            "nombre": r[1],
            "slug": r[2],
            "evento_nombre": r[3],
            "tipo_temporalidad": r[4],
            "fecha_inicio": r[5].isoformat() if r[5] else None,
            "fecha_fin": r[6].isoformat() if r[6] else None,
            "dias_habilitados": r[7] if isinstance(r[7], list) else (json.loads(r[7]) if r[7] else []),
            "admin_email": r[8],
            "solicitante_nombre": r[9],
            "estado_aprobacion": r[10],
            "activo": bool(r[11]),
            "vigencia": vigencia,
            "total_colaboradores": u_count,
            "total_productos": p_count,
            "created_at": r[12].isoformat() if r[12] else None
        })

    return cantinas

@router.put("/admin/{cantina_id}/vigencia")
async def actualizar_vigencia_cantina(cantina_id: str, req: CantinaVigenciaUpdate, session: AsyncSession = Depends(get_session)):
    """Super Admin modifica o extiende la vigencia temporal de una cantina."""
    updates = []
    params: Dict[str, Any] = {"cid": cantina_id}

    if req.fecha_inicio is not None:
        updates.append("fecha_inicio = :fini::date")
        params["fini"] = req.fecha_inicio
    if req.fecha_fin is not None:
        updates.append("fecha_fin = :ffin::date")
        params["ffin"] = req.fecha_fin
    if req.tipo_temporalidad is not None:
        updates.append("tipo_temporalidad = :ttipo")
        params["ttipo"] = req.tipo_temporalidad
    if req.dias_habilitados is not None:
        updates.append("dias_habilitados = :dias::jsonb")
        params["dias"] = json.dumps(req.dias_habilitados)
    if req.activo is not None:
        updates.append("activo = :act")
        params["act"] = req.activo
    if req.estado_aprobacion is not None:
        updates.append("estado_aprobacion = :eap")
        params["eap"] = req.estado_aprobacion

    if updates:
        sql = f"UPDATE cantinas.cantinas SET {', '.join(updates)} WHERE id = :cid"
        await session.execute(text(sql), params)
        await session.commit()

    return {"success": True, "message": "Vigencia actualizada con éxito."}


# ================================================================
# GESTIÓN DE COLABORADORES Y EQUIPO (POR EL ADMINISTRADOR DE CANTINA)
# ================================================================

@router.get("/usuarios")
async def listar_usuarios_cantina(slug: Optional[str] = None, cantina_id: Optional[str] = None, session: AsyncSession = Depends(get_session)):
    """Lista el personal dado de alta para esta cantina específica."""
    cid = await _get_default_cantina_id(session, slug, cantina_id)
    res = await session.execute(text("""
        SELECT id, nombre, email, rol, pin, activo, created_at
        FROM cantinas.usuarios_cantina
        WHERE cantina_id = :cid AND activo = TRUE
        ORDER BY rol ASC, nombre ASC
    """), {"cid": cid})
    return [
        {
            "id": str(r[0]),
            "nombre": r[1],
            "email": r[2],
            "rol": r[3],
            "pin": r[4],
            "activo": bool(r[5]),
            "created_at": r[6].isoformat() if r[6] else None
        }
        for r in res.fetchall()
    ]

@router.post("/usuarios")
async def crear_usuario_cantina(u: UsuarioCantinaCreate, slug: Optional[str] = None, cantina_id: Optional[str] = None, session: AsyncSession = Depends(get_session)):
    """
    El Administrador de la Cantina da de alta un nuevo colaborador:
    cajera, despachante o encargado, asignándole su PIN de mostrador.
    """
    cid = await _get_default_cantina_id(session, slug, cantina_id)

    # Validar PIN
    clean_pin = u.pin.strip()
    if not clean_pin.isdigit() or len(clean_pin) < 4:
        raise HTTPException(status_code=400, detail="El PIN debe contener entre 4 y 6 dígitos numéricos.")

    # Verificar si el PIN ya está en uso en esta cantina
    dup_res = await session.execute(text("""
        SELECT id, nombre FROM cantinas.usuarios_cantina
        WHERE cantina_id = :cid AND pin = :pin AND activo = TRUE
        LIMIT 1
    """), {"cid": cid, "pin": clean_pin})
    dup_row = dup_res.fetchone()
    if dup_row:
        raise HTTPException(
            status_code=400, 
            detail=f"El PIN {clean_pin} ya está en uso por {dup_row[1]}. Elige otro PIN."
        )

    res = await session.execute(text("""
        INSERT INTO cantinas.usuarios_cantina (
            cantina_id, nombre, email, rol, pin, activo
        ) VALUES (
            :cid, :nom, :email, :rol, :pin, TRUE
        ) RETURNING id
    """), {
        "cid": cid,
        "nom": u.nombre.strip(),
        "email": u.email.strip().lower() if u.email else None,
        "rol": u.rol.strip().lower(),
        "pin": clean_pin
    })
    new_id = res.fetchone()[0]
    await session.commit()

    return {
        "success": True,
        "id": str(new_id),
        "nombre": u.nombre.strip(),
        "rol": u.rol.strip().lower(),
        "pin": clean_pin,
        "message": f"Colaborador {u.nombre} ({u.rol}) registrado con éxito."
    }

@router.put("/usuarios/{usuario_id}")
async def actualizar_usuario_cantina(usuario_id: str, u: UsuarioCantinaUpdate, session: AsyncSession = Depends(get_session)):
    """Actualiza datos, rol o PIN de un colaborador."""
    updates = []
    params: Dict[str, Any] = {"uid": usuario_id}

    if u.nombre is not None:
        updates.append("nombre = :nom")
        params["nom"] = u.nombre.strip()
    if u.email is not None:
        updates.append("email = :email")
        params["email"] = u.email.strip().lower()
    if u.rol is not None:
        updates.append("rol = :rol")
        params["rol"] = u.rol.strip().lower()
    if u.pin is not None:
        clean_pin = u.pin.strip()
        if not clean_pin.isdigit() or len(clean_pin) < 4:
            raise HTTPException(status_code=400, detail="El PIN debe tener entre 4 y 6 dígitos numéricos.")
        updates.append("pin = :pin")
        params["pin"] = clean_pin
    if u.activo is not None:
        updates.append("activo = :act")
        params["act"] = u.activo

    if updates:
        sql = f"UPDATE cantinas.usuarios_cantina SET {', '.join(updates)} WHERE id = :uid"
        await session.execute(text(sql), params)
        await session.commit()

    return {"success": True, "message": "Colaborador actualizado."}

@router.delete("/usuarios/{usuario_id}")
async def eliminar_usuario_cantina(usuario_id: str, session: AsyncSession = Depends(get_session)):
    """Da de baja a un colaborador de la cantina."""
    await session.execute(text("UPDATE cantinas.usuarios_cantina SET activo = FALSE WHERE id = :uid"), {"uid": usuario_id})
    await session.commit()
    return {"success": True, "message": "Colaborador dado de baja."}



# ================================================================
# CUENTAS Y TESORERÍA (MULTI-CUENTAS: CAJA, BANCO 1, BANCO 2)
# ================================================================

@router.get("/cuentas")
async def listar_cuentas(slug: Optional[str] = None, cantina_id: Optional[str] = None, session: AsyncSession = Depends(get_session)):
    """Lista las cuentas de pago/cobro de la cantina con sus saldos actuales."""
    cid = await _get_default_cantina_id(session, slug, cantina_id)
    res = await session.execute(text("""
        SELECT id, nombre, tipo, numero_cuenta, saldo_actual, es_principal, activo
        FROM cantinas.cuentas
        WHERE cantina_id = :cid AND activo = TRUE
        ORDER BY es_principal DESC, nombre ASC
    """), {"cid": cid})
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
async def crear_cuenta(cuenta: CuentaCreate, slug: Optional[str] = None, cantina_id: Optional[str] = None, session: AsyncSession = Depends(get_session)):
    """Crea una nueva cuenta financiera (ej: Banco Continental QR, Caja chica, etc.)."""
    cid = await _get_default_cantina_id(session, slug, cantina_id)
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
    cantina_id: Optional[str] = None,
    session: AsyncSession = Depends(get_session)
):
    """Lista los productos del catálogo con stock disponible y alertas de stock bajo."""
    cid = await _get_default_cantina_id(session, slug, cantina_id)
    query = """
        SELECT id, codigo_barra, nombre, categoria, descripcion, precio_costo, precio_venta,
               stock_actual, stock_minimo, imagen_url, disponible_menu_qr, activo
        FROM cantinas.productos
        WHERE cantina_id = :cid
    """
    params: Dict[str, Any] = {"cid": cid}
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
async def crear_producto(prod: ProductoCreate, slug: Optional[str] = None, cantina_id: Optional[str] = None, session: AsyncSession = Depends(get_session)):
    """Agrega un nuevo producto al catálogo."""
    cid = await _get_default_cantina_id(session, slug, cantina_id)
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
async def listar_turnos(fecha: Optional[str] = None, slug: Optional[str] = None, cantina_id: Optional[str] = None, session: AsyncSession = Depends(get_session)):
    """Lista los turnos programados, en curso y finalizados."""
    cid = await _get_default_cantina_id(session, slug, cantina_id)
    query = """
        SELECT id, encargado_nombre, fecha, hora_inicio_prog, hora_fin_prog,
               hora_inicio_real, hora_fin_real, estado, fondo_inicial_caja,
               total_ventas, total_gastos, observaciones, created_at
        FROM cantinas.turnos
        WHERE cantina_id = :cid
    """
    params: Dict[str, Any] = {"cid": cid}
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
async def obtener_turno_activo(slug: Optional[str] = None, cantina_id: Optional[str] = None, session: AsyncSession = Depends(get_session)):
    """Retorna el turno actualmente 'en_curso' para la cantina."""
    cid = await _get_default_cantina_id(session, slug, cantina_id)
    res = await session.execute(text("""
        SELECT id, encargado_nombre, fecha, hora_inicio_prog, hora_fin_prog,
               hora_inicio_real, estado, fondo_inicial_caja, total_ventas, total_gastos, observaciones
        FROM cantinas.turnos
        WHERE cantina_id = :cid AND estado = 'en_curso'
        ORDER BY hora_inicio_real DESC LIMIT 1
    """), {"cid": cid})
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
async def crear_turno(t: TurnoCreate, slug: Optional[str] = None, cantina_id: Optional[str] = None, session: AsyncSession = Depends(get_session)):
    """Programa un nuevo turno asignando encargado, fecha y horario."""
    cid = await _get_default_cantina_id(session, slug, cantina_id)
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
async def crear_pedido_pos(p: PedidoCreate, slug: Optional[str] = None, cantina_id: Optional[str] = None, session: AsyncSession = Depends(get_session)):
    """
    Cajera toma el pedido de forma ágil:
    - Asigna número de comanda correlativo (#1, #2, #3...).
    - Estado de pago: 'pagado'.
    - Estado de entrega: 'pendiente' (aparece en la pantalla del despachante).
    - Registra el cobro en la cuenta financiera correspondiente (Caja, Banco 1, etc.).
    - NOTA: El stock aún NO se descuenta aquí; se descontará cuando el despachante entregue.
    """
    cid = await _get_default_cantina_id(session, slug, cantina_id)
    
    # Verificar vigencia temporal de la cantina antes de registrar pedidos
    c_chk = await session.execute(text("""
        SELECT estado_aprobacion, activo, fecha_inicio, fecha_fin, tipo_temporalidad, dias_habilitados, evento_nombre
        FROM cantinas.cantinas WHERE id = :cid
    """), {"cid": cid})
    c_row_chk = c_chk.fetchone()
    if c_row_chk:
        vig = _verificar_vigencia_cantina(c_row_chk)
        if not vig["vigente"]:
            raise HTTPException(status_code=400, detail=f"No se pueden registrar ventas: {vig['motivo']}")

    # Resolver cuenta si no vino
    cuenta_id = p.cuenta_id
    if not cuenta_id:
        c_res = await session.execute(text("""
            SELECT id FROM cantinas.cuentas
            WHERE cantina_id = :cid AND es_principal = TRUE AND activo = TRUE LIMIT 1
        """), {"cid": cid})
        c_row = c_res.fetchone()
        cuenta_id = str(c_row[0]) if c_row else None

    # Correlativo diario para el ticket comanda
    num_res = await session.execute(text("""
        SELECT COALESCE(MAX(numero_pedido), 0) + 1
        FROM cantinas.pedidos
        WHERE cantina_id = :cid AND created_at::date = CURRENT_DATE
    """), {"cid": cid})
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
        "cid": cid,
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
    cantina_id: Optional[str] = None,
    session: AsyncSession = Depends(get_session)
):
    """Lista pedidos de la cantina."""
    cid = await _get_default_cantina_id(session, slug, cantina_id)
    query = """
        SELECT p.id, p.numero_pedido, p.cliente_nombre, p.monto_total,
               p.estado_pago, p.estado_entrega, p.creado_por, p.despachado_por,
               p.observaciones, p.created_at, p.entregado_at, c.nombre as cuenta_nombre
        FROM cantinas.pedidos p
        LEFT JOIN cantinas.cuentas c ON p.cuenta_id = c.id
        WHERE p.cantina_id = :cid
    """
    params: Dict[str, Any] = {"cid": cid, "lim": limit}
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
async def listar_pedidos_despacho(slug: Optional[str] = None, cantina_id: Optional[str] = None, session: AsyncSession = Depends(get_session)):
    """
    Pantalla del Despachante: lista en tiempo real los pedidos en cola ('pendiente' o 'en_preparacion')
    con detalle completo de productos, cantidades y observaciones de cocina/mostrador.
    """
    cid = await _get_default_cantina_id(session, slug, cantina_id)
    
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
async def registrar_compra_gasto(cg: CompraGastoCreate, slug: Optional[str] = None, cantina_id: Optional[str] = None, session: AsyncSession = Depends(get_session)):
    """
    Permite a los padres/encargados registrar sus compras de productos o gastos:
    - Si es 'compra_mercaderia', SUMA AUTOMÁTICAMENTE al stock de cada producto comprado.
    - Debita el dinero de la cuenta de pago seleccionada (Caja, Banco 1, etc.).
    - Genera el movimiento en el libro mayor.
    """
    import json
    cid = await _get_default_cantina_id(session, slug, cantina_id)
    
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
        "cid": cid,
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
async def listar_compras_gastos(limit: int = 50, slug: Optional[str] = None, cantina_id: Optional[str] = None, session: AsyncSession = Depends(get_session)):
    """Lista las compras de insumos y gastos registrados."""
    cid = await _get_default_cantina_id(session, slug, cantina_id)
    res = await session.execute(text("""
        SELECT cg.id, cg.tipo, cg.monto_total, cg.concepto_proveedor,
               cg.comprobante_nro, cg.items_comprados, cg.registrado_por,
               cg.fecha, c.nombre as cuenta_nombre
        FROM cantinas.compras_gastos cg
        LEFT JOIN cantinas.cuentas c ON cg.cuenta_id = c.id
        WHERE cg.cantina_id = :cid
        ORDER BY cg.fecha DESC LIMIT :lim
    """), {"cid": cid, "lim": limit})
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
async def reporte_resumen_financiero(slug: Optional[str] = None, cantina_id: Optional[str] = None, session: AsyncSession = Depends(get_session)):
    """
    Resumen integral de finanzas del mininegocio:
    - Total ventas cobradas
    - Total compras y gastos
    - Ganancia neta
    - Desglose de saldos actuales por cuenta (Caja, Banco 1, Banco 2)
    """
    cid = await _get_default_cantina_id(session, slug, cantina_id)

    # Ventas totales
    v_res = await session.execute(text("""
        SELECT COALESCE(SUM(monto_total), 0), COUNT(id)
        FROM cantinas.pedidos
        WHERE cantina_id = :cid AND estado_pago = 'pagado'
    """), {"cid": cid})
    v_row = v_res.fetchone()
    total_ingresos = float(v_row[0] or 0)
    cant_pedidos = int(v_row[1] or 0)

    # Gastos totales
    g_res = await session.execute(text("""
        SELECT COALESCE(SUM(monto_total), 0), COUNT(id)
        FROM cantinas.compras_gastos
        WHERE cantina_id = :cid
    """), {"cid": cid})
    g_row = g_res.fetchone()
    total_gastos = float(g_row[0] or 0)
    cant_gastos = int(g_row[1] or 0)

    # Saldos por cuenta
    c_res = await session.execute(text("""
        SELECT nombre, tipo, saldo_actual
        FROM cantinas.cuentas
        WHERE cantina_id = :cid AND activo = TRUE
    """), {"cid": cid})
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
async def reporte_rendimiento_turnos(slug: Optional[str] = None, cantina_id: Optional[str] = None, session: AsyncSession = Depends(get_session)):
    """
    Métrica clave solicitada:
    - Gráfico/Listado de mejores rendimientos por turno:
      Calcula para cada turno la cantidad de horas trabajadas y la relación INGRESOS / HORAS.
    - Ranking de turnos más eficientes.
    - Top productos más vendidos.
    """
    cid = await _get_default_cantina_id(session, slug, cantina_id)

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
    """), {"cid": cid})

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
