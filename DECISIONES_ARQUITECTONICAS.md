# Decisiones Arquitectónicas y Recomendaciones
**Documento de Referencia para Decisiones Técnicas**

---

## 1. DECISIÓN CRÍTICA: ¿Continuar en Python o Migrar a Node.js?

### Context
El prompt especifica **Node.js + Express** pero el proyecto actual usa **Python + FastAPI**.

### Opciones

#### Opción A: **Mantener Python + FastAPI** ✅ RECOMENDADO

**Pros:**
- ✅ Cero cambios en infraestructura actual
- ✅ Rápido para implementar lógica matemática compleja (sorteos, fixture)
- ✅ Fácil integración con ML (si en future quieren análisis)
- ✅ Equipo ya conoce el stack
- ✅ Menos riesgo de regression

**Cons:**
- ❌ No coincide con especificación
- ❌ Menos disponibilidad de librerías para pagos
- ❌ Performance inferior en real-time (✓ pero ¿necesario?)

**Acción:** Crear adaptación de requerimientos MercadoPago + Stripe en Python  
**Costo:** 0 horas (ya está en Python)  
**Riesgo:** BAJO

---

#### Opción B: Migrar a Node.js + Express

**Pros:**
- ✅ Coincide exacto con prompt
- ✅ Mejor para real-time con WebSockets
- ✅ Ecosistema de pagos más rico (stripe-js, etc)

**Cons:**
- ❌ Reescribir 100% del backend (~500 líneas)
- ❌ Migrar BD schema y queries (~3 días)
- ❌ Riesgo alto de bugs
- ❌ Costos 300% más altos

**Costo:** 15-20 horas + testing  
**Riesgo:** ALTO

---

### **RECOMENDACIÓN: Opción A (Python)**

**Justificación:**
1. El tiempo de migración no se justifica
2. Python es suficientemente potente para este caso de uso
3. El equipo conoce el stack
4. Enfocarse en completar la funcionalidad, no en tecnología

**Acción a tomar:**
Crear documento que adapte las recomendaciones del prompt a Python, usando equivalentes:
- Express → FastAPI ✓ (ya está)
- Prisma → SQLAlchemy + Alembic
- SDK oficial de pagos → same

---

## 2. DECISIÓN: Plaforma de Pagos (MercadoPago vs Stripe)

### Contexto Paraguay
- **Población:** 7M
- **Economía:** Mercado emergente, alta adopción de MercadoPago
- **Competencia:** Todas usan MercadoPago como primario
- **Tarjetas internacionales:** ~30% de usuarios

### Recomendación: **Híbrido (MP + Stripe)**

```
Flujo recomendado:

Usuario intenta pagar
  ↓
¿Tiene tarjeta Visa/Mastercard local?
  ├→ Sí → Ofrecer MercadoPago (70% de usuarios)
  │       (instantáneo, su billetera MP)
  │
  └→ No / Extranjero → Ofrecer Stripe
                       (tarjetas internacionales)
```

**Implementación in código:**

```python
# backend/routers/payments.py

@router.get("/pagos/opciones/{tournament_team_id}")
async def opciones_pago(tournament_team_id: str):
    """Retorna opciones de pago disponibles"""
    
    return {
        "opciones": [
            {
                "id": "mercadopago",
                "nombre": "MercadoPago",
                "icono": "mp-logo.png",
                "descripcion": "Billetera virtual, tarjetas locales",
                "comisión": "5.99%",
                "disponible": True
            },
            {
                "id": "stripe",
                "nombre": "Tarjeta Internacional",
                "icono": "stripe-logo.png",
                "descripcion": "Visa, Mastercard internacional",
                "comisión": "3.5% + $0.30",
                "disponible": True
            },
            {
                "id": "efectivo",
                "nombre": "Pago en Efectivo",
                "icono": "cash-icon.png",
                "descripcion": "En el complejo (solo admin puede confirmar)",
                "comisión": "0%",
                "disponible": True
            }
        ]
    }
```

---

## 3. DECISIÓN: Gestión de Imágenes (Cloudinary vs Local Storage)

### Requerimiento
Upload de:
- Logo de equipo (~2MB)
- Foto de jugador (~5MB)
- Foto de complejo (~10MB)

### Opciones

