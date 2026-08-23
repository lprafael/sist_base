"""
routers/wkf_scoring.py
Módulo de Puntuación y Arbitraje Oficial de la World Karate Federation (WKF).
Implementa:
1. Kumite (Combate): Yuko (+1), Waza-Ari (+2), Ippon (+3), Senshu, Regla de 8 puntos de ventaja,
   Jogai, Penalizaciones, Video Review Card, Regla de Zanshin y Algoritmo de Desempate (Senshu -> Ippon -> Waza-Ari -> Hantei).
2. Kata (Formas): Votación por Banderas (AKA vs AO con paneles de 3, 5 o 7 jueces por Mayoría Absoluta)
   y Evaluación Técnica Decimal (5.0 a 10.0 con descalificación 0.0).
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from database import get_session
import json

router = APIRouter(prefix="/api/wkf", tags=["WKF Karate Scoring"])


# ============================================================
# 1. MODELOS Y LÓGICA DE KUMITE (COMBATE WKF)
# ============================================================

class KumiteAction(BaseModel):
    competidor: str  # 'aka' (rojo) o 'ao' (azul) / 'local' o 'visitante'
    accion: str  # 'yuko', 'waza_ari', 'ippon', 'senshu', 'jogai', 'penalizacion', 'invalidar_punto', 'hansoku_directo'
    valor: int = 1  # 1 por defecto, o -1 para corrección
    tecnica_info: Optional[str] = None  # ej. 'Tsuki', 'Uchi', 'Chudan Kick', 'Jodan Kick'


def resolver_desempate_wkf(
    senshu_aka: bool, ippon_aka: int, waza_ari_aka: int,
    senshu_ao: bool, ippon_ao: int, waza_ari_ao: int
) -> Dict[str, Any]:
    """
    Algoritmo oficial de resolución de empates en Kumite WKF (Art. 1.4):
    1. Senshu: Ventaja por haber marcado el primer punto sin oposición.
    2. Mayor número de Ippons conseguidos en el combate.
    3. Mayor número de Waza-Aris conseguidos en el combate.
    4. Hantei: Votación por banderas del panel arbitral.
    """
    # 1. Senshu
    if senshu_aka and not senshu_ao:
        return {"ganador": "aka", "motivo": "Criterio 1 WKF: Ventaja por Senshu (Primer punto de la contienda)", "status": "resuelto"}
    if senshu_ao and not senshu_aka:
        return {"ganador": "ao", "motivo": "Criterio 1 WKF: Ventaja por Senshu (Primer punto de la contienda)", "status": "resuelto"}

    # 2. Mayor número de Ippons (3 puntos)
    if ippon_aka > ippon_ao:
        return {"ganador": "aka", "motivo": f"Criterio 2 WKF: Mayor cantidad de Ippon ({ippon_aka} vs {ippon_ao})", "status": "resuelto"}
    if ippon_ao > ippon_aka:
        return {"ganador": "ao", "motivo": f"Criterio 2 WKF: Mayor cantidad de Ippon ({ippon_ao} vs {ippon_aka})", "status": "resuelto"}

    # 3. Mayor número de Waza-Aris (2 puntos)
    if waza_ari_aka > waza_ari_ao:
        return {"ganador": "aka", "motivo": f"Criterio 3 WKF: Mayor cantidad de Waza-Ari ({waza_ari_aka} vs {waza_ari_ao})", "status": "resuelto"}
    if waza_ari_ao > waza_ari_aka:
        return {"ganador": "ao", "motivo": f"Criterio 3 WKF: Mayor cantidad de Waza-Ari ({waza_ari_ao} vs {waza_ari_aka})", "status": "resuelto"}

    # 4. Hantei
    return {
        "ganador": None,
        "motivo": "Igualdad estricta en Senshu, Ippons y Waza-Aris. Requiere votación arbitral por banderas (Hantei)",
        "status": "empate"
    }


@router.post("/combates/{match_id}/evento")
async def registrar_evento_kumite_wkf(match_id: str, action: KumiteAction, session: AsyncSession = Depends(get_session)):
    """
    Registra un evento de Kumite WKF en tiempo real y verifica automatismos:
    - Yuko (+1), Waza-Ari (+2), Ippon (+3)
    - Superioridad técnica de 8 puntos (Diferencia >= 8) -> Victoria inmediata
    - Asignación / Invalidación de Senshu
    - Invalidación de técnica por pérdida de Zanshin
    - Penalizaciones y Hansoku directo
    """
    q_partido = text("SELECT id, goles_local, goles_visitante, estado, estadisticas, equipo_local_id, equipo_visitante_id FROM torneos.partidos WHERE id = :id")
    res_partido = await session.execute(q_partido, {"id": match_id})
    row = res_partido.fetchone()

    # Normalizar lado del competidor
    comp_key = action.competidor.lower()
    if comp_key in ['aka', 'rojo', 'local']:
        lado = 'local'
        rival_lado = 'visitante'
    elif comp_key in ['ao', 'azul', 'visitante']:
        lado = 'visitante'
        rival_lado = 'local'
    else:
        raise HTTPException(status_code=400, detail="Competidor inválido. Debe ser 'aka'/'rojo'/'local' o 'ao'/'azul'/'visitante'")

    if row:
        stats = row.estadisticas or {}
        if isinstance(stats, str):
            try:
                stats = json.loads(stats)
            except Exception:
                stats = {}

        if "local" not in stats:
            stats["local"] = {"puntos": row.goles_local or 0, "yuko": 0, "waza_ari": 0, "ippon": 0, "senshu": False, "jogai": 0, "penalizaciones": 0, "video_review": "ACTIVE"}
        if "visitante" not in stats:
            stats["visitante"] = {"puntos": row.goles_visitante or 0, "yuko": 0, "waza_ari": 0, "ippon": 0, "senshu": False, "jogai": 0, "penalizaciones": 0, "video_review": "ACTIVE"}

        state = stats
    else:
        q_pkf = text("SELECT * FROM torneos_generales.pkf_combates WHERE id = :id")
        res_pkf = await session.execute(q_pkf, {"id": match_id})
        pkf_row = res_pkf.fetchone()
        if not pkf_row:
            raise HTTPException(status_code=404, detail="Combate no encontrado")

        state = {
            "local": {
                "puntos": pkf_row.puntos_aka, "yuko": 0, "waza_ari": 0, "ippon": 0,
                "senshu": pkf_row.senshu_aka, "jogai": pkf_row.jogai_aka,
                "penalizaciones": pkf_row.penalizaciones_aka, "video_review": pkf_row.video_review_aka
            },
            "visitante": {
                "puntos": pkf_row.puntos_ao, "yuko": 0, "waza_ari": 0, "ippon": 0,
                "senshu": pkf_row.senshu_ao, "jogai": pkf_row.jogai_ao,
                "penalizaciones": pkf_row.penalizaciones_ao, "video_review": pkf_row.video_review_ao
            }
        }

    # Procesar acciones WKF
    puntos_antes = state[lado].get("puntos", 0)
    puntos_rival_antes = state[rival_lado].get("puntos", 0)

    if action.accion == 'yuko':
        state[lado]["yuko"] = max(0, state[lado].get("yuko", 0) + action.valor)
        state[lado]["puntos"] = max(0, state[lado].get("puntos", 0) + (1 * action.valor))
    elif action.accion == 'waza_ari':
        state[lado]["waza_ari"] = max(0, state[lado].get("waza_ari", 0) + action.valor)
        state[lado]["puntos"] = max(0, state[lado].get("puntos", 0) + (2 * action.valor))
    elif action.accion == 'ippon':
        state[lado]["ippon"] = max(0, state[lado].get("ippon", 0) + action.valor)
        state[lado]["puntos"] = max(0, state[lado].get("puntos", 0) + (3 * action.valor))
    elif action.accion == 'senshu':
        state[lado]["senshu"] = not state[lado].get("senshu", False) if action.valor == 0 else (action.valor > 0)
        if state[lado]["senshu"]:
            state[rival_lado]["senshu"] = False
    elif action.accion == 'jogai':
        state[lado]["jogai"] = max(0, state[lado].get("jogai", 0) + action.valor)
    elif action.accion == 'penalizacion':
        new_pen = max(0, state[lado].get("penalizaciones", 0) + action.valor)
        state[lado]["penalizaciones"] = new_pen
        # Regla WKF: Sanción grave o acumulación de faltas anula el Senshu
        if action.valor > 0 and state[lado].get("senshu", False) and new_pen >= 2:
            state[lado]["senshu"] = False
    elif action.accion == 'invalidar_punto':
        state[lado]["puntos"] = max(0, state[lado].get("puntos", 0) - action.valor)
    elif action.accion == 'hansoku_directo':
        state["ganador_lado"] = rival_lado
        state["metodo_victoria"] = f"Descalificación Directa (Hansoku de {comp_key.upper()})"
        if row:
            ganador_id = row.equipo_visitante_id if lado == 'local' else row.equipo_local_id
            await session.execute(text("""
                UPDATE torneos.partidos
                SET estado = 'finalizado', estadisticas = :stats, ganador_id = :gid
                WHERE id = :id
            """), {"stats": json.dumps(state) if not isinstance(state, str) else state, "gid": ganador_id, "id": match_id})
        await session.commit()
        return {
            "message": f"¡HANSOKU DIRECTO! Descalificación inmediata de {comp_key.upper()}. Victoria para el oponente.",
            "state": state,
            "ganador": rival_lado,
            "metodo": state["metodo_victoria"]
        }

    # Asignación automática de Senshu si es el primer punto del combate sin oposición previa
    puntos_ahora = state[lado]["puntos"]
    if puntos_ahora > 0 and puntos_antes == 0 and puntos_rival_antes == 0 and not state[rival_lado].get("senshu", False):
        state[lado]["senshu"] = True

    # Regla WKF: Superioridad de 8 Puntos (Diferencia >= 8)
    diff = state[lado]["puntos"] - state[rival_lado]["puntos"]
    finalizado_por_8 = False
    if diff >= 8:
        state["ganador_lado"] = lado
        state["metodo_victoria"] = f"Ventaja de 8 Puntos (Superioridad Técnica WKF: {state[lado]['puntos']} - {state[rival_lado]['puntos']})"
        finalizado_por_8 = True
    elif -diff >= 8:
        state["ganador_lado"] = rival_lado
        state["metodo_victoria"] = f"Ventaja de 8 Puntos (Superioridad Técnica WKF: {state[rival_lado]['puntos']} - {state[lado]['puntos']})"
        finalizado_por_8 = True

    # Guardar en BD
    if row:
        estado_nuevo = 'finalizado' if finalizado_por_8 else (row.estado or 'en_curso')
        ganador_id = (row.equipo_local_id if state.get("ganador_lado") == 'local' else row.equipo_visitante_id) if finalizado_por_8 else None
        
        await session.execute(text("""
            UPDATE torneos.partidos
            SET goles_local = :gl, goles_visitante = :gv, estado = :est, estadisticas = :stats
            WHERE id = :id
        """), {
            "gl": state["local"]["puntos"],
            "gv": state["visitante"]["puntos"],
            "est": estado_nuevo,
            "stats": json.dumps(state),
            "id": match_id
        })
        if finalizado_por_8 and ganador_id:
            await session.execute(text("UPDATE torneos.partidos SET ganador_id = :gid WHERE id = :id"), {"gid": ganador_id, "id": match_id})

    await session.commit()

    return {
        "message": state.get("metodo_victoria") or "Evento WKF registrado con éxito",
        "state": state,
        "diferencia_8_puntos": finalizado_por_8,
        "ganador": state.get("ganador_lado") if finalizado_por_8 else None
    }


@router.post("/combates/{match_id}/hantei")
async def aplicar_hantei_wkf(match_id: str, session: AsyncSession = Depends(get_session)):
    """Aplica la cascada oficial de desempate WKF: Senshu -> Ippons -> Waza-Aris -> Hantei"""
    q_partido = text("SELECT id, goles_local, goles_visitante, estado, estadisticas, equipo_local_id, equipo_visitante_id FROM torneos.partidos WHERE id = :id")
    res_partido = await session.execute(q_partido, {"id": match_id})
    row = res_partido.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Combate no encontrado")

    stats = row.estadisticas or {}
    if isinstance(stats, str):
        try:
            stats = json.loads(stats)
        except Exception:
            stats = {}

    loc = stats.get("local", {})
    vis = stats.get("visitante", {})

    if row.goles_local != row.goles_visitante:
        raise HTTPException(status_code=400, detail="El combate no se encuentra empatado en puntos")

    resultado = resolver_desempate_wkf(
        senshu_aka=loc.get("senshu", False),
        ippon_aka=loc.get("ippon", 0),
        waza_ari_aka=loc.get("waza_ari", 0),
        senshu_ao=vis.get("senshu", False),
        ippon_ao=vis.get("ippon", 0),
        waza_ari_ao=vis.get("waza_ari", 0)
    )

    if resultado["status"] == "resuelto":
        ganador_lado = resultado["ganador"]
        ganador_id = row.equipo_local_id if ganador_lado in ['local', 'aka'] else row.equipo_visitante_id
        stats["ganador_lado"] = ganador_lado
        stats["metodo_victoria"] = f"Desempate WKF ({resultado['motivo']})"
        
        await session.execute(text("""
            UPDATE torneos.partidos
            SET estado = 'finalizado', ganador_id = :gid, estadisticas = :stats
            WHERE id = :id
        """), {
            "gid": ganador_id,
            "stats": json.dumps(stats),
            "id": match_id
        })
        await session.commit()

    return resultado


class VideoReviewWKFAction(BaseModel):
    competidor: str  # 'aka' o 'ao' / 'local' o 'visitante'
    exitoso: bool


@router.post("/combates/{match_id}/video-review")
async def video_review_wkf(match_id: str, action: VideoReviewWKFAction, session: AsyncSession = Depends(get_session)):
    """Gestiona el uso de la tarjeta de Video Review de los coaches según reglamento WKF"""
    q_partido = text("SELECT id, estadisticas FROM torneos.partidos WHERE id = :id")
    res = await session.execute(q_partido, {"id": match_id})
    row = res.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Combate no encontrado")

    stats = row.estadisticas or {}
    if isinstance(stats, str):
        try:
            stats = json.loads(stats)
        except Exception:
            stats = {}

    lado = 'local' if action.competidor.lower() in ['aka', 'rojo', 'local'] else 'visitante'
    if lado not in stats:
        stats[lado] = {"video_review": "ACTIVE"}

    if stats[lado].get("video_review") == 'USED_AND_LOCKED':
        raise HTTPException(status_code=400, detail=f"El coach de {action.competidor.upper()} ya no tiene tarjeta de Video Review disponible")

    nuevo_estado = 'ACTIVE' if action.exitoso else 'USED_AND_LOCKED'
    stats[lado]["video_review"] = nuevo_estado

    await session.execute(text("UPDATE torneos.partidos SET estadisticas = :st WHERE id = :id"), {
        "st": json.dumps(stats), "id": match_id
    })
    await session.commit()

    return {"message": f"Video Review para {action.competidor.upper()}: {nuevo_estado}", "status": nuevo_estado}


# ============================================================
# 2. MODELOS Y LÓGICA DE KATA (FORMAS WKF)
# ============================================================

class KataBanderasAction(BaseModel):
    jueces: List[str]  # Lista con ['aka', 'ao', 'aka', 'aka', 'ao'] (3, 5 o 7 jueces)


@router.post("/formas/{match_id}/votar-banderas")
async def votar_banderas_kata_wkf(match_id: str, payload: KataBanderasAction, session: AsyncSession = Depends(get_session)):
    """
    Registra los votos de banderas para Kata WKF (Enfrentamiento directo AKA vs AO).
    Determina al ganador por Mayoría Absoluta (3-0, 2-1, 3-2, 4-1, 5-0, 5-2, etc.).
    """
    votos = [v.lower() for v in payload.jueces]
    if len(votos) not in [3, 5, 7]:
        raise HTTPException(status_code=400, detail="El panel de jueces debe ser de 3, 5 o 7 miembros")

    for v in votos:
        if v not in ['aka', 'ao', 'local', 'visitante']:
            raise HTTPException(status_code=400, detail="Cada voto debe ser 'AKA' o 'AO'")

    votos_aka = sum(1 for v in votos if v in ['aka', 'local'])
    votos_ao = sum(1 for v in votos if v in ['ao', 'visitante'])

    if votos_aka == votos_ao:
        raise HTTPException(status_code=400, detail="El panel de jueces impar no permite empates en banderas")

    ganador_lado = 'local' if votos_aka > votos_ao else 'visitante'
    diferencia = f"{max(votos_aka, votos_ao)}-{min(votos_aka, votos_ao)}"

    q_partido = text("SELECT id, equipo_local_id, equipo_visitante_id FROM torneos.partidos WHERE id = :id")
    res = await session.execute(q_partido, {"id": match_id})
    row = res.fetchone()

    stats = {
        "tipo_reglamento": "WKF",
        "modalidad_kata": "banderas",
        "votos_jueces": votos,
        "votos_aka": votos_aka,
        "votos_ao": votos_ao,
        "diferencia": diferencia,
        "ganador_lado": ganador_lado,
        "metodo_victoria": f"Decisión Mayoritaria por Banderas ({diferencia})"
    }

    if row:
        ganador_id = row.equipo_local_id if ganador_lado == 'local' else row.equipo_visitante_id
        await session.execute(text("""
            UPDATE torneos.partidos
            SET goles_local = :va, goles_visitante = :vo, estado = 'finalizado',
                ganador_id = :gid, estadisticas = :st
            WHERE id = :id
        """), {
            "va": votos_aka, "vo": votos_ao, "gid": ganador_id,
            "st": json.dumps(stats), "id": match_id
        })
        await session.commit()

    return {
        "mensaje": f"Victoria para {'AKA (Rojo)' if ganador_lado == 'local' else 'AO (Azul)'} por decisión de banderas ({diferencia})",
        "ganador": ganador_lado,
        "votos_aka": votos_aka,
        "votos_ao": votos_ao,
        "diferencia": diferencia
    }


class KataDecimalScores(BaseModel):
    jueces: List[float]  # 3 o 5 calificaciones (escala 5.0 a 10.0)
    descalificado: bool = False
    motivo_descalificacion: Optional[str] = None  # ej: 'Omitir Rei', 'Anuncio erróneo de Kata', 'No iniciar de frente'


@router.post("/formas/{match_id}/calcular-decimal")
async def calcular_kata_decimal_wkf(match_id: str, payload: KataDecimalScores, session: AsyncSession = Depends(get_session)):
    """
    Calcula la puntuación técnica de Kata en escala decimal oficial (5.0 a 10.0)
    o asigna Descalificación Directa 0.0 según Art. 2.3 WKF.
    """
    if payload.descalificado:
        total = 0.0
        stats = {
            "tipo_reglamento": "WKF",
            "modalidad_kata": "decimal",
            "jueces": [0.0] * len(payload.jueces),
            "puntaje_final": 0.0,
            "descalificado": True,
            "motivo_descalificacion": payload.motivo_descalificacion or "Descalificación Técnica WKF (Score 0.0)"
        }
    else:
        for score in payload.jueces:
            if score < 5.0 or score > 10.0:
                raise HTTPException(status_code=400, detail="La escala de calificación técnica WKF es de 5.0 a 10.0")

        # Descarte de extremo máximo y mínimo si son 5 jueces
        jueces = list(payload.jueces)
        if len(jueces) >= 5:
            max_val = max(jueces)
            min_val = min(jueces)
            filtrada = list(jueces)
            filtrada.remove(max_val)
            filtrada.remove(min_val)
            total = round(sum(filtrada), 2)
        else:
            total = round(sum(jueces), 2)

        stats = {
            "tipo_reglamento": "WKF",
            "modalidad_kata": "decimal",
            "jueces": jueces,
            "puntaje_final": total,
            "descalificado": False
        }

    await session.execute(text("""
        UPDATE torneos.partidos
        SET goles_local = :score, estado = 'finalizado', estadisticas = :st
        WHERE id = :id
    """), {
        "score": total,
        "st": json.dumps(stats),
        "id": match_id
    })
    await session.commit()

    return {
        "mensaje": "Calificación técnica de Kata WKF procesada con éxito",
        "puntaje_final": total,
        "estadisticas": stats
    }
