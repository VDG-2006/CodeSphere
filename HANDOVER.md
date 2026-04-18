# CodeSphere — Project Handover & Context Sync

This document serves as the technical and conceptual "Context Capsule" for a developer transitioning into the CodeSphere project. It outlines the internal logic, design systems, and pending roadmap to ensure zero-friction continuity.

---

## 1. Core Implementation & Logic (What is Done)

CodeSphere is built as a **Vanilla JavaScript SPA** (Single Page Application) with a heavy focus on performance, aesthetics, and agentic AI integration.

### Key Active Modules:
- **Hash-Based Router (`router.js`)**: 
  - Manages pseudo-routing using URL hashes (`#home`, `#profile`).
  - Implements `MapsTo(routeId)` for section transitions and history syncing.
  - **Protected Routes**: Guards sensitive views via `PROTECTED_ROUTES` set and `isAuthenticated()` checks.
- **AI Mentor Persona (`mentor.js`)**:
  - Integrated with **Google Gemini 1.5 Flash**.
  - Persona definition is technically scoped to B.Tech CSE guidance, using a concise, actionable, and precision-focused technical style.
- **Auth & Streak Engine (`auth.js`)**:
  - Uses Firebase Authentication (Email/Password).
  - On every login, the **Daily Streak Engine** calculates the time delta since `lastActiveDate`. It increments the streak if consecutive or resets to 1 if >24h have passed.
- **Data Sync & Fallback (`api.js`)**:
  - Fetches real-time LeetCode stats via a proxy.
  - **Inner Logic**: Features a two-tier safety net. If the proxy fails (CORS/Rate Limit), it silently falls back to `assets/mockData.json` so the UI never displays broken states.

---

## 2. Current Work-in-Progress (In-Flight)

Modules currently under active development or awaiting final polish:
- **UI Interaction Layer**: 
  - The `hub.js` module is currently handling tabbed navigation for the "Progress" and "Settings" views.
  - **Half-finished**: The video player controls and the "Post Like" animation state in `feed.js` are logically present but require final CSS transition refinements in `components.css`.
- **Search Logic**: Global search input exists in the header but lacks the full-text search implementation for post content.

---

## 3. The Roadmap (Yet to Start)

Immediate next steps to reach the next production-ready milestone:
- [ ] **Firestore Security Rules**: Critical task. Current rules are default; need to restrict write access to `currentUser.uid`.
- [ ] **Firebase Storage Integration**: Implement actual file uploads for post videos/images (currently uses placeholders or external URLs).
- [ ] **Profile Customization**: Enable users to change display names and avatars from the Settings hub (currently read-only from Firestore).
- [ ] **Mentor Threading**: Persist AI Mentor conversations in Firestore so users can revisit previous guidance.

---

## 4. Design Language & Aesthetics

CodeSphere follows a **Kinetic Glass-Bento** philosophy—minimalist, high-end, and physically reactive.

### Visual Foundations:
- **Typography**: Inter (Weights: 400, 500, 600, 700, 900).
- **Color Palettes**:
  - **Dark Mode** (Default): 
    - Background: `#0F0F0F`
    - Surface: `#1A1A1A`
    - Accent: `#6366F1` (Indigo)
  - **Light Mode**:
    - Background: `#F9F9F9`
    - Surface: `#FFFFFF`
    - Accent: `#0A0A0A` (Black)
- **UI Constants**:
  - Corners: `4px` (Small), `12px` (Cards), `full` (Pills).
  - Spacing: 4px baseline (`--space-1` = 0.25rem).
  - Blur: `12px` backdrop filter for glassmorphic elements.

### Visual Non-Negotiables:
- **Transitions**: Every color/opacity change MUST use a `0.4s ease` transition to maintain the premium feel.
- **GSAP Counters**: Stat numbers must pulse/animate up on entry; avoid instant value snaps.

---

## 5. Technical Gotchas & Environment

### Environment Setup:
1. **Firebase Configuration**: The `js/core/config.js` file is excluded from Git. 
   - Copy `js/core/config.example.js` to `js/core/config.js`.
   - Populated with your Firebase Web SDK credentials.
2. **Dependencies**: All scripts are served via CDN (Firebase 12.12.0, GSAP, Google Generative AI). No `npm install` is required for local dev—just a local server (e.g., Live Server).

### Complex Logic Quirks:
- **Shadow DOM & Layout**: The router resets `display` and `opacity` classes. When adding new modules, ensure they listen to the `routechange` custom event if they need to fetch data on view entry.
- **LeetCode Proxy**: The API is third-party. If stats stop loading, check the [LeetCode Stats API repo](https://github.com/JeremyTsaii/leetcode-stats-api) for maintenance notices.

---

## 6. The "Context Capsule"

**Current Project State**: Stable Core.
The project is no longer a prototype but a functional SP platform. All authentication, routing, and AI mentor logic are "wired in." We are now in the **Polishing & Deployment Phase**. 

**Mental State for the Resume**:
The new developer should focus on **Feature Depth** and **Security**. The foundation is solid—don't rebuild the router or auth logic. Spend your energy on the **Storage integration** and **UI Micro-animations** to push the "Kinetic" feel further.

---

> [!TIP]
> **Source of Truth**: The `dinesh` branch on the remote repository is the current deployment target. Always sync with `dinesh` before starting new feature modules.
