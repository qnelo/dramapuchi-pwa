import assert from 'node:assert';
import { STAGE_CONFIG, THRESHOLDS } from '../config/petConfig.js';
import { PetEngine } from '../engine/timeEngine.js';
import { EvolutionResolver } from '../engine/evolutionResolver.js';
import { SaveManager } from '../storage/SaveManager.js';
import { ICONS, UI_MODE } from '../constants/menu.js';
import { SPRITES, FONT_3X5 } from '../ui/sprites.js';
import { StatusRenderer } from '../ui/StatusRenderer.js';
import { MenuController } from '../controllers/MenuController.js';
import { MiniGameController } from '../controllers/MiniGameController.js';
import { HighLowGameController } from '../controllers/HighLowGameController.js';

console.log('--- RUNNING DRAMAPUCHI TEST SUITE ---');

// 1. Initial State (Gen 1 & Gen 2)
console.log('Testing Initial State...');
const state = SaveManager.getInitialState();
assert.strictEqual(state.stage, 'EGG');
assert.strictEqual(state.species, 'EGG');
assert.strictEqual(state.generation, 1);
assert.strictEqual(state.hunger, 0);
assert.strictEqual(state.happiness, 0);
assert.strictEqual(state.weight, 5);
assert.strictEqual(state.poopCount, 0);
assert.strictEqual(state.isSick, false);
assert.strictEqual(state.isSleeping, false);
assert.strictEqual(state.lightsOn, true);
assert.strictEqual(state.sitterModeActive, false);

const stateGen2 = SaveManager.getInitialState(2);
assert.strictEqual(stateGen2.stage, 'EGG');
assert.strictEqual(stateGen2.generation, 2);
console.log('✓ Initial State valid.');

// 2. Egg Hatching (Gen 1 & Gen 2)
console.log('Testing Egg Hatching...');
const bornTime = state.bornTimestamp;
PetEngine.reconcile(state, bornTime + 4 * 60 * 1000);
assert.strictEqual(state.stage, 'EGG');

PetEngine.reconcile(state, bornTime + 5 * 60 * 1000);
assert.strictEqual(state.stage, 'BABY');
assert.strictEqual(state.species, 'BABYPUCHI');
assert.strictEqual(state.hunger, 2);
assert.strictEqual(state.happiness, 2);
assert.strictEqual(state.weight, STAGE_CONFIG.BABY.baseWeight);

// Hatch Gen 2 Egg
const bornTimeG2 = stateGen2.bornTimestamp;
PetEngine.reconcile(stateGen2, bornTimeG2 + 5 * 60 * 1000);
assert.strictEqual(stateGen2.stage, 'BABY');
assert.strictEqual(stateGen2.species, 'SNOWPUCHI');
assert.strictEqual(stateGen2.hunger, 2);
assert.strictEqual(stateGen2.happiness, 2);
assert.strictEqual(stateGen2.weight, STAGE_CONFIG.BABY.baseWeight);
console.log('✓ Egg Hatching verified.');

// 3. Time Reconciliation & Degradation
console.log('Testing Degradation & Care...');
const babyBornTime = state.lastTickTimestamp;
// Simulate 15 minutes: baby hungerRateMin = 15, happyRateMin = 15
PetEngine.reconcile(state, babyBornTime + 15 * 60 * 1000);
assert.strictEqual(state.hunger, 1);
assert.strictEqual(state.happiness, 1);

// Another 15 min: hunger -> 0, happiness -> 0
PetEngine.reconcile(state, babyBornTime + 30 * 60 * 1000);
assert.strictEqual(state.hunger, 0);
assert.strictEqual(state.happiness, 0);
assert.strictEqual(state.isCalling, true);
console.log('✓ Degradation & Attention verified.');

// 4. Sitter Mode
console.log('Testing Sitter Mode (Puchi Sitter)...');
const sitterState = {
  ...SaveManager.getInitialState(),
  stage: 'CHILD',
  species: 'ROLLI',
  hunger: 4,
  happiness: 4,
  sitterModeActive: true,
  lastTickTimestamp: new Date('2026-10-25T08:00:00Z').getTime()
};
// 120 minutes during daytime (08:00 - 10:00) with sitter
PetEngine.reconcile(sitterState, sitterState.lastTickTimestamp + 120 * 60 * 1000);
// Child degradation rates are 45min hunger, 40min happiness, but sitter keeps them steady!
assert.strictEqual(sitterState.hunger, 4);
assert.strictEqual(sitterState.happiness, 4);
console.log('✓ Sitter Mode verified.');

