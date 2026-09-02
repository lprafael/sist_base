"""
routers/basketball_scoring.py
Módulo de Puntuación y Arbitraje Oficial de Baloncesto (FIBA, NBA, 3x3 y Colegial/Personalizado).

Implementa:
1. Puntuación: Tiros libres (+1), Dobles (+2), Triples (+3) y correcciones.
2. Desglose por períodos: Cuartos (Q1, Q2, Q3, Q4) y Alargues/Prórrogas (OT1, OT2, ...).
3. Cronómetro y reloj de tiro (24s / 14s / 12s) con ajuste fino (+/- segundos).
4. Faltas acumuladas por cuarto, estado de BONUS / PENALTY (5ª falta colectiva).
5. Faltas técnicas, antideportivas/flagrantes y descalificaciones.
6. Tiempos muertos (Timeouts) reglamentarios.
7. Flecha de posesión alterna (Alternating Possession Arrow).
8. Detección y gestión oficial de prórroga/alargue en caso de empate.
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from database import get_session
import json

router = APIRouter(prefix="/api/basketball", tags=["Basketball Scoring"])

# ============================================================
# 1. MODELOS DE DATOS
# ============================================================

class BasketballAction(BaseModel):
    equipo: str  # 'local' o 'visitante'
    accion: str  # 'tiro_libre', 'doble', 'triple', 'falta_personal', 'falta_tecnica', 'falta_antideportiva', 'falta_descalificante', 'tiempo_muerto', 'cambiar_periodo', 'flecha_posesion'
    valor: int = 1  # 1, o -1 para anular/corregir
    periodo: Optional[str] = None  # 'Q1', 'Q2', 'Q3', 'Q4', 'OT1', 'OT2', etc.
    jugador_id: Optional[str] = None
    jugador_nombre: Optional[str] = None
    minuto_segundo: Optional[str] = None
    detalles: Optional[Dict[str, Any]] = None


class TimeAdjustment(BaseModel):
    segundos_delta: Optional[int] = 0  # + o - segundos
    tiempo_absoluto: Optional[int] = None  # nuevo tiempo en segundos
    periodo: Optional[str] = None
    reloj_tiro_segundos: Optional[int] = None  # 24, 14, etc.


class OvertimeRequest(BaseModel):
    duracion_segundos: int = 300  # 5 minutos por defecto en FIBA/NBA
    periodo: Optional[str] = None  # ej. 'OT1', 'OT2'


# ============================================================
# 2. FUNCIONES DE AYUDA Y REGLAS DE BALONCESTO
# ============================================================

def normalizar_estadisticas_baloncesto(raw_stats: Any, goles_local: int = 0, goles_visitante: int = 0) -> Dict[str, Any]:
    stats = {}
    if isinstance(raw_stats, str):
        try:
            stats = json.loads(raw_stats)
        except Exception:
            stats = {}
    elif isinstance(raw_stats, dict):
        stats = dict(raw_stats)

    reglamento = stats.get("reglamento", "FIBA")  # 'FIBA' | 'NBA' | '3x3' | 'CUSTOM'
    periodo_actual = stats.get("periodo_actual", "Q1")

    # Estructura de equipo
    def init_team(key: str, default_pts: int):
        team_data = stats.get(key, {})
        if not isinstance(team_data, dict):
            team_data = {}
        return {
            "puntos": team_data.get("puntos", default_pts),
            "tiros_libres": team_data.get("tiros_libres", 0),
            "dobles": team_data.get("dobles", 0),
            "triples": team_data.get("triples", 0),
            "faltas_periodo": team_data.get("faltas_periodo", 0),
            "faltas_totales": team_data.get("faltas_totales", 0),
            "faltas_tecnicas": team_data.get("faltas_tecnicas", 0),
            "faltas_antideportivas": team_data.get("faltas_antideportivas", 0),
            "tiempos_muertos": team_data.get("tiempos_muertos", 0),
            "tiempos_muertos_restantes": team_data.get("tiempos_muertos_restantes", 5 if reglamento == "FIBA" else 7),
            "en_bonus": team_data.get("en_bonus", False),
            "puntos_por_cuarto": team_data.get("puntos_por_cuarto", {
                "Q1": 0, "Q2": 0, "Q3": 0, "Q4": 0, "OT": 0
            })
        }

    local_data = init_team("local", goles_local)
    visitante_data = init_team("visitante", goles_visitante)

    # Duración de período por reglamento
    default_clock = 600  # FIBA 10:00
    if reglamento == "NBA":
        default_clock = 720  # NBA 12:00
    elif reglamento == "3x3":
        default_clock = 600

    return {
        "tipo_deporte": "Baloncesto",
        "reglamento": reglamento,
        "periodo_actual": periodo_actual,
        "duracion_cuarto": stats.get("duracion_cuarto", default_clock),
        "tiempo_restante": stats.get("tiempo_restante", default_clock),
        "reloj_tiro": stats.get("reloj_tiro", 24),
        "flecha_posesion": stats.get("flecha_posesion", "local"),  # 'local' | 'visitante'
        "en_alargue": stats.get("en_alargue", False),
        "numero_alargue": stats.get("numero_alargue", 0),
        "limite_faltas_bonus": stats.get("limite_faltas_bonus", 5),  # 5ta falta = bonus
        "limite_faltas_jugador": stats.get("limite_faltas_jugador", 5 if reglamento == "FIBA" else 6),
        "local": local_data,
        "visitante": visitante_data,
        "eventos_log": stats.get("eventos_log", []),
        "ganador_lado": stats.get("ganador_lado", None),
        "metodo_victoria": stats.get("metodo_victoria", None)
    }


# ============================================================
# 3. ENDPOINTS DE LA API DE BALONCESTO
# ============================================================

@router.get("/partidos/{match_id}/estadisticas")
async def obtener_estadisticas_baloncesto(match_id: str, session: AsyncSession = Depends(get_session)):
    """Obtiene el estado completo y estadísticas del partido de baloncesto."""
    q = text("SELECT id, goles_local, goles_visitante, estado, estadisticas, equipo_local_id, equipo_visitante_id FROM torneos.partidos WHERE id = :id")
    res = await session.execute(q, {"id": match_id})
    row = res.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Partido no encontrado")

    stats = normalizar_estadisticas_baloncesto(row.estadisticas, row.goles_local or 0, row.goles_visitante or 0)
    return {
        "partido_id": match_id,
        "estado": row.estado,
        "goles_local": row.goles_local or 0,
        "goles_visitante": row.goles_visitante or 0,
        "estadisticas": stats
    }


@router.post("/partidos/{match_id}/evento")
async def registrar_evento_baloncesto(
    match_id: str,
    action: BasketballAction,
    session: AsyncSession = Depends(get_session)
):
    """
    Registra eventos en vivo del partido de baloncesto:
    - Tiros libres (+1 pt), Dobles (+2 pts), Triples (+3 pts) y sus correcciones.
    - Faltas de equipo y personales con cálculo automático de BONUS / PENALTY (5ta falta).
    - Tiempos muertos (Timeouts).
    - Cambios de período y actualización de la flecha de posesión.
    """
    q_partido = text("SELECT id, goles_local, goles_visitante, estado, estadisticas, equipo_local_id, equipo_visitante_id FROM torneos.partidos WHERE id = :id")
    res_partido = await session.execute(q_partido, {"id": match_id})
    row = res_partido.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Partido no encontrado")

    lado = action.equipo.lower()
    if lado not in ['local', 'visitante']:
        raise HTTPException(status_code=400, detail="Equipo inválido. Debe ser 'local' o 'visitante'")

    rival_lado = 'visitante' if lado == 'local' else 'local'
    stats = normalizar_estadisticas_baloncesto(row.estadisticas, row.goles_local or 0, row.goles_visitante or 0)

    periodo = action.periodo or stats["periodo_actual"]
    reglamento = stats["reglamento"]
    limite_bonus = stats["limite_faltas_bonus"]
    mensaje_retorno = ""

    # 1. PUNTUACIÓN (TIROS LIBRES, DOBLES, TRIPLES)
    if action.accion in ['tiro_libre', 'doble', 'triple']:
        puntos_accion = 1 if action.accion == 'tiro_libre' else (2 if action.accion == 'doble' else 3)
        # Soporta sumas o correcciones de puntos negativos
        delta_puntos = puntos_accion * action.valor

        # Actualizar total del equipo
        puntos_actuales = stats[lado]["puntos"]
        nuevos_puntos = max(0, puntos_actuales + delta_puntos)
        stats[lado]["puntos"] = nuevos_puntos

        # Actualizar conteo de tipo de tiro
        campo_tiro = "tiros_libres" if action.accion == 'tiro_libre' else ("dobles" if action.accion == 'doble' else "triples")
        stats[lado][campo_tiro] = max(0, stats[lado].get(campo_tiro, 0) + action.valor)

        # Actualizar puntos del período
        periodo_key = "OT" if periodo.startswith("OT") else periodo
        stats[lado]["puntos_por_cuarto"][periodo_key] = max(
            0, stats[lado]["puntos_por_cuarto"].get(periodo_key, 0) + delta_puntos
        )

        nombre_accion = "Tiro Libre (+1)" if action.accion == 'tiro_libre' else ("Doble (+2)" if action.accion == 'doble' else "Triple (+3)")
        signo = "+" if action.valor > 0 else "-"
        mensaje_retorno = f"🏀 {signo}{abs(delta_puntos)} pt(s) [{nombre_accion}] para {lado.upper()} ({nuevos_puntos} pts)."

    # 2. FALTAS (PERSONALES, TÉCNICAS, ANTIDEPORTIVAS, DESCALIFICANTES)
    elif action.accion in ['falta_personal', 'falta_tecnica', 'falta_antideportiva', 'falta_descalificante']:
        delta_falta = action.valor
        faltas_periodo = max(0, stats[lado]["faltas_periodo"] + delta_falta)
        stats[lado]["faltas_periodo"] = faltas_periodo
        stats[lado]["faltas_totales"] = max(0, stats[lado]["faltas_totales"] + delta_falta)

        if action.accion == 'falta_tecnica':
            stats[lado]["faltas_tecnicas"] = max(0, stats[lado]["faltas_tecnicas"] + delta_falta)
        elif action.accion in ['falta_antideportiva', 'falta_descalificante']:
            stats[lado]["faltas_antideportivas"] = max(0, stats[lado]["faltas_antideportivas"] + delta_falta)

        # Evaluar situación de BONUS (5ta falta colectiva en el cuarto según FIBA y NBA)
        en_bonus = faltas_periodo >= limite_bonus
        stats[lado]["en_bonus"] = en_bonus

        tipo_falta_txt = {
            'falta_personal': 'Personal',
            'falta_tecnica': 'Técnica (T)',
            'falta_antideportiva': 'Antideportiva / Flagrante (U)',
            'falta_descalificante': 'Descalificante (D)'
        }.get(action.accion, 'Falta')

        if en_bonus and delta_falta > 0:
            mensaje_retorno = f"⚠️ Falta {tipo_falta_txt} de {lado.upper()}. ¡EQUIPO EN SITUACIÓN DE BONUS! ({faltas_periodo} faltas). Tiros libres automáticos concedidos al rival."
        else:
            mensaje_retorno = f"Falta {tipo_falta_txt} registrada para {lado.upper()} ({faltas_periodo}/{limite_bonus} en {periodo})."

    # 3. TIEMPOS MUERTOS (TIMEOUTS)
    elif action.accion == 'tiempo_muerto':
        delta_tm = action.valor
        tm_usados = max(0, stats[lado]["tiempos_muertos"] + delta_tm)
        tm_restantes = max(0, stats[lado]["tiempos_muertos_restantes"] - delta_tm)
        stats[lado]["tiempos_muertos"] = tm_usados
        stats[lado]["tiempos_muertos_restantes"] = tm_restantes
        mensaje_retorno = f"⏱️ Tiempo Muerto solicitado por {lado.upper()} (Restantes: {tm_restantes})."

    # 4. CAMBIO DE PERÍODO (Q1, Q2, Q3, Q4, OT1, OT2)
    elif action.accion == 'cambiar_periodo':
        nuevo_periodo = action.periodo or "Q1"
        stats["periodo_actual"] = nuevo_periodo

        # Al cambiar de cuarto regular (Q1->Q2, Q2->Q3, Q3->Q4), las faltas del cuarto se reinician a 0 (Regla FIBA/NBA)
        # Nota: En los alargues (OT), las faltas del 4º cuarto se acumulan o se reinician según convención, usualmente cada OT mantiene bonus
        if not nuevo_periodo.startswith("OT"):
            stats["local"]["faltas_periodo"] = 0
            stats["local"]["en_bonus"] = False
            stats["visitante"]["faltas_periodo"] = 0
            stats["visitante"]["en_bonus"] = False

        # Resetear tiempo restante al default del cuarto
        if nuevo_periodo.startswith("OT"):
            stats["tiempo_restante"] = 300  # 5 minutos para alargue
            stats["en_alargue"] = True
        else:
            stats["tiempo_restante"] = stats["duracion_cuarto"]

        stats["reloj_tiro"] = 24
        mensaje_retorno = f"🔔 Inicio del período {nuevo_periodo}. Faltas de equipo y cronómetro actualizados."

    # 5. FLECHA DE POSESIÓN ALTERNA
    elif action.accion == 'flecha_posesion':
        nueva_posesion = rival_lado if stats.get("flecha_posesion") == lado else lado
        stats["flecha_posesion"] = nueva_posesion
        mensaje_retorno = f"🔄 Flecha de posesión alterna apunta hacia: {nueva_posesion.upper()}."

    # Registrar evento en el historial del partido
    log_entry = {
        "tiempo": action.minuto_segundo or "00:00",
        "periodo": periodo,
        "equipo": lado,
        "accion": action.accion,
        "valor": action.valor,
        "marcador": f"{stats['local']['puntos']} - {stats['visitante']['puntos']}",
        "mensaje": mensaje_retorno
    }
    stats.setdefault("eventos_log", []).insert(0, log_entry)
    # Limitar historial a los últimos 60 eventos
    stats["eventos_log"] = stats["eventos_log"][:60]

    # Actualizar base de datos
    pts_local = stats["local"]["puntos"]
    pts_visitante = stats["visitante"]["puntos"]

    q_update = text("""
        UPDATE torneos.partidos
        SET goles_local = :pts_loc,
            goles_visitante = :pts_vis,
            estadisticas = :stats,
            estado = 'en_curso'
        WHERE id = :id
    """)
    await session.execute(q_update, {
        "pts_loc": pts_local,
        "pts_vis": pts_visitante,
        "stats": json.dumps(stats),
        "id": match_id
    })
    await session.commit()

    return {
        "status": "success",
        "message": mensaje_retorno,
        "estadisticas": stats
    }


@router.post("/partidos/{match_id}/ajustar-tiempo")
async def ajustar_tiempo_cronometro(
    match_id: str,
    adj: TimeAdjustment,
    session: AsyncSession = Depends(get_session)
):
    """
    Ajusta el cronómetro del partido:
    - Suma o DISMINUYE segundos (útil cuando el árbitro pitó y el reloj corrió de más).
    - Permite establecer un tiempo absoluto exacto en segundos.
    - Ajusta el reloj de tiro (24s / 14s).
    """
    q = text("SELECT estadisticas FROM torneos.partidos WHERE id = :id")
    res = await session.execute(q, {"id": match_id})
    row = res.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Partido no encontrado")

    stats = normalizar_estadisticas_baloncesto(row.estadisticas)

    tiempo_anterior = stats.get("tiempo_restante", 600)
    if adj.tiempo_absoluto is not None:
        nuevo_tiempo = max(0, adj.tiempo_absoluto)
    else:
        nuevo_tiempo = max(0, tiempo_anterior + (adj.segundos_delta or 0))

    stats["tiempo_restante"] = nuevo_tiempo
    if adj.periodo:
        stats["periodo_actual"] = adj.periodo
    if adj.reloj_tiro_segundos is not None:
        stats["reloj_tiro"] = max(0, adj.reloj_tiro_segundos)

    q_up = text("UPDATE torneos.partidos SET estadisticas = :stats WHERE id = :id")
    await session.execute(q_up, {"stats": json.dumps(stats), "id": match_id})
    await session.commit()

    diff = nuevo_tiempo - tiempo_anterior
    msg = f"⏱️ Cronómetro ajustado: {diff:+d}s (Ahora: {nuevo_tiempo // 60:02d}:{nuevo_tiempo % 60:02d})"
    return {
        "status": "success",
        "message": msg,
        "tiempo_restante": nuevo_tiempo,
        "reloj_tiro": stats.get("reloj_tiro", 24)
    }


@router.post("/partidos/{match_id}/alargue")
async def iniciar_alargue_baloncesto(
    match_id: str,
    req: OvertimeRequest,
    session: AsyncSession = Depends(get_session)
):
    """
    Inicia una prórroga / alargue (Overtime - OT) oficial de baloncesto:
    - Valida que el partido se encuentre empatado según las reglas de FIBA y NBA.
    - Asigna 5 minutos reglamentarios (300 segundos) de juego.
    - Incrementa el contador de OT (OT1, OT2, etc.).
    - Asigna 1 tiempo muerto adicional por prórroga por equipo según FIBA.
    """
    q = text("SELECT goles_local, goles_visitante, estadisticas, equipo_local_id, equipo_visitante_id FROM torneos.partidos WHERE id = :id")
    res = await session.execute(q, {"id": match_id})
    row = res.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Partido no encontrado")

    pts_loc = row.goles_local or 0
    pts_vis = row.goles_visitante or 0

    if pts_loc != pts_vis:
        raise HTTPException(
            status_code=400,
            detail=f"No se puede iniciar alargue con marcador desigual ({pts_loc} vs {pts_vis}). El baloncesto solo permite prórroga en caso de empate estricto."
        )

    stats = normalizar_estadisticas_baloncesto(row.estadisticas, pts_loc, pts_vis)

    num_alargue = stats.get("numero_alargue", 0) + 1
    nuevo_periodo = f"OT{num_alargue}"

    stats["en_alargue"] = True
    stats["numero_alargue"] = num_alargue
    stats["periodo_actual"] = nuevo_periodo
    stats["tiempo_restante"] = req.duracion_segundos  # 300 segundos = 5 minutos
    stats["reloj_tiro"] = 24

    # En FIBA y NBA, cada equipo recibe 1 tiempo muerto adicional en cada tiempo extra
    stats["local"]["tiempos_muertos_restantes"] = stats["local"].get("tiempos_muertos_restantes", 0) + 1
    stats["visitante"]["tiempos_muertos_restantes"] = stats["visitante"].get("tiempos_muertos_restantes", 0) + 1

    msg = f"🔥 ¡PRÓRROGA {nuevo_periodo} INICIADA! Empate en {pts_loc} puntos. Duración: {req.duracion_segundos // 60} minutos. +1 Tiempo Muerto concedido a cada equipo."

    # Registrar en eventos log
    stats.setdefault("eventos_log", []).insert(0, {
        "tiempo": "05:00",
        "periodo": nuevo_periodo,
        "equipo": "general",
        "accion": "inicio_alargue",
        "valor": 1,
        "marcador": f"{pts_loc} - {pts_vis}",
        "mensaje": msg
    })

    q_up = text("UPDATE torneos.partidos SET estadisticas = :stats, estado = 'en_curso' WHERE id = :id")
    await session.execute(q_up, {"stats": json.dumps(stats), "id": match_id})
    await session.commit()

    return {
        "status": "success",
        "message": msg,
        "periodo": nuevo_periodo,
        "tiempo_restante": req.duracion_segundos,
        "estadisticas": stats
    }
