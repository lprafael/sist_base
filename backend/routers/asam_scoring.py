from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import Optional, List
from pydantic import BaseModel
from database import get_session

router = APIRouter(tags=["ASAM Scoring"])

class CombateAction(BaseModel):
    competidor: str # 'blanco' o 'rojo'
    accion: str # 'punto', 'salida', 'falta'
    valor: int = 1 # Usualmente 1, pero se puede enviar más para puntajes múltiples

@router.post("/asam/combates/{combate_id}/evento")
async def registrar_evento_combate(combate_id: str, action: CombateAction, session: AsyncSession = Depends(get_session)):
    """Registra una acción en vivo y aplica las reglas automáticas de ASAM"""
    # 1. Obtener estado actual
    res = await session.execute(text("SELECT * FROM torneos_generales.asam_combates WHERE id = :id"), {"id": combate_id})
    combate = res.fetchone()
    if not combate:
        raise HTTPException(status_code=404, detail="Combate no encontrado")
    if combate.estado == 'finalizado':
        raise HTTPException(status_code=400, detail="El combate ya está finalizado")

    # Mapear columnas a variables mutables
    state = {
        "blanco": {"puntos": combate.puntos_blanco, "salidas": combate.salidas_blanco, "faltas": combate.faltas_blanco, "id": combate.blanco_id},
        "rojo": {"puntos": combate.puntos_rojo, "salidas": combate.salidas_rojo, "faltas": combate.faltas_rojo, "id": combate.rojo_id}
    }
    
    rival = "rojo" if action.competidor == "blanco" else "blanco"
    
    if action.accion == 'punto':
        state[action.competidor]["puntos"] += action.valor
    elif action.accion == 'salida':
        state[action.competidor]["salidas"] += action.valor
        salidas = state[action.competidor]["salidas"]
        # Reglas automáticas de salidas
        if salidas == 3:
            state[rival]["puntos"] += 1
        elif salidas == 4:
            state[rival]["puntos"] += 1
        elif salidas >= 5:
            # Descalificación
            await finalizar_combate(session, combate_id, state[rival]["id"], "descalificacion por salidas", state)
            return {"message": f"Descalificación por 5 salidas de {action.competidor}"}
    elif action.accion == 'falta':
        state[action.competidor]["faltas"] += action.valor
        faltas = state[action.competidor]["faltas"]
        if faltas >= 2:
            # Descalificación
            await finalizar_combate(session, combate_id, state[rival]["id"], "descalificacion por faltas", state)
            return {"message": f"Descalificación por 2 faltas de {action.competidor}"}

    # Guardar estado intermedio si no finalizó
    await session.execute(text("""
        UPDATE torneos_generales.asam_combates
        SET puntos_blanco = :pb, salidas_blanco = :sb, faltas_blanco = :fb,
            puntos_rojo = :pr, salidas_rojo = :sr, faltas_rojo = :fr,
            estado = 'en_curso'
        WHERE id = :id
    """), {
        "pb": state["blanco"]["puntos"], "sb": state["blanco"]["salidas"], "fb": state["blanco"]["faltas"],
        "pr": state["rojo"]["puntos"], "sr": state["rojo"]["salidas"], "fr": state["rojo"]["faltas"],
        "id": combate_id
    })
    await session.commit()
    
    return {"message": "Evento registrado", "state": state}

async def finalizar_combate(session, combate_id, ganador_id, metodo, state):
    await session.execute(text("""
        UPDATE torneos_generales.asam_combates
        SET ganador_id = :ganador_id, metodo_victoria = :metodo, estado = 'finalizado',
            puntos_blanco = :pb, salidas_blanco = :sb, faltas_blanco = :fb,
            puntos_rojo = :pr, salidas_rojo = :sr, faltas_rojo = :fr
        WHERE id = :id
    """), {
        "ganador_id": ganador_id, "metodo": metodo, "id": combate_id,
        "pb": state["blanco"]["puntos"], "sb": state["blanco"]["salidas"], "fb": state["blanco"]["faltas"],
        "pr": state["rojo"]["puntos"], "sr": state["rojo"]["salidas"], "fr": state["rojo"]["faltas"]
    })
    await session.commit()

