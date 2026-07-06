from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from models import Base

# ==============================================================================
# TABLAS INTERMEDIAS
# ==============================================================================
deporte_formato = Table(
    "deporte_formato",
    Base.metadata,
    Column("deporte_id", Integer, ForeignKey("cancha.deportes.id", ondelete="CASCADE"), primary_key=True),
    Column("formato_id", Integer, ForeignKey("cancha.formatos_torneo.id", ondelete="CASCADE"), primary_key=True),
    Column("creado_en", DateTime, default=func.now()),
    schema="cancha"
)

# ==============================================================================
# CATÁLOGOS - DEPORTES
# ==============================================================================
class RolCancha(Base):
    __tablename__ = "roles"
    __table_args__ = {"schema": "cancha"}
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(50), unique=True, nullable=False)
    descripcion = Column(Text)
    creado_en = Column(DateTime, default=func.now())

class TipoDeporte(Base):
    __tablename__ = "tipos_deporte"
    __table_args__ = {"schema": "cancha"}
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), unique=True, nullable=False)
    descripcion = Column(Text)
    creado_en = Column(DateTime, default=func.now())

class Deporte(Base):
    __tablename__ = "deportes"
    __table_args__ = {"schema": "cancha"}
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), unique=True, nullable=False)
    tipo_id = Column(Integer, ForeignKey("cancha.tipos_deporte.id"), nullable=False)
    creado_en = Column(DateTime, default=func.now())
    
    tipo_deporte = relationship("TipoDeporte")
    formatos = relationship("FormatoTorneo", secondary=deporte_formato, back_populates="deportes")

# ==============================================================================
# CATÁLOGOS - FORMATOS DE TORNEO
# ==============================================================================
class FormatoTorneo(Base):
    __tablename__ = "formatos_torneo"
    __table_args__ = {"schema": "cancha"}
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), unique=True, nullable=False)
    descripcion = Column(Text)
    creado_en = Column(DateTime, default=func.now())

    deportes = relationship("Deporte", secondary=deporte_formato, back_populates="formatos")

# ==============================================================================
# CATÁLOGOS - CATEGORÍAS
# ==============================================================================
class CategoriaCat(Base):
    """
    Nota: Se nombra CategoriaCat para evitar conflicto con posibles modelos de 
    Categorias específicas de un torneo. Representa el catálogo global.
    """
    __tablename__ = "categorias"
    __table_args__ = {"schema": "torneos"}
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    edad_minima = Column(Integer)
    edad_maxima = Column(Integer)
    nivel = Column(String(100))
    creado_en = Column(DateTime, default=func.now())

# ==============================================================================
# CATÁLOGOS - TIPOS DE EVENTO (FÚTBOL)
# ==============================================================================
class TipoEventoFutbol(Base):
    __tablename__ = "tipos_eventos"
    __table_args__ = {"schema": "torneos_futbol"}
    
    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String(30), unique=True, nullable=False)
    nombre = Column(String(100), nullable=False)
    descripcion = Column(Text)
    aplica_a = Column(String(20), default='jugador')
    afecta_marcador = Column(Boolean, default=False)
    afecta_disciplina = Column(Boolean, default=False)
    activo = Column(Boolean, default=True)

# ==============================================================================
# CATÁLOGOS - MODALIDADES (FÚTBOL)
# ==============================================================================
class ModalidadFutbol(Base):
    __tablename__ = "modalidades"
    __table_args__ = {"schema": "torneos_futbol"}
    
    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String(30), unique=True, nullable=False)
    nombre = Column(String(100), nullable=False)
    descripcion = Column(Text)

