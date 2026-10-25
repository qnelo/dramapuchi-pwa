import assert from 'node:assert';
import { STAGE_CONFIG, THRESHOLDS } from '../config/petConfig.js';
import { TamagotchiEngine } from '../engine/timeEngine.js';
import { EvolutionResolver } from '../engine/evolutionResolver.js';
import { SaveManager } from '../storage/SaveManager.js';
import { ICONS, UI_MODE } from '../constants/menu.js';
import { SPRITES, FONT_3X5 } from '../ui/sprites.js';
import { StatusRenderer } from '../ui/StatusRenderer.js';
import { MenuController } from '../controllers/MenuController.js';
import { MiniGameController } from '../controllers/MiniGameController.js';

console.log('--- RUNNING TAMAGOTCHI TEST SUITE ---');

// 1. Initial State
console.log('Testing Initial State...');
const state = SaveManager.getInitialState();
assert.strictEqual(state.stage, 'EGG');
assert.strictEqual(state.species, 'EGG');
assert.strictEqual(state.hunger, 0);
assert.strictEqual(state.happiness, 0);
assert.strictEqual(state.weight, 5);
assert.strictEqual(state.poopCount, 0);
assert.strictEqual(state.isSick, false);
assert.strictEqual(state.isSleeping, false);
assert.strictEqual(state.lightsOn, true);
assert.strictEqual(state.sitterModeActive, false);
console.log('✓ Initial State valid.');

// 2. Egg Hatching
console.log('Testing Egg Hatching...');
const bornTime = state.bornTimestamp;
TamagotchiEngine.reconcile(state, bornTime + 4 * 60 * 1000);
assert.strictEqual(state.stage, 'EGG');

TamagotchiEngine.reconcile(state, bornTime + 5 * 60 * 1000);
assert.strictEqual(state.stage, 'BABY');
assert.strictEqual(state.species, 'BABYTCHI');
assert.strictEqual(state.hunger, 2);
assert.strictEqual(state.happiness, 2);
assert.strictEqual(state.weight, STAGE_CONFIG.BABY.baseWeight);
console.log('✓ Egg Hatching verified.');

// 3. Time Reconciliation & Degradation
console.log('Testing Degradation & Care...');
const babyBornTime = state.lastTickTimestamp;
// Simulate 15 minutes: baby hungerRateMin = 15, happyRateMin = 15
TamagotchiEngine.reconcile(state, babyBornTime + 15 * 60 * 1000);
assert.strictEqual(state.hunger, 1);
assert.strictEqual(state.happiness, 1);

// Another 15 min: hunger -> 0, happiness -> 0
TamagotchiEngine.reconcile(state, babyBornTime + 30 * 60 * 1000);
assert.strictEqual(state.hunger, 0);
assert.strictEqual(state.happiness, 0);
assert.strictEqual(state.isCalling, true);
console.log('✓ Degradation & Attention verified.');

// 4. Sitter Mode
console.log('Testing Sitter Mode (Tama Sitter)...');
const sitterState = {
  ...SaveManager.getInitialState(),
  stage: 'CHILD',
  species: 'MARUTCHI',
  hunger: 4,
  happiness: 4,
  sitterModeActive: true,
  lastTickTimestamp: new Date('2026-10-25T08:00:00Z').getTime()
};
// 120 minutes during daytime (08:00 - 10:00) with sitter
TamagotchiEngine.reconcile(sitterState, sitterState.lastTickTimestamp + 120 * 60 * 1000);
// Child degradation rates are 45min hunger, 40min happiness, but sitter keeps them steady!
assert.strictEqual(sitterState.hunger, 4);
assert.strictEqual(sitterState.happiness, 4);
console.log('✓ Sitter Mode verified.');

// 5. Starvation Death Evaluation
console.log('Testing Starvation Death...');
const starvingPet = {
  ...SaveManager.getInitialState(),
  stage: 'BABY',
  species: 'BABYTCHI',
  hunger: 0,
  happiness: 0,
  starvationMinutes: 0,
  lastTickTimestamp: new Date('2026-10-25T10:00:00').getTime()
};
// 360 minutes at 0 hunger while awake -> DEATH
TamagotchiEngine.reconcile(starvingPet, starvingPet.lastTickTimestamp + 360 * 60 * 1000);
assert.strictEqual(starvingPet.stage, 'DEAD');
assert.strictEqual(starvingPet.deathReason, 'STARVATION');
console.log('✓ Starvation Death verified.');

