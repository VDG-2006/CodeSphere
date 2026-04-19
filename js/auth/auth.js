/**
 * auth.js — CodeSphere Authentication & User State Module
 *
 * Responsibilities:
 *  - Initialize Firebase (App, Auth, Firestore).
 *  - Observe auth state and route the user accordingly.
 *  - Handle Sign In, Create Account, and Logout flows.
 *  - Run the daily-streak consistency engine on every login.
 */

import { auth, db } from '../core/firebase.js';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js';

// ─────────────────────────────────────────────────────────────────
// 1. DOM References
// ─────────────────────────────────────────────────────────────────

const loginEmailInput    = document.getElementById('login-email');
const loginPasswordInput = document.getElementById('login-password');
const loginErrorEl       = document.getElementById('login-error');
const signInBtn          = document.getElementById('sign-in-btn');

const signupEmailInput   = document.getElementById('signup-email');
const signupPasswordInput= document.getElementById('signup-password');
const signupNameInput    = document.getElementById('signup-name');
const signupErrorEl      = document.getElementById('signup-error');
const signupBtn          = document.getElementById('signup-btn');

const logoutBtn          = document.getElementById('logout-btn');
const navStreakCounterEl = document.getElementById('nav-streak-count');
const dashStreakCounterEl= document.getElementById('dash-streak-val');
const userNameEl         = document.getElementById('user-name');
const userHandleEl       = document.getElementById('user-handle');
const userAvatarEl       = document.getElementById('user-avatar');
const navAvatarEl        = document.getElementById('nav-avatar');

// ─────────────────────────────────────────────────────────────────
// 3. Utility Helpers
// ─────────────────────────────────────────────────────────────────

/**
 * Returns today's date as an ISO "YYYY-MM-DD" string in local time.
 * Using local time prevents off-by-one errors near midnight UTC.
 *
 * @returns {string}
 */
const getTodayString = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

/**
 * Calculates the difference in whole calendar days between two
 * "YYYY-MM-DD" date strings.
 *
 * @param {string} dateA  - Earlier date string.
 * @param {string} dateB  - Later date string.
 * @returns {number} Non-negative integer day difference.
 */
const dayDifference = (dateA, dateB) => {
  const msPerDay = 86_400_000;
  const tsA = new Date(dateA).getTime();
  const tsB = new Date(dateB).getTime();
  return Math.round(Math.abs(tsB - tsA) / msPerDay);
};

/**
 * Displays an error message inside a specific error banner.
 *
 * @param {HTMLElement} el     - The error DOM element.
 * @param {string} message     - Human-readable error text.
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
 * Maps Firebase Auth error codes to friendly messages so users never
 * see raw internal codes like "auth/wrong-password".
 *
 * @param {import('firebase/auth').AuthError} error
 * @returns {string}
 */
const friendlyAuthError = (error) => {
  const map = {
    'auth/invalid-email':            'Please enter a valid email address.',
    'auth/user-not-found':           'No account found with that email.',
    'auth/wrong-password':           'Incorrect password — please try again.',
    'auth/invalid-credential':       'Incorrect email or password.',
    'auth/email-already-in-use':     'An account with that email already exists.',
    'auth/weak-password':            'Password must be at least 8 characters.',
    'auth/too-many-requests':        'Too many attempts. Please wait a moment.',
    'auth/network-request-failed':   'Network error — check your connection.',
  };
  return map[error.code] ?? 'Something went wrong. Please try again.';
};

/**
 * Syncs sessionStorage with the current Firebase user so the router's
 * `isAuthenticated()` guard stays accurate.
 *
 * @param {import('firebase/auth').User | null} user
 */
const syncSessionStorage = (user, profile = null) => {
  if (user) {
    sessionStorage.setItem('cs_user', JSON.stringify({
      uid:   user.uid,
      email: user.email,
      leetcodeUsername: profile?.leetcodeUsername || null
    }));
  } else {
    sessionStorage.removeItem('cs_user');
  }
};

