# schemas_surtidor.py
# Schemas Pydantic para validación de datos del Sistema de Gestión de Surtidor

from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime, date, time
from decimal import Decimal


# =================== TIPOS DE COMBUSTIBLE ===================

class TipoCombustibleBase(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=50)
    descripcion: Optional[str] = None
    color_hex: str = Field(default="#4CAF50", pattern=r"^#[0-9A-Fa-f]{6}$")
    unidad: str = Field(default="litros", max_length=20)
    activo: bool = True


class TipoCombustibleCreate(TipoCombustibleBase):
    pass


class TipoCombustibleUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=2, max_length=50)
    descripcion: Optional[str] = None
    color_hex: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    unidad: Optional[str] = None
    activo: Optional[bool] = None


class TipoCombustibleOut(TipoCombustibleBase):
    id: int
    fecha_creacion: datetime

    class Config:
        from_attributes = True


# =================== TANQUES ===================

class TanqueBase(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=100)
    numero: int = Field(..., gt=0)
    tipo_combustible_id: int
    capacidad_litros: Decimal = Field(..., gt=0)
    stock_minimo_litros: Decimal = Field(default=Decimal("5000"), ge=0)
    ubicacion: Optional[str] = None
    activo: bool = True


class TanqueCreate(TanqueBase):
    stock_actual_litros: Decimal = Field(default=Decimal("0"), ge=0)


class TanqueUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=2, max_length=100)
    tipo_combustible_id: Optional[int] = None
    capacidad_litros: Optional[Decimal] = Field(None, gt=0)
    stock_minimo_litros: Optional[Decimal] = Field(None, ge=0)
    ubicacion: Optional[str] = None
    activo: Optional[bool] = None


class TanqueOut(TanqueBase):
    id: int
    stock_actual_litros: Decimal
    fecha_creacion: datetime
    tipo_combustible: Optional[TipoCombustibleOut] = None
    porcentaje_lleno: Optional[float] = None
    estado_stock: Optional[str] = None   # "ok", "bajo", "critico", "lleno"

    class Config:
        from_attributes = True


# =================== ISLAS ===================

class IslaBase(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=50)
    numero: int = Field(..., gt=0)
    descripcion: Optional[str] = None
    activo: bool = True


class IslaCreate(IslaBase):
    pass


class IslaUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    activo: Optional[bool] = None


class IslaOut(IslaBase):
    id: int
    fecha_creacion: datetime
    picos: Optional[List["PicoOut"]] = []

    class Config:
        from_attributes = True


# =================== PICOS ===================

class PicoBase(BaseModel):
    numero: int = Field(..., gt=0)
    isla_id: int
    tipo_combustible_id: int
    activo: bool = True


class PicoCreate(PicoBase):
    pass


class PicoUpdate(BaseModel):
    tipo_combustible_id: Optional[int] = None
    activo: Optional[bool] = None


class PicoOut(PicoBase):
    id: int
    fecha_creacion: datetime
    tipo_combustible: Optional[TipoCombustibleOut] = None
    isla: Optional[IslaBase] = None

    class Config:
        from_attributes = True


IslaOut.model_rebuild()


# =================== CONFIGURACIÓN TURNOS ===================

class TurnoConfigBase(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=50)
    hora_inicio: time
    duracion_horas: int = Field(default=8, gt=0, le=24)
    activo: bool = True
    orden: int = Field(default=1, gt=0)
    color_hex: str = Field(default="#2196F3", pattern=r"^#[0-9A-Fa-f]{6}$")


class TurnoConfigCreate(TurnoConfigBase):
    pass


class TurnoConfigUpdate(BaseModel):
    nombre: Optional[str] = None
    hora_inicio: Optional[time] = None
    duracion_horas: Optional[int] = Field(None, gt=0, le=24)
    activo: Optional[bool] = None
    orden: Optional[int] = None
    color_hex: Optional[str] = None


class TurnoConfigOut(TurnoConfigBase):
    id: int
    fecha_creacion: datetime

    class Config:
        from_attributes = True


# =================== PERSONAL ===================

class PersonalBase(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=100)
    apellido: str = Field(..., min_length=2, max_length=100)
    ci: str = Field(..., min_length=4, max_length=20)
    telefono: Optional[str] = None
    email: Optional[str] = None
    cargo: str = Field(default="playero", max_length=50)
    activo: bool = True
    fecha_ingreso: Optional[date] = None
    usuario_id: Optional[int] = None


class PersonalCreate(PersonalBase):
    pass


