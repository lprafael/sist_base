from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import date
from uuid import UUID

class TorneoGeneralCreate(BaseModel):
    nombre: str
    lugar: str
    fecha_inicio: date
    fecha_fin: date
    modalidades_permitidas: List[str]
    deporte_id: Optional[int] = None

class TorneoGeneralUpdate(BaseModel):
    nombre: Optional[str] = None
    lugar: Optional[str] = None
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None
    modalidades_permitidas: Optional[List[str]] = None
    estado: Optional[str] = None
    deporte_id: Optional[int] = None

class TorneoGeneralResponse(BaseModel):
    id: UUID
    nombre: str
    lugar: str
    fecha_inicio: date
    fecha_fin: date
    modalidades_permitidas: List[str]
    estado: str
    deporte_id: Optional[int] = None
    
    class Config:
        from_attributes = True

class ParticipanteInscripcion(BaseModel):
    nombre: str
    apellido: str
    documento: str
    fecha_nacimiento: date
    genero: str  # 'Masculino' | 'Femenino'
    email: EmailStr
    telefono: Optional[str] = None
    modalidad: str  # 'Kumite' | 'Kata' | 'Para-Karate'
    nivel_experiencia: str
    peso_declarado: float
    estatura_declarada: float
    # WKF: sub-categoría de edad declarada por el atleta (requerida para Senior/Sub-21)
    categoria_edad: Optional[str] = None  # 'Senior' | 'Sub-21' | 'Junior' | 'Cadete' | 'Sub-14'
    # WKF Para-Karate: clase deportiva (requerida si modalidad == 'Para-Karate')
    clase_deportiva: Optional[str] = None  # 'K10' | 'K21' | 'K22' | 'K30'
    # Puntaje de compensación Para-Karate (K10, K30). Lo ingresa el staff tras clasificación médica.
    extra_score: Optional[float] = 0.0

class CheckInParticipante(BaseModel):
    peso_verificado: float
    estatura_verificada: float
    pago_confirmado: bool

class MultaParticipante(BaseModel):
    penalidad_id: UUID
    participante_id: UUID

class PenalidadCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    monto_gs: float

class ConfiguracionAgrupacion(BaseModel):
    edades: List[List[int]]  # Ej: [[10,12], [13,15], [16,18], [19,99]]
    pesos: List[List[float]] # Ej: [[0, 60], [60.1, 70], [70.1, 80], [80.1, 200]]

class PuntuacionJuez(BaseModel):
    participante_id: UUID
    juez_id: str
    valor_puntos: int
    tipo_registro: str = "Punto" # 'Punto' o 'Falta'
    nota: Optional[str] = None
