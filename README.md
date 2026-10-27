# 🥚 DramaPuchi Retro 32×16 PWA

[![Deploy on Cloudflare Pages](https://img.shields.io/badge/Live_Demo-dramapuchi-orange?style=flat&logo=cloudflare)](https://tama-pwa.pages.dev)
[![PWA Ready](https://img.shields.io/badge/PWA-100%25_Offline--First-success?style=flat&logo=pwa)](https://tama-pwa.pages.dev)
[![Pure Vanilla JS](https://img.shields.io/badge/Stack-ES_Modules_•_Web_Audio_•_Canvas-blue?style=flat)](https://tama-pwa.pages.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A faithful, 100% client-side retro virtual pet experience (**DramaPuchi**), engineered as a modern Progressive Web App (PWA) installable on mobile and desktop devices with zero external libraries or backend servers.

🎮 **Play Live in Browser**: [https://tama-pwa.pages.dev](https://tama-pwa.pages.dev)

---

## ✨ Core Features

* **32×16 Dot Matrix LCD Emulation**:
  * Simulates passive STN/TN liquid crystal light decay with a **0.35 ghosting factor**.
  * Authentic 1px physical dot pitch spacing.
  * Switchable display modes: **Classic Olive Green** reflective LCD or **Electroluminescent Cyan** night backlight.
* **Deterministic Delta-Time Engine**:
  * Accurately simulates biological aging and stat changes minute-by-minute after phone lock, tab suspension, or extended absence.
  * Automatic metabolic pause during nighttime sleep schedules.
* **Piezoelectric Synthesizer (Web Audio API)**:
  * Generates pure square waves matching exact integer submultiples of a **32.768 kHz** quartz crystal oscillator (`1024 Hz`, `2048 Hz`, `3277 Hz`, `4096 Hz`), eliminating external MP3/WAV files.
* **Complete Familia DramaPuchi Evolution Tree**:
  * Egg hatching $\to$ Babypuchi $\to$ Rolli $\to$ Chirpy or Pouty $\to$ 6 adult species (Smarty, Pingu, Shadow, Chompy, Noodle, Divalips) $\to$ Peaceful departure to the home planet (*DEPARTED*).
* **Multi-Language Support (14 Languages)**:
  * Complete in-game translations for 14 major world languages with automatic browser language detection and full right-to-left (RTL) layout support for Arabic.
* **5-Round Directional Mini-Game**:
  * Guess which direction the pet will turn (Button A: Left / Button B: Right). Winning 3 or more rounds restores happiness and burns weight.
* **Modern Quality of Life (QoL) Enhancements**:
  * 👶 **In-Game Puchi Sitter Mode**: Built directly into the keychain buttons (Light menu option 3 or Status Meter page 5) to freeze biological degradation during work or school hours.
  * ⚙️ **Quick Settings Modal**: Convenient top-left floating button for language switching, LED Backlight, acoustic audio mute, and JSON save export/import.
  * 🌙 **LED Backlight Toggle**: Switch effortlessly between classic reflective STN LCD and illuminated night Indiglo mode.
  * 💾 **Portable JSON Backup**: Export and import save files in a single click to migrate progress across devices.
  * 📖 **In-App Manual**: Built-in modal dialog with comprehensive gameplay rules, button orientations, and evolution tips.
  * 📳 **Haptic Feedback**: Short tactile vibration bursts on supported mobile devices.

---

## 🎮 Controls

### Touch / Mouse (Mobile-First)
* **Button A** (Left): Navigate / cycle through the 7 top and bottom icons / select Left in the mini-game.
* **Button B** (Center): Confirm action / trigger happy jump in idle / select Right in the mini-game.
* **Button C** (Right): Cancel / return to idle / check the real-time 24h clock.

### Desktop Keyboard Shortcuts
* `[A]` or `[←]`: Button A
* `[B]`, `[Enter]` or `[Space]`: Button B
* `[C]`, `[Escape]` or `[→]`: Button C

---

## 📟 The 8 Status Icons

| Icon | Name | Function & Effects |
| :---: | :--- | :--- |
| **🍴** | **Feed** | Submenu: **Meal** (+1 hunger, +1 lb) or **Snack** (+1 happy, +2 lb). *Caution: Feeding >4 snacks in a row causes a toothache/sickness!* |
| **💡** | **Light** | Submenu options: **LIGHT ON**, **LIGHT OFF**, or **SITTER** (toggles built-in Puchi Sitter mode). Sleeping with lights on counts as a Care Mistake after 1 hour. |
| **⚾** | **Game** | 5-round heading prediction mini-game. Winning $\ge 3$ rounds awards +1 happiness and burns 1 lb. |
| **💉** | **Medicine** | Treats illness when the skull icon appears ☠️ (may require 1–2 doses). |
| **🚿** | **Flush** | Cleans accumulated poop with a sweeping ocean wave animation. 4 poops left uncleaned causes disease. |
| **⚖️** | **Meter** | 4 status pages: 1) Age & Weight, 2) Discipline Bar, 3) Hunger Hearts (4 max), 4) Happiness Hearts (4 max). |
| **💢** | **Discipline** | Scolds the pet during false calls (when calling with full meters). Grants +25% discipline. |
| **🔔** | **Attention** | Passive alert indicator; flashes and beeps when the pet requires immediate care. |

---

## 🧬 Evolution Matrix (Familia DramaPuchi)

```
[Egg] ──(5 min)──> [Babypuchi] ──(65 min)──> [Rolli]
                                               │
                      ┌─── (0-2 Care Mistakes) ┴─── (3+ Care Mistakes) ───┐
                      ▼                                                   ▼
                  [Chirpy]                                             [Pouty]
                      │                                                   │
       ┌──────────────┼──────────────┐                     ┌──────────────┼──────────────┐
       ▼              ▼              ▼                     ▼              ▼              ▼
    [Smarty]       [Pingu]        [Shadow]              [Chompy]       [Noodle]      [Divalips]
   (0-1 err,      (2-3 err,       (4+ err or            (0-2 err,       (3-4 err)     (5+ err)
   >=90% disc)    >=75% disc)     <50% disc)            >=50% disc)
```

---

## 🌐 Supported Languages (14 Languages)

The game provides 100% native localization across all interface elements, care icons, settings, full instruction manual, evolution guide, and PWA prompts:

| Flag | Language | Native Name | Code | Layout |
| :---: | :--- | :--- | :---: | :---: |
| 🇬🇧 | **English** | English | `en` | LTR |
| 🇪🇸 | **Spanish** | Español | `es` | LTR |
| 🇨🇳 | **Chinese** | 中文 | `zh` | LTR |
| 🇧🇷 | **Portuguese** | Português | `pt` | LTR |
| 🇯🇵 | **Japanese** | 日本語 | `ja` | LTR |
| 🇩🇪 | **German** | Deutsch | `de` | LTR |
| 🇫🇷 | **French** | Français | `fr` | LTR |
| 🇮🇹 | **Italian** | Italiano | `it` | LTR |
| 🇷🇺 | **Russian** | Русский | `ru` | LTR |
| 🇸🇦 | **Modern Standard Arabic** | العربية | `ar` | RTL |
| 🇮🇳 | **Hindi** | हिन्दी | `hi` | LTR |
| 🇧🇩 | **Bengali** | বাংলা | `bn` | LTR |
| 🇮🇩 | **Indonesian** | Bahasa Indonesia | `id` | LTR |
| 🇹🇭 | **Thai** | ไทย | `th` | LTR |

---

## 🛠️ Codebase Structure

```
DramaPuchi/
├── config/
│   └── petConfig.js           # Biological stage durations, rates, and death thresholds
├── constants/
│   ├── i18n.js                # Full dictionaries for 14 languages & auto-detection
│   └── menu.js                # UI mode (UI_MODE) and icon index (ICONS) enums
├── engine/
│   ├── timeEngine.js          # Deterministic minute-by-minute simulation engine
│   └── evolutionResolver.js   # Gen 1 branching evolution tree logic
├── ui/
│   ├── LcdMatrix.js           # 32×16 LCD renderer with physical ghosting decay
│   ├── sprites.js             # Pixel bitmaps for species, items, and 3×5 font
│   ├── StatusRenderer.js      # Status meter screens (scale) and real-time clock
│   └── GameRenderer.js        # Scene compositor for animations, idle, and mini-game
├── audio/
│   └── RetroAudio.js          # Piezoelectric square-wave acoustic synthesizer
├── controllers/
│   ├── MenuController.js      # 3-button (A, B, C) finite state machine
│   └── MiniGameController.js  # 5-round guessing game controller
├── storage/
│   └── SaveManager.js         # IndexedDB / localStorage persistence and JSON export/import
├── index.html                 # Mobile-first shell, LCD screen, and instruction manual modal
├── app.js                     # Main application bootstrap and 60 FPS animation loop
├── sw.js                      # Offline-first Service Worker cache
└── test/
    └── suite.js               # Automated unit test suite (13 test suites)
```

---

## 🚀 Local Development & Testing

No build step or bundling required. Everything runs natively as standard ES Modules:

1. **Start local static server**:
   ```bash
   python3 -m http.server 8000
   # Or using Node:
   # npx serve .
   ```
2. **Open in browser**:
   Navigate to `http://localhost:8000`

3. **Run unit test suite**:
   ```bash
   npm test
   ```

---

## ☁️ Deployment (Cloudflare Pages)

The live site is a Cloudflare Pages project (`tama-pwa`) published by direct upload. Always deploy with:

```bash
npx wrangler login   # once per machine
npm run deploy
```

`npm run deploy` exports the last commit with `git archive HEAD` into a temporary folder and uploads only that folder. Files ignored by git, such as the private specs `er.txt` and `er.docx`, never leave your machine. Uncommitted changes are not deployed either, so commit first.

**Never run `wrangler pages deploy .` from the repo root.** Pages reads no ignore file: neither `.gitignore` nor `.assetsignore` apply. It uploads every file except a fixed list (`node_modules`, `.git`, `.DS_Store`, `.wrangler`, `_worker.js`, `functions`).

Every deployment also stays reachable at its own URL (`<id>.tama-pwa.pages.dev`). If a private file is ever published, deploy a clean commit and then delete the old deployments:

```bash
npx wrangler pages deployment list --project-name tama-pwa
npx wrangler pages deployment delete <id> --project-name tama-pwa
```

Before committing a content change, bump `CACHE_NAME` in `sw.js` so installed PWAs pick up the new version.

---

## 📄 License

Distributed under the MIT License. Inspired by classic 1996 Generation 1 virtual pets.
