"""
Router de Pagos - Integración con MercadoPago y Stripe
"""
import os
import json
import hmac
import hashlib
from datetime import datetime
from typing import Optional
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

# Importar schemas de pagos (creados en este sprint)
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from schemas.payments import (
    PaymentCreate, PaymentResponse, PaymentStatus_Response,
    PaymentManualCreate, PaymentRefundRequest, PaymentOptionsResponse,
    PaymentReportResponse, PaymentProvider, PaymentStatus
)
from database import get_session
from auth import get_current_user

# Importar SDKs (instalar después)
try:
    import mercadopago
except ImportError:
    mercadopago = None

from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
security_optional = HTTPBearer(auto_error=False)

async def get_current_user_optional(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_optional)):
    if not credentials:
        return None
    try:
        from security import verify_token
        return verify_token(credentials.credentials)
    except Exception:
        return None

router = APIRouter(prefix="/api/pagos", tags=["Pagos"])

# Configurar SDK de MercadoPago
_MP_SDK = None

def get_mp_sdk():
    """Obtener SDK de MercadoPago (lazy loading)"""
    global _MP_SDK
    if _MP_SDK is None and mercadopago is not None:
        token = os.getenv("MERCADOPAGO_ACCESS_TOKEN")
        if not token:
            raise HTTPException(
                status_code=500,
                detail="MERCADOPAGO_ACCESS_TOKEN no configurado"
            )
        _MP_SDK = mercadopago.SDK(token=token)
    return _MP_SDK


# ============================================
# ENDPOINTS DE PAGOS
# ============================================

