import { PetEngine } from './engine/timeEngine.js';
import { LcdMatrix } from './ui/LcdMatrix.js';
import { RetroAudio } from './audio/RetroAudio.js?v=23';
import { MenuController } from './controllers/MenuController.js';
import { SaveManager } from './storage/SaveManager.js';
import { GameRenderer } from './ui/GameRenderer.js';
import { UI_MODE } from './constants/menu.js';
import { TRANSLATIONS, detectLanguage } from './constants/i18n.js';
import { SPRITES } from './ui/sprites.js';

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
  PetEngine.reconcile(state, Date.now());

  // 3. Initialize LCD matrix and audio synthesizer
  const canvas = document.getElementById('lcdScreen');
  lcd = new LcdMatrix(canvas);
  applyLcdPalette();
  audio = new RetroAudio();

  // 4. Initialize menu controller
  menu = new MenuController(state, audio, () => updateIconBezel());

  // 5. Bind hardware buttons and keyboard listeners
  setupInputListeners();

  // 6. Bind QoL toolbar and language selector
  setupQolListeners();

  // 7. Apply detected / stored translations
  applyTranslations(currentLang);
  renderEvolutionSprites();

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
      PetEngine.reconcile(state, Date.now());
    }
  });

  // 60 FPS animation loop
  requestAnimationFrame(gameLoop);

  // 9. Register offline-first Service Worker & handle PWA updates
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').then((reg) => {
      setupServiceWorkerUpdates(reg);
      reg.update().catch(() => {});
    }).catch(err => {
      console.warn('Service Worker registration skipped/failed:', err);
    });
  }
}

function setupServiceWorkerUpdates(reg) {
  const toast = document.getElementById('update-toast');
  const btnReload = document.getElementById('btn-update-reload');
  const btnDismiss = document.getElementById('btn-update-dismiss');

  let waitingWorker = null;

  const showToast = (worker) => {
    waitingWorker = worker;
    if (toast) {
      toast.classList.remove('hidden');
    }
  };

  if (btnDismiss) {
    btnDismiss.addEventListener('click', () => {
      if (toast) {
        toast.classList.add('hidden');
      }
    });
  }

  if (btnReload) {
    btnReload.addEventListener('click', () => {
      const t = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
      btnReload.disabled = true;
      btnReload.textContent = (t.update && t.update.updating) ? t.update.updating : '...';

      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });

      const target = waitingWorker || reg.waiting;
      if (target) {
        target.postMessage({ type: 'SKIP_WAITING' });
      } else {
        window.location.reload();
      }

      // Safeguard reload in case controllerchange doesn't fire
      setTimeout(() => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      }, 1500);
    });
  }

  // Case 1: If there is already a waiting service worker
  if (reg.waiting && navigator.serviceWorker.controller) {
    showToast(reg.waiting);
  }

  // Case 2: Listen for newly installed workers
  reg.addEventListener('updatefound', () => {
    const installingWorker = reg.installing;
    if (!installingWorker) return;

    installingWorker.addEventListener('statechange', () => {
      if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
        showToast(installingWorker);
      }
    });
  });

  // Check for updates whenever user returns to the app
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      reg.update().catch(() => {});
    }
  });

  window.addEventListener('focus', () => {
    reg.update().catch(() => {});
  });

  // Check periodically (every 30 minutes)
  setInterval(() => {
    reg.update().catch(() => {});
  }, 30 * 60 * 1000);
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
      renderEvolutionSprites();
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
      localStorage.setItem('dramapuchi_lang', currentLang);
      applyTranslations(currentLang);
      audio.playClick();
    });
  }

  // Puchi Sitter Mode Toggle
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

