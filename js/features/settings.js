/**
 * js/features/settings.js
 * Settings UI Controller — Tabbed Modal & Reactive Logic
 */

import { ConfigManager } from '../core/config.js';

export const settings = {
  modal: null,
  activeTab: 'accounts',
  formState: {},

  init() {
    this.cacheElements();
    this.setupEventListeners();
    this.syncFormWithConfig();
  },

  cacheElements() {
    this.modal = document.getElementById('settings-modal');
    this.tabs = document.querySelectorAll('.settings-tab');
    this.panes = document.querySelectorAll('.tab-pane');
    this.saveBtn = document.getElementById('settings-save-btn');
    this.closeBtn = document.querySelector('.settings-close-btn');
    this.overlay = document.querySelector('.settings-modal-overlay');
  },

  setupEventListeners() {
    // Modal Control
    document.getElementById('nav-settings-link')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.open();
    });

    document.getElementById('dash-settings-btn')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.open();
    });

    this.closeBtn?.addEventListener('click', () => this.close());
    this.overlay?.addEventListener('click', () => this.close());
    this.saveBtn?.addEventListener('click', () => this.save());

    // Tabs
    this.tabs.forEach(tab => {
      tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
    });

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (!this.modal || !this.modal.classList.contains('active')) return;
      
      if (e.key === 'Escape') this.close();
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        this.save();
      }
    });

    // Verification Buttons
    document.querySelectorAll('.btn-verify').forEach(btn => {
      btn.addEventListener('click', (e) => this.handleVerify(e.target.dataset.platform));
    });

    // Live Preview
    ['set-display-name', 'set-avatar-url'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', () => this.updatePreview());
    });

    // Data Actions
    document.getElementById('btn-export-json')?.addEventListener('click', () => ConfigManager.exportConfig());
    document.getElementById('import-json')?.addEventListener('change', (e) => this.handleImport(e));
    document.getElementById('btn-clear-cache')?.addEventListener('click', () => {
      if (confirm('CAUTION: This will wipe all saved platform handles and profile data. Proceed?')) {
        ConfigManager.clearAll();
      }
    });
  },

  open() {
    this.syncFormWithConfig();
    this.modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    this.updatePreview();
    this.trapFocus();
  },

  close() {
    try {
      this.updateFormState();
      if (ConfigManager.trackDirty(this.formState)) {
        if (!confirm('You have unsaved changes. Discard them?')) return;
      }
    } catch (e) {
      console.warn('Settings: Error during state sync on close', e);
    }
    
    if (this.modal) {
      this.modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  },

  switchTab(tabId) {
    this.activeTab = tabId;
    this.tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tabId));
    this.panes.forEach(p => p.classList.toggle('active', p.id === `tab-${tabId}`));
  },

  syncFormWithConfig() {
    const accounts = ConfigManager.get('accounts');
    const profile = ConfigManager.get('profile');
    const appearance = ConfigManager.get('appearance');
    const sync = ConfigManager.get('sync');

    // Bind to DOM
    if (document.getElementById('set-lc-handle')) document.getElementById('set-lc-handle').value = accounts.leetcode;
    if (document.getElementById('set-cc-handle')) document.getElementById('set-cc-handle').value = accounts.codechef;
    if (document.getElementById('set-cf-handle')) document.getElementById('set-cf-handle').value = accounts.codeforces;

    if (document.getElementById('set-display-name')) document.getElementById('set-display-name').value = profile.name;
    if (document.getElementById('set-avatar-url')) document.getElementById('set-avatar-url').value = profile.avatar;
    if (document.getElementById('set-bio')) document.getElementById('set-bio').value = profile.bio;

    if (document.getElementById('set-ui-theme')) document.getElementById('set-ui-theme').value = appearance.theme;
    if (document.getElementById('set-accent-color')) document.getElementById('set-accent-color').value = appearance.accent;
    if (document.getElementById('set-high-contrast')) document.getElementById('set-high-contrast').checked = appearance.contrast;
    
    if (document.getElementById('tier-show-rating')) document.getElementById('tier-show-rating').checked = appearance.tiers.rating;
    if (document.getElementById('tier-show-solved')) document.getElementById('tier-show-solved').checked = appearance.tiers.solved;
    if (document.getElementById('tier-show-heatmap')) document.getElementById('tier-show-heatmap').checked = appearance.tiers.heatmap;
    if (document.getElementById('tier-show-recent')) document.getElementById('tier-show-recent').checked = appearance.tiers.recent;

    if (document.getElementById('set-cooldown-enabled')) document.getElementById('set-cooldown-enabled').checked = sync.cooldown;
  },

  updateFormState() {
    this.formState = {
      accounts: {
        leetcode: document.getElementById('set-lc-handle')?.value || '',
        codechef: document.getElementById('set-cc-handle')?.value || '',
        codeforces: document.getElementById('set-cf-handle')?.value || ''
      },
      profile: {
        name: document.getElementById('set-display-name')?.value || '',
        avatar: document.getElementById('set-avatar-url')?.value || '',
        bio: document.getElementById('set-bio')?.value || '',
        socials: ConfigManager.state?.profile?.socials || {}
      },
      appearance: {
        theme: document.getElementById('set-ui-theme')?.value || 'dark',
        accent: document.getElementById('set-accent-color')?.value || 'lc-green',
        contrast: document.getElementById('set-high-contrast')?.checked || false,
        tiers: {
          rating: document.getElementById('tier-show-rating')?.checked || false,
          solved: document.getElementById('tier-show-solved')?.checked || false,
          heatmap: document.getElementById('tier-show-heatmap')?.checked || false,
          recent: document.getElementById('tier-show-recent')?.checked || false
        }
      },
      sync: {
        frequency: 'manual',
        cooldown: document.getElementById('set-cooldown-enabled')?.checked || true
      }
    };
  },

  async save() {
    this.updateFormState();
    
    // Update individual categories
    ConfigManager.set('accounts', this.formState.accounts);
    ConfigManager.set('profile', this.formState.profile);
    ConfigManager.set('appearance', this.formState.appearance);
    ConfigManager.set('sync', this.formState.sync);
    
    await ConfigManager.save();
    this.updatePreview();
    
    // Apply Theme & Accent
    this.applyTheme(this.formState.appearance.theme);
    this.applyAccent(this.formState.appearance.accent);
  },

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('cs_theme', theme);
    
    // Sync header toggle if it exists
    const headerToggle = document.getElementById('theme-toggle');
    if (headerToggle) headerToggle.checked = (theme === 'dark');
  },

  applyAccent(color) {
    const mapping = {
      'lc-green': '#2db55d',
      'cf-blue': '#1A8CD8',
      'cc-brown': '#5A4033'
    };
    document.documentElement.style.setProperty('--color-accent', mapping[color] || '#2db55d');
  },

  async handleVerify(platform) {
    const inputId = `set-${platform === 'leetcode' ? 'lc' : platform === 'codechef' ? 'cc' : 'cf'}-handle`;
    const statusId = `verify-status-${platform === 'leetcode' ? 'lc' : platform === 'codechef' ? 'cc' : 'cf'}`;
    const handle = document.getElementById(inputId)?.value;
    const statusEl = document.getElementById(statusId);

    if (!handle) {
      statusEl.textContent = 'Not Set';
      statusEl.style.color = '#ff6b6b';
      return;
    }

    statusEl.textContent = 'Verifying...';
    statusEl.style.color = '#ffd43b';

    const endpoints = {
      leetcode: `https://alfa-leetcode-api.onrender.com/${handle}/profile`,
      codechef: `https://codechef-api.vercel.app/${handle}`,
      codeforces: `https://codeforces.com/api/user.info?handles=${handle}`
    };

    try {
      const resp = await fetch(endpoints[platform], { mode: 'cors' });
      if (resp.ok) {
        statusEl.textContent = 'Connected';
        statusEl.style.color = '#51cf66';
      } else {
        let errorMsg = `Error (${resp.status})`;
        if (resp.status === 404) errorMsg = 'Invalid Handle';
        if (resp.status === 402) errorMsg = 'API Limit Reached';
        throw new Error(errorMsg);
      }
    } catch (e) {
      console.warn(`Settings: Verification failed for ${platform}`, e);
      statusEl.textContent = (e.message && e.message !== '[object Object]') ? e.message : 'Verification Failed';
      statusEl.style.color = '#ff6b6b';
      
      // Hint about CORS if it's a generic ERR_FAILED
      if (e.name === 'TypeError' && !window.navigator.onLine) {
        statusEl.textContent = 'Offline';
      } else if (e.name === 'TypeError') {
        statusEl.textContent = 'Blocked/CORS';
      }
    }
  },

  updatePreview() {
    const previewArea = document.getElementById('settings-profile-preview');
    if (!previewArea) return;

    const name = document.getElementById('set-display-name')?.value || 'Your Name';
    const avatar = document.getElementById('set-avatar-url')?.value || 'https://ui-avatars.com/api/?name=User';

    previewArea.innerHTML = `
      <img src="${avatar}" style="width: 80px; height: 80px; border-radius: 12px; margin-bottom: 16px; object-fit: cover;">
      <h4 style="margin: 0; font-size: 18px; color: var(--color-text-primary); text-align: center;">${name}</h4>
      <p style="margin: 4px 0 0; font-size: 13px; color: var(--color-text-muted);">Preview Mode</p>
    `;
  },

  async handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target.result);
        const success = await ConfigManager.importConfig(json);
        if (success) {
          ConfigManager.showToast('Configuration Imported Successfully');
          this.syncFormWithConfig();
          this.updatePreview();
        } else {
          ConfigManager.showToast('Invalid Configuration Format');
        }
      } catch (err) {
        ConfigManager.showToast('Error loading JSON file');
      }
    };
    reader.readAsText(file);
  },

  trapFocus() {
    const focusable = this.modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    this.modal.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          last.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      }
    });
    first.focus();
  }
};

settings.init();
