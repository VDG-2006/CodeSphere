const mongoose = require('mongoose');

const StatsCacheSchema = new mongoose.Schema({
  platform: { type: String, required: true },
  handle: { type: String, required: true },
  data: {
    totalSolved: Number,
    contestRating: Number,
    globalRank: Number,
    contestHistory: Array,
    // Keep raw for other platforms or compatibility
    raw: mongoose.Schema.Types.Mixed
  },
  lastUpdated: { type: Date, default: Date.now }
});

// Set TTL to 24 hours (Audit Compliant)
StatsCacheSchema.index({ lastUpdated: 1 }, { expireAfterSeconds: 86400 });

// Compound index for O(1) platform-handle retrieval
StatsCacheSchema.index({ platform: 1, handle: 1 }, { unique: true });

module.exports = mongoose.model('StatsCache', StatsCacheSchema);
