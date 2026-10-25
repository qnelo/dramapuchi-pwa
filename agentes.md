# Guía de Arquitectura para Agentes e Ingeniería (AGENTS / agentes.md)

Este documento detalla la arquitectura técnica, las responsabilidades de cada módulo, las reglas de negocio deterministas y las directrices de desarrollo para el mantenimiento o extensión de este emulador **Tamagotchi Generación 1 (32×16)**.

---

## 1. Principios de Diseño del Sistema

- **100% Client-Side & Offline-First**: No depende de ningún backend ni servicio externo. Funciona de manera autónoma en navegadores de escritorio y móviles mediante un Service Worker (`sw.js`) y almacenamiento en IndexedDB (con fallback a `localStorage`).
- **Emulación Física Fiel**:
  - Matriz monocromática de cristal líquido STN/TN de **32 columnas × 16 filas**.
  - Inercia de transición con factor de *ghosting* de `0.35`.
  - Cuadrícula con separación física (*dot pitch*) de 1px.
- **Sintetizador Web Audio API sin assets externos**:
  - Generación de ondas cuadradas basadas en los submúltiplos enteros reales del cristal de cuarzo de **32.768 Hz** (1024 Hz, 2048 Hz, 3277 Hz, 4096 Hz).
- **Ciclo de Vida Monogeneracional P1**:
  - Desde huevo (`EGG`) hasta adulto y eventual fallecimiento (`DEAD`) o despedida al planeta natal (`DEPARTED`), con cálculo determinista de *Care Mistakes*.

---

## 2. Mapa del Proyecto y Responsabilidades

```
Tamagotchi/
├── config/
│   └── petConfig.js           # Constantes metabólicas, duraciones y umbrales
├── engine/
│   ├── timeEngine.js          # Motor de reconciliación temporal determinista (Delta-Time)
│   └── evolutionResolver.js   # Árbol de decisiones y condiciones de evolución
├── ui/
│   ├── LcdMatrix.js           # Motor de renderizado en canvas con ghosting STN
│   ├── sprites.js             # Diccionario de sprites monocromáticos y fuente 3×5
│   ├── StatusRenderer.js      # Renderizador de pantallas de báscula (métricas) y reloj
│   └── GameRenderer.js        # Orquestador visual de escenas, idle, animaciones y minijuego
├── audio/
│   └── TamagotchiAudio.js     # Sintetizador acústico piezoeléctrico (Web Audio API)
├── constants/
│   └── menu.js                # Enums de modos de interfaz (UI_MODE) e iconos (ICONS)
├── controllers/
│   ├── MenuController.js      # Máquina de estados para interacción con botones A, B y C
│   └── MiniGameController.js  # Lógica del minijuego clásico (5 rondas de adivinanza)
├── storage/
│   └── SaveManager.js         # Persistencia en IndexedDB, exportación e importación JSON
├── test/
│   └── suite.js               # Batería de pruebas unitarias automatizadas (Node.js)
├── app.js                     # Punto de entrada de la aplicación y ciclo de ejecución principal
├── index.html                 # Carcasa ovalada, pantalla LCD, botones y modal de manual
├── manifest.json              # Manifiesto PWA para instalación como app nativa
├── sw.js                      # Service Worker para funcionamiento offline
├── icon-192.png / icon-512.png# Iconos de la aplicación
└── package.json               # Configuración del paquete ES Module y scripts de test
```

---

## 3. Especificación de Módulos

### 3.1. `config/petConfig.js`
Define los parámetros de cada etapa biológica:
- `STAGE_CONFIG`:
  - `EGG`: Duración 5 min, sin sueño ni degradación, peso base 5 lb.
  - `BABY`: Duración 65 min, vigilia continua, degradación rápida (15 min hambre/felicidad, 25 min caca), peso base 5 lb.
  - `CHILD`: Duración 2 días (2880 min), duerme de 20:00 a 09:00, peso base 10 lb.
  - `TEEN`: Duración 3 días (4320 min), duerme de 21:00 a 09:00, peso base 20 lb.
  - `ADULT`: Duración hasta 14 días adicionales (20160 min), duerme de 22:00 a 08:00, peso base 30 lb.
