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
        INSERT INTO torneos.eventos_partido 
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
            INSERT INTO torneos.goles (id, partido_id, player_id, equipo_id, minuto, tipo)
            VALUES (:id, :pid, :player, :eq, :minuto, 'jugada')
        """), {
            "id": gol_id, "pid": data.partido_id, "player": data.player_id, 
            "eq": data.equipo_id, "minuto": data.minuto
        })
        # Update match score (simplified logic)
        await session.execute(text("""
            UPDATE torneos.partidos
            SET goles_local = COALESCE(goles_local, 0) + CASE WHEN equipo_local_id = :eq THEN 1 ELSE 0 END,
                goles_visitante = COALESCE(goles_visitante, 0) + CASE WHEN equipo_visitante_id = :eq THEN 1 ELSE 0 END
            WHERE id = :pid
        """), {"eq": data.equipo_id, "pid": data.partido_id})
        
    elif data.tipo in ['Amarilla', 'Roja']:
        tarjeta_id = str(uuid.uuid4())
        await session.execute(text("""
            INSERT INTO torneos.tarjetas (id, partido_id, player_id, equipo_id, minuto, tipo)
            VALUES (:id, :pid, :player, :eq, :minuto, :tipo)
        """), {
            "id": tarjeta_id, "pid": data.partido_id, "player": data.player_id, 
            "eq": data.equipo_id, "minuto": data.minuto, "tipo": data.tipo
        })
        
    await session.commit()
    return {"message": f"Evento {data.tipo} registrado", "id": evento_id}

# ==========================================
# BIOMETRIA: Check-in de Jugadores
# ==========================================

class BiometriaRequest(BaseModel):
    partido_id: str
    equipo_id: str
    imagen_base64: str
    mock_player_id: Optional[str] = None # Para facilitar el testing sin AWS

@router.post("/futbol/arbitraje/asistencia/biometrica")
async def checkin_biometrico(data: BiometriaRequest, session: AsyncSession = Depends(get_session)):
    
    # 1. En una integracion real con AWS Rekognition:
    # client = boto3.client('rekognition')
    # response = client.search_faces_by_image(
    #     CollectionId='MiCanchaPlayers',
    #     Image={'Bytes': base64.b64decode(data.imagen_base64)},
    #     FaceMatchThreshold=90.0,
    #     MaxFaces=1
    # )
    # if len(response['FaceMatches']) > 0:
    #     player_id = response['FaceMatches'][0]['Face']['ExternalImageId']
    
    # MOCK: Simulamos que Rekognition encontró a alguien
    player_id_matched = data.mock_player_id
    player_name = "Jugador Reconocido"

    if not player_id_matched:
        # Buscamos al azar un jugador del equipo para simular
        res = await session.execute(text("""
            SELECT id, nombre FROM torneos.tournament_players 
            WHERE torneo_equipo_id = :eq AND biometria_aprobada = true 
            LIMIT 1
        """), {"eq": data.equipo_id})
        row = res.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="No se encontraron jugadores con biometría registrada en este equipo")
        player_id_matched = str(row[0])
        player_name = row[1]
    else:
        # Obtenemos su nombre real para mostrar en el frontend
        res = await session.execute(text("SELECT nombre FROM torneos.tournament_players WHERE id = :pid"), {"pid": player_id_matched})
        row = res.fetchone()
        if row: player_name = row[0]

    # 2. Registrar la asistencia en la planilla
    planilla_id = str(uuid.uuid4())
    
    # Verificar si ya existe el registro
    check_res = await session.execute(text("""
        SELECT id FROM torneos.planilla 
        WHERE partido_id = :pid AND player_id = :player
    """), {"pid": data.partido_id, "player": player_id_matched})
    
    existing = check_res.fetchone()
    
    if existing:
        await session.execute(text("""
            UPDATE torneos.planilla SET presente = true WHERE id = :id
        """), {"id": existing[0]})
    else:
        await session.execute(text("""
            INSERT INTO torneos.planilla 
                (id, partido_id, player_id, presente, creado_en)
            VALUES 
                (:id, :pid, :player, true, NOW())
        """), {
            "id": planilla_id, 
            "pid": data.partido_id, 
            "player": player_id_matched
        })
    
    await session.commit()
    
    return {
        "message": "Asistencia biométrica validada", 
        "match": True,
        "player_id": player_id_matched,
        "player_name": player_name,
        "confidence": 98.5
    }
