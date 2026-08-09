"""
services/facturacion_service.py
Servicio de emisión de Documentos Electrónicos SIFEN para el módulo de Academias.

Orquesta:
  1. Verificar que la academia tiene emisor SIFEN configurado (RUC + TIM)
  2. Determinar el receptor (alumno mayor o tutor pagador)
  3. Calcular totales e IVA según el monto del cobro
  4. Generar CDC (44 dígitos, módulo 11)
  5. Construir URL QR
  6. Generar XML rDE v150
  7. Validar contra XSD (no bloqueante si el XSD no está disponible)
  8. Guardar en facturacion.documentos_electronicos + de_lineas
  9. Opcionalmente firmar con .p12 si está disponible
"""
from __future__ import annotations

import os
import random
import logging
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from sifen.cdc import generar_cdc
from sifen.totales import LineaCalculo, calcular_totales_lineas
from sifen.de_xml import construir_xml_rde
from sifen.qr import construir_d_car_qr, digest_placeholder_para_qr
from sifen.xsd_validator import validar_xml_contra_xsd
from sifen.config import CERTS_DIR

logger = logging.getLogger(__name__)


# ============================================================
# Helpers internos
# ============================================================

def _now_utc() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _cod_seg_aleatorio() -> str:
    return "".join(str(random.randint(0, 9)) for _ in range(9))


async def _obtener_emisor(academia_id: str, session: AsyncSession) -> Optional[dict]:
    """Retorna los datos del emisor SIFEN de la academia, o None si no está configurado."""
    res = await session.execute(
        text("""
            SELECT id, ruc_con_dv, tipo_contribuyente, razon_social, nombre_fantasia,
                   direccion, num_casa, telefono, email,
                   c_dep_emi, d_des_dep_emi, c_ciu_emi, d_des_ciu_emi,
                   c_act_eco, d_des_act_eco,
                   num_tim, d_est, d_pun_exp, i_ti_de, i_tip_emi,
                   id_csc, csc_secreto, ultimo_num_doc, activo
            FROM facturacion.emisor_academia
            WHERE academia_id = :aid AND activo = TRUE
        """),
        {"aid": academia_id}
    )
    row = res.fetchone()
    if not row:
        return None
    keys = [
        "id", "ruc_con_dv", "tipo_contribuyente", "razon_social", "nombre_fantasia",
        "direccion", "num_casa", "telefono", "email",
        "c_dep_emi", "d_des_dep_emi", "c_ciu_emi", "d_des_ciu_emi",
        "c_act_eco", "d_des_act_eco",
        "num_tim", "d_est", "d_pun_exp", "i_ti_de", "i_tip_emi",
        "id_csc", "csc_secreto", "ultimo_num_doc", "activo"
    ]
    return dict(zip(keys, row))


def _emisor_configurado(emisor: dict) -> bool:
    """Verifica que el emisor tiene los datos mínimos para emitir."""
    return bool(
        emisor
        and emisor.get("ruc_con_dv", "").strip()
        and "-" in emisor.get("ruc_con_dv", "")
        and emisor.get("num_tim", "").strip()
    )


async def _obtener_certificado(academia_id: str, session: AsyncSession) -> Optional[dict]:
    """Retorna el certificado .p12 activo de la academia, o None."""
    res = await session.execute(
        text("""
            SELECT id, ruta_archivo, password_enc
            FROM facturacion.certificados_digitales
            WHERE academia_id = :aid AND activo = TRUE
            ORDER BY creado_en DESC
            LIMIT 1
        """),
        {"aid": academia_id}
    )
    row = res.fetchone()
    if not row:
        return None
    return {"id": str(row[0]), "ruta_archivo": row[1], "password_enc": row[2]}


def _descifrar_password(password_enc: str) -> str:
    """Descifra la contraseña del .p12 usando Fernet."""
    fernet_key = os.getenv("SIFEN_FERNET_KEY", "")
    if not fernet_key or not password_enc:
        return ""
    try:
        from cryptography.fernet import Fernet
        f = Fernet(fernet_key.encode())
        return f.decrypt(password_enc.encode()).decode()
    except Exception as e:
        logger.warning(f"No se pudo descifrar password del certificado: {e}")
        return ""


# ============================================================
# FUNCIÓN PRINCIPAL: Emitir factura
# ============================================================

