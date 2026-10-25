export class LcdMatrix {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cols = options.cols || 32;
    this.rows = options.rows || 16;
    this.palettes = {
      classic: {
        bg: '#9ba885',
        pixelOff: '#8e9a78',
        pixelOn: '#1b2416'
      },
      backlight: {
        bg: '#0f2a24',
        pixelOff: '#153830',
        pixelOn: '#5bfec8'
      }
    };
    this.currentTheme = 'classic';
    this.pixelGap = options.pixelGap || 1;
    this.ghostingRate = options.ghosting ?? 0.35;
    this.targetBuffer = new Uint8Array(this.cols * this.rows);
    this.currentBuffer = new Float32Array(this.cols * this.rows);
    this.resize();
  }

  setTheme(themeName) {
    if (this.palettes[themeName]) {
      this.currentTheme = themeName;
    }
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.imageSmoothingEnabled = false;

    const cellW = Math.floor(this.canvas.width / this.cols);
    const cellH = Math.floor(this.canvas.height / this.rows);
    this.cellSize = Math.max(1, Math.min(cellW, cellH));

    this.offsetX = Math.floor((this.canvas.width - this.cols * this.cellSize) / 2);
    this.offsetY = Math.floor((this.canvas.height - this.rows * this.cellSize) / 2);
  }

  clear() {
    this.targetBuffer.fill(0);
  }

  setPixel(x, y, state) {
    if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) return;
    this.targetBuffer[y * this.cols + x] = state ? 1 : 0;
  }

  drawSprite(startX, startY, spriteRows, flipX = false) {
    for (let r = 0; r < spriteRows.length; r++) {
      const rowStr = spriteRows[r];
      const len = rowStr.length;
      for (let c = 0; c < len; c++) {
        const char = flipX ? rowStr[len - 1 - c] : rowStr[c];
        if (char === '1' || char === 'X') {
          this.setPixel(startX + c, startY + r, 1);
        }
      }
    }
  }

  render() {
    const { ctx, cols, rows, cellSize, pixelGap, offsetX, offsetY } = this;
    const palette = this.palettes[this.currentTheme];
    const dotSize = Math.max(1, cellSize - pixelGap);

    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const idx = y * cols + x;
        const target = this.targetBuffer[idx];
        this.currentBuffer[idx] += (target - this.currentBuffer[idx]) * this.ghostingRate;
        const intensity = this.currentBuffer[idx];
        const px = offsetX + x * cellSize;
        const py = offsetY + y * cellSize;

        ctx.fillStyle = palette.pixelOff;
        ctx.fillRect(px, py, dotSize, dotSize);

        if (intensity > 0.02) {
          ctx.save();
          ctx.globalAlpha = Math.min(1, intensity);
          ctx.fillStyle = palette.pixelOn;
          ctx.fillRect(px, py, dotSize, dotSize);
          ctx.restore();
        }
      }
    }
  }
}
