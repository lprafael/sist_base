# services/whatsapp_service.py
"""
Servicio de Integración con Evolution API (WhatsApp Gateway)
Permite enviar mensajes de WhatsApp automatizados, gestionar la vinculación QR,
y enviar recordatorios de cuotas vencidas y por vencer para SAD-M.
"""

import os
import re
import httpx
import traceback
from typing import Optional, Dict, Any

EVOLUTION_API_URL = os.getenv("EVOLUTION_API_URL", "http://evolution-api:8080")
EVOLUTION_API_KEY = os.getenv("EVOLUTION_API_KEY", "micancha_whatsapp_secret_2026")
INSTANCE_NAME = os.getenv("EVOLUTION_INSTANCE_NAME", "micancha_bot")


def _headers() -> Dict[str, str]:
    return {
        "apikey": EVOLUTION_API_KEY,
        "Content-Type": "application/json",
    }


def format_paraguay_phone(phone: str) -> Optional[str]:
    """
    Normaliza números telefónicos a formato internacional sin '+' ni espacios.
    Ejemplos:
      '0981 123 456' -> '595981123456'
      '+595981123456' -> '595981123456'
      '981123456' -> '595981123456'
    """
    if not phone:
        return None
    cleaned = re.sub(r"\D", "", phone)
    if not cleaned:
        return None

    # Si empieza con 09 -> reemplazar 0 por 595
    if cleaned.startswith("09") and len(cleaned) == 10:
        cleaned = "595" + cleaned[1:]
    # Si empieza con 9 -> agregar 595
    elif cleaned.startswith("9") and len(cleaned) == 9:
        cleaned = "595" + cleaned
    # Si ya empieza con 595
    elif cleaned.startswith("595"):
        pass

    return cleaned if len(cleaned) >= 10 else None


async def get_instance_status() -> Dict[str, Any]:
    """Obtiene el estado de conexión de la instancia de WhatsApp."""
    url = f"{EVOLUTION_API_URL}/instance/connectionState/{INSTANCE_NAME}"
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(url, headers=_headers())
            if resp.status_code == 200:
                data = resp.json()
                state = data.get("instance", {}).get("state", "disconnected")
                return {"status": "ok", "state": state, "connected": state == "open"}
            elif resp.status_code == 404:
                # La instancia aún no existe -> intentamos crearla
                await create_instance()
                return {"status": "ok", "state": "connecting", "connected": False}
            else:
                return {"status": "error", "state": "disconnected", "connected": False, "detail": resp.text}
    except Exception as e:
        print(f"[ERROR WhatsApp get_instance_status]: {e}")
        return {"status": "offline", "state": "disconnected", "connected": False, "detail": str(e)}


def extract_qr(data: Any) -> Optional[str]:
    """Extrae el código QR (base64 o cadena raw) de cualquier variante de JSON devuelta por Evolution API v2."""
    if not isinstance(data, dict):
        return None
    if data.get("base64"):
        return data["base64"]
    if data.get("code"):
        return data["code"]
    
    qr_val = data.get("qrcode")
    if isinstance(qr_val, str):
        return qr_val
    if isinstance(qr_val, dict):
        return qr_val.get("base64") or qr_val.get("code")
    
    inst = data.get("instance")
    if isinstance(inst, dict):
        qr_sub = inst.get("qrcode")
        if isinstance(qr_sub, str):
            return qr_sub
        if isinstance(qr_sub, dict):
            return qr_sub.get("base64") or qr_sub.get("code")

    return None


async def create_instance() -> Dict[str, Any]:
    """Crea la instancia de WhatsApp en Evolution API si no existe."""
    url = f"{EVOLUTION_API_URL}/instance/create"
    body = {
        "instanceName": INSTANCE_NAME,
        "token": EVOLUTION_API_KEY,
        "qrcode": True,
        "integration": "WHATSAPP-BAILEYS",
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=body, headers=_headers())
            print(f"[create_instance {resp.status_code}]: {resp.text}")
            if resp.status_code in (200, 201):
                return resp.json()
            return {"error": resp.text}
    except Exception as e:
        print(f"[ERROR create_instance]: {e}")
        return {"error": str(e)}


async def get_qr_code() -> Dict[str, Any]:
    """Obtiene el código QR (base64 o pairing code) para vincular el WhatsApp."""
    url = f"{EVOLUTION_API_URL}/instance/connect/{INSTANCE_NAME}"
    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            # 1. Recrear la instancia siempre que se pida un QR para asegurar sesion fresca
            await logout_instance()
            create_res = await create_instance()
            qr = extract_qr(create_res)
            if qr:
                return {"status": "ok", "qr": qr, "raw": create_res}

            # 2. Consultar endpoint de connect
            resp = await client.get(url, headers=_headers())
            print(f"[get_qr_code connect {resp.status_code}]: {resp.text}")
            if resp.status_code == 200:
                data = resp.json()
                qr = extract_qr(data)
                if qr:
                    return {"status": "ok", "qr": qr, "raw": data}
                return {"status": "ok", "qr": None, "raw": data, "message": "Instancia conectada o sin QR"}

            return {"status": "error", "detail": resp.text}
    except Exception as e:
        print(f"[ERROR WhatsApp get_qr_code]: {e}")
        traceback.print_exc()
        return {"status": "error", "detail": str(e)}


async def logout_instance() -> Dict[str, Any]:
    """Cierra la sesión y elimina la instancia para permitir escanear un nuevo QR."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                await client.delete(f"{EVOLUTION_API_URL}/instance/logout/{INSTANCE_NAME}", headers=_headers())
            except Exception:
                pass
            resp = await client.delete(f"{EVOLUTION_API_URL}/instance/delete/{INSTANCE_NAME}", headers=_headers())
            print(f"[logout_instance delete {resp.status_code}]: {resp.text}")
            return {"status": "ok", "data": resp.text}
    except Exception as e:
        print(f"[ERROR logout_instance]: {e}")
        return {"status": "error", "detail": str(e)}


async def send_whatsapp_text(phone: str, text_message: str) -> Dict[str, Any]:
    """
    Envía un mensaje de texto a un número por WhatsApp.
    Formatos de teléfono válidos: '0981123456', '+595981123456', etc.
    """
    formatted_phone = format_paraguay_phone(phone)
    if not formatted_phone:
        return {"success": False, "error": f"Número de teléfono inválido: '{phone}'. Ejemplo válido: 595981123456"}

    url = f"{EVOLUTION_API_URL}/message/sendText/{INSTANCE_NAME}"
    body = {
        "number": formatted_phone,
        "text": text_message
    }
    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            resp = await client.post(url, json=body, headers=_headers())
            if resp.status_code in (200, 201):
                return {"success": True, "data": resp.json()}
            else:
                print(f"[ERROR send_whatsapp_text {resp.status_code}]: {resp.text}")
                err_msg = resp.text
                try:
                    err_json = resp.json()
                    if isinstance(err_json, dict):
                        raw_err = err_json.get("response", {}).get("message") or err_json.get("message")
                        if isinstance(raw_err, list):
                            err_msg = ", ".join(raw_err)
                        elif isinstance(raw_err, str):
                            err_msg = raw_err
                except Exception:
                    pass
                return {"success": False, "error": f"Error WhatsApp Gateway ({resp.status_code}): {err_msg}"}
    except Exception as e:
        print(f"[EXCEPT send_whatsapp_text]: {e}")
        traceback.print_exc()
        return {"success": False, "error": f"Error de comunicación con WhatsApp Gateway: {str(e)}"}

