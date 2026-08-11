"""
schemas/facturacion.py
Schemas Pydantic para el módulo de Facturación Electrónica SIFEN — Academias.
"""
from __future__ import annotations

from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, Field


# ============================================================
# EMISOR ACADEMIA
# ============================================================

class EmisorAcademiaUpdate(BaseModel):
    """Actualizar configuración SIFEN del emisor de una academia."""
    ruc_con_dv:             Optional[str] = Field(None, description="Formato: 12345678-9")
    tipo_contribuyente:     Optional[int] = Field(None, ge=1, le=2)
    razon_social:           Optional[str] = None
    nombre_fantasia:        Optional[str] = None
    direccion:              Optional[str] = None
    num_casa:               Optional[str] = None
    telefono:               Optional[str] = None
    email:                  Optional[str] = None
    c_dep_emi:              Optional[int] = None
    d_des_dep_emi:          Optional[str] = None
    c_ciu_emi:              Optional[int] = None
    d_des_ciu_emi:          Optional[str] = None
    c_act_eco:              Optional[str] = None
    d_des_act_eco:          Optional[str] = None
    num_tim:                Optional[str] = None
    d_est:                  Optional[str] = Field(None, min_length=3, max_length=3)
    d_pun_exp:              Optional[str] = Field(None, min_length=3, max_length=3)
    id_csc:                 Optional[str] = None
    csc_secreto:            Optional[str] = None


class EmisorAcademiaOut(BaseModel):
    id:                     str
    academia_id:            str
    ruc_con_dv:             str = ""
    tipo_contribuyente:     int = 1
    razon_social:           str = ""
    nombre_fantasia:        Optional[str] = None
    direccion:              Optional[str] = None
    num_casa:               Optional[str] = None
    telefono:               Optional[str] = None
    email:                  Optional[str] = None
    c_dep_emi:              Optional[int] = None
    d_des_dep_emi:          Optional[str] = None
    c_ciu_emi:              Optional[int] = None
    d_des_ciu_emi:          Optional[str] = None
    c_act_eco:              Optional[str] = None
    d_des_act_eco:          Optional[str] = None
    num_tim:                Optional[str] = None
    d_est:                  str = "001"
    d_pun_exp:              str = "001"
    id_csc:                 str = "0001"
    ultimo_num_doc:         int = 0
    activo:                 bool = True
    tiene_certificado:      bool = False
    actualizado_en:         Optional[datetime] = None


# ============================================================
# DATOS DE FACTURACIÓN (RECEPTOR)
# ============================================================

class DatosFacturacionCreate(BaseModel):
    """Registrar o actualizar datos del receptor (alumno o tutor) para facturación."""
    alumno_id:              Optional[str] = None
    tutor_id:               Optional[str] = None
    receptor_ruc:           Optional[str] = Field(None, description="CI o RUC sin DV")
    receptor_dv:            Optional[str] = Field(None, max_length=2)
    receptor_nombre:        str
    receptor_dir:           Optional[str] = None
    receptor_tel:           Optional[str] = None
    receptor_email:         Optional[str] = None
    c_dep_rec:              Optional[int] = None
    d_des_dep_rec:          Optional[str] = None
    c_ciu_rec:              Optional[int] = None
    d_des_ciu_rec:          Optional[str] = None
    es_pagador_principal:   Optional[bool] = True


class DatosFacturacionOut(BaseModel):
    id:                     str
    academia_id:            str
    alumno_id:              Optional[str]
    tutor_id:               Optional[str]
    receptor_ruc:           Optional[str]
    receptor_dv:            Optional[str]
    receptor_nombre:        str
    receptor_dir:           Optional[str]
    receptor_tel:           Optional[str]
    receptor_email:         Optional[str]
    c_dep_rec:              Optional[int]
    d_des_dep_rec:          Optional[str]
    c_ciu_rec:              Optional[int]
    d_des_ciu_rec:          Optional[str]
    es_pagador_principal:   bool
    creado_en:              Optional[datetime]


# ============================================================
# LÍNEAS DEL DOCUMENTO ELECTRÓNICO
# ============================================================

