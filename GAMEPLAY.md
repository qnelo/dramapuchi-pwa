# 🎮 DramaPuchi: Comprehensive Gameplay & Evolution Guide (GAMEPLAY.md)

Welcome to the definitive gameplay guide for **DramaPuchi**, the authentic 32×16 retro virtual pet emulator. This document covers all care mechanics, item menus, mini-games, and complete branching evolution trees for both **Generation 1 (1996)** and **Generation 2 (1997)**.

---

## 📑 Table of Contents

1. [Care & Metabolism Basics](#1-care--metabolism-basics)
2. [Keychain Controls & Status Icons](#2-keychain-controls--status-icons)
3. [Generation 1 vs Generation 2 Differences](#3-generation-1-vs-generation-2-differences)
4. [Generation 1 Evolution Matrix (1996)](#4-generation-1-evolution-matrix-1996)
5. [Generation 2 Evolution Matrix (1997)](#5-generation-2-evolution-matrix-1997)
6. [Secret Characters](#6-secret-characters)
7. [How to Unlock Generation 2](#7-how-to-unlock-generation-2)
8. [Cloud Sync & Save Portability](#8-cloud-sync--save-portability)

---

## 1. Care & Metabolism Basics

DramaPuchi operates on a **minute-by-minute deterministic biological simulation** that tracks elapsed real-world time even when the device is locked or closed.

### Biological Parameters:
* **Hunger (0–4 Hearts)**: Depletes automatically over time based on the pet's lifecycle stage. When hunger reaches 0, the pet calls for food. If left at 0 for 15 minutes, a **Care Mistake** is accumulated. 6 consecutive awake hours at 0 hunger results in starvation (`DEAD`).
* **Happiness (0–4 Hearts)**: Depletes over time. Restored by feeding snacks/cakes or winning mini-games. Reaching 0 triggers attention calls.
* **Weight (lb)**: Base weight increases with evolutionary stage. Meals/Burgers add +1 lb; Snacks/Cakes add +2 lb. Playing mini-games burns weight (-1 lb per game won).
* **Discipline (0–100%)**: Raised by +25% when scolding a pet that calls falsely (when hunger and happiness are above 0). Crucial for unlocking high-tier adult species.
* **Poop & Hygiene**: The pet poops periodically. Accumulating 4 poops triggers illness. Clean immediately with the **Flush** icon.
* **Illness (Skull ☠️)**: Occurs from poor hygiene (4 poops), leaving hunger/happy at 0 for extended periods, or feeding $>4$ consecutive snacks/cakes (toothache). Requires 1–2 doses of **Medicine** to cure.
* **Sleep Schedules**: Pets sleep according to biological schedules:
  * *Baby*: Awake 24/7 (continuous care for 65 minutes).
  * *Child*: Sleeps from 20:00 to 09:00.
  * *Teen*: Sleeps from 21:00 to 09:00.
  * *Adult*: Sleeps from 22:00 to 08:00.
  * *Important*: Leaving the lights on while the pet is asleep for $\ge 60$ minutes yields +1 Care Mistake!
* **Puchi Sitter Mode**: Built into the keychain (Light menu option 3 or Settings modal). Freezes metabolic degradation between 07:00 and 18:00, perfect for work or school.

---

## 2. Keychain Controls & Status Icons

The device features 3 physical tactile buttons:
* **Button A (Left)**: Navigate / cycle menu icons (0–6) / select Left or Low.
* **Button B (Center)**: Confirm action / trigger happy jump when idle / select Right or High.
* **Button C (Right)**: Cancel action / return to idle / display real-time 24h clock.

### The 8 Menu Icons

| Icon | Name | Function & Effects |
| :---: | :--- | :--- |
| **🍴** | **Feed** | **Meal** (+1 hunger, +1 lb) or **Snack** (+1 happy, +2 lb). Eating $>4$ snacks in a row causes toothache illness! |
| **💡** | **Light** | **LIGHT ON**, **LIGHT OFF**, or **SITTER** (freezes decay during daytime). Sleeping with lights on counts as a care mistake. |
| **⚾** | **Game** | Play the generational mini-game to restore happiness and burn weight without calorie penalty. |
| **💉** | **Medicine** | Cures illness when the skull icon appears. (Refuses if healthy). |
| **🚿** | **Flush** | Cleans all droppings with an ocean wave animation. |
| **⚖️** | **Meter** | Cycles through 4 status pages: 1) Age & Weight, 2) Discipline bar, 3) Hunger hearts, 4) Happiness hearts. |
| **💢** | **Discipline** | Scolds the pet. Grants +25% discipline only when scolding an active false call. |
| **🔔** | **Attention** | Passive alert; beeps and flashes when the pet demands urgent care or discipline. |

---

## 3. Generation 1 vs Generation 2 Differences

| Feature | Generation 1 (1996) | Generation 2 (1997) |
| :--- | :--- | :--- |
| **Shell Artwork** | Classic Red Keychain with Gold Accents | Swirl Yellow Shell with White Bezel |
| **Meal (Food)** | Rice Bowl / Bread Loaf | Delicious Burger |
| **Snack (Sweet)** | Wrapped Hard Candy | Layered Cream Cake |
| **Mini-Game** | **Heading Prediction**: Guess Left (`A`) or Right (`B`) | **High-Low Card Game**: Guess if next card is Lower (`A`) or Higher (`B`) |
| **Baby / Child** | Babypuchi $\to$ Rolli | Snowpuchi $\to$ Curly |
| **Teen Species** | Chirpy (Good) / Pouty (Poor) | Spiky (Good) / Ducky (Poor) |
| **Adult Species** | Smarty, Pingu, Shadow, Chompy, Noodle, Divalips | Bunny, Barky, Beaky, Leggy, Octo, Flora |
| **Secret Character** | **Oldy** (evolved from Shadow) | **Kitty** (evolved from Beaky) |

---

## 4. Generation 1 Evolution Matrix (1996)

```
[Egg] ──(5 min)──> [Babypuchi] ──(65 min)──> [Rolli]
                                               │
                      ┌─── (<= 2 Care Mistakes) ┴─── (>= 3 Care Mistakes) ───┐
                      ▼                                                      ▼
                  [Chirpy]                                                [Pouty]
                      │                                                      │
       ┌──────────────┼──────────────┐                        ┌──────────────┼──────────────┐
       ▼              ▼              ▼                        ▼              ▼              ▼
    [Smarty]       [Pingu]        [Shadow]                 [Chompy]       [Noodle]      [Divalips]
   (0-1 err,      (2-3 err,       (4+ err or               (0-4 err,      (5-6 err)     (7+ err)
   >=90% disc)    >=75% disc)     <50% disc)               >=50% disc)
```

### Evolution Criteria (Gen 1):
1. **Rolli $\to$ Teen (Age: 2 Days)**:
   * **Chirpy**: $\le 2$ Care Mistakes and $\ge 50\%$ Discipline.
   * **Pouty**: $\ge 3$ Care Mistakes or $< 50\%$ Discipline.
2. **Chirpy $\to$ Adult (Age: 5 Days total)**:
   * **Smarty**: $\le 1$ Care Mistake and $\ge 90\%$ Discipline.
   * **Pingu**: $\le 3$ Care Mistakes and $\ge 75\%$ Discipline.
   * **Shadow**: 4+ Care Mistakes or low discipline.
3. **Pouty $\to$ Adult (Age: 5 Days total)**:
   * **Chompy**: $\le 4$ Care Mistakes and $\ge 50\%$ Discipline.
   * **Noodle**: 5–6 Care Mistakes.
   * **Divalips**: 7+ Care Mistakes.
4. **Peaceful Departure (Age: 14 Days as Adult)**:
   * Returns peacefully to its home planet in a UFO (`DEPARTED`).
   * Achieving departure with **Smarty**, **Pingu**, or **Shadow** automatically **unlocks Generation 2**!

---

## 5. Generation 2 Evolution Matrix (1997)

```
[Swirl Egg] ──(5 min)──> [Snowpuchi] ──(65 min)──> [Curly]
                                                     │
                           ┌─── (<= 2 Care Mistakes) ┴─── (>= 3 Care Mistakes) ───┐
                           ▼                                                      ▼
                        [Spiky]                                                [Ducky]
                           │                                                      │
            ┌──────────────┼──────────────┐                        ┌──────────────┼──────────────┐
            ▼              ▼              ▼                        ▼              ▼              ▼
         [Bunny]        [Barky]        [Beaky]                  [Leggy]         [Octo]       [Flora]
        (0-1 err,      (2-3 err,       (4+ err or               (0-4 err,      (5-6 err)     (7+ err)
        >=90% disc)    >=75% disc)     <50% disc)               >=50% disc)
```

### Evolution Criteria (Gen 2):
1. **Curly $\to$ Teen (Age: 2 Days)**:
   * **Spiky (Branch A)**: $\le 2$ Care Mistakes and $\ge 50\%$ Discipline.
   * **Ducky (Branch B)**: $\ge 3$ Care Mistakes or $< 50\%$ Discipline.
2. **Spiky $\to$ Adult (Age: 5 Days total)**:
   * **Bunny**: $\le 1$ Care Mistake and $\ge 90\%$ Discipline. (Most intelligent Gen 2 species).
   * **Barky**: $\le 3$ Care Mistakes and $\ge 75\%$ Discipline. (Playful canine-like pet).
   * **Beaky**: 4+ Care Mistakes or low discipline.
3. **Ducky $\to$ Adult (Age: 5 Days total)**:
   * **Leggy**: $\le 4$ Care Mistakes and $\ge 50\%$ Discipline.
   * **Octo**: 5–6 Care Mistakes.
   * **Flora**: 7+ Care Mistakes.
4. **Peaceful Departure (Age: 14 Days as Adult)**:
   * Returns home in a golden UFO beam after a fulfilling lifespan.

---

## 6. Secret Characters

Both generations include an elusive **Secret 7th Evolution** that can only be reached after living at least 5 days as an adult under flawless care:

* **Oldy (Generation 1)**:
  * Evolved from: **Shadow**.
  * Requirements: Reach 5+ days as an adult (around day 10 total) with **0 adult care mistakes** and **100% discipline**.
* **Kitty (Generation 2)**:
  * Evolved from: **Beaky**.
  * Requirements: Reach 5+ days as an adult with **0 adult care mistakes** and **100% discipline**.

---

## 7. How to Unlock Generation 2

Generation 2 is locked by default to preserve authentic progression. You can unlock it via two official paths:

### Path A: Mastery Through Care (Free In-Game)
Nurture any Generation 1 pet along the Chirpy branch (**Smarty**, **Pingu**, or **Shadow**) through its full adult lifespan until day 14, where it peacefully departs to the home planet in a UFO. Upon departure, Generation 2 unlocks permanently.

### Path B: Instant Supporter Pack (Ko-fi Donation)
Any voluntary contribution on [Ko-fi](https://ko-fi.com/qnelo) ($1, $2, $3, $5, or $10 USD) **instantly unlocks Generation 2**:
* In the game, click **☕ Apoyar / Support** in the top-right toolbar.
* Your unique session donor code (`#DP-XXXX`) is displayed. Click any tier button to copy your code and open the Ko-fi shop.
* Paste your code in the Ko-fi message.
* Once Ko-fi notifies our server via webhook, Generation 2 unlocks immediately with a celebration fanfare!
* *Forgot code?* You can redeem anytime by entering the transaction ID from your Ko-fi email receipt.

---

## 8. Cloud Sync & Save Portability

* **Guest Mode**: All progress is persisted locally via IndexedDB and synchronous `localStorage`. Clearing browser data or changing devices will reset progress.
* **Google Cloud Sync**: Sign in with Google (top-left Settings $\to$ Google Sync) to backup your pet and unlock state to Cloudflare D1. Your pet automatically reconciles across desktop, mobile, and tablets.
* **JSON Export / Import**: Download an offline `.json` backup from Settings at any time to keep your pet safe or share between browsers.