async def emitir_factura_academia(
    *,
    academia_id: str,
    lineas_data: list[dict],
    receptor: dict,
    session: AsyncSession,
    creado_por: int,
    cuota_id: Optional[str] = None,
    matricula_id: Optional[str] = None,
    concepto_libre: Optional[str] = None,
    i_cond_ope: int = 1,
    firmar: bool = False,
    cert_password: Optional[str] = None,
) -> dict:
    """
    Emite un Documento Electrónico SIFEN para una academia.

    Args:
        academia_id: UUID de la academia emisora.
        lineas_data: Lista de dicts con d_des_pro_ser, d_p_uni_pro_ser, d_tasa_iva, etc.
        receptor: Dict con receptor_ruc, receptor_nombre, receptor_dir, etc.
        session: AsyncSession de la BD de mi_cancha.
        creado_por: ID del usuario que emite.
        cuota_id: UUID de la cuota (opcional).
        matricula_id: UUID de la matrícula (opcional).
        concepto_libre: Descripción libre si no hay cuota/matrícula.
        i_cond_ope: 1=Contado, 2=Crédito.
        firmar: Si True, firma el XML con el .p12 activo de la academia.
        cert_password: Contraseña del .p12 (si no se pasa, se usa el cifrado en BD).

    Returns:
        Dict con id, cdc, estado, xml_generado, advertencias.
    """
    advertencias: list[str] = []

    # 1. Obtener y validar emisor
    emisor = await _obtener_emisor(academia_id, session)
    if not emisor or not _emisor_configurado(emisor):
        raise ValueError(
            "La academia no tiene configurado el emisor SIFEN (RUC y Timbrado obligatorios)."
        )

    # 2. Incrementar número de documento (en la misma transacción)
    await session.execute(
        text("""
            UPDATE facturacion.emisor_academia
            SET ultimo_num_doc = ultimo_num_doc + 1,
                actualizado_en = NOW()
            WHERE academia_id = :aid
        """),
        {"aid": academia_id}
    )
    emisor["ultimo_num_doc"] += 1
    num_doc = emisor["ultimo_num_doc"]

    # 3. Calcular totales IVA
    if not lineas_data:
        raise ValueError("Debe incluir al menos una línea en el documento.")

    for ln in lineas_data:
        if ln.get("d_tasa_iva", 10) not in (0, 5, 10):
            raise ValueError(f"Tasa IVA inválida: {ln.get('d_tasa_iva')}. Debe ser 0, 5 o 10.")

    lineas_calc = [
        LineaCalculo(
            d_p_uni_pro_ser=ln["d_p_uni_pro_ser"],
            d_cant_pro_ser=ln.get("d_cant_pro_ser", 1),
            d_tasa_iva=ln.get("d_tasa_iva", 10),
        )
        for ln in lineas_data
    ]
    detalles_iva, tot = calcular_totales_lineas(lineas_calc)

    # 4. Generar CDC
    fe_emi = _now_utc()
    fecha_iso = fe_emi.date().isoformat()
    cod_seg = _cod_seg_aleatorio()

    cdc = generar_cdc(
        ruc_con_dv=emisor["ruc_con_dv"],
        tipo_documento=emisor.get("i_ti_de", 1),
        establecimiento=emisor.get("d_est", "001"),
        punto_expedicion=emisor.get("d_pun_exp", "001"),
        numero_documento=num_doc,
        tipo_contribuyente=emisor.get("tipo_contribuyente", 1),
        fecha_emision_iso_date=fecha_iso,
        tipo_emision=emisor.get("i_tip_emi", 1),
        codigo_seguridad_9=cod_seg,
    )

    # 5. Construir QR provisional
    d_fe_str = fe_emi.strftime("%Y-%m-%dT%H:%M:%S")
    digest_hex = digest_placeholder_para_qr(cdc, d_fe_str)
    ruc_rec = str(receptor.get("receptor_ruc", "0")).zfill(8)
    d_car_qr = construir_d_car_qr(
        cdc=cdc,
        d_fe_emi_de=d_fe_str,
        d_ruc_rec=ruc_rec,
        d_tot_gral_ope=tot.d_tot_gral_ope,
        d_tot_iva=tot.d_tot_iva,
        c_items=len(lineas_data),
        digest_value_base64=digest_hex,
        id_csc=emisor.get("id_csc"),
        csc_secreto=emisor.get("csc_secreto"),
    )

    # 6. Documento dict para el XML builder
    documento_dict = {
        "cdc": cdc,
        "numero_documento": num_doc,
        "d_cod_seg": cod_seg,
        "i_ti_de": emisor.get("i_ti_de", 1),
        "i_tip_emi": emisor.get("i_tip_emi", 1),
        "d_fe_emi_de": fe_emi,
        "i_cond_ope": i_cond_ope,
        "d_car_qr": d_car_qr,
        **receptor,
    }

    # 7. Generar XML
    xml_str = construir_xml_rde(
        emisor=emisor,
        documento=documento_dict,
        lineas=lineas_data,
        detalles_iva=detalles_iva,
        tot=tot,
    )

    # 8. Validar XSD (no bloqueante)
    errores_xsd = validar_xml_contra_xsd(xml_str)
    errores_bloqueantes = [e for e in errores_xsd if not e.startswith("ADVERTENCIA")]
    if errores_bloqueantes:
        # Revertir numeración
        await session.execute(
            text("""
                UPDATE facturacion.emisor_academia
                SET ultimo_num_doc = ultimo_num_doc - 1,
                    actualizado_en = NOW()
                WHERE academia_id = :aid
            """),
            {"aid": academia_id}
        )
        raise ValueError(f"XML no válido contra XSD: {'; '.join(errores_bloqueantes)}")
    advertencias.extend([e for e in errores_xsd if e.startswith("ADVERTENCIA")])

    estado = "generado"
    xml_firmado = None

    # 9. Firma digital (opcional, requiere .p12 activo)
    if firmar:
        cert = await _obtener_certificado(academia_id, session)
        if not cert:
            advertencias.append("No hay certificado .p12 activo — XML generado sin firma.")
        else:
            pwd = cert_password or _descifrar_password(cert.get("password_enc", ""))
            ruta = cert["ruta_archivo"]
            if not os.path.exists(ruta):
                advertencias.append(f"Certificado no encontrado en {ruta}. XML sin firma.")
            else:
                try:
                    from sifen.firma import firmar_xml_rde, extraer_digest_value
                    xml_firmado = firmar_xml_rde(xml_str, ruta, pwd)
                    real_digest = extraer_digest_value(xml_firmado)
                    if real_digest:
                        d_car_qr = construir_d_car_qr(
                            cdc=cdc,
                            d_fe_emi_de=d_fe_str,
                            d_ruc_rec=ruc_rec,
                            d_tot_gral_ope=tot.d_tot_gral_ope,
                            d_tot_iva=tot.d_tot_iva,
                            c_items=len(lineas_data),
                            digest_value_base64=real_digest,
                            id_csc=emisor.get("id_csc"),
                            csc_secreto=emisor.get("csc_secreto"),
                        )
                    estado = "firmado"
                except Exception as e:
                    advertencias.append(f"Error al firmar: {e}. XML guardado sin firma.")

    # 10. Guardar en BD
    res_doc = await session.execute(
        text("""
            INSERT INTO facturacion.documentos_electronicos
                (academia_id, emisor_id, cuota_id, matricula_id, concepto_libre,
                 cdc, numero_documento, d_cod_seg, i_ti_de, i_tip_emi, d_fe_emi_de,
                 receptor_ruc, receptor_dv, receptor_nombre, receptor_dir, receptor_tel,
                 receptor_email, c_dep_rec, d_des_dep_rec, c_ciu_rec, d_des_ciu_rec,
                 i_cond_ope, d_tot_gral_ope, d_tot_iva, d_car_qr,
                 xml_generado, xml_firmado, estado, creado_por)
            VALUES
                (:academia_id, :emisor_id, :cuota_id, :matricula_id, :concepto_libre,
                 :cdc, :num_doc, :cod_seg, :i_ti_de, :i_tip_emi, :fe_emi,
                 :receptor_ruc, :receptor_dv, :receptor_nombre, :receptor_dir, :receptor_tel,
                 :receptor_email, :c_dep_rec, :d_des_dep_rec, :c_ciu_rec, :d_des_ciu_rec,
                 :i_cond_ope, :d_tot_gral_ope, :d_tot_iva, :d_car_qr,
                 :xml_generado, :xml_firmado, :estado, :creado_por)
            RETURNING id
        """),
        {
            "academia_id": academia_id,
            "emisor_id": str(emisor["id"]),
            "cuota_id": cuota_id,
            "matricula_id": matricula_id,
            "concepto_libre": concepto_libre,
            "cdc": cdc,
            "num_doc": num_doc,
            "cod_seg": cod_seg,
            "i_ti_de": emisor.get("i_ti_de", 1),
            "i_tip_emi": emisor.get("i_tip_emi", 1),
            "fe_emi": fe_emi,
            "receptor_ruc": receptor.get("receptor_ruc"),
            "receptor_dv": receptor.get("receptor_dv"),
            "receptor_nombre": receptor.get("receptor_nombre"),
            "receptor_dir": receptor.get("receptor_dir"),
            "receptor_tel": receptor.get("receptor_tel"),
            "receptor_email": receptor.get("receptor_email"),
            "c_dep_rec": receptor.get("c_dep_rec"),
            "d_des_dep_rec": receptor.get("d_des_dep_rec"),
            "c_ciu_rec": receptor.get("c_ciu_rec"),
            "d_des_ciu_rec": receptor.get("d_des_ciu_rec"),
            "i_cond_ope": i_cond_ope,
            "d_tot_gral_ope": tot.d_tot_gral_ope,
            "d_tot_iva": tot.d_tot_iva,
            "d_car_qr": d_car_qr,
            "xml_generado": xml_str,
            "xml_firmado": xml_firmado,
            "estado": estado,
            "creado_por": creado_por,
        }
    )
    doc_id = str(res_doc.scalar())

    # Guardar líneas
    for orden, ln in enumerate(lineas_data, start=1):
        det = detalles_iva[orden - 1]
        tasa = ln.get("d_tasa_iva", 10)
        await session.execute(
            text("""
                INSERT INTO facturacion.de_lineas
                    (documento_id, orden, d_cod_int, d_des_pro_ser,
                     c_uni_med, d_des_uni_med, d_cant_pro_ser, d_p_uni_pro_ser,
                     d_tasa_iva, i_afec_iva)
                VALUES
                    (:doc_id, :orden, :cod_int, :des,
                     :c_uni_med, :des_uni_med, :cant, :precio,
                     :tasa, :i_afec)
            """),
            {
                "doc_id": doc_id,
                "orden": orden,
                "cod_int": ln.get("d_cod_int"),
                "des": ln["d_des_pro_ser"],
                "c_uni_med": ln.get("c_uni_med", 77),
                "des_uni_med": ln.get("d_des_uni_med", "SERVICIO"),
                "cant": ln.get("d_cant_pro_ser", 1),
                "precio": ln["d_p_uni_pro_ser"],
                "tasa": tasa,
                "i_afec": 1 if tasa in (5, 10) else 4,
            }
        )

    # Vincular DE a cuota o matrícula
    if cuota_id:
        await session.execute(
            text("UPDATE academias.cuotas SET documento_electronico_id = :did WHERE id = :cid"),
            {"did": doc_id, "cid": cuota_id}
        )
    if matricula_id:
        await session.execute(
            text("UPDATE academias.matriculas SET documento_electronico_id = :did WHERE id = :mid"),
            {"did": doc_id, "mid": matricula_id}
        )

    await session.commit()
    logger.info(f"✅ DE emitido: {cdc} — Academia: {academia_id} — Estado: {estado}")

    return {
        "id": doc_id,
        "cdc": cdc,
        "numero_documento": num_doc,
        "d_fe_emi_de": fe_emi.isoformat(),
        "d_tot_gral_ope": tot.d_tot_gral_ope,
        "d_tot_iva": tot.d_tot_iva,
        "estado": estado,
        "cancelado": False,
        "advertencias": advertencias,
    }


