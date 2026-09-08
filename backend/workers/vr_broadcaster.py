"""
workers/vr_broadcaster.py
Gestor de WebSocket para Video Review en tiempo real.
Mantiene canales por match_id y broadcastea eventos a todos los clientes
conectados (mesa arbitral, pantalla de tatami, panel VR).
"""
from __future__ import annotations

import asyncio
import json
import logging
from typing import Dict, Set
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class VRConnectionManager:
    """
    Maneja las conexiones WebSocket agrupadas por match_id.
    Cada match tiene su propio set de clientes conectados.
    """

    def __init__(self):
        # { match_id: set of WebSocket }
        self.active: Dict[str, Set[WebSocket]] = {}

    async def connect(self, match_id: str, ws: WebSocket):
        await ws.accept()
        if match_id not in self.active:
            self.active[match_id] = set()
        self.active[match_id].add(ws)
        logger.info(f"[VR-WS] Cliente conectado a match {match_id}. Total: {len(self.active[match_id])}")

    def disconnect(self, match_id: str, ws: WebSocket):
        if match_id in self.active:
            self.active[match_id].discard(ws)
            if not self.active[match_id]:
                del self.active[match_id]
        logger.info(f"[VR-WS] Cliente desconectado de match {match_id}.")

    async def broadcast(self, match_id: str, event: dict):
        """Envía un evento JSON a todos los clientes del match."""
        if match_id not in self.active:
            return
        payload = json.dumps(event, ensure_ascii=False, default=str)
        dead: Set[WebSocket] = set()
        for ws in list(self.active[match_id]):
            try:
                await ws.send_text(payload)
            except Exception:
                dead.add(ws)
        for ws in dead:
            self.disconnect(match_id, ws)

    def client_count(self, match_id: str) -> int:
        return len(self.active.get(match_id, set()))


# Instancia global — se importa desde los routers
vr_manager = VRConnectionManager()


# ─── Eventos estandarizados ───────────────────────────────────────────────────

def evt_vr_solicitado(
    match_id: str,
    competidor_color: str,
    tipo_solicitud: str,
    tiempo_cronometro: str,
    review_id: int,
) -> dict:
    return {
        "event": "VR_SOLICITADO",
        "match_id": match_id,
        "competidor_color": competidor_color,
        "tipo_solicitud": tipo_solicitud,
        "tiempo_cronometro": tiempo_cronometro,
        "review_id": review_id,
    }


def evt_vr_resuelto(
    match_id: str,
    review_id: int,
    resultado: str,        # ACEPTADO | RECHAZADO | MIENAI
    competidor_color: str,
    puntos_otorgados: int,
    tipo_solicitud: str,
) -> dict:
    return {
        "event": "VR_RESUELTO",
        "match_id": match_id,
        "review_id": review_id,
        "resultado": resultado,
        "competidor_color": competidor_color,
        "puntos_otorgados": puntos_otorgados,
        "tipo_solicitud": tipo_solicitud,
    }


def evt_score_update(match_id: str, score_state: dict) -> dict:
    return {
        "event": "SCORE_UPDATE",
        "match_id": match_id,
        "state": score_state,
    }


def evt_timer_pause(match_id: str, razon: str = "VIDEO_REVIEW") -> dict:
    return {
        "event": "TIMER_PAUSE",
        "match_id": match_id,
        "razon": razon,
    }


def evt_timer_resume(match_id: str) -> dict:
    return {
        "event": "TIMER_RESUME",
        "match_id": match_id,
    }
