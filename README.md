# 🚀 CodeSphere: The Ultimate Developer Workspace

![CodeSphere Hero Mockup](file:///C:/Users/ishyj/.gemini/antigravity/brain/8a7ae8c5-d9d8-4259-99ce-740e4650dd4c/codesphere_hero_mockup_1776572125581.png)

**CodeSphere** is a professional-grade, high-density developer platform that bridges the gap between educational content discovery and competitive programming progress tracking. By merging a **YouTube-inspired video engine** with a **LeetCode-style analytics hub**, CodeSphere provides a unified, "No Neon" enterprise environment for the modern engineer. 

This release features a complete modernization to the MERN stack, replacing legacy Firebase dependencies with a robust, custom JWT/Bcrypt authentication system and a dedicated MongoDB caching layer.

---

## ✨ Key Features

### 📺 YouTube-Style Discovery Engine
- **Cinematic Discovery**: A fluid, responsive grid of educational content with staggered GSAP entry animations.
- **Local Content Serving**: Efficiently streams local high-quality video tutorials (e.g., Web Development course files).
- **Hover-to-Play**: Interactive video cards with muted autoplay and thumbnail transitions for rapid content scanning.
- **Categorized Learning**: Smart filters for Java, DSA, Web Development, and AI-driven content.
- **SPA Router**: A lightweight, custom-built GSAP router for seamless transitions between Home, Trending, and Subscriptions without page reloads.
- **Interactions**: Like and Subscribe functionalities to curate your learning feed.

### 📊 LeetCode-Style Profile Matrix
- **2026 Data Engine**: Integrated with the latest LeetCode API for high-fidelity metric synchronization.
- **Real-Time Analytics**:
    - **Total Solved**: Animated count-up metrics via GSAP `TextPlugin`.
    - **Contest Mastery**: Global rank and rounded contest ratings with sparkline trends.
    - **Submission Heatmap**: A 52-week activity visualization for consistent progress tracking.
- **Resilient Caching**: Server-side MongoDB storage with an intelligent TTL and atomic purge functionality (clears on handle update) for lightning-fast dashboard rendering.

### 🤖 AI-Powered Mentor
- **Context-Aware Guidance**: A floating, pulsing AI assistant powered by **Google Gemini 1.5 Flash / 2.0 Flash**.
- **Slide-up Console**: A modern, non-intrusive chat interface for immediate technical help on projects and competitive programming problems.
- **Rate-Limit & Cache Ready**: Server-side caching of AI responses to prevent quota exhaustion, ensuring rapid response times.

### 🔐 Modern Authentication
- **Custom JWT & Bcrypt Auth**: Completely decoupled from Firebase, ensuring full data ownership and robust security.
- **Centered Glassmorphism**: A sleek, focused "Initialize Hub" entry point with centered form layouts.
- **Cyan Aesthetic**: Premium UI elements featuring `#00F2FE` primary buttons with subtle glow effects and 1.03x hover scaling.
- **Fluid Cross-fades**: Zero-shift transitions between Login and Signup modes powered by GSAP.

---

## 🛠️ Tech Stack

### Frontend (Client)
- **Architecture**: Single Page Application (SPA) with custom vanilla router.
- **Logic**: Vanilla JavaScript (ES6+ Modules)
- **Styling**: Basic CSS (Fluid Grids, Glassmorphism, CSS Variables)
- **Animations**: GSAP (GreenSock Animation Platform) for cinematic UI/UX, page transitions, and numerical counters.

### Backend (MERN Server)
- **Server**: Node.js & Express
- **Database**: MongoDB (via Mongoose) for user persistence, LeetCode stats caching, and AI response caching.
- **Authentication**: JWT (JSON Web Tokens) and Bcrypt.
- **Intelligence**: Google Gemini AI SDK.
- **Security & Optimization**: Helmet, Express Rate Limit, CORS.

---

## 📂 Project Structure

```text
CodeSphere/
├── server/             # MERN Backend Node Application
│   ├── controllers/    # Business logic (Stats, Auth, Video, User)
│   ├── middlewares/    # Custom middlewares (Auth, Validator)
│   ├── models/         # MongoDB Schemas (User, StatsCache, AICache, Video)
│   ├── routes/         # Express API routes
│   ├── server.js       # Express entry point & Bootstrapper
│   └── package.json    # Backend dependencies
└── client/             # Frontend Client Assets
    ├── js/             # Frontend Logic (Auth, Features, Core SPA Router)
    ├── css/            # Modular Styling (Base, Layout, Auth)
    ├── assets/         # Images, Icons, static media
    └── index.html      # SPA Entry Point Document
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18+)
- **MongoDB** (Running locally or via Atlas cluster)
- **Gemini API Key** (Set in `.env`)

### Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/codesphere.git
   cd codesphere/server
   ```

2. **Install Backend Dependencies**:
   ```bash
   npm install
   ```

3. **Environment Setup**:
   Create a `.env` file in the `server/` directory:
   ```env
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/codesphere-dev
   GEMINI_API_KEY=your_gemini_api_key_here
   JWT_SECRET=your_super_secret_jwt_key
   ```

4. **Launch Application**:
   The application serves the static frontend directly from the Express server. You do not need a separate frontend server.
   
   From the `server/` directory:
   ```bash
   npm start
   ```
   *(Or `npm run dev` for nodemon development mode)*

5. **Access the Platform**:
   Open your browser and navigate to `http://localhost:5000` (or your configured `PORT`). The frontend `index.html` and assets will be served seamlessly.

---

Built with ❤️ for the next generation of engineers.
