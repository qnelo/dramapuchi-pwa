import { ICONS, UI_MODE } from '../constants/menu.js';
import { STAGE_CONFIG, FOOD_CONFIG } from '../config/petConfig.js';
import { MiniGameController } from './MiniGameController.js';
import { HighLowGameController } from './HighLowGameController.js';

export class MenuController {
  constructor(petState, audioSystem, onStateChange) {
    this.pet = petState;
    this.audio = audioSystem;
    this.onStateChange = onStateChange;
    this.uiMode = UI_MODE.IDLE;
    this.selectedIcon = null;
    this.submenuIndex = 0;
    this.statusPage = 0;
    this.currentAnim = null;
    this.miniGame = new MiniGameController(
      this.pet,
      this.audio,
      () => this.notify(),
      () => this.resetToIdle()
    );
    this.highLowGame = new HighLowGameController(
      this.pet,
      this.audio,
      () => this.notify(),
      () => this.resetToIdle()
    );
  }

  getActiveMiniGame() {
    return this.pet.generation === 2 ? this.highLowGame : this.miniGame;
  }

  triggerHaptic(ms = 15) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(ms);
  }

  pressA() {
    if (this.isInputBlocked()) return;
    this.triggerHaptic();

    if (this.uiMode === UI_MODE.MINIGAME) {
      if (this.pet.generation === 2) {
        this.highLowGame.guess('LOW');
      } else {
        this.miniGame.guess('LEFT');
      }
      return;
    }

    this.audio.playClick();
    switch (this.uiMode) {
      case UI_MODE.IDLE:
        this.uiMode = UI_MODE.ICON_SELECT;
        this.selectedIcon = 0;
        break;
      case UI_MODE.ICON_SELECT:
        this.selectedIcon = (this.selectedIcon + 1) % 7;
        break;
      case UI_MODE.SUBMENU:
        this.submenuIndex = (this.submenuIndex + 1) % 2;
        break;
      case UI_MODE.STATUS_VIEW:
        this.statusPage = (this.statusPage + 1) % 4;
        break;
    }
    this.notify();
  }

  pressB() {
    if (this.isInputBlocked()) return;
    this.triggerHaptic();

    if (this.uiMode === UI_MODE.MINIGAME) {
      if (this.pet.generation === 2) {
        this.highLowGame.guess('HIGH');
      } else {
        this.miniGame.guess('RIGHT');
      }
      return;
    }

    switch (this.uiMode) {
      case UI_MODE.IDLE:
        this.startAnimation('HAPPY_JUMP', 1000, () => this.resetToIdle());
        break;
      case UI_MODE.ICON_SELECT:
        this.audio.playConfirm();
        this.routeIconExecution();
        break;
      case UI_MODE.SUBMENU:
        this.audio.playConfirm();
        this.executeSubmenuAction();
        break;
      case UI_MODE.STATUS_VIEW:
      case UI_MODE.CLOCK:
        this.audio.playConfirm();
        this.resetToIdle();
        break;
    }
    this.notify();
  }

  pressC() {
    if (this.uiMode === UI_MODE.ANIMATING) return;
    this.triggerHaptic();
    this.audio.playCancel();

    if (this.uiMode === UI_MODE.MINIGAME) {
      this.getActiveMiniGame().abort();
      this.resetToIdle();
      this.notify();
      return;
    }

    if (this.uiMode === UI_MODE.IDLE) {
      this.uiMode = UI_MODE.CLOCK;
    } else {
      this.resetToIdle();
    }
    this.notify();
  }

  routeIconExecution() {
    switch (this.selectedIcon) {
      case ICONS.FEED:
        this.uiMode = UI_MODE.SUBMENU;
        this.submenuIndex = 0;
        break;
      case ICONS.LIGHT:
        this.uiMode = UI_MODE.SUBMENU;
        this.submenuIndex = this.pet.lightsOn ? 0 : 1;
        break;
      case ICONS.METER:
        this.uiMode = UI_MODE.STATUS_VIEW;
        this.statusPage = 0;
        break;
      case ICONS.FLUSH:
        this.executeFlush();
        break;
      case ICONS.MEDICINE:
        this.executeMedicine();
        break;
      case ICONS.DISCIPLINE:
        this.executeDiscipline();
        break;
      case ICONS.GAME:
        if (this.pet.isSleeping || this.pet.isSick) {
          this.triggerRefusalAnimation();
        } else {
          this.uiMode = UI_MODE.MINIGAME;
          this.getActiveMiniGame().start();
        }
        break;
    }
  }

  executeSubmenuAction() {
    if (this.selectedIcon === ICONS.FEED) {
      this.feedPet(this.submenuIndex === 1);
    } else if (this.selectedIcon === ICONS.LIGHT) {
      this.pet.lightsOn = (this.submenuIndex === 0);
      if (!this.pet.lightsOn && this.pet.isSleeping) {
        this.pet.lightCallActive = false;
        this.pet.lightMistakeTimer = 0;
      }
      this.resetToIdle();
    }
  }

  feedPet(isCandy) {
    if (this.pet.isSleeping || this.pet.isSick || (!isCandy && this.pet.hunger >= 4)) {
      this.triggerRefusalAnimation();
      return;
    }

    const isGen2 = this.pet.generation === 2;
    const anim = isCandy
      ? (isGen2 ? 'EATING_CAKE' : 'EATING_CANDY')
      : (isGen2 ? 'EATING_BURGER' : 'EATING_MEAT');

    this.startAnimation(anim, 2000, () => {
      if (isCandy) {
        this.pet.happiness = Math.min(4, this.pet.happiness + 1);
        this.pet.weight += 2;
        this.pet.snacksFedRow = (this.pet.snacksFedRow || 0) + 1;
        // Gen 2 snack penalty: higher sensitivity (>= 4 triggers toothache/sickness)
        const limit = isGen2 ? 4 : 5;
        if (this.pet.snacksFedRow >= limit) {
          this.pet.isSick = true;
          this.pet.sickDosesNeeded = (this.pet.sickDosesNeeded || 1);
          this.pet.snacksFedRow = 0;
        }
      } else {
        this.pet.hunger = Math.min(4, this.pet.hunger + 1);
        this.pet.weight += 1;
        this.pet.snacksFedRow = 0;
      }

      if (this.pet.hunger > 0 && this.pet.happiness > 0 && !this.pet.disciplineCallActive && !this.pet.isSick) {
        this.pet.isCalling = false;
        this.pet.neglectTimer = 0;
      }

      this.audio.playEat();
      this.resetToIdle();
    });
  }

  executeFlush() {
    this.startAnimation('FLUSHING', 1800, () => {
      this.pet.poopCount = 0;
      this.resetToIdle();
    });
  }

  executeMedicine() {
    if (!this.pet.isSick) {
      this.triggerRefusalAnimation();
      return;
    }
    this.startAnimation('HEALING', 2200, () => {
      this.pet.sickDosesNeeded = Math.max(0, (this.pet.sickDosesNeeded || 1) - 1);
      if (this.pet.sickDosesNeeded === 0) {
        this.pet.isSick = false;
      }
      this.resetToIdle();
    });
  }

  executeDiscipline() {
    this.startAnimation('SCOLDING', 1500, () => {
      if (this.pet.disciplineCallActive) {
        this.pet.discipline = Math.min(100, this.pet.discipline + 25);
        this.pet.disciplineCallActive = false;
        this.pet.isCalling = false;
      }
      this.resetToIdle();
    });
  }

  startAnimation(type, durationMs, onComplete) {
    this.uiMode = UI_MODE.ANIMATING;
    this.currentAnim = type;
    this.notify();
    if (this.instantAnimation || durationMs <= 0) {
      onComplete();
      this.notify();
      return;
    }
    setTimeout(() => {
      onComplete();
      this.notify();
    }, durationMs);
  }

  triggerRefusalAnimation() {
    this.audio.playRefusal();
    this.startAnimation('REFUSAL', 1200, () => this.resetToIdle());
  }

  resetToIdle() {
    this.uiMode = UI_MODE.IDLE;
    this.selectedIcon = null;
    this.submenuIndex = 0;
    this.currentAnim = null;
  }

  isInputBlocked() {
    return (
      this.pet.stage === 'DEAD' ||
      this.pet.stage === 'DEPARTED' ||
      this.pet.stage === 'EGG' ||
      this.uiMode === UI_MODE.ANIMATING
    );
  }

  notify() {
    if (this.onStateChange) {
      const activeMini = this.getActiveMiniGame();
      this.onStateChange({
        uiMode: this.uiMode,
        selectedIcon: this.selectedIcon,
        submenuIndex: this.submenuIndex,
        statusPage: this.statusPage,
        currentAnim: this.currentAnim,
        miniGameState: activeMini ? activeMini.getState() : null
      });
    }
  }
}
