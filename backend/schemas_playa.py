# schemas_playa.py
# Schemas de validación Pydantic para el sistema de Playa de Vehículos

from pydantic import BaseModel, Field, model_validator
from typing import Optional, List, Any
from datetime import datetime, date
from decimal import Decimal

# ===== CATEGORÍAS =====
class CategoriaVehiculoBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = None

class CategoriaVehiculoCreate(CategoriaVehiculoBase):
    pass

class CategoriaVehiculoResponse(CategoriaVehiculoBase):
    id_categoria: int
    class Config:
        from_attributes = True

# ===== VEHÍCULOS (PRODUCTOS) =====
class ProductoBase(BaseModel):
    id_categoria: Optional[int] = None
    codigo_interno: Optional[str] = None
    tipo_vehiculo: Optional[str] = None
    marca: str
    modelo: str
    año: Optional[int] = None
    color: Optional[str] = None
    chasis: str
    motor: Optional[str] = None
    kilometraje: Optional[int] = None
    combustible: Optional[str] = None
    transmision: Optional[str] = None
    numero_puertas: Optional[int] = None
    capacidad_pasajeros: Optional[int] = None
    estado: Optional[str] = None
    procedencia: Optional[str] = None
    ubicacion_actual: Optional[str] = None
    costo_base: Decimal
    precio_contado_sugerido: Optional[Decimal] = None
    precio_financiado_sugerido: Optional[Decimal] = None
    precio_venta_minimo: Optional[Decimal] = None
    entrega_inicial_sugerida: Optional[Decimal] = None
    estado_disponibilidad: Optional[str] = "DISPONIBLE"
    observaciones: Optional[str] = None
    fecha_ingreso: Optional[date] = None

class ProductoCreate(ProductoBase):
    pass

class ProductoUpdate(BaseModel):
    id_categoria: Optional[int] = None
    codigo_interno: Optional[str] = None
    tipo_vehiculo: Optional[str] = None
    marca: Optional[str] = None
    modelo: Optional[str] = None
    año: Optional[int] = None
    color: Optional[str] = None
    chasis: Optional[str] = None
    motor: Optional[str] = None
    kilometraje: Optional[int] = None
    combustible: Optional[str] = None
    transmision: Optional[str] = None
    numero_puertas: Optional[int] = None
    capacidad_pasajeros: Optional[int] = None
    estado: Optional[str] = None
    procedencia: Optional[str] = None
    ubicacion_actual: Optional[str] = None
    costo_base: Optional[Decimal] = None
    precio_contado_sugerido: Optional[Decimal] = None
    precio_financiado_sugerido: Optional[Decimal] = None
    precio_venta_minimo: Optional[Decimal] = None
    entrega_inicial_sugerida: Optional[Decimal] = None
    estado_disponibilidad: Optional[str] = None
    observaciones: Optional[str] = None
    fecha_ingreso: Optional[date] = None
    activo: Optional[bool] = None

class ProductoResponse(BaseModel):
    """Respuesta tolerante a NULL para datos migrados o incompletos."""
    id_producto: int
    id_categoria: Optional[int] = None
    codigo_interno: Optional[str] = None
    tipo_vehiculo: Optional[str] = None
    marca: Optional[str] = None
    modelo: Optional[str] = None
    año: Optional[int] = None
    color: Optional[str] = None
    chasis: Optional[str] = None
    motor: Optional[str] = None
    kilometraje: Optional[int] = None
    combustible: Optional[str] = None
    transmision: Optional[str] = None
    numero_puertas: Optional[int] = None
    capacidad_pasajeros: Optional[int] = None
    estado: Optional[str] = None
    procedencia: Optional[str] = None
    ubicacion_actual: Optional[str] = None
    costo_base: Optional[Decimal] = None
    precio_contado_sugerido: Optional[Decimal] = None
    precio_financiado_sugerido: Optional[Decimal] = None
    precio_venta_minimo: Optional[Decimal] = None
    entrega_inicial_sugerida: Optional[Decimal] = None
    estado_disponibilidad: Optional[str] = "DISPONIBLE"
    observaciones: Optional[str] = None
    fecha_ingreso: Optional[date] = None
    fecha_registro: Optional[datetime] = None
    activo: Optional[bool] = None

    class Config:
        from_attributes = True

# ===== CLIENTES =====
class ClienteBase(BaseModel):
    tipo_documento: str
    numero_documento: str
    nombre: str
    apellido: str
    fecha_nacimiento: Optional[date] = None
    telefono: Optional[str] = None
    celular: Optional[str] = None
    email: Optional[str] = None
    direccion: Optional[str] = None
    ciudad: Optional[str] = None
    departamento: Optional[str] = None
    codigo_postal: Optional[str] = None
    estado_civil: Optional[str] = None
    profesion: Optional[str] = None
    lugar_trabajo: Optional[str] = None
    telefono_trabajo: Optional[str] = None
    antiguedad_laboral: Optional[str] = None
    direccion_laboral: Optional[str] = None
    ingreso_mensual: Optional[Decimal] = None
    fecha_calificacion: Optional[date] = None
    mora_acumulada: Optional[Decimal] = None
    calificacion_actual: Optional[str] = "NUEVO"
    observaciones: Optional[str] = None
    activo: Optional[bool] = True

