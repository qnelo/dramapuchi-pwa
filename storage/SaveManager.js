const DB_NAME = 'TamagotchiPWA_DB';
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
    localStorage.setItem(SAVE_KEY, JSON.stringify(state)); // Fallback síncrono
    try {
      const db = await this.openDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(state, SAVE_KEY);
    } catch (err) {
      console.warn('Fallback a localStorage activo:', err);
    }
  }

  static async load() {
    try {
      const db = await this.openDB();
      return await new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(SAVE_KEY);
        req.onsuccess = () => {
          if (req.result) resolve(req.result);
          else {
            const local = localStorage.getItem(SAVE_KEY);
            resolve(local ? JSON.parse(local) : this.getInitialState());
          }
        };
        req.onerror = () => {
          const local = localStorage.getItem(SAVE_KEY);
          resolve(local ? JSON.parse(local) : this.getInitialState());
        };
      });
    } catch {
      const local = localStorage.getItem(SAVE_KEY);
      return local ? JSON.parse(local) : this.getInitialState();
    }
  }

  /**
   * Descarga el estado actual en un archivo .json portátil.
   */
  static exportToFile(state) {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tamagotchi_backup_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Importa y valida un archivo .json desde el selector de archivos del móvil.
   */
  static importFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const parsed = JSON.parse(e.target.result);
          if (!parsed.stage || !parsed.bornTimestamp) {
            throw new Error('Formato de partida inválido');
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
