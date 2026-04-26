require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const path = require('path');

// Models
const User = require('./models/User');
const StatsCache = require('./models/StatsCache');

// Controllers
// Controllers
const { register, login } = require('./controllers/authController');
const { getVideos, getTrending, getVideoById } = require('./controllers/videoController');
const { toggleLike, toggleSubscribe, getUserVideoState } = require('./controllers/interactionController');
const { getSettings, updateSettings } = require('./controllers/userController');

// Middlewares
const { validateStatsRequest } = require('./middlewares/validateStatsRequest');
const authMiddleware = require('./middlewares/authMiddleware');

const app = express();
const PORT = process.env.PORT || 5000;

// 1. MIDDLEWARE
app.use(helmet({
  contentSecurityPolicy: false, 
})); 
app.use(express.json());
app.use(cors({ origin: '*' }));

// Serve static files from client directory (V2 UI)
app.use('/js', express.static(path.join(__dirname, '..', 'client', 'js')));
app.use('/css', express.static(path.join(__dirname, '..', 'client', 'css')));
app.use('/assets', express.static(path.join(__dirname, '..', 'client', 'assets')));

// External Video Content Route
const externalPath = 'D:\\Sigma Web Dev\\Sigma Web Development Course - Web Development Tutorials in Hindi 🗿';
app.use('/api/content', express.static(externalPath, {
  setHeaders: (res, path) => {
    if (path.endsWith('.mp4')) {
      res.set('Content-Type', 'video/mp4');
      res.set('Accept-Ranges', 'bytes');
    }
  }
}));

app.use(express.static(path.join(__dirname, '..', 'client')));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 150 });
app.use('/api/', limiter);

// 2. DATABASE CONNECTION
const dbState = { isConnected: false };
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/codesphere-dev')
  .then(() => {
    console.log('[DB] CodeSphere MongoDB Connected');
    dbState.isConnected = true;
  })
  .catch(err => {
    console.error('[DB] Connection Error:', err.message);
    dbState.isConnected = false;
  });

// Database connectivity guard
app.use('/api', (req, res, next) => {
  if (!dbState.isConnected && mongoose.connection.readyState !== 1) {
    return res.status(503).json({ 
      success: false, 
      message: "Database initializing... please try again in a few seconds." 
    });
  }
  next();
});

// 3. API ROUTES

// Auth (Independent JWT + Bcrypt)
app.post('/api/auth/register', register);
app.post('/api/auth/login', login);

// Video Engine
app.get('/api/videos', getVideos);
app.get('/api/videos/trending', getTrending);
app.get('/api/videos/:id', getVideoById);

// Interactions
app.post('/api/videos/:id/like', authMiddleware, toggleLike);
app.post('/api/user/subscribe/:creatorId', authMiddleware, toggleSubscribe);
app.get('/api/videos/:id/state', authMiddleware, getUserVideoState);

// User Settings
app.get('/api/user/settings', authMiddleware, getSettings);
app.put('/api/user/settings', authMiddleware, updateSettings);

// Routes
const statsRoutes = require('./routes/statsRoutes');
app.use('/api/stats', statsRoutes);

// Atomic Purge for Stats Handles
app.post('/api/user/handles', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { handles } = req.body;
    
    // ATOMIC PURGE: Immediately delete cache entries for any handle that is being updated
    if (handles && typeof handles === 'object') {
      const handlesToPurge = Object.values(handles).filter(Boolean);
      if (handlesToPurge.length > 0) {
        await StatsCache.deleteMany({ handle: { $in: handlesToPurge } });
        console.log(`[Cache Purge] Atomic purge triggered for handles: ${handlesToPurge.join(', ')}`);
      }
    }

    const user = await User.findByIdAndUpdate(userId, { handles }, { new: true });
    res.json({ success: true, message: 'Handles updated and cache purged successfully', data: user });
  } catch (error) {
    next(error);
  }
});

// AI Mentor Proxy (Hides API Keys)
const { GoogleGenerativeAI } = require('@google/generative-ai');
app.post('/api/mentor/chat', authMiddleware, async (req, res, next) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ success: false, message: 'Prompt is required' });

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: "You are the CodeSphere Mentor. Help the user solve their CP problems based on their current stats and solved count."
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    res.json({ success: true, reply: response.text() });
  } catch (error) {
    console.error('[Mentor API] Error:', error.message);
    res.status(500).json({ success: false, message: 'AI Mentor is currently offline' });
  }
});

// SPA Routing: Serve index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'index.html'));
});

// 4. ERROR HANDLING
app.use((err, req, res, next) => {
  console.error('[Error]', err.stack);
  res.status(500).json({ success: false, message: err.message || "Internal Server Error" });
});

app.listen(PORT, () => console.log(`[Server] CodeSphere active on port ${PORT}`));
