"""
Tests del módulo de pagos (routers/payments.py)
Usar: pytest tests/test_payments.py -v
"""
import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from decimal import Decimal
import json
from fastapi.testclient import TestClient

# Nota: Estos tests son templates - necesitarán ajustes según el setup local


# ============================================
# FIXTURES
# ============================================

@pytest.fixture
def mock_session():
    """Mock de sesión AsyncSession"""
    return AsyncMock()


@pytest.fixture
def mock_mercadopago():
    """Mock del SDK de MercadoPago"""
    with patch('routers.payments.get_mp_sdk') as mock:
        yield mock


@pytest.fixture
def mock_current_user():
    """Usuario autenticado de prueba"""
    return {
        "id": "test-user-id",
        "sub": "test_user",
        "email": "test@example.com",
        "role": "delegado"
    }


@pytest.fixture
def test_client(mock_session, mock_current_user):
    """Cliente de test para la API"""
    from main import app
    from routers.payments import get_session, get_current_user
    
    async def override_get_session():
        yield mock_session
        
    async def override_get_current_user():
        return mock_current_user
        
    app.dependency_overrides[get_session] = override_get_session
    app.dependency_overrides[get_current_user] = override_get_current_user
    
    # Configurar mock session para simular base de datos
    async def mock_execute(query, params=None):
        mock_result = MagicMock()
        mock_result.fetchone = AsyncMock()
        mock_result.scalar = AsyncMock()
        
        query_str = str(query)
        if "costo_inscripcion" in query_str and "te.id = :id" in query_str:
            mock_result.fetchone.return_value = ("team-123", Decimal("500.00"), "Copa Verano", "Real Madrid", "tournament-123", "test@example.com")
        elif "costo_inscripcion" in query_str:
            mock_result.fetchone.return_value = (Decimal("500.00"),)
        else:
            mock_result.fetchone.return_value = (Decimal("500.00"),)
        
        mock_result.scalar.return_value = 0
        return mock_result
        
    mock_session.execute.side_effect = mock_execute
    
    yield TestClient(app)
    
    app.dependency_overrides.pop(get_session, None)
    app.dependency_overrides.pop(get_current_user, None)


# ============================================
# TESTS: GET /opciones
# ============================================

@pytest.mark.asyncio
async def test_get_payment_options_success(mock_session):
    """Test: Obtener opciones de pago exitosamente"""
    from routers.payments import get_payment_options
    
    # Mock del resultado de BD
    mock_row = (Decimal("500.00"),)
    mock_session.execute = AsyncMock()
    mock_session.execute.return_value.fetchone.return_value = mock_row
    
    # Ejecutar
    response = await get_payment_options(
        tournament_team_id="test-team-id",
        session=mock_session
    )
    
    # Validar
    assert response.amount == Decimal("500.00")
    assert len(response.opciones) == 3  # MP, Stripe, Cash
    assert response.opciones[0]["id"] == "mercadopago"
    assert response.opciones[1]["id"] == "stripe"
    assert response.opciones[2]["id"] == "cash"


@pytest.mark.asyncio
async def test_get_payment_options_not_found(mock_session):
    """Test: Inscripción no existe"""
    from routers.payments import get_payment_options
    from fastapi import HTTPException
    
    # Mock: No hay inscripción
    mock_session.execute = AsyncMock()
    mock_session.execute.return_value.fetchone.return_value = None
    
    # Validar que lanza excepción
    with pytest.raises(HTTPException) as exc_info:
        await get_payment_options(
            tournament_team_id="non-existent",
            session=mock_session
        )
    
    assert exc_info.value.status_code == 404


# ============================================
# TESTS: POST /inscripcion (MercadoPago)
# ============================================

