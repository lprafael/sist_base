"""
backend/routers/pagos_core.py
==============================
Motor Unificado de Pagos, Canales de Cobro (Bancos, SIPAP, Billeteras, QR) y
Verificación de Comprobantes para Torneos y Academias.
"""
from __future__ import annotations

import os
import re
import uuid
import shutil
from pathlib import Path
from datetime import datetime, date
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from database import get_session
from security import get_current_user

router = APIRouter(prefix="/api/pagos-core", tags=["Pagos Core & Comprobantes"])

# Directorios de subida
COMPROBANTES_UPLOAD_DIR = Path("static/uploads/comprobantes")
COMPROBANTES_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

QR_UPLOAD_DIR = Path("static/uploads/qr_pagos")
QR_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


# ==============================================================================
# SCHEMAS PYDANTIC
# ==============================================================================

class CanalCobroCreate(BaseModel):
    organizador_id: Optional[int] = None
    academia_id: Optional[str] = None
    torneo_id: Optional[str] = None
    tipo: str = "banco"                     # banco | billetera | qr | pos | efectivo
    nombre_banco: Optional[str] = None      # Banco Continental, Itaú, Ueno, Familiar, etc.
    titular: str
    ruc_ci: str
    numero_cuenta: Optional[str] = None
    tipo_cuenta: Optional[str] = "Cuenta Corriente"  # Cuenta Corriente | Caja de Ahorro
    alias_sipap: Optional[str] = None
    telefono_billetera: Optional[str] = None
    qr_imagen_url: Optional[str] = None
    instrucciones: Optional[str] = None
    es_principal: bool = True
    activo: bool = True


class CanalCobroUpdate(BaseModel):
    tipo: Optional[str] = None
    nombre_banco: Optional[str] = None
    titular: Optional[str] = None
    ruc_ci: Optional[str] = None
    numero_cuenta: Optional[str] = None
    tipo_cuenta: Optional[str] = None
    alias_sipap: Optional[str] = None
    telefono_billetera: Optional[str] = None
    qr_imagen_url: Optional[str] = None
    instrucciones: Optional[str] = None
    es_principal: Optional[bool] = None
    activo: Optional[bool] = None


class ValidarComprobantePayload(BaseModel):
    aprobado: bool
    monto_confirmado: Optional[float] = None
    motivo_rechazo: Optional[str] = None
    notas_admin: Optional[str] = None


# ==============================================================================
# DDL AUTOMÁTICO
# ==============================================================================

