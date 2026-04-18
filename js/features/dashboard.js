/**
 * dashboard.js — CodeSphere Profile Hub + Progress Dashboard
 *
 * Responsibilities:
 *  - Auto-sync LeetCode stats from Firestore on login.
 *  - Fetch live data from the LeetCode Stats API with mock fallback.
 *  - GSAP "zipper" entrance: hub slides in from top, feed from bottom.
 *  - Dynamic time-based greeting message.
 *  - Route-sync: re-runs render when navigating to home/profile.
 *  - Expose `window.CodeSphere.fetchLeetCodeStats(username)` globally.
 */

import { auth, db } from '../core/firebase.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LEETCODE_API  = 'https://leetcode-stats-api.herokuapp.com/';
const MOCK_DATA_URL = './assets/mockData.json';

const DEFAULT_CATEGORIES = [
  { name: 'Data Structures', color: '#4ade80' },
  { name: 'Algorithms',      color: '#fbbf24' },
  { name: 'System Design',   color: '#f87171' },
];

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/**
 * Fetches LeetCode stats for a username and renders the dashboard.
 * Called by auth.js on login and by hub.js on tab switch.
 *
 * @param {string|null} username - The LeetCode username.
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
      try {
        const res = await fetch(`${LEETCODE_API}${encodeURIComponent(username)}`);
        if (res.ok) {
          const json = await res.json();
          if (json.status !== 'error' && json.totalSolved !== undefined) {
            data = json;
          }
        }
      } catch (apiErr) {
        console.warn('[Dashboard] LeetCode API unavailable. Using mock data.', apiErr);
      }
    }

    if (!data) {
      console.warn('[Dashboard] Falling back to mock data.');
      data = await fetchMockData();
    }

    renderDashboard(data);

  } catch (err) {
    console.error('[Dashboard] Render failed:', err);
  } finally {
    setLoadingState(false);
    if (syncBtn) syncBtn.classList.remove('is-syncing');
  }
}

// ─────────────────────────────────────────────────────────────
// Dynamic Greeting
// ─────────────────────────────────────────────────────────────

/**
 * Returns a time-of-day greeting with a motivational push.
 *
 * @param {string} firstName - First word of display name.
 * @returns {string}
 */
function buildGreeting(firstName) {
  const h = new Date().getHours();
  let salutation, challenge;

  if (h < 5)        { salutation = 'Burning midnight oil'; challenge = 'Ready to solve a Hard problem?'; }
  else if (h < 12)  { salutation = 'Good morning';         challenge = 'Start the day with an Easy warm-up!'; }
  else if (h < 17)  { salutation = 'Good afternoon';       challenge = 'Time to tackle a Medium challenge?'; }
  else if (h < 21)  { salutation = 'Good evening';         challenge = 'Extend your streak tonight!'; }
  else              { salutation = 'Good night';            challenge = 'One last problem before bed?'; }

  return `${salutation}, ${firstName}! 👋  ${challenge}`;
}

/**
 * Sets the greeting element text.
 *
 * @param {string} displayName
 */
function setGreeting(displayName) {
  const el = document.getElementById('hub-greeting');
  if (!el) return;
  const firstName = (displayName || 'Coder').split(' ')[0];
  el.textContent = buildGreeting(firstName);
}

// ─────────────────────────────────────────────────────────────
// Initializer
// ─────────────────────────────────────────────────────────────

function initDashboard() {
  const dashboard = document.getElementById('progress-view');
  if (!dashboard) return;

  // Register on global CodeSphere API
  window.CodeSphere = window.CodeSphere || {};
  window.CodeSphere.fetchLeetCodeStats = fetchLeetCodeStats;
  window.CodeSphere.setGreeting        = setGreeting;
  
  // Explicitly expose dashboard.render for the router
  window.CodeSphere.dashboard = {
    render: (username) => fetchLeetCodeStats(username || syncBtn?.dataset?.username || null)
  };

  // Sync button
  const syncBtn = document.getElementById('dash-sync-btn');
  syncBtn?.addEventListener('click', () => {
    const username = syncBtn.dataset.username || '';
    fetchLeetCodeStats(username || null);
  });

  // Auto-sync when auth state is confirmed
  onAuthStateChanged(auth, async (user) => {
    if (!user) return;

    try {
      const snap = await getDoc(doc(db, 'users', user.uid));
      const profile = snap.exists() ? snap.data() : null;
      const username = profile?.leetcodeUsername || null;

      // Set greeting with user's real display name
      setGreeting(profile?.displayName || user.displayName || user.email);

      fetchLeetCodeStats(username);
    } catch (err) {
      console.error('[Dashboard] Firestore fetch failed:', err);
      fetchLeetCodeStats(null);
    }
  });

  // Route-sync: re-render + animate when user navigates to home/profile
  document.addEventListener('routechange', (e) => {
    const route = e.detail?.route;
    if (route === 'home' || route === 'profile') {
      // Small delay for section to become visible before animating
      setTimeout(() => runZipperEntrance(), 60);
    }
  });
}

// ─────────────────────────────────────────────────────────────
// Data Fetchers
// ─────────────────────────────────────────────────────────────

