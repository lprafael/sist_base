# ESPECIFICACIÓN TÉCNICA DE DESARROLLO: SISTEMA DE PUNTUACIÓN Y ARBITRAJE - KARATE PKF

## 1. OBJETIVO DEL SISTEMA
Desarrollar un módulo automatizado de arbitraje, registro de puntuación y gestión de planillas digitales para torneos de Karate, replicando con exactitud la lógica oficial de la Federación Panamericana de Karate (PKF). El sistema debe contemplar dos motores de lógica independientes: **Modalidad de Combate (Kumite)** y **Modalidad de Formas (Kata)**.

---

## 2. ARQUITECTURA DE DATOS Y CORRESPONDENCIA CON PLANILLAS

### 2.1 Modelo de Combate (Kumite)
Cada combate estructurado en la planilla digital representa un nodo de datos con dos lados simétricos distinguidos por colores identificadores (AKA/Azul y AO/Rojo).

```json
{
  "combate_id": "UUID",
  "categoria": "STRING (Ej: U14_MASCULINO)",
  "division_peso": "STRING (Ej: -40kg)",
  "estado_cronometro": "STRING [RUNNING / STOPPED / ENDED]",
  "tiempo_restante": "STRING [MM:SS]",
  "competidores": {
    "aka_azul": {
      "nombre_apellido": "STRING",
      "pais_o_escuela": "STRING",
      "marcador_tiempo_real": {
        "puntos_acumulados": "INTEGER [0-N]",
        "senshu": "BOOLEAN (Ventaja del primer punto)",
        "jogai": "INTEGER (Salidas)",
        "penalizaciones_chui_hansoku": "INTEGER"
      },
      "video_review_card": "STRING [ACTIVE / USED_AND_LOCKED]",
      "resultado_final": "STRING [Ganador / Perdedor / Empate]"
    },
    "ao_rojo": {
      "nombre_apellido": "STRING",
      "pais_o_escuela": "STRING",
      "marcador_tiempo_real": {
        "puntos_acumulados": "INTEGER [0-N]",
        "senshu": "BOOLEAN (Ventaja del primer punto)",
        "jogai": "INTEGER (Salidas)",
        "penalizaciones_chui_hansoku": "INTEGER"
      },
      "video_review_card": "STRING [ACTIVE / USED_AND_LOCKED]",
      "resultado_final": "STRING [Ganador / Perdedor / Empate]"
    }
  }
}
```

### 2.2 Modelo de Formas (Kata - Votación por Banderas)
La planilla de formas (Kata) bajo el sistema PKF/WKF abolió el sistema de puntuación decimal y utiliza un sistema de decisión por mayoría absoluta con paneles de 5 o 7 jueces evaluando un enfrentamiento directo entre AKA y AO.

```json
{
  "ronda_formas_id": "UUID",
  "categoria": "STRING",
  "enfrentamiento": {
    "aka_azul": {
      "nombre_apellido": "STRING",
      "pais_o_escuela": "STRING",
      "votos_recibidos": "INTEGER [0-7]"
    },
    "ao_rojo": {
      "nombre_apellido": "STRING",
      "pais_o_escuela": "STRING",
      "votos_recibidos": "INTEGER [0-7]"
    }
  },
  "votacion_jueces": {
    "juez_1": "STRING [AKA_AZUL / AO_ROJO]",
    "juez_2": "STRING [AKA_AZUL / AO_ROJO]",
    "juez_3": "STRING [AKA_AZUL / AO_ROJO]",
    "juez_4": "STRING [AKA_AZUL / AO_ROJO]",
    "juez_5": "STRING [AKA_AZUL / AO_ROJO]",
    "juez_6": "STRING [AKA_AZUL / AO_ROJO] (Opcional)",
    "juez_7": "STRING [AKA_AZUL / AO_ROJO] (Opcional)"
  },
  "resultado": {
    "ganador": "STRING [AKA_AZUL / AO_ROJO]",
    "diferencia_votos": "STRING (Ej: 4-1)"
  }
}
```

