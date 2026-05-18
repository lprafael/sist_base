# Análisis Detallado: Módulo de Torneos Deportivos
**Fecha:** 17 de mayo de 2026  
**Estado de Implementación:** ~30% completado  
**Stack Actual:** Python (FastAPI) + Next.js + React + PostgreSQL

---

## 📊 RESUMEN EJECUTIVO

El proyecto cuenta con una **implementación parcial** del módulo de torneos. Se ha construido una base fundamental pero falta una gran cantidad de funcionalidad crítica, especialmente en:
- ✅ COMPLETADO: Backend básico (endpoints de CRUD)
- ✅ COMPLETADO: Schema PostgreSQL inicial
- ✅ COMPLETADO: Frontend con vistas públicas (página de torneos)
- ❌ FALTA: Módulo de pagos (MercadoPago/Stripe)
- ❌ FALTA: Sistema de modalidades avanzadas (Suizo, Grupos + Elim)
- ❌ FALTA: Sorteo y generación de fixture
- ❌ FALTA: Carga de resultados y estadísticas
- ❌ FALTA: Sistema de tarjetas/sanciones
- ❌ FALTA: Panel administrativo completo
- ❌ FALTA: Tests y validaciones

---

## 🏗️ DIVERGENCIAS DEL PROMPT ESPECIFICADO

### **Stack Tecnológico Propuesto vs Implementado**

| Componente | Especificado | Implementado | Observación |
|-----------|-------------|---------|------------|
| Backend | Node.js + Express | Python + FastAPI | ⚠️ Stack diferente |
| Frontend Admin | React 18 + Vite | Next.js 16 | ✅ Similar, ligeramente más moderno |
| Frontend Web | React 18 + Vite | React (custom setup) | ✅ Compatible |
| ORM | Prisma | SQLAlchemy | ✅ Funcional, requiere migraciones |
| BD | PostgreSQL 16 | PostgreSQL | ✅ OK |
| Autenticación | JWT | JWT | ✅ OK |
| Pagos | MercadoPago + Stripe | ❌ NO IMPLEMENTADO | ⚠️ CRÍTICO |
| Email | Nodemailer | Nodemailer (Python) | ✅ Compatible |

**Impacto:** El backend en Python en lugar de Node.js significa que la integración con el prompt requiere adaptación. Se necesitará transpilar o reescribir la lógica de negocio a Python.

---

## 📦 ESTADO ACTUAL DEL CÓDIGO

### **1. Base de Datos (PostgreSQL)**

> **Ubicación:** Schema `cancha.*`

**Tablas Implementadas:**

```sql
-- Tablas de torneos (PARCIALMENTE IMPLEMENTADAS)
📋 cancha.torneos
   - id, nombre, complejo_id, deporte, fecha_inicio, fecha_fin
   - costo_inscripcion, formato, descripcion, estado
   ⚠️ FALTANTES: modalidades avanzadas, config de pagos, configs de reglas

📋 cancha.torneos_equipos
   - id, torneo_id, equipo_id, nombre_equipo, estado_inscripcion
   ⚠️ FALTANTES: grupo, seed, estado de pago, datos del delegado

📋 cancha.torneos_partidos
   - id, torneo_id, equipo_local_id, equipo_visitante_id
   - fecha_hora, resultado_local, resultado_visitante, estado
   ⚠️ FALTANTES: cancha, árbitro, goles por jugador, tarjetas

❌ TABLAS NO CREADAS:
   - payments (pagos)
   - goals (goles)
   - cards (tarjetas)
   - sanctions (sanciones)
   - tournament_players (jugadores en torneo)
   - standings/materialized views (tabla de posiciones)
```

**Schema incompleto:** Solo se cubren ~40% de las tablas necesarias.

---

### **2. Backend (FastAPI - Python)**

> **Ubicación:** `backend/main.py` (líneas 932-1250+)

#### **Endpoints Implementados:**

```python
✅ GET    /cancha/torneos
   → Obtiene todos los torneos de todos los complejos
   
✅ GET    /cancha/torneos/{torneo_id}/equipos
   → Lista equipos de un torneo
   
✅ GET    /cancha/torneos/{torneo_id}/partidos
   → Lista partidos de un torneo
   
✅ POST   /cancha/torneos
   → Crear nuevo torneo (sin validaciones fuertes)
   
✅ POST   /cancha/torneos/{torneo_id}/equipos
   → Inscribir equipo en torneo
   
✅ PATCH  /cancha/torneos/partidos/{partido_id}
   → Actualizar resultado de partido (BÁSICO)
   
✅ POST   /cancha/torneos/{torneo_id}/fixture
   → Generar fixture automático
   
❌ NO IMPLEMENTADOS (Críticos):
   - Módulo de pagos (webhooks MercadoPago/Stripe)
   - Sorteo aleatorio (Fisher-Yates)
   - Sistema de sanciones (tarjetas amarillas/rojas)
   - Cálculo de tabla de posiciones
   - Gestión de jugadores/lista de buena fe
   - Estadísticas (goleadores, arqueros)
```

