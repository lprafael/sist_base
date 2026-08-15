from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from database import get_session

router = APIRouter(tags=["ASAM Scoring"])

# ==========================================
# 1. MODELOS Y LÓGICA DE COMBATE ASAM
# ==========================================

class CombateAction(BaseModel):
    competidor: str # 'blanco' o 'rojo'
    accion: str # 'punto', 'salida', 'falta', 'hansoku_directo', 'iniciar_alargue'
    valor: int = 1 # Usualmente 1, o -1 para corrección

def resolver_hantei_asam(fb: int, sb: int, fr: int, sr: int) -> Dict[str, Any]:
    """
    Resuelve el ganador por decisión arbitral (Hantei) aplicando
    la Tabla Oficial de Equivalencias y reglas de Reglamento ASAM.docx:
    - 1 Falta vs 1 Salida -> Gana 1 Salida
    - 1 Falta vs 2 Salidas -> Gana 2 Salidas
    - 1 Falta vs 3 Salidas -> Gana 3 Salidas
    - 1 Falta vs 4 Salidas -> Gana 1 Falta (4 salidas penalizan más)
    - Regla especial: 1 Falta + Salidas vs Solo Salidas -> Gana quien ÚNICAMENTE tiene salidas.
    - 0 Faltas vs 0 Faltas -> Menor cantidad de salidas gana.
    - 1 Falta vs 1 Falta -> Menor cantidad de salidas gana.
    """
    # Caso 1: Ambos sin faltas
    if fb == 0 and fr == 0:
        if sb < sr:
            return {"ganador": "blanco", "motivo": f"Menor cantidad de salidas ({sb} vs {sr})", "status": "resuelto"}
        elif sr < sb:
            return {"ganador": "rojo", "motivo": f"Menor cantidad de salidas ({sr} vs {sb})", "status": "resuelto"}
        else:
            return {"ganador": None, "motivo": "Empate absoluto en faltas y salidas - Requiere votación de banderas por actividad general", "status": "empate"}

    # Caso 2: Ambos con 1 falta
    if fb == 1 and fr == 1:
        if sb < sr:
            return {"ganador": "blanco", "motivo": f"Ambos con 1 falta: Blanco tiene menos salidas ({sb} vs {sr})", "status": "resuelto"}
        elif sr < sb:
            return {"ganador": "rojo", "motivo": f"Ambos con 1 falta: Rojo tiene menos salidas ({sr} vs {sb})", "status": "resuelto"}
        else:
            return {"ganador": None, "motivo": "Empate absoluto con 1 falta y mismas salidas - Requiere votación de banderas", "status": "empate"}

    # Caso 3: Blanco tiene 1 falta y Rojo tiene 0 faltas
    if fb == 1 and fr == 0:
        # Si Blanco tiene 1 falta + salidas, y Rojo sólo tiene salidas -> Gana Rojo
        if sb > 0:
            return {"ganador": "rojo", "motivo": f"Rojo solo tiene salidas ({sr}), Blanco tiene 1 falta + {sb} salidas", "status": "resuelto"}
        
        # Blanco tiene 1 falta y 0 salidas -> Aplicar tabla de equivalencias con salidas de Rojo
        if sr == 0:
            return {"ganador": "rojo", "motivo": "Rojo no tiene faltas ni salidas", "status": "resuelto"}
        elif sr in [1, 2, 3]:
            return {"ganador": "rojo", "motivo": f"Tabla ASAM: {sr} salida(s) pesan menos que 1 falta", "status": "resuelto"}
        elif sr == 4:
            return {"ganador": "blanco", "motivo": "Tabla ASAM: 4 salidas penalizan más que 1 falta (gana Blanco con 1 falta)", "status": "resuelto"}
        else:
            return {"ganador": "blanco", "motivo": "Rojo superó el límite de penalizaciones", "status": "resuelto"}

    # Caso 4: Rojo tiene 1 falta y Blanco tiene 0 faltas
    if fr == 1 and fb == 0:
        # Si Rojo tiene 1 falta + salidas, y Blanco sólo tiene salidas -> Gana Blanco
        if sr > 0:
            return {"ganador": "blanco", "motivo": f"Blanco solo tiene salidas ({sb}), Rojo tiene 1 falta + {sr} salidas", "status": "resuelto"}
        
        # Rojo tiene 1 falta y 0 salidas -> Aplicar tabla de equivalencias con salidas de Blanco
        if sb == 0:
            return {"ganador": "blanco", "motivo": "Blanco no tiene faltas ni salidas", "status": "resuelto"}
        elif sb in [1, 2, 3]:
            return {"ganador": "blanco", "motivo": f"Tabla ASAM: {sb} salida(s) pesan menos que 1 falta", "status": "resuelto"}
        elif sb == 4:
            return {"ganador": "rojo", "motivo": "Tabla ASAM: 4 salidas penalizan más que 1 falta (gana Rojo con 1 falta)", "status": "resuelto"}
        else:
            return {"ganador": "rojo", "motivo": "Blanco superó el límite de penalizaciones", "status": "resuelto"}

    return {"ganador": None, "motivo": "Situación no contemplada - Decisión de Árbitros", "status": "empate"}