async function fetchMockData() {
  const res = await fetch(MOCK_DATA_URL);
  if (!res.ok) throw new Error('Mock data not available.');
  return res.json();
}

// ─────────────────────────────────────────────────────────────
// Renderer
// ─────────────────────────────────────────────────────────────

function renderDashboard(data) {
  // 1. Stat counters
  animateCounter('dash-stat-total',  data.totalSolved  || 0);
  animateCounter('dash-stat-easy',   data.easySolved   || 0);
  animateCounter('dash-stat-medium', data.mediumSolved || 0);
  animateCounter('dash-stat-hard',   data.hardSolved   || 0);
  animateCounter('dash-streak-val',  data.streak       || 0);

  // 2. Competency Matrix progress bars
  renderMatrix(data);

  // 3. GSAP zipper entrance
  runZipperEntrance();
}

function renderMatrix(data) {
  const grid = document.getElementById('competency-matrix-grid');
  if (!grid) return;

  let categories = data.categories;

  if (!categories || !categories.length) {
    categories = DEFAULT_CATEGORIES.map((cat, i) => {
      const solved   = [data.easySolved,  data.mediumSolved,  data.hardSolved ][i] || 0;
      const catTotal = [data.totalEasy,   data.totalMedium,   data.totalHard  ][i] || 100;
      return { ...cat, solved, total: catTotal };
    });
  }

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
        <div class="progress-track" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="${escHtml(cat.name)} ${pct}%">
          <div class="progress-fill" style="--fill-color:${cat.color};" data-pct="${pct}"></div>
        </div>
      </div>
    `;
  }).join('');

  requestAnimationFrame(() => animateBars());
}

// ─────────────────────────────────────────────────────────────
// GSAP Animations
// ─────────────────────────────────────────────────────────────

function waitForGSAP() {
  return new Promise(resolve => {
    if (window.gsap) return resolve(window.gsap);
    const check = setInterval(() => {
      if (window.gsap) { clearInterval(check); resolve(window.gsap); }
    }, 50);
  });
}

/**
 * "Zipper" entrance:
 *  - Profile Hub slides in from the top.
 *  - Feed cards slide in from the bottom.
 *  Both animate simultaneously with slight stagger, creating a
 *  mirror "closing zipper" effect.
 */
async function runZipperEntrance() {
  const gsap = await waitForGSAP();

  // Hub slides from top
  gsap.fromTo('#profile-hub', 
    { opacity: 0, y: -40 },
    { opacity: 1, y: 0, duration: 0.65, ease: 'power3.out', clearProps: 'all' }
  );

  // Stat cards stagger in from above
  gsap.fromTo('.dash-card',
    { opacity: 0, y: -24 },
    { opacity: 1, y: 0, duration: 0.5, ease: 'back.out(1.6)', stagger: 0.07, delay: 0.1, clearProps: 'all' }
  );

  // Feed divider fades in
  gsap.fromTo('.feed-divider',
    { opacity: 0, scaleX: 0.6 },
    { opacity: 1, scaleX: 1, duration: 0.4, ease: 'power2.out', delay: 0.35, clearProps: 'all' }
  );

  // Feed cards slide from bottom
  gsap.fromTo('#main-feed-column .card',
    { opacity: 0, y: 40 },
    { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out', stagger: 0.1, delay: 0.25, clearProps: 'all' }
  );

  // Matrix section fades up
  gsap.fromTo('.matrix-section',
    { opacity: 0, y: 20 },
    { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out', delay: 0.5, clearProps: 'all' }
  );
}

async function animateCounter(elId, targetValue) {
  const el = document.getElementById(elId);
  if (!el) return;

  const gsap = await waitForGSAP();
  const proxy = { val: 0 };
  const isStreakEl = elId === 'dash-streak-val';

  if (isStreakEl) {
    if (!el.firstChild || el.firstChild.nodeType !== Node.TEXT_NODE) {
      el.insertBefore(document.createTextNode('0'), el.firstChild);
    }
  }

  gsap.to(proxy, {
    val: targetValue,
    duration: 2,
    ease: 'power3.out',
    onUpdate() {
      const v = Math.round(proxy.val).toLocaleString();
      if (isStreakEl) el.firstChild.textContent = v;
      else            el.textContent = v;
    },
    onComplete() {
      const v = targetValue.toLocaleString();
      if (isStreakEl) el.firstChild.textContent = v;
      else            el.textContent = v;
    }
  });
}

async function animateBars() {
  const gsap = await waitForGSAP();
  document.querySelectorAll('.progress-fill').forEach((fill, i) => {
    const pct = parseFloat(fill.dataset.pct) || 0;
    gsap.fromTo(fill,
      { width: '0%' },
      { width: `${pct}%`, duration: 1.4, delay: i * 0.15, ease: 'power3.out' }
    );
  });
}

// ─────────────────────────────────────────────────────────────
// Loading State
// ─────────────────────────────────────────────────────────────

function setLoadingState(isLoading) {
  document.querySelectorAll('.dash-card').forEach(card => {
    card.classList.toggle('is-loading', isLoading);
  });
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─────────────────────────────────────────────────────────────
// Bootstrap
// ─────────────────────────────────────────────────────────────

initDashboard();
