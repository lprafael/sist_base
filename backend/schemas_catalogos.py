from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime


# ==============================================================================
# FORMATOS DE TORNEO
# ==============================================================================
class FormatoTorneoBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = None

class FormatoTorneoCreate(FormatoTorneoBase):
    pass

class FormatoTorneoUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None

class FormatoTorneoResponse(FormatoTorneoBase):
    id: int
    
    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# TIPOS DE DEPORTE
# ==============================================================================
class TipoDeporteBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = None

class TipoDeporteCreate(TipoDeporteBase):
    pass

class TipoDeporteUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None

class TipoDeporteResponse(TipoDeporteBase):
    id: int
    creado_en: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# DEPORTES
# ==============================================================================
class DeporteBase(BaseModel):
    nombre: str
    tipo_id: int

class DeporteCreate(DeporteBase):
    pass

class DeporteUpdate(BaseModel):
    nombre: Optional[str] = None
    tipo_id: Optional[int] = None

class DeporteResponse(DeporteBase):
    id: int
    creado_en: Optional[datetime] = None
    tipo_deporte: Optional[TipoDeporteResponse] = None
    
    model_config = ConfigDict(from_attributes=True)

class DeporteConFormatos(DeporteResponse):
    formatos: List[FormatoTorneoResponse] = []

class DeporteFormatoLink(BaseModel):
    deporte_id: int
    formato_id: int


# ==============================================================================
# TIPOS DE EVENTO (FÚTBOL)
# ==============================================================================
class TipoEventoFutbolBase(BaseModel):
    codigo: str
    nombre: str
    descripcion: Optional[str] = None
    aplica_a: Optional[str] = 'jugador'
    afecta_marcador: Optional[bool] = False
    afecta_disciplina: Optional[bool] = False
    activo: Optional[bool] = True

class TipoEventoFutbolCreate(TipoEventoFutbolBase):
    pass

class TipoEventoFutbolUpdate(BaseModel):
    codigo: Optional[str] = None
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    aplica_a: Optional[str] = None
    afecta_marcador: Optional[bool] = None
    afecta_disciplina: Optional[bool] = None
    activo: Optional[bool] = None

class TipoEventoFutbolResponse(TipoEventoFutbolBase):
    id: int
    creado_en: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# MODALIDADES (FÚTBOL)
# ==============================================================================
class ModalidadFutbolBase(BaseModel):
    codigo: str
    nombre: str
    descripcion: Optional[str] = None

class ModalidadFutbolCreate(ModalidadFutbolBase):
    pass

class ModalidadFutbolUpdate(BaseModel):
    codigo: Optional[str] = None
    nombre: Optional[str] = None
    descripcion: Optional[str] = None

class ModalidadFutbolResponse(ModalidadFutbolBase):
    id: int
    creado_en: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)

