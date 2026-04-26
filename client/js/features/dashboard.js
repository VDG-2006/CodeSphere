import { API_BASE } from '../core/config.js';
import { escapeHtml, formatDate } from '../core/utils.js';

/**
 * js/features/dashboard.js
 * CodeSphere V2 Premium Dashboard Engine
 * 12-Month Decoupled Heatmap + Official Stats Hydration
 */

const Dashboard = {
  state: {
    data: null,
    lastSyncTime: 0
  },

  init() {
    this.hydrateFromCache();
    this.setupListeners();
  },

  hydrateFromCache() {
    const cached = localStorage.getItem('cs_dash_state');
    if (cached) {
      try {
        const { data, time } = JSON.parse(cached);
        this.state.data = data;
        this.state.lastSyncTime = time;
        this.renderFullDashboard(data);
      } catch (e) {
        console.error('[Dash] Cache hydration failed:', e);
      }
    }
  },

  saveState() {
    localStorage.setItem('cs_dash_state', JSON.stringify({
      data: this.state.data,
      time: this.state.lastSyncTime
    }));
  },

  setupListeners() {
    const syncBtn = document.getElementById('dash-sync-btn');
    if (syncBtn) {
      syncBtn.addEventListener('click', () => this.syncAllPlatforms());
    }
  },

  async syncAllPlatforms() {
    const now = Date.now();
    const cooldown = 60000; // 60s
    if (now - this.state.lastSyncTime < cooldown) {
      console.log('[Dash] Sync cooldown active');
      return;
    }

    const cards = document.querySelectorAll('.dash-glass-card');
    cards.forEach(c => c.classList.add('is-syncing'));

    try {
      const response = await fetch(`${API_BASE}/stats/sync`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('cs_token')}` }
      });
      const res = await response.json();
      console.log('[Dash] Sync Response:', res);

      if (res.success && res.data) {
        this.state.data = res.data;
        this.state.lastSyncTime = now;
        this.saveState();
        this.renderFullDashboard(this.state.data);
      } else if (res.message === 'No handles configured') {
        this.showSetupMessage();
      }
    } catch (e) {
      console.error('[Dash] Sync failed:', e);
    } finally {
      cards.forEach(c => c.classList.remove('is-syncing'));
    }
  },

  showSetupMessage() {
    const main = document.querySelector('main.col-span-12') || document.querySelector('.dash-main-new');
    if (!main) return;
    if (document.getElementById('setup-guide')) return;

    const guide = document.createElement('div');
    guide.id = 'setup-guide';
    guide.className = 'dash-glass-card p-12 rounded-3xl border border-blue-500/30 text-center mb-8';
    guide.innerHTML = `
      <div class="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg width="24" height="24" fill="none" stroke="#3b82f6" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
      </div>
      <h2 class="text-2xl font-bold mb-2 text-primary">Connect Your Profiles</h2>
      <p class="text-secondary mb-8 max-w-md mx-auto opacity-70">To see your real-time stats and rating graphs, please add your LeetCode and Codeforces handles in settings.</p>
      <button onclick="document.querySelector('.sidebar-link[data-route=\'settings\']')?.click()" class="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-full font-bold transition-all">Open Settings</button>
    `;
    main.prepend(guide);
  },

  renderFullDashboard(data) {
    console.log('[Dash] Hydrating Dashboard with:', data);
    try {
      if (!data) return;
      document.getElementById('setup-guide')?.remove();

      // 1. Profile Hydration
      const user = JSON.parse(sessionStorage.getItem('cs_user') || '{}');
      const initialsEl = document.getElementById('dash-avatar-large');
      if (initialsEl && user.fullName) {
         initialsEl.textContent = user.fullName.split(' ').map(p => p[0]).join('').toUpperCase().substring(0, 2);
      }

      const nameEl = document.getElementById('dash-user-name');
      if (nameEl) nameEl.textContent = escapeHtml(user.fullName || 'Guest User');
      
      const handleEl = document.getElementById('dash-user-handle');
      if (handleEl) {
         const displayHandle = data.leetcode?.handle || data.codeforces?.handle || user.username || 'guest';
         handleEl.textContent = `@${escapeHtml(displayHandle)}`;
      }

      // 2. LeetCode Stats
      const lc = data.leetcode;
      if (lc) {
        const lcRatingEl = document.getElementById('dash-lc-rating-val');
        if (lcRatingEl) lcRatingEl.textContent = lc.currentRating || '--';

        const lcLastRankEl = document.getElementById('dash-lc-last-rank');
        if (lcLastRankEl) lcLastRankEl.textContent = lc.lastContestRank || '--';

        const lcHighestEl = document.getElementById('dash-lc-highest');
        if (lcHighestEl) lcHighestEl.textContent = lc.highestRating || '--';

        const lcSolvedText = document.getElementById('sidebar-lc-solved');
        if (lcSolvedText) lcSolvedText.textContent = lc.totalSolved || 0;

        const easyEl = document.getElementById('lc-easy-solved');
        if (easyEl) easyEl.textContent = lc.easySolved || 0;
        
        const medEl = document.getElementById('lc-med-solved');
        if (medEl) medEl.textContent = lc.mediumSolved || 0;
        
        const hardEl = document.getElementById('lc-hard-solved');
        if (hardEl) hardEl.textContent = lc.hardSolved || 0;

        const lcBar = document.getElementById('lc-solved-progress');
        if (lcBar) lcBar.style.width = `${Math.min(100, (lc.totalSolved / 500) * 100)}%`;
        
        this.updateLanguageBars(lc);
      }

      // 3. CodeForces Stats
      const cf = data.codeforces;
      if (cf) {
        const cfRatingEl = document.getElementById('dash-cf-rating');
        if (cfRatingEl) cfRatingEl.textContent = cf.currentRating || '--';

        const cfLastRankEl = document.getElementById('dash-cf-last-rank');
        if (cfLastRankEl) cfLastRankEl.textContent = cf.lastContestRank || '--';

        const cfHighestEl = document.getElementById('dash-cf-highest');
        if (cfHighestEl) cfHighestEl.textContent = cf.highestRating || '--';

        const cfSolvedText = document.getElementById('sidebar-cf-solved');
        if (cfSolvedText) cfSolvedText.textContent = cf.totalSolved || 0;

        const cfBar = document.getElementById('cf-solved-progress');
        if (cfBar) cfBar.style.width = `${Math.min(100, ((cf.totalSolved || 0) / 300) * 100)}%`;
      }

      // 4. Global Stats
      const combinedTotal = (lc?.totalSolved || 0) + (cf?.totalSolved || 0);
      this.animateCounter('sidebar-total-solved', combinedTotal);

      const globalRankEl = document.getElementById('dash-global-rank');
      if (globalRankEl) globalRankEl.textContent = lc?.rank ? `#${lc.rank}` : '--';

      this.renderRatingCharts(data);
      this.renderYearlyHeatmap(data);

    } catch (err) {
      console.error('[Dash] Hydration Critical Error:', err);
    }
  },

  animateCounter(elId, targetValue) {
    const el = document.getElementById(elId);
    if (!el) return;
    if (window.gsap) {
      gsap.to({ val: 0 }, {
        val: targetValue,
        duration: 1.5,
        ease: 'power3.out',
        onUpdate: function() { el.textContent = Math.round(this.targets()[0].val).toLocaleString(); }
      });
    } else {
      el.textContent = targetValue.toLocaleString();
    }
  },

  updateLanguageBars(lcData) {
    const total = lcData.totalSolved || 1;
    const stats = lcData.languages || [];
    const getCount = (name) => (stats.find(s => s.languageName.toLowerCase().includes(name.toLowerCase()))?.problemsSolved || 0);

    const displayLangs = [
      { id: 'java', count: getCount('java') },
      { id: 'py',   count: getCount('python') },
      { id: 'cs',   count: getCount('c#') }
    ];

    displayLangs.forEach(lang => {
      const bar = document.getElementById(`lang-${lang.id}-bar`);
      const val = document.getElementById(`lang-${lang.id}-val`);
      if (bar) bar.style.width = `${Math.min(100, (lang.count / total) * 100)}%`;
      if (val) val.textContent = lang.count;
    });
  },

  renderRatingCharts(data) {
    if (!window.Chart) return;

    const configChart = (id, label, history, color) => {
      const labels = history.length > 0 ? history.slice(-10).map(h => formatDate(h.time, 'short')) : ['Jan', 'Feb', 'Mar', 'Apr', 'May'];
      const values = history.length > 0 ? history.slice(-10).map(h => h.rating) : [1500, 1550, 1530, 1620, 1750];
      this.createLineChart(id, label, labels, values, color);
    };

    configChart('lc-rating-chart', 'LC Rating', data.leetcode?.history || [], '#A855F7');
    configChart('cf-rating-chart', 'CF Rating', data.codeforces?.history || [], '#A855F7');
  },

  createLineChart(canvasId, label, labels, values, color) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    if (this[`chart_${canvasId}`]) this[`chart_${canvasId}`].destroy();

    this[`chart_${canvasId}`] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: label,
          data: values,
          borderColor: color,
          backgroundColor: 'transparent',
          borderWidth: 3,
          tension: 0.1,
          pointRadius: 4,
          pointBackgroundColor: color,
          fill: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { 
            grid: { display: false }, 
            ticks: { color: getComputedStyle(document.documentElement).getPropertyValue('--color-text-muted').trim() || '#888', font: { size: 10 } } 
          },
          y: { 
            grid: { color: getComputedStyle(document.documentElement).getPropertyValue('--color-border').trim() || 'rgba(0,0,0,0.1)' }, 
            ticks: { color: getComputedStyle(document.documentElement).getPropertyValue('--color-text-muted').trim() || '#888', font: { size: 10 } } 
          }
        }
      }
    });
  },

  /* ── 12-MONTH DECOUPLED HEATMAP ────────────────────────────── */

  renderYearlyHeatmap(data) {
    const container = document.getElementById('yearly-heatmap-container');
    if (!container) return;

    // 1. Combine Submissions
    const submissions = [...(data.leetcode?.submissions || []), ...(data.codeforces?.submissions || [])];
    const groupedData = this.groupSubmissionsByMonth(submissions);
    
    let fullYearHTML = "";
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Render last 12 months in order
    for (let i = 11; i >= 0; i--) {
        const date = new Date(currentYear, currentMonth - i, 1);
        const mIdx = date.getMonth();
        const yIdx = date.getFullYear();
        fullYearHTML += this.renderMonthHTML(mIdx, groupedData, yIdx);
    }
    container.innerHTML = fullYearHTML;

    // Update Totals
    const totalCount = submissions.reduce((acc, s) => acc + s.count, 0);
    const subTotalEl = document.getElementById('dash-submissions-total');
    if (subTotalEl) subTotalEl.textContent = totalCount;

    const activeDays = new Set(submissions.map(s => new Date(s.timestamp * 1000).toISOString().split('T')[0])).size;
    const activeDaysEl = document.getElementById('dash-active-days');
    if (activeDaysEl) activeDaysEl.textContent = activeDays;
  },

  groupSubmissionsByMonth(submissions) {
    const yearData = {};
    submissions.forEach(sub => {
        const date = new Date(sub.timestamp * 1000);
        const key = `${date.getFullYear()}-${date.getMonth()}`;
        if (!yearData[key]) yearData[key] = {};
        yearData[key][date.getDate()] = (yearData[key][date.getDate()] || 0) + sub.count;
    });
    return yearData;
  },

  renderMonthHTML(monthIndex, daysData, year) {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const key = `${year}-${monthIndex}`;
    const actualData = daysData[key] || daysData; // Handle both direct and keyed data
    
    const firstDay = new Date(year, monthIndex, 1).getDay();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

    let html = `
        <div class="month-card">
            <h4>${monthNames[monthIndex]}</h4>
            <div class="grid">
    `;

    for (let i = 0; i < firstDay; i++) {
        html += `<div class="heatmap-cell bg-transparent"></div>`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const count = actualData[day] || 0;
        const intensityClass = this.getIntensityClass(count);
        html += `
            <div class="heatmap-cell ${intensityClass}" 
                 title="${day} ${monthNames[monthIndex]}: ${count} submissions">
            </div>`;
    }

    html += `</div></div>`;
    return html;
  },

  getIntensityClass(count) {
    if (count === 0) return "intensity-0";
    if (count < 2) return "intensity-1";
    if (count < 5) return "intensity-2";
    if (count < 8) return "intensity-3";
    return "intensity-4";
  }
};

export default Dashboard;
window.CodeSphere = { ...window.CodeSphere, dashboard: Dashboard };
Dashboard.init();
