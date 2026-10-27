import { STAGE_CONFIG } from '../config/petConfig.js';

export class EvolutionResolver {
  static checkAndEvolve(state) {
    const tBaby = STAGE_CONFIG.BABY.durationMin;
    const tChild = tBaby + STAGE_CONFIG.CHILD.durationMin;
    const tTeen = tChild + STAGE_CONFIG.TEEN.durationMin;
    const tAdultMax = tTeen + STAGE_CONFIG.ADULT.durationMin;

    // 1. Baby -> Child
    if (state.stage === 'BABY' && state.ageMinutes >= tBaby) {
      state.stage = 'CHILD';
      state.species = 'ROLLI';
      state.weight = Math.max(state.weight, STAGE_CONFIG.CHILD.baseWeight);
      state.careMistakes = 0; // Mistakes reset for child stage evaluation
    }
    // 2. Child -> Teen
    else if (state.stage === 'CHILD' && state.ageMinutes >= tChild) {
      state.stage = 'TEEN';
      state.species = state.careMistakes <= 2 ? 'CHIRPY' : 'POUTY';
      state.weight = Math.max(state.weight, STAGE_CONFIG.TEEN.baseWeight);
      state.teenCareMistakes = 0;
    }
    // 3. Teen -> Adult
    else if (state.stage === 'TEEN' && state.ageMinutes >= tTeen) {
      state.stage = 'ADULT';
      state.weight = Math.max(state.weight, STAGE_CONFIG.ADULT.baseWeight);
      const mistakes = state.careMistakes;
      const disc = state.discipline;

      if (state.species === 'CHIRPY' || state.species === 'TAMATCHI') {
        if (mistakes <= 1 && disc >= 90) {
          state.species = 'SMARTY';
        } else if (mistakes <= 3 && disc >= 75) {
          state.species = 'PINGU';
        } else {
          state.species = 'SHADOW';
        }
      } else {
        // Pouty branch
        if (mistakes <= 4 && disc >= 50) {
          state.species = 'CHOMPY';
        } else if (mistakes <= 6) {
          state.species = 'NOODLE';
        } else {
          state.species = 'DIVALIPS';
        }
      }
    }
    // 4. Peaceful departure due to old age (Return to home planet in UFO)
    else if (state.stage === 'ADULT' && state.ageMinutes >= tAdultMax) {
      state.stage = 'DEPARTED';
    }
  }
}
