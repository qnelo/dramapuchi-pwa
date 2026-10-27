import { STAGE_CONFIG, SPECIES_CONFIG, THRESHOLDS } from '../config/petConfig.js';
import { EvolutionResolver } from './evolutionResolver.js';

export class PetEngine {
  /**
   * Reconciles pet state from the last saved timestamp to the current time.
   */
  static reconcile(state, currentTimestamp = Date.now()) {
    if (state.stage === 'DEAD' || state.stage === 'DEPARTED') {
      return state;
    }
    if (state.stage === 'EGG') {
      return this.checkEggHatch(state, currentTimestamp);
    }
    const elapsedMs = currentTimestamp - state.lastTickTimestamp;
    if (elapsedMs < THRESHOLDS.TICK_SIZE_MS) return state;

    const totalMinutes = Math.floor(elapsedMs / THRESHOLDS.TICK_SIZE_MS);
    const minutesToSimulate = Math.min(totalMinutes, 1440 * 14); // Safety cap: 14 days
    let simTime = state.lastTickTimestamp;

    for (let i = 0; i < minutesToSimulate; i++) {
      simTime += THRESHOLDS.TICK_SIZE_MS;
      this.stepOneMinute(state, simTime);
      if (state.stage === 'DEAD' || state.stage === 'DEPARTED') {
        state.endTimestamp = simTime;
        break;
      }
    }
    state.lastTickTimestamp = currentTimestamp;
    return state;
  }

