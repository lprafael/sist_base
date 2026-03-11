# Plan de Ingesta de Datos Externos (Paraguay) - SIGEL

Este documento detalla las fuentes de información pública que serán procesadas e integradas en el esquema `external_data` para alimentar la inteligencia territorial del sistema SIGEL.

## 📁 Esquema de Ingesta

| Fuente | Entidad | Tabla Destino | Frecuencia Sugerida | Método Técnicos |
| :--- | :--- | :--- | :--- | :--- |
| **DNCP** | Licitaciones y Contratos | `dncp_licitaciones` | Diaria | API Proxy (JSON) |
| **Portal Info Pública** | Pedidos de Información | `portal_solicitudes` | Semanal | Scraping (BS4) |
| **INE / DGEEC** | Población Estimada | `ine_poblacion_estimada` | Anual | Carga CSV/Excel |
| **TSE / Padrones** | Locales de Votación | `electoral.ref_locales` | Por Evento | Scraping / PDF |

---

## 1. Dirección Nacional de Contrataciones Públicas (DNCP)
**Objetivo:** Monitorear la inversión pública en los distritos.

*   **URL Principal:** [Buscador de Licitaciones](https://www.contrataciones.gov.py/buscador/licitaciones.html)
*   **Datos Clave:**
    *   Título de la convocatoria.
    *   Monto adjudicado/estimado.
    *   Categoría (Construcción, Alimentos, Salud).
    *   RUC de la Municipalidad/Gobernación convocante.
*   **Valor Estratégico:** Permite al sistema mostrar qué obras se están ejecutando en el barrio o distrito del referente.

## 2. Portal Unificado de Información Pública (Ministerio de Justicia)
**Objetivo:** Seguimiento de la transparencia y gestión municipal.

*   **URL Principal:** [Portal de Información Pública](https://informacionpublica.paraguay.gov.py/)
*   **Datos Clave:**
    *   Institución destinataria del pedido.
    *   Asunto de la solicitud (ej. "Listado de funcionarios", "Costo de empedrado").
    *   Estado de la respuesta y plazos.
*   **Valor Estratégico:** Identificar temas de interés ciudadano en distritos específicos y monitorear la eficiencia de la gestión administrativa.

## 3. Instituto Nacional de Estadística (INE)
**Objetivo:** Obtener métricas sociodemográficas.

*   **URL Principal:** [INE Paraguay - Proyecciones](https://www.ine.gov.py/)
*   **Datos Clave:**
    *   Población total por distrito y año.
    *   Distribución por género y área (urbana/rural).
    *   Estimaciones de vivienda.
*   **Valor Estratégico:** Calcular el "Porcentaje de Alcance" de los simpatizantes registrados vs. la población total votante proyectada.

## 4. Ministerio de Hacienda (Datos Abiertos)
**Objetivo:** Análisis presupuestario.

*   **URL Principal:** [Portal de Datos Abiertos - Hacienda](https://datos.hacienda.gov.py/)
*   **Datos Clave:**
    *   Transferencias de Royalties y Fonacide a municipios.
    *   Ejecución presupuestaria nivel 3000-5000.
*   **Valor Estratégico:** Comparar lo proyectado en presupuesto vs. lo licitado en DNCP para detectar subejecuciones.

---

## ⚖️ Consideraciones Éticas y Legales

1.  **Ley 5282/14:** El sistema se limitará a consumir datos catalogados como "Información Pública" según la Ley de Libre Acceso Ciudadano.
2.  **Protección de Datos:** No se recopilarán datos sensibles de ciudadanos individuales desde estas fuentes, solo datos agregados o de gestión institucional.
3.  **Respeto a Servidores:** Implementación de `User-Agent` identificable y retardos (`delay`) para no estresar los servidores gubernamentales.

---
**Actualizado:** Marzo 2026
**Responsable:** Módulo SIGEL-Intelligence
