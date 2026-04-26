/**
 * nav.js — CodeSphere Navigation UI
 * Profile dropdown toggle + close-on-outside-click
 */

const profileTrigger  = document.getElementById('nav-profile-trigger');
const profileDropdown = document.getElementById('profile-dropdown');

// ── Toggle dropdown on avatar click ──────────────────────────────

profileTrigger?.addEventListener('click', (e) => {
  e.stopPropagation();
  profileDropdown?.classList.toggle('show');
});

// ── Close dropdown when clicking anywhere outside ─────────────────

window.addEventListener('click', (e) => {
  if (!profileDropdown?.classList.contains('show')) return;
  if (!profileTrigger?.contains(e.target) && !profileDropdown?.contains(e.target)) {
    profileDropdown.classList.remove('show');
  }
});

// ── Handle dropdown link clicks ───────────────────────────────────

profileDropdown?.addEventListener('click', (e) => {
  if (e.target.closest('#logout-btn')) {
    profileDropdown.classList.remove('show');
    return;
  }

  const link = e.target.closest('a[data-route]');
  if (!link) return;

  e.preventDefault();
  profileDropdown.classList.remove('show');

  const route = link.dataset.route;
  if (window.CodeSphere?.router?.MapsTo) {
    window.CodeSphere.router.MapsTo(route);
  }
});

// ── Close sidebar overlay on outside click (mobile) ───────────────

const sidebar = document.getElementById('main-sidebar');
document.addEventListener('click', (e) => {
  if (window.innerWidth > 1024) return;
  if (!sidebar?.classList.contains('open')) return;
  if (sidebar.contains(e.target)) return;
  if (e.target.closest('#sidebar-toggle')) return;
  sidebar.classList.remove('open');
});
