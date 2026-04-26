/**
 * router.js — CodeSphere SPA Router (YouTube-Style Layout)
 *
 * Routes:
 *   Guest:     landing, login, signup
 *   Authed:    home, trending, subscriptions, history, java, dsa, webdev, ai,
 *              player/:id, dashboard, settings
 */

const DEFAULT_ROUTE = 'landing';
const PROTECTED_ROUTES = new Set([
  'home', 'trending', 'subscriptions', 'history', 'recommended',
  'java', 'dsa', 'webdev', 'ai',
  'player', 'dashboard', 'settings'
]);

// Routes that use the video grid section
const VIDEO_GRID_ROUTES = new Set([
  'home', 'trending', 'subscriptions', 'history', 'recommended',
  'java', 'dsa', 'webdev'
]);

// Maps route → section ID
const ROUTE_MAP = {
  landing: 'landing-section',
  login: 'login-section',
  signup: 'signup-section',
  home: 'home-section',
  trending: 'home-section',
  subscriptions: 'home-section',
  history: 'home-section',
  recommended: 'home-section',
  java: 'home-section',
  dsa: 'home-section',
  webdev: 'home-section',
  ai: 'ai-section',
  player: 'player-section',
  dashboard: 'dashboard-section',
  settings: 'settings-section',
};

// ── Helpers ──────────────────────────────────────────────────

const parseHashRoute = () => {
  const raw = window.location.hash.replace('#', '').trim();
  if (!raw) return DEFAULT_ROUTE;

  // Handle player/:id
  if (raw.startsWith('player/')) return 'player';

  return ROUTE_MAP.hasOwnProperty(raw) ? raw : DEFAULT_ROUTE;
};

const getPlayerIdFromHash = () => {
  const raw = window.location.hash.replace('#', '').trim();
  if (raw.startsWith('player/')) return raw.split('/')[1];
  return null;
};

const isAuthenticated = () => Boolean(sessionStorage.getItem('cs_user'));

// ── DOM ──────────────────────────────────────────────────────

const navTriggers = document.querySelectorAll('[data-route]');
const pageSections = document.querySelectorAll('.page-section');
const sidebar = document.getElementById('main-sidebar');
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebarLinks = document.querySelectorAll('.sidebar-link[data-route]');

// Guest routes hide sidebar
const GUEST_ROUTES = new Set(['landing', 'login', 'signup']);

// ── Core Navigation ──────────────────────────────────────────

const MapsTo = (routeId, pushState = true) => {
  let resolvedRoute = ROUTE_MAP.hasOwnProperty(routeId) ? routeId : DEFAULT_ROUTE;

  // Guard protected routes
  if (PROTECTED_ROUTES.has(resolvedRoute) && !isAuthenticated()) {
    MapsTo('login', pushState);
    return;
  }

  // If guest goes to landing, auto-redirect if authed
  if (resolvedRoute === DEFAULT_ROUTE && isAuthenticated()) {
    resolvedRoute = 'home';
  }

  const targetSectionId = ROUTE_MAP[resolvedRoute];

  // 1. Hide all sections
  pageSections.forEach(s => {
    s.classList.remove('active');
    s.style.display = 'none';
  });

  // 2. Show target section
  const targetSection = document.getElementById(targetSectionId);
  if (targetSection) {
    targetSection.style.display = '';
    targetSection.classList.add('active');
  }

  // 3. Sidebar: show only for authed routes, hide for guest
  if (sidebar) {
    if (GUEST_ROUTES.has(resolvedRoute)) {
      sidebar.style.display = 'none';
    } else {
      sidebar.style.display = '';
    }
  }

  // 4. Update sidebar active state
  sidebarLinks.forEach(link => {
    link.classList.toggle('active', link.dataset.route === resolvedRoute);
  });

  // 5. Update nav trigger active state
  navTriggers.forEach(t => t.classList.remove('active'));
  navTriggers.forEach(t => {
    if (t.dataset.route === resolvedRoute) t.classList.add('active');
  });

  // 6. URL bar
  if (pushState) {
    const hashVal = resolvedRoute === 'player' ? window.location.hash.replace('#', '') : resolvedRoute;
    history.pushState({ route: resolvedRoute }, '', `#${hashVal}`);
  }

  // 7. Scroll up
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // 8. Dispatch event
  document.dispatchEvent(new CustomEvent('routechange', { detail: { route: resolvedRoute } }));

  // 9. Route-specific actions
  if (VIDEO_GRID_ROUTES.has(resolvedRoute)) {
    // Load video grid for the matching category
    requestAnimationFrame(() => {
      if (window.CodeSphere?.loadGridView) {
        window.CodeSphere.loadGridView(resolvedRoute);
      }
    });
  }

  if (resolvedRoute === 'player') {
    const videoId = getPlayerIdFromHash();
    if (videoId && window.CodeSphere?.loadPlayerView) {
      requestAnimationFrame(() => window.CodeSphere.loadPlayerView(videoId));
    }
  }

  if (resolvedRoute === 'dashboard') {
    requestAnimationFrame(() => {
      if (window.CodeSphere?.dashboard?.syncAllPlatforms) {
        const user = JSON.parse(sessionStorage.getItem('cs_user') || '{}');
        const handle = user?.handles?.leetcode || user?.username;
        if (handle) window.CodeSphere.dashboard.syncAllPlatforms(handle);
      }
    });
  }
};

// ── Event Listeners ──────────────────────────────────────────

// Nav trigger clicks (buttons + links with data-route)
navTriggers.forEach(trigger => {
  trigger.addEventListener('click', e => {
    e.preventDefault();
    const route = trigger.dataset.route;
    if (route === 'logout') return; // Handled by auth.js
    MapsTo(route);
  });
});

// Sidebar link clicks
sidebarLinks.forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    MapsTo(link.dataset.route);
    // On mobile, close sidebar
    if (window.innerWidth <= 1024 && sidebar) {
      sidebar.classList.remove('open');
    }
  });
});

// Sidebar toggle (hamburger)
sidebarToggle?.addEventListener('click', () => {
  if (window.innerWidth <= 1024) {
    sidebar?.classList.toggle('open');
  } else {
    sidebar?.classList.toggle('collapsed');
    // Update main content margin
    document.querySelectorAll('.app-main-content').forEach(el => {
      el.style.marginLeft = sidebar?.classList.contains('collapsed') ? '0' : '';
    });
  }
});

// Back / Forward browser buttons
window.addEventListener('popstate', (e) => {
  const route = e.state?.route ?? parseHashRoute();
  MapsTo(route, false);
});

// hashchange for direct player links
window.addEventListener('hashchange', () => {
  const raw = window.location.hash.replace('#', '');
  if (raw.startsWith('player/')) {
    MapsTo('player', false);
  }
});

// ── Initial Load ─────────────────────────────────────────────

const initialRoute = (() => {
  const hash = parseHashRoute();
  if (hash === DEFAULT_ROUTE && isAuthenticated()) return 'home';
  return hash;
})();

MapsTo(initialRoute, false);

// ── Public API ───────────────────────────────────────────────

window.CodeSphere = window.CodeSphere ?? {};
window.CodeSphere.router = { MapsTo };
