"""
obs_bridge.py
Puente entre OBS Studio (obs-websocket) y el backend de Video Review.
Se ejecuta como proceso local en la PC de mesa del tatami.

Requiere:
    pip install obsws-python requests python-dotenv

Uso:
    python obs_bridge.py --match-id 123 --tatami 1

Configura OBS:
    - Herramientas → obs-websocket → Activar → Puerto 4455
    - Activar Replay Buffer (ej. 30 segundos)

Flujo:
    1. Escucha el evento ReplayBufferSaved de OBS vía WebSocket
    2. Al guardarse el clip, notifica al backend con la ruta del archivo
    3. El backend broadcastea CLIP_DISPONIBLE al panel del Juez VR
"""

import argparse
import asyncio
import json
import logging
import os
import sys
import time
import requests
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [OBS-BRIDGE] %(levelname)s %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("obs_bridge")

# ─── Configuración ─────────────────────────────────────────────────────────────

OBS_HOST        = os.getenv("OBS_HOST", "localhost")
OBS_PORT        = int(os.getenv("OBS_PORT", "4455"))
OBS_PASSWORD    = os.getenv("OBS_PASSWORD", "")
BACKEND_URL     = os.getenv("NEXT_PUBLIC_API_URL", "http://localhost:8002")
CLIPS_BASE_DIR  = os.getenv("OBS_CLIPS_DIR", "C:/Users/Public/Videos/OBS_Replays")


async def get_active_vr(match_id: str) -> dict | None:
    """Consulta al backend si hay un VR activo para el match."""
    try:
        resp = requests.get(f"{BACKEND_URL}/api/vr/combates/{match_id}/estado", timeout=3)
        if resp.ok:
            data = resp.json()
            if data.get("activo"):
                return data["review"]
    except Exception as e:
        log.warning(f"No se pudo consultar estado VR: {e}")
    return None


def notify_backend(match_id: str, review_id: int, clip_path: str):
    """Notifica al backend que el clip está disponible."""
    # Construye URL HTTP accesible desde cualquier navegador o tablet en la red local
    filename = Path(clip_path).name
    clip_url = f"{BACKEND_URL}/clips/{filename}"

    try:
        resp = requests.patch(
            f"{BACKEND_URL}/api/vr/combates/{match_id}/clip/{review_id}",
            params={"clip_url": clip_url},
            timeout=5,
        )
        if resp.ok:
            log.info(f"✅ Clip notificado al backend: {clip_url}")
        else:
            log.error(f"❌ Error al notificar clip: {resp.status_code} {resp.text}")
    except Exception as e:
        log.error(f"❌ Excepción al notificar clip: {e}")


async def trigger_save_replay(match_id: str):
    """Envía el comando SaveReplayBuffer a OBS vía WebSocket."""
    try:
        import obsws_python as obs
        cl = obs.ReqClient(host=OBS_HOST, port=OBS_PORT, password=OBS_PASSWORD)
        log.info("📡 Solicitando SaveReplayBuffer a OBS...")
        cl.save_replay_buffer()
        cl.disconnect()
        return True
    except ImportError:
        log.error("obsws-python no está instalado. Ejecutar: pip install obsws-python")
        return False
    except Exception as e:
        log.error(f"Error al conectar con OBS: {e}")
        return False


async def run_bridge(match_id: str, tatami: int):
    """
    Bucle principal: escucha eventos de OBS y los reenvía al backend.
    """
    log.info(f"🎥 OBS Bridge iniciado | Match: {match_id} | Tatami: {tatami}")
    log.info(f"   OBS: {OBS_HOST}:{OBS_PORT}")
    log.info(f"   Backend: {BACKEND_URL}")

    try:
        import obsws_python as obs
    except ImportError:
        log.error("obsws-python no está instalado. Ejecutar: pip install obsws-python")
        sys.exit(1)

    def on_replay_saved(data):
        """Callback cuando OBS guarda el Replay Buffer."""
        saved_path = data.saved_replay_path if hasattr(data, "saved_replay_path") else str(data)
        log.info(f"📼 Replay guardado: {saved_path}")

        # Buscar si hay VR activo en el backend
        review = asyncio.run(get_active_vr(match_id))
        if review:
            review_id = review["id"]
            log.info(f"🔗 VR activo encontrado (ID: {review_id}). Notificando clip...")
            notify_backend(match_id, review_id, saved_path)
        else:
            log.info("ℹ️  No hay VR activo. El clip guardado se ignorará.")

    # Conectar con eventos
    log.info("🔌 Conectando con OBS WebSocket...")
    try:
        ev_client = obs.EventClient(
            host=OBS_HOST,
            port=OBS_PORT,
            password=OBS_PASSWORD,
        )
        ev_client.callback.register(on_replay_saved, obs.events.ReplayBufferSaved)
        log.info("✅ Conectado a OBS. Esperando eventos de Replay Buffer...")
        log.info("   Presiona Ctrl+C para detener.")

        # Mantener el proceso vivo
        while True:
            await asyncio.sleep(1)

    except KeyboardInterrupt:
        log.info("🛑 Bridge detenido por el usuario.")
    except Exception as e:
        log.error(f"Error en el bridge: {e}")
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="OBS-WebSocket Bridge para Video Review")
    parser.add_argument("--match-id",  required=True, help="ID del combate activo")
    parser.add_argument("--tatami",    type=int, default=1, help="Número de tatami (default: 1)")
    parser.add_argument("--obs-host",  default=OBS_HOST)
    parser.add_argument("--obs-port",  type=int, default=OBS_PORT)
    parser.add_argument("--obs-pass",  default=OBS_PASSWORD)
    parser.add_argument("--save-now",  action="store_true",
                        help="Forzar guardado del Replay Buffer inmediatamente (para pruebas)")
    args = parser.parse_args()

    global OBS_HOST, OBS_PORT, OBS_PASSWORD
    OBS_HOST     = args.obs_host
    OBS_PORT     = args.obs_port
    OBS_PASSWORD = args.obs_pass

    if args.save_now:
        # Modo de prueba: guardar clip ahora mismo
        log.info("🔧 Modo prueba: forzando SaveReplayBuffer...")
        asyncio.run(trigger_save_replay(args.match_id))
        return

    asyncio.run(run_bridge(args.match_id, args.tatami))


if __name__ == "__main__":
    main()
