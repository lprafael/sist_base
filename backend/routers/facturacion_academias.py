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
from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request, status
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
                WHERE academia_id = :aid
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
                    VALUES (:aid, '', '')
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
            text("SELECT COUNT(*) FROM facturacion.certificados_digitales WHERE academia_id = :aid AND activo = TRUE"),
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
                WHERE academia_id = :aid
            """),
            {"aid": academia_id}
        )
        row = res.fetchone()

        res_cert = await session.execute(
            text("SELECT COUNT(*), MAX(expira_en) FROM facturacion.certificados_digitales WHERE academia_id = :aid AND activo = TRUE"),
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
                WHERE academia_id = :aid {where_extra}
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
