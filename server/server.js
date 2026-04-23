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
const { register, login } = require('./controllers/authController');
const { getPlatformStats } = require('./controllers/statsController');
const { getVideos, getTrending, getVideoById, seedVideos } = require('./controllers/videoController');

// Middlewares
const { validateStatsRequest } = require('./middlewares/validateStatsRequest');

const app = express();
const PORT = process.env.PORT || 5000;

// 1. MIDDLEWARE
app.use(helmet({
  contentSecurityPolicy: false, 
})); 
app.use(express.json());
app.use(cors({ origin: '*' }));

// Serve static files from root and subdirectories (V2 UI)
app.use('/js', express.static(path.join(__dirname, '..', 'js')));
app.use('/css', express.static(path.join(__dirname, '..', 'css')));
app.use('/assets', express.static(path.join(__dirname, '..', 'assets')));

// External Video Content Route
const externalPath = "D:/Sigma Web Dev/Sigma Web Development Course - Web Development Tutorials in Hindi 🗿";
app.use('/api/content', express.static(externalPath, {
  setHeaders: (res, path) => {
    if (path.endsWith('.mp4')) {
      res.set('Content-Type', 'video/mp4');
      res.set('Accept-Ranges', 'bytes');
    }
  }
}));

app.use(express.static(path.join(__dirname, '..')));

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
app.get('/api/videos/seed', seedVideos); // Dev only helper
app.get('/api/videos/:id', getVideoById);

// Stats Engine (Mapping Pattern + 60s TTL)
app.get('/api/stats/:platform/:handle', validateStatsRequest, getPlatformStats);

// Atomic Purge for Stats Handles
app.post('/api/user/handles', async (req, res, next) => {
  try {
    const { userId, handles } = req.body;
    
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

// 4. ERROR HANDLING
app.use((err, req, res, next) => {
  console.error('[Error]', err.stack);
  res.status(500).json({ success: false, message: err.message || "Internal Server Error" });
});

// SPA Routing: Serve index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.listen(PORT, () => console.log(`[Server] CodeSphere active on port ${PORT}`));