// 6. Sickness Death Evaluation
console.log('Testing Sickness Death...');
const sickPet = {
  ...SaveManager.getInitialState(),
  stage: 'BABY',
  species: 'BABYTCHI',
  hunger: 4,
  happiness: 4,
  isSick: true,
  sickMinutes: 0,
  lastTickTimestamp: new Date('2026-10-25T10:00:00').getTime()
};
// 360 minutes sick without treatment -> DEATH
TamagotchiEngine.reconcile(sickPet, sickPet.lastTickTimestamp + 360 * 60 * 1000);
assert.strictEqual(sickPet.stage, 'DEAD');
assert.strictEqual(sickPet.deathReason, 'SICKNESS');
console.log('✓ Sickness Death verified.');

// 7. Evolution Tree Logic
console.log('Testing Evolution Tree Logic...');
// Test Baby -> Child
const mockStateChild = {
  stage: 'BABY',
  species: 'BABYTCHI',
  ageMinutes: 65,
  weight: 5,
  careMistakes: 1
};
EvolutionResolver.checkAndEvolve(mockStateChild);
assert.strictEqual(mockStateChild.stage, 'CHILD');
assert.strictEqual(mockStateChild.species, 'MARUTCHI');
assert.strictEqual(mockStateChild.weight, 10);
assert.strictEqual(mockStateChild.careMistakes, 0);

// Test Child -> Teen (Tamatchi with <= 2 mistakes)
const mockStateTeenGood = {
  stage: 'CHILD',
  species: 'MARUTCHI',
  ageMinutes: 65 + 1440 * 2,
  weight: 10,
  careMistakes: 1
};
EvolutionResolver.checkAndEvolve(mockStateTeenGood);
assert.strictEqual(mockStateTeenGood.stage, 'TEEN');
assert.strictEqual(mockStateTeenGood.species, 'TAMATCHI');

// Test Child -> Teen (Kuchitamatchi with > 2 mistakes)
const mockStateTeenBad = {
  stage: 'CHILD',
  species: 'MARUTCHI',
  ageMinutes: 65 + 1440 * 2,
  weight: 10,
  careMistakes: 3
};
EvolutionResolver.checkAndEvolve(mockStateTeenBad);
assert.strictEqual(mockStateTeenBad.stage, 'TEEN');
assert.strictEqual(mockStateTeenBad.species, 'KUCHITAMATCHI');

// Test Teen -> Adult (Mametchi: Tamatchi, <= 1 mistake, >= 90 discipline)
const mockMametchi = {
  stage: 'TEEN',
  species: 'TAMATCHI',
  ageMinutes: 65 + 1440 * 2 + 1440 * 3,
  weight: 20,
  careMistakes: 0,
  discipline: 100
};
EvolutionResolver.checkAndEvolve(mockMametchi);
assert.strictEqual(mockMametchi.stage, 'ADULT');
assert.strictEqual(mockMametchi.species, 'MAMETCHI');

// Test Teen -> Adult (Ginjirotchi: Tamatchi, <= 3 mistakes, >= 75 discipline)
const mockGinji = {
  stage: 'TEEN',
  species: 'TAMATCHI',
  ageMinutes: 65 + 1440 * 2 + 1440 * 3,
  weight: 20,
  careMistakes: 2,
  discipline: 80
};
EvolutionResolver.checkAndEvolve(mockGinji);
assert.strictEqual(mockGinji.stage, 'ADULT');
assert.strictEqual(mockGinji.species, 'GINJIROTCHI');

// Test Teen -> Adult (Maskutchi: Tamatchi, fails Mametchi & Ginjirotchi)
const mockMask = {
  stage: 'TEEN',
  species: 'TAMATCHI',
  ageMinutes: 65 + 1440 * 2 + 1440 * 3,
  weight: 20,
  careMistakes: 4,
  discipline: 50
};
EvolutionResolver.checkAndEvolve(mockMask);
assert.strictEqual(mockMask.stage, 'ADULT');
assert.strictEqual(mockMask.species, 'MASKUTCHI');

// Test Teen -> Adult (Kuchipatchi: Kuchitamatchi, <= 4 mistakes, >= 50 disc)
const mockKuchi = {
  stage: 'TEEN',
  species: 'KUCHITAMATCHI',
  ageMinutes: 65 + 1440 * 2 + 1440 * 3,
  weight: 20,
  careMistakes: 3,
  discipline: 60
};
EvolutionResolver.checkAndEvolve(mockKuchi);
assert.strictEqual(mockKuchi.stage, 'ADULT');
assert.strictEqual(mockKuchi.species, 'KUCHIPATCHI');

// Test Teen -> Adult (Nyorotchi: Kuchitamatchi, <= 6 mistakes)
const mockNyoro = {
  stage: 'TEEN',
  species: 'KUCHITAMATCHI',
  ageMinutes: 65 + 1440 * 2 + 1440 * 3,
  weight: 20,
  careMistakes: 5,
  discipline: 40
};
EvolutionResolver.checkAndEvolve(mockNyoro);
assert.strictEqual(mockNyoro.stage, 'ADULT');
assert.strictEqual(mockNyoro.species, 'NYOROTCHI');