# ============================================================
# Emitir automáticamente desde un cobro
# ============================================================

async def intentar_emision_automatica(
    *,
    academia_id: str,
    cuota_id: Optional[str] = None,
    matricula_id: Optional[str] = None,
    monto_gs: int,
    concepto: str,
    alumno_id: Optional[str] = None,
    tutor_id: Optional[str] = None,
    session: AsyncSession,
    creado_por: int,
    tasa_iva: int = 10,
) -> Optional[dict]:
    """
    Intenta emitir un DE automáticamente tras confirmar un pago de academia.
    Retorna None (sin lanzar excepción) si:
    - La academia no tiene emisor SIFEN configurado
    - No hay datos de facturación del alumno/tutor

    Args:
        academia_id: UUID de la academia.
        cuota_id / matricula_id: UUID del cobro.
        monto_gs: Monto en guaraníes (entero).
        concepto: Descripción del concepto (ej. "Cuota Julio 2026 - Categoría Sub-10").
        alumno_id / tutor_id: Para buscar datos de facturación registrados.
        session: AsyncSession.
        creado_por: ID del usuario que confirma el pago.
        tasa_iva: 0, 5 o 10 (default 10%).
    """
    try:
        # Verificar emisor
        emisor = await _obtener_emisor(academia_id, session)
        if not emisor or not _emisor_configurado(emisor):
            logger.info(f"Academia {academia_id}: emisor SIFEN no configurado — sin factura automática.")
            return None

        # Buscar datos de facturación del alumno o tutor
        receptor = await _buscar_datos_facturacion(
            academia_id=academia_id,
            alumno_id=alumno_id,
            tutor_id=tutor_id,
            session=session
        )
        if not receptor:
            logger.info(f"Academia {academia_id}: sin datos de facturación para alumno/tutor — sin factura automática.")
            return {"requiere_datos_facturacion": True}

        lineas = [{
            "d_des_pro_ser": concepto,
            "d_p_uni_pro_ser": monto_gs,
            "d_cant_pro_ser": 1,
            "d_tasa_iva": tasa_iva,
        }]

        return await emitir_factura_academia(
            academia_id=academia_id,
            lineas_data=lineas,
            receptor=receptor,
            session=session,
            creado_por=creado_por,
            cuota_id=cuota_id,
            matricula_id=matricula_id,
            concepto_libre=concepto,
            firmar=False,  # Automático siempre sin firma
        )

    except Exception as e:
        logger.error(f"Error en emisión automática de factura para academia {academia_id}: {e}")
        return None


