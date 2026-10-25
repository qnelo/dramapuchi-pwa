import { SPRITES } from './sprites.js';
import { StatusRenderer } from './StatusRenderer.js';
import { ICONS, UI_MODE } from '../constants/menu.js';

export class GameRenderer {
  static getSpeciesSprite(species, frame = 0) {
    switch (species) {
      case 'BABYTCHI':
        return frame ? (SPRITES.BABYTCHI_IDLE_2 || SPRITES.BABYTCHI_IDLE) : SPRITES.BABYTCHI_IDLE;
      case 'MARUTCHI':
        return frame ? (SPRITES.MARUTCHI_IDLE_2 || SPRITES.MARUTCHI_IDLE) : SPRITES.MARUTCHI_IDLE;
      case 'TAMATCHI':
        return frame ? (SPRITES.TAMATCHI_IDLE_2 || SPRITES.TAMATCHI_IDLE) : SPRITES.TAMATCHI_IDLE;
      case 'KUCHITAMATCHI':
        return frame ? (SPRITES.KUCHITAMATCHI_IDLE_2 || SPRITES.KUCHITAMATCHI_IDLE) : SPRITES.KUCHITAMATCHI_IDLE;
      case 'MAMETCHI':
        return frame ? (SPRITES.MAMETCHI_IDLE_2 || SPRITES.MAMETCHI_IDLE) : SPRITES.MAMETCHI_IDLE;
      case 'GINJIROTCHI':
        return SPRITES.GINJIROTCHI_IDLE || SPRITES.MAMETCHI_IDLE;
      case 'MASKUTCHI':
        return SPRITES.MASKUTCHI_IDLE || SPRITES.MAMETCHI_IDLE;
      case 'KUCHIPATCHI':
        return SPRITES.KUCHIPATCHI_IDLE || SPRITES.MAMETCHI_IDLE;
      case 'NYOROTCHI':
        return SPRITES.NYOROTCHI_IDLE || SPRITES.MAMETCHI_IDLE;
      case 'TARAKOTCHI':
        return SPRITES.TARAKOTCHI_IDLE || SPRITES.MAMETCHI_IDLE;
      case 'EGG':
      default:
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
      this.renderMiniGame(lcd, petState, menuController.miniGame.getState(), tickMs);
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
    if (menuController.selectedIcon === ICONS.FEED) {
      if (menuController.submenuIndex === 0) {
        lcd.drawSprite(2, 5, SPRITES.ARROW_RIGHT);
        lcd.drawSprite(7, 4, SPRITES.MEAT);
        StatusRenderer.drawText(lcd, "MEAL", 17, 6);
      } else {
        lcd.drawSprite(2, 5, SPRITES.ARROW_RIGHT);
        lcd.drawSprite(7, 4, SPRITES.CANDY);
        StatusRenderer.drawText(lcd, "SNACK", 16, 6);
      }
    } else if (menuController.selectedIcon === ICONS.LIGHT) {
      if (menuController.submenuIndex === 0) {
        StatusRenderer.drawText(lcd, "LIGHT", 6, 2);
        lcd.drawSprite(7, 9, SPRITES.ARROW_RIGHT);
        StatusRenderer.drawText(lcd, "ON", 13, 9);
      } else if (menuController.submenuIndex === 1) {
        StatusRenderer.drawText(lcd, "LIGHT", 6, 2);
        lcd.drawSprite(7, 9, SPRITES.ARROW_RIGHT);
        StatusRenderer.drawText(lcd, "OFF", 13, 9);
      } else {
        StatusRenderer.drawText(lcd, "SITTER", 4, 2);
        lcd.drawSprite(5, 9, SPRITES.ARROW_RIGHT);
        StatusRenderer.drawText(lcd, menuController.pet.sitterModeActive ? "ON" : "OFF", 11, 9);
      }
    }
  }

  static renderMiniGame(lcd, petState, miniState, tickMs) {
    const { round, wins, phase, petDirection, playerGuess } = miniState;
    const petSprite = this.getSpeciesSprite(petState.species, 0);

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

  static renderAnimation(lcd, petState, animType, tickMs) {
    const petSprite = this.getSpeciesSprite(petState.species, 0);

    switch (animType) {
      case 'HAPPY_JUMP': {
        const bounce = Math.floor(tickMs / 180) % 2 === 0 ? 0 : 3;
        lcd.drawSprite(8, bounce, petSprite);
        break;
      }
      case 'EATING_MEAT': {
        const step = Math.floor(tickMs / 250) % 4;
        const petX = 3;
        lcd.drawSprite(petX, 0, petSprite);
        if (step < 3) {
          lcd.drawSprite(20 - step * 2, 4, SPRITES.MEAT);
        }
        break;
      }
      case 'EATING_CANDY': {
        const step = Math.floor(tickMs / 250) % 4;
        const petX = 3;
        lcd.drawSprite(petX, 0, petSprite);
        if (step < 3) {
          lcd.drawSprite(20 - step * 2, 4, SPRITES.CANDY);
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
        lcd.drawSprite(shake ? 5 : 11, 0, petSprite, shake);
        break;
      }
      default:
        lcd.drawSprite(8, 0, petSprite);
        break;
    }
  }

  static renderPetIdle(lcd, petState, tickMs) {
    // 1. Egg Stage
    if (petState.stage === 'EGG') {
      const wiggle = Math.floor(tickMs / 1000) % 3 === 0;
      lcd.drawSprite(8, 0, wiggle ? SPRITES.EGG_WIGGLE : SPRITES.EGG_IDLE);
      return;
    }

    // 2. Dead Stage
    if (petState.stage === 'DEAD') {
      lcd.drawSprite(8, 0, SPRITES.DEAD_TOMB);
      const blink = Math.floor(tickMs / 500) % 2 === 0;
      if (blink) {
        lcd.drawSprite(24, 0, SPRITES.SKULL);
      }
      return;
    }

    // 3. Departed Stage (UFO Return)
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
      const petSprite = this.getSpeciesSprite(petState.species, 0);
      lcd.drawSprite(4, 2, petSprite);
      const zOffset = Math.floor(tickMs / 600) % 3;
      lcd.drawSprite(22, 4 - zOffset, SPRITES.Z_SLEEP);
      return;
    }

    // 5. Awake Pet (Wandering Idle)
    const frame = Math.floor(tickMs / 600) % 2;
    const petX = frame === 0 ? 6 : 9;
    const petSprite = this.getSpeciesSprite(petState.species, frame);
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

    // Tama Sitter indicator badge (top right)
    if (petState.sitterModeActive) {
      StatusRenderer.drawText(lcd, "S", 28, 1);
    }
  }
}
