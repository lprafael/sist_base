# 🧪 Testing Quick Reference

**Objetivo:** Validar que el módulo de pagos funciona correctamente sin afectar BD real.

---

## ⚡ Quick Start (2 minutos)

```bash
cd backend

# 1. Instalar test dependencies (ya en requirements.txt)
pip install pytest pytest-asyncio httpx

# 2. Ejecutar TODOS los tests
pytest tests/test_payments.py tests/test_payments_integration.py -v

# 3. Ver resultado esperado: 20 PASSED ✅
```

---

## 🧬 Test Structure

### Unit Tests (`test_payments.py`)
**Qué prueban:** Endpoints individuales sin BD real  
**BD usada:** Mocks (no se modifica BD)  
**Velocidad:** ~1 segundo  
**Count:** 12 tests

```bash
pytest tests/test_payments.py -v
```

**Tests incluidos:**
1. `test_get_payment_options_success` - GET /opciones funciona
2. `test_get_payment_options_not_found` - GET /opciones con equipo inexistente
3. `test_generar_preferencia_mercadopago_success` - POST /inscripcion crea preference
4. `test_generar_preferencia_already_paid` - POST /inscripcion rechaza si ya pagó
5. `test_obtener_estado_pago_success` - GET /estado retorna status correcto
6. `test_obtener_estado_pago_not_found` - GET /estado sin pago registrado
7. `test_registrar_pago_manual_success` - POST /manual crea pago en efectivo
8. `test_webhook_mercadopago_approved` - Webhook actualiza status
9. `test_payment_flow_mercadopago_e2e` - Flujo completo (E2E)
10. `test_payment_manual_create_validation` - Validación de schema
11. `test_payment_options_schema_validation` - Validación de opciones
12. `test_stripe_integration_placeholder` - Placeholder para Stripe


### Integration Tests (`test_payments_integration.py`)
**Qué prueban:** Flujos completos con BD temporal  
**BD usada:** SQLite in-memory (recreada cada test)  
**Velocidad:** ~1-2 segundos  
**Count:** 8 tests

```bash
pytest tests/test_payments_integration.py -v
```

**Tests incluidos:**
1. `test_create_payment_record` - Crear registro en BD
2. `test_payment_status_workflow` - Transición de estados
3. `test_refund_workflow` - Crear reembolso
4. `test_payment_duplicate_prevention` - Un equipo, un pago
5. `test_get_team_payment_history` - Historial de intentos
6. `test_payment_amount_matches_tournament_fee` - Monto correcto
7. `test_payment_provider_statistics` - Agregaciones por proveedor

---

## 📊 Ver Cobertura

```bash
# Generar reporte HTML
pytest tests/test_payments.py --cov=routers.payments --cov-report=html

# Abrir reporte (Windows)
start htmlcov/index.html

# Abrir reporte (Mac)
open htmlcov/index.html

# Abrir reporte (Linux)
xdg-open htmlcov/index.html
```

**Cobertura esperada:**
- `routers/payments.py`: ~75% (algunos paths con APIs reales no se mockean totalmente)
- `schemas/payments.py`: ~90% (validaciones todas testeadas)
- **Total proyecto:** ~70-75%

---

## 🔍 Ejecutar Test Específico

```bash
# Correr solo un test
pytest tests/test_payments.py::test_get_payment_options_success -v

# Correr tests de una clase
pytest tests/test_payments_integration.py::TestPaymentIntegration -v

# Correr tests que matchean pattern
pytest -k "mercadopago" -v

# Ver más detalles (print statements)
pytest tests/test_payments.py -v -s

# Mode debug (stop on first fail)
pytest tests/test_payments.py -x -v
```

---

## 🛠️ Troubleshooting Tests

### Error: `ModuleNotFoundError: No module named 'pytest'`
```bash
pip install pytest pytest-asyncio httpx
```

### Error: `SQLite: no such table`
```bash
# Normal para integration tests - usan BD temporal
# Si el test falla dentro del test (no en setup), ver el error específico
pytest tests/test_payments_integration.py::test_create_payment_record -v -s
```

### Error: `FAILED - assert response.status_code == 200`
```bash
# Add verbose output
pytest tests/test_payments.py::test_generar_preferencia_mercadopago_success -v -s

# El test probablemente está fallando porque mock no está bien configurado
# Ver el print statement para detalles
```

### Error: `RuntimeError: no running event loop`
```bash
# Ensure pytest-asyncio está instalada
pip install pytest-asyncio

# Mark test methods with @pytest.mark.asyncio
# (Already done in test files)
```

