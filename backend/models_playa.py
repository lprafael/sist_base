# models_playa.py
# Modelos de base de datos para el sistema de Playa de Vehículos

from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey, Table, JSON, Float, Date, DECIMAL
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
from models import Base

# Schema para la playa
PLAYA_SCHEMA = 'playa'

class CategoriaVehiculo(Base):
    __tablename__ = "categorias_vehiculos"
    __table_args__ = {"schema": PLAYA_SCHEMA}
    
    id_categoria = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    descripcion = Column(Text)
    
    # Relaciones
    productos = relationship("Producto", back_populates="categoria")

class Producto(Base):
    __tablename__ = "productos"
    __table_args__ = {"schema": PLAYA_SCHEMA}
    
    id_producto = Column(Integer, primary_key=True, index=True)
    id_categoria = Column(Integer, ForeignKey(f'{PLAYA_SCHEMA}.categorias_vehiculos.id_categoria'))
    codigo_interno = Column(String(50), unique=True, index=True)
    tipo_vehiculo = Column(String(50))
    marca = Column(String(100), nullable=False)
    modelo = Column(String(100), nullable=False)
    año = Column(Integer)
    color = Column(String(50))
    chasis = Column(String(100), unique=True, index=True)
    motor = Column(String(100))
    kilometraje = Column(Integer)
    combustible = Column(String(50))
    transmision = Column(String(50))
    numero_puertas = Column(Integer)
    capacidad_pasajeros = Column(Integer)
    estado = Column(String(50))
    procedencia = Column(String(100))
    ubicacion_actual = Column(String(200))
    costo_base = Column(DECIMAL(15, 2), nullable=False)
    precio_venta_sugerido = Column(DECIMAL(15, 2))
    precio_venta_minimo = Column(DECIMAL(15, 2))
    estado_disponibilidad = Column(String(50), default='DISPONIBLE')
    observaciones = Column(Text)
    fecha_ingreso = Column(Date, default=func.current_date())
    fecha_registro = Column(DateTime, default=func.now())
    activo = Column(Boolean, default=True)
    
    # Relaciones
    categoria = relationship("CategoriaVehiculo", back_populates="productos")
    gastos = relationship("GastoProducto", back_populates="producto")
    imagenes = relationship("ImagenProducto", back_populates="producto")
    ventas = relationship("Venta", back_populates="producto")

class Cliente(Base):
    __tablename__ = "clientes"
    __table_args__ = {"schema": PLAYA_SCHEMA}
    
    id_cliente = Column(Integer, primary_key=True, index=True)
    tipo_documento = Column(String(20), nullable=False)
    numero_documento = Column(String(50), unique=True, index=True, nullable=False)
    nombre = Column(String(100), nullable=False)
    apellido = Column(String(100), nullable=False)
    fecha_nacimiento = Column(Date)
    telefono = Column(String(50))
    celular = Column(String(50))
    email = Column(String(100))
    direccion = Column(Text)
    ciudad = Column(String(100))
    departamento = Column(String(100))
    codigo_postal = Column(String(20))
    estado_civil = Column(String(50))
    profesion = Column(String(100))
    lugar_trabajo = Column(String(200))
    telefono_trabajo = Column(String(50))
    ingreso_mensual = Column(DECIMAL(15, 2))
    calificacion_actual = Column(String(20), default='NUEVO')
    observaciones = Column(Text)
    fecha_registro = Column(DateTime, default=func.now())
    activo = Column(Boolean, default=True)
    
    # Relaciones
    garantes = relationship("Gante", back_populates="cliente")
    documentos_inforconf = relationship("DocumentoInforconf", back_populates="cliente")
    ventas = relationship("Venta", back_populates="cliente")
    historial_calificaciones = relationship("HistorialCalificacion", back_populates="cliente")

