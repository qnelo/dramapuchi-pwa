import { STAGE_CONFIG, THRESHOLDS } from '../config/petConfig.js';
import { EvolutionResolver } from './evolutionResolver.js';

export class TamagotchiEngine {
  /**
   * Reconcilia el estado desde el último timestamp guardado hasta el presente.
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
    const minutesToSimulate = Math.min(totalMinutes, 1440 * 14); // Tope de 14 días
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

    // 1. Verificar transición evolutiva
    EvolutionResolver.checkAndEvolve(state);
    if (state.stage === 'DEPARTED') return;

    // 2. Verificar horario de sueño
    const sleepingNow = this.isSleepTime(hour, config.sleepStart, config.sleepEnd);
    
    // Si acaba de dormirse y la luz quedó encendida, iniciamos contador de descuido nocturno
    if (sleepingNow && !state.isSleeping) {
      state.lightMistakeTimer = 0;
    }
    state.isSleeping = sleepingNow;
    if (state.isSleeping) {
      if (state.lightsOn) {
        state.lightMistakeTimer = (state.lightMistakeTimer || 0) + 1;
        if (state.lightMistakeTimer === 60) {
          state.careMistakes++; // No apagar la luz durante la primera hora de sueño
        }
      }
      return; // El metabolismo se pausa mientras duerme
    }

    // 3. Si el modo Guardería (Tama Sitter) está activo en horario diurno (07:00 - 18:00)
    if (state.sitterModeActive) {
      if (hour >= 7 && hour < 18) {
        return; // La niñera mantiene los indicadores estables
      } else {
        state.sitterModeActive = false; // La niñera se retira a las 18:00
      }
    }

    // 4. Degradación de Hambre
    state.hungerTick++;
    if (state.hungerTick >= config.hungerRateMin) {
      state.hungerTick = 0;
      if (state.hunger > 0) state.hunger--;
    }

    // 5. Degradación de Felicidad
    state.happyTick++;
    if (state.happyTick >= config.happyRateMin) {
      state.happyTick = 0;
      if (state.happiness > 0) state.happiness--;
    }

    // 6. Generación de Suciedad
    state.poopTick++;
    if (state.poopTick >= config.poopRateMin) {
      state.poopTick = 0;
      if (state.poopCount < THRESHOLDS.MAX_POOP) {
        state.poopCount++;
      }
    }

    // 7. Llamadas de Disciplina (cada 4 horas en vigilia pide atención caprichosa)
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

    // 8. Contabilización de Care Mistakes por Hambre o Felicidad en 0
    if (state.hunger === 0 || state.happiness === 0) {
      state.neglectTimer = (state.neglectTimer || 0) + 1;
      if (state.neglectTimer === THRESHOLDS.CARE_MISTAKE_WAIT_MIN) {
        state.careMistakes++;
      }
    } else {
      state.neglectTimer = 0;
    }

    // 9. Enfermedad por exceso de suciedad
    if (state.poopCount >= THRESHOLDS.MAX_POOP && !state.isSick) {
      state.isSick = true;
      state.sickDosesNeeded = 2;
    }

    // 10. Evaluación de Muerte
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

    // Actualizar flag general del icono de Atención (8º icono)
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
      state.species = 'BABYTCHI';
      state.hunger = 2;
      state.happiness = 2;
      state.weight = STAGE_CONFIG.BABY.baseWeight;
      state.lastTickTimestamp = currentTimestamp;
    }
    return state;
  }
}