  static stepOneMinute(state, currentSimTime) {
    const config = STAGE_CONFIG[state.stage];
    if (!config) return;
    const spec = SPECIES_CONFIG[state.species] || {};
    const dateObj = new Date(currentSimTime);
    const hour = dateObj.getHours();
    state.ageMinutes++;

    // 1. Check evolutionary transitions
    EvolutionResolver.checkAndEvolve(state);
    if (state.stage === 'DEPARTED' || state.stage === 'DEAD') return;

    // 2. Evaluate sleep schedule (prefer species-specific schedule)
    const sleepStart = spec.sleepStart !== undefined ? spec.sleepStart : config.sleepStart;
    const sleepEnd = spec.sleepEnd !== undefined ? spec.sleepEnd : config.sleepEnd;
    const sleepingNow = this.isSleepTime(hour, sleepStart, sleepEnd);

    // Bedtime transition
    if (sleepingNow && !state.isSleeping) {
      state.lightMistakeTimer = 0;
      if (state.lightsOn) {
        state.lightCallActive = true;
      }
    }
    state.isSleeping = sleepingNow;

    if (state.isSleeping) {
      // Bedtime call window: 15 minutes to turn off light!
      if (state.lightsOn) {
        state.lightMistakeTimer = (state.lightMistakeTimer || 0) + 1;
        // Exactly 15 minutes unaddressed adds +1 Care Mistake and turns off call icon
        if (state.lightMistakeTimer === THRESHOLDS.CARE_MISTAKE_WAIT_MIN) {
          state.careMistakes = (state.careMistakes || 0) + 1;
          if (state.stage === 'TEEN') state.teenCareMistakes = (state.teenCareMistakes || 0) + 1;
          if (state.stage === 'ADULT') state.adultCareMistakes = (state.adultCareMistakes || 0) + 1;
          state.lightCallActive = false; // Icon turns off automatically
        }
      } else {
        state.lightCallActive = false;
        state.lightMistakeTimer = 0;
      }
      return; // Metabolic degradation pauses while sleeping
    } else {
      state.lightCallActive = false;
      state.lightMistakeTimer = 0;
    }

    // 3. Puchi Sitter mode active during daytime (07:00 - 18:00)
    if (state.sitterModeActive) {
      if (hour >= 7 && hour < 18) {
        return; // Sitter maintains stats frozen
      } else {
        state.sitterModeActive = false; // Sitter leaves at 18:00
      }
    }

    // 4. Senescence check (accelerated decay after day 15 as adult)
    let hungerRate = config.hungerRateMin;
    let happyRate = config.happyRateMin;
    if (state.stage === 'ADULT') {
      const adultDays = Math.max(0, (state.ageMinutes - (65 + 1440 * 5)) / 1440);
      if (adultDays >= THRESHOLDS.SENESCENCE_START_DAYS) {
        hungerRate = Math.max(10, Math.floor(hungerRate * 0.4));
        happyRate = Math.max(10, Math.floor(happyRate * 0.4));
      }
    }

    // 5. Hunger degradation
    state.hungerTick++;
    if (state.hungerTick >= hungerRate) {
      state.hungerTick = 0;
      if (state.hunger > 0) state.hunger--;
    }

    // 6. Happiness degradation
    state.happyTick++;
    if (state.happyTick >= happyRate) {
      state.happyTick = 0;
      if (state.happiness > 0) state.happiness--;
    }

    // 7. Poop generation
    state.poopTick++;
    if (state.poopTick >= config.poopRateMin) {
      state.poopTick = 0;
      if (state.poopCount < THRESHOLDS.MAX_POOP) {
        state.poopCount++;
      }
    }

    // 8. Discipline calls (every 4 hours of waking time triggers a capricious call)
    if (state.ageMinutes % 240 === 0 && state.hunger > 0 && state.happiness > 0) {
      state.disciplineCallActive = true;
      state.disciplineCallTimer = 0;
    }
    if (state.disciplineCallActive) {
      state.disciplineCallTimer++;
      if (state.disciplineCallTimer >= THRESHOLDS.CARE_MISTAKE_WAIT_MIN) {
        state.careMistakes = (state.careMistakes || 0) + 1;
        if (state.stage === 'TEEN') state.teenCareMistakes = (state.teenCareMistakes || 0) + 1;
        if (state.stage === 'ADULT') state.adultCareMistakes = (state.adultCareMistakes || 0) + 1;
        state.disciplineCallActive = false;
      }
    }

    // 9. Care Mistakes from 0 Hunger or 0 Happiness (15-min alert window)
    if (state.hunger === 0 || state.happiness === 0) {
      state.neglectTimer = (state.neglectTimer || 0) + 1;
      if (state.neglectTimer === THRESHOLDS.CARE_MISTAKE_WAIT_MIN) {
        state.careMistakes = (state.careMistakes || 0) + 1;
        if (state.stage === 'TEEN') state.teenCareMistakes = (state.teenCareMistakes || 0) + 1;
        if (state.stage === 'ADULT') state.adultCareMistakes = (state.adultCareMistakes || 0) + 1;
      }
    } else {
      state.neglectTimer = 0;
    }

    // 10. Sickness from accumulated filth
    if (state.poopCount >= THRESHOLDS.MAX_POOP && !state.isSick) {
      state.isSick = true;
      const adultDays = state.stage === 'ADULT' ? Math.max(0, (state.ageMinutes - (65 + 1440 * 5)) / 1440) : 0;
      state.sickDosesNeeded = (adultDays >= THRESHOLDS.SENESCENCE_START_DAYS) ? 3 : 2;
    }

    // 11. Death evaluation
    if (state.hunger === 0) {
      state.starvationMinutes++;
      if (state.starvationMinutes >= THRESHOLDS.MAX_STARVATION_MIN) {
        state.stage = 'DEAD';
        state.deathReason = 'STARVATION';
        return;
      }
    } else {
      state.starvationMinutes = 0;
    }

    if (state.isSick) {
      state.sickMinutes++;
      if (state.sickMinutes >= THRESHOLDS.MAX_SICK_MIN) {
        state.stage = 'DEAD';
        state.deathReason = 'SICKNESS';
        return;
      }
    } else {
      state.sickMinutes = 0;
    }

    // Update general attention call flag (8th icon)
    // Active when hunger/happiness is 0, sick, discipline call, or bedtime light call
    state.isCalling = (
      state.hunger === 0 ||
      state.happiness === 0 ||
      state.isSick ||
      Boolean(state.disciplineCallActive) ||
      Boolean(state.lightCallActive)
    );
  }

  static isSleepTime(hour, start, end) {
    if (start === null || end === null || start === undefined || end === undefined) return false;
    return start > end ? (hour >= start || hour < end) : (hour >= start && hour < end);
  }

  static checkEggHatch(state, currentTimestamp) {
    const elapsed = currentTimestamp - state.bornTimestamp;
    if (elapsed >= STAGE_CONFIG.EGG.durationMin * 60 * 1000) {
      state.stage = 'BABY';
      state.species = state.generation === 2 ? 'SNOWPUCHI' : 'BABYPUCHI';
      state.hunger = 2;
      state.happiness = 2;
      state.weight = STAGE_CONFIG.BABY.baseWeight;
      state.lastTickTimestamp = currentTimestamp;
    }
    return state;
  }
}