- `THRESHOLDS`:
  - `MAX_STARVATION_MIN: 360` (6 horas a 0 de hambre mientras está despierto provocan la muerte).
  - `MAX_SICK_MIN: 360` (6 horas enfermo sin curar provocan la muerte).
  - `CARE_MISTAKE_WAIT_MIN: 15` (15 min ignorando alerta = +1 error de cuidado).
  - `MAX_POOP: 4` (al acumular 4 cacas la mascota enferma).
  - `TICK_SIZE_MS: 60000` (resolución de simulación: 1 minuto por tick).

### 3.2. `engine/timeEngine.js` (`TamagotchiEngine`)
- **`reconcile(state, currentTimestamp)`**: Calcula el tiempo transcurrido desde `lastTickTimestamp`. Si el navegador se suspendió o la pantalla se apagó, simula paso a paso minuto a minuto (`stepOneMinute`) hasta un tope de 14 días.
- **`stepOneMinute(state, currentSimTime)`**:
  1. Incrementa `ageMinutes` y evalúa evolución (`EvolutionResolver.checkAndEvolve`).
  2. Verifica horario de sueño (`isSleepTime`). Si duerme, el metabolismo se pausa. Si la luz quedó encendida (`lightsOn: true`), acumula tiempo de luz encendida; a los 60 minutos genera +1 *Care Mistake*.
  3. Verifica **Modo Niñera** (`sitterModeActive`): Si está activo entre las 07:00 y las 18:00, congela el hambre, la felicidad y la suciedad.
  4. Degrada hambre y felicidad según la tasa configurada para la etapa.
  5. Genera suciedad periódicamente (hasta un máximo de 4 cacas).
  6. Dispara llamadas caprichosas de disciplina cada 4 horas de vigilia (`ageMinutes % 240 === 0`). Si no se atienden en 15 minutos, suma +1 *Care Mistake*.
  7. Registra *Care Mistakes* por negligencia si el hambre o la felicidad permanecen en 0 durante 15 minutos consecutivos.
  8. Enfermedad: Si acumula 4 cacas, se activa `isSick: true` con `sickDosesNeeded: 2`.
  9. Muerte: Inanición continua de 360 min $\to$ `stage = 'DEAD'`, `deathReason = 'STARVATION'`. Enfermedad desatendida durante 360 min $\to$ `stage = 'DEAD'`, `deathReason = 'SICKNESS'`.
  10. Actualiza el estado de alerta general (`isCalling`).

### 3.3. `engine/evolutionResolver.js` (`EvolutionResolver`)
Controla la máquina de estados del árbol genealógico P1:
- `BABY` $\to$ `CHILD`: A los 65 min evoluciona a `MARUTCHI`. Se reinician los errores para la etapa infantil.
- `CHILD` $\to$ `TEEN`: Tras 2 días:
  - $\le 2$ errores $\to$ `TAMATCHI`.
  - $\ge 3$ errores $\to$ `KUCHITAMATCHI`.
- `TEEN` $\to$ `ADULT`: Tras 3 días adicionales:
  - **Rama Tamatchi**:
    - $\le 1$ error y $\ge 90\%$ disciplina $\to$ `MAMETCHI`.
    - $\le 3$ errores y $\ge 75\%$ disciplina $\to$ `GINJIROTCHI`.
    - Resto de combinaciones $\to$ `MASKUTCHI`.
  - **Rama Kuchitamatchi**:
    - $\le 4$ errores y $\ge 50\%$ disciplina $\to$ `KUCHIPATCHI`.
    - $\le 6$ errores $\to$ `NYOROTCHI`.
    - $\ge 7$ errores $\to$ `TARAKOTCHI`.
- `ADULT` $\to$ `DEPARTED`: Tras 14 días como adulto, regresa pacíficamente a su planeta natal en platillo volador (`stage = 'DEPARTED'`).