class ClienteCreate(ClienteBase):
    @model_validator(mode="before")
    @classmethod
    def empty_str_to_none(cls, data: Any) -> Any:
        """Acepta '' en campos opcionales date/number y los convierte a None (evita 422 desde frontend)."""
        if not isinstance(data, dict):
            return data
        for key in ("fecha_nacimiento", "ingreso_mensual", "mora_acumulada", "fecha_calificacion"):
            if key in data and (data[key] == "" or data[key] is None):
                data = {**data, key: None}
        return data

class ClienteResponse(ClienteBase):
    id_cliente: int
    fecha_registro: Optional[datetime] = None
    activo: Optional[bool] = None
    class Config:
        from_attributes = True

# ===== VENTAS (Básico) =====
class VentaBase(BaseModel):
    numero_venta: str
    id_cliente: int
    id_producto: int
    fecha_venta: date
    tipo_venta: str
    precio_venta: Decimal
    descuento: Optional[Decimal] = 0
    precio_final: Decimal
    entrega_inicial: Optional[Decimal] = 0
    saldo_financiar: Optional[Decimal] = None
    cantidad_cuotas: Optional[int] = None
    monto_cuota: Optional[Decimal] = None
    cantidad_refuerzos: Optional[int] = 0
    monto_refuerzo: Optional[Decimal] = 0
    id_vendedor: Optional[int] = None # Added id_vendedor
    vendedor: Optional[str] = None # Keeping for legacy/compatibility if sent as text
    periodo_int_mora: Optional[str] = None # D, S, M, A
    monto_int_mora: Optional[Decimal] = 0
    dias_gracia: Optional[int] = 0

class VentaCreate(VentaBase):
    detalles: Optional[List['DetalleVentaCreate']] = []

# ===== DETALLES DE VENTA =====
class DetalleVentaBase(BaseModel):
    concepto: str
    monto_unitario: Decimal
    cantidad: int = 1
    subtotal: Decimal
    observaciones: Optional[str] = None

class DetalleVentaCreate(DetalleVentaBase):
    pass

class DetalleVentaResponse(DetalleVentaBase):
    id_detalle_venta: int
    concepto: Optional[str] = None
    monto_unitario: Optional[Decimal] = None
    subtotal: Optional[Decimal] = None
    class Config:
        from_attributes = True

class PagareUpdate(BaseModel):
    numero_pagare: Optional[str] = None
    monto_cuota: Optional[Decimal] = None
    fecha_vencimiento: Optional[date] = None
    estado: Optional[str] = None
    saldo_pendiente: Optional[Decimal] = None
    observaciones: Optional[str] = None

class PagareResponse(BaseModel):
    id_pagare: int
    id_venta: int
    numero_pagare: Optional[str] = None
    numero_cuota: Optional[int] = None
    monto_cuota: Optional[Decimal] = None
    fecha_vencimiento: Optional[date] = None
    tipo_pagare: Optional[str] = None
    estado: Optional[str] = None
    saldo_pendiente: Optional[Decimal] = None
    fecha_pago: Optional[date] = None
    observaciones: Optional[str] = None
    class Config:
        from_attributes = True

class VentaResponse(VentaBase):
    id_venta: int
    estado_venta: Optional[str] = None
    fecha_registro: Optional[datetime] = None
    cliente: Optional[ClienteResponse] = None
    producto: Optional[ProductoResponse] = None
    pagares: Optional[List[PagareResponse]] = []
    detalles: Optional[List[DetalleVentaResponse]] = []
    # Respuesta tolerante a NULL (datos migrados)
    numero_venta: Optional[str] = None
    fecha_venta: Optional[date] = None
    tipo_venta: Optional[str] = None
    precio_venta: Optional[Decimal] = None
    precio_final: Optional[Decimal] = None
    class Config:
        from_attributes = True

# ===== PAGOS =====
class PagoBase(BaseModel):
    id_pagare: int
    id_venta: int
    numero_recibo: str
    fecha_pago: date
    monto_pagado: Decimal
    forma_pago: str
    numero_referencia: Optional[str] = None
    observaciones: Optional[str] = None

class PagoCreate(PagoBase):
    pass

class PagoResponse(PagoBase):
    id_pago: int
    dias_atraso: Optional[int] = 0
    mora_aplicada: Optional[Decimal] = None
    fecha_registro: Optional[datetime] = None
    class Config:
        from_attributes = True

# ===== GASTOS DE VEHÍCULOS =====
class TipoGastoProductoResponse(BaseModel):
    id_tipo_gasto: int
    nombre: str
    descripcion: Optional[str] = None
    activo: Optional[bool] = None
    class Config:
        from_attributes = True

class TipoGastoProductoCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    activo: Optional[bool] = True

