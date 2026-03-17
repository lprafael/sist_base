# Estructura de Datos y Lógica de Integración - SIGEL

Este documento detalla la organización de la base de datos PostgreSQL local y cómo se integran los datos electorales con la cartografía geográfica.

## 1. Esquemas de Base de Datos

### Esquema `electoral`
Contiene los datos maestros de las elecciones y el padrón.
- **`ref_departamentos`**: Catálogo oficial (IDs del 0 al 17).
- **`ref_distritos`**: Catálogo oficial de distritos (vinculados por `departamento_id`).
- **`anr_padron`**: Datos del padrón nacional.
- **`posibles_votantes`**: Registros con coordenadas (latitud/longitud) para análisis espacial.

### Esquema `cartografia`
Contiene las capas geográficas (PostGIS) subidas desde archivos GeoJSON.
- **`departamentos`**: Polígonos de los departamentos.
- **`distritos`**: Polígonos de los distritos.
- **`barrios`**: Capa más granular de análisis (7,994 registros).

---

## 2. Lógica de Vinculación (Linking)

Para que el mapa interactúe con los datos electorales, necesitamos un puente entre los polígonos y los IDs del catálogo.

### Vinculación Departamental
Durante la carga (`upload_cartografia.py`), se extrae el ID del departamento desde el nombre de las carpetas (ej: `11 CENTRAL` -> ID 11) y se guarda en `dpto_id_ref`.

### Vinculación de Distritos (Fuzzy Matching)
Se utiliza el script `global_link_barrios.py` que realiza las siguientes comparaciones:
1. **Normalización**: Se quitan acentos, puntos y espacios (ej: `AREGUÁ` -> `AREGUA`).
2. **Búsqueda Exacta**: Coincidencia de nombres normalizados dentro del mismo departamento.
3. **Búsqueda Parcial**: Si no hay coincidencia exacta, se busca si el nombre de cartografía está contenido en el catálogo o viceversa (útil para nombres largos como `MARISCAL FRANCISCO SOLANO LOPEZ`).

Actualmente, el **94% de los barrios** están vinculados correctamente.

---

## 3. Integración de Población (Censo 2022)

Los datos de población se ingesan desde archivos Excel (`ingest_population.py`).
- **Nivel de detalle**: Barrio/Localidad.
- **Campos**: `poblacion_total`, `poblacion_hombres`, `poblacion_mujeres`.
- **Match**: Se realiza mediante un cruce triple entre:
  - Nombre del Distrito (Excel vs Cartografía).
  - Nombre del Barrio (Excel vs Cartografía).
  - Normalización de texto (unaccent + regexp_replace).

---

## 4. Estado Actual de la Integridad (Corte 16/03/2026)

| Componente | Estado | Detalle |
| :--- | :--- | :--- |
| PostGIS | ✅ Activo | Local (Puerto 5432) - Funcionando correctamente. |
| Cartografía | ✅ Cargada | 7,994 barrios con polígonos y SRID 4326. |
| Vinculación Electoral | ✅ 99.5% | 7,955 barrios vinculados al catálogo oficial de distritos. |
| Datos Población | ℹ️ Central | 621 barrios de Central con datos de habitantes (Censo 2022). |

### Notas de Depuración:
1.  **Limpieza de IDs**: Se detectó una inconsistencia en los IDs de los departamentos de la zona del Chaco (Boquerón y Alto Paraguay). Ambos fueron normalizados a los IDs del catálogo electoral (16 y 17 respectivamente).
2.  **Match de Nombres Complejos**: Se aplicaron alias para distritos con nombres variantes, como:
    *   `PUERTO LA VICTORIA` -> `PUERTO CASADO`
    *   `LA PALOMA DEL ESPIRITU SANTO` -> `LA PALOMA`
    *   `FILADELFIA` y `LOMA PLATA` (detectados y vinculados correctamente).
3.  **Casos Pendientes**: Solo quedan 39 barrios sin vincular (0.5% del total), principalmente concentrados en áreas de Cordillera con nombres muy específicos (ej: 'SANTOS MARTIRES').

## 5. Cobertura de Población (Censo 2022)

Actualmente, **solo el Departamento Central** muestra datos de habitantes (`poblacion_total`). 
- **Razón**: El único archivo de origen disponible con el desglose por barrio es `Dpto Central_Población_Barrios_CNPV 2022`.
- **Otros Departamentos**: Aparecerán con población **0** hasta que se provean los archivos similares para el resto del país (Asunción, Alto Paraná, etc.).
- **Visualización**: El GeoDashboard está preparado para mostrar estos datos, pero dependen de la existencia de estos registros en la tabla `cartografia.barrios`.
