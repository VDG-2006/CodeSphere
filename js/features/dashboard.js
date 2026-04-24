/**
 * js/features/dashboard.js
 * Principal Architect Hub — Resilient Multi-Platform Sync Engine
 */

import { API_BASE } from '../core/config.js';
import { escapeHtml, formatDate } from '../core/utils.js';

const SYNC_COOLDOWN = 60 * 1000; // 60 seconds

export const dashboard = {
  state: {
    lastSyncTime: 0,
    data: null,
  },

  async init() {
    this.loadState();
    this.setupListeners();
    // REMOVED auto-sync on init. Syncing is now triggered by the Router or User Action.
  },

  setupListeners() {
    const syncBtn = document.getElementById('dash-sync-btn');
    syncBtn?.addEventListener('click', () => {
      const sessionUser = JSON.parse(sessionStorage.getItem('cs_user') || '{}');
      const handle = sessionUser.leetcode || sessionUser.username;
      if (handle) this.syncAllPlatforms(handle);
    });

    window.addEventListener('cs-settings-update', (e) => {
      const { config } = e.detail;
      this.handleConfigUpdate(config);
    });
  },

  async fetchWithTimeout(url, timeout = 5000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(id);

      if (response.status === 429) {
        throw new Error('Rate Limited');
      }

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (e) {
      clearTimeout(id);
      throw e;
    }
  },

  updateUIWithNullState(platformPrefix) {
    const ids = {
      lc: ['dash-total-solved', 'dash-easy-count', 'dash-medium-count', 'dash-hard-count', 'dash-contest-rating', 'dash-contest-rank', 'dash-contest-attended', 'dash-rank'],
      cf: ['cf-rating', 'cf-rank', 'cf-attended', 'cf-total']
    };

    const targets = platformPrefix ? (ids[platformPrefix] || []) : Object.values(ids).flat();
    targets.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '--';
    });
  },

  async syncAllPlatforms(handle) {
    if (!handle) return;

    // Throttle checks
    const now = Date.now();
    if (now - this.state.lastSyncTime < SYNC_COOLDOWN && this.state.data) {
      console.log('[Dash] Using cached data (cooldown active)');
      this.renderFullDashboard(this.state.data);
      return;
    }

    const syncBtn = document.getElementById('dash-sync-btn');
    const cards = document.querySelectorAll('.dash-card');

    if (syncBtn) syncBtn.disabled = true;
    cards.forEach(c => c.classList.add('is-syncing'));

    try {
      const endpoints = [
        `${API_BASE}/stats/leetcode/${handle}`,
        `${API_BASE}/stats/codeforces/${handle}`
      ];

      const results = await Promise.allSettled(endpoints.map(url => this.fetchWithTimeout(url)));

      const data = {};
      results.forEach((res, i) => {
        const key = i === 0 ? 'leetcode' : 'codeforces';
        if (res.status === 'fulfilled' && res.value.success) {
          data[key] = res.value.data;
        } else {
          console.warn(`[Dash] ${key} fetch failed or rate limited.`);
        }
      });

      if (Object.keys(data).length > 0) {
        this.state.data = { ...this.state.data, ...data };
        this.state.lastSyncTime = now;
        this.saveState();
        this.renderFullDashboard(this.state.data);
      }
    } catch (e) {
      console.error('[Dash] Sync failed:', e);
    } finally {
      if (syncBtn) syncBtn.disabled = false;
      cards.forEach(c => c.classList.remove('is-syncing'));
    }
  },

  renderFullDashboard(data) {
    if (!data) return;
    if (data.leetcode) this.renderLeetCodeCard(data.leetcode);
    if (data.codeforces) this.renderCodeForcesCard(data.codeforces);
    
    const counts = this.calculateSolvedCounts(data);
    this.updateSidebarAggregator(counts);
  },

  calculateSolvedCounts(data) {
    const lcSolved = data.leetcode?.totalSolved || 0;
    const cfSolved = data.codeforces?.raw?.result?.[0]?.rating ? 0 : 0; // Simplified for now
    
    return {
      lc: lcSolved,
      cf: 0,
      total: lcSolved
    };
  },

  updateSidebarAggregator(counts) {
    const mapping = {
      'sidebar-total-solved': counts.total,
      'sidebar-lc-solved': counts.lc,
      'sidebar-cf-solved': counts.cf
    };

    Object.entries(mapping).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el && typeof gsap !== 'undefined') {
        gsap.to(el, {
          duration: 1.5,
          textContent: val,
          roundProps: "textContent",
          ease: "power2.out"
        });
      } else if (el) {
        el.textContent = val;
      }
    });
  },

  renderLeetCodeCard(data) {
    if (!data) return;
    const el = document.getElementById('dash-lc-rating-val');
    if (el) el.textContent = data.contestRating || '--';
  },

  renderCodeForcesCard(data) {
    if (!data?.raw?.result?.[0]) return;
    const user = data.raw.result[0];
    const el = document.getElementById('dash-cf-rating-val');
    if (el) el.textContent = user.rating || '--';
  },

  saveState() { localStorage.setItem('cs_dash_state', JSON.stringify(this.state)); },
  loadState() {
    const saved = localStorage.getItem('cs_dash_state');
    if (saved) {
      try {
        this.state = JSON.parse(saved);
      } catch (e) {
        this.state = { lastSyncTime: 0, data: null };
      }
    }
  },

  handleConfigUpdate(config) {
    // Sync logic for settings change
  }
};
