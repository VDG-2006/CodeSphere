/**
 * theme.js — Dark/Light Mode Toggle Logic
 *
 * Checks localStorage for preference, applies the data-theme attribute,
 * and handles the toggle button click events.
 */

const THEME_KEY = 'cs_theme';

document.addEventListener('DOMContentLoaded', () => {
  const themeToggle = document.getElementById('theme-toggle');
  
  // 1. Initial Load: Check preference or default to dark
  const savedTheme = localStorage.getItem(THEME_KEY) || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  // 2. Sync Checkbox State: (Checked = Dark Mode / Right Position)
  if (themeToggle) {
    themeToggle.checked = (savedTheme === 'dark');

    // 3. Listen for Toggle Changes
    themeToggle.addEventListener('change', () => {
      const isDark = themeToggle.checked;
      const newTheme = isDark ? 'dark' : 'light';

      document.documentElement.setAttribute('data-theme', newTheme);
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      localStorage.setItem(THEME_KEY, newTheme);
    });
  }
});