// Test Teen -> Adult (Tarakotchi: Kuchitamatchi, > 6 mistakes)
const mockTara = {
  stage: 'TEEN',
  species: 'KUCHITAMATCHI',
  ageMinutes: 65 + 1440 * 2 + 1440 * 3,
  weight: 20,
  careMistakes: 7,
  discipline: 20
};
EvolutionResolver.checkAndEvolve(mockTara);
assert.strictEqual(mockTara.stage, 'ADULT');
assert.strictEqual(mockTara.species, 'TARAKOTCHI');

// Test Adult -> Departed
const mockDeparted = {
  stage: 'ADULT',
  species: 'MAMETCHI',
  ageMinutes: 65 + 1440 * 2 + 1440 * 3 + 1440 * 14,
  weight: 30,
  careMistakes: 0,
  discipline: 100
};
EvolutionResolver.checkAndEvolve(mockDeparted);
assert.strictEqual(mockDeparted.stage, 'DEPARTED');
console.log('✓ Evolution Tree fully verified.');

// 8. MenuController State Machine
console.log('Testing MenuController...');
const mockAudio = {
  playClick: () => {},
  playConfirm: () => {},
  playCancel: () => {},
  playEat: () => {},
  playRefusal: () => {},
  playWinRound: () => {},
  playLoseRound: () => {},
  playEvolution: () => {},
  playAttention: () => {}
};

const petActive = {
  stage: 'BABY',
  species: 'BABYTCHI',
  hunger: 2,
  happiness: 2,
  weight: 5,
  discipline: 0,
  poopCount: 1,
  isSick: false,
  isSleeping: false,
  lightsOn: true,
  isCalling: false,
  disciplineCallActive: false,
  sitterModeActive: false
};

const menu = new MenuController(petActive, mockAudio, () => {});

// Press A in IDLE -> enters ICON_SELECT at 0 (FEED)
menu.pressA();
assert.strictEqual(menu.uiMode, UI_MODE.ICON_SELECT);
assert.strictEqual(menu.selectedIcon, ICONS.FEED);

// Press A in ICON_SELECT -> advances to 1 (LIGHT)
menu.pressA();
assert.strictEqual(menu.selectedIcon, ICONS.LIGHT);

// Press B on LIGHT -> enters SUBMENU
menu.pressB();
assert.strictEqual(menu.uiMode, UI_MODE.SUBMENU);

// Press C in SUBMENU -> cancels to IDLE
menu.pressC();
assert.strictEqual(menu.uiMode, UI_MODE.IDLE);
assert.strictEqual(menu.selectedIcon, null);

// Press C in IDLE -> enters CLOCK
menu.pressC();
assert.strictEqual(menu.uiMode, UI_MODE.CLOCK);

// Press B in CLOCK -> returns to IDLE
menu.pressB();
assert.strictEqual(menu.uiMode, UI_MODE.IDLE);
// Test LIGHT submenu (LIGHT ON and LIGHT OFF)
menu.pressA(); // ICON_SELECT -> 0 (FEED)
menu.pressA(); // -> 1 (LIGHT)
menu.pressB(); // SUBMENU (LIGHT)
assert.strictEqual(menu.uiMode, UI_MODE.SUBMENU);
menu.submenuIndex = 1; // LIGHT OFF
menu.pressB(); // sets lightsOn = false and resets to IDLE
assert.strictEqual(petActive.lightsOn, false);
assert.strictEqual(menu.uiMode, UI_MODE.IDLE);

// Test STATUS_VIEW 4-page cycling (0..3)
menu.pressA(); // ICON_SELECT -> 0 (FEED)
for (let i = 0; i < 5; i++) menu.pressA(); // cycle to 5 (METER)
assert.strictEqual(menu.selectedIcon, ICONS.METER);
menu.pressB(); // Enters STATUS_VIEW at page 0
assert.strictEqual(menu.uiMode, UI_MODE.STATUS_VIEW);
assert.strictEqual(menu.statusPage, 0);
menu.pressA(); // Page 1 (Discipline)
assert.strictEqual(menu.statusPage, 1);
menu.pressA(); // Page 2 (Hunger)
assert.strictEqual(menu.statusPage, 2);
menu.pressA(); // Page 3 (Happiness)
assert.strictEqual(menu.statusPage, 3);
menu.pressA(); // Wraps back to Page 0
assert.strictEqual(menu.statusPage, 0);
menu.pressB(); // Confirm in STATUS_VIEW returns to IDLE
assert.strictEqual(menu.uiMode, UI_MODE.IDLE);

