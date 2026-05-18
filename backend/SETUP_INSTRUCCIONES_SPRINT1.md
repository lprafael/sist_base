# 🚀 Setup Sprint 1: Módulo de Pagos

**Duración Estimada:** 45-60 minutos  
**Objetivo:** Implementar pagos con MercadoPago, Stripe y efectivo

---

## PASO 1: Instalar Dependencias (10 min)

```bash
cd backend

# Instalar nuevos paquetes
pip install -r requirements.txt

# Verifica que estos se instalaron:
pip show mercadopago
pip show stripe
pip show pytest
pip show slowapi
```

**Paquetes Agregados:**
- `mercadopago==3.0.0` - SDK de MercadoPago
- `stripe==7.4.0` - SDK de Stripe
- `pytest==7.4.3` - Testing framework
- `pytest-asyncio==0.21.1` - Async test support
- `httpx==0.25.2` - HTTP client para tests
- `slowapi==0.1.9` - Rate limiting


## PASO 2: Configurar Variables de Entorno (5 min)

### Linux/Mac
```bash
cp .env.example .env
nano .env
```

### Windows (PowerShell)
```powershell
copy .env.example .env
notepad .env
```

### Variables Requeridas

```env
# ============ MERCADOPAGO ============
MERCADOPAGO_ACCESS_TOKEN=APP_USR_YOUR_TOKEN_HERE
MERCADOPAGO_PUBLIC_KEY=PROD_XXXXX

# ============ STRIPE ============
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_PUBLIC_KEY=pk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# ============ URLs ============
BACKEND_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000

# ============ DATABASE ============
DATABASE_URL=postgresql://user:password@localhost/cancha
```

**Cómo Obtener Credenciales:**

1. **MercadoPago:** 
   - https://www.mercadopago.com.ar/dashboard
   - Perfil → Configuración avanzada → Credenciales
   
2. **Stripe:**
   - https://dashboard.stripe.com
   - Developers → API Keys

**Para Testing (sin credenciales reales):**
```env
MERCADOPAGO_ACCESS_TOKEN=fake_token_test
STRIPE_SECRET_KEY=sk_test_xxxxx
```


## PASO 3: Ejecutar Migraciones de Base de Datos (10 min)

```bash
cd backend

# Ver estado actual
python run_migrations.py --status

# Ejecutar migraciones forward
python run_migrations.py

# Verificar tablas creadas
# Son creadas:
# - cancha.payments
# - cancha.tournament_players
# - cancha.goals
# - cancha.cards
# - cancha.sanctions
# - cancha.standings (vista materializada)

# Ver logs completos
python run_migrations.py --verbose
```

**Si hay errores:**
```bash
# Rollback de last migration
python run_migrations.py down

# Limpia y reinicia
python run_migrations.py --reset
```


## PASO 4: Actualizar main.py (5 min)

**Agregar el router de pagos a main.py:**

```python
# En main.py, cerca de otras importaciones de routers

from routers.payments import router as payments_router

# ... luego en app.include_router() calls

app.include_router(
    payments_router,
    prefix="/api/pagos",
    tags=["Pagos"]
)
```

**Localización exacta:** Busca `app.include_router` en main.py y agrega la línea después.

**Verificar que falta:** Si en `main.py` no existe `include_router`, es porque está usando rutas directas - en ese caso:
```python
# Simplemente agrega al final de main.py antes de if __name__ == '__main__':
app.include_router(payments_router, prefix="/api/pagos", tags=["Pagos"])
```


## PASO 5: Ejecutar Application

```bash
# Terminal 1: Backend
cd backend
python -m uvicorn main:app --reload --port 8000

# Si todo está OK verás:
# INFO:     Uvicorn running on http://127.0.0.1:8000
# INFO:     Application startup complete
```

**Probar que está vivo:**
```bash
# Terminal 2
curl http://localhost:8000/docs
# Debe mostrar Swagger UI
```


## PASO 6: Ejecutar Tests

### Unit Tests
```bash
cd backend
pytest tests/test_payments.py -v

# Ejemplo de output:
# test_get_payment_options_success PASSED
# test_get_payment_options_not_found PASSED
# test_generar_preferencia_mercadopago_success PASSED
# test_generar_preferencia_already_paid PASSED
# test_obtener_estado_pago_success PASSED
# ...
```

### Integration Tests
```bash
# Tests con BD SQLite temporal (no afectan BD real)
pytest tests/test_payments_integration.py -v

# Valida:
# - Crear registros de pago en BD
# - Workflow: pending -> processing -> approved
# - Reembolsos: approved -> refunded
# - Prevención de pagos duplicados
# - Historial de intentos
# - Verificación de montos
# - Estadísticas por proveedor
```

### Coverage Report
```bash
pytest tests/test_payments.py --cov=routers.payments --cov-report=html
# Abrir htmlcov/index.html en navegador
```

