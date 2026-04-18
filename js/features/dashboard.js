/**
 * dashboard.js — CodeSphere Profile Hub + Progress Dashboard
 *
 * Merged with previous api.js logic for a consolidated data layer.
 * Standardizes IDs with the 'dash-' prefix.
 */

import { auth, db } from '../core/firebase.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const ALFA_API_BASE = 'https://alfa-leetcode-api.onrender.com';
const MOCK_DATA_URL = './assets/mockData.json';

const DEFAULT_CATEGORIES = [
  { name: 'Data Structures', color: '#4ade80' },
  { name: 'Algorithms',      color: '#fbbf24' },
  { name: 'System Design',   color: '#f87171' },
];

// ─────────────────────────────────────────────────────────────
// Core Logic: Fetching
// ─────────────────────────────────────────────────────────────

/**
 * Helper to fetch local mock data for fallbacks.
 */
async function fetchMockData() {
  try {
    const res = await fetch(MOCK_DATA_URL);
    return await res.json();
  } catch (err) {
    console.error('[Dashboard] Mock data fetch failed:', err);
    return { totalSolved: 0, easySolved: 0, mediumSolved: 0, hardSolved: 0, streak: 0 };
  }
}

/**
 * Sole public entry point for stat rendering.
 * @param {string|null} username - Handle or null for mock fallback.
 */
export async function fetchLeetCodeStats(username) {
  const syncBtn = document.getElementById('dash-sync-btn');
  if (syncBtn) {
    syncBtn.classList.add('is-syncing');
    syncBtn.dataset.username = username || '';
  }

  setLoadingState(true);

  try {
    let data = null;

    if (username) {
      // We use the /solved endpoint for the quickest data retrieval
      const res = await fetch(`${ALFA_API_BASE}/${encodeURIComponent(username)}/solved`);
      
      if (res.ok) {
        const json = await res.json();
        
        // Alfa API uses "solvedProblem" instead of "totalSolved"
        data = {
          totalSolved: json.solvedProblem || 0,
          easySolved: json.easySolved || 0,
          mediumSolved: json.mediumSolved || 0,
          hardSolved: json.hardSolved || 0,
          streak: 0 // Note: Most proxies don't provide real streaks; we use Firestore for this
        };
      }
    }

    if (!data) {
      console.warn('[Dashboard] API failed or no username. Using mock fallback.');
      data = await fetchMockData();
    }

    renderDashboard(data);

  } catch (err) {
    console.error('[Dashboard] Alfa API Error:', err);
    // Silent fallback to mock so the UI doesn't break for the user
    const mock = await fetchMockData();
    renderDashboard(mock);
  } finally {
    setLoadingState(false);
    if (syncBtn) syncBtn.classList.remove('is-syncing');
  }
}

// ─────────────────────────────────────────────────────────────
// Renderer
// ─────────────────────────────────────────────────────────────

function renderDashboard(data) {
  // 1. Animate counters using standardized 'dash-' IDs
  animateCounter('dash-stat-total',  data.totalSolved  || 0, 2.0);
  animateCounter('dash-stat-easy',   data.easySolved   || 0, 1.6);
  animateCounter('dash-stat-medium', data.mediumSolved || 0, 2.0);
  animateCounter('dash-stat-hard',   data.hardSolved   || 0, 2.5);
  animateCounter('dash-streak-val',  data.streak       || 0, 1.8);

  // Social & Community Integration
  if (data.social) {
    animateCounter('dash-follower-count', Math.round(Math.random() * 5 + 5), 1.0); // mock variations
    animateCounter('dash-following-count', data.social.following || 10, 1.0);
  }
  if (data.community) {
    animateCounter('dash-views-count', data.community.views || 0, 1.0);
  }

  // 2. Generate Full 52-Week Heatmap Scaffold
  renderHeatmap();

  // 3. Competency Matrix
  renderMatrix(data);

  // 4. Animation entrance (only if section is active)
  const homeSection = document.getElementById('home-section');
  if (homeSection?.classList.contains('active')) {
    setTimeout(runZipperEntrance, 50);
  }
}

function renderHeatmap() {
  const container = document.getElementById('heatmap-placeholder');
  if (!container) return;
  // Build 52 columns with 7 rows (364 cells)
  let html = '';
  for (let c = 0; c < 52; c++) {
    html += '<div class="heatmap-col">';
    for (let r = 0; r < 7; r++) {
      // Random mock intensity (mostly 0)
      const lvl = Math.random() > 0.8 ? Math.floor(Math.random() * 4) + 1 : 0;
      html += `<div class="heatmap-cell" data-lvl="${lvl}"></div>`;
    }
    html += '</div>';
  }
  container.innerHTML = html;
}