## 3. REGLAS DE NEGOCIO Y MOTORES DE LÓGICA (BACKEND)

### 3.1 MOTOR DE COMBATE (KUMITE)

El sistema operará con un marcador dinámico en tiempo real para sumar los puntos técnicos y registrar penalizaciones.

A. Asignación de Puntos Técnicos
* **Yuko (+1 Punto):** Golpes de puño directos (Tsuki) o golpes con la mano (Uchi).
* **Waza-Ari (+2 Puntos):** Patadas a la zona media del cuerpo (Chudan).
* **Ippon (+3 Puntos):** Patadas a la zona superior (cabeza/cuello - Jodan) o técnicas de mano aplicadas a un oponente caído.

B. Validaciones y Revisiones
* **Regla de Zanshin:** Retiro de un punto previamente marcado. El sistema debe permitir una acción de "Punto Invalidado" que reste el punto asignado y actualice el marcador en tiempo real si el árbitro dictamina que el competidor perdió la concentración.
* **Control de Video Review:** Cada entrenador (coach) inicia con 1 tarjeta activa. 
  - Si una apelación es rechazada, la propiedad `video_review_card` pasa a `USED_AND_LOCKED`.
  - Si es exitosa, se mantiene `ACTIVE`.

C. Lógica de Categorías y Tiempos de Combate
El backend debe parametrizar el tiempo de combate y requerimientos según la categoría:
* **U12 (10-11 años) y U14 (12-13 años):** Tiempo cronometrado en 1:30 minutos. Validación obligatoria en UI de "Casco y Peto Externo".
* **Junior (16-17 años):** Tiempo cronometrado en 2:00 minutos.

### 3.2 MOTOR DE EVALUACIÓN DE FORMAS (KATA)

A. Algoritmo de Mayoría Absoluta
El backend no calcula promedios ni descartes matemáticos de decimales. El algoritmo para decidir el ganador es la moda estadística de un enfrentamiento directo entre dos competidores:

```python
def calcular_ganador_kata(votos_jueces):
    # votos_jueces es un arreglo con las decisiones de los jueces. Ej: ["AKA_AZUL", "AKA_AZUL", "AO_ROJO", "AKA_AZUL", "AO_ROJO"]
    votos_aka = votos_jueces.count("AKA_AZUL")
    votos_ao = votos_jueces.count("AO_ROJO")
    
    if votos_aka > votos_ao:
        return "AKA_AZUL", f"{votos_aka}-{votos_ao}"
    else:
        return "AO_ROJO", f"{votos_ao}-{votos_aka}"
```

B. Flujo de Datos
- Las terminales de los jueces envían únicamente "AKA_AZUL" o "AO_ROJO".
- La mesa de control acumula estos valores en tiempo real (de forma invisible para el público).
- Al cerrarse la votación por el juez principal o *Tatami Manager*, el sistema asigna la victoria automática a quien obtenga la mayoría absoluta (3 o más votos en un panel de 5; 4 o más votos en un panel de 7).

## 4. ESPECIFICACIONES DE INTERFAZ DE USUARIO (UI/UX)

* **Tableros de Control de Mesa (Kumite):** La interfaz debe incluir el cronómetro en el centro. A los lados (Azul y Rojo), botones grandes para sumar puntos (Yuko, Waza-Ari, Ippon). También debe existir un botón claro para "Invalidar Punto (Falta de Zanshin)" y otro para gestionar la "Video Review Card" (mostrándose inactiva al bloquearse).
* **Pantallas de Monitoreo General (Kata):** Durante la evaluación de Kata, no se muestran puntos intermedios al público. Al momento de la resolución, la pantalla debe encender gráficos de banderas (Azul o Rojo) por cada juez y mostrar parpadeando el nombre del ganador oficial por decisión mayoritaria. Se debe emitir el cambio de estado en milisegundos usando WebSockets para mantener sincronizada la vista pública con la mesa.
