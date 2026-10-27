import { STAGE_CONFIG, SPECIES_CONFIG } from '../config/petConfig.js';
import { SaveManager } from '../storage/SaveManager.js';

export class EvolutionResolver {
  static checkAndEvolve(state) {
    const tBaby = STAGE_CONFIG.BABY.durationMin;
    const tChild = tBaby + STAGE_CONFIG.CHILD.durationMin;
    const tTeen = tChild + STAGE_CONFIG.TEEN.durationMin;
    const isGen2 = state.generation === 2;

    // 1. Baby -> Child
    if (state.stage === 'BABY' && state.ageMinutes >= tBaby) {
      state.stage = 'CHILD';
      state.species = isGen2 ? 'CURLY' : 'ROLLI';
      state.weight = Math.max(state.weight, STAGE_CONFIG.CHILD.baseWeight);
      state.careMistakes = 0; // Care mistakes reset upon entering child stage
      state.teenCareMistakes = 0;
      state.adultCareMistakes = 0;
    }
    // 2. Child -> Teen
    else if (state.stage === 'CHILD' && state.ageMinutes >= tChild) {
      state.stage = 'TEEN';
      const mistakes = state.careMistakes || 0;
      const disc = state.discipline;
      const isGoodChild = mistakes <= 2 && (disc === undefined || disc >= 50);

      if (isGen2) {
        state.species = isGoodChild ? 'SPIKY' : 'DUCKY';
      } else {
        state.species = isGoodChild ? 'CHIRPY' : 'POUTY';
      }
      state.weight = Math.max(state.weight, STAGE_CONFIG.TEEN.baseWeight);
      state.careMistakes = 0; // Reset for teen evaluation
      state.teenCareMistakes = 0;
      state.adultCareMistakes = 0;
    }
    // 3. Teen -> Adult
    else if (state.stage === 'TEEN' && state.ageMinutes >= tTeen) {
      state.stage = 'ADULT';
      state.weight = Math.max(state.weight, STAGE_CONFIG.ADULT.baseWeight);
      const mistakes = state.careMistakes || 0;
      const disc = state.discipline || 0;

      if (isGen2) {
        if (state.species === 'SPIKY') {
          if (mistakes <= 1 && disc >= 90) {
            state.species = 'BUNNY';
          } else if (mistakes <= 3 && disc >= 75) {
            state.species = 'BARKY';
          } else {
            state.species = 'BEAKY';
          }
        } else {
          // Ducky branch
          if (mistakes <= 4 && disc >= 50) {
            state.species = 'LEGGY';
          } else if (mistakes <= 6) {
            state.species = 'OCTO';
          } else {
            state.species = 'FLORA';
          }
        }
      } else {
        // Gen 1
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
      state.adultCareMistakes = 0;
    }
    // 4. Secret Evolutions (Adult -> Secret at age 10-14 days with 0 mistakes and 100% discipline)
    else if (state.stage === 'ADULT') {
      const adultAgeDays = (state.ageMinutes - tTeen) / 1440;
      if (adultAgeDays >= 5) { // 5+ days as adult (~10 total days of age)
        const disc = state.discipline || 0;
        const adultMistakes = state.adultCareMistakes || 0;
        if (adultMistakes === 0 && disc >= 100) {
          if (state.species === 'SHADOW' || state.species === 'MASKUTCHI') {
            state.species = 'OLDY';
          } else if (state.species === 'BEAKY') {
            state.species = 'KITTY';
          }
        }
      }

      // 5. Peaceful departure due to reaching lifespan ceiling (Return to home planet in UFO)
      const spec = SPECIES_CONFIG[state.species];
      const maxDays = spec?.maxDays || 14;
      const tAdultMax = tTeen + STAGE_CONFIG.ADULT.durationMin;
      // Depart if reached duration limit or specific species lifespan
      if (state.ageMinutes >= tAdultMax || adultAgeDays >= maxDays) {
        state.stage = 'DEPARTED';
        // Unlock Gen 2 exclusively if Smarty, Pingu, or Shadow returns home!
        if (
          state.species === 'SMARTY' || state.species === 'MAMETCHI' ||
          state.species === 'PINGU' || state.species === 'GINJIROTCHI' ||
          state.species === 'SHADOW' || state.species === 'MASKUTCHI'
        ) {
          state.gen2Unlocked = true;
          SaveManager.setGen2Unlocked(true);
        }
      }
    }
  }
}
