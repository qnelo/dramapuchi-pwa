import { STAGE_CONFIG } from '../config/petConfig.js';

export class MiniGameController {
  constructor(petState, audioSystem, onUpdate, onFinish) {
    this.pet = petState;
    this.audio = audioSystem;
    this.onUpdate = onUpdate;
    this.onFinish = onFinish;
    this.round = 0;
    this.maxRounds = 5;
    this.wins = 0;
    this.phase = 'WAITING_INPUT'; // WAITING_INPUT, REVEAL, SUMMARY
    this.petDirection = null;
    this.playerGuess = null;
    this.timer = null;
  }

  start() {
    this.round = 1;
    this.wins = 0;
    this.phase = 'WAITING_INPUT';
    this.petDirection = null;
    this.playerGuess = null;
    this.onUpdate();
  }

  guess(direction) {
    if (this.phase !== 'WAITING_INPUT') return;
    this.playerGuess = direction; // 'LEFT' or 'RIGHT'
    this.petDirection = Math.random() < 0.5 ? 'LEFT' : 'RIGHT';
    this.phase = 'REVEAL';
    const wonRound = this.playerGuess === this.petDirection;
    if (wonRound) {
      this.wins++;
      this.audio.playWinRound();
    } else {
      this.audio.playLoseRound();
    }
    this.onUpdate();

    this.timer = setTimeout(() => {
      if (this.round < this.maxRounds) {
        this.round++;
        this.phase = 'WAITING_INPUT';
        this.onUpdate();
      } else {
        this.finishGame();
      }
    }, 1000);
  }

  finishGame() {
    this.phase = 'SUMMARY';
    const baseW = STAGE_CONFIG[this.pet.stage]?.baseWeight || 10;
    this.pet.weight = Math.max(baseW, this.pet.weight - 1);
    if (this.wins >= 3) {
      this.pet.happiness = Math.min(4, this.pet.happiness + 1);
      this.audio.playEvolution();
    } else {
      this.audio.playRefusal();
    }
    this.onUpdate();

    this.timer = setTimeout(() => {
      this.onFinish();
    }, 1600);
  }

  abort() {
    if (this.timer) clearTimeout(this.timer);
  }

  getState() {
    return {
      round: this.round,
      wins: this.wins,
      phase: this.phase,
      petDirection: this.petDirection,
      playerGuess: this.playerGuess
    };
  }
}