/**
 * Populates the profile header UI with the authenticated user's info.
 *
 * @param {import('firebase/auth').User} user
 * @param {object | null} profile - Firestore user document data (may be null).
 */
const populateProfileUI = (user, profile = null) => {
  const displayName = profile?.displayName ?? user.displayName ?? user.email.split('@')[0];
  const handle      = `@${displayName.toLowerCase().replace(/\s+/g, '')}`;

  if (userNameEl)   userNameEl.textContent   = displayName;
  if (userHandleEl) userHandleEl.textContent = handle;

  if (userAvatarEl) {
    // Use Firebase photoURL if available; otherwise use a letter-based avatar.
    const avatarSrc = user.photoURL
      ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0a0a0a&color=fff&size=80`;
    
    userAvatarEl.src = avatarSrc;
    userAvatarEl.alt = `${displayName}'s avatar`;
    
    if (navAvatarEl) {
      navAvatarEl.src = avatarSrc;
      navAvatarEl.alt = `${displayName}'s avatar`;
    }
  }
};

// ─────────────────────────────────────────────────────────────────
// 4. Streak Engine
// ─────────────────────────────────────────────────────────────────

/**
 * Checks if the user's streak should advance, reset, or stay the same,
 * persists any changes to Firestore, and updates the DOM counter.
 *
 * Streak rules:
 *   - Same day      → no change (already counted today).
 *   - 1 day apart   → streak increments.
 *   - > 1 day apart → streak resets to 1 (chain broken).
 *
 * @param {string} uid - The authenticated user's Firebase UID.
 */
const checkAndUpdateStreak = async (uid) => {
  try {
    const userRef  = doc(db, 'users', uid);
    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) {
      console.warn('checkAndUpdateStreak: user document not found.');
      return;
    }

    const data           = snapshot.data();
    const today          = getTodayString();
    const lastActive     = data.lastActiveDate ?? today;
    const currentStreak  = data.currentStreak  ?? 1;
    const diff           = dayDifference(lastActive, today);

    let newStreak   = currentStreak;
    let shouldWrite = false;

    if (diff === 0) {
      // User already logged in today — nothing to update.
      newStreak   = currentStreak;
      shouldWrite = false;
    } else if (diff === 1) {
      // Consecutive day — keep the streak going.
      newStreak   = currentStreak + 1;
      shouldWrite = true;
    } else {
      // Gap of more than one day — chain is broken.
      newStreak   = 1;
      shouldWrite = true;
    }

    if (shouldWrite) {
      await updateDoc(userRef, {
        currentStreak:  newStreak,
        lastActiveDate: today,
      });
    }

    // Reflect the final streak value in the DOM.
    if (dashStreakCounterEl) {
      dashStreakCounterEl.textContent = newStreak;
    }
    if (navStreakCounterEl) {
      navStreakCounterEl.textContent = newStreak;
    }

  } catch (error) {
    console.error('checkAndUpdateStreak failed:', error);
  }
};

// ─────────────────────────────────────────────────────────────────
// 5. Global Auth State Observer
// ─────────────────────────────────────────────────────────────────

onAuthStateChanged(auth, async (user) => {
  syncSessionStorage(user);

  if (user) {
    document.body.classList.add('is-logged-in');

    // Fetch the extended profile from Firestore for the display name etc.
    let profile = null;
    try {
      const snapshot = await getDoc(doc(db, 'users', user.uid));
      if (snapshot.exists()) profile = snapshot.data();
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    }

    populateProfileUI(user, profile);
    syncSessionStorage(user, profile);

    // Set dynamic greeting
    const displayName = profile?.displayName ?? user.displayName ?? user.email;
    if (window.CodeSphere?.setGreeting) {
      window.CodeSphere.setGreeting(displayName);
    }

    // Run the streak engine every time a session is established.
    await checkAndUpdateStreak(user.uid);

    // Call LeetCode API if handle exists
    if (profile?.leetcodeUsername && window.CodeSphere?.fetchLeetCodeStats) {
        window.CodeSphere.fetchLeetCodeStats(profile.leetcodeUsername);
    }

    // SPA Router - Dashboard logic
    if (window.CodeSphere?.router?.MapsTo) {
      window.CodeSphere.router.MapsTo('home');
    }

  } else {
    document.body.classList.remove('is-logged-in');
    
    // Clear any stale UI state and route back to landing.
    if (userNameEl)        userNameEl.textContent        = 'Guest User';
    if (userHandleEl)      userHandleEl.textContent      = '@guest';
    if (dashStreakCounterEl)  dashStreakCounterEl.textContent = '0';
    if (navStreakCounterEl)  navStreakCounterEl.textContent = '0';

    if (window.CodeSphere?.router?.MapsTo) {
      window.CodeSphere.router.MapsTo('landing');
    }
  }
});

