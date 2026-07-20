from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import List, Optional
from pydantic import BaseModel
from database import get_session

router = APIRouter(prefix="/api/pkf", tags=["PKF Scoring"])

class PKFCombateAction(BaseModel):
    competidor: str # 'aka' o 'ao'
    accion: str # 'yuko', 'waza_ari', 'ippon', 'senshu', 'jogai', 'penalizacion', 'invalidar_punto'
    valor: int = 1

@router.post("/combates/{combate_id}/evento")
async def registrar_evento_combate_pkf(combate_id: str, action: PKFCombateAction, session: AsyncSession = Depends(get_session)):
    """Registra eventos de un combate PKF en tiempo real"""
    res = await session.execute(text("SELECT * FROM torneos_generales.pkf_combates WHERE id = :id"), {"id": combate_id})
    combate = res.fetchone()
    if not combate:
        raise HTTPException(status_code=404, detail="Combate no encontrado")
    if combate.estado == 'finalizado':
        raise HTTPException(status_code=400, detail="El combate ya está finalizado")

    state = {
        "aka": {
            "puntos": combate.puntos_aka, "senshu": combate.senshu_aka, 
            "jogai": combate.jogai_aka, "penalizaciones": combate.penalizaciones_aka, "id": combate.aka_id
        },
        "ao": {
            "puntos": combate.puntos_ao, "senshu": combate.senshu_ao, 
            "jogai": combate.jogai_ao, "penalizaciones": combate.penalizaciones_ao, "id": combate.ao_id
        }
    }
    
    comp = action.competidor.lower()
    if comp not in ["aka", "ao"]:
        raise HTTPException(status_code=400, detail="Competidor inválido. Debe ser 'aka' o 'ao'.")

    # Lógica de puntuación
    if action.accion == 'yuko':
        state[comp]["puntos"] += 1
    elif action.accion == 'waza_ari':
        state[comp]["puntos"] += 2
    elif action.accion == 'ippon':
        state[comp]["puntos"] += 3
    elif action.accion == 'senshu':
        # Ventaja por primer punto
        state[comp]["senshu"] = True
    elif action.accion == 'jogai':
        state[comp]["jogai"] += action.valor
    elif action.accion == 'penalizacion':
        state[comp]["penalizaciones"] += action.valor
    elif action.accion == 'invalidar_punto':
        # Regla Zanshin (Se resta el último punto si el juez lo decide)
        state[comp]["puntos"] = max(0, state[comp]["puntos"] - action.valor)

    # Actualizar estado
    await session.execute(text("""
        UPDATE torneos_generales.pkf_combates
        SET puntos_aka = :p_aka, senshu_aka = :s_aka, jogai_aka = :j_aka, penalizaciones_aka = :pen_aka,
            puntos_ao = :p_ao, senshu_ao = :s_ao, jogai_ao = :j_ao, penalizaciones_ao = :pen_ao,
            estado = 'en_curso'
        WHERE id = :id
    """), {
        "p_aka": state["aka"]["puntos"], "s_aka": state["aka"]["senshu"], "j_aka": state["aka"]["jogai"], "pen_aka": state["aka"]["penalizaciones"],
        "p_ao": state["ao"]["puntos"], "s_ao": state["ao"]["senshu"], "j_ao": state["ao"]["jogai"], "pen_ao": state["ao"]["penalizaciones"],
        "id": combate_id
    })
    await session.commit()
    
    return {"message": "Evento registrado exitosamente", "state": state}


class VideoReviewAction(BaseModel):
    competidor: str # 'aka' o 'ao'
    exitoso: bool

