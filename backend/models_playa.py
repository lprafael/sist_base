# models_playa.py
# Modelos de base de datos para el sistema de Playa de Vehículos

from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey, Table, JSON, Float, Date, DECIMAL, LargeBinary
from sqlalchemy.orm import relationship, foreign # Added foreign
from sqlalchemy.sql import func
from datetime import datetime
from typing import Optional
from models import Base

# Schema para la playa
PLAYA_SCHEMA = 'playa'

class Vendedor(Base):
    __tablename__ = "vendedores"
    __table_args__ = {"schema": PLAYA_SCHEMA}

    id_vendedor = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    apellido = Column(String(100), nullable=False)
    telefono = Column(String(50))
    email = Column(String(100))
    activo = Column(Boolean, default=True)
    fecha_registro = Column(DateTime, default=func.now())

    # Relaciones
    ventas = relationship("Venta", back_populates="vendedor_rel")

class CategoriaVehiculo(Base):
    __tablename__ = "categorias_vehiculos"
    __table_args__ = {"schema": PLAYA_SCHEMA}
    
    id_categoria = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    descripcion = Column(Text)
    
    # Relaciones
    productos = relationship("Producto", back_populates="categoria")

class DocumentoImportacion(Base):
    """Documento de despacho aduanero y certificados de nacionalización (PDFs). PK = nro_despacho."""
    __tablename__ = "documentos_importacion"
    __table_args__ = {"schema": PLAYA_SCHEMA}

    nro_despacho = Column(String(100), primary_key=True, index=True)
    fecha_despacho = Column(Date)
    cantidad_vehiculos = Column(Integer)
    monto_pagado = Column(DECIMAL(15, 2))
    pdf_despacho = Column(LargeBinary)
    pdf_certificados = Column(LargeBinary)
    observaciones = Column(Text)
    fecha_registro = Column(DateTime, default=func.now())

    # Relación con productos que tienen este nro_despacho
    productos = relationship("Producto", back_populates="documento_importacion", foreign_keys="Producto.nro_despacho")


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
    precio_contado_sugerido = Column(DECIMAL(15, 2))
    precio_financiado_sugerido = Column(DECIMAL(15, 2))
    precio_venta_minimo = Column(DECIMAL(15, 2))
    entrega_inicial_sugerida = Column(DECIMAL(15, 2))
    estado_disponibilidad = Column(String(50), default='DISPONIBLE')
    observaciones = Column(Text)
    fecha_ingreso = Column(Date, default=func.current_date())
    fecha_registro = Column(DateTime, default=func.now())
    activo = Column(Boolean, default=True)
    nro_despacho = Column(String(100), ForeignKey(f'{PLAYA_SCHEMA}.documentos_importacion.nro_despacho'), index=True)
    nro_cert_nac = Column(String(100), index=True)
    
    # Relaciones
    categoria = relationship("CategoriaVehiculo", back_populates="productos")
    gastos = relationship("GastoProducto", back_populates="producto")
    imagenes = relationship("ImagenProducto", back_populates="producto")
    ventas = relationship("Venta", back_populates="producto")
    documento_importacion = relationship("DocumentoImportacion", back_populates="productos", foreign_keys=[nro_despacho])

    @property
    def cliente_nombre(self) -> Optional[str]:
        if self.ventas:
            # Buscar la venta activa más reciente (asumiendo que solo hay una venta 'ACTIVA' a la vez)
            venta_activa = next((v for v in self.ventas if v.estado_venta == 'ACTIVA'), None)
            if venta_activa and venta_activa.cliente:
                return f"{venta_activa.cliente.nombre} {venta_activa.cliente.apellido}"
        return None

    @property
    def cliente_documento(self) -> Optional[str]:
        if self.ventas:
            venta_activa = next((v for v in self.ventas if v.estado_venta == 'ACTIVA'), None)
            if venta_activa and venta_activa.cliente:
                return venta_activa.cliente.numero_documento
        return None

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
    antiguedad_laboral = Column(String(20))
    direccion_laboral = Column(Text)
    ingreso_mensual = Column(DECIMAL(15, 2))
    calificacion_actual = Column(String(20), default='NUEVO')
    fecha_calificacion = Column(Date)
    mora_acumulada = Column(DECIMAL(15, 2), default=0)
    observaciones = Column(Text)
    fecha_registro = Column(DateTime, default=func.now())
    activo = Column(Boolean, default=True)
    
    # Relaciones
    garantes = relationship("Gante", back_populates="cliente")
    documentos_inforconf = relationship("DocumentoInforconf", back_populates="cliente")
    ventas = relationship("Venta", back_populates="cliente")
    historial_calificaciones = relationship("HistorialCalificacion", back_populates="cliente")
    ubicaciones = relationship("UbicacionCliente", back_populates="cliente")
    # Referencias propias del cliente
    referencias = relationship("Referencia", 
        primaryjoin="and_(Cliente.id_cliente==foreign(Referencia.id_cliente), Referencia.tipo_entidad=='CLIENTE')",
        viewonly=True,
        overlaps="cliente")

