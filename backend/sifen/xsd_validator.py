"""
sifen/xsd_validator.py — Validación del XML rDE contra el XSD oficial SIFEN v150.
Adaptado desde Denarius: usa sifen.config en lugar de app.config.
Si el XSD no está disponible, se advierte pero no se bloquea la emisión.
"""
from __future__ import annotations

from pathlib import Path

from sifen.config import XSD_PATH


def _cargar_schema():
    try:
        from lxml import etree
    except ImportError:
        return None

    xsd_path = Path(XSD_PATH)
    if not xsd_path.exists():
        return None

    with open(xsd_path, "rb") as f:
        schema_doc = etree.parse(f)
    return etree.XMLSchema(schema_doc)


def validar_xml_contra_xsd(xml_str: str) -> list[str]:
    """
    Valida el XML rDE contra el XSD oficial.
    Retorna lista vacía si es válido, lista de mensajes de error si hay violaciones.
    Si el XSD no está disponible, retorna advertencia (no bloquea).
    """
    try:
        from lxml import etree
    except ImportError:
        return ["ADVERTENCIA: lxml no instalado, validación XSD omitida"]

    schema = _cargar_schema()
    if schema is None:
        return [
            f"ADVERTENCIA: XSD no encontrado en {XSD_PATH}. "
            "Descargue siRecepDE_v150.xsd del manual SIFEN y colóquelo en esa ruta."
        ]

    try:
        doc = etree.fromstring(xml_str.encode("utf-8"))
    except etree.XMLSyntaxError as e:
        return [f"XML mal formado: {e}"]

    schema.validate(doc)
    errores = [str(err) for err in schema.error_log]
    return errores
