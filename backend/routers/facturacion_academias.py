"""
routers/facturacion_academias.py
API REST para gestión de Facturación Electrónica SIFEN por academia.
Prefix: /academia/facturacion

Roles válidos (mismo sistema RBAC de academias.py):
  - dueño, administrador → acceso completo
  - tesorero              → consultar y emitir
  - profesor              → sin acceso
"""
from __future__ import annotations

import os
import uuid
import io
import base64
import urllib.parse
from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request, status
from fastapi.responses import HTMLResponse, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from database import get_session
from security import get_current_user
from routers.academias import get_academia_context, require_roles

from schemas.facturacion import (
    EmisorAcademiaUpdate, EmisorAcademiaOut,
    DatosFacturacionCreate, DatosFacturacionOut,
    DocumentoElectronicoCreate, DocumentoElectronicoOut,
    DocumentoElectronicoListItem, CancelarDocumentoRequest,
    FirmarDocumentoRequest, CertificadoDigitalOut,
)
from services.facturacion_service import (
    emitir_factura_academia,
    firmar_documento,
)
from sifen.config import CERTS_DIR

router = APIRouter(prefix="/academia/facturacion", tags=["Facturación Electrónica"])


# ============================================================
# EMISOR SIFEN
# ============================================================

@router.get("/emisor", response_model=EmisorAcademiaOut)
async def obtener_emisor(
    request: Request,
    current_user: dict = Depends(require_roles("dueño", "administrador", "tesorero")),
    session: AsyncSession = Depends(get_session),
):
    """
    Obtiene la configuración SIFEN del emisor de la academia.
    Si no existe, la crea con valores por defecto (vacíos).
    """
    ctx = await get_academia_context(request, current_user, session)
    academia_id = str(ctx["academia_id"])

    try:
        res = await session.execute(
            text("""
                SELECT id, academia_id, ruc_con_dv, tipo_contribuyente, razon_social,
                       nombre_fantasia, direccion, num_casa, telefono, email,
                       c_dep_emi, d_des_dep_emi, c_ciu_emi, d_des_ciu_emi,
                       c_act_eco, d_des_act_eco, num_tim, d_est, d_pun_exp,
                       id_csc, ultimo_num_doc, activo, actualizado_en
                FROM facturacion.emisor_academia
                WHERE academia_id = CAST(:aid AS UUID)
            """),
            {"aid": academia_id}
        )
        row = res.fetchone()

        # Si no existe, crear registro vacío
        if not row:
            res2 = await session.execute(
                text("""
                    INSERT INTO facturacion.emisor_academia
                        (academia_id, ruc_con_dv, razon_social)
                    VALUES (CAST(:aid AS UUID), '', '')
                    RETURNING id, academia_id, ruc_con_dv, tipo_contribuyente, razon_social,
                              nombre_fantasia, direccion, num_casa, telefono, email,
                              c_dep_emi, d_des_dep_emi, c_ciu_emi, d_des_ciu_emi,
                              c_act_eco, d_des_act_eco, num_tim, d_est, d_pun_exp,
                              id_csc, ultimo_num_doc, activo, actualizado_en
                """),
                {"aid": academia_id}
            )
            await session.commit()
            row = res2.fetchone()

        # Verificar si tiene certificado activo
        res_cert = await session.execute(
            text("SELECT COUNT(*) FROM facturacion.certificados_digitales WHERE academia_id = CAST(:aid AS UUID) AND activo = TRUE"),
            {"aid": academia_id}
        )
        tiene_certificado = (res_cert.scalar() or 0) > 0

        return EmisorAcademiaOut(
            id=str(row[0]),
            academia_id=str(row[1]),
            ruc_con_dv=row[2] or "",
            tipo_contribuyente=row[3] or 1,
            razon_social=row[4] or "",
            nombre_fantasia=row[5],
            direccion=row[6],
            num_casa=row[7],
            telefono=row[8],
            email=row[9],
            c_dep_emi=row[10],
            d_des_dep_emi=row[11],
            c_ciu_emi=row[12],
            d_des_ciu_emi=row[13],
            c_act_eco=row[14],
            d_des_act_eco=row[15],
            num_tim=row[16],
            d_est=row[17] or "001",
            d_pun_exp=row[18] or "001",
            id_csc=row[19] or "0001",
            ultimo_num_doc=row[20] or 0,
            activo=row[21] if row[21] is not None else True,
            tiene_certificado=tiene_certificado,
            actualizado_en=row[22],
        )
    except Exception as e:
        await session.rollback()
        print(f"WARN: Error en obtener_emisor: {e}")
        return EmisorAcademiaOut(
            id=str(uuid.uuid4()),
            academia_id=academia_id,
            ruc_con_dv="",
            tipo_contribuyente=1,
            razon_social="",
            d_est="001",
            d_pun_exp="001",
            id_csc="0001",
            ultimo_num_doc=0,
            activo=False,
            tiene_certificado=False,
        )


@router.get("/emisor/status")
async def obtener_emisor_status(
    request: Request,
    current_user: dict = Depends(require_roles("dueño", "administrador", "tesorero")),
    session: AsyncSession = Depends(get_session),
):
    """
    Retorna el estado de configuración del emisor SIFEN para la academia.
    """
    ctx = await get_academia_context(request, current_user, session)
    academia_id = str(ctx["academia_id"])

    try:
        res = await session.execute(
            text("""
                SELECT ruc_con_dv, razon_social, num_tim, id_csc, activo
                FROM facturacion.emisor_academia
                WHERE academia_id = CAST(:aid AS UUID)
            """),
            {"aid": academia_id}
        )
        row = res.fetchone()

        res_cert = await session.execute(
            text("SELECT COUNT(*), MAX(expira_en) FROM facturacion.certificados_digitales WHERE academia_id = CAST(:aid AS UUID) AND activo = TRUE"),
            {"aid": academia_id}
        )
        cert_row = res_cert.fetchone()
        tiene_cert = (cert_row[0] or 0) > 0 if cert_row else False
        expira_en = cert_row[1].isoformat() if cert_row and cert_row[1] else None

        configurado = bool(row and row[0] and row[1] and row[2])

        return {
            "configurado": configurado,
            "ruc": row[0] if row else "",
            "razon_social": row[1] if row else "",
            "num_timbrado": row[2] if row else "",
            "activo": row[4] if row and row[4] is not None else False,
            "tiene_certificado": tiene_cert,
            "certificado_expira_en": expira_en,
        }
    except Exception as e:
        await session.rollback()
        print(f"WARN: Error en obtener_emisor_status: {e}")
        return {
            "configurado": False,
            "ruc": "",
            "razon_social": "",
            "num_timbrado": "",
            "activo": False,
            "tiene_certificado": False,
            "certificado_expira_en": None,
        }



