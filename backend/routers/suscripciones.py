"""
Router: Sistema de Suscripciones
Maneja planes Básico / Profesional / Premium para organizadores
"""
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
import os

from database import get_session
from security import get_current_user

router = APIRouter(tags=["Suscripciones"])

# ─────────────────────────────────────────────
# Configuración de planes
# ─────────────────────────────────────────────
PLANES = {
    "basico": {
        "nombre": "Básico",
        "precio_usd": 0,
        "descripcion": "Para pequeños torneos amateurs",
        "features": [
            "Hasta 1 torneo activo",
            "Página web estándar",
            "App para jugadores"
        ],
        "duracion_dias": None  # Sin vencimiento
    },
    "profesional": {
        "nombre": "Profesional",
        "precio_usd": 29,
        "descripcion": "El estándar para ligas en crecimiento",
        "features": [
            "Torneos ilimitados",
            "Dominio personalizado",
            "Veedores ilimitados",
            "Biometría (hasta 500 jug.)"
        ],
        "duracion_dias": 30
    },
    "premium": {
        "nombre": "Premium",
        "precio_usd": 99,
        "descripcion": "Para franquicias y múltiples sedes",
        "features": [
            "Todo lo de Pro",
            "Gestión Financiera (Multas)",
            "Integración AWS Rekognition",
            "Soporte 24/7"
        ],
        "duracion_dias": 30
    }
}

# ─────────────────────────────────────────────
# Schemas Pydantic
# ─────────────────────────────────────────────
class CambiarPlanRequest(BaseModel):
    plan: str  # 'basico', 'profesional', 'premium'
    notas: Optional[str] = None
    fecha_vencimiento: Optional[date] = None

class MercadoPagoWebhookPayload(BaseModel):
    type: Optional[str] = None
    action: Optional[str] = None
    data: Optional[dict] = None


# ─────────────────────────────────────────────
# Helper: obtener tipo de cambio
# ─────────────────────────────────────────────
async def get_tipo_cambio(session: AsyncSession) -> int:
    try:
        res = await session.execute(
            text("SELECT valor FROM sistema.parametros_sistema WHERE codigo = 'TIPO_CAMBIO_USD_GS'")
        )
        row = res.fetchone()
        return int(row[0]) if row else 7200
    except Exception:
        return 7200


# ─────────────────────────────────────────────
# GET /api/suscripciones/planes — Lista de planes (público)
# ─────────────────────────────────────────────
@router.get("/api/suscripciones/planes")
async def obtener_planes(session: AsyncSession = Depends(get_session)):
    tipo_cambio = await get_tipo_cambio(session)
    result = []
    for key, plan in PLANES.items():
        result.append({
            "id": key,
            **plan,
            "precio_gs": plan["precio_usd"] * tipo_cambio if plan["precio_usd"] > 0 else 0,
            "tipo_cambio": tipo_cambio
        })
    return result


