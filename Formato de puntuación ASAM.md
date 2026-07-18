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

A continuación, te presento el desglose milimétrico y detallado de ambos sistemas de puntuación según el reglamento oficial de la ASAM y la lógica exacta de sus planillas. He separado los dos métodos paso por paso para que sirva de guía definitiva.

# **PARTE 1: REGLAMENTO DETALLADO DE COMBATE (KUMITE / SPARRING)**

El sistema de combate de la ASAM se basa en un marcado directo de puntos acumulados en tiempo real reflejado simétricamente para el competidor del lado **Blanco** y el del lado **Rojo**. El combate se rige por tres ejes: Puntos válidos, Penalizaciones por salidas y Sanciones por faltas.

### **1.1 Criterios para Otorgamiento de Puntos**

Para que un competidor marque un punto legítimo (que se anota en el casillero "Punto" de la planilla), la técnica debe ser convalidada por la mayoría de los jueces presentes y cumplir obligatoriamente con el criterio **VISTO, CONTROLADO y OÍDO**:

* **Contacto Moderado:** No se permite contacto pleno (*Knockout*). La técnica debe tocar el cuerpo de manera evidente pero controlada.  
* **El Retroceso (Hikite):** Toda técnica de puño o pierna debe retraerse inmediatamente después de impactar para demostrar control físico absoluto.  
  * *Excepción:* La patada descendente (hacha) se considera punto válido si impacta limpiamente de arriba hacia abajo utilizando únicamente la planta del pie.  
* **Zonas de Impacto Permitidas según la Categoría:**  
  * *Infantiles, Juveniles y Kyu "A" (Cinturones de Color):* Técnicas de mano únicamente desde el cinturón hasta el inicio del cuello. Está prohibido tocar la cara. Técnicas de pierna se permiten desde el cinturón hasta la cabeza.  
  * *Adultos Kyu "B" y Cinturones Negros:* Se permite el contacto moderado en la cara utilizando técnicas de mano (uso de guantines protectores obligatorio).

### **1.2 Sistema Cascada de Salidas (Sanciones Leves)**

Las salidas ocurren cuando un competidor pisa con ambos pies fuera del área delimitada (de hasta 10x10 metros para adultos). El sistema las procesa de manera estrictamente acumulativa:

* **1ª Salida:** Se marca en la planilla como advertencia. No altera la puntuación.  
* **2ª Salida:** Se marca en la planilla. Se mantiene como advertencia.  
* **3ª Salida:** Se marca en la planilla y **automáticamente le otorga \+1 Punto al oponente**.  
* **4ª Salida:** Se marca en la planilla y **automáticamente le otorga otro \+1 Punto al oponente**.  
* **5ª Salida:** Se detiene la pelea de inmediato. El competidor queda **Descalificado por Salidas**; la victoria se le otorga automáticamente al rival (*Kachi*).

### **1.3 Sistema de Faltas (Sanciones Graves)**

Las faltas se aplican por uso de técnicas prohibidas (golpes de codo, rodilla, golpes bajos, agarres antirreglamentarios o exceso de fuerza).

* **1ª Falta:** Se anota en el casillero "Falta" de la planilla. No da puntos al rival en el tiempo regular, pero actúa como un pesado lastre en caso de empate.  
* **2ª Falta:** Significa la **Descalificación Inmediata de la lucha en curso**.  
* **Descalificación Inmediata Directa (Producir Sangre):** Si un competidor propina un golpe que genere sangre en el rival, o incurra en una conducta antideportiva severa, se le aplica la descalificación directa del torneo completo, perdiendo todo derecho a continuar en otras llaves.

### **1.4 Algoritmo de Desempate en Combates**

Si al finalizar el tiempo oficial los competidores tienen la misma cantidad de puntos, se procede de la siguiente manera:

1. **Minuto de Oro (Extensión):** Se lucha 1 minuto más. El primero en marcar un punto válido gana. Las salidas y faltas previas se arrastran al alargue.  
2. **Decisión Arbitral (*Hantei*):** Si al acabar el minuto nadie marcó, los jueces evalúan la planilla usando una tabla estricta de jerarquías de penalizaciones:  
   * *1 Falta* pierde contra *1 Salida* o *2 Salidas* (La falta es más grave).  
   * *1 Falta* empata contra *3 Salidas* (Pesan igual; se decide por banderas/actividad).  
   * *1 Falta* gana contra *4 Salidas* (4 salidas restaron demasiado rendimiento).  
   * Un competidor con *1 Falta \+ Salidas* siempre perderá contra uno que *solo tiene Salidas*.

# **PARTE 2: REGLAMENTO DETALLADO DE FIGURAS (FORMAS / KATAS / POOMSAE)**

El sistema de Formas evalúa el desempeño técnico, la potencia, el equilibrio y la marcialidad de forma individual o por equipos (3 o 5 integrantes). No hay un oponente físico, sino un **Panel de Jueces** (usualmente 3 o 5 jueces: identificados en planilla como A1, A2, A3, etc.).

### **2.1 El Proceso de Calificación Basal**

* Cada juez evalúa de manera individual la ejecución del atleta basándose en una escala decimal (por ejemplo, de 0.0 a 10.0 puntos).  
* En las competencias **por equipos**, los jueces basan la nota estrictamente en 4 aspectos regulados:  
  1. La presentación general.  
  2. La uniformidad (sincronización de movimientos).  
  3. La cantidad de integrantes (fidelidad al equipo presentado).  
  4. El mantenimiento de la distancia y el orden geométrico de la forma.

### **2.2 El Cálculo del Puntaje Final (Sistema de Descarte)**

Para garantizar la total transparencia del arbitraje y mitigar favoritismos o notas inusualmente bajas, el sistema procesa el array de calificaciones de la siguiente manera:

1. Se recopilan las notas de todos los jueces (ej: si son 5 jueces: \[8.9, 9.1, 8.8, 9.2, 9.0\]).  
2. El sistema detecta e intercepta de forma automática la **nota más alta** (en este ejemplo: 9.2) y la **nota más baja** (en este ejemplo: 8.8).  
3. **Se eliminan ambos valores extremos** del cómputo.  
4. Se suman las calificaciones restantes para obtener el **Total Acumulado Final** (ej: 8.9 \+ 9.1 \+ 9.0 \= 27.0). Este resultado es el que define la posición en la tabla clasificatoria.

### **2.3 Algoritmo Cascada para Romper Empates en Formas**

Si dos o más competidores obtienen exactamente el mismo "Total Acumulado Final", el sistema de cómputo o el planillero de mesa debe aplicar de manera obligatoria los siguientes filtros en orden sucesivo para determinar quién se lleva el puesto más alto:

* **Filtro 1:** Se toma en cuenta el **puntaje menor no eliminado** (el valor más bajo de los que sí sumaron). El atleta con la nota más alta en este casillero gana el desempate.  
* **Filtro 2:** Si siguen empatados, se toma en cuenta el **puntaje mayor no eliminado**.  
* **Filtro 3:** Si persiste la igualdad, el sistema recurre a los descartes: se evalúa quién tiene el **puntaje menor que fue eliminado** (puntaje\_min), favoreciendo al que tenga la nota más alta.  
* **Filtro 4:** Se evalúa el **puntaje mayor que fue eliminado** (puntaje\_max).  
* **Filtro 5 (Desempate en Tatami):** Si tras aplicar los 4 filtros aritméticos el empate en la base de datos es absoluto, los atletas empatados deberán ingresar nuevamente al área y ejecutar una nueva forma completa desde cero para recibir una nueva ronda de calificaciones.