class Gante(Base):
    __tablename__ = "garantes"
    __table_args__ = {"schema": PLAYA_SCHEMA}
    
    id_garante = Column(Integer, primary_key=True, index=True)
    id_cliente = Column(Integer, ForeignKey(f'{PLAYA_SCHEMA}.clientes.id_cliente'))
    tipo_documento = Column(String(20), nullable=False)
    numero_documento = Column(String(50), nullable=False)
    nombre = Column(String(100), nullable=False)
    apellido = Column(String(100), nullable=False)
    fecha_nacimiento = Column(Date)
    telefono = Column(String(50))
    celular = Column(String(50))
    email = Column(String(100))
    direccion = Column(Text)
    ciudad = Column(String(100))
    relacion_cliente = Column(String(100))
    lugar_trabajo = Column(String(200))
    telefono_trabajo = Column(String(50))
    ingreso_mensual = Column(DECIMAL(15, 2))
    observaciones = Column(Text)
    fecha_registro = Column(DateTime, default=func.now())
    activo = Column(Boolean, default=True)
    
    # Relaciones
    cliente = relationship("Cliente", back_populates="garantes")

class DocumentoInforconf(Base):
    __tablename__ = "documentos_inforconf"
    __table_args__ = {"schema": PLAYA_SCHEMA}
    
    id_documento = Column(Integer, primary_key=True, index=True)
    id_cliente = Column(Integer, ForeignKey(f'{PLAYA_SCHEMA}.clientes.id_cliente'))
    fecha_consulta = Column(Date, nullable=False)
    calificacion = Column(String(50))
    score = Column(Integer)
    archivo_pdf = Column(Text) # Usaremos ruta por ahora
    ruta_archivo = Column(String(500))
    observaciones = Column(Text)
    fecha_registro = Column(DateTime, default=func.now())
    
    # Relaciones
    cliente = relationship("Cliente", back_populates="documentos_inforconf")

class TipoGastoProducto(Base):
    __tablename__ = "tipos_gastos_productos"
    __table_args__ = {"schema": PLAYA_SCHEMA}
    
    id_tipo_gasto = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), unique=True, nullable=False)
    descripcion = Column(Text)
    activo = Column(Boolean, default=True)
    
    # Relaciones
    gastos = relationship("GastoProducto", back_populates="tipo_gasto")

class GastoProducto(Base):
    __tablename__ = "gastos_productos"
    __table_args__ = {"schema": PLAYA_SCHEMA}
    
    id_gasto_producto = Column(Integer, primary_key=True, index=True)
    id_producto = Column(Integer, ForeignKey(f'{PLAYA_SCHEMA}.productos.id_producto'))
    id_tipo_gasto = Column(Integer, ForeignKey(f'{PLAYA_SCHEMA}.tipos_gastos_productos.id_tipo_gasto'))
    descripcion = Column(Text)
    monto = Column(DECIMAL(15, 2), nullable=False)
    fecha_gasto = Column(Date, nullable=False)
    proveedor = Column(String(200))
    numero_factura = Column(String(100))
    observaciones = Column(Text)
    fecha_registro = Column(DateTime, default=func.now())
    
    # Relaciones
    producto = relationship("Producto", back_populates="gastos")
    tipo_gasto = relationship("TipoGastoProducto", back_populates="gastos")

class TipoGastoEmpresa(Base):
    __tablename__ = "tipos_gastos_empresa"
    __table_args__ = {"schema": PLAYA_SCHEMA}
    
    id_tipo_gasto_empresa = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), unique=True, nullable=False)
    descripcion = Column(Text)
    es_fijo = Column(Boolean, default=False)
    activo = Column(Boolean, default=True)
    
    # Relaciones
    gastos = relationship("GastoEmpresa", back_populates="tipo_gasto")

class GastoEmpresa(Base):
    __tablename__ = "gastos_empresa"
    __table_args__ = {"schema": PLAYA_SCHEMA}
    
    id_gasto_empresa = Column(Integer, primary_key=True, index=True)
    id_tipo_gasto_empresa = Column(Integer, ForeignKey(f'{PLAYA_SCHEMA}.tipos_gastos_empresa.id_tipo_gasto_empresa'))
    descripcion = Column(Text)
    monto = Column(DECIMAL(15, 2), nullable=False)
    fecha_gasto = Column(Date, nullable=False)
    periodo = Column(String(50))
    proveedor = Column(String(200))
    numero_factura = Column(String(100))
    observaciones = Column(Text)
    fecha_registro = Column(DateTime, default=func.now())
    
    # Relaciones
    tipo_gasto = relationship("TipoGastoEmpresa", back_populates="gastos")

