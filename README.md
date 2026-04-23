# 🚀 CodeSphere v2: The Ultimate Developer Workspace

![CodeSphere Hero Mockup](file:///C:/Users/ishyj/.gemini/antigravity/brain/8a7ae8c5-d9d8-4259-99ce-740e4650dd4c/codesphere_hero_mockup_1776572125581.png)

**CodeSphere v2** is a professional-grade, high-density developer platform that bridges the gap between educational content discovery and competitive programming progress tracking. By merging a **YouTube-inspired video engine** with a **LeetCode-style analytics hub**, CodeSphere provides a unified, "No Neon" enterprise environment for the modern engineer.

---

## ✨ Key Features (v2)

### 📺 YouTube-Style Discovery Engine
- **Cinematic Discovery**: A fluid, responsive grid of educational content with staggered GSAP entry animations.
- **Hover-to-Play**: Interactive video cards with muted autoplay and thumbnail transitions for rapid content scanning.
- **Categorized Learning**: Smart filters for Java, DSA, Web Development, and AI-driven content.
- **SPA Router**: A lightweight, custom-built GSAP router for seamless transitions between Home, Trending, and Subscriptions without page reloads.

### 📊 LeetCode-Style Profile Matrix
- **2026 Data Engine**: Integrated with the latest LeetCode API (`leetcode-api-pied`) for high-fidelity metric synchronization.
- **Real-Time Analytics**:
    - **Total Solved**: Animated count-up metrics via GSAP `TextPlugin`.
    - **Contest Mastery**: Global rank and rounded contest ratings with sparkline trends.
    - **Submission Heatmap**: A 52-week activity visualization for consistent progress tracking.
- **Resilient Caching**: Server-side MongoDB storage with a 60s TTL and atomic purge functionality for lightning-fast performance.

### 🤖 AI-Powered Mentor
- **Context-Aware Guidance**: A floating, pulsing AI assistant powered by **Google Gemini 1.5 Flash**.
- **Slide-up Console**: A modern, non-intrusive chat interface for immediate technical help on CSE projects.

### 🔐 Modern Authentication
- **Centered Glassmorphism**: A sleek, focused "Initialize Hub" entry point with centered form layouts.
- **Cyan Aesthetic**: Premium UI elements featuring `#00F2FE` primary buttons with subtle glow effects and 1.03x hover scaling.
- **Fluid Cross-fades**: Zero-shift transitions between Login and Signup modes powered by GSAP.

---

## 🛠️ Tech Stack

### Frontend
- **Logic**: Vanilla JavaScript (ES6+ Modules)
- **Styling**: Vanilla CSS (Fluid Grids, Glassmorphism, CSS Variables)
- **Animations**: GSAP (GreenSock Animation Platform) for cinematic UI/UX.

### Backend (MERN)
- **Server**: Node.js & Express
- **Database**: MongoDB (Local/Atlas) for persistence and structured caching.
- **Intelligence**: Google Gemini AI SDK.
- **Data Proxy**: Custom Stats Controller for LeetCode API orchestration.

---

## 📂 Project Structure

```text
CodeSphere/
├── server/             # MERN Backend
│   ├── controllers/    # Business logic (Stats, Auth, Video)
│   ├── models/         # MongoDB Schemas (User, StatsCache, Video)
│   └── server.js       # Express entry point
├── js/                 # Frontend Logic
│   ├── auth/           # Auth handlers & GSAP engine
│   ├── features/       # Dashboard, Video Feed, AI Mentor
│   └── core/           # SPA Router & Config
├── css/                # Modular Styling
│   ├── auth-v2.css     # New centered auth styles
│   ├── base.css        # Design tokens & variables
│   └── layout.css      # Grid & Sidebar definitions
└── index.html          # SPA Entry Point
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18+)
- **MongoDB** (Running locally or via Atlas)
- **Gemini API Key** (Set in `.env`)

### Installation
1. **Clone & Install**:
   ```bash
   git clone https://github.com/your-username/codesphere.git
   cd codesphere/server
   npm install
   ```

2. **Environment Setup**:
   Create a `.env` file in the `server/` directory:
   ```env
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/codesphere
   GEMINI_API_KEY=your_key_here
   ```

3. **Launch Server**:
   ```bash
   npm start
   ```

4. **Launch Frontend**:
   Open `index.html` in your browser (use Live Server for the best experience).

---

Built with ❤️ for the next generation of engineers.
