# schemas.py
# Esquemas Pydantic para validación de datos

from pydantic import BaseModel, EmailStr, validator
from typing import Optional, List, Dict, Any, Union
from datetime import datetime, date
from enum import Enum

# ===== ENUMS =====

class TipoUsuario(str, Enum):
    ADMIN = "admin"
    INTENDENTE = "intendente"
    CONCEJAL = "concejal"
    REFERENTE = "referente"
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
    device_id: Optional[str] = None

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    nombre_completo: str
    rol: str = "user"
    departamento_id: Optional[int] = None  # Obligatorio para intendente/concejal
    distrito_id: Optional[int] = None      # Obligatorio para intendente/concejal
    restriccion_equipo: Optional[bool] = False
    superior_usuario_id: Optional[int] = None
    
    @validator('username')
    def username_must_be_valid(cls, v):
        if len(v) < 2:
            raise ValueError('El nombre de usuario debe tener al menos 2 caracteres')
        return v

class GoogleLogin(BaseModel):
    credential: str

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    nombre_completo: Optional[str] = None
    rol: Optional[str] = None
    activo: Optional[bool] = None
    restriccion_equipo: Optional[bool] = None
    public_slug: Optional[str] = None
    public_config: Optional[Dict[str, Any]] = None

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    nombre_completo: str
    rol: str
    activo: bool
    fecha_creacion: datetime
    ultimo_acceso: Optional[datetime] = None
    departamento_id: Optional[int] = None
    distrito_id: Optional[int] = None
    restriccion_equipo: bool = False
    public_slug: Optional[str] = None
    public_config: Optional[Dict[str, Any]] = None
    
    class Config:
        from_attributes = True

class SesionUsuarioResponse(BaseModel):
    id: int
    usuario_id: int
    username: Optional[str] = None
    token: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    fecha_inicio: datetime
    fecha_expiracion: datetime
    activa: bool
    fecha_cierre: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# ===== SCHEMAS DE EQUIPOS (DISPOSITIVOS) =====

class EquipoAutorizadoBase(BaseModel):
    device_id: str
    descripcion: Optional[str] = None

class EquipoAutorizadoCreate(EquipoAutorizadoBase):
    usuario_id: int

class EquipoAutorizadoResponse(EquipoAutorizadoBase):
    id: int
    usuario_id: int
    user_agent: Optional[str] = None
    ip_solicitud: Optional[str] = None
    fecha_autorizacion: datetime
    activo: bool

    class Config:
        from_attributes = True

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

# ===== SCHEMAS ELECTORALES =====

class PadronResponse(BaseModel):
    cedula: str
    nombre: str
    apellido_paterno: str
    apellido_materno: str
    fecha_nacimiento: Optional[date] = None
    genero: Optional[str] = None
    distrito: Optional[str] = None
    departamento: Optional[str] = None
    mesa_nro: Optional[int] = None
    orden_nro: Optional[int] = None

    class Config:
        from_attributes = True

class CaptacionCreate(BaseModel):
    cedula_votante: str
    parentesco: Optional[str] = None
    grado_seguridad: int = 3 # 1-5
    observaciones: Optional[str] = None
    domicilio: Optional[str] = None
    latitud: Optional[float] = None
    longitud: Optional[float] = None
    movilidad_propia: bool = False

class CaptacionUpdate(BaseModel):
    parentesco: Optional[str] = None
    grado_seguridad: Optional[int] = None
    observaciones: Optional[str] = None
    domicilio: Optional[str] = None
    latitud: Optional[float] = None
    longitud: Optional[float] = None
    movilidad_propia: Optional[bool] = None

class PosibleVotanteResponse(BaseModel):
    id: int
    id_referente: int
    cedula_votante: str
    nombre_votante: str
    apellido_votante: str
    parentesco: Optional[str] = None
    grado_seguridad: int
    fecha_captacion: datetime
    validacion_candidato: bool
    movilidad_propia: bool

    class Config:
        from_attributes = True

class ResumenReferente(BaseModel):
    id_referente: int
    nombre_referente: str
    cantidad_votantes: int

class ResumenLocal(BaseModel):
    nombre_local: str
    cantidad: int

class ResumenMesa(BaseModel):
    nombre_local: str
    mesa: int
    cantidad: int

class DashboardCandidatoResponse(BaseModel):
    total_votantes_unicos: int
    total_votantes_bruto: int 
    referentes: List[ResumenReferente]
    resumen_locales: List[ResumenLocal] = []
    resumen_mesas: List[ResumenMesa] = []
    puntos_calor: List[Dict[str, Any]] = [] # [{lat: X, lng: Y, weight: Z}]
    map_center: Optional[Dict[str, float]] = None

class AnrPadronResponse(BaseModel):
    cedula: str
    nombres: str
    apellidos: str
    nacimiento: Optional[date] = None
    departamento: Optional[int] = None
    distrito: Optional[int] = None
    seccional: Optional[int] = None
    local: Optional[int] = None
    mesa: Optional[int] = None
    orden: Optional[int] = None
    direccion: Optional[str] = None
    
    # Campos descriptivos (opcionales)
    nombre_departamento: Optional[str] = None
    nombre_distrito: Optional[str] = None
    nombre_seccional: Optional[str] = None
    nombre_local: Optional[str] = None
    
    class Config:
        from_attributes = True

class CatalogItem(BaseModel):
    id: int
    descripcion: str
    
    class Config:
        from_attributes = True