class LineaDocumentoCreate(BaseModel):
    """Una línea del DE (ítem de la factura)."""
    d_cod_int:          Optional[str] = None
    d_des_pro_ser:      str = Field(..., description="Descripción del bien/servicio")
    c_uni_med:          Optional[int] = 77              # 77=Servicio
    d_des_uni_med:      Optional[str] = "SERVICIO"
    d_cant_pro_ser:     Optional[float] = 1.0
    d_p_uni_pro_ser:    int = Field(..., gt=0, description="Precio unitario en Guaraníes (entero)")
    d_tasa_iva:         int = Field(10, description="Tasa IVA: 0, 5 o 10")


class LineaDocumentoOut(BaseModel):
    id:                 str
    orden:              int
    d_cod_int:          Optional[str]
    d_des_pro_ser:      str
    c_uni_med:          int
    d_des_uni_med:      str
    d_cant_pro_ser:     float
    d_p_uni_pro_ser:    int
    d_tasa_iva:         int
    i_afec_iva:         int


# ============================================================
# DOCUMENTO ELECTRÓNICO (FACTURA)
# ============================================================

class DocumentoElectronicoCreate(BaseModel):
    """Emitir una factura electrónica manualmente para un cobro de academia."""
    cuota_id:           Optional[str] = None
    matricula_id:       Optional[str] = None
    concepto_libre:     Optional[str] = None    # Si no se vincula a cuota/matrícula
    # Datos del receptor (si ya existe en datos_facturacion se puede omitir)
    receptor_ruc:       Optional[str] = None
    receptor_dv:        Optional[str] = None
    receptor_nombre:    Optional[str] = None
    receptor_dir:       Optional[str] = None
    receptor_tel:       Optional[str] = None
    receptor_email:     Optional[str] = None
    c_dep_rec:          Optional[int] = None
    d_des_dep_rec:      Optional[str] = None
    c_ciu_rec:          Optional[int] = None
    d_des_ciu_rec:      Optional[str] = None
    i_cond_ope:         Optional[int] = 1       # 1=Contado
    # Líneas (si se omite, se generan automáticamente desde cuota/matrícula)
    lineas:             Optional[List[LineaDocumentoCreate]] = None
    # Opción de firmar en la misma llamada (requiere .p12 cargado)
    firmar:             Optional[bool] = False
    cert_password:      Optional[str] = None


class DocumentoElectronicoOut(BaseModel):
    id:                 str
    academia_id:        str
    cdc:                Optional[str]
    numero_documento:   int
    d_fe_emi_de:        Optional[datetime]
    receptor_nombre:    Optional[str]
    receptor_ruc:       Optional[str]
    d_tot_gral_ope:     Optional[int]
    d_tot_iva:          Optional[int]
    estado:             str
    cancelado:          bool
    cuota_id:           Optional[str]
    matricula_id:       Optional[str]
    concepto_libre:     Optional[str]
    creado_en:          Optional[datetime]
    lineas:             Optional[List[LineaDocumentoOut]] = None
    # URL QR (solo informativa)
    d_car_qr:           Optional[str] = None


class DocumentoElectronicoListItem(BaseModel):
    """Item de listado (sin líneas ni XML para reducir payload)."""
    id:                 str
    cdc:                Optional[str]
    numero_documento:   int
    d_fe_emi_de:        Optional[datetime]
    receptor_nombre:    Optional[str]
    d_tot_gral_ope:     Optional[int]
    estado:             str
    cancelado:          bool
    cuota_id:           Optional[str]
    matricula_id:       Optional[str]
    concepto_libre:     Optional[str]
    creado_en:          Optional[datetime]


class CancelarDocumentoRequest(BaseModel):
    motivo: str = Field(..., min_length=5)


class FirmarDocumentoRequest(BaseModel):
    cert_password: Optional[str] = ""


# ============================================================
# CERTIFICADO DIGITAL
# ============================================================

class CertificadoDigitalOut(BaseModel):
    id:             str
    nombre_archivo: Optional[str]
    activo:         bool
    valido_hasta:   Optional[date]
    creado_en:      Optional[datetime]
