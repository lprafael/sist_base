# models_surtidor.py
# Modelos de base de datos para el Sistema de Gestión de Surtidor
# Schema: surtidor

from sqlalchemy import (
    Column, Integer, String, DateTime, Boolean, Text,
    ForeignKey, Numeric, Date, Time, JSON
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

# Importar la Base compartida del sistema para que SQLAlchemy gestione
# un único metadata con todos los modelos (sistema + surtidor)
from models import Base


# ===== CONFIGURACIÓN BASE =====

class TipoCombustible(Base):
    """Catálogo de tipos de combustible (dinámico: alta/baja/modificación)"""
    __tablename__ = "tipos_combustible"
    __table_args__ = {"schema": "surtidor"}

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(50), unique=True, nullable=False)
    descripcion = Column(String(200))
    color_hex = Column(String(7), default="#4CAF50")    # color para UI
    unidad = Column(String(20), default="litros")        # litros, m3
    activo = Column(Boolean, default=True)
    fecha_creacion = Column(DateTime, default=func.now())
    creado_por = Column(Integer, ForeignKey("sistema.usuarios.id"), nullable=True)

    # Relaciones
    tanques = relationship("Tanque", back_populates="tipo_combustible")
    picos = relationship("Pico", back_populates="tipo_combustible")


class Tanque(Base):
    """Tanques de almacenamiento de combustible (dinámico)"""
    __tablename__ = "tanques"
    __table_args__ = {"schema": "surtidor"}

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    numero = Column(Integer, unique=True, nullable=False)   # Número identificador
    tipo_combustible_id = Column(Integer, ForeignKey("surtidor.tipos_combustible.id"), nullable=False)
    capacidad_litros = Column(Numeric(12, 2), nullable=False)
    stock_minimo_litros = Column(Numeric(12, 2), default=5000)
    stock_actual_litros = Column(Numeric(12, 2), default=0)
    ubicacion = Column(String(200))
    activo = Column(Boolean, default=True)
    fecha_creacion = Column(DateTime, default=func.now())
    creado_por = Column(Integer, ForeignKey("sistema.usuarios.id"), nullable=True)

    # Relaciones
    tipo_combustible = relationship("TipoCombustible", back_populates="tanques")
    movimientos = relationship("MovimientoStock", back_populates="tanque")
    mediciones = relationship("MedicionManual", back_populates="tanque")
    ventas = relationship("Venta", back_populates="tanque")
    recepciones = relationship("RecepcionCombustible", back_populates="tanque")


class Isla(Base):
    """Islas del surtidor"""
    __tablename__ = "islas"
    __table_args__ = {"schema": "surtidor"}

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(50), nullable=False)
    numero = Column(Integer, unique=True, nullable=False)
    descripcion = Column(String(200))
    activo = Column(Boolean, default=True)
    fecha_creacion = Column(DateTime, default=func.now())

    # Relaciones
    picos = relationship("Pico", back_populates="isla")


class Pico(Base):
    """Picos expendedores de combustible (cada pico expende un solo tipo)"""
    __tablename__ = "picos"
    __table_args__ = {"schema": "surtidor"}

    id = Column(Integer, primary_key=True, index=True)
    numero = Column(Integer, nullable=False)
    isla_id = Column(Integer, ForeignKey("surtidor.islas.id"), nullable=False)
    tipo_combustible_id = Column(Integer, ForeignKey("surtidor.tipos_combustible.id"), nullable=False)
    activo = Column(Boolean, default=True)
    fecha_creacion = Column(DateTime, default=func.now())

    # Relaciones
    isla = relationship("Isla", back_populates="picos")
    tipo_combustible = relationship("TipoCombustible", back_populates="picos")
    ventas = relationship("Venta", back_populates="pico")


# ===== TURNOS Y PERSONAL =====

class TurnoConfig(Base):
    """Configuración de tipos de turno (dinámico: nombre, hora inicio, duración)"""
    __tablename__ = "turnos_config"
    __table_args__ = {"schema": "surtidor"}

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(50), nullable=False)          # "Mañana", "Tarde", "Noche"
    hora_inicio = Column(Time, nullable=False)            # 06:00
    duracion_horas = Column(Integer, default=8)
    activo = Column(Boolean, default=True)
    orden = Column(Integer, default=1)                   # Para ordenar en UI
    color_hex = Column(String(7), default="#2196F3")
    fecha_creacion = Column(DateTime, default=func.now())

    # Relaciones
    turnos = relationship("Turno", back_populates="config_turno")


