# Engineering & AI Agent Architecture Guide (AGENTS.md)

This document provides a comprehensive technical reference detailing the system architecture, component responsibilities, deterministic business rules, and invariants for maintaining and extending this **Generation 1 (32×16) Tamagotchi emulator**.

---

## 1. System Design Principles

- **100% Client-Side & Offline-First**:
  - Zero backend or external service dependencies. Operates entirely in the browser using a Service Worker (`sw.js`) and IndexedDB persistence (with synchronous `localStorage` fallback).
- **Faithful Physical Emulation**:
  - Dot matrix LCD resolution of strictly **32 columns × 16 rows**.
  - Passive liquid crystal STN/TN decay simulation with a **0.35 ghosting factor**.
  - 1px physical grid spacing (*dot pitch*).
- **Synthetic Web Audio API (Zero External Assets)**:
  - Generates square waves derived from real integer submultiples of a **32.768 kHz** quartz crystal oscillator (`1024 Hz`, `2048 Hz`, `3277 Hz`, `4096 Hz`). No audio files (MP3/WAV) are used.
- **Monogenerational Lifecycle (P1)**:
  - Follows the canonical lifecycle from egg (`EGG`) to baby, child, teen, adult, and eventual passing (`DEAD`) or departure to the home planet (`DEPARTED`), governed by deterministic *Care Mistake* accumulation.

---

## 2. Codebase Map & Responsibilities

```
Tamagotchi/
├── config/
│   └── petConfig.js           # Metabolic rates, lifecycle stage durations, and thresholds
├── engine/
│   ├── timeEngine.js          # Deterministic delta-time reconciler & minute-by-minute simulator
│   └── evolutionResolver.js   # Branching evolution matrix & care mistake criteria
├── ui/
│   ├── LcdMatrix.js           # 32×16 canvas renderer with STN physical ghosting decay
│   ├── sprites.js             # Binary bitmaps (toBits) for characters, items, and 3×5 font
│   ├── StatusRenderer.js      # Scale (Meter) pages (Age/Weight, Discipline, Hearts) and Clock
│   └── GameRenderer.js        # Scene orchestrator for idle, animations, and mini-game states
├── audio/
│   └── TamagotchiAudio.js     # Piezoelectric acoustic synthesizer (Web Audio API)
├── constants/
│   └── menu.js                # UI mode (UI_MODE) and icon index (ICONS) enums
├── controllers/
│   ├── MenuController.js      # 3-button (A, B, C) finite state machine and menu routing
│   └── MiniGameController.js  # 5-round left/right heading prediction mini-game
├── storage/
│   └── SaveManager.js         # IndexedDB / localStorage persistence, JSON export & import
├── test/
│   └── suite.js               # Comprehensive unit test suite (Node.js test runner)
├── app.js                     # Main application bootstrap and 60 FPS render loop
├── index.html                 # Mobile-first keychain shell, LCD viewport, controls, and manual modal
├── manifest.json              # PWA manifest for native app installation
├── sw.js                      # Offline-first Service Worker cache
├── icon-192.png / icon-512.png# App icons
└── package.json               # ES Module configuration and test scripts
```

---

## 3. Module Specifications & Business Logic

### 3.1. `config/petConfig.js`
Defines metabolic rates and biological stage parameters:
- `STAGE_CONFIG`:
  - `EGG`: 5 min duration, no sleep, no metabolic degradation, base weight 5 lb.
  - `BABY`: 65 min duration, continuous waking state, fast degradation (15 min hunger/happy, 25 min poop), base weight 5 lb.
  - `CHILD`: 2 days duration (2880 min), sleep from 20:00 to 09:00, base weight 10 lb.
  - `TEEN`: 3 days duration (4320 min), sleep from 21:00 to 09:00, base weight 20 lb.
  - `ADULT`: Up to 14 days duration (20160 min), sleep from 22:00 to 08:00, base weight 30 lb.
