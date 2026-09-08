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
     → Broadcastea VR_RESUELTO y reanuda el crono
  3. Pantalla de Tatami y árbitro de mesa reciben el update por WebSocket

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
    review_id: int
    resultado: str          # 'ACEPTADO' | 'RECHAZADO' | 'MIENAI'
    puntos_otorgados: int = 0   # 1=Yuko, 2=Waza-Ari, 3=Ippon, 0=sin puntos
    clip_url: Optional[str] = None  # URL del clip guardado (evidencia)


# ─── Helper: leer estadísticas del partido ────────────────────────────────────

async def _get_partido_stats(session: AsyncSession, match_id: str) -> dict:
    try:
        q = await session.execute(
            text("SELECT estadisticas FROM torneos.partidos WHERE id::text = :id"),
            {"id": str(match_id)}
        )
        row = q.fetchone()
        if row and row[0]:
            import json as _json
            stats = row[0]
            if isinstance(stats, str):
                stats = _json.loads(stats)
            return stats or {}
    except Exception:
        pass
    # Fallback para pruebas rápidas / demo si el partido no está en DB
    return {
        "aka": {"puntos": 0, "yuko": 0, "waza_ari": 0, "ippon": 0, "senshu": False},
        "ao": {"puntos": 0, "yuko": 0, "waza_ari": 0, "ippon": 0, "senshu": False},
        "blanco": {"puntos": 0},
        "rojo": {"puntos": 0},
        "vr_card_aka": "ACTIVE",
        "vr_card_ao": "ACTIVE",
        "vr_card_blanco": "ACTIVE",
        "vr_card_rojo": "ACTIVE",
    }


async def _update_partido_stats(session: AsyncSession, match_id: str, stats: dict):
    import json as _json
    try:
        await session.execute(
            text("UPDATE torneos.partidos SET estadisticas = :s WHERE id::text = :id"),
            {"s": _json.dumps(stats), "id": str(match_id)}
        )
    except Exception:
        pass


# ─── 1. WebSocket — Conexión en tiempo real ───────────────────────────────────

@router.websocket("/ws/{match_id}")
async def vr_websocket(match_id: str, websocket: WebSocket):
    """
    Punto de conexión WebSocket para un combate.
    Todos los dispositivos (árbitro, pantalla tatami, juez VR) se conectan aquí.
    URL: ws://<host>/api/vr/ws/{match_id}
    """
    await vr_manager.connect(match_id, websocket)
    try:
        while True:
            # Mantenemos la conexión viva; los clientes pueden enviar pings
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        vr_manager.disconnect(match_id, websocket)


# ─── 2. Solicitar Video Review ────────────────────────────────────────────────

