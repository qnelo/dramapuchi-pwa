export const STAGE_CONFIG = {
  EGG: {
    durationMin: 5,
    sleepStart: null,
    sleepEnd: null,
    hungerRateMin: Infinity,
    happyRateMin: Infinity,
    poopRateMin: Infinity,
    baseWeight: 5
  },
  BABY: {
    durationMin: 65, // ~1 hour and 5 minutes
    sleepStart: null, // Awake in emulation
    sleepEnd: null,
    hungerRateMin: 15,
    happyRateMin: 15,
    poopRateMin: 25,
    baseWeight: 5
  },
  CHILD: {
    durationMin: 1440 * 2, // 2 days
    sleepStart: 20, // 20:00 (8:00 PM)
    sleepEnd: 9,    // 09:00 (9:00 AM)
    hungerRateMin: 45,
    happyRateMin: 40,
    poopRateMin: 90,
    baseWeight: 10
  },
  TEEN: {
    durationMin: 1440 * 3, // 3 days
    sleepStart: 21, // 21:00 (9:00 PM)
    sleepEnd: 9,    // 09:00 (9:00 AM)
    hungerRateMin: 60,
    happyRateMin: 50,
    poopRateMin: 120,
    baseWeight: 20
  },
  ADULT: {
    durationMin: 1440 * 14, // Base adult span
    sleepStart: 22,
    sleepEnd: 9,
    hungerRateMin: 75,
    happyRateMin: 65,
    poopRateMin: 180,
    baseWeight: 30
  }
};

export const SPECIES_CONFIG = {
  // Generation 1
  BABYPUCHI: { gen: 1, stage: 'BABY', sleepStart: null, sleepEnd: null, maxDays: 0 },
  BABYTCHI: { gen: 1, stage: 'BABY', sleepStart: null, sleepEnd: null, maxDays: 0 },
  ROLLI: { gen: 1, stage: 'CHILD', sleepStart: 20, sleepEnd: 9, maxDays: 2 },
  MARUTCHI: { gen: 1, stage: 'CHILD', sleepStart: 20, sleepEnd: 9, maxDays: 2 },
  CHIRPY: { gen: 1, stage: 'TEEN', sleepStart: 21, sleepEnd: 9, maxDays: 3 },
  TAMATCHI: { gen: 1, stage: 'TEEN', sleepStart: 21, sleepEnd: 9, maxDays: 3 },
  POUTY: { gen: 1, stage: 'TEEN', sleepStart: 21, sleepEnd: 9, maxDays: 3 },
  KUCHITAMATCHI: { gen: 1, stage: 'TEEN', sleepStart: 21, sleepEnd: 9, maxDays: 3 },
  SMARTY: { gen: 1, stage: 'ADULT', sleepStart: 22, sleepEnd: 9, maxDays: 25 },
  MAMETCHI: { gen: 1, stage: 'ADULT', sleepStart: 22, sleepEnd: 9, maxDays: 25 },
  PINGU: { gen: 1, stage: 'ADULT', sleepStart: 22, sleepEnd: 9, maxDays: 23 },
  GINJIROTCHI: { gen: 1, stage: 'ADULT', sleepStart: 22, sleepEnd: 9, maxDays: 23 },
  SHADOW: { gen: 1, stage: 'ADULT', sleepStart: 23, sleepEnd: 11, maxDays: 18 },
  MASKUTCHI: { gen: 1, stage: 'ADULT', sleepStart: 23, sleepEnd: 11, maxDays: 18 },
  CHOMPY: { gen: 1, stage: 'ADULT', sleepStart: 21, sleepEnd: 9, maxDays: 17 },
  KUCHIPATCHI: { gen: 1, stage: 'ADULT', sleepStart: 21, sleepEnd: 9, maxDays: 17 },
  NOODLE: { gen: 1, stage: 'ADULT', sleepStart: 21, sleepEnd: 9, maxDays: 14 },
  NYOROTCHI: { gen: 1, stage: 'ADULT', sleepStart: 21, sleepEnd: 9, maxDays: 14 },
  DIVALIPS: { gen: 1, stage: 'ADULT', sleepStart: 21, sleepEnd: 9, maxDays: 12 },
  TARAKOTCHI: { gen: 1, stage: 'ADULT', sleepStart: 21, sleepEnd: 9, maxDays: 12 },
  OLDY: { gen: 1, stage: 'ADULT', sleepStart: 22, sleepEnd: 9, maxDays: 30 },
  OYAJITCHI: { gen: 1, stage: 'ADULT', sleepStart: 22, sleepEnd: 9, maxDays: 30 },

  // Generation 2
  SNOWPUCHI: { gen: 2, stage: 'BABY', sleepStart: null, sleepEnd: null, maxDays: 0 },
  CURLY: { gen: 2, stage: 'CHILD', sleepStart: 20, sleepEnd: 9, maxDays: 2 },
  SPIKY: { gen: 2, stage: 'TEEN', sleepStart: 21, sleepEnd: 9, maxDays: 3 },
  DUCKY: { gen: 2, stage: 'TEEN', sleepStart: 21, sleepEnd: 9, maxDays: 3 },
  BUNNY: { gen: 2, stage: 'ADULT', sleepStart: 22, sleepEnd: 9, maxDays: 25 },
  BARKY: { gen: 2, stage: 'ADULT', sleepStart: 21, sleepEnd: 8, maxDays: 23 },
  BEAKY: { gen: 2, stage: 'ADULT', sleepStart: 23, sleepEnd: 11, maxDays: 18 },
  LEGGY: { gen: 2, stage: 'ADULT', sleepStart: 22, sleepEnd: 9, maxDays: 17 },
  OCTO: { gen: 2, stage: 'ADULT', sleepStart: 22, sleepEnd: 9, maxDays: 15 },
  FLORA: { gen: 2, stage: 'ADULT', sleepStart: 21, sleepEnd: 9, maxDays: 12 },
  KITTY: { gen: 2, stage: 'ADULT', sleepStart: 22, sleepEnd: 9, maxDays: 30 }
};

export const FOOD_CONFIG = {
  1: {
    mealName: 'MEAL',
    snackName: 'SNACK',
    mealSprite: 'MEAT',
    snackSprite: 'CANDY',
    snackLimitBeforeSick: 5
  },
  2: {
    mealName: 'BURGER',
    snackName: 'CAKE',
    mealSprite: 'BURGER',
    snackSprite: 'SHORTCAKE',
    snackLimitBeforeSick: 4
  }
};

export const THRESHOLDS = {
  MAX_STARVATION_MIN: 360,    // 6 hours at 0 hunger = death
  MAX_SICK_MIN: 360,          // 6 hours sick without cure = death
  CARE_MISTAKE_WAIT_MIN: 15,  // 15 min unaddressed call = +1 Care Mistake
  MAX_POOP: 4,
  SENESCENCE_START_DAYS: 15,  // Day 15 as adult triggers accelerated decay & medicine resistance
  TICK_SIZE_MS: 60 * 1000     // 1 minute per tick
};