#### **Problemas Identificados en Backend:**

1. **Sin validaciones de negocio**: No verifica que todo el equipo esté confirmado antes de sortear
2. **Fixture limitado**: Solo soporta round-robin básico, no soporta:
   - Modalidad Suizo
   - Fase de grupos + eliminatorias
   - Bracket (eliminación directa)
3. **Sin persistencia de reglas**: `config JSONB` está vacío
4. **Sin logs auditados**: Cambios de resultados no se registran
5. **Sin validaciones de integridad**: Un cliente puede crear un torneo sin complejo
6. **Falta verificación de permisos**: Mix de endpoints públicos y privados sin distinción clara

---

### **3. Frontend (React + Next.js)**

#### **A. Vistas Públicas (Implementadas - 60%)**

```
✅ /torneos (página listado)
   └─ Componentes:
      ✅ TournamentsSection.tsx (héroe + grid de cards)
      ✅ torneos/page.tsx (página dedicada con búsqueda)
      
   Características:
   ✅ Listado con búsqueda
   ✅ Filtro por deporte y complejo
   ✅ Card con info básica (nombre, fecha, deporte)
   ❌ FALTA: Link a detalle de torneo
   ❌ FALTA: Tabla de posiciones en /t/[slug]
   ❌ FALTA: Fixture visible público
   ❌ FALTA: Goleadores
```

#### **B. Panel Administrativo (No Implementado - 0%)**

```
❌ /admin/torneos
   → Crear/editar torneos
   
❌ /admin/torneos/:id/equipos
   → Gestionar inscripciones y pagos
   
❌ /admin/torneos/:id/sorteo
   → Ejecutar sorteo
   
❌ /admin/torneos/:id/fixture
   → Visualizar y modificar fixture
   
❌ /admin/torneos/:id/resultados
   → Carga rápida de resultados (mobile-friendly)
   
❌ /admin/torneos/:id/sanciones
   → Gestión de tarjetas y sanciones
   
❌ /admin/torneos/:id/pagos
   → Panel financiero (pagos confirmados/pendientes)
   
❌ /admin/torneos/:id/reportes
   → Exportar estadísticas y fixture
```

**Estado: El admin/panel es completamente basic (Next.js + Tailwind) pero sin rutas de torneos**

---

## ⚠️ PROBLEMAS CRÍTICOS

### **1. Módulo de Pagos - COMPLETAMENTE FALTANTE**

```
❌ NO HAY:
   - Integración con MercadoPago
   - Integración con Stripe
   - Tabla de pagos en BD
   - Webhooks para notificaciones
   - Lógica de inscripción con pago
   - Estado de inscripción vinculado a pago

IMPACTO: Sin esto, no hay ingresos por inscripciones.
```

### **2. Generación de Fixture - MUY BÁSICA**

```python
# Lo actual (simplificado)
for idx, (equipo1, equipo2) in enumerate(pares_aleatorios):
    INSERT INTO torneos_partidos (...)

# Problemas:
- Solo round-robin lineal
- No crea varias rondas
- No maneja byes
- No maneja ida+vuelta
- No genera bracket correctamente
- No calcula cruces de grupos correctamente
```

### **3. Ausencia de Sistema de Goles/Tarjetas**

```
Sin tablas: goals, cards, sanctions
Sin endpoints para cargar:
   - Goles (con minuto, tipo, jugador)
   - Tarjetas amarillas/rojas
   - Sanciones manuales
   - Apelaciones
```

### **4. No hay Cálculo de Tabla de Posiciones**

```
- Sin materialized views
- Sin procedimiento para recalcular (PJ, PG, PE, PP, GF, GC, DG, PTS)
- Sin desempates (diferencia, goles, enfrentamiento directo)
```

### **5. Autenticación/Autorización Inconsistente**

```
- Endpoints de torneos: SIN autenticación requerida
- Endpoints de pagos: NO EXISTEN
- Panel admin: NO TIENE rutas específicas
- No hay validación de "es admin del torneo"
```

### **6. Gestión de Jugadores/Plantilla - FALTA**

```
No existe:
- Tabla tournament_players
- Upload de jugadores por equipo
- Validación de DNI único
- Número de camiseta único
- Foto de jugador en Cloudinary
- Lista de buena fe (PDF exportable)
```

---

## 📋 ARQUITECTURA ACTUAL vs PROPUESTA

