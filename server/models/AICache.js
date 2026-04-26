const mongoose = require('mongoose');

const AICacheSchema = new mongoose.Schema({
  prompt: { type: String, required: true, unique: true, index: true },
  reply: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: '24h' } // Cache for 24 hours
});

module.exports = mongoose.model('AICache', AICacheSchema);
