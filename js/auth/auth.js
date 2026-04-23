/**
 * auth.js — CodeSphere Authentication & User State Module
 *
 * Responsibilities:
 *  - Handle Sign In, Create Account, and Logout flows using Backend API.
 *  - Manage user session and profile UI updates.
 *  - Run the daily-streak consistency engine on every login.
 */

import { API_BASE } from '../core/config.js';

// ─────────────────────────────────────────────────────────────────
// 1. DOM References
// ─────────────────────────────────────────────────────────────────

const loginEmailInput    = document.getElementById('login-id'); 
const loginPasswordInput = document.getElementById('login-pass');
const loginErrorEl       = document.getElementById('login-error'); // We'll keep the same error IDs or add them to the new UI
const signInBtn          = document.getElementById('btn-login-main');

const signupUsernameInput = document.getElementById('reg-user');
const signupEmailInput   = document.getElementById('reg-email');
const signupPasswordInput= document.getElementById('reg-pass');
const signupErrorEl      = document.getElementById('signup-error');
const signupBtn          = document.getElementById('btn-register-main');

// New Handle Inputs
const signupLCInput      = document.getElementById('reg-lc');


const logoutBtn          = document.getElementById('logout-btn');
const navStreakCounterEl = document.getElementById('nav-streak-count');
const dashStreakCounterEl= document.getElementById('dash-streak-val');
const userNameEl         = document.getElementById('user-name') || document.getElementById('dash-name');
const userHandleEl       = document.getElementById('user-handle') || document.getElementById('dash-handle');
const userAvatarEl       = document.getElementById('user-avatar') || document.getElementById('dash-avatar');
const navAvatarEl        = document.getElementById('nav-avatar');

// ─────────────────────────────────────────────────────────────────
// 2. Utility Helpers
// ─────────────────────────────────────────────────────────────────

/**
 * Returns today's date as an ISO "YYYY-MM-DD" string in local time.
 */
const getTodayString = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

/**
 * Calculates the difference in whole calendar days.
 */
const dayDifference = (dateA, dateB) => {
  const msPerDay = 86_400_000;
  const tsA = new Date(dateA).getTime();
  const tsB = new Date(dateB).getTime();
  return Math.round(Math.abs(tsB - tsA) / msPerDay);
};

/**
 * Displays an error message inside a specific error banner.
 */
const showAuthError = (el, message) => {
  if (el) {
    el.textContent = message;
    el.hidden = false;
  }
};

/** Clears and hides a specific error banner. */
const clearAuthError = (el) => {
  if (el) {
    el.textContent = '';
    el.hidden = true;
  }
};

/**
 * Syncs sessionStorage with the current user.
 */
const syncSessionStorage = (user) => {
  if (user) {
    sessionStorage.setItem('cs_user', JSON.stringify(user));
  } else {
    sessionStorage.removeItem('cs_user');
  }
};

/**
 * Populates the profile header UI with the authenticated user's info.
 */
const populateProfileUI = (user) => {
  const username = user.username || 'User';
  const handle   = `@${username.toLowerCase().replace(/\s+/g, '')}`;

  if (userNameEl)   userNameEl.textContent   = username;
  if (userHandleEl) userHandleEl.textContent = handle;

  if (userAvatarEl) {
    const avatarSrc = user.avatarUrl
      ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=0a0a0a&color=fff&size=80`;
    
    userAvatarEl.src = avatarSrc;
    userAvatarEl.alt = `${username}'s avatar`;
    
    if (navAvatarEl) {
      navAvatarEl.src = avatarSrc;
      navAvatarEl.alt = `${username}'s avatar`;
    }
    
    // Top Right Capsule & Dropdown Name
    const navNameEl = document.getElementById('nav-user-name');
    const dropNameEl = document.getElementById('dropdown-user-name');
    if (navNameEl) navNameEl.textContent = username;
    if (dropNameEl) dropNameEl.textContent = username;
  }
};

// ─────────────────────────────────────────────────────────────────
// 3. Streak Engine (Legacy Sync Placeholder)
// ─────────────────────────────────────────────────────────────────

const checkAndUpdateStreak = async (user) => {
  // Currently managed by backend or simplified here
  console.log('Streak check for:', user.username);
};

// ─────────────────────────────────────────────────────────────────
// 4. Auth Logic
// ─────────────────────────────────────────────────────────────────