class Personal(Base):
    """Personal / Playeros del surtidor"""
    __tablename__ = "personal"
    __table_args__ = {"schema": "surtidor"}

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("sistema.usuarios.id"), nullable=True)  # Opcional
    nombre = Column(String(100), nullable=False)
    apellido = Column(String(100), nullable=False)
    ci = Column(String(20), unique=True, nullable=False)   # Cédula de identidad
    telefono = Column(String(30))
    email = Column(String(100))
    cargo = Column(String(50), default="playero")           # playero, supervisor, etc.
    activo = Column(Boolean, default=True)
    fecha_ingreso = Column(Date)
    fecha_creacion = Column(DateTime, default=func.now())
    creado_por = Column(Integer, ForeignKey("sistema.usuarios.id"), nullable=True)

    # Relaciones
    asignaciones = relationship("AsignacionTurno", back_populates="personal")


class Turno(Base):
    """Turno de trabajo realizado (instancia de TurnoConfig para una fecha)"""
    __tablename__ = "turnos"
    __table_args__ = {"schema": "surtidor"}

    id = Column(Integer, primary_key=True, index=True)
    config_turno_id = Column(Integer, ForeignKey("surtidor.turnos_config.id"), nullable=False)
    fecha = Column(Date, nullable=False)
    fecha_hora_apertura = Column(DateTime)
    fecha_hora_cierre = Column(DateTime)
    estado = Column(String(20), default="abierto")          # abierto, cerrado, anulado
    observaciones = Column(Text)
    abierto_por = Column(Integer, ForeignKey("sistema.usuarios.id"), nullable=True)
    cerrado_por = Column(Integer, ForeignKey("sistema.usuarios.id"), nullable=True)
    fecha_creacion = Column(DateTime, default=func.now())

    # Relaciones
    config_turno = relationship("TurnoConfig", back_populates="turnos")
    asignaciones = relationship("AsignacionTurno", back_populates="turno")
    ventas = relationship("Venta", back_populates="turno")


class AsignacionTurno(Base):
    """Asignación de personal a un turno específico"""
    __tablename__ = "asignaciones_turno"
    __table_args__ = {"schema": "surtidor"}

    id = Column(Integer, primary_key=True, index=True)
    turno_id = Column(Integer, ForeignKey("surtidor.turnos.id"), nullable=False)
    personal_id = Column(Integer, ForeignKey("surtidor.personal.id"), nullable=False)
    rol_turno = Column(String(50), default="playero")       # playero, supervisor
    fecha_creacion = Column(DateTime, default=func.now())

    # Relaciones
    turno = relationship("Turno", back_populates="asignaciones")
    personal = relationship("Personal", back_populates="asignaciones")


# ===== STOCK =====

class MovimientoStock(Base):
    """Entradas y salidas de combustible por tanque"""
    __tablename__ = "movimientos_stock"
    __table_args__ = {"schema": "surtidor"}

    id = Column(Integer, primary_key=True, index=True)
    tanque_id = Column(Integer, ForeignKey("surtidor.tanques.id"), nullable=False)
    tipo = Column(String(20), nullable=False)   # entrada, salida, ajuste
    litros = Column(Numeric(12, 3), nullable=False)
    stock_anterior = Column(Numeric(12, 3))
    stock_posterior = Column(Numeric(12, 3))
    referencia = Column(String(100))            # Nro. remito, venta_id, etc.
    motivo = Column(String(200))
    turno_id = Column(Integer, ForeignKey("surtidor.turnos.id"), nullable=True)
    fecha_hora = Column(DateTime, default=func.now())
    registrado_por = Column(Integer, ForeignKey("sistema.usuarios.id"), nullable=True)

    # Relaciones
    tanque = relationship("Tanque", back_populates="movimientos")


class MedicionManual(Base):
    """Medición física del nivel del tanque (cotejo con stock calculado)"""
    __tablename__ = "mediciones_manuales"
    __table_args__ = {"schema": "surtidor"}

    id = Column(Integer, primary_key=True, index=True)
    tanque_id = Column(Integer, ForeignKey("surtidor.tanques.id"), nullable=False)
    turno_id = Column(Integer, ForeignKey("surtidor.turnos.id"), nullable=True)
    litros_medidos = Column(Numeric(12, 3), nullable=False)    # Medición real
    litros_sistema = Column(Numeric(12, 3), nullable=False)    # Stock según sistema
    diferencia_litros = Column(Numeric(12, 3))                 # medido - sistema
    metodo_medicion = Column(String(50), default="varilla")    # varilla, sensor, etc.
    observaciones = Column(Text)
    fecha_hora = Column(DateTime, default=func.now())
    medido_por = Column(Integer, ForeignKey("sistema.usuarios.id"), nullable=True)

    # Relaciones
    tanque = relationship("Tanque", back_populates="mediciones")


# ===== VENTAS =====

