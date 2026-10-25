import { TamagotchiEngine } from './engine/timeEngine.js';
import { LcdMatrix } from './ui/LcdMatrix.js';
import { TamagotchiAudio } from './audio/TamagotchiAudio.js';
import { MenuController } from './controllers/MenuController.js';
import { SaveManager } from './storage/SaveManager.js';
import { GameRenderer } from './ui/GameRenderer.js';
import { UI_MODE } from './constants/menu.js';
import { TRANSLATIONS, detectLanguage } from './constants/i18n.js';

let state = null;
let lcd = null;
let audio = null;
let menu = null;
let lastCallAlertTime = 0;
let currentLang = detectLanguage();

async function init() {
  // 1. Load persistent state
  state = await SaveManager.load();

  // 2. Immediate temporal reconciliation upon launch/reopen
  TamagotchiEngine.reconcile(state, Date.now());

  // 3. Initialize LCD matrix and audio synthesizer
  const canvas = document.getElementById('lcdScreen');
  lcd = new LcdMatrix(canvas);
  audio = new TamagotchiAudio();

  // 4. Initialize menu controller
  menu = new MenuController(state, audio, () => updateIconBezel());

  // 5. Bind hardware buttons and keyboard listeners
  setupInputListeners();

  // 6. Bind QoL toolbar and language selector
  setupQolListeners();

  // 7. Apply detected / stored translations
  applyTranslations(currentLang);

  // 8. Start time reconciliation and render loops
  window.addEventListener('resize', () => lcd.resize());

  // Reconcile simulation every second
  setInterval(tickEngine, 1000);

  // Periodic save every 5 seconds
  setInterval(() => SaveManager.save(state), 5000);
  window.addEventListener('beforeunload', () => SaveManager.save(state));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      SaveManager.save(state);
    } else {
      TamagotchiEngine.reconcile(state, Date.now());
    }
  });

  // 60 FPS animation loop
  requestAnimationFrame(gameLoop);

  // 9. Register offline-first Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(err => {
      console.warn('Service Worker registration skipped/failed:', err);
    });
  }
}

function setupInputListeners() {
  const btnA = document.getElementById('btn-a');
  const btnB = document.getElementById('btn-b');
  const btnC = document.getElementById('btn-c');

  const addPressListener = (el, handler) => {
    let touched = false;
    el.addEventListener('touchstart', (e) => {
      e.preventDefault();
      touched = true;
      audio.init();
      handler();
    }, { passive: false });

    el.addEventListener('click', (e) => {
      if (touched) {
        touched = false;
        return;
      }
      audio.init();
      handler();
    });
  };

  addPressListener(btnA, () => menu.pressA());
  addPressListener(btnB, () => menu.pressB());
  addPressListener(btnC, () => menu.pressC());

  // Desktop keyboard shortcuts (A, B, C / Arrows / Enter / Space / Esc)
  window.addEventListener('keydown', (e) => {
    audio.init();
    if (e.repeat) return;
    const key = e.key.toLowerCase();
    if (key === 'a' || key === 'arrowleft') {
      menu.pressA();
    } else if (key === 'b' || key === 'enter' || key === ' ') {
      menu.pressB();
    } else if (key === 'c' || key === 'escape' || key === 'arrowright') {
      menu.pressC();
    }
  });
}

function setupQolListeners() {
  const selectLang = document.getElementById('select-lang');
  const btnManual = document.getElementById('btn-manual');
  const modalManual = document.getElementById('modal-manual');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const btnSitter = document.getElementById('btn-sitter');
  const btnBacklight = document.getElementById('btn-backlight');
  const btnExport = document.getElementById('btn-export');
  const btnImport = document.getElementById('btn-import');
  const fileImport = document.getElementById('file-import');
  const btnReset = document.getElementById('btn-reset');
  const btnSound = document.getElementById('btn-sound');

  if (selectLang) {
    selectLang.value = currentLang;
    selectLang.addEventListener('change', (e) => {
      currentLang = e.target.value;
      localStorage.setItem('tama_lang', currentLang);
      applyTranslations(currentLang);
      audio.playClick();
    });
  }

  if (btnManual && modalManual) {
    btnManual.addEventListener('click', () => {
      audio.init();
      modalManual.showModal();
      audio.playConfirm();
    });
  }

  if (btnCloseModal && modalManual) {
    btnCloseModal.addEventListener('click', () => {
      modalManual.close();
      audio.playCancel();
    });
  }

  // Light-dismiss fallback (close on backdrop click)
  if (modalManual && !('closedBy' in HTMLDialogElement.prototype)) {
    modalManual.addEventListener('click', (event) => {
      if (event.target !== modalManual) return;
      const rect = modalManual.getBoundingClientRect();
      const isInside = (
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width
      );
      if (!isInside) {
        modalManual.close();
        audio.playCancel();
      }
    });
  }

  if (btnSitter) {
    btnSitter.addEventListener('click', () => {
      state.sitterModeActive = !state.sitterModeActive;
      updateQolButtonsUI();
      SaveManager.save(state);
      audio.playClick();
    });
  }

  if (btnBacklight) {
    btnBacklight.addEventListener('click', () => {
      const nextTheme = lcd.currentTheme === 'classic' ? 'backlight' : 'classic';
      lcd.setTheme(nextTheme);
      updateQolButtonsUI();
      audio.playClick();
    });
  }

  if (btnExport) {
    btnExport.addEventListener('click', () => {
      SaveManager.exportToFile(state);
      audio.playConfirm();
    });
  }

  if (btnImport && fileImport) {
    btnImport.addEventListener('click', () => fileImport.click());
    fileImport.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const loaded = await SaveManager.importFromFile(file);
        state = loaded;
        menu = new MenuController(state, audio, () => updateIconBezel());
        updateQolButtonsUI();
        audio.playConfirm();
      } catch (err) {
        const t = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
        alert(t.dialogs.importError + err.message);
      }
      fileImport.value = '';
    });
  }

  if (btnReset) {
    btnReset.addEventListener('click', async () => {
      const t = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
      if (state.stage !== 'DEAD' && state.stage !== 'DEPARTED') {
        const ok = confirm(t.dialogs.confirmReset);
        if (!ok) return;
      }
      state = SaveManager.getInitialState();
      await SaveManager.save(state);
      menu = new MenuController(state, audio, () => updateIconBezel());
      updateQolButtonsUI();
      audio.playEvolution();
    });
  }

  if (btnSound) {
    btnSound.addEventListener('click', () => {
      audio.setMute(!audio.muted);
      updateQolButtonsUI();
    });
  }
}

