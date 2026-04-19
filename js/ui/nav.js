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

// ── Upload Modal Logic ───────────────────────────────────────────

const uploadBtn     = document.getElementById('nav-upload-pill');
const uploadModal   = document.getElementById('upload-modal');
const closeUpload   = document.getElementById('upload-modal-close');
const cancelUpload  = document.getElementById('upload-cancel-btn');
const dropZone      = document.getElementById('upload-drop-zone');
const fileInput     = document.getElementById('upload-file-input');

const toggleUploadModal = () => {
  if (!uploadModal) return;
  uploadModal.hidden = !uploadModal.hidden;
};

uploadBtn?.addEventListener('click', toggleUploadModal);
closeUpload?.addEventListener('click', toggleUploadModal);
cancelUpload?.addEventListener('click', toggleUploadModal);

// Close on backdrop click
uploadModal?.addEventListener('click', (e) => {
  if (e.target === uploadModal) toggleUploadModal();
});

// Drop zone triggers file input
dropZone?.addEventListener('click', () => fileInput?.click());

fileInput?.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file && dropZone) {
    dropZone.querySelector('p').textContent = `Selected: ${file.name}`;
  }
});

// ── Global Navigation Drawer ─────────────────────────────────────

const drawerBtn      = document.getElementById('nav-drawer-btn');
const drawerClose    = document.getElementById('drawer-close');
const drawerBackdrop = document.getElementById('drawer-backdrop');
const globalDrawer   = document.getElementById('global-drawer');

const toggleDrawer = (force) => {
  if (typeof force === 'boolean') {
    document.body.classList.toggle('drawer-open', force);
  } else {
    document.body.classList.toggle('drawer-open');
  }
};

drawerBtn?.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleDrawer(true);
});

drawerClose?.addEventListener('click', () => toggleDrawer(false));
drawerBackdrop?.addEventListener('click', () => toggleDrawer(false));

// Close drawer on any internal link click (delegation)
globalDrawer?.addEventListener('click', (e) => {
  const link = e.target.closest('.drawer-link');
  if (!link) return;

  // If it's a routing link, handle it via global router
  if (link.dataset.route) {
    e.preventDefault();
    toggleDrawer(false);
    
    if (window.CodeSphere?.router?.MapsTo) {
      window.CodeSphere.router.MapsTo(link.dataset.route);
    }
  } else {
    // For non-route links (maybe anchor or external), still close the drawer
    toggleDrawer(false);
  }
});

// ── Simple Search Interaction ────────────────────────────────────

const searchInput   = document.getElementById('global-search');
const navSearchBtn  = document.querySelector('.nav-search-btn');

// Focus search on "/" key
window.addEventListener('keydown', (e) => {
  if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
    if (e.key === 'Escape') document.activeElement.blur();
    return;
  }
  if (e.key === '/') {
    e.preventDefault();
    searchInput?.focus();
  }
});

navSearchBtn?.addEventListener('click', () => {
  const query = searchInput?.value.trim() ?? '';
  if (query && window.CodeSphere?.toast) {
    window.CodeSphere.toast(`Searching for "${query}"...`);
  }
});

