# models.py
# Modelos de base de datos para el sistema

from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey, Table, JSON, Float, Date
from geoalchemy2 import Geometry
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime

Base = declarative_base()

# Tabla de asociación para roles y permisos (many-to-many)
rol_permiso = Table(
    'rol_permiso',
    Base.metadata,
    Column('rol_id', Integer, ForeignKey('roles.id'), primary_key=True),
    Column('permiso_id', Integer, ForeignKey('permisos.id'), primary_key=True)
)

# Tabla de asociación para usuarios y roles (many-to-many)
usuario_rol = Table(
    'usuario_rol',
    Base.metadata,
    Column('usuario_id', Integer, ForeignKey('usuarios.id'), primary_key=True),
    Column('rol_id', Integer, ForeignKey('roles.id'), primary_key=True)
)

# Modelos existentes del sistema
class Gremio(Base):
    __tablename__ = "gremios"
    
    gre_id = Column(Integer, primary_key=True, index=True)
    gre_nombre = Column(String, unique=True, index=True)
    gre_estado = Column(Integer)

class EOT(Base):
    __tablename__ = "eots"

    eot_id = Column(Integer, primary_key=True, autoincrement=True)
    eot_nombre = Column(String)
    eot_linea = Column(String)
    cod_catalogo = Column(Integer)
    cod_planilla = Column(String)
    cod_epas = Column(String)
    cod_tdp = Column(String)
    situacion = Column(Integer, default=0)
    gre_id = Column(Integer, default=0)
    autorizado = Column(Integer, default=0)
    operativo = Column(Integer, default=0)
    reserva = Column(Integer, default=0)
    permisionario = Column(Boolean)
    operativo_declarado = Column(Integer, default=0)
    reserva_declarada = Column(Integer, default=0)
    id_eot_vmt_hex = Column(String)
    e_mail = Column(String)

class Feriado(Base):
    __tablename__ = "feriados"

    fecha = Column(Date, primary_key=True)  # Es común que 'fecha' sea la PK si no hay 'id'
    dia = Column(String)
    nrodiasemana = Column(Integer)
    descripcion = Column(String)
    observacion = Column(String)

# === HISTÓRICO DE ITINERARIOS ===
class HistoricoItinerario(Base):
    __tablename__ = "historico_itinerario"
    __table_args__ = {"schema": "geometria"}
    
    id_itinerario = Column(Integer, primary_key=True, autoincrement=True)
    ruta_hex = Column(String, nullable=False)
    fecha_inicio_vigencia = Column(Date, nullable=False)
    fecha_fin_vigencia = Column(Date, nullable=True)
    geom = Column(Geometry('GEOMETRY', srid=4326), nullable=False)
    vigente = Column(Boolean, default=True)
    observacion = Column(Text, nullable=True)
    fecha_creacion = Column(DateTime, server_default=func.now())
    fecha_actualizacion = Column(DateTime, server_default=func.now(), onupdate=func.now())

class TipoGeocerca(Base):
    __tablename__ = "tipos_geocerca"
    __table_args__ = {"schema": "geometria"}
    
    id_tipo = Column(Integer, primary_key=True)
    nombre = Column(String(50), nullable=False)
    descripcion = Column(Text)

class Geocerca(Base):
    __tablename__ = "geocercas"
    __table_args__ = {"schema": "geometria"}
    
    id_geocerca = Column(Integer, primary_key=True, autoincrement=True)
    id_itinerario = Column(Integer, ForeignKey('geometria.historico_itinerario.id_itinerario'), nullable=False)
    id_tipo = Column(Integer, ForeignKey('geometria.tipos_geocerca.id_tipo'), nullable=False)
    orden = Column(Integer, default=0, nullable=False)
    geom = Column(Geometry('GEOMETRY', srid=4326), nullable=False)
    fecha_creacion = Column(DateTime, server_default=func.now())
    fecha_actualizacion = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relaciones
    itinerario = relationship("HistoricoItinerario", backref="geocercas")
    tipo = relationship("TipoGeocerca")

class PuntoTerminal(Base):
    __tablename__ = "puntos_terminales"
    __table_args__ = {"schema": "geometria"}
    
    id_punto = Column(Integer, primary_key=True, autoincrement=True)
    id_tipo_geocerca = Column(Integer, nullable=False)
    id_eot_vmt_hex = Column(String, nullable=False)
    numero_terminal = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    radio_geocerca_m = Column(Integer, nullable=False)
    geom_punto = Column(Geometry('POINT', srid=4326), nullable=False)
    geom_geocerca = Column(Geometry('POLYGON', srid=4326), nullable=True)
    fecha_creacion = Column(DateTime, server_default=func.now())
    fecha_actualizacion = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
# ===== SISTEMA DE SEGURIDAD Y AUDITORÍA =====

