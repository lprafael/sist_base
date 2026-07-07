from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel
from database import get_session

router = APIRouter(tags=["Multas y Pagos"])

class MultaCreate(BaseModel):
    torneo_equipo_id: str
    monto: float
    moneda: str = "PYG"
    motivo: str

@router.post("/pagos/multas")
async def crear_multa(multa: MultaCreate, session: AsyncSession = Depends(get_session)):
    """Crea una multa pendiente de pago para un competidor/equipo"""
    await session.execute(text("""
        INSERT INTO cancha.payments 
        (tournament_team_id, amount, currency, provider, status, type, description)
        VALUES (:equipo_id, :monto, :moneda, 'efectivo', 'pending', 'multa', :motivo)
    """), {
        "equipo_id": multa.torneo_equipo_id,
        "monto": multa.monto,
        "moneda": multa.moneda,
        "motivo": multa.motivo
    })
    await session.commit()
    return {"message": "Multa registrada correctamente"}

@router.post("/pagos/multas/{multa_id}/pagar")
async def cobrar_multa(multa_id: str, recibido_por: str, session: AsyncSession = Depends(get_session)):
    """Registra el cobro en efectivo de una multa"""
    res = await session.execute(text("UPDATE cancha.payments SET status = 'approved', paid_at = NOW(), received_by = :rb WHERE id = :id AND type = 'multa' RETURNING id"),
        {"id": multa_id, "rb": recibido_por})
    if not res.fetchone():
        raise HTTPException(status_code=404, detail="Multa no encontrada o ya pagada")
    await session.commit()
    return {"message": "Multa pagada exitosamente"}

@router.get("/pagos/multas/{torneo_equipo_id}")
async def listar_multas(torneo_equipo_id: str, session: AsyncSession = Depends(get_session)):
    """Lista las multas pendientes y pagadas de un equipo"""
    res = await session.execute(text("""
        SELECT id, amount, currency, status, description, created_at, paid_at 
        FROM cancha.payments 
        WHERE tournament_team_id = :id AND type = 'multa'
        ORDER BY created_at DESC
    """), {"id": torneo_equipo_id})
    return [{"id": r[0], "monto": r[1], "moneda": r[2], "estado": r[3], "motivo": r[4], "creada": r[5], "pagada": r[6]} for r in res.fetchall()]