class PlraPadronResponse(BaseModel):
    cedula: str
    nombre: str
    apellido: str
    sexo: Optional[str] = None
    fec_nac: Optional[date] = None
    fec_inscri: Optional[date] = None
    direcc: Optional[str] = None
    departamento_nombre: Optional[str] = None
    distrito_nombre: Optional[str] = None
    zona_nombre: Optional[str] = None
    comite_nombre: Optional[str] = None
    local_generales: Optional[str] = None
    local_interna: Optional[str] = None
    afiliaciones: Optional[str] = None
    afiliacion_plra_2025: Optional[str] = None
    voto_anr: Optional[str] = None
    
    class Config:
        from_attributes = True

# --- Esquemas para Actividades ---

class ActividadFotoResponse(BaseModel):
    id: int
    ruta_archivo: str
    descripcion: Optional[str] = None
    fecha_registro: datetime

    class Config:
        from_attributes = True

class ActividadParticipanteResponse(BaseModel):
    id: int
    cedula: str
    nombre: Optional[str] = None
    apellido: Optional[str] = None
    telefono: Optional[str] = None
    observaciones: Optional[str] = None

class ResultadoMesaBase(BaseModel):
    departamento_id: int
    distrito_id: int
    seccional_id: int
    local_id: int
    nro_mesa: int
    id_candidato: int
    votos_obtenidos: int = 0
    votos_blancos: int = 0
    votos_nulos: int = 0
    total_votantes_acta: int = 0
    observaciones: Optional[str] = None
    foto_acta_url: Optional[str] = None

class ResultadoMesaCreate(ResultadoMesaBase):
    pass

class ResultadoMesaResponse(ResultadoMesaBase):
    id: int
    auditado: bool = False
    creado_por: int
    fecha_registro: datetime

    class Config:
        from_attributes = True

class ResumenMesaComparativo(BaseModel):
    departamento_id: int
    distrito_id: int
    seccional_id: int
    local_id: int
    nombre_local: str
    nro_mesa: int
    votos_reales: int
    simpatizantes_esperados: int
    diferencia: int
    efectividad_porcentaje: float

# --- Esquemas para Financiamiento Político ---

class FinanciamientoEgresoBase(BaseModel):
    id_candidato: int
    tipo_financiamiento: str
    monto: float
    fecha: date
    categoria: Optional[str] = None
    descripcion: Optional[str] = None
    proveedor_nombre: Optional[str] = None
    proveedor_ruc: Optional[str] = None
    factura_nro: Optional[str] = None
    tipo_comprobante: str = "Factura"
    timbrado: Optional[str] = None

class FinanciamientoEgresoCreate(FinanciamientoEgresoBase):
    pass

class FinanciamientoEgresoResponse(FinanciamientoEgresoBase):
    id: int
    creado_por: int
    fecha_registro: datetime

    class Config:
        from_attributes = True

class FinanciamientoIngresoBase(BaseModel):
    id_candidato: int
    tipo_financiamiento: str
    monto: float
    fecha: date
    origen: Optional[str] = None
    nombre_aportante: Optional[str] = None
    ci_ruc_aportante: Optional[str] = None
    descripcion: Optional[str] = None
    comprobante_nro: Optional[str] = None
    tipo_comprobante: str = "Recibo"
    timbrado: Optional[str] = None

class FinanciamientoIngresoCreate(FinanciamientoIngresoBase):
    pass

class FinanciamientoIngresoResponse(FinanciamientoIngresoBase):
    id: int
    creado_por: int
    fecha_registro: datetime

    class Config:
        from_attributes = True

class FinanciamientoCumplimientoBase(BaseModel):
    id_candidato: int
    tipo_financiamiento: str
    requisito_nombre: str
    completado: bool = False
    observaciones: Optional[str] = None
    archivo_url: Optional[str] = None

class FinanciamientoCumplimientoUpdate(BaseModel):
    completado: Optional[bool] = None
    observaciones: Optional[str] = None
    archivo_url: Optional[str] = None
    fecha_cumplimiento: Optional[datetime] = None

class FinanciamientoCumplimientoResponse(FinanciamientoCumplimientoBase):
    id: int
    fecha_cumplimiento: Optional[datetime] = None

    class Config:
        from_attributes = True

class FinanciamientoResumen(BaseModel):
    total_ingresos: float
    total_egresos: float
    balance: float
    cumplimiento_porcentaje: float
    es_simpatizante: bool
    en_padron_anr: bool
    en_padron_plra: bool
    fecha_registro: datetime

    class Config:
        from_attributes = True

class ActividadBase(BaseModel):
    titulo: str
    tipo: Optional[str] = None
    fecha_programada: Optional[datetime] = None
    fecha_prevista: Optional[datetime] = None
    observaciones: Optional[str] = None
    latitud: Optional[float] = None
    longitud: Optional[float] = None
    radio_influencia: float = 100.0
    estado: str = 'pendiente'

    @validator('fecha_programada', 'fecha_prevista', pre=True)
    def empty_string_to_none(cls, v):
        if v == "":
            return None
        return v

class ActividadCreate(ActividadBase):
    pass

class ActividadUpdate(BaseModel):
    titulo: Optional[str] = None
    tipo: Optional[str] = None
    fecha_programada: Optional[datetime] = None
    fecha_prevista: Optional[datetime] = None
    observaciones: Optional[str] = None
    latitud: Optional[float] = None
    longitud: Optional[float] = None
    radio_influencia: Optional[float] = None
    estado: Optional[str] = None

    @validator('fecha_programada', 'fecha_prevista', pre=True)
    def empty_string_to_none(cls, v):
        if v == "":
            return None
        return v


class ActividadResponse(ActividadBase):
    id: int
    creado_por: int
    fecha_registro: datetime
    fotos: List[ActividadFotoResponse] = []
    
    class Config:
        from_attributes = True

class ParticipanteCreate(BaseModel):
    cedula: str
    nombre: Optional[str] = None
    apellido: Optional[str] = None
    telefono: Optional[str] = None
    observaciones: Optional[str] = None