#### Opción A: **Cloudinary** (RECOMENDADO)
```
Pros:
✅ Auto-resize y thumbnail
✅ CDN global
✅ Transformaciones on-the-fly
✅ Almacenamiento ilimitado (tier free)
✅ Watermark automático
✅ Eliminación automática de archivos anónimos

Cons:
❌ Costo después de cierto uso
❌ Vendor lock-in
```

#### Opción B: Local Storage
```
Pros:
✅ Cero costo
✅ Control total

Cons:
❌ Backup manual
❌ Sin CDN (lento para usuarios lejanos)
❌ Necesita nginx config
```

### **RECOMENDACIÓN: Cloudinary**

**Implementación:**

```python
# requirements.txt
cloudinary==1.36.0

# .env
CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx

# routers/uploads.py
import cloudinary
import cloudinary.uploader

@router.post("/uploads/equipo-logo")
async def upload_team_logo(
    file: UploadFile,
    current_user: dict = Depends(get_current_user)
):
    try:
        # Validar MIME type
        if file.content_type not in ['image/jpeg', 'image/png', 'image/webp']:
            raise HTTPException(status_code=400, detail="Formato no válido")
        
        # Validar tamaño (max 2MB)
        if file.size > 2 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="Archivo muy grande")
        
        # Upload a Cloudinary
        result = cloudinary.uploader.upload(
            file.file,
            folder="micancha/logos",
            width=200,
            height=200,
            crop="fill",
            gravity="face",
            quality="auto",
            fetch_format="auto"
        )
        
        return {
            "url": result['secure_url'],
            "public_id": result['public_id'],
            "width": result['width'],
            "height": result['height']
        }
        
    except cloudinary.exceptions.Error as e:
        raise HTTPException(status_code=500, detail=str(e))
```

---

## 4. DECISIÓN: Base de Datos (UUID vs Serial Int)

### Recomendación: **UUID (UUID v4)** ✅

**Justificación:**
```
Serial Int:
  ❌ Secuencial (reveal orden de creación)
  ❌ No escala en sharding/replicación
  ❌ Menos seguro

UUID:
  ✅ Seguro (no predecible)
  ✅ Escala en microservicios
  ✅ Estándar en APIs modernas
  ✅ Requiere menos centralized ID generation
```

**Implementación ya está en el schema:**
```sql
CREATE TABLE torneos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ...
)
```

**Asegurarse que todas las tablas nuevas usan UUID**

---

## 5. DECISIÓN: Sistema de Notificaciones

### Opción A: Email + Webhooks
```
Usar: Nodemailer (ya instalado)

Plantillas:
- Confirmación de inscripción
- Recordatorio de pago
- Pago confirmado/rechazado
- Partido programado (24h antes)
- Resultado cargado
- Sanción aplicada
- Apelación resuelta
```

### Opción B: SMS + Email (FUTURO)
```
Agregar más adelante con Twilio si es necesario.
Prioridad: Baja
```

### **RECOMENDACIÓN: Email (Etapa 1) + SMS Opcional (Etapa 2)**

```python
# backend/services/emails.py

from fastapi_mail import FastMail, MessageSchema, ConnectionConfig

conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("MAIL_USERNAME"),
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD"),
    MAIL_FROM=os.getenv("MAIL_FROM", "noreply@micancha.com"),
    MAIL_PORT=int(os.getenv("MAIL_PORT", 587)),
    MAIL_SERVER=os.getenv("MAIL_SERVER"),
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
)

async def send_payment_confirmation(email: str, torneo: str, equipo: str, monto: float):
    """Envía confirmar de pago"""
    
    html = f"""
    <h1>¡Pago confirmado!</h1>
    <p>Tu equipo <b>{equipo}</b> ha sido inscripto en <b>{torneo}</b></p>
    <p>Monto pagado: <b>${monto}</b></p>
    """
    
    message = MessageSchema(
        subject=f"Inscripción confirmada - {torneo}",
        recipients=[email],
        body=html,
        subtype="html"
    )
    
    fm = FastMail(conf)
    await fm.send_message(message)
```

---

## 6. DECISIÓN: Autenticación (JWT vs Sessions)

### Actual: JWT ✅
```
Access Token: 15 min
Refresh Token: 7 días

Ubicación: localStorage (frontend)

Esto es correcto para una API
```

