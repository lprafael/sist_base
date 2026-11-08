"""
routers/video_review.py
Módulo de Video Review / Video Replay para combates de artes marciales.
Compatible con reglamentos WKF (Kumite) y ASAM (MMA).

Flujo:
  1. Coach aprieta botón de VR en la mesa arbitral
     → POST /api/vr/combates/{match_id}/solicitar
     → El sistema pausa el crono y broadcastea VR_SOLICITADO a todas las pantallas
  2. El Juez VR revisa el clip y emite veredicto
     → POST /api/vr/combates/{match_id}/resolver
     → El sistema aplica puntos / descuenta tarjeta / mantiene tarjeta (MIENAI)
     → Broadcastea VR_RESUELTO + SCORE_UPDATE (la mesa reanuda el crono con "Hajime")
  3. Pantalla de Tatami y árbitro de mesa reciben el update por WebSocket
  4. (Opcional) La mesa puede cancelar un VR colgado
     → POST /api/vr/combates/{match_id}/cancelar

Reglas de negocio:
  - ACEPTADO  → Coach conserva VR card + puntos aplicados
  - RECHAZADO → Coach pierde VR card para el resto del combate
  - MIENAI    → Coach conserva VR card (ángulo bloqueado / falla técnica)
"""

from fastapi import APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect, UploadFile, File, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import Optional
from pydantic import BaseModel
from datetime import datetime
from database import get_session
from security import get_current_user, verify_token
from permisos_torneo import verificar_gestor_partido
from workers.vr_broadcaster import (
    vr_manager,
    evt_vr_solicitado,
    evt_vr_resuelto,
    evt_timer_pause,
    evt_timer_resume,
    evt_score_update,
)

router = APIRouter(prefix="/api/vr", tags=["Video Review"])


# ─── Schemas ──────────────────────────────────────────────────────────────────

class VRSolicitudRequest(BaseModel):
    competidor_color: str           # 'Aka' | 'Ao' | 'Blanco' | 'Rojo'
    tipo_solicitud: str             # 'YUKO' | 'WAZA_ARI' | 'IPPON' | 'SENSHU' | 'OTRO'
    tiempo_cronometro: str          # "1:23" — tiempo al momento del reclamo
    reglamento: str = "WKF"        # 'WKF' | 'ASAM'
    clip_url: Optional[str] = None  # URL del clip de OBS (si ya está disponible)


class VRVeredictoRequest(BaseModel):
    review_id: Optional[int] = None  # Si falta o no existe, se usa el último VR pendiente del combate
    resultado: str          # 'ACEPTADO' | 'RECHAZADO' | 'MIENAI'
    puntos_otorgados: int = 0   # 1=Yuko, 2=Waza-Ari, 3=Ippon, 0=sin puntos
    tecnica: Optional[str] = None   # 'YUKO' | 'WAZA_ARI' | 'IPPON' | 'SENSHU' (elegida por el Juez VR)
    clip_url: Optional[str] = None  # URL del clip guardado (evidencia)


# ─── Constantes / normalizadores ──────────────────────────────────────────────

INT32_MAX = 2_147_483_647
COLORES_VALIDOS = {"aka": "Aka", "ao": "Ao", "blanco": "Blanco", "rojo": "Rojo"}
TIPOS_VALIDOS = ("YUKO", "WAZA_ARI", "IPPON", "SENSHU", "OTRO")
TECNICAS_WKF = {"YUKO": ("yuko", 1), "WAZA_ARI": ("waza_ari", 2), "IPPON": ("ippon", 3), "SENSHU": ("senshu", 0)}
PUNTOS_A_TECNICA = {1: "YUKO", 2: "WAZA_ARI", 3: "IPPON"}


def _norm_color(color: Optional[str]) -> Optional[str]:
    return COLORES_VALIDOS.get((color or "").strip().lower())