### Error: `AttributeError: 'MagicMock' object has no attribute 'execute'`
```bash
# Mock no está configurado correctamente
# Ver las fixtures en test_payments.py - se crean automáticamente

# Or reinstall:
pip install --upgrade pytest-mock
```

---

## ✅ Validación Paso a Paso

### 1. Tests Unitarios Pasan
```bash
pytest tests/test_payments.py -v

# Debe mostrar:
# test_get_payment_options_success PASSED
# test_get_payment_options_not_found PASSED
# ...
# ==================== 12 passed in 0.45s ====================
```

### 2. Tests de Integración Pasan
```bash
pytest tests/test_payments_integration.py -v

# Debe mostrar:
# test_create_payment_record PASSED
# test_payment_status_workflow PASSED
# ...
# ==================== 8 passed in 1.23s ====================
```

### 3. Cobertura Suficiente
```bash
pytest tests/test_payments.py --cov=routers.payments

# Debe mostrar >= 70%
# Name                        Stmts   Miss  Cover
# -----------------------------------------------
# routers/payments.py           180    45    75%
```

### 4. Todos los Tests Juntos
```bash
pytest tests/test_payments.py tests/test_payments_integration.py -v --tb=short

# Resultado esperado:
# ==================== 20 passed in 2.15s ====================
```

---

## 📈 Interpretar Resultados

### Éxito (20 PASSED)
```
======================= 20 passed in 2.31s =======================
```
✅ **Status:** Todo funciona. Listo para producción.

### Fallo (1 FAILED)
```
FAILED tests/test_payments.py::test_get_payment_options_success - ...
======================== 1 failed, 19 passed in 2.45s ==============
```
⚠️ **Status:** Un test falló. Ver outputabajo para detalles.

### Error de Setup (ERROR)
```
ERROR tests/test_payments.py::test_generar_preferencia_mercadopago_success
======================== ERROR ========================
```
🔴 **Status:** Setup fallió (import, fixture, etc). Ver stack trace.

---

## 🚀 Test Workflow Recomendado

### Antes del Commit
```bash
# 1. Instalar dependencias
pip install -r requirements.txt

# 2. Run all tests
pytest tests/ -v

# 3. Check coverage
pytest tests/ --cov=routers --cov-report=term-missing

# 4. Check code style (opcional)
black backend/
```

### En Integración Continua (CI/CD)
```yaml
# Example GitHub Actions workflow
- name: Run tests
  run: |
    pip install -r requirements.txt
    pytest tests/ --cov=80  # Fail if coverage < 80%
```

---

## 📝 Agregar Nuevos Tests

### Template para Unit Test
```python
@pytest.mark.asyncio
async def test_mi_nuevo_endpoint_success(mock_session, mock_current_user):
    """Test: Describir qué se prueba"""
    from routers.payments import mi_endpoint
    
    # 1. Setup: Configurar mocks
    mock_session.execute = AsyncMock()
    mock_session.execute.return_value.fetchone.return_value = ("data",)
    
    # 2. Execute: Llamar función
    response = await mi_endpoint(
        param="value",
        session=mock_session,
        current_user=mock_current_user
    )
    
    # 3. Assert: Validar resultado
    assert response["status"] == "success"
    assert response["data"] == "expected"
```

### Template para Integration Test
```python
@pytest.mark.asyncio
async def test_mi_nuevo_workflow(async_session_fixture):
    """Test: Describir el flujo"""
    session = async_session_fixture
    
    # 1. Setup data in temporary BD
    await session.execute("INSERT INTO table VALUES ...")
    await session.commit()
    
    # 2. Execute logic
    result = await session.execute("SELECT * FROM table")
    
    # 3. Assert outcome
    assert result.scalar() == expected_value
```

---

## 🎯 CI/CD Integration

### GitHub Actions Example
```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-python@v2
        with:
          python-version: 3.10
      - run: pip install -r backend/requirements.txt
      - run: pytest backend/tests/ -v --cov=80
```

### Pre-commit Hook
```bash
#!/bin/bash
# .git/hooks/pre-commit

pytest backend/tests/ -q
if [ $? -ne 0 ]; then
  echo "❌ Tests failed. Commit aborted."
  exit 1
fi
```

---

## 📚 Resources

- **pytest docs:** https://docs.pytest.org/
- **pytest-asyncio:** https://pytest-asyncio.readthedocs.io/
- **Mocking guide:** https://docs.python.org/3/library/unittest.mock.html
- **FastAPI testing:** https://fastapi.tiangolo.com/advanced/testing-websockets/

---

**Last Updated:** 2026-05-17  
**Test Coverage Target:** ≥70%  
**Total Test Count:** 20  
**Expected Runtime:** ~2-3 seconds