function applyTranslations(lang) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  document.documentElement.lang = lang;
  document.title = t.title;

  const selectLang = document.getElementById('select-lang');
  if (selectLang) selectLang.value = lang;

  // Update bezel icon tooltips/titles
  for (let i = 0; i < 8; i++) {
    const iconEl = document.getElementById(`icon-${i}`);
    if (iconEl && t.icons[i]) {
      iconEl.title = t.icons[i];
    }
  }

  // Update bottom toolbar buttons
  const btnManual = document.getElementById('btn-manual');
  if (btnManual) btnManual.textContent = t.toolbar.manual;

  const btnExport = document.getElementById('btn-export');
  if (btnExport) btnExport.textContent = t.toolbar.export;

  const btnImport = document.getElementById('btn-import');
  if (btnImport) btnImport.textContent = t.toolbar.import;

  const btnReset = document.getElementById('btn-reset');
  if (btnReset) btnReset.textContent = t.toolbar.reset;

  updateQolButtonsUI();

  // Update instruction manual modal content
  const setElText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  setElText('manual-title', t.manual.title);
  setElText('manual-sec-buttons-title', t.manual.buttonsHeader);
  setElText('manual-btn-a-desc', t.manual.btnA);
  setElText('manual-btn-b-desc', t.manual.btnB);
  setElText('manual-btn-c-desc', t.manual.btnC);

  setElText('manual-sec-icons-title', t.manual.iconsHeader);
  setElText('manual-icon-0-desc', t.manual.icon0);
  setElText('manual-icon-1-desc', t.manual.icon1);
  setElText('manual-icon-2-desc', t.manual.icon2);
  setElText('manual-icon-3-desc', t.manual.icon3);
  setElText('manual-icon-4-desc', t.manual.icon4);
  setElText('manual-icon-5-desc', t.manual.icon5);
  setElText('manual-icon-6-desc', t.manual.icon6);
  setElText('manual-icon-7-desc', t.manual.icon7);

  setElText('manual-sec-lifecycle-title', t.manual.lifecycleHeader);
  setElText('manual-lifecycle-desc', t.manual.lifecycleDesc);
  setElText('manual-sitter-desc', t.manual.sitterDesc);
}

function updateQolButtonsUI() {
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.en;

  const btnSitter = document.getElementById('btn-sitter');
  if (btnSitter && state) {
    btnSitter.textContent = state.sitterModeActive ? t.toolbar.sitterOn : t.toolbar.sitterOff;
    btnSitter.style.borderColor = state.sitterModeActive ? '#5bfec8' : '#444';
  }

  const btnBacklight = document.getElementById('btn-backlight');
  if (btnBacklight && lcd) {
    const isBacklight = lcd.currentTheme === 'backlight';
    btnBacklight.textContent = isBacklight ? t.toolbar.backlightClassic : t.toolbar.backlightNight;
    btnBacklight.style.borderColor = isBacklight ? '#5bfec8' : '#444';
  }

  const btnSound = document.getElementById('btn-sound');
  if (btnSound && audio) {
    btnSound.textContent = audio.muted ? t.toolbar.soundOff : t.toolbar.soundOn;
  }
}

function tickEngine() {
  if (!state) return;
  TamagotchiEngine.reconcile(state, Date.now());

  // Acoustic alert when the pet calls for attention
  if (state.isCalling && !state.isSleeping && state.stage !== 'DEAD' && state.stage !== 'DEPARTED') {
    const now = Date.now();
    if (now - lastCallAlertTime > 15000) {
      audio.playAttention();
      menu.triggerHaptic(60);
      lastCallAlertTime = now;
    }
  }
}

function updateIconBezel(now = Date.now()) {
  if (!menu || !state) return;

  // Icons 0 to 6: selectable via Button A
  for (let i = 0; i < 7; i++) {
    const iconEl = document.getElementById(`icon-${i}`);
    if (!iconEl) continue;
    if (menu.uiMode === UI_MODE.ICON_SELECT && menu.selectedIcon === i) {
      iconEl.classList.add('active');
    } else {
      iconEl.classList.remove('active');
    }
  }

  // Icon 7: Attention LED (blinks when isCalling is true)
  const iconAttention = document.getElementById('icon-7');
  if (iconAttention) {
    if (state.isCalling && state.stage !== 'DEAD' && state.stage !== 'DEPARTED') {
      const blink = Math.floor(now / 500) % 2 === 0;
      iconAttention.classList.toggle('active', blink);
    } else {
      iconAttention.classList.remove('active');
    }
  }
}

function gameLoop(now) {
  if (lcd && state && menu) {
    updateIconBezel(now);
    GameRenderer.render(lcd, state, menu, now);
    lcd.render();
  }
  requestAnimationFrame(gameLoop);
}

// Initialize application on DOMContentLoaded
window.addEventListener('DOMContentLoaded', init);
