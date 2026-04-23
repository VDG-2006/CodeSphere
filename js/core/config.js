/**
 * js/core/config.js
 * CodeSphere Configuration, Secrets, and State Manager
 */

// 1. Firebase Credentials (RESTORED)
export const firebaseConfig = {
  apiKey: 'AIzaSyCmJl9Y_nJ3NRoK5Ha0XH3KUoBqnaboIbs',
  authDomain: 'codesphere-80ae8.firebaseapp.com',
  projectId: 'codesphere-80ae8',
  storageBucket: 'codesphere-80ae8.firebasestorage.app',
  messagingSenderId: '185869657422',
  appId: '1:185869657422:web:f55605a7675a5ae8846a1f',
  measurementId: 'G-X3FTD9SMXG',
};

// 2. AI Mentor Key (RESTORED)
export const GEMINI_API_KEY = 'YOUR_KEY_HERE';

// 3. Backend API Configuration
export const API_BASE = '/api';


// 4. Reactive Config Manager
export const ConfigManager = {
  keys: {
    accounts: 'cs_accounts',
    profile: 'cs_profile',
    appearance: 'cs_appearance',
    sync: 'cs_sync'
  },

  defaults: {
    accounts: { leetcode: '', codeforces: '' },
    profile: { name: '', handle: '', avatar: '', bio: '', socials: { github: '', linkedin: '', x: '' } },
    appearance: { theme: 'dark', accent: 'lc-green', contrast: false, tiers: { rating: true, solved: true, heatmap: true, recent: true } },
    sync: { frequency: 'manual', cooldown: true }
  },

  state: {},

  init() {
    this.load();
  },

  load() {
    Object.keys(this.keys).forEach(category => {
      const saved = localStorage.getItem(this.keys[category]);
      this.state[category] = saved ? JSON.parse(saved) : { ...this.defaults[category] };
    });
  },

  get(category) {
    return JSON.parse(JSON.stringify(this.state[category] || {}));
  },

  set(category, data) {
    this.state[category] = { ...this.state[category], ...data };
  },

  async save() {
    Object.keys(this.keys).forEach(category => {
      localStorage.setItem(this.keys[category], JSON.stringify(this.state[category]));
    });

    window.dispatchEvent(new CustomEvent('cs-settings-update', {
      detail: { config: this.state }
    }));

    this.showToast('Configuration Saved Successfully');
  },

  trackDirty(formState) {
    function stringifyWithSortedKeys(obj) {
      // Helper function to recursively sort the keys
      function sortKeys(item) {
        // Return primitives and null as-is
        if (item === null || typeof item !== 'object') {
          return item;
        }

        // If it's an array, recursively map over its items
        if (Array.isArray(item)) {
          return item.map(sortKeys);
        }

        // If it's a plain object, sort its keys and recreate the object
        const sortedObj = {};
        const sortedKeys = Object.keys(item).sort();

        for (const key of sortedKeys) {
          sortedObj[key] = sortKeys(item[key]);
        }

        return sortedObj;
      }

      // Sort the object, then stringify the deterministic result
      return JSON.stringify(sortKeys(obj));
    }
    return stringifyWithSortedKeys(formState) !== stringifyWithSortedKeys(this.state);
  },

  validateSchema(json) {
    const requiredKeys = Object.keys(this.defaults);
    return requiredKeys.every(k => k in json);
  },

  async importConfig(json) {
    if (this.validateSchema(json)) {
      Object.keys(this.keys).forEach(key => {
        this.state[key] = json[key];
        localStorage.setItem(this.keys[key], JSON.stringify(json[key]));
      });
      window.dispatchEvent(new CustomEvent('cs-settings-update', { detail: { config: this.state } }));
      return true;
    }
    return false;
  },

  exportConfig() {
    const data = JSON.stringify(this.state, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `codesphere-config-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  },

  clearAll() {
    Object.values(this.keys).forEach(k => localStorage.removeItem(k));
    location.reload();
  },

  showToast(msg) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast-success';
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }
};

/**
 * Robust Save Fix: Direct DOM capture and master persistence
 */
export async function saveSettings() {
  const accounts = {
    leetcode: document.getElementById('set-lc-handle')?.value || '',
    codeforces: document.getElementById('set-cf-handle')?.value || ''
  };

  const profile = {
    name: document.getElementById('set-display-name')?.value || '',
    avatar: document.getElementById('set-avatar-url')?.value || '',
    bio: document.getElementById('set-bio')?.value || ''
  };

  const appearance = {
    accent: document.getElementById('set-accent-color')?.value || 'lc-green',
    contrast: document.getElementById('set-high-contrast')?.checked || false,
    theme: document.getElementById('set-ui-theme')?.value || 'dark',
    tiers: {
      rating: document.getElementById('tier-show-rating')?.checked ?? true,
      solved: document.getElementById('tier-show-solved')?.checked ?? true,
      heatmap: document.getElementById('tier-show-heatmap')?.checked ?? true,
      recent: document.getElementById('tier-show-recent')?.checked ?? true
    }
  };

  const masterConfig = {
    accounts,
    profile,
    appearance,
    sync: { frequency: 'manual', cooldown: document.getElementById('set-cooldown-enabled')?.checked ?? true }
  };

  // 1. Master Persistence
  localStorage.setItem('cs_master_config', JSON.stringify(masterConfig));
  localStorage.setItem('cs_cached_username', accounts.leetcode);

  // 2. BACKEND PERSISTENCE
  const user = JSON.parse(sessionStorage.getItem('cs_user') || '{}');
  if (user._id) {
    try {
      await fetch(`${API_BASE}/user/handles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user._id, handles: accounts })
      });
      console.log('Backend Synced');
    } catch (e) {
      console.error('Backend Sync Failed', e);
    }
  }

  // 3. Update Internal State
  ConfigManager.state = masterConfig;

  // 4. Dispatch Reactive Event
  window.dispatchEvent(new CustomEvent('cs-settings-update', {
    detail: { config: ConfigManager.state }
  }));

  ConfigManager.showToast('Settings Saved & Synced');
}


/**
 * Hydration Engine: Master Recovery and Init
 */
document.addEventListener('DOMContentLoaded', () => {
  const master = localStorage.getItem('cs_master_config');
  if (master) {
    try {
      const config = JSON.parse(master);

      // A. Populate Inputs
      const mapping = {
        'set-lc-handle': config.accounts?.leetcode,
        'set-cf-handle': config.accounts?.codeforces,
        'set-display-name': config.profile?.name,
        'set-avatar-url': config.profile?.avatar,
        'set-bio': config.profile?.bio,
        'set-accent-color': config.appearance?.accent,
        'set-ui-theme': config.appearance?.theme
      };

      Object.entries(mapping).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el && val !== undefined) el.value = val;
      });

      // B. Populate Checkboxes
      const checks = {
        'set-high-contrast': config.appearance?.contrast,
        'tier-show-rating': config.appearance?.tiers?.rating,
        'tier-show-solved': config.appearance?.tiers?.solved,
        'tier-show-heatmap': config.appearance?.tiers?.heatmap,
        'tier-show-recent': config.appearance?.tiers?.recent,
        'set-cooldown-enabled': config.sync?.cooldown
      };

      Object.entries(checks).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el && val !== undefined) el.checked = val;
      });

      // C. Trigger Dashboard Sync
      ConfigManager.state = config;
      import('../features/dashboard.js').then(m => {
        if (m.dashboard && config.accounts?.leetcode) {
          m.dashboard.syncAllPlatforms(config.accounts.leetcode);
        }
      });

    } catch (e) { console.error('Hydration failed', e); }
  }
});

ConfigManager.init();