function renderEvolutionSprites() {
  const mapping = [
    { id: 'canvas-evo-babypuchi', legacyId: 'canvas-evo-babytchi', sprite: SPRITES.BABYPUCHI_IDLE },
    { id: 'canvas-evo-rolli', legacyId: 'canvas-evo-marutchi', sprite: SPRITES.ROLLI_IDLE },
    { id: 'canvas-evo-chirpy', legacyId: 'canvas-evo-tamatchi', sprite: SPRITES.CHIRPY_IDLE },
    { id: 'canvas-evo-pouty', legacyId: 'canvas-evo-kuchitamatchi', sprite: SPRITES.POUTY_IDLE },
    { id: 'canvas-evo-smarty', legacyId: 'canvas-evo-mametchi', sprite: SPRITES.SMARTY_IDLE },
    { id: 'canvas-evo-pingu', legacyId: 'canvas-evo-ginjirotchi', sprite: SPRITES.PINGU_IDLE },
    { id: 'canvas-evo-shadow', legacyId: 'canvas-evo-maskutchi', sprite: SPRITES.SHADOW_IDLE },
    { id: 'canvas-evo-chompy', legacyId: 'canvas-evo-kuchipatchi', sprite: SPRITES.CHOMPY_IDLE },
    { id: 'canvas-evo-noodle', legacyId: 'canvas-evo-nyorotchi', sprite: SPRITES.NOODLE_IDLE },
    { id: 'canvas-evo-divalips', legacyId: 'canvas-evo-tarakotchi', sprite: SPRITES.DIVALIPS_IDLE },
    { id: 'canvas-evo-departed', sprite: SPRITES.DEPARTED_UFO }
  ];

  for (const item of mapping) {
    const canvas = document.getElementById(item.id) || (item.legacyId ? document.getElementById(item.legacyId) : null);
    if (!canvas || !item.sprite) continue;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 16, 16);
    ctx.fillStyle = '#1b2416';
    for (let y = 0; y < 16; y++) {
      const row = item.sprite[y];
      for (let x = 0; x < 16; x++) {
        if (row && row[x] === '1') {
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
  }
}

function applyTranslations(lang) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  document.documentElement.lang = lang;
  document.documentElement.dir = (lang === 'ar' ? 'rtl' : 'ltr');
  document.title = t.title;

  const setElText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  // Top floating buttons
  if (t.topControls) {
    const cleanLabel = (s) => (s || '').replace(/[\p{Extended_Pictographic}\uFE0F]/gu, '').trim();
    setElText('txt-settings-open', cleanLabel(t.topControls.settings));
    setElText('txt-manual-open', cleanLabel(t.topControls.manual));
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

  // Evolution Matrix
  setElText('manual-sec-evolution-title', t.manual.evolutionHeader);
  setElText('manual-evolution-desc', t.manual.evolutionDesc);
  setElText('manual-evo-early-title', t.manual.evoEarlyTitle);
  setElText('manual-evo-baby-desc', t.manual.evoBabyDesc);
  setElText('manual-evo-child-desc', t.manual.evoChildDesc);
  setElText('manual-evo-branch-a-title', t.manual.evoBranchATitle);
  setElText('manual-evo-chirpy-desc', t.manual.evoChirpyDesc || t.manual.evoTamatchiDesc);
  setElText('manual-evo-tamatchi-desc', t.manual.evoChirpyDesc || t.manual.evoTamatchiDesc);
  setElText('manual-evo-smarty-desc', t.manual.evoSmartyDesc || t.manual.evoMametchiDesc);
  setElText('manual-evo-mametchi-desc', t.manual.evoSmartyDesc || t.manual.evoMametchiDesc);
  setElText('manual-evo-pingu-desc', t.manual.evoPinguDesc || t.manual.evoGinjirotchiDesc);
  setElText('manual-evo-ginjirotchi-desc', t.manual.evoPinguDesc || t.manual.evoGinjirotchiDesc);
  setElText('manual-evo-shadow-desc', t.manual.evoShadowDesc || t.manual.evoMaskutchiDesc);
  setElText('manual-evo-maskutchi-desc', t.manual.evoShadowDesc || t.manual.evoMaskutchiDesc);
  setElText('manual-evo-branch-b-title', t.manual.evoBranchBTitle);
  setElText('manual-evo-pouty-desc', t.manual.evoPoutyDesc || t.manual.evoKuchitamatchiDesc);
  setElText('manual-evo-kuchitamatchi-desc', t.manual.evoPoutyDesc || t.manual.evoKuchitamatchiDesc);
  setElText('manual-evo-chompy-desc', t.manual.evoChompyDesc || t.manual.evoKuchipatchiDesc);
  setElText('manual-evo-kuchipatchi-desc', t.manual.evoChompyDesc || t.manual.evoKuchipatchiDesc);
  setElText('manual-evo-noodle-desc', t.manual.evoNoodleDesc || t.manual.evoNyorotchiDesc);
  setElText('manual-evo-nyorotchi-desc', t.manual.evoNoodleDesc || t.manual.evoNyorotchiDesc);
  setElText('manual-evo-divalips-desc', t.manual.evoDivalipsDesc || t.manual.evoTarakotchiDesc);
  setElText('manual-evo-tarakotchi-desc', t.manual.evoDivalipsDesc || t.manual.evoTarakotchiDesc);
  setElText('manual-evo-departure-title', t.manual.evoDepartureTitle);
  setElText('manual-evo-departed-name', t.manual.evoDepartedName);
  setElText('manual-evo-departed-desc', t.manual.evoDepartedDesc);

  setElText('manual-sec-install-title', t.manual.installHeader);
  setElText('manual-install-android', t.manual.installAndroid);
  setElText('manual-install-ios', t.manual.installIos);

  setElText('manual-sec-credits-title', t.manual.creditsHeader);
  setElText('manual-credits-author-label', t.manual.creditsAuthorLabel);
  setElText('manual-credits-repo-label', t.manual.creditsRepoLabel);
  document.querySelectorAll('[data-stage]').forEach((el) => { el.textContent = t.manual.stages[el.dataset.stage]; });

  // Update notification toast
  if (t.update) {
    setElText('update-toast-text', t.update.available);
    const btnReload = document.getElementById('btn-update-reload');
    if (btnReload && !btnReload.disabled) {
      setElText('btn-update-reload', t.update.action);
    }
  }
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
  PetEngine.reconcile(state, Date.now());

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
