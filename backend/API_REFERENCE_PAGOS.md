# 📡 API Reference: Módulo de Pagos

**Base URL:** `http://localhost:8000/api/pagos`  
**Autenticación:** JWT Bearer Token (en header `Authorization: Bearer <token>`)  
**Content-Type:** `application/json`

---

## 🔵 Endpoint: Obtener Opciones de Pago

### GET /opciones/{tournament_team_id}

Obtiene las opciones de pago disponibles ANTES de que el equipo pague.

#### Request

```bash
curl -X GET http://localhost:8000/api/pagos/opciones/team-123 \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json"
```

#### Response (200 OK)

```json
{
  "tournament_team_id": "team-123",
  "amount": 500.00,
  "currency": "ARS",
  "tournament_name": "Copa Summer 2026",
  "fee_deadline": "2026-06-30T23:59:59",
  "opciones": [
    {
      "id": "mercadopago",
      "nombre": "Mercado Pago",
      "descripcion": "Tarjeta de crédito, débito, efectivo en cajero, billetera",
      "comision": "3.99%"
    },
    {
      "id": "stripe",
      "nombre": "Stripe",
      "descripcion": "Tarjetas internacionales (Visa, Mastercard, Amex)",
      "comision": "2.9% + $0.30"
    },
    {
      "id": "cash",
      "nombre": "Efectivo en Cancha",
      "descripcion": "Pagar directamente al delegado el día del torneo",
      "comision": "0%"
    }
  ]
}
```

#### Error Responses

**404 - Equipo no existe**
```json
{
  "detail": "Inscripción no encontrada para tournament_team_id: team-999"
}
```

**402 - Equipo ya pagó**
```json
{
  "detail": "Este equipo ya tiene un pago aprobado"
}
```

---

## 🟢 Endpoint: Crear Preferencia de Pago (MercadoPago/Stripe)

### POST /inscripcion/{tournament_team_id}

Genera una preferencia de pago y retorna la URL de checkout. El usuario es redirigido a MercadoPago/Stripe para completar el pago.

#### Request

```bash
curl -X POST http://localhost:8000/api/pagos/inscripcion/team-123 \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "mercadopago"
  }'
```

#### Body Parameters

| Campo | Tipo | Requerido | Valores | Descripción |
|-------|------|-----------|--------|-------------|
| `provider` | string | Sí | `mercadopago`, `stripe`, `cash` | Proveedor de pago seleccionado |

#### Response (201 Created)

**MercadoPago:**
```json
{
  "status": "success",
  "payment_id": "pay-c8e7f3d2-9a1b-4c5d-8e2f-7a3b9c1d5e8f",
  "preference_id": "280191014-123456789",
  "provider": "mercadopago",
  "checkout_url": "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=280191014-123456789",
  "amount": 500.00,
  "currency": "ARS",
  "created_at": "2026-05-17T10:30:22.123456",
  "expires_at": "2026-05-18T10:30:22.123456"
}
```

**Stripe:**
```json
{
  "status": "success",
  "payment_id": "pay-c8e7f3d2-9a1b-4c5d-8e2f-7a3b9c1d5e8f",
  "preference_id": "pi_1234567890abcdefgh",
  "provider": "stripe",
  "checkout_url": "https://checkout.stripe.com/pay/cs_test_b1234567890abcdefgh",
  "amount": 500.00,
  "currency": "ARS",
  "created_at": "2026-05-17T10:30:22.123456",
  "expires_at": "2026-05-18T10:30:22.123456"
}
```

#### Error Responses

**400 - Proveedor inválido**
```json
{
  "detail": "valor no permitido en provider. Opciones: mercadopago, stripe, cash"
}
```

**402 - Aleatorio ya pagado**
```json
{
  "detail": "Ya existe un pago aprobado o en proceso para este equipo"
}
```

**503 - Servicio de pago no disponible**
```json
{
  "detail": "Error al conectar con MercadoPago. Intenta más tarde."
}
```

---

## 🔍 Endpoint: Obtener Estado de Pago

### GET /estado/{tournament_team_id}

Consulta el estado actual del pago de un equipo.

#### Request

```bash
curl -X GET http://localhost:8000/api/pagos/estado/team-123 \
  -H "Authorization: Bearer eyJhbGc..."
```

#### Response (200 OK)

```json
{
  "tournament_team_id": "team-123",
  "payment_id": "pay-c8e7f3d2-9a1b-4c5d-8e2f-7a3b9c1d5e8f",
  "amount": 500.00,
  "currency": "ARS",
  "status": "approved",
  "provider": "mercadopago",
  "external_payment_id": "00000000121506370",
  "refund_amount": null,
  "created_at": "2026-05-17T10:30:22.123456",
  "updated_at": "2026-05-17T10:35:15.654321",
  "next_action": "El equipo está inscripto y puede participar"
}
```

