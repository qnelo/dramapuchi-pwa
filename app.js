import { PetEngine } from './engine/timeEngine.js';
import { SUPPORT_CONFIG } from './config/petConfig.js';
import { LcdMatrix } from './ui/LcdMatrix.js';
import { RetroAudio } from './audio/RetroAudio.js?v=24';
import { MenuController } from './controllers/MenuController.js';
import { SaveManager } from './storage/SaveManager.js';
import { CloudSyncManager } from './storage/CloudSyncManager.js';
import { GameRenderer } from './ui/GameRenderer.js';
import { UI_MODE } from './constants/menu.js';
import { TRANSLATIONS, detectLanguage } from './constants/i18n.js';
import { SPRITES } from './ui/sprites.js';

let state = null;
let lcd = null;
let audio = null;
let menu = null;
let cloudSync = null;
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
  syncGenerationAppearance();
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

  // 7b. Initialize Cloud Sync (Google Auth & Cloudflare D1)
  cloudSync = new CloudSyncManager({
    clientId: (typeof window !== 'undefined' && window.DRAMAPUCHI_GOOGLE_CLIENT_ID) || '488546893397-sepvb33kiclnkn6afl0j4lpp9rrdte9k.apps.googleusercontent.com',
    onStateLoaded: (cloudState) => {
      state = cloudState;
      syncGenerationAppearance();
      menu = new MenuController(state, audio, () => updateIconBezel());
      updateSettingsUI();
      updateCloudSyncUI();
    },
    onStatusChange: () => {
      updateCloudSyncUI();
    },
    onConflict: (conflict) => {
      showConflictModal(conflict);
    }
  });
  cloudSync.bindLifecycleEvents();
  if (cloudSync.isAuthenticated()) {
    cloudSync.pullAndReconcile(state);
  }

  // 8. Start time reconciliation and render loops
  window.addEventListener('resize', () => lcd.resize());

  // Reconcile simulation every second
  setInterval(tickEngine, 1000);

  // Periodic save every 5 seconds
  setInterval(() => {
    SaveManager.save(state);
    if (cloudSync) cloudSync.markDirty(state);
  }, 5000);
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
      updateSettingsUI();
      updateCloudSyncUI();
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

  const btnCloudDisconnect = document.getElementById('btn-cloud-disconnect');
  if (btnCloudDisconnect) {
    btnCloudDisconnect.addEventListener('click', () => {
      if (cloudSync) {
        cloudSync.disconnect();
        updateCloudSyncUI();
        audio.playCancel();
      }
    });
  }

  // Open & Close Manual Modal
  if (btnManualOpen && modalManual) {
    btnManualOpen.addEventListener('click', () => {
      audio.init();
      updateManualUnlockStatus();
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

  // Support Modal & Anti-fraud Verification logic
  const btnSupportOpen = document.getElementById('btn-support-open');
  const btnCloseSupport = document.getElementById('btn-close-support');
  const modalSupport = document.getElementById('modal-support');
  const btnOpenSupportFromSettings = document.getElementById('btn-open-support-from-settings');

  const donorCode = CloudSyncManager.getOrGenerateDonorCode();
  const txtDonorCode = document.getElementById('txt-donor-code');
  if (txtDonorCode) {
    txtDonorCode.textContent = donorCode;
  }

  const updateSupportModalPerkView = () => {
    const isUnlocked = Boolean((state && state.gen2Unlocked) || SaveManager.isGen2Unlocked());
    const badgeUnlocked = document.getElementById('support-badge-unlocked');
    const perkBox = document.getElementById('support-perk-box');
    if (badgeUnlocked) badgeUnlocked.style.display = isUnlocked ? 'flex' : 'none';
    if (perkBox) perkBox.style.display = isUnlocked ? 'none' : 'flex';
  };

  const copyDonorCodeToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(donorCode);
      const txtBtn = document.getElementById('txt-btn-copy-code');
      const t = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
      if (txtBtn) {
        const original = txtBtn.textContent;
        txtBtn.textContent = t.support?.copied || 'Copied!';
        setTimeout(() => {
          txtBtn.textContent = original;
        }, 2000);
      }
    } catch {}
  };

  const setSupportStatus = (msg, type = 'info') => {
    const statusBox = document.getElementById('support-verify-status');
    if (!statusBox) return;
    statusBox.textContent = msg;
    statusBox.className = `support-verify-status ${type}`;
    statusBox.style.display = 'block';
  };

  const handleSuccessfulDonationUnlock = async () => {
    SaveManager.setGen2Unlocked(true);
    if (state) {
      state.gen2Unlocked = true;
      state.hasDonated = true;
      await SaveManager.save(state);
    }
    audio.playEvolution();
    updateSupportModalPerkView();
    updateManualUnlockStatus();
    updateSettingsUI();
    if (cloudSync && cloudSync.isAuthenticated()) {
      await cloudSync.syncToCloud(state);
    }
  };

  const checkDonationVerification = async (options = {}) => {
    const t = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
    setSupportStatus(t.support?.verifying || 'Verifying...', 'info');

    try {
      const res = await cloudSync.verifyDonation(options);
      if (res.ok && res.verified) {
        await handleSuccessfulDonationUnlock();
        setSupportStatus(t.support?.verifySuccess || '✨ Donation confirmed! Generation 2 unlocked!', 'success');
        return true;
      } else if (res.status === 409 || res.error === 'already_claimed') {
        setSupportStatus(t.support?.alreadyClaimed || 'This donation has already been claimed by another account.', 'error');
        return false;
      } else {
        setSupportStatus(t.support?.verifyNotFound || 'No donation found matching this code or ID.', 'error');
        return false;
      }
    } catch {
      setSupportStatus(t.support?.verifyError || 'Error verifying donation.', 'error');
      return false;
    }
  };

  const openSupportModalHandler = () => {
    audio.init();
    updateSupportModalPerkView();
    if (txtDonorCode) txtDonorCode.textContent = donorCode;
    const statusBox = document.getElementById('support-verify-status');
    if (statusBox) statusBox.style.display = 'none';

    modalSupport.showModal();
    audio.playConfirm();

    // Quiet auto-check if not unlocked yet
    if (cloudSync && !state?.gen2Unlocked && !SaveManager.isGen2Unlocked()) {
      cloudSync.verifyDonation({ donorCode }).then((res) => {
        if (res.ok && res.verified) {
          handleSuccessfulDonationUnlock();
          const t = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
          setSupportStatus(t.support?.verifySuccess || '✨ Donation confirmed! Generation 2 unlocked!', 'success');
        }
      }).catch(() => {});
    }
  };

  if (btnSupportOpen && modalSupport) {
    btnSupportOpen.addEventListener('click', openSupportModalHandler);
  }
  if (btnOpenSupportFromSettings && modalSupport) {
    btnOpenSupportFromSettings.addEventListener('click', () => {
      if (modalSettings) modalSettings.close();
      openSupportModalHandler();
    });
  }
  if (btnCloseSupport && modalSupport) {
    btnCloseSupport.addEventListener('click', () => {
      modalSupport.close();
      audio.playCancel();
    });
  }

  // Copy Donor Code button
  const btnCopyDonorCode = document.getElementById('btn-copy-donor-code');
  if (btnCopyDonorCode) {
    btnCopyDonorCode.addEventListener('click', async () => {
      audio.playConfirm();
      await copyDonorCodeToClipboard();
    });
  }

  // Check donation status button
  const btnSupportCheck = document.getElementById('btn-support-check');
  if (btnSupportCheck) {
    btnSupportCheck.addEventListener('click', async () => {
      audio.playConfirm();
      await checkDonationVerification({ donorCode });
    });
  }

  // Redeem ID button
  const btnRedeemId = document.getElementById('btn-redeem-id');
  const inputReceiptId = document.getElementById('input-receipt-id');
  if (btnRedeemId && inputReceiptId) {
    btnRedeemId.addEventListener('click', async () => {
      const txId = (inputReceiptId.value || '').trim();
      if (!txId) {
        inputReceiptId.focus();
        audio.playCancel();
        return;
      }
      audio.playConfirm();
      await checkDonationVerification({ transactionId: txId });
    });
  }

  // Tiers buttons inside Support Modal: copy code to clipboard & open direct Ko-fi item URL
  document.querySelectorAll('.support-tier-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      audio.playConfirm();
      await copyDonorCodeToClipboard();
      const amount = Number(btn.dataset.amount);
      const tier = SUPPORT_CONFIG.TIERS?.find((t) => t.amount === amount);
      const targetUrl = tier?.url || SUPPORT_CONFIG.KOFI_URL || 'https://ko-fi.com/qnelo';
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    });
  });

  const btnKofiCta = document.getElementById('btn-kofi-cta');
  if (btnKofiCta) {
    btnKofiCta.href = SUPPORT_CONFIG.KOFI_URL || 'https://ko-fi.com/qnelo';
    btnKofiCta.addEventListener('click', async () => {
      audio.playConfirm();
      await copyDonorCodeToClipboard();
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
  bindBackdropDismiss(modalSupport);
  bindBackdropDismiss(document.getElementById('modal-conflict'));

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
        syncGenerationAppearance();
        menu = new MenuController(state, audio, () => updateIconBezel());
        updateSettingsUI();
        if (cloudSync) cloudSync.markDirty(state);
        audio.playConfirm();
      } catch (err) {
        const t = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
        alert(t.dialogs.importError + err.message);
      }
      fileImport.value = '';
    });
  }

  // Hatch Selection Modal & Tabs
  const modalHatch = document.getElementById('modal-hatch');
  const btnCloseHatch = document.getElementById('btn-close-hatch');
  const btnHatchGen1 = document.getElementById('btn-hatch-gen1');
  const btnHatchGen2 = document.getElementById('btn-hatch-gen2');

  if (btnCloseHatch && modalHatch) {
    btnCloseHatch.addEventListener('click', () => {
      modalHatch.close();
      audio.playCancel();
    });
  }
  bindBackdropDismiss(modalHatch);

  if (btnHatchGen1) {
    btnHatchGen1.addEventListener('click', async () => {
      if (modalHatch) modalHatch.close();
      await performReset(1);
    });
  }

  if (btnHatchGen2) {
    btnHatchGen2.addEventListener('click', async () => {
      if (modalHatch) modalHatch.close();
      await performReset(2);
    });
  }

  const tabManualGen1 = document.getElementById('tab-manual-gen1');
  const tabManualGen2 = document.getElementById('tab-manual-gen2');
  const manualPaneGen1 = document.getElementById('manual-pane-gen1');
  const manualPaneGen2 = document.getElementById('manual-pane-gen2');

  if (tabManualGen1 && tabManualGen2 && manualPaneGen1 && manualPaneGen2) {
    tabManualGen1.addEventListener('click', () => {
      tabManualGen1.classList.add('active');
      tabManualGen2.classList.remove('active');
      manualPaneGen1.classList.add('active');
      manualPaneGen2.classList.remove('active');
      renderEvolutionSprites();
      audio.playClick();
    });

    tabManualGen2.addEventListener('click', () => {
      tabManualGen2.classList.add('active');
      tabManualGen1.classList.remove('active');
      manualPaneGen2.classList.add('active');
      manualPaneGen1.classList.remove('active');
      updateManualUnlockStatus();
      renderEvolutionSprites();
      audio.playClick();
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
      const isUnlocked = Boolean(state.gen2Unlocked || SaveManager.isGen2Unlocked());
      if (isUnlocked && modalHatch) {
        if (modalSettings) modalSettings.close();
        modalHatch.showModal();
        audio.playConfirm();
      } else {
        await performReset(1);
      }
    });
  }
}

