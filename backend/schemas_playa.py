# schemas_playa.py
# Schemas de validación Pydantic para el sistema de Playa de Vehículos

from pydantic import BaseModel, EmailStr, Field
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
    email: Optional[EmailStr] = None
    direccion: Optional[str] = None
    ciudad: Optional[str] = None
    departamento: Optional[str] = None
    calificacion_actual: Optional[str] = "NUEVO"

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

class VentaResponse(VentaBase):
    id_venta: int
    estado_venta: str
    fecha_registro: datetime
    class Config:
        from_attributes = True