@router.post("/combates/{combate_id}/video-review")
async def usar_video_review(combate_id: str, action: VideoReviewAction, session: AsyncSession = Depends(get_session)):
    """Gestiona el consumo de la tarjeta de Video Review (VR) de los coaches"""
    res = await session.execute(text("SELECT video_review_aka, video_review_ao FROM torneos_generales.pkf_combates WHERE id = :id"), {"id": combate_id})
    combate = res.fetchone()
    if not combate:
        raise HTTPException(status_code=404, detail="Combate no encontrado")

    comp = action.competidor.lower()
    
    if comp == 'aka':
        if combate.video_review_aka == 'USED_AND_LOCKED':
            raise HTTPException(status_code=400, detail="El coach de AKA ya no tiene tarjeta de Video Review disponible")
        nuevo_estado = 'ACTIVE' if action.exitoso else 'USED_AND_LOCKED'
        await session.execute(text("UPDATE torneos_generales.pkf_combates SET video_review_aka = :st WHERE id = :id"), {"st": nuevo_estado, "id": combate_id})
    else:
        if combate.video_review_ao == 'USED_AND_LOCKED':
            raise HTTPException(status_code=400, detail="El coach de AO ya no tiene tarjeta de Video Review disponible")
        nuevo_estado = 'ACTIVE' if action.exitoso else 'USED_AND_LOCKED'
        await session.execute(text("UPDATE torneos_generales.pkf_combates SET video_review_ao = :st WHERE id = :id"), {"st": nuevo_estado, "id": combate_id})
    
    await session.commit()
    return {"message": f"Video review procesado. Estado actual para {comp.upper()}: {nuevo_estado}"}


class PKFFormasVotos(BaseModel):
    jueces: List[str] # Lista de 'aka' o 'ao' (5 o 7 elementos)

@router.post("/formas/{enfrentamiento_id}/votar")
async def registrar_votos_kata(enfrentamiento_id: str, payload: PKFFormasVotos, session: AsyncSession = Depends(get_session)):
    """Registra los votos y calcula el ganador de Kata (Moda)"""
    votos = [v.lower() for v in payload.jueces]
    if len(votos) not in [5, 7]:
        raise HTTPException(status_code=400, detail="El número de jueces debe ser 5 o 7")
        
    for v in votos:
        if v not in ['aka', 'ao']:
            raise HTTPException(status_code=400, detail="Los votos deben ser 'aka' o 'ao'")

    votos_aka = votos.count('aka')
    votos_ao = votos.count('ao')
    
    # Obtener el enfrentamiento para asignar ganador
    res = await session.execute(text("SELECT aka_id, ao_id FROM torneos_generales.pkf_formas_enfrentamientos WHERE id = :id"), {"id": enfrentamiento_id})
    enfrentamiento = res.fetchone()
    if not enfrentamiento:
        raise HTTPException(status_code=404, detail="Enfrentamiento no encontrado")

    ganador_id = enfrentamiento.aka_id if votos_aka > votos_ao else enfrentamiento.ao_id

    # Rellenar votos para guardar
    j_votos = votos + [None] * (7 - len(votos))

    await session.execute(text("""
        UPDATE torneos_generales.pkf_formas_enfrentamientos
        SET votos_aka = :v_aka, votos_ao = :v_ao,
            juez_1_voto = :j1, juez_2_voto = :j2, juez_3_voto = :j3, juez_4_voto = :j4,
            juez_5_voto = :j5, juez_6_voto = :j6, juez_7_voto = :j7,
            ganador_id = :ganador, estado = 'finalizado'
        WHERE id = :id
    """), {
        "v_aka": votos_aka, "v_ao": votos_ao,
        "j1": j_votos[0], "j2": j_votos[1], "j3": j_votos[2], "j4": j_votos[3],
        "j5": j_votos[4], "j6": j_votos[5], "j7": j_votos[6],
        "ganador": ganador_id, "id": enfrentamiento_id
    })
    
    await session.commit()
    return {
        "mensaje": "Votación de Kata finalizada",
        "votos_aka": votos_aka,
        "votos_ao": votos_ao,
        "ganador": 'AKA' if votos_aka > votos_ao else 'AO',
        "ganador_id": ganador_id
    }
