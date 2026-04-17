# Estructura Jerárquica SIGEL

Este documento detalla la jerarquía de usuarios y la lógica de subordinación dentro del sistema SIGEL. La estructura está diseñada para reflejar tanto la organización política (electoral) como la operativa (logística).

## 1. Niveles de Jerarquía

### Nivel 1: Administrador del Sistema (Admin)
*   **Alcance**: Global.
*   **Responsabilidades**: Gestión total de usuarios, configuración del sistema, visualización de todos los datos de todos los departamentos y distritos.
*   **Subordinación**: No tiene superior.

---

### Nivel 2: Candidato a Intendente (Intendente)
*   **Alcance**: Distrital (un municipio específico).
*   **Subordinación**: Reporta al **Admin** (si es creado por él) o actúa de forma independiente en su territorio.
*   **Personal a cargo**:
    *   **Concejales**: Candidatos que forman parte de su lista o equipo.
    *   **Referentes de Intendente**: Personal de confianza que gestiona votantes directamente para el intendente.
    *   **Choferes y Veedores**: Staff operativo asignado a su campaña.

---

### Nivel 3: Candidato a Concejal (Concejal)
*   **Alcance**: Distrital.
*   **Subordinación**: Puede ser independiente o estar subordinado a un **Intendente**.
*   **Personal a cargo**:
    *   **Referentes de Concejal**: Personal de confianza que gestiona votantes específicamente para captación del concejal.
    *   **Choferes y Veedores**: Staff operativo asignado a su equipo.

---

### Nivel 4: Referente
*   **Alcance**: Local/Barrial.
*   **Subordinación**: Siempre debe reportar a un **Intendente** o a un **Concejal**.
*   **Responsabilidades**: Carga de posibles votantes, gestión de base territorial y seguimiento de contactos. No puede crear otros usuarios.

---

### Nivel Operativo: Choferes y Veedores
*   **Alcance**: Logístico.
*   **Subordinación**: Reportan directamente a quien los creó (Intendente o Concejal).
*   **Responsabilidades**:
    *   **Choferes**: Traslado de votantes el día D.
    *   **Veedores**: Fiscalización de mesas y marcado de participación (quién ya votó).

---

## 2. Reglas de Visibilidad de Datos
El sistema aplica una lógica de "árbol" para la privacidad de datos:
1.  **Hacia Abajo**: Un superior puede ver todos los registros (votantes, actividades, reportes) cargados por él mismo y por todos sus subordinados.
2.  **Hacia Arriba**: Un subordinado **no puede** ver los registros de su superior ni de sus "pares" (otros referentes del mismo superior).
3.  **Horizontal**: Los Referentes son estancos; no comparten información entre sí para evitar colisiones de base de datos.
