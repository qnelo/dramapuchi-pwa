import { SPRITES } from './sprites.js';
import { StatusRenderer } from './StatusRenderer.js';
import { ICONS, UI_MODE } from '../constants/menu.js';

export class GameRenderer {
  static getSpeciesSprite(species, frame = 0, generation = 1) {
    switch (species) {
      // Gen 1
      case 'BABYPUCHI':
      case 'BABYTCHI':
        return frame ? (SPRITES.BABYPUCHI_IDLE_2 || SPRITES.BABYPUCHI_IDLE) : SPRITES.BABYPUCHI_IDLE;
      case 'ROLLI':
      case 'MARUTCHI':
        return frame ? (SPRITES.ROLLI_IDLE_2 || SPRITES.ROLLI_IDLE) : SPRITES.ROLLI_IDLE;
      case 'CHIRPY':
      case 'TAMATCHI':
        return frame ? (SPRITES.CHIRPY_IDLE_2 || SPRITES.CHIRPY_IDLE) : SPRITES.CHIRPY_IDLE;
      case 'POUTY':
      case 'KUCHITAMATCHI':
        return frame ? (SPRITES.POUTY_IDLE_2 || SPRITES.POUTY_IDLE) : SPRITES.POUTY_IDLE;
      case 'SMARTY':
      case 'MAMETCHI':
        return frame ? (SPRITES.SMARTY_IDLE_2 || SPRITES.SMARTY_IDLE) : SPRITES.SMARTY_IDLE;
      case 'PINGU':
      case 'GINJIROTCHI':
        return frame ? (SPRITES.PINGU_IDLE_2 || SPRITES.PINGU_IDLE) : SPRITES.PINGU_IDLE;
      case 'SHADOW':
      case 'MASKUTCHI':
        return frame ? (SPRITES.SHADOW_IDLE_2 || SPRITES.SHADOW_IDLE) : SPRITES.SHADOW_IDLE;
      case 'CHOMPY':
      case 'KUCHIPATCHI':
        return frame ? (SPRITES.CHOMPY_IDLE_2 || SPRITES.CHOMPY_IDLE) : SPRITES.CHOMPY_IDLE;
      case 'NOODLE':
      case 'NYOROTCHI':
        return frame ? (SPRITES.NOODLE_IDLE_2 || SPRITES.NOODLE_IDLE) : SPRITES.NOODLE_IDLE;
      case 'DIVALIPS':
      case 'TARAKOTCHI':
        return frame ? (SPRITES.DIVALIPS_IDLE_2 || SPRITES.DIVALIPS_IDLE) : SPRITES.DIVALIPS_IDLE;
      case 'OLDY':
      case 'OYAJITCHI':
        return frame ? (SPRITES.OLDY_IDLE_2 || SPRITES.OLDY_IDLE) : SPRITES.OLDY_IDLE;

      // Gen 2
      case 'SNOWPUCHI':
        return frame ? SPRITES.SNOWPUCHI_IDLE_2 : SPRITES.SNOWPUCHI_IDLE;
      case 'CURLY':
        return frame ? SPRITES.CURLY_IDLE_2 : SPRITES.CURLY_IDLE;
      case 'SPIKY':
        return frame ? SPRITES.SPIKY_IDLE_2 : SPRITES.SPIKY_IDLE;
      case 'DUCKY':
        return frame ? SPRITES.DUCKY_IDLE_2 : SPRITES.DUCKY_IDLE;
      case 'BUNNY':
        return frame ? SPRITES.BUNNY_IDLE_2 : SPRITES.BUNNY_IDLE;
      case 'BARKY':
        return frame ? SPRITES.BARKY_IDLE_2 : SPRITES.BARKY_IDLE;
      case 'BEAKY':
        return frame ? SPRITES.BEAKY_IDLE_2 : SPRITES.BEAKY_IDLE;
      case 'LEGGY':
        return frame ? SPRITES.LEGGY_IDLE_2 : SPRITES.LEGGY_IDLE;
      case 'OCTO':
        return frame ? SPRITES.OCTO_IDLE_2 : SPRITES.OCTO_IDLE;
      case 'FLORA':
        return frame ? SPRITES.FLORA_IDLE_2 : SPRITES.FLORA_IDLE;
      case 'KITTY':
        return frame ? SPRITES.KITTY_IDLE_2 : SPRITES.KITTY_IDLE;

      case 'EGG':
      default:
        if (generation === 2) {
          return frame ? SPRITES.EGG_GEN2_WIGGLE : SPRITES.EGG_GEN2_IDLE;
        }
        return frame ? SPRITES.EGG_WIGGLE : SPRITES.EGG_IDLE;
    }
  }

