# routers/whatsapp.py
"""
Endpoints de FastAPI para el Módulo de WhatsApp (Recordatorios y Vinculación QR)
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import traceback
from datetime import date

from database import get_session
from security import get_current_user
from routers.academias import require_roles
from services.whatsapp_service import (
    get_instance_status, get_qr_code, send_whatsapp_text, format_paraguay_phone
)

router = APIRouter(prefix="/academia/whatsapp", tags=["WhatsApp"])


class SendCustomMessageRequest(BaseModel):
    phone: str
    message: str


class RecordatorioMasivoRequest(BaseModel):
    periodo: Optional[str] = None
    estado_filtro: Optional[str] = 'pendiente'  # 'pendiente', 'vencida', 'parcial', 'todas'


@router.get("/status")
async def whatsapp_status(
    current_user: dict = Depends(require_roles("dueño", "administrador", "tesorero"))
):
    """Devuelve el estado de conexión del gateway de WhatsApp."""
    return await get_instance_status()


@router.get("/qr")
async def whatsapp_qr(
    current_user: dict = Depends(require_roles("dueño", "administrador"))
):
    """Devuelve el código QR en base64 para vincular WhatsApp escaneando desde el teléfono."""
    return await get_qr_code()


@router.post("/send-test")
async def send_test_message(
    data: SendCustomMessageRequest,
    current_user: dict = Depends(require_roles("dueño", "administrador"))
):
    """Envía un mensaje de prueba a un teléfono especificado."""
    res = await send_whatsapp_text(data.phone, data.message)
    if not res["success"]:
        raise HTTPException(status_code=400, detail=res.get("error", "Error al enviar mensaje."))
    return {"message": "Mensaje enviado exitosamente.", "details": res.get("data")}


@router.post("/recordatorio-cuota/{cuota_id}")
async def enviar_recordatorio_cuota(
    cuota_id: str,
    current_user: dict = Depends(require_roles("dueño", "administrador", "tesorero")),
    session: AsyncSession = Depends(get_session)
):
    """
    Envía un recordatorio de cuota individual por WhatsApp al tutor principal del alumno.
    """
    try:
        aid = str(current_user["academia_id"])

        # Buscar cuota, alumno y tutor principal
        res = await session.execute(text("""
            SELECT q.periodo, q.monto_final, q.monto_pagado, q.estado, q.fecha_vencimiento,
                   a.nombre || ' ' || COALESCE(a.apellido, '') AS alumno,
                   t.nombre || ' ' || COALESCE(t.apellido, '') AS tutor,
                   t.telefono AS tutor_telefono,
                   acad.nombre AS academia_nombre
            FROM academias.cuotas q
            JOIN academias.alumnos a ON a.id = q.alumno_id
            JOIN academias.academias acad ON acad.id = q.academia_id
            LEFT JOIN academias.alumno_tutores at2 ON at2.alumno_id = a.id AND at2.es_tutor_principal = TRUE
            LEFT JOIN academias.tutores t ON t.id = at2.tutor_id
            WHERE q.id = CAST(:cid AS UUID) AND q.academia_id = CAST(:aid AS UUID)
        """), {"cid": cuota_id, "aid": aid})
        row = res.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Cuota no encontrada.")

        periodo, monto_final, monto_pagado, estado, fecha_vcto, alumno, tutor, telefono, acad_nombre = row
        saldo_pendiente = float(monto_final) - float(monto_pagado or 0)

        if not telefono:
            raise HTTPException(status_code=400, detail=f"El tutor de {alumno} no tiene número de teléfono cargado.")

        # Armar mensaje cordial
        vcto_str = fecha_vcto.strftime("%d/%m/%Y") if fecha_vcto else "el mes"
        tutor_saludo = f"Estimado/a {tutor}" if tutor else f"Estimado tutor/padre de {alumno}"

        msg = (
            f"⚽ *{acad_nombre.upper()}*\n\n"
            f"Hola {tutor_saludo} 👋🏼\n"
            f"Te enviamos el recordatorio de cuota para el alumno/a *{alumno}*.\n\n"
            f"📅 *Período:* {periodo}\n"
            f"📆 *Vencimiento:* {vcto_str}\n"
            f"💰 *Saldo a abonar:* Gs. {saldo_pendiente:,.0f}\n"
            f"📌 *Estado:* {estado.upper()}\n\n"
            f"Por favor, remitir el comprobante de pago al responder este mensaje. ¡Muchas gracias!"
        )

        res_send = await send_whatsapp_text(telefono, msg)
        if not res_send["success"]:
            raise HTTPException(status_code=400, detail=f"Error WhatsApp: {res_send.get('error')}")

        return {
            "message": f"Recordatorio WhatsApp enviado a {telefono} ({tutor or alumno}).",
            "telefono": telefono,
            "alumno": alumno,
        }

    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        print(f"[ERROR enviar_recordatorio_cuota]: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"Error al enviar recordatorio: {str(e)}")


@router.post("/recordatorio-masivo")
async def enviar_recordatorio_masivo(
    data: RecordatorioMasivoRequest,
    current_user: dict = Depends(require_roles("dueño", "tesorero")),
    session: AsyncSession = Depends(get_session)
):
    """
    Envía recordatorios masivos por WhatsApp a todos los tutores con cuotas pendientes/vencidas.
    """
    try:
        aid = str(current_user["academia_id"])
        conditions = ["q.academia_id = CAST(:aid AS UUID)"]
        params = {"aid": aid}

        if data.periodo:
            conditions.append("q.periodo = :periodo")
            params["periodo"] = data.periodo

        if data.estado_filtro and data.estado_filtro != "todas":
            conditions.append("q.estado = :estado")
            params["estado"] = data.estado_filtro
        else:
            conditions.append("q.estado IN ('pendiente', 'parcial', 'vencida')")

        where = " AND ".join(conditions)

        res = await session.execute(text(f"""
            SELECT q.id, q.periodo, q.monto_final, q.monto_pagado, q.estado, q.fecha_vencimiento,
                   a.nombre || ' ' || COALESCE(a.apellido, '') AS alumno,
                   t.nombre || ' ' || COALESCE(t.apellido, '') AS tutor,
                   t.telefono AS tutor_telefono,
                   acad.nombre AS academia_nombre
            FROM academias.cuotas q
            JOIN academias.alumnos a ON a.id = q.alumno_id
            JOIN academias.academias acad ON acad.id = q.academia_id
            LEFT JOIN academias.alumno_tutores at2 ON at2.alumno_id = a.id AND at2.es_tutor_principal = TRUE
            LEFT JOIN academias.tutores t ON t.id = at2.tutor_id
            WHERE {where}
            ORDER BY a.apellido, a.nombre
        """), params)

        rows = res.fetchall()
        enviados = 0
        fallidos = 0
        detalles = []

        for row in rows:
            cid, periodo, monto_final, monto_pagado, estado, fecha_vcto, alumno, tutor, telefono, acad_nombre = row
            saldo_pendiente = float(monto_final) - float(monto_pagado or 0)

            if not telefono:
                fallidos += 1
                detalles.append({"alumno": alumno, "status": "sin_telefono"})
                continue

            vcto_str = fecha_vcto.strftime("%d/%m/%Y") if fecha_vcto else "el mes"
            tutor_saludo = f"Estimado/a {tutor}" if tutor else f"Estimado tutor/padre de {alumno}"

            msg = (
                f"⚽ *{acad_nombre.upper()}*\n\n"
                f"Hola {tutor_saludo} 👋🏼\n"
                f"Te enviamos el recordatorio de cuota para el alumno/a *{alumno}*.\n\n"
                f"📅 *Período:* {periodo}\n"
                f"📆 *Vencimiento:* {vcto_str}\n"
                f"💰 *Saldo a abonar:* Gs. {saldo_pendiente:,.0f}\n"
                f"📌 *Estado:* {estado.upper()}\n\n"
                f"Por favor, remitir el comprobante de pago al responder este mensaje. ¡Muchas gracias!"
            )

            res_send = await send_whatsapp_text(telefono, msg)
            if res_send["success"]:
                enviados += 1
                detalles.append({"alumno": alumno, "telefono": telefono, "status": "enviado"})
            else:
                fallidos += 1
                detalles.append({"alumno": alumno, "telefono": telefono, "status": "error", "reason": res_send.get("error")})

        return {
            "message": f"Proceso masivo finalizado. Enviados: {enviados}, Fallidos/Sin teléfono: {fallidos}.",
            "enviados": enviados,
            "fallidos": fallidos,
            "total_procesados": len(rows),
            "detalles": detalles,
        }

    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        print(f"[ERROR enviar_recordatorio_masivo]: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"Error en recordatorio masivo: {str(e)}")