// ─────────────────────────────────────────────────────────────────
// 6. Sign In
// ─────────────────────────────────────────────────────────────────

signInBtn?.addEventListener('click', async (e) => {
  e.preventDefault();
  clearAuthError(loginErrorEl);

  const email    = loginEmailInput?.value.trim() ?? '';
  const password = loginPasswordInput?.value ?? '';

  if (!email || !password) {
    showAuthError(loginErrorEl, 'Please enter your email and password.');
    return;
  }

  // Show a loading state on the button.
  signInBtn.disabled     = true;
  signInBtn.textContent  = 'Signing in…';

  try {
    await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged fires automatically — no manual routing needed.
    if (loginPasswordInput) loginPasswordInput.value = '';
  } catch (error) {
    showAuthError(loginErrorEl, friendlyAuthError(error));
  } finally {
    signInBtn.disabled    = false;
    signInBtn.textContent = 'Sign In';
  }
});

// ─────────────────────────────────────────────────────────────────
// 7. Create Account
// ─────────────────────────────────────────────────────────────────

signupBtn?.addEventListener('click', async (e) => {
  e.preventDefault();
  clearAuthError(signupErrorEl);

  const email = signupEmailInput?.value.trim() ?? '';
  const password = signupPasswordInput?.value ?? '';
  const displayName = signupNameInput?.value.trim() ?? '';

  if (!email || !password || !displayName) {
    showAuthError(signupErrorEl, 'Please fill out all required fields.');
    return;
  }

  signupBtn.disabled    = true;
  signupBtn.textContent = 'Creating account…';

  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const { uid }    = credential.user;
    const today      = getTodayString();

    // Bootstrap a Firestore user profile document.
    await setDoc(doc(db, 'users', uid), {
      uid,
      email,
      displayName,
      leetcodeUsername: '',
      streak: 1, // Legacy streak key mentioned by user
      currentStreak:  1,
      lastActiveDate: today,
      createdAt:      today,
      leetcode: {
        total:  0,
        easy:   0,
        medium: 0,
        hard:   0,
      },
    });

    // onAuthStateChanged fires next and handles routing + UI updates.
    if (signupPasswordInput) signupPasswordInput.value = '';
  } catch (error) {
    showAuthError(signupErrorEl, friendlyAuthError(error));
  } finally {
    signupBtn.disabled    = false;
    signupBtn.textContent = 'Create Account';
  }
});

// ─────────────────────────────────────────────────────────────────
// 8. Logout
// ─────────────────────────────────────────────────────────────────

logoutBtn?.addEventListener('click', async (e) => {
  e.preventDefault();

  try {
    await signOut(auth);
    // onAuthStateChanged will fire with user = null → routes to 'login'.
  } catch (error) {
    console.error('Logout failed:', error);
  }
});

// ─────────────────────────────────────────────────────────────────
// 9. Public API
// ─────────────────────────────────────────────────────────────────

// Expose utilities that other modules (e.g. feed.js) may need.
window.CodeSphere = window.CodeSphere ?? {};
window.CodeSphere.auth = {
  getCurrentUser: () => auth.currentUser,
  db,
};
