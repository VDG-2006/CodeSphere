/**
 * auth.js — CodeSphere Authentication Module (MERN Backend)
 *
 * Responsibilities:
 *  - Handle Sign In, Create Account, and Logout flows via MERN API.
 *  - Sync sessionStorage for the router's auth guard.
 *  - Populate profile hub UI on successful auth.
 *  - Expose auth utilities to other modules.
 */

import { API_BASE } from '../core/config.js';

// ─────────────────────────────────────────────────────────────────
// 1. DOM References (matching new reference HTML)
// ─────────────────────────────────────────────────────────────────

const loginForm          = document.getElementById('login-form');
const loginErrorEl       = document.getElementById('login-error');
const signInBtn          = document.getElementById('sign-in-btn');

const signupForm         = document.getElementById('signup-form');
const signupErrorEl      = document.getElementById('signup-error');
const signupBtn          = document.getElementById('signup-btn');

const logoutBtn          = document.getElementById('logout-btn');
const navStreakCounterEl  = document.getElementById('nav-streak-count');
const dashStreakCounterEl = document.getElementById('dash-streak-val');
const userNameEl         = document.getElementById('user-name');
const userHandleEl       = document.getElementById('user-handle');
const userAvatarEl       = document.getElementById('user-avatar');
const navAvatarEl        = document.getElementById('nav-avatar');
const composerAvatarEl   = document.getElementById('composer-avatar');
const hubGreetingEl      = document.getElementById('hub-greeting');

// ─────────────────────────────────────────────────────────────────
// 2. Utility Helpers
// ─────────────────────────────────────────────────────────────────

const showAuthError = (el, message) => {
  if (el) {
    el.textContent = message;
    el.hidden = false;
  }
};

const clearAuthError = (el) => {
  if (el) {
    el.textContent = '';
    el.hidden = true;
  }
};

/**
 * Populates the profile hub and nav with the authenticated user's info.
 */
const populateProfileUI = (userData) => {
  const displayName = userData.username || userData.email?.split('@')[0] || 'User';
  const handle      = `@${displayName.toLowerCase().replace(/\s+/g, '')}`;

  if (userNameEl)   userNameEl.textContent   = displayName;
  if (userHandleEl) userHandleEl.textContent = handle;

  const avatarSrc = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=6366f1&color=fff&size=80`;
  
  if (userAvatarEl) {
    userAvatarEl.src = avatarSrc;
    userAvatarEl.alt = `${displayName}'s avatar`;
  }
  if (navAvatarEl) {
    navAvatarEl.src = avatarSrc;
    navAvatarEl.alt = `${displayName}'s avatar`;
  }
  if (composerAvatarEl) {
    composerAvatarEl.src = avatarSrc;
  }

  // Set greeting
  setGreeting(displayName);
};

/**
 * Returns a time-of-day greeting with a motivational message.
 */
function setGreeting(displayName) {
  if (!hubGreetingEl) return;
  const h = new Date().getHours();
  const firstName = (displayName || 'Coder').split(' ')[0];
  let salutation;

  if (h < 5)        salutation = 'Burning midnight oil';
  else if (h < 12)  salutation = 'Good morning';
  else if (h < 17)  salutation = 'Good afternoon';
  else if (h < 21)  salutation = 'Good evening';
  else              salutation = 'Good night';

  hubGreetingEl.textContent = `${salutation}, ${firstName}! 👋`;
}

// ─────────────────────────────────────────────────────────────────
// 3. Auth State — Check session on load
// ─────────────────────────────────────────────────────────────────

const checkSession = () => {
  const userJson = sessionStorage.getItem('cs_user');
  const isAuthed = !!userJson;
  
  document.body.classList.toggle('is-logged-in', isAuthed);

  if (isAuthed) {
    try {
      const userData = JSON.parse(userJson);
      populateProfileUI(userData);

      // Hydrate LeetCode handle into settings
      const lcInput = document.getElementById('settings-leetcode');
      if (lcInput && userData.handles?.leetcode) {
        lcInput.value = userData.handles.leetcode;
      }
    } catch (e) {
      console.error('[Auth] Session parse error:', e);
    }
  }
};

// ─────────────────────────────────────────────────────────────────
// 4. Sign In
// ─────────────────────────────────────────────────────────────────

loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAuthError(loginErrorEl);

  const email    = loginForm.querySelector('#login-email')?.value.trim() ?? '';
  const password = loginForm.querySelector('#login-password')?.value ?? '';

  if (!email || !password) {
    showAuthError(loginErrorEl, 'Please enter your email and password.');
    return;
  }

  if (signInBtn) {
    signInBtn.disabled    = true;
    signInBtn.textContent = 'Signing in…';
  }

  try {
    const resp = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: email, password })
    });

    const result = await resp.json();
    if (result.success) {
      sessionStorage.setItem('cs_user', JSON.stringify(result.data));
      localStorage.setItem('cs_token', result.data.token);
      
      document.body.classList.add('is-logged-in');
      populateProfileUI(result.data);

      // Route to home via router
      if (window.CodeSphere?.router?.MapsTo) {
        window.CodeSphere.router.MapsTo('home');
      }

      // Trigger dashboard sync if leetcode handle exists
      if (result.data.handles?.leetcode && window.CodeSphere?.dashboard?.syncAllPlatforms) {
        window.CodeSphere.dashboard.syncAllPlatforms();
      }
    } else {
      showAuthError(loginErrorEl, result.message || 'Incorrect email or password.');
    }
  } catch (err) {
    console.error('[Auth] Login Error:', err);
    showAuthError(loginErrorEl, 'Network error — check your connection.');
  } finally {
    if (signInBtn) {
      signInBtn.disabled    = false;
      signInBtn.textContent = 'Sign In';
    }
  }
});

// ─────────────────────────────────────────────────────────────────
// 5. Create Account
// ─────────────────────────────────────────────────────────────────

signupForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAuthError(signupErrorEl);

  const username  = signupForm.querySelector('#signup-name')?.value.trim() ?? '';
  const email     = signupForm.querySelector('#signup-email')?.value.trim() ?? '';
  const password  = signupForm.querySelector('#signup-password')?.value ?? '';
  const leetcode  = signupForm.querySelector('#signup-leetcode')?.value.trim() ?? '';
  const codeforces = signupForm.querySelector('#signup-codeforces')?.value.trim() ?? '';

  if (!username || !email || !password) {
    showAuthError(signupErrorEl, 'Please fill out all required fields.');
    return;
  }

  if (signupBtn) {
    signupBtn.disabled    = true;
    signupBtn.textContent = 'Creating account…';
  }

  try {
    const resp = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        email,
        password,
        handles: { leetcode, codeforces }
      })
    });

    const result = await resp.json();
    if (result.success) {
      sessionStorage.setItem('cs_user', JSON.stringify(result.data));
      localStorage.setItem('cs_token', result.data.token);
      
      document.body.classList.add('is-logged-in');
      populateProfileUI(result.data);

      if (window.CodeSphere?.router?.MapsTo) {
        window.CodeSphere.router.MapsTo('home');
      }
    } else {
      showAuthError(signupErrorEl, result.message || 'Registration failed.');
    }
  } catch (err) {
    console.error('[Auth] Signup Error:', err);
    showAuthError(signupErrorEl, 'Network error. Please try again.');
  } finally {
    if (signupBtn) {
      signupBtn.disabled    = false;
      signupBtn.textContent = 'Create Account';
    }
  }
});

// ─────────────────────────────────────────────────────────────────
// 6. Logout
// ─────────────────────────────────────────────────────────────────

logoutBtn?.addEventListener('click', (e) => {
  e.preventDefault();

  sessionStorage.removeItem('cs_user');
  localStorage.removeItem('cs_token');
  document.body.classList.remove('is-logged-in');

  // Reset UI
  if (userNameEl)        userNameEl.textContent        = 'Guest User';
  if (userHandleEl)      userHandleEl.textContent      = '@guest';
  if (dashStreakCounterEl) dashStreakCounterEl.textContent = '0';
  if (navStreakCounterEl) navStreakCounterEl.textContent  = '0';

  if (window.CodeSphere?.router?.MapsTo) {
    window.CodeSphere.router.MapsTo('landing');
  }
});

// ─────────────────────────────────────────────────────────────────
// 7. Initialize
// ─────────────────────────────────────────────────────────────────

checkSession();

// ─────────────────────────────────────────────────────────────────
// 8. Public API
// ─────────────────────────────────────────────────────────────────

window.CodeSphere = window.CodeSphere ?? {};
window.CodeSphere.auth = {
  getCurrentUser: () => {
    const json = sessionStorage.getItem('cs_user');
    return json ? JSON.parse(json) : null;
  },
  populateProfileUI,
  setGreeting,
};
