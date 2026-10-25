# 🥚 Tamagotchi Retro 32×16 PWA

[![Deploy on Cloudflare Pages](https://img.shields.io/badge/Live_Demo-tama--pwa.pages.dev-orange?style=flat&logo=cloudflare)](https://tama-pwa.pages.dev)
[![PWA Ready](https://img.shields.io/badge/PWA-100%25_Offline--First-success?style=flat&logo=pwa)](https://tama-pwa.pages.dev)
[![Pure Vanilla JS](https://img.shields.io/badge/Stack-ES_Modules_•_Web_Audio_•_Canvas-blue?style=flat)](https://tama-pwa.pages.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Emulación retro 100% client-side y fiel al modelo original de **Tamagotchi (Generación 1 / 1996)**, desarrollada como una Progressive Web App (PWA) instalable en móviles y ordenadores, sin dependencias externas ni backend.

🎮 **Probar ahora en el navegador**: [https://tama-pwa.pages.dev](https://tama-pwa.pages.dev)

---

## ✨ Características Principales

* **Pantalla LCD de Matriz de Puntos 32×16**:
  * Emulación de la reflexión pasiva del cristal líquido monocromático STN/TN.
  * Inercia física de transición (*ghosting* configurable de 0.35) y cuadrícula de separación física de 1px.
  * Selector de retroiluminación: modo clásico verde oliva o modo nocturno cian electroluminiscente (*Indiglo*).
* **Motor de Reconciliación Temporal (Delta-Time)**:
  * Simulación determinista minuto a minuto tras inactividad o suspensión del dispositivo.
  * Pausa metabólica automática durante el horario de sueño nocturno.
* **Sintetizador Piezoeléctrico (Web Audio API)**:
  * Generación de ondas cuadradas basadas en los submúltiplos enteros reales del cristal de cuarzo de **32.768 Hz** (1024 Hz, 2048 Hz, 3277 Hz, 4096 Hz) sin archivos MP3 ni librerías externas.
* **Árbol de Evolución Canónico Generación 1 (P1)**:
  * Eclosión desde el huevo $\to$ Babytchi $\to$ Marutchi $\to$ Tamatchi o Kuchitamatchi $\to$ 6 especies adultas (Mametchi, Ginjirotchi, Maskutchi, Kuchipatchi, Nyorotchi, Tarakotchi) $\to$ Despedida pacífica a su planeta natal (*DEPARTED*).
* **Minijuego Clásico de Adivinanza (5 Rondas)**:
  * Adivina hacia dónde girará la mascota (Botón A: Izquierda / Botón B: Derecha). Ganar 3 o más rondas sube la felicidad y quema peso.
* **Mejoras Modernas de Calidad de Vida (QoL)**:
  * 👶 **Modo Niñera (Tama Sitter)**: Congela temporalmente la degradación biológica para evitar descuidos durante horarios de trabajo.
  * 🌙 **Retroiluminación LED**: Conmuta entre la pantalla clásica y el modo nocturno.
  * 💾 **Exportar / Importar Partidas**: Respaldo portable en formato JSON para transferir tu partida entre dispositivos.
  * 📖 **Manual Integrado**: Modal accesible con las reglas completas del juego.
  * 📳 **Feedback Háptico**: Vibración física en dispositivos compatibles al presionar los botones y alertas.

---

## 🎮 Controles

### Pantalla Táctil / Ratón
* **Botón A** (izquierdo): Seleccionar / mover cursor / opción izquierda en minijuego.
* **Botón B** (central): Confirmar / interactuar / opción derecha en minijuego.
* **Botón C** (derecho): Cancelar / salir a reposo / ver reloj en tiempo real.

### Teclado (en escritorio)
* `[A]` o `[←]`: Botón A
* `[B]`, `[Enter]` o `[Espacio]`: Botón B
* `[C]`, `[Escape]` o `[→]`: Botón C

---

## 📟 Los 8 Iconos de Estado

| Icono | Función | Descripción y Efectos |
| :---: | :--- | :--- |
| **🍴** | **Comida** | Submenú: **Carne** (+1 hambre, +1 lb) o **Dulce** (+1 felicidad, +2 lb. El abuso de dulces provoca enfermedad). |
| **💡** | **Luz** | Submenú ON/OFF para apagar la luz al dormir. Dormir con la luz encendida genera un descuido tras 1 hora. |
| **⚾** | **Juego** | Minijuego de 5 rondas de adivinanza izquierda/derecha. |
| **💉** | **Medicina** | Aplica inyecciones para curar la enfermedad cuando aparece el cráneo ☠️. |
| **🚿** | **Higiene** | Limpia las deposiciones acumuladas con una ola de agua para evitar infecciones. |
| **⚖️** | **Báscula** | 4 pantallas informativas: Edad/Peso, Disciplina, Corazones de Hambre y de Felicidad. |
| **💢** | **Disciplina** | Regaña llamadas de atención caprichosas (cuando llama sin tener hambre ni estar triste). Sube +25% disciplina. |
| **🔔** | **Atención** | Icono pasivo (LED de alerta). Se enciende y emite beeps cuando la mascota te necesita. |

---

## 🧬 Árbol de Evolución (P1)

```
[Huevo] ──(5 min)──> [Babytchi] ──(65 min)──> [Marutchi]
                                                 │
                        ┌─── (0-2 Descuidados) ──┴─── (3+ Descuidados) ───┐
                        ▼                                                 ▼
                   [Tamatchi]                                      [Kuchitamatchi]
                        │                                                 │
         ┌──────────────┼──────────────┐                   ┌──────────────┼──────────────┐
         ▼              ▼              ▼                   ▼              ▼              ▼
    [Mametchi]    [Ginjirotchi]   [Maskutchi]         [Kuchipatchi]   [Nyorotchi]   [Tarakotchi]
    (0-1 err,     (2-3 err,       (4+ err o           (0-2 err,       (3-4 err)     (5+ err)
    >=90% disc)   >=75% disc)     <50% disc)          >=50% disc)
```

---

## 🛠️ Estructura del Código

```
Tamagotchi/
├── config/
│   └── petConfig.js           # Tasas metabólicas, tiempos y umbrales de muerte
├── engine/
│   ├── timeEngine.js          # Motor de simulación temporal minuto a minuto
│   └── evolutionResolver.js   # Lógica del árbol evolutivo y errores de cuidado
├── ui/
│   ├── LcdMatrix.js           # Renderizador del cristal líquido 32×16 con ghosting
│   ├── sprites.js             # Sprites binarios de mascotas, animaciones y fuente 3×5
│   ├── StatusRenderer.js      # Métricas de estado (báscula) y reloj
│   └── GameRenderer.js        # Orquestador visual de escenas y animaciones
├── audio/
│   └── TamagotchiAudio.js     # Sintetizador piezoeléctrico Web Audio API
├── controllers/
│   ├── MenuController.js      # Máquina de estados de los 3 botones (A, B, C)
│   └── MiniGameController.js  # Minijuego de 5 rondas
├── storage/
│   └── SaveManager.js         # Persistencia en IndexedDB y exportación JSON
├── index.html                 # Carcasa retro, pantalla LCD y modal de manual
├── app.js                     # Ciclo principal de juego y orquestación
├── sw.js                      # Service Worker para ejecución 100% offline
└── test/
    └── suite.js               # Tests unitarios automáticos (11 baterías)
```

---

## 🚀 Ejecución y Pruebas Locales

No requiere compilación (`build step`). Para ejecutarlo localmente:

1. **Iniciar servidor estático**:
   ```bash
   python3 -m http.server 8000
   # O con Node:
   # npx serve .
   ```
2. **Abrir en el navegador**:
   Visita `http://localhost:8000`

3. **Ejecutar tests unitarios**:
   ```bash
   npm test
   ```

---

## 📄 Licencia

Código distribuido bajo licencia MIT. Inspirado en el juguete virtual Tamagotchi original creado por Bandai / WiZ (1996).
