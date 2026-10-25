export class TamagotchiAudio {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.muted = false;
    // Submúltiplos exactos del cristal de cuarzo de 32.768 Hz
    this.FREQ = {
      LOW: 1024,      // 32768 / 32
      MID: 2048,      // 32768 / 16
      HIGH_MID: 3277, // 32768 / 10
      HIGH: 4096      // 32768 / 8
    };
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMute(isMuted) {
    this.muted = isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(isMuted ? 0 : 0.12, this.ctx.currentTime);
    }
  }

  playTone(freq, durationMs, startOffsetSec = 0) {
    if (this.muted) return;
    this.init();
    const startTime = this.ctx.currentTime + startOffsetSec;
    const stopTime = startTime + durationMs / 1000;
    const osc = this.ctx.createOscillator();
    const noteGain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, startTime);

    noteGain.gain.setValueAtTime(0.0001, startTime);
    noteGain.gain.exponentialRampToValueAtTime(1.0, startTime + 0.0015);
    noteGain.gain.setValueAtTime(1.0, stopTime - 0.0015);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, stopTime);

    osc.connect(noteGain);
    noteGain.connect(this.masterGain);

    osc.start(startTime);
    osc.stop(stopTime);
  }

  playClick() {
    this.playTone(this.FREQ.HIGH_MID, 25);
  }

  playConfirm() {
    this.playTone(this.FREQ.MID, 30, 0);
    this.playTone(this.FREQ.HIGH, 40, 0.04);
  }

  playCancel() {
    this.playTone(this.FREQ.HIGH, 30, 0);
    this.playTone(this.FREQ.LOW, 40, 0.04);
  }

  playEat() {
    this.playTone(this.FREQ.HIGH_MID, 35, 0);
    this.playTone(this.FREQ.MID, 40, 0.06);
  }

  playAttention() {
    for (let i = 0; i < 4; i++) {
      this.playTone(this.FREQ.HIGH, 70, i * 0.09);
    }
  }

  playRefusal() {
    this.playTone(this.FREQ.LOW, 120, 0);
    this.playTone(this.FREQ.LOW, 180, 0.16);
  }

  playWinRound() {
    this.playTone(this.FREQ.MID, 50, 0);
    this.playTone(this.FREQ.HIGH_MID, 50, 0.06);
    this.playTone(this.FREQ.HIGH, 90, 0.12);
  }

  playLoseRound() {
    this.playTone(this.FREQ.MID, 80, 0);
    this.playTone(this.FREQ.LOW, 160, 0.10);
  }

  playEvolution() {
    const notes = [this.FREQ.MID, this.FREQ.HIGH_MID, this.FREQ.HIGH, this.FREQ.HIGH_MID, this.FREQ.HIGH];
    notes.forEach((f, idx) => this.playTone(f, 60, idx * 0.08));
  }

  playDeath() {
    this.playTone(this.FREQ.HIGH_MID, 200, 0.0);
    this.playTone(this.FREQ.MID, 200, 0.25);
    this.playTone(this.FREQ.LOW, 400, 0.50);
  }
}