@router.put("/emisor")
async def actualizar_emisor(
    req: EmisorAcademiaUpdate,
    request: Request,
    current_user: dict = Depends(require_roles("dueño", "administrador")),
    session: AsyncSession = Depends(get_session),
):
    """Actualiza la configuración SIFEN del emisor de la academia."""
    ctx = await get_academia_context(request, current_user, session)
    academia_id = str(ctx["academia_id"])

    # Upsert
    await session.execute(
        text("""
            INSERT INTO facturacion.emisor_academia (academia_id, ruc_con_dv, razon_social)
            VALUES (:aid, '', '')
            ON CONFLICT (academia_id) DO NOTHING
        """),
        {"aid": academia_id}
    )

    updates = {}
    if req.ruc_con_dv is not None:        updates["ruc_con_dv"] = req.ruc_con_dv
    if req.tipo_contribuyente is not None: updates["tipo_contribuyente"] = req.tipo_contribuyente
    if req.razon_social is not None:       updates["razon_social"] = req.razon_social
    if req.nombre_fantasia is not None:    updates["nombre_fantasia"] = req.nombre_fantasia
    if req.direccion is not None:          updates["direccion"] = req.direccion
    if req.num_casa is not None:           updates["num_casa"] = req.num_casa
    if req.telefono is not None:           updates["telefono"] = req.telefono
    if req.email is not None:              updates["email"] = req.email
    if req.c_dep_emi is not None:          updates["c_dep_emi"] = req.c_dep_emi
    if req.d_des_dep_emi is not None:      updates["d_des_dep_emi"] = req.d_des_dep_emi
    if req.c_ciu_emi is not None:          updates["c_ciu_emi"] = req.c_ciu_emi
    if req.d_des_ciu_emi is not None:      updates["d_des_ciu_emi"] = req.d_des_ciu_emi
    if req.c_act_eco is not None:          updates["c_act_eco"] = req.c_act_eco
    if req.d_des_act_eco is not None:      updates["d_des_act_eco"] = req.d_des_act_eco
    if req.num_tim is not None:            updates["num_tim"] = req.num_tim
    if req.d_est is not None:              updates["d_est"] = req.d_est
    if req.d_pun_exp is not None:          updates["d_pun_exp"] = req.d_pun_exp
    if req.id_csc is not None:             updates["id_csc"] = req.id_csc
    if req.csc_secreto is not None:        updates["csc_secreto"] = req.csc_secreto

    if updates:
        set_clause = ", ".join(f"{k} = :{k}" for k in updates)
        updates["academia_id"] = academia_id
        updates["ts"] = datetime.utcnow()
        await session.execute(
            text(f"UPDATE facturacion.emisor_academia SET {set_clause}, actualizado_en = :ts WHERE academia_id = :academia_id"),
            updates
        )

    await session.commit()
    return {"status": "ok", "message": "Datos del emisor SIFEN actualizados."}


# ============================================================
# CERTIFICADO DIGITAL .p12
# ============================================================

@router.post("/emisor/certificado")
async def subir_certificado(
    request: Request,
    file: UploadFile = File(...),
    current_user: dict = Depends(require_roles("dueño")),
    session: AsyncSession = Depends(get_session),
):
    """
    Sube el certificado digital .p12 de la academia.
    Se almacena en el directorio SIFEN_CERTS_DIR.
    Se desactivan certificados anteriores.
    """
    ctx = await get_academia_context(request, current_user, session)
    academia_id = str(ctx["academia_id"])

    if not file.filename or not file.filename.lower().endswith(".p12"):
        raise HTTPException(status_code=400, detail="Solo se aceptan archivos .p12")

    # Crear directorio de destino
    cert_dir = os.path.join(CERTS_DIR, academia_id)
    os.makedirs(cert_dir, exist_ok=True)

    filename = f"{uuid.uuid4().hex}.p12"
    filepath = os.path.join(cert_dir, filename)

    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)

    # Desactivar certificados anteriores
    await session.execute(
        text("UPDATE facturacion.certificados_digitales SET activo = FALSE WHERE academia_id = :aid"),
        {"aid": academia_id}
    )

    # Guardar nuevo certificado
    await session.execute(
        text("""
            INSERT INTO facturacion.certificados_digitales
                (academia_id, nombre_archivo, ruta_archivo, activo)
            VALUES (:aid, :nombre, :ruta, TRUE)
        """),
        {"aid": academia_id, "nombre": file.filename, "ruta": filepath}
    )
    await session.commit()

    return {
        "status": "ok",
        "message": "Certificado .p12 subido correctamente. Configure la contraseña desde el panel.",
        "nombre_archivo": file.filename,
    }


@router.put("/emisor/certificado/password")
async def actualizar_password_certificado(
    request: Request,
    body: dict,
    current_user: dict = Depends(require_roles("dueño")),
    session: AsyncSession = Depends(get_session),
):
    """Guarda (cifrada) la contraseña del .p12 activo de la academia."""
    ctx = await get_academia_context(request, current_user, session)
    academia_id = str(ctx["academia_id"])

    password = body.get("password", "")
    fernet_key = os.getenv("SIFEN_FERNET_KEY", "")
    if fernet_key:
        try:
            from cryptography.fernet import Fernet
            f = Fernet(fernet_key.encode())
            password_enc = f.encrypt(password.encode()).decode()
        except Exception:
            password_enc = password  # fallback sin cifrar (no recomendado)
    else:
        password_enc = password

    await session.execute(
        text("""
            UPDATE facturacion.certificados_digitales
            SET password_enc = :pwd
            WHERE academia_id = :aid AND activo = TRUE
        """),
        {"pwd": password_enc, "aid": academia_id}
    )
    await session.commit()
    return {"status": "ok", "message": "Contraseña del certificado actualizada."}


@router.delete("/emisor/certificado")
async def eliminar_certificado(
    request: Request,
    current_user: dict = Depends(require_roles("dueño")),
    session: AsyncSession = Depends(get_session),
):
    """Desactiva el certificado .p12 activo de la academia."""
    ctx = await get_academia_context(request, current_user, session)
    academia_id = str(ctx["academia_id"])

    await session.execute(
        text("UPDATE facturacion.certificados_digitales SET activo = FALSE WHERE academia_id = :aid"),
        {"aid": academia_id}
    )
    await session.commit()
    return {"status": "ok", "message": "Certificado desactivado."}


@router.get("/emisor/certificado", response_model=Optional[CertificadoDigitalOut])
async def ver_certificado(
    request: Request,
    current_user: dict = Depends(require_roles("dueño", "administrador")),
    session: AsyncSession = Depends(get_session),
):
    """Ver info del certificado .p12 activo de la academia."""
    ctx = await get_academia_context(request, current_user, session)
    academia_id = str(ctx["academia_id"])

    res = await session.execute(
        text("""
            SELECT id, nombre_archivo, activo, valido_hasta, creado_en
            FROM facturacion.certificados_digitales
            WHERE academia_id = :aid AND activo = TRUE
            ORDER BY creado_en DESC LIMIT 1
        """),
        {"aid": academia_id}
    )
    row = res.fetchone()
    if not row:
        return None
    return CertificadoDigitalOut(
        id=str(row[0]),
        nombre_archivo=row[1],
        activo=row[2],
        valido_hasta=row[3],
        creado_en=row[4],
    )


# ============================================================
# DATOS DE FACTURACIÓN (RECEPTOR)
# ============================================================

