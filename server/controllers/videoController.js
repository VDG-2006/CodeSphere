const Video = require('../models/Video');

// Get all videos with optional category filter
exports.getVideos = async (req, res, next) => {
  try {
    const { category } = req.query;
    let query = {};
    if (category && category !== 'Home') {
      query.category = category;
    }

    const videos = await Video.find(query).sort({ createdAt: -1 }).populate('creator', 'username avatarUrl');
    res.json({ success: true, count: videos.length, data: videos });
  } catch (error) {
    next(error);
  }
};

// Get trending videos (sorted by views)
exports.getTrending = async (req, res, next) => {
  try {
    const videos = await Video.find({}).sort({ views: -1 }).limit(10).populate('creator', 'username avatarUrl');
    res.json({ success: true, data: videos });
  } catch (error) {
    next(error);
  }
};

// Get single video
exports.getVideoById = async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id).populate('creator', 'username avatarUrl');
    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }
    // Increment views
    video.views += 1;
    await video.save();

    res.json({ success: true, data: video });
  } catch (error) {
    next(error);
  }
};

