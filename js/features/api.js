/**
 * api.js — CodeSphere External Data Layer
 *
 * Responsibilities:
 *  - Fetch a user's LeetCode statistics from a public proxy API.
 *  - Provide a graceful local-mock fallback so the UI never breaks
 *    due to CORS restrictions, proxy downtime, or network failures.
 *  - Animate the stat counters on the dashboard using GSAP.
 */

// ─────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────

/** Primary data source — open-source LeetCode proxy. */
const LEETCODE_API_BASE = 'https://leetcode-stats-api.herokuapp.com';

/** Local fallback used when the proxy is unreachable. */
const MOCK_DATA_PATH = './assets/mockData.json';

// ─────────────────────────────────────────────────────────────────
// DOM References
// ─────────────────────────────────────────────────────────────────

const statEls = {
  total:  document.getElementById('stat-total'),
  easy:   document.getElementById('stat-easy'),
  medium: document.getElementById('stat-medium'),
  hard:   document.getElementById('stat-hard'),
};

// ─────────────────────────────────────────────────────────────────
// GSAP Counter Animation
// ─────────────────────────────────────────────────────────────────

/**
 * Animates a DOM element's `innerHTML` from its current value up to
 * `targetValue` using GSAP's object-tweening technique.
 *
 * We tween a plain object `{ val: currentValue }` and update the DOM
 * on every frame via `onUpdate`. This avoids the "innerHTML tween"
 * anti-pattern and keeps GSAP's ticker in full control.
 *
 * @param {HTMLElement} el          - The element whose text content to animate.
 * @param {number}      targetValue - The final integer to count up to.
 * @param {number}      [duration=2]- Tween duration in seconds.
 */
const animateCounter = (el, targetValue, duration = 2) => {
  if (!el || typeof gsap === 'undefined') {
    // GSAP not loaded or element missing — set the value immediately.
    if (el) el.textContent = targetValue;
    return;
  }

  // Read whatever integer is currently displayed as the start value.
  const startValue = parseInt(el.textContent, 10) || 0;
  const counter    = { val: startValue };

  gsap.to(counter, {
    val:      targetValue,
    duration,
    ease:     'power2.out',
    snap:     { val: 1 },          // enforce whole integers on every tick
    onUpdate: () => {
      el.textContent = Math.round(counter.val);
    },
  });
};

// ─────────────────────────────────────────────────────────────────
// Stat Renderer
// ─────────────────────────────────────────────────────────────────

/**
 * Destructures the API/mock payload and kicks off counter animations
 * for each stat card on the dashboard.
 *
 * Animation durations are staggered intentionally:
 *   Total  → 2.0 s  (baseline)
 *   Easy   → 1.6 s  (resolves first — fast wins feel good)
 *   Medium → 2.0 s  (mid-weight)
 *   Hard   → 2.5 s  (slightly dramatic — hard problems deserve it)
 *
 * @param {object} data - Normalised stat object.
 * @param {number} data.totalSolved
 * @param {number} data.easySolved
 * @param {number} data.mediumSolved
 * @param {number} data.hardSolved
 */
const renderStats = ({ totalSolved, easySolved, mediumSolved, hardSolved }) => {
  animateCounter(statEls.total,  totalSolved,  2.0);
  animateCounter(statEls.easy,   easySolved,   1.6);
  animateCounter(statEls.medium, mediumSolved, 2.0);
  animateCounter(statEls.hard,   hardSolved,   2.5);
};

// ─────────────────────────────────────────────────────────────────
// Local Mock Fallback
// ─────────────────────────────────────────────────────────────────

/**
 * Loads and returns the local mock data file.
 * This is the safety net invoked whenever the live API call fails.
 *
 * Keeping demo data local means the dashboard is ALWAYS functional
 * during development, demos, and any network outage — zero blank UI.
 *
 * @returns {Promise<object>} Parsed mock stat object.
 * @throws  {Error}          If even the local mock file cannot be read.
 */
const fetchMockData = async () => {
  const mockResponse = await fetch(MOCK_DATA_PATH);

  if (!mockResponse.ok) {
    throw new Error(`Mock data unavailable (${mockResponse.status}). Check that assets/mockData.json exists.`);
  }

  return mockResponse.json();
};

// ─────────────────────────────────────────────────────────────────
// Core Public Function
// ─────────────────────────────────────────────────────────────────

/**
 * Fetches a LeetCode user's solved-problem statistics, falls back to
 * local mock data on any failure, then animates the dashboard stat cards.
 *
 * Fallback safety chain:
 *   1. Try the open proxy API  →  parse JSON  →  render.
 *   2. On ANY error (CORS, 400/500, offline): warn in console, load
 *      the local mock file instead, and render from that.
 *
 * This two-tier approach ensures the UI is never left in a broken or
 * empty state during development, CI preview environments, or demos
 * where the external proxy may be rate-limited or unavailable.
 *
 * @param {string} username - The LeetCode handle to look up.
 * @returns {Promise<void>}
 */
const fetchLeetCodeStats = async (username) => {
  let data;

  try {
    // ── Primary: Live proxy API ───────────────────────────────────
    const url      = `${LEETCODE_API_BASE}/${encodeURIComponent(username)}`;
    const response = await fetch(url);

    if (!response.ok) {
      // Treat HTTP error codes as fetch failures so the catch block
      // takes over and loads the local mock gracefully.
      throw new Error(`LeetCode API responded with status ${response.status}.`);
    }

    data = await response.json();

    // Normalise field names — the proxy returns camelCase already,
    // but an explicit destructure makes downstream code resilient to
    // minor API shape changes.
    const {
      totalSolved  = 0,
      easySolved   = 0,
      mediumSolved = 0,
      hardSolved   = 0,
    } = data;

    renderStats({ totalSolved, easySolved, mediumSolved, hardSolved });

  } catch (liveError) {
    // ── Fallback: Local mock data ─────────────────────────────────
    // We log a warning (not an error) because this is expected in
    // many environments and the fallback is fully intentional.
    console.warn(
      `[CodeSphere/api] Live LeetCode fetch failed — switching to local mock.\n`,
      liveError.message
    );

    try {
      const mockData = await fetchMockData();

      const {
        totalSolved  = 0,
        easySolved   = 0,
        mediumSolved = 0,
        hardSolved   = 0,
      } = mockData;

      renderStats({ totalSolved, easySolved, mediumSolved, hardSolved });

    } catch (mockError) {
      // Both sources failed — log clearly so the developer can act.
      console.error(
        '[CodeSphere/api] Fallback mock data also failed. Stat cards will remain at 0.\n',
        mockError.message
      );
    }
  }
};

// ─────────────────────────────────────────────────────────────────
// Public API — expose on the shared CodeSphere namespace
// ─────────────────────────────────────────────────────────────────

window.CodeSphere       = window.CodeSphere ?? {};
window.CodeSphere.api   = { fetchLeetCodeStats };
