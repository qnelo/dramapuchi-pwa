import { STAGE_CONFIG } from '../config/petConfig.js';

export class HighLowGameController {
  constructor(petState, audioSystem, onUpdate, onFinish) {
    this.pet = petState;
    this.audio = audioSystem;
    this.onUpdate = onUpdate;
    this.onFinish = onFinish;
    this.round = 0;
    this.maxRounds = 5;
    this.wins = 0;
    this.currentNumber = 5;
    this.nextNumber = null;
    this.playerGuess = null; // 'LOW' or 'HIGH'
    this.phase = 'WAITING_INPUT'; // WAITING_INPUT, REVEAL, SUMMARY
    this.timer = null;
  }

  start() {
    this.round = 1;
    this.wins = 0;
    this.phase = 'WAITING_INPUT';
    this.currentNumber = Math.floor(Math.random() * 9) + 1;
    this.nextNumber = null;
    this.playerGuess = null;
    this.onUpdate();
  }

  guess(choice) {
    if (this.phase !== 'WAITING_INPUT') return;
    this.playerGuess = choice; // 'LOW' (Button A) or 'HIGH' (Button B)
    do {
      this.nextNumber = Math.floor(Math.random() * 9) + 1;
    } while (this.nextNumber === this.currentNumber);

    this.phase = 'REVEAL';
    const isHigher = this.nextNumber > this.currentNumber;
    const wonRound = (choice === 'HIGH' && isHigher) || (choice === 'LOW' && !isHigher);
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
        this.currentNumber = this.nextNumber;
        this.nextNumber = null;
        this.phase = 'WAITING_INPUT';
        this.onUpdate();
      } else {
        this.finishGame();
      }
    }, 1100);
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
      currentNumber: this.currentNumber,
      nextNumber: this.nextNumber,
      playerGuess: this.playerGuess
    };
  }
}