#### Status Posibles

| Status | Significado | Próximo Paso |
|--------|-------------|--------------|
| `pending` | Pago creado, esperando acción usuario | Usuario debe ir a checkout_url |
| `processing` | Procesando en proveedor | Esperar 1-2 minutos |
| `approved` | Pago confirmado ✓ | Nada, equipo puede jugar |
| `rejected` | Pago rechazado ✗ | Intentar nuevamente |
| `refunded` | Dinero devuelto | Ver `refund_amount` |
| `cancelled` | Pago cancelado | Crear nuevo pago si es necesario |

#### Error Responses

**404 - Sin pagos registrados**
```json
{
  "detail": "No hay registros de pago para este equipo"
}
```

---

## 💵 Endpoint: Registrar Pago en Efectivo

### POST /manual/{tournament_team_id}

Registra un pago en efectivo hecho directamente en cancha. Requiere rol `delegado` o `admin`.

#### Request

```bash
curl -X POST http://localhost:8000/api/pagos/manual/team-123 \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "tournament_team_id": "team-123",
    "amount": 500.00,
    "received_by": "Juan García",
    "notes": "Pago recibit el día del sorteo"
  }'
```

#### Body Parameters

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `tournament_team_id` | string | Sí | ID del equipo inscripto |
| `amount` | decimal | Sí | Monto pagado (must match tournament fee) |
| `received_by` | string | Sí | Nombre del delegado que recibió efectivo (>2 chars) |
| `notes` | string | No | Notas adicionales (max 255 chars) |

#### Response (201 Created)

```json
{
  "status": "success",
  "payment_id": "pay-d7f8e4c3-a2c1-4d6e-9f3a-8b4c0d2e6f9a",
  "tournament_team_id": "team-123",
  "amount": 500.00,
  "currency": "ARS",
  "provider": "cash",
  "status": "approved",
  "received_by": "Juan García",
  "created_at": "2026-05-17T14:45:30.123456"
}
```

#### Error Responses

**400 - Monto no coincide**
```json
{
  "detail": "El monto pagado (400) no coincide con la tarifa del torneo (500 ARS)"
}
```

**400 - Nombre del delegado muy corto**
```json
{
  "detail": "El nombre del delegado debe tener al menos 3 caracteres"
}
```

**403 - Permiso denegado**
```json
{
  "detail": "Solo delegados o admins pueden registrar pagos manuales"
}
```

---

## 🔄 Endpoint: Realizar Reembolso

### POST /reembolso/{payment_id}

Procesa un reembolso de un pago aprobado. Solo para admins.

#### Request

```bash
curl -X POST http://localhost:8000/api/pagos/reembolso/pay-123 \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "refund_reason": "Disputa con el equipo",
    "refund_amount": 500.00
  }'
```

#### Body Parameters

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `refund_reason` | string | Sí | Motivo del reembolso (>10 chars) |
| `refund_amount` | decimal | No | Monto a devolver (si no se especifica, devuelve el 100%) |

#### Response (200 OK)

```json
{
  "status": "success",
  "payment_id": "pay-123",
  "refund_id": "refund-456",
  "original_amount": 500.00,
  "refund_amount": 500.00,
  "refund_reason": "Disputa con el equipo",
  "refund_status": "processing",
  "external_refund_id": "00000000987654321",
  "processed_at": "2026-05-17T15:20:10.123456",
  "expected_arrival": "2026-05-22T23:59:59"
}
```

#### Error Responses

**404 - Pago no existe**
```json
{
  "detail": "Pago no encontrado"
}
```

**400 - Pago no está aprobado**
```json
{
  "detail": "Solo puedes reembolsar pagos con estado 'approved'"
}
```

**403 - Permiso denegado**
```json
{
  "detail": "Solo admins pueden procesar reembolsos"
}
```

**503 - Error en proveedor**
```json
{
  "detail": "Error al procesar reembolso en MercadoPago",
  "error_code": "MP_ERROR_123"
}
```

---

## 🔗 Webhook: MercadoPago

### POST /webhook/mercadopago

MercadoPago envía notificaciones de cambios de estado a este endpoint. **NO requiere autenticación** (validada por signature).

#### Request (enviada por MercadoPago)

```bash
curl -X POST http://localhost:8000/api/pagos/webhook/mercadopago \
  -H "X-Signature: sha256=abcd1234..." \
  -H "Content-Type: application/json" \
  -d '{
    "id": "payment.success.1234567890",
    "data": {
      "id": "00000000121506370"
    }
  }'
```

