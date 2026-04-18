# CodeSphere — Build Summary

A vanilla JavaScript SPA (no frameworks) — social learning platform for CS students.

---

## Project Structure

```
CodeSphere/
├── index.html
├── .gitignore
├── css/
│   ├── base.css
│   ├── layout.css
│   └── components.css
├── js/
│   ├── firebase.js
│   ├── config.js          ← gitignored (real keys)
│   ├── config.example.js  ← committed (blank template)
│   ├── router.js
│   ├── auth.js
│   ├── api.js
│   └── feed.js
└── assets/
    └── mockData.json
```

---

## Files Built

### `index.html`
Semantic HTML5 SPA shell with three page sections:
- **Login Portal** — email/password form, Sign In + Create Account buttons
- **Profile Dashboard** — avatar, name, 🔥 streak badge, LeetCode stat grid (4 cards), competency matrix container
- **Active Feed** — composer form (text + video upload), feed container

Global `<nav>` with `data-route` attributes for the JS router. GSAP + all JS modules loaded as `type="module"` scripts in dependency order: `firebase → router → auth → feed`.

---

### `css/base.css`
- Full CSS reset (`*` + `box-sizing: border-box`)
- **30+ CSS custom properties** in `:root` — full color palette, spacing scale, type scale, shadows, radii, transitions
- Inter font via Google Fonts (`@import` at line 1, required by CSS spec)
- `focus-visible` ring, custom scrollbar, `::selection` style

### `css/layout.css`
- **SPA routing classes**: `.page-section { display: none }` / `.page-section.active` with a fade+slide-up `@keyframes` entry animation
- Sticky `<header>` at `--nav-height: 64px`
- `#feed-section.active` overrides to `display: flex` (not block)
- LeetCode stat grid: `repeat(4,1fr)` → `repeat(2,1fr)` at 900px → `1fr` at 520px
- Profile header, streak badge, competency matrix, footer layouts

### `css/components.css`
- **3 button variants**: `.btn-primary` (solid black), `.btn-secondary` (outlined), `.nav-btn` (ghost) + logout hover in soft red
- Form inputs with custom `focus` ring (no browser default blue outline)
- Auth card, composer card, post card, video player, skill node components
- Stat cards with coloured `border-top` accent per difficulty (Easy=green, Medium=amber, Hard=red) and large bold numbers

---

### `js/firebase.js`
Central Firebase initialization — **single app instance** shared across all modules.
- Imports `initializeApp`, `getAuth`, `getFirestore`, `getAnalytics` from CDN v12.12.0
- Reads config from `./config.js` (gitignored)
- Exports `{ app, auth, db, analytics }`

### `js/config.js` + `js/config.example.js` + `.gitignore`
- Real Firebase credentials live only in `config.js`, which is excluded from Git
- `config.example.js` is the safe blank template committed for collaborators
- Explained why `.env` doesn't work in a no-bundler SPA (no Node.js process to parse it)

### `js/router.js`
Client-side SPA router — no `DOMContentLoaded` wrapper (ES modules are already deferred).
- `ROUTE_MAP` maps route IDs → section element IDs
- `PROTECTED_ROUTES` guards `feed` and `dashboard` from unauthenticated access (reads `sessionStorage`)
- `MapsTo(routeId, pushState)` hides all sections, reveals the target, syncs nav `.active` class, pushes browser history, dispatches `routechange` CustomEvent
- `popstate` listener for back/forward button support
- Exposes `window.CodeSphere.router = { MapsTo }` for other modules

### `js/auth.js`
Firebase Auth + Firestore user module.
- `onAuthStateChanged` as single source of truth — routes to `dashboard` or `login` automatically
- **Sign In**: `signInWithEmailAndPassword` with loading state and `friendlyAuthError()` mapping
- **Create Account**: `createUserWithEmailAndPassword` + `setDoc` to bootstrap Firestore user profile (`uid`, `email`, `displayName`, `currentStreak: 1`, `lastActiveDate`, `leetcode` stats object)
- **Logout**: `signOut` wired to the nav logout button
- **Streak Engine** (`checkAndUpdateStreak`):
  - Fetches user doc, compares today vs `lastActiveDate`
  - Same day → no change, 1 day apart → increment, >1 day → reset to 1
  - Writes back to Firestore only when changed
  - Updates `#streak-counter` in the DOM
