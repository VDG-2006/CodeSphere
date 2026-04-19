/**
 * js/core/config.js
 * CodeSphere Configuration, Secrets, and State Manager
 */

// 1. Firebase Credentials (RESTORED)
export const firebaseConfig = {
  apiKey:            'AIzaSyCmJl9Y_nJ3NRoK5Ha0XH3KUoBqnaboIbs',
  authDomain:        'codesphere-80ae8.firebaseapp.com',
  projectId:         'codesphere-80ae8',
  storageBucket:     'codesphere-80ae8.firebasestorage.app',
  messagingSenderId: '185869657422',
  appId:             '1:185869657422:web:f55605a7675a5ae8846a1f',
  measurementId:     'G-X3FTD9SMXG',
};

// 2. AI Mentor Key (RESTORED)
export const GEMINI_API_KEY = 'YOUR_KEY_HERE';

// 3. Reactive Config Manager
export const ConfigManager = {
  keys: {
    accounts: 'cs_accounts',
    profile: 'cs_profile',
    appearance: 'cs_appearance',
    sync: 'cs_sync'
  },

  defaults: {
    accounts: { leetcode: '', codechef: '', codeforces: '' },
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
    return JSON.stringify(formState) !== JSON.stringify(this.state);
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

ConfigManager.init();
