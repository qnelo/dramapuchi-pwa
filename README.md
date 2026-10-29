# 🥚 DramaPuchi Retro 32×16 PWA

[![Deploy on Cloudflare Pages](https://img.shields.io/badge/Live_Demo-dramapuchi.pages.dev-orange?style=flat&logo=cloudflare)](https://dramapuchi.pages.dev)
[![PWA Ready](https://img.shields.io/badge/PWA-100%25_Offline--First-success?style=flat&logo=pwa)](https://dramapuchi.pages.dev)
[![Pure Vanilla JS](https://img.shields.io/badge/Stack-ES_Modules_•_Web_Audio_•_Canvas-blue?style=flat)](https://dramapuchi.pages.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A faithful, 100% client-side retro virtual pet experience (**DramaPuchi**), engineered as a modern Progressive Web App (PWA) installable on mobile and desktop devices with zero external libraries or backend servers.

🎮 **Play Live in Browser**:
* **Official**: [https://dramapuchi.pages.dev](https://dramapuchi.pages.dev)
* **Legacy Mirror**: [https://tama-pwa.pages.dev](https://tama-pwa.pages.dev)

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
* **Dual Generations (1996 & 1997)**:
  * **Generation 1 (Classic Red)**: Rice Bowl / Bread, Wrapped Candy, 5-round Left/Right directional game, and the classic Familia DramaPuchi evolution tree.
  * **Generation 2 (Swirl Yellow)**: Burger, Layered Cream Cake, 5-round High-Low card guessing game, and 7 new Gen 2 species.
* **Voluntary Ko-fi Supporter Unlock**:
  * Any voluntary donation on Ko-fi instantly unlocks Generation 2 across devices, with webhook verification and anti-fraud protection.
* **Google Cloud Sync (Cross-Device)**:
  * Optional one-tap Google login to backup and synchronize your pet and unlocks across all devices using Cloudflare D1.
* **Multi-Language Support (14 Languages)**:
  * Complete in-game translations for 14 major world languages with automatic browser language detection and full right-to-left (RTL) layout support for Arabic.
* **Modern Quality of Life (QoL) Enhancements**:
  * 👶 **In-Game Puchi Sitter Mode**: Built directly into the keychain buttons (Light menu option 3) or Settings modal to freeze degradation during work or school hours.
  * ⚙️ **Quick Settings Modal**: Language switching, LED Backlight toggle, audio mute, cloud sync, and JSON save export/import.
  * 💾 **Portable JSON Backup**: Export and import save files in a single click.
  * 📖 **In-App Manual**: Built-in modal dialog with comprehensive gameplay rules, button orientations, and evolution tips.
  * 📳 **Haptic Feedback**: Short tactile vibration bursts on supported mobile devices.

---

## 🎮 Controls & Gameplay Reference

For comprehensive care instructions, metabolic decay rules, sleep schedules, and detailed species guides, read the dedicated manual:

👉 [**📖 Read the Full GAMEPLAY.md Manual**](GAMEPLAY.md)

### Touch / Mouse (Mobile-First)
* **Button A** (Left): Navigate / cycle through the 7 top and bottom icons / select Left or Low in mini-games.
* **Button B** (Center): Confirm action / trigger happy jump in idle / select Right or High in mini-games.
* **Button C** (Right): Cancel / return to idle / check the real-time 24h clock.

### Desktop Keyboard Shortcuts
* `[A]` or `[←]`: Button A
* `[B]`, `[Enter]` or `[Space]`: Button B
* `[C]`, `[Escape]` or `[→]`: Button C

---

## 🧬 Evolutionary Branches

DramaPuchi features two complete generational evolution trees governed by care mistakes and discipline. For full criteria, see [GAMEPLAY.md](GAMEPLAY.md).

### Generation 1 (1996)
```
[Egg] ──(5m)──> [Babypuchi] ──(65m)──> [Rolli]
                                         │
                 ┌─── (<= 2 Mistakes) ───┴─── (>= 3 Mistakes) ───┐
                 ▼                                               ▼
             [Chirpy]                                         [Pouty]
                 │                                               │
   ┌─────────────┼─────────────┐                   ┌─────────────┼─────────────┐
   ▼             ▼             ▼                   ▼             ▼             ▼
[Smarty]      [Pingu]       [Shadow]            [Chompy]      [Noodle]     [Divalips]
(<=1 err)     (<=3 err)     (4+ err)            (<=4 err)     (5-6 err)    (7+ err)
                               │
                       (Secret)▼
                            [Oldy]
```

### Generation 2 (1997)
```
[Swirl Egg] ──(5m)──> [Snowpuchi] ──(65m)──> [Curly]
                                               │
                       ┌─── (<= 2 Mistakes) ───┴─── (>= 3 Mistakes) ───┐
                       ▼                                               ▼
                    [Spiky]                                         [Ducky]
                       │                                               │
         ┌─────────────┼─────────────┐                   ┌─────────────┼─────────────┐
         ▼             ▼             ▼                   ▼             ▼             ▼
      [Bunny]       [Barky]       [Beaky]             [Leggy]        [Octo]       [Flora]
      (<=1 err)     (<=3 err)     (4+ err)            (<=4 err)      (5-6 err)    (7+ err)
                                     │
                             (Secret)▼
                                  [Kitty]
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

## ⚙️ Configuration & Environment Variables

DramaPuchi runs 100% offline-first in the browser without any backend required. When deployed to Cloudflare Pages, optional cloud features—**Google Cloud Sync**, **Ko-fi Webhook Verification**, and **D1 Database Persistence**—are enabled seamlessly via serverless Pages Functions (`functions/api/`).

### Local Environment Files (`.dev.vars` & `.env`)

Secret tokens should **never** be committed to Git. Two template files are provided in the repository:

* **`.dev.vars.example`** $\to$ **`.dev.vars`** (used by Cloudflare Wrangler / Pages Functions):
  ```bash
  cp .dev.vars.example .dev.vars
  ```
  Edit `.dev.vars` with your local development keys:
  ```ini
  # Ko-fi Webhook Verification Token (from https://ko-fi.com/manage/webhooks?src=sidemenu)
  KOFI_VERIFICATION_TOKEN=your_kofi_verification_token_here

  # Google OAuth Client ID for Cloud Sync (optional local override)
  GOOGLE_CLIENT_ID=your_google_client_id_here.apps.googleusercontent.com
  ```

* **`.env.example`** $\to$ **`.env`** (used by standalone Node.js scripts):
  ```bash
  cp .env.example .env
  ```

> [!NOTE]
> `.dev.vars` and `.env` are strictly included in `.gitignore` to guarantee local credentials are never published to GitHub.

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

## 📄 License

Distributed under the MIT License. Inspired by classic 1996 Generation 1 virtual pets.
