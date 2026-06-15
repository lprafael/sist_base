from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from datetime import datetime, timedelta
from typing import List, Optional
from pydantic import BaseModel
from database import get_session
from auth import get_current_user

router = APIRouter(prefix="/api/reservas", tags=["reservas"])

class ReservaCreate(BaseModel):
    cancha_id: str
    complejo_id: str
    inicio: datetime
    fin: datetime
    cliente_nombre: Optional[str] = None
    cliente_telefono: Optional[str] = None

@router.get("/disponibilidad")
async def get_disponibilidad(cancha_id: str, fecha: str, session: AsyncSession = Depends(get_session)):
    """
    Obtiene los horarios disponibles para una cancha en una fecha específica (YYYY-MM-DD).
    """
    query = text("""
        SELECT inicio, fin, estado 
        FROM cancha.reservas
        WHERE cancha_id = :cancha_id 
        AND DATE(inicio) = :fecha
        AND estado IN ('confirmada', 'en_curso')
    """)
    result = await session.execute(query, {"cancha_id": cancha_id, "fecha": fecha})
    reservas = [{"inicio": r.inicio.isoformat(), "fin": r.fin.isoformat()} for r in result.fetchall()]
    return reservas

@router.post("/")
async def create_reserva(reserva: ReservaCreate, session: AsyncSession = Depends(get_session), current_user = Depends(get_current_user)):
    """
    Crea una nueva reserva validando que no haya solapamientos.
    """
    # 1. Validar solapamiento
    query_check = text("""
        SELECT id FROM cancha.reservas
        WHERE cancha_id = :cancha_id
        AND estado IN ('confirmada', 'en_curso', 'pendiente')
        AND (
            (inicio < :fin AND fin > :inicio)
        )
    """)
    check = await session.execute(query_check, {
        "cancha_id": reserva.cancha_id,
        "inicio": reserva.inicio,
        "fin": reserva.fin
    })
    
    if check.fetchone():
        raise HTTPException(status_code=400, detail="El horario seleccionado ya está reservado o en proceso de reserva.")
        
    # 2. Obtener precio por hora de la cancha
    query_cancha = text("SELECT precio_hora FROM cancha.canchas WHERE id = :cancha_id")
    result_cancha = await session.execute(query_cancha, {"cancha_id": reserva.cancha_id})
    cancha_row = result_cancha.fetchone()
    if not cancha_row:
        raise HTTPException(status_code=404, detail="Cancha no encontrada.")
        
    duracion_horas = (reserva.fin - reserva.inicio).total_seconds() / 3600.0
    precio_total = int(cancha_row.precio_hora * duracion_horas)
    
    # 3. Insertar reserva
    query_insert = text("""
        INSERT INTO cancha.reservas (cancha_id, complejo_id, cliente_id, cliente_nombre, cliente_telefono, inicio, fin, precio_hora, precio_total, estado, estado_pago)
        VALUES (:cancha_id, :complejo_id, :cliente_id, :cliente_nombre, :cliente_telefono, :inicio, :fin, :precio_hora, :precio_total, 'pendiente', 'pendiente')
        RETURNING id
    """)
    result_insert = await session.execute(query_insert, {
        "cancha_id": reserva.cancha_id,
        "complejo_id": reserva.complejo_id,
        "cliente_id": current_user.id,
        "cliente_nombre": reserva.cliente_nombre or current_user.nombre_completo,
        "cliente_telefono": reserva.cliente_telefono,
        "inicio": reserva.inicio,
        "fin": reserva.fin,
        "precio_hora": cancha_row.precio_hora,
        "precio_total": precio_total
    })
    
    reserva_id = result_insert.scalar()
    await session.commit()
    
    return {"id": reserva_id, "status": "success", "precio_total": precio_total, "mensaje": "Reserva creada pendiente de pago."}