// 5. Starvation Death Evaluation
console.log('Testing Starvation Death...');
const starvingPet = {
  ...SaveManager.getInitialState(),
  stage: 'BABY',
  species: 'BABYPUCHI',
  hunger: 0,
  happiness: 0,
  starvationMinutes: 0,
  lastTickTimestamp: new Date('2026-10-25T10:00:00').getTime()
};
// 360 minutes at 0 hunger while awake -> DEATH
PetEngine.reconcile(starvingPet, starvingPet.lastTickTimestamp + 360 * 60 * 1000);
assert.strictEqual(starvingPet.stage, 'DEAD');
assert.strictEqual(starvingPet.deathReason, 'STARVATION');
console.log('✓ Starvation Death verified.');

// 6. Sickness Death Evaluation
console.log('Testing Sickness Death...');
const sickPet = {
  ...SaveManager.getInitialState(),
  stage: 'BABY',
  species: 'BABYPUCHI',
  hunger: 4,
  happiness: 4,
  isSick: true,
  sickMinutes: 0,
  lastTickTimestamp: new Date('2026-10-25T10:00:00').getTime()
};
// 360 minutes sick without treatment -> DEATH
PetEngine.reconcile(sickPet, sickPet.lastTickTimestamp + 360 * 60 * 1000);
assert.strictEqual(sickPet.stage, 'DEAD');
assert.strictEqual(sickPet.deathReason, 'SICKNESS');
console.log('✓ Sickness Death verified.');

// 7. Evolution Tree Logic
console.log('Testing Evolution Tree Logic (Familia DramaPuchi)...');
// Test Baby -> Child (Rolli)
const mockStateChild = {
  stage: 'BABY',
  species: 'BABYPUCHI',
  ageMinutes: 65,
  weight: 5,
  careMistakes: 1
};
EvolutionResolver.checkAndEvolve(mockStateChild);
assert.strictEqual(mockStateChild.stage, 'CHILD');
assert.strictEqual(mockStateChild.species, 'ROLLI');
assert.strictEqual(mockStateChild.weight, 10);
assert.strictEqual(mockStateChild.careMistakes, 0);

// Test Child -> Teen (Chirpy with <= 2 mistakes)
const mockStateTeenGood = {
  stage: 'CHILD',
  species: 'ROLLI',
  ageMinutes: 65 + 1440 * 2,
  weight: 10,
  careMistakes: 1
};
EvolutionResolver.checkAndEvolve(mockStateTeenGood);
assert.strictEqual(mockStateTeenGood.stage, 'TEEN');
assert.strictEqual(mockStateTeenGood.species, 'CHIRPY');

// Test Child -> Teen (Pouty with > 2 mistakes)
const mockStateTeenBad = {
  stage: 'CHILD',
  species: 'ROLLI',
  ageMinutes: 65 + 1440 * 2,
  weight: 10,
  careMistakes: 3
};
EvolutionResolver.checkAndEvolve(mockStateTeenBad);
assert.strictEqual(mockStateTeenBad.stage, 'TEEN');
assert.strictEqual(mockStateTeenBad.species, 'POUTY');

// Test Teen -> Adult (Smarty: Chirpy, <= 1 mistake, >= 90 discipline)
const mockSmarty = {
  stage: 'TEEN',
  species: 'CHIRPY',
  ageMinutes: 65 + 1440 * 2 + 1440 * 3,
  weight: 20,
  careMistakes: 0,
  discipline: 100
};
EvolutionResolver.checkAndEvolve(mockSmarty);
assert.strictEqual(mockSmarty.stage, 'ADULT');
assert.strictEqual(mockSmarty.species, 'SMARTY');

// Test Teen -> Adult (Pingu: Chirpy, <= 3 mistakes, >= 75 discipline)
const mockPingu = {
  stage: 'TEEN',
  species: 'CHIRPY',
  ageMinutes: 65 + 1440 * 2 + 1440 * 3,
  weight: 20,
  careMistakes: 2,
  discipline: 80
};
EvolutionResolver.checkAndEvolve(mockPingu);
assert.strictEqual(mockPingu.stage, 'ADULT');
assert.strictEqual(mockPingu.species, 'PINGU');

// Test Teen -> Adult (Shadow: Chirpy, fails Smarty & Pingu)
const mockShadow = {
  stage: 'TEEN',
  species: 'CHIRPY',
  ageMinutes: 65 + 1440 * 2 + 1440 * 3,
  weight: 20,
  careMistakes: 4,
  discipline: 50
};
EvolutionResolver.checkAndEvolve(mockShadow);
assert.strictEqual(mockShadow.stage, 'ADULT');
assert.strictEqual(mockShadow.species, 'SHADOW');

