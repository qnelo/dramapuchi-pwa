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
    sleepStart: null, // Takes a brief nap in canon, simplified to waking state
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
    durationMin: 1440 * 14, // Up to 14 additional days
    sleepStart: 22, // 22:00 (10:00 PM)
    sleepEnd: 8,    // 08:00 (8:00 AM)
    hungerRateMin: 75,
    happyRateMin: 65,
    poopRateMin: 180,
    baseWeight: 30
  }
};

export const THRESHOLDS = {
  MAX_STARVATION_MIN: 360, // 6 hours at 0 hunger = death
  MAX_SICK_MIN: 360,       // 6 hours sick without cure = death
  CARE_MISTAKE_WAIT_MIN: 15, // 15 min ignoring alert call = +1 Care Mistake
  MAX_POOP: 4,
  TICK_SIZE_MS: 60 * 1000  // Simulator resolution: 1 minute per tick
};