const initAuth = () => {
  const userJson = sessionStorage.getItem('cs_user');
  if (userJson) {
    const user = JSON.parse(userJson);
    document.body.classList.add('is-logged-in');
    populateProfileUI(user);
    
    // Set dynamic greeting
    if (window.CodeSphere?.setGreeting) {
      window.CodeSphere.setGreeting(user.username);
    }

    // Call stats API if handles exist
    if (user.handles?.leetcode && window.CodeSphere?.dashboard?.syncAllPlatforms) {
        window.CodeSphere.dashboard.syncAllPlatforms(user.handles.leetcode);
    }

    // SPA Router sync
    if (window.CodeSphere?.switchView) {
      const currentRoute = window.location.hash.replace('#', '');
      // If we are on getting-started or login/signup routes, move to home after login
      if (!currentRoute || currentRoute === 'getting-started' || currentRoute === 'landing' || currentRoute === 'login' || currentRoute === 'signup') {
        window.CodeSphere.switchView('home');
        window.location.hash = '#home';
      }
    }

    // Hide Auth Modal if open
    document.getElementById('auth-modal')?.classList.add('hidden');
  } else {
    document.body.classList.remove('is-logged-in');
    // If NOT logged in, ensure we are on getting-started
    if (window.CodeSphere?.switchView) {
      const currentRoute = window.location.hash.replace('#', '');
      if (currentRoute !== 'getting-started') {
        window.CodeSphere.switchView('getting-started');
        window.location.hash = '#getting-started';
      }
    }
  }
};

// ─────────────────────────────────────────────────────────────────
// 5. Sign In
// ─────────────────────────────────────────────────────────────────

signInBtn?.addEventListener('click', async (e) => {
  e.preventDefault();
  clearAuthError(loginErrorEl);

  const identifier = loginEmailInput?.value.trim() ?? '';
  const password = loginPasswordInput?.value ?? '';

  if (!identifier || !password) {
    showAuthError(loginErrorEl, 'Please enter your email or username.');
    return;
  }

  signInBtn.disabled     = true;
  signInBtn.textContent  = 'Signing in…';

  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password })
    });

    const result = await response.json();
    if (result.success) {
      syncSessionStorage(result.data);
      initAuth();
      if (loginPasswordInput) loginPasswordInput.value = '';
    } else {
      showAuthError(loginErrorEl, result.message || 'Invalid credentials');
    }
  } catch (error) {
    showAuthError(loginErrorEl, 'Server connection error');
  } finally {
    signInBtn.disabled    = false;
    signInBtn.textContent = 'Sign In';
  }
});

// ─────────────────────────────────────────────────────────────────
// 6. Create Account
// ─────────────────────────────────────────────────────────────────

signupBtn?.addEventListener('click', async (e) => {
  e.preventDefault();
  clearAuthError(signupErrorEl);

  const username = signupUsernameInput?.value.trim() ?? '';
  const email    = signupEmailInput?.value.trim() ?? '';
  const password = signupPasswordInput?.value ?? '';

  if (!username || !email || !password) {
    showAuthError(signupErrorEl, 'Please fill out all required fields.');
    return;
  }

  signupBtn.disabled    = true;
  signupBtn.textContent = 'Creating account…';

  try {
    const handles = {
      leetcode: signupLCInput?.value.trim() || ''
    };

    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, handles })
    });

    const result = await response.json();
    if (result.success) {
      syncSessionStorage(result.data);
      initAuth();
      if (signupPasswordInput) signupPasswordInput.value = '';
    } else {
      showAuthError(signupErrorEl, result.message || 'Signup failed');
    }
  } catch (error) {
    showAuthError(signupErrorEl, 'Server connection error');
  } finally {
    signupBtn.disabled    = false;
    signupBtn.textContent = 'Create Account';
  }
});

// ─────────────────────────────────────────────────────────────────
// 7. Logout
// ─────────────────────────────────────────────────────────────────

logoutBtn?.addEventListener('click', (e) => {
  e.preventDefault();
  syncSessionStorage(null);
  initAuth();
});

// ─────────────────────────────────────────────────────────────────
// 8. Bootstrap
// ─────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', initAuth);

// 9. UI Interactions (Dropdowns)
document.addEventListener('click', (e) => {
  const dropdown = document.getElementById('profile-dropdown');
  const capsule = document.getElementById('nav-profile-capsule');
  
  if (dropdown && !dropdown.contains(e.target) && !capsule.contains(e.target)) {
    dropdown.classList.add('hidden');
  }
});

// Public API
window.CodeSphere = window.CodeSphere ?? {};
window.CodeSphere.auth = {
  getCurrentUser: () => JSON.parse(sessionStorage.getItem('cs_user') || 'null'),
  isLoggedIn: () => !!sessionStorage.getItem('cs_user'),
  initAuth
};