@router.get("/opciones/{tournament_team_id}", response_model=PaymentOptionsResponse)
async def get_payment_options(
    tournament_team_id: str,
    session: AsyncSession = Depends(get_session)
):
    """
    Obtener opciones de pago disponibles para inscripción
    
    Retorna: MercadoPago, Stripe, Efectivo
    """
    try:
        # Obtener monto del torneo
        query = text("""
            SELECT t.costo_inscripcion
            FROM torneos.equipos te
            JOIN torneos.torneos t ON te.torneo_id = t.id
            WHERE te.id = :team_id
        """)
        
        result = await session.execute(query, {"team_id": tournament_team_id})
        row = await result.fetchone()
        
        if not row:
            raise HTTPException(status_code=404, detail="Inscripción no encontrada")
        
        amount = Decimal(str(row[0]))
        
        return PaymentOptionsResponse(
            opciones=[
                {
                    "id": "mercadopago",
                    "nombre": "MercadoPago",
                    "descripcion": "Billetera virtual, tarjetas locales",
                    "comision": "5.99%",
                    "disponible": True,
                    "icono": "mercadopago.png"
                },
                {
                    "id": "stripe",
                    "nombre": "Tarjeta Internacional",
                    "descripcion": "Visa, Mastercard",
                    "comision": "3.5% + $0.30",
                    "disponible": True,
                    "icono": "stripe.png"
                },
                {
                    "id": "cash",
                    "nombre": "Pago en Efectivo",
                    "descripcion": "En el complejo (admin confirma)",
                    "comision": "0%",
                    "disponible": True,
                    "icono": "cash.png"
                }
            ],
            amount=amount,
            currency="ARS"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting payment options: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/inscripcion/{tournament_team_id}", response_model=PaymentResponse)
async def generar_preferencia_pago(
    tournament_team_id: str,
    payment_create: PaymentCreate,
    session: AsyncSession = Depends(get_session),
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """
    Generar preferencia de pago en MercadoPago para inscripción
    
    Flujo:
    1. Verificar que equipo/inscripción existe
    2. Verificar que no esté ya pagado
    3. Crear preferencia en MercadoPago
    4. Guardar registro en BD
    5. Retornar URL de checkout
    """
    try:
        # 1. Obtener datos de inscripción
        query = text("""
            SELECT te.id, t.costo_inscripcion, t.nombre, te.nombre_equipo, t.id as torneo_id, te.capitan_email
            FROM torneos.equipos te
            JOIN torneos.torneos t ON te.torneo_id = t.id
            WHERE te.id = :id
        """)
        result = await session.execute(query, {"id": tournament_team_id})
        row = await result.fetchone()
        
        if not row:
            raise HTTPException(status_code=404, detail="Inscripción no encontrada")
        
        team_id, amount, torneo_nombre, equipo_nombre, torneo_id, capitan_email = row
        
        if not amount or amount == 0:
            raise HTTPException(
                status_code=400,
                detail="Este torneo no requiere pago"
            )
        
        # 2. Verificar que no esté ya pagado
        exists = await session.execute(
            text("""
                SELECT COUNT(*) FROM cancha.payments 
                WHERE tournament_team_id = :id AND status = 'approved'
            """),
            {"id": tournament_team_id}
        )
        
        if (await exists.scalar() or 0) > 0:
            raise HTTPException(status_code=400, detail="Ya existe un pago aprobado")
        
        # 3. Crear preferencia en MercadoPago
        if payment_create.provider == PaymentProvider.MERCADOPAGO:
            return await _crear_preferencia_mercadopago(
                tournament_team_id, team_id, amount, torneo_nombre, 
                equipo_nombre, current_user, session, capitan_email
            )
        
        elif payment_create.provider == PaymentProvider.STRIPE:
            return await _crear_intent_stripe(
                tournament_team_id, amount, torneo_nombre, 
                equipo_nombre, current_user, session
            )
        
        else:
            raise HTTPException(status_code=400, detail="Proveedor no soportado")
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


async def _crear_preferencia_mercadopago(
    tournament_team_id: str,
    team_id: str,
    amount: Decimal,
    torneo_nombre: str,
    equipo_nombre: str,
    current_user: Optional[dict],
    session: AsyncSession,
    capitan_email: Optional[str] = None
):
    """Crear preferencia de MercadoPago"""
    
    sdk = get_mp_sdk()
    
    if not sdk:
        raise HTTPException(
            status_code=500,
            detail="MercadoPago no configurado"
        )
    
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    api_url = os.getenv("API_URL", "http://localhost:8002")
    
    payer_email = current_user.get("email") if current_user else capitan_email
    if not payer_email:
        payer_email = "cliente@example.com"

    preference_data = {
        "items": [
            {
                "title": f"Inscripción: {torneo_nombre} - {equipo_nombre}",
                "quantity": 1,
                "unit_price": float(amount)
            }
        ],
        "payer": {
            "email": payer_email
        },
        "back_urls": {
            "success": f"{frontend_url}/inscripcion/resultado?status=approved&id={tournament_team_id}",
            "failure": f"{frontend_url}/inscripcion/resultado?status=rejected&id={tournament_team_id}",
            "pending": f"{frontend_url}/inscripcion/resultado?status=pending&id={tournament_team_id}"
        },
        "external_reference": str(tournament_team_id),
        "notification_url": f"{api_url}/api/pagos/webhook/mercadopago"
    }
    
    try:
        preference_response = sdk.preference().create(preference_data)
        
        if preference_response.status_code not in [200, 201]:
            raise HTTPException(
                status_code=500,
                detail=f"Error MercadoPago: {preference_response.status}"
            )
        
        preference = preference_response.json()

        
        # Guardar payment record
        insert = text("""
            INSERT INTO cancha.payments 
            (tournament_team_id, amount, provider, provider_preference_id, status, metadata)
            VALUES (:team_id, :amount, 'mercadopago', :pref_id, 'pending', :metadata)
            RETURNING id
        """)
        
        await session.execute(
            insert,
            {
                "team_id": tournament_team_id,
                "amount": amount,
                "pref_id": preference.get("id"),
                "metadata": json.dumps({
                    "tournament_name": torneo_nombre,
                    "team_name": equipo_nombre
                })
            }
        )
        
        await session.commit()
        
        return PaymentResponse(
            status="success",
            checkout_url=preference.get("init_point"),
            preference_id=preference.get("id")
        )
        
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        print(f"MercadoPago Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


async def _crear_intent_stripe(
    tournament_team_id: str,
    amount: Decimal,
    torneo_nombre: str,
    equipo_nombre: str,
    current_user: dict,
    session: AsyncSession
):
    """Crear Payment Intent de Stripe"""
    
    try:
        import stripe
    except ImportError:
        raise HTTPException(status_code=500, detail="Stripe no configurado")
    
    stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
    
    try:
        intent = stripe.PaymentIntent.create(
            amount=int(amount * 100),  # Stripe usa centavos
            currency="ars",
            metadata={
                "tournament_team_id": tournament_team_id,
                "torneo": torneo_nombre,
                "equipo": equipo_nombre
            }
        )
        
        # Guardar payment record
        insert = text("""
            INSERT INTO cancha.payments 
            (tournament_team_id, amount, provider, provider_payment_id, status, metadata)
            VALUES (:team_id, :amount, 'stripe', :payment_id, 'processing', :metadata)
            RETURNING id
        """)
        
        await session.execute(
            insert,
            {
                "team_id": tournament_team_id,
                "amount": amount,
                "payment_id": intent.id,
                "metadata": json.dumps({
                    "tournament_name": torneo_nombre,
                    "team_name": equipo_nombre,
                    "client_secret": intent.client_secret
                })
            }
        )
        
        await session.commit()
        
        return PaymentResponse(
            status="success",
            message="Client Secret enviado al frontend",
            checkout_url=None,
            preference_id=intent.client_secret
        )
        
    except Exception as e:
        await session.rollback()
        print(f"Stripe Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/estado/{tournament_team_id}", response_model=PaymentStatus_Response)
async def obtener_estado_pago(
    tournament_team_id: str,
    session: AsyncSession = Depends(get_session)
):
    """Obtener estado actual del pago"""
    
    try:
        query = text("""
            SELECT id, tournament_team_id, amount, currency, status, provider,
                   paid_at, provider_payment_id, created_at, updated_at
            FROM cancha.payments
            WHERE tournament_team_id = :id
            ORDER BY created_at DESC
            LIMIT 1
        """)
        
        result = await session.execute(query, {"id": tournament_team_id})
        row = await result.fetchone()
        
        if not row:
            raise HTTPException(status_code=404, detail="Pago no encontrado")
        
        return PaymentStatus_Response(
            id=str(row[0]),
            tournament_team_id=str(row[1]),
            amount=Decimal(str(row[2])),
            currency=row[3],
            status=row[4],
            provider=row[5],
            paid_at=row[6],
            provider_payment_id=row[7],
            created_at=row[8],
            updated_at=row[9]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/webhook/mercadopago")
async def webhook_mercadopago(
    request: Request,
    session: AsyncSession = Depends(get_session)
):
    """
    Webhook de MercadoPago
    Recibe notificaciones cuando hay cambios en los pagos
    """
    
    try:
        # Obtener el body
        body = await request.json()
        signature = request.headers.get("x-signature", "")
        
        if not signature:
            print("❌ Missing signature header")
            return {"status": "error", "message": "Missing signature"}
        
        # Validar firma (MercadoPago proporciona esto)
        # Por ahora, continuamos (implementar validación completa después)
        
        data = body.get("data", {})
        payment_id = data.get("id")
        
        if not payment_id:
            print("❌ No payment ID in webhook")
            return {"status": "error", "message": "No payment ID"}
        
        # Obtener SDK y fetch del pago desde MercadoPago
        sdk = get_mp_sdk()
        
        if not sdk:
            print("❌ MP SDK not configured")
            return {"status": "received"}  # MP no debe reintentar
        
        try:
            mp_payment = sdk.payment().get(payment_id)
            
            if mp_payment.status_code != 200:
                print(f"❌ Error fetching from MP: {mp_payment.status_code}")
                return {"status": "received"}
            
            payment_data = mp_payment.json()
            external_ref = payment_data.get("external_reference")
            mp_status = payment_data.get("status")
            
            if not external_ref:
                print("❌ No external_reference")
                return {"status": "received"}
            
            # Mapear estado de MP a nuestro sistema
            status_map = {
                "approved": "approved",
                "pending": "processing",
                "in_process": "processing",
                "rejected": "rejected",
                "cancelled": "cancelled"
            }
            
            new_status = status_map.get(mp_status, "pending")
            
            # Actualizar BD
            update = text("""
                UPDATE cancha.payments
                SET status = :status,
                    provider_payment_id = :payment_id,
                    paid_at = CASE WHEN :status = 'approved' THEN NOW() ELSE paid_at END,
                    updated_at = NOW(),
                    metadata = jsonb_set(metadata, '{mp_status}', to_jsonb(:mp_status::text))
                WHERE provider_preference_id = :pref_id
                RETURNING tournament_team_id
            """)
            
            result = await session.execute(
                update,
                {
                    "status": new_status,
                    "payment_id": str(payment_id),
                    "mp_status": mp_status,
                    "pref_id": external_ref
                }
            )
            
            tournament_team_id = await result.scalar_one_or_none()
            await session.commit()
            
            # Si fue aprobado, actualizar estado de inscripción
            if new_status == "approved" and tournament_team_id:
                update_team = text("""
                    UPDATE torneos.equipos
                    SET estado_inscripcion = 'confirmado', 
                        payment_status = 'approved',
                        updated_at = NOW()
                    WHERE id = :id
                """)
                
                await session.execute(update_team, {"id": tournament_team_id})
                await session.commit()
                
                print(f"✅ Pago confirmado para equipo {tournament_team_id}")
            
            return {"status": "received"}
            
        except Exception as e:
            print(f"❌ Error en webhook processing: {e}")
            return {"status": "received"}
        
    except Exception as e:
        print(f"❌ Error en webhook: {e}")
        import traceback
        traceback.print_exc()
        return {"status": "error", "message": str(e)}


@router.post("/manual/{tournament_team_id}")
async def registrar_pago_manual(
    tournament_team_id: str,
    pago_manual: PaymentManualCreate,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Registrar un pago manual (efectivo)
    Solo admin puede hacer esto
    """
    
    try:
        # Verificar que sea admin (implementar después)
        
        # Verificar que inscripción existe
        check = await session.execute(
            text("SELECT id FROM torneos.equipos WHERE id = :id"),
            {"id": tournament_team_id}
        )
        
        if not await check.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Inscripción no encontrada")
        
        # Insertar payment
        insert = text("""
            INSERT INTO cancha.payments 
            (tournament_team_id, amount, provider, status, 
             received_by, paid_at, metadata)
            VALUES (:team_id, :amount, 'cash', 'approved',
                    :received_by, NOW(), :metadata)
            RETURNING id
        """)
        
        result = await session.execute(
            insert,
            {
                "team_id": tournament_team_id,
                "amount": pago_manual.amount,
                "received_by": pago_manual.received_by,
                "metadata": json.dumps({"notes": pago_manual.notes or ""})
            }
        )
        
        payment_id = await result.scalar()
        
        # Actualizar estado de inscripción
        update = text("""
            UPDATE torneos.equipos
            SET estado_inscripcion = 'confirmado',
                payment_status = 'approved',
                updated_at = NOW()
            WHERE id = :id
        """)
        
        await session.execute(update, {"id": tournament_team_id})
        await session.commit()
        
        return {
            "status": "success",
            "payment_id": str(payment_id),
            "message": "Pago en efectivo registrado"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reembolso/{payment_id}")
async def emitir_reembolso(
    payment_id: str,
    refund_request: PaymentRefundRequest,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Emitir reembolso de un pago
    Solo admin puede hacer esto
    """
    
    try:
        # Obtener pago
        query = text("""
            SELECT id, provider, provider_payment_id, amount, status
            FROM cancha.payments
            WHERE id = :id
        """)
        
        result = await session.execute(query, {"id": payment_id})
        payment = await result.fetchone()
        
        if not payment:
            raise HTTPException(status_code=404, detail="Pago no encontrado")
        
        pay_id, provider, provider_payment_id, amount, status = payment
        
        if status not in ["approved", "refunded"]:
            raise HTTPException(
                status_code=400,
                detail=f"No se puede reembolsar pago en estado {status}"
            )
        
        # Procesar reembolso según proveedor
        if provider == "mercadopago":
            sdk = get_mp_sdk()
            if not sdk:
                raise HTTPException(status_code=500, detail="MP no configurado")
            
            try:
                refund = sdk.refund().create(provider_payment_id)
                
                if refund.status_code >= 400:
                    raise HTTPException(
                        status_code=500,
                        detail="Error procesando reembolso en MP"
                    )
                
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))
        
        # Actualizar BD
        update = text("""
            UPDATE cancha.payments
            SET status = 'refunded',
                refunded_at = NOW(),
                refund_amount = :amount,
                metadata = jsonb_set(metadata, '{refund_reason}', 
                                     to_jsonb(:reason::text)),
                updated_at = NOW()
            WHERE id = :id
        """)
        
        await session.execute(
            update,
            {"id": payment_id, "amount": amount, "reason": refund_request.reason}
        )
        
        await session.commit()
        
        return {
            "status": "success",
            "message": "Reembolso procesado",
            "amount": str(amount)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=str(e))


print("Router de pagos cargado")
