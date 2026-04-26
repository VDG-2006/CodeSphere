const express = require('express');
const router = express.Router();
const { getPlatformStats, syncAllStats } = require('../controllers/statsController');
const authMiddleware = require('../middlewares/authMiddleware');

/**
 * Stats Engine Routes (Audit Compliant)
 * Protected by authMiddleware for security (C-4 fix)
 */

// Unified Sync (POST or GET depending on frontend preference, we use GET with auth)
router.get('/sync', authMiddleware, syncAllStats);

// Individual Platform Legacy/Direct Routes
router.get('/leetcode/:handle', authMiddleware, getPlatformStats);
router.get('/codeforces/:handle', authMiddleware, getPlatformStats);

module.exports = router;