// Test Teen -> Adult (Chompy: Pouty, <= 4 mistakes, >= 50 disc)
const mockChompy = {
  stage: 'TEEN',
  species: 'POUTY',
  ageMinutes: 65 + 1440 * 2 + 1440 * 3,
  weight: 20,
  careMistakes: 3,
  discipline: 60
};
EvolutionResolver.checkAndEvolve(mockChompy);
assert.strictEqual(mockChompy.stage, 'ADULT');
assert.strictEqual(mockChompy.species, 'CHOMPY');

// Test Teen -> Adult (Noodle: Pouty, <= 6 mistakes)
const mockNoodle = {
  stage: 'TEEN',
  species: 'POUTY',
  ageMinutes: 65 + 1440 * 2 + 1440 * 3,
  weight: 20,
  careMistakes: 5,
  discipline: 40
};
EvolutionResolver.checkAndEvolve(mockNoodle);
assert.strictEqual(mockNoodle.stage, 'ADULT');
assert.strictEqual(mockNoodle.species, 'NOODLE');

// Test Teen -> Adult (Divalips: Pouty, > 6 mistakes)
const mockDivalips = {
  stage: 'TEEN',
  species: 'POUTY',
  ageMinutes: 65 + 1440 * 2 + 1440 * 3,
  weight: 20,
  careMistakes: 7,
  discipline: 20
};
EvolutionResolver.checkAndEvolve(mockDivalips);
assert.strictEqual(mockDivalips.stage, 'ADULT');
assert.strictEqual(mockDivalips.species, 'DIVALIPS');

// Test Adult -> Departed (Smarty unlocks Gen 2)
SaveManager.setGen2Unlocked(false);
const mockDeparted = {
  stage: 'ADULT',
  species: 'SMARTY',
  ageMinutes: 65 + 1440 * 2 + 1440 * 3 + 1440 * 14,
  weight: 30,
  careMistakes: 0,
  discipline: 100
};
EvolutionResolver.checkAndEvolve(mockDeparted);
assert.strictEqual(mockDeparted.stage, 'DEPARTED');
assert.strictEqual(mockDeparted.gen2Unlocked, true);
assert.strictEqual(SaveManager.isGen2Unlocked(), true);

// Test Adult -> Departed (Chompy does NOT unlock Gen 2)
SaveManager.setGen2Unlocked(false);
const mockPoorDeparted = {
  stage: 'ADULT',
  species: 'CHOMPY',
  ageMinutes: 65 + 1440 * 2 + 1440 * 3 + 1440 * 14,
  weight: 30,
  careMistakes: 0,
  discipline: 60
};
EvolutionResolver.checkAndEvolve(mockPoorDeparted);
assert.strictEqual(mockPoorDeparted.stage, 'DEPARTED');
assert.strictEqual(Boolean(mockPoorDeparted.gen2Unlocked), false);
assert.strictEqual(SaveManager.isGen2Unlocked(), false);

// Test Gen 1 Secret Evolution: Shadow -> Oldy (100% discipline)
const mockOldy = {
  stage: 'ADULT',
  species: 'SHADOW',
  ageMinutes: 65 + 1440 * 2 + 1440 * 3 + 1440 * 5,
  adultCareMistakes: 0,
  discipline: 100
};
EvolutionResolver.checkAndEvolve(mockOldy);
assert.strictEqual(mockOldy.species, 'OLDY');

// Test Gen 2 Evolution Tree
console.log('Testing Generation 2 Evolution Tree...');
// Snowpuchi -> Curly (Child)
const mockG2Baby = {
  stage: 'BABY',
  species: 'SNOWPUCHI',
  generation: 2,
  ageMinutes: 65,
  weight: 5
};
EvolutionResolver.checkAndEvolve(mockG2Baby);
assert.strictEqual(mockG2Baby.stage, 'CHILD');
assert.strictEqual(mockG2Baby.species, 'CURLY');

// Curly -> Spiky (<= 2 mistakes)
const mockG2Spiky = {
  stage: 'CHILD',
  species: 'CURLY',
  generation: 2,
  ageMinutes: 65 + 1440 * 2,
  careMistakes: 1
};
EvolutionResolver.checkAndEvolve(mockG2Spiky);
assert.strictEqual(mockG2Spiky.stage, 'TEEN');
assert.strictEqual(mockG2Spiky.species, 'SPIKY');

// Curly -> Ducky (>= 3 mistakes)
const mockG2Ducky = {
  stage: 'CHILD',
  species: 'CURLY',
  generation: 2,
  ageMinutes: 65 + 1440 * 2,
  careMistakes: 3
};
EvolutionResolver.checkAndEvolve(mockG2Ducky);
assert.strictEqual(mockG2Ducky.stage, 'TEEN');
assert.strictEqual(mockG2Ducky.species, 'DUCKY');