function renderMatrix(data) {
  const grid = document.getElementById('competency-matrix-grid');
  if (!grid) return;

  const categories = data.categories || DEFAULT_CATEGORIES.map((cat, i) => {
    const solved   = [data.easySolved,  data.mediumSolved,  data.hardSolved ][i] || 0;
    const catTotal = [data.totalEasy,   data.totalMedium,   data.totalHard  ][i] || 100;
    return { ...cat, solved, total: catTotal };
  });

  grid.innerHTML = categories.map(cat => {
    const pct = Math.min(100, Math.round((cat.solved / cat.total) * 100)) || 0;
    return `
      <div class="matrix-item">
        <div class="matrix-item__header">
          <span class="matrix-item__name">${escHtml(cat.name)}</span>
          <span class="matrix-item__meta">
            <span class="matrix-item__pct">${pct}%</span>
            &nbsp;·&nbsp; ${cat.solved}/${cat.total}
          </span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="--fill-color:${cat.color};" data-pct="${pct}"></div>
        </div>
      </div>
    `;
  }).join('');

  requestAnimationFrame(() => animateBars());
}

// ─────────────────────────────────────────────────────────────
// Animations
// ─────────────────────────────────────────────────────────────

async function waitForGSAP() {
  return new Promise(resolve => {
    if (window.gsap) return resolve(window.gsap);
    const itv = setInterval(() => { if (window.gsap) { clearInterval(itv); resolve(window.gsap); } }, 50);
  });
}

export async function runZipperEntrance() {
  const gsap = await waitForGSAP();
  
  // Slide profile hub from top
  gsap.fromTo('#profile-hub',
    { opacity: 0, y: -40 },
    { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', clearProps: 'all' }
  );

  // Stagger stat cards from below
  gsap.fromTo('.dash-card',
    { opacity: 0, scale: 0.9, y: 30 },
    { opacity: 1, scale: 1, y: 0, duration: 0.5, stagger: 0.08, ease: 'back.out(1.7)', clearProps: 'all', delay: 0.1 }
  );

  // Slide feed/other content from bottom
  gsap.fromTo('#main-feed-column .card',
    { opacity: 0, y: 50 },
    { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power3.out', clearProps: 'all', delay: 0.2 }
  );
}

async function animateCounter(id, target, duration = 2) {
  const el = document.getElementById(id);
  if (!el) return;

  const gsap = await waitForGSAP();
  const startValue = parseInt(el.textContent, 10) || 0;
  const proxy = { val: startValue };

  gsap.to(proxy, {
    val: target,
    duration,
    ease: 'power3.out',
    onUpdate: () => {
      const v = Math.round(proxy.val).toLocaleString();
      if (id === 'dash-streak-val') {
        const span = el.querySelector('.streak-unit');
        el.textContent = v;
        if (span) el.appendChild(span);
      } else {
        el.textContent = v;
      }
    }
  });
}

function animateBars() {
  document.querySelectorAll('.progress-fill').forEach((fill, i) => {
    const pct = fill.dataset.pct || 0;
    if (window.gsap) {
      window.gsap.fromTo(fill, { width: '0%' }, { width: `${pct}%`, duration: 1.5, delay: i * 0.1, ease: 'power3.out' });
    } else {
      fill.style.width = `${pct}%`;
    }
  });
}

// ─────────────────────────────────────────────────────────────
// Init
// ─────────────────────────────────────────────────────────────

function setGreeting(displayName) {
  const el = document.getElementById('hub-greeting');
  if (!el) return;
  const h = new Date().getHours();
  const greeting = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  el.textContent = `${greeting}, ${(displayName || 'Coder').split(' ')[0]}! 👋`;
}

function initDashboard() {
  if (!document.getElementById('profile-hub')) return;

  window.CodeSphere = window.CodeSphere || {};
  window.CodeSphere.dashboard = {
    render: (user) => fetchLeetCodeStats(user),
    setGreeting
  };

  document.getElementById('dash-sync-btn')?.addEventListener('click', (e) => {
    fetchLeetCodeStats(e.currentTarget.dataset.username);
  });

  onAuthStateChanged(auth, async (u) => {
    if (!u) return;
    const snap = await getDoc(doc(db, 'users', u.uid));
    const p = snap.exists() ? snap.data() : null;
    setGreeting(p?.displayName || u.displayName);
    fetchLeetCodeStats(p?.leetcodeUsername || null);
  });
}

function setLoadingState(isLoading) {
  document.querySelectorAll('.dash-card').forEach(c => c.classList.toggle('is-loading', isLoading));
}

function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

initDashboard();
