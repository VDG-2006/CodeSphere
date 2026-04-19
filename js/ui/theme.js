/**
 * theme.js — Centralized Dark/Light Mode Management
 *
 * This script handles theme initialization, persistence in localStorage,
 * and dynamic UI updates for the Appearance toggle in the Profile dropdown.
 */

const THEME_KEY = 'cs_theme';

/**
 * Updates the Appearance item in the Profile dropdown to match current theme.
 */
function updateThemeUI(theme) {
  const themeItem = document.getElementById('theme-toggle-item');
  if (!themeItem) return;

  const textSlot = themeItem.querySelector('.theme-text-slot');

  if (textSlot) textSlot.textContent = `Appearance: ${theme.charAt(0).toUpperCase() + theme.slice(1)}`;
}

/**
 * Toggles between 'dark' and 'light' themes.
 */
function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  const newTheme = (currentTheme === 'dark' ? 'light' : 'dark');

  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem(THEME_KEY, newTheme);
  updateThemeUI(newTheme);
  
  // Optional: trigger a global event for other components
  window.dispatchEvent(new CustomEvent('cs-theme-changed', { detail: { theme: newTheme } }));
}

// Initialization on DOM Load
document.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem(THEME_KEY) || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  
  // Initial UI sync
  updateThemeUI(savedTheme);

  // Hook into the dropdown item
  const themeItem = document.getElementById('theme-toggle-item');
  if (themeItem) {
    themeItem.addEventListener('click', (e) => {
      e.preventDefault();
      toggleTheme();
    });
  }
});

// Export to window for global access if needed
window.CodeSphere = window.CodeSphere || {};
window.CodeSphere.toggleTheme = toggleTheme;
