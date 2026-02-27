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

# ===== VENDEDORES =====
class VendedorBase(BaseModel):
    nombre: str
    apellido: str
    telefono: Optional[str] = None
    email: Optional[str] = None
    activo: Optional[bool] = True

class VendedorCreate(VendedorBase):
    pass

class VendedorResponse(VendedorBase):
    id_vendedor: int
    class Config:
        from_attributes = True

# ===== ESCRIBANÍAS =====
class EscribaniaBase(BaseModel):
    nombre: str
    telefono: Optional[str] = None
    email: Optional[str] = None
    direccion: Optional[str] = None
    activo: Optional[bool] = True

class EscribaniaCreate(EscribaniaBase):
    pass

class EscribaniaResponse(EscribaniaBase):
    id_escribania: int
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
    nro_despacho: Optional[str] = None
    nro_cert_nac: Optional[str] = None
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

class ProductoResponseSimple(BaseModel):
    """Respuesta básica de producto sin campos calculados que requieran relaciones extra."""
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
    nro_despacho: Optional[str] = None
    nro_cert_nac: Optional[str] = None
    total_gastos: Optional[Decimal] = 0
    costo_final: Optional[Decimal] = 0
    imagenes: Optional[List['ImagenProductoResponse']] = []

    class Config:
        from_attributes = True
        # Exclude computed properties that require lazy loading
        ignored_types = (property,)

class ProductoResponse(ProductoResponseSimple):
    """Respuesta completa incluyendo campos calculados que pueden requerir lazy loading."""
    cliente_nombre: Optional[str] = None
    cliente_documento: Optional[str] = None

# ===== DOCUMENTOS IMPORTACIÓN =====
class DocumentoImportacionResponse(BaseModel):
    nro_despacho: str
    fecha_despacho: Optional[date] = None
    cantidad_vehiculos: Optional[int] = None
    monto_pagado: Optional[Decimal] = None
    observaciones: Optional[str] = None
    fecha_registro: Optional[datetime] = None
    productos: Optional[List[ProductoResponseSimple]] = []

    class Config:
        from_attributes = True


class VinculacionProducto(BaseModel):
    chasis: str
    nro_cert_nac: Optional[str] = None


class AnalizarDocumentosResponse(BaseModel):
    nro_despacho: Optional[str] = None
    chasis_despacho: List[str] = []
    certificados_por_chasis: Optional[dict] = None  # { "CHASIS": "nro_cert" }
    ya_existe: bool = False
    vehiculos_en_playa: List[dict] = []  # [{ id_producto, chasis, marca, modelo, nro_cert_nac }] para los que están en productos

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
    id_escribania: Optional[int] = None
    tipo_documento_propiedad: Optional[str] = None # prendado, transferencia, etc.
    observaciones: Optional[str] = None
    periodo_int_mora: Optional[str] = None # D, S, M, A
    monto_int_mora: Optional[Decimal] = 0
    tasa_interes: Optional[Decimal] = 0
    dias_gracia: Optional[int] = 0

class VentaCreate(VentaBase):
    detalles: Optional[List['DetalleVentaCreate']] = []

    @model_validator(mode="before")
    @classmethod
    def empty_str_to_none(cls, data: Any) -> Any:
        """Acepta '' en campos opcionales y los convierte a None o '0' para evitar 422 desde frontend."""
        if not isinstance(data, dict):
            return data
        
        # IDs que deben ser None si son ""
        for key in ("id_vendedor", "id_escribania"):
            if key in data and (data[key] == "" or data[key] is None):
                data = {**data, key: None}
        
        # Decimales que deben ser "0" o similares si son ""
        for key in ("descuento", "entrega_inicial", "saldo_financiar", "monto_cuota", "monto_refuerzo", "monto_int_mora", "tasa_interes"):
            if key in data and (data[key] == "" or data[key] is None):
                data = {**data, key: "0"}
        
        # Enteros que deben ser 0 si son ""
        for key in ("cantidad_cuotas", "cantidad_refuerzos", "dias_gracia"):
            if key in data and (data[key] == "" or data[key] is None):
                data = {**data, key: 0}
                
        return data

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

# ===== ESTADOS =====
class EstadoBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    color_hex: Optional[str] = None

class EstadoCreate(EstadoBase):
    pass

class EstadoResponse(EstadoBase):
    id_estado: int
    activo: Optional[bool] = True
    class Config:
        from_attributes = True

# ===== PAGARES =====
class PagareUpdate(BaseModel):
    numero_pagare: Optional[str] = None
    monto_cuota: Optional[Decimal] = None
    fecha_vencimiento: Optional[date] = None
    # estado: Optional[str] = None # Removed
    id_estado: Optional[int] = None
    cancelado: Optional[bool] = None
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
    # estado: Optional[str] = None # Removed
    id_estado: Optional[int] = None
    estado_rel: Optional[EstadoResponse] = None # Added relation
    cancelado: Optional[bool] = False
    saldo_pendiente: Optional[Decimal] = None
    fecha_pago: Optional[date] = None
    observaciones: Optional[str] = None
    pagos: Optional[List['PagoResponse']] = [] # Relación con el historial de pagos
    class Config:
        from_attributes = True

