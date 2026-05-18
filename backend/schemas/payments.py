"""
Schemas (Pydantic Models) para validar requests/responses de pagos
"""
from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import Optional, Dict, Any, List
from datetime import datetime
from decimal import Decimal
from enum import Enum


class PaymentProvider(str, Enum):
    """Proveedores de pago soportados"""
    MERCADOPAGO = "mercadopago"
    STRIPE = "stripe"
    CASH = "cash"


class PaymentStatus(str, Enum):
    """Estados del pago"""
    PENDING = "pending"
    PROCESSING = "processing"
    APPROVED = "approved"
    REJECTED = "rejected"
    REFUNDED = "refunded"
    CANCELLED = "cancelled"


class PaymentCreate(BaseModel):
    """Crear un nuevo pago"""
    tournament_team_id: Optional[str] = Field(None, description="ID de inscripción del equipo")
    provider: PaymentProvider = Field(default=PaymentProvider.MERCADOPAGO)
    
    model_config = ConfigDict(from_attributes=True)


class PaymentResponse(BaseModel):
    """Respuesta al crear un pago"""
    status: str
    checkout_url: Optional[str] = None
    preference_id: Optional[str] = None
    provider: Optional[PaymentProvider] = None
    amount: Optional[Decimal] = None
    currency: Optional[str] = "ARS"
    created_at: Optional[str] = None
    expires_at: Optional[str] = None
    message: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


class PaymentStatus_Response(BaseModel):
    """Estado de un pago"""
    id: Optional[str] = None
    tournament_team_id: str
    amount: Decimal
    currency: str
    status: str
    provider: PaymentProvider
    paid_at: Optional[datetime] = None
    external_payment_id: Optional[str] = None
    refund_amount: Optional[Decimal] = None
    created_at: str
    updated_at: str
    
    model_config = ConfigDict(from_attributes=True)


class PaymentWebhookMercadoPago(BaseModel):
    """Webhook de MercadoPago"""
    id: str
    data: Dict[str, Any]


class PaymentManualCreate(BaseModel):
    """Registrar pago manual (efectivo)"""
    tournament_team_id: str
    amount: Decimal = Field(..., gt=0, description="Monto pagado")
    received_by: str = Field(..., min_length=3, description="Nombre de quien recibió el pago")
    notes: Optional[str] = Field(None, max_length=255)
    
    @field_validator('amount')
    @classmethod
    def amount_must_be_positive(cls, v):
        if v <= 0:
            raise ValueError('Monto debe ser positivo')
        return v
    
    @field_validator('notes')
    @classmethod
    def notes_max_length(cls, v):
        if v and len(v) > 255:
            raise ValueError('Notas no pueden exceder 255 caracteres')
        return v


class PaymentRefundRequest(BaseModel):
    """Solicitar reembolso de pago"""
    refund_reason: str = Field(..., min_length=10, description="Motivo del reembolso")
    refund_amount: Optional[Decimal] = Field(None, description="Monto a reembolsar (si es parcial)")
    
    model_config = ConfigDict(from_attributes=True)


class PaymentOptionsResponse(BaseModel):
    """Opciones de pago disponibles"""
    tournament_team_id: Optional[str] = None
    amount: Decimal
    currency: str = "ARS"
    tournament_name: Optional[str] = None
    fee_deadline: Optional[str] = None
    opciones: List[Dict[str, Any]]
    
    model_config = ConfigDict(from_attributes=True)


class PaymentReportRow(BaseModel):
    """Fila de reporte de pagos"""
    payment_id: str
    tournament_team_id: str
    equipo_nombre: str
    amount: Decimal
    provider: str
    status: str
    created_at: str
    delegado_email: Optional[str] = None
    delegado_telefono: Optional[str] = None


class PaymentReportResponse(BaseModel):
    """Reporte financiero del torneo"""
    total_registros: int
    total_monto: Decimal
    currency: str = "ARS"
    torneo_id: Optional[str] = None
    torneo_nombre: Optional[str] = None
    resumen: List[Dict[str, Any]] = []
    detalles: List[PaymentReportRow] = []
    fecha_reporte: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)