// Spiky -> Bunny (<= 1 mistake, >= 90 disc)
const mockG2Bunny = {
  stage: 'TEEN',
  species: 'SPIKY',
  generation: 2,
  ageMinutes: 65 + 1440 * 5,
  careMistakes: 0,
  discipline: 95
};
EvolutionResolver.checkAndEvolve(mockG2Bunny);
assert.strictEqual(mockG2Bunny.stage, 'ADULT');
assert.strictEqual(mockG2Bunny.species, 'BUNNY');

// Spiky -> Barky (<= 3 mistakes, >= 75 disc)
const mockG2Barky = {
  stage: 'TEEN',
  species: 'SPIKY',
  generation: 2,
  ageMinutes: 65 + 1440 * 5,
  careMistakes: 2,
  discipline: 80
};
EvolutionResolver.checkAndEvolve(mockG2Barky);
assert.strictEqual(mockG2Barky.stage, 'ADULT');
assert.strictEqual(mockG2Barky.species, 'BARKY');

// Spiky -> Beaky (4+ mistakes or < 75 disc)
const mockG2Beaky = {
  stage: 'TEEN',
  species: 'SPIKY',
  generation: 2,
  ageMinutes: 65 + 1440 * 5,
  careMistakes: 4,
  discipline: 50
};
EvolutionResolver.checkAndEvolve(mockG2Beaky);
assert.strictEqual(mockG2Beaky.stage, 'ADULT');
assert.strictEqual(mockG2Beaky.species, 'BEAKY');

// Beaky -> Kitty (Gen 2 Secret evolution: 100% discipline)
const mockG2Kitty = {
  stage: 'ADULT',
  species: 'BEAKY',
  generation: 2,
  ageMinutes: 65 + 1440 * 5 + 1440 * 5,
  adultCareMistakes: 0,
  discipline: 100
};
EvolutionResolver.checkAndEvolve(mockG2Kitty);
assert.strictEqual(mockG2Kitty.species, 'KITTY');

// Ducky -> Leggy (<= 4 mistakes, >= 50 disc)
const mockG2Leggy = {
  stage: 'TEEN',
  species: 'DUCKY',
  generation: 2,
  ageMinutes: 65 + 1440 * 5,
  careMistakes: 3,
  discipline: 60
};
EvolutionResolver.checkAndEvolve(mockG2Leggy);
assert.strictEqual(mockG2Leggy.stage, 'ADULT');
assert.strictEqual(mockG2Leggy.species, 'LEGGY');

// Ducky -> Octo (<= 6 mistakes)
const mockG2Octo = {
  stage: 'TEEN',
  species: 'DUCKY',
  generation: 2,
  ageMinutes: 65 + 1440 * 5,
  careMistakes: 6,
  discipline: 30
};
EvolutionResolver.checkAndEvolve(mockG2Octo);
assert.strictEqual(mockG2Octo.stage, 'ADULT');
assert.strictEqual(mockG2Octo.species, 'OCTO');

// Ducky -> Flora (>= 7 mistakes)
const mockG2Flora = {
  stage: 'TEEN',
  species: 'DUCKY',
  generation: 2,
  ageMinutes: 65 + 1440 * 5,
  careMistakes: 8,
  discipline: 10
};
EvolutionResolver.checkAndEvolve(mockG2Flora);
assert.strictEqual(mockG2Flora.stage, 'ADULT');
assert.strictEqual(mockG2Flora.species, 'FLORA');

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

// Test Gen 2 Feeding & Snack Penalties
const g2Pet = {
  stage: 'CHILD',
  species: 'CURLY',
  generation: 2,
  hunger: 1,
  happiness: 1,
  weight: 10,
  discipline: 0,
  poopCount: 0,
  isSick: false,
  isSleeping: false,
  lightsOn: true,
  isCalling: false,
  sitterModeActive: false
};
const g2Menu = new MenuController(g2Pet, mockAudio, () => {});
g2Menu.instantAnimation = true;
// Meal (Burger) -> +1 hunger, +1 weight
g2Menu.feedPet(false);
assert.strictEqual(g2Pet.hunger, 2);
assert.strictEqual(g2Pet.weight, 11);

// Snack (Cake) -> +1 happiness, +2 weight (Gen 2 penalty)
g2Menu.feedPet(true);
assert.strictEqual(g2Pet.happiness, 2);
assert.strictEqual(g2Pet.weight, 13);

// Snack abuse penalty: feeding >= 4 snacks consecutively -> toothache/sickness
g2Menu.feedPet(true);
g2Menu.feedPet(true);
g2Menu.feedPet(true);
assert.strictEqual(g2Pet.isSick, true);

console.log('✓ MenuController verified.');

// 9. MiniGameController (Gen 1 Heading Prediction)
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