@router.post("/asam/combates/{combate_id}/hantei")
async def aplicar_hantei(combate_id: str, session: AsyncSession = Depends(get_session)):
    """Resuelve empate estricto por algoritmo de Hantei (infracciones)"""
    res = await session.execute(text("SELECT * FROM torneos_generales.asam_combates WHERE id = :id"), {"id": combate_id})
    c = res.fetchone()
    if not c: raise HTTPException(status_code=404)
    
    if c.puntos_blanco != c.puntos_rojo:
        raise HTTPException(status_code=400, detail="El combate no está empatado en puntos")
    
    fb, sb = c.faltas_blanco, c.salidas_blanco
    fr, sr = c.faltas_rojo, c.salidas_rojo
    ganador_id = None
    
    # Lógica de Hantei ASAM
    if fb > 0 and fr == 0:
        if fb == 1 and sr in [1, 2]: ganador_id = c.rojo_id
        elif fb == 1 and sr == 3: return {"message": "Empate Absoluto - Requiere Voto de Banderas Manual", "status": "empate"}
        elif fb == 1 and sr == 4: ganador_id = c.blanco_id
        else: ganador_id = c.rojo_id
    elif fr > 0 and fb == 0:
        if fr == 1 and sb in [1, 2]: ganador_id = c.blanco_id
        elif fr == 1 and sb == 3: return {"message": "Empate Absoluto - Requiere Voto de Banderas Manual", "status": "empate"}
        elif fr == 1 and sb == 4: ganador_id = c.rojo_id
        else: ganador_id = c.blanco_id
    elif fb == 0 and fr == 0:
        if sb < sr: ganador_id = c.blanco_id
        elif sr < sb: ganador_id = c.rojo_id
        else: return {"message": "Evaluar Actividad General - Empate Absoluto", "status": "empate"}

    if ganador_id:
        state = {
            "blanco": {"puntos": c.puntos_blanco, "salidas": c.salidas_blanco, "faltas": c.faltas_blanco},
            "rojo": {"puntos": c.puntos_rojo, "salidas": c.salidas_rojo, "faltas": c.faltas_rojo}
        }
        await finalizar_combate(session, combate_id, ganador_id, "hantei", state)
        return {"message": "Hantei aplicado automáticamete", "ganador_id": ganador_id, "status": "resuelto"}
    else:
        return {"message": "Llamado a decisión de Jueces", "status": "empate"}


class FormasScores(BaseModel):
    jueces: List[float] # 3 o 5 puntajes

@router.post("/asam/formas/{forma_id}/calcular")
async def calcular_forma(forma_id: str, scores: FormasScores, session: AsyncSession = Depends(get_session)):
    if len(scores.jueces) not in [3, 5]:
        raise HTTPException(status_code=400, detail="Debe haber 3 o 5 puntajes")
    
    jueces = scores.jueces
    max_val = max(jueces)
    min_val = min(jueces)
    
    # Remover uno de cada
    filtrada = list(jueces)
    filtrada.remove(max_val)
    filtrada.remove(min_val)
    
    total = sum(filtrada)
    
    # Rellenar nulls si son 3
    j = jueces + [None]*(5 - len(jueces))
    
    await session.execute(text("""
        UPDATE torneos_generales.asam_formas
        SET juez_1 = :j1, juez_2 = :j2, juez_3 = :j3, juez_4 = :j4, juez_5 = :j5,
            puntaje_descartado_alto = :pmax, puntaje_descartado_bajo = :pmin,
            puntaje_final = :total, estado = 'finalizado'
        WHERE id = :id
    """), {
        "j1": j[0], "j2": j[1], "j3": j[2], "j4": j[3], "j5": j[4],
        "pmax": max_val, "pmin": min_val, "total": total, "id": forma_id
    })
    await session.commit()
    
    return {"puntaje_final": total, "max": max_val, "min": min_val}
