import { STAGE_CONFIG, THRESHOLDS } from '../config/petConfig.js';
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
    const dateObj = new Date(currentSimTime);
    const hour = dateObj.getHours();
    state.ageMinutes++;

    // 1. Check evolutionary transitions
    EvolutionResolver.checkAndEvolve(state);
    if (state.stage === 'DEPARTED') return;

    // 2. Evaluate sleep schedule
    const sleepingNow = this.isSleepTime(hour, config.sleepStart, config.sleepEnd);
    
    // If pet just fell asleep and lights were left on, initialize light neglect timer
    if (sleepingNow && !state.isSleeping) {
      state.lightMistakeTimer = 0;
    }
    state.isSleeping = sleepingNow;
    if (state.isSleeping) {
      if (state.lightsOn) {
        state.lightMistakeTimer = (state.lightMistakeTimer || 0) + 1;
        if (state.lightMistakeTimer === 60) {
          state.careMistakes++; // Lights left on during first hour of sleep
        }
      }
      return; // Metabolic degradation pauses while sleeping
    }

    // 3. Puchi Sitter mode active during daytime (07:00 - 18:00)
    if (state.sitterModeActive) {
      if (hour >= 7 && hour < 18) {
        return; // Sitter maintains stats frozen
      } else {
        state.sitterModeActive = false; // Sitter leaves at 18:00
      }
    }

    // 4. Hunger degradation
    state.hungerTick++;
    if (state.hungerTick >= config.hungerRateMin) {
      state.hungerTick = 0;
      if (state.hunger > 0) state.hunger--;
    }

    // 5. Happiness degradation
    state.happyTick++;
    if (state.happyTick >= config.happyRateMin) {
      state.happyTick = 0;
      if (state.happiness > 0) state.happiness--;
    }

    // 6. Poop generation
    state.poopTick++;
    if (state.poopTick >= config.poopRateMin) {
      state.poopTick = 0;
      if (state.poopCount < THRESHOLDS.MAX_POOP) {
        state.poopCount++;
      }
    }

    // 7. Discipline calls (every 4 hours of waking time triggers a capricious call)
    if (state.ageMinutes % 240 === 0 && state.hunger > 0 && state.happiness > 0) {
      state.disciplineCallActive = true;
      state.disciplineCallTimer = 0;
    }
    if (state.disciplineCallActive) {
      state.disciplineCallTimer++;
      if (state.disciplineCallTimer >= THRESHOLDS.CARE_MISTAKE_WAIT_MIN) {
        state.careMistakes++;
        state.disciplineCallActive = false;
      }
    }

    // 8. Care Mistakes from 0 Hunger or 0 Happiness
    if (state.hunger === 0 || state.happiness === 0) {
      state.neglectTimer = (state.neglectTimer || 0) + 1;
      if (state.neglectTimer === THRESHOLDS.CARE_MISTAKE_WAIT_MIN) {
        state.careMistakes++;
      }
    } else {
      state.neglectTimer = 0;
    }

    // 9. Sickness from accumulated filth
    if (state.poopCount >= THRESHOLDS.MAX_POOP && !state.isSick) {
      state.isSick = true;
      state.sickDosesNeeded = 2;
    }

    // 10. Death evaluation
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
    state.isCalling = (
      state.hunger === 0 ||
      state.happiness === 0 ||
      state.isSick ||
      state.disciplineCallActive
    );
  }

  static isSleepTime(hour, start, end) {
    if (start === null || end === null) return false;
    return start > end ? (hour >= start || hour < end) : (hour >= start && hour < end);
  }

  static checkEggHatch(state, currentTimestamp) {
    const elapsed = currentTimestamp - state.bornTimestamp;
    if (elapsed >= STAGE_CONFIG.EGG.durationMin * 60 * 1000) {
      state.stage = 'BABY';
      state.species = 'BABYPUCHI';
      state.hunger = 2;
      state.happiness = 2;
      state.weight = STAGE_CONFIG.BABY.baseWeight;
      state.lastTickTimestamp = currentTimestamp;
    }
    return state;
  }
}
