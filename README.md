# 🚀 CodeSphere: The Professional Developer Workspace

![CodeSphere Hero Mockup](file:///C:/Users/ishyj/.gemini/antigravity/brain/8a7ae8c5-d9d8-4259-99ce-740e4650dd4c/codesphere_hero_mockup_1776572125581.png)

**CodeSphere** is a high-density, professional-grade developer dashboard designed to accelerate learning and collaboration for computer science students. Inspired by the best of **YouTube** for content discovery and **LeetCode** for progress tracking, CodeSphere provides a unified, "No Neon" enterprise environment for the modern coder.

---

## ✨ Key Features

### 📺 YouTube-Style Discovery Feed
- **Slim Workspace Sidebar**: Fixed 240px navigation for rapid access to Home, Trending, and Subscriptions.
- **Fluid Grid Architecture**: A responsive video-card grid that scales seamlessly across all display sizes.
- **Categorized Content**: Specialized filters for Java, DSA, Web Dev, and AI content.

### 📊 LeetCode-Style Profile Hub
- **2-Column Dashboard**: High-density 320px identity sidebar paired with a fluid main panel.
- **Real-Time Data Sync**: Concurrent API fetching from 6+ LeetCode endpoints (via `alfa-leetcode-api`).
- **Data Visualizations**: 
  - **Solved Donut**: Visual breakdown of Easy, Medium, and Hard problems.
  - **Activity Heatmap**: 52-week submission calendar.
  - **Contest Trends**: Sparkline graphs for rating performance.
  - **Skill Cloud**: Dynamic tagging of technical expertise.

### 🤖 AI-Powered Mentor
- **Floating Widget**: A fixed-position, pulsing AI assistant accessible from any page.
- **Slide-up Interface**: Modern chat window for concise, technical guidance on CSE projects.
- **Gemini Engine**: Powered by Google's Gemini 1.5 Flash for rapid, accurate technical responses.

### 🛠️ Global Navigation & Tools
- **Pill Search**: Centered, professional search bar for global querying.
- **Upload Modal**: A streamlined "Create" workflow for sharing code snippets and video walkthroughs.
- **Theme Support**: Seamless switching between strict Professional Dark and Enterprise Light modes.

---

## 🛠️ Tech Stack

- **Core**: HTML5, Vanilla JavaScript (ES6 Modules)
- **Styling**: Vanilla CSS (Global variables, Fluid Grid, Glassmorphism)
- **Backend**: Firebase (Authentication, Firestore, Hosting)
- **Intelligence**: Google Gemini AI SDK
- **Animations**: GSAP (GreenSock Animation Platform)
- **Data API**: `alfa-leetcode-api`

---

## 🚀 Getting Started

### Prerequisites
- A modern web browser (Chrome, Edge, Brave).
- Basic knowledge of Firebase (if deploying).

### Local Setup
1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/codesphere.git
   cd codesphere
   ```

2. **Configure Firebase**:
   Update `js/core/config.js` with your Firebase project credentials.

3. **Install Dependencies**:
   While CodeSphere uses vanilla modules, you can serve it locally using any static server (e.g., Live Server or `serve`).

4. **Launch**:
   Open `index.html` in your browser.

---

## 📂 Project Structure

```text
CodeSphere/
├── assets/          # Static assets & icons
├── css/             # Modular CSS system
│   ├── base.css     # Global design tokens
│   ├── layout.css   # Sidebar & Grid layouts
│   └── dashboard.css# Data visualizations
├── js/              # Application Logic
│   ├── auth/        # Firebase Auth handlers
│   ├── core/        # Router & Config
│   ├── features/    # Home, Dashboard, AI Mentor
│   └── ui/          # Generic UI controls
└── index.html       # SPA Entry Point
```

---

## 🤝 Contributing

We welcome contributions from the CS community! Feel free to open an issue or submit a pull request.

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.

---

Built with ❤️ by CS Students for CS Students.
