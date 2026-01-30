# schemas_playa.py
# Schemas de validación Pydantic para el sistema de Playa de Vehículos

from pydantic import BaseModel, Field
from typing import Optional, List
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
    precio_venta_sugerido: Optional[Decimal] = None
    precio_venta_minimo: Optional[Decimal] = None
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
    estado: Optional[str] = None
    precio_venta_sugerido: Optional[Decimal] = None
    precio_venta_minimo: Optional[Decimal] = None
    estado_disponibilidad: Optional[str] = None
    observaciones: Optional[str] = None

class ProductoResponse(ProductoBase):
    id_producto: int
    fecha_registro: datetime
    activo: bool
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
    ingreso_mensual: Optional[Decimal] = None
    observaciones: Optional[str] = None
    activo: Optional[bool] = True

class ClienteCreate(ClienteBase):
    pass

class ClienteResponse(ClienteBase):
    id_cliente: int
    fecha_registro: datetime
    activo: bool
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

class VentaCreate(VentaBase):
    pass

class PagareResponse(BaseModel):
    id_pagare: int
    numero_cuota: int
    monto_cuota: Decimal
    fecha_vencimiento: date
    tipo_pagare: str
    estado: str
    class Config:
        from_attributes = True

class VentaResponse(VentaBase):
    id_venta: int
    estado_venta: str
    fecha_registro: datetime
    pagares: Optional[List[PagareResponse]] = []
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
    dias_atraso: int
    mora_aplicada: Decimal
    fecha_registro: datetime
    class Config:
        from_attributes = True

# ===== GASTOS DE VEHÍCULOS =====
class TipoGastoProductoResponse(BaseModel):
    id_tipo_gasto: int
    nombre: str
    descripcion: Optional[str] = None
    class Config:
        from_attributes = True

class TipoGastoProductoCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = None

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
    fecha_registro: datetime
    tipo_gasto: Optional[TipoGastoProductoResponse] = None
    class Config:
        from_attributes = True

# ===== GASTOS DE EMPRESA =====
class TipoGastoEmpresaBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    es_fijo: Optional[bool] = False

class TipoGastoEmpresaCreate(TipoGastoEmpresaBase):
    pass

class TipoGastoEmpresaResponse(TipoGastoEmpresaBase):
    id_tipo_gasto_empresa: int
    activo: bool
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
    fecha_registro: datetime
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
