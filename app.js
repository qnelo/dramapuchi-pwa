import { TamagotchiEngine } from './engine/timeEngine.js';
import { LcdMatrix } from './ui/LcdMatrix.js';
import { TamagotchiAudio } from './audio/TamagotchiAudio.js?v=28';
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
  applyLcdPalette();
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
    navigator.serviceWorker.register('./sw.js').then((reg) => {
      reg.update();
    }).catch(err => {
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
  const btnSettingsOpen = document.getElementById('btn-settings-open');
  const btnCloseSettings = document.getElementById('btn-close-settings');
  const modalSettings = document.getElementById('modal-settings');

  const btnManualOpen = document.getElementById('btn-manual-open');
  const btnCloseManual = document.getElementById('btn-close-manual');
  const modalManual = document.getElementById('modal-manual');

  const settingLang = document.getElementById('setting-lang');
  const settingSitter = document.getElementById('setting-sitter');
  const settingBacklight = document.getElementById('setting-backlight');
  const settingSound = document.getElementById('setting-sound');
  const settingExport = document.getElementById('setting-export');
  const settingImport = document.getElementById('setting-import');
  const settingReset = document.getElementById('setting-reset');
  const fileImport = document.getElementById('file-import');

  // Open & Close Settings Modal
  if (btnSettingsOpen && modalSettings) {
    btnSettingsOpen.addEventListener('click', () => {
      audio.init();
      modalSettings.showModal();
      audio.playConfirm();
    });
  }
  if (btnCloseSettings && modalSettings) {
    btnCloseSettings.addEventListener('click', () => {
      modalSettings.close();
      audio.playCancel();
    });
  }

  // Open & Close Manual Modal
  if (btnManualOpen && modalManual) {
    btnManualOpen.addEventListener('click', () => {
      audio.init();
      modalManual.showModal();
      audio.playConfirm();
    });
  }
  if (btnCloseManual && modalManual) {
    btnCloseManual.addEventListener('click', () => {
      modalManual.close();
      audio.playCancel();
    });
  }

  // Light-dismiss fallback for modern dialogs (click on backdrop closes modal)
  const bindBackdropDismiss = (modalEl) => {
    if (!modalEl || ('closedBy' in HTMLDialogElement.prototype)) return;
    modalEl.addEventListener('click', (event) => {
      if (event.target !== modalEl) return;
      const rect = modalEl.getBoundingClientRect();
      const isInside = (
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width
      );
      if (!isInside) {
        modalEl.close();
        audio.playCancel();
      }
    });
  };
  bindBackdropDismiss(modalSettings);
  bindBackdropDismiss(modalManual);

  // Language selector
  if (settingLang) {
    settingLang.value = currentLang;
    settingLang.addEventListener('change', (e) => {
      currentLang = e.target.value;
      localStorage.setItem('tama_lang', currentLang);
      applyTranslations(currentLang);
      audio.playClick();
    });
  }

  // Tama Sitter Mode Toggle
  if (settingSitter) {
    settingSitter.addEventListener('click', async () => {
      if (!state) return;
      state.sitterModeActive = !state.sitterModeActive;
      await SaveManager.save(state);
      updateSettingsUI();
      audio.playConfirm();
      if (menu) menu.triggerHaptic(30);
    });
  }

  // LED Backlight Toggle
  if (settingBacklight) {
    settingBacklight.addEventListener('click', () => {
      const nextTheme = lcd.currentTheme === 'classic' ? 'backlight' : 'classic';
      lcd.setTheme(nextTheme);
      applyLcdPalette();
      updateSettingsUI();
      audio.playClick();
    });
  }

  // Audio Sound Mute Toggle
  if (settingSound) {
    settingSound.addEventListener('click', () => {
      audio.setMute(!audio.muted);
      updateSettingsUI();
    });
  }

  // Export JSON Save Data
  if (settingExport) {
    settingExport.addEventListener('click', () => {
      SaveManager.exportToFile(state);
      audio.playConfirm();
    });
  }

  // Import JSON Save Data
  if (settingImport && fileImport) {
    settingImport.addEventListener('click', () => fileImport.click());
    fileImport.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const loaded = await SaveManager.importFromFile(file);
        state = loaded;
        menu = new MenuController(state, audio, () => updateIconBezel());
        updateSettingsUI();
        audio.playConfirm();
      } catch (err) {
        const t = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
        alert(t.dialogs.importError + err.message);
      }
      fileImport.value = '';
    });
  }

  // Hatch New Egg / Reset
  if (settingReset) {
    settingReset.addEventListener('click', async () => {
      const t = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
      if (state.stage !== 'DEAD' && state.stage !== 'DEPARTED') {
        const ok = confirm(t.dialogs.confirmReset);
        if (!ok) return;
      }
      state = SaveManager.getInitialState();
      await SaveManager.save(state);
      menu = new MenuController(state, audio, () => updateIconBezel());
      updateSettingsUI();
      audio.playEvolution();
      if (modalSettings) modalSettings.close();
    });
  }
}

