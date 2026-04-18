/**
 * router.js — CodeSphere SPA Client-Side Router
 *
 * Responsibilities:
 *  - Map route IDs to their corresponding page sections.
 *  - Show the target section and hide all others.
 *  - Keep the nav's active state in sync.
 *  - Sync with the browser History API so the back/forward
 *    buttons work as expected.
 *  - Guard protected routes from unauthenticated access.
 *  - Handle the 'profile' route: activate Progress tab + trigger dashboard render.
 */

// ─────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────

/** Default route shown when no valid route is resolved. */
const DEFAULT_ROUTE = 'landing';

/** Routes that require the user to be authenticated. */
const PROTECTED_ROUTES = new Set(['home', 'profile', 'settings']);

/**
 * Maps every route ID to the `id` attribute of its section element.
 */
const ROUTE_MAP = {
  landing:  'landing-section',
  login:    'login-section',
  signup:   'signup-section',
  home:     'home-section',
  profile:  'home-section',   // Profile = home-section + Progress tab
  settings: 'home-section',   // Settings = home-section + Settings tab
  'home-redirect': ''         // Special logic handled dynamically
};

// ─────────────────────────────────────────────────────────────────
// DOM Selection
// ─────────────────────────────────────────────────────────────────

/** All `[data-route]` triggers in the document. */
const navTriggers = document.querySelectorAll('[data-route]');

/** Every top-level content section managed by the router. */
const pageSections = document.querySelectorAll('.page-section');

// ─────────────────────────────────────────────────────────────────
// Core: MapsTo(routeId)
// ─────────────────────────────────────────────────────────────────

/**
 * Navigates the SPA to the given route.
 *
 * @param {string} routeId   - A key from ROUTE_MAP.
 * @param {boolean} pushState - Whether to push a History entry.
 */
const MapsTo = (routeId, pushState = true) => {

  // 1. Resolve the route — fall back to default when unknown.
  let resolvedRoute = ROUTE_MAP.hasOwnProperty(routeId) ? routeId : DEFAULT_ROUTE;

  // 1b. Logo redirection: send authed users to home, guests to landing.
  if (resolvedRoute === 'home-redirect') {
    resolvedRoute = isAuthenticated() ? 'home' : 'landing';
  }

  const targetSectionId = ROUTE_MAP[resolvedRoute];

  // 2. Guard: redirect unauthenticated users away from private routes.
  if (PROTECTED_ROUTES.has(resolvedRoute) && !isAuthenticated()) {
    MapsTo(DEFAULT_ROUTE, pushState);
    return;
  }

  // 3. Hide every page section; strip .active from nav triggers.
  pageSections.forEach(section => {
    section.classList.remove('active');
    section.style.display = 'none';
  });
  navTriggers.forEach(trigger => trigger.classList.remove('active'));

  // 4. Reveal the target section.
  const targetSection = document.getElementById(targetSectionId);
  if (targetSection) {
    targetSection.style.display = '';
    targetSection.classList.add('active');
  }

  // 5. Mark the matching nav trigger(s) as active.
  navTriggers.forEach(trigger => {
    if (trigger.dataset.route === resolvedRoute) {
      trigger.classList.add('active');
    }
  });

  // 6. Sync the browser's URL bar.
  if (pushState) {
    history.pushState({ route: resolvedRoute }, '', `#${resolvedRoute}`);
  }

  // 7. Scroll to the top of the page.
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // 8. Dispatch a custom event so other modules can react.
  document.dispatchEvent(
    new CustomEvent('routechange', { detail: { route: resolvedRoute } })
  );

  // 9. ── Profile route special handling ──────────────────────────
  //    When 'profile' is activated: ensure the Progress tab is shown
  //    and call dashboard render so stats + GSAP animations fire.
  if (resolvedRoute === 'profile') {
    // 1. Scroll to the top of the page on every route change.
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Small tick to let the section become visible first.
    requestAnimationFrame(() => {
      setTimeout(() => {
        // 2. Ensure "Progress" view is active
        const progressTab = document.querySelector('[data-target="progress-view"]');
        if (progressTab && !progressTab.classList.contains('active')) {
          progressTab.click();   
        }

        // 3. Manually call render to refresh stats and animations
        if (window.CodeSphere?.dashboard?.render) {
          window.CodeSphere.dashboard.render();
        }

        // Pulse-highlight so the user knows exactly where their profile is
        const profileHub = document.getElementById('profile-hub');
        if (profileHub) {
          profileHub.classList.add('profile-hub--highlight');
          setTimeout(() => profileHub.classList.remove('profile-hub--highlight'), 1800);
        }
      }, 80);
    });
  }

  // 10. ── Settings route special handling ───────────────────────
  if (resolvedRoute === 'settings') {
    requestAnimationFrame(() => {
      setTimeout(() => {
        const settingsTab = document.querySelector('[data-target="settings-view"]');
        if (settingsTab && !settingsTab.classList.contains('active')) {
          settingsTab.click();
        }
      }, 80);
    });
  }
};

// ─────────────────────────────────────────────────────────────────
// Event Listeners: nav trigger clicks
// ─────────────────────────────────────────────────────────────────

navTriggers.forEach(trigger => {
  trigger.addEventListener('click', e => {
    e.preventDefault();

    const route = trigger.dataset.route;

    // Logout is handled by auth.js
    if (route === 'logout') return;

    MapsTo(route);
  });
});

// ─────────────────────────────────────────────────────────────────
// History API: back / forward button support
// ─────────────────────────────────────────────────────────────────

window.addEventListener('popstate', e => {
  const route = e.state?.route ?? parseHashRoute();
  MapsTo(route, false);
});

// ─────────────────────────────────────────────────────────────────
// Initial Load: resolve the correct starting route
// ─────────────────────────────────────────────────────────────────

// If the user lands on the root URL with no hash and is already
// authenticated (session persisted), route them to home instead
// of staying on the landing page.
const initialRoute = (() => {
  const hash = parseHashRoute();
  // No hash specified — check if authed user should skip landing
  if (hash === DEFAULT_ROUTE && isAuthenticated()) {
    return 'home';
  }
  return hash;
})();

MapsTo(initialRoute, false);

// ─────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────

window.CodeSphere = window.CodeSphere ?? {};
window.CodeSphere.router = { MapsTo };

// ─────────────────────────────────────────────────────────────────
// Helpers (module-private)
// ─────────────────────────────────────────────────────────────────

/**
 * Reads the current URL hash and returns a clean route ID.
 * Falls back to DEFAULT_ROUTE when the hash is absent or unrecognised.
 */
const parseHashRoute = () => {
  const hash = window.location.hash.replace('#', '').trim();
  return hash in ROUTE_MAP ? hash : DEFAULT_ROUTE;
};

/**
 * Thin authentication check.
 * auth.js writes to sessionStorage under 'cs_user' on sign-in.
 */
const isAuthenticated = () => Boolean(sessionStorage.getItem('cs_user'));