class VentaResponse(VentaBase):
    id_venta: int
    estado_venta: Optional[str] = None
    fecha_registro: Optional[datetime] = None
    cliente: Optional[ClienteResponse] = None
    producto: Optional[ProductoResponseSimple] = None
    escribania: Optional[EscribaniaResponse] = None
    pagares: Optional[List[PagareResponse]] = []
    detalles: Optional[List[DetalleVentaResponse]] = []
    # Respuesta tolerante a NULL (datos migrados)
    id_cliente: Optional[int] = None
    id_producto: Optional[int] = None
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
    mora_aplicada: Optional[Decimal] = None
    observaciones: Optional[str] = None

class PagoCreate(PagoBase):
    id_cuenta: Optional[int] = None
    cancelar_pagare: Optional[bool] = False # Checkbox "Cancelado" de la UI

    @model_validator(mode="before")
    @classmethod
    def empty_str_to_none(cls, data: Any) -> Any:
        """Acepta '' en campos opcionales y los convierte a None o '0' para evitar 422 de Pydantic."""
        if not isinstance(data, dict):
            return data
        # id_cuenta debe ser None si es ""
        if "id_cuenta" in data and (data["id_cuenta"] == "" or data["id_cuenta"] is None):
            data = {**data, "id_cuenta": None}
        # campos Decimal deben ser "0" o similar si vienen vacíos
        for key in ("mora_aplicada", "monto_pagado"):
            if key in data and (data[key] == "" or data[key] is None):
                data = {**data, key: "0"}
        return data

class PagoResponse(PagoBase):
    id_pago: int
    id_cuenta: Optional[int] = None
    dias_atraso: Optional[int] = 0
    mora_aplicada: Optional[Decimal] = None
    fecha_registro: Optional[datetime] = None
    # Campos virtuales para listados globales
    cliente_nombre: Optional[str] = None
    vehiculo: Optional[str] = None
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
    @model_validator(mode="before")
    @classmethod
    def empty_str_to_none(cls, data: Any) -> Any:
        """Acepta '' en campos opcionales date/number y los convierte a None (evita 422 desde frontend)."""
        if not isinstance(data, dict):
            return data
        for key in ("fecha_nacimiento", "ingreso_mensual"):
            if key in data and (data[key] == "" or data[key] is None):
                data = {**data, key: None}
        return data

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

# ===== ESTADOS DE PAGARÉ =====
class EstadoBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    color_hex: Optional[str] = None
    activo: Optional[bool] = True

class EstadoCreate(EstadoBase):
    pass

class EstadoResponse(EstadoBase):
    id_estado: int
    class Config:
        from_attributes = True

# ===== CUENTAS =====
class CuentaBase(BaseModel):
    nombre: str
    tipo: Optional[str] = None # CAJA, BANCO, etc.
    banco: Optional[str] = None
    numero_cuenta: Optional[str] = None
    saldo_actual: Optional[Decimal] = 0
    activo: Optional[bool] = True

class CuentaCreate(CuentaBase):
    pass

class CuentaResponse(CuentaBase):
    id_cuenta: int
    fecha_registro: Optional[datetime] = None
    class Config:
        from_attributes = True

# ===== MOVIMIENTOS =====
class MovimientoBase(BaseModel):
    id_cuenta_origen: Optional[int] = None
    id_cuenta_destino: Optional[int] = None
    monto: Decimal
    concepto: Optional[str] = None
    referencia: Optional[str] = None

class MovimientoCreate(MovimientoBase):
    fecha: Optional[datetime] = None

class MovimientoResponse(MovimientoBase):
    id_movimiento: int
    fecha: Optional[datetime] = None
    id_usuario: Optional[int] = None
    cuenta_origen: Optional[CuentaResponse] = None
    cuenta_destino: Optional[CuentaResponse] = None
    class Config:
        from_attributes = True
# ===== IMÁGENES DE PRODUCTOS =====
class ImagenProductoBase(BaseModel):
    id_producto: int
    nombre_archivo: Optional[str] = None
    ruta_archivo: Optional[str] = None
    es_principal: Optional[bool] = False
    orden: Optional[int] = 0

class ImagenProductoCreate(ImagenProductoBase):
    pass

class ImagenProductoUpdate(BaseModel):
    es_principal: Optional[bool] = None
    orden: Optional[int] = None

class ImagenProductoResponse(ImagenProductoBase):
    id_imagen: int
    fecha_registro: Optional[datetime] = None

    class Config:
        from_attributes = True
