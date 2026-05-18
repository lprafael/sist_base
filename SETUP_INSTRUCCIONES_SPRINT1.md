# 🚀 SETUP: Implementación de Módulo de Pagos

**Estado:** Sprint 1 - Infraestructura de Pagos  
**Fecha:** 17 de mayo, 2026  
**Tiempo estimado:** 2-3 horas (primera ejecución)

---

## 📋 CHECKLIST: QUÉ SE HA HECHO

✅ Creada estructura de carpetas:
   - `backend/routers/` → Módulos de endpoints
   - `backend/schemas/` → Validaciones Pydantic
   - `backend/migrations/` → Migraciones de BD
   - `backend/services/` → Lógica de negocio

✅ Creados archivos críticos:
   - `schemas/payments.py` → Validaciones de pagos
   - `routers/payments.py` → Endpoints de MercadoPago + Stripe
   - `migrations/001_add_payments_and_tournaments.py` → Schema de BD
   - `run_migrations.py` → Script para ejecutar migraciones
   - `.env.example` → Variables de entorno

✅ Actualizados:
   - `requirements.txt` → Dependencias de MercadoPago, Stripe, tests

---

## 🔧 PASOS SIGUIENTES (HACER AHORA)

### PASO 1: Instalar dependencias (10 min)

```powershell
cd backend

# Instalar nuevas dependencias
pip install mercadopago stripe pytest pytest-asyncio slowapi

# O instalar todo:
pip install -r requirements.txt

# Verificar
pip list | findstr "mercadopago stripe pytest"
```

**Esperado:**
```
mercadopago 3.0.0
stripe 7.4.0
pytest 7.4.3
pytest-asyncio 0.21.1
```

---

### PASO 2: Configurar variables de entorno (5 min)

```powershell
# En backend/, crear .env (basado en .env.example)
cp .env.example .env

# Editar .env con tus valores reales:
# - DATABASE_URL (verificar que conecte a tu BD)
# - MERCADOPAGO_ACCESS_TOKEN (obtener de MP dashboard)
# - Otros valores opcionales por ahora
```

**Valores mínimos necesarios:**
```
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/micancha
JWT_SECRET=mi-secreto-temporal-solo-desarrollo-12345
API_URL=http://localhost:8002
FRONTEND_URL=http://localhost:3000
ENVIRONMENT=development
```

---

### PASO 3: Ejecutar migraciones de DB (10 min)

```powershell
cd backend

# Ejecutar migración UP
python run_migrations.py

# Esperado:
# ✅ Ejecutando migración...
# ✅ Migración completada con éxito
```

**¿Qué hace?**
- Crea tabla `cancha.payments`
- Crea tabla `cancha.tournament_players`
- Crea tabla `cancha.goals`
- Crea tabla `cancha.cards`
- Crea tabla `cancha.sanctions`
- Agrega columnas a `torneos` y `torneos_equipos`
- Crea materialized view `cancha.standings`

**Si hay error:**
```powershell
# Revertir cambios
python run_migrations.py down

# Verificar logs
# Ajustar .env (DATABASE_URL)
# Intentar de nuevo
```

---

### PASO 4: Verificar tablas en BD (5 min)

```sql
-- Conectarse a BD y ejecutar:
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'cancha' 
ORDER BY table_name;

-- Ver la tabla payments
\d cancha.payments

-- Ver materialized view
\dv cancha.standings
```

**Esperado:** Ver 7 nuevas tablas + 1 view

---

### PASO 5: Actualizar main.py (5 min)

Importar el nuevo router en `backend/main.py`:

```python
# Agregar al inicio del archivo (después de otros imports):
from routers.payments import router as payments_router

# Agregar después de otros app.include_router():
app.include_router(payments_router)

# Debe quedar algo como:
app.include_router(pagos_router)  # ← Agregar esta línea
```

**¿Dónde exactamente?**
En `main.py`, busca donde dice `app.include_router` y agrega la línea:
```python
app.include_router(payments_router)
```

---

### PASO 6: Iniciar servidor y probar (10 min)

```powershell
cd backend

# Iniciar servidor
uvicorn main:app --reload --port 8002

# Esperado:
# INFO:     Uvicorn running on http://127.0.0.1:8002
# ✅ Router de pagos cargado
```

---

### PASO 7: Probar endpoints (15 min)

Ir a http://localhost:8002/docs (Swagger UI) y probar:

#### 7.1 - Obtener opciones de pago

```
GET /api/pagos/opciones/{tournament_team_id}

Parámetro: tournament_team_id = <ID de una inscripción existente>

Esperado: 200 OK con lista de opciones (MP, Stripe, Efectivo)
```