@router.post("/combates/{match_id}/solicitar")
async def solicitar_video_review(
    match_id: str,
    body: VRSolicitudRequest,
    session: AsyncSession = Depends(get_session)
):
    """
    El coach de una esquina solicita revisión de video.
    Valida que tenga VR card disponible, crea el registro y broadcastea la pausa.
    """
    color = body.competidor_color
    if color not in ("Aka", "Ao", "Blanco", "Rojo"):
        raise HTTPException(status_code=400, detail="competidor_color inválido")

    # Verificar VR card disponible
    stats = await _get_partido_stats(session, match_id)
    vr_key = f"vr_card_{color.lower()}"
    vr_card_estado = stats.get(vr_key, "ACTIVE")

    if vr_card_estado == "USED_AND_LOCKED":
        raise HTTPException(
            status_code=409,
            detail=f"El coach de {color} ya no tiene derecho a Video Review en este combate."
        )

    # Verificar que no haya ya un VR activo para este partido
    existing = await session.execute(
        text("""
            SELECT id FROM torneos.video_reviews
            WHERE partido_id = :pid AND resuelto = FALSE
        """),
        {"pid": match_id}
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
            "pid": match_id,
            "color": color,
            "tiempo": body.tiempo_cronometro,
            "tipo": body.tipo_solicitud,
            "regl": body.reglamento,
            "clip": body.clip_url,
        }
    )
    review_id = result.scalar()
    await session.commit()

    # Broadcast: pausa cronómetro + banner VR en todas las pantallas
    await vr_manager.broadcast(match_id, evt_timer_pause(match_id))
    await vr_manager.broadcast(
        match_id,
        evt_vr_solicitado(
            match_id=match_id,
            competidor_color=color,
            tipo_solicitud=body.tipo_solicitud,
            tiempo_cronometro=body.tiempo_cronometro,
            review_id=review_id,
        )
    )

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
    session: AsyncSession = Depends(get_session)
):
    """
    El Juez VR emite su veredicto sobre la solicitud de revisión.
    Aplica la regla de tarjeta y suma puntos si es ACEPTADO.
    """
    if body.resultado not in ("ACEPTADO", "RECHAZADO", "MIENAI"):
        raise HTTPException(status_code=400, detail="resultado inválido")

    # Buscar el VR
    q = await session.execute(
        text("""
            SELECT id, competidor_color, tipo_solicitud, reglamento
            FROM torneos.video_reviews
            WHERE id = :rid AND partido_id = :pid AND resuelto = FALSE
        """),
        {"rid": body.review_id, "pid": match_id}
    )
    vr_row = q.fetchone()
    if not vr_row:
        raise HTTPException(status_code=404, detail="Video Review no encontrado o ya resuelto")

    review_id, color, tipo_solicitud, reglamento = vr_row

    stats = await _get_partido_stats(session, match_id)
    vr_key = f"vr_card_{color.lower()}"
    puntos_aplicados = 0

    if body.resultado == "ACEPTADO":
        # Conserva tarjeta + aplica puntos
        puntos_aplicados = body.puntos_otorgados
        if reglamento == "WKF":
            # Determinar campo de puntos WKF
            tipo_map = {
                "YUKO": ("yuko", 1),
                "WAZA_ARI": ("waza_ari", 2),
                "IPPON": ("ippon", 3),
                "SENSHU": ("senshu", 0),
            }
            campo, pts = tipo_map.get(tipo_solicitud, ("yuko", 1))
            lado = color.lower()  # 'aka' o 'ao'
            if not isinstance(stats.get(lado), dict):
                stats[lado] = {}
            if campo == "senshu":
                stats[lado]["senshu"] = True
                # Quitar Senshu del rival
                rival = "ao" if lado == "aka" else "aka"
                if isinstance(stats.get(rival), dict):
                    stats[rival]["senshu"] = False
            else:
                stats[lado][campo] = stats[lado].get(campo, 0) + 1
                stats[lado]["puntos"] = stats[lado].get("puntos", 0) + pts
                puntos_aplicados = pts
        elif reglamento == "ASAM":
            lado = color.lower()  # 'blanco' o 'rojo'
            if not isinstance(stats.get(lado), dict):
                stats[lado] = {}
            stats[lado]["puntos"] = stats[lado].get("puntos", 0) + 1
            puntos_aplicados = 1

    elif body.resultado == "RECHAZADO":
        # Pierde la tarjeta
        stats[vr_key] = "USED_AND_LOCKED"

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
            "res": body.resultado,
            "pts": puntos_aplicados,
            "clip": body.clip_url,
            "rid": review_id,
        }
    )
    await session.commit()

    # Broadcast: resultado + score update + reanuda crono
    await vr_manager.broadcast(
        match_id,
        evt_vr_resuelto(
            match_id=match_id,
            review_id=review_id,
            resultado=body.resultado,
            competidor_color=color,
            puntos_otorgados=puntos_aplicados,
            tipo_solicitud=tipo_solicitud,
        )
    )
    await vr_manager.broadcast(match_id, evt_score_update(match_id, stats))
    await vr_manager.broadcast(match_id, evt_timer_resume(match_id))

    return {
        "ok": True,
        "resultado": body.resultado,
        "puntos_aplicados": puntos_aplicados,
        "vr_card": stats.get(vr_key, "ACTIVE"),
        "mensaje": f"VR resuelto: {body.resultado}. Puntos aplicados: {puntos_aplicados}.",
    }


