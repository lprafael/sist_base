from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional
from database import get_session
import uuid

router = APIRouter(tags=["Futbol Live / Arbitraje"])

class EventoPartido(BaseModel):
    partido_id: str
    player_id: str
    equipo_id: str
    minuto: int
    tipo: str # "Gol", "Amarilla", "Roja", "Sustitucion"

@router.post("/futbol/arbitraje/evento")
async def registrar_evento(data: EventoPartido, session: AsyncSession = Depends(get_session)):
    evento_id = str(uuid.uuid4())
    
    # Insert in general event table
    await session.execute(text("""
        INSERT INTO torneos_futbol.eventos_partido 
            (id, partido_id, player_id, equipo_id, tipo, minuto, registrado_en)
        VALUES 
            (:id, :pid, :player, :eq, :tipo, :minuto, NOW())
    """), {
        "id": evento_id, "pid": data.partido_id, 
        "player": data.player_id, "eq": data.equipo_id,
        "tipo": data.tipo, "minuto": data.minuto
    })
    
    # Specific actions
    if data.tipo == 'Gol':
        gol_id = str(uuid.uuid4())
        await session.execute(text("""
            INSERT INTO torneos_futbol.goles (id, partido_id, player_id, equipo_id, minuto, tipo)
            VALUES (:id, :pid, :player, :eq, :minuto, 'jugada')
        """), {
            "id": gol_id, "pid": data.partido_id, "player": data.player_id, 
            "eq": data.equipo_id, "minuto": data.minuto
        })
        # Update match score (simplified logic)
        await session.execute(text("""
            UPDATE torneos_futbol.partidos
            SET goles_local = COALESCE(goles_local, 0) + CASE WHEN equipo_local_id = :eq THEN 1 ELSE 0 END,
                goles_visitante = COALESCE(goles_visitante, 0) + CASE WHEN equipo_visitante_id = :eq THEN 1 ELSE 0 END
            WHERE id = :pid
        """), {"eq": data.equipo_id, "pid": data.partido_id})
        
    elif data.tipo in ['Amarilla', 'Roja']:
        tarjeta_id = str(uuid.uuid4())
        await session.execute(text("""
            INSERT INTO torneos_futbol.tarjetas (id, partido_id, player_id, equipo_id, minuto, tipo)
            VALUES (:id, :pid, :player, :eq, :minuto, :tipo)
        """), {
            "id": tarjeta_id, "pid": data.partido_id, "player": data.player_id, 
            "eq": data.equipo_id, "minuto": data.minuto, "tipo": data.tipo
        })
        
    await session.commit()
    return {"message": f"Evento {data.tipo} registrado", "id": evento_id}
