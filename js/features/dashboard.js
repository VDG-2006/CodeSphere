/**
 * js/features/dashboard.js
 * Principal Architect Hub — Resilient Multi-Platform Sync Engine
 */

import { auth, db } from '../core/firebase.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js';

const ALFA_API_BASE = 'https://alfa-leetcode-api.onrender.com';
const CC_PRIMARY = 'https://codechefapi.vercel.app';
const CC_BACKUP = 'https://chef-api.vercel.app';
const CF_API_BASE = 'https://codeforces.com/api';
const SYNC_COOLDOWN = 60 * 1000; // 60 seconds

export const dashboard = {
  state: {
    lastSyncTime: 0,
    data: null,
  },

  async init() {
    this.loadState();
    this.setupEventListeners();
    this.bindAuthListener();
    this.startCooldownTimer();
  },

  setupEventListeners() {
    document.getElementById('dash-sync-btn')?.addEventListener('click', () => {
      this.refreshData();
    });

    // Reactive Settings Integration
    window.addEventListener('cs-settings-update', (e) => {
      const { config } = e.detail;
      this.handleConfigUpdate(config);
    });
  },

  bindAuthListener() {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        let handle = localStorage.getItem('cs_cached_username');
        if (!handle) {
          try {
            const snap = await getDoc(doc(db, 'users', user.uid));
            handle = snap.exists() ? snap.data().leetcodeUsername : user.displayName?.split(' ')[0].toLowerCase();
            if (handle) localStorage.setItem('cs_cached_username', handle);
          } catch (e) { handle = 'dev-user'; }
        }
        
        // Initial render from cache if available, otherwise fetch
        if (this.state.data) {
          this.renderFullDashboard(this.state.data);
        } else {
          this.syncAllPlatforms(handle);
        }
      }
    });
  },

  async fetchWithTimeout(url, timeout = 10000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(id);
      if (response.status === 404) return { success: false, status: 404 }; // Immediate halt for missing user
      if (response.status === 402) {
        const err = new Error('API Quota Exceeded');
        err.name = 'QuotaError';
        throw err;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (e) {
      clearTimeout(id);
      if (e.name === 'AbortError') e.displayMsg = 'Request timed out';
      else if (e.name === 'TypeError') e.displayMsg = 'Connection Blocked';
      else if (e.name === 'QuotaError') e.displayMsg = 'API Limit Reached';
      throw e;
    }
  },

  updateUIWithNullState(platformPrefix) {
    const ids = {
      lc: ['dash-total-solved', 'dash-easy-count', 'dash-medium-count', 'dash-hard-count', 'dash-contest-rating', 'dash-contest-rank', 'dash-contest-attended', 'dash-rank'],
      cc: ['cc-rating', 'cc-stars', 'cc-rank', 'cc-max-rating', 'cc-total', 'cc-full', 'cc-partial'],
      cf: ['cf-rating', 'cf-rank', 'cf-attended', 'cf-total']
    };

    const targets = platformPrefix ? (ids[platformPrefix] || []) : Object.values(ids).flat();
    targets.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = '<span class="mono-val">--</span>';
    });
    
    // Sidebar Aggregator Null States
    if (!platformPrefix) {
      ['sidebar-total-solved', 'sidebar-lc-solved', 'sidebar-cc-solved', 'sidebar-cf-solved'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '<span class="mono-val">--</span>';
      });
    }
  },

  async fetchCodeChefData(handle) {
    // 1. Identity Check / Null-State Guard
    if (!handle || handle.trim() === "") {
      this.updateUIWithNullState('cc');
      return { success: false, status: 'NO_HANDLE' };
    }

    const targetUrl = `${CC_PRIMARY}/${handle}`;
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;

    try {
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error('Proxy Network Error');
      
      const json = await response.json();
      if (!json.contents) throw new Error('No contents from proxy');
      
      const content = JSON.parse(json.contents);
      
      if (!content || content.status === 'error' || content.success === false) {
        throw new Error('User Not Found');
      }

      return { success: true, data: content };
    } catch (e) {
      console.warn('CodeChef Sync Failed:', e);
      this.updateUIWithNullState('cc');
      return { success: false, status: 'SYNC_ERROR' };
    }
  },

  getMockFallback(platform, handle) {
    // Returning null/empty states ensures the UI renders '--' for unauthenticated/unconnected users
    const fallbacks = {
      lcSolved: { totalSolved: 0, easySolved: 0, mediumSolved: 0, hardSolved: 0, ranking: 0 },
      lcContest: { rating: 0, globalRank: 0, attended: 0 },
      lcCalendar: { submissionCalendar: {} },
      lcRecent: [],
      ccProfile: { currentRating: 0, globalRank: 0, stars: '--', totalSolved: 0 },
      cfInfo: { result: [] },
      cfStatus: { result: [] }
    };
    return fallbacks[platform] || null;
  },

  async refreshData() {
    const now = Date.now();
    if (now - this.state.lastSyncTime < SYNC_COOLDOWN) return;
    
    const handle = localStorage.getItem('cs_cached_username') || 'dev-user';
    this.syncAllPlatforms(handle);
  },

  async syncAllPlatforms(handle) {
    const syncBtn = document.getElementById('dash-sync-btn');
    const cards = document.querySelectorAll('.dash-card');
    
    if (syncBtn) syncBtn.disabled = true;
    cards.forEach(c => c.classList.add('is-syncing'));

    // 1. Identity Check
    if (!handle || handle.trim() === "") {
      this.updateUIWithNullState();
      if (syncBtn) syncBtn.disabled = false;
      cards.forEach(c => c.classList.remove('is-syncing'));
      return;
    }

    const results = await Promise.allSettled([
      // LeetCode Data (Using Proxy for Stability)
      (async () => {
        const url = `${ALFA_API_BASE}/${handle}/solved`;
        const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        const res = await fetch(proxy);
        const json = await res.json();
        return JSON.parse(json.contents);
      })(),
      (async () => {
        const url = `${ALFA_API_BASE}/${handle}/contest`;
        const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        const res = await fetch(proxy);
        const json = await res.json();
        return JSON.parse(json.contents);
      })(),
      this.fetchWithTimeout(`${ALFA_API_BASE}/${handle}/calendar`),
      this.fetchWithTimeout(`${ALFA_API_BASE}/${handle}/acSubmission?limit=10`),
      // CodeChef Data (Resilient Engine)
      this.fetchCodeChefData(handle),
      // CodeForces Data
      this.fetchWithTimeout(`${CF_API_BASE}/user.info?handles=${handle}`),
      this.fetchWithTimeout(`${CF_API_BASE}/user.status?handle=${handle}&from=1&count=50`)
    ]);

    const data = {};
    const platformKeys = ['lcSolved', 'lcContest', 'lcCalendar', 'lcRecent', 'ccProfile', 'cfInfo', 'cfStatus'];

    results.forEach((res, i) => {
      const key = platformKeys[i];
      if (res.status === 'fulfilled') {
        data[key] = res.value;
      } else {
        console.warn(`Sync Error [${key}]:`, res.reason);
        // Hint about Blocked/CORS
        const reasonStr = String(res.reason);
        if (res.reason?.name === 'TypeError' || reasonStr.includes('Failed to fetch') || reasonStr.includes('NetworkError')) {
           this.showSyncHint('Connections Blocked by Client/CORS');
        } else if (res.reason?.name === 'QuotaError') {
           this.showSyncHint('Cloud API Limit Reached (402)');
        }
        
        // Load fallback mock data so UI isn't empty
        data[key] = this.getMockFallback(key, handle);
      }
    });

    this.state.data = data;
    this.state.lastSyncTime = Date.now();
    this.saveState();
    this.renderFullDashboard(data);
    this.startCooldownTimer();

    cards.forEach(c => c.classList.remove('is-syncing'));
  },

  showSyncHint(msg) {
    const status = document.getElementById('sync-status-msg');
    if (status) {
      status.textContent = msg;
      status.style.color = '#ff6b6b';
      setTimeout(() => { if (status.textContent === msg) status.textContent = ''; }, 6000);
    }
  },

  renderFullDashboard(data) {
    // 1. Unified Submissions (Fusion)
    const fusedRecent = this.fuseSubmissions(data.lcRecent, data.cfStatus);
    this.renderRecentAC(fusedRecent);

    // 2. Platform Solved Counts (Aggregator)
    const counts = this.calculateSolvedCounts(data);
    this.updateSidebarAggregator(counts, data);

    // 3. Platform Cards
    this.renderLeetCodeCards(data.lcSolved, data.lcContest);
    this.renderCodeChefCard(data.ccProfile);
    this.renderCodeForcesCard(data.cfInfo, counts.cf);

    // 4. Unified Heatmap
    this.renderFusedHeatmap(data.lcCalendar, data.cfStatus);
  },

  fuseSubmissions(lcRecent, cfStatus) {
    let combined = [];

    // Process LC
    if (lcRecent?.submission) {
      combined = lcRecent.submission.map(s => ({
        title: s.title,
        timestamp: parseInt(s.timestamp),
        platform: 'LC'
      }));
    }

    // Process CF (Filtered for OK)
    if (cfStatus?.result) {
      const cfSolved = cfStatus.result
        .filter(s => s.verdict === 'OK')
        .map(s => ({
          title: s.problem.name,
          timestamp: s.creationTimeSeconds,
          platform: 'CF'
        }));
      combined = [...combined, ...cfSolved];
    }

    return combined.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
  },

  calculateSolvedCounts(data) {
    const lc = parseInt(data.lcSolved?.solvedProblem) || 0;
    const cc = parseInt(data.ccProfile?.data?.fullySolved?.count) || parseInt(data.ccProfile?.totalSolved) || 0;
    
    // CF Deep Sync logic
    let cf = 0;
    if (data.cfStatus?.result) {
      const unique = new Set();
      data.cfStatus.result.forEach(s => {
        if (s.verdict === 'OK') unique.add(`${s.problem.contestId}-${s.problem.index}`);
      });
      cf = unique.size;
    }

    const total = lc + cc + cf;
    return { lc, cc, cf, total: isNaN(total) ? 0 : total };
  },

  updateSidebarAggregator(counts, data) {
    const totalEl = document.getElementById('sidebar-total-solved');
    const lcEl = document.getElementById('sidebar-lc-solved');
    const ccEl = document.getElementById('sidebar-cc-solved');
    const cfEl = document.getElementById('sidebar-cf-solved');

    if (totalEl) totalEl.textContent = counts.total || '--';
    if (lcEl) lcEl.textContent = counts.lc || '--';
    
    // Prioritize fullySolved.count for CodeChef in aggregator
    if (ccEl) {
      const ccFull = parseInt(data.ccProfile?.data?.fullySolved?.count);
      ccEl.textContent = !isNaN(ccFull) ? ccFull : (counts.cc || '--');
    }
    
    if (cfEl) cfEl.textContent = counts.cf || '--';
    
    // Identity Rank Fallback
    const rankEl = document.getElementById('dash-rank');
    if (rankEl) rankEl.textContent = data?.lcSolved?.ranking?.toLocaleString() || '--';
  },

  renderLeetCodeCards(solved, contest) {
    // Tier 1
    const rat = document.getElementById('dash-contest-rating');
    const rnk = document.getElementById('dash-contest-rank');
    const att = document.getElementById('dash-contest-attended');
    if (rat) rat.textContent = Math.round(contest?.contestRating || 0) || '--';
    if (rnk) rnk.textContent = contest?.contestGlobalRanking?.toLocaleString() || '--';
    if (att) att.textContent = contest?.contestAttend || '--';

    // Tier 2 Donut
    if (solved) {
      const total = solved.solvedProblem || 1;
      const easy = solved.easySolved || 0;
      const med = solved.mediumSolved || 0;
      const easyPct = (easy / total) * 100;
      const medPct = (med / total) * 100;
      
      const donut = document.querySelector('.dash-card.card--solved .donut-chart-container');
      if (donut) {
        const eEnd = easyPct;
        const mEnd = easyPct + medPct;
        donut.style.background = `conic-gradient(var(--color-easy) 0% ${eEnd}%, var(--color-medium) ${eEnd}% ${mEnd}%, var(--color-hard) ${mEnd}% 100%)`;
      }
      const ct = document.getElementById('dash-total-solved');
      if (ct) ct.textContent = solved.solvedProblem;
      if (document.getElementById('dash-easy-count')) document.getElementById('dash-easy-count').textContent = easy;
      if (document.getElementById('dash-medium-count')) document.getElementById('dash-medium-count').textContent = med;
      if (document.getElementById('dash-hard-count')) document.getElementById('dash-hard-count').textContent = solved.hardSolved || 0;
    }
  },

  renderCodeChefCard(result) {
    const nodes = {
      rating: document.getElementById('cc-rating'),
      stars: document.getElementById('cc-stars'),
      rank: document.getElementById('cc-rank'),
      maxRating: document.getElementById('cc-max-rating'),
      total: document.getElementById('cc-total'),
      cardHeader: document.querySelector('.card--contest h3')
    };

    // 1. Circuit Breaker / Failure Handler
    if (!result || !result.success) {
      if (nodes.rating) {
        nodes.rating.textContent = '--';
        nodes.rating.style.fontFamily = 'JetBrains Mono, monospace';
      }
      if (nodes.cardHeader) {
        nodes.cardHeader.innerHTML = 'CodeChef Rating <span style="color:var(--color-text-muted);font-size:10px;font-weight:400;margin-left:8px;" title="Source Connectivity Issue">(Sync Error)</span>';
      }
      return;
    }

    const { data } = result;

    // 2. Data Mapping & Sanitization
    if (nodes.rating) nodes.rating.textContent = parseInt(data.currentRating) || '--';
    if (nodes.stars) nodes.stars.textContent = `${data.stars || '0'}★`;
    if (nodes.rank) nodes.rank.textContent = parseInt(data.globalRank) || '--';
    if (nodes.maxRating) nodes.maxRating.textContent = parseInt(data.highestRating) || '--';
    
    const solvedCount = parseInt(data.fullySolved?.count) || 0;
    if (nodes.total) nodes.total.textContent = solvedCount;

    // 3. UI Update: Dynamic Donut Chart (Tier 2)
    const partialCount = parseInt(data.partiallySolved?.count) || 0;
    const totalPossible = solvedCount + partialCount;

    if (totalPossible > 0) {
      const ratio = (solvedCount / totalPossible) * 100;
      const donut = document.querySelectorAll('.dash-card.card--solved .donut-chart-container')[1];
      if (donut) {
        donut.style.background = `conic-gradient(var(--color-accent) 0% ${ratio}%, var(--color-bg-tertiary) ${ratio}% 100%)`;
      }
    }
  },

  renderCodeForcesCard(info, solved) {
    const res = info?.result ? info.result[0] : null;
    const rat = document.getElementById('cf-rating');
    const rnk = document.getElementById('cf-rank');
    const att = document.getElementById('cf-attended');
    const tot = document.getElementById('cf-total');

    if (rat) rat.textContent = res?.rating || '--';
    if (rnk) rnk.textContent = res?.rank || '--';
    if (att) att.textContent = res?.maxRating || '--';
    if (tot) tot.textContent = solved || '--';

    if (res) {
       const donut = document.querySelectorAll('.dash-card.card--solved .donut-chart-container')[2];
       if (donut) donut.style.background = `conic-gradient(#1A8CD8 0% 100%)`;
    }
  },

  renderFusedHeatmap(lcCal, cfStatus) {
    const wrapper = document.getElementById('heatmap-main-wrapper');
    if (!wrapper) return;
    wrapper.innerHTML = '';

    // Merge Calendar Logic
    const calendar = {};
    const merge = (ts, count) => {
      const d = new Date(ts * 1000);
      const utc = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 1000;
      calendar[utc] = (calendar[utc] || 0) + count;
    };

    if (lcCal?.submissionCalendar) {
      try {
        const parsed = typeof lcCal.submissionCalendar === 'string' ? JSON.parse(lcCal.submissionCalendar) : lcCal.submissionCalendar;
        Object.entries(parsed || {}).forEach(([t, c]) => merge(parseInt(t), c));
      } catch (e) {
        console.warn('Heatmap: Parse error on LC calendar', e);
      }
    }
    if (cfStatus?.result) {
      cfStatus.result.forEach(s => {
        if (s.verdict === 'OK') merge(s.creationTimeSeconds, 1);
      });
    }

    const monthNames = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr']; // Rolling 12
    const today = new Date();
    
    for (let i = 0; i < 12; i++) {
      const d = new Date();
      d.setMonth(today.getMonth() - (11 - i));
      const m = d.getMonth();
      const y = d.getFullYear();

      const block = document.createElement('div');
      block.className = 'month-block';
      
      const label = document.createElement('div');
      label.textContent = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m];
      label.style.cssText = 'font-size: 10px; color: var(--color-text-muted); text-align: center; margin-bottom: 4px;';
      block.appendChild(label);

      const grid = document.createElement('div');
      grid.style.cssText = 'display: grid; grid-template-rows: repeat(7, 10px); grid-auto-flow: column; gap: 3px;';
      
      const days = new Date(y, m + 1, 0).getDate();
      for (let day = 1; day <= days; day++) {
        const cell = document.createElement('div');
        const utc = Date.UTC(y, m, day) / 1000;
        const count = calendar[utc] || 0;
        const level = count > 0 ? Math.min(Math.floor(count / 2) + 1, 4) : 0;
        
        cell.className = 'heatmap-cell';
        cell.setAttribute('data-level', level);
        grid.appendChild(cell);
      }
      block.appendChild(grid);
      wrapper.appendChild(block);
    }

    const yrFull = document.getElementById('dash-submissions-year');
    if (yrFull) yrFull.textContent = Object.values(calendar).reduce((a,b) => a+b, 0);
  },

  renderRecentAC(items) {
    const list = document.getElementById('dash-recent-ac');
    if (!list) return;
    list.innerHTML = items.map(item => `
      <li class="recent-ac-item">
        <span class="ac-title" title="${item.title}">${item.title}</span>
        <span class="ac-time mono-val">${this.formatTime(item.timestamp)}</span>
      </li>
    `).join('');
  },

  formatTime(unix) {
    const diff = Math.floor((Date.now() / 1000) - unix);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
    return `${Math.floor(diff/86400)}d ago`;
  },

  startCooldownTimer() {
    const btn = document.getElementById('dash-sync-btn');
    const msg = document.getElementById('sync-status-msg');
    if (!btn || !msg) return;

    const update = () => {
      const remaining = Math.ceil((SYNC_COOLDOWN - (Date.now() - this.state.lastSyncTime)) / 1000);
      if (remaining > 0) {
        btn.disabled = true;
        msg.textContent = `SYNCED ${remaining}S AGO`;
        requestAnimationFrame(update);
      } else {
        btn.disabled = false;
        msg.textContent = '';
      }
    };
    update();
  },

  saveState() {
    localStorage.setItem('cs_dash_state', JSON.stringify(this.state));
  },

  loadState() {
    const saved = localStorage.getItem('cs_dash_state');
    if (saved) {
      const parsed = JSON.parse(saved);
      this.state = parsed;
    }
  },

  handleConfigUpdate(config) {
    // 1. Identity Mirroring
    const nameEl = document.getElementById('dash-name');
    const handleEl = document.getElementById('dash-handle');
    const avatarEl = document.getElementById('dash-avatar');
    
    if (nameEl && config.profile.name) nameEl.textContent = config.profile.name;
    if (handleEl && config.profile.handle) handleEl.textContent = `@${config.profile.handle}`;
    if (avatarEl && config.profile.avatar) avatarEl.src = config.profile.avatar;

    // 2. Dash Tiers Visibility
    const tiers = config.appearance.tiers;
    document.querySelector('.dashboard-row--tier1').style.display = tiers.rating ? 'grid' : 'none';
    document.querySelector('.dashboard-row--tier2').style.display = tiers.solved ? 'grid' : 'none';
    document.querySelector('.dashboard-row--tier3').style.display = tiers.heatmap ? 'grid' : 'none';
    document.querySelector('.dashboard-row--tier4').style.display = tiers.recent ? 'grid' : 'none';

    // 3. Handle Sync - If handles changed, re-sync data
    const currentHandle = localStorage.getItem('cs_cached_username');
    if (config.accounts.leetcode && config.accounts.leetcode !== currentHandle) {
      localStorage.setItem('cs_cached_username', config.accounts.leetcode);
      this.syncAllPlatforms(config.accounts.leetcode);
    }
  }
};

// Auto-init
if (document.getElementById('profile-section')) {
  dashboard.init();
}

