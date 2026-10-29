import { SaveManager } from './SaveManager.js';

const TOKEN_KEY = 'dramapuchi_google_token';
const USER_KEY = 'dramapuchi_google_user';
const REV_KEY = 'dramapuchi_cloud_rev';
const LAST_SYNC_KEY = 'dramapuchi_last_sync_time';
const SYNC_DEBOUNCE_MS = 180000; // 3 minutes debounce in activity

export class CloudSyncManager {
  constructor(options = {}) {
    this.clientId = options.clientId || '488546893397-sepvb33kiclnkn6afl0j4lpp9rrdte9k.apps.googleusercontent.com';
    this.onStateLoaded = options.onStateLoaded || (() => {});
    this.onStatusChange = options.onStatusChange || (() => {});
    this.onConflict = options.onConflict || null;

    this.token = null;
    this.user = null;
    this.currentRev = 1;
    this.isDirty = false;
    this.debounceTimer = null;
    this.latestState = null;
    this.isSyncing = false;

    this.initStorage();
  }

  initStorage() {
    try {
      if (typeof localStorage !== 'undefined') {
        this.token = localStorage.getItem(TOKEN_KEY) || null;
        const userJson = localStorage.getItem(USER_KEY);
        this.user = userJson ? JSON.parse(userJson) : null;
        this.currentRev = Number(localStorage.getItem(REV_KEY)) || 1;
      }
    } catch {
      // LocalStorage restricted or fallback
    }
  }

  isAuthenticated() {
    return Boolean(this.token && this.user);
  }

  getUser() {
    return this.user;
  }

  getLastSyncTime() {
    try {
      if (typeof localStorage !== 'undefined') {
        const t = localStorage.getItem(LAST_SYNC_KEY);
        return t ? Number(t) : null;
      }
    } catch {}
    return null;
  }