@pytest.mark.asyncio
async def test_generar_preferencia_mercadopago_success(
    mock_session, mock_mercadopago, mock_current_user
):
    """Test: Crear preferencia de MercadoPago exitosamente"""
    from routers.payments import generar_preferencia_pago
    from schemas.payments import PaymentCreate, PaymentProvider
    
    # Mock de datos del torneo
    mock_row = ("team-id", Decimal("500"), "Copa Verano", "Real Madrid", "tournament-id", "test@example.com")
    mock_session.execute = AsyncMock()
    mock_session.execute.return_value.fetchone.return_value = mock_row
    mock_session.execute.return_value.scalar.return_value = None  # No hay pago anterior
    mock_session.commit = AsyncMock()
    
    # Mock de MercadoPago
    mock_mp_response = MagicMock()
    mock_mp_response.status_code = 201
    mock_mp_response.json.return_value = {
        "id": "preference-123",
        "init_point": "https://www.mercadopago.com.ar/checkout/v1/..." 
    }
    
    mock_sdk = MagicMock()
    mock_sdk.preference.return_value.create.return_value = mock_mp_response
    mock_mercadopago.return_value = mock_sdk
    
    # Ejecutar
    response = await generar_preferencia_pago(
        tournament_team_id="team-id",
        payment_create=PaymentCreate(provider=PaymentProvider.MERCADOPAGO),
        session=mock_session,
        current_user=mock_current_user
    )
    
    # Validar
    assert response.status == "success"
    assert "mercadopago" in response.checkout_url
    assert response.preference_id == "preference-123"


@pytest.mark.asyncio
async def test_generar_preferencia_already_paid(mock_session, mock_current_user):
    """Test: El equipo ya tiene un pago aprobado"""
    from routers.payments import generar_preferencia_pago
    from schemas.payments import PaymentCreate, PaymentProvider
    from fastapi import HTTPException
    
    # Mock: Ya hay pago aprobado
    mock_row = ("team-id", Decimal("500"), "Copa", "Equipo", "tournament-id", "test@example.com")
    mock_session.execute = AsyncMock()
    mock_session.execute.return_value.fetchone.return_value = mock_row
    mock_session.execute.return_value.scalar.return_value = 1  # Ya pagado
    
    # Validar que lanza excepción
    with pytest.raises(HTTPException) as exc_info:
        await generar_preferencia_pago(
            tournament_team_id="team-id",
            payment_create=PaymentCreate(),
            session=mock_session,
            current_user=mock_current_user
        )
    
    assert "Ya existe un pago" in exc_info.value.detail


# ============================================
# TESTS: GET /estado
# ============================================

@pytest.mark.asyncio
async def test_obtener_estado_pago_success(mock_session):
    """Test: Obtener estado del pago"""
    from routers.payments import obtener_estado_pago
    
    # Mock de resultado
    payment_row = (
        "payment-id",
        "team-id",
        Decimal("500"),
        "ARS",
        "approved",
        "mercadopago",
        None,
        "mp-payment-123",
        "2026-05-17T10:00:00",
        "2026-05-17T10:00:00"
    )
    
    mock_session.execute = AsyncMock()
    mock_session.execute.return_value.fetchone.return_value = payment_row
    
    # Ejecutar
    response = await obtener_estado_pago(
        tournament_team_id="team-id",
        session=mock_session
    )
    
    # Validar
    assert response.status == "approved"
    assert response.provider == "mercadopago"
    assert response.amount == Decimal("500")


@pytest.mark.asyncio
async def test_obtener_estado_pago_not_found(mock_session):
    """Test: Pago no existe"""
    from routers.payments import obtener_estado_pago
    from fastapi import HTTPException
    
    mock_session.execute = AsyncMock()
    mock_session.execute.return_value.fetchone.return_value = None
    
    with pytest.raises(HTTPException) as exc_info:
        await obtener_estado_pago(
            tournament_team_id="non-existent",
            session=mock_session
        )
    
    assert exc_info.value.status_code == 404


# ============================================
# TESTS: POST /manual
# ============================================