# ─────────────────────────────────────────────
# GET /api/organizador/mi-plan — Plan del organizador autenticado
# ─────────────────────────────────────────────
@router.get("/api/organizador/mi-plan")
async def obtener_mi_plan(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    tipo_cambio = await get_tipo_cambio(session)
    res = await session.execute(
        text("""
            SELECT u.id, u.username, u.email, u.nombre_completo,
                   u.plan, u.plan_vence_en, u.plan_actualizado_en
            FROM sistema.usuarios u
            WHERE u.id = :uid
        """),
        {"uid": current_user["id"]}
    )
    row = res.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    plan_key = row[4] or "basico"
    plan_info = PLANES.get(plan_key, PLANES["basico"])

    return {
        "usuario_id": row[0],
        "username": row[1],
        "email": row[2],
        "nombre": row[3],
        "plan": plan_key,
        "plan_info": {
            **plan_info,
            "precio_gs": plan_info["precio_usd"] * tipo_cambio
        },
        "plan_vence_en": row[5].isoformat() if row[5] else None,
        "plan_actualizado_en": row[6].isoformat() if row[6] else None,
        "tipo_cambio": tipo_cambio
    }


# ─────────────────────────────────────────────
# GET /api/admin/usuarios — Todos los usuarios con plan (solo admin)
# ─────────────────────────────────────────────
@router.get("/api/admin/usuarios")
async def listar_usuarios_admin(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    plan: Optional[str] = None,
    rol: Optional[str] = None,
    activo: Optional[bool] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50
):
    if current_user.get("rol") not in ("admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Solo administradores")

    where_clauses = ["1=1"]
    params: dict = {}

    if plan:
        where_clauses.append("u.plan = :plan")
        params["plan"] = plan
    if rol:
        where_clauses.append("u.rol = :rol")
        params["rol"] = rol
    if activo is not None:
        where_clauses.append("u.activo = :activo")
        params["activo"] = activo
    if search:
        where_clauses.append(
            "(u.nombre_completo ILIKE :search OR u.email ILIKE :search OR u.username ILIKE :search)"
        )
        params["search"] = f"%{search}%"

    where_str = " AND ".join(where_clauses)
    params["limit"] = limit
    params["offset"] = skip

    res = await session.execute(
        text(f"""
            SELECT
                u.id, u.username, u.email, u.nombre_completo,
                u.rol, u.activo, u.plan,
                u.plan_vence_en, u.plan_actualizado_en,
                u.fecha_creacion, u.ultimo_acceso
            FROM sistema.usuarios u
            WHERE {where_str}
            ORDER BY u.fecha_creacion DESC
            LIMIT :limit OFFSET :offset
        """),
        params
    )
    rows = res.fetchall()

    # Total count
    count_params = {k: v for k, v in params.items() if k not in ("limit", "offset")}
    count_res = await session.execute(
        text(f"SELECT COUNT(*) FROM sistema.usuarios u WHERE {where_str}"),
        count_params
    )
    total = count_res.scalar()

    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "items": [
            {
                "id": r[0],
                "username": r[1],
                "email": r[2],
                "nombre_completo": r[3],
                "rol": r[4],
                "activo": r[5],
                "plan": r[6] or "basico",
                "plan_vence_en": r[7].isoformat() if r[7] else None,
                "plan_actualizado_en": r[8].isoformat() if r[8] else None,
                "fecha_creacion": r[9].isoformat() if r[9] else None,
                "ultimo_acceso": r[10].isoformat() if r[10] else None,
            }
            for r in rows
        ]
    }