  static render(lcd, petState, menuController, tickMs = Date.now()) {
    lcd.clear();

    const mode = menuController.uiMode;

    // 1. Status View (Meters)
    if (mode === UI_MODE.STATUS_VIEW) {
      StatusRenderer.renderStatusPage(lcd, petState, menuController.statusPage);
      return;
    }

    // 2. Real-time Clock
    if (mode === UI_MODE.CLOCK) {
      StatusRenderer.renderClock(lcd, new Date());
      return;
    }

    // 3. Submenus
    if (mode === UI_MODE.SUBMENU) {
      this.renderSubmenu(lcd, menuController);
      return;
    }

    // 4. Mini-game
    if (mode === UI_MODE.MINIGAME) {
      const activeGame = menuController.getActiveMiniGame();
      this.renderMiniGame(lcd, petState, activeGame.getState(), tickMs);
      return;
    }

    // 5. Action animations
    if (mode === UI_MODE.ANIMATING) {
      this.renderAnimation(lcd, petState, menuController.currentAnim, tickMs);
      return;
    }

    // 6. Idle State / Icon Selection
    this.renderPetIdle(lcd, petState, tickMs);
  }

  static renderSubmenu(lcd, menuController) {
    const isGen2 = menuController.pet.generation === 2;
    if (menuController.selectedIcon === ICONS.FEED) {
      if (menuController.submenuIndex === 0) {
        lcd.drawSprite(2, 5, SPRITES.ARROW_RIGHT);
        lcd.drawSprite(7, 4, isGen2 ? SPRITES.BURGER : SPRITES.MEAT);
        StatusRenderer.drawText(lcd, isGen2 ? "BURGER" : "MEAL", isGen2 ? 16 : 17, 6);
      } else {
        lcd.drawSprite(2, 5, SPRITES.ARROW_RIGHT);
        lcd.drawSprite(7, 4, isGen2 ? SPRITES.SHORTCAKE : SPRITES.CANDY);
        StatusRenderer.drawText(lcd, isGen2 ? "CAKE" : "SNACK", isGen2 ? 18 : 16, 6);
      }
    } else if (menuController.selectedIcon === ICONS.LIGHT) {
      if (menuController.submenuIndex === 0) {
        StatusRenderer.drawText(lcd, "LIGHT", 6, 2);
        lcd.drawSprite(7, 9, SPRITES.ARROW_RIGHT);
        StatusRenderer.drawText(lcd, "ON", 13, 9);
      } else {
        StatusRenderer.drawText(lcd, "LIGHT", 6, 2);
        lcd.drawSprite(7, 9, SPRITES.ARROW_RIGHT);
        StatusRenderer.drawText(lcd, "OFF", 13, 9);
      }
    }
  }

