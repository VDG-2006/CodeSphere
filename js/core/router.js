/**
 * router.js — CodeSphere SPA Client-Side Router
 * Updated for separate Home and Profile sections.
 */

const DEFAULT_ROUTE = 'landing';
const PROTECTED_ROUTES = new Set(['home', 'profile']);

const ROUTE_MAP = {
  landing:  'landing-section',
  login:    'login-section',
  signup:   'signup-section',
  home:     'home-section',
  profile:  'profile-section',
  'home-redirect': ''
};

const parseHashRoute = () => {
  const hash = window.location.hash.replace('#', '').trim();
  return hash in ROUTE_MAP ? hash : DEFAULT_ROUTE;
};

const isAuthenticated = () => Boolean(sessionStorage.getItem('cs_user'));

const MapsTo = (routeId, pushState = true) => {
  let resolvedRoute = ROUTE_MAP.hasOwnProperty(routeId) ? routeId : DEFAULT_ROUTE;

  if (resolvedRoute === 'home-redirect') {
    resolvedRoute = isAuthenticated() ? 'home' : 'landing';
  }

  const targetSectionId = ROUTE_MAP[resolvedRoute];

  if (PROTECTED_ROUTES.has(resolvedRoute) && !isAuthenticated()) {
    MapsTo(DEFAULT_ROUTE, pushState);
    return;
  }

  // UI Cleanup
  document.querySelectorAll('.page-section').forEach(s => {
    s.classList.remove('active');
    s.style.display = 'none';
  });
  document.querySelectorAll('[data-route]').forEach(t => t.classList.remove('active'));

  // Reveal target
  const targetSection = document.getElementById(targetSectionId);
  if (targetSection) {
    targetSection.style.display = '';
    targetSection.classList.add('active');
  }

  // Mark nav triggers active
  document.querySelectorAll(`[data-route="${resolvedRoute}"]`).forEach(t => t.classList.add('active'));

  // History Sync
  if (pushState) {
    history.pushState({ route: resolvedRoute }, '', `#${resolvedRoute}`);
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });

  document.dispatchEvent(new CustomEvent('routechange', { detail: { route: resolvedRoute } }));

  // Feature initialization on route change
  if (resolvedRoute === 'profile') {
     // Trigger Dashboard refresh if needed
     if (window.CodeSphere?.dashboard?.refreshData) {
         window.CodeSphere.dashboard.refreshData();
     }
  }
};

// Global Listeners
document.querySelectorAll('[data-route]').forEach(trigger => {
  trigger.addEventListener('click', e => {
    e.preventDefault();
    MapsTo(trigger.dataset.route);
  });
});

window.addEventListener('popstate', e => {
  const route = e.state?.route ?? parseHashRoute();
  MapsTo(route, false);
});

// Init
const initialRoute = (() => {
  const hash = parseHashRoute();
  if (hash === DEFAULT_ROUTE && isAuthenticated()) return 'home';
  return hash;
})();

MapsTo(initialRoute, false);

window.CodeSphere = window.CodeSphere ?? {};
window.CodeSphere.router = { MapsTo };