@router.post("/asam/combates/{combate_id}/evento")
async def registrar_evento_combate(combate_id: str, action: CombateAction, session: AsyncSession = Depends(get_session)):
    """Registra una acción en vivo y aplica las reglas automáticas de ASAM"""
    res = await session.execute(text("SELECT * FROM torneos_generales.asam_combates WHERE id = :id"), {"id": combate_id})
    combate = res.fetchone()
    if not combate:
        raise HTTPException(status_code=404, detail="Combate no encontrado")
    if combate.estado == 'finalizado':
        raise HTTPException(status_code=400, detail="El combate ya está finalizado")

    state = {
        "blanco": {"puntos": combate.puntos_blanco, "salidas": combate.salidas_blanco, "faltas": combate.faltas_blanco, "id": combate.blanco_id},
        "rojo": {"puntos": combate.puntos_rojo, "salidas": combate.salidas_rojo, "faltas": combate.faltas_rojo, "id": combate.rojo_id},
        "en_alargue": getattr(combate, "en_alargue", False) if hasattr(combate, "en_alargue") else False
    }
    
    rival = "rojo" if action.competidor == "blanco" else "blanco"
    
    # 1. Hansoku Directo (Descalificación directa por Sangre / Conducta Antideportiva)
    if action.accion in ['hansoku_directo', 'descalificacion_sangre']:
        await finalizar_combate(session, combate_id, state[rival]["id"], "descalificacion directa (hansoku)", state)
        return {
            "message": f"¡HANSOKU DIRECTO! Descalificación inapelable de {action.competidor}. Victoria para {rival}.",
            "ganador": rival,
            "metodo": "descalificacion directa (hansoku)",
            "state": state
        }

    # 2. Iniciar Alargue / Minuto de Oro
    if action.accion == 'iniciar_alargue':
        state["en_alargue"] = True
        return {"message": "Minuto de Oro iniciado. El primer punto otorgará la victoria.", "state": state}

    # 3. Puntos (incluye regla de Punto de Oro)
    if action.accion == 'punto':
        state[action.competidor]["puntos"] = max(0, state[action.competidor]["puntos"] + action.valor)
        # Si estaba en alargue (Punto de Oro) y suma un punto positivo -> Victoria inmediata
        if state.get("en_alargue") and action.valor > 0:
            await finalizar_combate(session, combate_id, state[action.competidor]["id"], "punto de oro (alargue)", state)
            return {
                "message": f"¡PUNTO DE ORO! {action.competidor.capitalize()} marca el primer punto y gana el combate.",
                "ganador": action.competidor,
                "metodo": "punto de oro (alargue)",
                "state": state
            }

    # 4. Salidas (Cascada ASAM)
    elif action.accion == 'salida':
        nuevo_val = max(0, state[action.competidor]["salidas"] + action.valor)
        state[action.competidor]["salidas"] = nuevo_val
        salidas = nuevo_val
        
        if action.valor > 0:
            if salidas == 3:
                state[rival]["puntos"] += 1
            elif salidas == 4:
                state[rival]["puntos"] += 1
            elif salidas >= 5:
                # 5ta Salida -> Descalificación automática
                await finalizar_combate(session, combate_id, state[rival]["id"], "descalificacion por 5 salidas", state)
                return {
                    "message": f"¡DESCALIFICACIÓN POR SALIDAS! 5 salidas acumuladas para {action.competidor}. Victoria para {rival}.",
                    "ganador": rival,
                    "metodo": "descalificacion por 5 salidas",
                    "state": state
                }

    # 5. Faltas (Cascada ASAM)
    elif action.accion == 'falta':
        nuevo_val = max(0, state[action.competidor]["faltas"] + action.valor)
        state[action.competidor]["faltas"] = nuevo_val
        faltas = nuevo_val
        
        if action.valor > 0 and faltas >= 2:
            # 2da Falta -> Descalificación automática
            await finalizar_combate(session, combate_id, state[rival]["id"], "descalificacion por 2 faltas", state)
            return {
                "message": f"¡DESCALIFICACIÓN POR FALTAS! 2 faltas acumuladas para {action.competidor}. Victoria para {rival}.",
                "ganador": rival,
                "metodo": "descalificacion por 2 faltas",
                "state": state
            }

    # Guardar estado en BD
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


