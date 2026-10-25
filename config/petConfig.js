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
    durationMin: 65, // ~1 hora y 5 min
    sleepStart: null, // Solo toma una siesta corta, simplificado a vigilia
    sleepEnd: null,
    hungerRateMin: 15,
    happyRateMin: 15,
    poopRateMin: 25,
    baseWeight: 5
  },
  CHILD: {
    durationMin: 1440 * 2, // 2 días
    sleepStart: 20, // 20:00
    sleepEnd: 9,    // 09:00
    hungerRateMin: 45,
    happyRateMin: 40,
    poopRateMin: 90,
    baseWeight: 10
  },
  TEEN: {
    durationMin: 1440 * 3, // 3 días
    sleepStart: 21,
    sleepEnd: 9,
    hungerRateMin: 60,
    happyRateMin: 50,
    poopRateMin: 120,
    baseWeight: 20
  },
  ADULT: {
    durationMin: 1440 * 14, // Hasta 14 días adicionales
    sleepStart: 22,
    sleepEnd: 8,
    hungerRateMin: 75,
    happyRateMin: 65,
    poopRateMin: 180,
    baseWeight: 30
  }
};

export const THRESHOLDS = {
  MAX_STARVATION_MIN: 360, // 6 horas con hambre en 0 = muerte
  MAX_SICK_MIN: 360,       // 6 horas enfermo sin curar = muerte
  CARE_MISTAKE_WAIT_MIN: 15, // 15 min ignorando alerta = +1 Care Mistake
  MAX_POOP: 4,
  TICK_SIZE_MS: 60 * 1000  // Resolución del simulador: 1 minuto
};
