# models.py
# Modelos de base de datos para el sistema

from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey, Table, JSON, Float, Date
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime

Base = declarative_base()

# Tabla de asociación para roles y permisos (many-to-many)
rol_permiso = Table(
    'rol_permiso',
    Base.metadata,
    Column('rol_id', Integer, ForeignKey('sistema.roles.id'), primary_key=True),
    Column('permiso_id', Integer, ForeignKey('sistema.permisos.id'), primary_key=True),
    schema='sistema'
)

# Tabla de asociación para usuarios y roles (many-to-many)
usuario_rol = Table(
    'usuario_rol',
    Base.metadata,
    Column('usuario_id', Integer, ForeignKey('sistema.usuarios.id'), primary_key=True),
    Column('rol_id', Integer, ForeignKey('sistema.roles.id'), primary_key=True),
    schema='sistema'
)

# ===== SISTEMA DE SEGURIDAD Y AUDITORÍA =====

class Usuario(Base):
    __tablename__ = "usuarios"
    __table_args__ = {"schema": "sistema"}
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    nombre_completo = Column(String(100), nullable=False)
    rol = Column(String(20), default='user')  # admin, intendente, concejal, referente
    activo = Column(Boolean, default=True)
    fecha_creacion = Column(DateTime, default=func.now())
    ultimo_acceso = Column(DateTime)
    creado_por = Column(Integer, ForeignKey('sistema.usuarios.id'), nullable=True)
    # Localización para filtrar datos por territorio
    departamento_id = Column(Integer, nullable=True)  # Departamento asignado (intendente/concejal)
    distrito_id = Column(Integer, nullable=True)       # Distrito asignado (intendente/concejal)
    restriccion_equipo = Column(Boolean, default=False) # Si TRUE, solo puede entrar de equipos autorizados
    
    # Relaciones
    roles = relationship("Rol", secondary=usuario_rol, back_populates="usuarios")
    sesiones = relationship("SesionUsuario", back_populates="usuario")
    logs_acceso = relationship("LogAcceso", back_populates="usuario")
    logs_auditoria = relationship("LogAuditoria", back_populates="usuario")
    creador = relationship("Usuario", remote_side=[id])
    equipos_autorizados = relationship("EquiposAutorizados", back_populates="usuario")

class EquiposAutorizados(Base):
    __tablename__ = "equipos_autorizados"
    __table_args__ = {"schema": "sistema"}
    
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey('sistema.usuarios.id'), nullable=False)
    device_id = Column(String(255), nullable=False) # ID único generado por el navegador
    descripcion = Column(String(100)) # "PC Oficina", "Celular Juan", etc.
    user_agent = Column(String(255)) # Info del navegador
    ip_solicitud = Column(String(50)) # IP desde donde intentó entrar
    fecha_autorizacion = Column(DateTime, default=func.now())
    activo = Column(Boolean, default=False) # Por defecto pendiente hasta que admin habilite
    
    # Relaciones
    usuario = relationship("Usuario", back_populates="equipos_autorizados")

class Rol(Base):
    __tablename__ = "roles"
    __table_args__ = {"schema": "sistema"}
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(50), unique=True, index=True, nullable=False)
    descripcion = Column(String(200))
    activo = Column(Boolean, default=True)
    fecha_creacion = Column(DateTime, default=func.now())
    creado_por = Column(Integer, ForeignKey('sistema.usuarios.id'), nullable=True)
    
    # Relaciones
    usuarios = relationship("Usuario", secondary=usuario_rol, back_populates="roles")
    permisos = relationship("Permiso", secondary=rol_permiso, back_populates="roles")

class Permiso(Base):
    __tablename__ = "permisos"
    __table_args__ = {"schema": "sistema"}
    
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
    __table_args__ = {"schema": "sistema"}
    
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey('sistema.usuarios.id'), nullable=False)
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
    __table_args__ = {"schema": "sistema"}
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(100), nullable=False)
    token = Column(String(255), unique=True, index=True, nullable=False)
    expira_en = Column(DateTime, nullable=False)
    usado = Column(Boolean, default=False)
    fecha_creacion = Column(DateTime, default=func.now())