class CatalogoRuta(Base):
    __tablename__ = "catalogo_rutas"

    ruta_hex = Column(String, primary_key=True, index=True)
    id_eot_catalogo = Column(Integer, nullable=True)
    ruta_gtfs = Column(Float, nullable=True)
    ruta_dec = Column(Integer, nullable=True)
    sentido = Column(String, nullable=True)
    linea = Column(String, nullable=True)
    ramal = Column(Integer, nullable=True)
    origen = Column(String, nullable=True)
    destino = Column(String, nullable=True)
    identificacion = Column(String, nullable=True)
    identificador_troncal = Column(String, nullable=True)
    observaciones = Column(String, nullable=True)
    par_id = Column(Integer, nullable=True)
    ingresa = Column(Integer, nullable=True)
    # La columna geom se almacena en la base de datos como tipo geometry (PostGIS).
    # Usamos geoalchemy2.Geometry para reflejar correctamente el tipo.
    geom = Column(Geometry('GEOMETRY', srid=4326), nullable=True)
    latitud_a = Column(Float, nullable=True)
    longitud_a = Column(Float, nullable=True)
    latitud_b = Column(Float, nullable=True)
    longitud_b = Column(Float, nullable=True)
    estado = Column(Boolean, nullable=True)


class HistoricoEotRuta(Base):
    """
    Historial de empresas (EOT) que operaron una ruta.

    Nota: la definición original propuesta usaba una FK a 'catalogo_rutas(id_ruta)'.
    En este código la tabla `catalogo_rutas` usa `ruta_hex` como clave primaria,
    por lo que enlazamos mediante `ruta_hex` (string). Si su esquema tiene
    `id_ruta` como entero, debe sincronizarse aquí.
    """
    __tablename__ = "historico_eot_ruta"

    id_hist_eot = Column(Integer, primary_key=True, autoincrement=True)
    ruta_hex = Column(String, ForeignKey('catalogo_rutas.ruta_hex'), nullable=False)
    id_eot = Column(Integer, ForeignKey('eots.eot_id'), nullable=False)
    fecha_inicio = Column(Date, nullable=False)
    fecha_fin = Column(Date, nullable=True)
    observacion = Column(Text, nullable=True)

    # Relaciones convenientes
    eot = relationship("EOT", backref="historico_rutas")
    ruta = relationship("CatalogoRuta", backref="historico_eots")

class Usuario(Base):
    __tablename__ = "usuarios"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    nombre_completo = Column(String(100), nullable=False)
    rol = Column(String(20), default='user')  # Mantener para compatibilidad
    activo = Column(Boolean, default=True)
    fecha_creacion = Column(DateTime, default=func.now())
    ultimo_acceso = Column(DateTime)
    creado_por = Column(Integer, ForeignKey('usuarios.id'), nullable=True)
    
    # Relaciones
    roles = relationship("Rol", secondary=usuario_rol, back_populates="usuarios")
    sesiones = relationship("SesionUsuario", back_populates="usuario")
    logs_acceso = relationship("LogAcceso", back_populates="usuario")
    logs_auditoria = relationship("LogAuditoria", back_populates="usuario")
    creador = relationship("Usuario", remote_side=[id])

class Rol(Base):
    __tablename__ = "roles"
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(50), unique=True, index=True, nullable=False)
    descripcion = Column(String(200))
    activo = Column(Boolean, default=True)
    fecha_creacion = Column(DateTime, default=func.now())
    creado_por = Column(Integer, ForeignKey('usuarios.id'), nullable=True)
    
    # Relaciones
    usuarios = relationship("Usuario", secondary=usuario_rol, back_populates="roles")
    permisos = relationship("Permiso", secondary=rol_permiso, back_populates="roles")

class Permiso(Base):
    __tablename__ = "permisos"
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(50), unique=True, index=True, nullable=False)
    descripcion = Column(String(200))
    modulo = Column(String(50))  # gremios, eots, feriados, usuarios, etc.
    accion = Column(String(50))   # read, write, delete, manage_users, etc.
    activo = Column(Boolean, default=True)
    fecha_creacion = Column(DateTime, default=func.now())
    
    # Relaciones
    roles = relationship("Rol", secondary=rol_permiso, back_populates="permisos")

class SesionUsuario(Base):
    __tablename__ = "sesiones_usuarios"
    
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey('usuarios.id'), nullable=False)
    token = Column(String(500), unique=True, index=True, nullable=False)
    ip_address = Column(String(45))
    user_agent = Column(Text)
    fecha_inicio = Column(DateTime, default=func.now())
    fecha_expiracion = Column(DateTime, nullable=False)
    activa = Column(Boolean, default=True)
    fecha_cierre = Column(DateTime)
    
    # Relaciones
    usuario = relationship("Usuario", back_populates="sesiones")

