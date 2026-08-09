"""
sifen/de_xml.py — Generación del XML rDE v150 para SIFEN Paraguay.
Adaptado desde Denarius: se usan dicts simples en lugar de modelos SQLAlchemy,
para que sea reutilizable sin depender del ORM de Denarius.
"""
from __future__ import annotations

import xml.etree.ElementTree as ET
from datetime import datetime

from sifen.config import SIFEN_XMLNS, D_VER_FOR
from sifen.totales import LineaIVADetail, TotalesDE

NS = SIFEN_XMLNS
XSI = "http://www.w3.org/2001/XMLSchema-instance"
DSIG = "http://www.w3.org/2000/09/xmldsig#"


def _el(parent: ET.Element, tag: str, text: str | int | float | None = None) -> ET.Element:
    e = ET.SubElement(parent, f"{{{NS}}}{tag}")
    if text is not None:
        e.text = str(text)
    return e


def _sub_text(parent: ET.Element, tag: str, value: str | int | float | None) -> None:
    if value is not None and str(value).strip() != "":
        _el(parent, tag, value)


def construir_xml_rde(
    *,
    emisor: dict,
    documento: dict,
    lineas: list[dict],
    detalles_iva: list[LineaIVADetail],
    tot: TotalesDE,
) -> str:
    """
    Genera el XML rDE según estructura oficial SIFEN v150.
    
    Args:
        emisor: dict con datos del emisor (ruc_con_dv, razon_social, num_tim, etc.)
        documento: dict con datos del DE (cdc, numero_documento, receptor_*, etc.)
        lineas: list de dicts con líneas (d_des_pro_ser, d_p_uni_pro_ser, d_tasa_iva, etc.)
        detalles_iva: calculados por calcular_totales_lineas()
        tot: TotalesDE calculado por calcular_totales_lineas()
    """
    cdc = documento["cdc"]
    fe_emi = documento.get("d_fe_emi_de", datetime.utcnow())
    if isinstance(fe_emi, datetime):
        d_fe_emi_str = fe_emi.strftime("%Y-%m-%dT%H:%M:%S")
    else:
        d_fe_emi_str = str(fe_emi)

    rde = ET.Element(f"{{{NS}}}rDE")
    rde.set(f"{{{XSI}}}schemaLocation", "https://ekuatia.set.gov.py/sifen/xsd siRecepDE_v150.xsd")

    _sub_text(rde, "dVerFor", D_VER_FOR)

    de = ET.SubElement(rde, f"{{{NS}}}DE")
    de.set("Id", cdc)

    _sub_text(de, "dDVId", cdc[-1])
    _sub_text(de, "dFecFirma", d_fe_emi_str[:19])
    _sub_text(de, "dSisFact", 1)

    # gOpeDE
    g_ope = _el(de, "gOpeDE")
    i_tip_emi = documento.get("i_tip_emi", 1)
    _sub_text(g_ope, "iTipEmi", i_tip_emi)
    _sub_text(g_ope, "dDesTipEmi", "Normal" if i_tip_emi == 1 else "Contingencia")
    _sub_text(g_ope, "dCodSeg", documento.get("d_cod_seg", ""))
    _sub_text(g_ope, "dInfoEmi", 1)
    _sub_text(g_ope, "dInfoFisc", "Información de interés del Fisco")

    # gTimb
    g_timb = _el(de, "gTimb")
    i_ti_de = documento.get("i_ti_de", 1)
    _sub_text(g_timb, "iTiDE", i_ti_de)
    _sub_text(g_timb, "dDesTiDE", "Factura electrónica")
    _sub_text(g_timb, "dNumTim", emisor.get("num_tim", ""))
    _sub_text(g_timb, "dEst", emisor.get("d_est", "001"))
    _sub_text(g_timb, "dPunExp", emisor.get("d_pun_exp", "001"))
    _sub_text(g_timb, "dNumDoc", documento["numero_documento"])

    # gDatGralOpe
    g_dat = _el(de, "gDatGralOpe")
    _sub_text(g_dat, "dFeEmiDE", d_fe_emi_str)

    g_ope_com = _el(g_dat, "gOpeCom")
    _sub_text(g_ope_com, "iTipTra", 1)
    _sub_text(g_ope_com, "dDesTipTra", "Prestación de servicios")
    _sub_text(g_ope_com, "iTImp", 1)
    _sub_text(g_ope_com, "dDesTImp", "IVA")
    _sub_text(g_ope_com, "cMoneOpe", "PYG")
    _sub_text(g_ope_com, "dDesMoneOpe", "Guarani")

    # gEmis
    g_emis = _el(g_dat, "gEmis")
    ruc_parts = emisor["ruc_con_dv"].split("-")
    _sub_text(g_emis, "dRucEm", ruc_parts[0].zfill(8))
    _sub_text(g_emis, "dDVEmi", ruc_parts[1] if len(ruc_parts) > 1 else "")
    _sub_text(g_emis, "iTipCont", emisor.get("tipo_contribuyente", 1))
    _sub_text(g_emis, "dNomEmi", emisor.get("razon_social", ""))
    _sub_text(g_emis, "dDirEmi", emisor.get("direccion", ""))
    _sub_text(g_emis, "dNumCas", emisor.get("num_casa", ""))
    _sub_text(g_emis, "cDepEmi", emisor.get("c_dep_emi"))
    _sub_text(g_emis, "dDesDepEmi", emisor.get("d_des_dep_emi"))
    _sub_text(g_emis, "cCiuEmi", emisor.get("c_ciu_emi"))
    _sub_text(g_emis, "dDesCiuEmi", emisor.get("d_des_ciu_emi"))
    _sub_text(g_emis, "dTelEmi", emisor.get("telefono", ""))
    _sub_text(g_emis, "dEmailE", emisor.get("email", ""))
    g_act = _el(g_emis, "gActEco")
    _sub_text(g_act, "cActEco", emisor.get("c_act_eco", ""))
    _sub_text(g_act, "dDesActEco", emisor.get("d_des_act_eco", ""))

    # gDatRec
    g_rec = _el(g_dat, "gDatRec")
    _sub_text(g_rec, "iNatRec", 1)
    _sub_text(g_rec, "iTiOpe", 1)
    _sub_text(g_rec, "cPaisRec", "PRY")
    _sub_text(g_rec, "dDesPaisRe", "Paraguay")
    _sub_text(g_rec, "iTiContRec", 2)
    ruc_rec = str(documento.get("receptor_ruc", "0")).zfill(8)
    _sub_text(g_rec, "dRucRec", ruc_rec)
    _sub_text(g_rec, "dDVRec", documento.get("receptor_dv", ""))
    _sub_text(g_rec, "dNomRec", documento.get("receptor_nombre", ""))
    _sub_text(g_rec, "dDirRec", documento.get("receptor_dir", ""))
    _sub_text(g_rec, "cDepRec", documento.get("c_dep_rec"))
    _sub_text(g_rec, "dDesDepRec", documento.get("d_des_dep_rec"))
    _sub_text(g_rec, "cCiuRec", documento.get("c_ciu_rec"))
    _sub_text(g_rec, "dDesCiuRec", documento.get("d_des_ciu_rec"))
    _sub_text(g_rec, "dTelRec", documento.get("receptor_tel", ""))

    # gDtipDE
    g_dtip = _el(de, "gDtipDE")
    g_fe = _el(g_dtip, "gCamFE")
    _sub_text(g_fe, "iIndPres", 1)
    _sub_text(g_fe, "dDesIndPres", "Operación presencial")

    g_cond = _el(g_dtip, "gCamCond")
    i_cond = documento.get("i_cond_ope", 1)
    _sub_text(g_cond, "iCondOpe", i_cond)
    _sub_text(g_cond, "dDCondOpe", "Contado" if i_cond == 1 else "Crédito")

    # Ítems
    for i, ln in enumerate(lineas):
        det = detalles_iva[i]
        g_item = _el(g_dtip, "gCamItem")
        _sub_text(g_item, "dCodInt", ln.get("d_cod_int", ""))
        _sub_text(g_item, "dDesProSer", ln["d_des_pro_ser"])
        _sub_text(g_item, "cUniMed", ln.get("c_uni_med", 77))
        _sub_text(g_item, "dDesUniMed", ln.get("d_des_uni_med", "SERVICIO"))
        _sub_text(g_item, "dCantProSer", ln.get("d_cant_pro_ser", 1))
        g_val = _el(g_item, "gValorItem")
        _sub_text(g_val, "dPUniProSer", ln["d_p_uni_pro_ser"])
        _sub_text(g_val, "dTotBruOpeItem", det.d_tot_bru_ope_item)
        g_vr = _el(g_val, "gValorRestaItem")
        _sub_text(g_vr, "dDescItem", 0)
        _sub_text(g_vr, "dPorcDesIt", 0)
        _sub_text(g_vr, "dDescGloItem", 0)
        _sub_text(g_vr, "dTotOpeItem", det.d_tot_bru_ope_item)
        g_iva = _el(g_item, "gCamIVA")
        tasa = ln.get("d_tasa_iva", 10)
        i_afec = ln.get("i_afec_iva", 1 if tasa in (5, 10) else 4)
        _sub_text(g_iva, "iAfecIVA", i_afec)
        _sub_text(g_iva, "dDesAfecIVA", "Gravado IVA" if tasa in (5, 10) else "Exento")
        if tasa in (5, 10):
            _sub_text(g_iva, "dPropIVA", 100)
            _sub_text(g_iva, "dTasaIVA", tasa)
            _sub_text(g_iva, "dBasGravIVA", det.d_bas_grav_iva)
            _sub_text(g_iva, "dLiqIVAItem", det.d_liq_iva_item)
        else:
            _sub_text(g_iva, "dPropIVA", 0)
            _sub_text(g_iva, "dTasaIVA", 0)
            _sub_text(g_iva, "dBasGravIVA", 0)
            _sub_text(g_iva, "dLiqIVAItem", 0)

    # gTransp (requerido por el XSD — valores mínimos para servicio)
    g_tr = _el(g_dtip, "gTransp")
    _sub_text(g_tr, "iModTrans", 1)
    _sub_text(g_tr, "dDesModTrans", "Terrestre")
    _sub_text(g_tr, "iRespFlete", 2)

    # gTotSub
    g_tot = _el(de, "gTotSub")
    _sub_text(g_tot, "dSubExe", tot.d_sub_exe)
    _sub_text(g_tot, "dSubExo", tot.d_sub_exo)
    _sub_text(g_tot, "dSub5", tot.d_sub5)
    _sub_text(g_tot, "dSub10", tot.d_sub10)
    _sub_text(g_tot, "dTotOpe", tot.d_tot_ope)
    _sub_text(g_tot, "dTotDesc", tot.d_tot_desc)
    _sub_text(g_tot, "dTotDescGlotem", tot.d_tot_desc_glotem)
    _sub_text(g_tot, "dTotAntItem", tot.d_tot_ant_item)
    _sub_text(g_tot, "dTotAnt", tot.d_tot_ant)
    _sub_text(g_tot, "dPorcDescTotal", tot.d_porc_desc_total)
    _sub_text(g_tot, "dDescTotal", tot.d_desc_total)
    _sub_text(g_tot, "dAnticipo", tot.d_anticipo)
    _sub_text(g_tot, "dRedon", tot.d_redon)
    _sub_text(g_tot, "dTotGralOpe", tot.d_tot_gral_ope)
    _sub_text(g_tot, "dIVA5", tot.d_iva5)
    _sub_text(g_tot, "dIVA10", tot.d_iva10)
    _sub_text(g_tot, "dTotIVA", tot.d_tot_iva)
    _sub_text(g_tot, "dBaseGrav5", tot.d_base_grav5)
    _sub_text(g_tot, "dBaseGrav10", tot.d_base_grav10)
    _sub_text(g_tot, "dTBasGraIVA", tot.d_t_bas_gra_iva)

    # Signature placeholder (se reemplaza al firmar con .p12)
    sig = ET.SubElement(rde, f"{{{DSIG}}}Signature")
    sig.set("xmlns", DSIG)
    si = ET.SubElement(sig, f"{{{DSIG}}}SignedInfo")
    ET.SubElement(si, f"{{{DSIG}}}CanonicalizationMethod").set(
        "Algorithm", "http://www.w3.org/2001/10/xml-exc-c14n#"
    )
    ET.SubElement(si, f"{{{DSIG}}}SignatureMethod").set(
        "Algorithm", "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"
    )
    ref = ET.SubElement(si, f"{{{DSIG}}}Reference")
    ref.set("URI", f"#{cdc}")
    ET.SubElement(ref, f"{{{DSIG}}}DigestMethod").set(
        "Algorithm", "http://www.w3.org/2001/04/xmlenc#sha256"
    )
    ET.SubElement(ref, f"{{{DSIG}}}DigestValue").text = "PENDIENTE_FIRMA_DIGITAL"
    ET.SubElement(sig, f"{{{DSIG}}}SignatureValue").text = "PENDIENTE_FIRMA_DIGITAL"
    ki = ET.SubElement(sig, f"{{{DSIG}}}KeyInfo")
    xd = ET.SubElement(ki, f"{{{DSIG}}}X509Data")
    ET.SubElement(xd, f"{{{DSIG}}}X509Certificate").text = "CERTIFICADO_DIGITAL_PKCS12"

    # gCamFuFD con QR
    g_qr = _el(rde, "gCamFuFD")
    _sub_text(g_qr, "dCarQR", documento.get("d_car_qr", ""))

    ET.register_namespace("", NS)
    ET.register_namespace("xsi", XSI)

    xml_bytes = ET.tostring(rde, encoding="utf-8", xml_declaration=True, default_namespace=None)
    return xml_bytes.decode("utf-8")