_PAGOS_DDL = [
    """CREATE SCHEMA IF NOT EXISTS pagos_core;""",
    """CREATE TABLE IF NOT EXISTS pagos_core.canales_cobro (
        id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organizador_id          INTEGER,
        academia_id             UUID,
        torneo_id               UUID,
        tipo                    VARCHAR(30) NOT NULL DEFAULT 'banco',
        nombre_banco            VARCHAR(100),
        titular                 VARCHAR(200) NOT NULL,
        ruc_ci                  VARCHAR(50) NOT NULL,
        numero_cuenta           VARCHAR(100),
        tipo_cuenta             VARCHAR(50) DEFAULT 'Cuenta Corriente',
        alias_sipap             VARCHAR(100),
        telefono_billetera      VARCHAR(50),
        qr_imagen_url           TEXT,
        instrucciones           TEXT,
        es_principal            BOOLEAN DEFAULT TRUE,
        activo                  BOOLEAN DEFAULT TRUE,
        creado_en               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        actualizado_en          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );""",
    """ALTER TABLE pagos_core.canales_cobro ADD COLUMN IF NOT EXISTS torneo_id UUID;""",
    """CREATE TABLE IF NOT EXISTS pagos_core.comprobantes_pago (
        id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entidad_tipo            VARCHAR(50) NOT NULL,
        entidad_id              UUID NOT NULL,
        organizador_id          INTEGER,
        academia_id             UUID,
        torneo_id               UUID,
        monto_declarado         NUMERIC(12,2) NOT NULL DEFAULT 0,
        monto_confirmado        NUMERIC(12,2),
        moneda                  VARCHAR(10) NOT NULL DEFAULT 'GS',
        metodo_pago             VARCHAR(50) NOT NULL DEFAULT 'transferencia',
        banco_origen            VARCHAR(100),
        numero_referencia       VARCHAR(100),
        comprobante_url         TEXT NOT NULL,
        estado                  VARCHAR(30) NOT NULL DEFAULT 'en_revision',
        motivo_rechazo          TEXT,
        notas_admin             TEXT,
        pagador_nombre          VARCHAR(150),
        pagador_telefono        VARCHAR(50),
        pagador_email           VARCHAR(150),
        fecha_pago              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        revisado_por            INTEGER REFERENCES sistema.usuarios(id) ON DELETE SET NULL,
        revisado_en             TIMESTAMPTZ,
        caja_movimiento_id      UUID,
        creado_en               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        actualizado_en          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );""",
    """ALTER TABLE pagos_core.comprobantes_pago ADD COLUMN IF NOT EXISTS torneo_id UUID;""",
    """CREATE INDEX IF NOT EXISTS idx_comprobantes_entidad ON pagos_core.comprobantes_pago(entidad_tipo, entidad_id);""",
    """CREATE INDEX IF NOT EXISTS idx_comprobantes_estado ON pagos_core.comprobantes_pago(estado);""",
    """CREATE INDEX IF NOT EXISTS idx_comprobantes_torneo ON pagos_core.comprobantes_pago(torneo_id);""",
    """CREATE INDEX IF NOT EXISTS idx_comprobantes_academia ON pagos_core.comprobantes_pago(academia_id);""",
    """ALTER TABLE torneos_generales.participantes ADD COLUMN IF NOT EXISTS monto_inscripcion NUMERIC(12,2) DEFAULT 0;""",
    """ALTER TABLE torneos_generales.participantes ADD COLUMN IF NOT EXISTS monto_abonado NUMERIC(12,2) DEFAULT 0;""",
    """ALTER TABLE torneos_generales.participantes ADD COLUMN IF NOT EXISTS estado_pago VARCHAR(30) DEFAULT 'pendiente';""",
    """ALTER TABLE torneos_generales.participantes ADD COLUMN IF NOT EXISTS comprobante_pago_url TEXT;""",
    """ALTER TABLE torneos_generales.participantes ADD COLUMN IF NOT EXISTS comprobante_referencia VARCHAR(100);""",
    """ALTER TABLE torneos_generales.participantes ADD COLUMN IF NOT EXISTS fecha_pago TIMESTAMPTZ;""",
    """ALTER TABLE torneos_generales.participantes ADD COLUMN IF NOT EXISTS motivo_rechazo_pago TEXT;""",
    """ALTER TABLE torneos_generales.torneos ADD COLUMN IF NOT EXISTS costo_inscripcion NUMERIC(12,2) DEFAULT 0;""",
    """ALTER TABLE torneos_generales.torneos ADD COLUMN IF NOT EXISTS costo_por_categoria JSONB;""",
    """ALTER TABLE torneos_generales.torneos ADD COLUMN IF NOT EXISTS datos_pago JSONB;""",
    """ALTER TABLE torneos_generales.torneos ADD COLUMN IF NOT EXISTS requiere_comprobante BOOLEAN DEFAULT TRUE;"""
]

_tables_initialized = False

async def _ensure_pagos_tables(session: AsyncSession):
    global _tables_initialized
    if _tables_initialized:
        return
    for ddl in _PAGOS_DDL:
        try:
            await session.execute(text(ddl))
            await session.commit()
        except Exception as e:
            await session.rollback()
    _tables_initialized = True


# ==============================================================================
# ENDPOINTS — CANALES DE COBRO (BANCOS, SIPAP, BILLETERAS, QR)
# ==============================================================================

@router.get("/canales")
async def listar_canales_cobro(
    torneo_id: Optional[str] = None,
    academia_id: Optional[str] = None,
    organizador_id: Optional[int] = None,
    session: AsyncSession = Depends(get_session)
):
    """Retorna los canales de cobro activos para un torneo, academia u organizador."""
    await _ensure_pagos_tables(session)

    conditions = ["activo = TRUE"]
    params: Dict[str, Any] = {}

    if torneo_id:
        conditions.append("(torneo_id = :tid OR organizador_id = (SELECT organizador_id FROM torneos_generales.torneos WHERE id = :tid LIMIT 1))")
        params["tid"] = torneo_id
    elif academia_id:
        conditions.append("academia_id = :aid")
        params["aid"] = academia_id
    elif organizador_id:
        conditions.append("organizador_id = :oid")
        params["oid"] = organizador_id

    where_clause = " AND ".join(conditions)
    res = await session.execute(text(f"""
        SELECT *
        FROM pagos_core.canales_cobro
        WHERE {where_clause}
        ORDER BY es_principal DESC, creado_en ASC
    """), params)
    
    rows = [dict(r._mapping) for r in res.fetchall()]

    # Si no hay canales específicos, retornar valores por defecto o fallback desde torneos_generales.torneos.datos_pago
    if not rows and torneo_id:
        t_res = await session.execute(text("""
            SELECT nombre, datos_pago, costo_inscripcion, costo_por_categoria
            FROM torneos_generales.torneos WHERE id = :tid
        """), {"tid": torneo_id})
        t_row = t_res.fetchone()
        if t_row and t_row.datos_pago:
            dp = t_row.datos_pago
            rows.append({
                "id": str(uuid.uuid4()),
                "torneo_id": torneo_id,
                "tipo": dp.get("tipo", "banco"),
                "nombre_banco": dp.get("banco", dp.get("nombre_banco", "Banco")),
                "titular": dp.get("titular", "Organización del Torneo"),
                "ruc_ci": dp.get("ruc_ci", dp.get("ruc", "")),
                "numero_cuenta": dp.get("numero_cuenta", dp.get("cuenta", "")),
                "tipo_cuenta": dp.get("tipo_cuenta", "Cuenta Corriente"),
                "alias_sipap": dp.get("alias_sipap", dp.get("alias", "")),
                "telefono_billetera": dp.get("telefono_billetera", ""),
                "qr_imagen_url": dp.get("qr_imagen_url", ""),
                "instrucciones": dp.get("instrucciones", ""),
                "es_principal": True,
                "activo": True
            })

    return rows