console.log('✓ MenuController verified.');

// 9. MiniGameController
console.log('Testing MiniGameController...');
let gameFinished = false;
const gamePet = { stage: 'BABY', weight: 8, happiness: 1 };
const miniGame = new MiniGameController(gamePet, mockAudio, () => {}, () => { gameFinished = true; });
miniGame.start();
assert.strictEqual(miniGame.getState().round, 1);
assert.strictEqual(miniGame.getState().wins, 0);

miniGame.wins = 3; // Simulate 3 wins in 5 rounds
miniGame.finishGame();
assert.strictEqual(gamePet.happiness, 2); // Happiness increases by 1
assert.strictEqual(gamePet.weight, 7);    // Weight decreases by 1 lb
console.log('✓ MiniGameController verified.');

// 10. Sprites & Font
console.log('Testing Sprites & Font...');
assert.strictEqual(SPRITES.EGG_IDLE.length, 16);
assert.strictEqual(SPRITES.MAMETCHI_IDLE.length, 16);
assert.strictEqual(SPRITES.POOP.length, 8);
assert.strictEqual(SPRITES.SKULL.length, 8);
assert.strictEqual(SPRITES.HEART_FULL.length, 6);
assert.strictEqual(SPRITES.HEART_EMPTY.length, 6);
assert.strictEqual(SPRITES.MEAT.length, 7);
assert.strictEqual(SPRITES.CANDY.length, 7);

for (let d = 0; d <= 9; d++) {
  assert(FONT_3X5[String(d)], `Missing digit ${d}`);
}
for (const char of 'ABCDEFGHILMNOPRSTUY') {
  assert(FONT_3X5[char], `Missing font character ${char}`);
}
console.log('✓ Sprites & Font verified.');

// 11. Mock LCD & StatusRenderer
console.log('Testing StatusRenderer...');
class MockLcd {
  constructor() {
    this.buffer = new Map();
  }
  clear() {
    this.buffer.clear();
  }
  setPixel(x, y, state) {
    this.buffer.set(`${x},${y}`, state);
  }
  drawSprite(startX, startY, spriteRows) {
    for (let r = 0; r < spriteRows.length; r++) {
      for (let c = 0; c < spriteRows[r].length; c++) {
        if (spriteRows[r][c] === '1') {
          this.setPixel(startX + c, startY + r, 1);
        }
      }
    }
  }
}

const mockLcd = new MockLcd();
StatusRenderer.renderStatusPage(mockLcd, { ageMinutes: 2880, weight: 12, discipline: 50, hunger: 3, happiness: 4 }, 0);
assert(mockLcd.buffer.size > 0);
StatusRenderer.renderStatusPage(mockLcd, { ageMinutes: 2880, weight: 12, discipline: 50, hunger: 3, happiness: 4 }, 1);
assert(mockLcd.buffer.size > 0);
StatusRenderer.renderStatusPage(mockLcd, { ageMinutes: 2880, weight: 12, discipline: 50, hunger: 3, happiness: 4 }, 2);
assert(mockLcd.buffer.size > 0);
StatusRenderer.renderStatusPage(mockLcd, { ageMinutes: 2880, weight: 12, discipline: 50, hunger: 3, happiness: 4, sitterModeActive: true }, 3);
assert(mockLcd.buffer.size > 0);
StatusRenderer.renderClock(mockLcd, new Date());
assert(mockLcd.buffer.size > 0);
console.log('✓ StatusRenderer verified.');

// 12. i18n Translations
console.log('Testing i18n Translations (en, es, zh, pt)...');
const { TRANSLATIONS } = await import('../constants/i18n.js');
const requiredLanguages = ['en', 'es', 'zh', 'pt'];
for (const lang of requiredLanguages) {
  assert(TRANSLATIONS[lang], `Missing language ${lang}`);
  assert(TRANSLATIONS[lang].title, `Missing title in ${lang}`);
  for (let i = 0; i < 8; i++) {
    assert(TRANSLATIONS[lang].icons[i], `Missing icon ${i} in ${lang}`);
  }
  assert(TRANSLATIONS[lang].settings.sitterHeader, `Missing settings.sitterHeader in ${lang}`);
  assert(TRANSLATIONS[lang].settings.sitterOn, `Missing settings.sitterOn in ${lang}`);
  assert(TRANSLATIONS[lang].settings.sitterOff, `Missing settings.sitterOff in ${lang}`);
  assert(TRANSLATIONS[lang].manual.title, `Missing manual.title in ${lang}`);
}
console.log('✓ i18n Translations verified.');

console.log('\nALL 12 TEST SUITES PASSED SUCCESSFULLY! 🎯');
