"""
Tests simplificados del módulo de pagos - Validación de Schemas
"""
import pytest
from decimal import Decimal
from pydantic import ValidationError

# Tests solo para schemas (sin routers complejos)


def test_payment_provider_enum():
    """Test: Enum de proveedores de pago"""
    from schemas.payments import PaymentProvider
    
    assert PaymentProvider.MERCADOPAGO.value == "mercadopago"
    assert PaymentProvider.STRIPE.value == "stripe"
    assert PaymentProvider.CASH.value == "cash"


def test_payment_status_enum():
    """Test: Enum de estados de pago"""
    from schemas.payments import PaymentStatus
    
    statuses = [
        "pending", "processing", "approved", 
        "rejected", "refunded", "cancelled"
    ]
    
    for status in statuses:
        ps = PaymentStatus(status)
        assert ps.value == status


def test_payment_create_validation_valid():
    """Test: Validación de PaymentCreate - datos válidos"""
    from schemas.payments import PaymentCreate, PaymentProvider
    
    payment = PaymentCreate(
        tournament_team_id="team-123",
        provider=PaymentProvider.MERCADOPAGO
    )
    assert payment.provider == PaymentProvider.MERCADOPAGO
    assert payment.tournament_team_id == "team-123"


def test_payment_create_validation_all_providers():
    """Test: PaymentCreate válido con todos los proveedores"""
    from schemas.payments import PaymentCreate, PaymentProvider
    
    for provider in [PaymentProvider.MERCADOPAGO, PaymentProvider.STRIPE, PaymentProvider.CASH]:
        payment = PaymentCreate(
            tournament_team_id="team-123",
            provider=provider
        )
        assert payment.provider == provider


def test_payment_manual_create_valid():
    """Test: PaymentManualCreate - datos válidos"""
    from schemas.payments import PaymentManualCreate
    
    payment = PaymentManualCreate(
        tournament_team_id="team-123",
        amount=Decimal("500.00"),
        received_by="Juan García"
    )
    
    assert payment.tournament_team_id == "team-123"
    assert payment.amount == Decimal("500.00")
    assert payment.received_by == "Juan García"
    assert payment.notes is None  # Optional


def test_payment_manual_create_with_notes():
    """Test: PaymentManualCreate con notas"""
    from schemas.payments import PaymentManualCreate
    
    payment = PaymentManualCreate(
        tournament_team_id="team-456",
        amount=Decimal("750.00"),
        received_by="Maria López",
        notes="Pago recibido el día del sorteo"
    )
    
    assert payment.notes == "Pago recibido el día del sorteo"


def test_payment_manual_create_invalid_amount_negative():
    """Test: PaymentManualCreate rechaza monto negativo"""
    from schemas.payments import PaymentManualCreate
    
    with pytest.raises(ValidationError) as exc_info:
        PaymentManualCreate(
            tournament_team_id="team-123",
            amount=Decimal("-500"),
            received_by="Juan García"
        )
    
    # Validar que el error menciona el monto
    assert "amount" in str(exc_info.value).lower()


def test_payment_manual_create_invalid_name_too_short():
    """Test: PaymentManualCreate rechaza nombres muy cortos"""
    from schemas.payments import PaymentManualCreate
    
    with pytest.raises(ValidationError):
        PaymentManualCreate(
            tournament_team_id="team-123",
            amount=Decimal("500"),
            received_by="J"  # Solo 1 carácter
        )


def test_payment_manual_create_invalid_notes_too_long():
    """Test: PaymentManualCreate rechaza notas muy largas"""
    from schemas.payments import PaymentManualCreate
    
    long_notes = "a" * 300  # Más de 255 caracteres
    
    with pytest.raises(ValidationError):
        PaymentManualCreate(
            tournament_team_id="team-123",
            amount=Decimal("500"),
            received_by="Juan García",
            notes=long_notes
        )


def test_payment_response_structure():
    """Test: PaymentResponse tiene estructura correcta"""
    from schemas.payments import PaymentResponse, PaymentProvider
    
    # Simulamos datos
    response = PaymentResponse(
        status="success",
        preference_id="pref-123",
        provider=PaymentProvider.MERCADOPAGO,
        checkout_url="https://example.com/checkout",
        amount=Decimal("500.00"),
        created_at="2026-05-17T10:00:00"
    )
    
    assert response.status == "success"
    assert response.preference_id == "pref-123"
    assert response.provider == PaymentProvider.MERCADOPAGO