class MetodoPago(Base):
    """Catálogo de métodos de pago"""
    __tablename__ = "metodos_pago"
    __table_args__ = {"schema": "surtidor"}

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(50), unique=True, nullable=False)   # Efectivo, Visa, Mastercard, Bancard
    tipo = Column(String(20), nullable=False)                   # efectivo, tarjeta
    activo = Column(Boolean, default=True)
    dias_reembolso = Column(Integer, default=0)                 # Días que tarda el banco en reembolsar
    fecha_creacion = Column(DateTime, default=func.now())

    # Relaciones
    ventas = relationship("Venta", back_populates="metodo_pago")
    reembolsos = relationship("ReembolsoTarjeta", back_populates="metodo_pago")


class Venta(Base):
    """Registro de cada venta de combustible"""
    __tablename__ = "ventas"
    __table_args__ = {"schema": "surtidor"}

    id = Column(Integer, primary_key=True, index=True)
    turno_id = Column(Integer, ForeignKey("surtidor.turnos.id"), nullable=False)
    pico_id = Column(Integer, ForeignKey("surtidor.picos.id"), nullable=False)
    tanque_id = Column(Integer, ForeignKey("surtidor.tanques.id"), nullable=False)
    metodo_pago_id = Column(Integer, ForeignKey("surtidor.metodos_pago.id"), nullable=False)
    nro_comprobante = Column(String(50))                        # Comprobante de venta
    litros = Column(Numeric(10, 3), nullable=False)
    precio_litro = Column(Numeric(12, 2), nullable=False)
    monto_total = Column(Numeric(14, 2), nullable=False)
    estado_reembolso = Column(String(20), default="na")         # na (no aplica), pendiente, reembolsado
    reembolso_id = Column(Integer, ForeignKey("surtidor.reembolsos_tarjeta.id"), nullable=True)
    nro_comprobante_banco = Column(String(100))                 # Comprobante del banco al reembolsar
    observaciones = Column(Text)
    anulada = Column(Boolean, default=False)
    fecha_hora = Column(DateTime, default=func.now())
    registrado_por = Column(Integer, ForeignKey("sistema.usuarios.id"), nullable=True)

    # Relaciones
    turno = relationship("Turno", back_populates="ventas")
    pico = relationship("Pico", back_populates="ventas")
    tanque = relationship("Tanque", back_populates="ventas")
    metodo_pago = relationship("MetodoPago", back_populates="ventas")
    reembolso = relationship("ReembolsoTarjeta", back_populates="ventas")


# ===== FINANZAS =====

class CuentaBancaria(Base):
    """Cuentas bancarias registradas"""
    __tablename__ = "cuentas_bancarias"
    __table_args__ = {"schema": "surtidor"}

    id = Column(Integer, primary_key=True, index=True)
    banco = Column(String(100), nullable=False)
    nro_cuenta = Column(String(50), nullable=False)
    titular = Column(String(100))
    tipo = Column(String(30), default="corriente")             # corriente, ahorro
    moneda = Column(String(10), default="PYG")
    activo = Column(Boolean, default=True)
    fecha_creacion = Column(DateTime, default=func.now())

    # Relaciones
    depositos = relationship("DepositoBancario", back_populates="cuenta_bancaria")
    reembolsos = relationship("ReembolsoTarjeta", back_populates="cuenta_bancaria")


class CajaMovimiento(Base):
    """Movimientos de caja (efectivo)"""
    __tablename__ = "caja_movimientos"
    __table_args__ = {"schema": "surtidor"}

    id = Column(Integer, primary_key=True, index=True)
    turno_id = Column(Integer, ForeignKey("surtidor.turnos.id"), nullable=True)
    tipo = Column(String(20), nullable=False)                   # ingreso, egreso
    concepto = Column(String(200), nullable=False)
    monto = Column(Numeric(14, 2), nullable=False)
    saldo_anterior = Column(Numeric(14, 2))
    saldo_posterior = Column(Numeric(14, 2))
    referencia = Column(String(100))
    observaciones = Column(Text)
    fecha_hora = Column(DateTime, default=func.now())
    registrado_por = Column(Integer, ForeignKey("sistema.usuarios.id"), nullable=True)


class DepositoBancario(Base):
    """Depósitos de efectivo en cuenta bancaria"""
    __tablename__ = "depositos_bancarios"
    __table_args__ = {"schema": "surtidor"}

    id = Column(Integer, primary_key=True, index=True)
    cuenta_bancaria_id = Column(Integer, ForeignKey("surtidor.cuentas_bancarias.id"), nullable=False)
    monto = Column(Numeric(14, 2), nullable=False)
    fecha_deposito = Column(Date, nullable=False)
    nro_boleta = Column(String(100))
    observaciones = Column(Text)
    fecha_registro = Column(DateTime, default=func.now())
    registrado_por = Column(Integer, ForeignKey("sistema.usuarios.id"), nullable=True)

    # Relaciones
    cuenta_bancaria = relationship("CuentaBancaria", back_populates="depositos")


