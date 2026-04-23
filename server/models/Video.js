const mongoose = require('mongoose');

const VideoSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  thumbnailUrl: { type: String, required: true },
  videoUrl: { type: String, required: true },
  category: { 
    type: String, 
    required: true, 
    enum: ['Java', 'DSA', 'WebDev', 'AI', 'Trending', 'General'] 
  },
  views: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  duration: { type: String, default: '0:00' }
}, { timestamps: true });

module.exports = mongoose.model('Video', VideoSchema);