@router.post("/datos-facturacion", response_model=DatosFacturacionOut)
async def crear_datos_facturacion(
    req: DatosFacturacionCreate,
    request: Request,
    current_user: dict = Depends(require_roles("dueño", "administrador", "tesorero")),
    session: AsyncSession = Depends(get_session),
):
    """Registra o actualiza datos de facturación de un alumno/tutor."""
    ctx = await get_academia_context(request, current_user, session)
    academia_id = str(ctx["academia_id"])

    if not req.alumno_id and not req.tutor_id:
        raise HTTPException(status_code=400, detail="Debe especificar alumno_id o tutor_id.")
    if not req.receptor_nombre:
        raise HTTPException(status_code=400, detail="receptor_nombre es obligatorio.")

    # Upsert: si ya existe para ese alumno/tutor, actualizar
    res = await session.execute(
        text("""
            SELECT id FROM facturacion.datos_facturacion
            WHERE academia_id = :aid
              AND (alumno_id = :alumno_id OR tutor_id = :tutor_id)
            LIMIT 1
        """),
        {
            "aid": academia_id,
            "alumno_id": req.alumno_id,
            "tutor_id": req.tutor_id,
        }
    )
    existing = res.fetchone()

    if existing:
        await session.execute(
            text("""
                UPDATE facturacion.datos_facturacion
                SET receptor_ruc = :ruc, receptor_dv = :dv,
                    receptor_nombre = :nombre, receptor_dir = :dir,
                    receptor_tel = :tel, receptor_email = :email,
                    c_dep_rec = :c_dep, d_des_dep_rec = :d_dep,
                    c_ciu_rec = :c_ciu, d_des_ciu_rec = :d_ciu,
                    es_pagador_principal = :es_pag, actualizado_en = NOW()
                WHERE id = :id
            """),
            {
                "id": str(existing[0]),
                "ruc": req.receptor_ruc, "dv": req.receptor_dv,
                "nombre": req.receptor_nombre, "dir": req.receptor_dir,
                "tel": req.receptor_tel, "email": req.receptor_email,
                "c_dep": req.c_dep_rec, "d_dep": req.d_des_dep_rec,
                "c_ciu": req.c_ciu_rec, "d_ciu": req.d_des_ciu_rec,
                "es_pag": req.es_pagador_principal,
            }
        )
        df_id = str(existing[0])
    else:
        res2 = await session.execute(
            text("""
                INSERT INTO facturacion.datos_facturacion
                    (academia_id, alumno_id, tutor_id,
                     receptor_ruc, receptor_dv, receptor_nombre, receptor_dir,
                     receptor_tel, receptor_email, c_dep_rec, d_des_dep_rec,
                     c_ciu_rec, d_des_ciu_rec, es_pagador_principal)
                VALUES
                    (:aid, :alumno_id, :tutor_id,
                     :ruc, :dv, :nombre, :dir,
                     :tel, :email, :c_dep, :d_dep,
                     :c_ciu, :d_ciu, :es_pag)
                RETURNING id
            """),
            {
                "aid": academia_id,
                "alumno_id": req.alumno_id, "tutor_id": req.tutor_id,
                "ruc": req.receptor_ruc, "dv": req.receptor_dv,
                "nombre": req.receptor_nombre, "dir": req.receptor_dir,
                "tel": req.receptor_tel, "email": req.receptor_email,
                "c_dep": req.c_dep_rec, "d_dep": req.d_des_dep_rec,
                "c_ciu": req.c_ciu_rec, "d_ciu": req.d_des_ciu_rec,
                "es_pag": req.es_pagador_principal,
            }
        )
        df_id = str(res2.scalar())

    await session.commit()

    return DatosFacturacionOut(
        id=df_id,
        academia_id=academia_id,
        alumno_id=req.alumno_id,
        tutor_id=req.tutor_id,
        receptor_ruc=req.receptor_ruc,
        receptor_dv=req.receptor_dv,
        receptor_nombre=req.receptor_nombre,
        receptor_dir=req.receptor_dir,
        receptor_tel=req.receptor_tel,
        receptor_email=req.receptor_email,
        c_dep_rec=req.c_dep_rec,
        d_des_dep_rec=req.d_des_dep_rec,
        c_ciu_rec=req.c_ciu_rec,
        d_des_ciu_rec=req.d_des_ciu_rec,
        es_pagador_principal=req.es_pagador_principal or True,
        creado_en=datetime.utcnow(),
    )


@router.get("/datos-facturacion/alumno/{alumno_id}", response_model=Optional[DatosFacturacionOut])
async def obtener_datos_facturacion_alumno(
    alumno_id: str,
    request: Request,
    current_user: dict = Depends(require_roles("dueño", "administrador", "tesorero")),
    session: AsyncSession = Depends(get_session),
):
    """Obtiene los datos de facturación del alumno o su tutor pagador."""
    ctx = await get_academia_context(request, current_user, session)
    academia_id = str(ctx["academia_id"])

    res = await session.execute(
        text("""
            SELECT id, academia_id, alumno_id, tutor_id,
                   receptor_ruc, receptor_dv, receptor_nombre, receptor_dir,
                   receptor_tel, receptor_email, c_dep_rec, d_des_dep_rec,
                   c_ciu_rec, d_des_ciu_rec, es_pagador_principal, creado_en
            FROM facturacion.datos_facturacion
            WHERE academia_id = :aid AND (alumno_id = :alumno_id OR tutor_id IN (
                SELECT t.id FROM academias.tutores t
                JOIN academias.alumno_tutores at ON at.tutor_id = t.id
                WHERE at.alumno_id = :alumno_id
            ))
            ORDER BY es_pagador_principal DESC, creado_en DESC
            LIMIT 1
        """),
        {"aid": academia_id, "alumno_id": alumno_id}
    )
    row = res.fetchone()
    if not row:
        return None

    return DatosFacturacionOut(
        id=str(row[0]), academia_id=str(row[1]),
        alumno_id=str(row[2]) if row[2] else None,
        tutor_id=str(row[3]) if row[3] else None,
        receptor_ruc=row[4], receptor_dv=row[5],
        receptor_nombre=row[6], receptor_dir=row[7],
        receptor_tel=row[8], receptor_email=row[9],
        c_dep_rec=row[10], d_des_dep_rec=row[11],
        c_ciu_rec=row[12], d_des_ciu_rec=row[13],
        es_pagador_principal=row[14] or True,
        creado_en=row[15],
    )


# ============================================================
# DOCUMENTOS ELECTRÓNICOS (FACTURAS)
# ============================================================

@router.get("/documentos", response_model=List[DocumentoElectronicoListItem])
async def listar_documentos(
    request: Request,
    estado: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: dict = Depends(require_roles("dueño", "administrador", "tesorero")),
    session: AsyncSession = Depends(get_session),
):
    """Lista los documentos electrónicos (facturas) emitidos por la academia."""
    ctx = await get_academia_context(request, current_user, session)
    academia_id = str(ctx["academia_id"])

    try:
        where_extra = "AND estado = :estado" if estado else ""
        params: dict = {"aid": academia_id, "skip": skip, "limit": limit}
        if estado:
            params["estado"] = estado

        res = await session.execute(
            text(f"""
                SELECT id, cdc, numero_documento, d_fe_emi_de, receptor_nombre,
                       d_tot_gral_ope, estado, cancelado, cuota_id, matricula_id,
                       concepto_libre, creado_en
                FROM facturacion.documentos_electronicos
                WHERE academia_id = CAST(:aid AS UUID) {where_extra}
                ORDER BY creado_en DESC
                LIMIT :limit OFFSET :skip
            """),
            params
        )
        rows = res.fetchall()
        return [
            DocumentoElectronicoListItem(
                id=str(r[0]), cdc=r[1], numero_documento=r[2],
                d_fe_emi_de=r[3], receptor_nombre=r[4],
                d_tot_gral_ope=r[5], estado=r[6], cancelado=r[7],
                cuota_id=str(r[8]) if r[8] else None,
                matricula_id=str(r[9]) if r[9] else None,
                concepto_libre=r[10], creado_en=r[11],
            )
            for r in rows
        ]
    except Exception as e:
        await session.rollback()
        print(f"WARN: Error en listar_documentos: {e}")
        return []


