const DB_NAME = 'DramaPuchiPWA_DB';
const OLD_DB_NAME = typeof atob !== 'undefined' ? atob('VGFtYWdvdGNoaVBXQV9EQg==') : 'Legacy_PWA_DB';
const STORE_NAME = 'saves';
const SAVE_KEY = 'active_pet';
const GEN2_KEY = 'dramapuchi_gen2_unlocked';
const memoryFallback = {};

export class SaveManager {
  static isGen2Unlocked() {
    try {
      if (typeof localStorage !== 'undefined') {
        const val = localStorage.getItem(GEN2_KEY);
        if (val !== null) return val === 'true';
      }
    } catch {}
    return Boolean(memoryFallback[GEN2_KEY]);
  }

  static setGen2Unlocked(unlocked = true) {
    memoryFallback[GEN2_KEY] = Boolean(unlocked);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(GEN2_KEY, unlocked ? 'true' : 'false');
      }
    } catch {}
  }

  static getInitialState(generation = 1) {
    const now = Date.now();
    const unlocked = this.isGen2Unlocked();
    return {
      saveVersion: 2,
      generation: Number(generation) || 1,
      gen2Unlocked: unlocked,
      stage: 'EGG',
      species: 'EGG',
      bornTimestamp: now,
      lastTickTimestamp: now,
      ageMinutes: 0,
      hunger: 0,
      happiness: 0,
      discipline: 0,
      weight: 5,
      poopCount: 0,
      isSick: false,
      sickDosesNeeded: 1,
      isSleeping: false,
      lightsOn: true,
      isCalling: false,
      callReason: null,
      callTimer: 0,
      neglectTimer: 0,
      lightMistakeTimer: 0,
      disciplineCallActive: false,
      disciplineCallTimer: 0,
      careMistakes: 0,
      teenCareMistakes: 0,
      adultCareMistakes: 0,
      hungerTick: 0,
      happyTick: 0,
      poopTick: 0,
      starvationMinutes: 0,
      sickMinutes: 0,
      sitterModeActive: false,
      snacksFedRow: 0
    };
  }

  static openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  static async save(state) {
    if (state?.gen2Unlocked) {
      this.setGen2Unlocked(true);
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state)); // Synchronous fallback
    }
    try {
      const db = await this.openDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(state, SAVE_KEY);
    } catch (err) {
      // Fallback to localStorage active
    }
  }

  static async load() {
    try {
      let state = null;
      if (typeof indexedDB !== 'undefined') {
        const db = await this.openDB();
        state = await new Promise((resolve) => {
          const tx = db.transaction(STORE_NAME, 'readonly');
          const req = tx.objectStore(STORE_NAME).get(SAVE_KEY);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => resolve(null);
        });
      }

      // Migrate from legacy DB if present
      if (!state && typeof indexedDB !== 'undefined') {
        try {
          const oldState = await new Promise((resolve) => {
            const req = indexedDB.open(OLD_DB_NAME, 1);
            req.onsuccess = (e) => {
              const oldDb = e.target.result;
              if (!oldDb.objectStoreNames.contains(STORE_NAME)) {
                oldDb.close();
                return resolve(null);
              }
              const tx = oldDb.transaction(STORE_NAME, 'readonly');
              const getReq = tx.objectStore(STORE_NAME).get(SAVE_KEY);
              getReq.onsuccess = () => {
                const res = getReq.result;
                oldDb.close();
                resolve(res || null);
              };
              getReq.onerror = () => {
                oldDb.close();
                resolve(null);
              };
            };
            req.onerror = () => resolve(null);
          });
          if (oldState) {
            await this.save(oldState);
            state = oldState;
          }
        } catch {
          // Ignore legacy DB read errors
        }
      }

      if (!state && typeof localStorage !== 'undefined') {
        const local = localStorage.getItem(SAVE_KEY);
        state = local ? JSON.parse(local) : null;
      }

      if (!state) {
        state = this.getInitialState();
      } else {
        // Upgrade fields if missing
        state.generation = state.generation || 1;
        state.gen2Unlocked = state.gen2Unlocked || this.isGen2Unlocked();
      }
      return state;
    } catch {
      const local = typeof localStorage !== 'undefined' ? localStorage.getItem(SAVE_KEY) : null;
      const state = local ? JSON.parse(local) : this.getInitialState();
      state.generation = state.generation || 1;
      state.gen2Unlocked = state.gen2Unlocked || this.isGen2Unlocked();
      return state;
    }
  }

  /**
   * Exports the current state into a portable .json backup file.
   */
  static exportToFile(state) {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dramapuchi_backup_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Imports and validates a .json save file from the device file selector.
   */
  static importFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const parsed = JSON.parse(e.target.result);
          if (!parsed.stage || !parsed.bornTimestamp) {
            throw new Error('Invalid save file format');
          }
          parsed.lastTickTimestamp = Date.now();
          parsed.generation = parsed.generation || 1;
          parsed.gen2Unlocked = parsed.gen2Unlocked || this.isGen2Unlocked();
          await this.save(parsed);
          resolve(parsed);
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsText(file);
    });
  }
}