class LogAcceso(Base):
    __tablename__ = "logs_acceso"
    __table_args__ = {"schema": "sistema"}
    
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey('sistema.usuarios.id'), nullable=True)
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
    __table_args__ = {"schema": "sistema"}
    
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey('sistema.usuarios.id'), nullable=True)
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
    __table_args__ = {"schema": "sistema"}
    
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
    modificado_por = Column(Integer, ForeignKey('sistema.usuarios.id'), nullable=True)

class ConfiguracionEmail(Base):
    __tablename__ = "configuracion_email"
    __table_args__ = {"schema": "sistema"}
    
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
    creado_por = Column(Integer, ForeignKey('sistema.usuarios.id'), nullable=True)

# ===== SISTEMA DE NOTIFICACIONES =====

class Notificacion(Base):
    __tablename__ = "notificaciones"
    __table_args__ = {"schema": "sistema"}
    
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey('sistema.usuarios.id'), nullable=False)
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
    __table_args__ = {"schema": "sistema"}
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    descripcion = Column(Text)
    ruta_archivo = Column(String(500), nullable=False)
    tamano_bytes = Column(Integer)
    tipo = Column(String(20), default='completo')  # completo, incremental, diferencial
    estado = Column(String(20), default='en_proceso')  # en_proceso, completado, fallido
    fecha_inicio = Column(DateTime, default=func.now())
    fecha_fin = Column(DateTime)
    creado_por = Column(Integer, ForeignKey('sistema.usuarios.id'), nullable=True)
    detalles = Column(JSON)

# ===== SISTEMA DE REPORTES =====

class Reporte(Base):
    __tablename__ = "reportes"
    __table_args__ = {"schema": "sistema"}
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    descripcion = Column(Text)
    tipo = Column(String(20), nullable=False)  # pdf, excel, csv, html
    parametros = Column(JSON)
    fecha_creacion = Column(DateTime, default=func.now())
    fecha_ejecucion = Column(DateTime)
    estado = Column(String(20), default='pendiente')  # pendiente, ejecutando, completado, fallido
    ruta_archivo = Column(String(500))
    creado_por = Column(Integer, ForeignKey('sistema.usuarios.id'), nullable=False)
    detalles = Column(JSON)
    
# ===== SISTEMA ELECTORAL =====

class LocalVotacion(Base):
    __tablename__ = "locales_votacion"
    __table_args__ = {"schema": "electoral"}
    
    id = Column(Integer, primary_key=True, index=True)
    nombre_local = Column(String(255), nullable=False)
    direccion = Column(Text)
    distrito = Column(String(100))
    departamento = Column(String(100))
    ubicacion_gps = Column(String) # For now, simple string representation
    activo = Column(Boolean, default=True)
    fecha_creacion = Column(DateTime, default=func.now())

class Padron(Base):
    __tablename__ = "padron"
    __table_args__ = {"schema": "electoral"}
    
    cedula = Column(String(20), primary_key=True)
    nombre = Column(String(100), nullable=False)
    apellido_paterno = Column(String(100), nullable=False)
    apellido_materno = Column(String(100), nullable=False)
    fecha_nacimiento = Column(Date)
    genero = Column(String(1))
    id_local_votacion = Column(Integer, ForeignKey('electoral.locales_votacion.id'))
    mesa_nro = Column(Integer)
    orden_nro = Column(Integer)
    direccion_padron = Column(Text)
    distrito = Column(String(100))
    departamento = Column(String(100))

class Candidato(Base):
    __tablename__ = "candidatos"
    __table_args__ = {"schema": "electoral"}
    
    id = Column(Integer, primary_key=True, index=True)
    nombre_candidato = Column(String(155), nullable=False)
    partido_movimiento = Column(String(100))
    municipio = Column(String(100))
    logo_url = Column(Text)
    activo = Column(Boolean, default=True)
    fecha_registro = Column(DateTime, default=func.now())

