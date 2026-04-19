/**
 * firebase.js — CodeSphere Firebase Initialization
 *
 * Single source of truth for Firebase services.
 * Every other module imports { auth, db } from here —
 * this guarantees only ONE app instance is ever created.
 */

import { initializeApp }  from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js';
import { getAuth }        from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js';
import { initializeFirestore }   from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js';
import { getAnalytics }   from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-analytics.js';

import { firebaseConfig } from './config.js';

// ─────────────────────────────────────────────────────────────────
// Initialize & Export Services
// ─────────────────────────────────────────────────────────────────

const app       = initializeApp(firebaseConfig);
const auth      = getAuth(app);
const db        = initializeFirestore(app, { experimentalForceLongPolling: true });
const analytics = getAnalytics(app);

export { app, auth, db, analytics };