class PersonalUpdate(BaseModel):
    nombre: Optional[str] = None
    apellido: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    cargo: Optional[str] = None
    activo: Optional[bool] = None
    usuario_id: Optional[int] = None


class PersonalOut(PersonalBase):
    id: int
    fecha_creacion: datetime
    nombre_completo: Optional[str] = None

    class Config:
        from_attributes = True


# =================== TURNOS ===================

class TurnoBase(BaseModel):
    config_turno_id: int
    fecha: date
    observaciones: Optional[str] = None


class TurnoCreate(TurnoBase):
    pass


class TurnoClose(BaseModel):
    observaciones: Optional[str] = None


class TurnoOut(TurnoBase):
    id: int
    fecha_hora_apertura: Optional[datetime] = None
    fecha_hora_cierre: Optional[datetime] = None
    estado: str
    config_turno: Optional[TurnoConfigOut] = None
    asignaciones: Optional[List["AsignacionTurnoOut"]] = []
    total_ventas: Optional[Decimal] = None
    total_litros: Optional[Decimal] = None

    class Config:
        from_attributes = True


class AsignacionTurnoCreate(BaseModel):
    personal_id: int
    rol_turno: str = "playero"


class AsignacionTurnoOut(BaseModel):
    id: int
    personal_id: int
    rol_turno: str
    personal: Optional[PersonalOut] = None

    class Config:
        from_attributes = True


TurnoOut.model_rebuild()


# =================== METODOS DE PAGO ===================

class MetodoPagoBase(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=50)
    tipo: str = Field(..., pattern=r"^(efectivo|tarjeta)$")
    activo: bool = True
    dias_reembolso: int = Field(default=0, ge=0)


class MetodoPagoCreate(MetodoPagoBase):
    pass


class MetodoPagoUpdate(BaseModel):
    nombre: Optional[str] = None
    activo: Optional[bool] = None
    dias_reembolso: Optional[int] = None


class MetodoPagoOut(MetodoPagoBase):
    id: int
    fecha_creacion: datetime

    class Config:
        from_attributes = True


# =================== VENTAS ===================

class VentaCreate(BaseModel):
    turno_id: int
    pico_id: int
    tanque_id: int
    metodo_pago_id: int
    nro_comprobante: Optional[str] = None
    litros: Decimal = Field(..., gt=0)
    precio_litro: Decimal = Field(..., gt=0)
    observaciones: Optional[str] = None

    @validator("litros", "precio_litro", pre=True)
    def must_be_positive(cls, v):
        if v <= 0:
            raise ValueError("El valor debe ser positivo")
        return v


class VentaAsignarReembolso(BaseModel):
    reembolso_id: int
    nro_comprobante_banco: str


class VentaOut(BaseModel):
    id: int
    turno_id: int
    pico_id: int
    tanque_id: int
    metodo_pago_id: int
    nro_comprobante: Optional[str] = None
    litros: Decimal
    precio_litro: Decimal
    monto_total: Decimal
    estado_reembolso: str
    reembolso_id: Optional[int] = None
    nro_comprobante_banco: Optional[str] = None
    observaciones: Optional[str] = None
    anulada: bool
    fecha_hora: datetime
    metodo_pago: Optional[MetodoPagoOut] = None
    pico: Optional[PicoOut] = None

    class Config:
        from_attributes = True


class ResumenTurno(BaseModel):
    turno_id: int
    total_ventas: Decimal
    total_litros: Decimal
    ventas_efectivo: Decimal
    ventas_tarjeta: Decimal
    cantidad_transacciones: int
    por_metodo_pago: List[dict]
    por_tipo_combustible: List[dict]


# =================== STOCK ===================

class MedicionManualCreate(BaseModel):
    tanque_id: int
    litros_medidos: Decimal = Field(..., ge=0)
    metodo_medicion: str = Field(default="varilla", max_length=50)
    observaciones: Optional[str] = None
    turno_id: Optional[int] = None


class MedicionManualOut(BaseModel):
    id: int
    tanque_id: int
    turno_id: Optional[int] = None
    litros_medidos: Decimal
    litros_sistema: Decimal
    diferencia_litros: Optional[Decimal] = None
    metodo_medicion: str
    observaciones: Optional[str] = None
    fecha_hora: datetime

    class Config:
        from_attributes = True


class ProyeccionStock(BaseModel):
    tanque_id: int
    nombre_tanque: str
    tipo_combustible: str
    stock_actual: Decimal
    stock_minimo: Decimal
    venta_promedio_diaria: Decimal
    dias_hasta_minimo: Optional[float] = None
    fecha_minimo_estimada: Optional[date] = None
    se_requiere_pedido: bool
    litros_a_pedir: Decimal


