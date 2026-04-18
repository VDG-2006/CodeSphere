/**
 * nav.js — CodeSphere Navigation UI
 *
 * Responsibilities:
 *  - Toggle the avatar profile dropdown open / closed.
 *  - Delegate all dropdown link clicks to the SPA router.
 *  - Close the dropdown automatically after any navigation action.
 *  - The router itself now owns all profile/settings tab switching.
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
  // Logout is owned by auth.js — just close the dropdown
  if (e.target.closest('#logout-btn')) {
    profileDropdown.classList.remove('show');
    return;
  }

  const link = e.target.closest('a[data-route]');
  if (!link) return;

  e.preventDefault();

  // Close dropdown immediately before routing
  profileDropdown.classList.remove('show');
  profileDropdown.classList.remove('active'); // Ensure 'active' is also cleared if used

  const route = link.dataset.route;

  // Delegate to the router — it handles profile tab, dashboard render,
  // scroll, highlight, and settings tab switching
  if (window.CodeSphere?.router?.MapsTo) {
    window.CodeSphere.router.MapsTo(route);
  }
});
