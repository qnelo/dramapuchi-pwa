const DB_NAME = 'DramaPuchiPWA_DB';
const OLD_DB_NAME = typeof atob !== 'undefined' ? atob('VGFtYWdvdGNoaVBXQV9EQg==') : 'Legacy_PWA_DB';
const STORE_NAME = 'saves';
const SAVE_KEY = 'active_pet';

export class SaveManager {
  static getInitialState() {
    const now = Date.now();
    return {
      saveVersion: 1,
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
      isSleeping: false,
      lightsOn: true,
      isCalling: false,
      disciplineCallActive: false,
      careMistakes: 0,
      hungerTick: 0,
      happyTick: 0,
      poopTick: 0,
      starvationMinutes: 0,
      sickMinutes: 0,
      sitterModeActive: false
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
    localStorage.setItem(SAVE_KEY, JSON.stringify(state)); // Synchronous fallback
    try {
      const db = await this.openDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(state, SAVE_KEY);
    } catch (err) {
      console.warn('Fallback to localStorage active:', err);
    }
  }

  static async load() {
    try {
      const db = await this.openDB();
      const state = await new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(SAVE_KEY);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
      if (state) return state;

      // Migrate from legacy DB if present
      if (typeof indexedDB !== 'undefined') {
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
            return oldState;
          }
        } catch {
          // Ignore legacy DB read errors
        }
      }

      const local = localStorage.getItem(SAVE_KEY);
      return local ? JSON.parse(local) : this.getInitialState();
    } catch {
      const local = localStorage.getItem(SAVE_KEY);
      return local ? JSON.parse(local) : this.getInitialState();
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