async def finalizar_combate(session: AsyncSession, combate_id: str, ganador_id: Optional[str], metodo: str, state: dict):
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
    """Resuelve empate estricto por algoritmo de Hantei oficial de ASAM"""
    res = await session.execute(text("SELECT * FROM torneos_generales.asam_combates WHERE id = :id"), {"id": combate_id})
    c = res.fetchone()
    if not c:
        raise HTTPException(status_code=404, detail="Combate no encontrado")
    
    if c.puntos_blanco != c.puntos_rojo:
        raise HTTPException(status_code=400, detail="El combate no está empatado en puntos")
    
    resultado = resolver_hantei_asam(c.faltas_blanco, c.salidas_blanco, c.faltas_rojo, c.salidas_rojo)
    
    if resultado["status"] == "resuelto":
        ganador_lado = resultado["ganador"]
        ganador_id = c.blanco_id if ganador_lado == "blanco" else c.rojo_id
        state = {
            "blanco": {"puntos": c.puntos_blanco, "salidas": c.salidas_blanco, "faltas": c.faltas_blanco},
            "rojo": {"puntos": c.puntos_rojo, "salidas": c.salidas_rojo, "faltas": c.faltas_rojo}
        }
        await finalizar_combate(session, combate_id, ganador_id, f"hantei ({resultado['motivo']})", state)
        return {
            "status": "resuelto",
            "ganador": ganador_lado,
            "ganador_id": ganador_id,
            "motivo": resultado["motivo"],
            "message": f"Hantei resuelto: Gana {ganador_lado.upper()} ({resultado['motivo']})"
        }
    else:
        return {
            "status": "empate",
            "motivo": resultado["motivo"],
            "message": resultado["motivo"]
        }


# ==========================================
# 2. MOTOR Y CLASIFICACIÓN DE FORMAS ASAM
# ==========================================

class FormasScores(BaseModel):
    jueces: List[float] # 3, 4 o 5 puntajes

def calcular_puntaje_forma_asam(jueces: List[float]) -> Dict[str, Any]:
    """
    Calcula el puntaje de formas según el reglamento ASAM:
    1. Descarte de nota máxima (1 valor) y mínima (1 valor).
    2. Suma de notas restantes con precisión decimal.
    3. Extracción de filtros de desempate en orden:
       - Filtro 1: Menor puntaje NO eliminado (mayor gana)
       - Filtro 2: Mayor puntaje NO eliminado (mayor gana)
       - Filtro 3: Menor puntaje ELIMINADO (mayor gana)
       - Filtro 4: Mayor puntaje ELIMINADO (mayor gana)
    """
    if len(jueces) < 3 or len(jueces) > 5:
        raise ValueError("El panel de jueces debe contar con entre 3 y 5 puntajes")

    max_val = max(jueces)
    min_val = min(jueces)
    
    # Remover exactamente 1 instancia de cada extremo
    filtrada = list(jueces)
    filtrada.remove(max_val)
    filtrada.remove(min_val)
    
    total = round(sum(filtrada), 2)
    
    min_no_descartado = min(filtrada) if filtrada else 0.0
    max_no_descartado = max(filtrada) if filtrada else 0.0
    
    return {
        "jueces": jueces,
        "puntaje_final": total,
        "puntaje_descartado_alto": max_val,
        "puntaje_descartado_bajo": min_val,
        "filtro1_min_no_descartado": min_no_descartado,
        "filtro2_max_no_descartado": max_no_descartado,
        "filtro3_min_descartado": min_val,
        "filtro4_max_descartado": max_val
    }