# ─────────────────────────────────────────────
# GET /api/admin/suscripciones/stats — Estadísticas (solo admin)
# ─────────────────────────────────────────────
@router.get("/api/admin/suscripciones/stats")
async def estadisticas_suscripciones(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    if current_user.get("rol") not in ("admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Solo administradores")

    # Conteos por plan
    res_planes = await session.execute(text("""
        SELECT
            COALESCE(plan, 'basico') as plan,
            COUNT(*) as total
        FROM sistema.usuarios
        WHERE activo = true
        GROUP BY COALESCE(plan, 'basico')
    """))
    planes_counts = {row[0]: row[1] for row in res_planes.fetchall()}

    # Usuarios totales
    res_total = await session.execute(
        text("SELECT COUNT(*) FROM sistema.usuarios WHERE activo = true")
    )
    total_activos = res_total.scalar()

    res_inactivos = await session.execute(
        text("SELECT COUNT(*) FROM sistema.usuarios WHERE activo = false")
    )
    total_inactivos = res_inactivos.scalar()

    # Próximos a vencer (30 días)
    res_venciendo = await session.execute(text("""
        SELECT u.id, u.nombre_completo, u.email, u.plan, u.plan_vence_en
        FROM sistema.usuarios u
        WHERE u.plan_vence_en IS NOT NULL
          AND u.plan_vence_en BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
          AND u.activo = true
        ORDER BY u.plan_vence_en ASC
        LIMIT 20
    """))
    venciendo = [
        {
            "id": r[0],
            "nombre_completo": r[1],
            "email": r[2],
            "plan": r[3],
            "plan_vence_en": r[4].isoformat() if r[4] else None
        }
        for r in res_venciendo.fetchall()
    ]

    # Nuevos registros últimos 7 días
    res_nuevos = await session.execute(text("""
        SELECT COUNT(*) FROM sistema.usuarios
        WHERE fecha_creacion >= NOW() - INTERVAL '7 days'
    """))
    nuevos_semana = res_nuevos.scalar()

    return {
        "total_activos": total_activos,
        "total_inactivos": total_inactivos,
        "nuevos_ultima_semana": nuevos_semana,
        "por_plan": {
            "basico": planes_counts.get("basico", 0),
            "profesional": planes_counts.get("profesional", 0),
            "premium": planes_counts.get("premium", 0),
        },
        "proximos_a_vencer": venciendo
    }


# ─────────────────────────────────────────────
# PUT /api/admin/usuarios/{user_id}/plan — Cambiar plan (admin)
# ─────────────────────────────────────────────
@router.put("/api/admin/usuarios/{user_id}/plan")
async def cambiar_plan_usuario(
    user_id: int,
    body: CambiarPlanRequest,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    if current_user.get("rol") not in ("admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Solo administradores")

    if body.plan not in PLANES:
        raise HTTPException(status_code=400, detail=f"Plan inválido. Opciones: {list(PLANES.keys())}")

    plan_info = PLANES[body.plan]

    # Calcular fecha vencimiento
    from datetime import timedelta
    if body.fecha_vencimiento:
        vence = body.fecha_vencimiento
    elif plan_info["duracion_dias"]:
        vence = date.today() + timedelta(days=plan_info["duracion_dias"])
    else:
        vence = None

    await session.execute(
        text("""
            UPDATE sistema.usuarios
            SET plan = :plan,
                plan_vence_en = :vence,
                plan_actualizado_en = NOW()
            WHERE id = :uid
        """),
        {"plan": body.plan, "vence": vence, "uid": user_id}
    )

    # Registrar en historial
    tipo_cambio = await get_tipo_cambio(session)
    await session.execute(
        text("""
            INSERT INTO sistema.suscripciones
              (usuario_id, plan, precio_usd, precio_gs, moneda,
               fecha_inicio, fecha_vencimiento, activo, notas, asignado_por)
            VALUES
              (:uid, :plan, :precio_usd, :precio_gs, 'USD',
               CURRENT_DATE, :vence, true, :notas, :admin_id)
        """),
        {
            "uid": user_id,
            "plan": body.plan,
            "precio_usd": plan_info["precio_usd"],
            "precio_gs": plan_info["precio_usd"] * tipo_cambio,
            "vence": vence,
            "notas": body.notas,
            "admin_id": current_user["id"]
        }
    )

    await session.commit()

    return {
        "ok": True,
        "usuario_id": user_id,
        "plan": body.plan,
        "plan_vence_en": vence.isoformat() if vence else None,
        "mensaje": f"Plan actualizado a '{body.plan}' exitosamente"
    }


# ─────────────────────────────────────────────
# POST /api/suscripciones/crear-preferencia — Generar preferencia MercadoPago
# ─────────────────────────────────────────────
@router.post("/api/suscripciones/crear-preferencia")
async def crear_preferencia_mp(
    plan: str,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    if plan not in PLANES or plan == "basico":
        raise HTTPException(status_code=400, detail="Plan inválido para pago")

    try:
        import mercadopago
    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="SDK de MercadoPago no instalado. Ejecutar: pip install mercadopago"
        )

    mp_access_token = os.getenv("MP_ACCESS_TOKEN", "")
    if not mp_access_token:
        raise HTTPException(status_code=503, detail="MP_ACCESS_TOKEN no configurado en .env")

    tipo_cambio = await get_tipo_cambio(session)
    plan_info = PLANES[plan]
    precio_gs = plan_info["precio_usd"] * tipo_cambio

    sdk = mercadopago.SDK(mp_access_token)
    base_url = os.getenv("APP_BASE_URL", "http://localhost:3001")

    preference_data = {
        "items": [
            {
                "title": f"Mi Cancha — Plan {plan_info['nombre']}",
                "quantity": 1,
                "unit_price": float(precio_gs),
                "currency_id": "PYG",
            }
        ],
        "back_urls": {
            "success": f"{base_url}/organizador/planes?pago=exitoso",
            "failure": f"{base_url}/organizador/planes?pago=fallido",
            "pending": f"{base_url}/organizador/planes?pago=pendiente",
        },
        "auto_return": "approved",
        "external_reference": f"user_{current_user['id']}_plan_{plan}",
        "notification_url": f"{os.getenv('API_BASE_URL', 'http://localhost:8001')}/api/suscripciones/webhook-mp",
        "metadata": {
            "usuario_id": current_user["id"],
            "plan": plan
        }
    }

    preference_response = sdk.preference().create(preference_data)
    preference = preference_response.get("response", {})

    if "id" not in preference:
        raise HTTPException(status_code=500, detail="Error al crear preferencia en MercadoPago")

    return {
        "preference_id": preference["id"],
        "init_point": preference.get("init_point"),
        "sandbox_init_point": preference.get("sandbox_init_point"),
        "plan": plan,
        "precio_gs": precio_gs,
        "precio_usd": plan_info["precio_usd"]
    }


# ─────────────────────────────────────────────
# POST /api/suscripciones/webhook-mp — Webhook de MercadoPago (IPN)
# ─────────────────────────────────────────────
@router.post("/api/suscripciones/webhook-mp")
async def webhook_mercadopago(
    request: Request,
    session: AsyncSession = Depends(get_session)
):
    try:
        import mercadopago
    except ImportError:
        return {"ok": False, "error": "SDK no disponible"}

    mp_access_token = os.getenv("MP_ACCESS_TOKEN", "")
    if not mp_access_token:
        return {"ok": False, "error": "Token no configurado"}

    try:
        payload = await request.json()
    except Exception:
        return {"ok": False, "error": "Payload inválido"}

    topic = payload.get("type") or request.query_params.get("topic")
    resource_id = payload.get("data", {}).get("id") or request.query_params.get("id")

    if topic not in ("payment", "merchant_order") or not resource_id:
        return {"ok": True, "msg": "Ignorado"}

    sdk = mercadopago.SDK(mp_access_token)
    payment_info = sdk.payment().get(resource_id)
    payment = payment_info.get("response", {})

    mp_status = payment.get("status")
    external_ref = payment.get("external_reference", "")

    if mp_status != "approved":
        return {"ok": True, "msg": f"Pago no aprobado: {mp_status}"}

    # Parsear external_reference: "user_{id}_plan_{plan}"
    try:
        parts = external_ref.split("_")
        usuario_id = int(parts[1])
        plan = parts[3]
    except (IndexError, ValueError):
        return {"ok": False, "error": "external_reference inválido"}

    if plan not in PLANES:
        return {"ok": False, "error": "Plan desconocido"}

    from datetime import timedelta
    plan_info = PLANES[plan]
    vence = date.today() + timedelta(days=plan_info["duracion_dias"] or 30)
    tipo_cambio = await get_tipo_cambio(session)

    # Actualizar plan del usuario
    await session.execute(
        text("""
            UPDATE sistema.usuarios
            SET plan = :plan,
                plan_vence_en = :vence,
                plan_actualizado_en = NOW()
            WHERE id = :uid
        """),
        {"plan": plan, "vence": vence, "uid": usuario_id}
    )

    # Registrar en historial
    await session.execute(
        text("""
            INSERT INTO sistema.suscripciones
              (usuario_id, plan, precio_usd, precio_gs, moneda,
               fecha_inicio, fecha_vencimiento, activo, notas,
               mp_payment_id, mp_status)
            VALUES
              (:uid, :plan, :precio_usd, :precio_gs, 'PYG',
               CURRENT_DATE, :vence, true,
               'Pago automático vía MercadoPago',
               :mp_id, :mp_status)
        """),
        {
            "uid": usuario_id,
            "plan": plan,
            "precio_usd": plan_info["precio_usd"],
            "precio_gs": plan_info["precio_usd"] * tipo_cambio,
            "vence": vence,
            "mp_id": str(resource_id),
            "mp_status": mp_status
        }
    )

    await session.commit()
    return {"ok": True, "msg": f"Plan '{plan}' activado para usuario {usuario_id}"}