  static renderMiniGame(lcd, petState, miniState, tickMs) {
    if (!miniState) return;
    const isGen2 = petState.generation === 2;
    const petSprite = this.getSpeciesSprite(petState.species, 0, petState.generation);

    if (isGen2) {
      // --- GEN 2 HIGH-LOW GAME ---
      const { round, wins, phase, currentNumber, nextNumber, playerGuess } = miniState;
      if (phase === 'WAITING_INPUT') {
        StatusRenderer.drawText(lcd, `R${round}`, 1, 1);
        // Base visible number in center
        StatusRenderer.drawText(lcd, `${currentNumber}`, 15, 2);
        // Bottom prompts: L (Low / Botón A) & H (High / Botón B)
        StatusRenderer.drawText(lcd, "L<", 2, 10);
        StatusRenderer.drawText(lcd, ">H", 23, 10);
      } else if (phase === 'REVEAL') {
        StatusRenderer.drawText(lcd, `${currentNumber}`, 5, 2);
        StatusRenderer.drawText(lcd, "->", 13, 2);
        StatusRenderer.drawText(lcd, `${nextNumber}`, 23, 2);
        const isHigher = nextNumber > currentNumber;
        const won = (playerGuess === 'HIGH' && isHigher) || (playerGuess === 'LOW' && !isHigher);
        StatusRenderer.drawText(lcd, won ? "O" : "X", 15, 10);
      } else if (phase === 'SUMMARY') {
        StatusRenderer.drawText(lcd, `${wins}-5`, 2, 2);
        if (wins >= 3) {
          const bounceY = Math.floor(tickMs / 200) % 2 === 0 ? 0 : 2;
          lcd.drawSprite(14, bounceY, petSprite);
          StatusRenderer.drawText(lcd, "WIN", 2, 9);
        } else {
          lcd.drawSprite(14, 1, petSprite);
          StatusRenderer.drawText(lcd, "LOSE", 1, 9);
        }
      }
    } else {
      // --- GEN 1 LEFT-RIGHT GAME ---
      const { round, wins, phase, petDirection, playerGuess } = miniState;
      if (phase === 'WAITING_INPUT') {
        StatusRenderer.drawText(lcd, `R${round}`, 1, 1);
        lcd.drawSprite(8, 0, petSprite);
        StatusRenderer.drawText(lcd, "<", 2, 9);
        StatusRenderer.drawText(lcd, ">", 27, 9);
      } else if (phase === 'REVEAL') {
        const flip = petDirection === 'RIGHT';
        lcd.drawSprite(8, 0, petSprite, flip);
        const won = playerGuess === petDirection;
        StatusRenderer.drawText(lcd, won ? "O" : "X", flip ? 2 : 27, 2);
      } else if (phase === 'SUMMARY') {
        StatusRenderer.drawText(lcd, `${wins}-5`, 2, 2);
        if (wins >= 3) {
          const bounceY = Math.floor(tickMs / 200) % 2 === 0 ? 0 : 2;
          lcd.drawSprite(14, bounceY, petSprite);
          StatusRenderer.drawText(lcd, "WIN", 2, 9);
        } else {
          lcd.drawSprite(14, 1, petSprite);
          StatusRenderer.drawText(lcd, "LOSE", 1, 9);
        }
      }
    }
  }

  static renderAnimation(lcd, petState, animType, tickMs) {
    const petSprite = this.getSpeciesSprite(petState.species, 0, petState.generation);

    switch (animType) {
      case 'HAPPY_JUMP': {
        const bounce = Math.floor(tickMs / 180) % 2 === 0 ? 0 : 3;
        lcd.drawSprite(8, bounce, petSprite);
        break;
      }
      case 'EATING_MEAT': {
        const step = Math.floor(tickMs / 250) % 4;
        lcd.drawSprite(3, 0, petSprite);
        if (step < 3) {
          lcd.drawSprite(20 - step * 2, 4, SPRITES.MEAT);
        }
        break;
      }
      case 'EATING_BURGER': {
        const step = Math.floor(tickMs / 250) % 4;
        lcd.drawSprite(3, 0, petSprite);
        if (step < 3) {
          lcd.drawSprite(20 - step * 2, 4, SPRITES.BURGER);
        }
        break;
      }
      case 'EATING_CANDY': {
        const step = Math.floor(tickMs / 250) % 4;
        lcd.drawSprite(3, 0, petSprite);
        if (step < 3) {
          lcd.drawSprite(20 - step * 2, 4, SPRITES.CANDY);
        }
        break;
      }
      case 'EATING_CAKE': {
        const step = Math.floor(tickMs / 250) % 4;
        lcd.drawSprite(3, 0, petSprite);
        if (step < 3) {
          lcd.drawSprite(20 - step * 2, 4, SPRITES.SHORTCAKE);
        }
        break;
      }
      case 'FLUSHING': {
        const waveX = Math.floor((tickMs % 1200) / 1200 * 36);
        for (let y = 0; y < 16; y++) {
          const px = 32 - waveX + (y % 3);
          lcd.setPixel(px, y, 1);
          lcd.setPixel(px + 1, y, 1);
          lcd.setPixel(px + 3, y, 1);
        }
        lcd.drawSprite(6, 0, petSprite);
        break;
      }
      case 'HEALING': {
        const flash = Math.floor(tickMs / 200) % 2 === 0;
        lcd.drawSprite(flash ? 5 : 7, 0, petSprite);
        lcd.drawSprite(22, 4, SPRITES.SYRINGE);
        break;
      }
      case 'SCOLDING': {
        lcd.drawSprite(8, 2, petSprite);
        StatusRenderer.drawText(lcd, "!", 4, 2);
        StatusRenderer.drawText(lcd, "!", 26, 2);
        break;
      }
      case 'REFUSAL': {
        const shake = Math.floor(tickMs / 150) % 2 === 0;
        // Negative animation: turn away with posture
        lcd.drawSprite(shake ? 5 : 11, 0, petSprite, true);
        break;
      }
      default:
        lcd.drawSprite(8, 0, petSprite);
        break;
    }
  }