class ReembolsoTarjeta(Base):
    """Comprobante bancario de reembolso por ventas con tarjeta"""
    __tablename__ = "reembolsos_tarjeta"
    __table_args__ = {"schema": "surtidor"}

    id = Column(Integer, primary_key=True, index=True)
    cuenta_bancaria_id = Column(Integer, ForeignKey("surtidor.cuentas_bancarias.id"), nullable=False)
    metodo_pago_id = Column(Integer, ForeignKey("surtidor.metodos_pago.id"), nullable=True)
    nro_comprobante = Column(String(100), unique=True, nullable=False)  # Nro. del banco
    fecha_deposito = Column(Date, nullable=False)
    monto_bruto = Column(Numeric(14, 2), nullable=False)
    comision = Column(Numeric(14, 2), default=0)
    monto_neto = Column(Numeric(14, 2), nullable=False)
    observacion = Column(Text)
    conciliado = Column(Boolean, default=False)
    fecha_registro = Column(DateTime, default=func.now())
    registrado_por = Column(Integer, ForeignKey("sistema.usuarios.id"), nullable=True)

    # Relaciones
    cuenta_bancaria = relationship("CuentaBancaria", back_populates="reembolsos")
    metodo_pago = relationship("MetodoPago", back_populates="reembolsos")
    ventas = relationship("Venta", back_populates="reembolso")


# ===== ADQUISICIONES =====

class Proveedor(Base):
    """Proveedores de combustible"""
    __tablename__ = "proveedores"
    __table_args__ = {"schema": "surtidor"}

    id = Column(Integer, primary_key=True, index=True)
    razon_social = Column(String(200), nullable=False)
    ruc = Column(String(30))
    contacto = Column(String(100))
    telefono = Column(String(50))
    email = Column(String(100))
    activo = Column(Boolean, default=True)
    fecha_creacion = Column(DateTime, default=func.now())

    # Relaciones
    pedidos = relationship("PedidoCombustible", back_populates="proveedor")


class PedidoCombustible(Base):
    """Pedidos de reposición de combustible"""
    __tablename__ = "pedidos_combustible"
    __table_args__ = {"schema": "surtidor"}

    id = Column(Integer, primary_key=True, index=True)
    proveedor_id = Column(Integer, ForeignKey("surtidor.proveedores.id"), nullable=True)
    tipo_combustible_id = Column(Integer, ForeignKey("surtidor.tipos_combustible.id"), nullable=False)
    tanque_id = Column(Integer, ForeignKey("surtidor.tanques.id"), nullable=True)
    litros_solicitados = Column(Numeric(12, 3), nullable=False)
    precio_litro_estimado = Column(Numeric(12, 2))
    estado = Column(String(20), default="pendiente")           # pendiente, aprobado, entregado, cancelado
    es_estimacion = Column(Boolean, default=False)             # Generado automáticamente por el sistema
    fecha_pedido = Column(Date, nullable=False)
    fecha_entrega_estimada = Column(Date)
    observaciones = Column(Text)
    fecha_creacion = Column(DateTime, default=func.now())
    creado_por = Column(Integer, ForeignKey("sistema.usuarios.id"), nullable=True)

    # Relaciones
    proveedor = relationship("Proveedor", back_populates="pedidos")
    recepciones = relationship("RecepcionCombustible", back_populates="pedido")


class RecepcionCombustible(Base):
    """Registro de recepción efectiva de combustible en tanque/s"""
    __tablename__ = "recepciones_combustible"
    __table_args__ = {"schema": "surtidor"}

    id = Column(Integer, primary_key=True, index=True)
    pedido_id = Column(Integer, ForeignKey("surtidor.pedidos_combustible.id"), nullable=True)
    tanque_id = Column(Integer, ForeignKey("surtidor.tanques.id"), nullable=False)
    litros_recibidos = Column(Numeric(12, 3), nullable=False)
    precio_litro = Column(Numeric(12, 2))
    nro_remito = Column(String(100))
    nro_factura = Column(String(100))
    proveedor_id = Column(Integer, ForeignKey("surtidor.proveedores.id"), nullable=True)
    observaciones = Column(Text)
    fecha_recepcion = Column(DateTime, default=func.now())
    recibido_por = Column(Integer, ForeignKey("sistema.usuarios.id"), nullable=True)

    # Relaciones
    tanque = relationship("Tanque", back_populates="recepciones")
    pedido = relationship("PedidoCombustible", back_populates="recepciones")