class Venta(Base):
    __tablename__ = "ventas"
    __table_args__ = {"schema": PLAYA_SCHEMA}
    
    id_venta = Column(Integer, primary_key=True, index=True)
    numero_venta = Column(String(50), unique=True, nullable=False)
    id_cliente = Column(Integer, ForeignKey(f'{PLAYA_SCHEMA}.clientes.id_cliente'))
    id_producto = Column(Integer, ForeignKey(f'{PLAYA_SCHEMA}.productos.id_producto'))
    fecha_venta = Column(Date, nullable=False)
    tipo_venta = Column(String(50), nullable=False)
    precio_venta = Column(DECIMAL(15, 2), nullable=False)
    descuento = Column(DECIMAL(15, 2), default=0)
    precio_final = Column(DECIMAL(15, 2), nullable=False)
    
    entrega_inicial = Column(DECIMAL(15, 2), default=0)
    saldo_financiar = Column(DECIMAL(15, 2))
    cantidad_cuotas = Column(Integer)
    monto_cuota = Column(DECIMAL(15, 2))
    tasa_interes = Column(DECIMAL(5, 2))
    
    tiene_refuerzos = Column(Boolean, default=False)
    periodicidad_refuerzos = Column(String(50))
    monto_refuerzo = Column(DECIMAL(15, 2))
    
    estado_venta = Column(String(50), default='ACTIVA')
    vendedor = Column(String(200))
    observaciones = Column(Text)
    fecha_registro = Column(DateTime, default=func.now())
    
    # Relaciones
    cliente = relationship("Cliente", back_populates="ventas")
    producto = relationship("Producto", back_populates="ventas")
    contratos = relationship("ContratoVenta", back_populates="venta")
    pagares = relationship("Pagare", back_populates="venta")
    pagos = relationship("Pago", back_populates="venta")
    historial_calificaciones = relationship("HistorialCalificacion", back_populates="venta")
    refuerzos = relationship("Refuerzo", back_populates="venta")

class ContratoVenta(Base):
    __tablename__ = "contratos_venta"
    __table_args__ = {"schema": PLAYA_SCHEMA}
    
    id_contrato = Column(Integer, primary_key=True, index=True)
    id_venta = Column(Integer, ForeignKey(f'{PLAYA_SCHEMA}.ventas.id_venta'))
    numero_contrato = Column(String(50), unique=True, nullable=False)
    fecha_contrato = Column(Date, nullable=False)
    contenido_contrato = Column(Text)
    ruta_archivo = Column(String(500))
    firmado = Column(Boolean, default=False)
    fecha_firma = Column(Date)
    observaciones = Column(Text)
    fecha_registro = Column(DateTime, default=func.now())
    
    # Relaciones
    venta = relationship("Venta", back_populates="contratos")

class Pagare(Base):
    __tablename__ = "pagares"
    __table_args__ = {"schema": PLAYA_SCHEMA}
    
    id_pagare = Column(Integer, primary_key=True, index=True)
    id_venta = Column(Integer, ForeignKey(f'{PLAYA_SCHEMA}.ventas.id_venta'))
    numero_pagare = Column(String(50), unique=True, nullable=False)
    numero_cuota = Column(Integer, nullable=False)
    monto_cuota = Column(DECIMAL(15, 2), nullable=False)
    fecha_vencimiento = Column(Date, nullable=False)
    tipo_pagare = Column(String(50), default='CUOTA')
    estado = Column(String(50), default='PENDIENTE')
    saldo_pendiente = Column(DECIMAL(15, 2))
    observaciones = Column(Text)
    fecha_registro = Column(DateTime, default=func.now())
    
    # Relaciones
    venta = relationship("Venta", back_populates="pagares")
    pagos = relationship("Pago", back_populates="pagare")
    refuerzos = relationship("Refuerzo", back_populates="pagare")