# =================== FINANZAS ===================

class CuentaBancariaCreate(BaseModel):
    banco: str = Field(..., min_length=2, max_length=100)
    nro_cuenta: str = Field(..., min_length=4, max_length=50)
    titular: Optional[str] = None
    tipo: str = Field(default="corriente", max_length=30)
    moneda: str = Field(default="PYG", max_length=10)
    activo: bool = True


class CuentaBancariaOut(CuentaBancariaCreate):
    id: int
    fecha_creacion: datetime

    class Config:
        from_attributes = True


class ReembolsoTarjetaCreate(BaseModel):
    cuenta_bancaria_id: int
    metodo_pago_id: Optional[int] = None
    nro_comprobante: str = Field(..., min_length=3, max_length=100)
    fecha_deposito: date
    monto_bruto: Decimal = Field(..., gt=0)
    comision: Decimal = Field(default=Decimal("0"), ge=0)
    observacion: Optional[str] = None


class ReembolsoTarjetaOut(ReembolsoTarjetaCreate):
    id: int
    monto_neto: Decimal
    conciliado: bool
    fecha_registro: datetime
    ventas_asociadas: Optional[int] = None     # Cantidad de ventas conciliadas

    class Config:
        from_attributes = True


class CajaMovimientoCreate(BaseModel):
    turno_id: Optional[int] = None
    tipo: str = Field(..., pattern=r"^(ingreso|egreso)$")
    concepto: str = Field(..., min_length=3, max_length=200)
    monto: Decimal = Field(..., gt=0)
    referencia: Optional[str] = None
    observaciones: Optional[str] = None


class CajaMovimientoOut(CajaMovimientoCreate):
    id: int
    saldo_anterior: Optional[Decimal] = None
    saldo_posterior: Optional[Decimal] = None
    fecha_hora: datetime

    class Config:
        from_attributes = True


class DepositoBancarioCreate(BaseModel):
    cuenta_bancaria_id: int
    monto: Decimal = Field(..., gt=0)
    fecha_deposito: date
    nro_boleta: Optional[str] = None
    observaciones: Optional[str] = None


class DepositoBancarioOut(DepositoBancarioCreate):
    id: int
    fecha_registro: datetime

    class Config:
        from_attributes = True


# =================== ADQUISICIONES ===================

class ProveedorCreate(BaseModel):
    razon_social: str = Field(..., min_length=2, max_length=200)
    ruc: Optional[str] = None
    contacto: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    activo: bool = True


class ProveedorOut(ProveedorCreate):
    id: int
    fecha_creacion: datetime

    class Config:
        from_attributes = True


class PedidoCombustibleCreate(BaseModel):
    proveedor_id: Optional[int] = None
    tipo_combustible_id: int
    tanque_id: Optional[int] = None
    litros_solicitados: Decimal = Field(..., gt=0)
    precio_litro_estimado: Optional[Decimal] = None
    fecha_pedido: date
    fecha_entrega_estimada: Optional[date] = None
    observaciones: Optional[str] = None


class PedidoCombustibleOut(PedidoCombustibleCreate):
    id: int
    estado: str
    es_estimacion: bool
    fecha_creacion: datetime
    proveedor: Optional[ProveedorOut] = None

    class Config:
        from_attributes = True


class RecepcionCombustibleCreate(BaseModel):
    pedido_id: Optional[int] = None
    tanque_id: int
    litros_recibidos: Decimal = Field(..., gt=0)
    precio_litro: Optional[Decimal] = None
    nro_remito: Optional[str] = None
    nro_factura: Optional[str] = None
    proveedor_id: Optional[int] = None
    observaciones: Optional[str] = None


class RecepcionCombustibleOut(RecepcionCombustibleCreate):
    id: int
    fecha_recepcion: datetime

    class Config:
        from_attributes = True


# =================== DASHBOARD ===================

class DashboardKPIs(BaseModel):
    stock_por_tanque: List[TanqueOut]
    total_ventas_hoy: Decimal
    total_litros_hoy: Decimal
    ventas_efectivo_hoy: Decimal
    ventas_tarjeta_hoy: Decimal
    saldo_caja: Decimal
    turno_activo: Optional[TurnoOut] = None
    alertas_stock: List[dict]
    pedidos_pendientes: int
    reembolsos_pendientes_monto: Decimal
