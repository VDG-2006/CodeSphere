/**
 * theme.js — Dark/Light Mode Toggle Logic
 *
 * Checks localStorage for preference, applies the data-theme attribute,
 * and handles the toggle button click events to update mode and SVG icons.
 */

const THEME_KEY = 'cs_theme';

// Light and Dark mode SVG icons
const ICONS = {
  dark: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`,
  light: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`
};

document.addEventListener('DOMContentLoaded', () => {
  const themeToggle = document.getElementById('theme-toggle');
  
  // 1. Initial Load: Check preference or default to dark
  const savedTheme = localStorage.getItem(THEME_KEY) || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);

  // 2. Sync Checkbox State: (Checked = Dark Mode / Right Position)
  if (themeToggle) {
    themeToggle.checked = (savedTheme === 'dark');

    // 3. Listen for Toggle Changes
    themeToggle.addEventListener('change', () => {
      const isDark = themeToggle.checked;
      const newTheme = isDark ? 'dark' : 'light';

      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem(THEME_KEY, newTheme);
    });
  }
});