class Referente(Base):
    __tablename__ = "referentes"
    __table_args__ = {"schema": "electoral"}
    
    id = Column(Integer, primary_key=True, index=True)
    id_usuario_sistema = Column(Integer, ForeignKey('sistema.usuarios.id'))
    id_candidato = Column(Integer, ForeignKey('electoral.candidatos.id'), nullable=True)
    id_superior = Column(Integer, ForeignKey('electoral.referentes.id'), nullable=True)  # Superior jerárquico
    rol_electoral = Column(String(20), default='referente')  # intendente, concejal, referente
    nombre_referente = Column(String(155), nullable=False)
    telefono = Column(String(20))
    zona_influencia = Column(Text)
    activo = Column(Boolean, default=True)

class PosibleVotante(Base):
    __tablename__ = "posibles_votantes"
    __table_args__ = {"schema": "electoral"}
    
    id = Column(Integer, primary_key=True, index=True)
    id_referente = Column(Integer, ForeignKey('electoral.referentes.id'))
    cedula_votante = Column(String(20), ForeignKey('electoral.anr_padron_2026.cedula'))

    parentesco = Column(String(50))
    grado_seguridad = Column(Integer)
    observaciones = Column(Text)
    domicilio = Column(String(255))
    latitud = Column(Float)
    longitud = Column(Float)
    ubicacion_captacion = Column(String) 
    fecha_captacion = Column(DateTime, default=func.now())

    validacion_candidato = Column(Boolean, default=False)
    movilidad_propia = Column(Boolean, default=False)

    # --- Campos para Logística Día D ---
    logistica_estado = Column(String(20), default='pendiente') # pendiente, en_camino, en_local, voto
    chofer_id = Column(Integer, ForeignKey('electoral.choferes.id'), nullable=True)
    veedor_id = Column(Integer, ForeignKey('sistema.usuarios.id'), nullable=True) # El usuario que marca el voto
    fecha_traslado = Column(DateTime)
    fecha_voto = Column(DateTime)
    
    # Relaciones
    chofer = relationship("Chofer", back_populates="traslados")

from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey, Table, JSON, Float, Date, Index

class AnrPadron(Base):
    __tablename__ = "anr_padron_2026"
    __table_args__ = (
        Index("idx_anr_geografia", "departamento", "distrito", "seccional", "local"),
        {"schema": "electoral"}
    )
    
    cedula = Column(String(20), primary_key=True)
    nombres = Column(String(255))
    apellidos = Column(String(255))
    nacimiento = Column(Date)
    departamento = Column(Integer)
    distrito = Column(Integer)
    seccional = Column(Integer)
    local = Column(Integer)
    mesa = Column(Integer)
    orden = Column(Integer)
    fecha_descarga = Column(DateTime, default=func.now())

class PlraPadron(Base):
    __tablename__ = "plra_padron"
    __table_args__ = {"schema": "electoral"}
    
    cedula = Column(String(20), primary_key=True)
    nombre = Column(String(255))
    apellido = Column(String(255))
    sexo = Column(String(5))
    fec_nac = Column(Date)
    fec_inscri = Column(Date)
    direcc = Column(Text)
    departamento_nombre = Column(String(255))
    distrito_nombre = Column(String(255))
    zona_nombre = Column(String(255))
    comite_nombre = Column(String(255))
    local_generales = Column(String(255))
    local_interna = Column(String(255))
    afiliaciones = Column(Text)
    afiliacion_plra_2025 = Column(String(10))
    voto_anr = Column(String(10))
    fecha_descarga = Column(DateTime, default=func.now())

class Chofer(Base):
    __tablename__ = "choferes"
    __table_args__ = {"schema": "electoral"}
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    telefono = Column(String(20))
    vehiculo_info = Column(String(255))
    
    token_seguimiento = Column(String(100), unique=True, index=True)
    latitud = Column(Float)
    longitud = Column(Float)
    ultima_conexion = Column(DateTime)
    
    activo = Column(Boolean, default=True)
    departamento_id = Column(Integer)
    distrito_id = Column(Integer)
    fecha_registro = Column(DateTime, default=func.now())
    
    # Relaciones
    traslados = relationship("PosibleVotante", back_populates="chofer")

