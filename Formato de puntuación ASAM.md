Aquí tienes un documento técnico en formato .md extremadamente detallado y estructurado como una **especificación de requerimientos de software (SRS)**. Está diseñado específicamente para que un Agente de IA de desarrollo pueda comprender las entidades, las reglas de negocio, los algoritmos de desempate y la estructura de datos para replicar fielmente el sistema de la ASAM.  
Markdown  
\# ESPECIFICACIÓN TÉCNICA DE DESARROLLO: SISTEMA DE PUNTUACIÓN Y ARBITRAJE \- ASAM

\#\# 1\. OBJETIVO DEL SISTEMA  
\[cite*\_start\]Desarrollar un módulo automatizado de arbitraje, registro de puntuación y gestión de planillas digitales para torneos de Artes Marciales, replicando con exactitud lógica y matemática el reglamento oficial y las planillas de la Asociación Sudamericana de Artes Marciales (ASAM)\[cite: 1, 94, 152\]. \[cite\_*start\]El sistema debe contemplar dos motores de lógica independientes: **\*\*Modalidad de Combate\*\*** y **\*\*Modalidad de Formas\*\***\[cite: 1, 94, 152\].

\---

\#\# 2\. ARQUITECTURA DE DATOS Y CORRESPONDENCIA CON PLANILLAS

\#\#\# \[cite*\_start\]2.1 Modelo de Combate (Entidades de la Planilla de Combate) \[cite: 94\]*  
*\[cite\_*start\]Cada combate mapeado en la planilla física representa un nodo de datos estructurado en dos lados simétricos distinguidos por colores identificadores (BLANCO y ROJO)\[cite: 100, 102\].

