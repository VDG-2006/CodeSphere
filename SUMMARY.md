# CodeSphere — Project Summary & Walkthrough

A vanilla JavaScript SPA (no frameworks) — social learning platform for computer science students.

---

## 🏗️ Project Structure

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
│   ├── config.js          ← gitignored (contains real API keys)
│   ├── config.example.js  ← committed (template for setup)
│   ├── router.js
│   ├── auth.js
│   ├── api.js
│   └── feed.js
└── assets/
    └── mockData.json
```

---

## 📄 Core Files Overview

### 1. `index.html`
The semantic HTML5 shell for the SPA. It contains three main view sections navigated via a custom JS router:
- **Login Portal**: Email/Password authentication.
- **Profile Dashboard**: Displays user stats, 🔥 streaks, and competency matrix.
- **Active Feed**: Social hub for posting and sharing content.

### 2. Stylesheets (`css/`)
- **`base.css`**: Defines the design system with 30+ CSS variables, Inter typography, and global resets.
- **`layout.css`**: Manages SPA routing animations (`.page-section`), grid structures, and responsive breakpoints.
- **`components.css`**: Styles for interactive elements like buttons, stat cards, and the custom video player.

### 3. JavaScript Logic (`js/`)
- **`firebase.js`**: Centralized Firebase SDK initialization.
- **`router.js`**: Client-side logic for "pseudo-routing" between sections without page reloads.
- **`auth.js`**: Handles authentication state, Firestore profile synchronization, and the **Streak Engine**.
- **`api.js`**: Fetches LeetCode statistics with a built-in fallback to `mockData.json` if the external API is rate-limited or offline.
- **`feed.js`**: Real-time social feed using Firestore listeners, featuring XSS protection and custom video controls.

---

## 🚀 Recent Achievements (Profile Hub Integration)

We recently completed the integration of the **Profile Hub**, focusing on a premium developer experience:

- **Identity & Progress**: Implemented glassmorphic headers and an animated LeetCode stats grid.
- **Competency Matrix**: Added interactive progress visusalization for core CS subjects (DSA, System Design).
- **GSAP Animations**: Built a "Zipper" entrance animation to make the UI feel alive and responsive.
- **Theme Fixes**: Ensured the profile dropdown and secondary menus are fully visible in both Light and Dark modes.
- **Deployment**: The latest stable version is deployed to the `dinesh` branch on GitHub.

---

## 📝 Pending Tasks & Next Steps

- [ ] **Firestore Rules**: Configure security rules in the Firebase Console to restrict unauthorized access.
- [ ] **API Wiring**: Pass the actual user handle from Firestore to `fetchLeetCodeStats`.
- [ ] **Storage Integration**: Set up Firebase Storage for permanent video uploads.
- [ ] **Refinement**: Complete CSS for like button animations and feed empty states.

---

> [!TIP]
> **View Online**: [https://github.com/VDG-2006/CodeSphere/tree/dinesh](https://github.com/VDG-2006/CodeSphere/tree/dinesh)