- `populateProfileUI()` fills name/handle/avatar (with `ui-avatars.com` letter fallback)
- `syncSessionStorage()` keeps `cs_user` in `sessionStorage` for the router guard
- Exposes `window.CodeSphere.auth = { getCurrentUser, db }`

### `js/api.js`
LeetCode stats fetcher with a guaranteed two-tier fallback.
- **Tier 1**: fetches `https://leetcode-stats-api.herokuapp.com/{username}`
- **Tier 2**: on any error (CORS, 4xx/5xx, offline) → `console.warn` + loads `./assets/mockData.json`
- Both tiers call `renderStats()` which runs GSAP counter animations:
  - Easy: 1.6s, Total/Medium: 2.0s, Hard: 2.5s (staggered for drama)
  - Tweens a plain `{ val }` object and writes `Math.round()` to DOM — avoids decimal flicker
- Exposes `window.CodeSphere.api = { fetchLeetCodeStats }`

### `js/feed.js`
Real-time social feed powered by Firestore `onSnapshot`.
- `listenToFeed()` — queries `posts` ordered by `createdAt desc`, re-renders full feed on every snapshot
- `postCardTemplate()` — generates post card HTML with XSS-safe `escapeHtml()` on all user content
- `videoPlayerTemplate()` — custom branded video player (no native controls) with play/pause, scrub bar, time display
- **Like system** via event delegation — single listener on `#feed-container`, uses `arrayUnion`/`arrayRemove` for atomic Firestore writes
- **Create Post** — `addDoc` to `posts` collection with `serverTimestamp()`
- `initVideoPlayers()` — initialises video controls after each render, guards against duplicate listeners with `data-initialised`
- Listener lifecycle tied to `routechange` event — opens on `feed` route, tears down (unsubscribes) on any other route to conserve Firestore reads
- Exposes `window.CodeSphere.feed = { listenToFeed, timeAgo }`

### `assets/mockData.json`
Realistic mock LeetCode data (342 total, 148 easy, 156 medium, 38 hard) used as the `api.js` fallback.

---

## Key Cross-Module Connections

```
firebase.js  ──exports──►  auth.js  (auth, db)
firebase.js  ──exports──►  feed.js  (db)

router.js    ──window.CodeSphere.router──►  auth.js  (MapsTo)
auth.js      ──window.CodeSphere.auth───►  feed.js  (getCurrentUser)
router.js    ──routechange CustomEvent──►  feed.js  (listener lifecycle)
auth.js      ──sessionStorage cs_user──►  router.js (isAuthenticated guard)
```

---

## Bugs Fixed During Audit

| Bug | File | Impact |
|-----|------|--------|
| `DOMContentLoaded` wrapper around `MapsTo` | `router.js` | `window.CodeSphere.router` wasn't set before `onAuthStateChanged` fired — navigation after login was broken |
| `@import` placed after CSS rules | `base.css` | Browser silently ignored it — Inter font was never loading |
| Firebase CDN version mismatch (`10.12.0` vs `12.12.0`) | `auth.js`, `feed.js` | Would have caused a duplicate-SDK runtime error |

---

## What Still Needs Doing

- [ ] Set **Firestore Security Rules** (Firebase Console → Firestore → Rules) to restrict read/write to authenticated users
- [ ] Wire `fetchLeetCodeStats(username)` call in `auth.js` after login, passing the user's LeetCode handle from their Firestore profile
- [ ] Write `css` for video player, feed empty state, and like button (classes exist in `feed.js` templates but not yet styled)
- [ ] Phase 2: Firebase Storage integration for video uploads in `feed.js`