@router.get("/documentos/{documento_id}", response_model=DocumentoElectronicoOut)
async def obtener_documento(
    documento_id: str,
    request: Request,
    current_user: dict = Depends(require_roles("dueño", "administrador", "tesorero")),
    session: AsyncSession = Depends(get_session),
):
    """Detalle completo de un documento electrónico (con líneas)."""
    ctx = await get_academia_context(request, current_user, session)
    academia_id = str(ctx["academia_id"])

    res = await session.execute(
        text("""
            SELECT id, academia_id, cdc, numero_documento, d_fe_emi_de,
                   receptor_nombre, receptor_ruc, receptor_dv,
                   d_tot_gral_ope, d_tot_iva, estado, cancelado,
                   cuota_id, matricula_id, concepto_libre, d_car_qr, creado_en
            FROM facturacion.documentos_electronicos
            WHERE id = :did AND academia_id = :aid
        """),
        {"did": documento_id, "aid": academia_id}
    )
    row = res.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Documento no encontrado.")

    # Obtener líneas
    res_ln = await session.execute(
        text("""
            SELECT id, orden, d_cod_int, d_des_pro_ser, c_uni_med, d_des_uni_med,
                   d_cant_pro_ser, d_p_uni_pro_ser, d_tasa_iva, i_afec_iva
            FROM facturacion.de_lineas
            WHERE documento_id = :did
            ORDER BY orden
        """),
        {"did": documento_id}
    )
    from schemas.facturacion import LineaDocumentoOut
    lineas = [
        LineaDocumentoOut(
            id=str(ln[0]), orden=ln[1], d_cod_int=ln[2],
            d_des_pro_ser=ln[3], c_uni_med=ln[4], d_des_uni_med=ln[5],
            d_cant_pro_ser=float(ln[6]), d_p_uni_pro_ser=ln[7],
            d_tasa_iva=ln[8], i_afec_iva=ln[9],
        )
        for ln in res_ln.fetchall()
    ]

    return DocumentoElectronicoOut(
        id=str(row[0]), academia_id=str(row[1]),
        cdc=row[2], numero_documento=row[3], d_fe_emi_de=row[4],
        receptor_nombre=row[5], receptor_ruc=row[6],
        d_tot_gral_ope=row[8], d_tot_iva=row[9],
        estado=row[10], cancelado=row[11],
        cuota_id=str(row[12]) if row[12] else None,
        matricula_id=str(row[13]) if row[13] else None,
        concepto_libre=row[14], d_car_qr=row[15], creado_en=row[16],
        lineas=lineas,
    )


@router.get("/documentos/{documento_id}/xml")
async def descargar_xml(
    documento_id: str,
    firmado: bool = False,
    request: Request = None,
    current_user: dict = Depends(require_roles("dueño", "administrador")),
    session: AsyncSession = Depends(get_session),
):
    """Descarga el XML generado o firmado del DE."""
    ctx = await get_academia_context(request, current_user, session)
    academia_id = str(ctx["academia_id"])

    res = await session.execute(
        text("SELECT cdc, xml_generado, xml_firmado FROM facturacion.documentos_electronicos WHERE id = :did AND academia_id = :aid"),
        {"did": documento_id, "aid": academia_id}
    )
    row = res.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Documento no encontrado.")

    contenido = row[2] if firmado and row[2] else row[1]
    if not contenido:
        raise HTTPException(status_code=404, detail="XML no disponible.")

    from fastapi.responses import Response
    return Response(
        content=contenido,
        media_type="application/xml",
        headers={"Content-Disposition": f'attachment; filename="DE_{row[0]}.xml"'},
    )


# ============================================================
# IMPRESIÓN Y REPRESENTACIÓN GRÁFICA (KuDE)
# ============================================================

def _generar_qr_base64(url: str) -> str:
    """Genera código QR en base64 de manera local o con fallback."""
    if not url:
        return ""
    try:
        import qrcode
        buf = io.BytesIO()
        img = qrcode.make(url)
        img.save(buf, format="PNG")
        return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()
    except Exception:
        return f"https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=4&data={urllib.parse.quote(url)}"