#### 7.2 - Crear preferencia de pago

```
POST /api/pagos/inscripcion/{tournament_team_id}

Body JSON:
{
  "provider": "mercadopago"
}

Esperado: 200 OK + checkout_url de MercadoPago
```

#### 7.3 - Obtener estado de pago

```
GET /api/pagos/estado/{tournament_team_id}

Esperado: 200 OK con status, amount, provider
```

#### 7.4 - Registrar pago manual

```
POST /api/pagos/manual/{tournament_team_id}

Body JSON:
{
  "amount": 500,
  "received_by": "Juan García"
}

Esperado: 200 OK - Pago registrado
```

---

## 🧪 EJECUTAR TESTS (15 min)

```powershell
cd backend

# Crear archivo de tests
# (Veremos en próximo paso)

# Ejecutar tests
pytest tests/test_payments.py -v

# Esperado: 
# ✅ test_generar_preferencia_pago ... PASSED
# ✅ test_obtener_estado_pago ... PASSED
# ✅ test_registrar_pago_manual ... PASSED
```

---

## 📞 SI HAY ERRORES

### Error: `ModuleNotFoundError: No module named 'mercadopago'`

```powershell
pip install mercadopago stripe
```

### Error: `AttributeError: 'NoneType' object has no attribute 'preference'`

→ MERCADOPAGO_ACCESS_TOKEN no está configurado en .env

```powershell
# Editar .env
MERCADOPAGO_ACCESS_TOKEN=APP_USR_XXXXXXXXXXXX
```

### Error: `(psycopg2.OperationalError) could not connect to server`

→ BD no está disponible

```powershell
# Verificar conexión
psql -U user -h localhost -d micancha

# O chequear DATABASE_URL en .env
```

### Error: `relation "cancha.payments" does not exist`

→ Migración no ejecutó correctamente

```powershell
# Verificar BD conecta
psql -U user -h localhost -d micancha -c "\dt cancha.*"

# Ejecutar migración manualmente desde psql:
psql -U user -h localhost -d micancha < migration_script.sql
```

---

## 🎯 PRÓXIMOS PASOS (DESPUÉS DE ESTO)

Una vez que todo esté funcionando:

1. **Crear router de goles/tarjetas** (routers/matches.py)
2. **Crear router de sanciones** (routers/sanctions.py)
3. **Crear función de sorteo** (services/draw.py)
4. **Crear tests completos** (tests/test_*.py)
5. **Integrar Stripe** (implementar client-side en frontend)

---

## 📊 ESTADO DE SPRINT 1

```
✅ Infraestructura Base
   ├─ Schemas Pydantic: ✅
   ├─ Migration tools: ✅
   ├─ Router structure: ✅
   └─ Requirements: ✅

⚠️ Endpoints Pagos (En QA)
   ├─ GET /opciones: ✅ (code)
   ├─ POST /inscripcion: ✅ (code)
   ├─ GET /estado: ✅ (code)
   ├─ POST /manual: ✅ (code)
   ├─ POST /webhook/mp: ✅ (code)
   └─ Tests: ❌ (próximo)

❌ Por Hacer Pronto
   ├─ Routers de goles/tarjetas
   ├─ Tests unitarios (70%+)
   ├─ Integración Stripe
   └─ Notificaciones por email
```

---

## 📝 NOTAS IMPORTANTES

1. **MercadoPago Token:** Obtener de https://www.mercadopago.com/developers/panel
   - Environment: Desarrollo (sandbox)
   - Copiar "Access Token"

2. **Webhook:** Para que funcione COMPLETO necesitas:
   - Servidor accesible públicamente O
   - Usar ngrok para testing local:
     ```powershell
     ngrok http 8002
     # Copiar URL y configurar en MP dashboard
     ```

3. **Seguridad:** El código actual NO valida firma de webhook (TODO)
   - Implementar después
   - Por ahora es funcional pero menos seguro

4. **Stripe:** Código está ready pero sin test
   - Agregar testing después
   - Frontend necesita Stripe Elements

---

## 🚀 COMANDO RÁPIDO (Copy-Paste)

```powershell
# Si ya tienes todo configurado:
cd backend
pip install -r requirements.txt
python run_migrations.py
uvicorn main:app --reload --port 8002
```

Luego ir a: http://localhost:8002/docs

---

**Tiempo total estimado:** 1-2 horas  
**Complejidad:** 🟡 MEDIA (simple si todo está OK)  
**Bloqueadores:** BD, MercadoPago token

¿Necesitas ayuda con algún paso? Avísame cuál es el error exacto.