class Actividad(Base):
    __tablename__ = "actividades"
    __table_args__ = {"schema": "electoral"}
    
    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String(255), nullable=False)
    tipo = Column(String(100)) # "Presentación", "Lanzamiento", "Caminata", etc.
    fecha_programada = Column(DateTime)
    fecha_prevista = Column(DateTime)
    observaciones = Column(Text)
    latitud = Column(Float)
    longitud = Column(Float)
    radio_influencia = Column(Float, default=100.0) # en metros
    estado = Column(String(20), default='pendiente') # pendiente, en_curso, finalizada, cancelada
    
    creado_por = Column(Integer, ForeignKey('sistema.usuarios.id'))
    fecha_registro = Column(DateTime, default=func.now())
    
    # Relaciones
    participantes = relationship("ActividadParticipante", back_populates="actividad")
    fotos = relationship("ActividadFoto", back_populates="actividad")

class ActividadParticipante(Base):
    __tablename__ = "actividad_participantes"
    __table_args__ = {"schema": "electoral"}
    
    id = Column(Integer, primary_key=True, index=True)
    actividad_id = Column(Integer, ForeignKey('electoral.actividades.id'))
    cedula = Column(String(20), nullable=False)
    nombre = Column(String(255))
    apellido = Column(String(255))
    telefono = Column(String(20))
    observaciones = Column(Text)
    es_simpatizante = Column(Boolean, default=False)
    en_padron_anr = Column(Boolean, default=False)
    en_padron_plra = Column(Boolean, default=False)
    fecha_registro = Column(DateTime, default=func.now())
    
    # Relaciones
    actividad = relationship("Actividad", back_populates="participantes")

class ActividadFoto(Base):
    __tablename__ = "actividad_fotos"
    __table_args__ = {"schema": "electoral"}
    
    id = Column(Integer, primary_key=True, index=True)
    actividad_id = Column(Integer, ForeignKey('electoral.actividades.id'))
    ruta_archivo = Column(String(500), nullable=False)
    descripcion = Column(String(255))
    fecha_registro = Column(DateTime, default=func.now())
    
    # Relaciones
    actividad = relationship("Actividad", back_populates="fotos")

# ===== TABLAS DE REFERENCIA (CATÁLOGOS) =====

class RefDepartamento(Base):
    __tablename__ = "ref_departamentos"
    __table_args__ = {"schema": "electoral"}
    id = Column(Integer, primary_key=True)
    descripcion = Column(String(255))

class RefDistrito(Base):
    __tablename__ = "ref_distritos"
    __table_args__ = {"schema": "electoral"}
    departamento_id = Column(Integer, primary_key=True)
    id = Column(Integer, primary_key=True)
    descripcion = Column(String(255))

class RefSeccional(Base):
    __tablename__ = "ref_seccionales"
    __table_args__ = {"schema": "electoral"}
    departamento_id = Column(Integer, primary_key=True)
    distrito_id = Column(Integer, primary_key=True)
    seccional_id = Column(Integer, primary_key=True)
    descripcion = Column(String(255))

try:
    from geoalchemy2 import Geometry
except ImportError:
    Geometry = None

class RefLocal(Base):
    __tablename__ = "ref_locales"
    __table_args__ = {"schema": "electoral"}
    departamento_id = Column(Integer, primary_key=True)
    distrito_id = Column(Integer, primary_key=True)
    seccional_id = Column(Integer, primary_key=True)
    local_id = Column(Integer, primary_key=True)
    descripcion = Column(String(255))
    domicilio = Column(Text)
    
    # La columna 'ubicacion' en la base de datos es jsonb
    ubicacion = Column(JSON)
    
    # Campo para compatibilidad futura con PostGIS
    if Geometry:
        geom_ubicacion = Column(Geometry(geometry_type='POINT', srid=4326))