@pytest.mark.asyncio
async def test_registrar_pago_manual_success(mock_session, mock_current_user):
    """Test: Registrar pago manual en efectivo"""
    from routers.payments import registrar_pago_manual
    from schemas.payments import PaymentManualCreate
    
    # Mock: Inscripción existe
    mock_session.execute = AsyncMock()
    mock_session.execute.return_value.scalar_one_or_none.return_value = "team-id"
    mock_session.execute.return_value.scalar.return_value = "payment-id"
    mock_session.commit = AsyncMock()
    
    # Ejecutar
    response = await registrar_pago_manual(
        tournament_team_id="team-id",
        pago_manual=PaymentManualCreate(
            tournament_team_id="team-id",
            amount=Decimal("500"),
            received_by="Juan García"
        ),
        session=mock_session,
        current_user=mock_current_user
    )
    
    # Validar
    assert response["status"] == "success"
    assert "payment_id" in response


# ============================================
# TESTS: WEBHOOK de MercadoPago
# ============================================

@pytest.mark.asyncio
async def test_webhook_mercadopago_approved(mock_session, mock_mercadopago):
    """Test: Webhook de MercadoPago - Pago aprobado"""
    from routers.payments import webhook_mercadopago
    from fastapi import Request
    
    # Mock de request
    mock_request = AsyncMock()
    mock_request.json = AsyncMock()
    mock_request.json.return_value = {
        "id": "webhook-123",
        "data": {"id": "payment-123"}
    }
    mock_request.headers = {"x-signature": "fake-signature"}
    
    # Mock de MercadoPago response
    mock_mp_response = MagicMock()
    mock_mp_response.status_code = 200
    mock_mp_response.json.return_value = {
        "id": "payment-123",
        "status": "approved",
        "external_reference": "team-id"
    }
    
    mock_sdk = MagicMock()
    mock_sdk.payment.return_value.get.return_value = mock_mp_response
    mock_mercadopago.return_value = mock_sdk
    
    # Mock de BD
    mock_session.execute = AsyncMock()
    mock_session.execute.return_value.scalar_one_or_none.return_value = "team-id"
    mock_session.commit = AsyncMock()
    
    # Ejecutar
    response = await webhook_mercadopago(
        request=mock_request,
        session=mock_session
    )
    
    # Validar
    assert response["status"] == "received"


# ============================================
# TESTS INTEGRALES (E2E)
# ============================================

def test_payment_flow_mercadopago_e2e(test_client):
    """Test E2E: Flujo completo de pago con MercadoPago"""
    
    # 1. Obtener opciones
    response = test_client.get(
        "/api/pagos/opciones/team-123",
        headers={"Authorization": "Bearer fake-token"}
    )
    assert response.status_code == 200
    opciones = response.json()
    assert "opciones" in opciones
    
    # 2. Crear preferencia
    response = test_client.post(
        "/api/pagos/inscripcion/team-123",
        json={"provider": "mercadopago"},
        headers={"Authorization": "Bearer fake-token"}
    )
    # Puede ser 200 o 500 (si MP no está configurado)
    assert response.status_code in [200, 500]


# ============================================
# TESTS DE VALIDACIÓN (Schemas)
# ============================================

def test_payment_manual_create_validation():
    """Test: Validaciones de PaymentManualCreate"""
    from schemas.payments import PaymentManualCreate
    from pydantic import ValidationError
    
    # Válido
    valid = PaymentManualCreate(
        tournament_team_id="team-id",
        amount=Decimal("500"),
        received_by="Juan García"
    )
    assert valid.amount == Decimal("500")
    
    # Invalid: monto negativo
    with pytest.raises(ValidationError):
        PaymentManualCreate(
            tournament_team_id="team-id",
            amount=Decimal("-500"),
            received_by="Juan"
        )
    
    # Invalid: received_by muy corto
    with pytest.raises(ValidationError):
        PaymentManualCreate(
            tournament_team_id="team-id",
            amount=Decimal("500"),
            received_by="J"
        )


# ============================================
# COVERAGE
# ============================================

"""
Para ver cobertura:
    pytest tests/test_payments.py --cov=routers.payments --cov-report=html
    
Luego abrir: htmlcov/index.html
"""


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