# ─── 4. Estado actual del VR del partido ─────────────────────────────────────

@router.get("/combates/{match_id}/estado")
async def estado_video_review(
    match_id: str,
    session: AsyncSession = Depends(get_session)
):
    """Devuelve el estado del VR activo (si existe) para un partido."""
    q = await session.execute(
        text("""
            SELECT id, competidor_color, tipo_solicitud, tiempo_cronometro,
                   reglamento, clip_url, created_at
            FROM torneos.video_reviews
            WHERE partido_id = :pid AND resuelto = FALSE
            ORDER BY created_at DESC LIMIT 1
        """),
        {"pid": match_id}
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
    q = await session.execute(
        text("""
            SELECT id, competidor_color, tipo_solicitud, resultado,
                   puntos_otorgados, tiempo_cronometro, reglamento,
                   clip_url, created_at, resuelto_at
            FROM torneos.video_reviews
            WHERE partido_id = :pid
            ORDER BY created_at ASC
        """),
        {"pid": match_id}
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
    session: AsyncSession = Depends(get_session)
):
    """
    OBS notifica la ruta del clip guardado.
    El frontend llama a este endpoint tras recibir el evento ReplayBufferSaved de OBS.
    """
    await session.execute(
        text("""
            UPDATE torneos.video_reviews
            SET clip_url = :url
            WHERE id = :rid AND partido_id = :pid
        """),
        {"url": clip_url, "rid": review_id, "pid": match_id}
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
    session: AsyncSession = Depends(get_session)
):
    """
    Recibe el clip de video generado por el navegador (WebM o MP4) desde la pantalla de cámara nativa.
    Guarda el archivo en el directorio de clips, actualiza el registro en DB y notifica al Juez VR.
    """
    import os
    import shutil
    from pathlib import Path

    # Si no se provee review_id, buscar el último VR activo/no resuelto para este combate
    if not review_id:
        q = await session.execute(
            text("""
                SELECT id FROM torneos.video_reviews
                WHERE partido_id = :pid AND resuelto = FALSE
                ORDER BY created_at DESC LIMIT 1
            """),
            {"pid": match_id}
        )
        row = q.fetchone()
        if row:
            review_id = row[0]
        else:
            q2 = await session.execute(
                text("""
                    SELECT id FROM torneos.video_reviews
                    WHERE partido_id = :pid
                    ORDER BY created_at DESC LIMIT 1
                """),
                {"pid": match_id}
            )
            row2 = q2.fetchone()
            review_id = row2[0] if row2 else 0

    clips_dir = os.getenv("OBS_CLIPS_DIR", "C:/Users/Public/Videos/OBS_Replays" if os.name == "nt" else "/app/clips")
    os.makedirs(clips_dir, exist_ok=True)

    ext = Path(file.filename).suffix if file.filename else ".webm"
    if not ext:
        ext = ".webm"
    filename = f"replay_{match_id}_{review_id}_{int(datetime.now().timestamp())}{ext}"
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

    if review_id:
        await session.execute(
            text("""
                UPDATE torneos.video_reviews
                SET clip_url = :url
                WHERE id = :rid
            """),
            {"url": clip_url, "rid": review_id}
        )
        await session.commit()

    # Notificar al panel VR que el clip está listo
    await vr_manager.broadcast(match_id, {
        "event": "CLIP_DISPONIBLE",
        "match_id": match_id,
        "review_id": review_id,
        "clip_url": clip_url,
    })

    return {
        "ok": True,
        "clip_url": clip_url,
        "filename": filename,
        "review_id": review_id,
        "mensaje": "Clip subido y notificado al panel VR exitosamente."
    }

