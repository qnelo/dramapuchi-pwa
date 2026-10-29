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

## ☕ Supporter Pack & Instant Gen 2 Unlock (Ko-fi)

DramaPuchi is a 100% free, ad-free open-source project. You can support its hosting and development via voluntary contributions on [Ko-fi](https://ko-fi.com/qnelo).

### In-Game Perk: Instant Generation 2
While Generation 2 can normally be earned for free by raising a Gen 1 adult pet to a peaceful UFO departure after 14 days, **any Ko-fi contribution ($1 to $10 USD) instantly unlocks Generation 2**!

| Tier | Item / Action | Price | Direct Ko-fi Link |
| :---: | :--- | :---: | :--- |
| 🍬 | **Supporter Snack** | **$1.00** | [ko-fi.com/s/d36d1b77d2](https://ko-fi.com/s/d36d1b77d2) |
| 🍙 | **Supporter Meal** | **$2.00** | [ko-fi.com/s/9b741c9c18](https://ko-fi.com/s/9b741c9c18) |
| 🛁 | **Supporter Bath** | **$3.00** | [ko-fi.com/s/5ecb5a3e4b](https://ko-fi.com/s/5ecb5a3e4b) |
| ⚾ | **Supporter Play** | **$5.00** | [ko-fi.com/s/9c332e9183](https://ko-fi.com/s/9c332e9183) |
| 💉 | **Supporter Care & Medicine** | **$10.00** | [ko-fi.com/s/1e6b405b48](https://ko-fi.com/s/1e6b405b48) |

* **Single-Use Anti-Fraud Protection**: Every session receives a unique code (`#DP-XXXX`). Clicking any tier automatically copies your code to the clipboard and redirects to Ko-fi. When Ko-fi fires its webhook, your game immediately confirms the donation and unlocks Gen 2 with fanfare!
* **Receipt Redemption**: If you donated without the code or from a different browser, you can paste the transaction ID from your Ko-fi email receipt to redeem instantly.

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
│   └── petConfig.js           # Biological stage durations, rates, support tiers & item URLs
├── constants/
│   ├── i18n.js                # Full dictionaries for 14 languages & auto-detection
│   └── menu.js                # UI mode (UI_MODE) and icon index (ICONS) enums
├── engine/
│   ├── timeEngine.js          # Deterministic minute-by-minute simulation engine
│   └── evolutionResolver.js   # Gen 1 & Gen 2 branching evolution tree logic
├── ui/
│   ├── LcdMatrix.js           # 32×16 LCD renderer with physical ghosting decay
│   ├── sprites.js             # Pixel bitmaps for Gen 1 & Gen 2 species, items, and font
│   ├── StatusRenderer.js      # Status meter screens (scale) and real-time clock
│   └── GameRenderer.js        # Scene compositor for animations, idle, and mini-games
├── audio/
│   └── RetroAudio.js          # Piezoelectric square-wave acoustic synthesizer
├── controllers/
│   ├── MenuController.js      # 3-button (A, B, C) finite state machine
│   ├── MiniGameController.js  # Gen 1 Left/Right heading prediction game
│   └── HighLowGameController.js # Gen 2 High-Low card guessing game
├── storage/
│   ├── SaveManager.js         # IndexedDB / localStorage persistence and JSON export/import
│   └── CloudSyncManager.js    # Google Identity JWT auth, donor codes & Cloudflare D1 sync
├── functions/api/             # Cloudflare Pages serverless endpoints
│   ├── kofi-webhook.js        # Ko-fi payment notification handler & anti-fraud processor
│   └── verify-donation.js     # Single-use donor code & receipt transaction verification
├── schema.sql                 # Cloudflare D1 SQLite database schema (user_saves, donations)
├── GAMEPLAY.md                # Detailed care manual & Gen 1/Gen 2 evolution guide
├── index.html                 # Mobile-first shell, LCD screen, and modal dialogs
├── app.js                     # Main application bootstrap and 60 FPS animation loop
├── sw.js                      # Offline-first Service Worker cache
└── test/
    └── suite.js               # Comprehensive unit test suite (15 test suites)
```

---

## ⚙️ Configuration & Environment Variables

DramaPuchi runs 100% offline-first in the browser without any backend required. When deployed to Cloudflare Pages, optional cloud features—**Google Cloud Sync**, **Ko-fi Webhook Verification**, and **D1 Database Persistence**—are enabled seamlessly via serverless Pages Functions (`functions/api/`).

### 1. Local Environment Files (`.dev.vars` & `.env`)

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
  GOOGLE_CLIENT_ID=488546893397-sepvb33kiclnkn6afl0j4lpp9rrdte9k.apps.googleusercontent.com
  ```

* **`.env.example`** $\to$ **`.env`** (used by standalone Node.js scripts):
  ```bash
  cp .env.example .env
  ```

> [!NOTE]
> `.dev.vars` and `.env` are strictly included in `.gitignore` to guarantee local credentials are never published to GitHub.

---

### 2. Production Secrets (Cloudflare Pages)

In production, secrets are stored encrypted within Cloudflare's secure secret store and injected at runtime into `context.env`:

To upload or update secrets securely from the command line:

```bash
# Set secret for the primary project
npx wrangler pages secret put KOFI_VERIFICATION_TOKEN --project-name dramapuchi

# Set secret for the mirror project
npx wrangler pages secret put KOFI_VERIFICATION_TOKEN --project-name tama-pwa
```

*(Alternatively, configure them in the Cloudflare Dashboard under **Workers & Pages** $\to$ **dramapuchi** $\to$ **Settings** $\to$ **Variables and Secrets**).*

---

### 3. Cloudflare D1 Database Setup

Cloud Sync and donation tracking use Cloudflare's serverless SQLite database (D1). The database configuration is declared in `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "dramapuchi-db"
database_id = "12441c55-5eed-4573-a104-ac8857384409"
```

To run or update database migrations defined in [`schema.sql`](file:///home/qnelo/develop/personal/Tamagotchi/schema.sql):

```bash
# Apply schema to local development database:
npx wrangler d1 execute dramapuchi-db --local --file=schema.sql

# Apply schema to production Cloudflare D1:
npx wrangler d1 execute dramapuchi-db --remote --file=schema.sql
```

---

### 4. Ko-fi Webhook & In-Game Rewards

DramaPuchi allows supporters to unlock **Generation 2** immediately via voluntary Ko-fi donations.

1. Navigate to [Ko-fi Webhooks](https://ko-fi.com/manage/webhooks?src=sidemenu).
2. Set **Webhook URL** to:
   ```text
   https://dramapuchi.pages.dev/api/kofi-webhook
   ```
3. Copy the **Verification Token** shown on Ko-fi and upload it using `wrangler pages secret put KOFI_VERIFICATION_TOKEN`.
4. Click **"Send Test"** on Ko-fi to verify that the endpoint returns `200 OK`.

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

The game is simultaneously published to two production Cloudflare Pages projects:
1. **Primary Project**: `dramapuchi` ([https://dramapuchi.pages.dev](https://dramapuchi.pages.dev))
2. **Legacy Mirror**: `tama-pwa` ([https://tama-pwa.pages.dev](https://tama-pwa.pages.dev))

Deploy simultaneously to both domains with a single command:

```bash
npx wrangler login   # once per machine
npm run deploy
```

`npm run deploy` exports the last commit with `git archive HEAD` into a temporary folder and uploads only that folder to both Cloudflare Pages projects. Files ignored by git, such as the private specs `er.txt` and `er.docx`, never leave your machine. Uncommitted changes are not deployed either, so commit first.

**Never run `wrangler pages deploy .` from the repo root.** Pages reads no ignore file: neither `.gitignore` nor `.assetsignore` apply. It uploads every file except a fixed list (`node_modules`, `.git`, `.DS_Store`, `.wrangler`, `_worker.js`, `functions`).

Every deployment also stays reachable at its own deployment URL. If a private file is ever published, deploy a clean commit and then delete old deployments:

```bash
npx wrangler pages deployment list --project-name dramapuchi
npx wrangler pages deployment delete <id> --project-name dramapuchi
```

Before committing a content change, bump `CACHE_NAME` in `sw.js` so installed PWAs pick up the new version.

---

## 📄 License

Distributed under the MIT License. Inspired by classic 1996 Generation 1 virtual pets.