function applyTranslations(lang) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  document.documentElement.lang = lang;
  document.title = t.title;

  const setElText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  // Top floating buttons
  if (t.topControls) {
    setElText('txt-settings-open', t.topControls.settings.replace(/[^a-zA-Z\u4e00-\u9fa5\u00C0-\u017F ]/g, '').trim());
    setElText('txt-manual-open', t.topControls.manual.replace(/[^a-zA-Z\u4e00-\u9fa5\u00C0-\u017F ]/g, '').trim());
  }

  // Settings modal labels
  const settingLang = document.getElementById('setting-lang');
  if (settingLang) settingLang.value = lang;

  if (t.settings) {
    setElText('settings-title', t.settings.title);
    setElText('setting-lang-label', t.settings.langLabel);
    setElText('setting-sitter-header', t.settings.sitterHeader);
    setElText('setting-display-header', t.settings.displayHeader);
    setElText('setting-audio-header', t.settings.audioHeader);
    setElText('setting-data-header', t.settings.dataHeader);
    setElText('setting-export', t.settings.export);
    setElText('setting-import', t.settings.import);
    setElText('setting-reset', t.settings.reset);
  }

  // Update bezel icon tooltips/titles
  for (let i = 0; i < 8; i++) {
    const iconEl = document.getElementById(`icon-${i}`);
    if (iconEl && t.icons[i]) {
      iconEl.title = t.icons[i];
    }
  }

  updateSettingsUI();

  // Update instruction manual modal content
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

  setElText('manual-sec-install-title', t.manual.installHeader);
  setElText('manual-install-android', t.manual.installAndroid);
  setElText('manual-install-ios', t.manual.installIos);
}

function updateSettingsUI() {
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.en;

  const settingSitter = document.getElementById('setting-sitter');
  if (settingSitter && state && t.settings) {
    const isActive = Boolean(state.sitterModeActive);
    settingSitter.textContent = isActive ? t.settings.sitterOn : t.settings.sitterOff;
    settingSitter.style.borderColor = isActive ? '#5bfec8' : '#434754';
    settingSitter.style.background = isActive ? 'rgba(91, 254, 200, 0.14)' : '';
  }

  const settingBacklight = document.getElementById('setting-backlight');
  if (settingBacklight && lcd && t.settings) {
    const isBacklight = lcd.currentTheme === 'backlight';
    settingBacklight.textContent = isBacklight ? t.settings.backlightClassic : t.settings.backlightNight;
    settingBacklight.style.borderColor = isBacklight ? '#5bfec8' : '#434754';
  }

  const settingSound = document.getElementById('setting-sound');
  if (settingSound && audio && t.settings) {
    settingSound.textContent = audio.muted ? t.settings.soundOff : t.settings.soundOn;
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

// Icon segments sit on the same LCD glass as the dot matrix, so they share its palette
function applyLcdPalette() {
  const p = lcd.palettes[lcd.currentTheme];
  const glass = document.querySelector('.lcd-well');
  glass.style.setProperty('--lcd-bg', p.bg);
  glass.style.setProperty('--lcd-on', p.pixelOn);
  glass.dataset.theme = lcd.currentTheme;
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