class GastoProductoBase(BaseModel):
    id_producto: int
    id_tipo_gasto: int
    descripcion: Optional[str] = None
    monto: Decimal
    fecha_gasto: date
    proveedor: Optional[str] = None
    numero_factura: Optional[str] = None
    observaciones: Optional[str] = None

class GastoProductoCreate(GastoProductoBase):
    pass

class GastoProductoResponse(GastoProductoBase):
    id_gasto_producto: int
    fecha_registro: Optional[datetime] = None
    fecha_gasto: Optional[date] = None
    monto: Optional[Decimal] = None
    tipo_gasto: Optional[TipoGastoProductoResponse] = None
    class Config:
        from_attributes = True

# ===== GASTOS DE EMPRESA =====
class TipoGastoEmpresaBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    es_fijo: Optional[bool] = False
    activo: Optional[bool] = True

class TipoGastoEmpresaCreate(TipoGastoEmpresaBase):
    pass

class TipoGastoEmpresaResponse(TipoGastoEmpresaBase):
    id_tipo_gasto_empresa: int
    activo: Optional[bool] = None
    class Config:
        from_attributes = True

class GastoEmpresaBase(BaseModel):
    id_tipo_gasto_empresa: int
    descripcion: Optional[str] = None
    monto: Decimal
    fecha_gasto: date
    periodo: Optional[str] = None
    proveedor: Optional[str] = None
    numero_factura: Optional[str] = None
    observaciones: Optional[str] = None

class GastoEmpresaCreate(GastoEmpresaBase):
    pass

class GastoEmpresaResponse(GastoEmpresaBase):
    id_gasto_empresa: int
    fecha_registro: Optional[datetime] = None
    fecha_gasto: Optional[date] = None
    monto: Optional[Decimal] = None
    tipo_gasto: Optional[TipoGastoEmpresaResponse] = None
    class Config:
        from_attributes = True

# ===== CONFIGURACIÓN DE CALIFICACIONES =====
class ConfigCalificacionBase(BaseModel):
    nombre: str
    dias_atraso_desde: int
    dias_atraso_hasta: Optional[int] = None
    calificacion: str
    descripcion: Optional[str] = None
    activo: Optional[bool] = True

class ConfigCalificacionCreate(ConfigCalificacionBase):
    pass

class ConfigCalificacionResponse(ConfigCalificacionBase):
    id_config: int
    class Config:
        from_attributes = True
# ===== GARANTES =====
class GanteBase(BaseModel):
    id_cliente: int
    tipo_documento: str
    numero_documento: str
    nombre: str
    apellido: str
    fecha_nacimiento: Optional[date] = None
    telefono: Optional[str] = None
    celular: Optional[str] = None
    email: Optional[str] = None
    direccion: Optional[str] = None
    ciudad: Optional[str] = None
    estado_civil: Optional[str] = None
    relacion_cliente: Optional[str] = None
    lugar_trabajo: Optional[str] = None
    telefono_trabajo: Optional[str] = None
    antiguedad_laboral: Optional[str] = None
    direccion_laboral: Optional[str] = None
    ingreso_mensual: Optional[Decimal] = None
    observaciones: Optional[str] = None
    activo: Optional[bool] = True

class GanteCreate(GanteBase):
    pass

class GanteResponse(GanteBase):
    id_garante: int
    fecha_registro: Optional[datetime] = None
    referencias: Optional[List['ReferenciaResponse']] = []
    class Config:
        from_attributes = True

# ===== REFERENCIAS =====
class ReferenciaBase(BaseModel):
    id_cliente: int # Usado como entidad_id (Cliente o Garante según tipo_entidad)
    tipo_entidad: str # CLIENTE, GARANTE
    tipo_referencia: str # PERSONAL, LABORAL
    nombre: str
    telefono: Optional[str] = None
    parentesco_cargo: Optional[str] = None
    observaciones: Optional[str] = None
    activo: Optional[bool] = True

class ReferenciaCreate(ReferenciaBase):
    pass

class ReferenciaResponse(ReferenciaBase):
    id_referencia: int
    fecha_registro: Optional[datetime] = None
    class Config:
        from_attributes = True

# ===== UBICACIONES CLIENTES =====
class UbicacionClienteBase(BaseModel):
    id_cliente: int
    nombre_lugar: str
    tipo_ubicacion: Optional[str] = None
    latitud: Optional[Decimal] = None
    longitud: Optional[Decimal] = None
    direccion_texto: Optional[str] = None
    referencia: Optional[str] = None

class UbicacionClienteCreate(UbicacionClienteBase):
    pass

class UbicacionClienteResponse(UbicacionClienteBase):
    id_ubicacion: int
    fecha_registro: Optional[datetime] = None
    class Config:
        from_attributes = True

# Actualizar ClienteResponse para incluir relaciones
class ClienteResponseFull(ClienteResponse):
    garantes: Optional[List[GanteResponse]] = []
    referencias: Optional[List[ReferenciaResponse]] = []
    ubicaciones: Optional[List[UbicacionClienteResponse]] = []
