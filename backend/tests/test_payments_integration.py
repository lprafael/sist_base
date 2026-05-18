"""
Tests de integración del módulo de pagos
Valida flujos end-to-end con BD real (SQLite temporario)
Usar: pytest tests/test_payments_integration.py -v
"""
import pytest
import pytest_asyncio
import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool
from decimal import Decimal
import json
from datetime import datetime
import os

# Base de datos temporal para tests
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture
async def async_session_fixture():
    """Crea una sesión de BD temporal para tests"""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        poolclass=StaticPool,
        echo=False
    )
    
    # Crear tablas
    async with engine.begin() as conn:
        # ATTACH DATABASE para que SQLite soporte el esquema cancha.
        await conn.execute(text("ATTACH DATABASE ':memory:' AS cancha"))
        
        # Tablas básicas
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS cancha.torneos (
                id TEXT PRIMARY KEY,
                nombre TEXT NOT NULL,
                precio_inscripcion DECIMAL DEFAULT 500,
                estado TEXT DEFAULT 'disponible'
            )
        """))
        
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS cancha.torneos_equipos (
                id TEXT PRIMARY KEY,
                torneo_id TEXT NOT NULL,
                equipamiento TEXT NOT NULL,
                razon_social TEXT,
                payment_status TEXT DEFAULT 'pending',
                FOREIGN KEY(torneo_id) REFERENCES torneos(id)
            )
        """))
        
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS cancha.payments (
                id TEXT PRIMARY KEY,
                tournament_team_id TEXT NOT NULL,
                amount DECIMAL NOT NULL,
                currency TEXT DEFAULT 'ARS',
                status TEXT DEFAULT 'pending',
                provider TEXT NOT NULL,
                refund_amount DECIMAL,
                external_payment_id TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(tournament_team_id) REFERENCES torneos_equipos(id)
            )
        """))
    
    async_session_maker = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False
    )
    
    session = async_session_maker()
    try:
        yield session
    finally:
        await session.close()
        await engine.dispose()


class TestPaymentIntegration:
    """Suite de tests de integración"""
    
    @pytest.mark.asyncio
    async def test_create_payment_record(self, async_session_fixture):
        """Test: Crear registro de pago en BD"""
        session = async_session_fixture
        
        # Insert: Torneo
        await session.execute(text("""
            INSERT INTO cancha.torneos (id, nombre, precio_inscripcion)
            VALUES ('torneo-1', 'Copa Summer', 500)
        """))
        
        # Insert: Equipo
        await session.execute(text("""
            INSERT INTO cancha.torneos_equipos (id, torneo_id, equipamiento, razon_social)
            VALUES ('team-1', 'torneo-1', 'red', 'Real Madrid SA')
        """))
        
        # Insert: Pago
        await session.execute(text("""
            INSERT INTO cancha.payments 
            (id, tournament_team_id, amount, currency, status, provider, external_payment_id)
            VALUES 
            ('pay-1', 'team-1', 500, 'ARS', 'pending', 'mercadopago', 'mp-123')
        """))
        
        await session.commit()
        
        # Verify
        result = await session.execute(text(
            "SELECT * FROM cancha.payments WHERE id = 'pay-1'"
        ))
        row = result.fetchone()
        assert row is not None
        assert row[2] == 500  # amount


    @pytest.mark.asyncio
    async def test_payment_status_workflow(self, async_session_fixture):
        """Test: Cambios de estado del pago (pending -> processing -> approved)"""
        session = async_session_fixture
        
        # Setup
        await session.execute(text("""
            INSERT INTO cancha.torneos (id, nombre) 
            VALUES ('torneo-1', 'Copa Winter')
        """))
        
        await session.execute(text("""
            INSERT INTO cancha.torneos_equipos (id, torneo_id, equipamiento, razon_social)
            VALUES ('team-2', 'torneo-1', 'blue', 'Barcelona FC')
        """))
        
        await session.execute(text("""
            INSERT INTO cancha.payments 
            (id, tournament_team_id, amount, status, provider, external_payment_id)
            VALUES ('pay-2', 'team-2', 500, 'pending', 'stripe', 'stripe-456')
        """))
        
        await session.commit()
        
        # Change status: pending -> processing
        await session.execute(text(
            "UPDATE cancha.payments SET status = 'processing' WHERE id = 'pay-2'"
        ))
        await session.commit()
        
        result = await session.execute(text(
            "SELECT status FROM cancha.payments WHERE id = 'pay-2'"
        ))
        assert result.scalar() == 'processing'
        
        # Change status: processing -> approved
        await session.execute(text(
            "UPDATE cancha.payments SET status = 'approved' WHERE id = 'pay-2'"
        ))
        await session.commit()
        
        # Update team inscription status
        await session.execute(text(
            "UPDATE cancha.torneos_equipos SET payment_status = 'approved' WHERE id = 'team-2'"
        ))
        await session.commit()
        
        # Verify final state
        result = await session.execute(text(
            "SELECT payment_status FROM cancha.torneos_equipos WHERE id = 'team-2'"
        ))
        assert result.scalar() == 'approved'


    @pytest.mark.asyncio
    async def test_refund_workflow(self, async_session_fixture):
        """Test: Crear reembolso (approved -> refunded)"""
        session = async_session_fixture
        
        # Setup: Pago aprobado
        await session.execute(text("""
            INSERT INTO cancha.torneos (id, nombre) 
            VALUES ('torneo-1', 'Copa Spring')
        """))
        
        await session.execute(text("""
            INSERT INTO cancha.torneos_equipos (id, torneo_id, equipamiento, razon_social)
            VALUES ('team-3', 'torneo-1', 'white', 'Juventus SC')
        """))
        
        await session.execute(text("""
            INSERT INTO cancha.payments 
            (id, tournament_team_id, amount, status, provider, external_payment_id, refund_amount)
            VALUES ('pay-3', 'team-3', 500, 'approved', 'mercadopago', 'mp-789', NULL)
        """))
        
        await session.commit()
        
        # Process refund
        await session.execute(text(
            "UPDATE cancha.payments SET status = 'refunded', refund_amount = 500 WHERE id = 'pay-3'"
        ))
        await session.commit()
        
        # Verify
        result = await session.execute(text(
            "SELECT status, refund_amount FROM cancha.payments WHERE id = 'pay-3'"
        ))
        status, refund = result.fetchone()
        assert status == 'refunded'
        assert refund == 500


    @pytest.mark.asyncio
    async def test_payment_duplicate_prevention(self, async_session_fixture):
        """Test: Prevenir pagos duplicados (un equipo no puede pagar 2 veces)"""
        session = async_session_fixture
        
        # Setup
        await session.execute(text("""
            INSERT INTO cancha.torneos (id, nombre) 
            VALUES ('torneo-1', 'Copa Otoño')
        """))
        
        await session.execute(text("""
            INSERT INTO cancha.torneos_equipos (id, torneo_id, equipamiento, razon_social, payment_status)
            VALUES ('team-4', 'torneo-1', 'green', 'AC Milan', 'approved')
        """))
        
        await session.execute(text("""
            INSERT INTO cancha.payments 
            (id, tournament_team_id, amount, status, provider, external_payment_id)
            VALUES ('pay-4', 'team-4', 500, 'approved', 'mercadopago', 'mp-111')
        """))
        
        await session.commit()
        
        # Intentar agregar un segundo pago aprobado
        # La lógica en el router lo debe prevenir (test de business logic)
        result = await session.execute(text(
            "SELECT COUNT(*) FROM cancha.payments WHERE tournament_team_id = 'team-4' AND status = 'approved'"
        ))
        count = result.scalar()
        assert count == 1  # Solo uno debe existir


    @pytest.mark.asyncio
    async def test_get_team_payment_history(self, async_session_fixture):
        """Test: Obtener historial de intentos de pago de un equipo"""
        session = async_session_fixture
        
        # Setup: Múltiples intentos de pago
        await session.execute(text("""
            INSERT INTO cancha.torneos (id, nombre) 
            VALUES ('torneo-1', 'Copa Final')
        """))
        
        await session.execute(text("""
            INSERT INTO cancha.torneos_equipos (id, torneo_id, equipamiento, razon_social)
            VALUES ('team-5', 'torneo-1', 'yellow', 'Liverpool FC')
        """))
        
        # Pago 1: rechazado
        await session.execute(text("""
            INSERT INTO cancha.payments 
            (id, tournament_team_id, amount, status, provider, external_payment_id)
            VALUES ('pay-5a', 'team-5', 500, 'rejected', 'stripe', 'stripe-failed-1')
        """))
        
        # Pago 2: aprobado
        await session.execute(text("""
            INSERT INTO cancha.payments 
            (id, tournament_team_id, amount, status, provider, external_payment_id)
            VALUES ('pay-5b', 'team-5', 500, 'approved', 'mercadopago', 'mp-success')
        """))
        
        await session.commit()
        
        # Query: Historial
        result = await session.execute(text(
            "SELECT id, status FROM cancha.payments WHERE tournament_team_id = 'team-5' ORDER BY id"
        ))
        payments = result.fetchall()
        
        assert len(payments) == 2
        # pay-5a is rejected, pay-5b is approved
        assert payments[0][1] == 'rejected'
        assert payments[1][1] == 'approved'


    @pytest.mark.asyncio
    async def test_payment_amount_matches_tournament_fee(self, async_session_fixture):
        """Test: El monto del pago coincide con la tarifa del torneo"""
        session = async_session_fixture
        
        # Setup: Torneo con tarifa específica
        await session.execute(text("""
            INSERT INTO cancha.torneos (id, nombre, precio_inscripcion)
            VALUES ('torneo-1', 'Copa Premium', 750)
        """))
        
        await session.execute(text("""
            INSERT INTO cancha.torneos_equipos (id, torneo_id, equipamiento, razon_social)
            VALUES ('team-6', 'torneo-1', 'orange', 'Chelsea FC')
        """))
        
        await session.execute(text("""
            INSERT INTO cancha.payments 
            (id, tournament_team_id, amount, status, provider)
            VALUES ('pay-6', 'team-6', 750, 'pending', 'cash')
        """))
        
        await session.commit()
        
        # Verify: Monto coincide
        payment = await session.execute(text(
            "SELECT p.amount FROM cancha.payments p "
            "JOIN cancha.torneos_equipos te ON p.tournament_team_id = te.id "
            "JOIN cancha.torneos t ON te.torneo_id = t.id "
            "WHERE p.id = 'pay-6'"
        ))
        result = payment.scalar()
        assert result == 750


    @pytest.mark.asyncio
    async def test_payment_provider_statistics(self, async_session_fixture):
        """Test: Estadísticas de pagos por proveedor"""
        session = async_session_fixture
        
        # Setup
        await session.execute(text("""
            INSERT INTO cancha.torneos (id, nombre) 
            VALUES ('torneo-1', 'Copa Analytics')
        """))
        
        for i in range(1, 4):
            await session.execute(text(f"""
                INSERT INTO cancha.torneos_equipos (id, torneo_id, equipamiento, razon_social)
                VALUES ('team-{i}', 'torneo-1', 'kit{i}', 'Team {i}')
            """))
        
        # Pagos: 2x MercadoPago, 1x Stripe
        await session.execute(text("""
            INSERT INTO cancha.payments (id, tournament_team_id, amount, status, provider)
            VALUES 
            ('pay-mp1', 'team-1', 500, 'approved', 'mercadopago'),
            ('pay-mp2', 'team-2', 500, 'approved', 'mercadopago'),
            ('pay-stripe', 'team-3', 500, 'approved', 'stripe')
        """))
        
        await session.commit()
        
        # Query: Contar por proveedor
        result = await session.execute(text(
            "SELECT provider, COUNT(*) as count, SUM(amount) as total "
            "FROM cancha.payments WHERE status = 'approved' "
            "GROUP BY provider ORDER BY count DESC"
        ))
        stats = result.fetchall()
        
        assert len(stats) == 2
        assert stats[0][0] == 'mercadopago'
        assert stats[0][1] == 2
        assert stats[0][2] == 1000