- `THRESHOLDS`:
  - `MAX_STARVATION_MIN: 360`: 6 hours at 0 hunger while awake results in death (`DEAD`, `STARVATION`).
  - `MAX_SICK_MIN: 360`: 6 hours sick without medical care results in death (`DEAD`, `SICKNESS`).
  - `CARE_MISTAKE_WAIT_MIN: 15`: 15 minutes of unaddressed alert calls yields +1 Care Mistake.
  - `MAX_POOP: 4`: Accumulating 4 poops triggers sickness (`isSick = true`).
  - `TICK_SIZE_MS: 60000`: Simulation resolution of exactly 1 minute per tick.

### 3.2. `engine/timeEngine.js` (`TamagotchiEngine`)
- **`reconcile(state, currentTimestamp)`**: Calculates the elapsed time ($\Delta t$) since `lastTickTimestamp`. If the device was asleep or the tab was backgrounded, simulates elapsed time minute-by-minute (`stepOneMinute`) up to a 14-day safety cap.
- **`stepOneMinute(state, currentSimTime)`**:
  1. Increments `ageMinutes` and checks evolution transitions (`EvolutionResolver.checkAndEvolve`).
  2. Evaluates sleep schedule (`isSleepTime`). If asleep, metabolic degradation pauses. If lights remain on (`lightsOn: true`), accumulates unaddressed light time; after 60 minutes, increments `careMistakes`.
  3. Checks **Tama Sitter Mode** (`sitterModeActive`): If active between 07:00 and 18:00, freezes hunger, happiness, and poop degradation.
  4. Degrades hunger and happiness counters based on stage rates.
  5. Generates poop (up to a maximum of 4).
  6. Triggers discipline calls every 4 hours of waking time (`ageMinutes % 240 === 0`). If unaddressed after 15 minutes, increments `careMistakes`.
  7. Tracks neglect timers: if hunger or happiness stays at 0 for 15 consecutive minutes, increments `careMistakes`.
  8. Sickness: if `poopCount >= 4`, sets `isSick = true` and `sickDosesNeeded = 2`.
  9. Evaluates death thresholds (starvation / untreated sickness).
  10. Updates the general attention call flag (`isCalling`).

### 3.3. `engine/evolutionResolver.js` (`EvolutionResolver`)
Executes the Gen 1 branching evolution tree:
- `BABY` $\to$ `CHILD`: After 65 minutes, evolves to `MARUTCHI`. Resets care mistakes for the child stage.
- `CHILD` $\to$ `TEEN`: After 2 days:
  - $\le 2$ mistakes $\to$ `TAMATCHI`.
  - $\ge 3$ mistakes $\to$ `KUCHITAMATCHI`.
- `TEEN` $\to$ `ADULT`: After 3 days:
  - **Tamatchi branch**:
    - $\le 1$ mistake and $\ge 90\%$ discipline $\to$ `MAMETCHI`.
    - $\le 3$ mistakes and $\ge 75\%$ discipline $\to$ `GINJIROTCHI`.
    - Remaining combinations $\to$ `MASKUTCHI`.
  - **Kuchitamatchi branch**:
    - $\le 4$ mistakes and $\ge 50\%$ discipline $\to$ `KUCHIPATCHI`.
    - $\le 6$ mistakes $\to$ `NYOROTCHI`.
    - $\ge 7$ mistakes $\to$ `TARAKOTCHI`.
- `ADULT` $\to$ `DEPARTED`: After 14 days as an adult, returns peacefully to the home planet in a UFO (`stage = 'DEPARTED'`).

### 3.4. `ui/LcdMatrix.js` (`LcdMatrix`)
- Manages dual buffers: `targetBuffer` (`Uint8Array`) and `currentBuffer` (`Float32Array`).
- Per-frame `render()` interpolates values using `currentBuffer[idx] += (target - currentBuffer[idx]) * ghostingRate` to simulate liquid crystal decay.
- Supports two switchable color palettes:
  - `classic`: Background `#9ba885`, Pixel Off `#8e9a78`, Pixel On `#1b2416`.
  - `backlight`: Background `#0f2a24`, Pixel Off `#153830`, Pixel On `#5bfec8`.