### **Diagrama Conceptual (Estado Actual)**

```
┌─────────────────────────────────────────────────┐
│         CAPA DE PRESENTACIÓN (Frontend)          │
├──────────────────────┬──────────────────────────┤
│  Vistas Públicas     │  Panel Admin (INCOMPLETO)│
│  ✅ /torneos         │  ❌ /admin/torneos/*    │
│  ❌ /t/:slug         │  ❌ /admin/pagos/*      │
│  ❌ /t/:slug/fixture │  ❌ /admin/resultados/* │
└──────────────────────┴──────────────────────────┘
                    ▼
┌──────────────────────────────────────────────────┐
│         CAPA API (Backend FastAPI)               │
├──────────────────────────────────────────────────┤
│ ✅ GET  /cancha/torneos                         │
│ ✅ POST /cancha/torneos                         │
│ ✅ GET  /cancha/torneos/{id}/equipos            │
│ ✅ POST /cancha/torneos/{id}/equipos            │
│ ❌ POST /api/pagos/* (NO EXISTE)               │
│ ❌ POST /api/pagos/webhook/* (NO EXISTE)       │
│ ❌ POST /api/goles/* (NO EXISTE)               │
│ ❌ POST /api/tarjetas/* (NO EXISTE)            │
│ ❌ POST /api/sanciones/* (NO EXISTE)           │
└──────────────────────────────────────────────────┘
                    ▼
┌──────────────────────────────────────────────────┐
│         CAPA DE BD (PostgreSQL)                  │
├──────────────────────────────────────────────────┤
│ ✅ torneos, torneos_equipos, torneos_partidos   │
│ ❌ payments                                      │
│ ❌ goals, cards, sanctions                      │
│ ❌ tournament_players                           │
│ ❌ standings (materialized view)                │
│ ❌ audit_log                                    │
└──────────────────────────────────────────────────┘
```

---

## 🔧 RECOMENDACIONES POR PRIORIDAD

### **P0 - BLOQUEANTE (Implementar Primero)**

1. **Módulo de Pagos (MercadoPago)**
   - Crear tabla `payments` en PostgreSQL
   - Endpoints de pago: `POST /api/pagos/inscripcion/:id`
   - Webhooks: `POST /api/pagos/webhook/mercadopago`
   - Integración @mercadopago/sdk-python (no existe en reqs)
   - **Tiempo estimado:** 2-3 días

2. **Sistema de Goles + Tarjetas**
   - Crear tablas `goals`, `cards`, `sanctions`
   - Endpoints: `POST /api/partidos/:id/goles`, `POST /api/partidos/:id/tarjetas`
   - Validaciones: DNI único, camiseta única, suspensiones
   - **Tiempo estimado:** 1-2 días

3. **Tabla de Posiciones**
   - Crear materialized view `standings`
   - Procedure para recalcular al guardar resultado
   - Desempates (diferencia, goles, enfrentamiento)
   - **Tiempo estimado:** 1 día

### **P1 - IMPORTANTE (Siguiente Sprint)**

4. **Panel Administrativo Completo**
   - Crear rutas en Next.js: `/admin/torneos`, `/admin/pagos`, etc.
   - Formulario de torneos con config de pagos y modalidades
   - Panel de sanciones con apelaciones
   - Panel de pagos con recordatorios
   - **Tiempo estimado:** 3-4 días

5. **Sorteo + Fixture Avanzado**
   - Implementar Fisher-Yates para sorteo
   - Completar algoritmo de Berger para round-robin
   - Agregar modalidad Suizo
   - Agregar modalidad Grupos + Elim
   - Agregar Bracket (eliminación directa)
   - **Tiempo estimado:** 3-4 días

6. **Gestión de Jugadores/Plantilla**
   - Crear tabla `tournament_players`
   - Upload a Cloudinary
   - Validaciones (DNI, camiseta)
   - Exportar lista de buena fe
   - **Tiempo estimado:** 2 días

### **P2 - DESEADO (Nice-to-Have)**

7. **Notificaciones por Email**
   - Plantillas HTML para confirmaciones, recordatorios, resultados
   - Queue con bull/bullmq
   - Cron jobs para recordatorios de pago
   
8. **Tests Automatizados**
   - Jest + Supertest para API
   - Vitest para frontend
   - Coverage mínimo 70%

---

## 📝 CHECKLIST DE IMPLEMENTACIÓN

### **Fase 1: Infraestructura Base (1 semana)**
- [ ] Crear tablas en BD (payments, goals, cards, sanctions, tournament_players)
- [ ] Crear materialized view de standings
- [ ] Instalar SDK de MercadoPago para Python
- [ ] Crear endpoints de pagos (basic)
- [ ] Crear endpoints de goles y tarjetas