class UbicacionCliente(Base):
    __tablename__ = "ubicaciones_cliente"
    __table_args__ = {"schema": PLAYA_SCHEMA}
    
    id_ubicacion = Column(Integer, primary_key=True, index=True)
    id_cliente = Column(Integer, ForeignKey(f'{PLAYA_SCHEMA}.clientes.id_cliente'))
    nombre_lugar = Column(String(100), nullable=False) # Casa, Trabajo, Referencia, etc.
    tipo_ubicacion = Column(String(20)) # CASA, TRABAJO, OTRO
    latitud = Column(DECIMAL(10, 8))
    longitud = Column(DECIMAL(11, 8))
    direccion_texto = Column(Text)
    referencia = Column(Text)
    fecha_registro = Column(DateTime, default=func.now())
    
    # Relaciones
    cliente = relationship("Cliente", back_populates="ubicaciones")

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
    estado_civil = Column(String(50))
    relacion_cliente = Column(String(100))
    lugar_trabajo = Column(String(200))
    telefono_trabajo = Column(String(50))
    antiguedad_laboral = Column(String(20))
    direccion_laboral = Column(Text)
    ingreso_mensual = Column(DECIMAL(15, 2))
    observaciones = Column(Text)
    fecha_registro = Column(DateTime, default=func.now())
    activo = Column(Boolean, default=True)
    
    # Relaciones
    cliente = relationship("Cliente", back_populates="garantes")
    # Referencias propias del garante
    referencias = relationship("Referencia", 
        primaryjoin="and_(Gante.id_garante==foreign(Referencia.id_cliente), Referencia.tipo_entidad=='GARANTE')",
        viewonly=True)

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

class Escribania(Base):
    __tablename__ = "escribanias"
    __table_args__ = {"schema": PLAYA_SCHEMA}

    id_escribania = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(200), nullable=False)
    telefono = Column(String(50))
    email = Column(String(100))
    direccion = Column(Text)
    activo = Column(Boolean, default=True)
    fecha_registro = Column(DateTime, default=func.now())

    # Relaciones
    ventas = relationship("Venta", back_populates="escribania_rel")

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
    cantidad_refuerzos = Column(Integer, default=0)
    
    # Configuración de Mora
    periodo_int_mora = Column(String(1)) # D, S, M, A (Diario, Semanal, Mensual, Anual)
    monto_int_mora = Column(DECIMAL(15, 2), default=0)
    dias_gracia = Column(Integer, default=0)
    
    estado_venta = Column(String(50), default='ACTIVA')
    vendedor = Column(String(200)) # Legacy / String representation
    id_vendedor = Column(Integer, ForeignKey(f'{PLAYA_SCHEMA}.vendedores.id_vendedor'), nullable=True) # New Relation
    id_escribania = Column(Integer, ForeignKey(f'{PLAYA_SCHEMA}.escribanias.id_escribania'), nullable=True)
    tipo_documento_propiedad = Column(String(100)) # prendado, transferencia, etc.
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
    detalles = relationship("DetalleVenta", back_populates="venta", cascade="all, delete-orphan")
    vendedor_rel = relationship("Vendedor", back_populates="ventas")
    escribania_rel = relationship("Escribania", back_populates="ventas")

class DetalleVenta(Base):
    __tablename__ = "detalle_venta"
    __table_args__ = {"schema": PLAYA_SCHEMA}
    
    id_detalle_venta = Column(Integer, primary_key=True, index=True)
    id_venta = Column(Integer, ForeignKey(f'{PLAYA_SCHEMA}.ventas.id_venta', ondelete='CASCADE'))
    concepto = Column(String(100), nullable=False) # 'Entrega Inicial', 'Cuotas', 'Refuerzos'
    monto_unitario = Column(DECIMAL(15, 2), nullable=False)
    cantidad = Column(Integer, default=1)
    subtotal = Column(DECIMAL(15, 2), nullable=False)
    observaciones = Column(Text)
    
    # Relaciones
    venta = relationship("Venta", back_populates="detalles")

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
    id_estado = Column(Integer, ForeignKey(f'{PLAYA_SCHEMA}.estados.id_estado'))
    cancelado = Column(Boolean, default=False)
    saldo_pendiente = Column(DECIMAL(15, 2))
    observaciones = Column(Text)
    fecha_registro = Column(DateTime, default=func.now())
    
    # Relaciones
    venta = relationship("Venta", back_populates="pagares")
    pagos = relationship("Pago", back_populates="pagare")
    refuerzos = relationship("Refuerzo", back_populates="pagare")
    estado_rel = relationship("Estado", back_populates="pagares")