@router.post("/canales")
async def crear_canal_cobro(
    payload: CanalCobroCreate,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """Crea un nuevo canal de cobro bancario/SIPAP/QR."""
    await _ensure_pagos_tables(session)
    data = payload.model_dump()
    data["id"] = str(uuid.uuid4())

    query = text("""
        INSERT INTO pagos_core.canales_cobro (
            id, organizador_id, academia_id, torneo_id, tipo, nombre_banco,
            titular, ruc_ci, numero_cuenta, tipo_cuenta, alias_sipap,
            telefono_billetera, qr_imagen_url, instrucciones, es_principal, activo
        ) VALUES (
            :id, :organizador_id, :academia_id, :torneo_id, :tipo, :nombre_banco,
            :titular, :ruc_ci, :numero_cuenta, :tipo_cuenta, :alias_sipap,
            :telefono_billetera, :qr_imagen_url, :instrucciones, :es_principal, :activo
        ) RETURNING *
    """)
    res = await session.execute(query, data)
    await session.commit()
    row = res.fetchone()
    return dict(row._mapping) if row else {"id": data["id"]}


@router.post("/canales/{canal_id}/upload-qr")
async def subir_qr_canal_cobro(
    canal_id: str,
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """Sube la imagen del Código QR de pago para un canal de cobro."""
    await _ensure_pagos_tables(session)
    ext = Path(file.filename or "").suffix.lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp"]:
        raise HTTPException(status_code=400, detail="Formato no permitido. Suba imagen JPG, PNG o WEBP.")

    filename = f"qr_{canal_id}_{int(datetime.now().timestamp())}{ext}"
    filepath = QR_UPLOAD_DIR / filename

    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    qr_url = f"/static/uploads/qr_pagos/{filename}"

    await session.execute(text("""
        UPDATE pagos_core.canales_cobro
        SET qr_imagen_url = :url, actualizado_en = NOW()
        WHERE id = :cid
    """), {"url": qr_url, "cid": canal_id})
    await session.commit()

    return {"qr_imagen_url": qr_url, "mensaje": "Código QR subido exitosamente"}


# ==============================================================================
# ENDPOINTS — SUBIDA Y VALIDACIÓN DE COMPROBANTES DE PAGO
# ==============================================================================

@router.post("/comprobante/upload")
async def subir_comprobante_pago(
    file: UploadFile = File(...),
    entidad_tipo: str = Form(...),            # 'torneo_participante' | 'torneo_equipo' | 'academia_cuota' | 'academia_matricula'
    entidad_id: str = Form(...),
    monto_declarado: float = Form(0.0),
    numero_referencia: Optional[str] = Form(None),
    banco_origen: Optional[str] = Form(None),
    metodo_pago: str = Form("transferencia"),
    pagador_nombre: Optional[str] = Form(None),
    pagador_telefono: Optional[str] = Form(None),
    pagador_email: Optional[str] = Form(None),
    torneo_id: Optional[str] = Form(None),
    academia_id: Optional[str] = Form(None),
    session: AsyncSession = Depends(get_session)
):
    """
    Sube un comprobante de pago bancario (foto o PDF) para cualquier entidad
    (inscripción a torneo o cuota de academia).
    Crea el registro central en `pagos_core.comprobantes_pago` con estado 'en_revision'
    y actualiza la entidad correspondiente.
    """
    await _ensure_pagos_tables(session)

    # Validar extensión
    ext = Path(file.filename or "").suffix.lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp", ".pdf"]:
        raise HTTPException(status_code=400, detail="Formato inválido. Adjunte imagen JPG, PNG o PDF.")

    comprobante_id = str(uuid.uuid4())
    filename = f"comp_{entidad_tipo}_{entidad_id[:8]}_{int(datetime.now().timestamp())}{ext}"
    filepath = COMPROBANTES_UPLOAD_DIR / filename

    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    comprobante_url = f"/static/uploads/comprobantes/{filename}"

    # Guardar en pagos_core.comprobantes_pago
    await session.execute(text("""
        INSERT INTO pagos_core.comprobantes_pago (
            id, entidad_tipo, entidad_id, organizador_id, academia_id, torneo_id,
            monto_declarado, metodo_pago, banco_origen, numero_referencia,
            comprobante_url, estado, pagador_nombre, pagador_telefono, pagador_email,
            fecha_pago, creado_en, actualizado_en
        ) VALUES (
            :id, :entidad_tipo, :entidad_id, NULL, :academia_id, :torneo_id,
            :monto, :metodo, :banco, :ref,
            :url, 'en_revision', :p_nom, :p_tel, :p_email,
            NOW(), NOW(), NOW()
        )
    """), {
        "id": comprobante_id,
        "entidad_tipo": entidad_tipo,
        "entidad_id": entidad_id,
        "academia_id": academia_id,
        "torneo_id": torneo_id,
        "monto": monto_declarado,
        "metodo": metodo_pago,
        "banco": banco_origen,
        "ref": numero_referencia,
        "url": comprobante_url,
        "p_nom": pagador_nombre,
        "p_tel": pagador_telefono,
        "p_email": pagador_email,
    })

    # Actualizar estado preliminar en la entidad de destino
    if entidad_tipo == "torneo_participante":
        await session.execute(text("""
            UPDATE torneos_generales.participantes
            SET estado_pago = 'comprobante_subido',
                comprobante_pago_url = :url,
                comprobante_referencia = :ref,
                monto_abonado = :monto,
                actualizado_en = NOW()
            WHERE id = :eid
        """), {
            "url": comprobante_url,
            "ref": numero_referencia,
            "monto": monto_declarado,
            "eid": entidad_id
        })

    elif entidad_tipo == "academia_cuota":
        await session.execute(text("""
            UPDATE academias.cuotas
            SET notas = COALESCE(notas, '') || ' [Comprobante enviado: ' || :ref || ']'
            WHERE id = :eid
        """), {
            "ref": numero_referencia or "En revisión",
            "eid": entidad_id
        })

    await session.commit()

    return {
        "comprobante_id": comprobante_id,
        "comprobante_url": comprobante_url,
        "estado": "en_revision",
        "mensaje": "Comprobante de pago recibido correctamente y enviado a revisión."
    }


@router.get("/comprobantes")
async def listar_comprobantes(
    torneo_id: Optional[str] = None,
    academia_id: Optional[str] = None,
    entidad_tipo: Optional[str] = None,
    entidad_id: Optional[str] = None,
    estado: Optional[str] = None,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """Lista comprobantes con soporte de filtrado para árbitros, administradores o secretaría."""
    await _ensure_pagos_tables(session)

    conds = []
    params: Dict[str, Any] = {}

    if torneo_id:
        conds.append("c.torneo_id = :tid")
        params["tid"] = torneo_id
    if academia_id:
        conds.append("c.academia_id = :aid")
        params["aid"] = academia_id
    if entidad_tipo:
        conds.append("c.entidad_tipo = :et")
        params["et"] = entidad_tipo
    if entidad_id:
        conds.append("c.entidad_id = :eid")
        params["eid"] = entidad_id
    if estado:
        conds.append("c.estado = :est")
        params["est"] = estado

    where_str = f"WHERE {' AND '.join(conds)}" if conds else ""

    query = text(f"""
        SELECT c.*,
               u.nombre AS revisor_nombre,
               CASE
                 WHEN c.entidad_tipo = 'torneo_participante' THEN p.nombre || ' ' || p.apellido
                 ELSE c.pagador_nombre
               END AS beneficiario_nombre
        FROM pagos_core.comprobantes_pago c
        LEFT JOIN sistema.usuarios u ON u.id = c.revisado_por
        LEFT JOIN torneos_generales.participantes p ON (c.entidad_tipo = 'torneo_participante' AND p.id = c.entidad_id)
        {where_str}
        ORDER BY
            CASE WHEN c.estado = 'en_revision' THEN 1 ELSE 2 END,
            c.creado_en DESC
    """)
    res = await session.execute(query, params)
    return [dict(r._mapping) for r in res.fetchall()]


@router.post("/comprobantes/{comprobante_id}/validar")
async def validar_comprobante(
    comprobante_id: str,
    payload: ValidarComprobantePayload,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Aprueba o rechaza un comprobante de pago.
    Al aprobar:
      - Actualiza el estado del comprobante a 'aprobado'.
      - Si es torneo: `participantes.pago_confirmado = TRUE`, `estado_pago = 'aprobado'`, `estado = 'Confirmado'`.
      - Si es academia: `cuotas.estado = 'pagada'`, `monto_pagado = monto_confirmado`, registra en `academias.pagos`.
    """
    await _ensure_pagos_tables(session)

    # 1. Obtener comprobante
    res = await session.execute(text("""
        SELECT * FROM pagos_core.comprobantes_pago WHERE id = :cid
    """), {"cid": comprobante_id})
    comp = res.fetchone()
    if not comp:
        raise HTTPException(status_code=404, detail="Comprobante no encontrado")

    user_id = current_user.get("id") or current_user.get("usuario_id")
    nuevo_estado = "aprobado" if payload.aprobado else "rechazado"
    monto_final = payload.monto_confirmado if (payload.monto_confirmado is not None) else float(comp.monto_declarado)

    # 2. Actualizar comprobante
    await session.execute(text("""
        UPDATE pagos_core.comprobantes_pago
        SET estado = :estado,
            monto_confirmado = :monto,
            motivo_rechazo = :motivo,
            notas_admin = :notas,
            revisado_por = :uid,
            revisado_en = NOW(),
            actualizado_en = NOW()
        WHERE id = :cid
    """), {
        "estado": nuevo_estado,
        "monto": monto_final if payload.aprobado else 0,
        "motivo": payload.motivo_rechazo,
        "notas": payload.notas_admin,
        "uid": user_id,
        "cid": comprobante_id
    })

    # 3. Disparar hooks según entidad de dominio
    if comp.entidad_tipo == "torneo_participante":
        if payload.aprobado:
            await session.execute(text("""
                UPDATE torneos_generales.participantes
                SET pago_confirmado = TRUE,
                    estado_pago = 'aprobado',
                    monto_abonado = :monto,
                    estado = 'Confirmado',
                    fecha_pago = NOW(),
                    motivo_rechazo_pago = NULL,
                    actualizado_en = NOW()
                WHERE id = :pid
            """), {"monto": monto_final, "pid": comp.entidad_id})
        else:
            await session.execute(text("""
                UPDATE torneos_generales.participantes
                SET pago_confirmado = FALSE,
                    estado_pago = 'rechazado',
                    motivo_rechazo_pago = :motivo,
                    actualizado_en = NOW()
                WHERE id = :pid
            """), {"motivo": payload.motivo_rechazo, "pid": comp.entidad_id})

    elif comp.entidad_tipo == "academia_cuota":
        if payload.aprobado:
            c_res = await session.execute(text("""
                SELECT id, alumno_id, academia_id FROM academias.cuotas WHERE id = :qid
            """), {"qid": comp.entidad_id})
            cuota = c_res.fetchone()
            if cuota:
                await session.execute(text("""
                    UPDATE academias.cuotas
                    SET estado = 'pagada',
                        monto_pagado = :monto,
                        actualizado_en = NOW()
                    WHERE id = :qid
                """), {"monto": monto_final, "qid": comp.entidad_id})

                await session.execute(text("""
                    INSERT INTO academias.pagos (
                        id, cuota_id, alumno_id, academia_id, monto, metodo_pago,
                        fecha_pago, notas, registrado_por, creado_en
                    ) VALUES (
                        gen_random_uuid(), :qid, :aid, :acid, :monto, :metodo,
                        CURRENT_DATE, :notas, :uid, NOW()
                    )
                """), {
                    "qid": cuota.id,
                    "aid": cuota.alumno_id,
                    "acid": cuota.academia_id,
                    "monto": monto_final,
                    "metodo": comp.metodo_pago,
                    "notas": f"Comprobante Ref: {comp.numero_referencia or 'S/N'}",
                    "uid": user_id
                })

    await session.commit()

    return {
        "comprobante_id": comprobante_id,
        "estado": nuevo_estado,
        "mensaje": f"Comprobante {'aprobado exitosamente' if payload.aprobado else 'marcado como rechazado'}."
    }