class Pago(Base):
    __tablename__ = "pagos"
    __table_args__ = {"schema": PLAYA_SCHEMA}
    
    id_pago = Column(Integer, primary_key=True, index=True)
    id_pagare = Column(Integer, ForeignKey(f'{PLAYA_SCHEMA}.pagares.id_pagare'))
    id_venta = Column(Integer, ForeignKey(f'{PLAYA_SCHEMA}.ventas.id_venta'))
    numero_recibo = Column(String(50), unique=True, nullable=False)
    fecha_pago = Column(Date, nullable=False)
    monto_pagado = Column(DECIMAL(15, 2), nullable=False)
    forma_pago = Column(String(50))
    numero_referencia = Column(String(100))
    dias_atraso = Column(Integer, default=0)
    mora_aplicada = Column(DECIMAL(15, 2), default=0)
    descuento_aplicado = Column(DECIMAL(15, 2), default=0)
    observaciones = Column(Text)
    fecha_registro = Column(DateTime, default=func.now())
    
    # Relaciones
    pagare = relationship("Pagare", back_populates="pagos")
    venta = relationship("Venta", back_populates="pagos")
    historial_calificaciones = relationship("HistorialCalificacion", back_populates="pago")

class HistorialCalificacion(Base):
    __tablename__ = "historial_calificaciones"
    __table_args__ = {"schema": PLAYA_SCHEMA}
    
    id_historial = Column(Integer, primary_key=True, index=True)
    id_cliente = Column(Integer, ForeignKey(f'{PLAYA_SCHEMA}.clientes.id_cliente'))
    id_venta = Column(Integer, ForeignKey(f'{PLAYA_SCHEMA}.ventas.id_venta'))
    id_pago = Column(Integer, ForeignKey(f'{PLAYA_SCHEMA}.pagos.id_pago'))
    calificacion_anterior = Column(String(50))
    calificacion_nueva = Column(String(50), nullable=False)
    motivo = Column(Text)
    fecha_calificacion = Column(DateTime, default=func.now())
    
    # Relaciones
    cliente = relationship("Cliente", back_populates="historial_calificaciones")
    venta = relationship("Venta", back_populates="historial_calificaciones")
    pago = relationship("Pago", back_populates="historial_calificaciones")

class ConfigCalificacion(Base):
    __tablename__ = "config_calificaciones"
    __table_args__ = {"schema": PLAYA_SCHEMA}
    
    id_config = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), unique=True, nullable=False)
    dias_atraso_desde = Column(Integer, nullable=False)
    dias_atraso_hasta = Column(Integer)
    calificacion = Column(String(50), nullable=False)
    descripcion = Column(Text)
    activo = Column(Boolean, default=True)

class Refuerzo(Base):
    __tablename__ = "refuerzos"
    __table_args__ = {"schema": PLAYA_SCHEMA}
    
    id_refuerzo = Column(Integer, primary_key=True, index=True)
    id_venta = Column(Integer, ForeignKey(f'{PLAYA_SCHEMA}.ventas.id_venta'))
    numero_refuerzo = Column(Integer, nullable=False)
    monto_refuerzo = Column(DECIMAL(15, 2), nullable=False)
    fecha_vencimiento = Column(Date, nullable=False)
    estado = Column(String(50), default='PENDIENTE')
    id_pagare = Column(Integer, ForeignKey(f'{PLAYA_SCHEMA}.pagares.id_pagare'))
    observaciones = Column(Text)
    fecha_registro = Column(DateTime, default=func.now())
    
    # Relaciones
    venta = relationship("Venta", back_populates="refuerzos")
    pagare = relationship("Pagare", back_populates="refuerzos")

class ImagenProducto(Base):
    __tablename__ = "imagenes_productos"
    __table_args__ = {"schema": PLAYA_SCHEMA}
    
    id_imagen = Column(Integer, primary_key=True, index=True)
    id_producto = Column(Integer, ForeignKey(f'{PLAYA_SCHEMA}.productos.id_producto'))
    nombre_archivo = Column(String(200))
    ruta_archivo = Column(String(500))
    es_principal = Column(Boolean, default=False)
    orden = Column(Integer, default=0)
    fecha_registro = Column(DateTime, default=func.now())
    
    # Relaciones
    producto = relationship("Producto", back_populates="imagenes")