class Pago(Base):
    __tablename__ = "pagos"
    __table_args__ = {"schema": PLAYA_SCHEMA}
    
    id_pago = Column(Integer, primary_key=True, index=True)
    id_pagare = Column(Integer, ForeignKey(f'{PLAYA_SCHEMA}.pagares.id_pagare'))
    id_venta = Column(Integer, ForeignKey(f'{PLAYA_SCHEMA}.ventas.id_venta'))
    id_cuenta = Column(Integer, ForeignKey(f'{PLAYA_SCHEMA}.cuentas.id_cuenta'), nullable=True)
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
    cuenta_rel = relationship("Cuenta", back_populates="pagos")
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

class Referencia(Base):
    __tablename__ = "referencias"
    __table_args__ = {"schema": PLAYA_SCHEMA}
    
    id_referencia = Column(Integer, primary_key=True, index=True)
    id_cliente = Column(Integer) # Ya no es un ForeignKey formal a nivel de modelo para permitir polimorfismo
    tipo_entidad = Column(String(20), nullable=False) # CLIENTE, GARANTE
    tipo_referencia = Column(String(20), nullable=False) # PERSONAL, LABORAL
    nombre = Column(String(150), nullable=False)
    telefono = Column(String(100))
    parentesco_cargo = Column(String(150))
    observaciones = Column(Text)
    fecha_registro = Column(DateTime, default=func.now())
    activo = Column(Boolean, default=True)
    
    cliente = relationship("Cliente", 
        primaryjoin="and_(foreign(Referencia.id_cliente)==Cliente.id_cliente, Referencia.tipo_entidad=='CLIENTE')",
        back_populates="referencias")

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

class Estado(Base):
    __tablename__ = "estados"
    __table_args__ = {"schema": PLAYA_SCHEMA}
    
    id_estado = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(50), unique=True, nullable=False)
    descripcion = Column(Text)
    color_hex = Column(String(7))
    activo = Column(Boolean, default=True)
    
    # Relaciones
    pagares = relationship("Pagare", back_populates="estado_rel")

class Cuenta(Base):
    __tablename__ = "cuentas"
    __table_args__ = {"schema": PLAYA_SCHEMA}
    
    id_cuenta = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), unique=True, nullable=False)
    tipo = Column(String(50)) # CAJA, BANCO, etc.
    banco = Column(String(100))
    numero_cuenta = Column(String(100))
    saldo_actual = Column(DECIMAL(15, 2), default=0)
    activo = Column(Boolean, default=True)
    fecha_registro = Column(DateTime, default=func.now())
    
    # Relaciones
    pagos = relationship("Pago", back_populates="cuenta_rel")
    movimientos_origen = relationship("Movimiento", foreign_keys="Movimiento.id_cuenta_origen", back_populates="cuenta_origen")
    movimientos_destino = relationship("Movimiento", foreign_keys="Movimiento.id_cuenta_destino", back_populates="cuenta_destino")

class Movimiento(Base):
    __tablename__ = "movimientos"
    __table_args__ = {"schema": PLAYA_SCHEMA}
    
    id_movimiento = Column(Integer, primary_key=True, index=True)
    id_cuenta_origen = Column(Integer, ForeignKey(f'{PLAYA_SCHEMA}.cuentas.id_cuenta'))
    id_cuenta_destino = Column(Integer, ForeignKey(f'{PLAYA_SCHEMA}.cuentas.id_cuenta'))
    monto = Column(DECIMAL(15, 2), nullable=False)
    fecha = Column(DateTime, default=func.now())
    concepto = Column(Text)
    id_usuario = Column(Integer) # Referencia al usuario que hizo el movimiento
    referencia = Column(String(100))
    
    # Relaciones
    cuenta_origen = relationship("Cuenta", foreign_keys=[id_cuenta_origen], back_populates="movimientos_origen")
    cuenta_destino = relationship("Cuenta", foreign_keys=[id_cuenta_destino], back_populates="movimientos_destino")