// 9b. HighLowGameController (Gen 2 Number Prediction)
console.log('Testing HighLowGameController...');
let hlFinished = false;
const hlPet = { stage: 'BABY', weight: 10, happiness: 1, generation: 2 };
const hlGame = new HighLowGameController(hlPet, mockAudio, () => {}, () => { hlFinished = true; });
hlGame.start();
assert.strictEqual(hlGame.getState().round, 1);
assert.strictEqual(hlGame.getState().wins, 0);
assert(hlGame.getState().currentNumber >= 1 && hlGame.getState().currentNumber <= 9);

hlGame.wins = 3; // Simulate 3 wins in 5 rounds
hlGame.finishGame();
assert.strictEqual(hlPet.happiness, 2); // Happiness increases by 1
assert.strictEqual(hlPet.weight, 9);    // Weight decreases by 1 lb
console.log('✓ HighLowGameController verified.');

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

// Gen 2 Sprites verification
assert(SPRITES.SNOWPUCHI_IDLE, 'Missing SNOWPUCHI_IDLE');
assert(SPRITES.CURLY_IDLE, 'Missing CURLY_IDLE');
assert(SPRITES.SPIKY_IDLE, 'Missing SPIKY_IDLE');
assert(SPRITES.BUNNY_IDLE, 'Missing BUNNY_IDLE');
assert(SPRITES.BARKY_IDLE, 'Missing BARKY_IDLE');
assert(SPRITES.BEAKY_IDLE, 'Missing BEAKY_IDLE');
assert(SPRITES.KITTY_IDLE, 'Missing KITTY_IDLE');
assert(SPRITES.DUCKY_IDLE, 'Missing DUCKY_IDLE');
assert(SPRITES.LEGGY_IDLE, 'Missing LEGGY_IDLE');
assert(SPRITES.OCTO_IDLE, 'Missing OCTO_IDLE');
assert(SPRITES.FLORA_IDLE, 'Missing FLORA_IDLE');
assert(SPRITES.OLDY_IDLE, 'Missing OLDY_IDLE');
assert(SPRITES.BURGER, 'Missing BURGER');
assert(SPRITES.SHORTCAKE, 'Missing SHORTCAKE');
assert(SPRITES.UFO_BEAM, 'Missing UFO_BEAM');
assert(SPRITES.EGG_GEN2_IDLE, 'Missing EGG_GEN2_IDLE');
assert(SPRITES.EGG_GEN2_WIGGLE, 'Missing EGG_GEN2_WIGGLE');

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
console.log('Testing i18n Translations (14 languages)...');
const { TRANSLATIONS, detectLanguage } = await import('../constants/i18n.js');
const requiredLanguages = ['en', 'es', 'zh', 'pt', 'ja', 'de', 'fr', 'it', 'ru', 'ar', 'hi', 'bn', 'id', 'th'];
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
  for (const s of ['baby', 'child', 'teen', 'adult']) assert(TRANSLATIONS[lang].manual.stages[s], `Missing manual.stages.${s} in ${lang}`);
  assert(TRANSLATIONS[lang].manual.installHeader, `Missing manual.installHeader in ${lang}`);
  assert(TRANSLATIONS[lang].manual.installAndroid, `Missing manual.installAndroid in ${lang}`);
  assert(TRANSLATIONS[lang].manual.installIos, `Missing manual.installIos in ${lang}`);
  assert(TRANSLATIONS[lang].manual.evolutionHeader, `Missing manual.evolutionHeader in ${lang}`);
  assert(TRANSLATIONS[lang].manual.evolutionDesc, `Missing manual.evolutionDesc in ${lang}`);
  assert(TRANSLATIONS[lang].manual.evoEarlyTitle, `Missing manual.evoEarlyTitle in ${lang}`);
  assert(TRANSLATIONS[lang].manual.evoBabyDesc, `Missing manual.evoBabyDesc in ${lang}`);
  assert(TRANSLATIONS[lang].manual.evoChildDesc, `Missing manual.evoChildDesc in ${lang}`);
  assert(TRANSLATIONS[lang].manual.evoBranchATitle, `Missing manual.evoBranchATitle in ${lang}`);
  assert(TRANSLATIONS[lang].manual.evoTamatchiDesc, `Missing manual.evoTamatchiDesc in ${lang}`);
  assert(TRANSLATIONS[lang].manual.evoMametchiDesc, `Missing manual.evoMametchiDesc in ${lang}`);
  assert(TRANSLATIONS[lang].manual.evoGinjirotchiDesc, `Missing manual.evoGinjirotchiDesc in ${lang}`);
  assert(TRANSLATIONS[lang].manual.evoMaskutchiDesc, `Missing manual.evoMaskutchiDesc in ${lang}`);
  assert(TRANSLATIONS[lang].manual.evoBranchBTitle, `Missing manual.evoBranchBTitle in ${lang}`);
  assert(TRANSLATIONS[lang].manual.evoKuchitamatchiDesc, `Missing manual.evoKuchitamatchiDesc in ${lang}`);
  assert(TRANSLATIONS[lang].manual.evoKuchipatchiDesc, `Missing manual.evoKuchipatchiDesc in ${lang}`);
  assert(TRANSLATIONS[lang].manual.evoNyorotchiDesc, `Missing manual.evoNyorotchiDesc in ${lang}`);
  assert(TRANSLATIONS[lang].manual.evoTarakotchiDesc, `Missing manual.evoTarakotchiDesc in ${lang}`);
  assert(TRANSLATIONS[lang].manual.evoChirpyDesc, `Missing manual.evoChirpyDesc in ${lang}`);
  assert(TRANSLATIONS[lang].manual.evoPoutyDesc, `Missing manual.evoPoutyDesc in ${lang}`);
  assert(TRANSLATIONS[lang].manual.evoSmartyDesc, `Missing manual.evoSmartyDesc in ${lang}`);
  assert(TRANSLATIONS[lang].manual.evoPinguDesc, `Missing manual.evoPinguDesc in ${lang}`);
  assert(TRANSLATIONS[lang].manual.evoShadowDesc, `Missing manual.evoShadowDesc in ${lang}`);
  assert(TRANSLATIONS[lang].manual.evoChompyDesc, `Missing manual.evoChompyDesc in ${lang}`);
  assert(TRANSLATIONS[lang].manual.evoNoodleDesc, `Missing manual.evoNoodleDesc in ${lang}`);
  assert(TRANSLATIONS[lang].manual.evoDivalipsDesc, `Missing manual.evoDivalipsDesc in ${lang}`);
  assert(TRANSLATIONS[lang].manual.evoDepartureTitle, `Missing manual.evoDepartureTitle in ${lang}`);
  assert(TRANSLATIONS[lang].manual.evoDepartedName, `Missing manual.evoDepartedName in ${lang}`);
  assert(TRANSLATIONS[lang].manual.evoDepartedDesc, `Missing manual.evoDepartedDesc in ${lang}`);
  assert(TRANSLATIONS[lang].manual.tabGen1, `Missing manual.tabGen1 in ${lang}`);
  assert(TRANSLATIONS[lang].manual.tabGen2, `Missing manual.tabGen2 in ${lang}`);
  assert(TRANSLATIONS[lang].manual.evoOldyDesc, `Missing manual.evoOldyDesc in ${lang}`);
  assert(TRANSLATIONS[lang].manual.gen2UnlockNote, `Missing manual.gen2UnlockNote in ${lang}`);
  assert(TRANSLATIONS[lang].manual.gen2FeaturesTitle, `Missing manual.gen2FeaturesTitle in ${lang}`);
  assert(TRANSLATIONS[lang].manual.gen2FoodDesc, `Missing manual.gen2FoodDesc in ${lang}`);
  assert(TRANSLATIONS[lang].manual.gen2GameDesc, `Missing manual.gen2GameDesc in ${lang}`);
  assert(TRANSLATIONS[lang].manual.gen2EvoTitle, `Missing manual.gen2EvoTitle in ${lang}`);
  assert(TRANSLATIONS[lang].manual.gen2EarlyTitle, `Missing manual.gen2EarlyTitle in ${lang}`);
  assert(TRANSLATIONS[lang].manual.evoSnowpuchiDesc, `Missing manual.evoSnowpuchiDesc in ${lang}`);
  assert(TRANSLATIONS[lang].manual.evoCurlyDesc, `Missing manual.evoCurlyDesc in ${lang}`);
  assert(TRANSLATIONS[lang].manual.gen2BranchATitle, `Missing manual.gen2BranchATitle in ${lang}`);
  assert(TRANSLATIONS[lang].manual.evoSpikyDesc, `Missing manual.evoSpikyDesc in ${lang}`);
  assert(TRANSLATIONS[lang].manual.evoBunnyDesc, `Missing manual.evoBunnyDesc in ${lang}`);
  assert(TRANSLATIONS[lang].manual.evoBarkyDesc, `Missing manual.evoBarkyDesc in ${lang}`);
  assert(TRANSLATIONS[lang].manual.evoBeakyDesc, `Missing manual.evoBeakyDesc in ${lang}`);
  assert(TRANSLATIONS[lang].manual.evoKittyDesc, `Missing manual.evoKittyDesc in ${lang}`);
  assert(TRANSLATIONS[lang].manual.gen2BranchBTitle, `Missing manual.gen2BranchBTitle in ${lang}`);
  assert(TRANSLATIONS[lang].manual.evoDuckyDesc, `Missing manual.evoDuckyDesc in ${lang}`);
  assert(TRANSLATIONS[lang].manual.evoLeggyDesc, `Missing manual.evoLeggyDesc in ${lang}`);
  assert(TRANSLATIONS[lang].manual.evoOctoDesc, `Missing manual.evoOctoDesc in ${lang}`);
  assert(TRANSLATIONS[lang].manual.evoFloraDesc, `Missing manual.evoFloraDesc in ${lang}`);
  assert(TRANSLATIONS[lang].manual.gen2DepartureTitle, `Missing manual.gen2DepartureTitle in ${lang}`);
  assert(TRANSLATIONS[lang].manual.gen2DepartedDesc, `Missing manual.gen2DepartedDesc in ${lang}`);
  assert(TRANSLATIONS[lang].dialogs.hatchTitle, `Missing dialogs.hatchTitle in ${lang}`);
  assert(TRANSLATIONS[lang].dialogs.hatchPrompt, `Missing dialogs.hatchPrompt in ${lang}`);
  assert(TRANSLATIONS[lang].dialogs.hatchGen1, `Missing dialogs.hatchGen1 in ${lang}`);
  assert(TRANSLATIONS[lang].dialogs.hatchGen2, `Missing dialogs.hatchGen2 in ${lang}`);
  assert(TRANSLATIONS[lang].manual.creditsHeader, `Missing manual.creditsHeader in ${lang}`);
  assert(TRANSLATIONS[lang].manual.creditsAuthorLabel, `Missing manual.creditsAuthorLabel in ${lang}`);
  assert(TRANSLATIONS[lang].manual.creditsRepoLabel, `Missing manual.creditsRepoLabel in ${lang}`);
  assert(TRANSLATIONS[lang].update.available, `Missing update.available in ${lang}`);
  assert(TRANSLATIONS[lang].update.action, `Missing update.action in ${lang}`);
  assert(TRANSLATIONS[lang].update.updating, `Missing update.updating in ${lang}`);
  assert(TRANSLATIONS[lang].topControls.support, `Missing topControls.support in ${lang}`);
  assert(TRANSLATIONS[lang].support?.title, `Missing support.title in ${lang}`);
  assert(TRANSLATIONS[lang].support?.cta, `Missing support.cta in ${lang}`);
  assert(TRANSLATIONS[lang].support?.tierSnack, `Missing support.tierSnack in ${lang}`);
  assert(TRANSLATIONS[lang].support?.tierMeal, `Missing support.tierMeal in ${lang}`);
  assert(TRANSLATIONS[lang].support?.tierClean, `Missing support.tierClean in ${lang}`);
  assert(TRANSLATIONS[lang].support?.tierGame, `Missing support.tierGame in ${lang}`);
  assert(TRANSLATIONS[lang].support?.tierMedicine, `Missing support.tierMedicine in ${lang}`);
  assert(TRANSLATIONS[lang].support?.perkTitle, `Missing support.perkTitle in ${lang}`);
  assert(TRANSLATIONS[lang].support?.perkUnlocked, `Missing support.perkUnlocked in ${lang}`);
  assert(TRANSLATIONS[lang].support?.donorCodeLabel, `Missing support.donorCodeLabel in ${lang}`);
  assert(TRANSLATIONS[lang].support?.copyCode, `Missing support.copyCode in ${lang}`);
  assert(TRANSLATIONS[lang].support?.copied, `Missing support.copied in ${lang}`);
  assert(TRANSLATIONS[lang].support?.codeHint, `Missing support.codeHint in ${lang}`);
  assert(TRANSLATIONS[lang].support?.checkStatusBtn, `Missing support.checkStatusBtn in ${lang}`);
  assert(TRANSLATIONS[lang].support?.receiptCollapsible, `Missing support.receiptCollapsible in ${lang}`);
  assert(TRANSLATIONS[lang].support?.receiptPlaceholder, `Missing support.receiptPlaceholder in ${lang}`);
  assert(TRANSLATIONS[lang].support?.redeemBtn, `Missing support.redeemBtn in ${lang}`);
  assert(TRANSLATIONS[lang].support?.verifying, `Missing support.verifying in ${lang}`);
  assert(TRANSLATIONS[lang].support?.verifySuccess, `Missing support.verifySuccess in ${lang}`);
  assert(TRANSLATIONS[lang].support?.verifyNotFound, `Missing support.verifyNotFound in ${lang}`);
  assert(TRANSLATIONS[lang].support?.alreadyClaimed, `Missing support.alreadyClaimed in ${lang}`);
}
// Auto-detection: no saved choice -> first supported entry of the browser's preference list, else 'en'
const stubNav = (languages) => Object.defineProperty(globalThis, 'navigator', { value: { languages, language: languages[0] }, configurable: true, writable: true });
Object.defineProperty(globalThis, 'localStorage', { value: { getItem: () => null }, configurable: true, writable: true });
stubNav(['ca-ES', 'th-TH']);
assert(detectLanguage() === 'th', 'detectLanguage should skip unsupported languages and pick the next supported one');
stubNav(['pt-BR']);
assert(detectLanguage() === 'pt', 'detectLanguage should map regional variants to the base language');
stubNav(['xx']);
assert(detectLanguage() === 'en', 'detectLanguage should fall back to en');
globalThis.localStorage.getItem = () => 'ja';
assert(detectLanguage() === 'ja', 'detectLanguage should honor the saved choice');
console.log('✓ i18n Translations verified.');