async def _buscar_datos_facturacion(
    *,
    academia_id: str,
    alumno_id: Optional[str],
    tutor_id: Optional[str],
    session: AsyncSession,
) -> Optional[dict]:
    """
    Busca datos de facturación registrados para un alumno o tutor.
    Prioriza: tutor pagador principal > alumno > cualquier otro de la academia.
    """
    conditions = []
    params: dict = {"aid": academia_id}

    if tutor_id:
        conditions.append("tutor_id = :tutor_id")
        params["tutor_id"] = tutor_id
    if alumno_id:
        conditions.append("alumno_id = :alumno_id")
        params["alumno_id"] = alumno_id

    where_clause = f"academia_id = :aid AND ({' OR '.join(conditions)})" if conditions else "academia_id = :aid"

    res = await session.execute(
        text(f"""
            SELECT receptor_ruc, receptor_dv, receptor_nombre, receptor_dir,
                   receptor_tel, receptor_email,
                   c_dep_rec, d_des_dep_rec, c_ciu_rec, d_des_ciu_rec
            FROM facturacion.datos_facturacion
            WHERE {where_clause}
            ORDER BY es_pagador_principal DESC, creado_en DESC
            LIMIT 1
        """),
        params
    )
    row = res.fetchone()
    if not row:
        return None

    return {
        "receptor_ruc": row[0],
        "receptor_dv": row[1],
        "receptor_nombre": row[2],
        "receptor_dir": row[3],
        "receptor_tel": row[4],
        "receptor_email": row[5],
        "c_dep_rec": row[6],
        "d_des_dep_rec": row[7],
        "c_ciu_rec": row[8],
        "d_des_ciu_rec": row[9],
    }