  setLastSyncTime(ts) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(LAST_SYNC_KEY, String(ts));
      }
    } catch {}
  }

  setRev(rev) {
    this.currentRev = Number(rev) || 1;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(REV_KEY, String(this.currentRev));
      }
    } catch {}
  }

  static isSamePet(stateA, stateB) {
    if (!stateA || !stateB) return false;
    return (
      stateA.bornTimestamp === stateB.bornTimestamp &&
      (Number(stateA.generation) || 1) === (Number(stateB.generation) || 1)
    );
  }

  static isLocalAheadOrEqual(localState, cloudState) {
    if (!localState || !cloudState) return false;
    if (!CloudSyncManager.isSamePet(localState, cloudState)) return false;
    const localTime = Number(localState.lastTickTimestamp) || 0;
    const cloudTime = Number(cloudState.lastTickTimestamp) || 0;
    return localTime >= cloudTime;
  }

  static isFreshEgg(state) {
    if (!state) return true;
    return (
      state.stage === 'EGG' &&
      (!state.ageMinutes || state.ageMinutes === 0) &&
      (!state.hunger || state.hunger === 0) &&
      (!state.happiness || state.happiness === 0)
    );
  }

  static decodeJwtPayload(token) {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4) base64 += '=';
      const json = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  initGoogleClient(containerEl) {
    if (typeof window === 'undefined' || !window.google?.accounts?.id) {
      return;
    }

    const isStandaloneIos = (
      typeof window.navigator !== 'undefined' &&
      Boolean(window.navigator.standalone)
    );

    window.google.accounts.id.initialize({
      client_id: this.clientId,
      callback: (res) => this.handleCredentialResponse(res),
      auto_select: false,
      cancel_on_tap_outside: true,
      ux_mode: isStandaloneIos ? 'redirect' : 'popup',
      login_uri: isStandaloneIos ? `${window.location.origin}/` : undefined
    });

    if (containerEl) {
      containerEl.innerHTML = '';
      window.google.accounts.id.renderButton(containerEl, {
        theme: 'filled_black',
        size: 'medium',
        shape: 'pill',
        text: 'signin_with'
      });
    }
  }

  async handleCredentialResponse(response) {
    if (!response?.credential) return;
    const token = response.credential;
    const payload = CloudSyncManager.decodeJwtPayload(token);
    if (!payload) return;

    this.token = token;
    this.user = {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture
    };

    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(TOKEN_KEY, this.token);
        localStorage.setItem(USER_KEY, JSON.stringify(this.user));
      }
    } catch {}

    this.onStatusChange({ isAuthenticated: true, user: this.user });

    // Initial pull to reconcile or sync upon login
    if (this.latestState) {
      await this.pullAndReconcile(this.latestState);
    }
  }

  disconnect() {
    this.token = null;
    this.user = null;
    this.isDirty = false;
    this.currentRev = 1;
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(REV_KEY);
        localStorage.removeItem(LAST_SYNC_KEY);
      }
    } catch {}
    this.onStatusChange({ isAuthenticated: false, user: null });
  }

  markDirty(state) {
    if (!state) return;
    this.latestState = state;
    this.isDirty = true;

    if (!this.isAuthenticated()) return;

    // Start debounce if not already running
    if (!this.debounceTimer) {
      this.debounceTimer = setTimeout(async () => {
        this.debounceTimer = null;
        if (this.isDirty && this.isAuthenticated()) {
          await this.pushToCloud(this.latestState);
        }
      }, SYNC_DEBOUNCE_MS);
    }
  }

  bindLifecycleEvents() {
    if (typeof document === 'undefined') return;

    // Flush immediately on minimize / visibilitychange / beforeunload
    const flushOnExit = () => {
      if (this.isDirty && this.isAuthenticated() && this.latestState) {
        if (this.debounceTimer) {
          clearTimeout(this.debounceTimer);
          this.debounceTimer = null;
        }
        this.pushImmediateKeepalive(this.latestState);
      }
    };

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        flushOnExit();
      }
    });

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', flushOnExit);
    }
  }

  pushImmediateKeepalive(state) {
    if (!this.token || !state) return;
    try {
      const stateToSave = { ...state, gen2Unlocked: SaveManager.isGen2Unlocked() };
      const body = JSON.stringify({
        state: stateToSave,
        clientRev: this.currentRev
      });
      fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body,
        keepalive: true
      }).then(async (res) => {
        if (res.ok) {
          const data = await res.json().catch(() => null);
          if (data?.rev) {
            this.setRev(data.rev);
            if (data.updatedAt) {
              this.setLastSyncTime(data.updatedAt);
            }
          }
        }
      }).catch(() => {});
      this.isDirty = false;
    } catch {}
  }

  async syncToCloud(state) {
    return this.pushToCloud(state);
  }

  async pullAndReconcile(localState) {
    if (!this.isAuthenticated()) return localState;

    try {
      const res = await fetch('/api/sync', {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (!res.ok) {
        if (res.status === 401) {
          this.disconnect();
        }
        return localState;
      }

      const data = await res.json();
      if (!data.success) return localState;

      if (!data.exists) {
        // No save in cloud yet, push current local state
        await this.pushToCloud(localState, false);
        return localState;
      }

      const cloudState = data.state;
      const cloudRev = Number(data.rev) || 1;
      const localRev = this.currentRev;

      // Permanent account perks (Gen 2 unlock & supporter badge) are cumulative and immutable
      const hasGen2Unlock = Boolean(cloudState?.gen2Unlocked || localState?.gen2Unlocked || SaveManager.isGen2Unlocked());
      const hasDonated = Boolean(cloudState?.hasDonated || localState?.hasDonated);

      if (hasGen2Unlock) {
        SaveManager.setGen2Unlocked(true);
        if (localState) localState.gen2Unlocked = true;
        if (cloudState) cloudState.gen2Unlocked = true;
      }
      if (hasDonated) {
        if (localState) localState.hasDonated = true;
        if (cloudState) cloudState.hasDonated = true;
      }

      // If local device is just a fresh egg, adopt cloud state unconditionally
      if (CloudSyncManager.isFreshEgg(localState)) {
        if (cloudState.gen2Unlocked) SaveManager.setGen2Unlocked(true);
        await SaveManager.save(cloudState);
        this.setRev(cloudRev);
        this.setLastSyncTime(data.updatedAt || Date.now());
        this.isDirty = false;
        this.onStateLoaded(cloudState);
        return cloudState;
      }

      // If cloud revision is less than or equal to local revision,
      // no other device has committed newer changes -> ALWAYS prefer local device!
      if (cloudRev <= localRev) {
        this.setRev(Math.max(localRev, cloudRev));
        this.setLastSyncTime(data.updatedAt || Date.now());
        const localTime = Number(localState.lastTickTimestamp) || 0;
        const cloudTime = Number(cloudState.lastTickTimestamp) || 0;
        if (localTime > cloudTime || this.isDirty) {
          await this.pushToCloud(localState, false);
        }
        return localState;
      }

      // Here cloudRev > localRev: Cloud has a higher revision number.
      // Check if it's the same pet on the same device (e.g. keepalive push on minimize/refresh race)
      if (CloudSyncManager.isSamePet(localState, cloudState)) {
        const localTime = Number(localState.lastTickTimestamp) || 0;
        const cloudTime = Number(cloudState.lastTickTimestamp) || 0;

        if (localTime >= cloudTime) {
          // Local has equal or newer simulation progress on the same pet.
          // Synchronize revision and keep local without prompting conflict!
          this.setRev(cloudRev);
          this.setLastSyncTime(data.updatedAt || Date.now());
          if (localTime > cloudTime || this.isDirty) {
            await this.pushToCloud(localState, true);
          }
          return localState;
        }
      }

      // At this point, either it is a different pet, or cloud is genuinely ahead (e.g. from another device)
      if (this.onConflict) {
        this.onConflict({
          cloudState,
          cloudRev,
          cloudUpdatedAt: data.updatedAt,
          localState,
          resolve: async (choice) => {
            if (choice === 'cloud') {
              if (cloudState.gen2Unlocked) SaveManager.setGen2Unlocked(true);
              await SaveManager.save(cloudState);
              this.setRev(cloudRev);
              this.isDirty = false;
              this.setLastSyncTime(data.updatedAt);
              this.onStateLoaded(cloudState);
            } else {
              // Keep local, overwrite cloud
              this.setRev(cloudRev);
              await this.pushToCloud(localState, true);
            }
          }
        });
        return localState;
      } else {
        // Default: Cloud is newer
        if (cloudState.gen2Unlocked) SaveManager.setGen2Unlocked(true);
        await SaveManager.save(cloudState);
        this.setRev(cloudRev);
        this.setLastSyncTime(data.updatedAt || Date.now());
        this.isDirty = false;
        this.onStateLoaded(cloudState);
        return cloudState;
      }
    } catch (err) {
      console.warn('[CloudSync] Pull failed:', err);
      return localState;
    }
  }

  async pushToCloud(state, force = false) {
    if (!this.isAuthenticated() || !state || this.isSyncing) return;
    this.isSyncing = true;

    try {
      const stateToSave = { ...state, gen2Unlocked: SaveManager.isGen2Unlocked() };
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({
          state: stateToSave,
          clientRev: this.currentRev,
          force
        })
      });

      if (res.status === 409) {
        // Revision conflict
        const conflictData = await res.json();
        const cloudState = conflictData.cloudState;
        const cloudRev = Number(conflictData.cloudRev) || (this.currentRev + 1);

        if (CloudSyncManager.isFreshEgg(state)) {
          // Local is just a fresh egg -> adopt cloud state
          SaveManager.setGen2Unlocked(Boolean(cloudState?.gen2Unlocked));
          await SaveManager.save(cloudState);
          this.setRev(cloudRev);
          this.isDirty = false;
          this.setLastSyncTime(conflictData.cloudUpdatedAt || Date.now());
          this.onStateLoaded(cloudState);
          return;
        }

        // If it is the same pet and local is ahead or equal (minimize-restore / keepalive race):
        if (CloudSyncManager.isSamePet(state, cloudState)) {
          const localTime = Number(state.lastTickTimestamp) || 0;
          const cloudTime = Number(cloudState.lastTickTimestamp) || 0;
          if (localTime >= cloudTime) {
            // Ensure any cloud unlocks (such as Gen 2 via Ko-fi webhook) are preserved
            if (cloudState?.gen2Unlocked) {
              SaveManager.setGen2Unlocked(true);
              state.gen2Unlocked = true;
              state.hasDonated = true;
            }
            // Adopt cloud rev and force push local state
            this.setRev(cloudRev);
            this.isSyncing = false;
            await this.pushToCloud(state, true);
            return;
          }
        }

        if (this.onConflict) {
          this.onConflict({
            cloudState,
            cloudRev,
            cloudUpdatedAt: conflictData.cloudUpdatedAt,
            localState: state,
            resolve: async (choice) => {
              if (choice === 'cloud') {
                if (cloudState.gen2Unlocked) SaveManager.setGen2Unlocked(true);
                await SaveManager.save(cloudState);
                this.setRev(cloudRev);
                this.isDirty = false;
                this.setLastSyncTime(conflictData.cloudUpdatedAt);
                this.onStateLoaded(cloudState);
              } else {
                this.setRev(cloudRev);
                await this.pushToCloud(state, true);
              }
            }
          });
        }
        return;
      }

      if (res.status === 401) {
        this.disconnect();
        return;
      }

      if (res.ok) {
        const data = await res.json();
        this.setRev(Number(data.rev) || (this.currentRev + 1));
        this.setLastSyncTime(data.updatedAt || Date.now());
        this.isDirty = false;
        this.onStatusChange({
          isAuthenticated: true,
          user: this.user,
          lastSyncTime: data.updatedAt
        });
      }
    } catch (err) {
      console.warn('[CloudSync] Push failed:', err);
    } finally {
      this.isSyncing = false;
    }
  }

  static getOrGenerateDonorCode() {
    const KEY = 'dramapuchi_donor_code';
    try {
      if (typeof localStorage !== 'undefined') {
        let saved = localStorage.getItem(KEY);
        if (saved && saved.startsWith('#DP-')) return saved;
        const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
        let code = '#DP-';
        for (let i = 0; i < 4; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        localStorage.setItem(KEY, code);
        return code;
      }
    } catch {}
    return '#DP-7777';
  }

  async verifyDonation({ donorCode = '', transactionId = '', email = '' } = {}) {
    try {
      const headers = {
        'Content-Type': 'application/json'
      };
      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
      }
      const res = await fetch('/api/verify-donation', {
        method: 'POST',
        headers,
        body: JSON.stringify({ donorCode, transactionId, email })
      });
      const data = await res.json();
      return { ok: res.ok, status: res.status, ...data };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }
}