**Cobertura Esperada:** ≥70%


## PASO 7: Verificar Endpoints en Swagger

1. **Abrir:** http://localhost:8000/docs

2. **Expandir sección "Pagos"**

3. **Probar cada endpoint:**

### GET /api/pagos/opciones/{tournament_team_id}
- Parámetro: `tournament_team_id: "test-team-123"`
- Respuesta esperada:
```json
{
  "tournament_team_id": "test-team-123",
  "amount": 500.00,
  "currency": "ARS",
  "opciones": [
    {
      "id": "mercadopago",
      "nombre": "Mercado Pago",
      "descripcion": "Tarjeta de crédito, débito, efectivo en cajero"
    },
    {
      "id": "stripe",
      "nombre": "Stripe",
      "descripcion": "Tarjetas internacionales"
    },
    {
      "id": "cash",
      "nombre": "Efectivo",
      "descripcion": "Pagar en cancha con delegado"
    }
  ]
}
```

### POST /api/pagos/inscripcion/{tournament_team_id}
- Body:
```json
{
  "provider": "mercadopago"
}
```
- Respuesta esperada:
```json
{
  "status": "success",
  "preference_id": "XXXXXX",
  "checkout_url": "https://www.mercadopago.com.ar/checkout/...",
  "created_at": "2026-05-17T10:00:00"
}
```

### GET /api/pagos/estado/{tournament_team_id}
- Retorna estado actual del pago (pending, approved, rejected, refunded)

### POST /api/pagos/manual/{tournament_team_id}
- Para registrar pagos en efectivo
- Body:
```json
{
  "tournament_team_id": "test-team-123",
  "amount": 500,
  "received_by": "Juan García"
}
```


---

## 🔧 Troubleshooting

### Error: `ModuleNotFoundError: No module named 'mercadopago'`
```bash
# Solución: Reinstalar requirements
pip install --upgrade -r requirements.txt
```

### Error: `postgresql connection error`
```bash
# Verificar que PostgreSQL está corriendo
# Windows: Services → PostgreSQL
# Mac: brew services start postgresql
# Linux: sudo systemctl start postgresql

# Verificar DATABASE_URL en .env
echo $DATABASE_URL  # o ser (%VARIABLE% en Windows PowerShell)
```

### Error: `Table cancha.payments does not exist`
```bash
# Las migraciones no corrieron. Ejecuta:
python run_migrations.py

# Si aún falla:
python run_migrations.py --verbose
# Revisar error specific en output
```

### Error: `stripe.error.AuthenticationError`
```bash
# Verificar STRIPE_SECRET_KEY en .env
# Debe comenzar con: sk_live_ o sk_test_

# Copiar exactamente del dashboard sin espacios extra
```

### Tests fallan con: `sqlite table does not exist`
```bash
# Normal - tests usan BD en memoria que es limpiada c/test
# Si falla un test específico, revisar el mock de setup

pytest tests/test_payments_integration.py::TestPaymentIntegration::test_create_payment_record -v
```

### Error: `Alembic requires SQLAlchemy 2.0 or higher`
```bash
pip install --upgrade sqlalchemy
```


---

## ✅ Checklist de Validación

- [ ] `pip install -r requirements.txt` ejecutó sin errores
- [ ] `.env` tiene todas las variables configuradas
- [ ] `python run_migrations.py` creó 5 tablas nuevas
- [ ] `main.py` incluye router de pagos
- [ ] `uvicorn main:app --reload` arranca sin errores
- [ ] http://localhost:8000/docs muestra endpoints de pagos
- [ ] `pytest tests/test_payments.py -v` pasa ≥10 tests
- [ ] `pytest tests/test_payments_integration.py -v` pasa ≥7 tests
- [ ] Cobertura >= 70% en routers/payments.py


---

## 📋 Próximos Steps (Sprint 2)

1. **Crear router para goles y tarjetas** (`routers/matches.py`)
   - Endpoints: POST /goles, POST /tarjetas, GET /estadísticas
   
2. **Implementar vista de tabla de posiciones** (`services/standings.py`)
   - Materializar view `cancha.standings`
   - Endpoints: GET /torneos/{id}/tabla
   
3. **Admin Panel** (React/Next.js)
   - CRUD para torneos
   - Gestión de pagos
   - Manejo de  disputas
   
4. **Testing E2E**
   - Cypress o Playwright
   - Flow completo: inscripción → pago → participación


---

## 💡 Notas

- Usar ambiente de testing de MP/Stripe para desarrollo no productivo
- Webhook de MP debe ser público (usar ngrok si está en local)
- Moneda siempre es ARS (Argentina) - cambiar si se replica a otro país
- Tests no modifican BD real (usan fixtures + SQLite temporal)


**Soporte EMERGENCIA:** Si todo falla, revertir con:
```bash
python run_migrations.py down
# Y volver a punto de referencia anterior
```