// 14. Trademark Zero-Leak Audit
console.log('Testing Trademark Zero-Leak Audit...');
const allJson = JSON.stringify(TRANSLATIONS).toLowerCase();
assert(!allJson.includes('tamagotchi'), 'Zero-leak failure: found "tamagotchi" in translations');
assert(!allJson.includes('たまごっち'), 'Zero-leak failure: found Japanese tamagotchi in translations');
assert(!allJson.includes('拓麻歌子'), 'Zero-leak failure: found Chinese tamagotchi in translations');
assert(!allJson.includes('тамагочи'), 'Zero-leak failure: found Russian tamagotchi in translations');
assert(!allJson.includes('ทามาก็อต'), 'Zero-leak failure: found Thai tamagotchi in translations');
assert(!allJson.includes('تاماغوتشي'), 'Zero-leak failure: found Arabic tamagotchi in translations');
assert(!allJson.includes('तामागोची'), 'Zero-leak failure: found Hindi tamagotchi in translations');
assert(!allJson.includes('তামাগোচি'), 'Zero-leak failure: found Bengali tamagotchi in translations');
console.log('✓ Trademark Zero-Leak Audit verified (0 occurrences).');

// 15. CloudSyncManager
console.log('Testing CloudSyncManager...');
const { CloudSyncManager } = await import('../storage/CloudSyncManager.js');