def _norm_tipo(tipo: Optional[str]) -> str:
    """Normaliza el tipo de reclamo al CHECK de la tabla (evita errores 500 por valores libres)."""
    t = (tipo or "").strip().upper().replace("-", "_").replace(" ", "_")
    return t if t in TIPOS_VALIDOS else "OTRO"


def _lado(color: str) -> str:
    """Mapea el color de esquina a la estructura que usa la mesa (local/visitante)."""
    return "local" if color in ("Aka", "Blanco") else "visitante"


def _valid_review_id(review_id: Optional[int]) -> Optional[int]:
    """Descarta ids inválidos (p.ej. Date.now() enviado por clientes antiguos)."""
    if review_id is None:
        return None
    try:
        rid = int(review_id)
    except (TypeError, ValueError):
        return None
    return rid if 0 < rid <= INT32_MAX else None


# ─── Auto-reparación de esquema ───────────────────────────────────────────────
# La migración 049 creó partido_id como INTEGER, pero torneos.partidos.id es UUID.
# Esto hacía fallar el INSERT de /solicitar con cualquier combate real, por lo que
# /resolver nunca encontraba el registro (404). Se corrige una vez por proceso.

_schema_ok = False


async def _ensure_schema(session: AsyncSession):
    global _schema_ok
    if _schema_ok:
        return
    try:
        await session.execute(text("""
            CREATE TABLE IF NOT EXISTS torneos.video_reviews (
                id SERIAL PRIMARY KEY,
                partido_id VARCHAR(64) NOT NULL,
                competidor_color VARCHAR(10) NOT NULL,
                tiempo_cronometro VARCHAR(10) NOT NULL,
                tipo_solicitud VARCHAR(20) NOT NULL,
                resultado VARCHAR(20),
                puntos_otorgados INTEGER DEFAULT 0,
                clip_url VARCHAR(255),
                reglamento VARCHAR(10) DEFAULT 'WKF',
                resuelto BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT NOW(),
                resuelto_at TIMESTAMP
            )
        """))
        q = await session.execute(text("""
            SELECT data_type FROM information_schema.columns
            WHERE table_schema = 'torneos' AND table_name = 'video_reviews'
              AND column_name = 'partido_id'
        """))
        dtype = q.scalar()
        if dtype and dtype != "character varying":
            await session.execute(text(
                "ALTER TABLE torneos.video_reviews "
                "ALTER COLUMN partido_id TYPE VARCHAR(64) USING partido_id::text"
            ))
        await session.execute(text(
            "ALTER TABLE torneos.video_reviews ALTER COLUMN clip_url TYPE VARCHAR(512)"
        ))
        await session.commit()
        _schema_ok = True
    except Exception as e:
        await session.rollback()
        print(f"[VR] No se pudo verificar/reparar el esquema de video_reviews: {e}")


# ─── Helper: leer estadísticas del partido ────────────────────────────────────

def _stats_default() -> dict:
    base = {"puntos": 0, "yuko": 0, "waza_ari": 0, "ippon": 0, "senshu": False, "video_review": "ACTIVE"}
    return {"local": dict(base), "visitante": dict(base)}


async def _get_partido_stats(session: AsyncSession, match_id: str) -> dict:
    import json as _json
    stats: dict = {}
    try:
        async with session.begin_nested():
            q = await session.execute(
                text("SELECT estadisticas FROM torneos.partidos WHERE id::text = :id"),
                {"id": str(match_id)}
            )
            row = q.fetchone()
        if row and row[0]:
            stats = row[0]
            if isinstance(stats, str):
                stats = _json.loads(stats)
    except Exception:
        stats = {}
    if not isinstance(stats, dict):
        stats = {}
    # Garantizar estructura local/visitante (la misma que usa la mesa WKF y el marcador)
    defaults = _stats_default()
    for lado in ("local", "visitante"):
        if not isinstance(stats.get(lado), dict):
            stats[lado] = defaults[lado]
    return stats