def _numero_a_letras(n: int) -> str:
    """Convierte un importe numérico entero a letras en idioma español (Guaraníes)."""
    if n <= 0:
        return "GUARANÍES CERO"

    unidades = ["", "UN", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"]
    decenas_especiales = {
        10: "DIEZ", 11: "ONCE", 12: "DOCE", 13: "TRECE", 14: "CATORCE", 15: "QUINCE",
        16: "DIECISÉIS", 17: "DIECISIETE", 18: "DIECIOCHO", 19: "DIECINUEVE",
        20: "VEINTE", 21: "VEINTIÚN", 22: "VEINTIDÓS", 23: "VEINTITRÉS", 24: "VEINTICUATRO",
        25: "VEINTICINCO", 26: "VEINTISÉIS", 27: "VEINTISIETE", 28: "VEINTIOCHO", 29: "VEINTINUEVE"
    }
    decenas = ["", "", "", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"]
    centenas = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS",
                "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"]

    def _seccion(num: int) -> str:
        if num == 0:
            return ""
        if num == 100:
            return "CIEN"
        c = num // 100
        resto_c = num % 100
        res = centenas[c] + " " if c > 0 else ""
        if resto_c in decenas_especiales:
            res += decenas_especiales[resto_c]
        else:
            d = resto_c // 10
            u = resto_c % 10
            if d > 0:
                res += decenas[d]
                if u > 0:
                    res += " Y " + unidades[u]
            elif u > 0:
                res += unidades[u]
        return res.strip()

    millones = n // 1_000_000
    resto_millones = n % 1_000_000
    miles = resto_millones // 1_000
    unidades_final = resto_millones % 1_000

    partes = []
    if millones > 0:
        if millones == 1:
            partes.append("UN MILLÓN")
        else:
            partes.append(f"{_seccion(millones)} MILLONES")
    if miles > 0:
        if miles == 1:
            partes.append("MIL")
        else:
            partes.append(f"{_seccion(miles)} MIL")
    if unidades_final > 0:
        partes.append(_seccion(unidades_final))

    resultado = " ".join(partes).strip()
    return f"GUARANÍES {resultado}"


async def _obtener_datos_completos_kude(documento_id: str, academia_id: str, session: AsyncSession) -> dict:
    """Obtiene y formatea todos los datos requeridos para la representación gráfica KuDE."""
    res = await session.execute(
        text("""
            SELECT de.id, de.academia_id, de.cdc, de.numero_documento, de.d_fe_emi_de,
                   de.receptor_ruc, de.receptor_dv, de.receptor_nombre, de.receptor_dir,
                   de.receptor_tel, de.receptor_email, de.c_dep_rec, de.d_des_dep_rec,
                   de.c_ciu_rec, de.d_des_ciu_rec, de.i_cond_ope, de.d_tot_gral_ope,
                   de.d_tot_iva, de.d_car_qr, de.estado, de.cancelado, de.motivo_cancelacion,
                   de.cancelado_en, de.creado_en, de.cuota_id, de.matricula_id, de.concepto_libre,
                   em.ruc_con_dv, em.tipo_contribuyente, em.razon_social, em.nombre_fantasia,
                   em.direccion, em.num_casa, em.telefono, em.email,
                   em.d_des_ciu_emi, em.d_des_dep_emi, em.c_act_eco, em.d_des_act_eco,
                   em.num_tim, em.d_est, em.d_pun_exp,
                   acad.nombre AS academia_nombre, acad.logo_url
            FROM facturacion.documentos_electronicos de
            LEFT JOIN facturacion.emisor_academia em ON em.academia_id = de.academia_id
            LEFT JOIN academias.academias acad ON acad.id = de.academia_id
            WHERE de.id = CAST(:did AS UUID) AND de.academia_id = CAST(:aid AS UUID)
        """),
        {"did": documento_id, "aid": academia_id}
    )
    row = res.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Documento electrónico no encontrado.")

    # Líneas
    res_ln = await session.execute(
        text("""
            SELECT id, orden, d_cod_int, d_des_pro_ser, c_uni_med, d_des_uni_med,
                   d_cant_pro_ser, d_p_uni_pro_ser, d_tasa_iva, i_afec_iva
            FROM facturacion.de_lineas
            WHERE documento_id = CAST(:did AS UUID)
            ORDER BY orden ASC
        """),
        {"did": documento_id}
    )
    raw_lines = res_ln.fetchall()

    lineas = []
    subtotal_exenta = 0
    subtotal_5 = 0
    subtotal_10 = 0
    liq_iva_5 = 0
    liq_iva_10 = 0

    for ln in raw_lines:
        cant = float(ln[6] or 1.0)
        p_uni = int(ln[7] or 0)
        tasa = int(ln[8] if ln[8] is not None else 10)
        subtotal = round(cant * p_uni)

        m_exe = subtotal if tasa == 0 else 0
        m_5 = subtotal if tasa == 5 else 0
        m_10 = subtotal if tasa == 10 else 0

        l_iva5 = round(subtotal / 21) if tasa == 5 else 0
        l_iva10 = round(subtotal / 11) if tasa == 10 else 0

        subtotal_exenta += m_exe
        subtotal_5 += m_5
        subtotal_10 += m_10
        liq_iva_5 += l_iva5
        liq_iva_10 += l_iva10

        lineas.append({
            "orden": ln[1],
            "codigo": ln[2] or f"SERV-{ln[1]}",
            "descripcion": ln[3] or "Servicio Deportivo",
            "unidad_medida": ln[5] or "SERVICIO",
            "cantidad": cant,
            "precio_unitario": p_uni,
            "tasa_iva": tasa,
            "monto_exenta": m_exe,
            "monto_5": m_5,
            "monto_10": m_10,
            "subtotal": subtotal,
        })

    tot_gral = int(row[16] or (subtotal_exenta + subtotal_5 + subtotal_10))
    tot_iva = int(row[17] or (liq_iva_5 + liq_iva_10))

    d_est = row[39] or "001"
    d_pun_exp = row[40] or "001"
    num_doc = row[3] or 1
    numero_formateado = f"{d_est}-{d_pun_exp}-{str(num_doc).zfill(7)}"

    cdc_raw = row[2] or ""
    cdc_formateado = " ".join(cdc_raw[i:i+4] for i in range(0, len(cdc_raw), 4)) if cdc_raw else ""

    rec_ruc = row[5] or "Sin RUC"
    if row[6]:
        rec_ruc = f"{row[5]}-{row[6]}"

    fe_emi = row[4] or row[23]
    fecha_emision_str = fe_emi.strftime("%d/%m/%Y %H:%M:%S") if fe_emi else ""

    qr_url = row[18] or ""
    qr_b64 = _generar_qr_base64(qr_url)

    razon_social = row[29] or row[41] or "Academia Deportiva"
    nombre_fantasia = row[30] or row[41] or ""
    ruc_emisor = row[27] or "Sin RUC"

    ciudad_dep_emisor = ""
    if row[35] and row[36]:
        ciudad_dep_emisor = f"{row[35]} - {row[36]}"
    elif row[35] or row[36]:
        ciudad_dep_emisor = row[35] or row[36]

    return {
        "id": str(row[0]),
        "academia_id": str(row[1]),
        "numero_documento": num_doc,
        "numero_documento_formateado": numero_formateado,
        "cdc": cdc_raw,
        "cdc_formateado": cdc_formateado,
        "fecha_emision": fe_emi.isoformat() if fe_emi else None,
        "fecha_emision_formateada": fecha_emision_str,
        "condicion_venta": "CONTADO" if (row[15] or 1) == 1 else "CRÉDITO",
        "i_cond_ope": row[15] or 1,
        "total_gral": tot_gral,
        "total_en_letras": _numero_a_letras(tot_gral),
        "total_iva": tot_iva,
        "subtotal_exenta": subtotal_exenta,
        "subtotal_5": subtotal_5,
        "subtotal_10": subtotal_10,
        "liq_iva_5": liq_iva_5,
        "liq_iva_10": liq_iva_10,
        "d_car_qr": qr_url,
        "qr_image_base64": qr_b64,
        "estado": row[19] or "generado",
        "cancelado": bool(row[20]),
        "motivo_cancelacion": row[21],
        "cancelado_en": row[22].isoformat() if row[22] else None,
        "cuota_id": str(row[24]) if row[24] else None,
        "matricula_id": str(row[25]) if row[25] else None,
        "concepto_libre": row[26],
        "emisor": {
            "razon_social": razon_social,
            "nombre_fantasia": nombre_fantasia,
            "ruc_con_dv": ruc_emisor,
            "num_timbrado": row[38] or "00000000",
            "establecimiento": d_est,
            "punto_expedicion": d_pun_exp,
            "direccion": row[31] or "Dirección no especificada",
            "num_casa": row[32] or "S/N",
            "telefono": row[33] or "",
            "email": row[34] or "",
            "ciudad_departamento": ciudad_dep_emisor,
            "actividad_economica": row[37] or "Enseñanza y Actividades Deportivas",
            "logo_url": row[42] or "",
        },
        "receptor": {
            "nombre": row[7] or "Cliente Ocasional",
            "ruc_con_dv": rec_ruc,
            "direccion": row[8] or "Sin especificar",
            "telefono": row[9] or "",
            "email": row[10] or "",
            "ciudad": row[14] or "",
            "departamento": row[12] or "",
        },
        "lineas": lineas,
    }


def _render_kude_html(kude: dict, autoprint: bool = False) -> str:
    """Genera la representación gráfica KuDE en HTML/CSS oficial de la SET/DNIT Paraguay."""
    em = kude["emisor"]
    rec = kude["receptor"]
    doc = kude

    lineas_html = ""
    for ln in doc["lineas"]:
        cant_str = f"{ln['cantidad']:g}"
        p_uni_str = f"{ln['precio_unitario']:,}".replace(",", ".")
        m_exe_str = f"{ln['monto_exenta']:,}".replace(",", ".") if ln["monto_exenta"] > 0 else "0"
        m_5_str = f"{ln['monto_5']:,}".replace(",", ".") if ln["monto_5"] > 0 else "0"
        m_10_str = f"{ln['monto_10']:,}".replace(",", ".") if ln["monto_10"] > 0 else "0"

        lineas_html += f"""
        <tr>
          <td style="text-align:center; font-family:monospace;">{ln['codigo']}</td>
          <td style="text-align:center; font-weight:700;">{cant_str}</td>
          <td>{ln['descripcion']}</td>
          <td style="text-align:right; font-family:monospace;">{p_uni_str}</td>
          <td style="text-align:right; font-family:monospace;">{m_exe_str}</td>
          <td style="text-align:right; font-family:monospace;">{m_5_str}</td>
          <td style="text-align:right; font-family:monospace;">{m_10_str}</td>
        </tr>
        """

    total_gral_str = f"{doc['total_gral']:,}".replace(",", ".")
    sub_exe_str = f"{doc['subtotal_exenta']:,}".replace(",", ".")
    sub_5_str = f"{doc['subtotal_5']:,}".replace(",", ".")
    sub_10_str = f"{doc['subtotal_10']:,}".replace(",", ".")
    iva_5_str = f"{doc['liq_iva_5']:,}".replace(",", ".")
    iva_10_str = f"{doc['liq_iva_10']:,}".replace(",", ".")
    tot_iva_str = f"{doc['total_iva']:,}".replace(",", ".")

    watermark_html = ""
    if doc.get("cancelado"):
        watermark_html = '<div class="cancelado-watermark">DOCUMENTO ANULADO / CANCELADO</div>'

    logo_img_html = ""
    if em.get("logo_url"):
        logo_img_html = f'<img src="{em["logo_url"]}" alt="Logo" style="max-height: 52px; max-width: 140px; object-fit: contain; margin-bottom: 6px;" />'

    autoprint_script = "<script>window.onload = function() { setTimeout(() => window.print(), 350); };</script>" if autoprint else ""

    return f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Factura Electrónica {doc['numero_documento_formateado']} - {em['razon_social']}</title>
  <style>
    @page {{
      size: A4 portrait;
      margin: 8mm 10mm;
    }}
    * {{
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }}
    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      font-size: 11px;
      color: #0f172a;
      background: #f1f5f9;
      line-height: 1.35;
    }}
    .action-bar {{
      max-width: 820px;
      margin: 14px auto 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      padding: 10px 18px;
      background: #0f172a;
      border-radius: 10px;
      color: #f8fafc;
      box-shadow: 0 4px 14px rgba(0,0,0,0.15);
    }}
    .btn-print {{
      background: #2563eb;
      color: #ffffff;
      border: none;
      padding: 9px 20px;
      border-radius: 7px;
      font-weight: 800;
      font-size: 13px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 2px 6px rgba(37,99,235,0.4);
      transition: background .15s;
    }}
    .btn-print:hover {{ background: #1d4ed8; }}
    .btn-ghost {{
      background: rgba(255,255,255,0.08);
      color: #e2e8f0;
      border: 1px solid rgba(255,255,255,0.2);
      padding: 8px 14px;
      border-radius: 7px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }}
    .btn-ghost:hover {{ background: rgba(255,255,255,0.18); color: #fff; }}
    .kude-container {{
      max-width: 820px;
      margin: 14px auto 30px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 22px 24px;
      box-shadow: 0 4px 18px rgba(0,0,0,0.06);
      position: relative;
    }}
    .header-table {{
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
    }}
    .emisor-cell {{
      width: 58%;
      vertical-align: top;
      padding-right: 14px;
    }}
    .fiscal-box {{
      width: 42%;
      border: 2px solid #0f172a;
      border-radius: 8px;
      text-align: center;
      padding: 10px 12px;
      vertical-align: middle;
      background: #fafafa;
    }}
    .emisor-title {{
      font-size: 15px;
      font-weight: 900;
      text-transform: uppercase;
      color: #0f172a;
      margin-bottom: 3px;
    }}
    .emisor-fantasy {{
      font-size: 13px;
      font-weight: 800;
      color: #1d4ed8;
      margin-bottom: 4px;
    }}
    .emisor-meta {{
      font-size: 10.5px;
      color: #475569;
      line-height: 1.4;
    }}
    .fiscal-box .timbrado {{
      font-size: 11px;
      font-weight: 700;
      color: #334155;
    }}
    .fiscal-box .ruc {{
      font-size: 13px;
      font-weight: 900;
      color: #0f172a;
      margin: 3px 0;
    }}
    .fiscal-box .factura-title {{
      font-size: 14px;
      font-weight: 900;
      color: #1d4ed8;
      letter-spacing: 0.5px;
      margin: 4px 0;
    }}
    .fiscal-box .numero-doc {{
      font-size: 16px;
      font-weight: 900;
      font-family: monospace;
      color: #0f172a;
    }}
    .section-box {{
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 10px 12px;
      margin-bottom: 10px;
      background: #ffffff;
    }}
    .grid-2 {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 5px 14px;
    }}
    .info-label {{
      font-weight: 800;
      color: #475569;
      text-transform: uppercase;
      font-size: 9.5px;
      margin-right: 4px;
    }}
    .info-val {{
      font-size: 11px;
      color: #0f172a;
      font-weight: 500;
    }}
    .items-table {{
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      overflow: hidden;
    }}
    .items-table th {{
      background: #f8fafc;
      border-bottom: 1px solid #cbd5e1;
      border-right: 1px solid #cbd5e1;
      padding: 7px 8px;
      font-size: 9.5px;
      font-weight: 800;
      text-transform: uppercase;
      color: #334155;
    }}
    .items-table td {{
      border-bottom: 1px solid #e2e8f0;
      border-right: 1px solid #e2e8f0;
      padding: 6px 8px;
      font-size: 10.5px;
      color: #0f172a;
    }}
    .items-table tr:last-child td {{
      border-bottom: none;
    }}
    .totals-box {{
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 10px 12px;
      margin-bottom: 10px;
      background: #f8fafc;
    }}
    .total-grand-row {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 6px;
      margin-bottom: 6px;
    }}
    .total-grand-title {{
      font-size: 13px;
      font-weight: 900;
      color: #0f172a;
    }}
    .total-grand-amount {{
      font-size: 16px;
      font-weight: 900;
      color: #059669;
      font-family: monospace;
    }}
    .total-letras {{
      font-size: 10px;
      color: #334155;
      font-weight: 700;
      text-transform: uppercase;
      margin-bottom: 6px;
    }}
    .subtotales-table {{
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 6px;
      font-size: 10px;
    }}
    .subtotales-table td {{
      padding: 2px 4px;
    }}
    .iva-table {{
      width: 100%;
      border-collapse: collapse;
      border-top: 1px dashed #cbd5e1;
      padding-top: 6px;
      font-size: 10px;
    }}
    .iva-table td {{
      padding: 4px 6px;
      color: #475569;
    }}
    .iva-table .iva-bold {{
      font-weight: 800;
      color: #0f172a;
      font-family: monospace;
    }}
    .sifen-footer {{
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 10px 12px;
      display: flex;
      align-items: center;
      gap: 16px;
      background: #ffffff;
    }}
    .qr-img {{
      width: 110px;
      height: 110px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 4px;
      background: #ffffff;
      flex-shrink: 0;
    }}
    .sifen-details {{
      flex: 1;
      font-size: 10px;
      color: #334155;
      line-height: 1.4;
    }}
    .cdc-title {{
      font-weight: 900;
      color: #0f172a;
      text-transform: uppercase;
      font-size: 9.5px;
      margin-bottom: 2px;
    }}
    .cdc-number {{
      font-family: monospace;
      font-size: 10.5px;
      font-weight: 800;
      color: #1e40af;
      letter-spacing: 0.5px;
      word-break: break-all;
      background: #f1f5f9;
      padding: 3px 6px;
      border-radius: 4px;
      display: inline-block;
      margin-bottom: 5px;
    }}
    .legal-notice {{
      font-size: 9.5px;
      color: #64748b;
    }}
    .cancelado-watermark {{
      position: absolute;
      top: 40%;
      left: 10%;
      right: 10%;
      text-align: center;
      transform: rotate(-25deg);
      font-size: 48px;
      font-weight: 900;
      color: rgba(239, 68, 68, 0.28);
      border: 5px solid rgba(239, 68, 68, 0.28);
      border-radius: 12px;
      padding: 12px;
      pointer-events: none;
      text-transform: uppercase;
      letter-spacing: 3px;
    }}
    @media print {{
      body {{
        background: #ffffff !important;
        font-size: 10px !important;
      }}
      .action-bar {{
        display: none !important;
      }}
      .kude-container {{
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
        margin: 0 !important;
        max-width: 100% !important;
      }}
      .no-print {{
        display: none !important;
      }}
    }}
  </style>
</head>
<body>
  <div class="action-bar no-print">
    <div style="display:flex; align-items:center; gap:8px;">
      <span style="font-size:16px;">🧾</span>
      <div>
        <strong style="font-size:13px;">Factura Electrónica {doc['numero_documento_formateado']}</strong>
        <span style="font-size:11px; color:#94a3b8; margin-left:8px;">KuDE Oficial SET/DNIT Paraguay</span>
      </div>
    </div>
    <div style="display:flex; align-items:center; gap:8px;">
      <button class="btn-print" onclick="window.print()">
        🖨️ Imprimir Factura
      </button>
      <a href="/academia/facturacion/documentos/{doc['id']}/xml" target="_blank" class="btn-ghost">
        📄 Descargar XML
      </a>
      <button class="btn-ghost" onclick="window.close()">
        Cerrar
      </button>
    </div>
  </div>

  <div class="kude-container">
    {watermark_html}

    <!-- CABECERA -->
    <table class="header-table">
      <tr>
        <td class="emisor-cell">
          {logo_img_html}
          <div class="emisor-title">{em['razon_social']}</div>
          <div class="emisor-fantasy">{em['nombre_fantasia']}</div>
          <div class="emisor-meta">
            <div><strong>Actividad:</strong> {em['actividad_economica']}</div>
            <div><strong>Dirección:</strong> {em['direccion']} N° {em['num_casa']}</div>
            <div><strong>Ubicación:</strong> {em['ciudad_departamento']}</div>
            <div><strong>Tel / Email:</strong> {em['telefono']} {(' | ' + em['email']) if em['email'] else ''}</div>
          </div>
        </td>
        <td class="fiscal-box">
          <div class="timbrado">TIMBRADO N°: <strong>{em['num_timbrado']}</strong></div>
          <div class="ruc">RUC: {em['ruc_con_dv']}</div>
          <div class="factura-title">FACTURA ELECTRÓNICA</div>
          <div class="numero-doc">{doc['numero_documento_formateado']}</div>
        </td>
      </tr>
    </table>

    <!-- DATOS DE EMISIÓN Y RECEPTOR -->
    <div class="section-box">
      <div class="grid-2">
        <div class="info-row">
          <span class="info-label">Fecha y Hora:</span>
          <span class="info-val">{doc['fecha_emision_formateada']}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Condición Venta:</span>
          <span class="info-val" style="font-weight:800; color:#1d4ed8;">{doc['condicion_venta']}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Receptor / Razón Social:</span>
          <span class="info-val" style="font-weight:700;">{rec['nombre']}</span>
        </div>
        <div class="info-row">
          <span class="info-label">RUC / Documento:</span>
          <span class="info-val" style="font-weight:700; font-family:monospace;">{rec['ruc_con_dv']}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Dirección:</span>
          <span class="info-val">{rec['direccion']}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Teléfono:</span>
          <span class="info-val">{rec['telefono'] or '—'}</span>
        </div>
      </div>
    </div>

    <!-- DETALLE DE CONCEPTOS / SERVICIOS -->
    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 12%; text-align:center;">Código</th>
          <th style="width: 8%; text-align:center;">Cant.</th>
          <th style="width: 44%;">Descripción del Servicio</th>
          <th style="width: 12%; text-align:right;">P. Unitario</th>
          <th style="width: 8%; text-align:right;">Exentas</th>
          <th style="width: 8%; text-align:right;">IVA 5%</th>
          <th style="width: 8%; text-align:right;">IVA 10%</th>
        </tr>
      </thead>
      <tbody>
        {lineas_html}
      </tbody>
    </table>

    <!-- TOTALES Y LIQUIDACIÓN -->
    <div class="totals-box">
      <table class="subtotales-table">
        <tr>
          <td style="font-weight:700; color:#475569;">SUBTOTALES:</td>
          <td style="text-align:right;">Exentas: <strong style="font-family:monospace;">{sub_exe_str}</strong> Gs.</td>
          <td style="text-align:right;">IVA 5%: <strong style="font-family:monospace;">{sub_5_str}</strong> Gs.</td>
          <td style="text-align:right;">IVA 10%: <strong style="font-family:monospace;">{sub_10_str}</strong> Gs.</td>
        </tr>
      </table>

      <div class="total-grand-row">
        <span class="total-grand-title">TOTAL A PAGAR:</span>
        <span class="total-grand-amount">Gs. {total_gral_str}</span>
      </div>

      <div class="total-letras">
        <strong>SON:</strong> {doc['total_en_letras']}
      </div>

      <table class="iva-table">
        <tr>
          <td style="width:25%;">LIQUIDACIÓN DEL IVA:</td>
          <td style="width:25%; text-align:center;">(IVA 5%): <span class="iva-bold">Gs. {iva_5_str}</span></td>
          <td style="width:25%; text-align:center;">(IVA 10%): <span class="iva-bold">Gs. {iva_10_str}</span></td>
          <td style="width:25%; text-align:right;">TOTAL IVA: <span class="iva-bold" style="color:#059669;">Gs. {tot_iva_str}</span></td>
        </tr>
      </table>
    </div>

    <!-- PIE SIFEN / KuDE -->
    <div class="sifen-footer">
      <img src="{doc['qr_image_base64']}" alt="Código QR SIFEN" class="qr-img" />
      <div class="sifen-details">
        <div class="cdc-title">KuDE — Representación Gráfica de Documento Electrónico (SIFEN)</div>
        <div>Código de Control (CDC):</div>
        <div class="cdc-number">{doc['cdc_formateado']}</div>
        <div class="legal-notice">
          Consulte la validez de esta Factura Electrónica con el número de CDC impreso o escaneando el código QR en
          <a href="https://ekuatia.set.gov.py/consultas" target="_blank" style="color:#1d4ed8; text-decoration:none; font-weight:700;">https://ekuatia.set.gov.py/consultas</a>.
          Si su documento electrónico no se encuentra registrado en el sistema de la SET/DNIT, por favor consulte nuevamente en 24 horas.
        </div>
      </div>
    </div>
  </div>
  {autoprint_script}
</body>
</html>
"""


@router.get("/documentos/{documento_id}/imprimir")
async def imprimir_documento(
    documento_id: str,
    request: Request,
    formato: str = "json",
    autoprint: bool = False,
    current_user: dict = Depends(require_roles("dueño", "administrador", "tesorero")),
    session: AsyncSession = Depends(get_session),
):
    """
    Retorna la representación gráfica KuDE de la factura electrónica.
    - formato=json: Objeto estructurado para visualización en el modal del panel.
    - formato=html: Documento HTML completo optimizado para impresión del navegador.
    """
    ctx = await get_academia_context(request, current_user, session)
    academia_id = str(ctx["academia_id"])

    datos_kude = await _obtener_datos_completos_kude(documento_id, academia_id, session)

    if formato == "html" or request.query_params.get("html") in ("1", "true"):
        html_content = _render_kude_html(datos_kude, autoprint=autoprint)
        return HTMLResponse(content=html_content)

    return datos_kude


@router.get("/documentos/{documento_id}/kude")
async def obtener_kude(
    documento_id: str,
    request: Request,
    current_user: dict = Depends(require_roles("dueño", "administrador", "tesorero")),
    session: AsyncSession = Depends(get_session),
):
    """Alias para obtener los datos estructurados del KuDE de la factura electrónica."""
    ctx = await get_academia_context(request, current_user, session)
    academia_id = str(ctx["academia_id"])
    return await _obtener_datos_completos_kude(documento_id, academia_id, session)


@router.post("/documentos")
async def emitir_documento(
    req: DocumentoElectronicoCreate,
    request: Request,
    current_user: dict = Depends(require_roles("dueño", "administrador", "tesorero")),
    session: AsyncSession = Depends(get_session),
):
    """
    Emite un Documento Electrónico (factura) manualmente para un cobro de academia.

    Si no se proveen lineas, se generan automáticamente desde la cuota/matrícula.
    Si no se proveen datos del receptor, se buscan en facturacion.datos_facturacion.
    """
    ctx = await get_academia_context(request, current_user, session)
    academia_id = str(ctx["academia_id"])
    creado_por = current_user.get("user_id", 0)

    # Validar que no haya ya un DE para esta cuota/matrícula
    if req.cuota_id:
        res = await session.execute(
            text("SELECT documento_electronico_id FROM academias.cuotas WHERE id = :id"),
            {"id": req.cuota_id}
        )
        row = res.fetchone()
        if row and row[0]:
            raise HTTPException(status_code=400, detail="Esta cuota ya tiene un documento electrónico emitido.")

    if req.matricula_id:
        res = await session.execute(
            text("SELECT documento_electronico_id FROM academias.matriculas WHERE id = :id"),
            {"id": req.matricula_id}
        )
        row = res.fetchone()
        if row and row[0]:
            raise HTTPException(status_code=400, detail="Esta matrícula ya tiene un documento electrónico emitido.")

    # Construir líneas desde cuota/matrícula si no se proveen
    lineas_data = []
    if req.lineas:
        lineas_data = [ln.model_dump() for ln in req.lineas]
    elif req.cuota_id:
        lineas_data = await _lineas_desde_cuota(req.cuota_id, session)
    elif req.matricula_id:
        lineas_data = await _lineas_desde_matricula(req.matricula_id, session)
    elif req.concepto_libre:
        raise HTTPException(status_code=400, detail="Para concepto libre debe proveer las líneas manualmente.")
    else:
        raise HTTPException(status_code=400, detail="Debe especificar cuota_id, matricula_id o lineas.")

    # Datos del receptor
    receptor = {
        "receptor_ruc": req.receptor_ruc,
        "receptor_dv": req.receptor_dv,
        "receptor_nombre": req.receptor_nombre,
        "receptor_dir": req.receptor_dir,
        "receptor_tel": req.receptor_tel,
        "receptor_email": req.receptor_email,
        "c_dep_rec": req.c_dep_rec,
        "d_des_dep_rec": req.d_des_dep_rec,
        "c_ciu_rec": req.c_ciu_rec,
        "d_des_ciu_rec": req.d_des_ciu_rec,
    }

    # Si no se proveen datos del receptor, buscar en facturacion.datos_facturacion
    if not receptor.get("receptor_nombre"):
        alumno_id, tutor_id = await _resolver_receptor_ids(req.cuota_id, req.matricula_id, session)
        from services.facturacion_service import _buscar_datos_facturacion
        receptor_bd = await _buscar_datos_facturacion(
            academia_id=academia_id,
            alumno_id=alumno_id,
            tutor_id=tutor_id,
            session=session,
        )
        if not receptor_bd:
            raise HTTPException(
                status_code=422,
                detail={
                    "error": "datos_facturacion_requeridos",
                    "mensaje": "El alumno/tutor no tiene datos de facturación registrados. "
                               "Use POST /academia/facturacion/datos-facturacion primero.",
                }
            )
        receptor = receptor_bd

    try:
        resultado = await emitir_factura_academia(
            academia_id=academia_id,
            lineas_data=lineas_data,
            receptor=receptor,
            session=session,
            creado_por=creado_por,
            cuota_id=req.cuota_id,
            matricula_id=req.matricula_id,
            concepto_libre=req.concepto_libre,
            i_cond_ope=req.i_cond_ope or 1,
            firmar=req.firmar or False,
            cert_password=req.cert_password,
        )
        return {"status": "ok", **resultado}
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.post("/documentos/{documento_id}/firmar")
async def firmar_documento_endpoint(
    documento_id: str,
    req: FirmarDocumentoRequest,
    request: Request,
    current_user: dict = Depends(require_roles("dueño")),
    session: AsyncSession = Depends(get_session),
):
    """Firma digitalmente un DE ya emitido con el .p12 activo de la academia."""
    ctx = await get_academia_context(request, current_user, session)
    academia_id = str(ctx["academia_id"])

    try:
        resultado = await firmar_documento(
            documento_id=documento_id,
            academia_id=academia_id,
            cert_password=req.cert_password,
            session=session,
        )
        return {"status": "ok", **resultado}
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.post("/documentos/{documento_id}/cancelar")
async def cancelar_documento(
    documento_id: str,
    req: CancelarDocumentoRequest,
    request: Request,
    current_user: dict = Depends(require_roles("dueño", "administrador")),
    session: AsyncSession = Depends(get_session),
):
    """Cancela un DE emitido (localmente; para cancelación ante SIFEN se requiere envío posterior)."""
    ctx = await get_academia_context(request, current_user, session)
    academia_id = str(ctx["academia_id"])

    res = await session.execute(
        text("SELECT estado, cancelado FROM facturacion.documentos_electronicos WHERE id = :did AND academia_id = :aid"),
        {"did": documento_id, "aid": academia_id}
    )
    row = res.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Documento no encontrado.")
    if row[1]:
        raise HTTPException(status_code=400, detail="El documento ya está cancelado.")

    await session.execute(
        text("""
            UPDATE facturacion.documentos_electronicos
            SET cancelado = TRUE, cancelado_en = NOW(),
                motivo_cancelacion = :motivo, estado = 'cancelado',
                actualizado_en = NOW()
            WHERE id = :did
        """),
        {"did": documento_id, "motivo": req.motivo}
    )
    await session.commit()
    return {"status": "ok", "mensaje": "Documento cancelado localmente."}


# ============================================================
# Helpers internos del router
# ============================================================

async def _lineas_desde_cuota(cuota_id: str, session: AsyncSession) -> list[dict]:
    """Construye líneas del DE a partir de una cuota de academia."""
    res = await session.execute(
        text("""
            SELECT c.monto, c.monto_pagado,
                   a.nombre || ' ' || COALESCE(a.apellido, '') AS alumno_nombre,
                   cat.nombre AS categoria_nombre,
                   c.anio, c.mes
            FROM academias.cuotas c
            JOIN academias.inscripciones i ON i.id = c.inscripcion_id
            JOIN academias.alumnos a ON a.id = i.alumno_id
            LEFT JOIN academias.categorias cat ON cat.id = i.categoria_id
            WHERE c.id = :cid
        """),
        {"cid": cuota_id}
    )
    row = res.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Cuota no encontrada.")

    monto = int(row[1] or row[0] or 0)
    nombre_mes = _nombre_mes(row[5]) if row[5] else ""
    desc = f"Cuota {nombre_mes} {row[4] or ''} - {row[2].strip()} - {row[3] or 'Sin categoría'}"

    return [{"d_des_pro_ser": desc, "d_p_uni_pro_ser": monto, "d_cant_pro_ser": 1, "d_tasa_iva": 10}]


async def _lineas_desde_matricula(matricula_id: str, session: AsyncSession) -> list[dict]:
    """Construye líneas del DE a partir de una matrícula de academia."""
    res = await session.execute(
        text("""
            SELECT m.monto, a.nombre || ' ' || COALESCE(a.apellido, '') AS alumno_nombre, m.anio
            FROM academias.matriculas m
            JOIN academias.alumnos a ON a.id = m.alumno_id
            WHERE m.id = :mid
        """),
        {"mid": matricula_id}
    )
    row = res.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Matrícula no encontrada.")

    monto = int(row[0] or 0)
    desc = f"Matrícula {row[2] or ''} - {row[1].strip()}"
    return [{"d_des_pro_ser": desc, "d_p_uni_pro_ser": monto, "d_cant_pro_ser": 1, "d_tasa_iva": 10}]


async def _resolver_receptor_ids(cuota_id, matricula_id, session) -> tuple[Optional[str], Optional[str]]:
    """Resuelve alumno_id y tutor_id a partir de una cuota o matrícula."""
    if cuota_id:
        res = await session.execute(
            text("""
                SELECT i.alumno_id FROM academias.cuotas c
                JOIN academias.inscripciones i ON i.id = c.inscripcion_id
                WHERE c.id = :cid
            """),
            {"cid": cuota_id}
        )
        row = res.fetchone()
        return (str(row[0]) if row else None, None)

    if matricula_id:
        res = await session.execute(
            text("SELECT alumno_id FROM academias.matriculas WHERE id = :mid"),
            {"mid": matricula_id}
        )
        row = res.fetchone()
        return (str(row[0]) if row else None, None)

    return (None, None)


def _nombre_mes(num: int) -> str:
    meses = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
             "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]
    if 1 <= num <= 12:
        return meses[num - 1]
    return str(num)
