from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional, List
from database import get_session
from security import get_current_user
import uuid

router = APIRouter(tags=["Pagos y Suscripciones Futbol"])

class MultaCreate(BaseModel):
    torneo_id: str
    equipo_id: str
    concepto: str
    monto: float
    partido_id: Optional[str] = None

class PagoProcesar(BaseModel):
    deuda_id: str
    metodo: str # "MercadoPago", "Stripe", "Efectivo"

@router.get("/futbol/cuenta-corriente/{equipo_id}")
async def obtener_estado_cuenta(equipo_id: str, session: AsyncSession = Depends(get_session)):
    query = text("""
        SELECT id, concepto, monto, estado, creado_en 
        FROM cancha.cuenta_corriente_equipos 
        WHERE equipo_id = :eq
        ORDER BY creado_en DESC
    """)
    res = await session.execute(query, {"eq": equipo_id})
    deudas = [{"id": r[0], "concepto": r[1], "monto": float(r[2]), "estado": r[3], "fecha": str(r[4])} for r in res.fetchall()]
    return {"deudas": deudas}

@router.post("/futbol/cuenta-corriente/multa")
async def generar_multa(data: MultaCreate, current_user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    multa_id = str(uuid.uuid4())
    await session.execute(text("""
        INSERT INTO cancha.cuenta_corriente_equipos
        (id, torneo_id, equipo_id, concepto, monto, estado, partido_id, creado_por, creado_en)
        VALUES
        (:id, :torneo, :equipo, :concepto, :monto, 'Pendiente', :partido, :uid, NOW())
    """), {
        "id": multa_id,
        "torneo": data.torneo_id,
        "equipo": data.equipo_id,
        "concepto": data.concepto,
        "monto": data.monto,
        "partido": data.partido_id,
        "uid": current_user["usuario_id"]
    })
    await session.commit()
    return {"message": "Multa / Cargo generado exitosamente", "id": multa_id}

@router.post("/futbol/pagos/procesar")
async def procesar_pago(data: PagoProcesar, session: AsyncSession = Depends(get_session)):
    # Simula proceso de pago por pasarela
    await session.execute(text("""
        UPDATE cancha.cuenta_corriente_equipos
        SET estado = 'Pagado'
        WHERE id = :id
    """), {"id": data.deuda_id})
    await session.commit()
    return {"message": "Pago registrado con éxito"}

class PlanUpdate(BaseModel):
    plan: str

@router.post("/futbol/suscripciones/plan")
async def actualizar_plan_organizador(data: PlanUpdate, current_user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    await session.execute(text("""
        UPDATE cancha.organizadores
        SET plan = :plan
        WHERE usuario_id = :uid
    """), {"plan": data.plan, "uid": current_user["usuario_id"]})
    await session.commit()
    return {"message": f"Suscripción actualizada al plan {data.plan}"}