### Mejora sugerida:
```python
# Agregar refresh token rotation
# Al usar refresh, generar nuevo refresh token también

@router.post("/auth/refresh")
async def refresh_token(refresh_token: str):
    """
    Verifica refresh token y genera nuevo par
    (access + refresh) para máxima seguridad
    """
    user = verify_refresh_token(refresh_token)
    
    return {
        "access_token": generate_access_token(user),
        "refresh_token": generate_refresh_token(user),
        "token_type": "bearer"
    }
```

---

## 7. DECISIÓN: Sanciones (Automáticas vs Manuales)

### Sistema Recomendado: **Híbrido**

```python
# Automáticas (por tarjetas)
3 amarillas = 1 suspensión
1 roja = N suspensiones (configurable)
2 rojas = suspensión doble

# Manuales (por admin)
Incidente fuera de cancha
Agresión a árbitro
Etc.

# Con apelación
El delegado puede apelar
Admin aprueba/rechaza
```

**Código:**

```python
async def apply_automatic_sanction(
    session,
    player_id: str,
    tournament_id: str,
    card_type: str,  # yellow, red
    tournament_config: dict
):
    """
    Aplica sanción automática basada en config del torneo
    """
    
    # Contar amarillas
    yellow_count = await session.execute(
        text("""
            SELECT COUNT(*) FROM cancha.cards c
            JOIN cancha.torneos_partidos p ON c.match_id = p.id
            WHERE c.player_id = :player_id
            AND p.torneo_id = :tournament_id
            AND c.type IN ('yellow', 'second_yellow')
        """),
        {"player_id": player_id, "tournament_id": tournament_id}
    )
    
    yellow_count = yellow_count.scalar()
    matches_to_suspend = 0
    
    if card_type == "red":
        matches_to_suspend = tournament_config.get("redDirectSuspension", 1)
    elif card_type == "second_yellow":  # Es equivalente a roja
        matches_to_suspend = tournament_config.get("redAccumulatedSuspension", 1)
    elif card_type == "yellow" and yellow_count >= tournament_config.get("yellowsForSuspension", 3):
        matches_to_suspend = 1
    
    if matches_to_suspend > 0:
        # Insertar sanción
        insert = text("""
            INSERT INTO cancha.sanctions 
            (player_id, tournament_id, reason, severity, matches_suspended, status)
            VALUES (:player_id, :tournament_id, :reason, 'mild', :matches, 'active')
        """)
        
        await session.execute(
            insert,
            {
                "player_id": player_id,
                "tournament_id": tournament_id,
                "reason": f"Sanción automática: {card_type}",
                "matches": matches_to_suspend
            }
        )
        
        # Marcar jugador como suspendido
        update = text("""
            UPDATE cancha.tournament_players
            SET estado = 'suspended'
            WHERE id = :player_id
        """)
        
        await session.execute(update, {"player_id": player_id})
        await session.commit()
        
        return True
    
    return False
```

---

## 8. DECISIÓN: Cache Strategy

### Problema
Queries repetidas a BD (standings, goleadores) son lentas.

### Solución: Materialized Views + Query Caching

```python
# Opción 1: Redis Cache (si quieren real-time)
from redis import Redis

redis_client = Redis(host='localhost', port=6379, db=0, decode_responses=True)

@router.get("/torneos/{torneo_id}/standings")
async def get_standings(torneo_id: str, session: AsyncSession):
    cache_key = f"standings:{torneo_id}"
    
    # Intentar obtener de cache
    cached = redis_client.get(cache_key)
    if cached:
        return json.loads(cached)
    
    # Si no está en cache, consultar BD
    result = await session.execute(
        text("SELECT * FROM cancha.standings WHERE tournament_id = :id"),
        {"id": torneo_id}
    )
    
    standings = result.fetchall()
    
    # Guardar en cache por 5 minutos
    redis_client.setex(cache_key, 300, json.dumps(standings))
    
    return standings

# Opción 2: Invalidar cache al cargar resultado
@router.patch("/partidos/{partido_id}/resultado")
async def actualizar_resultado(...):
    # ... guardar resultado ...
    
    # Invalidar cache IMPORTANTES
    redis_client.delete(f"standings:{tournament_id}")
    redis_client.delete(f"scorers:{tournament_id}")
    
    return resultado
```