  static renderPetIdle(lcd, petState, tickMs) {
    const isGen2 = petState.generation === 2;

    // 1. Egg Stage
    if (petState.stage === 'EGG') {
      const wiggle = Math.floor(tickMs / 1000) % 3 === 0;
      const eggSprite = this.getSpeciesSprite('EGG', wiggle ? 1 : 0, petState.generation);
      lcd.drawSprite(8, 0, eggSprite);
      return;
    }

    // 2. Dead Stage
    if (petState.stage === 'DEAD') {
      if (isGen2) {
        // Gen 2 Alien Abduction beam representation
        lcd.drawSprite(8, 0, SPRITES.UFO_BEAM);
        const twinkle = Math.floor(tickMs / 300) % 2 === 0;
        if (twinkle) {
          lcd.setPixel(2, 2, 1);
          lcd.setPixel(29, 3, 1);
        }
      } else {
        // Gen 1 Tombstone & skull/angel
        lcd.drawSprite(8, 0, SPRITES.DEAD_TOMB);
        const blink = Math.floor(tickMs / 500) % 2 === 0;
        if (blink) {
          lcd.drawSprite(24, 0, SPRITES.SKULL);
        }
      }
      return;
    }

    // 3. Departed Stage (Peaceful UFO Return)
    if (petState.stage === 'DEPARTED') {
      lcd.drawSprite(8, 0, SPRITES.DEPARTED_UFO);
      const twinkle = Math.floor(tickMs / 400) % 2 === 0;
      if (twinkle) {
        lcd.setPixel(2, 2, 1);
        lcd.setPixel(29, 3, 1);
        lcd.setPixel(4, 12, 1);
      }
      return;
    }

    // 4. Sleeping
    if (petState.isSleeping) {
      if (!petState.lightsOn) {
        // Lights off: dark screen
        return;
      }
      // Lights on: sleeping pet with floating 'Z' indicator
      const petSprite = this.getSpeciesSprite(petState.species, 0, petState.generation);
      lcd.drawSprite(4, 2, petSprite);
      const zOffset = Math.floor(tickMs / 600) % 3;
      lcd.drawSprite(22, 4 - zOffset, SPRITES.Z_SLEEP);
      return;
    }

    // 5. Awake Pet (Wandering Idle)
    const frame = Math.floor(tickMs / 600) % 2;
    const petX = frame === 0 ? 6 : 9;
    const petSprite = this.getSpeciesSprite(petState.species, frame, petState.generation);
    lcd.drawSprite(petX, 0, petSprite);

    // Poop sprites (up to 4)
    if (petState.poopCount > 0) {
      const positions = [
        [24, 8],
        [24, 0],
        [18, 8],
        [18, 0]
      ];
      for (let i = 0; i < Math.min(4, petState.poopCount); i++) {
        lcd.drawSprite(positions[i][0], positions[i][1], SPRITES.POOP);
      }
    }

    // Skull indicator when sick
    if (petState.isSick) {
      const blinkSkull = Math.floor(tickMs / 400) % 2 === 0;
      if (blinkSkull) {
        lcd.drawSprite(0, 0, SPRITES.SKULL);
      }
    }

    // Puchi Sitter indicator badge (top right)
    if (petState.sitterModeActive) {
      StatusRenderer.drawText(lcd, "S", 28, 1);
    }
  }
}