# ============================================================
# Firmar un documento ya emitido
# ============================================================

async def firmar_documento(
    *,
    documento_id: str,
    academia_id: str,
    cert_password: Optional[str],
    session: AsyncSession,
) -> dict:
    """Firma un DE ya emitido con el .p12 activo de la academia."""
    res = await session.execute(
        text("""
            SELECT id, xml_generado, cdc, estado
            FROM facturacion.documentos_electronicos
            WHERE id = :did AND academia_id = :aid
        """),
        {"did": documento_id, "aid": academia_id}
    )
    row = res.fetchone()
    if not row:
        raise ValueError("Documento no encontrado.")
    if row[3] in ("firmado", "enviado", "aprobado"):
        raise ValueError(f"El documento ya está en estado '{row[3]}' — no se puede re-firmar.")

    cert = await _obtener_certificado(academia_id, session)
    if not cert:
        raise ValueError("No hay certificado .p12 activo para esta academia.")

    pwd = cert_password or _descifrar_password(cert.get("password_enc", ""))
    ruta = cert["ruta_archivo"]
    if not os.path.exists(ruta):
        raise ValueError(f"Archivo del certificado no encontrado: {ruta}")

    from sifen.firma import firmar_xml_rde
    xml_firmado = firmar_xml_rde(row[1], ruta, pwd)

    await session.execute(
        text("""
            UPDATE facturacion.documentos_electronicos
            SET xml_firmado = :xml_f, estado = 'firmado', actualizado_en = NOW()
            WHERE id = :did
        """),
        {"xml_f": xml_firmado, "did": documento_id}
    )
    await session.commit()
    return {"id": documento_id, "estado": "firmado"}