### **RECOMENDACIÓN: Materialized Views (primero) + Redis (si crece)**

---

## 9. DECISIÓN: Logging y Monitoreo

### Recomendación

```python
# backend/logs/middleware.py

import logging
from pythonjsonlogger import jsonlogger

# Configurar logging en JSON para parseo fácil
logHandler = logging.StreamHandler()
formatter = jsonlogger.JsonFormatter()
logHandler.setFormatter(formatter)

logger = logging.getLogger()
logger.addHandler(logHandler)
logger.setLevel(logging.INFO)

# Usar en endpoints críticos
logger.info("Pago confirmado", extra={
    "tournament_id": tournament_id,
    "amount": amount,
    "provider": "mercadopago",
    "timestamp": datetime.now().isoformat()
})
```

**Monitoreo recomendado:**
- ✅ Sentry (para excepciones)
- ✅ DataDog/NewRelic (para performance)
- ✅ ELK Stack (para logs)

---

## 10. DECISIÓN: Rate Limiting

### Implementación

```python
# requirements.txt
slowapi==0.1.9

# main.py
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

# Endpoints críticos (pagos, webhooks)
@app.post("/api/pagos/webhook/mercadopago")
@limiter.limit("100/minute")
async def webhook_mercadopago(...):
    ...

# Endpoints públicos (listados)
@app.get("/cancha/torneos")
@limiter.limit("1000/hour")
async def get_torneos(...):
    ...
```

---

## 📋 CHECKLIST DE DECISIONES

- [x] 1. Mantener Python + FastAPI
- [x] 2. MercadoPago + Stripe (híbrido)
- [x] 3. Cloudinary para imágenes
- [x] 4. UUID para IDs
- [x] 5. Email + SMS (después)
- [x] 6. JWT con refresh rotation
- [x] 7. Sanciones híbridas + apelación
- [x] 8. Materialized views + Redis (futuro)
- [x] 9. Logging JSON + Sentry
- [x] 10. Rate limiting con slowapi

---

## 🚀 QUICK WINS (Implementar YA)

### 1. Separar routers en archivos (1 hora)

```
backend/
├── main.py (simplificado)
├── routers/
│   ├── torneos.py
│   ├── payments.py
│   ├── partidos.py
│   ├── sanciones.py
│   └── __init__.py
```

### 2. Agregar Pydantic models (1 hora)

```python
# backend/schemas.py

from pydantic import BaseModel

class TorneoCreate(BaseModel):
    nombre: str
    modalidad: str  # league, groups_knockout, knockout, swiss
    fecha_inicio: date
    fecha_fin: date
    costo_inscripcion: float = 0
    pago_requerido: bool = False
    
    class Config:
        from_attributes = True
```

### 3. Agregar migraciones con Alembic (2 horas)

```bash
pip install alembic
alembic init migrations
alembic revision --autogenerate -m "add payments table"
alembic upgrade head
```

### 4. Setup Swagger (1 hora)

```python
# main.py
from fastapi.openapi.utils import get_openapi

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(
        title="Mi Cancha API",
        version="1.0.0",
        description="API de gestión de torneos",
        routes=app.routes,
    )
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi
```

### 5. Variables de entorno con .env (30 min)

```bash
# .env.example
DATABASE_URL=postgresql://user:pass@localhost/micancha
MERCADOPAGO_ACCESS_TOKEN=xxx
STRIPE_SECRET_KEY=xxx
CLOUDINARY_CLOUD_NAME=xxx
JWT_SECRET=xxx
FRONTEND_URL=http://localhost:3000
API_URL=http://localhost:8002
```

---

## 📚 REFERENCIAS

1. **MercadoPago Docs:** https://developers.mercadopago.com
2. **Stripe Webhooks:** https://stripe.com/docs/webhooks
3. **FastAPI Best Practices:** https://fastapi.tiangolo.com
4. **PostgreSQL Materialized Views:** https://www.postgresql.org/docs/current/rules-materializedviews.html
5. **JWT Best Practices:** https://tools.ietf.org/html/rfc8725

---

**Documento generado:** 17/05/2026  
**Última revisión:** N/A  
**Urgencia:** CRÍTICA