\`\`\`json  
{  
  "combate\_id": "UUID",  
  "categoria": "STRING",  
  "oficiales\_mesa": {  
    "planillero": "STRING",  
    "cronometrista": "STRING"  
  },  
  "jueces": \["Juez\_1", "Juez\_2", "Juez\_3"\],  
  "competidores": {  
    "blanco": {  
      "nombre\_apellido": "STRING",  
      "numero\_afederado": "STRING",  
      "marcador\_tiempo\_real": {  
        "puntos\_acumulados": "INTEGER \[0-N\]",  
        "faltas\_acumuladas": "INTEGER \[0-2\]",  
        "salidas\_acumuladas": "INTEGER \[0-5\]"  
      },  
      "resultado\_final": "STRING \[Ganador / Perdedor / Empate\]"  
    },  
    "rojo": {  
      "nombre\_apellido": "STRING",  
      "numero\_afederado": "STRING",  
      "marcador\_tiempo\_real": {  
        "puntos\_acumulados": "INTEGER \[0-N\]",  
        "faltas\_acumuladas": "INTEGER \[0-2\]",  
        "salidas\_acumuladas": "INTEGER \[0-5\]"  
      },  
      "resultado\_final": "STRING \[Ganador / Perdedor / Empate\]"  
    }  
  }  
}

2.2 Modelo de Formas (Entidades de la Planilla de Formas)  
La planilla de formas se gestiona mediante una matriz lineal donde cada fila corresponde a la evaluación de un atleta por un panel de 3 a 5 jueces.  
JSON  
{  
  "ronda\_formas\_id": "UUID",  
  "categoria": "STRING",  
  "competidores\_lista": \[  
    {  
      "numero\_orden": "INTEGER",  
      "nombre\_apellido": "STRING",  
      "numero\_afederado\_pais": "STRING",  
      "puntuaciones\_jueces": {  
        "juez\_1": "FLOAT \[0.0 \- 10.0\]",  
        "juez\_2": "FLOAT \[0.0 \- 10.0\]",  
        "juez\_3": "FLOAT \[0.0 \- 10.0\]",  
        "juez\_4": "FLOAT \[0.0 \- 10.0\]",  
        "juez\_5": "FLOAT \[0.0 \- 10.0\]"  
      },  
      "calculo\_intermedio": {  
        "puntaje\_descartado\_alto": "FLOAT",  
        "puntaje\_descartado\_bajo": "FLOAT"  
      },  
      "total\_acumulado": "FLOAT",  
      "posicion\_final": "INTEGER"  
    }  
  \]  
}

## **3\. REGLAS DE NEGOCIO Y MOTORES DE LÓGICA (BACKEND)**

### **3.1 MOTOR DE COMBATE INDIVIDUAL**

El sistema procesará los eventos en tiempo real disparados por el arbitraje de mesa.  
A. Flujo de Control de Salidas (Sanciones Leves)

* **Salida 1 y 2:** Incrementar salidas\_acumuladas del competidor. Sin impacto en el puntaje del oponente.  
* **Salida 3:** Incrementar salidas\_acumuladas. **Automatismo:** Agregar \+1 punto al marcador de puntos\_acumulados del rival.  
* **Salida 4:** Incrementar salidas\_acumuladas. **Automatismo:** Agregar \+1 punto extra al marcador de puntos\_acumulados del rival.  
* **Salida 5:** Incrementar salidas\_acumuladas. **Automatismo:** Detener el cronómetro del combate y ejecutar **Descalificación Automática por Salidas**. Marcar inmediatamente al rival como Ganador por descalificación.

B. Regla Excepcional de Salida Simultánea (Art. 18\)  
Si ocurre un evento de salida donde el software detecte simultaneidad estricta y se cumpla la precondición:

* competidor\_blanco(puntos \== 2 && salidas \== 2\) AND competidor\_rojo(puntos \== 2 && salidas \== 2\)  
* **Condicional A (Diferido):** El sistema debe registrar cuál ID de competidor cruzó primero. El primer ID otorga el punto de la victoria al segundo ID.  
* **Condicional B (Simultáneo absoluto):** Si los jueces dictaminan que la salida fue idéntica en tiempo cronológico, el sistema sumará \+1 punto a ambos competidores en el marcador simultáneamente.

C. Flujo de Control de Faltas (Sanciones Graves)

* **Falta 1:** Incrementar faltas\_acumuladas en 1. Almacenar en buffer para la matriz de desempate por decisión (*Hantei*).  
* **Falta 2:** Incrementar faltas\_acumuladas a 2. **Automatismo:** Interrupción del combate y descalificación directa del competidor infractor.  
* **Evento Especial Sangre / Falta Crítica (Art. 30 y 31):** El software debe disponer de un botón de acción rápida para "Descalificación Directa Inapelable". Al activarse en la interfaz, se da por finalizado el combate con derrota inmediata del infractor.

D. Algoritmo Matriz de Desempate (Criterio de Equivalencias \- Art. 17\)  
En caso de que el tiempo reglamentario finalice y tras la **extensión única de 1 minuto ("Punto de Oro")** el marcador de puntos se mantenga en empate estricto, el sistema aplicará la resolución algorítmica basada en el peso de las infracciones guardadas en la planilla:  
Python  
def calcular\_ganador\_hantei(comp\_A, comp\_B):  
    \# Regla base: Quien tenga infracciones vs quien no tenga, pierde.  
    \# Regla: Quien solo tiene salidas gana a quien tiene 1 falta \+ salidas  
    if comp\_A.faltas \> 0 and comp\_B.faltas \== 0:  
        if comp\_A.faltas \== 1 and comp\_B.salidas in \[1, 2\]:  
            return comp\_B \# Gana el de las salidas  
        if comp\_A.faltas \== 1 and comp\_B.salidas \== 3:  
            return "Empate Absoluto \- Requiere Voto de Banderas Manual"  
        if comp\_A.faltas \== 1 and comp\_B.salidas \== 4:  
            return comp\_A \# Gana el de la falta, 4 salidas penalizan más  
      
    if comp\_B.faltas \> 0 and comp\_A.faltas \== 0:  
        if comp\_B.faltas \== 1 and comp\_A.salidas in \[1, 2\]:  
            return comp\_A  
        if comp\_B.faltas \== 1 and comp\_A.salidas \== 3:  
            return "Empate Absoluto \- Requiere Voto de Banderas Manual"  
        if comp\_B.faltas \== 1 and comp\_A.salidas \== 4:  
            return comp\_B

    return "Evaluar Actividad General (Llamado a decisión de Jueces)"

3.2 MOTOR DE COMBATE POR EQUIPOS (Art. 19, 20 y 21\)  
Cuando un combate se configure dentro de un grupo con la bandera es\_competencia\_equipos \= true, el backend modificará las reglas de negocio globales:

1. **Anulación de Alargue Individual:** Si el combate finaliza en empate de puntos en el tiempo regular, el sistema **no** otorgará minutos extras de alargue. Registrará un estado de empate y asignará 0.5 puntos de control en la tabla general a cada escuela/equipo.  
2. **Algoritmo de Desempate de Puntuación Global:** Al finalizar los combates de la serie de equipos (3 o 5 integrantes), el sistema resolverá al ganador aplicando la sumatoria en el siguiente orden estricto de prioridades cascada:  
   * SUM(puntos\_marcados\_todos\_los\_combates) (Mayor cantidad gana).  
   * SUM(faltas\_acumuladas\_equipo) (Menor cantidad gana).  
   * SUM(salidas\_acumuladas\_equipo) (Menor cantidad gana).  
   * Si persiste el empate absoluto en los tres filtros anteriores, la base de datos disparará una bandera para forzar una nueva llave de combates de desempate.

3.3 MOTOR DE EVALUACIÓN DE FORMAS (Art. 5\)  
El procesamiento del puntaje para competidores individuales o equipos en la modalidad de Formas se rige por el siguiente motor aritmético estricto de filtrado y ordenamiento de arrays:  
Python  
def calcular\_puntaje\_formas(lista\_puntajes\_jueces):  
    \# lista\_puntajes\_jueces es un array de floats devuelto por el panel de jueces (ej: \[8.5, 9.0, 7.8, 9.2, 8.8\])  
    if len(lista\_puntajes\_jueces) \>= 3:  
        \# 1\. Identificar e interceptar los valores extremos  
        puntaje\_max \= max(lista\_puntajes\_jueces)  
        puntaje\_min \= min(lista\_puntajes\_jueces)  
          
        \# 2\. Remover una instancia del valor máximo y una del mínimo  
        lista\_filtrada \= list(lista\_puntajes\_jueces)  
        lista\_filtrada.remove(puntaje\_max)  
        lista\_filtrada.remove(puntaje\_min)  
          
        \# 3\. La suma de los restantes es el Puntaje Atribuido Base  
        total\_acumulado \= sum(lista\_filtrada)  
        return total\_acumulado, lista\_filtrada, puntaje\_min, puntaje\_max

Algoritmo de Cascadas de Desempate en Formas (Orden Jerárquico Obligatorio)  
En caso de coincidencia exacta en el total\_acumulado de dos o más atletas en la tabla de posiciones, el sistema de base de datos deberá ejecutar una secuencia de joins recursivos para romper el empate bajo la siguiente lógica lineal:

1. **Primer Filtro:** Comparar e incorporar a la suma el **puntaje menor no eliminado** (el valor más bajo dentro de la lista\_filtrada). El competidor con mayor valor en este campo gana la posición.  
2. **Segundo Filtro:** Comparar e incorporar a la suma el **puntaje mayor no eliminado** (el valor más alto dentro de la lista\_filtrada).  
3. **Tercer Filtro:** Comparar e incorporar a la suma el **puntaje menor eliminado** (puntaje\_min).  
4. **Cuarto Filtro:** Comparar e incorporar a la suma el **puntaje mayor eliminado** (puntaje\_max).  
5. **Quinto Filtro (Filtro Físico):** Si tras los 4 pasos aritméticos el empate persiste a nivel de base de datos, el sistema emitirá una alerta visual para requerir una nueva ejecución de forma física en el tatami para realizar un nuevo ingreso de datos.

## **4\. ESPECIFICACIONES DE INTERFAZ DE USUARIO (UI/UX)**

* **Tableros de Control de Mesa:** La interfaz del planillero para la modalidad de combate debe incluir botones incrementales grandes diferenciados por color para el registro interactivo e instantáneo de Puntos, Faltas y Salidas, asegurando su visualización simultánea.  
* **Pantallas de Clasificación:** El módulo de formas debe renderizar automáticamente una tabla dinámica con los campos: N°, Nombre y Apellido, A1, A2, A3, Total, Final, y N° de Orden. Los puntajes descartados (máximos y mínimos) deben marcarse visualmente tachados o con opacidad reducida para indicar transparencia en el procesamiento de datos.

\---

\#\#\# Instrucciones para el Agente de IA de Desarrollo:  
1\. \*\*Prioridad 1:\*\* Implementar la lógica del motor de combate respetando estrictamente el flujo cascada de las salidas (\`salidas\_acumuladas\`) y su conversión automática a puntos para el adversario\[cite: 42, 43\].  
2\. \*\*Prioridad 2:\*\* Traducir las equivalencias descritas para la decisión arbitral (\*Hantei\*) en validaciones de software antes de permitir que el usuario cierre manualmente una planilla empatada.  
3\. \*\*Prioridad 3:\*\* Replicar de manera exacta los 5 pasos del algoritmo de desempate para la modalidad de formas.

Sistema de Puntuación ASAM (Motor de Combate y Formas)
User Review Required
IMPORTANT

Aclaración sobre el Reglamento ASAM: Hay una pequeña confusión en tu solicitud. El documento del reglamento ASAM indica que hay DOS modalidades con reglas muy distintas:

Modalidad de Combate (Pelea 1 vs 1): NO utiliza promedio de 3 árbitros. Se usan puntos directos, un contador de Faltas (0 a 2) y un contador de Salidas (0 a 5). Las Salidas y Faltas penalizan o suman puntos automáticamente al rival.
Modalidad de Formas (Katas/Exhibición): SÍ utiliza de 3 a 5 árbitros que dan notas del 1 al 10. Luego se promedian o se eliminan la nota más alta y la más baja.
¿En qué modalidad te quieres enfocar ahora mismo? Dado que estás hablando de "abrir un combate", asumo que te refieres a la Modalidad de Combate.

Propuesta de Diseño: Modalidad de Combate (ASAM)
Si lo que deseas implementar es el panel para arbitrar Combates (Peleas), el diseño de la pantalla del control del partido debe cambiar drásticamente respecto al que tenemos ahora.

Elementos a incorporar en el panel por cada Peleador (Rojo vs Blanco):
Puntaje Global: (Número grande)
Botones de Puntos (+1, +2, etc.): Para sumar puntos manuales al competidor.
Contador de Faltas (0 a 2): Botones para incrementar faltas. Si llega a 2, el sistema descalifica automáticamente.
Contador de Salidas (0 a 5):
Salidas 1 y 2: Solo se registran.
Salida 3: Le suma +1 Punto automático al rival.
Salida 4: Le suma +1 Punto adicional al rival.
Salida 5: Descalificación automática del competidor.
Proposed Changes
Si apruebas que adaptemos la interfaz de Combates a este formato de Puntos, Faltas y Salidas:

1. Modificar MMAController.tsx
[MODIFY]: Cambiar la estructura de estado estadisticas para guardar de forma persistente: { puntos: 0, faltas: 0, salidas: 0 } por cada competidor.
[MODIFY]: Rediseñar las tarjetas de cada peleador. Eliminar los botones fijos genéricos ("Golpe a la cabeza", "Derribo") e implementar:
Botón grande de +1 PUNTO.
Botón de + FALTA (Sanción Grave).
Botón de + SALIDA (Sanción Leve).
[MODIFY]: Incorporar el motor de lógica en React: Al presionar "+ SALIDA", si es la tercera, sumar automáticamente +1 al puntaje del rival. Si llega a la quinta, mostrar una gran alerta roja de Descalificación.
[MODIFY]: Actualizar el backend / guardado para que reciba correctamente esta estructura anidada.
Opcional: Modalidad de Formas
Si también deseas que implementemos la interfaz de Formas (con 3 a 5 jueces), necesitaríamos crear una pantalla de Puntuación completamente distinta (que no sea un combate 1 vs 1, sino una presentación individual).

Por favor confírmame si deseas proceder con el rediseño del Arbitraje de Combate ASAM (Faltas y Salidas) como detallé arriba.

Nuevo Panel de Arbitraje de Combate (Reglamento ASAM)
He reprogramado completamente la interfaz del Controlador de Combate (MMAController) para que siga estrictamente la modalidad de pelea 1 vs 1 del formato ASAM.

Cambios Implementados
Nuevo Panel por Competidor: Al hacer clic en el resultado de un partido (el botón central : o el marcador numérico) en la lista de Juegos, se abrirá el panel de arbitraje. Ahora, cada peleador (Rojo y Azul) tiene sus propios contadores para:

Puntos
Faltas
Salidas
Automatización de Penalizaciones (Salidas): He incorporado el flujo de control descrito en tu documento:

Si un peleador comete 3 Salidas, el sistema detecta esto y le suma +1 punto automáticamente al rival.
Si comete 4 Salidas, se suma otro punto al rival.
Si llega a 5 Salidas, el sistema lanzará una alerta roja interrumpiendo el combate por Descalificación.
Automatización de Sanciones (Faltas):

Al registrar la 2da Falta, el software emitirá inmediatamente una alerta de Descalificación Directa y cambiará el estado del combate a Finalizado.
Autoguardado Seguro: La estructura de la base de datos se adaptó para almacenar los 3 valores de cada peleador. Todo se guarda silenciosamente en tiempo real al presionar los botones, para que no pierdas ningún dato si se cierra la pantalla.

Cómo probarlo
Ve a "Partidos y Clasificación".
Abre cualquier partido de Artes Marciales haciendo clic en los botones de "marcador" que están en el medio del bloque de los peleadores.
Prueba sumar una "Salida" tres veces a un jugador, y verás cómo los puntos del rival suben automáticamente.