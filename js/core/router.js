/**
 * router.js — CodeSphere SPA Client-Side Router
 *
 * Responsibilities:
 *  - Map route IDs to their corresponding page sections.
 *  - Show the target section and hide all others.
 *  - Guard protected routes from unauthenticated access.
 *  - Handle the 'profile' route: activate Progress tab + trigger dashboard render.
 */

// ─────────────────────────────────────────────────────────────────
// 1. Constants
// ─────────────────────────────────────────────────────────────────

const DEFAULT_ROUTE = 'landing';
const PROTECTED_ROUTES = new Set(['home', 'profile', 'settings']);

const ROUTE_MAP = {
  landing:  'landing-section',
  login:    'login-section',
  signup:   'signup-section',
  home:     'home-section',
  profile:  'home-section',
  settings: 'home-section',
  'home-redirect': ''
};

// ─────────────────────────────────────────────────────────────────
// 2. Helpers (Moved to TOP to avoid ReferenceErrors)
// ─────────────────────────────────────────────────────────────────

/**
 * Reads the current URL hash and returns a clean route ID.
 */
const parseHashRoute = () => {
  const hash = window.location.hash.replace('#', '').trim();
  return hash in ROUTE_MAP ? hash : DEFAULT_ROUTE;
};

/**
 * Thin authentication check.
 */
const isAuthenticated = () => Boolean(sessionStorage.getItem('cs_user'));

// ─────────────────────────────────────────────────────────────────
// 3. DOM Selection (Declared before use in MapsTo)
// ─────────────────────────────────────────────────────────────────

const navTriggers  = document.querySelectorAll('[data-route]');
const pageSections = document.querySelectorAll('.page-section');

// ─────────────────────────────────────────────────────────────────
// 4. Core: MapsTo(routeId)
// ─────────────────────────────────────────────────────────────────

/**
 * Navigates the SPA to the given route.
 */
const MapsTo = (routeId, pushState = true) => {

  // Resolve the route
  let resolvedRoute = ROUTE_MAP.hasOwnProperty(routeId) ? routeId : DEFAULT_ROUTE;

  // Logo redirection
  if (resolvedRoute === 'home-redirect') {
    resolvedRoute = isAuthenticated() ? 'home' : 'landing';
  }

  const targetSectionId = ROUTE_MAP[resolvedRoute];

  // Auth Guard
  if (PROTECTED_ROUTES.has(resolvedRoute) && !isAuthenticated()) {
    MapsTo(DEFAULT_ROUTE, pushState);
    return;
  }

  // Hide all sections
  pageSections.forEach(section => {
    section.classList.remove('active');
    section.style.display = 'none';
  });
  navTriggers.forEach(trigger => trigger.classList.remove('active'));

  // Reveal target
  const targetSection = document.getElementById(targetSectionId);
  if (targetSection) {
    targetSection.style.display = '';
    targetSection.classList.add('active');
  }

  // Mark nav triggers active
  navTriggers.forEach(trigger => {
    if (trigger.dataset.route === resolvedRoute) {
      trigger.classList.add('active');
    }
  });

  // History Sync
  if (pushState) {
    history.pushState({ route: resolvedRoute }, '', `#${resolvedRoute}`);
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });

  document.dispatchEvent(
    new CustomEvent('routechange', { detail: { route: resolvedRoute } })
  );

  // Profile handling
  if (resolvedRoute === 'profile' || resolvedRoute === 'home') {
    requestAnimationFrame(() => {
      setTimeout(() => {
        const progressTab = document.querySelector('[data-target="progress-view"]');
        if (progressTab && !progressTab.classList.contains('active')) {
          progressTab.click();   
        }

        if (resolvedRoute === 'profile') {
          let leetcodeUsername = null;
          try {
            const userData = JSON.parse(sessionStorage.getItem('cs_user') || '{}');
            leetcodeUsername = userData.leetcodeUsername || null;
          } catch (e) {
            console.warn('[Router] Session parse failed');
          }

          if (window.CodeSphere?.dashboard?.render) {
            window.CodeSphere.dashboard.render(leetcodeUsername);
          }
        }
      }, 100);
    });
  }

  // Settings handling
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
// 5. Event Listeners
// ─────────────────────────────────────────────────────────────────

navTriggers.forEach(trigger => {
  trigger.addEventListener('click', e => {
    e.preventDefault();
    const route = trigger.dataset.route;
    if (route === 'logout') return;
    MapsTo(route);
  });
});

window.addEventListener('popstate', e => {
  const route = e.state?.route ?? parseHashRoute();
  MapsTo(route, false);
});

// ─────────────────────────────────────────────────────────────────
// 6. Initial Load (Called last after all initializations)
// ─────────────────────────────────────────────────────────────────

const initialRoute = (() => {
  const hash = parseHashRoute();
  if (hash === DEFAULT_ROUTE && isAuthenticated()) {
    return 'home';
  }
  return hash;
})();

MapsTo(initialRoute, false);

// ─────────────────────────────────────────────────────────────────
// 7. Public API
// ─────────────────────────────────────────────────────────────────

window.CodeSphere = window.CodeSphere ?? {};
window.CodeSphere.router = { MapsTo };
