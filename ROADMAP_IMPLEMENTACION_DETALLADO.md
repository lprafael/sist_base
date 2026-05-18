# Roadmap Detallado: Completar Módulo de Torneos
**Prioridad:** CRÍTICA  
**Deadline Sugerido:** 8 semanas  
**Equipos Requeridos:** 2 fullstack + 1 QA

---

## 📌 RESUMEN EJECUTIVO

El módulo está **30% completo**. Para llevarlo a producción se requieren:
- **2 semanas:** Base de datos + pagos (P0 bloqueante)
- **2 semanas:** Lógica de negocio (sorteo, fixture, sanciones)
- **2 semanas:** Panel administrativo
- **1 semana:** Vistas públicas mejoradas
- **1 semana:** Tests + deploy

**Total: 8 semanas, sin contar análisis de requisitos**

---

## 🗓️ SPRINT 1 (Semana 1-2): INFRAESTRUCTURA DE PAGOS

### Objetivo
Implementar la base para que los usuarios paguen inscripciones.

### Entregas

#### 1.1 - Crear Tablas en PostgreSQL (2 horas)

```sql
-- payments.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS cancha.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_team_id UUID REFERENCES cancha.torneos_equipos(id),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'PYG',
    provider VARCHAR(20) NOT NULL, -- 'mercadopago' | 'stripe' | 'cash'
    provider_payment_id VARCHAR(255),
    provider_preference_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending', -- pending|processing|approved|rejected|refunded|cancelled
    paid_at TIMESTAMPTZ,
    refunded_at TIMESTAMPTZ,
    refund_amount DECIMAL(10,2),
    received_by VARCHAR(255), -- para pagos en efectivo
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_tournament_team ON cancha.payments(tournament_team_id);
CREATE INDEX idx_payments_provider_id ON cancha.payments(provider_payment_id);
CREATE INDEX idx_payments_status ON cancha.payments(status);
CREATE INDEX idx_payments_created ON cancha.payments(created_at);

-- Alter torneos_equipos para agregar campos de pago
ALTER TABLE cancha.torneos_equipos ADD COLUMN IF NOT EXISTS 
    payment_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE cancha.torneos_equipos ADD COLUMN IF NOT EXISTS 
    delegado_nombre VARCHAR(255);
ALTER TABLE cancha.torneos_equipos ADD COLUMN IF NOT EXISTS 
    delegado_telefono VARCHAR(20);
ALTER TABLE cancha.torneos_equipos ADD COLUMN IF NOT EXISTS 
    delegado_email VARCHAR(255);
```

**Asignar a:** DBA / Backend  
**Revisar con:** Scrum Master

---

#### 1.2 - Instalar Dependencias de MercadoPago (1 hora)

```bash
# En backend/requirements.txt, agregar:
mercadopago==3.0.0
stripe==7.4.0
python-dateutil==2.8.2

# Luego:
pip install -r requirements.txt
```

**Asignar a:** DevOps / Backend  
**Comandos:**
```bash
cd backend
pip install mercadopago stripe
pip freeze > requirements.txt
```

---

#### 1.3 - Crear Endpoint de Generación de Preferencia (4 horas)

**Archivo:** `backend/routers/payments.py` (CREAR)

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
import mercadopago

router = APIRouter(prefix="/api/pagos", tags=["pagos"])

# Configurar SDK (usar env vars)
SDK = mercadopago.SDK(token=os.getenv("MERCADOPAGO_ACCESS_TOKEN"))

