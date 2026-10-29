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
      }).catch(() => {});
      this.isDirty = false;
    } catch {}
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
      this.currentRev = cloudRev;
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(REV_KEY, String(this.currentRev));
        }
      } catch {}

      // If local device is just a fresh egg, adopt cloud state unconditionally
      if (CloudSyncManager.isFreshEgg(localState)) {
        SaveManager.setGen2Unlocked(Boolean(cloudState.gen2Unlocked));
        await SaveManager.save(cloudState);
        this.setLastSyncTime(data.updatedAt || Date.now());
        this.isDirty = false;
        this.onStateLoaded(cloudState);
        return cloudState;
      }

      // If both have active pets, check which one has the newer progress
      const localTime = Number(localState.lastTickTimestamp) || 0;
      const cloudTime = Number(data.updatedAt) || Number(cloudState.lastTickTimestamp) || 0;

      if (cloudTime > localTime) {
        if (this.onConflict) {
          this.onConflict({
            cloudState,
            cloudRev,
            cloudUpdatedAt: data.updatedAt,
            localState,
            resolve: async (choice) => {
              if (choice === 'cloud') {
                SaveManager.setGen2Unlocked(Boolean(cloudState.gen2Unlocked));
                await SaveManager.save(cloudState);
                this.currentRev = cloudRev;
                this.isDirty = false;
                this.setLastSyncTime(data.updatedAt);
                this.onStateLoaded(cloudState);
              } else {
                // Keep local, overwrite cloud
                await this.pushToCloud(localState, true);
              }
            }
          });
          return localState;
        } else {
          // Default: Cloud is newer
          SaveManager.setGen2Unlocked(Boolean(cloudState.gen2Unlocked));
          await SaveManager.save(cloudState);
          this.setLastSyncTime(data.updatedAt || Date.now());
          this.isDirty = false;
          this.onStateLoaded(cloudState);
          return cloudState;
        }
      } else {
        // Local is newer or equal, push to cloud
        await this.pushToCloud(localState, false);
        return localState;
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
        const cloudRev = conflictData.cloudRev;

        if (CloudSyncManager.isFreshEgg(state)) {
          // Local is just a fresh egg -> adopt cloud state
          SaveManager.setGen2Unlocked(Boolean(cloudState?.gen2Unlocked));
          await SaveManager.save(cloudState);
          this.currentRev = cloudRev;
          this.isDirty = false;
          this.setLastSyncTime(conflictData.cloudUpdatedAt || Date.now());
          this.onStateLoaded(cloudState);
        } else if (this.onConflict) {
          this.onConflict({
            cloudState,
            cloudRev,
            cloudUpdatedAt: conflictData.cloudUpdatedAt,
            localState: state,
            resolve: async (choice) => {
              if (choice === 'cloud') {
                SaveManager.setGen2Unlocked(Boolean(cloudState.gen2Unlocked));
                await SaveManager.save(cloudState);
                this.currentRev = cloudRev;
                this.isDirty = false;
                this.setLastSyncTime(conflictData.cloudUpdatedAt);
                this.onStateLoaded(cloudState);
              } else {
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
        this.currentRev = Number(data.rev) || (this.currentRev + 1);
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(REV_KEY, String(this.currentRev));
          }
        } catch {}
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