async function performReset(targetGeneration = 1) {
  state = SaveManager.getInitialState(targetGeneration);
  await SaveManager.save(state);
  if (cloudSync) cloudSync.markDirty(state);
  syncGenerationAppearance();
  menu = new MenuController(state, audio, () => updateIconBezel());
  updateSettingsUI();
  audio.playEvolution();
  const modalSettings = document.getElementById('modal-settings');
  if (modalSettings) modalSettings.close();
}

function syncGenerationAppearance() {
  if (!state) return;
  const gen = Number(state.generation) || 1;
  if (lcd) lcd.setGeneration(gen);
  const deviceEl = document.querySelector('.pet-device');
  if (deviceEl) {
    deviceEl.classList.toggle('gen-2', gen === 2);
  }
  updateManualUnlockStatus();
}

function updateManualUnlockStatus() {
  const noteEl = document.getElementById('manual-gen2-unlock-note');
  if (!noteEl) return;
  const isUnlocked = Boolean((state && state.gen2Unlocked) || SaveManager.isGen2Unlocked());
  noteEl.style.display = isUnlocked ? 'none' : 'block';
}

function renderEvolutionSprites() {
  const mapping = [
    // Gen 1
    { id: 'canvas-evo-babypuchi', legacyId: 'canvas-evo-babytchi', sprite: SPRITES.BABYPUCHI_IDLE },
    { id: 'canvas-evo-rolli', legacyId: 'canvas-evo-marutchi', sprite: SPRITES.ROLLI_IDLE },
    { id: 'canvas-evo-chirpy', legacyId: 'canvas-evo-tamatchi', sprite: SPRITES.CHIRPY_IDLE },
    { id: 'canvas-evo-pouty', legacyId: 'canvas-evo-kuchitamatchi', sprite: SPRITES.POUTY_IDLE },
    { id: 'canvas-evo-smarty', legacyId: 'canvas-evo-mametchi', sprite: SPRITES.SMARTY_IDLE },
    { id: 'canvas-evo-pingu', legacyId: 'canvas-evo-ginjirotchi', sprite: SPRITES.PINGU_IDLE },
    { id: 'canvas-evo-shadow', legacyId: 'canvas-evo-maskutchi', sprite: SPRITES.SHADOW_IDLE },
    { id: 'canvas-evo-oldy', sprite: SPRITES.OLDY_IDLE },
    { id: 'canvas-evo-chompy', legacyId: 'canvas-evo-kuchipatchi', sprite: SPRITES.CHOMPY_IDLE },
    { id: 'canvas-evo-noodle', legacyId: 'canvas-evo-nyorotchi', sprite: SPRITES.NOODLE_IDLE },
    { id: 'canvas-evo-divalips', legacyId: 'canvas-evo-tarakotchi', sprite: SPRITES.DIVALIPS_IDLE },
    { id: 'canvas-evo-departed', sprite: SPRITES.DEPARTED_UFO },
    // Gen 2
    { id: 'canvas-evo-snowpuchi', sprite: SPRITES.SNOWPUCHI_IDLE },
    { id: 'canvas-evo-curly', sprite: SPRITES.CURLY_IDLE },
    { id: 'canvas-evo-spiky', sprite: SPRITES.SPIKY_IDLE },
    { id: 'canvas-evo-bunny', sprite: SPRITES.BUNNY_IDLE },
    { id: 'canvas-evo-barky', sprite: SPRITES.BARKY_IDLE },
    { id: 'canvas-evo-beaky', sprite: SPRITES.BEAKY_IDLE },
    { id: 'canvas-evo-kitty', sprite: SPRITES.KITTY_IDLE },
    { id: 'canvas-evo-ducky', sprite: SPRITES.DUCKY_IDLE },
    { id: 'canvas-evo-leggy', sprite: SPRITES.LEGGY_IDLE },
    { id: 'canvas-evo-octo', sprite: SPRITES.OCTO_IDLE },
    { id: 'canvas-evo-flora', sprite: SPRITES.FLORA_IDLE },
    { id: 'canvas-evo-abduction', sprite: SPRITES.UFO_BEAM }
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
    setElText('txt-support-open', cleanLabel(t.topControls.support));
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
    setElText('setting-cloud-header', t.settings.cloudHeader);
    setElText('btn-cloud-disconnect', t.settings.cloudDisconnect);
    setElText('setting-support-header', t.settings.supportHeader);
    setElText('txt-support-settings-btn', t.settings.supportBtn);
  }

  // Support Modal labels
  if (t.support) {
    setElText('support-title', t.support.title);
    setElText('support-desc', t.support.desc);
    setElText('tier-snack-label', t.support.tierSnack);
    setElText('tier-meal-label', t.support.tierMeal);
    setElText('tier-clean-label', t.support.tierClean);
    setElText('tier-game-label', t.support.tierGame);
    setElText('tier-medicine-label', t.support.tierMedicine);
    setElText('txt-kofi-cta', t.support.cta);

    // Anti-fraud and perk elements
    setElText('support-perk-title', t.support.perkTitle);
    setElText('support-perk-unlocked', t.support.perkUnlocked);
    setElText('lbl-donor-code', t.support.donorCodeLabel);
    setElText('txt-btn-copy-code', t.support.copyCode);
    setElText('lbl-code-hint', t.support.codeHint);
    setElText('btn-check-status-label', t.support.checkStatusBtn);
    setElText('lbl-receipt-collapsible', t.support.receiptCollapsible);
    setElText('btn-redeem-label', t.support.redeemBtn);

    const inputReceipt = document.getElementById('input-receipt-id');
    if (inputReceipt && t.support.receiptPlaceholder) {
      inputReceipt.placeholder = t.support.receiptPlaceholder;
    }
  }

  if (t.dialogs) {
    setElText('conflict-title', t.dialogs.conflictTitle);
    setElText('conflict-desc', t.dialogs.conflictDesc);
    setElText('lbl-conflict-cloud', t.dialogs.conflictCloud);
    setElText('lbl-conflict-local', t.dialogs.conflictLocal);
  }

  updateSettingsUI();
  updateCloudSyncUI();

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

  // Evolution Matrix (Gen 1)
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
  setElText('manual-evo-oldy-desc', t.manual.evoOldyDesc || "");
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

  // Manual Tabs
  setElText('tab-manual-gen1', t.manual.tabGen1 || "Generation 1 (1996)");
  setElText('tab-manual-gen2', t.manual.tabGen2 || "Generation 2 (1997)");

  // Hatch Dialog
  if (t.dialogs) {
    setElText('hatch-title', t.dialogs.hatchTitle || "🥚 Hatch New Egg");
    setElText('hatch-prompt', t.dialogs.hatchPrompt || "Select Generation / Selecciona Generación:");
    setElText('lbl-hatch-gen1', t.dialogs.hatchGen1 || "Generation 1 (Classic Red)");
    setElText('lbl-hatch-gen1-sub', t.dialogs.hatchGen1Sub || "Rice/Bread, Candy, Left/Right Game");
    setElText('lbl-hatch-gen2', t.dialogs.hatchGen2 || "Generation 2 (Swirl Yellow)");
    setElText('lbl-hatch-gen2-sub', t.dialogs.hatchGen2Sub || "Burger, Cake, High-Low Game");
  }

  // Generation 2 Manual Section
  setElText('manual-gen2-unlock-note', t.manual.gen2UnlockNote || "");
  updateManualUnlockStatus();
  setElText('manual-gen2-features-title', t.manual.gen2FeaturesTitle || "");
  setElText('manual-gen2-food-desc', t.manual.gen2FoodDesc || "");
  setElText('manual-gen2-game-desc', t.manual.gen2GameDesc || "");
  setElText('manual-gen2-evo-title', t.manual.gen2EvoTitle || "");
  setElText('manual-gen2-early-title', t.manual.gen2EarlyTitle || "");
  setElText('manual-evo-snowpuchi-desc', t.manual.evoSnowpuchiDesc || "");
  setElText('manual-evo-curly-desc', t.manual.evoCurlyDesc || "");
  setElText('manual-gen2-branch-a-title', t.manual.gen2BranchATitle || "");
  setElText('manual-evo-spiky-desc', t.manual.evoSpikyDesc || "");
  setElText('manual-evo-bunny-desc', t.manual.evoBunnyDesc || "");
  setElText('manual-evo-barky-desc', t.manual.evoBarkyDesc || "");
  setElText('manual-evo-beaky-desc', t.manual.evoBeakyDesc || "");
  setElText('manual-evo-kitty-desc', t.manual.evoKittyDesc || "");
  setElText('manual-gen2-branch-b-title', t.manual.gen2BranchBTitle || "");
  setElText('manual-evo-ducky-desc', t.manual.evoDuckyDesc || "");
  setElText('manual-evo-leggy-desc', t.manual.evoLeggyDesc || "");
  setElText('manual-evo-octo-desc', t.manual.evoOctoDesc || "");
  setElText('manual-evo-flora-desc', t.manual.evoFloraDesc || "");
  setElText('manual-gen2-departure-title', t.manual.gen2DepartureTitle || "");
  setElText('manual-gen2-departed-desc', t.manual.gen2DepartedDesc || "");

  setElText('manual-sec-install-title', t.manual.installHeader);
  setElText('manual-install-android', t.manual.installAndroid);
  setElText('manual-install-ios', t.manual.installIos);

  setElText('manual-sec-credits-title', t.manual.creditsHeader);
  setElText('manual-credits-author-label', t.manual.creditsAuthorLabel);
  setElText('manual-credits-repo-label', t.manual.creditsRepoLabel);
  setElText('manual-credits-support-label', t.manual.creditsSupportLabel);
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

function updateCloudSyncUI() {
  if (!cloudSync) return;
  const userRow = document.getElementById('cloud-user-row');
  const userEmail = document.getElementById('cloud-user-email');
  const userAvatar = document.getElementById('cloud-user-avatar');
  const statusText = document.getElementById('cloud-status-text');
  const googleBtnContainer = document.getElementById('google-signin-btn-container');

  const t = TRANSLATIONS[currentLang]?.settings || TRANSLATIONS.en.settings;

  if (cloudSync.isAuthenticated()) {
    const user = cloudSync.getUser();
    if (userRow) userRow.style.display = 'flex';
    if (userEmail) userEmail.textContent = user.email || user.name || 'Google User';
    if (userAvatar) {
      if (user.picture) {
        userAvatar.src = user.picture;
        userAvatar.style.display = 'inline-block';
      } else {
        userAvatar.style.display = 'none';
      }
    }
    if (googleBtnContainer) googleBtnContainer.style.display = 'none';
    const lastSync = cloudSync.getLastSyncTime();
    const timeStr = lastSync ? new Date(lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    if (statusText) {
      statusText.textContent = `${t.cloudSynced || '🟢 Synced'}${timeStr ? ` (${timeStr})` : ''}`;
      statusText.style.color = '#5bfec8';
    }
  } else {
    if (userRow) userRow.style.display = 'none';
    if (googleBtnContainer) googleBtnContainer.style.display = 'flex';
    if (statusText) {
      statusText.textContent = t.cloudDisconnected || '⚪ Not connected';
      statusText.style.color = '#a0a6b5';
    }
    cloudSync.initGoogleClient(googleBtnContainer);
  }
}

function showConflictModal(conflict) {
  const modalConflict = document.getElementById('modal-conflict');
  const lblCloudDetail = document.getElementById('lbl-conflict-cloud-detail');
  const lblLocalDetail = document.getElementById('lbl-conflict-local-detail');
  const btnCloud = document.getElementById('btn-conflict-cloud');
  const btnLocal = document.getElementById('btn-conflict-local');

  if (!modalConflict || !btnCloud || !btnLocal) {
    conflict.resolve('cloud');
    return;
  }

  const cloudDate = conflict.cloudUpdatedAt ? new Date(conflict.cloudUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  const localDate = conflict.localState?.lastTickTimestamp ? new Date(conflict.localState.lastTickTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

  if (lblCloudDetail) {
    lblCloudDetail.textContent = `${conflict.cloudState.species || conflict.cloudState.stage} (Gen ${conflict.cloudState.generation || 1}) - ${cloudDate}`;
  }
  if (lblLocalDetail) {
    lblLocalDetail.textContent = `${conflict.localState.species || conflict.localState.stage} (Gen ${conflict.localState.generation || 1}) - ${localDate}`;
  }

  const onSelectCloud = () => {
    btnCloud.removeEventListener('click', onSelectCloud);
    btnLocal.removeEventListener('click', onSelectLocal);
    modalConflict.close();
    conflict.resolve('cloud');
    if (audio) audio.playConfirm();
  };

  const onSelectLocal = () => {
    btnCloud.removeEventListener('click', onSelectCloud);
    btnLocal.removeEventListener('click', onSelectLocal);
    modalConflict.close();
    conflict.resolve('local');
    if (audio) audio.playConfirm();
  };

  btnCloud.addEventListener('click', onSelectCloud);
  btnLocal.addEventListener('click', onSelectLocal);

  modalConflict.showModal();
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