### 3.4. `ui/LcdMatrix.js` (`LcdMatrix`)
- Administra un búfer destino (`targetBuffer`, `Uint8Array`) y un búfer de intensidad actual (`currentBuffer`, `Float32Array`).
- En cada ciclo `render()`, interpola hacia el valor objetivo usando `currentBuffer[idx] += (target - currentBuffer[idx]) * ghostingRate`, emulando el retraso físico del cristal líquido.
- Soporta dos paletas de color conmutables:
  - `classic`: Fondo `#9ba885`, píxel apagado `#8e9a78`, píxel activo `#1b2416`.
  - `backlight`: Fondo `#0f2a24`, píxel apagado `#153830`, píxel activo `#5bfec8`.

### 3.5. `ui/sprites.js` y `ui/StatusRenderer.js`
- Matriz de píxeles binarios (`toBits`) para todos los estados de animación, especies y alimentos.
- Fuente tipográfica 3×5 para visualización de textos en pantalla de 32×16.
- `StatusRenderer`:
  - **Página 0**: Edad (`AGE XX`) y Peso (`LB XX`).
  - **Página 1**: Barra de progreso de disciplina (`DISCIP` con marco y relleno proporcional).
  - **Página 2**: Hambre (`HUNGRY` con 4 corazones llenos/vacíos).
  - **Página 3**: Felicidad (`HAPPY` con 4 corazones llenos/vacíos).
  - **Reloj**: Hora y minutos en tiempo real con separador parpadeante (`TIME` / `HH:MM`).

### 3.6. `controllers/MenuController.js` y `constants/menu.js`
- Gestiona la máquina de estados de los 3 botones físicos:
  - **Botón A**: En `IDLE` entra a `ICON_SELECT`. En `ICON_SELECT` rota cíclicamente entre los iconos 0 a 6. En `SUBMENU` alterna opciones (0 y 1). En `STATUS_VIEW` rota las 4 páginas (0 a 3). En `MINIGAME` adivina "Izquierda".
  - **Botón B**: Confirma la acción activa o ejecuta el submenú. En `IDLE` activa animación de salto de alegría (`HAPPY_JUMP`). En `MINIGAME` adivina "Derecha".
  - **Botón C**: Cancela o retrocede a `IDLE`. En `IDLE` abre la pantalla del reloj.
- Ejecuta las acciones canónicas:
  - `feedPet(isCandy)`: Alimenta con carne o dulce. Más de 4 dulces consecutivos provocan caries/enfermedad (`isSick = true`).
  - `executeFlush()`: Limpia las cacas con animación de ola marina.
  - `executeMedicine()`: Aplica dosis de curación (rechaza con sonido si la mascota está sana).
  - `executeDiscipline()`: Sube disciplina en +25% si había una llamada activa; de lo contrario no hace efecto.

---

## 4. Reglas para Futuras Modificaciones

1. **Determinismo Temporal**: Nunca utilices temporizadores `setTimeout` o `setInterval` para calcular el envejecimiento o la degradación de atributos. Todo debe derivarse del tiempo UNIX (`timestamp`) y procesarse mediante `TamagotchiEngine.reconcile`.
2. **Dimensiones de Pantalla**: La resolución física es estrictamente de **32 columnas × 16 filas**. Cualquier sprite nuevo debe diseñarse para no exceder estos límites (sprites de personajes: 16×16; iconos secundarios: 8×8).
3. **Audio Sin Dependencias Externas**: No añadas archivos MP3, WAV ni librerías de sonido externas. Todo efecto sonoro debe sintetizarse mediante osciladores cuadrados en `TamagotchiAudio.js` con las frecuencias canónicas del cuarzo.
4. **Validación Automática Obligatoria**: Tras realizar cualquier cambio en el motor o los controladores, ejecuta siempre la suite de pruebas:
   ```bash
   npm test
   ```
   Asegúrate de que los 11 tests unitarios pasen sin excepciones.
