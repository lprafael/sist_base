# schemas.py
# Esquemas Pydantic para validación de datos

from pydantic import BaseModel, EmailStr, validator
from typing import Optional, List, Dict, Any, Union
from datetime import datetime, date
from enum import Enum

# ===== ENUMS =====

class TipoUsuario(str, Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    USER = "user"
    VIEWER = "viewer"

class TipoAccion(str, Enum):
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    READ = "read"
    EXPORT = "export"
    LOGIN = "login"
    LOGOUT = "logout"

class TipoNotificacion(str, Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    SUCCESS = "success"

# ===== SCHEMAS DE AUTENTICACIÓN =====

class UserLogin(BaseModel):
    username: str
    password: str

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    nombre_completo: str
    rol: str = "user"
    
    @validator('username')
    def username_must_be_valid(cls, v):
        if len(v) < 3:
            raise ValueError('El nombre de usuario debe tener al menos 3 caracteres')
        if not v.isalnum():
            raise ValueError('El nombre de usuario solo puede contener letras y números')
        return v

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    nombre_completo: Optional[str] = None
    rol: Optional[str] = None
    activo: Optional[bool] = None

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    nombre_completo: str
    rol: str
    activo: bool
    fecha_creacion: datetime
    ultimo_acceso: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# ===== SCHEMAS DE CONTRASEÑAS =====

class PasswordChange(BaseModel):
    current_password: str
    new_password: str
    
    @validator('new_password')
    def password_must_be_strong(cls, v):
        if len(v) < 8:
            raise ValueError('La contraseña debe tener al menos 8 caracteres')
        if not any(c.isupper() for c in v):
            raise ValueError('La contraseña debe contener al menos una mayúscula')
        if not any(c.islower() for c in v):
            raise ValueError('La contraseña debe contener al menos una minúscula')
        if not any(c.isdigit() for c in v):
            raise ValueError('La contraseña debe contener al menos un número')
        return v

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str
    
    @validator('new_password')
    def password_must_be_strong(cls, v):
        if len(v) < 8:
            raise ValueError('La contraseña debe tener al menos 8 caracteres')
        if not any(c.isupper() for c in v):
            raise ValueError('La contraseña debe contener al menos una mayúscula')
        if not any(c.islower() for c in v):
            raise ValueError('La contraseña debe contener al menos una minúscula')
        if not any(c.isdigit() for c in v):
            raise ValueError('La contraseña debe contener al menos un número')
        return v

# ===== SCHEMAS DE ROLES Y PERMISOS =====

class RolCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    permisos: List[int] = []  # IDs de permisos

class RolUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    activo: Optional[bool] = None
    permisos: Optional[List[int]] = None

class RolResponse(BaseModel):
    id: int
    nombre: str
    descripcion: Optional[str] = None
    activo: bool
    fecha_creacion: datetime
    permisos: List['PermisoResponse'] = []
    
    class Config:
        from_attributes = True

class PermisoCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    modulo: str
    accion: str

class PermisoUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    modulo: Optional[str] = None
    accion: Optional[str] = None
    activo: Optional[bool] = None

class PermisoResponse(BaseModel):
    id: int
    nombre: str
    descripcion: Optional[str] = None
    modulo: str
    accion: str
    activo: bool
    fecha_creacion: datetime
    
    class Config:
        from_attributes = True

# ===== SCHEMAS DE AUDITORÍA =====

class LogAccesoCreate(BaseModel):
    username: str
    accion: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    exitoso: bool = True
    detalles: Optional[Dict[str, Any]] = None

class LogAccesoResponse(BaseModel):
    id: int
    usuario_id: Optional[int] = None
    username: str
    accion: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    fecha: datetime
    exitoso: bool
    detalles: Optional[Dict[str, Any]] = None
    
    class Config:
        from_attributes = True

class LogAuditoriaCreate(BaseModel):
    username: str
    accion: str
    tabla: str
    registro_id: Optional[int] = None
    datos_anteriores: Optional[Dict[str, Any]] = None
    datos_nuevos: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    detalles: Optional[str] = None

class LogAuditoriaResponse(BaseModel):
    id: int
    usuario_id: Optional[int] = None
    username: str
    accion: str
    tabla: str
    registro_id: Optional[int] = None
    datos_anteriores: Optional[Dict[str, Any]] = None
    datos_nuevos: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    fecha: datetime
    detalles: Optional[str] = None
    
    class Config:
        from_attributes = True

# ===== SCHEMAS DE PARÁMETROS =====

class ParametroSistemaCreate(BaseModel):
    codigo: str
    nombre: str
    valor: str
    tipo: str = "string"
    descripcion: Optional[str] = None
    categoria: Optional[str] = None
    editable: bool = True

class ParametroSistemaUpdate(BaseModel):
    nombre: Optional[str] = None
    valor: Optional[str] = None
    descripcion: Optional[str] = None
    categoria: Optional[str] = None
    editable: Optional[bool] = None
    activo: Optional[bool] = None

class ParametroSistemaResponse(BaseModel):
    id: int
    codigo: str
    nombre: str
    valor: str
    tipo: str
    descripcion: Optional[str] = None
    categoria: Optional[str] = None
    editable: bool
    activo: bool
    fecha_creacion: datetime
    fecha_modificacion: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# ===== SCHEMAS DE NOTIFICACIONES =====

class NotificacionCreate(BaseModel):
    usuario_id: int
    titulo: str
    mensaje: str
    tipo: TipoNotificacion = TipoNotificacion.INFO
    datos_adicionales: Optional[Dict[str, Any]] = None

class NotificacionUpdate(BaseModel):
    leida: Optional[bool] = None

class NotificacionResponse(BaseModel):
    id: int
    usuario_id: int
    titulo: str
    mensaje: str
    tipo: str
    leida: bool
    fecha_creacion: datetime
    fecha_lectura: Optional[datetime] = None
    datos_adicionales: Optional[Dict[str, Any]] = None
    
    class Config:
        from_attributes = True

# ===== SCHEMAS DE REPORTES =====

class ReporteCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    tipo: str
    parametros: Optional[Dict[str, Any]] = None

class ReporteResponse(BaseModel):
    id: int
    nombre: str
    descripcion: Optional[str] = None
    tipo: str
    parametros: Optional[Dict[str, Any]] = None
    fecha_creacion: datetime
    fecha_ejecucion: Optional[datetime] = None
    estado: str
    ruta_archivo: Optional[str] = None
    creado_por: int
    detalles: Optional[Dict[str, Any]] = None
    
    class Config:
        from_attributes = True

# ===== SCHEMAS DE UTILIDAD =====

class RoleInfo(BaseModel):
    role: str
    permissions: List[str]

class PermissionCheck(BaseModel):
    permission: str
    has_permission: bool

# ===== SCHEMAS DE MODELOS EXISTENTES =====

class GremioCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = None

class GremioUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    activo: Optional[bool] = None

class GremioResponse(BaseModel):
    id: int
    nombre: str
    descripcion: Optional[str] = None
    fecha_creacion: datetime
    activo: bool
    
    class Config:
        from_attributes = True

class EOTCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = None

class EOTUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    activo: Optional[bool] = None

class EOTResponse(BaseModel):
    id: int
    nombre: str
    descripcion: Optional[str] = None
    fecha_creacion: datetime
    activo: bool
    
    class Config:
        from_attributes = True

class FeriadoCreate(BaseModel):
    nombre: str
    fecha: date
    descripcion: Optional[str] = None

class FeriadoUpdate(BaseModel):
    nombre: Optional[str] = None
    fecha: Optional[date] = None
    descripcion: Optional[str] = None
    activo: Optional[bool] = None

class FeriadoResponse(BaseModel):
    id: int
    nombre: str
    fecha: date
    descripcion: Optional[str] = None
    fecha_creacion: datetime
    activo: bool
    
    class Config:
        from_attributes = True

# ===== SCHEMAS DE CATÁLOGO DE RUTAS =====
from typing import Optional

class CatalogoRutaBase(BaseModel):
    ruta_hex: str
    id_eot_catalogo: Optional[int] = None
    ruta_gtfs: Optional[float] = None
    ruta_dec: Optional[int] = None
    sentido: Optional[str] = None
    linea: Optional[str] = None
    ramal: Optional[int] = None
    origen: Optional[str] = None
    destino: Optional[str] = None
    identificacion: Optional[str] = None
    identificador_troncal: Optional[str] = None
    observaciones: Optional[str] = None
    par_id: Optional[int] = None
    ingresa: Optional[int] = None
    # geom puede ser una cadena (WKT/JSON) o un objeto GeoJSON (dict) enviado desde el frontend
    geom: Optional[Union[str, Dict[str, Any]]] = None
    latitud_a: Optional[float] = None
    longitud_a: Optional[float] = None
    latitud_b: Optional[float] = None
    longitud_b: Optional[float] = None
    estado: Optional[bool] = None

class CatalogoRutaCreate(CatalogoRutaBase):
    pass

class CatalogoRutaUpdate(BaseModel):
    id_eot_catalogo: Optional[int] = None
    ruta_gtfs: Optional[float] = None
    ruta_dec: Optional[int] = None
    sentido: Optional[str] = None
    linea: Optional[str] = None
    ramal: Optional[int] = None
    origen: Optional[str] = None
    destino: Optional[str] = None
    identificacion: Optional[str] = None
    identificador_troncal: Optional[str] = None
    observaciones: Optional[str] = None
    par_id: Optional[int] = None
    ingresa: Optional[int] = None
    geom: Optional[Union[str, Dict[str, Any]]] = None
    latitud_a: Optional[float] = None
    longitud_a: Optional[float] = None
    latitud_b: Optional[float] = None
    longitud_b: Optional[float] = None
    estado: Optional[bool] = None

# === HISTÓRICO DE ITINERARIOS ===
from typing import Union, Dict, Any

class HistoricoItinerarioBase(BaseModel):
    ruta_hex: str
    fecha_inicio_vigencia: date
    fecha_fin_vigencia: Optional[date] = None
    geom: Union[str, Dict[str, Any]]  # Puede ser GeoJSON (como diccionario) o WKT (como string)
    vigente: bool = True
    observacion: Optional[str] = None

class HistoricoItinerarioCreate(HistoricoItinerarioBase):
    pass

class HistoricoItinerarioUpdate(BaseModel):
    fecha_fin_vigencia: Optional[date] = None
    geom: Optional[Union[str, Dict[str, Any]]] = None
    vigente: Optional[bool] = None
    observacion: Optional[str] = None

class HistoricoItinerarioResponse(HistoricoItinerarioBase):
    id_itinerario: int
    fecha_creacion: Optional[datetime] = None
    fecha_actualizacion: Optional[datetime] = None
    class Config:
        orm_mode = True


# ===== HISTORICO EOT POR RUTA =====
class HistoricoEotRutaBase(BaseModel):
    ruta_hex: str
    id_eot: int
    fecha_inicio: date
    fecha_fin: Optional[date] = None
    observacion: Optional[str] = None

class HistoricoEotRutaCreate(HistoricoEotRutaBase):
    pass

class HistoricoEotRutaUpdate(BaseModel):
    fecha_fin: Optional[date] = None
    observacion: Optional[str] = None

class HistoricoEotRutaResponse(HistoricoEotRutaBase):
    id_hist_eot: int

    class Config:
        orm_mode = True

class CatalogoRutaResponse(CatalogoRutaBase):
    class Config:
        orm_mode = True

# ===== GEOCERCAS Y TERMINALES =====

class TipoGeocercaResponse(BaseModel):
    id_tipo: int
    nombre: str
    descripcion: Optional[str] = None
    
    class Config:
        orm_mode = True

class GeocercaBase(BaseModel):
    id_itinerario: int
    id_tipo: int
    orden: int = 0
    geom: Optional[Union[str, Dict[str, Any]]] = None

class GeocercaCreate(GeocercaBase):
    pass

class GeocercaUpdate(BaseModel):
    id_tipo: Optional[int] = None
    orden: Optional[int] = None
    geom: Optional[Union[str, Dict[str, Any]]] = None

class GeocercaResponse(GeocercaBase):
    id_geocerca: int
    tipo: Optional[TipoGeocercaResponse] = None
    fecha_creacion: Optional[datetime] = None
    fecha_actualizacion: Optional[datetime] = None
    
    class Config:
        orm_mode = True

class PuntoTerminalBase(BaseModel):
    id_tipo_geocerca: int
    id_eot_vmt_hex: str
    numero_terminal: str
    latitude: float
    longitude: float
    radio_geocerca_m: int
    geom_punto: Optional[Union[str, Dict[str, Any]]] = None
    geom_geocerca: Optional[Union[str, Dict[str, Any]]] = None

class PuntoTerminalCreate(PuntoTerminalBase):
    pass

class PuntoTerminalUpdate(BaseModel):
    id_tipo_geocerca: Optional[int] = None
    numero_terminal: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    radio_geocerca_m: Optional[int] = None
    geom_punto: Optional[Union[str, Dict[str, Any]]] = None
    geom_geocerca: Optional[Union[str, Dict[str, Any]]] = None

class PuntoTerminalResponse(PuntoTerminalBase):
    id_punto: int
    fecha_creacion: Optional[datetime] = None
    fecha_actualizacion: Optional[datetime] = None
    
    class Config:
        orm_mode = True