def _vr_card_bloqueada(stats: dict, color: str) -> bool:
    if stats.get(f"vr_card_{color.lower()}") == "USED_AND_LOCKED":
        return True
    lado = stats.get(_lado(color)) or {}
    return isinstance(lado, dict) and lado.get("video_review") == "USED_AND_LOCKED"


async def _update_partido_stats(session: AsyncSession, match_id: str, stats: dict):
    """Persiste estadísticas + marcador. Usa SAVEPOINT para no abortar la transacción principal."""
    import json as _json
    try:
        async with session.begin_nested():
            await session.execute(
                text("""
                    UPDATE torneos.partidos
                    SET estadisticas = :s,
                        goles_local = :gl,
                        goles_visitante = :gv
                    WHERE id::text = :id
                """),
                {
                    "s": _json.dumps(stats),
                    "gl": int(stats.get("local", {}).get("puntos", 0) or 0),
                    "gv": int(stats.get("visitante", {}).get("puntos", 0) or 0),
                    "id": str(match_id),
                }
            )
    except Exception as e:
        print(f"[VR] No se pudieron actualizar estadísticas del partido {match_id}: {e}")


# ─── 1. WebSocket — Conexión en tiempo real ───────────────────────────────────

@router.websocket("/ws/{match_id}")
async def vr_websocket(match_id: str, websocket: WebSocket):
    """
    Punto de conexión WebSocket para un combate.
    Todos los dispositivos (árbitro, pantalla tatami, juez VR, cámara) se conectan aquí.
    URL: ws://<host>/api/vr/ws/{match_id}
    """
    # Cualquiera puede escuchar (Marcador TV público); solo una sesión válida
    # (?token=<JWT>) puede emitir eventos que se retransmiten al resto de pantallas.
    puede_emitir = False
    token = websocket.query_params.get("token")
    if token:
        try:
            usuario = verify_token(token)
            from database import SessionLocal
            async with SessionLocal() as s_ws:
                await verificar_gestor_partido(s_ws, match_id, usuario)
            puede_emitir = True
        except Exception:
            puede_emitir = False
    await vr_manager.connect(match_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
                continue
            if not puede_emitir:
                continue

            # Reenviar eventos entre clientes conectados (mesa arbitral, marcador público, juez VR)
            try:
                import json as _json
                msg = _json.loads(data)
                if isinstance(msg, dict):
                    if "match_id" not in msg:
                        msg["match_id"] = match_id
                    await vr_manager.broadcast(match_id, msg)
            except Exception:
                pass
    except WebSocketDisconnect:
        vr_manager.disconnect(match_id, websocket)


@router.post("/combates/{match_id}/broadcast")
async def broadcast_evento(match_id: str, payload: dict, current_user: dict = Depends(get_current_user),
                          session: AsyncSession = Depends(get_session)):
    """
    Reenvía un evento JSON a todos los clientes WebSocket conectados a este combate.
    Permite sincronización inmediata por HTTP.
    """
    await verificar_gestor_partido(session, match_id, current_user)
    if "match_id" not in payload:
        payload["match_id"] = match_id
    await vr_manager.broadcast(match_id, payload)
    return {"ok": True, "clients": vr_manager.client_count(match_id)}



# ─── 2. Solicitar Video Review ────────────────────────────────────────────────

@router.post("/combates/{match_id}/solicitar")
async def solicitar_video_review(
    match_id: str,
    body: VRSolicitudRequest,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    """
    El coach de una esquina solicita revisión de video.
    Valida que tenga VR card disponible, crea el registro y broadcastea la pausa.
    """
    await verificar_gestor_partido(session, match_id, current_user)
    color = _norm_color(body.competidor_color)
    if not color:
        raise HTTPException(status_code=400, detail="competidor_color inválido (Aka, Ao, Blanco o Rojo)")
    tipo = _norm_tipo(body.tipo_solicitud)
    reglamento = "ASAM" if (body.reglamento or "").upper() == "ASAM" else "WKF"

    await _ensure_schema(session)

    # Verificar VR card disponible
    stats = await _get_partido_stats(session, match_id)
    vr_card_estado = "USED_AND_LOCKED" if _vr_card_bloqueada(stats, color) else "ACTIVE"

    if vr_card_estado == "USED_AND_LOCKED":
        raise HTTPException(
            status_code=409,
            detail=f"El coach de {color} ya no tiene derecho a Video Review en este combate."
        )

    # Verificar que no haya ya un VR activo para este partido
    existing = await session.execute(
        text("""
            SELECT id FROM torneos.video_reviews
            WHERE partido_id::text = :pid AND resuelto = FALSE
        """),
        {"pid": str(match_id)}
    )
    if existing.fetchone():
        raise HTTPException(
            status_code=409,
            detail="Ya hay un Video Review activo para este combate."
        )

    # Insertar registro
    result = await session.execute(
        text("""
            INSERT INTO torneos.video_reviews
                (partido_id, competidor_color, tiempo_cronometro, tipo_solicitud,
                 reglamento, clip_url, resuelto, created_at)
            VALUES (:pid, :color, :tiempo, :tipo, :regl, :clip, FALSE, NOW())
            RETURNING id
        """),
        {
            "pid": str(match_id),
            "color": color,
            "tiempo": (body.tiempo_cronometro or "--:--")[:10],
            "tipo": tipo,
            "regl": reglamento,
            "clip": body.clip_url,
        }
    )
    review_id = result.scalar()
    await session.commit()

    # Broadcast: pausa cronómetro + banner VR en todas las pantallas
    await vr_manager.broadcast(match_id, evt_timer_pause(match_id))
    evento = evt_vr_solicitado(
        match_id=match_id,
        competidor_color=color,
        tipo_solicitud=tipo,
        tiempo_cronometro=body.tiempo_cronometro,
        review_id=review_id,
    )
    evento["reglamento"] = reglamento
    await vr_manager.broadcast(match_id, evento)

    return {
        "ok": True,
        "review_id": review_id,
        "mensaje": f"Video Review solicitado por {color}. Cronómetro pausado.",
        "vr_card_estado": vr_card_estado,
    }


# ─── 3. Emitir Veredicto ──────────────────────────────────────────────────────

@router.post("/combates/{match_id}/resolver")
async def resolver_video_review(
    match_id: str,
    body: VRVeredictoRequest,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    """
    El Juez VR emite su veredicto sobre la solicitud de revisión.
    Aplica la regla de tarjeta y suma puntos si es ACEPTADO.
    Si el review_id no llega o no es válido, se resuelve el último VR pendiente del combate.
    """
    await verificar_gestor_partido(session, match_id, current_user)
    resultado = (body.resultado or "").strip().upper()
    if resultado not in ("ACEPTADO", "RECHAZADO", "MIENAI"):
        raise HTTPException(status_code=400, detail="resultado inválido (ACEPTADO, RECHAZADO o MIENAI)")

    await _ensure_schema(session)

    # Buscar el VR: primero por id exacto, luego el último pendiente del combate
    vr_row = None
    rid = _valid_review_id(body.review_id)
    if rid:
        q = await session.execute(
            text("""
                SELECT id, competidor_color, tipo_solicitud, reglamento
                FROM torneos.video_reviews
                WHERE id = :rid AND partido_id::text = :pid AND resuelto = FALSE
            """),
            {"rid": rid, "pid": str(match_id)}
        )
        vr_row = q.fetchone()
    if not vr_row:
        q = await session.execute(
            text("""
                SELECT id, competidor_color, tipo_solicitud, reglamento
                FROM torneos.video_reviews
                WHERE partido_id::text = :pid AND resuelto = FALSE
                ORDER BY created_at DESC LIMIT 1
            """),
            {"pid": str(match_id)}
        )
        vr_row = q.fetchone()
    if not vr_row:
        raise HTTPException(
            status_code=404,
            detail=(
                f"No hay un Video Review pendiente para el combate {match_id}. "
                "Verifique que la mesa haya solicitado el VR y que el Juez VR esté conectado al mismo combate."
            ),
        )

    review_id, color, tipo_solicitud, reglamento = vr_row
    color = _norm_color(color) or color

    stats = await _get_partido_stats(session, match_id)
    lado = _lado(color)
    rival = "visitante" if lado == "local" else "local"
    vr_key = f"vr_card_{color.lower()}"
    puntos_aplicados = 0
    tecnica_aplicada: Optional[str] = None

    if resultado == "ACEPTADO":
        # Conserva tarjeta + aplica puntos
        if reglamento == "ASAM":
            stats[lado]["puntos"] = int(stats[lado].get("puntos", 0) or 0) + 1
            puntos_aplicados = 1
            tecnica_aplicada = "PUNTO"
        else:
            # La técnica la decide el Juez VR (botón presionado); si no llega se infiere
            tecnica = (body.tecnica or "").strip().upper().replace("-", "_")
            if tecnica not in TECNICAS_WKF:
                tecnica = PUNTOS_A_TECNICA.get(body.puntos_otorgados) or (
                    tipo_solicitud if tipo_solicitud in TECNICAS_WKF else "YUKO"
                )
            campo, pts = TECNICAS_WKF[tecnica]
            tecnica_aplicada = tecnica
            if campo == "senshu":
                stats[lado]["senshu"] = True
                stats[rival]["senshu"] = False  # Quitar Senshu del rival
            else:
                stats[lado][campo] = int(stats[lado].get(campo, 0) or 0) + 1
                stats[lado]["puntos"] = int(stats[lado].get("puntos", 0) or 0) + pts
                puntos_aplicados = pts

    elif resultado == "RECHAZADO":
        # Pierde la tarjeta
        stats[vr_key] = "USED_AND_LOCKED"
        stats[lado]["video_review"] = "USED_AND_LOCKED"

    # MIENAI → no se toca la tarjeta

    # Actualizar estadísticas del partido
    await _update_partido_stats(session, match_id, stats)

    # Marcar VR como resuelto
    await session.execute(
        text("""
            UPDATE torneos.video_reviews
            SET resultado = :res,
                puntos_otorgados = :pts,
                clip_url = COALESCE(:clip, clip_url),
                resuelto = TRUE,
                resuelto_at = NOW()
            WHERE id = :rid
        """),
        {
            "res": resultado,
            "pts": puntos_aplicados,
            "clip": body.clip_url,
            "rid": review_id,
        }
    )
    await session.commit()

    # Broadcast: resultado + score update. El crono queda pausado: la mesa lo
    # reanuda manualmente (Tsuzukete Hajime) para que mesa y marcador no se desincronicen.
    evento = evt_vr_resuelto(
        match_id=match_id,
        review_id=review_id,
        resultado=resultado,
        competidor_color=color,
        puntos_otorgados=puntos_aplicados,
        tipo_solicitud=tipo_solicitud,
    )
    evento["tecnica"] = tecnica_aplicada
    await vr_manager.broadcast(match_id, evento)
    await vr_manager.broadcast(match_id, evt_score_update(match_id, stats))

    return {
        "ok": True,
        "review_id": review_id,
        "resultado": resultado,
        "tecnica": tecnica_aplicada,
        "puntos_aplicados": puntos_aplicados,
        "vr_card": stats.get(vr_key, "ACTIVE"),
        "mensaje": f"VR resuelto: {resultado}. Puntos aplicados: {puntos_aplicados}.",
    }


# ─── 3b. Cancelar VR pendiente (VR colgado / solicitado por error) ────────────

@router.post("/combates/{match_id}/cancelar")
async def cancelar_video_review(
    match_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    """Cierra los VR pendientes del combate sin aplicar puntos ni tocar tarjetas."""
    await verificar_gestor_partido(session, match_id, current_user)
    await _ensure_schema(session)
    res = await session.execute(
        text("""
            UPDATE torneos.video_reviews
            SET resuelto = TRUE, resuelto_at = NOW()
            WHERE partido_id::text = :pid AND resuelto = FALSE
            RETURNING id
        """),
        {"pid": str(match_id)}
    )
    ids = [r[0] for r in res.fetchall()]
    await session.commit()
    for rid in ids:
        await vr_manager.broadcast(match_id, {
            "event": "VR_RESUELTO",
            "match_id": match_id,
            "review_id": rid,
            "resultado": "CANCELADO",
            "puntos_otorgados": 0,
        })
    return {"ok": True, "cancelados": ids}


# ─── 4. Estado actual del VR del partido ─────────────────────────────────────

@router.get("/combates/{match_id}/estado")
async def estado_video_review(
    match_id: str,
    session: AsyncSession = Depends(get_session)
):
    """Devuelve el estado del VR activo (si existe) para un partido."""
    await _ensure_schema(session)
    q = await session.execute(
        text("""
            SELECT id, competidor_color, tipo_solicitud, tiempo_cronometro,
                   reglamento, clip_url, created_at
            FROM torneos.video_reviews
            WHERE partido_id::text = :pid AND resuelto = FALSE
            ORDER BY created_at DESC LIMIT 1
        """),
        {"pid": str(match_id)}
    )
    row = q.fetchone()
    if not row:
        return {"activo": False, "review": None}

    return {
        "activo": True,
        "review": {
            "id": row[0],
            "competidor_color": row[1],
            "tipo_solicitud": row[2],
            "tiempo_cronometro": row[3],
            "reglamento": row[4],
            "clip_url": row[5],
            "created_at": str(row[6]),
        }
    }


# ─── 5. Historial de VR del partido ──────────────────────────────────────────

@router.get("/combates/{match_id}/historial")
async def historial_video_review(
    match_id: str,
    session: AsyncSession = Depends(get_session)
):
    """Lista todos los Video Reviews registrados en el combate."""
    await _ensure_schema(session)
    q = await session.execute(
        text("""
            SELECT id, competidor_color, tipo_solicitud, resultado,
                   puntos_otorgados, tiempo_cronometro, reglamento,
                   clip_url, created_at, resuelto_at
            FROM torneos.video_reviews
            WHERE partido_id::text = :pid
            ORDER BY created_at ASC
        """),
        {"pid": str(match_id)}
    )
    rows = q.fetchall()
    return {
        "partido_id": match_id,
        "total": len(rows),
        "reviews": [
            {
                "id": r[0],
                "competidor_color": r[1],
                "tipo_solicitud": r[2],
                "resultado": r[3],
                "puntos_otorgados": r[4],
                "tiempo_cronometro": r[5],
                "reglamento": r[6],
                "clip_url": r[7],
                "created_at": str(r[8]),
                "resuelto_at": str(r[9]) if r[9] else None,
            }
            for r in rows
        ]
    }


# ─── 6. Actualizar URL de clip (desde OBS) ───────────────────────────────────

@router.patch("/combates/{match_id}/clip/{review_id}")
async def actualizar_clip_url(
    match_id: str,
    review_id: int,
    clip_url: str,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    """
    OBS notifica la ruta del clip guardado.
    El frontend llama a este endpoint tras recibir el evento ReplayBufferSaved de OBS.
    """
    await verificar_gestor_partido(session, match_id, current_user)
    await _ensure_schema(session)
    rid = _valid_review_id(review_id)
    if rid:
        await session.execute(
            text("""
                UPDATE torneos.video_reviews
                SET clip_url = :url
                WHERE id = :rid AND partido_id::text = :pid
            """),
            {"url": clip_url, "rid": rid, "pid": str(match_id)}
        )
    else:
        await session.execute(
            text("""
                UPDATE torneos.video_reviews
                SET clip_url = :url
                WHERE id = (
                    SELECT id FROM torneos.video_reviews
                    WHERE partido_id::text = :pid AND resuelto = FALSE
                    ORDER BY created_at DESC LIMIT 1
                )
            """),
            {"url": clip_url, "pid": str(match_id)}
        )
    await session.commit()

    # Notificar al panel VR que el clip está listo
    await vr_manager.broadcast(match_id, {
        "event": "CLIP_DISPONIBLE",
        "match_id": match_id,
        "review_id": review_id,
        "clip_url": clip_url,
    })
    return {"ok": True, "clip_url": clip_url}


# ─── 7. Subir Clip desde la Cámara Web Nativa (Sin OBS) ───────────────────────

@router.post("/combates/{match_id}/subir-clip")
async def subir_clip_web(
    match_id: str,
    request: Request,
    file: UploadFile = File(...),
    review_id: Optional[int] = None,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    """
    Recibe el clip de video generado por el navegador (WebM o MP4) desde la pantalla de cámara nativa.
    Guarda el archivo en el directorio de clips, actualiza el registro en DB y notifica al Juez VR.
    """
    await verificar_gestor_partido(session, match_id, current_user)
    import os
    import shutil
    from pathlib import Path

    await _ensure_schema(session)
    clean_rid = _valid_review_id(review_id)

    # Si no se provee review_id válido, buscar el último VR activo/no resuelto para este combate
    target_rid: Optional[int] = clean_rid
    if not target_rid:
        q = await session.execute(
            text("""
                SELECT id FROM torneos.video_reviews
                WHERE partido_id::text = :pid AND resuelto = FALSE
                ORDER BY created_at DESC LIMIT 1
            """),
            {"pid": str(match_id)}
        )
        row = q.fetchone()
        if row:
            target_rid = row[0]
        else:
            q2 = await session.execute(
                text("""
                    SELECT id FROM torneos.video_reviews
                    WHERE partido_id::text = :pid
                    ORDER BY created_at DESC LIMIT 1
                """),
                {"pid": str(match_id)}
            )
            row2 = q2.fetchone()
            target_rid = row2[0] if row2 else None

    clips_dir = os.getenv("OBS_CLIPS_DIR", "C:/Users/Public/Videos/OBS_Replays" if os.name == "nt" else "/app/clips")
    os.makedirs(clips_dir, exist_ok=True)

    ext = Path(file.filename).suffix if file.filename else ".webm"
    if not ext:
        ext = ".webm"
    rid_label = str(target_rid) if target_rid else "preview"
    filename = f"replay_{match_id}_{rid_label}_{int(datetime.now().timestamp())}{ext}"
    filepath = os.path.join(clips_dir, filename)

    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    host = request.headers.get("x-forwarded-host") or request.headers.get("host") or ""
    proto = request.headers.get("x-forwarded-proto") or "https"
    if "micancha.com.py" in host:
        backend_url = "https://api.micancha.com.py"
    elif host and "backend" not in host:
        backend_url = f"{proto}://{host}"
    elif os.getenv("NEXT_PUBLIC_API_URL"):
        backend_url = os.getenv("NEXT_PUBLIC_API_URL")
    elif os.name != "nt":
        backend_url = "https://api.micancha.com.py"
    else:
        backend_url = "http://localhost:8001"
    clip_url = f"{backend_url}/clips/{filename}"

    if target_rid:
        await session.execute(
            text("""
                UPDATE torneos.video_reviews
                SET clip_url = :url
                WHERE id = :rid
            """),
            {"url": clip_url, "rid": target_rid}
        )
        await session.commit()

    # Notificar al panel VR que el clip está listo
    await vr_manager.broadcast(match_id, {
        "event": "CLIP_DISPONIBLE",
        "match_id": match_id,
        "review_id": target_rid,
        "clip_url": clip_url,
    })

    return {
        "ok": True,
        "clip_url": clip_url,
        "filename": filename,
        "review_id": target_rid,
        "mensaje": "Clip subido y notificado al panel VR exitosamente."
    }