class PasswordReset(Base):
    __tablename__ = "password_resets"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(100), nullable=False)
    token = Column(String(255), unique=True, index=True, nullable=False)
    expira_en = Column(DateTime, nullable=False)
    usado = Column(Boolean, default=False)
    fecha_creacion = Column(DateTime, default=func.now())

class LogAcceso(Base):
    __tablename__ = "logs_acceso"
    
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey('usuarios.id'), nullable=True)
    username = Column(String(50), nullable=False)
    accion = Column(String(50), nullable=False)  # login, logout, failed_login
    ip_address = Column(String(45))
    user_agent = Column(Text)
    fecha = Column(DateTime, default=func.now())
    detalles = Column(JSON)
    exitoso = Column(Boolean, default=True)
    
    # Relaciones
    usuario = relationship("Usuario", back_populates="logs_acceso")

class LogAuditoria(Base):
    __tablename__ = "logs_auditoria"
    
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey('usuarios.id'), nullable=True)
    username = Column(String(50), nullable=False)
    accion = Column(String(50), nullable=False)  # create, update, delete, export
    tabla = Column(String(50), nullable=False)   # gremios, eots, feriados, usuarios
    registro_id = Column(Integer, nullable=True)
    datos_anteriores = Column(JSON)
    datos_nuevos = Column(JSON)
    ip_address = Column(String(45))
    user_agent = Column(Text)
    fecha = Column(DateTime, default=func.now())
    detalles = Column(Text)
    
    # Relaciones
    usuario = relationship("Usuario", back_populates="logs_auditoria")

# ===== SISTEMA DE PARÁMETROS =====

class ParametroSistema(Base):
    __tablename__ = "parametros_sistema"
    
    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String(50), unique=True, index=True, nullable=False)
    nombre = Column(String(100), nullable=False)
    valor = Column(Text)
    tipo = Column(String(20), default='string')  # string, integer, float, boolean, json
    descripcion = Column(String(200))
    categoria = Column(String(50))  # seguridad, email, sistema, etc.
    editable = Column(Boolean, default=True)
    activo = Column(Boolean, default=True)
    fecha_creacion = Column(DateTime, default=func.now())
    fecha_modificacion = Column(DateTime, onupdate=func.now())
    modificado_por = Column(Integer, ForeignKey('usuarios.id'), nullable=True)

class ConfiguracionEmail(Base):
    __tablename__ = "configuracion_email"
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    host = Column(String(100), nullable=False)
    puerto = Column(Integer, nullable=False)
    username = Column(String(100), nullable=False)
    password = Column(String(255), nullable=False)
    from_email = Column(String(100), nullable=False)
    use_tls = Column(Boolean, default=True)
    use_ssl = Column(Boolean, default=False)
    activo = Column(Boolean, default=True)
    fecha_creacion = Column(DateTime, default=func.now())
    creado_por = Column(Integer, ForeignKey('usuarios.id'), nullable=True)

# ===== SISTEMA DE NOTIFICACIONES =====

class Notificacion(Base):
    __tablename__ = "notificaciones"
    
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey('usuarios.id'), nullable=False)
    titulo = Column(String(100), nullable=False)
    mensaje = Column(Text, nullable=False)
    tipo = Column(String(20), default='info')  # info, warning, error, success
    leida = Column(Boolean, default=False)
    fecha_creacion = Column(DateTime, default=func.now())
    fecha_lectura = Column(DateTime)
    datos_adicionales = Column(JSON)

# ===== SISTEMA DE BACKUP Y VERSIONADO =====

class BackupSistema(Base):
    __tablename__ = "backups_sistema"
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    descripcion = Column(Text)
    ruta_archivo = Column(String(500), nullable=False)
    tamano_bytes = Column(Integer)
    tipo = Column(String(20), default='completo')  # completo, incremental, diferencial
    estado = Column(String(20), default='en_proceso')  # en_proceso, completado, fallido
    fecha_inicio = Column(DateTime, default=func.now())
    fecha_fin = Column(DateTime)
    creado_por = Column(Integer, ForeignKey('usuarios.id'), nullable=True)
    detalles = Column(JSON)

# ===== SISTEMA DE REPORTES =====

class Reporte(Base):
    __tablename__ = "reportes"
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    descripcion = Column(Text)
    tipo = Column(String(20), nullable=False)  # pdf, excel, csv, html
    parametros = Column(JSON)
    fecha_creacion = Column(DateTime, default=func.now())
    fecha_ejecucion = Column(DateTime)
    estado = Column(String(20), default='pendiente')  # pendiente, ejecutando, completado, fallido
    ruta_archivo = Column(String(500))
    creado_por = Column(Integer, ForeignKey('usuarios.id'), nullable=False)
    detalles = Column(JSON) 