import { SPRITES, FONT_3X5 } from './sprites.js';

export class StatusRenderer {
  static drawText(lcd, text, startX, startY) {
    let cursorX = startX;
    const cleanText = text.toUpperCase();
    for (let i = 0; i < cleanText.length; i++) {
      const char = cleanText[i];
      const glyph = FONT_3X5[char] || FONT_3X5[' '];
      lcd.drawSprite(cursorX, startY, glyph);
      cursorX += 4; // 3px character width + 1px spacing
    }
  }

  /**
   * Renders one of the 4 status meter pages (Scale).
   * @param {LcdMatrix} lcd
   * @param {Object} petState
   * @param {number} pageIndex - 0: Age/Weight, 1: Discipline, 2: Hunger, 3: Happiness
   */
  static renderStatusPage(lcd, petState, pageIndex) {
    lcd.clear();
    switch (pageIndex) {
      case 0: {
        // Page 1: Age in days and Weight in pounds
        const days = Math.min(99, Math.floor(petState.ageMinutes / 1440));
        const weight = Math.min(99, petState.weight);
        this.drawText(lcd, `AGE ${days}`, 2, 2);
        this.drawText(lcd, `LB  ${weight}`, 2, 9);
        break;
      }
      case 1: {
        // Page 2: Discipline meter (0% - 100%)
        this.drawText(lcd, "DISCIP", 4, 2);
        // Outer border of the meter bar (x: 2..29, y: 9..13)
        for (let x = 2; x <= 29; x++) {
          lcd.setPixel(x, 9, 1);
          lcd.setPixel(x, 13, 1);
        }
        for (let y = 9; y <= 13; y++) {
          lcd.setPixel(2, y, 1);
          lcd.setPixel(29, y, 1);
        }
        // Proportional filled width
        const fillWidth = Math.round((petState.discipline / 100) * 24);
        for (let x = 4; x < 4 + fillWidth; x++) {
          for (let y = 10; y <= 12; y++) {
            lcd.setPixel(x, y, 1);
          }
        }
        break;
      }
      case 2: {
        // Page 3: Hunger (4 Hearts)
        this.drawText(lcd, "HUNGRY", 4, 1);
        this.drawHeartsRow(lcd, petState.hunger);
        break;
      }
      case 3: {
        // Page 4: Happiness (4 Hearts)
        this.drawText(lcd, "HAPPY", 6, 1);
        this.drawHeartsRow(lcd, petState.happiness);
        break;
      }
    }
  }

  static drawHeartsRow(lcd, filledCount) {
    for (let i = 0; i < 4; i++) {
      const sprite = i < filledCount ? SPRITES.HEART_FULL : SPRITES.HEART_EMPTY;
      lcd.drawSprite(1 + i * 8, 8, sprite);
    }
  }

  /**
   * Renders the real-time 24-hour clock screen.
   */
  static renderClock(lcd, now = new Date()) {
    lcd.clear();
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    const blinkColon = now.getSeconds() % 2 === 0 ? ':' : ' ';
    this.drawText(lcd, "TIME", 8, 2);
    this.drawText(lcd, `${hours}${blinkColon}${mins}`, 6, 9);
  }
}
