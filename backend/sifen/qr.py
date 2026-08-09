"""
sifen/qr.py — Construcción de la URL QR (dCarQR) y hash SHA-256.
Adaptado desde Denarius: usa sifen.config en lugar de app.config.
"""
from __future__ import annotations

import hashlib
from urllib.parse import urlencode

from sifen.config import QR_BASE_URL, D_VER_FOR, ID_CSC_DEFAULT, CSC_SECRETO


def _fe_emi_hex(fecha_iso: str) -> str:
    """dFeEmiDE en el QR: cadena UTF-8 del datetime en hexadecimal."""
    return fecha_iso.encode("utf-8").hex()


def construir_d_car_qr(
    *,
    cdc: str,
    d_fe_emi_de: str,
    d_ruc_rec: str,
    d_tot_gral_ope: int,
    d_tot_iva: int,
    c_items: int,
    digest_value_base64: str,
    id_csc: str | None = None,
    csc_secreto: str | None = None,
) -> str:
    """
    URL del código QR (campo dCarQR).
    cHashQR: SHA-256 en hex sobre concatenación de params + CSC.
    """
    id_csc = id_csc or ID_CSC_DEFAULT
    sec = csc_secreto or CSC_SECRETO
    fe_hex = _fe_emi_hex(d_fe_emi_de)

    digest_value_param = digest_value_base64.encode("utf-8").hex()

    params = [
        ("nVersion", str(D_VER_FOR)),
        ("Id", cdc),
        ("dFeEmiDE", fe_hex),
        ("dRucRec", d_ruc_rec),
        ("dTotGralOpe", str(d_tot_gral_ope)),
        ("dTotIVA", str(d_tot_iva)),
        ("cItems", str(c_items)),
        ("DigestValue", digest_value_param),
        ("IdCSC", id_csc),
    ]

    payload = "".join(v for k, v in params) + sec
    c_hash_qr = hashlib.sha256(payload.encode("utf-8")).hexdigest()

    params.append(("cHashQR", c_hash_qr))
    query_string = urlencode(params)
    return f"{QR_BASE_URL}?{query_string}"


def digest_placeholder_para_qr(cdc: str, d_fe_emi_de: str) -> str:
    """Digest en hex provisional hasta contar con firma XML real."""
    return hashlib.sha256(f"{cdc}|{d_fe_emi_de}".encode("utf-8")).hexdigest()