@router.post("/inscripcion/{tournament_team_id}")
async def generar_preferencia_pago(
    tournament_team_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Genera una preferencia de pago en MercadoPago para inscribir un equipo.
    
    Flujo:
    1. Verificar que el equipo no esté ya pagado
    2. Obtener monto del torneo
    3. Crear preferencia en MP
    4. Guardar payment record con status=pending
    5. Retornar URL de checkout
    """
    try:
        # 1. Obtener registro de inscripción
        query = text("""
            SELECT te.id, t.costo_inscripcion, t.nombre, te.nombre_equipo
            FROM cancha.torneos_equipos te
            JOIN cancha.torneos t ON te.torneo_id = t.id
            WHERE te.id = :id
        """)
        result = await session.execute(query, {"id": tournament_team_id})
        row = result.fetchone()
        
        if not row:
            raise HTTPException(status_code=404, detail="Inscripción no encontrada")
        
        team_id, amount, torneo_nombre, equipo_nombre = row
        
        # 2. Verificar que no esté ya pagado
        exists = await session.execute(
            text("""
                SELECT COUNT(*) FROM cancha.payments 
                WHERE tournament_team_id = :id AND status = 'approved'
            """),
            {"id": tournament_team_id}
        )
        
        if exists.scalar() > 0:
            raise HTTPException(status_code=400, detail="Ya existe un pago aprobado")
        
        # 3. Crear preferencia en MercadoPago
        preference_data = {
            "items": [
                {
                    "title": f"Inscripción: {torneo_nombre} - {equipo_nombre}",
                    "quantity": 1,
                    "unit_price": float(amount)
                }
            ],
            "payer": {
                "email": current_user.get("email", "cliente@example.com")
            },
            "back_urls": {
                "success": f"{os.getenv('FRONTEND_URL')}/inscripcion/resultado?status=approved&id={tournament_team_id}",
                "failure": f"{os.getenv('FRONTEND_URL')}/inscripcion/resultado?status=rejected&id={tournament_team_id}",
                "pending": f"{os.getenv('FRONTEND_URL')}/inscripcion/resultado?status=pending&id={tournament_team_id}"
            },
            "external_reference": str(tournament_team_id),
            "notification_url": f"{os.getenv('API_URL')}/api/pagos/webhook/mercadopago"
        }
        
        preference_response = SDK.preference().create(preference_data)
        
        if preference_response.status_code != 201:
            raise HTTPException(status_code=500, detail="Error creando preferencia MP")
        
        preference = preference_response.json()
        
        # 4. Guardar payment record
        insert = text("""
            INSERT INTO cancha.payments 
            (tournament_team_id, amount, provider, provider_preference_id, status, metadata)
            VALUES (:team_id, :amount, 'mercadopago', :pref_id, 'pending', :metadata)
            RETURNING id
        """)
        
        result = await session.execute(
            insert,
            {
                "team_id": tournament_team_id,
                "amount": amount,
                "pref_id": preference["id"],
                "metadata": json.dumps({"tournament_name": torneo_nombre})
            }
        )
        
        await session.commit()
        
        # 5. Retornar link de checkout
        return {
            "status": "success",
            "checkout_url": preference["init_point"],
            "preference_id": preference["id"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
```

**Asignar a:** Backend senior  
**Revisar:** PR con linting, docstrings  
**Tests:** Unitarios con mock de MP

---

#### 1.4 - Crear Webhook de MercadoPago (4 horas)

**Archivo:** `backend/routers/payments.py` (continuar)

```python
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
import base64

@router.post("/webhook/mercadopago")
async def webhook_mercadopago(
    request: Request,
    session: AsyncSession = Depends(get_session)
):
    """
    Webhook de MercadoPago. Recibe notificaciones de pago.
    
    Validación:
    1. Extraer firma del header x-signature
    2. Verificar firma con public key de MP
    3. Fetch al endpoint de MP para confirmar pago (anti-man-in-the-middle)
    4. Actualizar BD
    """
    
    try:
        # 1. Obtener datos del webhook
        body = await request.json()
        signature = request.headers.get("x-signature", "")
        
        if not signature:
            raise HTTPException(status_code=400, detail="Missing signature")
        
        # 2. Extraer data y request_id del body
        data = body.get("data", {})
        request_id = body.get("id", "")
        
        # 3. Verificar firma (MP proporciona esto)
        if not _verify_mercadopago_signature(str(body), signature):
            print("❌ Firma inválida de MercadoPago")
            raise HTTPException(status_code=401, detail="Invalid signature")
        
        # 4. Fetch a MP para confirmar (crucial)
        payment_id = data.get("id")
        mp_payment = SDK.payment().get(payment_id)
        
        if mp_payment.status_code != 200:
            raise HTTPException(status_code=500, detail="Could not verify with MP")
        
        payment_data = mp_payment.json()
        external_ref = payment_data.get("external_reference")
        
        if not external_ref:
            print("❌ external_reference no encontrado")
            raise HTTPException(status_code=400, detail="Invalid reference")
        
        # 5. Determinar estado
        mp_status = payment_data.get("status")  # approved, rejected, pending, cancelled
        
        payment_status_map = {
            "approved": "approved",
            "pending": "processing",
            "in_process": "processing",
            "rejected": "rejected",
            "cancelled": "cancelled"
        }
        
        new_status = payment_status_map.get(mp_status, "pending")
        
        # 6. Actualizar BD
        update = text("""
            UPDATE cancha.payments
            SET status = :status,
                provider_payment_id = :payment_id,
                paid_at = CASE WHEN :status = 'approved' THEN NOW() ELSE paid_at END,
                updated_at = NOW(),
                metadata = jsonb_set(metadata, '{mp_status}', to_jsonb(:mp_status::text))
            WHERE provider_preference_id = :pref_id
            RETURNING tournament_team_id
        """)
        
        result = await session.execute(
            update,
            {
                "status": new_status,
                "payment_id": str(payment_id),
                "mp_status": mp_status,
                "pref_id": external_ref
            }
        )
        
        tournament_team_id = result.scalar_one_or_none()
        await session.commit()
        
        # 7. Si fue aprobado, actualizar estado de inscripción
        if new_status == "approved" and tournament_team_id:
            update_team = text("""
                UPDATE cancha.torneos_equipos
                SET estado_inscripcion = 'confirmado', updated_at = NOW()
                WHERE id = :id
            """)
            
            await session.execute(update_team, {"id": tournament_team_id})
            await session.commit()
            
            print(f"✅ Pago confirmado para equipo {tournament_team_id}")
        
        return {"status": "received"}
        
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        print(f"❌ Error en webhook: {e}")
        import traceback
        traceback.print_exc()
        # Retornar 200 de todas formas (MP no reintente)
        return {"status": "error", "message": str(e)}

def _verify_mercadopago_signature(body: str, signature: str) -> bool:
    """
    Verificar firma del webhook de MercadoPago.
    MP usa HMAC con SHA256.
    """
    import hmac
    import hashlib
    
    secret = os.getenv("MERCADOPAGO_WEBHOOK_SECRET", "")
    
    # Crear HMAC
    expected = hmac.new(
        secret.encode(),
        body.encode(),
        hashlib.sha256
    ).hexdigest()
    
    # Comparar (usar constant-time para evitar timing attacks)
    return hmac.compare_digest(expected, signature)
```

**Asignar a:** Backend senior  
**Testing:** Simular webhook con curl/Postman  
**Seguridad:** Code review por especialista

---

#### 1.5 - Crear Tests del Módulo de Pagos (3 horas)

**Archivo:** `backend/tests/test_payments.py` (CREAR)

```python
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

@pytest.mark.asyncio
async def test_generar_preferencia_pago_exitoso(mock_session, mock_mercadopago):
    """Test de generación exitosa de preferencia"""
    
    mock_mercadopago.preference().create.return_value = MagicMock(
        status_code=201,
        json=lambda: {
            "id": "123456789",
            "init_point": "https://www.mercadopago.com.ar/checkout/v1/..."
        }
    )
    
    response = client.post(
        "/api/pagos/inscripcion/tournament-team-uuid",
        headers={"Authorization": "Bearer fake-token"}
    )
    
    assert response.status_code == 200
    assert "checkout_url" in response.json()

@pytest.mark.asyncio
async def test_webhook_mercadopago_valida_firma():
    """Test que webhook rechaza firma inválida"""
    
    response = client.post(
        "/api/pagos/webhook/mercadopago",
        json={"id": "123", "data": {"id": "payment-123"}},
        headers={"x-signature": "invalid-signature"}
    )
    
    assert response.status_code == 401
```

**Asignar a:** QA / Backend junior  
**Cobertura:** Mínimo 70%

---

### Deliverables de Sprint 1

- [x] Schema BD completo para pagos
- [x] Endpoint de generación de preferencia
- [x] Webhook validado y testeado
- [x] Integración con MercadoPago
- [x] Tests unitarios


**Duración total:** 14 horas  
**QA:** 2 horas  
**Total con buffer:** 18 horas (2.25 días)

---

## 🗓️ SPRINT 2 (Semana 3-4): LÓGICA DE NEGOCIO

### Objetivo
Completar la lógica de torneos (goles, tarjetas, tabla de posiciones, sorteo).

### 2.1 - Crear Tablas de Goles, Tarjetas y Sanciones (2 horas)

```sql
-- goals_cards_sanctions.sql

CREATE TABLE cancha.tournament_players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_team_id UUID NOT NULL REFERENCES cancha.torneos_equipos(id),
    nombre VARCHAR(255) NOT NULL,
    dni VARCHAR(20) NOT NULL,
    fecha_nacimiento DATE,
    numero_camiseta INT NOT NULL,
    posicion VARCHAR(50), -- GK, DEF, MID, FWD
    foto_url VARCHAR(500),
    estado VARCHAR(20) DEFAULT 'active', -- active, suspended, injured
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tournament_team_id, dni),
    UNIQUE(tournament_team_id, numero_camiseta)
);

CREATE TABLE cancha.goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES cancha.torneos_partidos(id),
    player_id UUID REFERENCES cancha.tournament_players(id),
    team_id UUID NOT NULL REFERENCES cancha.torneos_equipos(id),
    minute INT NOT NULL,
    type VARCHAR(20) DEFAULT 'normal', -- normal, penalty, own_goal, header
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES sistema.usuarios(id)
);

CREATE TABLE cancha.cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES cancha.torneos_partidos(id),
    player_id UUID NOT NULL REFERENCES cancha.tournament_players(id),
    team_id UUID NOT NULL REFERENCES cancha.torneos_equipos(id),
    minute INT NOT NULL,
    type VARCHAR(20) NOT NULL, -- yellow, red, second_yellow
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES sistema.usuarios(id)
);

CREATE TABLE cancha.sanctions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES cancha.tournament_players(id),
    tournament_id UUID NOT NULL REFERENCES cancha.torneos(id),
    card_id UUID REFERENCES cancha.cards(id),
    reason VARCHAR(500) NOT NULL,
    severity VARCHAR(20) DEFAULT 'mild', -- mild, serious, very_serious
    matches_suspended INT DEFAULT 1,
    matches_served INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active', -- active, served, appealing, overturned
    appeal_reason TEXT,
    appeal_resolved_at TIMESTAMPTZ,
    appeal_resolved_by UUID REFERENCES sistema.usuarios(id),
    created_by UUID REFERENCES sistema.usuarios(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_goals_match ON cancha.goals(match_id);
CREATE INDEX idx_goals_player ON cancha.goals(player_id);
CREATE INDEX idx_cards_match ON cancha.cards(match_id);
CREATE INDEX idx_cards_player ON cancha.cards(player_id);
CREATE INDEX idx_sanctions_player ON cancha.sanctions(player_id);
CREATE INDEX idx_sanctions_tournament ON cancha.sanctions(tournament_id);
```

---

### 2.2 - Crear Materialized View de Standings (2 horas)

```sql
-- standings.sql

CREATE MATERIALIZED VIEW cancha.standings AS
SELECT
    t.id AS tournament_id,
    tte.id AS tournament_team_id,
    tte.nombre_equipo,
    COUNT(DISTINCT m.id) AS played,
    COUNT(DISTINCT CASE 
        WHEN (m.equipo_local_id = tte.id AND m.resultado_local > m.resultado_visitante)
          OR (m.equipo_visitante_id = tte.id AND m.resultado_visitante > m.resultado_local)
        THEN m.id
    END) AS won,
    COUNT(DISTINCT CASE 
        WHEN m.resultado_local = m.resultado_visitante
        THEN m.id
    END) AS drawn,
    COUNT(DISTINCT CASE 
        WHEN (m.equipo_local_id = tte.id AND m.resultado_local < m.resultado_visitante)
          OR (m.equipo_visitante_id = tte.id AND m.resultado_visitante < m.resultado_local)
        THEN m.id
    END) AS lost,
    COALESCE(SUM(CASE 
        WHEN m.equipo_local_id = tte.id THEN m.resultado_local 
        WHEN m.equipo_visitante_id = tte.id THEN m.resultado_visitante 
        ELSE 0 
    END), 0) AS goals_for,
    COALESCE(SUM(CASE 
        WHEN m.equipo_local_id = tte.id THEN m.resultado_visitante 
        WHEN m.equipo_visitante_id = tte.id THEN m.resultado_local 
        ELSE 0 
    END), 0) AS goals_against,
    (COUNT(DISTINCT CASE 
        WHEN (m.equipo_local_id = tte.id AND m.resultado_local > m.resultado_visitante)
          OR (m.equipo_visitante_id = tte.id AND m.resultado_visitante > m.resultado_local)
        THEN m.id
    END) * 3 + COUNT(DISTINCT CASE 
        WHEN m.resultado_local = m.resultado_visitante
        THEN m.id
    END)) AS points
FROM cancha.torneos t
JOIN cancha.torneos_equipos tte ON tte.torneo_id = t.id
LEFT JOIN cancha.torneos_partidos m ON 
    (m.equipo_local_id = tte.id OR m.equipo_visitante_id = tte.id)
    AND m.estado = 'finalizado'
GROUP BY t.id, tte.id, tte.nombre_equipo
ORDER BY t.id, points DESC, goals_for - goals_against DESC;

CREATE INDEX idx_standings_tournament ON cancha.standings(tournament_id);
```

---

### 2.3 - Endpoints para Goles y Tarjetas (4 horas)

**Archivo:** `backend/routers/partidos.py` (CREAR)

```python
@router.post("/partidos/{partido_id}/goles")
async def registrar_gol(
    partido_id: str,
    gol: GoalCreate,  # minuto, player_id, tipo
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(check_permission("torneo_edit"))
):
    """Registra un gol en un partido"""
    
    # Validar partido existe
    partido = await session.execute(
        text("SELECT * FROM cancha.torneos_partidos WHERE id = :id"),
        {"id": partido_id}
    )
    match = partido.fetchone()
    if not match:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
    
    # Validar jugador existe y pertenece a uno de los dos equipos
    jugador = await session.execute(
        text("""
            SELECT tp.id, tp.team_id 
            FROM cancha.tournament_players tp
            WHERE tp.id = :player_id
            AND (tp.team_id = :team1 OR tp.team_id = :team2)
        """),
        {
            "player_id": gol.player_id,
            "team1": match.equipo_local_id,
            "team2": match.equipo_visitante_id
        }
    )
    
    if not jugador:
        raise HTTPException(status_code=400, detail="Jugador no válido para este partido")
    
    # Insertar gol
    insert = text("""
        INSERT INTO cancha.goals 
        (match_id, player_id, team_id, minute, type, created_by)
        VALUES (:match_id, :player_id, :team_id, :minute, :type, :user_id)
        RETURNING id
    """)
    
    result = await session.execute(
        insert,
        {
            "match_id": partido_id,
            "player_id": gol.player_id,
            "team_id": jugador.team_id,
            "minute": gol.minute,
            "type": gol.type,
            "user_id": current_user["id"]
        }
    )
    
    goal_id = result.scalar()
    await session.commit()
    
    # Refrescar tabla de posiciones
    await refresh_standings(session, match.torneo_id)
    
    return {"id": goal_id, "status": "created"}

@router.post("/partidos/{partido_id}/tarjetas")
async def registrar_tarjeta(
    partido_id: str,
    tarjeta: CardCreate,  # player_id, minuto, tipo
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(check_permission("torneo_edit"))
):
    """Registra una tarjeta en un partido"""
    
    # Similar al workflow de goles
    # Validar que el jugador no ya tenga roja en este partido
    
    # Si es segunda amarilla, convertir a roja
    if tarjeta.type == "second_yellow":
        existing_yellow = await session.execute(
            text("""
                SELECT COUNT(*) FROM cancha.cards
                WHERE match_id = :match_id 
                AND player_id = :player_id
                AND type = 'yellow'
            """),
            {"match_id": partido_id, "player_id": tarjeta.player_id}
        )
        
        if existing_yellow.scalar() > 0:
            tarjeta.type = "red"
    
    # Insertar tarjeta
    insert = text("""
        INSERT INTO cancha.cards 
        (match_id, player_id, team_id, minute, type, created_by)
        VALUES (...)
    """)
    
    # Si es roja, crear sanción automática
    if tarjeta.type == "red":
        await create_automatic_sanction(session, tarjeta.player_id, partido_id, current_user)
    
    return {"status": "created"}

async def create_automatic_sanction(
    session,
    player_id,
    match_id,
    current_user
):
    """Crea una sanción automática por tarjeta roja"""
    # Obtener config de torneo
    # Insertar en sanctions
    # Marcar jugador como suspended en próximos partidos
    pass

async def refresh_standings(session, tournament_id):
    """Refresca la materialized view de posiciones"""
    await session.execute(
        text("REFRESH MATERIALIZED VIEW cancha.standings")
    )
    await session.commit()
```

---

### 2.4 - Sorteo Aleatorio (3 horas)

**Archivo:** `backend/routers/torneos.py`

```python
from random import shuffle

@router.post("/torneos/{torneo_id}/sortear")
async def ejecutar_sorteo(
    torneo_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(check_permission("torneo_admin"))
):
    """
    Ejecuta sorteo confirmando todos los equipos estén pagos.
    Genera un seed guardable para reproducibilidad.
    """
    
    # 1. Verificar torneo existe y no tiene sorteo
    torneo = await session.execute(
        text("SELECT * FROM cancha.torneos WHERE id = :id"),
        {"id": torneo_id}
    )
    tournament = torneo.fetchone()
    
    if not tournament:
        raise HTTPException(status_code=404)
    
    if tournament.sorteo_ejecutado:
        raise HTTPException(status_code=400, detail="Sorteo ya ejecutado")
    
    # 2. Verificar todos los equipos confirmados están pagos
    sin_pagar = await session.execute(
        text("""
            SELECT COUNT(*) FROM cancha.torneos_equipos te
            LEFT JOIN cancha.payments p ON te.id = p.tournament_team_id 
                AND p.status = 'approved'
            WHERE te.torneo_id = :torneo_id
            AND te.estado_inscripcion = 'confirmado'
            AND p.id IS NULL
        """),
        {"torneo_id": torneo_id}
    )
    
    if sin_pagar.scalar() > 0:
        raise HTTPException(
            status_code=400, 
            detail="Hay equipos sin pago confirmado"
        )
    
    # 3. Obtener equipos y aplicar cabezas de serie
    equipos = await session.execute(
        text("""
            SELECT id, seed FROM cancha.torneos_equipos
            WHERE torneo_id = :id
            ORDER BY seed ASC, id ASC
        """),
        {"id": torneo_id}
    )
    
    teams = [row[0] for row in equipos.fetchall()]
    
    # 4. Aplicar Fisher-Yates con seed reproducible
    seed_value = int(time.time())
    random.seed(seed_value)
    shuffle(teams)
    
    # 5. Guardar seed en BD
    update = text("""
        UPDATE cancha.torneos 
        SET sorteo_ejecutado = TRUE, 
            sorteo_seed = :seed,
            updated_at = NOW()
        WHERE id = :id
    """)
    
    await session.execute(update, {"seed": seed_value, "id": torneo_id})
    await session.commit()
    
    return {
        "status": "success",
        "seed": seed_value,
        "teams_shuffled": teams[:3]  # Solo primeros 3 para verificación
    }
```

---

### 2.5 - Tests de Lógica (2 horas)

**Coverage:** Mínimo 70%

---

### Deliverables Sprint 2

- [x] Tablas de goles, tarjetas, sanciones
- [x] Materialized view de standings
- [x] Endpoints de goles y tarjetas
- [x] Sistema automático de sanciones
- [x] Sorteo con Fisher-Yates
- [x] Tests (70%+ coverage)

**Duración:** 13 horas  
**Total con revisiones:** 16 horas (2 días)

---

## 🗓️ SPRINT 3 (Semana 5): PANEL ADMINISTRATIVO

### Objetivo
Crear interfaz administrativa para gestionar torneos.

### Entregas

#### 3.1 - Rutas y Layout del Admin (2 horas)

**Archivo:** `admin/src/app/admin/layout.tsx`

```tsx
import Sidebar from '@/components/Sidebar';

export default function AdminLayout({ children }) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
```

**Archivo:** `admin/src/app/admin/torneos/page.tsx`

```tsx
// Página listado de torneos
'use client';

import { useQuery } from '@tanstack/react-query';

export default function TorneosPage() {
  const { data: torneos, isLoading } = useQuery({
    queryKey: ['torneos'],
    queryFn: () => fetch('/api/torneos').then(r => r.json())
  });

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Torneos</h1>
      {/* Tabla de torneos */}
    </div>
  );
}
```

---

#### 3.2 - Formulario de Creación de Torneo (3 horas)

**Componente:** `admin/src/components/TorneoForm.tsx`

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { tournamentSchema } from '@/schemas';

export default function TorneoForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(tournamentSchema),
    defaultValues: {
      nombre: '',
      modalidad: 'league',
      costo_inscripcion: 0,
      pago_requerido: false
    }
  });

  const onSubmit = async (data) => {
    const response = await fetch('/api/torneos', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' }
    });
    // handle response
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl mx-auto">
      <div className="mb-4">
        <label htmlFor="nombre">Nombre del Torneo</label>
        <input {...register('nombre')} />
        {errors.nombre && <span>{errors.nombre.message}</span>}
      </div>

      <div className="mb-4">
        <label htmlFor="modalidad">Modalidad</label>
        <select {...register('modalidad')}>
          <option value="league">Liga (Round Robin)</option>
          <option value="groups_knockout">Grupos + Eliminatorias</option>
          <option value="knockout">Eliminación Directa</option>
          <option value="swiss">Sistema Suizo</option>
        </select>
      </div>

      <div className="mb-4 p-4 border rounded">
        <h3 className="font-bold mb-2">Configuración de Pago</h3>
        
        <label className="flex items-center gap-2">
          <input type="checkbox" {...register('pago_requerido')} />
          Requerir pago de inscripción
        </label>

        <input 
          type="number" 
          {...register('costo_inscripcion')} 
          placeholder="Costo en ARS"
        />

        <input 
          type="datetime-local" 
          {...register('fecha_limite_pago')}
        />
      </div>

      <button type="submit" className="btn btn-primary">
        Crear Torneo
      </button>
    </form>
  );
}
```

---

#### 3.3 - Panel de Pagos (2 horas)

```tsx
// admin/src/app/admin/torneos/[id]/pagos/page.tsx

'use client';

import { useQuery } from '@tanstack/react-query';

export default function PagosPage({ params }) {
  const { data: pagos } = useQuery({
    queryKey: ['pagos', params.id],
    queryFn: () => fetch(`/api/torneos/${params.id}/pagos`).then(r => r.json())
  });

  const stats = {
    total_esperado: pagos?.reduce((s, p) => s + p.amount, 0),
    total_confirmado: pagos?.filter(p => p.status === 'approved').reduce((s, p) => s + p.amount, 0),
    pendientes: pagos?.filter(p => p.status === 'pending').length,
    rechazados: pagos?.filter(p => p.status === 'rejected').length
  };

  return (
    <div className="p-6">
      <h1>Panel de Pagos</h1>
      
      {/* Tarjetas de stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-blue-50 rounded">
          <p className="text-sm text-gray-600">Total Recaudado</p>
          <p className="text-2xl font-bold">${stats.total_confirmado}</p>
        </div>
        <div className="p-4 bg-yellow-50 rounded">
          <p className="text-sm text-gray-600">Pendientes</p>
          <p className="text-2xl font-bold">{stats.pendientes}</p>
        </div>
        <div className="p-4 bg-red-50 rounded">
          <p className="text-sm text-gray-600">Rechazados</p>
          <p className="text-2xl font-bold">{stats.rechazados}</p>
        </div>
        <div className="p-4 bg-green-50 rounded">
          <p className="text-sm text-gray-600">Meta</p>
          <p className="text-2xl font-bold">{(stats.total_confirmado / stats.total_esperado * 100).toFixed(0)}%</p>
        </div>
      </div>

      {/* Tabla de pagos */}
      <div className="bg-white rounded shadow">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 text-left">Equipo</th>
              <th className="px-6 py-3 text-left">Monto</th>
              <th className="px-6 py-3 text-left">Estado</th>
              <th className="px-6 py-3 text-left">Método</th>
              <th className="px-6 py-3 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pagos?.map(pago => (
              <tr key={pago.id} className="border-t">
                <td className="px-6 py-3">{pago.team_name}</td>
                <td className="px-6 py-3">${pago.amount}</td>
                <td className="px-6 py-3">
                  <span className={`badge ${pago.status === 'approved' ? 'badge-success' : 'badge-warning'}`}>
                    {pago.status}
                  </span>
                </td>
                <td className="px-6 py-3">{pago.provider}</td>
                <td className="px-6 py-3">
                  <button onClick={() => console.log('enviar recordatorio')} className="text-blue-600">
                    Recordatorio
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

---

#### 3.4 - Panel de Sanciones (2 horas)

**Similar al de pagos, pero con tarjetas y apelaciones**

---

### Deliverables Sprint 3

- [x] Layout administrativo completo
- [x] Formulario de creación de torneos
- [x] Panel de pagos
- [x] Panel de sanciones
- [x] Panel de resultados (básico)

**Duración:** 9 horas  
**Total:** 11 horas (1.5 días)

---

## 🗓️ SPRINT 4 (Semana 6): VISTAS PÚBLICAS + FIXTURE

### Objetivo
Completar vistas públicas y fixture editable.

### 4.1 - Página de Detalle de Torneo

```tsx
// web/src/app/t/[slug]/page.tsx

export default function TournamentPage({ params }) {
  const { data: tournament } = useQuery({
    queryKey: ['tournament', params.slug],
    queryFn: () => fetch(`/api/torneos/slug/${params.slug}`).then(r => r.json())
  });

  const tabs = ['Fixture', 'Posiciones', 'Goleadores', 'Equipos'];
  const [activeTab, setActiveTab] = useState('Fixture');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-12">
        <div className="container">
          <h1 className="text-4xl font-bold">{tournament?.nombre}</h1>
          <p className="text-blue-100 mt-2">
            {tournament?.fecha_inicio} - {tournament?.fecha_fin}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="container my-12">
        <div className="flex border-b mb-8">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium ${
                activeTab === tab
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'Fixture' && <FixtureView tournamentId={tournament?.id} />}
        {activeTab === 'Posiciones' && <StandingsView tournamentId={tournament?.id} />}
        {activeTab === 'Goleadores' && <ScorersView tournamentId={tournament?.id} />}
        {activeTab === 'Equipos' && <TeamsView tournamentId={tournament?.id} />}
      </div>
    </div>
  );
}
```

### 4.2 - Componente de Fixture

```tsx
// web/src/components/FixtureView.tsx

export function FixtureView({ tournamentId }) {
  const { data: matches } = useQuery({
    queryKey: ['matches', tournamentId],
    queryFn: () => fetch(`/api/torneos/${tournamentId}/partidos`).then(r => r.json())
  });

  const roundedMatches = groupBy(matches, 'round');

  return (
    <div className="space-y-8">
      {Object.entries(roundedMatches).map(([round, roundMatches]) => (
        <div key={round}>
          <h2 className="text-xl font-bold mb-4">Jornada {round}</h2>
          <div className="grid gap-4">
            {roundMatches.map(match => (
              <div key={match.id} className="bg-white p-4 rounded shadow">
                <div className="flex items-center justify-between">
                  <div className="flex-1 text-right">
                    <p className="font-semibold">{match.home_team.name}</p>
                  </div>
                  <div className="px-4 text-center">
                    <p className="text-3xl font-bold">
                      {match.home_goals} - {match.away_goals}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(match.scheduled_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{match.away_team.name}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

## 🗓️ SPRINT 5 (Semana 7-8): POLISH + DEPLOY

### Objetivo
Tests, optimización, documentación y deployment.

### 5.1 - Cobertura de Tests

- Backend: 70%+ coverage con Jest + Supertest
- Frontend: 60%+ coverage con Vitest + React Testing Library

### 5.2 - Documentación

- [ ] API Swagger completo
- [ ] Guía de admin
- [ ] Guía para usuarios finales
- [ ] README con setup instructions

### 5.3 - Deploy

- [ ] Testing en staging
- [ ] Configuración de env vars
- [ ] Setup de webhooks en MercadoPago
- [ ] Backup y recovery procedures
- [ ] Monitoring

---

## 📋 RESUMEN FINAL

| Sprint | Duración | Horas | Estado |
|--------|----------|-------|--------|
| 1: Pagos | 2 sem | 18 | 🟡 Por iniciar |
| 2: Lógica | 2 sem | 16 | 🟡 Por iniciar |
| 3: Admin | 1 sem | 11 | 🟡 Por iniciar |
| 4: Público | 1 sem | 12 | 🟡 Por iniciar |
| 5: Deploy | 1 sem | 10 | 🟡 Por iniciar |
| **TOTAL** | **8 semanas** | **~210 horas** | - |

**Equipo requerido:** 1 backend senior + 1 frontend + 1 QA  
**Costo estimado:** 2-3 dev-meses

---

**Documento generado automáticamente - Última actualización: 17/05/2026**