// isFreshEgg
const freshEgg = { stage: 'EGG', ageMinutes: 0, hunger: 0, happiness: 0 };
assert(CloudSyncManager.isFreshEgg(freshEgg) === true, 'Brand-new egg must be detected as fresh egg');
assert(CloudSyncManager.isFreshEgg(null) === true, 'Null state should be considered fresh egg');

const evolvedPet = { stage: 'BABY', ageMinutes: 5, hunger: 2, happiness: 2 };
assert(CloudSyncManager.isFreshEgg(evolvedPet) === false, 'Baby pet must NOT be detected as fresh egg');

const eggWithAge = { stage: 'EGG', ageMinutes: 3, hunger: 0, happiness: 0 };
assert(CloudSyncManager.isFreshEgg(eggWithAge) === false, 'Egg with ageMinutes > 0 must NOT be fresh egg');

// JWT decode test
const fakePayload = { sub: 'google-12345', email: 'test@example.com', name: 'Test User' };
const b64Payload = Buffer.from(JSON.stringify(fakePayload)).toString('base64url');
const fakeJwt = `eyJhbGciOiJSUzI1NiJ9.${b64Payload}.signature`;
const decoded = CloudSyncManager.decodeJwtPayload(fakeJwt);
assert(decoded.sub === 'google-12345', 'Decoded sub must match');
assert(decoded.email === 'test@example.com', 'Decoded email must match');

// Donor Code Generation test
const mockStore = {};
globalThis.localStorage = {
  getItem: (k) => mockStore[k] || null,
  setItem: (k, v) => { mockStore[k] = String(v); },
  removeItem: (k) => { delete mockStore[k]; }
};
const donorCode1 = CloudSyncManager.getOrGenerateDonorCode();
assert(/^#DP-[2-9A-HJ-NP-Z]{4}$/.test(donorCode1), `Donor code format invalid: ${donorCode1}`);
const donorCode2 = CloudSyncManager.getOrGenerateDonorCode();
assert(donorCode1 === donorCode2, 'Donor code must be persistent across calls for the same session');

// Webhook donor code regex extraction test
const regex = /#DP-[A-Za-z0-9]{4,8}\b/i;
const sampleMsg = "Loved the retro pet! My code is #dp-9k8b, unlock gen 2!";
const match = sampleMsg.match(regex);
assert(match && match[0].toUpperCase() === '#DP-9K8B', 'Donor code regex must extract #DP-XXXX correctly');

console.log('✓ CloudSyncManager verified.');

console.log('\nALL 15 TEST SUITES PASSED SUCCESSFULLY! 🎯');
