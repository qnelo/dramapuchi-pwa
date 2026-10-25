import { TamagotchiEngine } from './engine/timeEngine.js';
import { LcdMatrix } from './ui/LcdMatrix.js';
import { TamagotchiAudio } from './audio/TamagotchiAudio.js';
import { MenuController } from './controllers/MenuController.js';
import { SaveManager } from './storage/SaveManager.js';
import { GameRenderer } from './ui/GameRenderer.js';
import { UI_MODE } from './constants/menu.js';

let state = null;
let lcd = null;
let audio = null;
let menu = null;
let lastCallAlertTime = 0;

async function init() {
  // 1. Cargar estado persistente
  state = await SaveManager.load();

  // 2. Reconciliación temporal inmediata tras reinicio/apertura
  TamagotchiEngine.reconcile(state, Date.now());

  // 3. Inicializar pantalla LCD y Audio
  const canvas = document.getElementById('lcdScreen');
  lcd = new LcdMatrix(canvas);
  audio = new TamagotchiAudio();

  // 4. Inicializar controlador de menús
  menu = new MenuController(state, audio, () => updateIconBezel());

  // 5. Vincular eventos de hardware y teclado
  setupInputListeners();

  // 6. Vincular barra de herramientas QoL
  setupQolListeners();

  // 7. Iniciar bucles de tiempo y renderizado
  window.addEventListener('resize', () => lcd.resize());

  // Reconciliación cada segundo
  setInterval(tickEngine, 1000);

  // Guardado periódico cada 5 segundos
  setInterval(() => SaveManager.save(state), 5000);
  window.addEventListener('beforeunload', () => SaveManager.save(state));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      SaveManager.save(state);
    } else {
      TamagotchiEngine.reconcile(state, Date.now());
    }
  });

  // Bucle de animación 60 FPS
  requestAnimationFrame(gameLoop);

  // 8. Registro de Service Worker PWA
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(err => {
      console.warn('Service Worker registration skipped/failed:', err);
    });
  }

  updateQolButtonsUI();
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

  // Soporte teclado (A, B, C / Flechas / Espacio / Esc)
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

  // Fallback para light-dismiss (cerrar al pulsar el fondo)
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
        alert('Error al importar partida: ' + err.message);
      }
      fileImport.value = '';
    });
  }

  if (btnReset) {
    btnReset.addEventListener('click', async () => {
      if (state.stage !== 'DEAD' && state.stage !== 'DEPARTED') {
        const ok = confirm('¿Deseas reiniciar un nuevo huevo de Tamagotchi?');
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

function updateQolButtonsUI() {
  const btnSitter = document.getElementById('btn-sitter');
  if (btnSitter) {
    btnSitter.textContent = `👶 Modo Niñera: ${state.sitterModeActive ? 'ON' : 'OFF'}`;
    btnSitter.style.borderColor = state.sitterModeActive ? '#5bfec8' : '#444';
  }

  const btnBacklight = document.getElementById('btn-backlight');
  if (btnBacklight && lcd) {
    const isBacklight = lcd.currentTheme === 'backlight';
    btnBacklight.textContent = isBacklight ? '☀️ Modo Clásico' : '🌙 Luz LED';
    btnBacklight.style.borderColor = isBacklight ? '#5bfec8' : '#444';
  }

  const btnSound = document.getElementById('btn-sound');
  if (btnSound && audio) {
    btnSound.textContent = audio.muted ? '🔇 Mudo' : '🔊 Audio';
  }
}

function tickEngine() {
  if (!state) return;
  TamagotchiEngine.reconcile(state, Date.now());

  // Alerta acústica si la mascota llama la atención
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

  // Iconos 0 a 6: seleccionables con el botón A
  for (let i = 0; i < 7; i++) {
    const iconEl = document.getElementById(`icon-${i}`);
    if (!iconEl) continue;
    if (menu.uiMode === UI_MODE.ICON_SELECT && menu.selectedIcon === i) {
      iconEl.classList.add('active');
    } else {
      iconEl.classList.remove('active');
    }
  }

  // Icono 7: Atención (parpadea si isCalling es true)
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

// Iniciar aplicación al cargar el DOM
window.addEventListener('DOMContentLoaded', init);