#### Response

```json
{
  "status": "received",
  "message": "Pago actualizado correctamente"
}
```

#### Flujo Webhook

1. MercadoPago envía notificación →
2. Validamos signature usando `MERCADOPAGO_PUBLIC_KEY` →
3. Obtenemos detalles del pago desde MP API →
4. Actualizamos status en BD →
5. Inscripción del equipo se marca como `approved` →
6. Frontend recibe estado actualizado

**Nota:** Webhooks pueden llegar múltiples veces. Implementamos idempotencia validando que el status ya existe.

---

## 🔗 Webhook: Stripe (Futura Implementación)

### POST /webhook/stripe

Similar a MercadoPago pero para eventos de Stripe.

```bash
curl -X POST http://localhost:8000/api/pagos/webhook/stripe \
  -H "Stripe-Signature: t=12345,v1=abcd..." \
  -H "Content-Type: application/json" \
  -d '{
    "id": "evt_1234567890",
    "type": "payment_intent.succeeded",
    "data": {
      "object": {
        "id": "pi_1234567890abcdefgh",
        "status": "succeeded"
      }
    }
  }'
```

---

## 📊 Endpoint: Reporte de Pagos por Proveedor

### GET /reporte

Obtiene un reporte de pagos agrupados por proveedor. **Admin only.**

#### Request

```bash
curl -X GET "http://localhost:8000/api/pagos/reporte?estado=approved&proveedor=mercadopago" \
  -H "Authorization: Bearer eyJhbGc..."
```

#### Query Parameters

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `estado` | string | `all` | `pending`, `processing`, `approved`, `rejected`, `refunded`, `cancelled` |
| `proveedor` | string | `all` | `mercadopago`, `stripe`, `cash` |
| `torneo_id` | string | `all` | Filtrar por torneo específico |
| `limit` | int | 100 | Máximo resultados |

#### Response (200 OK)

```json
{
  "total_registros": 42,
  "total_monto": 21000.00,
  "currency": "ARS",
  "resumen": [
    {
      "proveedor": "mercadopago",
      "estado": "approved",
      "cantidad": 18,
      "monto_total": 9000.00,
      "comisión_total": 359.10,
      "monto_neto": 8640.90
    },
    {
      "proveedor": "stripe",
      "estado": "approved",
      "cantidad": 12,
      "monto_total": 6000.00,
      "comisión_total": 174.00,
      "monto_neto": 5826.00
    },
    {
      "proveedor": "cash",
      "estado": "approved",
      "cantidad": 12,
      "monto_total": 6000.00,
      "comisión_total": 0,
      "monto_neto": 6000.00
    }
  ],
  "detalles": [
    {
      "payment_id": "pay-123",
      "tournament_team_id": "team-abc",
      "equipo_nombre": "Real Madrid",
      "amount": 500.00,
      "provider": "mercadopago",
      "status": "approved",
      "created_at": "2026-05-17T10:30:22"
    }
    // ... más registros
  ]
}
```

---

## 🛡️ Seguridad

### Autenticación
- Todos los endpoints requieren JWT en header `Authorization: Bearer <token>`
- Excepto webhooks (validados por signature de proveedor)

###Rate Limiting
- GET: 10 request/minuto por usuario
- POST: 5 request/minuto por usuario
- Webhooks: ilimitados (validamos signature)

### Encriptación
- External IDs (MP, Stripe) almacenados encriptados en BD
- Variables de entorno con credenciales nunca en código

### Validación
- Todos los montos validados contra tarifa del torneo
- External ID de pago validado antes de actualizar siatus
- Signature de webhook validada con clave pública del proveedor

---

## 🔔 Estados de Pago - Diagrama de Transiciones

```
              +----------+
              | pending  |  (esperando usuario)
              +----+-----+
                   |
                   v
           (usuario hace click)
                   |
                   v
         +------------------+
         |   processing     |  (procesando en MP/Stripe)
         +--+---+-------+---+
            |   |       |
     aprobado| rechazado| error
            |   |       |
    +-------+   |   +---+
    |           |   |
    v           v   v
 approved   rejected cancelled
    |           |   
    v           |   
 (inscripción   |   
  confirmada)   |   
    |           |   
    +---+ (reintentar)
        |
        v
    pending (nuevo)


 approved
    |
    v
  refunded (solo admin)
```

---

## 📈 Métricas por Implementar (Sprint 2)

- GET /metricas/conversion - Tasa de conversión de pagos
- GET /metricas/tiempo-procesamiento - Tiempo promedio de aprobación
- GET /metricas/intentos-fallidos - Top 5 razones de rechazo