### **Fase 2: Lógica de Negocio (2 semanas)**
- [ ] Webhook de MercadoPago funcional
- [ ] Lógica de inscripción con pago
- [ ] Cálculo automático de tabla de posiciones
- [ ] Sistema de sanciones (tarjetas → suspensión)
- [ ] Sorteo y fixture mejorados

### **Fase 3: Frontend Admin (1 semana)**
- [ ] Crear navegación del admin
- [ ] Formulario de creación de torneos
- [ ] Panel de sanciones
- [ ] Panel de pagos
- [ ] Visualización de fixture editable

### **Fase 4: Vistas Públicas (1 semana)**
- [ ] Página de detalle de torneo
- [ ] Fixture pública
- [ ] Tabla de posiciones
- [ ] Estadísticas (goleadores, arqueros)

### **Fase 5: Polish + Deploy (1 semana)**
- [ ] Tests automatizados
- [ ] Documentación
- [ ] Optimización de rendimiento
- [ ] Trial de pagos reales

**Total estimado:** 6 semanas

---

## 📊 COMPARATIVA: ESPECIFICACIÓN vs IMPLEMENTACIÓN

| Feature | Especificado | Implementado | Porcentaje |
|---------|-------------|---------|----------|
| **DB Schema** | 13 tablas | 3 tablas | ~23% |
| **Backend Endpoints** | 28 endpoints | 7 endpoints | ~25% |
| **Modalidades** | 4 (Liga, Grupos, Bracket, Suizo) | 1 (Liga básica) | ~25% |
| **Pagos** | MercadoPago + Stripe | 0% | 0% |
| **Admin Frontend** | 8 vistas | 0 vistas | 0% |
| **Pública Frontend** | 4 vistas | 2 vistas (incompletas) | ~50% |
| **Tests** | Coverage 70%+ | 0% | 0% |
| **Seguridad** | JWT + validaciones | JWT básico | ~50% |
| **Documentación** | API docs + guías | README solo | ~10% |

**Implementación General: ~30%**

---

## 🚨 DEUDA TÉCNICA DETECTADA

1. **SQL inyecciones potenciales**: Algunos endpoints usan text() sin validación suficiente
2. **Sin rate limiting**: Endpoints públicos sin protección
3. **Sin CORS configurado**: Potencial para CSRF
4. **Contraseñas débiles**: No hay hints de complejidad en creación de usuarios
5. **Sin versionamiento de API**: Versión v1 no está clara
6. **Logs insuficientes**: Cambios de resultados no auditados
7. **Sin caché**: Queries repetidas sin N+1 optimization
8. **Código desorganizado**: Todo en main.py (1650+ líneas)

---

## 💡 SUGERENCIAS DE MEJORA

### **A Corto Plazo**
1. Separar backend en múltiples archivos (routers)
2. Usar Pydantic para validar requests/responses
3. Agregar rate limiting con slowapi
4. Configurar CORS correctamente
5. Crear migraciones Alembic para BD

### **A Medio Plazo**
1. Reescribir en Node.js si quieren seguir el prompt exacto
2. O mantener Python pero actualizar dependencias
3. Implementar tests desde el inicio (TDD)
4. Documento de API con Swagger completeado

### **A Largo Plazo**
1. Migrar a arquitectura de microservicios si crece
2. Agregar cache (Redis) para standings
3. Implementar real-time con WebSockets
4. Analytics y reporting avanzado

---

## 📚 ARCHIVOS CLAVE

| Ruta | Función | Estado |
|------|---------|--------|
| `backend/main.py` | API principal | ⚠️ Monolítica |
| `admin/src/` | Panel administrativo | ❌ Incompleto |
| `web/src/` | Frontend público | ⚠️ Parcial |
| `DATABASE_STRUCTURE.md` | Documentación | ❌ Desactualizada |
| `backend/requirements.txt` | Dependencias | ⚠️ Sin MercadoPago |
| `docker-compose.yml` | Orquestación | ✅ OK |

---

## 🎯 CONCLUSIÓN

El módulo de torneos está en una **fase inicial viable** pero requiere un **esfuerzo considerable** para llegar a producción. El 70% del trabajo aún está pendiente, especialmente:

1. **Integración de pagos** (bloqueante para monetización)
2. **Panel administrativo** (mandatorio para operación)
3. **Lógica avanzada de torneos** (diferenciador competitivo)

La recomendación es completar la **Fase 1 y Fase 2** antes de hacer cambios cosméticos. Invertir en infraestructura primero, UI después.

---

**Documento generado automáticamente**  
**Para preguntas o actualizaciones, contactar al equipo técnico**