def test_payment_status_response_valid():
    """Test: PaymentStatus_Response estructura válida"""
    from schemas.payments import PaymentStatus_Response, PaymentProvider
    
    response = PaymentStatus_Response(
        tournament_team_id="team-123",
        amount=Decimal("500.00"),
        currency="ARS",
        status="approved",
        provider=PaymentProvider.MERCADOPAGO,
        external_payment_id="mp-789",
        refund_amount=None,
        created_at="2026-05-17T10:00:00",
        updated_at="2026-05-17T10:30:00"
    )
    
    assert response.status == "approved"
    assert response.currency == "ARS"
    assert response.amount == Decimal("500.00")


def test_payment_refund_request():
    """Test: PaymentRefundRequest válido"""
    from schemas.payments import PaymentRefundRequest
    
    refund = PaymentRefundRequest(
        refund_reason="Equipo no se presentó",
        refund_amount=Decimal("500.00")
    )
    
    assert refund.refund_reason == "Equipo no se presentó"
    assert refund.refund_amount == Decimal("500.00")


def test_payment_refund_request_partial():
    """Test: Reembolso parcial (sin especificar monto)"""
    from schemas.payments import PaymentRefundRequest
    
    refund = PaymentRefundRequest(
        refund_reason="Cancelación parcial"
        # refund_amount es opcional
    )
    
    assert refund.refund_reason == "Cancelación parcial"
    assert refund.refund_amount is None


def test_payment_options_response():
    """Test: PaymentOptionsResponse estructura válida"""
    from schemas.payments import PaymentOptionsResponse
    
    response = PaymentOptionsResponse(
        tournament_team_id="team-123",
        amount=Decimal("500.00"),
        currency="ARS",
        opciones=[
            {
                "id": "mercadopago",
                "nombre": "Mercado Pago",
                "descripcion": "Tarjetas y billetera"
            },
            {
                "id": "stripe",
                "nombre": "Stripe",
                "descripcion": "Tarjetas internacionales"
            },
            {
                "id": "cash",
                "nombre": "Efectivo",
                "descripcion": "Pago en cancha"
            }
        ]
    )
    
    assert len(response.opciones) == 3
    assert response.opciones[0]["id"] == "mercadopago"
    assert response.amount == Decimal("500.00")


def test_payment_report_response():
    """Test: PaymentReportResponse estructura válida"""
    from schemas.payments import PaymentReportResponse, PaymentReportRow
    
    rows = [
        PaymentReportRow(
            payment_id="pay-1",
            tournament_team_id="team-1",
            equipo_nombre="Real Madrid",
            amount=Decimal("500"),
            provider="mercadopago",
            status="approved",
            created_at="2026-05-17T10:00:00"
        )
    ]
    
    response = PaymentReportResponse(
        total_registros=1,
        total_monto=Decimal("500"),
        currency="ARS",
        resumen=[],
        detalles=rows
    )
    
    assert response.total_registros == 1
    assert response.detalles[0].status == "approved"


def test_payment_decimal_precision():
    """Test: Precisión de decimales en montos"""
    from schemas.payments import PaymentCreate, PaymentManualCreate
    
    # Montos con centavos
    payment = PaymentManualCreate(
        tournament_team_id="team-123",
        amount=Decimal("499.99"),
        received_by="Juan García"
    )
    
    assert payment.amount == Decimal("499.99")
    assert str(payment.amount) == "499.99"


def test_payment_decimal_boundary():
    """Test: Límites de montos (no negativos, no cero)"""
    from schemas.payments import PaymentManualCreate
    
    # Cero debería rechazarse
    with pytest.raises(ValidationError):
        PaymentManualCreate(
            tournament_team_id="team-123",
            amount=Decimal("0.00"),
            received_by="Juan García"
        )


def test_schema_serialization():
    """Test: Esquemas se serializan a JSON correctamente"""
    from schemas.payments import PaymentCreate, PaymentProvider
    import json
    
    payment = PaymentCreate(
        tournament_team_id="team-123",
        provider=PaymentProvider.MERCADOPAGO
    )
    
    # Debe ser serializable a JSON
    json_data = json.dumps(payment.model_dump())
    assert "mercadopago" in json_data
    
    # Y deserializable
    loaded = json.loads(json_data)
    assert loaded["provider"] == "mercadopago"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
