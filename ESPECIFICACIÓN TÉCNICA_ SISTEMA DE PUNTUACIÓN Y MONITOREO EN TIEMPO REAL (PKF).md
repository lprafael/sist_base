Para configurar tu **sistema de monitoreo y puntuación en tiempo real** orientado al **34° Campeonato Panamericano de Karate**, a continuación se define la especificación técnica basada en la estructura jerárquica de la Federación Panamericana de Karate (PKF).

# **ESPECIFICACIÓN TÉCNICA: SISTEMA DE PUNTUACIÓN Y MONITOREO EN TIEMPO REAL (PKF)**

## **1\. Definición Específica de Categorías por Edad y Equipamiento**

Para la correcta validación lógica de las bases de datos (cálculo automatizado de categorías según el año de nacimiento), el torneo juvenil de la PKF se fragmenta en cuatro grupos de edades obligatorios. A nivel de base de datos, el sistema debe exigir campos de validación de equipamiento de seguridad obligatorios por categoría:

* **Categoría U12 (Sub-12):** Competidores que tienen **10 o 11 años** a la fecha de inicio del campeonato. A nivel del software de control de mesa, el sistema debe validar obligatoriamente el uso de **casco protector y peto (protector de torso) de uso externo** para autorizar el combate.  
* **Categoría U14 (Sub-14):** Competidores de **12 o 13 años**. Al igual que la U12, el software de mesa debe requerir la confirmación visual de **casco protector y peto externo** obligatorio. El tiempo de combate en Kumite está parametrizado de forma fija a **1:30 minutos**.  
* **Categoría Cadetes:** Competidores de **14 o 15 años**. De acuerdo con las actualizaciones internacionales de competencia, el uso de casco es mandatorio y las técnicas de luxación, estrangulación o palancas articulares quedan estrictamente **prohibidas** en este nivel.  
* **Categoría Junior:** Competidores de **16 o 17 años**. El tiempo oficial de combate en Kumite se incrementa en el sistema a **2:00 minutos** de tiempo corrido.

## **2\. Motor de Lógica y Algoritmos del Sistema Panamericano de Karate**

El backend del sistema debe operar de manera independiente según la modalidad cargada en la mesa de control (Tatami):

### **2.1 Módulo de Combate (Kumite)**

A diferencia de otros sistemas de artes marciales (como el de la ASAM que maneja advertencias genéricas de 1 a 5 y descalificación directa con 2 faltas), el sistema oficial PKF/WKF gestiona un **marcador dinámico acumulativo por puntos técnicos** y un control severo de la concentración posterior.

#### **A. Asignación de Puntos Técnicos (Eventos de Entrada en Mesa)**

El planillero interactúa con tres botones rápidos por competidor (identificados en la interfaz como **AKA / Azul** y **AO / Rojo**):

* **Botón Yuko (+1 Punto):** Disparado por golpes de puño directos (*Tsuki*) o golpes con la mano (*Uchi*) en zonas puntuables.  
* **Botón Waza-Ari (+2 Puntos):** Disparado por patadas dirigidas a la zona media del cuerpo (*Chudan*).  
* **Botón Ippon (+3 Puntos):** Disparado por patadas a la zona superior (cabeza/cuello \- *Jodan*) o técnicas de mano aplicadas a un oponente caído.

#### **B. Regla de Zanshin (Validación de Puntuación)**

El sistema debe incluir una función de retención de punto. Si el árbitro central invalida una acción porque el competidor perdió la concentración (*Zanshin*), cayó o dio la espalda inmediatamente después de golpear, el operador de mesa debe presionar un botón de **"Punto Invalidado por Falta de Zanshin"**, el cual restará automáticamente el punto del marcador en tiempo real y registrará el log en la base de datos.

#### **C. Control de Sensibilidad y Video Review (Tarjetas de Apelación)**

El sistema debe incluir un módulo para controlar el estado de las tarjetas de revisión de video (*Video Review*) de los *coaches*. Cada entrenador inicia con **1 tarjeta activa**. Si se solicita una revisión de 1, 2 o 3 puntos y los jueces determinan que el reclamo no es válido, el software bloqueará el botón de apelación para ese *coach* durante el resto del combate. Si la apelación es exitosa, la tarjeta se mantiene en estado "Activa".

### **2.2 Módulo de Formas (Kata)**

El sistema de la ASAM utiliza tradicionalmente un panel de 3 a 5 jueces que ingresan notas numéricas en una escala decimal (ej. de 0.0 a 10.0), eliminando la nota más alta y la más baja para sumar las tres puntuaciones restantes.  
**El Sistema Panamericano de Karate (PKF/WKF) ha abolido por completo este mecanismo numérico en la pantalla pública.** \#\#\#\# Algoritmo de Votación por Banderas (Mayoría Absoluta)  
Para el desarrollo de tu software de monitoreo en tiempo real en la mesa de Kata, debes estructurar la siguiente lógica:

1. **Panel de Jueces:** El sistema debe conectarse a **5 o 7 terminales de jueces** individuales periféricos.  
2. **Evento de Entrada (Input):** Al finalizar la ejecución de los dos atletas de la llave, el sistema no recibe números flotantes. Cada juez cuenta únicamente con dos opciones en su pantalla táctil: **Votar por AKA (Azul)** o **Votar por AO (Rojo)**.  
3. **Procesamiento en Tiempo Real (Mesa de Control):** El backend recibe los inputs de las terminales y calcula una sumatoria simple basada en la mayoría absoluta:  
4. $$\\text{Ganador} \= \\text{Moda}(\\text{Votos Jueces})$$  
5. **Despliegue en Pantalla de Monitoreo General:** La pantalla pública no mostrará acumulación de puntos intermedios. Al momento del cierre de la votación por el *Tatami Manager*, el monitor en tiempo real encenderá de manera gráfica los colores de las banderas asignadas por cada juez (ej. 4 luces Azules contra 1 Roja) y mostrará parpadeando el nombre del **Ganador Oficial por Decisión Mayoritaria**.

## **3\. Estructura de Datos para la Interfaz de Monitoreo en Tiempo Real (UI/UX)**

Para que el sistema de transmisión de datos a las pantallas LED del torneo sea óptimo, el payload JSON en tiempo real enviado por los validadores de mesa hacia los WebSockets de los monitores debe estructurarse de la siguiente manera:  
JSON  
{  
  "tatami\_id": "TATAMI-01",  
  "modalidad": "KUMITE",  
  "categoria": "U14\_MASCULINO",  
  "division\_peso": "-40kg",  
  "estado\_cronometro": "RUNNING",  
  "tiempo\_restante": "01:15",  
  "competidores": {  
    "aka\_azul": {  
      "nombre": "Juan Pérez",  
      "pais": "MEX",  
      "puntos\_kumite": 4,  
      "video\_review\_card": "ACTIVE",  
      "penalizaciones": {  
        "senshu": true,  
        "jogai": 1  
      }  
    },  
    "ao\_rojo": {  
      "nombre": "Lucas Silva",  
      "pais": "BRA",  
      "puntos\_kumite": 2,  
      "video\_review\_card": "USED\_AND\_LOCKED",  
      "penalizaciones": {  
        "senshu": false,  
        "jogai": 2  
      }  
    }  
  }  
}

Esta arquitectura garantiza que la mesa de control de cada tatami envíe eventos atómicos instantáneos, permitiendo que la pantalla de monitoreo general centralizada de la federación actualice los marcadores globales en menos de 100 milisegundos.  
