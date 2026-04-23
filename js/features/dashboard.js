/**
 * js/features/dashboard.js
 * Principal Architect Hub — Resilient Multi-Platform Sync Engine
 */

import { API_BASE } from '../core/config.js';

const SYNC_COOLDOWN = 60 * 1000; // 60 seconds

const safeParse = (jsonString) => {
  if (!jsonString || typeof jsonString !== 'string') throw new Error('Proxy returned empty payload.');
  try { return JSON.parse(jsonString); }
  catch (e) {
    const err = new Error('Proxy payload failed to parse.');
    err.name = 'TypeError';
    throw err;
  }
};

const escapeHtml = (str = '') => String(str).replace(/[&<>"']/g, match =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[match]
);

export const dashboard = {
  state: {
    lastSyncTime: 0,
    data: null,
  },

  async init() {
    this.loadState();
    this.setupListeners();

    // Auto-sync if we have a session
    const sessionUser = JSON.parse(sessionStorage.getItem('cs_user') || '{}');
    const handle = sessionUser.leetcode || sessionUser.username;

    if (handle) {
      this.syncAllPlatforms(handle);
    }
  },

  setupListeners() {
    const syncBtn = document.getElementById('dash-sync-btn');
    syncBtn?.addEventListener('click', () => {
      const sessionUser = JSON.parse(sessionStorage.getItem('cs_user') || '{}');
      const handle = sessionUser.leetcode || sessionUser.username;
      if (handle) this.syncAllPlatforms(handle);
    });

    // Reactive Settings Integration
    window.addEventListener('cs-settings-update', (e) => {
      const { config } = e.detail;
      this.handleConfigUpdate(config);
    });
  },

  bindAuthListener() {
    // Replaced Firebase listener with simple session check
    const userJson = sessionStorage.getItem('cs_user');
    if (userJson) {
      const user = JSON.parse(userJson);
      let handle = user.handles?.leetcode || localStorage.getItem('cs_cached_username');

      if (handle) {
        if (this.state.data) {
          this.renderFullDashboard(this.state.data);
        } else {
          this.syncAllPlatforms(handle);
        }
      }
    }
  },


  async fetchWithTimeout(url, timeout = 5000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(id);

      if (response.status === 429) {
        const err = new Error('Rate Limited');
        err.name = 'RateLimitError';
        throw err;
      }

      if (response.status === 404) return { success: false, status: 404 }; // Immediate halt for missing user
      if (response.status === 402) {
        const err = new Error('API Quota Exceeded');
        err.name = 'QuotaError';
        throw err;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();

      // Safely unwrap AllOrigins proxy contents
      if (json.contents) return safeParse(json.contents);
      return json;
    } catch (e) {
      clearTimeout(id);
      if (e.name === 'AbortError') e.displayMsg = 'Connection timed out';
      else if (e.name === 'TypeError') e.displayMsg = 'Connection Blocked';
      else if (e.name === 'QuotaError') e.displayMsg = 'API Limit Reached';
      else if (e.name === 'RateLimitError') e.displayMsg = 'Busy (Rate Limited)';
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

    // Sidebar Aggregator Null States
    if (!platformPrefix) {
      ['sidebar-total-solved', 'sidebar-lc-solved', 'sidebar-cf-solved'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '--';
      });
    }
  },



  getMockFallback(platform, handle) {
    // Returning null/empty states ensures the UI renders '--' for unauthenticated/unconnected users
    const fallbacks = {
      lcSolved: { totalSolved: 0, easySolved: 0, mediumSolved: 0, hardSolved: 0, ranking: 0 },
      lcContest: { rating: 0, globalRank: 0, attended: 0 },
      lcCalendar: { submissionCalendar: {} },
      lcRecent: [],
      cfInfo: { result: [] },
      cfStatus: { result: [] }
    };
    return fallbacks[platform] || null;
  },

  async refreshData() {
    const handle = localStorage.getItem('cs_cached_username') || 'dev-user';
    const lastSyncTime = parseInt(localStorage.getItem('cs_last_sync_time') || '0', 10);
    const cachedData = localStorage.getItem('cs_dash_cached_data');

    if (Date.now() - lastSyncTime < SYNC_COOLDOWN && cachedData) {
      const parsed = safeParse(cachedData);
      if (parsed) {
        this.state.data = parsed;
        return this.renderFullDashboard(parsed);
      }
    }

    this.syncAllPlatforms(handle);
  },

  async syncAllPlatforms(handle) {
    const syncBtn = document.getElementById('dash-sync-btn');
    const cards = document.querySelectorAll('.dash-card');

    if (syncBtn) syncBtn.disabled = true;
    cards.forEach(c => c.classList.add('is-syncing'));

    handle = handle || localStorage.getItem('cs_cached_username') || 'itz_vdg_01';
    
    try {
      const results = await Promise.allSettled([
        this.fetchWithTimeout(`${API_BASE}/stats/leetcode/${handle}?t=${Date.now()}`),
        this.fetchWithTimeout(`${API_BASE}/stats/codeforces/${handle}?t=${Date.now()}`),
        this.fetchWithTimeout(`${API_BASE}/stats/codeforces_rating/${handle}?t=${Date.now()}`),
        this.fetchWithTimeout(`${API_BASE}/stats/codeforces/${handle}/status?t=${Date.now()}`),
        this.fetchWithTimeout(`${API_BASE}/stats/leetcode/${handle}/calendar?t=${Date.now()}`),
        this.fetchWithTimeout(`${API_BASE}/stats/leetcode/${handle}/recent?t=${Date.now()}`)
      ]);

      const data = {};
      const platformKeys = ['leetcode', 'cfInfo', 'cfRating', 'cfStatus', 'lcCalendar', 'lcRecent'];

      results.forEach((res, i) => {
        const key = platformKeys[i];
        if (res.status === 'fulfilled' && res.value.success) {
          data[key] = res.value.data;
        } else {
          data[key] = this.getMockFallback(key, handle);
        }
      });

      this.state.data = data;
      this.saveState();
      this.renderFullDashboard(data);
      this.startCooldownTimer();
    } catch (e) {
      console.error('[Dash] Sync failed:', e);
    } finally {
      if (syncBtn) syncBtn.disabled = false;
      cards.forEach(c => c.classList.remove('is-syncing'));
    }
  },

  renderFullDashboard(data) {
    // 1. Data Fusion
    try {
      const fusedRecent = this.fuseSubmissions(data.lcRecent, data.cfStatus);
      this.renderRecentAC(fusedRecent);
      if (data.lcCalendar?.submissionCalendar) this.renderFusedHeatmap(data.lcCalendar.submissionCalendar);
    } catch (e) { console.warn('[Dash] Fusion failed:', e); }

    // 2. Platform Cards & Graphs
    this.renderLeetCodeCard(data.leetcode);
    this.renderCodeForcesCard(data.cfInfo, data.cfRating);

    const counts = this.calculateSolvedCounts(data);
    this.updateSidebarAggregator(counts);
  },

  calculateSolvedCounts(data) {
    const lcSolved = data.leetcode?.totalSolved || 0;
    
    let cfSolved = 0;
    if (data.cfStatus?.result) {
      const uniqueSolved = new Set();
      data.cfStatus.result.forEach(sub => {
        if (sub.verdict === 'OK' && sub.problem) {
          uniqueSolved.add(`${sub.problem.contestId}-${sub.problem.index}`);
        }
      });
      cfSolved = uniqueSolved.size;
    }

    return {
      lc: lcSolved,
      cf: cfSolved,
      total: lcSolved + cfSolved
    };
  },

  updateSidebarAggregator(counts) {
    const mapping = {
      'sidebar-total-solved': counts.total,
      'sidebar-lc-solved': counts.lc,
      'sidebar-cf-solved': counts.cf,
      'sidebar-total-solved-home': counts.total,
      'sidebar-lc-solved-home': counts.lc
    };

    Object.entries(mapping).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) {
        gsap.to(el, {
          duration: 1.5,
          textContent: val,
          roundProps: "textContent",
          ease: "power2.out"
        });
      }
    });
  },

  renderLeetCodeCard(data) {
    if (!data) return;
    const history = data.contestHistory || [];
    
    const mapping = {
      'dash-lc-rating-val': data.contestRating || 0,
      'dash-lc-peak': Math.max(...history.map(h => h.rating), 0),
      'dash-lc-last-rank': data.globalRank || 0,
      'dash-lc-contests': history.length
    };

    Object.entries(mapping).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) {
        if (typeof val === 'number') {
          gsap.to(el, {
            duration: 2,
            textContent: val,
            roundProps: "textContent",
            ease: "expo.out"
          });
        } else {
          el.textContent = val || '--';
        }
      }
    });

    // Rating Change logic
    const changeEl = document.getElementById('dash-lc-change');
    if (changeEl && history.length > 1) {
      const diff = Math.round(history[history.length-1].rating - history[history.length-2].rating);
      changeEl.textContent = diff > 0 ? `+${diff}` : diff;
      changeEl.className = `text-lg font-bold ${diff > 0 ? 'text-green-400' : 'text-red-400'}`;
    }

    this.renderRatingChart('lc-rating-chart', history.map(h => ({
      label: h.contest?.title || 'Contest',
      value: Math.round(h.rating),
      rank: h.ranking
    })), '#f6ad55');
  },

  renderCodeForcesCard(info, ratingHistory) {
    if (!info?.result?.[0]) return;
    const user = info.result[0];
    const history = ratingHistory?.result || [];

    const mapping = {
      'dash-cf-rating-val': user.rating,
      'dash-cf-max-rating': user.maxRating,
      'dash-cf-last-rank': user.rank,
      'dash-cf-contests': history.length,
      'dash-cf-title-badge': user.rank
    };

    Object.entries(mapping).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val || '--';
    });

    this.renderRatingChart('cf-rating-chart', history.map(h => ({
      label: h.contestName,
      value: h.newRating,
      rank: h.rank
    })), '#4299e1');
  },

  renderRatingChart(canvasId, points, color) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
      console.warn(`[Dash] Canvas ${canvasId} not found.`);
      return;
    }
    if (!points.length) {
      console.warn(`[Dash] No data points for ${canvasId}.`);
      return;
    }

    console.log(`[Dash] Rendering ${canvasId} with ${points.length} points.`);

    // Destroy existing chart if it exists
    if (this.charts && this.charts[canvasId]) {
      this.charts[canvasId].destroy();
    } else {
      this.charts = this.charts || {};
    }

    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, `${color}44`);
    gradient.addColorStop(1, `${color}00`);

    this.charts[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: points.map(p => p.label),
        datasets: [{
          data: points.map(p => p.value),
          borderColor: color,
          backgroundColor: gradient,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: color,
          pointHoverBorderColor: '#fff',
          pointHoverBorderWidth: 2,
          borderWidth: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: '#1a1c2e',
            titleFont: { size: 10 },
            bodyFont: { size: 12, weight: 'bold' },
            padding: 12,
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            callbacks: {
              label: (context) => {
                const p = points[context.dataIndex];
                return [`Rating: ${p.value}`, `Rank: #${p.rank}`];
              }
            }
          }
        },
        scales: {
          x: { display: false },
          y: {
            display: false,
            suggestedMin: Math.min(...points.map(p => p.value)) - 100
          }
        }
      }
    });
  },



  renderFusedHeatmap(lcCal, cfStatus) {
    const wrapper = document.getElementById('heatmap-main-wrapper');
    if (!wrapper) return;
    wrapper.innerHTML = '';
    
    const calendar = {};
    const merge = (ts, count) => {
      const d = new Date(ts * 1000);
      const utc = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 1000;
      calendar[utc] = (calendar[utc] || 0) + count;
    };

    // LeetCode Deep Sync
    const lcData = lcCal?.submissionCalendar || lcCal;
    if (lcData) {
      try {
        const parsed = typeof lcData === 'string' ? JSON.parse(lcData) : lcData;
        Object.entries(parsed || {}).forEach(([t, c]) => merge(parseInt(t), c));
      } catch (e) { console.warn('Heatmap LC Parse Error'); }
    }

    // CodeForces Deep Sync
    if (cfStatus?.result) {
      cfStatus.result.forEach(s => { if (s.verdict === 'OK') merge(s.creationTimeSeconds, 1); });
    }

    const today = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date();
      d.setMonth(today.getMonth() - (11 - i));
      const m = d.getMonth();
      const grid = document.createElement('div');
      grid.style.cssText = 'display: grid; grid-template-rows: repeat(7, 10px); grid-auto-flow: column; gap: 3px;';
      const days = new Date(d.getFullYear(), m + 1, 0).getDate();
      for (let day = 1; day <= days; day++) {
        const dateTs = Date.UTC(d.getFullYear(), m, day) / 1000;
        const count = calendar[dateTs] || 0;
        const cell = document.createElement('div');
        cell.className = `heatmap-cell intensity-${Math.min(count, 4)}`;
        cell.title = `${count} AC on ${new Date(dateTs * 1000).toDateString()}`;
        grid.appendChild(cell);
      }
      wrapper.appendChild(grid);
    }
    
    const countEl = document.getElementById('dash-submissions-year');
    if (countEl) countEl.textContent = Object.values(calendar).reduce((a, b) => a + b, 0);
  },

  fuseSubmissions(lcRecent, cfStatus) {
    const combined = [];
    try {
      // LeetCode Extraction
      const lcSubmissions = lcRecent?.submission || (Array.isArray(lcRecent) ? lcRecent : []);
      if (Array.isArray(lcSubmissions)) {
        lcSubmissions.forEach(s => {
          if (s && s.title) {
            combined.push({ title: s.title, timestamp: parseInt(s.timestamp) || 0, platform: 'LC' });
          }
        });
      }
      
      // CodeForces Extraction
      if (cfStatus?.result && Array.isArray(cfStatus.result)) {
        cfStatus.result.forEach(s => {
          if (s.verdict === 'OK' && s.problem) {
            combined.push({ title: s.problem.name, timestamp: s.creationTimeSeconds || 0, platform: 'CF' });
          }
        });
      }
    } catch (e) {
      console.error('[Dash] Fusion Error:', e);
    }
    
    return combined.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
  },

  renderRecentAC(items) {
    const list = document.getElementById('dash-recent-ac');
    if (!list) return;
    
    if (!Array.isArray(items) || items.length === 0) {
      list.innerHTML = '<li class="text-[10px] opacity-20 text-center py-4 italic">No recent activity</li>';
      return;
    }

    list.innerHTML = items.map(item => `
      <li class="recent-ac-item flex justify-between">
        <span class="ac-title text-sm truncate">${item.title}</span>
        <span class="ac-time text-[10px] opacity-40">${this.formatTime(item.timestamp)}</span>
      </li>
    `).join('');
  },

  formatTime(unix) {
    const diff = Math.floor((Date.now() / 1000) - unix);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  },

  startCooldownTimer() {
    const btn = document.getElementById('dash-sync-btn');
    if (!btn) return;
    btn.disabled = true;
    setTimeout(() => { btn.disabled = false; }, 60000);
  },

  saveState() { localStorage.setItem('cs_dash_state', JSON.stringify(this.state)); },
  loadState() {
    const saved = localStorage.getItem('cs_dash_state');
    if (saved) this.state = JSON.parse(saved);
  },

  handleConfigUpdate(config) {
    const nameEl = document.getElementById('dash-name');
    const handleEl = document.getElementById('dash-handle');
    const avatarEl = document.getElementById('dash-avatar');

    if (nameEl && config.profile.name) nameEl.textContent = config.profile.name;
    if (handleEl && config.profile.handle) handleEl.textContent = `@${config.profile.handle}`;
    if (avatarEl && config.profile.avatar) avatarEl.src = config.profile.avatar;

    const currentHandle = localStorage.getItem('cs_cached_username');
    if (config.accounts.leetcode && config.accounts.leetcode !== currentHandle) {
      localStorage.setItem('cs_cached_username', config.accounts.leetcode);
      this.syncAllPlatforms(config.accounts.leetcode);
    }
  },

  getMockFallback(key, handle) {
    const mocks = {
      leetcode: {
        totalSolved: 450,
        contestRating: 1550,
        globalRank: 12000,
        contestHistory: [
          { attended: true, rating: 1450, ranking: 5000, contest: { title: "Weekly 300" } },
          { attended: true, rating: 1500, ranking: 4200, contest: { title: "Weekly 301" } },
          { attended: true, rating: 1550, ranking: 3800, contest: { title: "Weekly 302" } }
        ]
      },
      cfInfo: { result: [{ rating: 1420, rank: 'specialist', maxRating: 1540 }] },
      cfRating: { 
        result: [
          { contestName: "Div 3 #800", newRating: 1200, rank: 2500 },
          { contestName: "Div 2 #801", newRating: 1350, rank: 1800 },
          { contestName: "Div 2 #802", newRating: 1420, rank: 1200 }
        ] 
      },
      cfStatus: { result: [] },
      lcCalendar: { submissionCalendar: "{}" },
      lcRecent: []
    };
    return mocks[key] || {};
  }
};

// Auto-init
if (document.getElementById('profile-view')) {
  dashboard.loadState();
  dashboard.init();
}