### 3.5. `ui/sprites.js` & `ui/StatusRenderer.js`
- Canonical 16×16 character bitmaps and 8×8 item/status bitmaps encoded via binary strings (`toBits`).
- Minimalist 3×5 bitmap font for rendering text on a 32×16 matrix.
- `StatusRenderer`:
  - **Page 0**: Age (`AGE XX`) and Weight (`LB XX`).
  - **Page 1**: Discipline bar (`DISCIP` with proportional bordered fill).
  - **Page 2**: Hunger (`HUNGRY` with 4 full/empty hearts).
  - **Page 3**: Happiness (`HAPPY` with 4 full/empty hearts).
  - **Clock**: Real-time 24-hour clock with blinking colon (`TIME` / `HH:MM`).
- *(Note: Tama Sitter mode is controlled from the top-left Settings modal, leaving the 4 Status pages true to the canonical Gen 1 hardware).*

### 3.6. `controllers/MenuController.js` & `constants/menu.js`
- Hardware button state machine (physical tactile white buttons from Left to Right: Button A, Button B, Button C):
  - **Button A**: In `IDLE`, enters `ICON_SELECT`. In `ICON_SELECT`, cycles icons 0..6. In `SUBMENU`, toggles index (0..1 for FEED; 0..1 for LIGHT). In `STATUS_VIEW`, cycles status pages 0..3. In `MINIGAME`, inputs "Left".
  - **Button B**: Confirms current icon or submenu action. In `STATUS_VIEW`, confirms and returns to `IDLE`. In `IDLE`, triggers a happy jump animation (`HAPPY_JUMP`). In `MINIGAME`, inputs "Right".
  - **Button C**: Cancels selection or returns to `IDLE`. In `IDLE`, displays the real-time clock.
- Action handlers:
  - `feedPet(isCandy)`: Feeds Meal or Snack. Feeding $>4$ consecutive snacks triggers toothache/sickness (`isSick = true`).
  - `executeFlush()`: Sweeping water wave clearing all poops.
  - `executeMedicine()`: Administers treatment doses (refuses with negative sound if healthy).
  - `executeDiscipline()`: Scolds the pet; adds +25% discipline only if an active attention call exists without hunger or sadness.
  - `executeSubmenuAction()`: Executes Meal/Snack for Feed, or Light On / Light Off for Light.

---

## 4. Invariants & Rules for Autonomous Agents

1. **Strict Temporal Determinism**: Never use JavaScript timers (`setTimeout` or `setInterval`) to track biological aging or stat decay. All state transitions must be derived from UNIX timestamps and evaluated via `TamagotchiEngine.reconcile`.
2. **Fixed Display Dimensions**: The display is strictly **32 columns × 16 rows**. All sprites must conform to these bounds (characters: 16×16, auxiliary icons: 8×8).
3. **No External Audio Files**: Do not add MP3, WAV, or external audio libraries. All acoustic feedback must be synthesized via Web Audio oscillators in `TamagotchiAudio.js` using canonical crystal quartz frequencies.
4. **Mandatory Automated Verification**: After any modification to the engine, controllers, or storage layers, always run the test suite:
   ```bash
   npm test
   ```
   All 12 test suites must pass without errors.
5. **Deploy Only From a Commit**: Publish with `npm run deploy`, which uploads a `git archive` of `HEAD`, so commit before deploying: uncommitted changes are not published. Never run `wrangler pages deploy` on the repo root: Cloudflare Pages reads no ignore file and would publish the private, git-ignored specs (`er.txt`, `er.docx`). Bump `CACHE_NAME` in `sw.js` with every content change.