def clasificar_atletas_formas(atletas: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Ordena una lista de atletas evaluados en Formas aplicando la cascada
    estricta de 5 pasos de desempate del Reglamento ASAM.
    """
    from functools import cmp_to_key

    def comparar_atletas(a: Dict[str, Any], b: Dict[str, Any]) -> int:
        # Paso 0: Total Acumulado (Mayor gana)
        tot_a = a.get("puntaje_final", 0)
        tot_b = b.get("puntaje_final", 0)
        if tot_a != tot_b:
            return -1 if tot_a > tot_b else 1

        # Paso 1: Filtro 1 - Menor no eliminado (Mayor gana)
        f1_a = a.get("filtro1_min_no_descartado", 0)
        f1_b = b.get("filtro1_min_no_descartado", 0)
        if f1_a != f1_b:
            a["criterio_desempate"] = f"Filtro 1: Menor válido ({f1_a} vs {f1_b})"
            b["criterio_desempate"] = f"Filtro 1: Menor válido ({f1_a} vs {f1_b})"
            return -1 if f1_a > f1_b else 1

        # Paso 2: Filtro 2 - Mayor no eliminado (Mayor gana)
        f2_a = a.get("filtro2_max_no_descartado", 0)
        f2_b = b.get("filtro2_max_no_descartado", 0)
        if f2_a != f2_b:
            a["criterio_desempate"] = f"Filtro 2: Mayor válido ({f2_a} vs {f2_b})"
            b["criterio_desempate"] = f"Filtro 2: Mayor válido ({f2_a} vs {f2_b})"
            return -1 if f2_a > f2_b else 1

        # Paso 3: Filtro 3 - Menor descartado (Mayor gana)
        f3_a = a.get("filtro3_min_descartado", 0)
        f3_b = b.get("filtro3_min_descartado", 0)
        if f3_a != f3_b:
            a["criterio_desempate"] = f"Filtro 3: Mín descartado ({f3_a} vs {f3_b})"
            b["criterio_desempate"] = f"Filtro 3: Mín descartado ({f3_a} vs {f3_b})"
            return -1 if f3_a > f3_b else 1

        # Paso 4: Filtro 4 - Mayor descartado (Mayor gana)
        f4_a = a.get("filtro4_max_descartado", 0)
        f4_b = b.get("filtro4_max_descartado", 0)
        if f4_a != f4_b:
            a["criterio_desempate"] = f"Filtro 4: Máx descartado ({f4_a} vs {f4_b})"
            b["criterio_desempate"] = f"Filtro 4: Máx descartado ({f4_a} vs {f4_b})"
            return -1 if f4_a > f4_b else 1

        # Paso 5: Empate absoluto
        a["criterio_desempate"] = "Empate absoluto - Requiere 2da forma en tatami"
        b["criterio_desempate"] = "Empate absoluto - Requiere 2da forma en tatami"
        return 0

    ranking = sorted(atletas, key=cmp_to_key(comparar_atletas))
    for idx, at in enumerate(ranking):
        at["posicion_final"] = idx + 1
        if "criterio_desempate" not in at:
            at["criterio_desempate"] = "Nota Final Directa"
    return ranking


@router.post("/asam/formas/{forma_id}/calcular")
async def calcular_forma(forma_id: str, scores: FormasScores, session: AsyncSession = Depends(get_session)):
    try:
        calc = calcular_puntaje_forma_asam(scores.jueces)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    jueces = scores.jueces
    j = jueces + [None] * (5 - len(jueces))
    
    await session.execute(text("""
        UPDATE torneos_generales.asam_formas
        SET juez_1 = :j1, juez_2 = :j2, juez_3 = :j3, juez_4 = :j4, juez_5 = :j5,
            puntaje_descartado_alto = :pmax, puntaje_descartado_bajo = :pmin,
            puntaje_final = :total, estado = 'finalizado'
        WHERE id = :id
    """), {
        "j1": j[0], "j2": j[1], "j3": j[2], "j4": j[3], "j5": j[4],
        "pmax": calc["puntaje_descartado_alto"], 
        "pmin": calc["puntaje_descartado_bajo"], 
        "total": calc["puntaje_final"], 
        "id": forma_id
    })
    await session.commit()
    
    return calc

